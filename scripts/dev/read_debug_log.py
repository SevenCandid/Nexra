
import os

def read_exact_log(path, lines=500):
    if os.path.exists(path):
        try:
            with open(path, 'rb') as f:
                data = f.read()
                try:
                    text = data.decode('utf-16le')
                except:
                    text = data.decode('utf-8', errors='ignore')
                
                log_lines = text.splitlines()
                print(f"--- {path} (Last {lines} lines) ---")
                
                # Filter for relevant lines
                relevant = []
                for idx, line in enumerate(log_lines):
                    if " 500 " in line or "ERROR" in line.upper() or "TRACEBACK" in line.upper() or "EXCEPTION" in line.upper() or "POST /API/V1/CAMPAIGNS" in line.upper():
                        # Capture context around the error
                        start = max(0, idx - 10)
                        end = min(len(log_lines), idx + 20)
                        relevant.extend(log_lines[start:end])
                
                # If no relevant lines found by filter, just show last ones
                if not relevant:
                    for line in log_lines[-lines:]:
                        print(line)
                else:
                    # Deduplicate and sort
                    unique_relevant = []
                    seen = set()
                    for line in relevant:
                        if line not in seen:
                            unique_relevant.append(line)
                            seen.add(line)
                    
                    for line in unique_relevant[-lines:]:
                        print(line)
                        
        except Exception as e:
            print(f"Error reading {path}: {e}")
    else:
        print(f"File not found: {path}")

if __name__ == "__main__":
    read_exact_log('debug_server.log')
