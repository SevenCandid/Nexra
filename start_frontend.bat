@echo off
echo Starting NEXRA Dashboard...
echo Port: 3000
cd nexra-dashboard
python -m http.server 3000
