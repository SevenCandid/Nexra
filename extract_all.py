import os

def extract_component(content, comp_name):
    # Find start
    search_str = f"const {comp_name} = "
    start_idx = content.find(search_str)
    if start_idx == -1:
        return None, content
        
    brace_idx = content.find('{', start_idx)
    if brace_idx == -1:
        return None, content
        
    braces = 0
    in_template = False
    in_string = False
    in_single_string = False
    
    for i in range(brace_idx, len(content)):
        # Handle string literals to avoid counting braces inside them
        if content[i] == '`' and content[i-1] != '\\':
            in_template = not in_template
        elif content[i] == '"' and content[i-1] != '\\' and not in_template and not in_single_string:
            in_string = not in_string
        elif content[i] == "'" and content[i-1] != '\\' and not in_template and not in_string:
            in_single_string = not in_single_string
            
        if not in_template and not in_string and not in_single_string:
            if content[i] == '{':
                braces += 1
            elif content[i] == '}':
                braces -= 1
                
        if braces == 0 and not in_template and not in_string and not in_single_string:
            # We reached the closing brace of the component.
            # Look for the trailing semicolon.
            end_idx = i
            while end_idx + 1 < len(content) and content[end_idx + 1] in [' ', '\t', '\n', '\r']:
                end_idx += 1
            if end_idx + 1 < len(content) and content[end_idx + 1] == ';':
                end_idx += 1
                
            comp_code = content[start_idx:end_idx+1]
            new_content = content[:start_idx] + content[end_idx+1:]
            return comp_code, new_content

    return None, content


with open('nexra-dashboard/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Pages
pages = [
    'BusinessOverviewPage',
    'AdminBugsPage',
    'AdminUsersPage',
    'SystemHealthPage',
    'AuditLogPage',
    'AnnouncementsPage',
    'StaffManagementPage',
    'PlatformManagementPage',
    'AdminApprovalPage',
    'AdminLoginPage',
    'AdminRegisterPage',
    'AdminTransactionsPage'
]

os.makedirs('nexra-dashboard/src/pages', exist_ok=True)
page_imports = """import { html, useState, useEffect, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton, TrendChart, ConfirmModal } from '../components/ui/index.js';
import { useToast, useAuth } from '../context/index.js';
import { AdminStatCard, SystemHealthWidget, PlatformRow, DateFilterDropdown } from '../components/layout/index.js';
"""

for page in pages:
    comp_code, content = extract_component(content, page)
    if comp_code:
        # replace const with export const
        comp_code = comp_code.replace(f"const {page} =", f"export const {page} =")
        with open(f'nexra-dashboard/src/pages/{page}.js', 'w', encoding='utf-8') as f:
            f.write(page_imports + "\n" + comp_code)

# 2. Contexts
contexts = [
    'AuthProvider',
    'ToastProvider'
]
os.makedirs('nexra-dashboard/src/context', exist_ok=True)
context_imports = """import { html, useState, useEffect, createContext, useContext, useRef, useMemo, useCallback } from '../utils/htm.js';
import { Toast } from '../components/ui/index.js';
"""
# Note: apiClient, useAuth, useToast are special, let's extract them manually or leave them in a dedicated context file.

# Let's extract the layouts
layouts = [
    'AdminSidebar',
    'MobileHeader',
    'BottomNav',
    'AdminMobileMenuDrawer',
    'AdminStatCard',
    'SystemHealthWidget',
    'PlatformRow',
    'DateFilterDropdown',
    'AuthLayout'
]

os.makedirs('nexra-dashboard/src/components/layout', exist_ok=True)
layout_imports = """import { html, useState, useEffect, useRef, useMemo, useCallback } from '../../utils/htm.js';
import { Icon, Button, Badge, Card, Modal, Skeleton } from '../ui/index.js';
import { useAuth } from '../../context/index.js';
"""

layout_exports = ""
for layout in layouts:
    comp_code, content = extract_component(content, layout)
    if comp_code:
        comp_code = comp_code.replace(f"const {layout} =", f"export const {layout} =")
        with open(f'nexra-dashboard/src/components/layout/{layout}.js', 'w', encoding='utf-8') as f:
            f.write(layout_imports + "\n" + comp_code)
        layout_exports += f"export {{ {layout} }} from './{layout}.js';\n"

with open('nexra-dashboard/src/components/layout/index.js', 'a', encoding='utf-8') as f:
    f.write(layout_exports)

# Finally AdminApp
comp_code, content = extract_component(content, 'AdminApp')
if comp_code:
    comp_code = comp_code.replace(f"const AdminApp =", f"export const AdminApp =")
    app_imports = """import { html, useState, useEffect } from '../utils/htm.js';
import { useAuth, useToast } from '../context/index.js';
import { CommandPalette } from './CommandPalette.js';
import { AdminSidebar, MobileHeader, BottomNav } from './index.js';
"""
    # Import all pages
    for page in pages:
        app_imports += f"import {{ {page} }} from '../../pages/{page}.js';\n"
        
    with open('nexra-dashboard/src/components/layout/AdminApp.js', 'w', encoding='utf-8') as f:
        f.write(app_imports + "\n" + comp_code)

print("Extraction script finished!")
