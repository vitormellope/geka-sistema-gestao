from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr


# ---- Enums ----

class UserRoleEnum(str, enum.Enum):
    vendedor = "vendedor"
    assistente = "assistente"
    orcamentista = "orcamentista"
    projetista = "projetista"
    gerente = "gerente"


class DemandStatusEnum(str, enum.Enum):
    nova = "nova"
    em_triagem = "em_triagem"
    pendencia = "pendencia"
    em_projeto = "em_projeto"
    em_desenvolvimento = "em_desenvolvimento"
    orcado = "orcado"
    proposta_enviada = "proposta_enviada"
    fechado = "fechado"


class PriorityEnum(str, enum.Enum):
    baixa = "baixa"
    media = "media"
    alta = "alta"
    urgente = "urgente"


# ---- Token ----

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ---- User ----

class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str
    role: UserRoleEnum


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    nome: str
    email: str
    role: UserRoleEnum
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Category ----

class CategoryCreate(BaseModel):
    nome: str
    fields_schema: dict[str, Any] = {}


class CategoryUpdate(BaseModel):
    nome: Optional[str] = None
    fields_schema: Optional[dict[str, Any]] = None


class CategoryOut(BaseModel):
    id: int
    nome: str
    fields_schema: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


# ---- Campaign ----

class CampaignCreate(BaseModel):
    cliente: str
    nome_campanha: str


class CampaignOut(BaseModel):
    id: int
    cliente: str
    nome_campanha: str
    created_by_id: int
    created_at: datetime
    created_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ---- Attachment ----

class AttachmentOut(BaseModel):
    id: int
    demand_id: int
    filename: str
    content_type: str
    uploaded_by_id: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# ---- DemandLog ----

class DemandLogOut(BaseModel):
    id: int
    demand_id: int
    user_id: int
    acao: str
    status_anterior: Optional[DemandStatusEnum] = None
    status_novo: Optional[DemandStatusEnum] = None
    observacao: Optional[str] = None
    timestamp: datetime

    model_config = {"from_attributes": True}


# ---- Demand ----

class DemandCreate(BaseModel):
    campaign_id: int
    titulo: str
    descricao: str = ""
    categoria_id: int
    prioridade: PriorityEnum = PriorityEnum.media
    prazo_esperado: Optional[datetime] = None
    prazo_orcamento_sla: Optional[datetime] = None
    valor_estimado: Optional[float] = None
    campos_dinamicos: dict[str, Any] = {}


class DemandUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    categoria_id: Optional[int] = None
    prioridade: Optional[PriorityEnum] = None
    prazo_esperado: Optional[datetime] = None
    prazo_orcamento_sla: Optional[datetime] = None
    valor_estimado: Optional[float] = None
    campos_dinamicos: Optional[dict[str, Any]] = None
    assigned_to_id: Optional[int] = None


class DemandOut(BaseModel):
    id: int
    campaign_id: int
    titulo: str
    descricao: str
    categoria_id: int
    status: DemandStatusEnum
    prioridade: PriorityEnum
    prazo_esperado: Optional[datetime] = None
    prazo_orcamento_sla: Optional[datetime] = None
    valor_estimado: Optional[float] = None
    campos_dinamicos: Optional[dict[str, Any]] = None
    created_by_id: int
    assigned_to_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    campaign: Optional[CampaignOut] = None
    category: Optional[CategoryOut] = None
    created_by: Optional[UserOut] = None
    assigned_to: Optional[UserOut] = None
    logs: list[DemandLogOut] = []
    attachments: list[AttachmentOut] = []

    model_config = {"from_attributes": True}


# ---- Notification ----

class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    demand_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Status change request ----

class StatusChangeRequest(BaseModel):
    novo_status: DemandStatusEnum
    observacao: str = ""
