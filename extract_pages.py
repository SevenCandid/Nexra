import re
import os

with open('nexra-dashboard/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to extract the pages.
pages = [
    'BusinessOverviewPage',
    'AdminBugsPage',
    'AdminUsersPage',
    'SystemHealthPage',
    'AuditLogPage',
    'AnnouncementsPage',
    'StaffManagementPage',
    'PlatformManagementPage',
    'GlobalSearchPage',
    'AdminApprovalPage',
    'AdminLoginPage',
    'AdminRegisterPage',
]

os.makedirs('nexra-dashboard/src/pages', exist_ok=True)

imports = """import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { useToast, useAuth } from '../context/index.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart } from '../components/ui/index.js';
"""

for page in pages:
    pattern = rf"(const {page} =.*?;\n}};)"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        page_code = match.group(1)
        # replace in content
        content = content.replace(page_code, f"import {{ {page} }} from './src/pages/{page}.js';")
        
        # change export
        page_code = page_code.replace(f"const {page} = ", f"export const {page} = ")
        
        file_content = imports + "\n" + page_code
        with open(f'nexra-dashboard/src/pages/{page}.js', 'w', encoding='utf-8') as f:
            f.write(file_content)

with open('nexra-dashboard/admin2.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Extraction complete. Check admin2.js")
