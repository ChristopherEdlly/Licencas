/**
 * Router - Gerenciamento de rotas e navegação
 *
 * Responsabilidades:
 * - Gerenciar rotas da aplicação (hash-based routing)
 * - Controlar navegação entre páginas
 * - Manter histórico de navegação
 * - Executar guardas de rota (beforeEnter, beforeLeave)
 * - Integrar com EventBus para notificar mudanças
 *
 * @module 5-app/Router
 */

class Router {
    /**
     * Construtor privado (Singleton)
     */
    constructor() {
        // Rotas registradas
        this._routes = new Map(); // Map<path, {controller, guards}>

        // Estado
        this._currentRoute = null;
        this._currentController = null;

        // Histórico
        this._history = [];
        this._maxHistorySize = 50;
        this._historyIndex = -1;

        // Rota padrão (fallback)
        this._defaultRoute = '/';

        // EventBus
        this._eventBus = null;

        console.log('✅ Router criado');
    }

    // ==================== SINGLETON ====================

    /**
     * Retorna instância única do Router
     * @returns {Router}
     */
    static getInstance() {
        if (!Router._instance) {
            Router._instance = new Router();
        }
        return Router._instance;
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Inicializa o router
     * @param {EventBus} eventBus - Instância do EventBus
     */
    init(eventBus = null) {
        this._eventBus = eventBus;

        // Limpar estados `active` pré-existentes no DOM (permitir que Router controle a ativação)
        try {
            document.querySelectorAll('.page-content.active').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-link.active').forEach(el => el.classList.remove('active'));
        } catch (err) {
            // ignore if DOM not ready
        }

        // Escutar mudanças no hash
        window.addEventListener('hashchange', () => this._handleHashChange());

        // Processar rota inicial
        this._handleHashChange();

        console.log('🚀 Router inicializado');
    }

    // ==================== REGISTRO DE ROTAS ====================

    /**
     * Registra uma rota
     * @param {string} path - Caminho da rota (ex: '/home', '/calendar')
     * @param {Object} controller - Controller da página
     * @param {Object} guards - Guardas de rota (beforeEnter, beforeLeave)
     */
    register(path, controller, guards = {}) {
        if (!path || !controller) {
            throw new Error('Path e controller são obrigatórios');
        }

        // Normalizar path (remover # inicial se existir)
        const normalizedPath = path.startsWith('#') ? path.slice(1) : path;

        this._routes.set(normalizedPath, {
            controller,
            guards: {
                beforeEnter: guards.beforeEnter || null,
                beforeLeave: guards.beforeLeave || null
            }
        });

        console.log(`📍 Rota registrada: ${normalizedPath}`);
    }

    /**
     * Registra múltiplas rotas de uma vez
     * @param {Array<Object>} routes - Array de {path, controller, guards}
     */
    registerRoutes(routes) {
        routes.forEach(route => {
            this.register(route.path, route.controller, route.guards);
        });
    }

    /**
     * Define rota padrão (fallback)
     * @param {string} path - Caminho da rota padrão
     */
    setDefaultRoute(path) {
        this._defaultRoute = path;
        console.log(`🏠 Rota padrão definida: ${path}`);
    }

    // ==================== NAVEGAÇÃO ====================

    /**
     * Navega para uma rota
     * @param {string} path - Caminho da rota
     * @param {Object} params - Parâmetros adicionais
     * @param {boolean} skipHistory - Se true, não adiciona ao histórico
     * @returns {Promise<boolean>} - true se navegação foi bem-sucedida
     */
    async navigate(path, params = {}, skipHistory = false) {
        // Normalizar path
        const normalizedPath = path.startsWith('#') ? path.slice(1) : path;
        const targetPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

        // Verificar se rota existe
        if (!this._routes.has(targetPath)) {
            console.warn(`⚠️ Rota não encontrada: ${targetPath}`);

            // Evitar loop infinito: só redirecionar se rota padrão existe e é diferente
            if (targetPath !== this._defaultRoute && this._routes.has(this._defaultRoute)) {
                return this.navigate(this._defaultRoute);
            }

            // Se rota padrão também não existe, retornar false
            console.error(`❌ Rota padrão ${this._defaultRoute} também não encontrada`);
            return false;
        }

        // Executar beforeLeave da rota atual
        if (this._currentRoute && this._currentController) {
            const currentRouteConfig = this._routes.get(this._currentRoute);
            if (currentRouteConfig?.guards?.beforeLeave) {
                const canLeave = await currentRouteConfig.guards.beforeLeave(this._currentRoute, targetPath);
                if (!canLeave) {
                    console.log('🚫 Navegação cancelada por beforeLeave');
                    return false;
                }
            }
        }

        // Executar beforeEnter da rota de destino
        const targetRouteConfig = this._routes.get(targetPath);
        if (targetRouteConfig?.guards?.beforeEnter) {
            const canEnter = await targetRouteConfig.guards.beforeEnter(this._currentRoute, targetPath);
            if (!canEnter) {
                console.log('🚫 Navegação cancelada por beforeEnter');
                return false;
            }
        }

        // Emitir evento ANTES da mudança
        if (this._eventBus) {
            this._eventBus.emit('page:before-change', {
                from: this._currentRoute,
                to: targetPath,
                params
            });
        }

        // Esconder página atual
        if (this._currentController && typeof this._currentController.hide === 'function') {
            this._currentController.hide();
        }

        // Atualizar estado
        const previousRoute = this._currentRoute;
        this._currentRoute = targetPath;
        this._currentController = targetRouteConfig.controller;

        // Adicionar ao histórico (apenas se não for navegação via back/forward)
        if (!skipHistory) {
            this._addToHistory(targetPath, params);
        }

        // Atualizar hash do navegador (sem triggerar hashchange)
        if (window.location.hash !== `#${targetPath}`) {
            window.location.hash = targetPath;
        }

        // Mostrar nova página
        if (this._currentController && typeof this._currentController.show === 'function') {
            this._currentController.show(params);
        }

        // Atualizar link ativo na sidebar (se existir)
        try {
            const page = targetPath === '/' ? 'home' : targetPath.replace(/^\//, '').split('/')[0];
            document.querySelectorAll('.nav-link').forEach(link => {
                if (link.dataset && link.dataset.page === page) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.classList.remove('active');
                    link.removeAttribute('aria-current');
                }
            });
        } catch (err) {
            // ignore
        }

        // Emitir evento APÓS a mudança
        if (this._eventBus) {
            this._eventBus.emit('page:changed', {
                from: previousRoute,
                to: targetPath,
                params
            });
        }

        console.log(`🧭 Navegado para: ${targetPath}`);
        return true;
    }

    /**
     * Navega para trás no histórico
     * @returns {Promise<boolean>}
     */
    async back() {
        if (this._historyIndex > 0) {
            this._historyIndex--;
            const previousEntry = this._history[this._historyIndex];
            return this.navigate(previousEntry.path, previousEntry.params, true);
        }
        console.log('⚠️ Não há histórico anterior');
        return false;
    }

    /**
     * Navega para frente no histórico
     * @returns {Promise<boolean>}
     */
    async forward() {
        if (this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
            const nextEntry = this._history[this._historyIndex];
            return this.navigate(nextEntry.path, nextEntry.params, true);
        }
        console.log('⚠️ Não há histórico seguinte');
        return false;
    }

    /**
     * Recarrega a rota atual
     */
    reload() {
        if (this._currentRoute) {
            this.navigate(this._currentRoute);
        }
    }

    // ==================== MANIPULAÇÃO DE HASH ====================

    /**
     * Trata mudanças no hash da URL
     * @private
     */
    _handleHashChange() {
        const hash = window.location.hash;
        const path = hash ? hash.slice(1) : this._defaultRoute;

        // Evitar loop infinito
        if (path === this._currentRoute) {
            return;
        }

        this.navigate(path);
    }

    // ==================== HISTÓRICO ====================

    /**
     * Adiciona entrada ao histórico
     * @private
     * @param {string} path - Caminho da rota
     * @param {Object} params - Parâmetros
     */
    _addToHistory(path, params) {
        // Remover entradas futuras se estamos no meio do histórico
        if (this._historyIndex < this._history.length - 1) {
            this._history = this._history.slice(0, this._historyIndex + 1);
        }

        this._history.push({
            path,
            params,
            timestamp: new Date().toISOString()
        });

        // Limitar tamanho do histórico
        if (this._history.length > this._maxHistorySize) {
            this._history.shift();
        } else {
            this._historyIndex++;
        }
    }

    /**
     * Retorna histórico de navegação
     * @param {number} limit - Limite de entradas
     * @returns {Array<Object>}
     */
    getHistory(limit = null) {
        if (limit) {
            return this._history.slice(-limit);
        }
        return [...this._history];
    }

    /**
     * Limpa histórico de navegação
     */
    clearHistory() {
        this._history = [];
        this._historyIndex = -1;
        console.log('🗑️ Histórico de navegação limpo');
    }

    // ==================== PARÂMETROS DE ROTA ====================

    /**
     * Extrai parâmetros de uma rota
     * Exemplo: /reports/:id → {id: '123'}
     * @param {string} pattern - Padrão da rota
     * @param {string} path - Caminho atual
     * @returns {Object|null}
     */
    extractParams(pattern, path) {
        const patternParts = pattern.split('/');
        const pathParts = path.split('/');

        if (patternParts.length !== pathParts.length) {
            return null;
        }

        const params = {};
        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                const paramName = patternParts[i].slice(1);
                params[paramName] = pathParts[i];
            } else if (patternParts[i] !== pathParts[i]) {
                return null;
            }
        }

        return params;
    }

    // ==================== GETTERS ====================

    /**
     * Retorna rota atual
     * @returns {string|null}
     */
    getCurrentRoute() {
        return this._currentRoute;
    }

    /**
     * Retorna controller atual
     * @returns {Object|null}
     */
    getCurrentController() {
        return this._currentController;
    }

    /**
     * Retorna todas as rotas registradas
     * @returns {Array<string>}
     */
    getRoutes() {
        return Array.from(this._routes.keys());
    }

    /**
     * Verifica se uma rota existe
     * @param {string} path - Caminho da rota
     * @returns {boolean}
     */
    hasRoute(path) {
        const normalizedPath = path.startsWith('#') ? path.slice(1) : path;
        return this._routes.has(normalizedPath);
    }

    // ==================== DEBUG ====================

    /**
     * Retorna informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            currentRoute: this._currentRoute,
            defaultRoute: this._defaultRoute,
            totalRoutes: this._routes.size,
            routes: this.getRoutes(),
            historySize: this._history.length,
            historyIndex: this._historyIndex,
            canGoBack: this._historyIndex > 0,
            canGoForward: this._historyIndex < this._history.length - 1
        };
    }

    /**
     * Lista todas as rotas com detalhes
     * @returns {Object}
     */
    listRoutes() {
        const result = {};
        this._routes.forEach((config, path) => {
            result[path] = {
                hasController: !!config.controller,
                hasBeforeEnter: !!config.guards.beforeEnter,
                hasBeforeLeave: !!config.guards.beforeLeave
            };
        });
        return result;
    }
}

// ==================== EXPORTAÇÃO ====================

// Criar instância global (Singleton)
if (typeof window !== 'undefined') {
    if (!window.router) {
        window.router = Router.getInstance();
    }
}

// Expor classe também
if (typeof window !== 'undefined') {
    window.Router = Router;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
