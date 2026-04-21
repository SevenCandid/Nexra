
import os

def read_latest_logs(log_file, traceback_file, lines=100):
    for path in [log_file, traceback_file]:
        if os.path.exists(path):
            try:
                # Try UTF-16LE first
                with open(path, 'r', encoding='utf-16le') as f:
                    content = f.readlines()
                    print(f"\n--- {path} (Last {lines} lines) ---")
                    for line in content[-lines:]:
                        print(line.strip())
            except UnicodeDecodeError:
                # Fallback to UTF-8
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.readlines()
                    print(f"\n--- {path} (Last {lines} lines, UTF-8 fallback) ---")
                    for line in content[-lines:]:
                        print(line.strip())
        else:
            print(f"File not found: {path}")

if __name__ == "__main__":
    read_latest_logs('backend_log.txt', 'full_traceback.txt')
