import os
import re

dashboard_dir = 'nexra-dashboard/src'
admin_file = 'nexra-dashboard/admin.js'
missing_imports = []

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    imports = re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', content)
    imports.extend(re.findall(r'import\s+[\'"]([^\'"]+)[\'"]', content))
    
    for imp in imports:
        if imp.startswith('.'):
            current_dir = os.path.dirname(filepath)
            target_path = os.path.normpath(os.path.join(current_dir, imp))
            if not os.path.exists(target_path):
                missing_imports.append(f'{filepath}: {imp} -> {target_path}')

# Check dashboard src files
for root, _, files in os.walk(dashboard_dir):
    for file in files:
        if file.endswith('.js'):
            filepath = os.path.join(root, file)
            check_file(filepath)

# Check admin file
if os.path.exists(admin_file):
    check_file(admin_file)

if missing_imports:
    print('Broken imports found:')
    for mi in missing_imports:
        print(mi)
else:
    print('All relative imports are correct!')
