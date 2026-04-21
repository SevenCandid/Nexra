
import urllib.parse

from app.core.config import settings

def get_oauth_url():
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    if "localhost" not in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://")
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": redirect_uri,
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return auth_url

if __name__ == "__main__":
    url = get_oauth_url()
    print(f"Generated URL: {url}")
    # Verify that redirect_uri is encoded
    expected_part = "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Fauth%2Fgoogle%2Fcallback"
    if expected_part in url:
        print("VERIFICATION SUCCESS: redirect_uri is correctly encoded.")
    else:
        print("VERIFICATION FAILURE: redirect_uri is NOT correctly encoded.")
