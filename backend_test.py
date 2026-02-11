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

    def test_login(self):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
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

    def test_financeiro_endpoints(self):
        """Test all financial endpoints"""
        print("\n" + "="*50)
        print("TESTING FINANCIAL MODULE ENDPOINTS")
        print("="*50)
        
        # Test Fluxo de Caixa
        success, fluxo_data = self.run_test(
            "Fluxo de Caixa - Get",
            "GET",
            "api/financeiro/fluxo-caixa",
            200
        )
        
        # Test Fluxo de Caixa with date filters
        hoje = datetime.now()
        inicio_mes = hoje.replace(day=1).strftime('%Y-%m-%d')
        fim_mes = (hoje.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        fim_mes_str = fim_mes.strftime('%Y-%m-%d')
        
        self.run_test(
            "Fluxo de Caixa - With Date Filter",
            "GET",
            "api/financeiro/fluxo-caixa",
            200,
            params={"data_inicio": inicio_mes, "data_fim": fim_mes_str}
        )
        
        # Test DRE
        success, dre_data = self.run_test(
            "DRE - Current Month",
            "GET",
            "api/financeiro/dre",
            200
        )
        
        # Test DRE with specific month/year
        self.run_test(
            "DRE - Specific Month",
            "GET",
            "api/financeiro/dre",
            200,
            params={"mes": 12, "ano": 2024}
        )
        
        # Test Contas a Pagar
        success, contas_pagar = self.run_test(
            "Contas a Pagar - List All",
            "GET",
            "api/financeiro/contas-pagar",
            200
        )
        
        # Test Contas a Pagar with status filter
        self.run_test(
            "Contas a Pagar - Filter Pendente",
            "GET",
            "api/financeiro/contas-pagar",
            200,
            params={"status": "pendente"}
        )
        
        # Test Contas a Receber
        success, contas_receber = self.run_test(
            "Contas a Receber - List All",
            "GET",
            "api/financeiro/contas-receber",
            200
        )
        
        # Test Contas a Receber with status filter
        self.run_test(
            "Contas a Receber - Filter Pendente",
            "GET",
            "api/financeiro/contas-receber",
            200,
            params={"status": "pendente"}
        )

    def test_contas_pagar_crud(self):
        """Test CRUD operations for Contas a Pagar"""
        print("\n" + "="*50)
        print("TESTING CONTAS A PAGAR CRUD")
        print("="*50)
        
        # Create a new conta a pagar
        vencimento = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        conta_data = {
            "descricao": "Teste Conta Pagar API",
            "valor": 150.50,
            "data_vencimento": vencimento + "T12:00:00.000Z",
            "categoria": "Fornecedores",
            "observacoes": "Teste automatizado"
        }
        
        success, created_conta = self.run_test(
            "Create Conta a Pagar",
            "POST",
            "api/financeiro/contas-pagar",
            201,
            data=conta_data
        )
        
        if success and 'id' in created_conta:
            conta_id = created_conta['id']
            print(f"   Created conta ID: {conta_id}")
            
            # Test marking as paid
            success, _ = self.run_test(
                "Mark Conta as Pago",
                "PUT",
                f"api/financeiro/contas-pagar/{conta_id}/pagar",
                200
            )
            
            # Test delete
            self.run_test(
                "Delete Conta a Pagar",
                "DELETE",
                f"api/financeiro/contas-pagar/{conta_id}",
                200
            )

    def test_contas_receber_crud(self):
        """Test CRUD operations for Contas a Receber"""
        print("\n" + "="*50)
        print("TESTING CONTAS A RECEBER CRUD")
        print("="*50)
        
        # First get clientes to use a valid cliente_id
        success, clientes = self.run_test(
            "Get Clientes for Conta Receber",
            "GET",
            "api/clientes",
            200
        )
        
        cliente_id = None
        if success and clientes and len(clientes) > 0:
            cliente_id = clientes[0]['id']
            print(f"   Using cliente ID: {cliente_id}")
        
        # Create a new conta a receber
        vencimento = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        conta_data = {
            "descricao": "Teste Conta Receber API",
            "valor": 250.75,
            "data_vencimento": vencimento + "T12:00:00.000Z",
            "cliente_id": cliente_id,
            "observacoes": "Teste automatizado"
        }
        
        success, created_conta = self.run_test(
            "Create Conta a Receber",
            "POST",
            "api/financeiro/contas-receber",
            201,
            data=conta_data
        )
        
        if success and 'id' in created_conta:
            conta_id = created_conta['id']
            print(f"   Created conta ID: {conta_id}")
            
            # Test marking as received
            success, _ = self.run_test(
                "Mark Conta as Recebido",
                "PUT",
                f"api/financeiro/contas-receber/{conta_id}/receber",
                200
            )
            
            # Test delete
            self.run_test(
                "Delete Conta a Receber",
                "DELETE",
                f"api/financeiro/contas-receber/{conta_id}",
                200
            )

    def test_os_integration(self):
        """Test OS integration for Contas a Receber"""
        print("\n" + "="*50)
        print("TESTING OS INTEGRATION")
        print("="*50)
        
        # Get OS list to check for concluded OS
        success, os_list = self.run_test(
            "Get OS List",
            "GET",
            "api/ordens-servico",
            200
        )
        
        if success:
            concluded_os = [os for os in os_list if os.get('status') == 'concluido']
            print(f"   Found {len(concluded_os)} concluded OS")
            
            if concluded_os:
                print(f"   Sample OS: {concluded_os[0].get('numero_fisico')} - {concluded_os[0].get('cliente_nome')}")

    def run_all_tests(self):
        """Run all financial module tests"""
        print("🚀 Starting Financial Module API Tests")
        print(f"Backend URL: {self.base_url}")
        
        # Login first
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False
        
        # Test all endpoints
        self.test_financeiro_endpoints()
        self.test_contas_pagar_crud()
        self.test_contas_receber_crud()
        self.test_os_integration()
        
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
    tester = FinanceiroAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())