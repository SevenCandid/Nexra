from app.core.config import settings
import os

print(f"ENV GOOGLE_REDIRECT_URI: {os.getenv('GOOGLE_REDIRECT_URI')}")
print(f"SETTINGS GOOGLE_REDIRECT_URI: {settings.GOOGLE_REDIRECT_URI}")
print(f"SETTINGS GOOGLE_CLIENT_ID: {settings.GOOGLE_CLIENT_ID[:10] if settings.GOOGLE_CLIENT_ID else 'None'}...")
