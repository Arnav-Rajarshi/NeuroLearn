from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional

from database import get_db
from models import User
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# -------------------------
# Pydantic Schemas
# -------------------------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    uid: int
<<<<<<< HEAD
    name: str
    email: str
    acc_status: str
    is_admin: str
=======
    name: Optional[str]
    email: str
    acc_status: str
>>>>>>> Module-RoadmapEngine
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class LoginRequest(BaseModel):
<<<<<<< HEAD
    email: str
    password: str


class PremiumStatusResponse(BaseModel):
    premium: bool
    acc_status: str


# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
=======
    email: EmailStr
    password: str


# -------------------------
# Helper Functions
# -------------------------

def verify_password(plain_password: str, hashed_password: str):
>>>>>>> Module-RoadmapEngine
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception
<<<<<<< HEAD
    
    user = db.query(User).filter(User.uid == user_id).first()
=======

    user = db.query(User).filter(User.uid == int(user_id)).first()

>>>>>>> Module-RoadmapEngine
    if user is None:
        raise credentials_exception

    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
<<<<<<< HEAD
    if current_user.is_admin != "true":
=======
    
    if current_user.acc_status != "premium":
>>>>>>> Module-RoadmapEngine
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user

# -------------------------
# Endpoints
# -------------------------

@router.post("/signup", response_model=Token)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
<<<<<<< HEAD
=======

>>>>>>> Module-RoadmapEngine
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
<<<<<<< HEAD
        acc_status="free",
        is_admin="false"
=======
        acc_status="free"
>>>>>>> Module-RoadmapEngine
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
<<<<<<< HEAD
    
    # Generate token
    access_token = create_access_token(data={"sub": new_user.uid})
    
=======

    access_token = create_access_token(data={"sub": str(new_user.uid)})

>>>>>>> Module-RoadmapEngine
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
<<<<<<< HEAD
    # Check for admin login
    if login_data.email == ADMIN_USERNAME and login_data.password == ADMIN_PASSWORD:
        # Find or create admin user
        admin_user = db.query(User).filter(User.email == ADMIN_USERNAME).first()
        if not admin_user:
            admin_user = User(
                name="Admin",
                email=ADMIN_USERNAME,
                password_hash=get_password_hash(ADMIN_PASSWORD),
                acc_status="premium",
                is_admin="true"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        access_token = create_access_token(data={"sub": admin_user.uid})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": admin_user
        }
    
    # Regular user login by email
    user = db.query(User).filter(User.email == login_data.email).first()
=======

    user = db.query(User).filter(User.email == login_data.email).first()

>>>>>>> Module-RoadmapEngine
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
<<<<<<< HEAD
    
    access_token = create_access_token(data={"sub": user.uid})
    
=======

    access_token = create_access_token(data={"sub": str(user.uid)})

>>>>>>> Module-RoadmapEngine
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
<<<<<<< HEAD
    return current_user


@router.get("/premium-status", response_model=PremiumStatusResponse)
def get_premium_status(current_user: User = Depends(get_current_user)):
    """Get current user's premium status"""
    return PremiumStatusResponse(
        premium=current_user.acc_status == "premium",
        acc_status=current_user.acc_status
    )
=======
    return current_user
>>>>>>> Module-RoadmapEngine
