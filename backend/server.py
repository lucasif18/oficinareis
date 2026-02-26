from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Set
from datetime import datetime, timezone

from models import (
    User, UserCreate, UserLogin, UserResponse, UserRegister,
    Cliente, ClienteCreate,
    Peca, PecaCreate,
    Funcionario, FuncionarioCreate,
    Motorista, MotoristaCreate,
    TabelaPreco, TabelaPrecoCreate,
    OrdemServico, OrdemServicoCreate,
    Orcamento, OrcamentoCreate,
    Romaneio, RomaneioCreate,
    ContaPagar, ContaPagarCreate,
    ContaReceber, ContaReceberCreate
)
from auth import hash_password, verify_password, create_access_token, get_current_user, require_role

# Códigos de validação para cadastro
CODIGOS_VALIDACAO = {
    "admin": "ADM2024",
    "funcionario": "FUNC2024",
    "motorista": "MOTORISTA2024"
}

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Oficina Reis API")
api_router = APIRouter(prefix="/api")

# ========== WEBSOCKET MANAGER (Observer Pattern) ==========
class ConnectionManager:
    """Gerenciador de conexões WebSocket para atualização em tempo real"""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id -> websocket
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logging.info(f"WebSocket conectado: {user_id}")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logging.info(f"WebSocket desconectado: {user_id}")
    
    async def broadcast(self, message: dict):
        """Envia mensagem para todos os clientes conectados"""
        disconnected = []
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception as e:
                logging.error(f"Erro ao enviar para {user_id}: {e}")
                disconnected.append(user_id)
        # Limpa conexões mortas
        for user_id in disconnected:
            self.disconnect(user_id)

ws_manager = ConnectionManager()

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
    
    token = create_access_token(data={"sub": user["id"], "email": user["email"], "role": user["role"], "nome": user["nome"]})
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

# ========== REGISTRO PÚBLICO ==========
@api_router.post("/auth/cadastro", status_code=201)
async def cadastro_publico(data: UserRegister):
    """Cadastro público de usuários com validação de código"""
    # Verificar se email já existe
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Validar código para roles que não são cliente
    if data.role != "cliente":
        codigo_esperado = CODIGOS_VALIDACAO.get(data.role)
        if not data.codigo_validacao or data.codigo_validacao != codigo_esperado:
            raise HTTPException(status_code=400, detail="Código de validação inválido")
    
    cliente_id = None
    
    # Se for cliente, criar também o registro de cliente
    if data.role == "cliente":
        if not data.cpf_cnpj or not data.telefone:
            raise HTTPException(status_code=400, detail="CPF/CNPJ e telefone são obrigatórios para clientes")
        
        # Verificar se CPF/CNPJ já existe
        cpf_cnpj_limpo = ''.join(filter(str.isdigit, data.cpf_cnpj))
        existing_cliente = await db.clientes.find_one({"cpf_cnpj": cpf_cnpj_limpo}, {"_id": 0})
        
        if existing_cliente:
            cliente_id = existing_cliente["id"]
        else:
            # Criar novo cliente
            tipo = "PJ" if len(cpf_cnpj_limpo) == 14 else "PF"
            cliente = Cliente(
                tipo=tipo,
                nome=data.nome,
                cpf_cnpj=cpf_cnpj_limpo,
                telefone=data.telefone,
                email=data.email
            )
            doc_cliente = cliente.model_dump()
            doc_cliente['criado_em'] = doc_cliente['criado_em'].isoformat()
            await db.clientes.insert_one(doc_cliente)
            cliente_id = cliente.id
    
    # Criar usuário
    user = User(
        nome=data.nome,
        email=data.email,
        senha_hash=hash_password(data.senha),
        role=data.role,
        cliente_id=cliente_id
    )
    doc = user.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    await db.users.insert_one(doc)
    
    return {
        "message": "Cadastro realizado com sucesso!",
        "user": UserResponse(
            id=user.id,
            nome=user.nome,
            email=user.email,
            role=user.role,
            ativo=user.ativo
        )
    }

# ========== CONSULTA PÚBLICA DE OS (PARA CLIENTES) ==========
@api_router.get("/consulta-os/{numero_fisico}")
async def consulta_os_publica(numero_fisico: str):
    """Consulta pública de OS pelo número - para clientes acompanharem"""
    os = await db.ordens_servico.find_one({"numero_fisico": numero_fisico}, {"_id": 0})
    if not os:
        raise HTTPException(status_code=404, detail="Ordem de Serviço não encontrada")
    
    if isinstance(os.get('criado_em'), str):
        os['criado_em'] = datetime.fromisoformat(os['criado_em'])
    if os.get('concluido_em') and isinstance(os['concluido_em'], str):
        os['concluido_em'] = datetime.fromisoformat(os['concluido_em'])
    
    # Retornar dados relevantes para o cliente
    return {
        "numero_fisico": os["numero_fisico"],
        "cliente_nome": os["cliente_nome"],
        "veiculo_tipo": os["veiculo_tipo"],
        "veiculo_modelo": os["veiculo_modelo"],
        "status": os["status"],
        "servicos": os["servicos"],
        "pecas": os["pecas"],
        "valor_total": os["valor_total"],
        "criado_em": os["criado_em"].isoformat() if os.get("criado_em") else None,
        "concluido_em": os["concluido_em"].isoformat() if os.get("concluido_em") else None
    }

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

# ========== DASHBOARD FUNCIONÁRIO (Restrito - sem valores) ==========
@api_router.get("/dashboard/funcionario/stats")
async def get_funcionario_stats(current_user: dict = Depends(get_current_user)):
    # Pegar setor do funcionário
    funcionario = await db.funcionarios.find_one({"nome": current_user.get("nome")}, {"_id": 0})
    setor = funcionario.get("especialidade") if funcionario else None
    
    # Contar serviços do setor do funcionário
    pipeline_disponiveis = [
        {"$unwind": "$servicos"},
        {"$match": {"status": {"$ne": "concluido"}, "servicos.status": {"$in": ["disponivel", None]}}},
    ]
    if setor:
        pipeline_disponiveis.append({"$match": {"servicos.setor": setor}})
    pipeline_disponiveis.append({"$count": "total"})
    
    result_disp = await db.ordens_servico.aggregate(pipeline_disponiveis).to_list(1)
    
    # Em andamento (pelo funcionário)
    pipeline_andamento = [
        {"$unwind": "$servicos"},
        {"$match": {"servicos.status": "em_andamento", "servicos.funcionario_id": current_user.get("id")}},
        {"$count": "total"}
    ]
    result_and = await db.ordens_servico.aggregate(pipeline_andamento).to_list(1)
    
    # Concluídos hoje
    hoje = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    pipeline_concluidos = [
        {"$unwind": "$servicos"},
        {"$match": {"servicos.status": "concluido", "servicos.concluido_em": {"$gte": hoje.isoformat()}}},
        {"$count": "total"}
    ]
    result_conc = await db.ordens_servico.aggregate(pipeline_concluidos).to_list(1)
    
    # Meus serviços
    pipeline_meus = [
        {"$unwind": "$servicos"},
        {"$match": {"servicos.funcionario_id": current_user.get("id")}},
        {"$count": "total"}
    ]
    result_meus = await db.ordens_servico.aggregate(pipeline_meus).to_list(1)
    
    return {
        "servicos_disponiveis": result_disp[0]["total"] if result_disp else 0,
        "servicos_em_andamento": result_and[0]["total"] if result_and else 0,
        "servicos_concluidos_hoje": result_conc[0]["total"] if result_conc else 0,
        "meus_servicos": result_meus[0]["total"] if result_meus else 0
    }

@api_router.get("/dashboard/funcionario/atividades")
async def get_funcionario_atividades(current_user: dict = Depends(get_current_user)):
    # Pegar setor do funcionário
    funcionario = await db.funcionarios.find_one({"nome": current_user.get("nome")}, {"_id": 0})
    setor = funcionario.get("especialidade") if funcionario else None
    
    pipeline = [
        {"$unwind": "$servicos"},
    ]
    if setor:
        pipeline.append({"$match": {"servicos.setor": setor}})
    
    pipeline.extend([
        {"$sort": {"criado_em": -1}},
        {"$limit": 20},
        {"$project": {
            "_id": 0,
            "os_numero": "$numero_fisico",
            "setor": "$servicos.setor",
            "servico": "$servicos.servico",
            "status": {"$ifNull": ["$servicos.status", "disponivel"]},
            "data": "$criado_em"
        }}
    ])
    
    atividades = await db.ordens_servico.aggregate(pipeline).to_list(20)
    return atividades

# ========== SERVIÇOS FUNCIONÁRIO (com bloqueio/Observer) ==========
@api_router.get("/servicos-funcionario")
async def list_servicos_funcionario(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    # Pegar setor do funcionário
    funcionario = await db.funcionarios.find_one({"nome": current_user.get("nome")}, {"_id": 0})
    setor = funcionario.get("especialidade") if funcionario else None
    
    pipeline = [
        {"$match": {"status": {"$ne": "concluido"}}},
        {"$unwind": {"path": "$servicos", "includeArrayIndex": "servico_index"}},
    ]
    
    if setor:
        pipeline.append({"$match": {"servicos.setor": setor}})
    
    if status:
        status_filter = status if status != "disponivel" else {"$in": ["disponivel", None]}
        pipeline.append({"$match": {"servicos.status": status_filter}})
    
    pipeline.extend([
        {"$project": {
            "_id": 0,
            "id": {"$concat": ["$id", "-", {"$toString": "$servico_index"}]},
            "os_id": "$id",
            "os_numero": "$numero_fisico",
            "cliente_nome": "$cliente_nome",
            "setor": "$servicos.setor",
            "servico": "$servicos.servico",
            "status": {"$ifNull": ["$servicos.status", "disponivel"]},
            "bloqueado_por": "$servicos.bloqueado_por",
            "servico_index": 1
        }},
        {"$sort": {"os_numero": 1}}
    ])
    
    servicos = await db.ordens_servico.aggregate(pipeline).to_list(100)
    return servicos

@api_router.post("/servicos-funcionario/{servico_id}/iniciar")
async def iniciar_servico(servico_id: str, current_user: dict = Depends(get_current_user)):
    # Extrair os_id e index do servico_id
    parts = servico_id.rsplit("-", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="ID de serviço inválido")
    
    try:
        os_id, index = parts[0], int(parts[1])
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de serviço inválido")
    
    os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    servicos = os.get("servicos", [])
    if index >= len(servicos):
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    servico = servicos[index]
    
    # Verificar se já está bloqueado por outro funcionário (Observer Pattern)
    if servico.get("bloqueado_por") and servico["bloqueado_por"] != current_user["id"]:
        raise HTTPException(status_code=409, detail="Serviço já está sendo executado por outro funcionário")
    
    # Bloquear e iniciar o serviço
    await db.ordens_servico.update_one(
        {"id": os_id},
        {"$set": {
            f"servicos.{index}.status": "em_andamento",
            f"servicos.{index}.bloqueado_por": current_user["id"],
            f"servicos.{index}.funcionario_id": current_user["id"],
            f"servicos.{index}.funcionario_nome": current_user["nome"],
            f"servicos.{index}.iniciado_em": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notificar todos via WebSocket (Observer Pattern)
    await ws_manager.broadcast({
        "type": "servico_bloqueado",
        "servico_id": servico_id,
        "bloqueado_por": current_user["id"],
        "funcionario_nome": current_user["nome"],
        "status": "em_andamento"
    })
    
    return {"message": "Serviço iniciado com sucesso"}

@api_router.post("/servicos-funcionario/{servico_id}/concluir")
async def concluir_servico(servico_id: str, current_user: dict = Depends(get_current_user)):
    parts = servico_id.rsplit("-", 1)
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="ID de serviço inválido")
    
    try:
        os_id, index = parts[0], int(parts[1])
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de serviço inválido")
    
    os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not os:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    servicos = os.get("servicos", [])
    if index >= len(servicos):
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    servico = servicos[index]
    
    # Verificar se é o funcionário correto
    if servico.get("bloqueado_por") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Você não pode concluir este serviço")
    
    # Concluir o serviço
    await db.ordens_servico.update_one(
        {"id": os_id},
        {"$set": {
            f"servicos.{index}.status": "concluido",
            f"servicos.{index}.concluido_em": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notificar todos via WebSocket (Observer Pattern)
    await ws_manager.broadcast({
        "type": "servico_concluido",
        "servico_id": servico_id,
        "funcionario_nome": current_user["nome"],
        "status": "concluido"
    })
    
    return {"message": "Serviço concluído com sucesso"}

# ========== ENTRADA DE PEÇAS (Rápida) ==========
@api_router.post("/pecas/{peca_id}/entrada")
async def entrada_peca(peca_id: str, quantidade: int, current_user: dict = Depends(require_role(["admin", "motorista"]))):
    peca = await db.pecas.find_one({"id": peca_id}, {"_id": 0})
    if not peca:
        raise HTTPException(status_code=404, detail="Peça não encontrada")
    
    nova_quantidade = peca["quantidade"] + quantidade
    await db.pecas.update_one({"id": peca_id}, {"$set": {"quantidade": nova_quantidade}})
    
    # Registrar histórico de entrada
    await db.historico_pecas.insert_one({
        "peca_id": peca_id,
        "peca_nome": peca["nome"],
        "tipo": "entrada",
        "quantidade": quantidade,
        "quantidade_anterior": peca["quantidade"],
        "quantidade_nova": nova_quantidade,
        "usuario_id": current_user["id"],
        "usuario_nome": current_user["nome"],
        "data": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Entrada registrada com sucesso", "quantidade_atual": nova_quantidade}
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

@api_router.put("/ordens-servico/{os_id}")
async def update_os(os_id: str, data: OrdemServicoCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    """Atualiza uma Ordem de Serviço existente"""
    existing = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
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
    
    update_data = {
        "numero_fisico": data.numero_fisico,
        "cliente_id": data.cliente_id,
        "cliente_nome": cliente["nome"],
        "veiculo_tipo": data.veiculo_tipo,
        "veiculo_modelo": data.veiculo_modelo,
        "veiculo_serie": data.veiculo_serie,
        "categoria": data.categoria,
        "servicos": [s.model_dump() for s in data.servicos],
        "pecas": [p.model_dump() for p in data.pecas],
        "desconto_tipo": data.desconto_tipo,
        "desconto_valor": data.desconto_valor,
        "valor_servicos": valor_servicos,
        "valor_pecas": valor_pecas,
        "valor_desconto": valor_desconto,
        "valor_total": valor_total
    }
    
    await db.ordens_servico.update_one({"id": os_id}, {"$set": update_data})
    
    updated = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if isinstance(updated.get('criado_em'), str):
        updated['criado_em'] = datetime.fromisoformat(updated['criado_em'])
    if updated.get('concluido_em') and isinstance(updated['concluido_em'], str):
        updated['concluido_em'] = datetime.fromisoformat(updated['concluido_em'])
    return OrdemServico(**updated)

@api_router.delete("/ordens-servico/{os_id}")
async def delete_os(os_id: str, current_user: dict = Depends(require_role(["admin"]))):
    """Exclui uma Ordem de Serviço"""
    existing = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    
    # Restaurar estoque das peças
    for peca in existing.get('pecas', []):
        await db.pecas.update_one(
            {"id": peca["peca_id"]},
            {"$inc": {"quantidade": peca["quantidade"]}}
        )
    
    result = await db.ordens_servico.delete_one({"id": os_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="OS não encontrada")
    return {"message": "Ordem de Serviço excluída com sucesso"}

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
    
    # Template otimizado para impressão A4
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{ size: A4; margin: 15mm; }}
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #333; line-height: 1.4; }}
            
            .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 15px; }}
            .logo {{ display: flex; align-items: center; gap: 10px; }}
            .logo-icon {{ width: 50px; height: 50px; background: #f97316; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }}
            .logo-text h1 {{ font-size: 22px; color: #1e3a5f; margin: 0; font-weight: 800; }}
            .logo-text p {{ font-size: 10px; color: #666; margin: 2px 0 0 0; }}
            
            .os-info {{ text-align: right; }}
            .os-number {{ font-size: 20px; font-weight: 800; color: #1e3a5f; }}
            .os-status {{ display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 4px; }}
            .status-pendente {{ background: #fef3c7; color: #92400e; }}
            .status-andamento {{ background: #dbeafe; color: #1e40af; }}
            .status-concluido {{ background: #d1fae5; color: #065f46; }}
            
            .info-row {{ display: flex; gap: 20px; margin-bottom: 15px; }}
            .info-box {{ flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }}
            .info-box h3 {{ font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }}
            .info-box p {{ font-size: 12px; color: #1e293b; font-weight: 500; }}
            .info-box .small {{ font-size: 10px; color: #64748b; font-weight: 400; }}
            
            .section {{ margin-bottom: 15px; }}
            .section-title {{ font-size: 12px; font-weight: 700; color: #1e3a5f; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; }}
            
            table {{ width: 100%; border-collapse: collapse; font-size: 10px; }}
            thead {{ background: #1e3a5f; }}
            th {{ color: white; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; }}
            th.right {{ text-align: right; }}
            th.center {{ text-align: center; }}
            td {{ padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }}
            td.right {{ text-align: right; font-family: 'Courier New', monospace; }}
            td.center {{ text-align: center; }}
            tr:nth-child(even) {{ background: #f8fafc; }}
            
            .totals {{ margin-top: 15px; border-top: 2px solid #1e3a5f; padding-top: 12px; }}
            .total-row {{ display: flex; justify-content: flex-end; padding: 4px 0; font-size: 11px; }}
            .total-label {{ width: 150px; text-align: right; padding-right: 15px; color: #64748b; }}
            .total-value {{ width: 100px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }}
            .grand-total {{ font-size: 16px; color: #1e3a5f; border-top: 2px solid #1e3a5f; padding-top: 8px; margin-top: 8px; }}
            .grand-total .total-label {{ color: #1e3a5f; font-weight: 700; }}
            .discount {{ color: #f97316; }}
            
            .footer {{ margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center; }}
            .footer-company {{ font-weight: 600; color: #1e3a5f; }}
            
            .signature-area {{ display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }}
            .signature-box {{ width: 45%; text-align: center; }}
            .signature-line {{ border-top: 1px solid #333; padding-top: 5px; font-size: 10px; color: #64748b; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">
                <div class="logo-icon">R</div>
                <div class="logo-text">
                    <h1>Oficina Reis</h1>
                    <p>Retificação de Motores</p>
                </div>
            </div>
            <div class="os-info">
                <div class="os-number">OS #{os['numero_fisico']}</div>
                <div class="os-status status-{os['status']}">{status_labels.get(os['status'], os['status'])}</div>
            </div>
        </div>
        
        <div class="info-row">
            <div class="info-box">
                <h3>Cliente</h3>
                <p>{os['cliente_nome']}</p>
            </div>
            <div class="info-box">
                <h3>Veículo / Motor</h3>
                <p>{os['veiculo_tipo']} - {os['veiculo_modelo']}</p>
                <p class="small">Série: {os.get('veiculo_serie', '-')} | Categoria: {os['categoria'].capitalize()}</p>
            </div>
            <div class="info-box">
                <h3>Data</h3>
                <p>{os['criado_em'].strftime('%d/%m/%Y')}</p>
                <p class="small">{'Concluído: ' + os['concluido_em'].strftime('%d/%m/%Y') if os.get('concluido_em') else ''}</p>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Serviços Realizados</div>
            <table>
                <thead>
                    <tr>
                        <th>Setor</th>
                        <th>Serviço</th>
                        <th>Responsável</th>
                        <th class="right">Valor</th>
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
                        <td class="right">R$ {servico['valor']:.2f}</td>
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
                        <th class="center">Qtd</th>
                        <th class="right">Valor Unit.</th>
                        <th class="right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for peca in os['pecas']:
            html_content += f"""
                    <tr>
                        <td>{peca['peca_nome']}</td>
                        <td class="center">{peca['quantidade']}</td>
                        <td class="right">R$ {peca['valor_unitario']:.2f}</td>
                        <td class="right">R$ {peca['valor_total']:.2f}</td>
                    </tr>
            """
        
        html_content += """
                </tbody>
            </table>
        </div>
        """
    
    html_content += f"""
        <div class="totals">
            <div class="total-row">
                <span class="total-label">Serviços:</span>
                <span class="total-value">R$ {os['valor_servicos']:.2f}</span>
            </div>
            <div class="total-row">
                <span class="total-label">Peças:</span>
                <span class="total-value">R$ {os['valor_pecas']:.2f}</span>
            </div>
    """
    
    if os['valor_desconto'] > 0:
        html_content += f"""
            <div class="total-row discount">
                <span class="total-label">Desconto:</span>
                <span class="total-value">- R$ {os['valor_desconto']:.2f}</span>
            </div>
        """
    
    html_content += f"""
            <div class="total-row grand-total">
                <span class="total-label">TOTAL:</span>
                <span class="total-value">R$ {os['valor_total']:.2f}</span>
            </div>
        </div>
        
        <div class="signature-area">
            <div class="signature-box">
                <div class="signature-line">Assinatura do Cliente</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">Assinatura do Responsável</div>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-company">Eliezer Reis dos Santos & Cia Ltda</p>
            <p>Av. Vereador João Silva - Andaia - Santo Antônio de Jesus/BA</p>
            <p>Tel: (75) 3631-5946 | WhatsApp: (75) 98298-2509</p>
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

class ConfirmarEntregaRequest(BaseModel):
    os_id: str
    confirmado: bool

@api_router.put("/romaneios/{romaneio_id}/confirmar-entrega")
async def confirmar_entrega_romaneio(
    romaneio_id: str,
    request: ConfirmarEntregaRequest,
    current_user: dict = Depends(get_current_user)
):
    romaneio = await db.romaneios.find_one({"id": romaneio_id}, {"_id": 0})
    if not romaneio:
        raise HTTPException(status_code=404, detail="Romaneio não encontrado")
    
    entregas_confirmadas = romaneio.get("entregas_confirmadas", [])
    
    if request.confirmado:
        if request.os_id not in entregas_confirmadas:
            entregas_confirmadas.append(request.os_id)
    else:
        entregas_confirmadas = [eid for eid in entregas_confirmadas if eid != request.os_id]
    
    await db.romaneios.update_one(
        {"id": romaneio_id},
        {"$set": {"entregas_confirmadas": entregas_confirmadas}}
    )
    
    return {"message": "Entrega atualizada com sucesso", "entregas_confirmadas": entregas_confirmadas}

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

@api_router.get("/romaneios/{romaneio_id}/pdf")
async def gerar_pdf_romaneio(romaneio_id: str, current_user: dict = Depends(get_current_user)):
    from weasyprint import HTML
    import io
    
    romaneio = await db.romaneios.find_one({"id": romaneio_id}, {"_id": 0})
    if not romaneio:
        raise HTTPException(status_code=404, detail="Romaneio não encontrado")
    
    if isinstance(romaneio.get('criado_em'), str):
        romaneio['criado_em'] = datetime.fromisoformat(romaneio['criado_em'])
    if isinstance(romaneio.get('data_entrega'), str):
        romaneio['data_entrega'] = datetime.fromisoformat(romaneio['data_entrega'])
    
    os_list = []
    for os_id in romaneio['os_ids']:
        os = await db.ordens_servico.find_one({"id": os_id}, {"_id": 0})
        if os:
            os_list.append(os)
    
    status_labels = {"pendente": "Pendente", "em_rota": "Em Rota", "concluido": "Concluído"}
    
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
            .os-box {{ border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }}
            .os-header {{ font-size: 16px; font-weight: bold; color: #1e3a5f; margin-bottom: 10px; }}
            .signature-box {{ margin-top: 60px; padding-top: 20px; border-top: 2px solid #ddd; }}
            .signature-line {{ border-bottom: 2px solid #333; margin: 40px 20px 10px 20px; }}
            .total {{ font-size: 20px; font-weight: bold; text-align: right; color: #1e3a5f; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Oficina Reis - Romaneio</h1>
            <p>#{romaneio['numero']} - Status: {status_labels.get(romaneio['status'], romaneio['status'])}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Motorista</div>
            <p><strong>{romaneio['motorista_nome']}</strong></p>
            <p>Data de Entrega: {romaneio['data_entrega'].strftime('%d/%m/%Y')}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Ordens de Serviço para Entrega</div>
    """
    
    total_valor = 0
    for os in os_list:
        total_valor += os['valor_total']
        html_content += f"""
            <div class="os-box">
                <div class="os-header">OS #{os['numero_fisico']} - {os['cliente_nome']}</div>
                <p>Veículo: {os['veiculo_tipo']} - {os['veiculo_modelo']}</p>
                <p>Categoria: {os['categoria'].capitalize()}</p>
                <p style="text-align: right; font-weight: bold;">Valor: R$ {os['valor_total']:.2f}</p>
            </div>
        """
    
    html_content += f"""
        </div>
        
        <div class="total">
            <p>Total de OS: {len(os_list)}</p>
            <p>Valor Total: R$ {total_valor:.2f}</p>
        </div>
        
        <div class="signature-box">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%; text-align: center;">
                        <div class="signature-line"></div>
                        <p style="font-size: 12px; color: #666;">Assinatura do Motorista</p>
                    </td>
                    <td style="width: 50%; text-align: center;">
                        <div class="signature-line"></div>
                        <p style="font-size: 12px; color: #666;">Assinatura do Recebedor</p>
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    """
    
    pdf_buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Romaneio-{romaneio['numero']}.pdf"})

# ========== FINANCEIRO - CONTAS A PAGAR ==========
@api_router.post("/financeiro/contas-pagar", response_model=ContaPagar, status_code=201)
async def create_conta_pagar(data: ContaPagarCreate, current_user: dict = Depends(require_role(["admin"]))):
    conta = ContaPagar(**data.model_dump())
    doc = conta.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    doc['data_vencimento'] = doc['data_vencimento'].isoformat()
    await db.contas_pagar.insert_one(doc)
    return conta

@api_router.get("/financeiro/contas-pagar", response_model=List[ContaPagar])
async def list_contas_pagar(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    contas = await db.contas_pagar.find(query, {"_id": 0}).sort("data_vencimento", 1).to_list(1000)
    for c in contas:
        if isinstance(c.get('criado_em'), str):
            c['criado_em'] = datetime.fromisoformat(c['criado_em'])
        if isinstance(c.get('data_vencimento'), str):
            c['data_vencimento'] = datetime.fromisoformat(c['data_vencimento'])
        if c.get('data_pagamento') and isinstance(c['data_pagamento'], str):
            c['data_pagamento'] = datetime.fromisoformat(c['data_pagamento'])
    return contas

@api_router.put("/financeiro/contas-pagar/{conta_id}/pagar")
async def pagar_conta(conta_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.contas_pagar.update_one(
        {"id": conta_id},
        {"$set": {"status": "pago", "data_pagamento": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta marcada como paga"}

@api_router.delete("/financeiro/contas-pagar/{conta_id}")
async def delete_conta_pagar(conta_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.contas_pagar.delete_one({"id": conta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta deletada com sucesso"}

# ========== FINANCEIRO - CONTAS A RECEBER ==========
@api_router.post("/financeiro/contas-receber", response_model=ContaReceber, status_code=201)
async def create_conta_receber(data: ContaReceberCreate, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    conta_data = data.model_dump()
    
    if data.cliente_id:
        cliente = await db.clientes.find_one({"id": data.cliente_id}, {"_id": 0})
        if cliente:
            conta_data["cliente_nome"] = cliente["nome"]
    
    conta = ContaReceber(**conta_data)
    doc = conta.model_dump()
    doc['criado_em'] = doc['criado_em'].isoformat()
    doc['data_vencimento'] = doc['data_vencimento'].isoformat()
    await db.contas_receber.insert_one(doc)
    return conta

@api_router.get("/financeiro/contas-receber", response_model=List[ContaReceber])
async def list_contas_receber(
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    
    contas = await db.contas_receber.find(query, {"_id": 0}).sort("data_vencimento", 1).to_list(1000)
    for c in contas:
        if isinstance(c.get('criado_em'), str):
            c['criado_em'] = datetime.fromisoformat(c['criado_em'])
        if isinstance(c.get('data_vencimento'), str):
            c['data_vencimento'] = datetime.fromisoformat(c['data_vencimento'])
        if c.get('data_recebimento') and isinstance(c['data_recebimento'], str):
            c['data_recebimento'] = datetime.fromisoformat(c['data_recebimento'])
    return contas

@api_router.put("/financeiro/contas-receber/{conta_id}/receber")
async def receber_conta(conta_id: str, current_user: dict = Depends(require_role(["admin", "funcionario"]))):
    result = await db.contas_receber.update_one(
        {"id": conta_id},
        {"$set": {"status": "recebido", "data_recebimento": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta marcada como recebida"}

@api_router.delete("/financeiro/contas-receber/{conta_id}")
async def delete_conta_receber(conta_id: str, current_user: dict = Depends(require_role(["admin"]))):
    result = await db.contas_receber.delete_one({"id": conta_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    return {"message": "Conta deletada com sucesso"}

# ========== FINANCEIRO - FLUXO DE CAIXA ==========
@api_router.get("/financeiro/fluxo-caixa")
async def get_fluxo_caixa(
    data_inicio: Optional[str] = Query(None),
    data_fim: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    query_pagar = {}
    query_receber = {}
    
    if data_inicio and data_fim:
        data_inicio_dt = datetime.fromisoformat(data_inicio)
        data_fim_dt = datetime.fromisoformat(data_fim)
        query_pagar["data_vencimento"] = {"$gte": data_inicio_dt.isoformat(), "$lte": data_fim_dt.isoformat()}
        query_receber["data_vencimento"] = {"$gte": data_inicio_dt.isoformat(), "$lte": data_fim_dt.isoformat()}
    
    contas_pagar = await db.contas_pagar.find(query_pagar, {"_id": 0}).to_list(1000)
    contas_receber = await db.contas_receber.find(query_receber, {"_id": 0}).to_list(1000)
    
    total_pagar = sum(c["valor"] for c in contas_pagar)
    total_pagar_pendente = sum(c["valor"] for c in contas_pagar if c["status"] == "pendente")
    total_pagar_pago = sum(c["valor"] for c in contas_pagar if c["status"] == "pago")
    
    total_receber = sum(c["valor"] for c in contas_receber)
    total_receber_pendente = sum(c["valor"] for c in contas_receber if c["status"] == "pendente")
    total_receber_recebido = sum(c["valor"] for c in contas_receber if c["status"] == "recebido")
    
    saldo = total_receber_recebido - total_pagar_pago
    saldo_previsto = total_receber - total_pagar
    
    return {
        "contas_pagar": {
            "total": round(total_pagar, 2),
            "pendente": round(total_pagar_pendente, 2),
            "pago": round(total_pagar_pago, 2)
        },
        "contas_receber": {
            "total": round(total_receber, 2),
            "pendente": round(total_receber_pendente, 2),
            "recebido": round(total_receber_recebido, 2)
        },
        "saldo_atual": round(saldo, 2),
        "saldo_previsto": round(saldo_previsto, 2)
    }

# ========== FINANCEIRO - DRE ==========
@api_router.get("/financeiro/dre")
async def get_dre(
    mes: Optional[int] = Query(None),
    ano: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    import calendar
    
    if not mes or not ano:
        now = datetime.now(timezone.utc)
        mes = now.month
        ano = now.year
    
    primeiro_dia = datetime(ano, mes, 1, tzinfo=timezone.utc)
    ultimo_dia = datetime(ano, mes, calendar.monthrange(ano, mes)[1], 23, 59, 59, tzinfo=timezone.utc)
    
    os_mes = await db.ordens_servico.find({
        "status": "concluido",
        "concluido_em": {
            "$gte": primeiro_dia.isoformat(),
            "$lte": ultimo_dia.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    receita_servicos = sum(os["valor_servicos"] for os in os_mes)
    receita_pecas = sum(os["valor_pecas"] for os in os_mes)
    receita_bruta = receita_servicos + receita_pecas
    
    despesas = await db.contas_pagar.find({
        "status": "pago",
        "data_pagamento": {
            "$gte": primeiro_dia.isoformat(),
            "$lte": ultimo_dia.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    despesas_por_categoria = {}
    for despesa in despesas:
        categoria = despesa.get("categoria", "Outras")
        despesas_por_categoria[categoria] = despesas_por_categoria.get(categoria, 0) + despesa["valor"]
    
    total_despesas = sum(despesas_por_categoria.values())
    lucro_bruto = receita_bruta - total_despesas
    margem_lucro = (lucro_bruto / receita_bruta * 100) if receita_bruta > 0 else 0
    
    return {
        "mes": mes,
        "ano": ano,
        "receita_bruta": round(receita_bruta, 2),
        "receita_servicos": round(receita_servicos, 2),
        "receita_pecas": round(receita_pecas, 2),
        "despesas": {
            "total": round(total_despesas, 2),
            "por_categoria": {k: round(v, 2) for k, v in despesas_por_categoria.items()}
        },
        "lucro_bruto": round(lucro_bruto, 2),
        "margem_lucro": round(margem_lucro, 2),
        "quantidade_os": len(os_mes)
    }

# ========== WEBSOCKET ENDPOINT ==========
@app.websocket("/ws/servicos")
async def websocket_servicos(websocket: WebSocket):
    """WebSocket para atualizações em tempo real dos serviços"""
    # Gerar um ID temporário para conexões sem autenticação
    import uuid
    temp_id = str(uuid.uuid4())
    
    await ws_manager.connect(websocket, temp_id)
    try:
        while True:
            # Receber mensagens do cliente (para keep-alive ou autenticação)
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "auth" and message.get("user_id"):
                    # Reconectar com user_id real
                    ws_manager.disconnect(temp_id)
                    await ws_manager.connect(websocket, message["user_id"])
                    temp_id = message["user_id"]
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(temp_id)

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
