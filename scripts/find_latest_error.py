
import os

def find_latest_error():
    # The user is getting 500 errors NOW.
    # The server is running and redirection is supposedly happening.
    # Let's check backend_log_new.txt first.
    path = 'backend_log_new.txt'
    if not os.path.exists(path):
        print(f"Log file {path} not found.")
        return

    print(f"Reading {path}...")
    with open(path, 'rb') as f:
        data = f.read()
        try:
            text = data.decode('utf-16le')
        except:
            text = data.decode('utf-8', errors='ignore')
        
        lines = text.splitlines()
        
        # Look for the last "ERROR" or "Traceback"
        error_lines = []
        capture = False
        for line in reversed(lines):
            if "INFO:     127.0.0.1" in line and " 500 " in line:
                # We found a 500 request. Let's capture the lines above it if they were errors.
                capture = True
            
            if capture:
                error_lines.insert(0, line)
                if "ERROR" in line or "Traceback" in line:
                    # We found the start of the error
                    pass
                if len(error_lines) > 50:
                    break
        
        if not error_lines:
            # Maybe it didn't log "ERROR" but just crashed.
            # Give me the last 100 lines.
            error_lines = lines[-100:]

        print("\n--- LATEST LOG LINES ---")
        for line in error_lines:
            print(line)

if __name__ == "__main__":
    find_latest_error()
