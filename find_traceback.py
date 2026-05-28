
import os

def find_last_traceback(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
        
    with open(path, 'r', encoding='utf-16le') as f:
        lines = f.readlines()
        
    # Find the last "Traceback" or "Error"
    relevant_lines = []
    for line in reversed(lines):
        relevant_lines.insert(0, line.strip())
        if "Traceback (most recent call last):" in line:
            break
        if len(relevant_lines) > 100:
            break
            
    print(f"--- {path} (Last Traceback) ---")
    for line in relevant_lines:
        print(line)

find_last_traceback('full_traceback.txt')
