import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from models import User, Cliente, Peca, Funcionario, TabelaPreco
from auth import hash_password
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_data():
    print("🌱 Iniciando seed do banco de dados...")
    
    # Limpar coleções existentes
    await db.users.delete_many({})
    await db.clientes.delete_many({})
    await db.pecas.delete_many({})
    await db.funcionarios.delete_many({})
    await db.tabela_precos.delete_many({})
    await db.ordens_servico.delete_many({})
    print("✓ Coleções limpas")
    
    # Criar usuário admin
    admin = User(
        nome="Administrador",
        email="admin@oficinareis.com",
        senha_hash=hash_password("admin123"),
        role="admin"
    )
    doc = admin.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.users.insert_one(doc)
    print("✓ Usuário admin criado (admin@oficinareis.com / admin123)")
    
    # Criar clientes de exemplo
    clientes_data = [
        Cliente(
            tipo="PJ",
            nome="Transportadora ABC Ltda",
            cpf_cnpj="12345678000190",
            telefone="(11) 3333-4444",
            email="contato@abc.com.br",
            endereco="Av. Industrial, 1000",
            cidade="São Paulo",
            estado="SP"
        ),
        Cliente(
            tipo="PF",
            nome="Maria Aparecida Santos",
            cpf_cnpj="12345678901",
            telefone="(11) 97777-5555",
            email="maria@email.com",
            cidade="Guarulhos",
            estado="SP"
        ),
        Cliente(
            tipo="PF",
            nome="José Carlos da Silva",
            cpf_cnpj="98765432109",
            telefone="(11) 99999-1234",
            email="jose@email.com",
            cidade="São Paulo",
            estado="SP"
        )
    ]
    
    for cliente in clientes_data:
        doc = cliente.model_dump()
        doc['criado_em'] = doc['criado_em'].isoformat()
        await db.clientes.insert_one(doc)
    print(f"✓ {len(clientes_data)} clientes criados")
    
    # Criar peças de exemplo
    pecas_data = [
        Peca(nome="Anel de Segmento", tipo="nova", codigo="AS-001", quantidade=50, quantidade_minima=10, fornecedor="Mahle", valor_unitario=45.00),
        Peca(nome="Bronzina de Biela", tipo="nova", codigo="BB-002", quantidade=30, quantidade_minima=10, fornecedor="Metal Leve", valor_unitario=85.50),
        Peca(nome="Válvula de Admissão", tipo="nova", codigo="VA-003", quantidade=8, quantidade_minima=15, fornecedor="TRW", valor_unitario=120.00),
        Peca(nome="Cabeçote Recondicionado", tipo="usada", codigo="CR-004", quantidade=5, quantidade_minima=3, fornecedor="Remanufatura", valor_unitario=850.00),
        Peca(nome="Pistão Turbo", tipo="nova", codigo="PT-005", quantidade=20, quantidade_minima=8, fornecedor="Mahle", valor_unitario=350.00),
    ]
    
    for peca in pecas_data:
        doc = peca.model_dump()
        doc['criado_em'] = doc['criado_em'].isoformat()
        await db.pecas.insert_one(doc)
    print(f"✓ {len(pecas_data)} peças criadas")
    
    # Criar funcionários
    funcionarios_data = [
        Funcionario(nome="João Silva", cpf="11111111111", telefone="(11) 91111-1111", especialidades=["Virabrequim", "Bloco"]),
        Funcionario(nome="Pedro Santos", cpf="22222222222", telefone="(11) 92222-2222", especialidades=["Bielas", "Cabeçote"]),
        Funcionario(nome="Carlos Oliveira", cpf="33333333333", telefone="(11) 93333-3333", especialidades=["Comando", "Válvulas"]),
        Funcionario(nome="Roberto Costa", cpf="44444444444", telefone="(11) 94444-4444", especialidades=["Gerais"])
    ]
    
    for func in funcionarios_data:
        doc = func.model_dump()
        doc['criado_em'] = doc['criado_em'].isoformat()
        await db.funcionarios.insert_one(doc)
    print(f"✓ {len(funcionarios_data)} funcionários criados")
    
    # Criar tabela de preços
    tabela_data = [
        TabelaPreco(setor="Virabrequim", servico="Retífica de Virabrequim", valor=450.00),
        TabelaPreco(setor="Virabrequim", servico="Polimento", valor=280.00),
        TabelaPreco(setor="Bloco", servico="Retífica de Bloco", valor=650.00),
        TabelaPreco(setor="Bloco", servico="Brunimento", valor=320.00),
        TabelaPreco(setor="Bielas", servico="Retífica de Bielas", valor=380.00),
        TabelaPreco(setor="Bielas", servico="Alinhamento", valor=220.00),
        TabelaPreco(setor="Cabeçote", servico="Retífica de Cabeçote", valor=580.00),
        TabelaPreco(setor="Cabeçote", servico="Teste de Pressão", valor=150.00),
        TabelaPreco(setor="Comando", servico="Retífica de Comando", valor=420.00),
        TabelaPreco(setor="Válvulas", servico="Retífica de Válvulas", valor=180.00),
        TabelaPreco(setor="Válvulas", servico="Troca de Guias", valor=240.00),
        TabelaPreco(setor="Gerais", servico="Lavagem Completa", valor=120.00),
        TabelaPreco(setor="Gerais", servico="Montagem", valor=350.00)
    ]
    
    for tabela in tabela_data:
        doc = tabela.model_dump()
        doc['criado_em'] = doc['criado_em'].isoformat()
        await db.tabela_precos.insert_one(doc)
    print(f"✓ {len(tabela_data)} serviços na tabela de preços")
    
    print("\n✅ Seed concluído com sucesso!")
    print("\n📝 Credenciais de acesso:")
    print("   Email: admin@oficinareis.com")
    print("   Senha: admin123")

if __name__ == "__main__":
    asyncio.run(seed_data())
    client.close()
