from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from auth import router as auth_router
from progress import router as progress_router
from payments import router as payments_router
from admin import router as admin_router

# Initialize FastAPI app
app = FastAPI(
    title="NeuroLearn API",
    description="Backend API for NeuroLearn learning platform",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://neurolearn.vercel.app",
    "*"  # Allow all origins in development
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
            "admin": "/admin"
        }
    }


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()
    print("Database initialized successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
