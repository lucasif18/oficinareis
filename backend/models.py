from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid
import re

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    email: str
    senha_hash: str
    role: Literal["admin", "funcionario", "motorista", "cliente"]
    ativo: bool = True
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Para clientes - vincular ao cadastro de cliente
    cliente_id: Optional[str] = None

class UserCreate(BaseModel):
    nome: str
    email: str
    senha: str
    role: Literal["admin", "funcionario", "motorista", "cliente"]

class UserRegister(BaseModel):
    nome: str
    email: str
    senha: str
    role: Literal["admin", "funcionario", "motorista", "cliente"]
    codigo_validacao: Optional[str] = None  # Não obrigatório para cliente
    # Para clientes
    cpf_cnpj: Optional[str] = None
    telefone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    senha: str

class UserResponse(BaseModel):
    id: str
    nome: str
    email: str
    role: str
    ativo: bool

class Cliente(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: Literal["PF", "PJ"]
    nome: str
    cpf_cnpj: str
    telefone: str
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @field_validator('cpf_cnpj')
    def validar_cpf_cnpj(cls, v):
        v = re.sub(r'[^0-9]', '', v)
        if len(v) not in [11, 14]:
            raise ValueError('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos')
        return v

class ClienteCreate(BaseModel):
    tipo: Literal["PF", "PJ"]
    nome: str
    cpf_cnpj: str
    telefone: str
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None

class Peca(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    tipo: Literal["nova", "usada"]
    codigo: Optional[str] = None
    quantidade: int
    quantidade_minima: int
    fornecedor: Optional[str] = None
    valor_unitario: float
    localizacao: Optional[str] = None
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PecaCreate(BaseModel):
    nome: str
    tipo: Literal["nova", "usada"]
    codigo: Optional[str] = None
    quantidade: int
    quantidade_minima: int
    fornecedor: Optional[str] = None
    valor_unitario: float
    localizacao: Optional[str] = None

class Funcionario(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf: str
    telefone: str
    especialidades: List[str] = []  # ['Virabrequim', 'Bloco', 'Bielas', etc]
    ativo: bool = True
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FuncionarioCreate(BaseModel):
    nome: str
    cpf: str
    telefone: str
    especialidades: List[str] = []

class Motorista(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf: str
    telefone: str
    cnh: str
    veiculo_modelo: Optional[str] = None
    veiculo_placa: Optional[str] = None
    ativo: bool = True
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MotoristaCreate(BaseModel):
    nome: str
    cpf: str
    telefone: str
    cnh: str
    veiculo_modelo: Optional[str] = None
    veiculo_placa: Optional[str] = None

class TabelaPreco(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    setor: str
    servico: str
    valor: float
    ativo: bool = True
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TabelaPrecoCreate(BaseModel):
    setor: str
    servico: str
    valor: float

class ServicoOS(BaseModel):
    setor: str
    servico: str
    funcionario_id: Optional[str] = None
    funcionario_nome: Optional[str] = None
    valor: Optional[float] = None  # Optional to support sanitization for funcionarios/motoristas

class PecaOS(BaseModel):
    peca_id: str
    peca_nome: str
    quantidade: int
    valor_unitario: Optional[float] = None  # Optional to support sanitization
    valor_total: Optional[float] = None  # Optional to support sanitization

class OrdemServico(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_fisico: str
    cliente_id: str
    cliente_nome: str
    cliente_tipo: Optional[str] = None
    cliente_documento: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_email: Optional[str] = None
    veiculo_tipo: str
    veiculo_modelo: str
    veiculo_serie: Optional[str] = None
    categoria: Literal["leve", "pesada"]
    servicos: List[ServicoOS] = []
    pecas: List[PecaOS] = []
    desconto_tipo: Literal["percentual", "fixo"] = "fixo"
    desconto_valor: Optional[float] = 0.0  # Optional to support sanitization
    valor_servicos: Optional[float] = None  # Optional to support sanitization for funcionarios/motoristas
    valor_pecas: Optional[float] = None  # Optional to support sanitization
    valor_desconto: Optional[float] = None  # Optional to support sanitization
    valor_total: Optional[float] = None  # Optional to support sanitization
    status: Literal["pendente", "andamento", "concluido", "enviando", "entregue"] = "pendente"
    fotos: List[dict] = []  # Lista de fotos {tipo: 'antes'|'depois', url: str}
    romaneio_id: Optional[str] = None
    entregue: bool = False
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    concluido_em: Optional[datetime] = None

class OrdemServicoCreate(BaseModel):
    numero_fisico: str
    cliente_id: str
    veiculo_tipo: str
    veiculo_modelo: str
    veiculo_serie: Optional[str] = None
    categoria: Literal["leve", "pesada"]
    servicos: List[ServicoOS] = []
    pecas: List[PecaOS] = []
    desconto_tipo: Literal["percentual", "fixo"] = "fixo"
    desconto_valor: float = 0.0

class Orcamento(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    cliente_id: str
    cliente_nome: str
    veiculo_tipo: str
    veiculo_modelo: str
    servicos: List[ServicoOS] = []
    pecas: List[PecaOS] = []
    valor_total: float
    status: Literal["pendente", "aprovado", "rejeitado"] = "pendente"
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    convertido_os_id: Optional[str] = None

class OrcamentoCreate(BaseModel):
    numero: str
    cliente_id: str
    veiculo_tipo: str
    veiculo_modelo: str
    servicos: List[ServicoOS] = []
    pecas: List[PecaOS] = []

class Romaneio(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    motorista_id: str
    motorista_nome: str
    os_ids: List[str] = []
    entregas_confirmadas: List[str] = []  # IDs das OS já entregues
    data_entrega: datetime
    status: Literal["pendente", "em_rota", "concluido"] = "pendente"
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RomaneioCreate(BaseModel):
    numero: str
    motorista_id: str
    os_ids: List[str] = []
    data_entrega: datetime

class ContaPagar(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    valor: float
    data_vencimento: datetime
    data_pagamento: Optional[datetime] = None
    categoria: str  # Fornecedores, Funcionários, Impostos, etc
    status: Literal["pendente", "pago"] = "pendente"
    observacoes: Optional[str] = None
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContaPagarCreate(BaseModel):
    descricao: str
    valor: float
    data_vencimento: datetime
    categoria: str
    observacoes: Optional[str] = None

class ContaReceber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    valor: float
    data_vencimento: datetime
    data_recebimento: Optional[datetime] = None
    cliente_id: Optional[str] = None
    cliente_nome: Optional[str] = None
    os_id: Optional[str] = None
    status: Literal["pendente", "recebido"] = "pendente"
    observacoes: Optional[str] = None
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContaReceberCreate(BaseModel):
    descricao: str
    valor: float
    data_vencimento: datetime
    cliente_id: Optional[str] = None
    os_id: Optional[str] = None
    observacoes: Optional[str] = None
