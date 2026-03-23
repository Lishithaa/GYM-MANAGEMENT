import requests
import sys
import json
from datetime import datetime, timedelta

class HourlyGymAPITester:
    def __init__(self, base_url="https://gymhour-market.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return None

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return None

    def test_cities_and_areas(self):
        """Test cities and areas endpoints"""
        print("\n🏙️ Testing Cities and Areas...")
        
        # Test get cities
        cities_data = self.run_test("Get Cities", "GET", "cities", 200)
        if cities_data and 'cities' in cities_data:
            cities = cities_data['cities']
            print(f"   Found cities: {cities}")
            
            # Test get areas for first city
            if cities:
                first_city = cities[0]
                areas_data = self.run_test(f"Get Areas for {first_city}", "GET", f"areas/{first_city}", 200)
                if areas_data and 'areas' in areas_data:
                    print(f"   Found areas for {first_city}: {areas_data['areas']}")

    def test_gyms(self):
        """Test gym endpoints"""
        print("\n🏋️ Testing Gyms...")
        
        # Test get gyms (public endpoint)
        gyms_data = self.run_test("Get All Gyms", "GET", "gyms", 200)
        if gyms_data:
            print(f"   Found {len(gyms_data)} gyms")
            
            # Test get specific gym if any exist
            if gyms_data:
                first_gym = gyms_data[0]
                gym_id = first_gym['gym_id']
                self.run_test(f"Get Gym Details", "GET", f"gyms/{gym_id}", 200)
                return gym_id
        
        return None

    def test_trainers(self):
        """Test trainer endpoints"""
        print("\n👨‍💼 Testing Trainers...")
        
        # Test get trainers (public endpoint)
        trainers_data = self.run_test("Get All Trainers", "GET", "trainers", 200)
        if trainers_data:
            print(f"   Found {len(trainers_data)} trainers")
            
            # Test get specific trainer if any exist
            if trainers_data:
                first_trainer = trainers_data[0]
                trainer_id = first_trainer['trainer_id']
                self.run_test(f"Get Trainer Details", "GET", f"trainers/{trainer_id}", 200)
                return trainer_id
        
        return None

    def test_auth_without_session(self):
        """Test auth endpoints without valid session"""
        print("\n🔐 Testing Auth (Unauthenticated)...")
        
        # Test /auth/me without session - should return 401
        self.run_test("Get Current User (No Auth)", "GET", "auth/me", 401)

    def test_protected_endpoints_without_auth(self):
        """Test protected endpoints without authentication"""
        print("\n🔒 Testing Protected Endpoints (No Auth)...")
        
        # Test bookings without auth
        self.run_test("Get Bookings (No Auth)", "GET", "bookings", 401)
        
        # Test create booking without auth
        booking_data = {
            "target_id": "test_gym_id",
            "target_type": "gym",
            "date": "2024-12-25",
            "start_time": "10:00",
            "end_time": "11:00",
            "amount": 500
        }
        self.run_test("Create Booking (No Auth)", "POST", "bookings", 401, booking_data)

    def test_contact_form(self):
        """Test contact form submission"""
        print("\n📧 Testing Contact Form...")
        
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "message": "This is a test message from automated testing."
        }
        
        result = self.run_test("Submit Contact Form", "POST", "contact", 200, contact_data)
        if result and 'message_id' in result:
            print(f"   Contact message ID: {result['message_id']}")

    def test_reviews_public(self):
        """Test public review endpoints"""
        print("\n⭐ Testing Reviews (Public)...")
        
        # Test get reviews for non-existent gym (should return empty array)
        self.run_test("Get Reviews for Non-existent Gym", "GET", "reviews/gym/non_existent_id", 200)

    def test_admin_endpoints_without_auth(self):
        """Test admin endpoints without authentication"""
        print("\n👑 Testing Admin Endpoints (No Auth)...")
        
        # Test admin endpoints without auth - should return 401
        self.run_test("Get Pending Approvals (No Auth)", "GET", "admin/pending-approvals", 401)
        self.run_test("Get Admin Stats (No Auth)", "GET", "admin/stats", 401)

    def create_test_session(self):
        """Create a test session using MongoDB directly"""
        print("\n🔧 Creating Test Session...")
        
        try:
            import subprocess
            import uuid
            
            # Generate test data
            timestamp = int(datetime.now().timestamp())
            user_id = f"test_user_{timestamp}"
            session_token = f"test_session_{timestamp}"
            email = f"test.user.{timestamp}@example.com"
            
            # Create MongoDB commands
            mongo_commands = f"""
use('test_database');
db.users.insertOne({{
  user_id: '{user_id}',
  email: '{email}',
  name: 'Test User {timestamp}',
  role: 'user',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  user_id: '{user_id}',
  session_token: '{session_token}',
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print('Test session created successfully');
"""
            
            # Execute MongoDB commands
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                self.session_token = session_token
                self.user_id = user_id
                print(f"   ✅ Test session created: {session_token[:20]}...")
                return True
            else:
                print(f"   ❌ Failed to create test session: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"   ❌ Error creating test session: {str(e)}")
            return False

    def test_auth_with_session(self):
        """Test auth endpoints with valid session"""
        if not self.session_token:
            print("   ⚠️ No session token available, skipping authenticated tests")
            return False
            
        print("\n🔐 Testing Auth (Authenticated)...")
        
        # Test /auth/me with session
        user_data = self.run_test("Get Current User (With Auth)", "GET", "auth/me", 200)
        if user_data and 'user_id' in user_data:
            print(f"   User ID: {user_data['user_id']}")
            return True
        return False

    def test_bookings_with_auth(self, gym_id=None, trainer_id=None):
        """Test booking endpoints with authentication"""
        if not self.session_token:
            print("   ⚠️ No session token available, skipping booking tests")
            return
            
        print("\n📅 Testing Bookings (Authenticated)...")
        
        # Test get user bookings
        bookings_data = self.run_test("Get User Bookings", "GET", "bookings", 200)
        if bookings_data is not None:
            print(f"   Found {len(bookings_data)} existing bookings")
        
        # Test create gym booking if gym_id available
        if gym_id:
            tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
            booking_data = {
                "target_id": gym_id,
                "target_type": "gym",
                "date": tomorrow,
                "start_time": "10:00",
                "end_time": "12:00",
                "amount": 1000
            }
            
            booking_result = self.run_test("Create Gym Booking", "POST", "bookings", 201, booking_data)
            if booking_result and 'booking_id' in booking_result:
                booking_id = booking_result['booking_id']
                print(f"   Created booking: {booking_id}")
                
                # Test get specific booking
                self.run_test("Get Booking Details", "GET", f"bookings/{booking_id}", 200)
                return booking_id
        
        return None

    def test_reviews_with_auth(self, gym_id=None):
        """Test review endpoints with authentication"""
        if not self.session_token or not gym_id:
            print("   ⚠️ No session token or gym_id available, skipping review tests")
            return
            
        print("\n⭐ Testing Reviews (Authenticated)...")
        
        # Test create review
        review_data = {
            "target_id": gym_id,
            "target_type": "gym",
            "rating": 5,
            "comment": "Great gym! Automated test review."
        }
        
        review_result = self.run_test("Create Review", "POST", "reviews", 201, review_data)
        if review_result and 'review_id' in review_result:
            print(f"   Created review: {review_result['review_id']}")
            
            # Test get reviews for the gym
            self.run_test("Get Gym Reviews", "GET", f"reviews/gym/{gym_id}", 200)

    def cleanup_test_data(self):
        """Clean up test data from database"""
        if not self.user_id:
            return
            
        print("\n🧹 Cleaning up test data...")
        
        try:
            import subprocess
            
            mongo_commands = f"""
use('test_database');
db.users.deleteMany({{user_id: /^test_user_/}});
db.user_sessions.deleteMany({{session_token: /^test_session_/}});
db.bookings.deleteMany({{user_id: /^test_user_/}});
db.reviews.deleteMany({{user_id: /^test_user_/}});
db.contact_messages.deleteMany({{email: /test\.user\./}});
print('Test data cleaned up');
"""
            
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print("   ✅ Test data cleaned up successfully")
            else:
                print(f"   ⚠️ Cleanup warning: {result.stderr}")
                
        except Exception as e:
            print(f"   ⚠️ Cleanup error: {str(e)}")

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print(f"\n❌ Failed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")

def main():
    print("🏋️ HourlyGym API Testing Started")
    print("=" * 50)
    
    tester = HourlyGymAPITester()
    
    try:
        # Test public endpoints first
        tester.test_cities_and_areas()
        gym_id = tester.test_gyms()
        trainer_id = tester.test_trainers()
        tester.test_contact_form()
        tester.test_reviews_public()
        
        # Test unauthenticated access to protected endpoints
        tester.test_auth_without_session()
        tester.test_protected_endpoints_without_auth()
        tester.test_admin_endpoints_without_auth()
        
        # Create test session and test authenticated endpoints
        if tester.create_test_session():
            if tester.test_auth_with_session():
                booking_id = tester.test_bookings_with_auth(gym_id, trainer_id)
                tester.test_reviews_with_auth(gym_id)
        
        # Print summary
        tester.print_summary()
        
        # Cleanup
        tester.cleanup_test_data()
        
        # Return appropriate exit code
        return 0 if tester.tests_passed == tester.tests_run else 1
        
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        tester.cleanup_test_data()
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        tester.cleanup_test_data()
        return 1

if __name__ == "__main__":
    sys.exit(main())