from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from memory_api import router as memory_router


app = FastAPI(
    title="No Limits API",
    description="Backend API for the No Limits cognitive support platform",
    version="1.0.0",
)


# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────

app.include_router(memory_router)


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "No Limits API",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }
