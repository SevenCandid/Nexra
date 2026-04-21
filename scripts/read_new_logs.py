
import os

def read_utf16_file(path, lines=50):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-16le') as f:
                content = f.readlines()
                print(f"--- {path} (Last {lines} lines) ---")
                for line in content[-lines:]:
                    print(line.strip())
        except Exception as e:
            print(f"Error reading {path}: {e}")
    else:
        print(f"File not found: {path}")

read_utf16_file('backend_log_new.txt', 100)
