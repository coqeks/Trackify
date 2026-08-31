import redis
import os

_redis = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

def request_cancel(task_id: str):
    _redis.set(f"cancel:{task_id}", "1", ex=3600)  # Create a key-value pair indicating a specific task_id should be cancelled

def is_cancelled(task_id: str) -> bool:
    return _redis.exists(f"cancel:{task_id}") == 1

def clear_cancel(task_id: str):
    _redis.delete(f"cancel:{task_id}")

class CancelException(Exception):
    pass