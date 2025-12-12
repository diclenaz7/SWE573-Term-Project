from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.db.models import Q
from core.models import Offer, Need, Tag, UserProfile
from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.files.uploadhandler import MemoryFileUploadHandler
import json
import secrets


def generate_token():
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def get_user_from_token(token):
    """Get user from token stored in cache."""
    if not token:
        return None
    user_id = cache.get(f'auth_token_{token}')
    if user_id:
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
    return None


@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    """API endpoint for user login."""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'errors': {'non_field_errors': ['Username and password are required.']}
            }, status=400)
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Generate token for Safari compatibility (works without cookies)
            token = generate_token()
            # Store token in cache for 24 hours (86400 seconds)
            cache.set(f'auth_token_{token}', user.id, 86400)
            
            # Also maintain session for Chrome compatibility
            if not request.session.exists(request.session.session_key):
                request.session.create()
            login(request, user)
            request.session.modified = True
            request.session.save()
            
            response = JsonResponse({
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'email': user.email or ''
                },
                'token': token  # Return token for Safari
            })
            return response
        else:
            return JsonResponse({
                'errors': {'non_field_errors': ['Invalid username or password.']}
            }, status=400)
    except json.JSONDecodeError:
        return JsonResponse({
            'errors': {'non_field_errors': ['Invalid JSON data.']}
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'errors': {'non_field_errors': [str(e)]}
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def api_logout(request):
    """API endpoint for user logout."""
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        # Remove token from cache
        cache.delete(f'auth_token_{token}')
    
    # Also logout session for Chrome compatibility
    logout(request)
    return JsonResponse({'message': 'Logout successful'})


@csrf_exempt
@require_http_methods(["POST"])
def api_register(request):
    """API endpoint for user registration."""
    try:
        data = json.loads(request.body)
        form = UserCreationForm(data)
        
        if form.is_valid():
            user = form.save()
            return JsonResponse({
                'message': f'Account created for {user.username}! You can now log in.',
                'user': {
                    'username': user.username
                }
            })
        else:
            errors = {}
            for field, error_list in form.errors.items():
                errors[field] = error_list
            return JsonResponse({'errors': errors}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({
            'errors': {'non_field_errors': ['Invalid JSON data.']}
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'errors': {'non_field_errors': [str(e)]}
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def api_user(request):
    """API endpoint to get current user information."""
    user = None
    
    # Try token-based authentication first (for Safari)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
    
    # Fall back to session-based authentication (for Chrome)
    if not user and request.user.is_authenticated:
        user = request.user
    
    if not user:
        return JsonResponse(
            {"detail": "Authentication required"},
            status=401,
        )

    return JsonResponse({
        "username": user.username,
        "email": user.email or "",
    })


@csrf_exempt
@require_http_methods(["GET", "PATCH", "PUT", "OPTIONS"])
def api_profile(request, user_id=None):
    """API endpoint for retrieving (GET) and updating (PATCH/PUT) user profile.
    If user_id is provided, returns that user's profile. Otherwise returns current user's profile.
    """
    # Handle OPTIONS preflight request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = "GET, PATCH, PUT, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Authenticate user (needed for viewing any profile)
    authenticated_user = None
    # Try token-based authentication first (for Safari)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        authenticated_user = get_user_from_token(token)
    
    # Fall back to session-based authentication (for Chrome)
    if not authenticated_user and request.user.is_authenticated:
        authenticated_user = request.user
    
    if not authenticated_user:
        response = JsonResponse(
            {"detail": "Authentication required", "message": "Authentication required"},
            status=401,
        )
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Determine which user's profile to show
    if user_id:
        try:
            profile_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            response = JsonResponse(
                {"detail": "User not found", "message": "User not found"},
                status=404,
            )
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
    else:
        profile_user = authenticated_user
    
    # Get or create user profile
    profile, created = UserProfile.objects.get_or_create(user=profile_user)
    
    # Check if viewing own profile (for edit permissions)
    is_own_profile = (profile_user.id == authenticated_user.id)
    
    # Handle GET request
    if request.method == "GET":
        try:
            # Build profile image URL if exists
            profile_image_url = None
            if profile.profile_image:
                profile_image_url = request.build_absolute_uri(profile.profile_image.url)
            
            # Get user's offers and needs with full data
            offers = Offer.objects.filter(user=profile_user).select_related('user').prefetch_related('tags').order_by('-created_at')
            needs = Need.objects.filter(user=profile_user).select_related('user').prefetch_related('tags').order_by('-created_at')
            
            offers_data = []
            for offer in offers:
                # Build image URL if image exists
                image_url = None
                if offer.image:
                    image_url = request.build_absolute_uri(offer.image.url)
                
                # Serialize tags
                tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in offer.tags.all()]
                
                offers_data.append({
                    'id': offer.id,
                    'title': offer.title,
                    'description': offer.description,
                    'status': offer.status,
                    'image': image_url,
                    'location': offer.location or '',
                    'created_at': offer.created_at.isoformat(),
                    'user': {
                        'id': offer.user.id,
                        'username': offer.user.username,
                        'email': offer.user.email or '',
                    },
                    'tags': tags_data,
                })
            
            needs_data = []
            for need in needs:
                # Build image URL if image exists
                image_url = None
                if need.image:
                    image_url = request.build_absolute_uri(need.image.url)
                
                # Serialize tags
                tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in need.tags.all()]
                
                needs_data.append({
                    'id': need.id,
                    'title': need.title,
                    'description': need.description,
                    'status': need.status,
                    'image': image_url,
                    'location': need.location or '',
                    'created_at': need.created_at.isoformat(),
                    'user': {
                        'id': need.user.id,
                        'username': need.user.username,
                        'email': need.user.email or '',
                    },
                    'tags': tags_data,
                })
            
            # Get full name from user model
            full_name = f"{profile_user.first_name} {profile_user.last_name}".strip()
            if not full_name:
                full_name = profile_user.username
            
            profile_data = {
                'id': profile.id,
                'is_own_profile': is_own_profile,
                'user': {
                    'id': profile_user.id,
                    'username': profile_user.username,
                    'email': profile_user.email or '',
                    'first_name': profile_user.first_name,
                    'last_name': profile_user.last_name,
                    'full_name': full_name,
                },
                'bio': profile.bio or '',
                'location': profile.location or '',
                'phone': profile.phone or '',
                'profile_image': profile_image_url,
                'reputation_score': float(profile.reputation_score),
                'rank': profile.rank,
                'rank_display': profile.get_rank_display(),
                'created_at': profile.created_at.isoformat(),
                'updated_at': profile.updated_at.isoformat(),
                'offers': offers_data,
                'needs': needs_data,
            }
            
            response = JsonResponse(profile_data, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            response = JsonResponse({
                'message': f'Failed to retrieve profile: {str(e)}'
            }, status=500)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
    
    # Handle PATCH/PUT request - update profile (only allowed for own profile)
    if not is_own_profile:
        response = JsonResponse(
            {"detail": "Permission denied", "message": "You can only edit your own profile"},
            status=403,
        )
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    try:
        # Check if request has files or is multipart (FormData)
        if request.FILES or (request.content_type and 'multipart/form-data' in request.content_type):
            # Handle FormData (for file uploads)
            bio = request.POST.get('bio', '')
            profile_image = request.FILES.get('profile_image', None)
        else:
            # Handle JSON
            body = json.loads(request.body)
            bio = body.get('bio', '')
            profile_image = None  # Can't send files via JSON
        
        # Update bio if provided
        if bio is not None:
            profile.bio = bio
        
        # Update profile image if provided
        if profile_image is not None:
            profile.profile_image = profile_image
        
        profile.save()
        
        # Build updated profile image URL
        profile_image_url = None
        if profile.profile_image:
            profile_image_url = request.build_absolute_uri(profile.profile_image.url)
        
        # Get full name from user model
        full_name = f"{profile_user.first_name} {profile_user.last_name}".strip()
        if not full_name:
            full_name = profile_user.username
        
        profile_data = {
            'id': profile.id,
            'is_own_profile': True,
            'user': {
                'id': profile_user.id,
                'username': profile_user.username,
                'email': profile_user.email or '',
                'first_name': profile_user.first_name,
                'last_name': profile_user.last_name,
                'full_name': full_name,
            },
            'bio': profile.bio or '',
            'location': profile.location or '',
            'phone': profile.phone or '',
            'profile_image': profile_image_url,
            'reputation_score': float(profile.reputation_score),
            'rank': profile.rank,
            'rank_display': profile.get_rank_display(),
            'created_at': profile.created_at.isoformat(),
            'updated_at': profile.updated_at.isoformat(),
        }
        
        response = JsonResponse(profile_data, status=200)
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response
        
    except json.JSONDecodeError:
        response = JsonResponse({
            'message': 'Invalid JSON data'
        }, status=400)
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    except Exception as e:
        response = JsonResponse({
            'message': f'Failed to update profile: {str(e)}'
        }, status=500)
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def api_people(request):
    """API endpoint for retrieving all users (people) with optional search."""
    # Handle OPTIONS preflight request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    try:
        # Get search query parameter
        search_query = request.GET.get('search', '').strip()
        
        # Get all users with their profiles
        users = User.objects.select_related('profile').all()
        
        # Filter by search query if provided
        if search_query:
            users = users.filter(
                Q(username__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(profile__bio__icontains=search_query)
            )
        
        # Order by username
        users = users.order_by('username')
        
        # Serialize users
        people_data = []
        for user in users:
            # Get or create profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Build profile image URL if exists
            profile_image_url = None
            if profile.profile_image:
                profile_image_url = request.build_absolute_uri(profile.profile_image.url)
            
            # Get full name
            full_name = f"{user.first_name} {user.last_name}".strip()
            if not full_name:
                full_name = user.username
            
            # Get user's offer and need counts
            offer_count = Offer.objects.filter(user=user).count()
            need_count = Need.objects.filter(user=user).count()
            
            people_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email or '',
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': full_name,
                'profile': {
                    'bio': profile.bio or '',
                    'location': profile.location or '',
                    'profile_image': profile_image_url,
                    'reputation_score': float(profile.reputation_score),
                    'rank': profile.rank,
                    'rank_display': profile.get_rank_display(),
                },
                'offer_count': offer_count,
                'need_count': need_count,
            })
        
        response = JsonResponse({
            'people': people_data,
            'count': len(people_data),
            'search': search_query,
        }, status=200)
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response
        
    except Exception as e:
        response = JsonResponse({
            'message': f'Failed to retrieve people: {str(e)}'
        }, status=500)
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Credentials"] = "true"
        return response


def hello_api(request):
    """Hello API endpoint."""
    return JsonResponse({'message': 'Hello, World!'})


@csrf_exempt
@require_http_methods(["GET", "POST", "OPTIONS"])
def api_offers(request):
    """API endpoint for retrieving (GET) and creating (POST) offers."""
    # Handle OPTIONS preflight request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Handle GET request - list offers
    if request.method == "GET":
        try:
            # Get query parameters for filtering
            status = request.GET.get('status', 'active')
            
            # Filter offers by status (default to active)
            if status == 'all':
                offers = Offer.objects.all().select_related('user').prefetch_related('tags')
            else:
                offers = Offer.objects.filter(status=status).select_related('user').prefetch_related('tags')
            
            # Order by creation date (newest first)
            offers = offers.order_by('-created_at')
            
            # Serialize offers
            offers_data = []
            for offer in offers:
                # Build image URL if image exists
                image_url = None
                if offer.image:
                    image_url = request.build_absolute_uri(offer.image.url)
                
                # Serialize tags
                tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in offer.tags.all()]
                
                offer_data = {
                    'id': offer.id,
                    'user': {
                        'id': offer.user.id,
                        'username': offer.user.username,
                        'email': offer.user.email or '',
                    },
                    'title': offer.title,
                    'description': offer.description,
                    'location': offer.location or '',
                    'latitude': str(offer.latitude) if offer.latitude else None,
                    'longitude': str(offer.longitude) if offer.longitude else None,
                    'status': offer.status,
                    'tags': tags_data,
                    'is_reciprocal': offer.is_reciprocal,
                    'contact_preference': offer.contact_preference,
                    'created_at': offer.created_at.isoformat(),
                    'updated_at': offer.updated_at.isoformat(),
                    'expires_at': offer.expires_at.isoformat() if offer.expires_at else None,
                    'image': image_url,
                    'frequency': offer.frequency or '',
                    'duration': offer.duration or '',
                    'min_people': offer.min_people,
                    'max_people': offer.max_people,
                }
                offers_data.append(offer_data)
            
            response = JsonResponse({
                'offers': offers_data,
                'count': len(offers_data)
            }, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            return JsonResponse({
                'message': f'Failed to retrieve offers: {str(e)}'
            }, status=500)
    
    # Handle POST request - create offer
    # Authenticate user
    user = None
    # Try token-based authentication first (for Safari)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
    
    # Fall back to session-based authentication (for Chrome)
    if not user and request.user.is_authenticated:
        user = request.user
    
    if not user:
        return JsonResponse(
            {"detail": "Authentication required", "message": "Authentication required"},
            status=401,
        )
    
    try:
        # Get form data from POST (FormData) or JSON body
        # Check if request has files or is multipart (FormData)
        if request.FILES or (request.content_type and 'multipart/form-data' in request.content_type):
            # Handle FormData (for file uploads)
            title = request.POST.get('title', '')
            description = request.POST.get('description', '')
            location = request.POST.get('location', '')
            image = request.FILES.get('image', None)
            
            # Get tags (can be multiple)
            tag_names = request.POST.getlist('tags') or []
            
            # Get optional fields
            frequency = request.POST.get('frequency', '')
            duration = request.POST.get('duration', '')
            min_people = request.POST.get('minPeople', '')
            max_people = request.POST.get('maxPeople', '')
        else:
            # Handle JSON (fallback for non-file uploads)
            body = json.loads(request.body)
            title = body.get('title', '')
            description = body.get('description', '')
            location = body.get('location', '')
            image = None  # Can't send files via JSON
            
            # Get tags (can be multiple)
            tag_names = body.get('tags', [])
            if not isinstance(tag_names, list):
                tag_names = [tag_names] if tag_names else []
            
            # Get optional fields
            frequency = body.get('frequency', '')
            duration = body.get('duration', '')
            min_people = body.get('minPeople', '')
            max_people = body.get('maxPeople', '')
        
        # Validate required fields
        errors = {}
        if not title:
            errors['title'] = ['Title is required.']
        elif len(title) < 5:
            errors['title'] = ['Title must be at least 5 characters long.']
        
        if not description:
            errors['description'] = ['Description is required.']
        elif len(description) < 20:
            errors['description'] = ['Description must be at least 20 characters long.']
        
        if errors:
            # Format error message for frontend
            error_messages = []
            for field, field_errors in errors.items():
                error_messages.extend(field_errors)
            return JsonResponse({
                'errors': errors,
                'message': ' '.join(error_messages) if error_messages else 'Validation failed.'
            }, status=400)
        
        # Validate optional numeric fields
        min_people_int = None
        max_people_int = None
        
        if min_people:
            try:
                min_people_int = int(min_people)
                if min_people_int < 1:
                    errors['min_people'] = ['Minimum people must be at least 1.']
            except ValueError:
                errors['min_people'] = ['Minimum people must be a valid number.']
        
        if max_people:
            try:
                max_people_int = int(max_people)
                if max_people_int < 1:
                    errors['max_people'] = ['Maximum people must be at least 1.']
            except ValueError:
                errors['max_people'] = ['Maximum people must be a valid number.']
        
        # Validate min_people <= max_people if both are provided
        if min_people_int and max_people_int and min_people_int > max_people_int:
            errors['min_people'] = ['Minimum people cannot be greater than maximum people.']
        
        if errors:
            # Format error message for frontend
            error_messages = []
            for field, field_errors in errors.items():
                error_messages.extend(field_errors)
            return JsonResponse({
                'errors': errors,
                'message': ' '.join(error_messages) if error_messages else 'Validation failed.'
            }, status=400)
        
        # Create the offer
        offer = Offer.objects.create(
            user=user,
            title=title,
            description=description,
            location=location,
            image=image,  # Django ImageField handles None automatically
            frequency=frequency if frequency else '',
            duration=duration if duration else '',
            min_people=min_people_int,
            max_people=max_people_int,
        )

        print("offer", offer);
        # Handle tags - create or get existing tags
        for tag_name in tag_names:
            if tag_name.strip():
                tag_name_lower = tag_name.strip().lower()
                tag, created = Tag.objects.get_or_create(
                    name=tag_name_lower,
                    defaults={'slug': slugify(tag_name_lower)}
                )
                offer.tags.add(tag)
        
        # Return success response
        return JsonResponse({
            'message': 'Offer created successfully',
            'id': offer.id,
            'title': offer.title,
        }, status=201)
        
    except ValueError as e:
        print("error", e);
        return JsonResponse({
            'message': f'Failed to create offer: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "OPTIONS"])
def api_offer_detail(request, offer_id):
    """API endpoint for retrieving (GET) and updating (PUT/PATCH) a single offer by ID."""
    # Handle OPTIONS preflight request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = "GET, PUT, PATCH, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Authenticate user for PUT/PATCH requests
    authenticated_user = None
    if request.method in ["PUT", "PATCH"]:
        # Try token-based authentication first (for Safari)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            authenticated_user = get_user_from_token(token)
        
        # Fall back to session-based authentication (for Chrome)
        if not authenticated_user and request.user.is_authenticated:
            authenticated_user = request.user
        
        if not authenticated_user:
            response = JsonResponse(
                {"detail": "Authentication required", "message": "Authentication required"},
                status=401,
            )
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
    
    # Handle GET request
    if request.method == "GET":
        try:
            # Get the offer by ID
            offer = Offer.objects.select_related('user').prefetch_related('tags').get(id=offer_id)
            
            # Build image URL if image exists
            image_url = None
            if offer.image:
                image_url = request.build_absolute_uri(offer.image.url)
            
            # Serialize tags
            tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in offer.tags.all()]
            
            offer_data = {
                'id': offer.id,
                'user': {
                    'id': offer.user.id,
                    'username': offer.user.username,
                    'email': offer.user.email or '',
                },
                'title': offer.title,
                'description': offer.description,
                'location': offer.location or '',
                'latitude': str(offer.latitude) if offer.latitude else None,
                'longitude': str(offer.longitude) if offer.longitude else None,
                'status': offer.status,
                'tags': tags_data,
                'is_reciprocal': offer.is_reciprocal,
                'contact_preference': offer.contact_preference,
                'created_at': offer.created_at.isoformat(),
                'updated_at': offer.updated_at.isoformat(),
                'expires_at': offer.expires_at.isoformat() if offer.expires_at else None,
                'image': image_url,
                'frequency': offer.frequency or '',
                'duration': offer.duration or '',
                'min_people': offer.min_people,
                'max_people': offer.max_people,
            }
            
            response = JsonResponse(offer_data, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Offer.DoesNotExist:
            return JsonResponse({
                'message': 'Offer not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'message': f'Failed to retrieve offer: {str(e)}'
            }, status=500)
    
    # Handle PUT/PATCH request - update offer
    if request.method in ["PUT", "PATCH"]:
        try:
            # Get the offer by ID
            offer = Offer.objects.select_related('user').prefetch_related('tags').get(id=offer_id)
            
            # Check if user is the owner
            if offer.user.id != authenticated_user.id:
                response = JsonResponse({
                    'message': 'You do not have permission to edit this offer'
                }, status=403)
                response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                response["Access-Control-Allow-Credentials"] = "true"
                return response
            
            # Get form data from PUT/PATCH (FormData) or JSON body
            content_type = request.content_type or request.META.get('CONTENT_TYPE', '')
            
            title = None
            description = None
            location = None
            image = None
            tag_names = []
            frequency = None
            duration = None
            min_people = None
            max_people = None
            
            if 'multipart/form-data' in content_type:
                # Try to get from request.POST and request.FILES
                if hasattr(request, 'POST') and request.POST:
                    title = request.POST.get('title', None)
                    description = request.POST.get('description', None)
                    location = request.POST.get('location', None)
                    tag_names = request.POST.getlist('tags') or []
                    frequency = request.POST.get('frequency', None)
                    duration = request.POST.get('duration', None)
                    # Accept both minPeople/min_people and maxPeople/max_people
                    min_people_str = request.POST.get('minPeople') or request.POST.get('min_people', None)
                    max_people_str = request.POST.get('maxPeople') or request.POST.get('max_people', None)
                    
                    if min_people_str:
                        try:
                            min_people = int(min_people_str)
                        except ValueError:
                            min_people = None
                    if max_people_str:
                        try:
                            max_people = int(max_people_str)
                        except ValueError:
                            max_people = None
                
                if hasattr(request, 'FILES') and request.FILES:
                    image = request.FILES.get('image', None)
            else:
                # Handle JSON (preferred method, used when no image is being uploaded)
                try:
                    body = json.loads(request.body)
                    title = body.get('title', None)
                    description = body.get('description', None)
                    location = body.get('location', None)
                    
                    # Get tags (can be multiple)
                    tag_names = body.get('tags', [])
                    if not isinstance(tag_names, list):
                        tag_names = [tag_names] if tag_names else []
                    image = None
                    frequency = body.get('frequency', None)
                    duration = body.get('duration', None)
                    # Accept both minPeople/min_people and maxPeople/max_people
                    min_people = body.get('minPeople') or body.get('min_people', None)
                    max_people = body.get('maxPeople') or body.get('max_people', None)
                    if min_people is not None:
                        try:
                            min_people = int(min_people)
                        except (ValueError, TypeError):
                            min_people = None
                    if max_people is not None:
                        try:
                            max_people = int(max_people)
                        except (ValueError, TypeError):
                            max_people = None
                except (json.JSONDecodeError, ValueError) as json_error:
                    response = JsonResponse({
                        'message': f'Invalid request body format: {str(json_error)}'
                    }, status=400)
                    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
            
            # Update fields if provided
            if title is not None:
                if len(title) < 5:
                    response = JsonResponse({
                        'errors': {'title': ['Title must be at least 5 characters long.']},
                        'message': 'Title must be at least 5 characters long.'
                    }, status=400)
                    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
                offer.title = title
            
            if description is not None:
                if len(description) < 20:
                    response = JsonResponse({
                        'errors': {'description': ['Description must be at least 20 characters long.']},
                        'message': 'Description must be at least 20 characters long.'
                    }, status=400)
                    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
                offer.description = description
            
            if location is not None:
                offer.location = location
            
            if image is not None:
                offer.image = image
            
            if frequency is not None:
                offer.frequency = frequency
            
            if duration is not None:
                offer.duration = duration
            
            if min_people is not None:
                offer.min_people = min_people
            
            if max_people is not None:
                offer.max_people = max_people
            
            offer.save()
            
            # Handle tags - clear existing and add new ones
            if tag_names is not None:
                offer.tags.clear()
                for tag_name in tag_names:
                    if tag_name.strip():
                        tag_name_lower = tag_name.strip().lower()
                        tag, created = Tag.objects.get_or_create(
                            name=tag_name_lower,
                            defaults={'slug': slugify(tag_name_lower)}
                        )
                        offer.tags.add(tag)
            
            # Build image URL if image exists
            image_url = None
            if offer.image:
                image_url = request.build_absolute_uri(offer.image.url)
            
            # Serialize tags
            tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in offer.tags.all()]
            
            offer_data = {
                'id': offer.id,
                'user': {
                    'id': offer.user.id,
                    'username': offer.user.username,
                    'email': offer.user.email or '',
                },
                'title': offer.title,
                'description': offer.description,
                'location': offer.location or '',
                'latitude': str(offer.latitude) if offer.latitude else None,
                'longitude': str(offer.longitude) if offer.longitude else None,
                'status': offer.status,
                'tags': tags_data,
                'is_reciprocal': offer.is_reciprocal,
                'contact_preference': offer.contact_preference,
                'created_at': offer.created_at.isoformat(),
                'updated_at': offer.updated_at.isoformat(),
                'expires_at': offer.expires_at.isoformat() if offer.expires_at else None,
                'image': image_url,
                'frequency': offer.frequency or '',
                'duration': offer.duration or '',
                'min_people': offer.min_people,
                'max_people': offer.max_people,
            }
            
            response = JsonResponse(offer_data, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Offer.DoesNotExist:
            response = JsonResponse({
                'message': 'Offer not found'
            }, status=404)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
        except Exception as e:
            response = JsonResponse({
                'message': f'Failed to update offer: {str(e)}'
            }, status=500)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response


@csrf_exempt
@require_http_methods(["GET", "POST", "OPTIONS"])
def api_needs(request):
    """API endpoint for retrieving (GET) and creating (POST) needs."""
    # Handle OPTIONS preflight request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Handle GET request - list needs
    if request.method == "GET":
        try:
            # Get query parameters for filtering
            status = request.GET.get('status', 'open')
            
            # Filter needs by status (default to open)
            if status == 'all':
                needs = Need.objects.all().select_related('user').prefetch_related('tags')
            else:
                needs = Need.objects.filter(status=status).select_related('user').prefetch_related('tags')
            
            # Order by creation date (newest first)
            needs = needs.order_by('-created_at')
            
            # Serialize needs
            needs_data = []
            for need in needs:
                # Build image URL if image exists
                image_url = None
                if need.image:
                    image_url = request.build_absolute_uri(need.image.url)
                
                # Serialize tags
                tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in need.tags.all()]
                
                need_data = {
                    'id': need.id,
                    'user': {
                        'id': need.user.id,
                        'username': need.user.username,
                        'email': need.user.email or '',
                    },
                    'title': need.title,
                    'description': need.description,
                    'location': need.location or '',
                    'latitude': str(need.latitude) if need.latitude else None,
                    'longitude': str(need.longitude) if need.longitude else None,
                    'status': need.status,
                    'tags': tags_data,
                    'contact_preference': need.contact_preference,
                    'created_at': need.created_at.isoformat(),
                    'updated_at': need.updated_at.isoformat(),
                    'expires_at': need.expires_at.isoformat() if need.expires_at else None,
                    'image': image_url,
                }
                needs_data.append(need_data)
            
            response = JsonResponse({
                'needs': needs_data,
                'count': len(needs_data)
            }, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Exception as e:
            return JsonResponse({
                'message': f'Failed to retrieve needs: {str(e)}'
            }, status=500)
    
    # Handle POST request - create need
    # Authenticate user
    user = None
    # Try token-based authentication first (for Safari)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user = get_user_from_token(token)
    
    # Fall back to session-based authentication (for Chrome)
    if not user and request.user.is_authenticated:
        user = request.user
    
    if not user:
        return JsonResponse(
            {"detail": "Authentication required", "message": "Authentication required"},
            status=401,
        )
    
    try:
        # Get form data from POST (FormData) or JSON body
        # Check if request has files or is multipart (FormData)
        if request.FILES or (request.content_type and 'multipart/form-data' in request.content_type):
            # Handle FormData
            title = request.POST.get('title', '')
            description = request.POST.get('description', '')
            location = request.POST.get('location', '')
            image = request.FILES.get('image', None)
            
            # Get tags (can be multiple)
            tag_names = request.POST.getlist('tags') or []
        else:
            # Handle JSON
            body = json.loads(request.body)
            title = body.get('title', '')
            description = body.get('description', '')
            location = body.get('location', '')
            image = None  # Can't send files via JSON
            
            # Get tags (can be multiple)
            tag_names = body.get('tags', [])
            if not isinstance(tag_names, list):
                tag_names = [tag_names] if tag_names else []
        
        # Validate required fields
        errors = {}
        if not title:
            errors['title'] = ['Title is required.']
        elif len(title) < 5:
            errors['title'] = ['Title must be at least 5 characters long.']
        
        if not description:
            errors['description'] = ['Description is required.']
        elif len(description) < 20:
            errors['description'] = ['Description must be at least 20 characters long.']
        
        if errors:
            # Format error message for frontend
            error_messages = []
            for field, field_errors in errors.items():
                error_messages.extend(field_errors)
            return JsonResponse({
                'errors': errors,
                'message': ' '.join(error_messages) if error_messages else 'Validation failed.'
            }, status=400)
        
        # Create the need
        need = Need.objects.create(
            user=user,
            title=title,
            description=description,
            location=location,
            image=image,  # Django ImageField handles None automatically
        )

        # Handle tags - create or get existing tags
        for tag_name in tag_names:
            if tag_name.strip():
                tag_name_lower = tag_name.strip().lower()
                tag, created = Tag.objects.get_or_create(
                    name=tag_name_lower,
                    defaults={'slug': slugify(tag_name_lower)}
                )
                need.tags.add(tag)
        
        # Return success response
        return JsonResponse({
            'message': 'Need created successfully',
            'id': need.id,
            'title': need.title,
        }, status=201)
        
    except ValueError as e:
        return JsonResponse({
            'message': f'Failed to create need: {str(e)}'
        }, status=500)
    except Exception as e:
        return JsonResponse({
            'message': f'Failed to create need: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "OPTIONS"])
def api_need_detail(request, need_id):
    """API endpoint for retrieving (GET) and updating (PUT/PATCH) a single need by ID."""
    # Handle OPTIONS preflight request for CORS
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response["Access-Control-Allow-Methods"] = "GET, PUT, PATCH, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Authenticate user for PUT/PATCH requests
    authenticated_user = None
    if request.method in ["PUT", "PATCH"]:
        # Try token-based authentication first (for Safari)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            authenticated_user = get_user_from_token(token)
        
        # Fall back to session-based authentication (for Chrome)
        if not authenticated_user and request.user.is_authenticated:
            authenticated_user = request.user
        
        if not authenticated_user:
            response = JsonResponse(
                {"detail": "Authentication required", "message": "Authentication required"},
                status=401,
            )
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
    
    # Handle GET request
    if request.method == "GET":
        try:
            # Get the need by ID
            need = Need.objects.select_related('user').prefetch_related('tags').get(id=need_id)
            
            # Build image URL if image exists
            image_url = None
            if need.image:
                image_url = request.build_absolute_uri(need.image.url)
            
            # Serialize tags
            tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in need.tags.all()]
            
            need_data = {
                'id': need.id,
                'user': {
                    'id': need.user.id,
                    'username': need.user.username,
                    'email': need.user.email or '',
                },
                'title': need.title,
                'description': need.description,
                'location': need.location or '',
                'latitude': str(need.latitude) if need.latitude else None,
                'longitude': str(need.longitude) if need.longitude else None,
                'status': need.status,
                'tags': tags_data,
                'contact_preference': need.contact_preference,
                'created_at': need.created_at.isoformat(),
                'updated_at': need.updated_at.isoformat(),
                'expires_at': need.expires_at.isoformat() if need.expires_at else None,
                'image': image_url,
            }
            
            response = JsonResponse(need_data, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Need.DoesNotExist:
            return JsonResponse({
                'message': 'Need not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'message': f'Failed to retrieve need: {str(e)}'
            }, status=500)
    
    # Handle PUT/PATCH request - update need
    if request.method in ["PUT", "PATCH"]:
        try:
            # Get the need by ID
            need = Need.objects.select_related('user').prefetch_related('tags').get(id=need_id)
            
            # Check if user is the owner
            if need.user.id != authenticated_user.id:
                response = JsonResponse({
                    'message': 'You do not have permission to edit this need'
                }, status=403)
                response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                response["Access-Control-Allow-Credentials"] = "true"
                return response
            
            # Get form data from PUT/PATCH (FormData) or JSON body
            # Frontend now sends JSON for updates without images, FormData only when image is included
            content_type = request.content_type or request.META.get('CONTENT_TYPE', '')
            
            title = None
            description = None
            location = None
            image = None
            tag_names = []
            
            if 'multipart/form-data' in content_type:
                # Try to get from request.POST and request.FILES
                # Note: For PUT requests, Django may not populate these automatically
                # This may require middleware or manual parsing
                if hasattr(request, 'POST') and request.POST:
                    title = request.POST.get('title', None)
                    description = request.POST.get('description', None)
                    location = request.POST.get('location', None)
                    tag_names = request.POST.getlist('tags') or []
                
                if hasattr(request, 'FILES') and request.FILES:
                    image = request.FILES.get('image', None)
            else:
                # Handle JSON (preferred method, used when no image is being uploaded)
                try:
                    body = json.loads(request.body)
                    title = body.get('title', None)
                    description = body.get('description', None)
                    location = body.get('location', None)
                    
                    # Get tags (can be multiple)
                    tag_names = body.get('tags', [])
                    if not isinstance(tag_names, list):
                        tag_names = [tag_names] if tag_names else []
                    image = None
                except (json.JSONDecodeError, ValueError) as json_error:
                    # If JSON parsing fails, return error
                    response = JsonResponse({
                        'message': f'Invalid request body format: {str(json_error)}'
                    }, status=400)
                    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
            
            # Debug logging (remove in production)
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"PUT request - title: {title}, description: {description}, location: {location}, tags: {tag_names}, has_image: {image is not None}")
            
            # Update fields if provided
            if title is not None:
                if len(title) < 5:
                    response = JsonResponse({
                        'errors': {'title': ['Title must be at least 5 characters long.']},
                        'message': 'Title must be at least 5 characters long.'
                    }, status=400)
                    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
                need.title = title
            
            if description is not None:
                if len(description) < 20:
                    response = JsonResponse({
                        'errors': {'description': ['Description must be at least 20 characters long.']},
                        'message': 'Description must be at least 20 characters long.'
                    }, status=400)
                    response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
                    response["Access-Control-Allow-Credentials"] = "true"
                    return response
                need.description = description
            
            if location is not None:
                need.location = location
            
            if image is not None:
                need.image = image
            
            need.save()
            
            # Handle tags - clear existing and add new ones
            if tag_names is not None:
                need.tags.clear()
                for tag_name in tag_names:
                    if tag_name.strip():
                        tag_name_lower = tag_name.strip().lower()
                        tag, created = Tag.objects.get_or_create(
                            name=tag_name_lower,
                            defaults={'slug': slugify(tag_name_lower)}
                        )
                        need.tags.add(tag)
            
            # Build image URL if image exists
            image_url = None
            if need.image:
                image_url = request.build_absolute_uri(need.image.url)
            
            # Serialize tags
            tags_data = [{'id': tag.id, 'name': tag.name, 'slug': tag.slug} for tag in need.tags.all()]
            
            need_data = {
                'id': need.id,
                'user': {
                    'id': need.user.id,
                    'username': need.user.username,
                    'email': need.user.email or '',
                },
                'title': need.title,
                'description': need.description,
                'location': need.location or '',
                'latitude': str(need.latitude) if need.latitude else None,
                'longitude': str(need.longitude) if need.longitude else None,
                'status': need.status,
                'tags': tags_data,
                'contact_preference': need.contact_preference,
                'created_at': need.created_at.isoformat(),
                'updated_at': need.updated_at.isoformat(),
                'expires_at': need.expires_at.isoformat() if need.expires_at else None,
                'image': image_url,
            }
            
            response = JsonResponse(need_data, status=200)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
            
        except Need.DoesNotExist:
            response = JsonResponse({
                'message': 'Need not found'
            }, status=404)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response
        except Exception as e:
            response = JsonResponse({
                'message': f'Failed to update need: {str(e)}'
            }, status=500)
            response["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Credentials"] = "true"
            return response

