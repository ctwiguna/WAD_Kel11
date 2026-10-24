from uuid import UUID
from typing import Dict, Any, List, Optional
from supabase import Client

class GoalService:
    def __init__(self, supabase: Client):
        self.db = supabase

    # --- GOALS CRUD ---
    async def get_goals_by_household(self, household_id: UUID) -> List[Dict[str, Any]]:
        response = self.db.table("goals").select("*").eq("household_id", str(household_id)).execute()
        return response.data

    async def get_goal_by_id(self, goal_id: UUID) -> Optional[Dict[str, Any]]:
        response = self.db.table("goals").select("*").eq("id", str(goal_id)).execute()
        if response.data:
            return response.data[0]
        return None

    async def create_goal(self, data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.db.table("goals").insert(data).execute()
        return response.data[0]

    async def update_goal(self, goal_id: UUID, data: Dict[str, Any]) -> Dict[str, Any]:
        response = self.db.table("goals").update(data).eq("id", str(goal_id)).execute()
        return response.data[0]

    async def delete_goal(self, goal_id: UUID) -> None:
        self.db.table("goals").delete().eq("id", str(goal_id)).execute()

    # --- GOAL CONTRIBUTIONS CRUD ---
    async def get_contributions_by_goal(self, goal_id: UUID) -> List[Dict[str, Any]]:
        response = self.db.table("goal_contributions").select("*").eq("goal_id", str(goal_id)).execute()
        return response.data

    async def create_contribution(self, goal_id: UUID, data: Dict[str, Any]) -> Dict[str, Any]:
        payload = {"goal_id": str(goal_id), **data}
        response = self.db.table("goal_contributions").insert(payload).execute()
        return response.data[0]

    async def delete_contribution(self, contribution_id: UUID) -> None:
        self.db.table("goal_contributions").delete().eq("id", str(contribution_id)).execute()