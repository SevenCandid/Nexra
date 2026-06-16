import sys
import os

print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"sys.path: {sys.path}")

try:
    import app.workers.sms_worker
    print("SUCCESS: Imported app.workers.sms_worker")
    from app.workers.sms_worker import _async_process_sms
    print("SUCCESS: Imported _async_process_sms")
except ImportError as e:
    print(f"FAILURE: Could not import app.workers.sms_worker: {e}")
except Exception as e:
    print(f"ERROR: {e}")
