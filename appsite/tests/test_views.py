"""
Unit tests for API views.
"""
import json
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from core.models import Offer, Need, Tag, OfferInterest, NeedInterest


class AuthenticationAPITest(TestCase):
    """Test cases for authentication API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def test_api_login_success(self):
        """Test successful login."""
        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['message'], 'Login successful')
        self.assertIn('token', data)
        self.assertEqual(data['user']['username'], 'testuser')
    
    def test_api_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser',
                'password': 'wrongpassword'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_login_missing_fields(self):
        """Test login with missing fields."""
        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_login_invalid_json(self):
        """Test login with invalid JSON."""
        response = self.client.post(
            '/api/auth/login/',
            data='invalid json',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_logout(self):
        """Test logout."""
        # First login to get a token
        login_response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        login_data = json.loads(login_response.content)
        token = login_data['token']
        
        # Then logout
        response = self.client.post(
            '/api/auth/logout/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['message'], 'Logout successful')
    
    def test_api_register_success(self):
        """Test successful registration."""
        response = self.client.post(
            '/api/auth/register/',
            data=json.dumps({
                'username': 'newuser',
                'password1': 'complexpass123',
                'password2': 'complexpass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('message', data)
        self.assertTrue(User.objects.filter(username='newuser').exists())
    
    def test_api_register_duplicate_username(self):
        """Test registration with duplicate username."""
        response = self.client.post(
            '/api/auth/register/',
            data=json.dumps({
                'username': 'testuser',
                'password1': 'complexpass123',
                'password2': 'complexpass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_register_password_mismatch(self):
        """Test registration with password mismatch."""
        response = self.client.post(
            '/api/auth/register/',
            data=json.dumps({
                'username': 'newuser',
                'password1': 'complexpass123',
                'password2': 'differentpass123'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_user_authenticated(self):
        """Test getting current user when authenticated."""
        # Login first
        login_response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        login_data = json.loads(login_response.content)
        token = login_data['token']
        
        # Get user info
        response = self.client.get(
            '/api/auth/user/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['username'], 'testuser')
    
    def test_api_user_unauthenticated(self):
        """Test getting current user when not authenticated."""
        response = self.client.get('/api/auth/user/')
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.content)
        self.assertIn('detail', data)


class OffersAPITest(TestCase):
    """Test cases for offers API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tag = Tag.objects.create(name='gardening', slug='gardening')
        self.offer = Offer.objects.create(
            user=self.user,
            title='Test Offer Title',
            description='This is a test offer description that is long enough',
            location='Test Location',
            status='active'
        )
        self.offer.tags.add(self.tag)
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def _get_auth_token(self):
        """Helper method to get authentication token."""
        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        data = json.loads(response.content)
        return data['token']
    
    def test_api_offers_list_get(self):
        """Test getting list of offers."""
        response = self.client.get('/api/offers/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('offers', data)
        self.assertIn('count', data)
        self.assertEqual(data['count'], 1)
        self.assertEqual(len(data['offers']), 1)
        self.assertEqual(data['offers'][0]['title'], 'Test Offer Title')
    
    def test_api_offers_list_filter_by_status(self):
        """Test filtering offers by status."""
        # Create another offer with different status
        Offer.objects.create(
            user=self.user,
            title='Paused Offer Title',
            description='This is a paused offer description that is long enough',
            status='paused'
        )
        
        response = self.client.get('/api/offers/?status=active')
        data = json.loads(response.content)
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['offers'][0]['status'], 'active')
        
        response = self.client.get('/api/offers/?status=all')
        data = json.loads(response.content)
        self.assertEqual(data['count'], 2)
    
    def test_api_offers_create_success(self):
        """Test creating an offer successfully."""
        token = self._get_auth_token()
        
        response = self.client.post(
            '/api/offers/',
            data=json.dumps({
                'title': 'New Offer Title',
                'description': 'This is a new offer description that is long enough',
                'location': 'New Location',
                'tags': ['tutoring', 'education']
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        self.assertEqual(data['message'], 'Offer created successfully')
        self.assertEqual(data['title'], 'New Offer Title')
        
        # Verify offer was created
        self.assertTrue(Offer.objects.filter(title='New Offer Title').exists())
    
    def test_api_offers_create_unauthenticated(self):
        """Test creating an offer without authentication."""
        response = self.client.post(
            '/api/offers/',
            data=json.dumps({
                'title': 'New Offer Title',
                'description': 'This is a new offer description that is long enough'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
    
    def test_api_offers_create_validation_errors(self):
        """Test creating an offer with validation errors."""
        token = self._get_auth_token()
        
        # Title too short
        response = self.client.post(
            '/api/offers/',
            data=json.dumps({
                'title': 'Test',
                'description': 'This is a test offer description that is long enough'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
        
        # Description too short
        response = self.client.post(
            '/api/offers/',
            data=json.dumps({
                'title': 'Valid Title Here',
                'description': 'Short'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_offers_create_with_tags(self):
        """Test creating an offer with tags."""
        token = self._get_auth_token()
        
        response = self.client.post(
            '/api/offers/',
            data=json.dumps({
                'title': 'Tagged Offer Title',
                'description': 'This is a tagged offer description that is long enough',
                'tags': ['repairs', 'home-improvement']
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 201)
        
        # Verify tags were created and associated
        offer = Offer.objects.get(title='Tagged Offer Title')
        tag_names = [tag.name for tag in offer.tags.all()]
        self.assertIn('repairs', tag_names)
        self.assertIn('home-improvement', tag_names)
    
    def test_api_offer_detail_get(self):
        """Test getting a single offer detail."""
        response = self.client.get(f'/api/offers/{self.offer.id}/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['id'], self.offer.id)
        self.assertEqual(data['title'], 'Test Offer Title')
        self.assertEqual(data['user']['username'], 'testuser')
        self.assertEqual(len(data['tags']), 1)
    
    def test_api_offer_detail_not_found(self):
        """Test getting a non-existent offer."""
        response = self.client.get('/api/offers/99999/')
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.content)
        self.assertIn('message', data)
    
    def test_api_offer_detail_update_success(self):
        """Test updating an offer successfully."""
        token = self._get_auth_token()
        
        response = self.client.put(
            f'/api/offers/{self.offer.id}/',
            data=json.dumps({
                'title': 'Updated Offer Title',
                'description': 'This is an updated offer description that is long enough',
                'location': 'Updated Location',
                'tags': ['updated-tag']
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['title'], 'Updated Offer Title')
        self.assertEqual(data['location'], 'Updated Location')
        
        # Verify update in database
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.title, 'Updated Offer Title')
    
    def test_api_offer_detail_update_unauthenticated(self):
        """Test updating an offer without authentication."""
        response = self.client.put(
            f'/api/offers/{self.offer.id}/',
            data=json.dumps({
                'title': 'Updated Offer Title',
                'description': 'This is an updated offer description that is long enough'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
    
    def test_api_offer_detail_update_unauthorized(self):
        """Test updating an offer that belongs to another user."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        other_token = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'otheruser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        other_token_data = json.loads(other_token.content)
        other_token = other_token_data['token']
        
        response = self.client.put(
            f'/api/offers/{self.offer.id}/',
            data=json.dumps({
                'title': 'Updated Offer Title',
                'description': 'This is an updated offer description that is long enough'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {other_token}'
        )
        self.assertEqual(response.status_code, 403)
        data = json.loads(response.content)
        self.assertIn('message', data)
    
    def test_api_offer_detail_partial_update(self):
        """Test partial update of an offer using PATCH."""
        token = self._get_auth_token()
        
        response = self.client.patch(
            f'/api/offers/{self.offer.id}/',
            data=json.dumps({
                'title': 'Partially Updated Title'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['title'], 'Partially Updated Title')
        # Description should remain unchanged
        self.assertIn('description', data)


class NeedsAPITest(TestCase):
    """Test cases for needs API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.tag = Tag.objects.create(name='tutoring', slug='tutoring')
        self.need = Need.objects.create(
            user=self.user,
            title='Test Need Title',
            description='This is a test need description that is long enough',
            location='Test Location',
            status='open'
        )
        self.need.tags.add(self.tag)
        cache.clear()
    
    def tearDown(self):
        """Clean up after tests."""
        cache.clear()
    
    def _get_auth_token(self):
        """Helper method to get authentication token."""
        response = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'testuser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        data = json.loads(response.content)
        return data['token']
    
    def test_api_needs_list_get(self):
        """Test getting list of needs."""
        response = self.client.get('/api/needs/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('needs', data)
        self.assertIn('count', data)
        self.assertEqual(data['count'], 1)
        self.assertEqual(len(data['needs']), 1)
        self.assertEqual(data['needs'][0]['title'], 'Test Need Title')
    
    def test_api_needs_list_filter_by_status(self):
        """Test filtering needs by status."""
        # Create another need with different status
        Need.objects.create(
            user=self.user,
            title='Fulfilled Need Title',
            description='This is a fulfilled need description that is long enough',
            status='fulfilled'
        )
        
        response = self.client.get('/api/needs/?status=open')
        data = json.loads(response.content)
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['needs'][0]['status'], 'open')
        
        response = self.client.get('/api/needs/?status=all')
        data = json.loads(response.content)
        self.assertEqual(data['count'], 2)
    
    def test_api_needs_create_success(self):
        """Test creating a need successfully."""
        token = self._get_auth_token()
        
        response = self.client.post(
            '/api/needs/',
            data=json.dumps({
                'title': 'New Need Title',
                'description': 'This is a new need description that is long enough',
                'location': 'New Location',
                'tags': ['childcare', 'babysitting']
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        self.assertEqual(data['message'], 'Need created successfully')
        self.assertEqual(data['title'], 'New Need Title')
        
        # Verify need was created
        self.assertTrue(Need.objects.filter(title='New Need Title').exists())
    
    def test_api_needs_create_unauthenticated(self):
        """Test creating a need without authentication."""
        response = self.client.post(
            '/api/needs/',
            data=json.dumps({
                'title': 'New Need Title',
                'description': 'This is a new need description that is long enough'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
    
    def test_api_needs_create_validation_errors(self):
        """Test creating a need with validation errors."""
        token = self._get_auth_token()
        
        # Title too short
        response = self.client.post(
            '/api/needs/',
            data=json.dumps({
                'title': 'Test',
                'description': 'This is a test need description that is long enough'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
        
        # Description too short
        response = self.client.post(
            '/api/needs/',
            data=json.dumps({
                'title': 'Valid Title Here',
                'description': 'Short'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
    
    def test_api_needs_create_with_tags(self):
        """Test creating a need with tags."""
        token = self._get_auth_token()
        
        response = self.client.post(
            '/api/needs/',
            data=json.dumps({
                'title': 'Tagged Need Title',
                'description': 'This is a tagged need description that is long enough',
                'tags': ['cooking', 'meal-prep']
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 201)
        
        # Verify tags were created and associated
        need = Need.objects.get(title='Tagged Need Title')
        tag_names = [tag.name for tag in need.tags.all()]
        self.assertIn('cooking', tag_names)
        self.assertIn('meal-prep', tag_names)
    
    def test_api_need_detail_get(self):
        """Test getting a single need detail."""
        response = self.client.get(f'/api/needs/{self.need.id}/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['id'], self.need.id)
        self.assertEqual(data['title'], 'Test Need Title')
        self.assertEqual(data['user']['username'], 'testuser')
        self.assertEqual(len(data['tags']), 1)
    
    def test_api_need_detail_not_found(self):
        """Test getting a non-existent need."""
        response = self.client.get('/api/needs/99999/')
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.content)
        self.assertIn('message', data)
    
    def test_api_need_detail_update_success(self):
        """Test updating a need successfully."""
        token = self._get_auth_token()
        
        response = self.client.put(
            f'/api/needs/{self.need.id}/',
            data=json.dumps({
                'title': 'Updated Need Title',
                'description': 'This is an updated need description that is long enough',
                'location': 'Updated Location',
                'tags': ['updated-tag']
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['title'], 'Updated Need Title')
        self.assertEqual(data['location'], 'Updated Location')
        
        # Verify update in database
        self.need.refresh_from_db()
        self.assertEqual(self.need.title, 'Updated Need Title')
    
    def test_api_need_detail_update_unauthenticated(self):
        """Test updating a need without authentication."""
        response = self.client.put(
            f'/api/needs/{self.need.id}/',
            data=json.dumps({
                'title': 'Updated Need Title',
                'description': 'This is an updated need description that is long enough'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 401)
    
    def test_api_need_detail_update_unauthorized(self):
        """Test updating a need that belongs to another user."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        other_token = self.client.post(
            '/api/auth/login/',
            data=json.dumps({
                'username': 'otheruser',
                'password': 'testpass123'
            }),
            content_type='application/json'
        )
        other_token_data = json.loads(other_token.content)
        other_token = other_token_data['token']
        
        response = self.client.put(
            f'/api/needs/{self.need.id}/',
            data=json.dumps({
                'title': 'Updated Need Title',
                'description': 'This is an updated need description that is long enough'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {other_token}'
        )
        self.assertEqual(response.status_code, 403)
        data = json.loads(response.content)
        self.assertIn('message', data)
    
    def test_api_need_detail_partial_update(self):
        """Test partial update of a need using PATCH."""
        token = self._get_auth_token()
        
        response = self.client.patch(
            f'/api/needs/{self.need.id}/',
            data=json.dumps({
                'title': 'Partially Updated Title'
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['title'], 'Partially Updated Title')
        # Description should remain unchanged
        self.assertIn('description', data)


class HelloAPITest(TestCase):
    """Test cases for hello API endpoint."""
    
    def setUp(self):
        """Set up test data."""
        self.client = Client()
    
    def test_hello_api(self):
        """Test hello API endpoint."""
        response = self.client.get('/api/hello/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['message'], 'Hello, World!')

