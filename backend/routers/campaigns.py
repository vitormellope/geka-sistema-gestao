from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_role
from database import get_db
from models import Campaign, User, UserRole
from schemas import CampaignCreate, CampaignOut

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.post("/", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(UserRole.VENDEDOR, UserRole.ASSISTENTE, UserRole.GERENTE)
    ),
) -> Campaign:
    campaign = Campaign(
        cliente=payload.cliente,
        nome_campanha=payload.nome_campanha,
        created_by_id=current_user.id,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/", response_model=list[CampaignOut])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Campaign]:
    query = db.query(Campaign).options(joinedload(Campaign.created_by))
    # Vendedor/Assistente only see their own campaigns
    if current_user.role in (UserRole.VENDEDOR, UserRole.ASSISTENTE):
        query = query.filter(Campaign.created_by_id == current_user.id)
    return query.order_by(Campaign.created_at.desc()).all()


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Campaign:
    campaign = (
        db.query(Campaign)
        .options(joinedload(Campaign.created_by))
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return campaign


@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int,
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Campaign:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    campaign.cliente = payload.cliente
    campaign.nome_campanha = payload.nome_campanha
    db.commit()
    db.refresh(campaign)
    return campaign
