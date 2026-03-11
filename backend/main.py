from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import init_db

from core.auth import router as auth_router
from progress import router as progress_router
from payments import router as payments_router
from admin import router as admin_router
from courses import router as courses_router

from routers.dashboard import router as dashboard_router
from routers.roadmap import router as roadmap_router


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
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(progress_router)
app.include_router(payments_router)
app.include_router(admin_router)
app.include_router(courses_router)

app.include_router(dashboard_router)
app.include_router(roadmap_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to NeuroLearn API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
def startup():
    init_db()
    print("NeuroLearn API started successfully")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)