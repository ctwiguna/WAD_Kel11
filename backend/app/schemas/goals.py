from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    household_id: UUID
    name: str
    target_amount: int = Field(..., gt=0)
    target_date: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[int] = Field(None, gt=0)
    target_date: Optional[str] = None


class ContributionCreate(BaseModel):
    goal_id: UUID
    amount: int = Field(..., gt=0)


class ContributionUpdate(BaseModel):
    amount: Optional[int] = Field(None, gt=0)