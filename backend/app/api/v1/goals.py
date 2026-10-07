from collections import defaultdict
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
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    offset = (page - 1) * per_page
    params = {
        "household_id": f"eq.{household_id}",
        "limit": str(per_page),
        "offset": str(offset),
    }
    goals = await rest_select("goals", params, token)

    if not goals:
        return {
            "data": [],
            "meta": {"page": page, "per_page": per_page, "total": 0},
            "links": {
                "self": f"/api/v1/goals?household_id={household_id}&page={page}&per_page={per_page}",
                "next": None,
                "prev": None,
            },
        }

    # Optimasi: Ambil seluruh setoran sekaligus untuk menghindari N+1 Query
    goal_ids = [str(g["id"]) for g in goals]
    contrib_params = {"goal_id": f"in.({','.join(goal_ids)})"}
    all_contribs = await rest_select("goal_contributions", contrib_params, token)

    saved_totals = defaultdict(int)
    for c in all_contribs:
        saved_totals[str(c.get("goal_id"))] += int(c.get("amount") or 0)

    result = [calculate_progress(g, saved_totals[str(g["id"])]) for g in goals]

    has_next = len(goals) == per_page
    has_prev = page > 1

    return {
        "data": result,
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": len(result),
        },
        "links": {
            "self": f"/api/v1/goals?household_id={household_id}&page={page}&per_page={per_page}",
            "next": f"/api/v1/goals?household_id={household_id}&page={page + 1}&per_page={per_page}" if has_next else None,
            "prev": f"/api/v1/goals?household_id={household_id}&page={page - 1}&per_page={per_page}" if has_prev else None,
        },
    }


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
    if not res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gagal membuat goal")
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


@goals_router.delete("/{goal_id}", status_code=status.HTTP_200_OK)
async def delete_goal(
    goal_id: UUID,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"id": f"eq.{goal_id}"}
    res = await rest_select("goals", params, token)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal tidak ditemukan")

    await rest_delete("goals", params, token)
    return {"data": None, "message": "Goal berhasil dihapus"}


# ==================== ENDPOINTS GOAL CONTRIBUTIONS ====================

@contributions_router.get("")
async def get_contributions(
    goal_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    offset = (page - 1) * per_page
    params = {"limit": str(per_page), "offset": str(offset)}
    if goal_id:
        params["goal_id"] = f"eq.{goal_id}"

    res = await rest_select("goal_contributions", params, token)
    has_next = len(res) == per_page
    has_prev = page > 1

    base_url = f"/api/v1/goal_contributions?page={page}&per_page={per_page}"
    if goal_id:
        base_url += f"&goal_id={goal_id}"

    return {
        "data": res,
        "meta": {"page": page, "per_page": per_page, "total": len(res)},
        "links": {
            "self": base_url,
            "next": f"{base_url.replace(f'page={page}', f'page={page+1}')}" if has_next else None,
            "prev": f"{base_url.replace(f'page={page}', f'page={page-1}')}" if has_prev else None,
        },
    }


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
    if not res:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gagal menambahkan setoran")
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


@contributions_router.delete("/{contribution_id}", status_code=status.HTTP_200_OK)
async def delete_contribution(
    contribution_id: UUID,
    current_user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    params = {"id": f"eq.{contribution_id}"}
    res = await rest_select("goal_contributions", params, token)
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setoran tidak ditemukan")

    await rest_delete("goal_contributions", params, token)
    return {"data": None, "message": "Setoran berhasil dihapus"}