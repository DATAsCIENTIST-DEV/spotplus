from app.config import settings

def generate_insight(payload: dict):
    name = payload.get("name", "This venue")
    return {
        "summary": f"{name} shows a strong opportunity to improve peak-hour conversion and repeat visits.",
        "strengths": ["Clear peak-hour demand pattern", "Good opportunity for targeted offers", "Useful weekly operating rhythm"],
        "opportunities": ["Test off-peak promotions", "Improve staffing around high-demand windows", "Create repeat-visit incentives"],
        "recommendation": "Start with one weekday and one weekend experiment, then compare conversion and retention."
    }

def chat_with_venue(message: str, venue_name: str):
    return {
        "answer": f"For {venue_name}, consider testing your idea during the highest-demand hours first. Your question was: {message}",
        "provider": settings.ai_provider
    }
