"""
Test suite for Portal do Cliente, Dashboard do Motorista, and Romaneio features
- Portal do Cliente with Timeline and search by OS/CPF
- Dashboard do Motorista with counters and inadimplentes table  
- Romaneio status changes (enviando/entregue)
- Financeiro inadimplentes endpoint
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@oficinareis.com", "senha": "admin123"}
    )
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ============ PORTAL DO CLIENTE - Consulta pública de OS ============

class TestPortalCliente:
    """Tests for Portal do Cliente - Public OS consultation"""
    
    def test_consulta_os_por_numero_existente(self, auth_headers):
        """Test public OS lookup by numero_fisico - should work without auth"""
        # First get a list of OS to find a valid numero_fisico
        os_list_response = requests.get(
            f"{BASE_URL}/api/ordens-servico",
            headers=auth_headers
        )
        assert os_list_response.status_code == 200
        os_list = os_list_response.json()
        
        if len(os_list) == 0:
            pytest.skip("No OS available for testing")
        
        # Get first OS numero_fisico
        numero_fisico = os_list[0]["numero_fisico"]
        
        # Now test public endpoint WITHOUT auth
        response = requests.get(f"{BASE_URL}/api/consulta-os/{numero_fisico}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify timeline-relevant fields are present
        assert "numero_fisico" in data
        assert "status" in data
        assert "cliente_nome" in data
        assert "servicos" in data
        assert "veiculo_tipo" in data
        assert "valor_total" in data
        # Timeline status fields
        assert "romaneio_id" in data  # For enviando status
        assert "entregue" in data  # For entregue status
        print(f"✓ Public OS consultation works: OS #{numero_fisico}, status={data['status']}")
    
    def test_consulta_os_por_numero_inexistente(self):
        """Test public OS lookup returns 404 for non-existent OS"""
        response = requests.get(f"{BASE_URL}/api/consulta-os/INEXISTENTE999")
        assert response.status_code == 404
        print("✓ Non-existent OS returns 404")
    
    def test_consulta_os_por_cpf(self, auth_headers):
        """Test OS lookup by cliente CPF/CNPJ"""
        # First get a client to test with
        clientes_response = requests.get(
            f"{BASE_URL}/api/clientes",
            headers=auth_headers
        )
        assert clientes_response.status_code == 200
        clientes = clientes_response.json()
        
        if len(clientes) == 0:
            pytest.skip("No clients available for testing")
        
        # Find a client with OS
        for cliente in clientes:
            cpf_cnpj = cliente.get("cpf_cnpj", "")
            if cpf_cnpj:
                # Test public endpoint for CPF/CNPJ lookup
                response = requests.get(f"{BASE_URL}/api/consulta-os/cliente/{cpf_cnpj}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✓ CPF lookup found {len(data)} OS for document {cpf_cnpj}")
                    # Verify response is a list
                    assert isinstance(data, list)
                    if len(data) > 0:
                        # Verify OS structure
                        assert "numero_fisico" in data[0]
                        assert "status" in data[0]
                    return
                elif response.status_code == 404:
                    continue
        
        pytest.skip("No client with OS found for CPF testing")
    
    def test_consulta_os_cliente_nao_encontrado(self):
        """Test CPF lookup returns 404 for non-existent client"""
        response = requests.get(f"{BASE_URL}/api/consulta-os/cliente/00000000000")
        assert response.status_code == 404
        print("✓ Non-existent CPF returns 404")


# ============ FINANCEIRO - Inadimplentes ============

class TestInadimplentes:
    """Tests for the inadimplentes (overdue clients) endpoint"""
    
    def test_get_inadimplentes_endpoint_exists(self, auth_headers):
        """Test that /api/financeiro/inadimplentes endpoint exists and returns list"""
        response = requests.get(
            f"{BASE_URL}/api/financeiro/inadimplentes",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return a list (even if empty)
        assert isinstance(data, list), "Response should be a list"
        
        # If there are inadimplentes, verify structure
        if len(data) > 0:
            assert "nome" in data[0], "Missing 'nome' field"
            assert "telefone" in data[0], "Missing 'telefone' field"
            assert "valor" in data[0], "Missing 'valor' field"
            print(f"✓ Found {len(data)} inadimplentes")
            for item in data:
                print(f"  - {item['nome']}: R$ {item['valor']:.2f}")
        else:
            print("✓ No inadimplentes found (list empty)")
    
    def test_inadimplentes_requires_auth(self):
        """Test that inadimplentes endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/financeiro/inadimplentes")
        # Should require auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Inadimplentes endpoint requires authentication")


# ============ ROMANEIO - Status Changes ============

class TestRomaneioStatusFlow:
    """Tests for Romaneio status transitions and OS status updates"""
    
    def test_list_romaneios(self, auth_headers):
        """Test listing romaneios"""
        response = requests.get(
            f"{BASE_URL}/api/romaneios",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} romaneios")
        return data
    
    def test_list_os_disponiveis_romaneio(self, auth_headers):
        """Test listing OS available for romaneio (status=concluido)"""
        response = requests.get(
            f"{BASE_URL}/api/romaneios/os-disponiveis/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} OS available for romaneio")
        return data
    
    def test_list_motoristas(self, auth_headers):
        """Test listing motoristas (needed for romaneio creation)"""
        response = requests.get(
            f"{BASE_URL}/api/motoristas",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} motoristas")
        return data
    
    def test_romaneio_creation_updates_os_status_to_enviando(self, auth_headers):
        """
        Test that creating a romaneio updates OS status to 'enviando'
        This is a CRITICAL business requirement
        """
        # Get available OS (must be concluido)
        os_response = requests.get(
            f"{BASE_URL}/api/romaneios/os-disponiveis/list",
            headers=auth_headers
        )
        os_disponiveis = os_response.json() if os_response.status_code == 200 else []
        
        # Get motoristas
        motoristas_response = requests.get(
            f"{BASE_URL}/api/motoristas",
            headers=auth_headers
        )
        motoristas = motoristas_response.json() if motoristas_response.status_code == 200 else []
        
        if len(os_disponiveis) == 0 or len(motoristas) == 0:
            pytest.skip("No OS disponíveis or motoristas for romaneio test")
        
        # Create romaneio
        os_id = os_disponiveis[0]["id"]
        motorista_id = motoristas[0]["id"]
        
        romaneio_data = {
            "numero": f"TEST-ROM-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "motorista_id": motorista_id,
            "os_ids": [os_id],
            "data_entrega": (datetime.now() + timedelta(days=1)).isoformat()
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/romaneios",
            headers=auth_headers,
            json=romaneio_data
        )
        
        if create_response.status_code != 200:
            print(f"Romaneio creation failed: {create_response.text}")
            pytest.skip("Could not create romaneio for testing")
        
        romaneio = create_response.json()
        print(f"✓ Created romaneio #{romaneio['numero']}")
        
        # Verify OS status changed to 'enviando'
        os_check = requests.get(
            f"{BASE_URL}/api/ordens-servico/{os_id}",
            headers=auth_headers
        )
        assert os_check.status_code == 200
        os_data = os_check.json()
        
        assert os_data["status"] == "enviando", f"Expected OS status 'enviando', got '{os_data['status']}'"
        assert os_data.get("romaneio_id") == romaneio["id"], "OS should have romaneio_id set"
        print(f"✓ OS #{os_data['numero_fisico']} status updated to 'enviando'")
        
        # Store romaneio_id for next test
        return romaneio["id"], os_id
    
    def test_confirmar_entrega_updates_os_status_to_entregue(self, auth_headers):
        """
        Test that confirming delivery updates OS status to 'entregue'
        """
        # Get romaneios em_rota
        rom_response = requests.get(
            f"{BASE_URL}/api/romaneios",
            headers=auth_headers
        )
        romaneios = rom_response.json() if rom_response.status_code == 200 else []
        
        # Find a romaneio with OS (pending or em_rota)
        test_romaneio = None
        for rom in romaneios:
            if rom.get("os_ids") and len(rom["os_ids"]) > 0 and rom["status"] in ["pendente", "em_rota"]:
                test_romaneio = rom
                break
        
        if not test_romaneio:
            pytest.skip("No romaneio available for delivery confirmation test")
        
        romaneio_id = test_romaneio["id"]
        os_id = test_romaneio["os_ids"][0]
        
        # First, set romaneio to em_rota if not already
        if test_romaneio["status"] == "pendente":
            requests.put(
                f"{BASE_URL}/api/romaneios/{romaneio_id}/status?status=em_rota",
                headers=auth_headers
            )
        
        # Confirm delivery
        confirm_response = requests.put(
            f"{BASE_URL}/api/romaneios/{romaneio_id}/confirmar-entrega",
            headers=auth_headers,
            json={"os_id": os_id, "confirmado": True}
        )
        
        assert confirm_response.status_code == 200, f"Delivery confirmation failed: {confirm_response.text}"
        print(f"✓ Confirmed delivery for OS in romaneio #{test_romaneio['numero']}")
        
        # Verify OS status changed to 'entregue'
        os_check = requests.get(
            f"{BASE_URL}/api/ordens-servico/{os_id}",
            headers=auth_headers
        )
        
        if os_check.status_code == 200:
            os_data = os_check.json()
            assert os_data["status"] == "entregue", f"Expected OS status 'entregue', got '{os_data['status']}'"
            assert os_data.get("entregue") == True, "OS.entregue should be True"
            print(f"✓ OS status updated to 'entregue', entregue=True")
        
        # Test reverting confirmation
        revert_response = requests.put(
            f"{BASE_URL}/api/romaneios/{romaneio_id}/confirmar-entrega",
            headers=auth_headers,
            json={"os_id": os_id, "confirmado": False}
        )
        
        if revert_response.status_code == 200:
            os_check2 = requests.get(
                f"{BASE_URL}/api/ordens-servico/{os_id}",
                headers=auth_headers
            )
            if os_check2.status_code == 200:
                os_data2 = os_check2.json()
                assert os_data2["status"] == "enviando", f"Expected OS status 'enviando' after revert, got '{os_data2['status']}'"
                print(f"✓ OS status reverted to 'enviando' after uncheck")
    
    def test_romaneio_status_transitions(self, auth_headers):
        """Test romaneio status transitions: pendente -> em_rota -> concluido"""
        rom_response = requests.get(
            f"{BASE_URL}/api/romaneios",
            headers=auth_headers
        )
        romaneios = rom_response.json() if rom_response.status_code == 200 else []
        
        # Find a pending romaneio
        pending_romaneio = None
        for rom in romaneios:
            if rom["status"] == "pendente":
                pending_romaneio = rom
                break
        
        if not pending_romaneio:
            pytest.skip("No pending romaneio for status transition test")
        
        romaneio_id = pending_romaneio["id"]
        
        # Transition to em_rota
        em_rota_response = requests.put(
            f"{BASE_URL}/api/romaneios/{romaneio_id}/status?status=em_rota",
            headers=auth_headers
        )
        assert em_rota_response.status_code == 200
        print(f"✓ Romaneio status changed to 'em_rota'")
        
        # Transition to concluido
        concluido_response = requests.put(
            f"{BASE_URL}/api/romaneios/{romaneio_id}/status?status=concluido",
            headers=auth_headers
        )
        assert concluido_response.status_code == 200
        print(f"✓ Romaneio status changed to 'concluido'")


# ============ DASHBOARD DO MOTORISTA ============

class TestDashboardMotorista:
    """Tests for motorista dashboard data"""
    
    def test_romaneios_endpoint_for_dashboard_stats(self, auth_headers):
        """Test that romaneios data is available for dashboard counters"""
        response = requests.get(
            f"{BASE_URL}/api/romaneios",
            headers=auth_headers
        )
        assert response.status_code == 200
        romaneios = response.json()
        
        # Calculate stats like the frontend does
        pendentes = len([r for r in romaneios if r["status"] == "pendente"])
        em_rota = len([r for r in romaneios if r["status"] == "em_rota"])
        concluidos = len([r for r in romaneios if r["status"] == "concluido"])
        
        print(f"✓ Dashboard stats: {pendentes} pendentes, {em_rota} em_rota, {concluidos} concluídos")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
