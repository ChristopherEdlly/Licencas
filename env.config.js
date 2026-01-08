/**
 * Azure AD Public Client Configuration
 *
 * ✅ SEGURO PARA COMMITAR: Este arquivo contém apenas CLIENT_ID público.
 *
 * Segurança real vem de:
 * - Redirect URI whitelist configurado no Azure AD
 * - Autenticação obrigatória do usuário
 * - Scopes limitados (apenas arquivos do usuário logado)
 *
 * Não contém CLIENT_SECRET (app usa MSAL Public Client)
 */
window.__ENV__ = window.__ENV__ || {};
Object.assign(window.__ENV__, {
  "AZURE_CLIENT_ID": "ed17eba6-3f5d-42bf-866e-01fc039865d6",
  "AZURE_TENANT_ID": "85795021-1de9-44cf-9dd4-21c3cfce52c5",
  "AZURE_REDIRECT_URI": "https://christopheredlly.github.io/Licencas",
  "AZURE_AUTHORITY": "https://login.microsoftonline.com/85795021-1de9-44cf-9dd4-21c3cfce52c5",
  "AZURE_SCOPES": [
    "User.Read",
    "Files.Read"
  ]
  ,
  // Optional central configuration to allow automatic, non-public resolution of the SharePoint file
  "AZURE_SITE_HOSTNAME": "sefazsegovbr-my.sharepoint.com",
  "AZURE_SITE_PATH": "personal/christopher_caldas_fazenda_se_gov_br",
  "AZURE_FILE_RELATIVE_PATH": "Documents/NOTIFICACAO DE LICENÇA PRÊMIO-3 VERSÃO ATUAL-3.xls", // guessed common OneDrive folder (confirm if in root or another folder)
  "AZURE_TABLE_NAME": "BD_LPREMIO",


});