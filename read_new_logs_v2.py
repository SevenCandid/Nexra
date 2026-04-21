
import os

def read_new_logs_v2(path, lines=200):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-16le') as f:
                content = f.readlines()
                print(f"--- {path} (Last {lines} lines) ---")
                for line in content[-lines:]:
                    # Print ALL lines for startup check, then filtered for errors
                    print(line.strip())
        except Exception as e:
            print(f"Error reading {path}: {e}")
            # Try utf-8
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.readlines()
                    print(f"--- {path} (Last {lines} lines, fallback) ---")
                    for line in content[-lines:]:
                        print(line.strip())
            except:
                pass
    else:
        print(f"File not found: {path}")

read_new_logs_v2('backend_log_new.txt', 200)
