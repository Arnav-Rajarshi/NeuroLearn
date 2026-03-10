# ─── NeuroLearn · Performance Dashboard · Database Connection ─────────────────
import os
from contextlib import asynccontextmanager
import asyncpg
from typing import Optional

DATABASE_URL = os.environ.get("DATABASE_URL")

# Connection pool
_pool: Optional[asyncpg.Pool] = None


async def init_pool():
    """Initialize the database connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            ssl="require"
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
