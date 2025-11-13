/**
 * AuthenticationManager - Integração com Microsoft Entra (Azure AD) usando MSAL.js
 * Responsável por autenticar o usuário e expor o estado atual para outros módulos.
 */

class AuthenticationManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.env = window.__ENV__ || {};
        this.msalAvailable = typeof window.msal !== 'undefined';
        this.activeAccount = null;
        this.disabledMessage = '';
        this.loginInProgress = false;
        this.scopes = Array.isArray(this.env.AZURE_SCOPES) && this.env.AZURE_SCOPES.length > 0
            ? this.env.AZURE_SCOPES
            : ['User.Read'];

        this.loginButtons = [
            document.getElementById('microsoftLoginButton'),
            document.getElementById('microsoftLoginButtonSettings'),
            document.getElementById('authOverlayLoginButton')
        ].filter(Boolean);
        this.logoutButtons = [
            document.getElementById('microsoftLogoutButton'),
            document.getElementById('microsoftLogoutButtonSettings')
        ].filter(Boolean);
        this.accountChip = document.getElementById('microsoftAccountChip');
        this.accountNameEl = document.getElementById('microsoftAccountName');
        this.statusBadge = document.getElementById('azureIntegrationStatus');
        this.authOverlay = document.getElementById('authRequiredOverlay');
        this.authOverlayMessage = document.getElementById('authOverlayMessage');
        this.authOverlayLoginButton = document.getElementById('authOverlayLoginButton');
    this.authOverlayButtonDefaultMarkup = this.authOverlayLoginButton?.innerHTML || '';

        this.isEnabled = this.validateConfiguration();
        if (!this.isEnabled) {
            this.disableUI();
            this.updateAccessRequirement();
            return;
        }

        this.msalInstance = new window.msal.PublicClientApplication({
            auth: {
                clientId: this.env.AZURE_CLIENT_ID,
                authority: this.env.AZURE_AUTHORITY || `https://login.microsoftonline.com/${this.env.AZURE_TENANT_ID}`,
                redirectUri: this.env.AZURE_REDIRECT_URI || window.location.origin
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: false
            }
        });

    this.attachEventHandlers();
    this.updateAccessRequirement();
    this.bootstrapSession();
    }

    validateConfiguration() {
        if (!this.msalAvailable) {
            console.warn('MSAL.js não carregado. Autenticação Microsoft desativada.');
            this.disabledMessage = 'MSAL.js não foi carregado. Verifique se o script de autenticação está disponível.';
            return false;
        }

        const required = ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_REDIRECT_URI'];
        const missing = required.filter((key) => !this.env[key]);
        if (missing.length > 0) {
            console.warn('Configuração Azure incompleta. Campos faltando:', missing.join(', '));
            this.disabledMessage = 'Configuração Microsoft pendente. Preencha os campos obrigatórios antes de continuar.';
            return false;
        }

        this.disabledMessage = '';
        return true;
    }

    disableUI() {
        this.loginButtons.forEach((button) => {
            button.disabled = true;
            button.title = 'Configuração de autenticação indisponível';
        });
        if (this.statusBadge) {
            this.statusBadge.textContent = 'Configuração Microsoft pendente';
        }
        if (this.authOverlayLoginButton) {
            this.authOverlayLoginButton.disabled = true;
            this.authOverlayLoginButton.setAttribute('aria-disabled', 'true');
        }
    }

    attachEventHandlers() {
        this.loginButtons.forEach((button) => {
            button.addEventListener('click', () => this.login());
        });

        this.logoutButtons.forEach((button) => {
            button.addEventListener('click', () => this.logout());
        });
    }

    async bootstrapSession() {
        try {
            await this.msalInstance.handleRedirectPromise();
        } catch (error) {
            console.error('Erro durante processamento de redirect do MSAL:', error);
        }

        const currentAccount = this.getActiveAccount();
        if (currentAccount) {
            this.setActiveAccount(currentAccount);
        }

        this.updateUI();
    }

    async login() {
        if (this.loginInProgress) {
            return;
        }

        this.setAuthenticatingState(true);
        try {
            const response = await this.msalInstance.loginPopup({
                scopes: this.scopes,
                prompt: 'select_account'
            });
            if (response && response.account) {
                this.setActiveAccount(response.account);
                this.dashboard?.notificationManager?.show({
                    type: 'success',
                    title: 'Login realizado',
                    message: `Bem-vindo, ${response.account.name || response.account.username}`
                });
            }
        } catch (error) {
            if (error?.errorCode === 'interaction_in_progress') {
                console.warn('Tentativa de login ignorada: uma interação já estava em andamento.');
            } else {
                console.error('Erro ao realizar login Microsoft:', error);
                this.dashboard?.notificationManager?.show({
                    type: 'error',
                    title: 'Falha no login Microsoft',
                    message: error.message || 'Não foi possível autenticar a conta Microsoft.'
                });
            }
        } finally {
            this.setAuthenticatingState(false);
            this.updateUI();
        }
    }

    async logout() {
        if (!this.activeAccount) return;
        try {
            await this.msalInstance.logoutPopup({
                account: this.activeAccount
            });
            this.setActiveAccount(null);
            this.dashboard?.notificationManager?.show({
                type: 'info',
                title: 'Sessão encerrada',
                message: 'Autenticação Microsoft desconectada.'
            });
        } catch (error) {
            console.error('Erro ao realizar logout Microsoft:', error);
            this.dashboard?.notificationManager?.show({
                type: 'error',
                title: 'Falha ao desconectar',
                message: error.message || 'Não foi possível encerrar a sessão Microsoft.'
            });
        } finally {
            this.updateUI();
        }
    }

    getActiveAccount() {
        const current = this.msalInstance.getActiveAccount();
        if (current) return current;
        const accounts = this.msalInstance.getAllAccounts();
        return accounts.length > 0 ? accounts[0] : null;
    }

    setActiveAccount(account) {
        this.activeAccount = account;
        if (account) {
            this.msalInstance.setActiveAccount(account);
        } else {
            this.msalInstance.setActiveAccount(null);
        }
        this.updateUI();
        document.dispatchEvent(new CustomEvent('azure-auth-changed', {
            detail: {
                isAuthenticated: Boolean(account),
                account
            }
        }));
    }

    async acquireToken(scopes = this.scopes) {
        if (!this.activeAccount) {
            throw new Error('Nenhuma conta Microsoft autenticada.');
        }
        try {
            const response = await this.msalInstance.acquireTokenSilent({
                scopes,
                account: this.activeAccount
            });
            return response.accessToken;
        } catch (error) {
            if (error instanceof window.msal.InteractionRequiredAuthError) {
                const response = await this.msalInstance.acquireTokenPopup({
                    scopes,
                    account: this.activeAccount
                });
                return response.accessToken;
            }
            throw error;
        }
    }

    updateUI() {
        const isAuthenticated = Boolean(this.activeAccount);

        this.loginButtons.forEach((button) => {
            button.style.display = isAuthenticated ? 'none' : 'inline-flex';
        });

        this.logoutButtons.forEach((button) => {
            button.style.display = isAuthenticated ? 'inline-flex' : 'none';
        });

        if (this.accountChip) {
            this.accountChip.style.display = isAuthenticated ? 'inline-flex' : 'none';
            if (isAuthenticated && this.accountNameEl) {
                this.accountNameEl.textContent = this.activeAccount?.name || this.activeAccount?.username || 'Conta Microsoft';
            }
        }

        if (this.statusBadge) {
            if (isAuthenticated) {
                this.statusBadge.textContent = 'Microsoft conectado';
                this.statusBadge.classList.add('connected');
            } else {
                this.statusBadge.textContent = 'Microsoft não conectado';
                this.statusBadge.classList.remove('connected');
            }
        }

        this.updateAccessRequirement();
    }

    updateAccessRequirement() {
        if (!this.authOverlay) {
            return;
        }

        if (!this.isEnabled) {
            this.setOverlayState({
                visible: true,
                message: this.disabledMessage || 'Configuração Microsoft indisponível no momento.',
                disableLogin: true
            });
            return;
        }

        const isAuthenticated = Boolean(this.activeAccount);
        this.setOverlayState({
            visible: !isAuthenticated,
            message: 'Para acessar o painel, entre com sua conta Microsoft.',
            disableLogin: false
        });
    }

    setOverlayState({ visible, message, disableLogin }) {
        if (!this.authOverlay) {
            return;
        }

        if (typeof visible === 'boolean') {
            this.authOverlay.style.display = visible ? 'flex' : 'none';
            this.authOverlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
        }

        if (message && this.authOverlayMessage) {
            this.authOverlayMessage.textContent = message;
        }

        if (this.authOverlayLoginButton) {
            const shouldDisable = Boolean(disableLogin || this.loginInProgress);
            this.authOverlayLoginButton.disabled = shouldDisable;
            if (shouldDisable) {
                this.authOverlayLoginButton.setAttribute('aria-disabled', 'true');
            } else {
                this.authOverlayLoginButton.removeAttribute('aria-disabled');
            }
        }
    }

    setAuthenticatingState(isAuthenticating) {
        this.loginInProgress = Boolean(isAuthenticating);
        this.loginButtons.forEach((button) => {
            button.disabled = this.loginInProgress;
        });

        if (this.authOverlayLoginButton) {
            this.authOverlayLoginButton.disabled = this.loginInProgress;
            if (this.loginInProgress) {
                this.authOverlayLoginButton.textContent = 'Abrindo popup...';
                this.authOverlayLoginButton.setAttribute('aria-busy', 'true');
            } else {
                if (this.authOverlayButtonDefaultMarkup) {
                    this.authOverlayLoginButton.innerHTML = this.authOverlayButtonDefaultMarkup;
                }
                this.authOverlayLoginButton.removeAttribute('aria-busy');
            }
        }
    }
}

window.AuthenticationManager = AuthenticationManager;
