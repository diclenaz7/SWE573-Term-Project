# Core Models - The Hive

This app contains the core data models for The Hive platform, a community-driven mutual aid exchange system.

## Overview

The Hive enables users to:
- **Offer** services or help to the community
- **Request** help or services (needs)
- **Express interest** in offers or needs
- **Create handshakes** when both parties agree to proceed
- **Message** each other throughout the process

## Models

### UserProfile
Extends Django's built-in `User` model with community-specific information.

**Fields:**
- `user` (OneToOne): Links to Django User
- `bio` (TextField): User biography (max 500 chars)
- `location` (CharField): General location description
- `latitude` / `longitude` (DecimalField): Coordinates for map display
- `phone` (CharField): Contact phone number
- `is_verified` (Boolean): Community verification status
- `created_at` / `updated_at` (DateTimeField): Timestamps

**Usage:**
```python
from django.contrib.auth.models import User
from core.models import UserProfile

user = User.objects.get(username='alice')
profile = user.profile  # Access via related_name
# Or create manually
profile = UserProfile.objects.create(
    user=user,
    bio="Community gardener",
    location="San Francisco, CA",
    latitude=37.7749,
    longitude=-122.4194
)
```

---

### Tag
Semantic tags for categorizing offers and needs.

**Fields:**
- `name` (CharField): Tag name (unique, max 50 chars)
- `slug` (SlugField): URL-friendly version (unique)
- `description` (TextField): Optional description
- `created_at` (DateTimeField): Creation timestamp

**Usage:**
```python
from core.models import Tag

# Create tags
gardening_tag = Tag.objects.create(
    name="Gardening",
    slug="gardening",
    description="Garden maintenance, planting, weeding"
)

# Get or create
tag, created = Tag.objects.get_or_create(
    name="Tutoring",
    slug="tutoring"
)
```

---

### Offer
Services or help that users are offering to the community.

**Fields:**
- `user` (ForeignKey): Creator of the offer
- `title` (CharField): Offer title (min 5 chars)
- `description` (TextField): Detailed description (min 20 chars)
- `tags` (ManyToMany): Associated tags
- `location` (CharField): Location description
- `latitude` / `longitude` (DecimalField): Coordinates
- `status` (CharField): `active`, `fulfilled`, `paused`, `expired`
- `expires_at` (DateTimeField): Optional expiration date
- `is_reciprocal` (Boolean): Open to receiving help in return
- `contact_preference` (CharField): `message`, `email`, `phone`, `any`
- `created_at` / `updated_at` (DateTimeField): Timestamps

**Methods:**
- `is_expired()`: Check if offer has expired
- Auto-updates status to `expired` if expiration date passed

**Usage:**
```python
from core.models import Offer, Tag
from django.utils import timezone
from datetime import timedelta

# Create an offer
offer = Offer.objects.create(
    user=user,
    title="Free Gardening Help",
    description="I can help with planting, weeding, and garden maintenance. Available weekends.",
    location="San Francisco, CA",
    latitude=37.7749,
    longitude=-122.4194,
    is_reciprocal=True,
    contact_preference='message',
    expires_at=timezone.now() + timedelta(days=30)
)

# Add tags
gardening_tag = Tag.objects.get(name="Gardening")
offer.tags.add(gardening_tag)

# Check expiration
if offer.is_expired():
    print("This offer has expired")
```

---

### Need
Services or help that users are requesting from the community.

**Fields:**
- `user` (ForeignKey): Creator of the need
- `title` (CharField): Need title (min 5 chars)
- `description` (TextField): Detailed description (min 20 chars)
- `tags` (ManyToMany): Associated tags
- `location` (CharField): Location description
- `latitude` / `longitude` (DecimalField): Coordinates
- `status` (CharField): `open`, `in_progress`, `fulfilled`, `closed`
- `expires_at` (DateTimeField): Optional expiration date
- `is_urgent` (Boolean): Urgency flag
- `contact_preference` (CharField): `message`, `email`, `phone`, `any`
- `created_at` / `updated_at` (DateTimeField): Timestamps

**Methods:**
- `is_expired()`: Check if need has expired
- Auto-updates status to `closed` if expiration date passed

**Usage:**
```python
from core.models import Need

need = Need.objects.create(
    user=user,
    title="Need Math Tutoring",
    description="Looking for help with algebra for my 14-year-old. Evenings preferred.",
    location="San Francisco, CA",
    latitude=37.7749,
    longitude=-122.4194,
    is_urgent=False,
    contact_preference='email'
)
```

---

### OfferInterest
Represents a user's interest in an offer created by someone else.

**Fields:**
- `offer` (ForeignKey): The offer of interest
- `user` (ForeignKey): User expressing interest
- `status` (CharField): `pending`, `accepted`, `declined`, `withdrawn`
- `message` (TextField): Optional message expressing interest
- `created_at` / `updated_at` (DateTimeField): Timestamps

**Constraints:**
- Unique together: `(offer, user)` - prevents duplicate interests

**Usage:**
```python
from core.models import OfferInterest

# User expresses interest
interest = OfferInterest.objects.create(
    offer=offer,
    user=interested_user,
    message="I'd love some help with my garden! Can we connect?",
    status='pending'
)

# Offer creator accepts
interest.status = 'accepted'
interest.save()
```

---

### NeedInterest
Represents a user's interest in helping with a need created by someone else.

**Fields:**
- `need` (ForeignKey): The need of interest
- `user` (ForeignKey): User offering to help
- `status` (CharField): `pending`, `accepted`, `declined`, `withdrawn`
- `message` (TextField): Optional message expressing interest
- `created_at` / `updated_at` (DateTimeField): Timestamps

**Constraints:**
- Unique together: `(need, user)` - prevents duplicate interests

**Usage:**
```python
from core.models import NeedInterest

# User offers to help
interest = NeedInterest.objects.create(
    need=need,
    user=helping_user,
    message="I can help with math tutoring! I have experience teaching algebra.",
    status='pending'
)

# Need creator accepts
interest.status = 'accepted'
interest.save()
```

---

### Handshake
Represents a finalized agreement between two users after an interest has been accepted and both parties agree to proceed.

**Fields:**
- `offer_interest` (OneToOne): The offer interest (if applicable)
- `need_interest` (OneToOne): The need interest (if applicable)
- `user1` (ForeignKey): First user (offer/need creator)
- `user2` (ForeignKey): Second user (interested/helping user)
- `status` (CharField): `active`, `in_progress`, `completed`, `cancelled`
- `started_at` (DateTimeField): When exchange actually started
- `completed_at` (DateTimeField): When exchange was completed
- `notes` (TextField): Additional notes
- `created_at` / `updated_at` (DateTimeField): Timestamps

**Validation:**
- Must have exactly one of `offer_interest` or `need_interest` (not both, not neither)

**Methods:**
- `get_offer()`: Returns associated offer if applicable
- `get_need()`: Returns associated need if applicable
- `get_other_user(user)`: Gets the other user in the handshake

**Usage:**
```python
from core.models import Handshake
from django.utils import timezone

# After an OfferInterest is accepted and both parties agree
offer_interest = OfferInterest.objects.get(id=interest_id)
offer_interest.status = 'accepted'
offer_interest.save()

# Create handshake
handshake = Handshake.objects.create(
    offer_interest=offer_interest,
    user1=offer_interest.offer.user,  # Offer creator
    user2=offer_interest.user,  # Interested user
    status='active'
)

# Mark as in progress
handshake.status = 'in_progress'
handshake.started_at = timezone.now()
handshake.save()

# When completed
handshake.status = 'completed'
handshake.completed_at = timezone.now()
handshake.save()

# Helper methods
offer = handshake.get_offer()
other_user = handshake.get_other_user(current_user)
```

---

### Message
Messages between users regarding offers, needs, or general communication.

**Fields:**
- `offer_interest` (ForeignKey): Optional - message in context of offer interest
- `need_interest` (ForeignKey): Optional - message in context of need interest
- `handshake` (ForeignKey): Optional - message within active handshake
- `sender` (ForeignKey): User sending the message
- `recipient` (ForeignKey): User receiving the message
- `content` (TextField): Message content (min 1 char)
- `is_read` (Boolean): Read status
- `created_at` (DateTimeField): Creation timestamp

**Usage:**
```python
from core.models import Message

# Message in context of an interest
message = Message.objects.create(
    offer_interest=offer_interest,
    sender=user1,
    recipient=user2,
    content="Hi! I'm interested in your offer. Can we discuss details?",
    is_read=False
)

# Message within a handshake
message = Message.objects.create(
    handshake=handshake,
    sender=user1,
    recipient=user2,
    content="Let's meet this Saturday at 2pm?",
    is_read=False
)

# Standalone message
message = Message.objects.create(
    sender=user1,
    recipient=user2,
    content="Thanks for your help!",
    is_read=False
)
```

---

## Workflow Examples

### Complete Offer Workflow

```python
from django.contrib.auth.models import User
from core.models import Offer, OfferInterest, Handshake, Message
from django.utils import timezone

# 1. User creates an offer
alice = User.objects.get(username='alice')
offer = Offer.objects.create(
    user=alice,
    title="Free Gardening Help",
    description="I can help with planting and weeding.",
    location="San Francisco, CA",
    latitude=37.7749,
    longitude=-122.4194
)

# 2. Another user expresses interest
bob = User.objects.get(username='bob')
interest = OfferInterest.objects.create(
    offer=offer,
    user=bob,
    message="I'd love some help!",
    status='pending'
)

# 3. Users message each other
Message.objects.create(
    offer_interest=interest,
    sender=bob,
    recipient=alice,
    content="When are you available?"
)

Message.objects.create(
    offer_interest=interest,
    sender=alice,
    recipient=bob,
    content="I'm free this weekend!"
)

# 4. Alice accepts the interest
interest.status = 'accepted'
interest.save()

# 5. Both agree to proceed - create handshake
handshake = Handshake.objects.create(
    offer_interest=interest,
    user1=alice,  # Offer creator
    user2=bob,    # Interested user
    status='active'
)

# 6. Exchange happens
handshake.status = 'in_progress'
handshake.started_at = timezone.now()
handshake.save()

# 7. Exchange completed
handshake.status = 'completed'
handshake.completed_at = timezone.now()
handshake.save()

# 8. Mark offer as fulfilled
offer.status = 'fulfilled'
offer.save()
```

### Complete Need Workflow

```python
# 1. User creates a need
need = Need.objects.create(
    user=alice,
    title="Need Math Tutoring",
    description="Looking for algebra help for my teenager.",
    location="San Francisco, CA",
    is_urgent=False
)

# 2. Another user offers to help
interest = NeedInterest.objects.create(
    need=need,
    user=bob,
    message="I can help! I'm a math teacher.",
    status='pending'
)

# 3. Users message and agree
# ... messaging happens ...

# 4. Alice accepts
interest.status = 'accepted'
interest.save()

# 5. Create handshake
handshake = Handshake.objects.create(
    need_interest=interest,
    user1=alice,  # Need creator
    user2=bob,    # Helping user
    status='active'
)

# 6. Complete the exchange
handshake.status = 'completed'
handshake.completed_at = timezone.now()
handshake.save()

need.status = 'fulfilled'
need.save()
```

---

## Querying Examples

### Get Active Offers
```python
active_offers = Offer.objects.filter(status='active')
```

### Get Offers with Specific Tags
```python
gardening_offers = Offer.objects.filter(
    tags__name='Gardening',
    status='active'
).distinct()
```

### Get Urgent Needs
```python
urgent_needs = Need.objects.filter(
    is_urgent=True,
    status='open'
)
```

### Get Pending Interests for User's Offers
```python
my_offers = Offer.objects.filter(user=current_user)
pending_interests = OfferInterest.objects.filter(
    offer__in=my_offers,
    status='pending'
)
```

### Get User's Active Handshakes
```python
active_handshakes = Handshake.objects.filter(
    models.Q(user1=current_user) | models.Q(user2=current_user),
    status__in=['active', 'in_progress']
)
```

### Get Unread Messages
```python
unread_messages = Message.objects.filter(
    recipient=current_user,
    is_read=False
).order_by('-created_at')
```

### Get Messages in a Handshake
```python
handshake_messages = Message.objects.filter(
    handshake=handshake
).order_by('created_at')
```

---

## Database Setup

### Create Migrations
```bash
python manage.py makemigrations core
```

### Apply Migrations
```bash
python manage.py migrate
```

### Create Superuser (for admin access)
```bash
python manage.py createsuperuser
```

---

## Admin Interface

All models are registered in the Django admin interface. Access at `/admin/` after creating a superuser.

**Admin Features:**
- User profiles inline with User admin
- Filterable and searchable lists for all models
- Date hierarchies for time-based filtering
- Read-only timestamp fields

---

## Model Relationships Diagram

```
User (Django built-in)
  ├── UserProfile (OneToOne)
  ├── Offer (ForeignKey - creator)
  ├── Need (ForeignKey - creator)
  ├── OfferInterest (ForeignKey - user expressing interest)
  ├── NeedInterest (ForeignKey - user expressing interest)
  ├── Handshake (ForeignKey - user1 or user2)
  ├── Message (ForeignKey - sender or recipient)

Tag
  ├── Offer (ManyToMany)
  └── Need (ManyToMany)

Offer
  ├── OfferInterest (ForeignKey)
  └── Tag (ManyToMany)

Need
  ├── NeedInterest (ForeignKey)
  └── Tag (ManyToMany)

OfferInterest
  ├── Handshake (OneToOne)
  └── Message (ForeignKey)

NeedInterest
  ├── Handshake (OneToOne)
  └── Message (ForeignKey)

Handshake
  ├── OfferInterest (OneToOne) OR NeedInterest (OneToOne)
  ├── User1 (ForeignKey)
  ├── User2 (ForeignKey)
  └── Message (ForeignKey)

Message
  ├── OfferInterest (ForeignKey, optional)
  ├── NeedInterest (ForeignKey, optional)
  ├── Handshake (ForeignKey, optional)
  ├── Sender (ForeignKey)
  └── Recipient (ForeignKey)
```

---

## Status Workflows

### Offer Status Flow
```
active → fulfilled
active → paused → active
active → expired (automatic)
```

### Need Status Flow
```
open → in_progress → fulfilled
open → closed (automatic if expired)
```

### Interest Status Flow
```
pending → accepted → (handshake created)
pending → declined
pending → withdrawn
```

### Handshake Status Flow
```
active → in_progress → completed
active → cancelled
in_progress → completed
```

---

## Best Practices

1. **Always check expiration** before displaying offers/needs
2. **Validate handshake creation** - ensure interest is accepted first
3. **Use indexes** - models include indexes for common queries
4. **Handle unique constraints** - catch `IntegrityError` when creating interests
5. **Update timestamps** - use `auto_now` and `auto_now_add` fields
6. **Clean data** - use model's `clean()` method for validation

---

## Next Steps

- [ ] Create API views/serializers for these models
- [ ] Add search functionality (full-text search, location-based)
- [ ] Implement notification system for interests and handshakes
- [ ] Add image upload support for offers/needs
- [ ] Create rating/review system for completed handshakes
- [ ] Add email notifications for status changes
- [ ] Implement location-based distance calculations

---

## Notes

- All models use `timezone.now()` for datetime fields (timezone-aware)
- Expiration is automatically handled in `save()` methods
- Unique constraints prevent duplicate interests
- Handshake validation ensures data integrity
- All foreign keys use `CASCADE` deletion for data consistency

