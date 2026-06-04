import sys
from rq import Worker, Queue, Connection
from app.core.redis import redis_client

# Define the queues this worker will listen to
listen = ['sms_high_priority', 'sms_batch', 'failed']

def run_worker():
    if redis_client is None:
        raise RuntimeError("Redis is not configured. Set REDIS_URL or REDIS_HOST/REDIS_PORT before starting the worker.")
    with Connection(redis_client):
        worker = Worker(map(Queue, listen))
        worker.work()

if __name__ == '__main__':
    print("NEXRA Background Worker starting...")
    run_worker()
