/**
 * App - Orquestrador principal da aplicação
 *
 * Responsabilidades:
 * - Inicializar todos os managers (State, UI, Features)
 * - Configurar EventBus e Router
 * - Gerenciar pipeline de dados (load → parse → transform → store)
 * - Coordenar comunicação entre módulos
 * - Fornecer backward compatibility com código legado
 *
 * @module 5-app/App
 */

class App {
    /**
     * Construtor do App
     */
    constructor() {
        // Feature flags (migração gradual)
        this.featureFlags = {
            USE_EVENT_BUS: true,
            USE_ROUTER: true,
            USE_NEW_PIPELINE: false,
            DEBUG_MODE: false
        };

        // Estado da aplicação
        this.isInitialized = false;
        this.isLoading = false;

        // Core modules
        this.eventBus = null;
        this.router = null;

        // State Managers
        this.dataStateManager = null;
        this.filterStateManager = null;
        this.uiStateManager = null;

        // UI Managers
        this.tableManager = null;
        this.chartManager = null;
        this.modalManager = null;
        this.sidebarManager = null;

        // Feature Managers
        this.searchManager = null;
        this.filterManager = null;
        this.calendarManager = null;
        this.timelineManager = null;
        this.reportsManager = null;
        this.keyboardManager = null;

        // Page Controllers
        this.pages = {
            home: null,
            calendar: null,
            timeline: null,
            reports: null,
            settings: null,
            tips: null
        };

        // Services
        this.fileService = null;
        this.cacheService = null;
        this.exportService = null;
        this.notificationService = null;

        console.log('✅ App instanciado');
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Inicializa a aplicação
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            console.warn('⚠️ App já foi inicializado');
            return;
        }

        console.log('🚀 Inicializando aplicação...');

        try {
            // 1. Carregar feature flags
            this._loadFeatureFlags();

            // 2. Inicializar EventBus
            this._initEventBus();

            // 3. Inicializar State Managers
            this._initStateManagers();

            // 4. Inicializar Services
            this._initServices();

            // 5. Inicializar UI Managers
            this._initUIManagers();

            // 6. Inicializar Feature Managers
            this._initFeatureManagers();

            // 7. Inicializar Page Controllers
            this._initPageControllers();

            // 8. Inicializar Router
            this._initRouter();

            // 9. Setup event listeners globais
            this._setupGlobalEventListeners();

            // 10. Setup event listeners de upload
            this._setupFileUploadListeners();

            // 11. Restaurar cache (se existir)
            await this._restoreCache();

            this.isInitialized = true;
            console.log('✅ Aplicação inicializada com sucesso');

            // Emitir evento de inicialização
            if (this.eventBus) {
                this.eventBus.emit('app:initialized');
            }

        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação:', error);
            this._handleInitError(error);
        }
    }

    // ==================== INICIALIZAÇÃO DE MÓDULOS ====================

    /**
     * Carrega feature flags do localStorage
     * @private
     */
    _loadFeatureFlags() {
        try {
            const saved = localStorage.getItem('featureFlags');
            if (saved) {
                this.featureFlags = { ...this.featureFlags, ...JSON.parse(saved) };
            }

            // Aplicar flags globais
            if (typeof window !== 'undefined') {
                window.FEATURE_FLAGS = this.featureFlags;
            }

            console.log('🚩 Feature flags carregadas:', this.featureFlags);
        } catch (error) {
            console.warn('⚠️ Erro ao carregar feature flags:', error);
        }
    }

    /**
     * Inicializa EventBus
     * @private
     */
    _initEventBus() {
        if (!this.featureFlags.USE_EVENT_BUS) {
            console.log('⏭️ EventBus desabilitado por feature flag');
            return;
        }

        if (typeof EventBus !== 'undefined') {
            this.eventBus = EventBus.getInstance();
            this.eventBus.setDebugMode(this.featureFlags.DEBUG_MODE);
            console.log('✅ EventBus inicializado');
        } else {
            console.warn('⚠️ EventBus não disponível');
        }
    }

    /**
     * Inicializa State Managers
     * @private
     */
    _initStateManagers() {
        // DataStateManager (Singleton global)
        if (typeof window !== 'undefined' && window.dataStateManager) {
            this.dataStateManager = window.dataStateManager;
            console.log('✅ DataStateManager conectado');
        } else {
            console.error('❌ DataStateManager não disponível');
        }

        // FilterStateManager (Singleton global)
        if (typeof window !== 'undefined' && window.filterStateManager) {
            this.filterStateManager = window.filterStateManager;
            console.log('✅ FilterStateManager conectado');
        } else {
            console.warn('⚠️ FilterStateManager não disponível');
        }

        // UIStateManager (Singleton global)
        if (typeof window !== 'undefined' && window.uiStateManager) {
            this.uiStateManager = window.uiStateManager;
            console.log('✅ UIStateManager conectado');
        } else {
            console.warn('⚠️ UIStateManager não disponível');
        }
    }

    /**
     * Inicializa Services
     * @private
     */
    _initServices() {
        // FileService
        if (typeof FileService !== 'undefined') {
            this.fileService = FileService;
            console.log('✅ FileService disponível');
        }

        // CacheService
        if (typeof CacheService !== 'undefined') {
            this.cacheService = CacheService;
            console.log('✅ CacheService disponível');
        }

        // ExportService
        if (typeof ExportService !== 'undefined') {
            this.exportService = ExportService;
            console.log('✅ ExportService disponível');
        }

        // NotificationService
        if (typeof NotificationService !== 'undefined') {
            this.notificationService = NotificationService;
            console.log('✅ NotificationService disponível');
        }
    }

    /**
     * Inicializa UI Managers
     * @private
     */
    _initUIManagers() {
        // TableManager
        if (typeof TableManager !== 'undefined') {
            this.tableManager = new TableManager(this);
            console.log('✅ TableManager inicializado');
        }

        // ChartManager
        if (typeof ChartManager !== 'undefined') {
            this.chartManager = new ChartManager(this);
            console.log('✅ ChartManager inicializado');
        }

        // ModalManager
        if (typeof ModalManager !== 'undefined') {
            this.modalManager = new ModalManager(this);
            console.log('✅ ModalManager inicializado');

            // Inicializar internamente para registrar listeners e preparar modais
            try {
                if (typeof this.modalManager.init === 'function') this.modalManager.init();
            } catch (e) {
                console.warn('⚠️ Falha ao inicializar ModalManager:', e);
            }

            // Backward compatibility for customModal
            window.customModal = {
                alert: (msg, title) => this.modalManager.alert(msg, title),
                confirm: (msg, title) => this.modalManager.confirm(msg, title)
            };
        }



        // SidebarManager
        if (typeof SidebarManager !== 'undefined') {
            this.sidebarManager = new SidebarManager(this);
            this.sidebarManager.init();
            console.log('✅ SidebarManager inicializado');
        }
    }

    /**
     * Inicializa Feature Managers
     * @private
     */
    _initFeatureManagers() {
        // SearchManager
        if (typeof SearchManager !== 'undefined') {
            this.searchManager = new SearchManager(this);
            console.log('✅ SearchManager inicializado');
        }

        // FilterManager
        if (typeof FilterManager !== 'undefined') {
            this.filterManager = new FilterManager(this);
            console.log('✅ FilterManager inicializado');
        }

        // AdvancedFilterManager (portado from legacy)
        if (typeof AdvancedFilterManager !== 'undefined') {
            this.advancedFilterManager = new AdvancedFilterManager(this);
            window.advancedFilterManager = this.advancedFilterManager;
            console.log('✅ AdvancedFilterManager inicializado');
        } else {
            console.log('ℹ️ AdvancedFilterManager não disponível');
        }

        // CalendarManager
        if (typeof CalendarManager !== 'undefined') {
            this.calendarManager = new CalendarManager(this);
            console.log('✅ CalendarManager inicializado');
        }

        // TimelineManager
        if (typeof TimelineManager !== 'undefined') {
            this.timelineManager = new TimelineManager(this);
            console.log('✅ TimelineManager inicializado');
        }

        // ReportsManager
        if (typeof ReportsManager !== 'undefined') {
            this.reportsManager = new ReportsManager(this);
            console.log('✅ ReportsManager inicializado');
        }

        // KeyboardManager
        if (typeof KeyboardManager !== 'undefined') {
            this.keyboardManager = new KeyboardManager(this);
            console.log('✅ KeyboardManager inicializado');
        }
    }

    /**
     * Inicializa Page Controllers
     * @private
     */
    _initPageControllers() {
        // HomePage
        if (typeof HomePage !== 'undefined') {
            this.pages.home = new HomePage(this);
            this.pages.home.init();
            console.log('✅ HomePage inicializado');
        }

        // CalendarPage
        if (typeof CalendarPage !== 'undefined') {
            this.pages.calendar = new CalendarPage(this);
            this.pages.calendar.init();
            console.log('✅ CalendarPage inicializado');
        }

        // TimelinePage
        if (typeof TimelinePage !== 'undefined') {
            this.pages.timeline = new TimelinePage(this);
            this.pages.timeline.init();
            console.log('✅ TimelinePage inicializado');
        }

        // ReportsPage
        if (typeof ReportsPage !== 'undefined') {
            this.pages.reports = new ReportsPage(this);
            this.pages.reports.init();
            console.log('✅ ReportsPage inicializado');
        }

        // SettingsPage
        if (typeof SettingsPage !== 'undefined') {
            this.pages.settings = new SettingsPage(this);
            this.pages.settings.init();
            console.log('✅ SettingsPage inicializado');
        }

        // TipsPage
        if (typeof TipsPage !== 'undefined') {
            this.pages.tips = new TipsPage(this);
            this.pages.tips.init();
            console.log('✅ TipsPage inicializado');
        }
    }

    /**
     * Inicializa Router e registra rotas
     * @private
     */
    _initRouter() {
        if (!this.featureFlags.USE_ROUTER) {
            console.log('⏭️ Router desabilitado por feature flag');
            return;
        }

        if (typeof Router !== 'undefined') {
            this.router = Router.getInstance();

            // Registrar rotas ANTES de inicializar (para evitar erro de rota não encontrada)
            this._registerRoutes();

            // Inicializar router (vai processar rota inicial)
            this.router.init(this.eventBus);

            console.log('✅ Router inicializado');
        } else {
            console.warn('⚠️ Router não disponível');
        }
    }

    /**
     * Registra todas as rotas da aplicação
     * @private
     */
    _registerRoutes() {
        if (!this.router) return;

        // Rota padrão
        this.router.setDefaultRoute('/');

        // Registrar rotas
        const routes = [
            { path: '/', controller: this.pages.home },
            { path: '/home', controller: this.pages.home },
            { path: '/calendar', controller: this.pages.calendar },
            { path: '/timeline', controller: this.pages.timeline },
            { path: '/reports', controller: this.pages.reports },
            { path: '/settings', controller: this.pages.settings },
            { path: '/tips', controller: this.pages.tips }
        ];

        routes.forEach(route => {
            if (route.controller) {
                this.router.register(route.path, route.controller);
            }
        });

        console.log('✅ Rotas registradas');
    }

    /**
     * Setup de event listeners globais
     * @private
     */
    _setupGlobalEventListeners() {
        if (!this.eventBus) return;

        // Listener para erros globais
        this.eventBus.on('error:occurred', (error) => {
            console.error('❌ Erro global:', error);
            if (this.notificationService) {
                this.notificationService.error('Ocorreu um erro. Por favor, tente novamente.');
            }
        });

        // Listener para mudanças de tema
        this.eventBus.on('ui:theme-changed', (theme) => {
            console.log('🎨 Tema alterado:', theme);
        });

        console.log('✅ Event listeners globais configurados');
    }

    /**
     * Setup de event listeners de upload
     * @private
     */
    _setupFileUploadListeners() {
        const uploadButton = document.getElementById('uploadButton');
        const fileInput = document.getElementById('fileInput');

        if (!uploadButton || !fileInput) {
            console.warn('⚠️ Elementos de upload não encontrados');
            return;
        }

        // Botão de upload abre o file input
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });

        // File input processa o arquivo
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.loadFile(file);
                // Limpar input para permitir recarregar o mesmo arquivo
                e.target.value = '';
            }
        });

        console.log('✅ Event listeners de upload configurados');
    }

    // ==================== CARREGAMENTO DE DADOS ====================

    /**
     * Carrega arquivo e processa dados
     * @param {File} file - Arquivo CSV/Excel
     * @returns {Promise<void>}
     */
    async loadFile(file) {
        if (!file) {
            throw new Error('Arquivo não fornecido');
        }

        console.log('📂 Carregando arquivo:', file.name);

        try {
            this.isLoading = true;

            // Emitir evento de início
            if (this.eventBus) {
                this.eventBus.emit('ui:loading-started', { file: file.name });
            }

            // 1. Validar arquivo
            const validation = this.fileService?.validateFile(file);
            if (validation && !validation.valid) {
                throw new Error(validation.error);
            }

            // 2. Carregar dados
            const { content, metadata } = await this._loadFileData(file);

            // 3. Parsear dados
            const parsedData = await this._parseData(content);

            // 4. Transformar dados
            const transformedData = await this._transformData(parsedData);

            // 5. Armazenar no DataStateManager
            if (this.dataStateManager) {
                this.dataStateManager.setAllServidores(transformedData);
                this.dataStateManager.setFilteredServidores(transformedData);
            }

            // 6. Salvar no cache
            if (this.cacheService) {
                await this.cacheService.saveToCache(file.name, transformedData);
            }

            // Emitir evento de sucesso
            if (this.eventBus) {
                this.eventBus.emit('data:loaded', {
                    fileName: file.name,
                    count: transformedData.length
                });
            }

            // Notificar usuário
            if (this.notificationService) {
                this.notificationService.success(
                    `Arquivo carregado: ${transformedData.length} registros`
                );
            }

            console.log(`✅ Arquivo carregado: ${transformedData.length} registros`);

        } catch (error) {
            console.error('❌ Erro ao carregar arquivo:', error);

            // Emitir evento de erro
            if (this.eventBus) {
                this.eventBus.emit('error:occurred', error);
            }

            // Notificar usuário
            if (this.notificationService) {
                this.notificationService.error(`Erro ao carregar arquivo: ${error.message}`);
            }

            throw error;

        } finally {
            this.isLoading = false;

            // Emitir evento de fim
            if (this.eventBus) {
                this.eventBus.emit('ui:loading-completed');
            }
        }
    }

    /**
     * Carrega dados do arquivo
     * @private
     * @param {File} file - Arquivo
     * @returns {Promise<{content: string, metadata: Object}>}
     */
    async _loadFileData(file) {
        // Usar FileService para processar arquivo (CSV ou Excel)
        if (typeof FileService !== 'undefined') {
            return await FileService.processFile(file);
        }

        // Fallback: ler arquivo manualmente como CSV
        const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });

        return {
            content,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type
            }
        };
    }

    /**
     * Parseia dados CSV
     * @private
     * @param {string} rawData - Dados brutos
     * @returns {Promise<Array>}
     */
    async _parseData(rawData) {
        if (typeof DataParser !== 'undefined') {
            return DataParser.parseCSV(rawData);
        }

        // Fallback: usar parser legado se disponível
        if (typeof window !== 'undefined' && window.cronogramaParser) {
            return window.cronogramaParser.parse(rawData);
        }

        throw new Error('Parser não disponível');
    }

    /**
     * Transforma dados (enriquecimento)
     * @private
     * @param {Array} parsedData - Dados parseados
     * @returns {Promise<Array>}
     */
    async _transformData(parsedData) {
        if (typeof DataTransformer !== 'undefined') {
            // Use enrichServidoresBatch para enriquecer array de servidores
            return DataTransformer.enrichServidoresBatch(parsedData);
        }

        // Fallback: retornar dados sem transformação
        console.warn('⚠️ DataTransformer não disponível, dados não serão enriquecidos');
        return parsedData;
    }

    /**
     * Restaura dados do cache
     * @private
     * @returns {Promise<void>}
     */
    async _restoreCache() {
        if (!this.cacheService) {
            return;
        }

        try {
            const cached = await this.cacheService.getLatestCache();
            if (cached && cached.data) {
                console.log('💾 Restaurando dados do cache...');

                if (this.dataStateManager) {
                    this.dataStateManager.setAllServidores(cached.data);
                    this.dataStateManager.setFilteredServidores(cached.data);
                }

                if (this.notificationService) {
                    this.notificationService.info('Dados anteriores restaurados do cache');
                }

                console.log(`✅ Cache restaurado: ${cached.data.length} registros`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao restaurar cache:', error);
        }
    }

    // ==================== FILTROS E BUSCA ====================

    /**
     * Aplica filtros aos dados
     */
    applyFilters() {
        if (!this.dataStateManager || !this.filterStateManager) {
            console.warn('⚠️ Managers não disponíveis para aplicar filtros');
            return;
        }

        const allData = this.dataStateManager.getAllServidores();
        const filters = this.filterStateManager.getActiveFilters();

        // Aplicar filtros usando FilterManager ou DataFilter
        let filtered = allData;

        if (this.filterManager && typeof this.filterManager.applyFilters === 'function') {
            filtered = this.filterManager.applyFilters(allData, filters);
        } else if (typeof DataFilter !== 'undefined') {
            filtered = DataFilter.applyFilters(allData, filters);
        }

        // Atualizar dados filtrados
        this.dataStateManager.setFilteredServidores(filtered);

        // Emitir evento
        if (this.eventBus) {
            this.eventBus.emit('filter:applied', {
                filters,
                resultCount: filtered.length
            });
        }

        console.log(`🔍 Filtros aplicados: ${filtered.length} resultados`);
    }

    // ==================== NAVEGAÇÃO ====================

    /**
     * Navega para uma página
     * @param {string} page - Nome da página (ex: 'home', 'calendar', 'timeline')
     */
    navigateToPage(page) {
        if (!this.router) {
            console.warn('⚠️ Router não disponível para navegação');
            return;
        }

        // Mapear nome da página para rota
        const routeMap = {
            'home': '/',
            'calendar': '/calendar',
            'timeline': '/timeline',
            'reports': '/reports',
            'settings': '/settings',
            'tips': '/tips'
        };

        const route = routeMap[page] || `/${page}`;

        // Navegar usando o router
        this.router.navigate(route);

        console.log(`🧭 Navegando para: ${page} (rota: ${route})`);
    }

    // ==================== TRATAMENTO DE ERROS ====================

    /**
     * Trata erro de inicialização
     * @private
     * @param {Error} error - Erro ocorrido
     */
    _handleInitError(error) {
        console.error('❌ Erro crítico na inicialização:', error);

        // Tentar notificar usuário
        if (this.notificationService) {
            this.notificationService.error(
                'Erro ao inicializar aplicação. Por favor, recarregue a página.'
            );
        } else {
            alert('Erro ao inicializar aplicação. Por favor, recarregue a página.');
        }
    }

    // ==================== INTERAÇÃO UI ====================

    /**
     * Manipula clique na linha da tabela
     * @param {Object} servidor 
     */
    onRowClick(servidor) {
        this.showServidorDetails(servidor);
    }

    /**
     * Mostra detalhes do servidor
     * @param {Object} servidor 
     */
    showServidorDetails(servidor) {
        if (this.modalManager) {
            this.modalManager.showServidorDetails(servidor);
        } else {
            console.warn('ModalManager não disponível');
            if (this.notificationService) {
                this.notificationService.info(`Servidor: ${servidor.nome || servidor.servidor}`);
            }
        }
    }

}

// ==================== EXPORTAÇÃO E BACKWARD COMPATIBILITY ====================

// Criar instância global
if (typeof window !== 'undefined') {
    window.app = new App();

    // Backward compatibility: alias para dashboard
    window.dashboard = window.app;

    // Remover Auto-inicialização aqui para evitar conflito com index.html
    // O index.html já chama window.app.init()
}

// Expor classe também
if (typeof window !== 'undefined') {
    window.App = App;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
