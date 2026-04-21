import sys

def read_utf16_le(path):
    try:
        with open(path, 'rb') as f:
            content = f.read().decode('utf-16')
            return content
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    print(read_utf16_le('org_check_results.txt'))
