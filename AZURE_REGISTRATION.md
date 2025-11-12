# Guia de Registro no Azure Active Directory

## 📋 Informações para Registro da Aplicação

### Dados da Aplicação

- **Nome**: Dashboard Licenças Prêmio SEFAZ-SE
- **Tipo**: Single Page Application (SPA)
- **URL do Site**: `https://christopheredlly.github.io/Licencas/` (ou domínio personalizado)
- **Desenvolvedor**: Christopher Caldas (christopher.caldas@fazenda.se.gov.br)
- **Organização**: Secretaria de Estado da Fazenda de Sergipe

---

## 🚀 Passo a Passo para Registro

### 1. Acesso ao Azure Portal

1. Acesse: https://portal.azure.com
2. Faça login com conta @fazenda.se.gov.br
3. Navegue até: **Azure Active Directory** → **App registrations**
4. Clique em: **+ New registration**

### 2. Configurações de Registro

#### Informações Básicas:
```
Nome: Dashboard Licenças Prêmio SEFAZ-SE
Supported account types: Accounts in any organizational directory (Any Azure AD directory - Multitenant)
```

#### Redirect URI:
```
Platform: Single-page application (SPA)
Redirect URI: https://christopheredlly.github.io/Licencas/
```

> **Nota**: Se usar domínio personalizado, adicione também o redirect URI personalizado depois.

### 3. Permissões Necessárias (API Permissions)

Após criar o app, vá em **API permissions** e adicione:

#### Microsoft Graph:
- ✅ `User.Read` (Delegated) - Ler perfil básico do usuário
- ✅ `Files.Read` (Delegated) - Ler arquivos do usuário
- ✅ `Sites.Read.All` (Delegated) - Ler sites do SharePoint

**Grant admin consent** para todas as permissões (botão azul no topo).

### 4. Configuração de Autenticação

Em **Authentication**, configure:

#### Implicit grant and hybrid flows:
- ✅ **Access tokens** (NÃO marcar para SPA)
- ✅ **ID tokens** (Marcar apenas se necessário)

> Para SPA moderno, o recomendado é usar **Authorization code flow com PKCE** (padrão do MSAL 2.x).

#### Advanced settings:
- ✅ **Allow public client flows**: No

### 5. Obter Credenciais

Após criação, anote os seguintes valores (você vai precisar no código):

```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> **⚠️ IMPORTANTE**: Não precisa criar Client Secret para SPA!

---

## 🔧 Configuração no Código

### Arquivo a ser criado: `js/config/azure-config.js`

```javascript
// Configuração do Azure AD
const AZURE_CONFIG = {
    clientId: 'SEU_CLIENT_ID_AQUI', // Do passo 5
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri: window.location.origin + '/Licencas/', // Ajustar conforme necessário
    
    // Permissões solicitadas
    scopes: [
        'User.Read',
        'Files.Read',
        'Sites.Read.All'
    ],
    
    // Configuração SharePoint
    sharepoint: {
        siteUrl: 'https://sefazsegovbr-my.sharepoint.com',
        fileId: 'w79b057ccf7434bb9bad2439741d5e7dc',
        // Será obtido dinamicamente via API
        driveId: null
    },
    
    // Validação de domínio
    allowedDomains: ['@fazenda.se.gov.br']
};

// Exportar configuração
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AZURE_CONFIG;
}
```

### Arquivo a ser criado: `js/auth/sharepoint-auth.js`

Este arquivo será criado na branch de desenvolvimento com toda a lógica de autenticação.

---

## 🌿 Estratégia de Branches

### Branch `main` (Produção)
- **Conteúdo**: Código com upload manual de arquivos (como está agora)
- **Deploy**: GitHub Pages aponta para esta branch
- **Uso**: Ambiente de produção ativo

### Branch `development` (Desenvolvimento)
- **Conteúdo**: Código com integração SharePoint + Azure AD
- **Testes**: Ambiente de homologação
- **Quando mesclar**: Após testes completos e aprovação

### Branch `azure-integration` (Feature)
- **Conteúdo**: Desenvolvimento da integração Azure
- **Objetivo**: Isolar desenvolvimento da feature
- **Merge**: Para `development` após implementação

---

## 📝 Checklist Antes do Registro

- [ ] Política de Privacidade publicada ✅
- [ ] Termos de Uso publicados ✅
- [ ] Footer com links legais adicionado ✅
- [ ] Documentação preparada ✅
- [ ] Email de contato válido ✅
- [ ] Descrição clara do propósito ✅
- [ ] URL de redirect definida ✅

---

## 🔐 Segurança

### Validação de Domínio
O código deve validar se o usuário tem email @fazenda.se.gov.br:

```javascript
function validateUser(account) {
    const email = account.username || account.email;
    if (!email.endsWith('@fazenda.se.gov.br')) {
        throw new Error('Acesso restrito a funcionários SEFAZ-SE');
    }
    return true;
}
```

### Armazenamento de Tokens
- **localStorage**: Usado pelo MSAL para cache de tokens
- **Nunca** expor Client ID em variáveis de ambiente públicas (é normal estar no código SPA)
- Tokens expiram automaticamente

---

## 🌐 Deploy GitHub Pages

### Configuração Atual:
```
Repository: ChristopherEdlly/Licencas
Branch: main
Path: / (root)
Custom domain: (opcional)
```

### URL Final:
```
https://christopheredlly.github.io/Licencas/
```

### Domínio Personalizado (Opcional):
Se SEFAZ-SE tiver domínio próprio:
```
licencas.fazenda.se.gov.br
```

---

## 📞 Suporte Microsoft

Em caso de problemas com registro ou aprovação:

- **Portal Azure**: https://portal.azure.com
- **Documentação**: https://learn.microsoft.com/azure/active-directory/
- **Suporte Microsoft**: Através do portal Azure (criar ticket)

---

## ✅ Conformidade Verificada

Este projeto está em conformidade com:

- ✅ Microsoft Platform Agreement
- ✅ LGPD (Lei Geral de Proteção de Dados)
- ✅ Políticas de Segurança SEFAZ-SE
- ✅ Boas práticas de desenvolvimento SPA

---

## 📌 Próximos Passos

1. **Registrar aplicação** no Azure Portal
2. **Anotar Client ID** e Tenant ID
3. **Criar branch development**
4. **Implementar autenticação** (na branch development)
5. **Testar integração** SharePoint
6. **Validar segurança** e permissões
7. **Merge para main** após aprovação

---

**Desenvolvedor**: Christopher Caldas  
**Email**: christopher.caldas@fazenda.se.gov.br  
**Data**: 12 de novembro de 2025
