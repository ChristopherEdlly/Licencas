/**
 * Configuração pública usada pelo dashboard estático.
 * Atualize estes valores antes de publicar no GitHub Pages.
 */
window.__ENV__ = window.__ENV__ || {};
Object.assign(window.__ENV__, {
  AZURE_CLIENT_ID: "ed17eba6-3f5d-42bf-866e-01fc039865d6",
  AZURE_TENANT_ID: "85795021-1de9-44cf-9dd4-21c3cfce52c5",
  // Para desenvolvimento local, use window.location.origin
  // Para produção, use o domínio do GitHub Pages
  AZURE_REDIRECT_URI: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') || window.location.origin.includes('github.dev')
    ? window.location.origin 
    : "https://christopheredlly.github.io/Licencas",
  AZURE_AUTHORITY: "https://login.microsoftonline.com/85795021-1de9-44cf-9dd4-21c3cfce52c5",
  AZURE_SCOPES: ["User.Read", "Files.Read.All"]
});
