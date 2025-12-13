from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import re


class UserProfile(models.Model):
    """
    Extended user profile with additional information for The Hive community.
    """
    RANK_CHOICES = [
        ('newbee', 'New Bee'),
        ('worker', 'Worker Bee'),
        ('queen', 'Queen Bee'),
        ('drone', 'Drone'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True, help_text="Tell us about yourself")
    location = models.CharField(max_length=100, blank=True, help_text="Your general location")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Latitude for map")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Longitude for map")
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True, help_text="Profile picture")
    reputation_score = models.DecimalField(max_digits=5, decimal_places=1, default=0.0, help_text="User reputation score")
    rank = models.CharField(max_length=20, choices=RANK_CHOICES, default='newbee', help_text="User rank badge")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username}'s Profile"


class Tag(models.Model):
    """
    Semantic tags for categorizing offers and needs.
    Examples: "gardening", "tutoring", "repairs", "childcare", etc.
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Offer(models.Model):
    """
    Services or help that users are offering to the community.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('fulfilled', 'Fulfilled'),
        ('paused', 'Paused'),
        ('expired', 'Expired'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers')
    title = models.CharField(max_length=200, validators=[MinLengthValidator(5)])
    description = models.TextField(validators=[MinLengthValidator(20)])
    tags = models.ManyToManyField(Tag, related_name='offers', blank=True)
    
    # Location information
    location = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When this offer expires")
    
    # Additional metadata
    is_reciprocal = models.BooleanField(default=True, help_text="User is open to receiving help in return")
    contact_preference = models.CharField(
        max_length=50, 
        default='message',
        choices=[
            ('message', 'In-app message'),
            ('email', 'Email'),
            ('phone', 'Phone'),
            ('any', 'Any method'),
        ]
    )
    
    # Image upload
    image = models.ImageField(upload_to='offers/', blank=True, null=True, help_text="Image for the offer")
    
    # Offer-specific details
    frequency = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('one-time', 'One-time'),
            ('weekly', 'Weekly'),
            ('bi-weekly', 'Bi-weekly'),
            ('monthly', 'Monthly'),
            ('on-demand', 'On-demand'),
        ],
        help_text="How often this offer is available"
    )
    duration = models.CharField(max_length=50, blank=True, help_text="Duration of the offer (e.g., '1 Hour', '2 Hours')")
    min_people = models.IntegerField(null=True, blank=True, help_text="Minimum number of people")
    max_people = models.IntegerField(null=True, blank=True, help_text="Maximum number of people")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"{self.title} by {self.user.username}"
    
    def is_expired(self):
        """Check if the offer has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def save(self, *args, **kwargs):
        """Auto-update status if expired."""
        if self.is_expired() and self.status == 'active':
            self.status = 'expired'
        super().save(*args, **kwargs)


class Need(models.Model):
    """
    Services or help that users are requesting from the community.
    """
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('fulfilled', 'Fulfilled'),
        ('closed', 'Closed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='needs')
    title = models.CharField(max_length=200, validators=[MinLengthValidator(5)])
    description = models.TextField(validators=[MinLengthValidator(20)])
    tags = models.ManyToManyField(Tag, related_name='needs', blank=True)
    
    # Location information
    location = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When this need expires")
    
    # Additional metadata
    contact_preference = models.CharField(
        max_length=50, 
        default='message',
        choices=[
            ('message', 'In-app message'),
            ('email', 'Email'),
            ('phone', 'Phone'),
            ('any', 'Any method'),
        ]
    )
    
    # Image upload
    image = models.ImageField(upload_to='needs/', blank=True, null=True, help_text="Image for the need")
    
    # Need-specific details
    duration = models.CharField(max_length=50, blank=True, help_text="Duration of the need (e.g., '1 Hour', '2 Hours')")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['latitude', 'longitude']),
        ]
    
    def __str__(self):
        return f"{self.title} by {self.user.username}"
    
    def is_expired(self):
        """Check if the need has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def save(self, *args, **kwargs):
        """Auto-update status if expired."""
        if self.is_expired() and self.status == 'open':
            self.status = 'closed'
        super().save(*args, **kwargs)


class OfferInterest(models.Model):
    """
    Represents a user's interest in an offer.
    Users can express interest in offers created by others.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='interests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offer_interests')
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, help_text="Message expressing interest")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['offer', 'user']),
        ]
        # Ensure a user can only express interest once per offer
        unique_together = [['offer', 'user']]
    
    def __str__(self):
        return f"{self.user.username} interested in '{self.offer.title}' ({self.status})"


class NeedInterest(models.Model):
    """
    Represents a user's interest in helping with a need.
    Users can express interest in fulfilling needs created by others.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('withdrawn', 'Withdrawn'),
    ]
    
    need = models.ForeignKey(Need, on_delete=models.CASCADE, related_name='interests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='need_interests')
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, help_text="Message expressing interest in helping")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['need', 'user']),
        ]
        # Ensure a user can only express interest once per need
        unique_together = [['need', 'user']]
    
    def __str__(self):
        return f"{self.user.username} interested in helping '{self.need.title}' ({self.status})"


class Handshake(models.Model):
    """
    Represents a finalized agreement between users after an interest has been accepted
    and both parties have agreed to proceed. Created from either an OfferInterest or NeedInterest.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Handshake is created from either an offer interest or need interest
    offer_interest = models.OneToOneField(
        OfferInterest,
        on_delete=models.CASCADE,
        related_name='handshake',
        null=True,
        blank=True,
        help_text="The offer interest this handshake is based on"
    )
    need_interest = models.OneToOneField(
        NeedInterest,
        on_delete=models.CASCADE,
        related_name='handshake',
        null=True,
        blank=True,
        help_text="The need interest this handshake is based on"
    )
    
    # The two users involved in the handshake
    # For offer: offer_creator and interested_user
    # For need: need_creator and helping_user
    user1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='handshakes_as_user1',
        help_text="First user in the handshake (offer/need creator)"
    )
    user2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='handshakes_as_user2',
        help_text="Second user in the handshake (interested/helping user)"
    )
    
    # Status and timing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True, help_text="When the exchange actually started")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When the exchange was completed")
    
    # Additional notes
    notes = models.TextField(blank=True, help_text="Any additional notes about the handshake")
    
    # Honey tracking
    honey_amount = models.IntegerField(
        default=0,
        help_text="Amount of honey provisioned for this handshake (in hours)"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['user1', 'user2']),
        ]
    
    def clean(self):
        """Validate that exactly one of offer_interest or need_interest is set."""
        if not self.offer_interest and not self.need_interest:
            raise ValidationError("Handshake must have either an offer_interest or need_interest.")
        if self.offer_interest and self.need_interest:
            raise ValidationError("Handshake cannot have both offer_interest and need_interest.")
    
    def save(self, *args, **kwargs):
        """Run validation before saving and handle honey transfer on completion."""
        # Check if status is being changed to 'completed'
        if self.pk:
            try:
                old_handshake = Handshake.objects.get(pk=self.pk)
                old_status = old_handshake.status
                new_status = self.status
                
                # If transitioning to completed, finalize honey transaction
                if old_status != 'completed' and new_status == 'completed':
                    self._finalize_honey_transaction()
                # If transitioning to cancelled, release provisioned honey
                elif old_status != 'cancelled' and new_status == 'cancelled':
                    self._release_provisioned_honey()
            except Handshake.DoesNotExist:
                pass
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    def _finalize_honey_transaction(self):
        """Finalize honey transaction when handshake is completed."""
        if self.honey_amount <= 0:
            return  # No honey to transfer
        
        spender = self.get_spender()
        earner = self.get_earner()
        
        if not spender or not earner:
            return  # Invalid handshake
        
        # Get or create honey balances
        spender_balance, _ = HoneyBalance.objects.get_or_create(
            user=spender,
            defaults={'total_honey': 0, 'provisioned_honey': 0}
        )
        earner_balance, _ = HoneyBalance.objects.get_or_create(
            user=earner,
            defaults={'total_honey': 0, 'provisioned_honey': 0}
        )
        
        # Finalize transaction: deduct from spender, add to earner
        try:
            spender_balance.finalize_transaction(self.honey_amount)
            earner_balance.add_honey(self.honey_amount)
        except ValidationError as e:
            # Log error but don't prevent handshake completion
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error finalizing honey transaction for handshake {self.id}: {e}")
    
    def _release_provisioned_honey(self):
        """Release provisioned honey when handshake is cancelled."""
        if self.honey_amount <= 0:
            return  # No honey to release
        
        spender = self.get_spender()
        if not spender:
            return  # Invalid handshake
        
        # Get honey balance
        try:
            spender_balance = HoneyBalance.objects.get(user=spender)
            spender_balance.release_provision(self.honey_amount)
        except HoneyBalance.DoesNotExist:
            pass  # No balance to release from
        except ValidationError as e:
            # Log error but don't prevent cancellation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error releasing provisioned honey for handshake {self.id}: {e}")
    
    def __str__(self):
        interest_type = "Offer" if self.offer_interest else "Need"
        return f"Handshake: {self.user1.username} ↔ {self.user2.username} ({interest_type}, {self.status})"
    
    def get_offer(self):
        """Get the associated offer if this is an offer handshake."""
        if self.offer_interest:
            return self.offer_interest.offer
        return None
    
    def get_need(self):
        """Get the associated need if this is a need handshake."""
        if self.need_interest:
            return self.need_interest.need
        return None
    
    def get_other_user(self, user):
        """Get the other user in the handshake."""
        if user == self.user1:
            return self.user2
        elif user == self.user2:
            return self.user1
        return None
    
    def get_duration_hours(self):
        """Get the duration in hours for this handshake."""
        if self.offer_interest:
            offer = self.offer_interest.offer
            return parse_duration_to_hours(offer.duration)
        elif self.need_interest:
            need = self.need_interest.need
            return parse_duration_to_hours(need.duration)
        return 0
    
    def get_spender(self):
        """
        Get the user who should spend honey.
        For offers: acceptor (user2) spends, creator (user1) earns
        For needs: creator (user1) spends, responder (user2) earns
        """
        if self.offer_interest:
            return self.user2  # Acceptor spends
        elif self.need_interest:
            return self.user1  # Creator spends
        return None
    
    def get_earner(self):
        """
        Get the user who should earn honey.
        For offers: creator (user1) earns, acceptor (user2) spends
        For needs: responder (user2) earns, creator (user1) spends
        """
        if self.offer_interest:
            return self.user1  # Creator earns
        elif self.need_interest:
            return self.user2  # Responder earns
        return None


class Message(models.Model):
    """
    Messages between users regarding offers, needs, or general communication.
    Can be associated with an interest, handshake, or standalone.
    """
    # Optional association with interests
    offer_interest = models.ForeignKey(
        OfferInterest, 
        on_delete=models.CASCADE, 
        related_name='messages', 
        null=True, 
        blank=True
    )
    need_interest = models.ForeignKey(
        NeedInterest, 
        on_delete=models.CASCADE, 
        related_name='messages', 
        null=True, 
        blank=True
    )
    
    # Optional association with handshake
    handshake = models.ForeignKey(
        Handshake,
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True,
        help_text="Message within an active handshake"
    )
    
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(validators=[MinLengthValidator(1)])
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'recipient', '-created_at']),
            models.Index(fields=['is_read', '-created_at']),
            models.Index(fields=['handshake', '-created_at']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.username} to {self.recipient.username}"


class HoneyBalance(models.Model):
    """
    Tracks honey (hour credit) balance for each user.
    Honey represents one hour of time.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='honey_balance')
    total_honey = models.IntegerField(
        default=0,
        help_text="Total honey balance (usable + provisioned) in hours"
    )
    provisioned_honey = models.IntegerField(
        default=0,
        help_text="Honey temporarily reserved in active handshakes (in hours)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.user.username}'s Honey Balance: {self.usable_honey} usable / {self.total_honey} total"
    
    @property
    def usable_honey(self):
        """Calculate usable honey (total - provisioned)."""
        return self.total_honey - self.provisioned_honey
    
    def can_afford(self, amount):
        """Check if user has enough usable honey for a transaction."""
        return self.usable_honey >= int(amount)
    
    def provision(self, amount):
        """Provision (reserve) honey for a handshake."""
        amount = int(amount)
        if not self.can_afford(amount):
            raise ValidationError(f"Insufficient honey. Available: {self.usable_honey}, Required: {amount}")
        self.provisioned_honey += amount
        self.save()
    
    def release_provision(self, amount):
        """Release provisioned honey (e.g., if handshake is cancelled)."""
        amount = int(amount)
        if self.provisioned_honey < amount:
            raise ValidationError(f"Cannot release more than provisioned. Provisioned: {self.provisioned_honey}, Requested: {amount}")
        self.provisioned_honey -= amount
        self.save()
    
    def add_honey(self, amount):
        """Add honey to total balance."""
        amount = int(amount)
        self.total_honey += amount
        self.save()
    
    def deduct_honey(self, amount):
        """Deduct honey from total balance."""
        amount = int(amount)
        if self.total_honey < amount:
            raise ValidationError(f"Insufficient total honey. Available: {self.total_honey}, Required: {amount}")
        self.total_honey -= amount
        self.save()
    
    def finalize_transaction(self, provisioned_amount):
        """
        Finalize a transaction: deduct provisioned amount from spender and add to earner.
        This should be called on the spender's balance.
        """
        provisioned_amount = int(provisioned_amount)
        if self.provisioned_honey < provisioned_amount:
            raise ValidationError(f"Cannot finalize: provisioned amount mismatch. Provisioned: {self.provisioned_honey}, Requested: {provisioned_amount}")
        # Deduct from total and release provision
        self.total_honey -= provisioned_amount
        self.provisioned_honey -= provisioned_amount
        self.save()


def parse_duration_to_hours(duration_str):
    """
    Parse duration string to hours (integer, rounded to nearest hour).
    Examples: "1 Hour" -> 1, "2 Hours" -> 2, "1.5 Hours" -> 2, "30 Minutes" -> 1
    """
    if not duration_str:
        return 0
    
    duration_str = duration_str.strip()
    
    # Try to extract number from string
    # Match patterns like "1 Hour", "2 Hours", "1.5 Hours", "30 Minutes", etc.
    hour_pattern = r'(\d+\.?\d*)\s*(?:hour|hours|hr|hrs)'
    minute_pattern = r'(\d+\.?\d*)\s*(?:minute|minutes|min|mins)'
    
    hours_match = re.search(hour_pattern, duration_str, re.IGNORECASE)
    if hours_match:
        hours = float(hours_match.group(1))
        return round(hours)  # Round to nearest integer
    
    minutes_match = re.search(minute_pattern, duration_str, re.IGNORECASE)
    if minutes_match:
        minutes = float(minutes_match.group(1))
        hours = minutes / 60.0  # Convert minutes to hours
        return round(hours)  # Round to nearest integer hour
    
    # If no pattern matches, try to extract just the number
    number_match = re.search(r'(\d+\.?\d*)', duration_str)
    if number_match:
        # Assume it's hours if no unit specified
        hours = float(number_match.group(1))
        return round(hours)  # Round to nearest integer
    
    return 0

