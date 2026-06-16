
import os
def read_log(path):
    if os.path.exists(path):
        with open(path, 'r') as f:
            print(f"--- {path} ---")
            print(f.read())
    else:
        print("Log not found")

read_log('enum_test_log.txt')
