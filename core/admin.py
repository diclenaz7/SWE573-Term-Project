from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, Tag, Offer, Need, OfferInterest, NeedInterest, Handshake, Message


# Inline admin for UserProfile
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'


# Extend the User admin to include UserProfile
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'status', 'location', 'created_at', 'expires_at']
    list_filter = ['status', 'is_reciprocal', 'created_at', 'expires_at']
    search_fields = ['title', 'description', 'user__username', 'location']
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'


@admin.register(Need)
class NeedAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'status', 'location', 'created_at', 'expires_at']
    list_filter = ['status', 'created_at', 'expires_at']
    search_fields = ['title', 'description', 'user__username', 'location']
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'


@admin.register(OfferInterest)
class OfferInterestAdmin(admin.ModelAdmin):
    list_display = ['user', 'offer', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'offer__title', 'message']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'


@admin.register(NeedInterest)
class NeedInterestAdmin(admin.ModelAdmin):
    list_display = ['user', 'need', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'need__title', 'message']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'


@admin.register(Handshake)
class HandshakeAdmin(admin.ModelAdmin):
    list_display = ['user1', 'user2', 'status', 'offer_interest', 'need_interest', 'created_at', 'completed_at']
    list_filter = ['status', 'created_at', 'completed_at']
    search_fields = ['user1__username', 'user2__username', 'notes']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Interest', {
            'fields': ('offer_interest', 'need_interest')
        }),
        ('Users', {
            'fields': ('user1', 'user2')
        }),
        ('Status', {
            'fields': ('status', 'started_at', 'completed_at')
        }),
        ('Additional', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'handshake', 'offer_interest', 'need_interest', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'recipient__username', 'content']
    readonly_fields = ['created_at']

