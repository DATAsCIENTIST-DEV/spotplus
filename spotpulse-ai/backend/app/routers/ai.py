from fastapi import APIRouter
from app.schemas import ChatRequest
from app.services.ai_service import generate_insight, chat_with_venue

router = APIRouter()

@router.post("/insights")
def insights(payload: dict):
    return generate_insight(payload)

@router.post("/chat")
def chat(payload: ChatRequest):
    return chat_with_venue(payload.message, payload.venue_name)
