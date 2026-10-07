from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    household_id: UUID
    name: str
    target_amount: int = Field(..., gt=0)
    deadline: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = "in_progress"


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[int] = Field(None, gt=0)
    deadline: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None


class ContributionCreate(BaseModel):
    goal_id: UUID
    member_id: UUID
    amount: int = Field(..., gt=0)
    account_id: Optional[UUID] = None
    transaction_id: Optional[UUID] = None


class ContributionUpdate(BaseModel):
    amount: Optional[int] = Field(None, gt=0)
    account_id: Optional[UUID] = None
    transaction_id: Optional[UUID] = None