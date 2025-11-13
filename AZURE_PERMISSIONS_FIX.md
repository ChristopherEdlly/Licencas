# 🔧 Como Corrigir Permissões do Azure AD

## ❌ Problema
O aplicativo está pedindo permissão `Sites.Read.All` que requer aprovação de administrador.

## ✅ Solução Implementada
Mudei para usar apenas **`Files.Read.All`** que é uma permissão delegada que **não requer aprovação de admin**.

---

## 📋 Passos para Configurar no Azure Portal

### 1. Acessar o Portal do Azure
- Vá para: https://portal.azure.com
- Entre com sua conta `@fazenda.se.gov.br`

### 2. Ir para App Registrations
- Procure por **"Azure Active Directory"** ou **"Microsoft Entra ID"**
- No menu lateral, clique em **"App registrations"**
- Encontre seu app: **"SEFAZ licenca-premio"**

### 3. Configurar Permissões de API
- No menu do seu app, clique em **"API permissions"**
- Você verá a lista de permissões atuais

### 4. Remover Permissões Antigas (se existirem)
Se você vir `Sites.Read.All`:
- Clique nos **3 pontinhos** ao lado da permissão
- Selecione **"Remove permission"**
- Confirme

### 5. Adicionar Permissões Corretas
Clique em **"+ Add a permission"**:

1. Selecione **"Microsoft Graph"**
2. Selecione **"Delegated permissions"**
3. Procure e marque:
   - ✅ `User.Read` (já deve estar marcado)
   - ✅ `Files.Read.All`
4. Clique em **"Add permissions"**

### 6. Verificar Consentimento
- **NÃO** clique em "Grant admin consent" (não é necessário!)
- As permissões `User.Read` e `Files.Read.All` são **permissões de usuário**
- Cada usuário vai consentir quando fizer login pela primeira vez

---

## 🎯 Permissões Necessárias (Final)

| Permissão | Tipo | Admin Consent? | Descrição |
|-----------|------|----------------|-----------|
| `User.Read` | Delegated | ❌ Não | Ler perfil do usuário |
| `Files.Read.All` | Delegated | ❌ Não | Ler arquivos do OneDrive/SharePoint |

---

## 🔄 Após Configurar

1. **Limpe o cache do navegador** ou use **janela anônima**
2. **Deslogue** se já estiver logado
3. **Faça login novamente**
4. Você verá uma tela pedindo consentimento para:
   - Exibir seu perfil básico
   - Ler seus arquivos no OneDrive
5. Clique em **"Aceitar"**

---

## 🆘 Se Ainda Pedir Aprovação de Admin

Se ainda aparecer a mensagem de "aprovação de admin necessária":

1. Verifique se as permissões no Azure Portal são:
   - **Tipo:** Delegated (não Application)
   - **Consentimento de admin:** "No" ou "Not granted"

2. Se `Sites.Read.All` ainda aparecer:
   - Remova completamente essa permissão
   - Espere 5-10 minutos
   - Tente novamente

3. Se nada funcionar, pode ser necessário:
   - Criar um novo App Registration
   - Ou pedir ao admin para conceder consentimento uma única vez

---

## ✨ O Que Mudou no Código

Mudei de:
```javascript
// ❌ ANTES (exigia admin)
acquireToken(['Files.Read', 'Sites.Read.All'])
```

Para:
```javascript
// ✅ AGORA (não exige admin)
acquireToken(['Files.Read.All'])
```

A permissão `Files.Read.All` permite:
- ✅ Ler arquivos do OneDrive do usuário
- ✅ Ler arquivos do SharePoint compartilhados com o usuário
- ❌ Não permite acesso a sites sem permissão do usuário

Isso é suficiente para o dashboard funcionar! 🎉
