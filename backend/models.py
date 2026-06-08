import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Text,
    Float,
    JSON,
)
from sqlalchemy.orm import relationship

from database import Base


class UserRole(str, enum.Enum):
    VENDEDOR = "vendedor"
    ASSISTENTE = "assistente"
    ORCAMENTISTA = "orcamentista"
    PROJETISTA = "projetista"
    GERENTE = "gerente"


class DemandStatus(str, enum.Enum):
    NOVA = "nova"
    EM_TRIAGEM = "em_triagem"
    PENDENCIA = "pendencia"
    EM_PROJETO = "em_projeto"
    EM_DESENVOLVIMENTO = "em_desenvolvimento"
    ORCADO = "orcado"
    PROPOSTA_ENVIADA = "proposta_enviada"
    FECHADO = "fechado"


class Priority(str, enum.Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    logs = relationship("DemandLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False, unique=True)
    fields_schema = Column(JSON, default=dict)

    demands = relationship("Demand", back_populates="category")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    cliente = Column(String(200), nullable=False)
    nome_campanha = Column(String(300), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    created_by = relationship("User")
    demands = relationship("Demand", back_populates="campaign")


class Demand(Base):
    __tablename__ = "demands"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    descricao = Column(Text, default="")
    categoria_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    status = Column(Enum(DemandStatus), default=DemandStatus.NOVA)
    prioridade = Column(Enum(Priority), default=Priority.MEDIA)
    prazo_esperado = Column(DateTime, nullable=True)
    prazo_orcamento_sla = Column(DateTime, nullable=True)
    valor_estimado = Column(Float, nullable=True)
    campos_dinamicos = Column(JSON, default=dict)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="demands")
    category = relationship("Category", back_populates="demands")
    created_by = relationship("User", foreign_keys=[created_by_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    logs = relationship("DemandLog", back_populates="demand", order_by="DemandLog.timestamp.desc()")
    attachments = relationship("Attachment", back_populates="demand")


class DemandLog(Base):
    __tablename__ = "demand_logs"

    id = Column(Integer, primary_key=True, index=True)
    demand_id = Column(Integer, ForeignKey("demands.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    acao = Column(String(100), nullable=False)
    status_anterior = Column(Enum(DemandStatus), nullable=True)
    status_novo = Column(Enum(DemandStatus), nullable=True)
    observacao = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)

    demand = relationship("Demand", back_populates="logs")
    user = relationship("User", back_populates="logs")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    demand_id = Column(Integer, ForeignKey("demands.id"), nullable=False)
    filename = Column(String(300), nullable=False)
    filepath = Column(String(500), nullable=False)
    content_type = Column(String(100), default="application/pdf")
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    demand = relationship("Demand", back_populates="attachments")
    uploaded_by = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    demand_id = Column(Integer, ForeignKey("demands.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
    demand = relationship("Demand")
