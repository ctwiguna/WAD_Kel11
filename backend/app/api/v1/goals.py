from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import get_access_token, get_current_user
from app.core.supabase_client import rest_delete, rest_insert, rest_patch, rest_select
from app.schemas.goals import (
    ContributionCreate,
    ContributionUpdate,
    GoalCreate,
    GoalUpdate,
)

goals_router = APIRouter(prefix="/goals", tags=["Goals"])
contributions_router = APIRouter(prefix="/goal_contributions", tags=["Goal Contributions"])


# ==================== HELPER PERHITUNGAN PROGRES ====================

def calculate_progress(goal: dict, total_saved: int) -> dict:
    target = int(goal.get("target_amount") or 0)
    saved = int(total_saved)
    remaining = max(0, target - saved)
    progress_percent = int((saved / target) * 100) if target > 0 else 0

    goal_copy = dict(goal)
    goal_copy["saved_amount"] = saved
    goal_copy["progress_percent"] = progress_percent
    goal_copy["remaining"] = remaining
    return goal_copy


# ==================== ENDPOINTS GOALS ====================

@goals_router.get("")
async def get_goals(
    household_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {
        "household_id": f"eq.{household_id}",
        "limit": str(limit),
        "offset": str(offset),
    }
    goals = await rest_select("goals", params, token)

    result = []
    for g in goals:
        contrib_params = {"goal_id": f"eq.{g['id']}"}
        contribs = await rest_select("goal_contributions", contrib_params, token)
        total_saved = sum(int(c.get("amount") or 0) for c in contribs)
        result.append(calculate_progress(g, total_saved))

    return {"data": result}


@goals_router.get("/{goal_id}")
async def get_goal_detail(
    goal_id: UUID,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"id": f"eq.{goal_id}"}
    goals = await rest_select("goals", params, token)
    if not goals:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal tidak ditemukan")

    contrib_params = {"goal_id": f"eq.{goal_id}"}
    contribs = await rest_select("goal_contributions", contrib_params, token)
    total_saved = sum(int(c.get("amount") or 0) for c in contribs)

    return {"data": calculate_progress(goals[0], total_saved)}


@goals_router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    body = payload.model_dump(mode="json")
    res = await rest_insert("goals", body, token)
    return {"data": calculate_progress(res[0], 0)}


@goals_router.patch("/{goal_id}")
async def update_goal(
    goal_id: UUID,
    payload: GoalUpdate,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    body = payload.model_dump(exclude_unset=True, mode="json")
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data untuk diperbarui")

    params = {"id": f"eq.{goal_id}"}
    res = await rest_patch("goals", params, body, token)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal tidak ditemukan")

    contrib_params = {"goal_id": f"eq.{goal_id}"}
    contribs = await rest_select("goal_contributions", contrib_params, token)
    total_saved = sum(int(c.get("amount") or 0) for c in contribs)

    return {"data": calculate_progress(res[0], total_saved)}


@goals_router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"id": f"eq.{goal_id}"}
    await rest_delete("goals", params, token)


# ==================== ENDPOINTS GOAL CONTRIBUTIONS ====================

@contributions_router.get("")
async def get_contributions(
    goal_id: Optional[UUID] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"limit": str(limit), "offset": str(offset)}
    if goal_id:
        params["goal_id"] = f"eq.{goal_id}"

    res = await rest_select("goal_contributions", params, token)
    return {"data": res}


@contributions_router.get("/{contribution_id}")
async def get_contribution_detail(
    contribution_id: UUID,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"id": f"eq.{contribution_id}"}
    res = await rest_select("goal_contributions", params, token)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setoran tidak ditemukan")

    return {"data": res[0]}


@contributions_router.post("", status_code=status.HTTP_201_CREATED)
async def create_contribution(
    payload: ContributionCreate,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    body = payload.model_dump(mode="json")
    res = await rest_insert("goal_contributions", body, token)
    return {"data": res[0]}


@contributions_router.patch("/{contribution_id}")
async def update_contribution(
    contribution_id: UUID,
    payload: ContributionUpdate,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    body = payload.model_dump(exclude_unset=True, mode="json")
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data untuk diperbarui")

    params = {"id": f"eq.{contribution_id}"}
    res = await rest_patch("goal_contributions", params, body, token)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setoran tidak ditemukan")

    return {"data": res[0]}


@contributions_router.delete("/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(
    contribution_id: UUID,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"id": f"eq.{contribution_id}"}
    await rest_delete("goal_contributions", params, token)