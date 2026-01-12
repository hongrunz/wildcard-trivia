"""
Supabase client setup
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Optional

# Load environment variables from .env file
load_dotenv()


def get_supabase_client() -> Optional[Client]:
    """
    Create and return a Supabase client instance.
    Reads credentials from environment variables.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables"
        )

    return create_client(supabase_url, supabase_key)
