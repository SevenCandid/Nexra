import os

def read_file(path):
    try:
        with open(path, 'rb') as f:
            data = f.read()
            # Try to detect if it's UTF-16
            if data.startswith(b'\xff\xfe'):
                return data.decode('utf-16-le')
            elif data.startswith(b'\xfe\xff'):
                return data.decode('utf-16-be')
            else:
                return data.decode('utf-8')
    except Exception:
        return data.decode('cp1252')

content = read_file('org_check_results.txt')
if content:
    lines = content.splitlines()
    print(f"TOTAL_LINES: {len(lines)}")
    for line in lines:
        if line.strip():
            print(f"LINE: {line.strip()}")
else:
    print("Could not read file.")
