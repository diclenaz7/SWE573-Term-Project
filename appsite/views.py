from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json


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
            login(request, user)
            return JsonResponse({
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'email': user.email or ''
                }
            })
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


@login_required
@require_http_methods(["GET"])
def api_user(request):
    """API endpoint to get current user information."""
    return JsonResponse({
        'username': request.user.username,
        'email': request.user.email or ''
    })


def hello_api(request):
    """Hello API endpoint."""
    return JsonResponse({'message': 'Hello, World!'})

