# ─── NeuroLearn · Performance Dashboard · FastAPI Application ─────────────────
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_pool, close_pool
from .routers import dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - manage database connections."""
    # Startup
    await init_pool()
    yield
    # Shutdown
    await close_pool()


# Create FastAPI application
app = FastAPI(
    title="NeuroLearn Performance Dashboard API",
    description="API for fetching learning analytics and progress metrics",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"  # Allow all in development - restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard_router)


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "NeuroLearn Performance Dashboard API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/dashboard/health",
            "progress": "/dashboard/progress/{uid}/{cid}",
            "metrics": "/dashboard/metrics/{uid}/{cid}",
            "all_data": "/dashboard/all/{uid}/{cid}",
            "user_courses": "/dashboard/user/{uid}/courses"
        }
    }


@app.get("/api/health")
async def api_health():
    """Simple health check endpoint."""
    return {"status": "ok"}
