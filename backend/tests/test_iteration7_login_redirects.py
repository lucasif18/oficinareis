"""
Test Suite for Iteration 7:
- Login redirect by role (admin, motorista, funcionario, cliente)
- Dashboard pages for each role
- Menu items per role
- Endpoint /api/cliente/minhas-os
- Contas a Receber valor visibility for motorista
- PDF with QR Code
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# ========== Test Credentials ==========
CREDENTIALS = {
    "admin": {"email": "admin@oficinareis.com", "senha": "admin123"},
    "motorista": {"email": "motorista@oficinareis.com", "senha": "motorista123"},
    "funcionario": {"email": "funcionario@oficinareis.com", "senha": "func123"},
}

# ========== Fixtures ==========
@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code}")

@pytest.fixture(scope="module")
def motorista_token():
    """Get motorista auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["motorista"])
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Motorista login failed: {response.status_code}")

@pytest.fixture(scope="module")
def funcionario_token():
    """Get funcionario auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["funcionario"])
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Funcionario login failed: {response.status_code}")

# ========== Login Tests ==========
class TestLoginByRole:
    """Test login endpoint returns correct role for redirection"""
    
    def test_admin_login_returns_admin_role(self):
        """Admin login should return role='admin' for redirect to /dashboard"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["admin"])
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login returns role='admin' -> should redirect to /dashboard")
    
    def test_motorista_login_returns_motorista_role(self):
        """Motorista login should return role='motorista' for redirect to /dashboard-motorista"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["motorista"])
        assert response.status_code == 200, f"Motorista login failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] == "motorista"
        print(f"PASS: Motorista login returns role='motorista' -> should redirect to /dashboard-motorista")
    
    def test_funcionario_login_returns_funcionario_role(self):
        """Funcionario login should return role='funcionario' for redirect to /dashboard-funcionario"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["funcionario"])
        assert response.status_code == 200, f"Funcionario login failed: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["role"] == "funcionario"
        print(f"PASS: Funcionario login returns role='funcionario' -> should redirect to /dashboard-funcionario")

# ========== Dashboard API Tests ==========
class TestDashboardAPIs:
    """Test dashboard APIs for each role"""
    
    def test_admin_dashboard_stats(self, admin_token):
        """Admin can access main dashboard stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Admin should see faturamento_mes
        assert "faturamento_mes" in data
        assert "total_os" in data
        print(f"PASS: Admin dashboard stats includes faturamento_mes")
    
    def test_funcionario_dashboard_stats(self, funcionario_token):
        """Funcionario can access funcionario dashboard stats"""
        headers = {"Authorization": f"Bearer {funcionario_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/funcionario/stats", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "servicos_disponiveis" in data
        assert "servicos_em_andamento" in data
        assert "meus_servicos" in data
        print(f"PASS: Funcionario dashboard stats available")
    
    def test_funcionario_dashboard_atividades(self, funcionario_token):
        """Funcionario can access atividades"""
        headers = {"Authorization": f"Bearer {funcionario_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/funcionario/atividades", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Funcionario atividades endpoint returns list")
    
    def test_motorista_can_access_romaneios(self, motorista_token):
        """Motorista can access romaneios list"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/romaneios", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Motorista can access romaneios")
    
    def test_motorista_can_access_inadimplentes(self, motorista_token):
        """Motorista can access inadimplentes list"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/financeiro/inadimplentes", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Motorista can access inadimplentes")

# ========== Servicos Funcionario Tests ==========
class TestServicosFuncionario:
    """Test servicos funcionario endpoints"""
    
    def test_list_servicos_funcionario(self, funcionario_token):
        """Funcionario can list available services"""
        headers = {"Authorization": f"Bearer {funcionario_token}"}
        response = requests.get(f"{BASE_URL}/api/servicos-funcionario", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Funcionario servicos list available, count: {len(data)}")

# ========== Contas a Receber Tests ==========
class TestContasReceber:
    """Test contas a receber - motorista should see values"""
    
    def test_motorista_can_access_contas_receber(self, motorista_token):
        """Motorista can access contas a receber endpoint"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/financeiro/contas-receber", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Motorista can access contas a receber, count: {len(data)}")
    
    def test_motorista_sees_valor_in_contas_receber(self, motorista_token):
        """Motorista should see 'valor' field in contas a receber"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/financeiro/contas-receber", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            # Check first conta has valor field
            conta = data[0]
            assert "valor" in conta
            assert conta["valor"] is not None
            print(f"PASS: Motorista sees 'valor' in contas a receber: R${conta['valor']}")
        else:
            print(f"INFO: No contas a receber to check valor field")

# ========== Cliente Minhas OS Tests ==========
class TestClienteMinhasOS:
    """Test /api/cliente/minhas-os endpoint"""
    
    def test_minhas_os_endpoint_exists(self, admin_token):
        """The endpoint /api/cliente/minhas-os should exist and return 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/cliente/minhas-os", headers=headers)
        # Should return 200 (empty list for admin) or valid response
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/cliente/minhas-os endpoint works")

# ========== PDF with QR Code Tests ==========
class TestPDFGeneration:
    """Test PDF generation with QR Code"""
    
    def test_pdf_endpoint_exists(self, admin_token):
        """Test that PDF endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get an OS to test PDF generation
        os_response = requests.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        assert os_response.status_code == 200
        
        os_list = os_response.json()
        if len(os_list) > 0:
            os_id = os_list[0]["id"]
            pdf_response = requests.get(f"{BASE_URL}/api/ordens-servico/{os_id}/pdf", headers=headers)
            assert pdf_response.status_code == 200
            assert pdf_response.headers.get('content-type') == 'application/pdf'
            print(f"PASS: PDF generation endpoint returns PDF for OS {os_id}")
        else:
            print(f"INFO: No OS available to test PDF generation")

# ========== Clientes and Pecas Access Tests ==========
class TestAccessControl:
    """Test access control for different roles"""
    
    def test_motorista_can_access_clientes(self, motorista_token):
        """Motorista should have access to clientes"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/clientes", headers=headers)
        assert response.status_code == 200
        print(f"PASS: Motorista can access clientes")
    
    def test_motorista_can_access_pecas(self, motorista_token):
        """Motorista should have access to pecas"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/pecas", headers=headers)
        assert response.status_code == 200
        print(f"PASS: Motorista can access pecas")
    
    def test_motorista_can_access_ordens_servico(self, motorista_token):
        """Motorista should have access to ordens-servico"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        assert response.status_code == 200
        print(f"PASS: Motorista can access ordens-servico")
    
    def test_motorista_can_access_orcamentos(self, motorista_token):
        """Motorista should have access to orcamentos"""
        headers = {"Authorization": f"Bearer {motorista_token}"}
        response = requests.get(f"{BASE_URL}/api/orcamentos", headers=headers)
        assert response.status_code == 200
        print(f"PASS: Motorista can access orcamentos")
    
    def test_funcionario_can_access_pecas(self, funcionario_token):
        """Funcionario should have access to pecas (but prices hidden)"""
        headers = {"Authorization": f"Bearer {funcionario_token}"}
        response = requests.get(f"{BASE_URL}/api/pecas", headers=headers)
        assert response.status_code == 200
        print(f"PASS: Funcionario can access pecas")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
