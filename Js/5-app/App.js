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
        this.authService = null;

        // Authentication state
        this.isAuthenticated = false;
        this.currentUser = null;

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

            // 4. Inicializar Services (incluindo autenticação)
            await this._initServices();

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

            // Após restaurar cache, tentar carregar dados automaticamente
            try {
                await this._loadPrimaryData();
            } catch (e) {
                console.warn('Auto-load de dados primários não realizado:', e && e.message);
            }

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

        // LotacaoHierarchyManager (Singleton global para hierarquia organizacional)
        if (typeof LotacaoHierarchyManager !== 'undefined') {
            if (!window.lotacaoHierarchyManager) {
                window.lotacaoHierarchyManager = new LotacaoHierarchyManager();
            }
            this.lotacaoHierarchyManager = window.lotacaoHierarchyManager;
            console.log('✅ LotacaoHierarchyManager inicializado');
        } else {
            console.warn('⚠️ LotacaoHierarchyManager não disponível');
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
    async _initServices() {
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

        // AuthenticationService
        if (typeof AuthenticationService !== 'undefined') {
            this.authService = AuthenticationService;
            await this._initAuthenticationService();
        }
    }

    /**
     * Inicializa o serviço de autenticação Microsoft
     * @private
     */
    async _initAuthenticationService() {
        try {
            const config = window.__ENV__ || {};

            if (!config.AZURE_CLIENT_ID || !config.AZURE_TENANT_ID) {
                console.warn('⚠️ Configuração Azure incompleta - autenticação desabilitada');
                return;
            }

            const redirectUri = (function() {
                // If running on localhost, prefer auto to allow dev redirect
                try {
                    const host = window.location && window.location.hostname;
                    if (host === 'localhost' || host === '127.0.0.1') return 'auto';
                } catch (e) {}
                return config.AZURE_REDIRECT_URI || window.location.origin;
            })();

            await this.authService.init({
                clientId: config.AZURE_CLIENT_ID,
                tenantId: config.AZURE_TENANT_ID,
                redirectUri
            });

            // Verificar se já está autenticado
            if (this.authService.isAuthenticated()) {
                this.isAuthenticated = true;
                this.currentUser = this.authService.getCurrentUser();
                console.log('✅ Usuário já autenticado:', this.currentUser.username);
                this._updateAuthUI();
            } else {
                // Mostrar tela de login se não autenticado
                this._showLoginScreen();
            }

            console.log('✅ AuthenticationService inicializado');

        } catch (error) {
            console.error('❌ Erro ao inicializar AuthenticationService:', error);
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
            // LicenseEditModal (UI para editar/criar linhas na tabela do SharePoint)
            if (typeof LicenseEditModal !== 'undefined') {
                try {
                    this.licenseEditModal = new LicenseEditModal(this);
                    if (typeof this.licenseEditModal.init === 'function') this.licenseEditModal.init();
                    console.log('✅ LicenseEditModal inicializado');
                } catch (e) {
                    console.warn('⚠️ Falha ao inicializar LicenseEditModal:', e);
                }
            }
        }

        // HeaderManager
        if (typeof HeaderManager !== 'undefined') {
            this.headerManager = new HeaderManager(this);
            this.headerManager.init();
            console.log('✅ HeaderManager inicializado');
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

        // AdvancedFiltersBuilder (UI para construção visual de filtros)
        if (typeof AdvancedFiltersBuilder !== 'undefined') {
            this.advancedFiltersBuilder = new AdvancedFiltersBuilder(this);
            window.advancedFiltersBuilder = this.advancedFiltersBuilder;
            console.log('✅ AdvancedFiltersBuilder inicializado');
        } else {
            console.log('ℹ️ AdvancedFiltersBuilder não disponível');
        }

        // Ensure a single HierarchyFilterModal instance is available and wired
        if (typeof HierarchyFilterModal !== 'undefined') {
            if (!window.hierarchyFilterModal) {
                try {
                    window.hierarchyFilterModal = new HierarchyFilterModal({
                        onApply: (selection) => {
                            try {
                                // prefer AdvancedFiltersBuilder flow if available
                                if (this.advancedFiltersBuilder && typeof this.advancedFiltersBuilder.handleHierarchyFilterApply === 'function') {
                                    this.advancedFiltersBuilder.handleHierarchyFilterApply(selection);
                                } else if (this.advancedFilterManager && typeof this.advancedFilterManager.setFilter === 'function') {
                                    // setLotacao-like filter: pass lotacoes array
                                    this.advancedFilterManager.setFilter('lotacao', selection.lotacoes || []);
                                    try { if (this.advancedFilterManager.renderActiveFiltersList) this.advancedFilterManager.renderActiveFiltersList(); } catch(e){}
                                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                                }
                            } catch (e) { console.warn('Erro no onApply do HierarchyFilterModal', e); }
                        }
                    });
                    console.log('✅ HierarchyFilterModal singleton criado');
                } catch (e) {
                    console.warn('⚠️ Falha ao instanciar HierarchyFilterModal:', e);
                }
            }
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

        // LicenseEditModal (SharePoint CRUD)
        if (typeof LicenseEditModal !== 'undefined') {
            this.licenseEditModal = new LicenseEditModal(this);
            this.licenseEditModal.init();
            console.log('✅ LicenseEditModal inicializado');
        } else {
            console.log('ℹ️ LicenseEditModal não disponível');
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
        // Configure eventBus listeners only if EventBus exists
        if (this.eventBus) {
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

            console.log('✅ EventBus listeners configurados');
        } else {
            console.log('ℹ️ EventBus não disponível — registrando listeners DOM');
        }

        // Apply advanced filters to the dataset when filters change (register on document regardless of EventBus)
        document.addEventListener('advanced-filters-changed', (ev) => {
            try {
                const mgr = this.advancedFilterManager || window.advancedFilterManager;
                if (!mgr || !this.dataStateManager) return;
                const all = this.dataStateManager.getAllServidores() || [];
                const beforeCount = all.length;
                // Log incoming event detail if present
                if (ev && ev.detail && ev.detail.filters) {
                    console.log('🔔 advanced-filters-changed payload:', ev.detail.filters);
                } else {
                    console.log('🔔 advanced-filters-changed (no payload) — using manager state');
                }
                console.log('🔍 Applying filters (active):', mgr.activeFilters || mgr.getStats && mgr.getStats().activeFilters);
                const filtered = mgr.applyFilters ? mgr.applyFilters(all || []) : all || [];
                this.dataStateManager.setFilteredServidores(filtered || []);
                console.log(`🔁 Advanced filters applied — before: ${beforeCount}, after: ${filtered.length}`);
            } catch (e) {
                console.warn('Erro ao aplicar advanced-filters-changed:', e);
            }
        });
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
            // 1. Parse do CSV (cada linha vira um objeto)
            const rawRows = DataParser.parseCSV(rawData);
            console.log(`📋 CSV parseado: ${rawRows.length} linhas`);

            // 2. Agrupar por servidor (agregando licenças)
            const servidores = DataParser.groupByServidor(rawRows);
            console.log(`👥 Servidores agregados: ${servidores.length} servidores`);

            return servidores;
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

                let restored = cached.data;
                // Se disponível, garantir que dados restaurados sejam enriquecidos/normalizados
                try {
                    if (typeof DataTransformer !== 'undefined' && DataTransformer.enrichServidoresBatch) {
                        restored = DataTransformer.enrichServidoresBatch(restored);
                        console.log(`💠 Dados do cache enriquecidos: ${restored.length} registros`);
                    }
                } catch (e) {
                    console.warn('⚠️ Falha ao enriquecer dados do cache, usando dados originais', e);
                }

                if (this.dataStateManager) {
                    this.dataStateManager.setAllServidores(restored);
                    this.dataStateManager.setFilteredServidores(restored);
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

    /**
     * Tenta carregar os dados primários automaticamente se possível.
     * Faz uma tentativa silenciosa de obter token antes de acionar o loader para evitar popups inesperados.
     * @private
     */
    async _loadPrimaryData() {
        try {
            if (!this.dataStateManager) return;

            // Se já temos dados carregados do cache, não forçar reload
            if (this.dataStateManager.hasData()) {
                console.log('Auto-load: dados já presentes, pulando carregamento automático');
                return;
            }

            // Tentar obter token silencioso para Files.Read — se não houver token, não forçar interação
            if (!this.authService) {
                console.warn('Auto-load: AuthenticationService não disponível — pulando carregamento automático');
                return;
            }

            const silentToken = await this.authService.acquireTokenSilentOnly(['Files.Read']);
            if (!silentToken) {
                console.log('Auto-load: token silencioso não disponível — não iniciando fluxo interativo automaticamente');
                return;
            }

            console.log('Auto-load: token silencioso disponível — iniciando DataLoader.loadFromSource');

            if (typeof DataLoader === 'undefined' || !DataLoader.loadFromSource) {
                console.warn('DataLoader não disponível para carregar dados primários');
                return;
            }

            const data = await DataLoader.loadFromSource('primary');
            if (data && Array.isArray(data)) {
                console.log(`Auto-load: ${data.length} registros carregados do source 'primary'`);
                // DataLoader already populates dataStateManager, but ensure it's set
                try {
                    this.dataStateManager.setAllServidores(data);
                    this.dataStateManager.setFilteredServidores(data);
                } catch (e) { /* ignore */ }
            }

        } catch (error) {
            console.warn('Auto-load failure:', error && (error.message || error));
            throw error;
        }
    }

    // ==================== AUTENTICAÇÃO ====================

    /**
     * Mostra a tela de login personalizada
     * @private
     */
    _showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.style.display = 'flex';
            loginScreen.setAttribute('aria-hidden', 'false');

            // Setup do botão de login (remover listeners duplicados)
            const loginButton = document.getElementById('loginButton');
            if (loginButton && !loginButton._loginListenerAttached) {
                loginButton.addEventListener('click', () => this.login());
                loginButton._loginListenerAttached = true;
            }
        }
    }

    /**
     * Esconde a tela de login
     * @private
     */
    _hideLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
            loginScreen.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Realiza login via Microsoft
     * @returns {Promise<void>}
     */
    async login() {
        if (!this.authService) {
            console.error('AuthenticationService não disponível');
            return;
        }

        try {
            const loginButton = document.getElementById('loginButton');
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.innerHTML = `
                    <svg width="20" height="20" fill="white" viewBox="0 0 23 23">
                        <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
                    </svg>
                    Abrindo popup...
                `;
            }

            const userInfo = await this.authService.login();

            this.isAuthenticated = true;
            this.currentUser = userInfo;

            console.log('✅ Login realizado com sucesso:', userInfo.username);

            this._hideLoginScreen();
            this._updateAuthUI();

            if (this.notificationService) {
                this.notificationService.success(`Bem-vindo, ${userInfo.name || userInfo.username}!`);
            }

        } catch (error) {
            console.error('Erro no login:', error);

            const loginButton = document.getElementById('loginButton');
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.innerHTML = `
                    <svg width="20" height="20" fill="white" viewBox="0 0 23 23">
                        <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
                    </svg>
                    Entrar com Conta Microsoft
                `;
            }

            if (this.notificationService) {
                this.notificationService.error('Falha no login. Tente novamente.');
            }
        }
    }

    /**
     * Realiza logout
     * @returns {Promise<void>}
     */
    async logout() {
        if (!this.authService) {
            console.error('AuthenticationService não disponível');
            return;
        }

        try {
            await this.authService.logout();

            this.isAuthenticated = false;
            this.currentUser = null;

            this._updateAuthUI();
            this._showLoginScreen();

            if (this.notificationService) {
                this.notificationService.info('Sessão encerrada com sucesso');
            }

        } catch (error) {
            console.error('Erro no logout:', error);

            if (this.notificationService) {
                this.notificationService.error('Erro ao encerrar sessão');
            }
        }
    }

    /**
     * Atualiza UI com informações de autenticação
     * @private
     */
    _updateAuthUI() {
        // Atualizar sidebar user account
        const userAvatar = document.getElementById('sidebarUserAvatar');
        const userName = document.getElementById('sidebarUserName');
        const userEmail = document.getElementById('sidebarUserEmail');
        const loginButton = document.getElementById('sidebarUserLogin');
        const logoutButton = document.getElementById('sidebarUserLogout');

        if (this.isAuthenticated && this.currentUser) {
            // Atualizar avatar
            if (userAvatar) {
                const initials = this.currentUser.name
                    ? this.currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    : 'U';
                userAvatar.querySelector('span').textContent = initials;
            }

            // Atualizar nome e email
            if (userName) {
                userName.textContent = this.currentUser.name || 'Usuário';
            }
            if (userEmail) {
                userEmail.textContent = this.currentUser.username || 'Não conectado';
            }

            // Mostrar botão de logout
            if (loginButton) loginButton.style.display = 'none';
            if (logoutButton) {
                logoutButton.style.display = 'block';
                if (!logoutButton._logoutListenerAttached) {
                    logoutButton.addEventListener('click', () => this.logout());
                    logoutButton._logoutListenerAttached = true;
                }
            }

            // Tentar obter foto do usuário
            this._loadUserPhoto();

            // Mostrar botão de novo registro se usuário autenticado e tem dados do SharePoint
            this._updateNewRecordButton();

        } else {
            // Estado não autenticado
            if (userAvatar) {
                userAvatar.querySelector('span').textContent = 'U';
            }
            if (userName) {
                userName.textContent = 'Usuário';
            }
            if (userEmail) {
                userEmail.textContent = 'Não conectado';
            }

            // Mostrar botão de login
            if (loginButton) {
                loginButton.style.display = 'block';
                if (!loginButton._loginListenerAttached) {
                    loginButton.addEventListener('click', () => this.login());
                    loginButton._loginListenerAttached = true;
                }
            }
            if (logoutButton) logoutButton.style.display = 'none';

            // Esconder botão de novo registro
            const newRecordButton = document.getElementById('newRecordButton');
            if (newRecordButton) newRecordButton.style.display = 'none';
        }
    }

    /**
     * Atualiza visibilidade e estado do botão de novo registro
     * @private
     */
    async _updateNewRecordButton() {
        const newRecordButton = document.getElementById('newRecordButton');
        if (!newRecordButton) return;

        try {
            // Verificar se tem metadados do SharePoint (fileId disponível)
            const meta = this.dataStateManager && typeof this.dataStateManager.getSourceMetadata === 'function'
                ? this.dataStateManager.getSourceMetadata()
                : null;

            if (!meta || !meta.fileId) {
                newRecordButton.style.display = 'none';
                return;
            }

            // Verificar permissões de escrita
            if (typeof PermissionsService !== 'undefined') {
                const canEdit = await PermissionsService.canEdit(meta.fileId);
                if (canEdit) {
                    newRecordButton.style.display = 'inline-flex';

                    // Adicionar event listener (apenas uma vez)
                    if (!newRecordButton._clickListenerAttached) {
                        newRecordButton.addEventListener('click', () => this._handleNewRecord());
                        newRecordButton._clickListenerAttached = true;
                    }
                } else {
                    newRecordButton.style.display = 'none';
                }
            } else {
                // Se PermissionsService não disponível, mostrar o botão
                newRecordButton.style.display = 'inline-flex';

                if (!newRecordButton._clickListenerAttached) {
                    newRecordButton.addEventListener('click', () => this._handleNewRecord());
                    newRecordButton._clickListenerAttached = true;
                }
            }
        } catch (error) {
            console.warn('Erro ao atualizar botão de novo registro:', error);
            newRecordButton.style.display = 'none';
        }
    }

    /**
     * Manipula clique no botão de novo registro
     * @private
     */
    _handleNewRecord() {
        if (this.licenseEditModal && typeof this.licenseEditModal.open === 'function') {
            this.licenseEditModal.open({ mode: 'create', row: null, rowIndex: null });
        } else {
            console.warn('LicenseEditModal não disponível');
            if (this.notificationService) {
                this.notificationService.error('Modal de edição não disponível');
            }
        }
    }

    /**
     * Carrega foto do usuário do Microsoft Graph
     * @private
     */
    async _loadUserPhoto() {
        if (!this.authService || !this.isAuthenticated) return;

        try {
            const photoUrl = await this.authService.getUserPhoto();
            if (photoUrl) {
                const userAvatar = document.getElementById('sidebarUserAvatar');
                if (userAvatar) {
                    userAvatar.style.backgroundImage = `url(${photoUrl})`;
                    userAvatar.style.backgroundSize = 'cover';
                    userAvatar.querySelector('span').style.display = 'none';
                }
            }
        } catch (error) {
            console.warn('Não foi possível carregar foto do usuário:', error);
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

    /**
     * Handler para clique no gráfico de status de licenças
     * Abre os filtros avançados com o status pré-selecionado
     * @param {string} statusKey - Chave do status clicado (agendadas, emAndamento, concluidas, naoAgendadas)
     */
    onStatusChartClick(statusKey) {
        console.log(`📊 Clique no gráfico de status: ${statusKey}`);

        // Verificar se AdvancedFiltersBuilder está disponível
        const advancedFiltersBuilder = this.pages?.home?.advancedFiltersBuilder;
        if (!advancedFiltersBuilder) {
            console.warn('AdvancedFiltersBuilder não disponível');
            return;
        }

        // Mapear o statusKey para o label com emoji
        const statusLabels = {
            'agendadas': '📅 Agendadas',
            'emAndamento': '⏳ Em Andamento',
            'concluidas': '✅ Concluídas',
            'naoAgendadas': '❌ Não Agendadas'
        };

        const statusLabel = statusLabels[statusKey];
        if (!statusLabel) {
            console.warn(`Status desconhecido: ${statusKey}`);
            return;
        }

        // Abrir modal de filtros avançados
        advancedFiltersBuilder.openModal();

        // Aguardar um momento para o modal renderizar
        setTimeout(() => {
            // Abrir popup de configuração do filtro de status
            advancedFiltersBuilder.openFilterConfigPopup('status');

            // Aguardar mais um momento para o formulário renderizar
            setTimeout(() => {
                // Selecionar automaticamente o status clicado
                const availableList = document.querySelector('[data-dual-list="status"] .dual-list-available');
                if (availableList) {
                    // Encontrar o item na lista disponível
                    const items = availableList.querySelectorAll('.dual-list-item');
                    items.forEach(item => {
                        if (item.textContent.trim() === statusLabel) {
                            // Simular clique no item para selecioná-lo
                            item.click();
                        }
                    });
                }
            }, 100);
        }, 100);
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
