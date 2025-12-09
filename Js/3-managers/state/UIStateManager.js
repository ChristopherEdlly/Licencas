/**
 * UIStateManager - Gerenciamento de estado da UI
 *
 * Responsabilidades:
 * - Estado de modais, sidebars, tooltips
 * - Página ativa, view ativa
 * - Loading states
 * - Preferências de UI (dark mode, animações, etc.)
 *
 * @module 3-managers/state/UIStateManager
 */

class UIStateManager {
    /**
     * Construtor privado (Singleton)
     */
    constructor() {
        // Estado da UI
        this._uiState = {
            // Páginas
            currentPage: 'home',
            previousPage: null,

            // Views (dentro de páginas)
            currentView: 'cronogramaView',

            // Modais
            openModals: [],                     // Stack de modais abertos

            // Sidebars
            sidebarOpen: true,
            sidebarCollapsed: false,

            // Loading
            isLoading: false,
            loadingMessage: '',

            // Tooltips
            tooltipsEnabled: true,

            // Animações
            animationsEnabled: true,

            // Alto contraste
            highContrastMode: false,

            // Tema
            theme: 'light',                     // 'light' ou 'dark'

            // Mensagens
            notifications: [],

            // Breadcrumbs
            breadcrumbs: [],

            // Scroll positions (para restaurar ao voltar)
            scrollPositions: {}
        };

        // Observers
        this._listeners = [];

        // Carregar preferências do localStorage
        this._loadPreferences();

        console.log('✅ UIStateManager criado');
    }

    // ==================== PÁGINA ====================

    /**
     * Retorna página atual
     * @returns {string}
     */
    getCurrentPage() {
        return this._uiState.currentPage;
    }

    /**
     * Define página atual
     * @param {string} page - Nome da página
     */
    setCurrentPage(page) {
        // Salvar posição de scroll da página atual
        if (typeof window !== 'undefined') {
            this._uiState.scrollPositions[this._uiState.currentPage] = window.scrollY;
        }

        this._uiState.previousPage = this._uiState.currentPage;
        this._uiState.currentPage = page;

        this._notifyChange('page-changed', {
            current: page,
            previous: this._uiState.previousPage
        });

        console.log(`📄 Página alterada: ${page}`);
    }

    /**
     * Retorna página anterior
     * @returns {string|null}
     */
    getPreviousPage() {
        return this._uiState.previousPage;
    }

    /**
     * Volta para página anterior
     */
    goToPreviousPage() {
        if (this._uiState.previousPage) {
            this.setCurrentPage(this._uiState.previousPage);
        }
    }

    // ==================== VIEW ====================

    /**
     * Retorna view atual
     * @returns {string}
     */
    getCurrentView() {
        return this._uiState.currentView;
    }

    /**
     * Define view atual
     * @param {string} view - Nome da view
     */
    setCurrentView(view) {
        this._uiState.currentView = view;

        this._notifyChange('view-changed', { view });

        console.log(`👁️ View alterada: ${view}`);
    }

    // ==================== MODAIS ====================

    /**
     * Abre modal
     * @param {string} modalId - ID do modal
     */
    openModal(modalId) {
        if (!this._uiState.openModals.includes(modalId)) {
            this._uiState.openModals.push(modalId);

            this._notifyChange('modal-opened', {
                modalId,
                stack: [...this._uiState.openModals]
            });

            console.log(`📋 Modal aberto: ${modalId}`);
        }
    }

    /**
     * Fecha modal
     * @param {string} modalId - ID do modal
     */
    closeModal(modalId) {
        this._uiState.openModals = this._uiState.openModals.filter(id => id !== modalId);

        this._notifyChange('modal-closed', {
            modalId,
            stack: [...this._uiState.openModals]
        });

        console.log(`📋 Modal fechado: ${modalId}`);
    }

    /**
     * Fecha todos os modais
     */
    closeAllModals() {
        this._uiState.openModals = [];

        this._notifyChange('all-modals-closed', {});

        console.log('📋 Todos os modais fechados');
    }

    /**
     * Verifica se modal está aberto
     * @param {string} modalId - ID do modal
     * @returns {boolean}
     */
    isModalOpen(modalId) {
        return this._uiState.openModals.includes(modalId);
    }

    /**
     * Retorna modal do topo
     * @returns {string|null}
     */
    getTopModal() {
        return this._uiState.openModals[this._uiState.openModals.length - 1] || null;
    }

    // ==================== LOADING ====================

    /**
     * Inicia loading
     * @param {string} message - Mensagem de loading
     */
    startLoading(message = 'Carregando...') {
        this._uiState.isLoading = true;
        this._uiState.loadingMessage = message;

        this._notifyChange('loading-started', { message });
    }

    /**
     * Para loading
     */
    stopLoading() {
        this._uiState.isLoading = false;
        this._uiState.loadingMessage = '';

        this._notifyChange('loading-stopped', {});
    }

    /**
     * Verifica se está em loading
     * @returns {boolean}
     */
    isLoading() {
        return this._uiState.isLoading;
    }

    /**
     * Retorna mensagem de loading
     * @returns {string}
     */
    getLoadingMessage() {
        return this._uiState.loadingMessage;
    }

    // ==================== PREFERÊNCIAS ====================

    /**
     * Ativa/desativa tooltips
     * @param {boolean} enabled
     */
    setTooltipsEnabled(enabled) {
        this._uiState.tooltipsEnabled = enabled;
        this._savePreferences();

        this._notifyChange('tooltips-changed', { enabled });
    }

    /**
     * Verifica se tooltips estão habilitados
     * @returns {boolean}
     */
    areTooltipsEnabled() {
        return this._uiState.tooltipsEnabled;
    }

    /**
     * Ativa/desativa animações
     * @param {boolean} enabled
     */
    setAnimationsEnabled(enabled) {
        this._uiState.animationsEnabled = enabled;
        this._savePreferences();

        this._notifyChange('animations-changed', { enabled });
    }

    /**
     * Verifica se animações estão habilitadas
     * @returns {boolean}
     */
    areAnimationsEnabled() {
        return this._uiState.animationsEnabled;
    }

    /**
     * Ativa/desativa modo alto contraste
     * @param {boolean} enabled
     */
    setHighContrastMode(enabled) {
        this._uiState.highContrastMode = enabled;
        this._savePreferences();

        this._notifyChange('high-contrast-changed', { enabled });

        console.log(`♿ Alto contraste: ${enabled ? 'ativado' : 'desativado'}`);
    }

    /**
     * Verifica se modo alto contraste está ativo
     * @returns {boolean}
     */
    isHighContrastMode() {
        return this._uiState.highContrastMode;
    }

    /**
     * Define tema (light/dark)
     * @param {string} theme - 'light' ou 'dark'
     */
    setTheme(theme) {
        if (!['light', 'dark'].includes(theme)) {
            console.warn(`Tema inválido: ${theme}`);
            return;
        }

        this._uiState.theme = theme;
        this._savePreferences();

        this._notifyChange('theme-changed', { theme });

        console.log(`🎨 Tema alterado: ${theme}`);
    }

    /**
     * Retorna tema atual
     * @returns {string}
     */
    getTheme() {
        return this._uiState.theme;
    }

    /**
     * Alterna tema
     */
    toggleTheme() {
        const newTheme = this._uiState.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    // ==================== SIDEBAR ====================

    /**
     * Abre sidebar
     */
    openSidebar() {
        this._uiState.sidebarOpen = true;
        this._notifyChange('sidebar-opened', {});
    }

    /**
     * Fecha sidebar
     */
    closeSidebar() {
        this._uiState.sidebarOpen = false;
        this._notifyChange('sidebar-closed', {});
    }

    /**
     * Alterna sidebar
     */
    toggleSidebar() {
        this._uiState.sidebarOpen = !this._uiState.sidebarOpen;
        this._notifyChange('sidebar-toggled', { open: this._uiState.sidebarOpen });
    }

    /**
     * Colapsa/expande sidebar
     * @param {boolean} collapsed
     */
    setSidebarCollapsed(collapsed) {
        this._uiState.sidebarCollapsed = collapsed;
        this._notifyChange('sidebar-collapsed-changed', { collapsed });
    }

    /**
     * Verifica se sidebar está aberta
     * @returns {boolean}
     */
    isSidebarOpen() {
        return this._uiState.sidebarOpen;
    }

    // ==================== SCROLL ====================

    /**
     * Salva posição de scroll
     * @param {string} page - Página
     * @param {number} position - Posição Y
     */
    saveScrollPosition(page, position) {
        this._uiState.scrollPositions[page] = position;
    }

    /**
     * Recupera posição de scroll
     * @param {string} page - Página
     * @returns {number}
     */
    getScrollPosition(page) {
        return this._uiState.scrollPositions[page] || 0;
    }

    // ==================== BREADCRUMBS ====================

    /**
     * Define breadcrumbs
     * @param {Array<Object>} breadcrumbs - [{ label, page }]
     */
    setBreadcrumbs(breadcrumbs) {
        this._uiState.breadcrumbs = breadcrumbs;
        this._notifyChange('breadcrumbs-changed', { breadcrumbs });
    }

    /**
     * Retorna breadcrumbs
     * @returns {Array<Object>}
     */
    getBreadcrumbs() {
        return [...this._uiState.breadcrumbs];
    }

    // ==================== OBSERVER PATTERN ====================

    /**
     * Registra listener
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Callback
     * @returns {Function} - Função para desregistrar
     */
    subscribe(eventType, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }

        const listener = { eventType, callback };
        this._listeners.push(listener);

        return () => this.unsubscribe(eventType, callback);
    }

    /**
     * Remove listener
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Callback
     */
    unsubscribe(eventType, callback) {
        this._listeners = this._listeners.filter(
            l => !(l.eventType === eventType && l.callback === callback)
        );
    }

    /**
     * Notifica listeners
     * @private
     */
    _notifyChange(eventType, data) {
        const relevantListeners = this._listeners.filter(l => l.eventType === eventType);

        relevantListeners.forEach(listener => {
            try {
                listener.callback(data);
            } catch (error) {
                console.error(`Erro ao notificar listener de ${eventType}:`, error);
            }
        });

        // Evento customizado
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    }

    // ==================== PERSISTÊNCIA ====================

    /**
     * Salva preferências no localStorage
     * @private
     */
    _savePreferences() {
        if (typeof localStorage === 'undefined') return;

        try {
            const preferences = {
                tooltipsEnabled: this._uiState.tooltipsEnabled,
                animationsEnabled: this._uiState.animationsEnabled,
                highContrastMode: this._uiState.highContrastMode,
                theme: this._uiState.theme,
                sidebarCollapsed: this._uiState.sidebarCollapsed
            };

            localStorage.setItem('dashboardUIPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Erro ao salvar preferências:', error);
        }
    }

    /**
     * Carrega preferências do localStorage
     * @private
     */
    _loadPreferences() {
        if (typeof localStorage === 'undefined') return;

        try {
            const stored = localStorage.getItem('dashboardUIPreferences');
            if (stored) {
                const preferences = JSON.parse(stored);
                Object.assign(this._uiState, preferences);
                console.log('📥 Preferências de UI carregadas');
            }
        } catch (error) {
            console.warn('Erro ao carregar preferências:', error);
        }
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Retorna todo o estado da UI
     * @returns {Object}
     */
    getUIState() {
        return { ...this._uiState };
    }

    /**
     * Reseta estado da UI
     */
    reset() {
        this._uiState = {
            currentPage: 'home',
            previousPage: null,
            currentView: 'cronogramaView',
            openModals: [],
            sidebarOpen: true,
            sidebarCollapsed: false,
            isLoading: false,
            loadingMessage: '',
            tooltipsEnabled: true,
            animationsEnabled: true,
            highContrastMode: false,
            theme: 'light',
            notifications: [],
            breadcrumbs: [],
            scrollPositions: {}
        };

        this._savePreferences();
        this._notifyChange('ui-reset', {});

        console.log('🔄 Estado da UI resetado');
    }

    /**
     * Debug info
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            currentPage: this._uiState.currentPage,
            openModalsCount: this._uiState.openModals.length,
            isLoading: this._uiState.isLoading,
            theme: this._uiState.theme,
            listenersCount: this._listeners.length
        };
    }
}

// Criar instância global (Singleton)
if (typeof window !== 'undefined') {
    if (!window.uiStateManager) {
        window.uiStateManager = new UIStateManager();
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.UIStateManager = UIStateManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIStateManager;
}
