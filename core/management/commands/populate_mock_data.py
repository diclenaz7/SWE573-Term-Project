"""
Django management command to populate the database with mock data for testing and presentation.

Usage:
    python manage.py populate_mock_data
    python manage.py populate_mock_data --clear  # Clear existing data first
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify
from datetime import timedelta
from decimal import Decimal
from core.models import (
    UserProfile, Tag, Offer, Need, 
    OfferInterest, NeedInterest, Handshake
)


class Command(BaseCommand):
    help = 'Populate the database with mock data for testing and presentation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing mock data before populating',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting to populate mock data...'))
        
        if options['clear']:
            self.clear_existing_data()
        
        # Create tags first
        tags = self.create_tags()
        
        # Create users and profiles
        users = self.create_users()
        
        # Create offers
        offers = self.create_offers(users, tags)
        
        # Create needs
        needs = self.create_needs(users, tags)
        
        # Create some interests and handshakes
        self.create_interests_and_handshakes(users, offers, needs)
        
        self.stdout.write(self.style.SUCCESS('\n✅ Successfully populated database with mock data!'))
        self.stdout.write(f'   - {len(users)} users created')
        self.stdout.write(f'   - {len(tags)} tags created')
        self.stdout.write(f'   - {len(offers)} offers created')
        self.stdout.write(f'   - {len(needs)} needs created')

    def clear_existing_data(self):
        """Clear existing mock data"""
        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        Handshake.objects.all().delete()
        OfferInterest.objects.all().delete()
        NeedInterest.objects.all().delete()
        Offer.objects.all().delete()
        Need.objects.all().delete()
        Tag.objects.all().delete()
        UserProfile.objects.all().delete()
        # Only delete users that were created for testing (those with specific usernames)
        test_usernames = [
            'gardening_guru', 'tech_helper', 'cooking_mom', 'pet_lover',
            'new_parent', 'elderly_neighbor', 'student_helper', 'car_owner',
            'handyman_joe', 'tutor_sarah', 'chef_mike', 'driver_alex'
        ]
        User.objects.filter(username__in=test_usernames).delete()
        self.stdout.write(self.style.SUCCESS('Existing data cleared.'))

    def create_tags(self):
        """Create tags for categorizing offers and needs"""
        tag_data = [
            {'name': 'gardening', 'description': 'Gardening and landscaping services'},
            {'name': 'outdoor', 'description': 'Outdoor activities and services'},
            {'name': 'technology', 'description': 'Tech support and computer help'},
            {'name': 'computers', 'description': 'Computer-related services'},
            {'name': 'cooking', 'description': 'Cooking and meal preparation'},
            {'name': 'food', 'description': 'Food-related services'},
            {'name': 'pets', 'description': 'Pet care and services'},
            {'name': 'care', 'description': 'Care services'},
            {'name': 'childcare', 'description': 'Childcare services'},
            {'name': 'babysitting', 'description': 'Babysitting services'},
            {'name': 'moving', 'description': 'Moving and transportation'},
            {'name': 'heavy lifting', 'description': 'Heavy lifting assistance'},
            {'name': 'tutoring', 'description': 'Educational tutoring'},
            {'name': 'education', 'description': 'Educational services'},
            {'name': 'automotive', 'description': 'Car and vehicle services'},
            {'name': 'emergency', 'description': 'Emergency assistance'},
            {'name': 'repairs', 'description': 'Repair services'},
            {'name': 'cleaning', 'description': 'Cleaning services'},
            {'name': 'delivery', 'description': 'Delivery services'},
            {'name': 'transportation', 'description': 'Transportation services'},
        ]
        
        tags = {}
        for tag_info in tag_data:
            tag, created = Tag.objects.get_or_create(
                name=tag_info['name'],
                defaults={
                    'slug': slugify(tag_info['name']),
                    'description': tag_info['description']
                }
            )
            tags[tag_info['name']] = tag
            if created:
                self.stdout.write(f'  ✓ Created tag: {tag.name}')
        
        return tags

    def create_users(self):
        """Create users with profiles"""
        users_data = [
            {
                'username': 'gardening_guru',
                'email': 'guru@example.com',
                'first_name': 'John',
                'last_name': 'Green',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Passionate gardener with 10+ years of experience. Love helping neighbors with their gardens!',
                    'location': 'San Francisco, CA',
                    'latitude': Decimal('37.7749'),
                    'longitude': Decimal('-122.4194'),
                    'phone': '415-555-0101',
                    'is_verified': True,
                }
            },
            {
                'username': 'tech_helper',
                'email': 'tech@example.com',
                'first_name': 'Sarah',
                'last_name': 'Tech',
                'password': 'testpass123',
                'profile': {
                    'bio': 'IT professional offering free tech support to the community.',
                    'location': 'Oakland, CA',
                    'latitude': Decimal('37.8044'),
                    'longitude': Decimal('-122.2712'),
                    'phone': '510-555-0102',
                    'is_verified': True,
                }
            },
            {
                'username': 'cooking_mom',
                'email': 'mom@example.com',
                'first_name': 'Maria',
                'last_name': 'Cook',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Home cook who loves sharing meals with neighbors. Specializing in vegetarian and vegan dishes.',
                    'location': 'Berkeley, CA',
                    'latitude': Decimal('37.8715'),
                    'longitude': Decimal('-122.2730'),
                    'phone': '510-555-0103',
                    'is_verified': False,
                }
            },
            {
                'username': 'pet_lover',
                'email': 'pets@example.com',
                'first_name': 'Alex',
                'last_name': 'Peterson',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Animal lover offering pet sitting services. Experience with dogs, cats, and small animals.',
                    'location': 'San Francisco, CA',
                    'latitude': Decimal('37.7849'),
                    'longitude': Decimal('-122.4094'),
                    'phone': '415-555-0104',
                    'is_verified': True,
                }
            },
            {
                'username': 'new_parent',
                'email': 'parent@example.com',
                'first_name': 'Emily',
                'last_name': 'Parent',
                'password': 'testpass123',
                'profile': {
                    'bio': 'New parent looking for community support and offering help where I can.',
                    'location': 'San Francisco, CA',
                    'latitude': Decimal('37.7749'),
                    'longitude': Decimal('-122.4194'),
                    'phone': '415-555-0105',
                    'is_verified': False,
                }
            },
            {
                'username': 'elderly_neighbor',
                'email': 'neighbor@example.com',
                'first_name': 'Robert',
                'last_name': 'Elder',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Retired and always willing to help neighbors. Sometimes need assistance with heavy tasks.',
                    'location': 'Oakland, CA',
                    'latitude': Decimal('37.8044'),
                    'longitude': Decimal('-122.2712'),
                    'phone': '510-555-0106',
                    'is_verified': True,
                }
            },
            {
                'username': 'student_helper',
                'email': 'student@example.com',
                'first_name': 'David',
                'last_name': 'Student',
                'password': 'testpass123',
                'profile': {
                    'bio': 'High school student looking for tutoring help and offering computer assistance.',
                    'location': 'Berkeley, CA',
                    'latitude': Decimal('37.8715'),
                    'longitude': Decimal('-122.2730'),
                    'phone': '510-555-0107',
                    'is_verified': False,
                }
            },
            {
                'username': 'car_owner',
                'email': 'car@example.com',
                'first_name': 'Lisa',
                'last_name': 'Driver',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Car enthusiast who can help with basic car maintenance and jump starts.',
                    'location': 'San Francisco, CA',
                    'latitude': Decimal('37.7849'),
                    'longitude': Decimal('-122.4094'),
                    'phone': '415-555-0108',
                    'is_verified': False,
                }
            },
            {
                'username': 'handyman_joe',
                'email': 'joe@example.com',
                'first_name': 'Joe',
                'last_name': 'Handyman',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Experienced handyman offering repair and maintenance services.',
                    'location': 'San Francisco, CA',
                    'latitude': Decimal('37.7749'),
                    'longitude': Decimal('-122.4194'),
                    'phone': '415-555-0109',
                    'is_verified': True,
                }
            },
            {
                'username': 'tutor_sarah',
                'email': 'tutor@example.com',
                'first_name': 'Sarah',
                'last_name': 'Teacher',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Professional tutor specializing in math and science. Available for online and in-person sessions.',
                    'location': 'Berkeley, CA',
                    'latitude': Decimal('37.8715'),
                    'longitude': Decimal('-122.2730'),
                    'phone': '510-555-0110',
                    'is_verified': True,
                }
            },
            {
                'username': 'chef_mike',
                'email': 'chef@example.com',
                'first_name': 'Mike',
                'last_name': 'Chef',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Professional chef offering cooking lessons and meal prep services.',
                    'location': 'Oakland, CA',
                    'latitude': Decimal('37.8044'),
                    'longitude': Decimal('-122.2712'),
                    'phone': '510-555-0111',
                    'is_verified': True,
                }
            },
            {
                'username': 'driver_alex',
                'email': 'driver@example.com',
                'first_name': 'Alex',
                'last_name': 'Driver',
                'password': 'testpass123',
                'profile': {
                    'bio': 'Offering rides and delivery services to help neighbors.',
                    'location': 'San Francisco, CA',
                    'latitude': Decimal('37.7849'),
                    'longitude': Decimal('-122.4094'),
                    'phone': '415-555-0112',
                    'is_verified': False,
                }
            },
        ]
        
        users = {}
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                username=user_data['username'],
                defaults={
                    'email': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                }
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                self.stdout.write(f'  ✓ Created user: {user.username}')
            
            # Create or update profile
            profile, profile_created = UserProfile.objects.get_or_create(
                user=user,
                defaults=user_data['profile']
            )
            if not profile_created:
                # Update existing profile
                for key, value in user_data['profile'].items():
                    setattr(profile, key, value)
                profile.save()
            
            users[user_data['username']] = user
        
        return users

    def create_offers(self, users, tags):
        """Create offers"""
        now = timezone.now()
        offers_data = [
            {
                'user': 'gardening_guru',
                'title': 'Free Gardening Help',
                'description': 'I can help with planting, weeding, and garden maintenance. Available weekends. I have 10+ years of experience with organic gardening and can help with vegetable gardens, flower beds, and landscaping.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7749'),
                'longitude': Decimal('-122.4194'),
                'status': 'active',
                'tags': ['gardening', 'outdoor'],
                'is_reciprocal': True,
                'contact_preference': 'message',
                'expires_at': now + timedelta(days=30),
            },
            {
                'user': 'tech_helper',
                'title': 'Computer Troubleshooting Assistance',
                'description': 'Experienced IT professional offering free help with computer issues, software installation, and basic tech support. Can help with Windows, Mac, and Linux systems. Available evenings and weekends.',
                'location': 'Oakland, CA',
                'latitude': Decimal('37.8044'),
                'longitude': Decimal('-122.2712'),
                'status': 'active',
                'tags': ['technology', 'computers'],
                'is_reciprocal': False,
                'contact_preference': 'email',
                'expires_at': now + timedelta(days=25),
            },
            {
                'user': 'cooking_mom',
                'title': 'Home-Cooked Meal Delivery',
                'description': 'I love cooking and would like to share meals with neighbors. I can prepare vegetarian, vegan, or traditional meals. Perfect for busy families or individuals who want home-cooked food.',
                'location': 'Berkeley, CA',
                'latitude': Decimal('37.8715'),
                'longitude': Decimal('-122.2730'),
                'status': 'active',
                'tags': ['cooking', 'food'],
                'is_reciprocal': True,
                'contact_preference': 'any',
                'expires_at': now + timedelta(days=29),
            },
            {
                'user': 'pet_lover',
                'title': 'Pet Sitting Services',
                'description': 'Available to pet sit for dogs and cats. I have experience with various breeds and can provide daily walks, feeding, and companionship. References available upon request.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7849'),
                'longitude': Decimal('-122.4094'),
                'status': 'active',
                'tags': ['pets', 'care'],
                'is_reciprocal': False,
                'contact_preference': 'phone',
                'expires_at': now + timedelta(days=27),
            },
            {
                'user': 'handyman_joe',
                'title': 'Basic Home Repairs',
                'description': 'Offering help with basic home repairs including plumbing, electrical, and carpentry. Can fix leaky faucets, install fixtures, and handle minor repairs. Tools provided.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7749'),
                'longitude': Decimal('-122.4194'),
                'status': 'active',
                'tags': ['repairs'],
                'is_reciprocal': True,
                'contact_preference': 'message',
                'expires_at': now + timedelta(days=20),
            },
            {
                'user': 'tutor_sarah',
                'title': 'Math and Science Tutoring',
                'description': 'Professional tutor offering free tutoring sessions for high school and college students. Specializing in algebra, geometry, calculus, physics, and chemistry. Available online or in-person.',
                'location': 'Berkeley, CA',
                'latitude': Decimal('37.8715'),
                'longitude': Decimal('-122.2730'),
                'status': 'active',
                'tags': ['tutoring', 'education'],
                'is_reciprocal': False,
                'contact_preference': 'email',
                'expires_at': now + timedelta(days=35),
            },
            {
                'user': 'chef_mike',
                'title': 'Cooking Lessons',
                'description': 'Learn to cook like a pro! Offering free cooking lessons for beginners. We can cover basic techniques, meal prep, and recipe development. Great for anyone wanting to improve their kitchen skills.',
                'location': 'Oakland, CA',
                'latitude': Decimal('37.8044'),
                'longitude': Decimal('-122.2712'),
                'status': 'active',
                'tags': ['cooking', 'food'],
                'is_reciprocal': True,
                'contact_preference': 'any',
                'expires_at': now + timedelta(days=28),
            },
            {
                'user': 'driver_alex',
                'title': 'Rides and Delivery Services',
                'description': 'Offering rides to appointments, grocery store, or anywhere in the Bay Area. Also available for package delivery and errands. Flexible schedule.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7849'),
                'longitude': Decimal('-122.4094'),
                'status': 'active',
                'tags': ['transportation', 'delivery'],
                'is_reciprocal': False,
                'contact_preference': 'phone',
                'expires_at': now + timedelta(days=22),
            },
        ]
        
        offers = []
        for offer_data in offers_data:
            user = users[offer_data.pop('user')]
            tag_names = offer_data.pop('tags')
            
            offer = Offer.objects.create(
                user=user,
                **offer_data
            )
            
            # Add tags
            for tag_name in tag_names:
                if tag_name in tags:
                    offer.tags.add(tags[tag_name])
            
            offers.append(offer)
            self.stdout.write(f'  ✓ Created offer: {offer.title}')
        
        return offers

    def create_needs(self, users, tags):
        """Create needs"""
        now = timezone.now()
        needs_data = [
            {
                'user': 'new_parent',
                'title': 'Babysitting for Doctor Appointment',
                'description': 'Need someone to watch my 3-year-old for 2 hours next Tuesday afternoon while I attend a medical appointment. Child is well-behaved and I can provide snacks and activities.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7749'),
                'longitude': Decimal('-122.4194'),
                'status': 'open',
                'tags': ['childcare', 'babysitting'],
                'contact_preference': 'message',
                'expires_at': now + timedelta(days=6),
            },
            {
                'user': 'elderly_neighbor',
                'title': 'Help Moving Furniture',
                'description': 'Need help moving a couch and a few boxes from my living room to the garage. I\'m an elderly person and can\'t lift heavy items. Would appreciate strong volunteers for about 30 minutes.',
                'location': 'Oakland, CA',
                'latitude': Decimal('37.8044'),
                'longitude': Decimal('-122.2712'),
                'status': 'open',
                'tags': ['moving', 'heavy lifting'],
                'contact_preference': 'phone',
                'expires_at': now + timedelta(days=26),
            },
            {
                'user': 'student_helper',
                'title': 'Math Tutoring Needed',
                'description': 'High school student looking for help with algebra and geometry. Need someone patient and experienced to help me understand concepts. Can meet at library or online.',
                'location': 'Berkeley, CA',
                'latitude': Decimal('37.8715'),
                'longitude': Decimal('-122.2730'),
                'status': 'open',
                'tags': ['tutoring', 'education'],
                'contact_preference': 'message',
                'expires_at': now + timedelta(days=24),
            },
            {
                'user': 'car_owner',
                'title': 'Car Battery Jump Start',
                'description': 'My car battery died in the parking lot. Need someone with jumper cables to help me start my car. I\'m at the grocery store on Main Street. Willing to compensate for your time.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7849'),
                'longitude': Decimal('-122.4094'),
                'status': 'open',
                'tags': ['automotive', 'emergency'],
                'contact_preference': 'phone',
                'expires_at': now + timedelta(days=30),
            },
            {
                'user': 'new_parent',
                'title': 'House Cleaning Help',
                'description': 'Looking for someone to help with deep cleaning of my apartment. With a new baby, I haven\'t had time to keep up. Would appreciate help with bathrooms, kitchen, and floors.',
                'location': 'San Francisco, CA',
                'latitude': Decimal('37.7749'),
                'longitude': Decimal('-122.4194'),
                'status': 'open',
                'tags': ['cleaning'],
                'contact_preference': 'message',
                'expires_at': now + timedelta(days=15),
            },
            {
                'user': 'elderly_neighbor',
                'title': 'Grocery Shopping Assistance',
                'description': 'Need help with grocery shopping. I have mobility issues and would appreciate someone to help me shop and carry groceries to my apartment. Can provide a list.',
                'location': 'Oakland, CA',
                'latitude': Decimal('37.8044'),
                'longitude': Decimal('-122.2712'),
                'status': 'open',
                'tags': ['delivery'],
                'contact_preference': 'phone',
                'expires_at': now + timedelta(days=18),
            },
        ]
        
        needs = []
        for need_data in needs_data:
            user = users[need_data.pop('user')]
            tag_names = need_data.pop('tags')
            
            need = Need.objects.create(
                user=user,
                **need_data
            )
            
            # Add tags
            for tag_name in tag_names:
                if tag_name in tags:
                    need.tags.add(tags[tag_name])
            
            needs.append(need)
            self.stdout.write(f'  ✓ Created need: {need.title}')
        
        return needs

    def create_interests_and_handshakes(self, users, offers, needs):
        """Create some interests and handshakes to show the full workflow"""
        now = timezone.now()
        
        # Create a few offer interests
        if len(offers) > 0 and len(users) > 1:
            offer = offers[0]  # First offer
            interested_user = users.get('new_parent')
            if interested_user and interested_user != offer.user:
                interest, created = OfferInterest.objects.get_or_create(
                    offer=offer,
                    user=interested_user,
                    defaults={
                        'status': 'accepted',
                        'message': 'I would love to get some gardening help!',
                    }
                )
                if created:
                    self.stdout.write(f'  ✓ Created offer interest')
                    
                    # Create a handshake from this interest
                    handshake, created = Handshake.objects.get_or_create(
                        offer_interest=interest,
                        defaults={
                            'user1': offer.user,
                            'user2': interested_user,
                            'status': 'active',
                            'started_at': now - timedelta(days=1),
                        }
                    )
                    if created:
                        self.stdout.write(f'  ✓ Created handshake')
        
        # Create a few need interests
        if len(needs) > 0 and len(users) > 1:
            need = needs[0]  # First need
            helping_user = users.get('pet_lover')
            if helping_user and helping_user != need.user:
                interest, created = NeedInterest.objects.get_or_create(
                    need=need,
                    user=helping_user,
                    defaults={
                        'status': 'pending',
                        'message': 'I can help with babysitting!',
                    }
                )
                if created:
                    self.stdout.write(f'  ✓ Created need interest')

