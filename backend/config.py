import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL = os.getenv("DATABASE_URL","")

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

# Payment amount in rupees (stored as rupees, converted to paise for Razorpay API)
PREMIUM_AMOUNT = 49  # ₹49 in rupees
PREMIUM_CURRENCY = "INR"

# Gemini AI Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
