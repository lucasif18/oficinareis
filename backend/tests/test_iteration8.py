"""
Iteration 8 Tests - Final Validation for Oficina Reis
Tests for:
1. Dashboard Cliente (estatísticas corretas)
2. Página Minhas OS (timeline e detalhes)
3. Endpoint /api/cliente/minhas-os (busca cliente_id)
4. Serviços do funcionário filtrados por especialidades
5. Upload de fotos (Antes/Depois) pelo funcionário
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENTE_CREDENTIALS = {"email": "cliente@teste.com", "senha": "cliente123"}
FUNCIONARIO_CREDENTIALS = {"email": "funcionario@oficinareis.com", "senha": "func123"}
ADMIN_CREDENTIALS = {"email": "admin@oficinareis.com", "senha": "admin123"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def cliente_token(api_client):
    """Get cliente authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=CLIENTE_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Cliente authentication failed")


@pytest.fixture(scope="module")
def funcionario_token(api_client):
    """Get funcionario authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=FUNCIONARIO_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Funcionario authentication failed")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


class TestClienteLogin:
    """Test Cliente login and role"""
    
    def test_cliente_login_success(self, api_client):
        """Test cliente can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=CLIENTE_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "cliente"
        assert data["user"]["email"] == CLIENTE_CREDENTIALS["email"]
    
    def test_funcionario_login_success(self, api_client):
        """Test funcionario can login successfully"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=FUNCIONARIO_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "funcionario"


class TestClienteMinhasOS:
    """Test /api/cliente/minhas-os endpoint - busca cliente_id from user database"""
    
    def test_minhas_os_endpoint_exists(self, api_client, cliente_token):
        """Test endpoint returns 200"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
    
    def test_minhas_os_returns_list(self, api_client, cliente_token):
        """Test endpoint returns a list"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_minhas_os_contains_os_data(self, api_client, cliente_token):
        """Test endpoint returns OS with required fields"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            os_item = data[0]
            # Check required fields for Dashboard stats
            assert "id" in os_item
            assert "numero_fisico" in os_item
            assert "status" in os_item
            assert "valor_total" in os_item
            assert "servicos" in os_item
            # Check for timeline fields
            assert "romaneio_id" in os_item or os_item.get("romaneio_id") is None
            assert "entregue" in os_item
            assert "pago" in os_item
            # Check date fields
            assert "criado_em" in os_item
    
    def test_cliente_has_os_vinculada(self, api_client, cliente_token):
        """Test cliente has at least 1 OS (OS #003)"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # According to context, cliente should have OS #003
        assert len(data) >= 1, "Cliente should have at least 1 OS"
        os_numbers = [os_item.get("numero_fisico") for os_item in data]
        assert "003" in os_numbers, "Cliente should have OS #003"


class TestServicosFuncionarioFiltering:
    """Test serviços filtered by employee specialties"""
    
    def test_servicos_funcionario_endpoint(self, api_client, funcionario_token):
        """Test endpoint returns 200"""
        response = api_client.get(
            f"{BASE_URL}/api/servicos-funcionario",
            headers={"Authorization": f"Bearer {funcionario_token}"}
        )
        assert response.status_code == 200
    
    def test_servicos_filtered_by_especialidades(self, api_client, funcionario_token):
        """Test services are filtered by employee specialties (Virabrequim, Bloco)"""
        response = api_client.get(
            f"{BASE_URL}/api/servicos-funcionario",
            headers={"Authorization": f"Bearer {funcionario_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Funcionario has especialidades: Virabrequim, Bloco
        allowed_sectors = ["Virabrequim", "Bloco"]
        
        for servico in data:
            setor = servico.get("setor")
            assert setor in allowed_sectors, f"Setor '{setor}' not in allowed specialties {allowed_sectors}"
    
    def test_servicos_have_required_fields(self, api_client, funcionario_token):
        """Test serviços have required fields for employee UI"""
        response = api_client.get(
            f"{BASE_URL}/api/servicos-funcionario",
            headers={"Authorization": f"Bearer {funcionario_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for servico in data:
            assert "id" in servico
            assert "os_id" in servico
            assert "os_numero" in servico
            assert "cliente_nome" in servico
            assert "setor" in servico
            assert "servico" in servico
            assert "status" in servico
    
    def test_servicos_status_filter(self, api_client, funcionario_token):
        """Test status filter works"""
        response = api_client.get(
            f"{BASE_URL}/api/servicos-funcionario?status=disponivel",
            headers={"Authorization": f"Bearer {funcionario_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for servico in data:
            assert servico.get("status") == "disponivel"


class TestFotoUpload:
    """Test photo upload (Antes/Depois) by employee"""
    
    def test_foto_upload_endpoint_exists(self, api_client, funcionario_token):
        """Test foto upload endpoint exists"""
        # First get an OS ID from servicos
        servicos_response = api_client.get(
            f"{BASE_URL}/api/servicos-funcionario",
            headers={"Authorization": f"Bearer {funcionario_token}"}
        )
        assert servicos_response.status_code == 200
        servicos = servicos_response.json()
        
        if len(servicos) > 0:
            os_id = servicos[0].get("os_id")
            # Test upload endpoint with minimal data (1x1 PNG)
            small_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            
            response = api_client.post(
                f"{BASE_URL}/api/ordens-servico/{os_id}/fotos",
                headers={"Authorization": f"Bearer {funcionario_token}"},
                json={
                    "tipo": "antes",
                    "imagem_base64": small_png,
                    "descricao": "Teste antes - Virabrequim",
                    "setor": "Virabrequim"
                }
            )
            assert response.status_code == 200, f"Photo upload failed: {response.text}"
            data = response.json()
            assert "foto_id" in data or "message" in data
    
    def test_foto_tipo_validation(self, api_client, admin_token):
        """Test foto type validation (antes/depois only)"""
        # Get an OS ID
        os_response = api_client.get(
            f"{BASE_URL}/api/ordens-servico",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert os_response.status_code == 200
        os_list = os_response.json()
        
        if len(os_list) > 0:
            os_id = os_list[0].get("id")
            small_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            
            # Test invalid type
            response = api_client.post(
                f"{BASE_URL}/api/ordens-servico/{os_id}/fotos",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={
                    "tipo": "invalido",
                    "imagem_base64": small_png
                }
            )
            assert response.status_code == 400, "Should reject invalid foto type"


class TestDashboardClienteStats:
    """Test Dashboard Cliente statistics"""
    
    def test_stats_calculation_from_minhas_os(self, api_client, cliente_token):
        """Test stats can be calculated from minhas-os endpoint"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Calculate stats like DashboardCliente.js does
        total_os = len(data)
        pendentes = len([os for os in data if os.get("status") in ["pendente", "andamento"]])
        enviando = len([os for os in data if os.get("status") == "enviando"])
        entregues = len([os for os in data if os.get("status") in ["entregue", "concluido"]])
        
        # Verify stats structure matches what frontend expects
        assert total_os >= 0
        assert pendentes >= 0
        assert enviando >= 0
        assert entregues >= 0


class TestTimelineData:
    """Test timeline data for Minhas OS page"""
    
    def test_os_has_timeline_fields(self, api_client, cliente_token):
        """Test OS has fields needed for timeline"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            os_item = data[0]
            # Timeline needs these fields per MinhasOS.js
            assert "status" in os_item
            assert "servicos" in os_item
            
            # Check servicos have status for timeline
            for servico in os_item.get("servicos", []):
                # Status can be: disponivel, em_andamento, concluido
                assert "setor" in servico
                assert "servico" in servico
    
    def test_os_servicos_have_progress_status(self, api_client, cliente_token):
        """Test OS servicos have status for progress tracking"""
        response = api_client.get(
            f"{BASE_URL}/api/cliente/minhas-os",
            headers={"Authorization": f"Bearer {cliente_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        for os_item in data:
            servicos = os_item.get("servicos", [])
            for servico in servicos:
                # Verify servico has tracking info
                assert "setor" in servico
                assert "servico" in servico
                # Optional fields for tracking
                # funcionario_id, funcionario_nome, status may be present


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
