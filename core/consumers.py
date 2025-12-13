import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Q
from core.models import Message, Handshake, Offer, Need, OfferInterest, NeedInterest


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("=" * 50)
        print("WebSocket CONNECT attempt")
        print(f"Scope URL route: {self.scope.get('url_route', {})}")
        print(f"Scope path: {self.scope.get('path', 'N/A')}")
        print(f"Scope query_string: {self.scope.get('query_string', b'').decode()}")
        
        # Authenticate user from token
        self.user = await self.authenticate_user()
        if not self.user:
            print(f"WebSocket connection rejected: No authenticated user")
            await self.close(code=4001)  # Unauthorized
            return

        # Get conversation ID from URL
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        if not self.conversation_id:
            print(f"WebSocket connection rejected: No conversation ID")
            print(f"URL route kwargs: {self.scope.get('url_route', {}).get('kwargs', {})}")
            await self.close(code=4000)  # Bad request
            return

        print(f"WebSocket connection attempt: user={self.user.username} (ID: {self.user.id}), conversation={self.conversation_id}")

        # Verify user has access to this conversation (offer/need-based)
        has_access = await self.verify_conversation_access(self.conversation_id)
        print(f"WebSocket access verification: {has_access}")
        if not has_access:
            print(f"WebSocket connection rejected: No access to conversation {self.conversation_id}")
            await self.close(code=4003)  # Forbidden
            return

        # Create room group name for this conversation
        self.room_group_name = f'chat_{self.conversation_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        print(f"WebSocket connection ACCEPTED: user={self.user.username}, conversation={self.conversation_id}")
        print("=" * 50)
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def authenticate_user(self):
        """Authenticate user from token in query string or headers."""
        # Try to get token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = None
        
        print(f"WebSocket query_string: {query_string}")
        
        if query_string:
            # Handle URL-encoded tokens
            from urllib.parse import unquote, parse_qs
            params = parse_qs(query_string)
            token = params.get('token', [None])[0]
            if token:
                token = unquote(token)
        
        # If no token in query, try Authorization header
        if not token:
            headers = dict(self.scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode()
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            print("WebSocket authentication failed: No token found")
            return None
        
        print(f"WebSocket authentication: token found (length: {len(token)})")
        
        # Get user from token
        user = await self.get_user_from_token(token)
        if not user:
            print(f"WebSocket authentication failed: Token not found in cache or invalid")
        else:
            print(f"WebSocket authentication successful: user={user.username}")
        return user

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Get user from token stored in cache."""
        if not token:
            return None
        cache_key = f'auth_token_{token}'
        user_id = cache.get(cache_key)
        print(f"WebSocket token lookup: cache_key={cache_key[:20]}..., user_id={user_id}")
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
                print(f"WebSocket token lookup successful: user={user.username}")
                return user
            except User.DoesNotExist:
                print(f"WebSocket token lookup failed: User {user_id} does not exist")
                return None
        print(f"WebSocket token lookup failed: Token not in cache")
        return None

    @database_sync_to_async
    def verify_conversation_access(self, conversation_id):
        """Verify user has access to this offer/need-based conversation."""
        try:
            parts = conversation_id.split('_')
            if len(parts) < 2:
                print(f"verify_conversation_access: Invalid conversation_id format: {conversation_id}")
                return False
            
            conv_type = parts[0]
            item_id = int(parts[1])
            
            print(f"verify_conversation_access: type={conv_type}, id={item_id}, user={self.user.username}")
            
            if conv_type == 'offer':
                try:
                    offer = Offer.objects.get(pk=item_id)
                    print(f"verify_conversation_access: offer found, creator={offer.user.username}, current_user={self.user.username}")
                    # User must be the creator or interested (or can be interested - new conversation)
                    if offer.user == self.user:
                        print("verify_conversation_access: User is creator - access granted")
                        return True
                    # Allow connection even if no interest exists yet (will be created on first message)
                    # Just verify the offer exists and user is not the creator
                    result = offer.user != self.user
                    print(f"verify_conversation_access: User is not creator - access: {result}")
                    return result
                except Offer.DoesNotExist:
                    print(f"verify_conversation_access: Offer {item_id} does not exist")
                    return False
            elif conv_type == 'need':
                try:
                    need = Need.objects.get(pk=item_id)
                    print(f"verify_conversation_access: need found, creator={need.user.username}, current_user={self.user.username}")
                    # User must be the creator or helping (or can help - new conversation)
                    if need.user == self.user:
                        print("verify_conversation_access: User is creator - access granted")
                        return True
                    # Allow connection even if no interest exists yet (will be created on first message)
                    # Just verify the need exists and user is not the creator
                    result = need.user != self.user
                    print(f"verify_conversation_access: User is not creator - access: {result}")
                    return result
                except Need.DoesNotExist:
                    print(f"verify_conversation_access: Need {item_id} does not exist")
                    return False
            print(f"verify_conversation_access: Unknown conversation type: {conv_type}")
            return False
        except (ValueError, AttributeError) as e:
            print(f"verify_conversation_access: Exception: {e}")
            return False

    async def receive(self, text_data):
        """Receive message from WebSocket."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'message':
                # Handle new message
                content = data.get('content', '').strip()
                
                if not content:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Content is required'
                    }))
                    return

                # Save message to database (associated with offer/need via conversation_id)
                message = await self.save_message(content)
                
                if message:
                    # Send message to room group
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message',
                            'message': {
                                'id': message['id'],
                                'sender': message['sender'],
                                'content': message['content'],
                                'created_at': message['created_at'],
                                'is_read': message['is_read']
                            }
                        }
                    )
            
            elif message_type == 'handshake_start':
                # Handle handshake initiation (based on offer/need)
                handshake = await self.create_handshake()
                if handshake:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'handshake_update',
                            'handshake': handshake
                        }
                    )
            
            elif message_type == 'handshake_approve':
                # Handle handshake approval
                handshake = await self.approve_handshake()
                if handshake:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'handshake_update',
                            'handshake': handshake
                        }
                    )

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    @database_sync_to_async
    def save_message(self, content):
        """Save message to database, associated with offer/need interest."""
        try:
            parts = self.conversation_id.split('_')
            if len(parts) < 2:
                return None
            
            conv_type = parts[0]
            item_id = int(parts[1])
            
            interest = None
            recipient = None
            
            if conv_type == 'offer':
                offer = Offer.objects.get(pk=item_id)
                if offer.user == self.user:
                    # User is creator, get first interest or create one
                    interest = OfferInterest.objects.filter(offer=offer).exclude(user=self.user).first()
                    if not interest:
                        return None  # No interested user yet
                    recipient = interest.user
                else:
                    # User is interested, get or create interest
                    interest, created = OfferInterest.objects.get_or_create(
                        offer=offer,
                        user=self.user,
                        defaults={'status': 'pending'}
                    )
                    recipient = offer.user
                
                message = Message.objects.create(
                    sender=self.user,
                    recipient=recipient,
                    content=content,
                    offer_interest=interest,
                    is_read=False
                )
            elif conv_type == 'need':
                need = Need.objects.get(pk=item_id)
                if need.user == self.user:
                    # User is creator, get first interest or create one
                    interest = NeedInterest.objects.filter(need=need).exclude(user=self.user).first()
                    if not interest:
                        return None  # No helping user yet
                    recipient = interest.user
                else:
                    # User wants to help, get or create interest
                    interest, created = NeedInterest.objects.get_or_create(
                        need=need,
                        user=self.user,
                        defaults={'status': 'pending'}
                    )
                    recipient = need.user
                
                message = Message.objects.create(
                    sender=self.user,
                    recipient=recipient,
                    content=content,
                    need_interest=interest,
                    is_read=False
                )
            else:
                return None
            
            return {
                'id': message.id,
                'sender': {
                    'id': message.sender.id,
                    'username': message.sender.username,
                    'full_name': f"{message.sender.first_name} {message.sender.last_name}".strip() or message.sender.username
                },
                'content': message.content,
                'created_at': message.created_at.isoformat(),
                'is_read': message.is_read
            }
        except (Offer.DoesNotExist, Need.DoesNotExist, User.DoesNotExist):
            return None
        except Exception as e:
            print(f"Error saving message: {e}")
            return None

    @database_sync_to_async
    def create_handshake(self):
        """Create a handshake from offer/need interest."""
        try:
            parts = self.conversation_id.split('_')
            if len(parts) < 2:
                return None
            
            conv_type = parts[0]
            item_id = int(parts[1])
            
            interest = None
            recipient = None
            
            if conv_type == 'offer':
                offer = Offer.objects.get(pk=item_id)
                if offer.user == self.user:
                    # Creator can't initiate handshake, only interested user can
                    return None
                # User is interested, get interest
                try:
                    interest = OfferInterest.objects.get(offer=offer, user=self.user)
                except OfferInterest.DoesNotExist:
                    return None
                recipient = offer.user
                
                # Check if handshake already exists
                if hasattr(interest, 'handshake'):
                    return {
                        'id': interest.handshake.id,
                        'status': interest.handshake.status,
                        'message': 'Handshake already exists'
                    }
                
                # Create handshake
                handshake = Handshake.objects.create(
                    offer_interest=interest,
                    user1=offer.user,
                    user2=self.user,
                    status='active'
                )
            elif conv_type == 'need':
                need = Need.objects.get(pk=item_id)
                if need.user == self.user:
                    # Creator can't initiate handshake, only helping user can
                    return None
                # User wants to help, get interest
                try:
                    interest = NeedInterest.objects.get(need=need, user=self.user)
                except NeedInterest.DoesNotExist:
                    return None
                recipient = need.user
                
                # Check if handshake already exists
                if hasattr(interest, 'handshake'):
                    return {
                        'id': interest.handshake.id,
                        'status': interest.handshake.status,
                        'message': 'Handshake already exists'
                    }
                
                # Create handshake
                handshake = Handshake.objects.create(
                    need_interest=interest,
                    user1=need.user,
                    user2=self.user,
                    status='active'
                )
            else:
                return None
            
            return {
                'id': handshake.id,
                'status': handshake.status,
                'user1_id': handshake.user1.id,
                'user2_id': handshake.user2.id,
                'message': 'Handshake created'
            }
        except (Offer.DoesNotExist, Need.DoesNotExist, OfferInterest.DoesNotExist, NeedInterest.DoesNotExist):
            return None
        except Exception as e:
            print(f"Error creating handshake: {e}")
            return None

    @database_sync_to_async
    def approve_handshake(self):
        """Approve a handshake (only creator can approve)."""
        try:
            parts = self.conversation_id.split('_')
            if len(parts) < 2:
                return None
            
            conv_type = parts[0]
            item_id = int(parts[1])
            
            handshake = None
            
            if conv_type == 'offer':
                offer = Offer.objects.get(pk=item_id)
                if offer.user != self.user:
                    # Only creator can approve
                    return None
                # Get handshake from interest
                interest = OfferInterest.objects.filter(offer=offer).exclude(user=self.user).first()
                if interest and hasattr(interest, 'handshake'):
                    handshake = interest.handshake
            elif conv_type == 'need':
                need = Need.objects.get(pk=item_id)
                if need.user != self.user:
                    # Only creator can approve
                    return None
                # Get handshake from interest
                interest = NeedInterest.objects.filter(need=need).exclude(user=self.user).first()
                if interest and hasattr(interest, 'handshake'):
                    handshake = interest.handshake
            else:
                return None
            
            if not handshake:
                return None
            
            # Update handshake status
            handshake.status = 'in_progress'
            handshake.save()
            
            return {
                'id': handshake.id,
                'status': handshake.status,
                'user1_id': handshake.user1.id,
                'user2_id': handshake.user2.id,
                'message': 'Handshake approved'
            }
        except (Offer.DoesNotExist, Need.DoesNotExist):
            return None
        except Exception as e:
            print(f"Error approving handshake: {e}")
            return None

    # Receive message from room group
    async def chat_message(self, event):
        """Send message to WebSocket."""
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message
        }))

    # Receive handshake update from room group
    async def handshake_update(self, event):
        """Send handshake update to WebSocket."""
        handshake = event['handshake']
        await self.send(text_data=json.dumps({
            'type': 'handshake',
            'handshake': handshake
        }))

