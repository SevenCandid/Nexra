
import os

def read_long_logs(log_file, traceback_file, lines=500):
    for path in [log_file, traceback_file]:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-16le') as f:
                    content = f.readlines()
                    print(f"\n--- {path} (Last {lines} lines) ---")
                    for line in content[-lines:]:
                        # Print only if it looks relevant to avoid too much noise
                        if "Error" in line or "Exception" in line or "Traceback" in line or "SQL" in line or "campaign" in line:
                            print(line.strip())
            except UnicodeDecodeError:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.readlines()
                    print(f"\n--- {path} (Last {lines} lines, UTF-8 fallback) ---")
                    for line in content[-lines:]:
                        if "Error" in line or "Exception" in line or "Traceback" in line or "SQL" in line or "campaign" in line:
                            print(line.strip())
        else:
            print(f"File not found: {path}")

if __name__ == "__main__":
    read_long_logs('backend_log.txt', 'full_traceback.txt')
