import os

def read_file(path):
    for encoding in ['utf-8', 'utf-16', 'utf-16-le', 'cp1252']:
        try:
            with open(path, 'rb') as f:
                data = f.read()
                return data.decode(encoding)
        except Exception:
            continue
    return None

content = read_file('full_traceback.txt')
if content:
    print(content)
else:
    print("Could not read file.")
