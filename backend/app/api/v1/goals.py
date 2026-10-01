from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.deps import get_supabase_client  # Sesuaikan dengan helper deps kelompokmu
from app.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["Goals & Contributions"])

# --- PYDANTIC SCHEMAS ---
class GoalStatus(str, Enum):
    ACTIVE = "active"
    ACHIEVED = "achieved"
    ARCHIVED = "archived"

class GoalBase(BaseModel):
    name: str = Field(..., max_length=120, example="Dana Darurat")
    target_amount: int = Field(..., gt=0, example=10000000, description="Nominal rupiah penuh (BIGINT)")
    deadline: Optional[date] = None
    icon: Optional[str] = Field(None, max_length=8, example="🎯")
    color: str = Field("#10B981", max_length=7, example="#10B981")
    status: GoalStatus = GoalStatus.ACTIVE

class GoalCreate(GoalBase):
    household_id: UUID

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    target_amount: Optional[int] = Field(None, gt=0)
    deadline: Optional[date] = None
    icon: Optional[str] = Field(None, max_length=8)
    color: Optional[str] = Field(None, max_length=7)
    status: Optional[GoalStatus] = None

class GoalResponse(GoalBase):
    id: UUID
    household_id: UUID
    created_at: datetime
    updated_at: datetime

class ContributionBase(BaseModel):
    amount: int = Field(..., gt=0, example=500000, description="Nominal rupiah penuh (BIGINT)")
    notes: Optional[str] = None
    contributed_at: Optional[datetime] = None

class ContributionCreate(ContributionBase):
    member_id: UUID
    account_id: Optional[UUID] = None
    transaction_id: Optional[UUID] = None

class ContributionResponse(ContributionBase):
    id: UUID
    goal_id: UUID
    member_id: UUID
    account_id: Optional[UUID] = None
    transaction_id: Optional[UUID] = None
    created_at: datetime


# --- ENDPOINTS GOALS ---

def get_service(db=Depends(get_supabase_client)) -> GoalService:
    return GoalService(db)

@router.get("", response_model=List[GoalResponse])
async def get_goals(household_id: UUID, service: GoalService = Depends(get_service)):
    return await service.get_goals_by_household(household_id)

@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(payload: GoalCreate, service: GoalService = Depends(get_service)):
    data = payload.model_dump(mode="json")
    return await service.create_goal(data)

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: UUID, service: GoalService = Depends(get_service)):
    goal = await service.get_goal_by_id(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal tidak ditemukan")
    return goal

@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: UUID, payload: GoalUpdate, service: GoalService = Depends(get_service)):
    data = payload.model_dump(exclude_unset=True, mode="json")
    return await service.update_goal(goal_id, data)

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(goal_id: UUID, service: GoalService = Depends(get_service)):
    await service.delete_goal(goal_id)

# --- ENDPOINTS GOAL CONTRIBUTIONS ---

@router.get("/{goal_id}/contributions", response_model=List[ContributionResponse])
async def get_contributions(goal_id: UUID, service: GoalService = Depends(get_service)):
    return await service.get_contributions_by_goal(goal_id)

@router.post("/{goal_id}/contributions", response_model=ContributionResponse, status_code=status.HTTP_201_CREATED)
async def add_contribution(goal_id: UUID, payload: ContributionCreate, service: GoalService = Depends(get_service)):
    data = payload.model_dump(mode="json")
    return await service.create_contribution(goal_id, data)

@router.delete("/contributions/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(contribution_id: UUID, service: GoalService = Depends(get_service)):
    await service.delete_contribution(contribution_id)