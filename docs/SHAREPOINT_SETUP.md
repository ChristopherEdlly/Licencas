# SharePoint / Microsoft Graph setup (automatic, secure)

This document explains how to configure the app to resolve the SharePoint Excel workbook automatically (no user input, no public URLs in the front-end).

## Overview
- The SPA authenticates users with MSAL and uses delegated Graph tokens.
- The app resolves the SharePoint `siteId` and `fileId` at runtime using `window.__ENV__` values (non-secret configuration) and the Graph API.
- The front-end never stores or displays public `webUrl` links.

## Required environment variables (set by your deploy pipeline)
Add these keys to the `env.config.js` generator or provisioning pipeline. These values are not secrets — they only tell the SPA where to look inside your tenant.

- `AZURE_SITE_HOSTNAME` — SharePoint hostname (e.g. `contoso.sharepoint.com`)
- `AZURE_SITE_PATH` — site relative path (e.g. `sites/HR` or `teams/HR`)
- `AZURE_FILE_RELATIVE_PATH` — file path inside the drive (e.g. `Shared Documents/Apps/Licencas/licencas.xlsx`)
- `AZURE_TABLE_NAME` — optional table name inside workbook (ex: `LicencasTabela`)

Example `env.config.js` snippet (deploy-time generated):

```javascript
window.__ENV__ = window.__ENV__ || {};
Object.assign(window.__ENV__, {
  "AZURE_CLIENT_ID": "<client-id>",
  "AZURE_TENANT_ID": "<tenant-id>",
  "AZURE_REDIRECT_URI": "https://your-app.example.com",
  "AZURE_AUTHORITY": "https://login.microsoftonline.com/<tenant-id>",
  "AZURE_SCOPES": ["User.Read", "Files.Read"],

  // Automatic SharePoint resolution (fill with actual values during deploy)
  "AZURE_SITE_HOSTNAME": "contoso.sharepoint.com",
  "AZURE_SITE_PATH": "sites/HR",
  "AZURE_FILE_RELATIVE_PATH": "Shared Documents/Apps/Licencas/licencas.xlsx",
  "AZURE_TABLE_NAME": "LicencasTabela"
});
```

## How the SPA resolves the workbook (runtime)
1. Use `GET /sites/{hostname}:/{sitePath}` to get `siteId`.
2. Use `GET /sites/{siteId}/drive/root:/{relativePathToFile}` to get the drive item and `itemId` (fileId).
3. Use Graph workbook tables endpoints with `siteId` and `fileId` to list/read/update rows.

Notes:
- All calls use the *delegated* token of the signed-in user.
- The SPA does not return nor expose `webUrl` or any share links to the UI.
- If the environment variables are not present, the app falls back to the legacy manual field (which is disabled when env is configured).

## Permissions and scopes
- Prefer `User.Read` for sign-in and `Files.Read` for read operations.
- Request `Files.ReadWrite` *only* at the moment of writing (incremental consent flow).
- If you need to access cross-site items or require broader site discovery, tests may show `Sites.Read.All` is required (admin consent).

## Security recommendations
- Disable anonymous sharing in the SharePoint library.
- Grant edit permissions only to the intended users or groups.
- Use Azure AD groups to manage editors and readers.
- Do not place secrets or tokens in `env.config.js`.

## Troubleshooting
- If the SPA cannot resolve the file, check that the values in the deploy-time env are correct and that the signed-in user has at least read access to the file.
- If Graph returns 403 on write, the user lacks edit permission — adjust SharePoint ACLs or use group membership.

---

If you want, I can also generate a ready-to-copy `env.config.deploy.template.js` for your CI/CD pipeline.
