
import os

def extract_full_traceback(path, output_path):
    if os.path.exists(path):
        try:
            with open(path, 'rb') as f:
                data = f.read()
                try:
                    text = data.decode('utf-16le')
                except:
                    text = data.decode('utf-8', errors='ignore')
                
                # Find the last "Traceback"
                start_idx = text.rfind("Traceback")
                if start_idx != -1:
                    # Capture everything from there to the end
                    traceback_text = text[start_idx:]
                    with open(output_path, 'w', encoding='utf-8') as out:
                        out.write(traceback_text)
                    print(f"Traceback extracted to {output_path}")
                else:
                    print("No Traceback found in log.")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print(f"File not found: {path}")

if __name__ == "__main__":
    extract_full_traceback('debug_server.log', 'last_traceback.txt')
