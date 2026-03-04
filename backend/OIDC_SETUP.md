# OpenID Connect Provider Setup

To enable OpenID Connect login, you need to add your OIDC provider's details to the `oidc_settings` table in the database.

## Example: Adding Google as an OIDC Provider

You will need to create OAuth 2.0 credentials in the Google Cloud Console to get a client ID and client secret.
When creating the credentials, make sure to add the following authorized redirect URI:

```
http://localhost:8000/auth/google
```

Once you have your client ID and secret, you can insert them into the database.

### SQL INSERT Statement

You can use a database browser or the command line to execute the following SQL statement on your `solaris.db` database:

```sql
INSERT INTO oidc_settings (provider_name, client_id, client_secret, discovery_url, is_active)
VALUES (
  'google',
  'YOUR_GOOGLE_CLIENT_ID',
  'YOUR_GOOGLE_CLIENT_SECRET',
  'https://accounts.google.com/.well-known/openid-configuration',
  1
);
```

Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with the credentials you obtained from Google.

After adding the provider, restart the backend application. The new provider will be available at the `/auth/login/google` endpoint.
