"""
Unit tests for core models.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from core.models import (
    UserProfile, Tag, Offer, Need, OfferInterest, 
    NeedInterest, Handshake, Message
)


class UserProfileModelTest(TestCase):
    """Test cases for UserProfile model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_profile_creation(self):
        """Test creating a user profile."""
        profile = UserProfile.objects.create(
            user=self.user,
            bio='Test bio',
            location='Test Location',
            latitude=40.7128,
            longitude=-74.0060,
            phone='1234567890'
        )
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.bio, 'Test bio')
        self.assertEqual(profile.location, 'Test Location')
        self.assertFalse(profile.is_verified)
    
    def test_user_profile_str(self):
        """Test UserProfile string representation."""
        profile = UserProfile.objects.create(user=self.user)
        self.assertEqual(str(profile), f"{self.user.username}'s Profile")
    
    def test_user_profile_one_to_one_relationship(self):
        """Test that UserProfile has one-to-one relationship with User."""
        profile = UserProfile.objects.create(user=self.user)
        self.assertEqual(self.user.profile, profile)


class TagModelTest(TestCase):
    """Test cases for Tag model."""
    
    def test_tag_creation(self):
        """Test creating a tag."""
        tag = Tag.objects.create(
            name='gardening',
            slug='gardening',
            description='Gardening related services'
        )
        self.assertEqual(tag.name, 'gardening')
        self.assertEqual(tag.slug, 'gardening')
    
    def test_tag_str(self):
        """Test Tag string representation."""
        tag = Tag.objects.create(name='tutoring', slug='tutoring')
        self.assertEqual(str(tag), 'tutoring')
    
    def test_tag_unique_name(self):
        """Test that tag names must be unique."""
        Tag.objects.create(name='repairs', slug='repairs')
        with self.assertRaises(Exception):  # IntegrityError
            Tag.objects.create(name='repairs', slug='repairs-2')


class OfferModelTest(TestCase):
    """Test cases for Offer model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tag = Tag.objects.create(name='gardening', slug='gardening')
    
    def test_offer_creation(self):
        """Test creating an offer."""
        offer = Offer.objects.create(
            user=self.user,
            title='Test Offer Title',
            description='This is a test offer description that is long enough',
            location='Test Location',
            status='active'
        )
        offer.tags.add(self.tag)
        
        self.assertEqual(offer.user, self.user)
        self.assertEqual(offer.title, 'Test Offer Title')
        self.assertEqual(offer.status, 'active')
        self.assertTrue(offer.is_reciprocal)
        self.assertEqual(offer.contact_preference, 'message')
        self.assertIn(self.tag, offer.tags.all())
    
    def test_offer_str(self):
        """Test Offer string representation."""
        offer = Offer.objects.create(
            user=self.user,
            title='Test Offer',
            description='This is a test offer description that is long enough'
        )
        self.assertEqual(str(offer), f"Test Offer by {self.user.username}")
    
    def test_offer_min_length_validation(self):
        """Test that offer title and description have minimum length requirements."""
        # Title too short
        with self.assertRaises(ValidationError):
            offer = Offer(
                user=self.user,
                title='Test',
                description='This is a test offer description that is long enough'
            )
            offer.full_clean()
        
        # Description too short
        with self.assertRaises(ValidationError):
            offer = Offer(
                user=self.user,
                title='Test Offer Title',
                description='Short'
            )
            offer.full_clean()
    
    def test_offer_is_expired(self):
        """Test offer expiration check."""
        # Not expired
        offer = Offer.objects.create(
            user=self.user,
            title='Test Offer Title',
            description='This is a test offer description that is long enough',
            expires_at=timezone.now() + timedelta(days=1)
        )
        self.assertFalse(offer.is_expired())
        
        # Expired
        expired_offer = Offer.objects.create(
            user=self.user,
            title='Expired Offer Title',
            description='This is a test offer description that is long enough',
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.assertTrue(expired_offer.is_expired())
        
        # No expiration date
        no_expiry_offer = Offer.objects.create(
            user=self.user,
            title='No Expiry Offer Title',
            description='This is a test offer description that is long enough'
        )
        self.assertFalse(no_expiry_offer.is_expired())
    
    def test_offer_auto_expire_on_save(self):
        """Test that offer status is automatically updated to expired on save."""
        offer = Offer.objects.create(
            user=self.user,
            title='Test Offer Title',
            description='This is a test offer description that is long enough',
            status='active',
            expires_at=timezone.now() - timedelta(days=1)
        )
        # Save should update status to expired
        offer.save()
        self.assertEqual(offer.status, 'expired')
    
    def test_offer_status_choices(self):
        """Test offer status choices."""
        offer = Offer.objects.create(
            user=self.user,
            title='Test Offer Title',
            description='This is a test offer description that is long enough',
            status='paused'
        )
        self.assertEqual(offer.status, 'paused')
        
        offer.status = 'fulfilled'
        offer.save()
        self.assertEqual(offer.status, 'fulfilled')


class NeedModelTest(TestCase):
    """Test cases for Need model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tag = Tag.objects.create(name='tutoring', slug='tutoring')
    
    def test_need_creation(self):
        """Test creating a need."""
        need = Need.objects.create(
            user=self.user,
            title='Test Need Title',
            description='This is a test need description that is long enough',
            location='Test Location',
            status='open'
        )
        need.tags.add(self.tag)
        
        self.assertEqual(need.user, self.user)
        self.assertEqual(need.title, 'Test Need Title')
        self.assertEqual(need.status, 'open')
        self.assertEqual(need.contact_preference, 'message')
        self.assertIn(self.tag, need.tags.all())
    
    def test_need_str(self):
        """Test Need string representation."""
        need = Need.objects.create(
            user=self.user,
            title='Test Need',
            description='This is a test need description that is long enough'
        )
        self.assertEqual(str(need), f"Test Need by {self.user.username}")
    
    def test_need_min_length_validation(self):
        """Test that need title and description have minimum length requirements."""
        # Title too short
        with self.assertRaises(ValidationError):
            need = Need(
                user=self.user,
                title='Test',
                description='This is a test need description that is long enough'
            )
            need.full_clean()
        
        # Description too short
        with self.assertRaises(ValidationError):
            need = Need(
                user=self.user,
                title='Test Need Title',
                description='Short'
            )
            need.full_clean()
    
    def test_need_is_expired(self):
        """Test need expiration check."""
        # Not expired
        need = Need.objects.create(
            user=self.user,
            title='Test Need Title',
            description='This is a test need description that is long enough',
            expires_at=timezone.now() + timedelta(days=1)
        )
        self.assertFalse(need.is_expired())
        
        # Expired
        expired_need = Need.objects.create(
            user=self.user,
            title='Expired Need Title',
            description='This is a test need description that is long enough',
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.assertTrue(expired_need.is_expired())
        
        # No expiration date
        no_expiry_need = Need.objects.create(
            user=self.user,
            title='No Expiry Need Title',
            description='This is a test need description that is long enough'
        )
        self.assertFalse(no_expiry_need.is_expired())
    
    def test_need_auto_close_on_save(self):
        """Test that need status is automatically updated to closed on save when expired."""
        need = Need.objects.create(
            user=self.user,
            title='Test Need Title',
            description='This is a test need description that is long enough',
            status='open',
            expires_at=timezone.now() - timedelta(days=1)
        )
        # Save should update status to closed
        need.save()
        self.assertEqual(need.status, 'closed')
    
    def test_need_status_choices(self):
        """Test need status choices."""
        need = Need.objects.create(
            user=self.user,
            title='Test Need Title',
            description='This is a test need description that is long enough',
            status='in_progress'
        )
        self.assertEqual(need.status, 'in_progress')
        
        need.status = 'fulfilled'
        need.save()
        self.assertEqual(need.status, 'fulfilled')


class OfferInterestModelTest(TestCase):
    """Test cases for OfferInterest model."""
    
    def setUp(self):
        """Set up test data."""
        self.user1 = User.objects.create_user(
            username='offer_creator',
            email='creator@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='interested_user',
            email='interested@example.com',
            password='testpass123'
        )
        self.offer = Offer.objects.create(
            user=self.user1,
            title='Test Offer Title',
            description='This is a test offer description that is long enough'
        )
    
    def test_offer_interest_creation(self):
        """Test creating an offer interest."""
        interest = OfferInterest.objects.create(
            offer=self.offer,
            user=self.user2,
            message='I am interested in this offer',
            status='pending'
        )
        self.assertEqual(interest.offer, self.offer)
        self.assertEqual(interest.user, self.user2)
        self.assertEqual(interest.status, 'pending')
        self.assertEqual(interest.message, 'I am interested in this offer')
    
    def test_offer_interest_str(self):
        """Test OfferInterest string representation."""
        interest = OfferInterest.objects.create(
            offer=self.offer,
            user=self.user2,
            status='pending'
        )
        expected = f"{self.user2.username} interested in '{self.offer.title}' (pending)"
        self.assertEqual(str(interest), expected)
    
    def test_offer_interest_unique_together(self):
        """Test that a user can only express interest once per offer."""
        OfferInterest.objects.create(
            offer=self.offer,
            user=self.user2,
            status='pending'
        )
        # Try to create duplicate interest
        with self.assertRaises(Exception):  # IntegrityError
            OfferInterest.objects.create(
                offer=self.offer,
                user=self.user2,
                status='pending'
            )
    
    def test_offer_interest_status_choices(self):
        """Test offer interest status choices."""
        interest = OfferInterest.objects.create(
            offer=self.offer,
            user=self.user2,
            status='accepted'
        )
        self.assertEqual(interest.status, 'accepted')
        
        interest.status = 'declined'
        interest.save()
        self.assertEqual(interest.status, 'declined')


class NeedInterestModelTest(TestCase):
    """Test cases for NeedInterest model."""
    
    def setUp(self):
        """Set up test data."""
        self.user1 = User.objects.create_user(
            username='need_creator',
            email='creator@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='helper_user',
            email='helper@example.com',
            password='testpass123'
        )
        self.need = Need.objects.create(
            user=self.user1,
            title='Test Need Title',
            description='This is a test need description that is long enough'
        )
    
    def test_need_interest_creation(self):
        """Test creating a need interest."""
        interest = NeedInterest.objects.create(
            need=self.need,
            user=self.user2,
            message='I can help with this need',
            status='pending'
        )
        self.assertEqual(interest.need, self.need)
        self.assertEqual(interest.user, self.user2)
        self.assertEqual(interest.status, 'pending')
        self.assertEqual(interest.message, 'I can help with this need')
    
    def test_need_interest_str(self):
        """Test NeedInterest string representation."""
        interest = NeedInterest.objects.create(
            need=self.need,
            user=self.user2,
            status='pending'
        )
        expected = f"{self.user2.username} interested in helping '{self.need.title}' (pending)"
        self.assertEqual(str(interest), expected)
    
    def test_need_interest_unique_together(self):
        """Test that a user can only express interest once per need."""
        NeedInterest.objects.create(
            need=self.need,
            user=self.user2,
            status='pending'
        )
        # Try to create duplicate interest
        with self.assertRaises(Exception):  # IntegrityError
            NeedInterest.objects.create(
                need=self.need,
                user=self.user2,
                status='pending'
            )


class HandshakeModelTest(TestCase):
    """Test cases for Handshake model."""
    
    def setUp(self):
        """Set up test data."""
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        self.offer = Offer.objects.create(
            user=self.user1,
            title='Test Offer Title',
            description='This is a test offer description that is long enough'
        )
        self.offer_interest = OfferInterest.objects.create(
            offer=self.offer,
            user=self.user2,
            status='accepted'
        )
        self.need = Need.objects.create(
            user=self.user1,
            title='Test Need Title',
            description='This is a test need description that is long enough'
        )
        self.need_interest = NeedInterest.objects.create(
            need=self.need,
            user=self.user2,
            status='accepted'
        )
    
    def test_handshake_from_offer_interest(self):
        """Test creating a handshake from an offer interest."""
        handshake = Handshake.objects.create(
            offer_interest=self.offer_interest,
            user1=self.user1,
            user2=self.user2,
            status='active'
        )
        self.assertEqual(handshake.offer_interest, self.offer_interest)
        self.assertIsNone(handshake.need_interest)
        self.assertEqual(handshake.user1, self.user1)
        self.assertEqual(handshake.user2, self.user2)
    
    def test_handshake_from_need_interest(self):
        """Test creating a handshake from a need interest."""
        handshake = Handshake.objects.create(
            need_interest=self.need_interest,
            user1=self.user1,
            user2=self.user2,
            status='active'
        )
        self.assertEqual(handshake.need_interest, self.need_interest)
        self.assertIsNone(handshake.offer_interest)
        self.assertEqual(handshake.user1, self.user1)
        self.assertEqual(handshake.user2, self.user2)
    
    def test_handshake_validation_no_interest(self):
        """Test that handshake must have either offer_interest or need_interest."""
        with self.assertRaises(ValidationError):
            handshake = Handshake(
                user1=self.user1,
                user2=self.user2
            )
            handshake.full_clean()
    
    def test_handshake_validation_both_interests(self):
        """Test that handshake cannot have both offer_interest and need_interest."""
        with self.assertRaises(ValidationError):
            handshake = Handshake(
                offer_interest=self.offer_interest,
                need_interest=self.need_interest,
                user1=self.user1,
                user2=self.user2
            )
            handshake.full_clean()
    
    def test_handshake_str(self):
        """Test Handshake string representation."""
        handshake = Handshake.objects.create(
            offer_interest=self.offer_interest,
            user1=self.user1,
            user2=self.user2,
            status='active'
        )
        expected = f"Handshake: {self.user1.username} ↔ {self.user2.username} (Offer, active)"
        self.assertEqual(str(handshake), expected)
    
    def test_handshake_get_offer(self):
        """Test getting the associated offer from a handshake."""
        handshake = Handshake.objects.create(
            offer_interest=self.offer_interest,
            user1=self.user1,
            user2=self.user2
        )
        self.assertEqual(handshake.get_offer(), self.offer)
        self.assertIsNone(handshake.get_need())
    
    def test_handshake_get_need(self):
        """Test getting the associated need from a handshake."""
        handshake = Handshake.objects.create(
            need_interest=self.need_interest,
            user1=self.user1,
            user2=self.user2
        )
        self.assertEqual(handshake.get_need(), self.need)
        self.assertIsNone(handshake.get_offer())
    
    def test_handshake_get_other_user(self):
        """Test getting the other user in a handshake."""
        handshake = Handshake.objects.create(
            offer_interest=self.offer_interest,
            user1=self.user1,
            user2=self.user2
        )
        self.assertEqual(handshake.get_other_user(self.user1), self.user2)
        self.assertEqual(handshake.get_other_user(self.user2), self.user1)
        self.assertIsNone(handshake.get_other_user(User.objects.create_user(
            username='user3',
            email='user3@example.com',
            password='testpass123'
        )))


class MessageModelTest(TestCase):
    """Test cases for Message model."""
    
    def setUp(self):
        """Set up test data."""
        self.sender = User.objects.create_user(
            username='sender',
            email='sender@example.com',
            password='testpass123'
        )
        self.recipient = User.objects.create_user(
            username='recipient',
            email='recipient@example.com',
            password='testpass123'
        )
        self.offer = Offer.objects.create(
            user=self.sender,
            title='Test Offer Title',
            description='This is a test offer description that is long enough'
        )
        self.offer_interest = OfferInterest.objects.create(
            offer=self.offer,
            user=self.recipient,
            status='pending'
        )
    
    def test_message_creation(self):
        """Test creating a message."""
        message = Message.objects.create(
            sender=self.sender,
            recipient=self.recipient,
            content='Hello, this is a test message'
        )
        self.assertEqual(message.sender, self.sender)
        self.assertEqual(message.recipient, self.recipient)
        self.assertEqual(message.content, 'Hello, this is a test message')
        self.assertFalse(message.is_read)
    
    def test_message_with_offer_interest(self):
        """Test creating a message associated with an offer interest."""
        message = Message.objects.create(
            offer_interest=self.offer_interest,
            sender=self.sender,
            recipient=self.recipient,
            content='I am interested in your offer'
        )
        self.assertEqual(message.offer_interest, self.offer_interest)
        self.assertIsNone(message.need_interest)
    
    def test_message_str(self):
        """Test Message string representation."""
        message = Message.objects.create(
            sender=self.sender,
            recipient=self.recipient,
            content='Test message'
        )
        expected = f"Message from {self.sender.username} to {self.recipient.username}"
        self.assertEqual(str(message), expected)
    
    def test_message_min_length_validation(self):
        """Test that message content has minimum length requirement."""
        with self.assertRaises(ValidationError):
            message = Message(
                sender=self.sender,
                recipient=self.recipient,
                content=''
            )
            message.full_clean()

