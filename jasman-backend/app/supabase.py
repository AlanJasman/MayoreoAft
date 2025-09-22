# app/supabase.py

import os
from dotenv import load_dotenv
from supabase import create_client

# ✅ Cargar variables desde .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
