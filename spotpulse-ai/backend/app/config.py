from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    ai_model_name: str = "google/gemini-2.5-flash"

    apify_api_token: Optional[str] = None
    apify_google_maps_actor: str = "compass/crawler-google-places"

    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()