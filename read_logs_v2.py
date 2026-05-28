
import os

def read_utf16_file(path, lines=50):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-16le') as f:
            content = f.readlines()
            print(f"--- {path} (Last {lines} lines) ---")
            for line in content[-lines:]:
                print(line.strip())
    else:
        print(f"File not found: {path}")

read_utf16_file('backend_log.txt', 100)
read_utf16_file('full_traceback.txt', 100)
