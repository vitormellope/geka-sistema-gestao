from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_role
from database import get_db
from models import (
    Demand,
    DemandLog,
    DemandStatus,
    Notification,
    User,
    UserRole,
)
from schemas import DemandCreate, DemandOut, DemandStatusEnum, DemandUpdate, StatusChangeRequest

router = APIRouter(prefix="/demands", tags=["demands"])

# ---- Status transition rules per role ----

ALLOWED_TRANSITIONS: dict[UserRole, dict[DemandStatus, list[DemandStatus]]] = {
    UserRole.VENDEDOR: {
        DemandStatus.NOVA: [DemandStatus.EM_TRIAGEM],
        DemandStatus.ORCADO: [DemandStatus.PROPOSTA_ENVIADA],
        DemandStatus.PROPOSTA_ENVIADA: [DemandStatus.FECHADO],
    },
    UserRole.ASSISTENTE: {
        DemandStatus.NOVA: [DemandStatus.EM_TRIAGEM],
        DemandStatus.ORCADO: [DemandStatus.PROPOSTA_ENVIADA],
        DemandStatus.PROPOSTA_ENVIADA: [DemandStatus.FECHADO],
    },
    UserRole.ORCAMENTISTA: {
        DemandStatus.EM_TRIAGEM: [
            DemandStatus.EM_PROJETO,
            DemandStatus.EM_DESENVOLVIMENTO,
            DemandStatus.PENDENCIA,
        ],
        DemandStatus.EM_DESENVOLVIMENTO: [DemandStatus.ORCADO],
    },
    UserRole.PROJETISTA: {
        DemandStatus.EM_PROJETO: [DemandStatus.EM_DESENVOLVIMENTO, DemandStatus.PENDENCIA],
    },
    # Gerente can do any transition (handled separately)
}


def _demand_query(db: Session):
    return db.query(Demand).options(
        joinedload(Demand.campaign),
        joinedload(Demand.category),
        joinedload(Demand.created_by),
        joinedload(Demand.assigned_to),
        joinedload(Demand.logs),
        joinedload(Demand.attachments),
    )


@router.post("/", response_model=DemandOut, status_code=status.HTTP_201_CREATED)
def create_demand(
    payload: DemandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.VENDEDOR, UserRole.ASSISTENTE, UserRole.GERENTE)
    ),
) -> Demand:
    demand = Demand(
        campaign_id=payload.campaign_id,
        titulo=payload.titulo,
        descricao=payload.descricao,
        categoria_id=payload.categoria_id,
        prioridade=payload.prioridade.value,
        prazo_esperado=payload.prazo_esperado,
        prazo_orcamento_sla=payload.prazo_orcamento_sla,
        valor_estimado=payload.valor_estimado,
        campos_dinamicos=payload.campos_dinamicos,
        created_by_id=current_user.id,
        status=DemandStatus.NOVA,
    )
    db.add(demand)
    db.flush()

    log = DemandLog(
        demand_id=demand.id,
        user_id=current_user.id,
        acao="criação",
        status_novo=DemandStatus.NOVA,
        observacao="Demanda criada",
    )
    db.add(log)
    db.commit()
    db.refresh(demand)
    return demand


@router.get("/", response_model=list[DemandOut])
def list_demands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[DemandStatusEnum] = Query(None, alias="status"),
    campaign_id: Optional[int] = None,
) -> list[Demand]:
    query = _demand_query(db)

    # Role-based filtering
    if current_user.role in (UserRole.VENDEDOR, UserRole.ASSISTENTE):
        query = query.filter(Demand.created_by_id == current_user.id)
    elif current_user.role == UserRole.ORCAMENTISTA:
        query = query.filter(
            Demand.status.in_([
                DemandStatus.EM_TRIAGEM,
                DemandStatus.EM_DESENVOLVIMENTO,
                DemandStatus.ORCADO,
            ])
        )
    elif current_user.role == UserRole.PROJETISTA:
        query = query.filter(
            Demand.status.in_([DemandStatus.EM_PROJETO, DemandStatus.PENDENCIA])
        )
    # Gerente sees all

    if status_filter:
        query = query.filter(Demand.status == status_filter.value)
    if campaign_id:
        query = query.filter(Demand.campaign_id == campaign_id)

    return query.order_by(Demand.updated_at.desc()).all()


@router.get("/queue/triage", response_model=list[DemandOut])
def triage_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.ORCAMENTISTA, UserRole.GERENTE)
    ),
) -> list[Demand]:
    return (
        _demand_query(db)
        .filter(Demand.status == DemandStatus.EM_TRIAGEM)
        .order_by(Demand.created_at.asc())
        .all()
    )


@router.get("/queue/project", response_model=list[DemandOut])
def project_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.PROJETISTA, UserRole.GERENTE)
    ),
) -> list[Demand]:
    return (
        _demand_query(db)
        .filter(Demand.status == DemandStatus.EM_PROJETO)
        .order_by(Demand.created_at.asc())
        .all()
    )


@router.get("/kanban", response_model=dict[str, list[DemandOut]])
def kanban_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.GERENTE)),
) -> dict[str, list[Demand]]:
    demands = (
        _demand_query(db).order_by(Demand.updated_at.desc()).all()
    )
    result: dict[str, list[Demand]] = {}
    for s in DemandStatus:
        result[s.value] = [d for d in demands if d.status == s]
    return result


@router.get("/{demand_id}", response_model=DemandOut)
def get_demand(
    demand_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Demand:
    demand = _demand_query(db).filter(Demand.id == demand_id).first()
    if not demand:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    return demand


@router.put("/{demand_id}", response_model=DemandOut)
def update_demand(
    demand_id: int,
    payload: DemandUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Demand:
    demand = db.query(Demand).filter(Demand.id == demand_id).first()
    if not demand:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "prioridade" and value is not None:
            value = value.value if hasattr(value, "value") else value
        setattr(demand, field, value)

    demand.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(demand)
    return demand


@router.put("/{demand_id}/status", response_model=DemandOut)
def change_status(
    demand_id: int,
    payload: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Demand:
    demand = db.query(Demand).filter(Demand.id == demand_id).first()
    if not demand:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")

    old_status = demand.status
    new_status = DemandStatus(payload.novo_status.value)

    # Validate transition
    if current_user.role != UserRole.GERENTE:
        role_transitions = ALLOWED_TRANSITIONS.get(current_user.role, {})
        allowed = role_transitions.get(old_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Transição de {old_status.value} para {new_status.value} não permitida para {current_user.role.value}",
            )

    demand.status = new_status
    demand.updated_at = datetime.now(timezone.utc)

    # Create log entry
    log = DemandLog(
        demand_id=demand.id,
        user_id=current_user.id,
        acao="mudança de status",
        status_anterior=old_status,
        status_novo=new_status,
        observacao=payload.observacao,
    )
    db.add(log)

    # Create notification for demand creator
    if demand.created_by_id != current_user.id:
        notification = Notification(
            user_id=demand.created_by_id,
            message=f"Demanda \"{demand.titulo}\" mudou de {old_status.value} para {new_status.value}",
            demand_id=demand.id,
        )
        db.add(notification)

    db.commit()
    db.refresh(demand)
    return demand
