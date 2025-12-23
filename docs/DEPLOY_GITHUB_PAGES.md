# Deploy no GitHub Pages: Gerenciando env.config.js

> **Resposta rápida:** ✅ **PODE commitar** o `env.config.js` - os valores não são secretos

## 🔐 Por Que É Seguro Commitar?

### O Que São Client IDs e Tenant IDs?

```javascript
"AZURE_CLIENT_ID": "ed17eba6-3f5d-42bf-866e-01fc039865d6"  // 👈 É como uma "chave pública"
"AZURE_TENANT_ID": "85795021-1de9-44cf-9dd4-21c3cfce52c5"  // 👈 Identifica sua organização
```

**Analogia:**
- `CLIENT_ID` = Número de telefone de uma empresa (público, qualquer um pode saber)
- `CLIENT_SECRET` = Senha do sistema (privado, NÃO deve vazar) **← Você NÃO tem isso!**

### Como a Segurança Funciona?

A segurança **NÃO** vem de esconder o CLIENT_ID, mas sim de:

#### 1. **Redirect URI Whitelist** (Configurado no Azure AD)
```
✅ APENAS estas URLs podem usar seu app:
   - https://christopheredlly.github.io/Licencas
   - http://localhost:3000

❌ Se alguém tentar usar em outro site:
   - https://siteMalicioso.com
   → Azure AD REJEITA automaticamente
```

#### 2. **Consentimento do Usuário**
```
Mesmo com CLIENT_ID correto:
1. Usuário precisa fazer LOGIN com conta Microsoft
2. Usuário precisa AUTORIZAR o app
3. Token de acesso é temporário (1 hora)
4. Token só dá acesso aos ARQUIVOS DO USUÁRIO LOGADO
```

#### 3. **Scopes Limitados**
```javascript
"AZURE_SCOPES": ["User.Read", "Files.Read", "Files.ReadWrite"]

❌ NÃO pode:
   - Ler emails de outros usuários
   - Acessar arquivos de outros usuários
   - Fazer operações de admin
   - Nada além dos arquivos do próprio usuário
```

---

## ✅ Decisão: Commitar ou Não?

### ✅ PODE COMMITAR (Recomendado para seu caso):

```javascript
// env.config.js - SEGURO para commitar
window.__ENV__ = {
    // Valores públicos (não são secrets)
    "AZURE_CLIENT_ID": "ed17eba6-3f5d-42bf-866e-01fc039865d6",
    "AZURE_TENANT_ID": "85795021-1de9-44cf-9dd4-21c3cfce52c5",
    "AZURE_REDIRECT_URI": "https://christopheredlly.github.io/Licencas",
    "AZURE_SCOPES": ["User.Read", "Files.Read"],

    // Configurações não sensíveis
    "AZURE_SITE_HOSTNAME": "sefazsegovbr-my.sharepoint.com",
    "AZURE_FILE_RELATIVE_PATH": "Documents/arquivo.xls",
    "AZURE_TABLE_NAME": "BD_LPREMIO"
};
```

**Por quê?**
- ✅ Simples (sem build step)
- ✅ Funciona imediatamente após push
- ✅ Todos na organização podem usar
- ✅ Azure AD protege via Redirect URI

### ❌ NÃO COMMITAR (Apenas se tivesse):

```javascript
// ❌ NUNCA commitar se tivesse:
{
    "CLIENT_SECRET": "xyz123...",     // Senha do app
    "ACCESS_TOKEN": "eyJ0eXAi...",    // Token de acesso
    "REFRESH_TOKEN": "abc456...",     // Token de refresh
    "PRIVATE_KEY": "-----BEGIN..."    // Chaves privadas
}
```

**Você NÃO tem nenhum desses** porque usa **MSAL Public Client** (SPA).

---

## 🚀 Como Fazer o Deploy

### Passo a Passo

```bash
# 1. Verificar arquivo env.config.js
cat env.config.js

# 2. Remover do .gitignore (se estiver lá)
# Editar .gitignore e REMOVER a linha:
# env.config.js

# 3. Adicionar ao Git
git add env.config.js
git add .gitignore

# 4. Commitar
git commit -m "Add Azure AD configuration for GitHub Pages"

# 5. Push
git push origin main

# 6. GitHub Pages vai publicar automaticamente
# Aguardar ~1-2 minutos

# 7. Acessar site publicado
# https://christopheredlly.github.io/Licencas
```

### Verificar Deploy

1. Vá para: `https://christopheredlly.github.io/Licencas`
2. Abra DevTools (F12) → Console
3. Digite: `console.log(window.__ENV__)`
4. Deve mostrar suas configurações

---

## 🔒 Checklist de Segurança no Azure AD

Antes de fazer deploy, **CONFIRME** estas configurações no [Azure Portal](https://portal.azure.com):

### 1. App Registration → Authentication

```
Platform: Single-page application

Redirect URIs:
✅ https://christopheredlly.github.io/Licencas
✅ http://localhost:3000 (para desenvolvimento)

Implicit grant and hybrid flows:
✅ Access tokens (used for implicit flows)
✅ ID tokens (used for implicit and hybrid flows)
```

### 2. App Registration → API Permissions

```
Microsoft Graph:
✅ User.Read (Delegated) - Sign in and read user profile
✅ Files.Read (Delegated) - Read user files
✅ Files.ReadWrite (Delegated) - Read and write user files

Status:
✅ Granted for [Sua Organização]
```

### 3. App Registration → Overview

```
Application (client) ID: ed17eba6-3f5d-42bf-866e-01fc039865d6 ✅
Directory (tenant) ID: 85795021-1de9-44cf-9dd4-21c3cfce52c5 ✅

Supported account types:
- Accounts in this organizational directory only
```

---

## 🧪 Testando Após Deploy

### Teste 1: Arquivo Carregado

```bash
# Acessar arquivo via browser
https://christopheredlly.github.io/Licencas/env.config.js

# Deve retornar o conteúdo JavaScript (não 404)
```

### Teste 2: Configuração Disponível

```javascript
// No console do browser
console.log(window.__ENV__);

// Deve mostrar:
{
  AZURE_CLIENT_ID: "ed17eba6-3f5d-42bf-866e-01fc039865d6",
  AZURE_TENANT_ID: "85795021-1de9-44cf-9dd4-21c3cfce52c5",
  ...
}
```

### Teste 3: Login Funciona

```
1. Clicar em "Entrar com Conta Microsoft"
2. Popup do Azure AD deve abrir
3. Fazer login com sua conta @fazenda.se.gov.br
4. Aceitar permissões
5. Dados devem carregar automaticamente
```

---

## 🔄 Alterando Configurações Depois

### Método 1: Editar e Commitar

```bash
# 1. Editar env.config.js localmente
code env.config.js

# 2. Mudar valores
"AZURE_FILE_RELATIVE_PATH": "Documents/OutroArquivo.xlsx"
"AZURE_TABLE_NAME": "OutraTabela"

# 3. Commitar e push
git add env.config.js
git commit -m "Update SharePoint file path"
git push
```

### Método 2: GitHub Web Interface

```
1. Ir para: https://github.com/ChristopherEdlly/Licencas
2. Clicar em env.config.js
3. Clicar no ícone de lápis (Edit)
4. Fazer alterações
5. Commit changes
```

---

## 📊 Comparação: Commitar vs GitHub Actions

| Aspecto | Commitar env.config.js | GitHub Actions + Secrets |
|---------|------------------------|--------------------------|
| **Segurança** | ✅ Seguro (PUBLIC_CLIENT) | ✅ Mais seguro (overkill) |
| **Complexidade** | ✅ Simples | ❌ Complexo |
| **Tempo setup** | ⚡ 1 minuto | 🐌 15-30 minutos |
| **Manutenção** | ✅ Fácil | ❌ Requer conhecimento CI/CD |
| **Deploy speed** | ⚡ Instantâneo | 🐌 Requer build |
| **Custo** | ✅ Grátis | ✅ Grátis |
| **Recomendado?** | ✅ **SIM** (seu caso) | ❌ Não (overkill) |

---

## ❓ FAQ

### 1. "E se alguém copiar meu CLIENT_ID?"

**Resposta:** Não tem problema!

- Eles **não conseguem** usar em outro site (Azure AD bloqueia via Redirect URI)
- Mesmo se conseguissem, **só acessariam arquivos do próprio usuário deles**
- É como alguém saber o "número de telefone" da sua empresa - não dá acesso a nada

### 2. "Meu arquivo Excel tem dados sensíveis"

**Resposta:** Os dados **não ficam no código**!

- env.config.js **só tem o caminho** do arquivo
- Os dados continuam **protegidos no SharePoint**
- Só quem faz login e tem permissão no SharePoint acessa

### 3. "E se eu mudar de planilha?"

```bash
# Editar env.config.js
"AZURE_FILE_RELATIVE_PATH": "Documents/NovaPlanilha.xlsx"
"AZURE_TABLE_NAME": "NovaTabela"

# Commitar
git commit -am "Update to new spreadsheet"
git push
```

### 4. "Preciso de valores diferentes para dev e produção?"

```javascript
// Detectar ambiente automaticamente
const isProduction = window.location.hostname.includes('github.io');

window.__ENV__ = {
    AZURE_CLIENT_ID: "ed17eba6-3f5d-42bf-866e-01fc039865d6",
    AZURE_REDIRECT_URI: isProduction
        ? "https://christopheredlly.github.io/Licencas"
        : "http://localhost:3000",
    // ... resto igual
};
```

---

## ✅ Conclusão

**Para o seu caso específico:**

1. ✅ **Commitar env.config.js** é seguro e recomendado
2. ✅ Azure AD protege via Redirect URI whitelist
3. ✅ Dados ficam protegidos no SharePoint
4. ✅ Simples de manter e atualizar

**Ação imediata:**

```bash
# Commitar e fazer deploy
git add env.config.js
git commit -m "Add Azure AD config for GitHub Pages"
git push
```

Pronto! Seu site vai funcionar no GitHub Pages. 🚀
