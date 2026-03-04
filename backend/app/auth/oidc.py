from authlib.integrations.starlette_client import OAuth
from app.core.config import settings

oauth = OAuth()

# This will be configured dynamically from the database later
# For now, we can add a placeholder if we want to test with a specific provider
# Example for Google:
# oauth.register(
#     name='google',
#     server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
#     client_id=settings.OIDC_CLIENT_ID,
#     client_secret=settings.OIDC_CLIENT_SECRET,
#     client_kwargs={
#         'scope': 'openid email profile'
#     }
# )
