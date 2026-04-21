
import os

def read_logs():
    paths = ['backend_log_new.txt', 'backend_log.txt', 'full_traceback.txt']
    for path in paths:
        if os.path.exists(path):
            print(f"\n--- {path} ---")
            with open(path, 'rb') as f:
                content = f.read()
                # Try UTF-16LE then UTF-8
                try:
                    text = content.decode('utf-16le')
                except:
                    text = content.decode('utf-8', errors='ignore')
                
                lines = text.splitlines()
                # Print last 50 lines that contain "Error" or "Exception" or are the very last ones
                for line in lines[-100:]:
                    print(line)
        else:
            print(f"File not found: {path}")

if __name__ == "__main__":
    read_logs()
