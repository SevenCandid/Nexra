import re
import os

with open('nexra-dashboard/admin3.js', 'r', encoding='utf-8') as f:
    content = f.read()

contexts = [
    'AuthContext',
    'AuthProvider',
    'useAuth',
    'ToastContext',
    'ToastProvider',
    'useToast'
]

os.makedirs('nexra-dashboard/src/context', exist_ok=True)

imports = """import { html, useState, useEffect, createContext, useContext } from '../utils/htm.js';
import apiClient from '../api/client.js';
import { Toast } from '../components/ui/index.js';
"""

# Context extraction is trickier, they are not all "const AuthContext = () => {}".
# They are like:
# const AuthContext = createContext(null);
# const AuthProvider = ({ children }) => { ... };
# const useAuth = () => useContext(AuthContext);

auth_code = ""
toast_code = ""

for comp in ['AuthContext', 'AuthProvider', 'useAuth', 'ToastContext', 'ToastProvider', 'useToast']:
    pattern = rf"(const {comp} =.*?(?:;\n|;\n}};\n|;\n}};\n\n|;\n\n))"
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        pattern = rf"(const {comp} =.*?;\n)"
        match = re.search(pattern, content, re.DOTALL)
        
    # Manual regex because the components are nested and variable. 
    # Let's just do it manually with file replacing if this script is too flaky.

