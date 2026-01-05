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
        // Minimal scopes by default to avoid admin consent loops.
        // Additional scopes (Files.ReadWrite) are requested only when performing writes.
        scopes: ['User.Read'],
        redirectUri: window.location.origin
    };

    // Bloqueio para evitar popups concorrentes / interações paralelas
    static interactionInProgress = false;
    // Mantém a última promise de aquisição interativa para evitar duplicação
    static interactivePromise = null;

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

        // Determine redirectUri: priority -> config.redirectUri (unless 'auto') -> localhost auto -> default CONFIG
        let resolvedRedirectUri = this.CONFIG.redirectUri;
        if (config && config.redirectUri) {
            if (config.redirectUri === 'auto') {
                // allow automatic detection for local development
                resolvedRedirectUri = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : this.CONFIG.redirectUri;
            } else {
                resolvedRedirectUri = config.redirectUri;
            }
        } else if (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            // if running on localhost and no explicit redirectUri provided, use current origin for development
            resolvedRedirectUri = window.location.origin;
        }

        const msalConfig = {
            auth: {
                clientId: config.clientId,
                authority: `https://login.microsoftonline.com/${config.tenantId || 'common'}`,
                redirectUri: resolvedRedirectUri
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

            // Resolver respostas de redirect pendentes (caso tenha sido usado redirect anteriormente)
            try {
                const redirectResponse = await this.msalInstance.handleRedirectPromise();
                if (redirectResponse && redirectResponse.account) {
                    this.currentAccount = redirectResponse.account;
                    console.log('✅ Redirect auth resolved, usuário:', this.currentAccount.username);
                }
            } catch (redirErr) {
                // Não fatal — registrar e prosseguir
                console.warn('handleRedirectPromise falhou:', redirErr && redirErr.errorMessage ? redirErr.errorMessage : redirErr);
            }

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

            // 1) Tentar obter token silenciosamente
            try {
                const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
                return response.accessToken;

            } catch (silentError) {
                // Se falhar por InteractionRequired / consentimento, executar fluxo interativo com controle
                console.warn('Token silencioso falhou — é necessário fluxo interativo', silentError && (silentError.errorCode || silentError.name));

                // Se já houver uma interação em andamento, aguardar a conclusão (evita múltiplos popups)
                const waitUntilAvailable = async (timeoutMs = 8000) => {
                    const start = Date.now();
                    while (this.interactionInProgress) {
                        if (Date.now() - start > timeoutMs) return false;
                        await new Promise(r => setTimeout(r, 200));
                    }
                    return true;
                };

                const available = await waitUntilAvailable(8000);
                if (!available) {
                    throw new Error('Outro fluxo de autenticação está em progresso. Aguarde e tente novamente.');
                }

                // Marcar interação em progresso
                this.interactionInProgress = true;

                try {
                    // Reutilizar promise interativa se já existe
                    if (!this.interactivePromise) {
                        this.interactivePromise = (async () => {
                            try {
                                const popupResp = await this.msalInstance.acquireTokenPopup(tokenRequest);
                                return popupResp;
                            } catch (popupErr) {
                                // Se popup falhar (bloqueado) lançar um erro identificável
                                console.warn('acquireTokenPopup falhou', popupErr && (popupErr.errorCode || popupErr.name || popupErr.message));
                                // Se popup não puder ser aberto, instruir uso de redirect
                                const isPopupBlocked = popupErr && (popupErr.errorCode === 'popup_window_error' || (popupErr.errorMessage && popupErr.errorMessage.indexOf('window.open') !== -1) || (popupErr.message && popupErr.message.indexOf('window.open') !== -1));
                                if (isPopupBlocked) {
                                    const err = new Error('popup_blocked: O navegador bloqueou janelas popup. Permita popups ou use consentimento via redirect.');
                                    err.code = 'popup_blocked';
                                    throw err;
                                }

                                // Outros erros interativos repassar
                                throw popupErr;
                            }
                        })();
                    }

                    const response = await this.interactivePromise;
                    return response.accessToken;

                } finally {
                    this.interactionInProgress = false;
                    this.interactivePromise = null;
                }
            }

        } catch (error) {
            console.error('Erro ao obter token:', error);
            // Normalizar erros conhecidos para a camada chamadora (serviço Graph)
            if (error && error.code === 'popup_blocked') {
                throw error;
            }
            throw new Error(`Falha ao obter token: ${error && (error.errorMessage || error.message) ? (error.errorMessage || error.message) : error}`);
        }
    }

    /**
     * Tenta obter token apenas de forma silenciosa (sem interações popups/redirect).
     * Retorna accessToken ou null se não for possível obter sem interação.
     * @param {Array<string>} scopes
     */
    static async acquireTokenSilentOnly(scopes = this.CONFIG.scopes) {
        if (!this.msalInstance) throw new Error('AuthenticationService não inicializado');
        if (!this.currentAccount) return null;

        try {
            const tokenRequest = { scopes, account: this.currentAccount };
            const resp = await this.msalInstance.acquireTokenSilent(tokenRequest);
            return resp && resp.accessToken ? resp.accessToken : null;
        } catch (err) {
            // Não tentar fallback interativo aqui
            return null;
        }
    }

    /**
     * Inicia fluxo de consentimento via redirect (útil quando popups estão bloqueados)
     * Observação: redirect recarrega a página — a aplicação deve tratar o resultado via `init` que chama `handleRedirectPromise`.
     * @param {Array<string>} scopes
     */
    static requestConsentRedirect(scopes = this.CONFIG.scopes) {
        if (!this.msalInstance) throw new Error('AuthenticationService não inicializado');

        const tokenRequest = { scopes };
        try {
            // iniciar redirect — não aguardamos retorno aqui
            this.msalInstance.acquireTokenRedirect(tokenRequest);
        } catch (err) {
            console.error('Falha ao iniciar redirect de consentimento:', err);
            throw err;
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
                // 404 é esperado quando usuário não tem foto - não é erro
                if (response.status !== 404) {
                    console.debug(`Photo API returned ${response.status}, using default avatar`);
                }
                return null;
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);

        } catch (error) {
            // Foto não crítica - falhar silenciosamente
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
