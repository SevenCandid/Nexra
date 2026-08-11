import re
import os

with open('nexra-dashboard/admin2.js', 'r', encoding='utf-8') as f:
    content = f.read()

# UI components to extract
ui_components = [
    'Icon',
    'Button',
    'Badge',
    'Card',
    'Modal',
    'TrendChart',
    'Toast'
]

os.makedirs('nexra-dashboard/src/components/ui', exist_ok=True)

imports = """import { html, useState, useEffect, useRef, useMemo } from '../../utils/htm.js';
"""

index_exports = "export { Skeleton } from './Skeleton.js';\n"
index_exports += "export { ConfirmModal } from './ConfirmModal.js';\n"

for comp in ui_components:
    # Regex to find standard component definition
    pattern = rf"(const {comp} =.*?;\n}};)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        comp_code = match.group(1)
        content = content.replace(comp_code, "")
        
        comp_code = comp_code.replace(f"const {comp} = ", f"export const {comp} = ")
        
        file_content = imports + "\n" + comp_code
        with open(f'nexra-dashboard/src/components/ui/{comp}.js', 'w', encoding='utf-8') as f:
            f.write(file_content)
        
        index_exports += f"export {{ {comp} }} from './{comp}.js';\n"

with open('nexra-dashboard/src/components/ui/index.js', 'w', encoding='utf-8') as f:
    f.write(index_exports)

# Add imports to admin2.js
content = "import { " + ", ".join(ui_components) + " } from './src/components/ui/index.js';\n" + content

with open('nexra-dashboard/admin3.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("UI extraction complete. Check admin3.js")
