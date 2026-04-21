
import os

def read_utf16_file(path):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-16le') as f:
            print(f"--- {path} ---")
            print(f.read()[-2000:]) # Just the last 2000 chars
    else:
        print(f"File not found: {path}")

read_utf16_file('backend_log.txt')
read_utf16_file('full_traceback.txt')
