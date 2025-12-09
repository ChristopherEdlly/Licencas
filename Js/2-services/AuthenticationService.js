/**
 * AuthenticationService - Autenticação Microsoft Entra (Azure AD)
 *
 * Responsabilidades:
 * - Gerenciar autenticação via MSAL.js
 * - Obter e renovar tokens de acesso
 * - Gerenciar sessão do usuário
 * - Atualizar UI com estado de autenticação
 *
 * @module 2-services/AuthenticationService
 * @requires MSAL.js
 */

class AuthenticationService {
    /**
     * Instância do MSAL
     */
    static msalInstance = null;

    /**
     * Conta do usuário atual
     */
    static currentAccount = null;

    /**
     * Configuração padrão
     */
    static CONFIG = {
        scopes: ['User.Read', 'Files.Read', 'Files.Read.All'],
        redirectUri: window.location.origin
    };

    /**
     * Inicializa o serviço de autenticação
     * @param {Object} config - Configuração do Azure AD (clientId, tenantId, redirectUri)
     * @returns {Promise<void>}
     */
    static async init(config) {
        if (typeof msal === 'undefined') {
            throw new Error('Biblioteca MSAL não carregada');
        }

        if (!config || !config.clientId) {
            throw new Error('clientId é obrigatório');
        }

        const msalConfig = {
            auth: {
                clientId: config.clientId,
                authority: `https://login.microsoftonline.com/${config.tenantId || 'common'}`,
                redirectUri: config.redirectUri || this.CONFIG.redirectUri
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: false
            },
            system: {
                loggerOptions: {
                    loggerCallback: (level, message, containsPii) => {
                        if (containsPii) return;
                        console.log(`[MSAL ${level}]`, message);
                    },
                    piiLoggingEnabled: false,
                    logLevel: msal.LogLevel.Warning
                }
            }
        };

        try {
            this.msalInstance = new msal.PublicClientApplication(msalConfig);
            await this.msalInstance.initialize();

            // Verificar se já existe conta logada
            const accounts = this.msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                console.log('✅ Usuário já autenticado:', this.currentAccount.username);
            }

            console.log('✅ AuthenticationService inicializado');

        } catch (error) {
            console.error('Erro ao inicializar MSAL:', error);
            throw new Error(`Falha na inicialização: ${error.message}`);
        }
    }

    /**
     * Realiza login via popup
     * @param {Array<string>} scopes - Escopos de permissão
     * @returns {Promise<Object>} - Informações do usuário
     */
    static async login(scopes = this.CONFIG.scopes) {
        if (!this.msalInstance) {
            throw new Error('AuthenticationService não inicializado');
        }

        try {
            const loginRequest = {
                scopes,
                prompt: 'select_account'
            };

            const response = await this.msalInstance.loginPopup(loginRequest);

            this.currentAccount = response.account;

            console.log('✅ Login realizado com sucesso:', this.currentAccount.username);

            return {
                username: this.currentAccount.username,
                name: this.currentAccount.name,
                id: this.currentAccount.homeAccountId
            };

        } catch (error) {
            console.error('Erro no login:', error);

            if (error.errorCode === 'user_cancelled') {
                throw new Error('Login cancelado pelo usuário');
            }

            throw new Error(`Falha no login: ${error.message}`);
        }
    }

    /**
     * Realiza logout
     * @returns {Promise<void>}
     */
    static async logout() {
        if (!this.msalInstance) {
            throw new Error('AuthenticationService não inicializado');
        }

        if (!this.currentAccount) {
            console.warn('Nenhum usuário logado');
            return;
        }

        try {
            const logoutRequest = {
                account: this.currentAccount
            };

            await this.msalInstance.logoutPopup(logoutRequest);

            this.currentAccount = null;

            console.log('✅ Logout realizado');

        } catch (error) {
            console.error('Erro no logout:', error);
            throw new Error(`Falha no logout: ${error.message}`);
        }
    }

    /**
     * Obtém token de acesso
     * @param {Array<string>} scopes - Escopos necessários
     * @returns {Promise<string>} - Access token
     */
    static async acquireToken(scopes = this.CONFIG.scopes) {
        if (!this.msalInstance) {
            throw new Error('AuthenticationService não inicializado');
        }

        if (!this.currentAccount) {
            throw new Error('Usuário não autenticado');
        }

        try {
            const tokenRequest = {
                scopes,
                account: this.currentAccount
            };

            // Tentar obter token silenciosamente
            try {
                const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
                return response.accessToken;

            } catch (silentError) {
                // Se falhar, usar popup
                console.warn('Token silencioso falhou, usando popup', silentError);

                const response = await this.msalInstance.acquireTokenPopup(tokenRequest);
                return response.accessToken;
            }

        } catch (error) {
            console.error('Erro ao obter token:', error);
            throw new Error(`Falha ao obter token: ${error.message}`);
        }
    }

    /**
     * Verifica se usuário está autenticado
     * @returns {boolean}
     */
    static isAuthenticated() {
        return this.currentAccount !== null;
    }

    /**
     * Obtém informações do usuário atual
     * @returns {Object|null}
     */
    static getCurrentUser() {
        if (!this.currentAccount) {
            return null;
        }

        return {
            username: this.currentAccount.username,
            name: this.currentAccount.name,
            id: this.currentAccount.homeAccountId
        };
    }

    /**
     * Obtém avatar do usuário via Microsoft Graph
     * @returns {Promise<string|null>} - URL do avatar (base64)
     */
    static async getUserPhoto() {
        try {
            const token = await this.acquireToken(['User.Read']);

            const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                return null;
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);

        } catch (error) {
            console.warn('Não foi possível obter foto do usuário:', error);
            return null;
        }
    }

    /**
     * Verifica se tem permissão específica
     * @param {string} permission - Permissão a verificar
     * @returns {boolean}
     */
    static hasPermission(permission) {
        // Implementação futura: verificar claims do token
        return true;
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.AuthenticationService = AuthenticationService;
}
