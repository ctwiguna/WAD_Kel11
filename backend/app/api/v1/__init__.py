"""Router versi 1."""

from fastapi import APIRouter

from app.api.v1.goals import contributions_router, goals_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.reports import router as reports_router

router = APIRouter()

router.include_router(profiles_router)
router.include_router(reports_router)
router.include_router(goals_router)
router.include_router(contributions_router)