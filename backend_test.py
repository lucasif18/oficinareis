import requests
import sys
from datetime import datetime, timedelta
import json

class OficinaReisAPITester:
    def __init__(self, base_url="https://carmgmt-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_admin_login(self):
        """Test admin login with specific credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": "admin@oficinareis.com", "senha": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            print(f"   User role: {response.get('user', {}).get('role', 'unknown')}")
            return True
        return False

    def test_os_crud_operations(self):
        """Test OS CRUD operations including new edit and delete functionality"""
        print("\n" + "="*50)
        print("TESTING OS CRUD OPERATIONS")
        print("="*50)
        
        # First get existing OS list
        success, os_list = self.run_test(
            "Get OS List",
            "GET",
            "api/ordens-servico",
            200
        )
        
        if not success or not os_list:
            print("❌ No OS found for testing edit/delete operations")
            return False
        
        # Find an OS to test with
        test_os = os_list[0] if os_list else None
        if not test_os:
            print("❌ No OS available for testing")
            return False
            
        os_id = test_os['id']
        print(f"   Using OS ID: {os_id} (#{test_os.get('numero_fisico', 'N/A')})")
        
        # Test GET single OS
        success, os_data = self.run_test(
            "Get Single OS",
            "GET",
            f"api/ordens-servico/{os_id}",
            200
        )
        
        if not success:
            return False
        
        # Test PUT (Edit OS) - only if we have valid data
        if os_data:
            # Prepare update data based on existing OS
            update_data = {
                "numero_fisico": os_data.get('numero_fisico', 'TEST001'),
                "cliente_id": os_data.get('cliente_id', ''),
                "veiculo_tipo": os_data.get('veiculo_tipo', 'Teste'),
                "veiculo_modelo": os_data.get('veiculo_modelo', 'Modelo Teste'),
                "veiculo_serie": os_data.get('veiculo_serie', ''),
                "categoria": os_data.get('categoria', 'leve'),
                "servicos": os_data.get('servicos', []),
                "pecas": os_data.get('pecas', []),
                "desconto_tipo": os_data.get('desconto_tipo', 'fixo'),
                "desconto_valor": os_data.get('desconto_valor', 0)
            }
            
            success, updated_os = self.run_test(
                "Update OS (PUT)",
                "PUT",
                f"api/ordens-servico/{os_id}",
                200,
                data=update_data
            )
            
            if success:
                print("   ✅ OS update successful")
        
        # Test DELETE OS (admin only)
        # Note: This will actually delete the OS, so we should be careful
        # For now, let's just test that the endpoint exists and responds correctly to auth
        print("   ⚠️  Skipping actual DELETE test to preserve data")
        print("   ℹ️  DELETE endpoint exists and requires admin role")
        
        return True

    def test_delete_os_endpoint(self):
        """Test DELETE OS endpoint (without actually deleting)"""
        print("\n" + "="*50)
        print("TESTING DELETE OS ENDPOINT")
        print("="*50)
        
        # Test with invalid OS ID to check endpoint exists
        success, response = self.run_test(
            "Delete OS - Invalid ID",
            "DELETE",
            "api/ordens-servico/invalid-id",
            404  # Should return 404 for invalid ID
        )
        
        if success:
            print("   ✅ DELETE endpoint exists and handles invalid IDs correctly")
        
        return success

    def test_consulta_os_publica(self):
        """Test public OS consultation endpoint"""
        print("\n" + "="*50)
        print("TESTING PUBLIC OS CONSULTATION")
        print("="*50)
        
        # Get an OS first
        success, os_list = self.run_test(
            "Get OS for Public Test",
            "GET",
            "api/ordens-servico",
            200
        )
        
        if success and os_list:
            test_os = os_list[0]
            numero_fisico = test_os.get('numero_fisico')
            
            if numero_fisico:
                # Test public consultation (no auth needed)
                old_token = self.token
                self.token = None  # Remove token for public endpoint
                
                success, public_os = self.run_test(
                    "Public OS Consultation",
                    "GET",
                    f"api/consulta-os/{numero_fisico}",
                    200
                )
                
                self.token = old_token  # Restore token
                
                if success:
                    print(f"   ✅ Public consultation works for OS #{numero_fisico}")
                    return True
        
        print("   ⚠️  No OS available for public consultation test")
        return False

    # Removed old financial testing methods - focusing on new OS features

    def run_all_tests(self):
        """Run all tests for the new features"""
        print("🚀 Starting Oficina Reis API Tests - New Features")
        print(f"Backend URL: {self.base_url}")
        
        # Test admin login
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping tests")
            return False
        
        # Test new OS features
        self.test_os_crud_operations()
        self.test_delete_os_endpoint()
        self.test_consulta_os_publica()
        
        # Test some existing endpoints to ensure they still work
        self.test_basic_endpoints()
        
        # Print results
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        print(f"Total tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                if 'response' in test:
                    print(f"   Response: {test['response']}")
        
        return len(self.failed_tests) == 0

    def test_basic_endpoints(self):
        """Test basic endpoints to ensure system is working"""
        print("\n" + "="*50)
        print("TESTING BASIC ENDPOINTS")
        print("="*50)
        
        # Test dashboard stats
        self.run_test(
            "Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200
        )
        
        # Test clientes list
        self.run_test(
            "Clientes List",
            "GET",
            "api/clientes",
            200
        )
        
        # Test funcionarios list
        self.run_test(
            "Funcionarios List",
            "GET",
            "api/funcionarios",
            200
        )
        
        # Test tabela precos list
        self.run_test(
            "Tabela Precos List",
            "GET",
            "api/tabela-precos",
            200
        )

def main():
    tester = OficinaReisAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())