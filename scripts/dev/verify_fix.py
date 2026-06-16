import asyncio
import logging
import sys
import os

# Add the current directory to sys.path to ensure 'app' is found as a package
sys.path.append(os.getcwd())

logging.basicConfig(level=logging.INFO)

async def test_imports():
    print("Testing imports from app.core.queue...")
    try:
        from app.core.queue import enqueue_sms, enqueue_batch
        print("SUCCESS: Imported enqueue_sms and enqueue_batch from app.core.queue")
        
        # Test calling them (mock mode)
        await enqueue_sms(1)
        await enqueue_batch(1)
        print("SUCCESS: Called enqueue functions without import errors")
        
    except ImportError as e:
        print(f"FAILURE: Import error: {e}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_imports())
