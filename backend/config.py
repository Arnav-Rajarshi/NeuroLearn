import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./neurolearn.db")

# Razorpay
RAZORPAY_KEY = os.getenv("RAZORPAY_KEY", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")

# JWT Settings
SECRET_KEY = os.getenv("SECRET_KEY", "neurolearn-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Admin credentials
ADMIN_USERNAME = "resurgence"
ADMIN_PASSWORD = "1234567890"

# Payment amount in paise (₹49 = 4900 paise)
PREMIUM_AMOUNT = 4900
PREMIUM_CURRENCY = "INR"
