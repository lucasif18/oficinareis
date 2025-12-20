from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from models import (
    User, UserCreate, UserLogin, UserResponse,
    Cliente, ClienteCreate,
    Peca, PecaCreate,
    Funcionario, FuncionarioCreate,
    Motorista, MotoristaCreate,
    TabelaPreco, TabelaPrecoCreate,
    OrdemServico, OrdemServicoCreate,
    Orcamento, OrcamentoCreate,
    Romaneio, RomaneioCreate
)
from auth import hash_password, verify_password, create_access_token, get_current_user, require_role

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Oficina Reis API")
api_router = APIRouter(prefix="/api")

# ========== AUTH ROUTES ==========
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    user = User(
        nome=user_data.nome,
        email=user_data.email,
        senha_hash=hash_password(user_data.senha),
        role=user_data.role
    )
    doc = user.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.users.insert_one(doc)
    
    return UserResponse(
        id=user.id,
        nome=user.nome,
        email=user.email,
        role=user.role,
        ativo=user.ativo
    )

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.senha, user["senha_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")
    
    if not user.get("ativo", True):
        raise HTTPException(status_code=403, detail="Usuário inativo")
    
    token = create_access_token(data={"sub": user["id"], "email": user["email"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user["id"],
            nome=user["nome"],
            email=user["email"],
            role=user["role"],
            ativo=user["ativo"]
        )
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return UserResponse(**user)

# ========== DASHBOARD ROUTES ==========
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_os = await db.ordens_servico.count_documents({})
    os_andamento = await db.ordens_servico.count_documents({"status": "andamento"})
    os_concluidas = await db.ordens_servico.count_documents({"status": "concluido"})
    total_clientes = await db.clientes.count_documents({})
    
    pipeline_faturamento = [
        {"$match": {"status": "concluido"}},
        {"$group": {"_id": None, "total": {"$sum": "$valor_total"}}}
    ]
    result = await db.ordens_servico.aggregate(pipeline_faturamento).to_list(1)
    faturamento_mes = result[0]["total"] if result else 0.0
    
    return {
        "total_os": total_os,
        "os_andamento": os_andamento,
        "os_concluidas": os_concluidas,
        "total_clientes": total_clientes,
        "faturamento_mes": round(faturamento_mes, 2)
    }

@api_router.get("/dashboard/alerts")
async def get_dashboard_alerts(current_user: dict = Depends(get_current_user)):
    pecas_baixo_estoque = await db.pecas.find(
        {"$expr": {"$lte": ["$quantidade", "$quantidade_minima"]}},
        {"_id": 0}
    ).to_list(100)
    
    orcamentos_pendentes = await db.orcamentos.count_documents({"status": "pendente"})
    
    return {
        "pecas_baixo_estoque": pecas_baixo_estoque,
        "orcamentos_pendentes": orcamentos_pendentes
    }

@api_router.get("/dashboard/recent-os")
async def get_recent_os(current_user: dict = Depends(get_current_user)):
    os_list = await db.ordens_servico.find({}, {"_id": 0}).sort("criado_em", -1).limit(10).to_list(10)
    return os_list

# ========== CLIENTES ROUTES ==========
@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(data: ClienteCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    cliente = Cliente(**data.model_dump())
    doc = cliente.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.clientes.insert_one(doc)
    return cliente

@api_router.get("/clientes", response_model=List[Cliente])
async def list_clientes(
    search: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"cpf_cnpj": {"$regex": search, "$options": "i"}}
        ]
    if tipo:
        query["tipo"] = tipo
    
    clientes = await db.clientes.find(query, {"_id": 0}).to_list(1000)
    for c in clientes:
        if isinstance(c.get('criado_em'), str):
            c['criado_em'] = datetime.fromisoformat(c['criado_em'])
    return clientes

@api_router.get("/clientes/{cliente_id}", response_model=Cliente)
async def get_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if isinstance(cliente.get('criado_em'), str):
        cliente['criado_em'] = datetime.fromisoformat(cliente['criado_em'])
    return Cliente(**cliente)

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def update_cliente(cliente_id: str, data: ClienteCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    existing = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = data.model_dump()
    await db.clientes.update_one({"id": cliente_id}, {"$set": update_data})
    
    updated = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if isinstance(updated.get('criado_em'), str):
        updated['criado_em'] = datetime.fromisoformat(updated['criado_em'])
    return Cliente(**updated)

@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"message": "Cliente deletado com sucesso"}

# ========== PEÇAS ROUTES ==========
@api_router.post("/pecas", response_model=Peca)
async def create_peca(data: PecaCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    peca = Peca(**data.model_dump())
    doc = peca.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.pecas.insert_one(doc)
    return peca

@api_router.get("/pecas", response_model=List[Peca])
async def list_pecas(
    search: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"codigo": {"$regex": search, "$options": "i"}}
        ]
    if tipo:
        query["tipo"] = tipo
    
    pecas = await db.pecas.find(query, {"_id": 0}).to_list(1000)
    for p in pecas:
        if isinstance(p.get('criado_em'), str):
            p['criado_em'] = datetime.fromisoformat(p['criado_em'])
    return pecas

@api_router.get("/pecas/{peca_id}", response_model=Peca)
async def get_peca(peca_id: str, current_user: dict = Depends(get_current_user)):
    peca = await db.pecas.find_one({"id": peca_id}, {"_id": 0})
    if not peca:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    if isinstance(peca.get('criado_em'), str):
        peca['criado_em'] = datetime.fromisoformat(peca['criado_em'])
    return Peca(**peca)

@api_router.put("/pecas/{peca_id}", response_model=Peca)
async def update_peca(peca_id: str, data: PecaCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    existing = await db.pecas.find_one({"id": peca_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    
    update_data = data.model_dump()
    await db.pecas.update_one({"id": peca_id}, {"$set": update_data})
    
    updated = await db.pecas.find_one({"id": peca_id}, {"_id": 0})
    if isinstance(updated.get('criado_em'), str):
        updated['criado_em'] = datetime.fromisoformat(updated['criado_em'])
    return Peca(**updated)

@api_router.delete("/pecas/{peca_id}")
async def delete_peca(peca_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.pecas.delete_one({"id": peca_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    return {"message": "Peça deletada com sucesso"}

# ========== FUNCIONÁRIOS ROUTES ==========
@api_router.post("/funcionarios", response_model=Funcionario)
async def create_funcionario(data: FuncionarioCreate, current_user: dict = Depends(require_role(["admin"]))):
    funcionario = Funcionario(**data.model_dump())
    doc = funcionario.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.funcionarios.insert_one(doc)
    return funcionario

@api_router.get("/funcionarios", response_model=List[Funcionario])
async def list_funcionarios(current_user: dict = Depends(get_current_user)):
    funcionarios = await db.funcionarios.find({"ativo": True}, {"_id": 0}).to_list(1000)
    for f in funcionarios:
        if isinstance(f.get('criado_em'), str):
            f['criado_em'] = datetime.fromisoformat(f['criado_em'])
    return funcionarios

@api_router.get("/funcionarios/{funcionario_id}", response_model=Funcionario)
async def get_funcionario(funcionario_id: str, current_user: dict = Depends(get_current_user)):
    funcionario = await db.funcionarios.find_one({"id": funcionario_id}, {"_id": 0})
    if not funcionario:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    if isinstance(funcionario.get('criado_em'), str):
        funcionario['criado_em'] = datetime.fromisoformat(funcionario['criado_em'])
    return Funcionario(**funcionario)

@api_router.put("/funcionarios/{funcionario_id}", response_model=Funcionario)
async def update_funcionario(funcionario_id: str, data: FuncionarioCreate, current_user: dict = Depends(require_role(["admin"]))):
    existing = await db.funcionarios.find_one({"id": funcionario_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    
    update_data = data.model_dump()
    await db.funcionarios.update_one({"id": funcionario_id}, {"$set": update_data})
    
    updated = await db.funcionarios.find_one({"id": funcionario_id}, {"_id": 0})
    if isinstance(updated.get('criado_em'), str):
        updated['criado_em'] = datetime.fromisoformat(updated['criado_em'])
    return Funcionario(**updated)

@api_router.delete("/funcionarios/{funcionario_id}")
async def delete_funcionario(funcionario_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.funcionarios.delete_one({"id": funcionario_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    return {"message": "Funcionário deletado com sucesso"}

# ========== MOTORISTAS ROUTES ==========
@api_router.post("/motoristas", response_model=Motorista)
async def create_motorista(data: MotoristaCreate, current_user: dict = Depends(require_role(["admin"]))):
    motorista = Motorista(**data.model_dump())
    doc = motorista.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.motoristas.insert_one(doc)
    return motorista

@api_router.get("/motoristas", response_model=List[Motorista])
async def list_motoristas(current_user: dict = Depends(get_current_user)):
    motoristas = await db.motoristas.find({"ativo": True}, {"_id": 0}).to_list(1000)
    for m in motoristas:
        if isinstance(m.get('criado_em'), str):
            m['criado_em'] = datetime.fromisoformat(m['criado_em'])
    return motoristas

@api_router.get("/motoristas/{motorista_id}", response_model=Motorista)
async def get_motorista(motorista_id: str, current_user: dict = Depends(get_current_user)):
    motorista = await db.motoristas.find_one({"id": motorista_id}, {"_id": 0})
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    if isinstance(motorista.get('criado_em'), str):
        motorista['criado_em'] = datetime.fromisoformat(motorista['criado_em'])
    return Motorista(**motorista)

@api_router.put("/motoristas/{motorista_id}", response_model=Motorista)
async def update_motorista(motorista_id: str, data: MotoristaCreate, current_user: dict = Depends(require_role(["admin"]))):
    existing = await db.motoristas.find_one({"id": motorista_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    
    update_data = data.model_dump()
    await db.motoristas.update_one({"id": motorista_id}, {"$set": update_data})
    
    updated = await db.motoristas.find_one({"id": motorista_id}, {"_id": 0})
    if isinstance(updated.get('criado_em'), str):
        updated['criado_em'] = datetime.fromisoformat(updated['criado_em'])
    return Motorista(**updated)

@api_router.delete("/motoristas/{motorista_id}")
async def delete_motorista(motorista_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.motoristas.delete_one({"id": motorista_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    return {"message": "Motorista deletado com sucesso"}

# ========== TABELA PREÇO ROUTES ==========
@api_router.post("/tabela-precos", response_model=TabelaPreco)
async def create_tabela_preco(data: TabelaPrecoCreate, current_user: dict = Depends(require_role(["admin"]))):
    tabela = TabelaPreco(**data.model_dump())
    doc = tabela.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.tabela_precos.insert_one(doc)
    return tabela

@api_router.get("/tabela-precos", response_model=List[TabelaPreco])
async def list_tabela_precos(current_user: dict = Depends(get_current_user)):
    tabelas = await db.tabela_precos.find({"ativo": True}, {"_id": 0}).to_list(1000)
    for t in tabelas:
        if isinstance(t.get('criado_em'), str):
            t['criado_em'] = datetime.fromisoformat(t['criado_em'])
    return tabelas

@api_router.get("/tabela-precos/{tabela_id}", response_model=TabelaPreco)
async def get_tabela_preco(tabela_id: str, current_user: dict = Depends(get_current_user)):
    tabela = await db.tabela_precos.find_one({"id": tabela_id}, {"_id": 0})
    if not tabela:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    if isinstance(tabela.get('criado_em'), str):
        tabela['criado_em'] = datetime.fromisoformat(tabela['criado_em'])
    return TabelaPreco(**tabela)

@api_router.put("/tabela-precos/{tabela_id}", response_model=TabelaPreco)
async def update_tabela_preco(tabela_id: str, data: TabelaPrecoCreate, current_user: dict = Depends(require_role(["admin"]))):
    existing = await db.tabela_precos.find_one({"id": tabela_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    update_data = data.model_dump()
    await db.tabela_precos.update_one({"id": tabela_id}, {"$set": update_data})
    
    updated = await db.tabela_precos.find_one({"id": tabela_id}, {"_id": 0})
    if isinstance(updated.get('criado_em'), str):
        updated['criado_em'] = datetime.fromisoformat(updated['criado_em'])
    return TabelaPreco(**updated)

@api_router.delete("/tabela-precos/{tabela_id}")
async def delete_tabela_preco(tabela_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.tabela_precos.delete_one({"id": tabela_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return {"message": "Serviço deletado com sucesso"}

# ========== ORDENS DE SERVIÇO ROUTES ==========
@api_router.post("/ordens-servico", response_model=OrdemServico)
async def create_os(data: OrdemServicoCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    cliente = await db.clientes.find_one({"id": data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    valor_servicos = sum(s.valor for s in data.servicos)
    valor_pecas = sum(p.valor_total for p in data.pecas)
    
    if data.desconto_tipo == "percentual":
        valor_desconto = (valor_servicos + valor_pecas) * (data.desconto_valor / 100)
    else:
        valor_desconto = data.desconto_valor
    
    valor_total = valor_servicos + valor_pecas - valor_desconto
    
    os = OrdemServico(
        numero_fisico=data.numero_fisico,
        cliente_id=data.cliente_id,
        cliente_nome=cliente["nome"],
        veiculo_tipo=data.veiculo_tipo,
        veiculo_modelo=data.veiculo_modelo,
        veiculo_serie=data.veiculo_serie,
        categoria=data.categoria,
        servicos=[s.model_dump() for s in data.servicos],
        pecas=[p.model_dump() for p in data.pecas],
        desconto_tipo=data.desconto_tipo,
        desconto_valor=data.desconto_valor,
        valor_servicos=valor_servicos,
        valor_pecas=valor_pecas,
        valor_desconto=valor_desconto,
        valor_total=valor_total
    )
    
    for peca in data.pecas:
        await db.pecas.update_one(
            {"id": peca.peca_id},
            {"$inc": {"quantidade": -peca.quantidade}}
        )
    
    doc = os.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.ordens_servico.insert_one(doc)
    return os

@api_router.get("/ordens-servico", response_model=List[OrdemServico])
async def list_os(
    status: Optional[str] = Query(None),
    cliente_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if cliente_id:
        query["cliente_id"] = cliente_id
    
    os_list = await db.ordens_servico.find(query, {"_id": 0}).sort("criado_em", -1).to_list(1000)
    for os in os_list:
        if isinstance(os.get('criado_em'), str):
            os['criado_em'] = datetime.fromisoformat(os['criado_em'])
        if os.get('concluido_em') and isinstance(os['concluido_em'], str):
            os['concluido_em'] = datetime.fromisoformat(os['concluido_em'])
    return os_list

@api_router.get("/ordens-servico/{os_id}", response_model=OrdemServico)
async def get_os(os_id: str, current_user: dict = Depends(get_current_user)):
    os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not os:
        raise HTTPException(status_code=404, detail="Ordem de Serviço não encontrada")
    if isinstance(os.get('criado_em'), str):
        os['criado_em'] = datetime.fromisoformat(os['criado_em'])
    if os.get('concluido_em') and isinstance(os['concluido_em'], str):
        os['concluido_em'] = datetime.fromisoformat(os['concluido_em'])
    return OrdemServico(**os)

@api_router.put("/ordens-servico/{os_id}/status")
async def update_os_status(os_id: str, status: str, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    update_data = {"status": status}
    if status == "concluido":
        update_data["concluido_em"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.ordens_servico.update_one({"id": os_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    return {"message": "Status atualizado com sucesso"}

@api_router.get("/ordens-servico/{os_id}/pdf")
async def gerar_pdf_os(os_id: str, current_user: dict = Depends(get_current_user)):
    from weasyprint import HTML
    import io
    
    os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    if isinstance(os.get('criado_em'), str):
        os['criado_em'] = datetime.fromisoformat(os['criado_em'])
    if os.get('concluido_em') and isinstance(os['concluido_em'], str):
        os['concluido_em'] = datetime.fromisoformat(os['concluido_em'])
    
    status_labels = {
        "pendente": "Pendente",
        "andamento": "Em Andamento",
        "concluido": "Concluído"
    }
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; }}
            .header h1 {{ color: #1e3a5f; margin: 0; font-size: 32px; }}
            .header p {{ color: #666; margin: 5px 0; }}
            .os-number {{ font-size: 24px; font-weight: bold; color: #1e3a5f; margin: 20px 0; }}
            .section {{ margin: 30px 0; }}
            .section-title {{ font-size: 18px; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            .info-item {{ margin: 10px 0; }}
            .info-label {{ color: #666; font-size: 12px; }}
            .info-value {{ color: #000; font-weight: 500; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th {{ background-color: #f5f5f5; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }}
            td {{ padding: 10px; border-bottom: 1px solid #eee; }}
            .total-section {{ margin-top: 30px; text-align: right; }}
            .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
            .total-label {{ font-weight: 500; }}
            .total-value {{ font-family: monospace; font-weight: 600; }}
            .grand-total {{ font-size: 20px; color: #1e3a5f; border-top: 2px solid #1e3a5f; padding-top: 15px; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Oficina Reis</h1>
            <p>Retificação de Motores</p>
        </div>
        
        <div class="os-number">Ordem de Serviço #</div>{os['numero_fisico']}<div class="os-number">
        <p>Status: {status_labels.get(os['status'], os['status'])}</p>
        
        <div class="section">
            <div class="section-title">Cliente</div>
            <div class="info-item">
                <div class="info-value">{os['cliente_nome']}</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Veículo</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Tipo</div>
                    <div class="info-value">{os['veiculo_tipo']}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Modelo</div>
                    <div class="info-value">{os['veiculo_modelo']}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Série/Potência</div>
                    <div class="info-value">{os.get('veiculo_serie', '-')}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Categoria</div>
                    <div class="info-value">{os['categoria'].capitalize()}</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Serviços</div>
            <table>
                <thead>
                    <tr>
                        <th>Setor</th>
                        <th>Serviço</th>
                        <th>Funcionário</th>
                        <th style="text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    for servico in os.get('servicos', []):
        html_content += f"""
                    <tr>
                        <td>{servico['setor']}</td>
                        <td>{servico['servico']}</td>
                        <td>{servico.get('funcionario_nome', '-')}</td>
                        <td style="text-align: right;">R$ {servico['valor']:.2f}</td>
                    </tr>
        """
    
    html_content += """
                </tbody>
            </table>
        </div>
    """
    
    if os.get('pecas'):
        html_content += """
        <div class="section">
            <div class="section-title">Peças Utilizadas</div>
            <table>
                <thead>
                    <tr>
                        <th>Peça</th>
                        <th style="text-align: center;">Quantidade</th>
                        <th style="text-align: right;">Valor Unit.</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for peca in os['pecas']:
            html_content += f"""
                    <tr>
                        <td>{peca['peca_nome']}</td>
                        <td style="text-align: center;">{peca['quantidade']}</td>
                        <td style="text-align: right;">R$ {peca['valor_unitario']:.2f}</td>
                        <td style="text-align: right;">R$ {peca['valor_total']:.2f}</td>
                    </tr>
            """
        
        html_content += """
                </tbody>
            </table>
        </div>
        """
    
    html_content += f"""
        <div class="total-section">
            <div class="total-row">
                <div class="total-label">Subtotal Serviços:</div>
                <div class="total-value">R$ {os['valor_servicos']:.2f}</div>
            </div>
            <div class="total-row">
                <div class="total-label">Subtotal Peças:</div>
                <div class="total-value">R$ {os['valor_pecas']:.2f}</div>
            </div>
    """
    
    if os['valor_desconto'] > 0:
        html_content += f"""
            <div class="total-row" style="color: #f97316;">
                <div class="total-label">Desconto:</div>
                <div class="total-value">- R$ {os['valor_desconto']:.2f}</div>
            </div>
        """
    
    html_content += f"""
            <div class="total-row grand-total">
                <div class="total-label">TOTAL:</div>
                <div class="total-value">R$ {os['valor_total']:.2f}</div>
            </div>
        </div>
        
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
            <p>Criado em: {os['criado_em'].strftime('%d/%m/%Y')}</p>
        </div>
    </body>
    </html>
    """
    
    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=OS-{os['numero_fisico']}.pdf"}
    )

# ========== ORÇAMENTOS ROUTES ==========
@api_router.post("/orcamentos", response_model=Orcamento)
async def create_orcamento(data: OrcamentoCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    cliente = await db.clientes.find_one({"id": data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    valor_total = sum(s.valor for s in data.servicos) + sum(p.valor_total for p in data.pecas)
    
    orcamento = Orcamento(
        numero=data.numero,
        cliente_id=data.cliente_id,
        cliente_nome=cliente["nome"],
        veiculo_tipo=data.veiculo_tipo,
        veiculo_modelo=data.veiculo_modelo,
        servicos=[s.model_dump() for s in data.servicos],
        pecas=[p.model_dump() for p in data.pecas],
        valor_total=valor_total
    )
    
    doc = orcamento.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.orcamentos.insert_one(doc)
    return orcamento

@api_router.get("/orcamentos", response_model=List[Orcamento])
async def list_orcamentos(current_user: dict = Depends(get_current_user)):
    orcamentos = await db.orcamentos.find({}, {"_id": 0}).sort("criado_em", -1).to_list(1000)
    for o in orcamentos:
        if isinstance(o.get('criado_em'), str):
            o['criado_em'] = datetime.fromisoformat(o['criado_em'])
    return orcamentos

@api_router.get("/orcamentos/{orcamento_id}", response_model=Orcamento)
async def get_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    if isinstance(orcamento.get('criado_em'), str):
        orcamento['criado_em'] = datetime.fromisoformat(orcamento['criado_em'])
    return Orcamento(**orcamento)

@api_router.put("/orcamentos/{orcamento_id}/status")
async def update_orcamento_status(
    orcamento_id: str, 
    status: str,
    current_user: dict = Depends(require_role(["admin", "funcionario"]))
):
    result = await db.orcamentos.update_one({"id": orcamento_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return {"message": "Status atualizado com sucesso"}

@api_router.post("/orcamentos/{orcamento_id}/converter-os")
async def converter_orcamento_para_os(
    orcamento_id: str,
    numero_fisico: str,
    veiculo_serie: Optional[str] = None,
    categoria: str = "leve",
    current_user: dict = Depends(require_role(["admin", "funcionario"]))
):
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if orcamento.get("convertido_os_id"):
        raise HTTPException(status_code=400, detail="Orçamento já foi convertido para OS")
    
    if isinstance(orcamento.get('criado_em'), str):
        orcamento['criado_em'] = datetime.fromisoformat(orcamento['criado_em'])
    
    valor_servicos = sum(s['valor'] for s in orcamento['servicos'])
    valor_pecas = sum(p['valor_total'] for p in orcamento['pecas'])
    valor_total = valor_servicos + valor_pecas
    
    os = OrdemServico(
        numero_fisico=numero_fisico,
        cliente_id=orcamento["cliente_id"],
        cliente_nome=orcamento["cliente_nome"],
        veiculo_tipo=orcamento["veiculo_tipo"],
        veiculo_modelo=orcamento["veiculo_modelo"],
        veiculo_serie=veiculo_serie,
        categoria=categoria,
        servicos=orcamento["servicos"],
        pecas=orcamento["pecas"],
        desconto_tipo="fixo",
        desconto_valor=0.0,
        valor_servicos=valor_servicos,
        valor_pecas=valor_pecas,
        valor_desconto=0.0,
        valor_total=valor_total
    )
    
    for peca in orcamento["pecas"]:
        await db.pecas.update_one(
            {"id": peca["peca_id"]},
            {"$inc": {"quantidade": -peca["quantidade"]}}
        )
    
    doc = os.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.ordens_servico.insert_one(doc)
    
    await db.orcamentos.update_one(
        {"id": orcamento_id},
        {"$set": {"status": "aprovado", "convertido_os_id": os.id}}
    )
    
    return {"message": "Orçamento convertido para OS com sucesso", "os_id": os.id}

@api_router.get("/orcamentos/{orcamento_id}/pdf")
async def gerar_pdf_orcamento(orcamento_id: str, current_user: dict = Depends(get_current_user)):
    from weasyprint import HTML
    import io
    
    orcamento = await db.orcamentos.find_one({"id": orcamento_id}, {"_id": 0})
    if not orcamento:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    
    if isinstance(orcamento.get('criado_em'), str):
        orcamento['criado_em'] = datetime.fromisoformat(orcamento['criado_em'])
    
    status_labels = {"pendente": "Pendente", "aprovado": "Aprovado", "rejeitado": "Rejeitado"}
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; }}
            .header {{ text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; }}
            .header h1 {{ color: #1e3a5f; margin: 0; font-size: 32px; }}
            .section {{ margin: 30px 0; }}
            .section-title {{ font-size: 18px; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th {{ background-color: #f5f5f5; padding: 10px; text-align: left; font-weight: 600; }}
            td {{ padding: 10px; border-bottom: 1px solid #eee; }}
            .total-section {{ margin-top: 30px; text-align: right; font-size: 20px; font-weight: bold; color: #1e3a5f; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Oficina Reis - Orçamento</h1>
            <p>#{orcamento['numero']} - Status: {status_labels.get(orcamento['status'], orcamento['status'])}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Cliente</div>
            <p>{orcamento['cliente_nome']}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Veículo</div>
            <p>Tipo: {orcamento['veiculo_tipo']} | Modelo: {orcamento['veiculo_modelo']}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Serviços</div>
            <table>
                <thead><tr><th>Setor</th><th>Serviço</th><th style="text-align: right;">Valor</th></tr></thead>
                <tbody>
    """
    
    for servico in orcamento.get('servicos', []):
        html_content += f"<tr><td>{servico['setor']}</td><td>{servico['servico']}</td><td style='text-align: right;'>R$ {servico['valor']:.2f}</td></tr>"
    
    html_content += "</tbody></table></div>"
    
    if orcamento.get('pecas'):
        html_content += "<div class='section'><div class='section-title'>Peças</div><table><thead><tr><th>Peça</th><th>Qtd</th><th style='text-align: right;'>Valor Unit.</th><th style='text-align: right;'>Total</th></tr></thead><tbody>"
        for peca in orcamento['pecas']:
            html_content += f"<tr><td>{peca['peca_nome']}</td><td>{peca['quantidade']}</td><td style='text-align: right;'>R$ {peca['valor_unitario']:.2f}</td><td style='text-align: right;'>R$ {peca['valor_total']:.2f}</td></tr>"
        html_content += "</tbody></table></div>"
    
    html_content += f"<div class='total-section'>VALOR TOTAL: R$ {orcamento['valor_total']:.2f}</div></body></html>"
    
    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Orcamento-{orcamento['numero']}.pdf"})

# ========== ROMANEIO ROUTES ==========
@api_router.post("/romaneios", response_model=Romaneio)
async def create_romaneio(data: RomaneioCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    motorista = await db.motoristas.find_one({"id": data.motorista_id}, {"_id": 0})
    if not motorista:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    
    for os_id in data.os_ids:
        os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
        if not os:
            raise HTTPException(status_code=404, detail=f"OS {os_id} não encontrada")
        if os["status"] != "concluido":
            raise HTTPException(status_code=400, detail=f"OS {os_id} não está concluída")
    
    romaneio = Romaneio(
        numero=data.numero,
        motorista_id=data.motorista_id,
        motorista_nome=motorista["nome"],
        os_ids=data.os_ids,
        data_entrega=data.data_entrega
    )
    
    doc = romaneio.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    doc['data_entrega'] = doc['data_entrega'].isoformat()
    await db.romaneios.insert_one(doc)
    return romaneio

@api_router.get("/romaneios", response_model=List[Romaneio])
async def list_romaneios(current_user: dict = Depends(get_current_user)):
    romaneios = await db.romaneios.find({}, {"_id": 0}).sort("criado_em", -1).to_list(1000)
    for r in romaneios:
        if isinstance(r.get('criado_em'), str):
            r['criado_em'] = datetime.fromisoformat(r['criado_em'])
        if isinstance(r.get('data_entrega'), str):
            r['data_entrega'] = datetime.fromisoformat(r['data_entrega'])
    return romaneios

@api_router.get("/romaneios/{romaneio_id}", response_model=Romaneio)
async def get_romaneio(romaneio_id: str, current_user: dict = Depends(get_current_user)):
    romaneio = await db.romaneios.find_one({"id": romaneio_id}, {"_id": 0})
    if not romaneio:
        raise HTTPException(status_code=404, detail="Romaneio não encontrado")
    if isinstance(romaneio.get('criado_em'), str):
        romaneio['criado_em'] = datetime.fromisoformat(romaneio['criado_em'])
    if isinstance(romaneio.get('data_entrega'), str):
        romaneio['data_entrega'] = datetime.fromisoformat(romaneio['data_entrega'])
    return Romaneio(**romaneio)

@api_router.put("/romaneios/{romaneio_id}/status")
async def update_romaneio_status(
    romaneio_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.romaneios.update_one({"id": romaneio_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Romaneio não encontrado")
    return {"message": "Status atualizado com sucesso"}

@api_router.get("/romaneios/os-disponiveis/list")
async def list_os_disponiveis_romaneio(current_user: dict = Depends(get_current_user)):
    os_concluidas = await db.ordens_servico.find({"status": "concluido"}, {"_id": 0}).to_list(1000)
    
    romaneios_pendentes = await db.romaneios.find(
        {"status": {"$in": ["pendente", "em_rota"]}},
        {"_id": 0}
    ).to_list(1000)
    
    os_ids_em_romaneio = []
    for r in romaneios_pendentes:
        os_ids_em_romaneio.extend(r.get("os_ids", []))
    
    os_disponiveis = [os for os in os_concluidas if os["id"] not in os_ids_em_romaneio]
    
    for os in os_disponiveis:
        if isinstance(os.get('criado_em'), str):
            os['criado_em'] = datetime.fromisoformat(os['criado_em'])
        if os.get('concluido_em') and isinstance(os['concluido_em'], str):
            os['concluido_em'] = datetime.fromisoformat(os['concluido_em'])
    
    return os_disponiveis

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
