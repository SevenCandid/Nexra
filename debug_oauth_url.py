
import urllib.parse

GOOGLE_CLIENT_ID = "918114645563-h43irtcft5bvuaebqn7nnu9tuujslf7j.apps.googleusercontent.com"
redirect_uri = "http://localhost:8000/api/v1/auth/google/callback"

params = {
    "client_id": GOOGLE_CLIENT_ID,
    "response_type": "code",
    "scope": "openid email profile",
    "redirect_uri": redirect_uri,
    "access_type": "offline",
    "prompt": "consent"
}

auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
print(f"Generated URL: {auth_url}")
