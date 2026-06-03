from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

_client: AsyncIOMotorClient = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_url)
    return _client


def get_db():
    client = get_client()
    return client[settings.mongodb_db_name]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None
