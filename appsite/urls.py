"""
URL configuration for appsite project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', views.api_login, name='api_login'),
    path('api/auth/logout/', views.api_logout, name='api_logout'),
    path('api/auth/register/', views.api_register, name='api_register'),
    path('api/auth/user/', views.api_user, name='api_user'),
    path('api/hello/', views.hello_api, name='hello_api'),
    path('api/offers/', views.api_offers, name='api_offers'),  # GET for listing, POST for creating
    path('api/offers/<int:offer_id>/', views.api_offer_detail, name='api_offer_detail'),  # GET for single offer, PUT/PATCH for updating
    path('api/needs/', views.api_needs, name='api_needs'),  # GET for listing, POST for creating
    path('api/needs/<int:need_id>/', views.api_need_detail, name='api_need_detail'),  # GET for single need, PUT/PATCH for updating
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
