from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import places, ai

app = FastAPI(
    title="SpotPulse AI API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://spotplus-b0kf5rhxc-datascientist-dev.vercel.app/",
        
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(places.router, prefix="/api/places", tags=["places"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])


@app.get("/")
def root():
    return {
        "message": "SpotPulse AI API is running",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "spotpulse-ai"}
