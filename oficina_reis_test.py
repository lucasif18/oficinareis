import requests
import sys
from datetime import datetime
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
                print(f"   Response: {response.text[:300]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:300]
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
        """Test admin login"""
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
            return True
        return False

    def test_client_registration_without_code(self):
        """Test client registration without validation code"""
        print("\n" + "="*50)
        print("TESTING CLIENT REGISTRATION (NO CODE)")
        print("="*50)
        
        timestamp = datetime.now().strftime("%H%M%S")
        client_data = {
            "nome": f"Cliente Teste {timestamp}",
            "email": f"cliente{timestamp}@test.com",
            "senha": "senha123",
            "role": "cliente",
            "cpf_cnpj": "12345678901",
            "telefone": "(11) 99999-9999"
        }
        
        success, response = self.run_test(
            "Client Registration Without Code",
            "POST",
            "api/auth/cadastro",
            201,
            data=client_data
        )
        
        return success

    def test_employee_registration_with_code(self):
        """Test employee registration with FUNC2024 code"""
        print("\n" + "="*50)
        print("TESTING EMPLOYEE REGISTRATION (WITH CODE)")
        print("="*50)
        
        timestamp = datetime.now().strftime("%H%M%S")
        employee_data = {
            "nome": f"Funcionario Teste {timestamp}",
            "email": f"funcionario{timestamp}@test.com",
            "senha": "senha123",
            "role": "funcionario",
            "codigo_validacao": "FUNC2024"
        }
        
        success, response = self.run_test(
            "Employee Registration With Valid Code",
            "POST",
            "api/auth/cadastro",
            201,
            data=employee_data
        )
        
        return success

    def test_registration_with_invalid_code(self):
        """Test registration with invalid validation code"""
        print("\n" + "="*50)
        print("TESTING REGISTRATION WITH INVALID CODE")
        print("="*50)
        
        timestamp = datetime.now().strftime("%H%M%S")
        invalid_data = {
            "nome": f"Funcionario Invalido {timestamp}",
            "email": f"funcionario_inv{timestamp}@test.com",
            "senha": "senha123",
            "role": "funcionario",
            "codigo_validacao": "CODIGO_INVALIDO"
        }
        
        success, response = self.run_test(
            "Registration With Invalid Code (Should Fail)",
            "POST",
            "api/auth/cadastro",
            400,
            data=invalid_data
        )
        
        return success

    def test_admin_code_registration(self):
        """Test admin registration with ADM2024 code"""
        timestamp = datetime.now().strftime("%H%M%S")
        admin_data = {
            "nome": f"Admin Teste {timestamp}",
            "email": f"admin{timestamp}@test.com",
            "senha": "senha123",
            "role": "admin",
            "codigo_validacao": "ADM2024"
        }
        
        success, response = self.run_test(
            "Admin Registration With Valid Code",
            "POST",
            "api/auth/cadastro",
            201,
            data=admin_data
        )
        
        return success

    def test_motorista_code_registration(self):
        """Test motorista registration with MOTORISTA2024 code"""
        timestamp = datetime.now().strftime("%H%M%S")
        motorista_data = {
            "nome": f"Motorista Teste {timestamp}",
            "email": f"motorista{timestamp}@test.com",
            "senha": "senha123",
            "role": "motorista",
            "codigo_validacao": "MOTORISTA2024"
        }
        
        success, response = self.run_test(
            "Motorista Registration With Valid Code",
            "POST",
            "api/auth/cadastro",
            201,
            data=motorista_data
        )
        
        return success

    def test_os_consultation(self):
        """Test OS consultation functionality"""
        print("\n" + "="*50)
        print("TESTING OS CONSULTATION")
        print("="*50)
        
        # First, get list of existing OS to find a valid number
        success, os_list = self.run_test(
            "Get OS List to Find Valid Number",
            "GET",
            "api/ordens-servico",
            200
        )
        
        valid_os_number = None
        if success and os_list and len(os_list) > 0:
            valid_os_number = os_list[0].get('numero_fisico')
            print(f"   Found valid OS number: {valid_os_number}")
        
        # Test consultation with valid OS number
        if valid_os_number:
            success, os_data = self.run_test(
                f"OS Consultation - Valid Number ({valid_os_number})",
                "GET",
                f"api/consulta-os/{valid_os_number}",
                200
            )
            
            if success:
                print(f"   OS Cliente: {os_data.get('cliente_nome')}")
                print(f"   OS Status: {os_data.get('status')}")
                print(f"   OS Valor: R$ {os_data.get('valor_total', 0):.2f}")
        
        # Test consultation with non-existent OS number
        success, response = self.run_test(
            "OS Consultation - Non-existent Number (Should Return 404)",
            "GET",
            "api/consulta-os/OS999999",
            404
        )
        
        return True

    def test_dashboard_access(self):
        """Test dashboard access for admin user"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD ACCESS")
        print("="*50)
        
        # Test dashboard stats
        success, stats = self.run_test(
            "Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200
        )
        
        if success:
            print(f"   Total OS: {stats.get('total_os', 0)}")
            print(f"   OS em Andamento: {stats.get('os_andamento', 0)}")
            print(f"   Total Clientes: {stats.get('total_clientes', 0)}")
        
        # Test dashboard alerts
        success, alerts = self.run_test(
            "Dashboard Alerts",
            "GET",
            "api/dashboard/alerts",
            200
        )
        
        # Test recent OS
        success, recent_os = self.run_test(
            "Recent OS",
            "GET",
            "api/dashboard/recent-os",
            200
        )
        
        return True

    def test_user_roles_access(self):
        """Test different user role access patterns"""
        print("\n" + "="*50)
        print("TESTING USER ROLES ACCESS")
        print("="*50)
        
        # Test clientes access (should work for admin/motorista)
        success, clientes = self.run_test(
            "Clientes List Access",
            "GET",
            "api/clientes",
            200
        )
        
        # Test pecas access
        success, pecas = self.run_test(
            "Pecas List Access",
            "GET",
            "api/pecas",
            200
        )
        
        # Test funcionarios access (admin only)
        success, funcionarios = self.run_test(
            "Funcionarios List Access (Admin Only)",
            "GET",
            "api/funcionarios",
            200
        )
        
        return True

    def run_all_tests(self):
        """Run all Oficina Reis system tests"""
        print("🚀 Starting Oficina Reis System Tests")
        print(f"Backend URL: {self.base_url}")
        
        # Login first
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping tests")
            return False
        
        # Test registration functionality
        self.test_client_registration_without_code()
        self.test_employee_registration_with_code()
        self.test_registration_with_invalid_code()
        self.test_admin_code_registration()
        self.test_motorista_code_registration()
        
        # Test OS consultation
        self.test_os_consultation()
        
        # Test dashboard and access
        self.test_dashboard_access()
        self.test_user_roles_access()
        
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

def main():
    tester = OficinaReisAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())