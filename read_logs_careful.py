
import os

def read_logs_carefully(path, lines=500):
    if os.path.exists(path):
        with open(path, 'rb') as f:
            data = f.read()
            # Try to handle potential weird encodings or null bytes
            try:
                text = data.decode('utf-16le')
            except:
                text = data.decode('utf-8', errors='ignore')
            
            log_lines = text.splitlines()
            print(f"--- {path} (Last {lines} lines) ---")
            for line in log_lines[-lines:]:
                if "ERROR" in line.upper() or "INFO:     127.0.0.1" in line or " 500 " in line or "Traceback" in line:
                    print(line)

if __name__ == "__main__":
    read_logs_carefully('backend_log_new.txt')
