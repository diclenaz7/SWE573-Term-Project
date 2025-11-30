from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
from django.contrib.auth.models import User
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


def hello_api(request):
    """Hello API endpoint."""
    return JsonResponse({'message': 'Hello, World!'})

