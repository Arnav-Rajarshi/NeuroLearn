from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from auth import router as auth_router
from progress import router as progress_router
from payments import router as payments_router
from admin import router as admin_router
from courses import router as courses_router
from roadmap import router as roadmap_router
from routes.ai_learning import router as ai_learning_router

import os
import uvicorn

# Initialize FastAPI app
app = FastAPI(
    title="NeuroLearn API",
    description="Backend API for NeuroLearn learning platform",
    version="1.0.0"
)

# CORS configuration
origins = [
    "https://neurolearn-production.up.railway.app",
    "https://neurolearn-wi5m.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(progress_router)
app.include_router(payments_router)
app.include_router(admin_router)
app.include_router(courses_router)
app.include_router(roadmap_router)
app.include_router(ai_learning_router)


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Welcome to NeuroLearn API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/auth",
            "progress": "/progress",
            "payments": "/payments",
            "admin": "/admin",
            "courses": "/courses",
            "roadmap": "/roadmap",
            "ai_learning": "/ai-learning"
        }
    }


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Initialize database on startup
@app.on_event("startup")
def startup():
    #init_db()
    print("NeuroLearn API started successfully")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)