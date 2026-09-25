from pydantic import BaseModel, Field

class VenueSearch(BaseModel):
    query: str = Field(min_length=1)

class VenueInsight(BaseModel):
    summary: str
    strengths: list[str]
    opportunities: list[str]
    recommendation: str

class ChatRequest(BaseModel):
    message: str
    venue_name: str = "Demo Venue"
