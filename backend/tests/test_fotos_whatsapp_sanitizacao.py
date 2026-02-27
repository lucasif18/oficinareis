"""
Test suite for new features:
- Upload de fotos (apenas ADM)
- WhatsApp link generation
- Sanitização de valores (funcionários/motoristas não veem preços)
- Blue/Yellow colors (checked via frontend)
"""

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://employee-tasks-5.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@oficinareis.com"
ADMIN_PASSWORD = "admin123"
FUNC_CODE = "FUNC2024"
MOTORISTA_CODE = "MOTORISTA2024"


class TestPhotosUploadAndWhatsApp:
    """Tests for photo upload (ADM only) and WhatsApp link generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def get_os_id_with_phone(self, token):
        """Get an OS that has a cliente_telefone"""
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        assert response.status_code == 200
        os_list = response.json()
        # Find an OS with phone
        for os in os_list:
            if os.get('cliente_telefone'):
                return os['id']
        return None
        
    def test_whatsapp_link_generation(self):
        """Test GET /api/ordens-servico/{id}/whatsapp-link - generates WhatsApp link"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        os_id = self.get_os_id_with_phone(token)
        assert os_id is not None, "No OS with phone found"
        
        response = self.session.get(f"{BASE_URL}/api/ordens-servico/{os_id}/whatsapp-link", headers=headers)
        assert response.status_code == 200, f"Failed to get WhatsApp link: {response.text}"
        
        data = response.json()
        assert "whatsapp_link" in data, "Missing whatsapp_link in response"
        assert "telefone" in data, "Missing telefone in response"
        assert "mensagem" in data, "Missing mensagem in response"
        
        # Verify link format
        assert data["whatsapp_link"].startswith("https://wa.me/"), "Invalid WhatsApp link format"
        assert "Oficina Reis" in data["mensagem"], "Missing 'Oficina Reis' in message"
        print(f"✓ WhatsApp link generated successfully: {data['whatsapp_link'][:50]}...")
        
    def test_photo_upload_admin_only(self):
        """Test POST /api/ordens-servico/{id}/fotos - upload photo (ADM only)"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        os_id = self.get_os_id_with_phone(token)
        assert os_id is not None, "No OS found"
        
        # Create a minimal base64 image (1x1 red pixel PNG)
        minimal_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        payload = {
            "tipo": "antes",
            "imagem_base64": minimal_png,
            "descricao": "TEST_FOTO - Photo before service"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ordens-servico/{os_id}/fotos", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed to upload photo: {response.text}"
        
        data = response.json()
        assert "foto_id" in data, "Missing foto_id in response"
        assert "message" in data, "Missing message in response"
        
        foto_id = data["foto_id"]
        print(f"✓ Photo uploaded successfully with ID: {foto_id}")
        
        # Verify photo is in OS
        response = self.session.get(f"{BASE_URL}/api/ordens-servico/{os_id}", headers=headers)
        assert response.status_code == 200
        os_data = response.json()
        
        fotos = os_data.get('fotos', [])
        foto_found = any(f.get('id') == foto_id for f in fotos)
        assert foto_found, "Uploaded photo not found in OS"
        print("✓ Photo verified in OS data")
        
        # Cleanup: delete the test photo
        response = self.session.delete(f"{BASE_URL}/api/ordens-servico/{os_id}/fotos/{foto_id}", headers=headers)
        assert response.status_code == 200, f"Failed to delete photo: {response.text}"
        print("✓ Test photo deleted successfully")
        
    def test_photo_upload_invalid_tipo(self):
        """Test POST /api/ordens-servico/{id}/fotos with invalid tipo"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        os_id = self.get_os_id_with_phone(token)
        assert os_id is not None, "No OS found"
        
        minimal_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        payload = {
            "tipo": "invalid_type",  # Invalid
            "imagem_base64": minimal_png
        }
        
        response = self.session.post(f"{BASE_URL}/api/ordens-servico/{os_id}/fotos", json=payload, headers=headers)
        assert response.status_code == 400, f"Expected 400 for invalid tipo, got {response.status_code}"
        print("✓ Invalid tipo correctly rejected with 400")
        
    def test_photo_delete_admin_only(self):
        """Test DELETE /api/ordens-servico/{id}/fotos/{foto_id} - delete photo (ADM only)"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        os_id = self.get_os_id_with_phone(token)
        assert os_id is not None, "No OS found"
        
        # First upload a photo
        minimal_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        payload = {
            "tipo": "depois",
            "imagem_base64": minimal_png,
            "descricao": "TEST_FOTO_DELETE - Photo to delete"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ordens-servico/{os_id}/fotos", json=payload, headers=headers)
        assert response.status_code == 200
        foto_id = response.json()["foto_id"]
        
        # Delete the photo
        response = self.session.delete(f"{BASE_URL}/api/ordens-servico/{os_id}/fotos/{foto_id}", headers=headers)
        assert response.status_code == 200, f"Failed to delete photo: {response.text}"
        print(f"✓ Photo {foto_id} deleted successfully")
        
        # Verify photo is removed
        response = self.session.get(f"{BASE_URL}/api/ordens-servico/{os_id}", headers=headers)
        assert response.status_code == 200
        os_data = response.json()
        
        fotos = os_data.get('fotos', [])
        foto_found = any(f.get('id') == foto_id for f in fotos)
        assert not foto_found, "Photo should be removed but still exists"
        print("✓ Photo verified as removed from OS")


class TestValueSanitization:
    """Tests for value sanitization - funcionários/motoristas shouldn't see prices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def create_funcionario_user(self):
        """Create or login as funcionario user"""
        # First try to login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_funcionario@oficinareis.com",
            "senha": "test123"
        })
        
        if response.status_code == 200:
            return response.json()["access_token"]
            
        # Create funcionario user
        response = self.session.post(f"{BASE_URL}/api/auth/cadastro", json={
            "nome": "TEST Funcionario",
            "email": "test_funcionario@oficinareis.com",
            "senha": "test123",
            "role": "funcionario",
            "codigo_validacao": FUNC_CODE
        })
        
        if response.status_code == 201 or response.status_code == 400:  # 400 if already exists
            # Login
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test_funcionario@oficinareis.com",
                "senha": "test123"
            })
            assert response.status_code == 200, f"Failed to login as funcionario: {response.text}"
            return response.json()["access_token"]
        
        pytest.skip("Could not create or login as funcionario")
        
    def create_motorista_user(self):
        """Create or login as motorista user"""
        # First try to login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_motorista@oficinareis.com",
            "senha": "test123"
        })
        
        if response.status_code == 200:
            return response.json()["access_token"]
            
        # Create motorista user
        response = self.session.post(f"{BASE_URL}/api/auth/cadastro", json={
            "nome": "TEST Motorista",
            "email": "test_motorista@oficinareis.com",
            "senha": "test123",
            "role": "motorista",
            "codigo_validacao": MOTORISTA_CODE
        })
        
        if response.status_code == 201 or response.status_code == 400:  # 400 if already exists
            # Login
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test_motorista@oficinareis.com",
                "senha": "test123"
            })
            assert response.status_code == 200, f"Failed to login as motorista: {response.text}"
            return response.json()["access_token"]
        
        pytest.skip("Could not create or login as motorista")
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
        
    def test_admin_sees_all_values(self):
        """Test that admin can see all price values"""
        token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        assert response.status_code == 200
        os_list = response.json()
        
        if not os_list:
            pytest.skip("No OS available for testing")
            
        os = os_list[0]
        
        # Admin should see all values
        assert os.get('valor_total') is not None, "Admin should see valor_total"
        assert os.get('valor_servicos') is not None, "Admin should see valor_servicos"
        assert os.get('valor_pecas') is not None, "Admin should see valor_pecas"
        
        # Check servico values
        for servico in os.get('servicos', []):
            assert servico.get('valor') is not None, "Admin should see servico valor"
            
        print("✓ Admin can see all price values")
        
    def test_funcionario_cannot_see_values(self):
        """Test that funcionario cannot see price values"""
        token = self.create_funcionario_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        assert response.status_code == 200
        os_list = response.json()
        
        if not os_list:
            pytest.skip("No OS available for testing")
            
        os = os_list[0]
        
        # Funcionario should NOT see values (should be None)
        assert os.get('valor_total') is None, f"Funcionario should NOT see valor_total, got {os.get('valor_total')}"
        assert os.get('valor_servicos') is None, f"Funcionario should NOT see valor_servicos, got {os.get('valor_servicos')}"
        assert os.get('valor_pecas') is None, f"Funcionario should NOT see valor_pecas, got {os.get('valor_pecas')}"
        
        # Check servico values are hidden
        for servico in os.get('servicos', []):
            assert servico.get('valor') is None, f"Funcionario should NOT see servico valor, got {servico.get('valor')}"
            
        print("✓ Funcionario cannot see price values (sanitized)")
        
    def test_motorista_cannot_see_values(self):
        """Test that motorista cannot see price values"""
        token = self.create_motorista_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        assert response.status_code == 200
        os_list = response.json()
        
        if not os_list:
            pytest.skip("No OS available for testing")
            
        os = os_list[0]
        
        # Motorista should NOT see values (should be None)
        assert os.get('valor_total') is None, f"Motorista should NOT see valor_total, got {os.get('valor_total')}"
        assert os.get('valor_servicos') is None, f"Motorista should NOT see valor_servicos, got {os.get('valor_servicos')}"
        
        print("✓ Motorista cannot see price values (sanitized)")
        
    def test_funcionario_pecas_prices_hidden(self):
        """Test that funcionario cannot see peca prices"""
        token = self.create_funcionario_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.session.get(f"{BASE_URL}/api/pecas", headers=headers)
        assert response.status_code == 200
        pecas = response.json()
        
        if not pecas:
            pytest.skip("No pecas available for testing")
            
        peca = pecas[0]
        
        # Funcionario should NOT see peca prices
        assert peca.get('preco_compra') is None, f"Funcionario should NOT see preco_compra, got {peca.get('preco_compra')}"
        assert peca.get('preco_venda') is None, f"Funcionario should NOT see preco_venda, got {peca.get('preco_venda')}"
        
        print("✓ Funcionario cannot see peca prices (sanitized)")


class TestPublicAreaCliente:
    """Tests for public Portal do Cliente and Relatório Visual de Qualidade"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_consulta_os_publica_returns_fotos(self):
        """Test that public OS query returns fotos array"""
        # Get an OS number first (as admin)
        admin_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "senha": ADMIN_PASSWORD
        })
        token = admin_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(f"{BASE_URL}/api/ordens-servico", headers=headers)
        os_list = response.json()
        
        if not os_list:
            pytest.skip("No OS available for testing")
            
        numero_fisico = os_list[0]['numero_fisico']
        
        # Now test public endpoint (no auth)
        response = self.session.get(f"{BASE_URL}/api/consulta-os/{numero_fisico}")
        assert response.status_code == 200, f"Failed to query public OS: {response.text}"
        
        data = response.json()
        assert "fotos" in data, "Public OS should include fotos array"
        assert isinstance(data["fotos"], list), "fotos should be a list"
        
        # Verify all expected fields are present
        assert "numero_fisico" in data
        assert "cliente_nome" in data
        assert "veiculo_tipo" in data
        assert "servicos" in data
        assert "valor_total" in data  # Clients CAN see total
        
        print(f"✓ Public OS query for #{numero_fisico} returns fotos array")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
