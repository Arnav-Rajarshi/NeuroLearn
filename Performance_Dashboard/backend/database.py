# ─── NeuroLearn · Performance Dashboard · Database Connection ─────────────────
import os
from contextlib import asynccontextmanager
import asyncpg
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL="postgresql://neondb_owner:npg_ehNz4XPW7COM@ep-flat-union-a10rmr6m-pooler.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require"
# Connection pool
_pool: Optional[asyncpg.Pool] = None


async def init_pool():
    global _pool
    if _pool is None:
        # load_dotenv() should be called at the top of this file!
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            ssl=True  # Explicitly force SSL for Neon
        )
    return _pool


async def close_pool():
    """Close the database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    """Get the connection pool, initializing if needed."""
    global _pool
    if _pool is None:
        await init_pool()
    return _pool


@asynccontextmanager
async def get_connection():
    """Context manager to get a database connection from the pool."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn
