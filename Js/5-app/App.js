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
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Inicializa a aplicação
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

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
        } catch (error) {
            // Ignora erro silenciosamente
        }
    }

    /**
     * Inicializa EventBus
     * @private
     */
    _initEventBus() {
        if (!this.featureFlags.USE_EVENT_BUS) {
            return;
        }

        if (typeof EventBus !== 'undefined') {
            this.eventBus = EventBus.getInstance();
            this.eventBus.setDebugMode(this.featureFlags.DEBUG_MODE);
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
        }

        // FilterStateManager (Singleton global)
        if (typeof window !== 'undefined' && window.filterStateManager) {
            this.filterStateManager = window.filterStateManager;
        }

        // UIStateManager (Singleton global)
        if (typeof window !== 'undefined' && window.uiStateManager) {
            this.uiStateManager = window.uiStateManager;
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
        }

        // CacheService
        if (typeof CacheService !== 'undefined') {
            this.cacheService = CacheService;
        }

        // ExportService
        if (typeof ExportService !== 'undefined') {
            this.exportService = ExportService;
        }

        // NotificationService
        if (typeof NotificationService !== 'undefined') {
            this.notificationService = NotificationService;
        }

        // SharePointExcelService
        if (typeof SharePointExcelService !== 'undefined') {
            this.sharePointExcelService = SharePointExcelService;
        }

        // AuthenticationService
        if (typeof AuthenticationService !== 'undefined') {
            this.authService = AuthenticationService;
            await this._initAuthenticationService();
        }

        // SharePointNFGenerator (DEPOIS do AuthenticationService)
        if (typeof SharePointNFGenerator !== 'undefined' && this.authService) {
            this.nfGenerator = new SharePointNFGenerator(this.authService);
        }

        // ServidorMasterDataService (carrega planilha externa LOTAÇÃO GERAL SERVIDORES)
        if (typeof ServidorMasterDataService !== 'undefined' && this.authService && this.sharePointExcelService) {
            if (!window.servidorMasterDataService) {
                window.servidorMasterDataService = new ServidorMasterDataService(this.authService, this.sharePointExcelService);
            }
            this.servidorMasterDataService = window.servidorMasterDataService;
        }

        // HierarchyService (carrega hierarquia de lotação do SharePoint) - OBRIGATÓRIO
        if (typeof HierarchyService !== 'undefined' && this.authService && this.sharePointExcelService) {
            this.hierarchyService = new HierarchyService(this.authService, this.sharePointExcelService);
        } else {
            console.error('❌ HierarchyService não disponível - hierarquia organizacional NÃO funcionará');
            console.error('   Verifique: AuthenticationService e SharePointExcelService devem estar disponíveis');
            throw new Error('HierarchyService não pode ser inicializado');
        }

        // LotacaoHierarchyManager (Singleton global para hierarquia organizacional) - OBRIGATÓRIO
        if (typeof LotacaoHierarchyManager !== 'undefined') {
            if (!window.lotacaoHierarchyManager) {
                // HierarchyService é obrigatório agora
                window.lotacaoHierarchyManager = new LotacaoHierarchyManager(this.hierarchyService);
            }
            this.lotacaoHierarchyManager = window.lotacaoHierarchyManager;

            // SÓ carregar hierarquia se usuário estiver autenticado
            if (this.isAuthenticated) {
                // Carregar hierarquia do SharePoint (assíncrono, em background)
                this.hierarchyService.loadHierarchy().then(() => {
                    return this.lotacaoHierarchyManager.loadFromSharePoint();
                }).then(() => {
                    // Hierarquia carregada com sucesso
                }).catch(error => {
                    console.error('❌ ERRO ao carregar hierarquia do SharePoint:', error);
                    // Mostrar notificação visual ao usuário
                    if (this.notificationService) {
                        this.notificationService.error(
                            'Erro ao carregar hierarquia organizacional',
                            'Verifique se a aba "hierarquia" existe no SharePoint com a tabela "lotacao"'
                        );
                    }
                });
            }
        } else {
            console.error('❌ LotacaoHierarchyManager não disponível');
            throw new Error('LotacaoHierarchyManager não pode ser inicializado');
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

                this._updateAuthUI();
            } else {
                // Mostrar tela de login se não autenticado
                this._showLoginScreen();
            }

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
        }

        // ChartManager
        if (typeof ChartManager !== 'undefined') {
            this.chartManager = new ChartManager(this);
        }

        // ModalManager
        if (typeof ModalManager !== 'undefined') {
            this.modalManager = new ModalManager(this);

            // Inicializar internamente para registrar listeners e preparar modais
            try {
                if (typeof this.modalManager.init === 'function') this.modalManager.init();
            } catch (e) {
                // Silent fail
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
                } catch (e) {
                    // Silent fail
                }
            }
            
            // WizardModal (Nova UI em wizard para adicionar/editar licenças)
            if (typeof WizardModal !== 'undefined') {
                try {
                    this.wizardModal = new WizardModal(this);
                } catch (e) {
                    // Silent fail
                }
            }
        }

        // HeaderManager
        if (typeof HeaderManager !== 'undefined') {
            this.headerManager = new HeaderManager(this);
            this.headerManager.init();
        }

        // SidebarManager
        if (typeof SidebarManager !== 'undefined') {
            this.sidebarManager = new SidebarManager(this);
            this.sidebarManager.init();
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
        }

        // FilterManager
        if (typeof FilterManager !== 'undefined') {
            this.filterManager = new FilterManager(this);
        }

        // AdvancedFilterManager (portado from legacy)
        if (typeof AdvancedFilterManager !== 'undefined') {
            this.advancedFilterManager = new AdvancedFilterManager(this);
            window.advancedFilterManager = this.advancedFilterManager;
        }

        // AdvancedFiltersBuilder (UI para construção visual de filtros)
        if (typeof AdvancedFiltersBuilder !== 'undefined') {
            this.advancedFiltersBuilder = new AdvancedFiltersBuilder(this);
            window.advancedFiltersBuilder = this.advancedFiltersBuilder;
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
                } catch (e) {
                    // Silent fail
                }
            }
        }

        // CalendarManager
        if (typeof CalendarManager !== 'undefined') {
            this.calendarManager = new CalendarManager(this);
        }

        // TimelineManager
        if (typeof TimelineManager !== 'undefined') {
            this.timelineManager = new TimelineManager(this);
        }

        // ReportsManager
        if (typeof ReportsManager !== 'undefined') {
            this.reportsManager = new ReportsManager(this);
        }

        // KeyboardManager
        if (typeof KeyboardManager !== 'undefined') {
            this.keyboardManager = new KeyboardManager(this);
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

        }

        // CalendarPage
        if (typeof CalendarPage !== 'undefined') {
            this.pages.calendar = new CalendarPage(this);
            this.pages.calendar.init();

        }

        // TimelinePage
        if (typeof TimelinePage !== 'undefined') {
            this.pages.timeline = new TimelinePage(this);
            this.pages.timeline.init();

        }

        // ReportsPage
        if (typeof ReportsPage !== 'undefined') {
            this.pages.reports = new ReportsPage(this);
            this.pages.reports.init();

        }

        // SettingsPage
        if (typeof SettingsPage !== 'undefined') {
            this.pages.settings = new SettingsPage(this);
            this.pages.settings.init();

        }

        // TipsPage
        if (typeof TipsPage !== 'undefined') {
            this.pages.tips = new TipsPage(this);
            this.pages.tips.init();

        }
    }

    /**
     * Inicializa Router e registra rotas
     * @private
     */
    _initRouter() {
        if (!this.featureFlags.USE_ROUTER) {

            return;
        }

        if (typeof Router !== 'undefined') {
            this.router = Router.getInstance();

            // Registrar rotas ANTES de inicializar (para evitar erro de rota não encontrada)
            this._registerRoutes();

            // Inicializar router (vai processar rota inicial)
            this.router.init(this.eventBus);

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

            });

        } else {

        }

        // Apply advanced filters to the dataset when filters change (register on document regardless of EventBus)
        document.addEventListener('advanced-filters-changed', (ev) => {
            try {
                const mgr = this.advancedFilterManager || window.advancedFilterManager;
                if (!mgr || !this.dataStateManager) return;
                const all = this.dataStateManager.getAllServidores() || [];
                const beforeCount = all.length;
                const filtered = mgr.applyFilters ? mgr.applyFilters(all || []) : all || [];
                this.dataStateManager.setFilteredServidores(filtered || []);

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

            // ✅ GARANTIR que todos têm __rowIndex
            transformedData.forEach((servidor, index) => {
                if (!('__rowIndex' in servidor)) {
                    servidor.__rowIndex = index;
                }
            });

            // 5. Armazenar no DataStateManager
            if (this.dataStateManager) {
                this.dataStateManager.setAllServidores(transformedData);
                this.dataStateManager.setFilteredServidores(transformedData);
            }

            // 6. Salvar no cache (arquivos locais não têm metadados SharePoint)
            if (this.cacheService) {
                await this.cacheService.saveToCache(file.name, transformedData, {
                    source: 'local',
                    fileName: file.name,
                    timestamp: Date.now()
                });

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
     * Parseia dados CSV ou array de objetos
     * @private
     * @param {string|Array} rawData - Dados brutos (CSV string ou array de objetos)
     * @returns {Promise<Array>}
     */
    async _parseData(rawData) {
        if (typeof DataParser !== 'undefined') {
            // Se for string, é CSV que precisa ser parseado
            if (typeof rawData === 'string') {
                // 1. Parse do CSV (cada linha vira um objeto)
                const rawRows = DataParser.parseCSV(rawData);

                // 2. Agrupar por servidor (agregando licenças)
                const servidores = DataParser.groupByServidor(rawRows);

                return servidores;
            }
            
            // Se for array, são dados já parseados (ex: SharePoint) que só precisam ser agrupados
            if (Array.isArray(rawData)) {

                // Agrupar por servidor
                const servidores = DataParser.groupByServidor(rawData);

                return servidores;
            }
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
        let enrichedData = parsedData;

        // 1. Enriquecimento básico com DataTransformer
        if (typeof DataTransformer !== 'undefined') {
            enrichedData = DataTransformer.enrichServidoresBatch(parsedData);
        } else {
            console.warn('⚠️ DataTransformer não disponível, dados não serão enriquecidos');
        }

        // 2. Enriquecimento com planilha externa (dados de servidores ativos)
        try {
            if (typeof window !== 'undefined' && window.servidorMasterDataService) {
                const masterDataService = window.servidorMasterDataService;

                // Carregar planilha externa se ainda não foi carregada
                if (!masterDataService.isLoaded && !masterDataService.isLoading) {

                    const loaded = await masterDataService.loadMasterData();

                    if (loaded) {
                        const stats = masterDataService.getStats();

                    } else {
                        console.warn('⚠️ [App] Não foi possível carregar planilha externa.');
                    }
                }

                // Se conseguiu carregar, enriquecer servidores
                if (masterDataService.isLoaded) {

                    // Verificar ABILIO antes do enriquecimento
                    const abilioAntes = enrichedData.find(s => {
                        const cpf = (s.cpf || s.CPF || '').replace(/\D/g, '');
                        return cpf === '85446629868';
                    });
                    if (abilioAntes) {
                        console.log('📌 [App] ABILIO ANTES do enriquecimento:', {
                            nome: abilioAntes.nome,
                            cargo: abilioAntes.cargo,
                            lotacao: abilioAntes.lotacao
                        });
                    }
                    
                    enrichedData = masterDataService.enrichServidores(enrichedData);
                    
                    // Verificar ABILIO depois do enriquecimento
                    const abilioDepois = enrichedData.find(s => {
                        const cpf = (s.cpf || s.CPF || '').replace(/\D/g, '');
                        return cpf === '85446629868';
                    });
                    if (abilioDepois) {
                        console.log('📌 [App] ABILIO DEPOIS do enriquecimento:', {
                            nome: abilioDepois.nome,
                            cargo: abilioDepois.cargo,
                            lotacao: abilioDepois.lotacao,
                            _status: abilioDepois._status
                        });
                    }
                    
                    const stats = masterDataService.getStats();

                }
            }
        } catch (error) {
            console.error('❌ [App] Erro ao enriquecer com planilha externa:', error);
            // Continuar com dados não enriquecidos
        }

        return enrichedData;
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

                let restored = cached.data;
                
                // ✅ GARANTIR que todos têm __rowIndex (cache antigo pode não ter)
                restored = restored.map((servidor, index) => {
                    if (!('__rowIndex' in servidor)) {
                        servidor.__rowIndex = index;
                    }
                    return servidor;
                });
                
                // Se disponível, garantir que dados restaurados sejam enriquecidos/normalizados
                try {
                    if (typeof DataTransformer !== 'undefined' && DataTransformer.enrichServidoresBatch) {
                        restored = DataTransformer.enrichServidoresBatch(restored);

                    }
                } catch (e) {
                    console.warn('⚠️ Falha ao enriquecer dados do cache, usando dados originais', e);
                }

                // CRÍTICO: Restaurar metadados do SharePoint se existirem no cache
                if (cached.metadata && this.dataStateManager) {
                    const { fileId, tableName, tableInfo, ...otherMeta } = cached.metadata;

                    if (fileId && tableName && tableInfo) {
                        // Reconstituir objeto de metadados
                        const sourceMetadata = {
                            fileId: fileId,
                            tableName: tableName,
                            tableInfo: tableInfo
                        };

                        this.dataStateManager.setSourceMetadata(sourceMetadata);

                    } else {
                        console.warn('[App] ⚠️ Cache tem metadata mas faltam campos críticos:', {
                            hasFileId: !!fileId,
                            hasTableName: !!tableName,
                            hasTableInfo: !!tableInfo
                        });
                    }
                }

                if (this.dataStateManager) {
                    this.dataStateManager.setAllServidores(restored);
                    this.dataStateManager.setFilteredServidores(restored);
                }

                if (this.notificationService) {
                    this.notificationService.info('Dados anteriores restaurados do cache');
                }

                // CRÍTICO: Atualizar UI após restaurar metadados
                if (cached.metadata && cached.metadata.fileId) {

                    // Atualizar botão "Adicionar"
                    await this._updateNewRecordButton();

                    // Atualizar botão "Reload Cache"
                    await this._updateReloadCacheButton();

                    // Aguardar a tabela ser renderizada e então aplicar permissões
                    // Usar setTimeout mais longo para garantir renderização completa
                    setTimeout(async () => {

                        if (this.tableManager) {
                            // Verificar permissões (assíncrono)
                            if (typeof this.tableManager._checkEditPermissions === 'function') {
                                await this.tableManager._checkEditPermissions();

                                // APÓS verificar, aplicar estado nos botões
                                if (typeof this.tableManager._applyEditButtonsState === 'function') {
                                    this.tableManager._applyEditButtonsState();

                                }
                            }
                        } else {
                            console.warn('[App] ⚠️ TableManager não disponível para aplicar permissões');
                        }
                    }, 500); // 500ms delay para garantir que a tabela foi completamente renderizada
                }
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
     * Verifica cache primeiro (TTL 10 min), só carrega do SharePoint se necessário.
     * @private
     */
    async _loadPrimaryData() {
        try {
            if (!this.dataStateManager) return;
            
            // Não tentar carregar do SharePoint se não estiver autenticado
            if (!this.isAuthenticated) {
                return;
            }

            // 1. VERIFICAR CACHE PRIMEIRO
            if (this.cacheService) {
                const cached = await this.cacheService.getLatestCache();
                if (cached && cached.data) {
                    const cacheAge = Date.now() - (cached.timestamp || 0);
                    const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

                    // Se cache ainda é válido (< 10 min), usar dados em cache
                    if (cacheAge < CACHE_TTL) {
                        // Restaurar do cache com enriquecimento
                        let restored = cached.data;
                        if (typeof DataTransformer !== 'undefined' && DataTransformer.enrichServidoresBatch) {
                            restored = DataTransformer.enrichServidoresBatch(restored);
                        }
                        
                        this.dataStateManager.setAllServidores(restored);
                        this.dataStateManager.setFilteredServidores(restored);
                        
                        if (this.notificationService) {
                            this.notificationService.info('Dados carregados do cache');
                        }
                        
                        return;
                    }
                }
            }

            // 2. SE CACHE INVÁLIDO/INEXISTENTE, CARREGAR DO SHAREPOINT
            if (this.dataStateManager.hasData()) {
                return;
            }

            // Tentar obter token silencioso para Files.Read — se não houver token, não forçar interação
            if (!this.authService) {
                console.warn('Auto-load: AuthenticationService não disponível — pulando carregamento automático');
                return;
            }

            const silentToken = await this.authService.acquireTokenSilentOnly(['Files.Read']);
            if (!silentToken) {

                return;
            }

            if (typeof DataLoader === 'undefined' || !DataLoader.loadFromSource) {
                console.warn('DataLoader não disponível para carregar dados primários');
                return;
            }

            // 1. Carregar dados RAW do SharePoint (formato flat, como CSV)
            const rawData = await DataLoader.loadFromSource('primary');
            if (!rawData || !Array.isArray(rawData)) {
                console.warn('Auto-load: dados inválidos recebidos do SharePoint');
                return;
            }

            // 2. PROCESSAR DADOS usando MESMO CAMINHO que upload local
            // Agrupar por servidor

            const parsedData = DataParser.groupByServidor(rawData);

            // 3. Enriquecer dados

            const transformedData = await this._transformData(parsedData);

            // ✅ GARANTIR que todos têm __rowIndex
            transformedData.forEach((servidor, index) => {
                if (!('__rowIndex' in servidor)) {
                    servidor.__rowIndex = index;
                }
            });

            // 4. Salvar no DataStateManager
            this.dataStateManager.setAllServidores(transformedData);
            this.dataStateManager.setFilteredServidores(transformedData);

            // 5. Salvar no cache COM METADADOS
            if (this.cacheService) {
                // CRÍTICO: Obter metadados completos do DataStateManager
                const sourceMetadata = this.dataStateManager.getSourceMetadata();

                await this.cacheService.saveToCache('sharepoint-data', transformedData, {
                    source: 'sharepoint',
                    timestamp: Date.now(),
                    // Adicionar metadados do SharePoint para restaurar após reload
                    fileId: sourceMetadata?.fileId,
                    tableName: sourceMetadata?.tableName,
                    tableInfo: sourceMetadata?.tableInfo
                });

            }

            // 6. Notificar usuário
            if (this.notificationService) {
                this.notificationService.success(
                    `Dados carregados do SharePoint: ${transformedData.length} servidores`
                );
            }

            // 7. Atualizar botão de adicionar
            await this._updateNewRecordButton();

            // 8. Atualizar botão de reload cache
            await this._updateReloadCacheButton();

        } catch (error) {
            console.warn('Auto-load failure:', error && (error.message || error));
            
            if (this.notificationService) {
                this.notificationService.error(`Erro ao carregar dados: ${error.message}`);
            }
            
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

            this._hideLoginScreen();
            this._updateAuthUI();

            if (this.notificationService) {
                this.notificationService.success(`Bem-vindo, ${userInfo.name || userInfo.username}!`);
            }

            // Carregar hierarquia após login bem-sucedido
            if (this.hierarchyService && this.lotacaoHierarchyManager) {
                this.hierarchyService.loadHierarchy().then(() => {
                    return this.lotacaoHierarchyManager.loadFromSharePoint();
                }).catch(error => {
                    console.warn('Erro ao carregar hierarquia após login:', error);
                });
            }

            // Carregar dados primários após login
            try {
                await this._loadPrimaryData();
            } catch (error) {
                console.warn('Erro ao carregar dados após login:', error);
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

            // Mostrar botão de reload cache
            this._updateReloadCacheButton();

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

            // Esconder botão de adicionar
            const addRecordButton = document.getElementById('addRecordButton');
            if (addRecordButton) addRecordButton.style.display = 'none';

            // Esconder botão de reload cache
            const reloadCacheButton = document.getElementById('reloadCacheButton');
            if (reloadCacheButton) reloadCacheButton.style.display = 'none';
        }
    }

    /**
     * Atualiza visibilidade e estado do botão de adicionar registro
     * @private
     */
    async _updateNewRecordButton() {

        const addRecordButton = document.getElementById('addRecordButton');
        if (!addRecordButton) {
            console.warn('[App] ❌ Botão addRecordButton não encontrado no DOM');
            return;
        }

        try {
            // Verificar se tem metadados do SharePoint (fileId disponível)
            const meta = this.dataStateManager && typeof this.dataStateManager.getSourceMetadata === 'function'
                ? this.dataStateManager.getSourceMetadata()
                : null;

            if (!meta || !meta.fileId) {

                addRecordButton.style.display = 'none';
                return;
            }

            // Verificar permissões de escrita
            if (typeof window !== 'undefined' && window.PermissionsService && typeof window.PermissionsService.canEdit === 'function') {

                const canEdit = await window.PermissionsService.canEdit(meta.fileId);

                if (canEdit) {

                    addRecordButton.style.display = 'inline-flex';

                    // Adicionar event listener (apenas uma vez)
                    if (!addRecordButton._clickListenerAttached) {
                        addRecordButton.addEventListener('click', () => this._handleNewRecord());
                        addRecordButton._clickListenerAttached = true;

                    }
                } else {

                    addRecordButton.style.display = 'none';
                }
            } else {
                // Se PermissionsService não disponível, mostrar o botão

                addRecordButton.style.display = 'inline-flex';

                if (!addRecordButton._clickListenerAttached) {
                    addRecordButton.addEventListener('click', () => this._handleNewRecord());
                    addRecordButton._clickListenerAttached = true;
                }
            }
        } catch (error) {
            console.error('[App] ❌ Erro ao atualizar botão de adicionar:', error);
            addRecordButton.style.display = 'none';
        }
    }

    /**
     * Atualiza visibilidade do botão de reload cache
     * @private
     */
    async _updateReloadCacheButton() {
        const reloadCacheButton = document.getElementById('reloadCacheButton');
        if (!reloadCacheButton) return;

        try {
            // Verificar se há dados carregados
            const allServidores = this.dataStateManager?.getAllServidores() || [];
            const meta = this.dataStateManager?.getSourceMetadata();

            if (allServidores.length > 0 && meta?.fileId) {
                reloadCacheButton.style.display = 'inline-flex';

                // Adicionar event listener (apenas uma vez)
                if (!reloadCacheButton._clickListenerAttached) {
                    reloadCacheButton.addEventListener('click', () => this._handleReloadCache());
                    reloadCacheButton._clickListenerAttached = true;

                }
            } else {
                reloadCacheButton.style.display = 'none';
            }
        } catch (error) {
            console.error('[App] ❌ Erro ao atualizar botão de reload cache:', error);
            reloadCacheButton.style.display = 'none';
        }
    }

    /**
     * Recarrega dados do cache
     * @private
     */
    async _handleReloadCache() {
        const reloadCacheButton = document.getElementById('reloadCacheButton');
        const originalHtml = reloadCacheButton?.innerHTML;

        try {
            // Desabilitar botão e mostrar loading
            if (reloadCacheButton) {
                reloadCacheButton.disabled = true;
                const icon = reloadCacheButton.querySelector('i');
                if (icon) {
                    icon.style.animation = 'spin 1s linear infinite';
                }
            }

            NotificationService.show('Recarregando dados do cache...', 'info');

            // Buscar cache mais recente
            const cached = await this.cacheService.getLatestCache();
            if (!cached || !cached.data) {
                NotificationService.show('Nenhum cache disponível', 'warning');
                return;
            }

            // Re-enriquecer dados
            let restored = cached.data;
            if (DataTransformer.enrichServidoresBatch) {
                restored = DataTransformer.enrichServidoresBatch(restored);
            }

            // Atualizar estado
            this.dataStateManager.setAllServidores(restored);
            this.dataStateManager.setFilteredServidores(restored);

            NotificationService.show(`${restored.length} registros recarregados do cache`, 'success');

        } catch (error) {
            console.error('[App] ❌ Erro ao recarregar cache:', error);
            NotificationService.show('Erro ao recarregar cache', 'error');
        } finally {
            // Restaurar botão
            if (reloadCacheButton) {
                reloadCacheButton.disabled = false;
                const icon = reloadCacheButton.querySelector('i');
                if (icon) {
                    icon.style.animation = '';
                }
            }
        }
    }

    /**
     * Manipula clique no botão de novo registro
     * @private
     */
    _handleNewRecord() {
        // Preferir WizardModal se disponível
        if (this.wizardModal && typeof this.wizardModal.open === 'function') {
            this.wizardModal.open('add');
        } else if (this.licenseEditModal && typeof this.licenseEditModal.open === 'function') {

            this.licenseEditModal.open({ mode: 'create', row: null, rowIndex: null });
        } else {
            console.warn('Nenhum modal de edição disponível');
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

    /**
     * Adiciona nova licença (chamado pelo WizardModal)
     * @param {Object} licenseData - Dados da licença
     */
    async addNewLicense(licenseData) {

        try {
            // Validar dados obrigatórios
            if (!licenseData.NOME || !licenseData.CPF) {
                throw new Error('Dados do servidor são obrigatórios');
            }
            
            if (!licenseData.NUMERO || !licenseData.EMISSAO) {
                throw new Error('Dados da licença são obrigatórios');
            }
            
            // Obter metadados do SharePoint
            const metadata = this.dataStateManager.getSourceMetadata();
            
            if (!metadata || !metadata.fileId || !metadata.tableName) {
                throw new Error('Metadados do SharePoint não disponíveis. Recarregue os dados.');
            }
            
            if (!metadata.tableInfo || !metadata.tableInfo.columns) {
                throw new Error('Informações de colunas da tabela não disponíveis. Recarregue os dados.');
            }
            
            // Verificar se SharePointExcelService está disponível
            if (!this.sharePointExcelService) {
                throw new Error('SharePointExcelService não disponível');
            }
            
            // Converter objeto para array na ordem das colunas
            const rowValuesArray = this.sharePointExcelService.convertLicenseObjectToArray(
                licenseData,
                metadata.tableInfo
            );

            // Adicionar linha ao SharePoint
            const result = await this.sharePointExcelService.addTableRow(
                metadata.fileId,
                metadata.tableName,
                rowValuesArray
            );
            
            // Registrar no audit log se disponível
            if (typeof AuditService !== 'undefined' && AuditService.logAction) {
                AuditService.logAction('CREATE', 'License', licenseData);
            }

            // NÃO limpar dados - apenas reprocessar o cache atual adicionando a nova linha
            // Evita reload completo que causa lentidão
            
            // Atualizar timestamp do cache para evitar auto-reload
            if (this.cacheService && metadata) {
                const cacheKey = `excel_data_${metadata.fileId}`;
                await this.cacheService.updateTimestamp(cacheKey);
            }
            
            // Recarregar dados do cache (rápido - não acessa SharePoint)

            const cached = await this.cacheService.getLatestCache();
            if (cached && cached.data) {
                let restored = cached.data;
                if (typeof DataTransformer !== 'undefined' && DataTransformer.enrichServidoresBatch) {
                    restored = DataTransformer.enrichServidoresBatch(restored);
                }
                this.dataStateManager.setAllServidores(restored);
                this.dataStateManager.setFilteredServidores(restored);

            }
            
            // Mostrar notificação de sucesso
            if (this.notificationService) {
                this.notificationService.success('Licença adicionada com sucesso!');
            }
            
            return result;
            
        } catch (error) {
            console.error('[App] Erro ao adicionar licença:', error);
            
            // Mensagem de erro mais específica para 403
            let errorMessage = error.message;
            if (error.message && error.message.includes('403')) {
                errorMessage = 'Sem permissão de escrita no arquivo. Verifique se você tem acesso de edição ao arquivo Excel no SharePoint.';
            } else if (error.message && error.message.includes('Could not obtain a WAC access token')) {
                errorMessage = 'Não foi possível obter permissão de escrita. O arquivo pode estar aberto por outro usuário ou você não tem permissões de edição.';
            }
            
            if (this.notificationService) {
                this.notificationService.error('Erro ao adicionar licença: ' + errorMessage);
            }
            
            throw error;
        }
    }

    /**
     * Atualiza licença existente (chamado pelo WizardModal)
     * @param {Object} originalData - Dados originais da licença
     * @param {Object} updatedData - Dados atualizados
     */
    async updateLicense(originalData, updatedData) {

        try {
            // Validar dados obrigatórios
            if (!updatedData.NOME || !updatedData.CPF) {
                throw new Error('Dados do servidor são obrigatórios');
            }
            
            if (!updatedData.NUMERO || !updatedData.EMISSAO) {
                throw new Error('Dados da licença são obrigatórios');
            }
            
            // Obter metadados do SharePoint
            const metadata = this.dataStateManager.getSourceMetadata();
            
            if (!metadata || !metadata.fileId || !metadata.tableName) {
                throw new Error('Metadados do SharePoint não disponíveis. Recarregue os dados.');
            }
            
            // Determinar o índice da linha (baseado no __rowIndex ou buscar no Excel)
            let rowIndex = originalData.__rowIndex;
            
            if (!rowIndex) {
                console.warn('[App] __rowIndex não disponível, buscando linha no Excel...');
                // TODO: Implementar busca da linha no Excel se necessário
                throw new Error('Índice da linha não disponível');
            }

            // Verificar se SharePointExcelService está disponível
            if (!this.sharePointExcelService) {
                throw new Error('SharePointExcelService não disponível');
            }
            
            // Atualizar linha no SharePoint
            const result = await this.sharePointExcelService.updateTableRow(
                metadata.fileId,
                metadata.tableName,
                rowIndex,
                updatedData
            );

            // Limpar dados antigos para evitar duplicação
            if (this.dataStateManager) {
                this.dataStateManager.setAllServidores([]);
                this.dataStateManager.setFilteredServidores([]);
            }
            
            // Recarregar dados
            await this._loadPrimaryData();
            
            // Mostrar notificação de sucesso
            if (this.notificationService) {
                this.notificationService.success('Licença atualizada com sucesso!');
            }
            
            return result;
            
        } catch (error) {
            console.error('[App] Erro ao atualizar licença:', error);
            
            if (this.notificationService) {
                this.notificationService.error('Erro ao atualizar licença: ' + error.message);
            }
            
            throw error;
        }
    }

    /**
     * Atualiza dados do servidor em TODAS as licenças dele
     * @param {string} cpf - CPF do servidor
     * @param {Object} servidorData - Dados a atualizar (NOME, CPF, RG, CARGO, LOTACAO, UNIDADE, REF)
     */
    async updateServidorData(cpf, servidorData) {

        try {
            // Validar dados obrigatórios
            if (!cpf) {
                throw new Error('CPF é obrigatório');
            }
            
            if (!servidorData.NOME || !servidorData.CPF) {
                throw new Error('Dados do servidor são obrigatórios');
            }
            
            // Obter metadados do SharePoint
            const metadata = this.dataStateManager.getSourceMetadata();
            
            if (!metadata || !metadata.fileId || !metadata.tableName) {
                throw new Error('Metadados do SharePoint não disponíveis. Recarregue os dados.');
            }
            
            // Verificar se SharePointExcelService está disponível
            if (!this.sharePointExcelService) {
                throw new Error('SharePointExcelService não disponível');
            }
            
            // Buscar todas as licenças do servidor
            const allLicenses = this.dataStateManager.getAllServidores(); // Cada item = 1 linha
            const licensesToUpdate = allLicenses.filter(lic => lic.cpf === cpf);
            
            if (licensesToUpdate.length === 0) {
                throw new Error('Nenhuma licença encontrada para este servidor');
            }

            // Atualizar cada linha no SharePoint
            const updatePromises = licensesToUpdate.map(license => {
                const rowIndex = license.__rowIndex;
                
                if (!rowIndex) {
                    console.warn('[App] Licença sem __rowIndex, pulando:', license);
                    return Promise.resolve(null);
                }

                return this.sharePointExcelService.updateTableRow(
                    metadata.fileId,
                    metadata.tableName,
                    rowIndex,
                    servidorData
                );
            });
            
            // Aguardar todas as atualizações
            const results = await Promise.all(updatePromises);
            const successCount = results.filter(r => r !== null).length;

            // Limpar dados antigos
            if (this.dataStateManager) {
                this.dataStateManager.setAllServidores([]);
                this.dataStateManager.setFilteredServidores([]);
            }
            
            // Recarregar dados
            await this._loadPrimaryData();
            
            // Mostrar notificação de sucesso
            if (this.notificationService) {
                this.notificationService.success(`Dados atualizados em ${successCount} licença(s)!`);
            }
            
            return { successCount, totalCount: licensesToUpdate.length };
            
        } catch (error) {
            console.error('[App] Erro ao atualizar dados do servidor:', error);
            
            if (this.notificationService) {
                this.notificationService.error('Erro ao atualizar dados: ' + error.message);
            }
            
            throw error;
        }
    }

    /**
     * Prepara a NF para download posterior (ETAPA 1: update E9, recalculate, verify)
     * Chame após salvar novo registro para ganhar tempo
     * @param {Object} licenseData - Dados da licença
     * @returns {Promise<Object>} Dados preparados
     */
    async prepareNFForDownload(licenseData) {
        try {
            if (!this.nfGenerator) {
                throw new Error('Gerador de NF não disponível');
            }
            
            const metadata = this.dataStateManager?.getSourceMetadata();
            if (!metadata || !metadata.fileId) {
                throw new Error('Metadados do arquivo não disponíveis. Recarregue os dados.');
            }

            NotificationService.show('Preparando NF para download...', 'info', { duration: 3000 });
            
            // Preparar NF (update E9, recalculate, verify - demora ~3-5s)
            this._preparedNFData = await this.nfGenerator.prepareNF(metadata.fileId, licenseData);
            
            NotificationService.show('NF preparada! Clique em "Baixar PDF" quando quiser.', 'success', { duration: 3000 });
            
            return this._preparedNFData;
            
        } catch (error) {
            console.error('[App] ❌ Erro ao preparar NF:', error);
            NotificationService.show(`Erro ao preparar NF: ${error.message}`, 'error', { duration: 5000 });
            this._preparedNFData = null;
            throw error;
        }
    }

    /**
     * Gera NF em PDF para uma licença
     * Se já foi preparada (prepareNFForDownload), apenas exporta (rápido!)
     * Senão, faz o fluxo completo
     * @param {Object} licenseData - Dados da licença
     */
    async generateNFPDF(licenseData) {
        try {
            if (!this.nfGenerator) {
                throw new Error('Gerador de NF não disponível');
            }
            
            const metadata = this.dataStateManager?.getSourceMetadata();
            if (!metadata || !metadata.fileId) {
                throw new Error('Metadados do arquivo não disponíveis. Recarregue os dados.');
            }

            let result;
            
            // Verificar se temos NF preparada e se é para o mesmo servidor
            const numeroProcesso = licenseData.NUMERO || licenseData.numero || licenseData.Numero;
            if (this._preparedNFData && this._preparedNFData.nomeServidor) {
                const preparedFor = this._preparedNFData.nomeServidor.toUpperCase();
                const requestedFor = (licenseData.NOME || licenseData.nome || '').toUpperCase();
                
                // Verificar se é para o mesmo servidor e se não está muito antiga (< 5 minutos)
                const elapsed = Date.now() - this._preparedNFData.timestamp;
                const isValid = preparedFor === requestedFor && elapsed < 5 * 60 * 1000;
                
                if (isValid) {
                    NotificationService.show('Exportando PDF...', 'info', { duration: 2000 });
                    
                    // ETAPA 2 apenas: exportar PDF (rápido! ~1s)
                    result = await this.nfGenerator.exportPreparedNF(this._preparedNFData);
                    
                    // Limpar preparação usada
                    this._preparedNFData = null;
                } else {
                    result = await this.nfGenerator.generateNFPDF(metadata.fileId, licenseData);
                    this._preparedNFData = null;
                }
            } else {
                result = await this.nfGenerator.generateNFPDF(metadata.fileId, licenseData);
            }
            
            // Suportar tanto formato novo (objeto) quanto antigo (blob direto)
            const pdfBlob = result.pdfBlob || result;
            const nomeServidor = result.nomeServidor || licenseData.NOME || licenseData.nome || 'SERVIDOR';
            
            // Formato obrigatório: "NF - NOME DO SERVIDOR.pdf"
            const fileName = `NF - ${nomeServidor.toUpperCase()}.pdf`;
            
            // Download
            SharePointNFGenerator.downloadPDF(pdfBlob, fileName);
            
        } catch (error) {
            console.error('[App] Erro ao gerar NF:', error);
            throw error;
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
