// Dashboard Multi-Páginas SUTRI


const CARGO_COLORS = [
    '#3b82f6', // Azul
    '#10b981', // Verde esmeralda
    '#8b5cf6', // Roxo
    '#06b6d4', // Cyan
    '#84cc16', // Lima
    '#ec4899', // Rosa
    '#6b7280', // Cinza
    '#14b8a6', // Teal
    '#f59e0b', // Âmbar (diferente do amarelo de urgência)
    '#6366f1'  // Indigo
];



class DashboardMultiPage {
    // Exibe overlay de loading global
    showGlobalLoading(message = 'Carregando...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            // salvar foco anterior
            try { this._lastFocusBeforeLoading = document.activeElement; } catch (e) { this._lastFocusBeforeLoading = null; }
            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');
            const text = overlay.querySelector('.loading-text');
            if (text) text.textContent = message;
            // marcar como ocupado para leitores de tela
            try { document.body.setAttribute('aria-busy', 'true'); } catch (e) {}
            // bloquear scroll
            try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
        }
    }

    // Esconde overlay de loading global
    hideGlobalLoading() {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
            try { document.body.removeAttribute('aria-busy'); } catch (e) {}
            try { document.documentElement.style.overflow = ''; } catch (e) {}
            // restaurar foco
            try {
                if (this._lastFocusBeforeLoading && typeof this._lastFocusBeforeLoading.focus === 'function') {
                    this._lastFocusBeforeLoading.focus();
                    this._lastFocusBeforeLoading = null;
                }
            } catch (e) {}
        }
    }
    constructor() {
        this.parser = new CronogramaParser();
        this.allServidores = [];
        this.filteredServidores = [];
        this.loadingProblems = [];
        this.notificacoes = []; // Array de notificações
        this.filteredNotificacoes = []; // Notificações filtradas
        this.currentFilters = {
            age: { min: 18, max: 70 },
            period: { type: 'yearly', start: 2025, end: 2028 },
            search: '',
            urgency: '',
            cargo: '',
            selectedData: null
        };
        this.charts = {};
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.currentPage = 'home';
        this.selectedChartIndex = -1;

        // Inicializar TableSortManager
        this.tableSortManager = null;

        // Inicializar CacheManager
        this.cacheManager = null;
        this.currentCacheFileId = null; // ID do arquivo atualmente carregado

        // Inicializar ValidationManager e ErrorReporter
        this.validationManager = null;
        this.errorReporter = null;

        // Inicializar ExportManager
        this.exportManager = null;

        // Inicializar AdvancedFiltersBuilder
        this.advancedFiltersBuilder = null;

    // Autenticação Microsoft
    this.authenticationManager = null;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupSidebarButtons();
        this.initNavigation();
        this.initPeriodTabs();
        this.updateProblemsCount();
        this.updateLastUpdate();
        this.setupThemeIntegration();

        // Inicializar TableSortManager
        this.tableSortManager = new TableSortManager(this);

        // Inicializar ValidationManager e ErrorReporter
        if (typeof ValidationManager !== 'undefined' && typeof ErrorReporter !== 'undefined') {
            this.validationManager = new ValidationManager();
            this.errorReporter = new ErrorReporter(this.validationManager);
            console.log('✅ ValidationManager e ErrorReporter inicializados');
        } else {
            console.warn('⚠️ ValidationManager ou ErrorReporter não disponíveis');
        }

        // Inicializar ExportManager
        if (typeof ExportManager !== 'undefined') {
            this.exportManager = new ExportManager(this);
            this.setupExportEventListeners();
            console.log('✅ ExportManager inicializado');
        } else {
            console.warn('⚠️ ExportManager não disponível');
        }

        // Inicializar CacheManager
        if (CacheManager.isAvailable()) {
            this.cacheManager = new CacheManager();
            await this.initCacheUI();
        } else {
            console.warn('IndexedDB não disponível - cache desabilitado');
        }

        // Inicializar SmartSearchManager
        if (typeof SmartSearchManager !== 'undefined') {
            this.smartSearchManager = new SmartSearchManager(this);
            console.log('✅ SmartSearchManager inicializado');
        }

        // AdvancedFilterManager foi substituído pelo AdvancedFiltersBuilder
        // Mantendo variável para compatibilidade, mas apontando para null
        this.advancedFilterManager = null;

        // Inicializar AdvancedFiltersBuilder (novo builder visual de filtros)
        if (typeof AdvancedFiltersBuilder !== 'undefined') {
            try {
                this.advancedFiltersBuilder = new AdvancedFiltersBuilder(this);
                // manter referência global legada, caso outros módulos utilizem
                if (typeof advancedFiltersBuilder !== 'undefined') {
                    advancedFiltersBuilder = this.advancedFiltersBuilder;
                }
                if (typeof window !== 'undefined') {
                    window.advancedFiltersBuilder = this.advancedFiltersBuilder;
                }
                console.log('✅ AdvancedFiltersBuilder inicializado');
            } catch (error) {
                console.error('Erro ao inicializar AdvancedFiltersBuilder:', error);
            }
        } else {
            console.warn('⚠️ AdvancedFiltersBuilder não disponível');
        }

        // FilterChipsUI foi desabilitado (compromete layout da home)
        // Filtros agora são gerenciados exclusivamente pelo AdvancedFiltersBuilder
        this.filterChipsUI = null;

        // Inicializar KeyboardShortcutsManager
        if (typeof KeyboardShortcutsManager !== 'undefined') {
            this.keyboardShortcutsManager = new KeyboardShortcutsManager(this);
            console.log('✅ KeyboardShortcutsManager inicializado');
        }

        // Inicializar LoadingSkeletons
        if (typeof LoadingSkeletons !== 'undefined') {
            this.loadingSkeletons = new LoadingSkeletons();
            console.log('✅ LoadingSkeletons inicializado');
        }

        // Inicializar HighContrastManager
        if (typeof AuthenticationManager !== 'undefined') {
            try {
                this.authenticationManager = new AuthenticationManager(this);
                if (typeof window !== 'undefined') {
                    window.authenticationManager = this.authenticationManager;
                }
                console.log('✅ AuthenticationManager inicializado');
            } catch (error) {
                console.error('Erro ao inicializar AuthenticationManager:', error);
            }
        }

        // Inicializar SharePointDataLoader
        if (typeof SharePointDataLoader !== 'undefined' && this.authenticationManager) {
            try {
                this.sharepointDataLoader = new SharePointDataLoader(this);
                console.log('✅ SharePointDataLoader inicializado');
            } catch (error) {
                console.error('Erro ao inicializar SharePointDataLoader:', error);
            }
        }

        // Inicializar OperationalImpactAnalyzer (Sprint 5)
        if (typeof OperationalImpactAnalyzer !== 'undefined') {
            this.operationalImpactAnalyzer = new OperationalImpactAnalyzer(this);
            console.log('✅ OperationalImpactAnalyzer inicializado');
        }
        
        // Inicializar ReportsManager
        if (typeof ReportsManager !== 'undefined') {
            this.reportsManager = new ReportsManager(this);
            console.log('✅ ReportsManager inicializado');
        }
    }

    setupThemeIntegration() {
        console.log('🎨 setupThemeIntegration() iniciado');
        
        // Registrar o chart globalmente para o ThemeManager
        window.dashboardChart = this.charts.urgency;

        // Inicializar AuthenticationManager
        if (typeof AuthenticationManager !== 'undefined') {
            try {
                this.authenticationManager = new AuthenticationManager(this);
                if (typeof window !== 'undefined') {
                    window.authenticationManager = this.authenticationManager;
                }
                console.log('✅ AuthenticationManager inicializado');
            } catch (error) {
                console.error('Erro ao inicializar AuthenticationManager:', error);
            }
        }

        // Atualizar ano atual
        const currentYear = new Date().getFullYear();
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (currentYearElement) {
            currentYearElement.textContent = currentYear;
        }

        // Escutar mudanças de tema
        window.addEventListener('themeChanged', (e) => {
            // Atualizar chart se existir
            if (window.dashboardChart && window.themeManager) {
                window.themeManager.updateChartColors();
            }
        });

        if (this.charts.urgency) {
            // Registrar novamente para o ThemeManager
            window.dashboardChart = this.charts.urgency;
        }

        // Tentar auto-carregamento após inicialização completa
        console.log('⏱️ Agendando tryAutoLoad em 250ms...');
        setTimeout(async () => {
            console.log('🚀 Executando auto-load agendado...');
            await this.updateStoredFileIndicators();

            // Se não conseguir auto-carregar, mostrar estado inicial vazio
            if (!await this.tryAutoLoad()) {
                this.showEmptyState();
            }

            // Atualizar visibilidade do botão SharePoint
            if (this.authenticationManager) {
                const isAuthenticated = Boolean(this.authenticationManager.activeAccount);
                this.updateSharePointButtonVisibility(isAuthenticated);
            }
        }, 250);
    }

    // ==================== MÉTODOS DE CACHE ====================

    /**
     * Inicializa a UI do cache (botões, event listeners, etc)
     */
    async initCacheUI() {
        const recentFilesBtn = document.getElementById('recentFilesButton');
        const recentFilesDropdown = document.getElementById('recentFilesDropdown');
        const clearCacheBtn = document.getElementById('clearCacheBtn');

        if (!recentFilesBtn || !recentFilesDropdown) return;

        // Inicializar IndexedDB imediatamente
        try {
            console.log('🔧 Inicializando IndexedDB no initCacheUI...');
            await this.cacheManager.init();
            console.log('✅ IndexedDB inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar IndexedDB:', error);
            return;
        }

        // Event listener para toggle do dropdown
        recentFilesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = recentFilesDropdown.style.display === 'block';
            recentFilesDropdown.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                this.updateRecentFilesUI();
            }
        });

        // Event listener para limpar todo o cache
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await window.customModal?.confirm({
                    title: 'Limpar Cache',
                    message: 'Deseja realmente limpar todo o cache de arquivos?',
                    type: 'warning',
                    confirmText: 'Sim, limpar',
                    cancelText: 'Cancelar'
                });
                
                if (confirmed) {
                    await this.cacheManager.clearAll();
                    await this.updateRecentFilesUI();
                    recentFilesDropdown.style.display = 'none';
                }
            });
        }

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!recentFilesBtn.contains(e.target) && !recentFilesDropdown.contains(e.target)) {
                recentFilesDropdown.style.display = 'none';
            }
        });

        // Atualizar UI inicial
        await this.updateRecentFilesUI();
    }

    /**
     * Atualiza a UI de arquivos recentes
     */
    async updateRecentFilesUI() {
        if (!this.cacheManager) {
            console.warn('CacheManager não inicializado');
            return;
        }

        const recentFilesBtn = document.getElementById('recentFilesButton');
        const recentFilesCount = document.getElementById('recentFilesCount');
        const recentFilesList = document.getElementById('recentFilesList');

        if (!recentFilesBtn || !recentFilesList) {
            console.warn('Elementos de UI de cache não encontrados:', { recentFilesBtn, recentFilesList });
            return;
        }

        try {
            const files = await this.cacheManager.getRecentFiles(3);
            console.log(`📁 Arquivos recentes no cache: ${files.length}`, files);

            // Atualizar contador
            if (recentFilesCount) {
                recentFilesCount.textContent = files.length;
            }

            // Mostrar/ocultar botão baseado em se há arquivos
            if (files.length > 0) {
                recentFilesBtn.style.display = 'flex';
                console.log('✅ Botão de arquivos recentes mostrado');
            } else {
                recentFilesBtn.style.display = 'none';
                console.log('ℹ️ Nenhum arquivo em cache - botão oculto');
            }

            // Renderizar lista de arquivos
            if (files.length === 0) {
                recentFilesList.innerHTML = `
                    <div class="recent-files-empty">
                        <i class="bi bi-inbox"></i>
                        <p>Nenhum arquivo recente</p>
                    </div>
                `;
            } else {
                recentFilesList.innerHTML = files.map(file => `
                    <div class="recent-file-item" data-file-id="${file.id}">
                        <div class="recent-file-info">
                            <div class="recent-file-name">
                                <i class="bi bi-file-earmark-text"></i>
                                ${this.escapeHtml(file.fileName)}
                            </div>
                            <div class="recent-file-meta">
                                <span>
                                    <i class="bi bi-clock"></i>
                                    ${CacheManager.formatTimestamp(file.timestamp)}
                                </span>
                                <span>
                                    <i class="bi bi-people"></i>
                                    ${file.servidoresCount} servidor${file.servidoresCount !== 1 ? 'es' : ''}
                                </span>
                                ${file.metadata?.size ? `
                                    <span>
                                        <i class="bi bi-hdd"></i>
                                        ${CacheManager.formatFileSize(file.metadata.size)}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="recent-file-actions">
                            <button class="btn-icon btn-delete-cache" data-file-id="${file.id}" title="Remover do cache">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');

                // Adicionar event listeners para carregar arquivos
                recentFilesList.querySelectorAll('.recent-file-item').forEach(item => {
                    const fileId = parseInt(item.dataset.fileId);
                    const deleteBtn = item.querySelector('.btn-delete-cache');

                    // Carregar arquivo ao clicar no item (exceto no botão de delete)
                    item.addEventListener('click', async (e) => {
                        if (e.target.closest('.btn-delete-cache')) return;
                        await this.loadFileFromCache(fileId);
                    });

                    // Deletar arquivo
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            await this.deleteFileFromCache(fileId);
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar UI de arquivos recentes:', error);
            recentFilesList.innerHTML = `
                <div class="recent-files-empty">
                    <i class="bi bi-exclamation-triangle"></i>
                    <p>Erro ao carregar arquivos</p>
                </div>
            `;
        }
    }

    /**
     * Carrega um arquivo do cache
     */
    async loadFileFromCache(fileId) {
        if (!this.cacheManager) return;

        const recentFilesDropdown = document.getElementById('recentFilesDropdown');
        const statusElement = document.getElementById('uploadStatus');

        try {
            // Mostrar loading
            this.showLoading('Carregando arquivo do cache...');

            // Carregar arquivo
            const fileData = await this.cacheManager.loadFileById(fileId);

            if (!fileData || !fileData.csvData) {
                throw new Error('Dados do arquivo não encontrados');
            }

            // Processar dados
            this.processData(fileData.csvData);
            this.updateLastUpdate();
            this.currentCacheFileId = fileId;

            // Fechar dropdown
            if (recentFilesDropdown) {
                recentFilesDropdown.style.display = 'none';
            }

            // Mostrar badge de cache hit
            if (statusElement) {
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    <span class="file-info">
                        ✓ ${this.escapeHtml(fileData.fileName)} (${fileData.servidoresCount} servidores)
                        <span class="cache-hit-badge">
                            <i class="bi bi-lightning-fill"></i>
                            Do cache
                        </span>
                    </span>
                `;
            }

            // Notificação de sucesso
            this.showImportNotification('success',
                `Arquivo carregado do cache`,
                fileData.fileName
            );

        } catch (error) {
            console.error('Erro ao carregar arquivo do cache:', error);
            this.showImportNotification('error',
                error.message || 'Erro ao carregar arquivo do cache',
                'Cache'
            );
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Deleta um arquivo do cache
     */
    async deleteFileFromCache(fileId) {
        if (!this.cacheManager) return;

        try {
            await this.cacheManager.deleteFile(fileId);
            await this.updateRecentFilesUI();

            // Se o arquivo deletado era o atual, limpar referência
            if (this.currentCacheFileId === fileId) {
                this.currentCacheFileId = null;
            }
        } catch (error) {
            console.error('Erro ao deletar arquivo do cache:', error);
            window.customModal?.alert({
                title: 'Erro',
                message: 'Erro ao remover arquivo do cache',
                type: 'danger'
            });
        }
    }

    /**
     * Escapa HTML para prevenir XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle'); // Alternador da sidebar
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (sidebarToggle && sidebar && mainContent) {
            // Troca a imagem da logo quando a sidebar muda (usa transitionend para o fade)
            const swapSidebarLogo = (useCompact) => {
                try {
                    const logoImg = document.querySelector('.brand img.brand-text');
                    if (!logoImg) return;
                    const compact = logoImg.getAttribute('data-compact-src');
                    const original = logoImg.getAttribute('data-original-src') || logoImg.src;
                    if (!logoImg.getAttribute('data-original-src')) {
                        logoImg.setAttribute('data-original-src', original);
                    }

                    const targetSrc = (useCompact && compact) ? compact : logoImg.getAttribute('data-original-src');
                    if (!targetSrc) return;

                    const currentSrc = logoImg.src || '';
                    // Se já estiver mostrando a imagem desejada, não faz nada
                    if (currentSrc.indexOf(targetSrc) !== -1 || currentSrc === targetSrc) return;

                    // Limpa timers e handlers de trocas anteriores
                    if (logoImg.__swapCleanup) {
                        logoImg.__swapCleanup();
                    }

                    let outTimeout = null;
                    let inTimeout = null;
                    const cleanup = () => {
                        if (outTimeout) clearTimeout(outTimeout);
                        if (inTimeout) clearTimeout(inTimeout);
                        logoImg.__swapCleanup = null;
                    };
                    logoImg.__swapCleanup = cleanup;

                    const startFadeIn = () => {
                        logoImg.classList.remove('fading-out');
                        logoImg.classList.add('fading-in');
                        const onInEnd = (ev) => {
                            if (ev.propertyName !== 'opacity') return;
                            logoImg.removeEventListener('transitionend', onInEnd);
                            cleanup();
                            logoImg.classList.remove('fading-in');
                        };
                        logoImg.addEventListener('transitionend', onInEnd);
                        inTimeout = setTimeout(() => {
                            logoImg.removeEventListener('transitionend', onInEnd);
                            cleanup();
                            logoImg.classList.remove('fading-in');
                        }, 400);
                    };

                    const onOutEnd = (ev) => {
                        if (ev.propertyName !== 'opacity') return;
                        logoImg.removeEventListener('transitionend', onOutEnd);
                        const onLoad = () => {
                            logoImg.removeEventListener('load', onLoad);
                            startFadeIn();
                        };
                        logoImg.addEventListener('load', onLoad);
                        logoImg.src = targetSrc;
                    };

                    // Inicia o fade-out e aguarda a transição terminar (com fallback por timeout)
                    logoImg.addEventListener('transitionend', onOutEnd);
                    logoImg.classList.add('fading-out');
                    outTimeout = setTimeout(() => {
                        logoImg.removeEventListener('transitionend', onOutEnd);
                        const onLoad = () => {
                            logoImg.removeEventListener('load', onLoad);
                            startFadeIn();
                        };
                        logoImg.addEventListener('load', onLoad);
                        logoImg.src = targetSrc;
                    }, 260);
                } catch (e) {
                    // Ignorar erros durante a troca da logo (não afetam a funcionalidade)
                }
            };
            sidebarToggle.addEventListener('click', () => {
                const isCollapsed = sidebar.classList.contains('collapsed');

                if (isCollapsed) {
                    // Expandir
                    sidebar.classList.remove('collapsed');
                    document.body.classList.remove('sidebar-collapsed');
                    mainContent.style.marginLeft = 'var(--sidebar-width)';
                } else {
                    // Colapsar
                    sidebar.classList.add('collapsed');
                    document.body.classList.add('sidebar-collapsed');
                    mainContent.style.marginLeft = '70px';
                }

                // Atualizar ícone do toggle
                const icon = sidebarToggle.querySelector('i');
                if (sidebar.classList.contains('collapsed')) {
                    icon.className = 'bi bi-list';
                    sidebarToggle.title = 'Expandir sidebar';
                } else {
                    icon.className = 'bi bi-x-lg';
                    sidebarToggle.title = 'Recolher sidebar';
                }

                // Salvar estado no localStorage
                localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
                // Swap logo with fade
                swapSidebarLogo(sidebar.classList.contains('collapsed'));
            });

            // Restaurar estado da sidebar a partir do localStorage
            const savedState = localStorage.getItem('sidebarCollapsed');
            if (savedState === 'true') {
                sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
                mainContent.style.marginLeft = '70px';
                const icon = sidebarToggle.querySelector('i');
                icon.className = 'bi bi-list';
                sidebarToggle.title = 'Expandir sidebar';
                swapSidebarLogo(true);
            } else {
                const icon = sidebarToggle.querySelector('i');
                icon.className = 'bi bi-x-lg';
                sidebarToggle.title = 'Recolher sidebar';
                swapSidebarLogo(false);
            }
        }

    // Upload de arquivo - botão único com detecção automática da API
        const uploadButton = document.getElementById('uploadButton');
        if (uploadButton) {
            uploadButton.addEventListener('click', () => {
                if (this.isFileSystemAccessSupported()) {
                    this.handleFileSystemAccess();
                } else {
                    this.createFallbackFileInput();
                }
            });
            // Delegar cliques do CTA da tabela para o botão de upload no header
            document.addEventListener('click', (e) => {
                try {
                    const target = e.target;
                    if (!target) return;
                    const uploadCTA = target.closest && target.closest('#tableUploadBtn');
                    if (uploadCTA) {
                        const headerUpload = document.getElementById('uploadButton');
                        if (headerUpload) headerUpload.click();
                    }
                } catch (err) {
                    // Ignorar exceções de delegação de clique
                }
            });
        }

        // Botão Carregar do SharePoint
        const loadFromSharePointButton = document.getElementById('loadFromSharePointButton');
        if (loadFromSharePointButton) {
            loadFromSharePointButton.addEventListener('click', () => {
                this.loadDataFromSharePoint();
            });
        }

        // Escutar mudanças na autenticação para mostrar/ocultar botão SharePoint
        document.addEventListener('azure-auth-changed', (e) => {
            this.updateSharePointButtonVisibility(e.detail.isAuthenticated);
        });

    // Observação: o botão de limpar foi removido do header intencionalmente - usuários substituem arquivos abrindo novos

    // Busca com filtro automático
        const searchInput = document.getElementById('searchInput');
        const autocompleteDropdown = document.getElementById('autocompleteDropdown');

        if (searchInput) {
            // Ao digitar, mostrar/esconder o botão de limpar
            searchInput.addEventListener('input', () => {
                this.toggleClearSearchButton();

                const query = searchInput.value;

                // Se há SmartSearchManager, usar busca inteligente
                if (this.smartSearchManager && query.length >= 2) {
                    // Autocomplete
                    this.smartSearchManager.autocompleteWithDebounce(query, (suggestions) => {
                        this.renderAutocompleteSuggestions(suggestions);
                    });

                    // Busca
                    this.smartSearchManager.searchWithDebounce(query, (results) => {
                        this.filteredServidores = results;
                        this.updateTable();
                        this.updateStats();

                        // Atualizar contador de chips
                        if (this.filterChipsUI) {
                            this.filterChipsUI.updateCounter(
                                this.filteredServidores.length,
                                this.allServidores.length
                            );
                        }
                    });
                } else if (query.length < 2) {
                    // Limpar autocomplete
                    if (autocompleteDropdown) {
                        autocompleteDropdown.style.display = 'none';
                    }

                    // Se busca vazia, mostrar todos
                    this.filteredServidores = this.allServidores;
                    this.updateTable();
                    this.updateStats();

                    if (this.filterChipsUI) {
                        this.filterChipsUI.updateCounter(
                            this.filteredServidores.length,
                            this.allServidores.length
                        );
                    }
                } else {
                    // Fallback para busca tradicional
                    this.handleSearch();
                }
            });

            // Tecla Enter executa a busca
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (autocompleteDropdown) {
                        autocompleteDropdown.style.display = 'none';
                    }
                    this.handleSearch();
                }

                // Escape fecha autocomplete
                if (e.key === 'Escape') {
                    if (autocompleteDropdown) {
                        autocompleteDropdown.style.display = 'none';
                    }
                }
            });

            // Fechar autocomplete ao clicar fora
            document.addEventListener('click', (e) => {
                if (autocompleteDropdown && !searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
                    autocompleteDropdown.style.display = 'none';
                }
            });
        }

    // Botão de limpar busca
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
                if (autocompleteDropdown) {
                    autocompleteDropdown.style.display = 'none';
                }
            });
        }

        // Age filter inputs
        const minAgeInput = document.getElementById('minAge');
        const maxAgeInput = document.getElementById('maxAge');
        if (minAgeInput && maxAgeInput) {
            [minAgeInput, maxAgeInput].forEach(input => {
                // Aplicar filtro automaticamente ao digitar
                input.addEventListener('input', () => {
                    this.applyAgeFilter();
                });

                // Manter funcionalidade do Enter
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.applyAgeFilter();
                    }
                });
            });
        }

        // Period filter (month selector)
        const periodFilter = document.getElementById('mesFilter');
        if (periodFilter) {
            periodFilter.addEventListener('change', () => this.applyAllFilters());
        }

    // Navegação entre páginas
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchPage(e.target.closest('.nav-item').dataset.page));
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.dataset.page;
                this.switchPage(pageId);
            });
        });

        // Table sorting
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => this.handleSort(e.currentTarget.dataset.column));
        });

    // Alterar visualização da timeline
        const timelineView = document.getElementById('timelineView');
        if (timelineView) {
            timelineView.addEventListener('change', (e) => this.updateTimelineView());
        }

    // Mudança do ano da timeline
        const timelineYear = document.getElementById('timelineYear');
        if (timelineYear) {
            timelineYear.addEventListener('change', (e) => this.updateTimelineChart());
        }

    // Mudança do mês da timeline
        const timelineMonth = document.getElementById('timelineMonth');
        if (timelineMonth) {
            timelineMonth.addEventListener('change', (e) => this.updateTimelineChart());
        }

    // Mudança do ano do calendário
        const calendarYear = document.getElementById('calendarYearFilter');
        if (calendarYear) {
            calendarYear.addEventListener('change', (e) => this.updateYearlyHeatmap());
        }

     // Botões de navegação do ano no calendário
        const prevYearBtn = document.getElementById('prevYearBtn');
        const nextYearBtn = document.getElementById('nextYearBtn');
        if (prevYearBtn && nextYearBtn) {
            prevYearBtn.addEventListener('click', () => this.changeCalendarYear(-1));
            nextYearBtn.addEventListener('click', () => this.changeCalendarYear(1));
        }

        // Close calendar day modal
        const calendarDayCloseBtn = document.getElementById('calendarDayCloseBtn');
        if (calendarDayCloseBtn) {
            calendarDayCloseBtn.addEventListener('click', () => this.closeCalendarDayModal());
        }
        
        // Close modal ao clicar no backdrop
        const calendarDayModal = document.getElementById('calendarDayModal');
        if (calendarDayModal) {
            const backdrop = calendarDayModal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => this.closeCalendarDayModal());
            }
        }

    // Cliques na legenda de urgência
        document.querySelectorAll('.legend-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.highlightUrgency(e.currentTarget.dataset.urgency);
            });
        });

    // Listeners para filtros de licenças prêmio
        const mesFilter = document.getElementById('mesFilter');
        if (mesFilter) {
            mesFilter.addEventListener('change', () => {
                const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';
                if (isLicencaPremio) {
                    this.applyAllFilters();
                } else {
                    // Para tabelas regulares, também pode haver necessidade de filtros
                    this.applyTableFilter();
                }
            });
        }

    // Fechar modais com a tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeProblemsModal();
                this.closeTimelineModal();
                this.closePeriodStatsModal();
            }
        });

    // Cliques no backdrop do modal para fechar
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'detailsModal') {
                    this.closeModal();
                } else if (e.target.id === 'problemsModal') {
                    this.closeProblemsModal();
                } else if (e.target.id === 'timelineModal') {
                    this.closeTimelineModal();
                } else if (e.target.id === 'periodStatsModal') {
                    this.closePeriodStatsModal();
                }
            } else if (e.target.classList.contains('modal-backdrop')) {
                if (e.target.closest('#modal') || e.target.closest('#detailsModal')) {
                    this.closeModal();
                } else if (e.target.closest('#problemsModal')) {
                    this.closeProblemsModal();
                } else if (e.target.closest('#timelineModal')) {
                    this.closeTimelineModal();
                } else if (e.target.closest('#periodStatsModal')) {
                    this.closePeriodStatsModal();
                }
            }
        });

    // Botão de fechar modal
        const modalCloseBtn = document.getElementById('closeModal') || document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => this.closeModal());
        }

    // Botão de fechar modal de problemas
        const problemsModalCloseBtn = document.getElementById('problemsModalCloseBtn');
        if (problemsModalCloseBtn) {
            problemsModalCloseBtn.addEventListener('click', () => this.closeProblemsModal());
        }

    // Botão de fechar modal da timeline
        const timelineModalCloseBtn = document.getElementById('timelineModalCloseBtn');
        if (timelineModalCloseBtn) {
            timelineModalCloseBtn.addEventListener('click', () => this.closeTimelineModal());
        }

    

    // Botão de fechar modal de estatísticas do período
        const periodStatsModalCloseBtn = document.getElementById('periodStatsModalCloseBtn');
        if (periodStatsModalCloseBtn) {
            periodStatsModalCloseBtn.addEventListener('click', () => this.closePeriodStatsModal());
        }

    // Clique no cartão de problemas
        const errorCard = document.getElementById('errorCard');
        if (errorCard) {
            errorCard.addEventListener('click', () => this.showProblemsModal());
        }

        // Busca de notificações
        const notificationsSearchInput = document.getElementById('notificationsSearchInput');
        if (notificationsSearchInput) {
            notificationsSearchInput.addEventListener('input', () => {
                this.filterNotifications();
            });
        }

        // Filtro de status
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterNotifications();
            });
        }

        // Exportar notificações - Será configurado pelo ExportManager em setupExportEventListeners()

    // Delegação de eventos para botões criados dinamicamente
        document.addEventListener('click', (e) => {
            // Botões de detalhes do servidor
            if (e.target.closest('.btn-icon[data-servidor-nome]')) {
                const button = e.target.closest('.btn-icon[data-servidor-nome]');
                const nomeServidorEscapado = button.getAttribute('data-servidor-nome');
                // Unescape the name to find the servidor
                const nomeServidor = nomeServidorEscapado.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                this.showServidorDetails(nomeServidor);
            }

            // Cliques nas legendas
            if (e.target.closest('.legend-card[data-urgency]')) {
                const legendCard = e.target.closest('.legend-card[data-urgency]');
                const urgency = legendCard.getAttribute('data-urgency');
                const urgencyIndex = ['critical', 'high', 'moderate', 'low'].indexOf(urgency);
                
                // Legendas podem destacar o gráfico (comportamento tradicional)
                this.filterTableByUrgency(urgency, urgencyIndex, true);

                // Atualizar estado visual da legenda
                document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
                legendCard.classList.add('active');
            }

            // Clique em stat-card - filtrar por urgência
            if (e.target.closest('.stat-card')) {
                const statCard = e.target.closest('.stat-card');
                
                // Não filtrar se for o card de "Problemas"
                if (statCard.id === 'errorCard') {
                    return; // Já tem handler específico acima
                }
                
                // Mapear classes de cards para urgências
                let urgency = null;
                let urgencyIndex = -1;
                
                if (statCard.classList.contains('critical')) {
                    urgency = 'critical';
                    urgencyIndex = 0;
                } else if (statCard.classList.contains('high')) {
                    urgency = 'high';
                    urgencyIndex = 1;
                } else if (statCard.classList.contains('moderate')) {
                    urgency = 'moderate';
                    urgencyIndex = 2;
                }
                
                if (urgency !== null) {
                    // Toggle: se já estiver ativo, desativar
                    if (statCard.classList.contains('active')) {
                        statCard.classList.remove('active');
                        this.clearUrgencyFilter(false); // false = não destacar gráfico
                    } else {
                        // Remover active de todos os cards
                        document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
                        statCard.classList.add('active');
                        
                        // Cards NÃO destacam o gráfico (false)
                        this.filterTableByUrgency(urgency, urgencyIndex, false);
                    }
                }
            }
        });
        
        // Botões de filtro da sidebar
        const btnAdvancedFilters = document.getElementById('btnAdvancedFilters');
        const btnClearAllFilters = document.getElementById('btnClearAllFilters');
        
        if (btnAdvancedFilters) {
            btnAdvancedFilters.addEventListener('click', () => {
                // Abrir modal de filtros avançados
                this.openFiltersModal();
            });
        }
        
        if (btnClearAllFilters) {
            btnClearAllFilters.addEventListener('click', async () => {
                // Confirmar antes de limpar
                const confirmed = await window.customModal.confirm({
                    title: 'Limpar Todos os Filtros',
                    message: 'Tem certeza que deseja remover todos os filtros aplicados? Esta ação não pode ser desfeita.',
                    type: 'warning',
                    confirmText: 'Limpar Tudo',
                    cancelText: 'Cancelar'
                });

                if (confirmed) {
                    this.clearAllFilters();
                }
            });
        }
        
        // Link de Dicas e Atalhos no footer da sidebar
        const sidebarInfoLink = document.querySelector('.sidebar-info-link[data-page]');
        if (sidebarInfoLink) {
            sidebarInfoLink.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = sidebarInfoLink.dataset.page;
                this.switchPage(pageId);
            });
        }
    }
    
    /**
     * Mostrar toast de feedback
     */
    showToast(message, type = 'info') {
        // Centraliza todas as notificações no NotificationManager
        if (this.notificationManager && typeof this.notificationManager.showToast === 'function') {
            this.notificationManager.showToast({
                title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Aviso',
                message,
                priority: type === 'success' ? 'low' : type === 'error' ? 'critical' : 'high',
                icon: type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-x-circle' : 'bi-exclamation-circle'
            });
        } else {
            // fallback usando customModal
            window.customModal?.alert({
                title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Aviso',
                message: message,
                type: type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'
            });
        }
    }

    /**
     * Atualizar badge de filtros ativos
     */
    updateFiltersBadge() {
        const badge = document.getElementById('activeFiltersBadge');
        if (!badge) return;

        let activeCount = 0;

        // Contar filtros básicos
        if (this.currentFilters.search) activeCount++;
        if (this.currentFilters.age.min !== 18 || this.currentFilters.age.max !== 70) activeCount++;
        if (this.currentFilters.cargo) activeCount++;
        if (this.currentFilters.urgency && this.currentFilters.urgency !== 'all') activeCount++;

        // Contar filtros avançados do AdvancedFiltersBuilder
        if (this.advancedFiltersBuilder && this.advancedFiltersBuilder.filters) {
            activeCount += this.advancedFiltersBuilder.filters.length;
        }

        // Atualizar badge
        if (activeCount > 0) {
            badge.textContent = activeCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        // Atualizar estado do botão limpar
        const clearBtn = document.getElementById('btnClearAllFilters');
        if (clearBtn) {
            clearBtn.disabled = activeCount === 0;
        }
    }

    /**
     * Configurar event listeners para exportação
     */
    setupExportEventListeners() {
        // Botão de exportação de servidores
        const exportServidoresBtn = document.getElementById('exportServidoresBtn');
        if (exportServidoresBtn && this.exportManager) {
            exportServidoresBtn.addEventListener('click', async () => {
                if (this.filteredServidores && this.filteredServidores.length > 0) {
                    this.showGlobalLoading('Exportando servidores...');
                    try {
                        await this.exportManager.showExportModal('servidores');
                    } finally {
                        this.hideGlobalLoading();
                    }
                } else {
                    this.exportManager.showErrorToast('Não há dados para exportar');
                }
            });
        }

        // Botão de exportação de notificações
        const exportNotificacoesBtn = document.getElementById('exportNotificacoesBtn');
        if (exportNotificacoesBtn && this.exportManager) {
            exportNotificacoesBtn.addEventListener('click', async () => {
                if (this.filteredNotificacoes && this.filteredNotificacoes.length > 0) {
                    this.showGlobalLoading('Exportando notificações...');
                    try {
                        await this.exportManager.showExportModal('notificacoes');
                    } finally {
                        this.hideGlobalLoading();
                    }
                } else {
                    this.exportManager.showErrorToast('Não há notificações para exportar');
                }
            });
        }
    }

    initNavigation() {
        // Restaurar última página visitada ou usar 'home' como padrão
        const lastPage = localStorage.getItem('sutri_lastPage') || 'home';
        this.switchPage(lastPage);
    }

    switchPage(pageId) {
        const allowedPages = new Set(['home', 'calendar', 'timeline', 'reports', 'notifications', 'tips', 'settings']);

        if (!allowedPages.has(pageId)) {
            console.warn('[Dashboard] Página desconhecida informada a switchPage:', pageId);
            pageId = 'home';
        }

        this.currentPage = pageId;

        try {
            localStorage.setItem('sutri_lastPage', pageId);
        } catch (error) {
            console.warn('[Dashboard] Não foi possível persistir a página atual no localStorage:', error);
        }

        document.querySelectorAll('.nav-link.active').forEach(btn => btn.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        let targetPage = null;
        const targetId = `${pageId}Page`;
        document.querySelectorAll('.page-content').forEach(page => {
            const isActive = page.id === targetId;
            page.classList.toggle('active', isActive);
            if (isActive) {
                targetPage = page;
            }
        });

        if (!targetPage) {
            console.warn('[Dashboard] Conteúdo da página não encontrado para:', pageId);
        }

        const titles = {
            home: 'Visão Geral',
            calendar: 'Calendário',
            timeline: 'Timeline',
            reports: 'Relatórios',
            notifications: 'Notificações',
            tips: 'Dicas e Atalhos',
            settings: 'Configurações'
        };
        const pageTitle = titles[pageId] || pageId;
        document.title = `${pageTitle} - Dashboard Licenças`;

        const pageTitleElement = document.querySelector('[data-role="current-page-title"], .current-page-title');
        if (pageTitleElement) {
            pageTitleElement.textContent = pageTitle;
        }

        const safeInvoke = (label, fn) => {
            try {
                if (typeof fn === 'function') {
                    fn();
                }
            } catch (error) {
                console.error(`[Dashboard] Falha ao preparar a página "${label}":`, error);
            }
        };

        if (pageId === 'calendar') {
            safeInvoke('calendar', () => this.updateYearlyHeatmap());
        } else if (pageId === 'timeline') {
            safeInvoke('timeline', () => this.createTimelineChart());
        } else if (pageId === 'reports') {
            safeInvoke('reports', () => {
                console.log('📊 Navegando para reports...');
                if (this.reportBuilderPremium && typeof this.reportBuilderPremium.open === 'function') {
                    this.reportBuilderPremium.open();
                } else if (this.reportsManager && typeof this.reportsManager.showReportsPage === 'function') {
                    this.reportsManager.showReportsPage();
                }

                if (typeof this.updateReportsStats === 'function') {
                    this.updateReportsStats();
                }

                if (this.reportsManager && typeof this.reportsManager.schedulePreview === 'function') {
                    this.reportsManager.schedulePreview();
                }
            });
        } else if (pageId === 'home') {
            safeInvoke('home-chart', () => this.createUrgencyChart());
            safeInvoke('home-table', () => this.updateTable());
        } else if (pageId === 'notifications') {
            safeInvoke('notifications-stats', () => this.updateNotificationsStats());
            safeInvoke('notifications-table', () => this.renderNotificationsTable());
        } else if (pageId === 'tips') {
            safeInvoke('tips-shortcuts', () => this.populateTipsKeyboardShortcuts());
        } else if (pageId === 'settings') {
            safeInvoke('settings-ui', () => {
                if (window.settingsManager && typeof window.settingsManager.updateUI === 'function') {
                    window.settingsManager.updateUI();
                }
            });
        }
    }

    switchFilters(pageId) {
        // Esconder todos os filtros de página
        document.querySelectorAll('.page-filters').forEach(filters => {
            filters.style.display = 'none';
            filters.classList.remove('active');
        });

    // Exibir filtros da página atual
        const currentFilters = document.getElementById(`${pageId}Filters`);
        if (currentFilters) {
            currentFilters.style.display = 'flex';
            currentFilters.classList.add('active');
        }

    // Atualizar visibilidade do container de filtros
        const filtersBar = document.querySelector('.filters-bar');
        if (filtersBar) {
            filtersBar.style.display = currentFilters ? 'block' : 'none';
        }
    }

    /**
     * Alterna entre as visualizações de Cronograma e Notificações automaticamente
     */
    switchView(viewType) {
        // Atualizar conteúdo - esconder todas as views primeiro
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.remove('active');
        });
        
        if (viewType === 'cronograma') {
            document.getElementById('cronogramaView')?.classList.add('active');
        } else if (viewType === 'notificacoes') {
            document.getElementById('notificacoesView')?.classList.add('active');
            // Atualizar dados quando trocar para notificações
            this.updateNotificationsStats();
            this.renderNotificationsTable();
        }
    }

    initPeriodTabs() {
        // Função removida - elementos não existem no novo layout
        // Os filtros de ano são aplicados diretamente nos elementos existentes
        const currentYear = new Date().getFullYear();
    // ano atual
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        const statusElement = document.getElementById('uploadStatus');

        if (!file) return;

        // Verificar tipo de arquivo
        const allowedTypes = ['.csv', '.xlsx', '.xls'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedTypes.includes(fileExtension)) {
            if (statusElement) {
                statusElement.className = 'file-status error';
                statusElement.textContent = 'Tipo de arquivo não suportado. Use arquivos CSV ou Excel';
            } else {
                window.customModal?.alert({
                    title: 'Arquivo Inválido',
                    message: 'Tipo de arquivo não suportado. Use arquivos CSV ou Excel (.csv, .xlsx, .xls)',
                    type: 'warning'
                });
            }
            event.target.value = '';
            return;
        }

        if (statusElement) {
            statusElement.className = 'upload-status loading';
            statusElement.innerHTML = `
                <i class="bi bi-arrow-repeat"></i>
                <span class="file-info">Processando ${file.name}...</span>
            `;
        }

    this.showGlobalLoading('Importando arquivo...');

        try {
            let data = '';

            if (fileExtension === '.csv') {
                data = await this.readFileAsText(file);
            } else {
                data = await this.readExcelFile(file);
            }

            // Validar se o arquivo tem conteúdo
            if (!data || data.trim().length === 0) {
                throw new Error('Arquivo vazio ou não foi possível ler o conteúdo');
            }

            // Validação adicional: verificar se parece ser texto válido
            // Detectar arquivos binários que passaram pela leitura
            const invalidCharsCount = (data.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
            const totalChars = Math.min(data.length, 1000); // Verificar primeiros 1000 caracteres
            if (invalidCharsCount > totalChars * 0.1) { // Se mais de 10% são caracteres inválidos
                throw new Error('O arquivo parece ser binário ou corrompido. Use um arquivo CSV ou Excel válido');
            }

            // Validar headers CSV básicos
            const lines = data.split('\n');
            if (lines.length < 2) {
                throw new Error('Arquivo deve ter pelo menos uma linha de header e uma linha de dados');
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));

            // ==================== DETECÇÃO AUTOMÁTICA DO TIPO DE ARQUIVO ====================
            const headersStr = headers.join(',').toLowerCase();
            
            // Detectar se é arquivo de NOTIFICAÇÕES
            const isNotificacoes = headersStr.includes('interessado') && 
                                  (headersStr.includes('processo') || headersStr.includes('notifica'));
            
            // Detectar se é arquivo de LICENÇA PRÊMIO (cronograma)
            const isLicencaPremio = headersStr.includes('inicio de licença') || 
                                   headersStr.includes('final de licença');

            // Se for notificações, processar como tal e trocar de aba
            if (isNotificacoes) {
                try {
                    this.notificacoes = this.parser.processarNotificacoes(data);
                    this.filteredNotificacoes = [...this.notificacoes];
                    
                    // Limpar dados de servidores/licenças (é um ou outro, não ambos)
                    this.allServidores = [];
                    this.filteredServidores = [];
                    
                    // Trocar para aba de notificações
                    this.switchView('notificacoes');
                    
                    // Atualizar interface
                    this.updateNotificationsStats();
                    this.renderNotificationsTable();
                    
                    // Atualizar calendário e timeline se estiverem na página atual
                    if (this.currentPage === 'calendar') {
                        this.updateYearlyHeatmap();
                    } else if (this.currentPage === 'timeline') {
                        this.createTimelineChart();
                    }
                    
                    // Mostrar mensagem de sucesso
                    this.showImportNotification('success', 
                        `${this.notificacoes.length} notificações carregadas com sucesso`, 
                        file.name
                    );
                    
                    if (statusElement) {
                        statusElement.className = 'upload-status success';
                        statusElement.innerHTML = `
                            <i class="bi bi-check-circle"></i>
                            <span class="file-info">✓ ${file.name} (${this.notificacoes.length} notificações)</span>
                        `;
                    }

                    // Salvar no cache (IndexedDB) se disponível
                    console.log(`🔍 Verificando cache para notificações: cacheManager=${!!this.cacheManager}, notificacoes=${this.notificacoes.length}`);
                    if (this.cacheManager && this.notificacoes.length > 0) {
                        try {
                            console.log(`💾 Tentando salvar ${file.name} no cache...`);
                            const fileId = await this.cacheManager.saveFile(file.name, data, this.notificacoes);
                            this.currentCacheFileId = fileId;
                            console.log(`✅ Arquivo salvo no cache (ID: ${fileId})`);
                            await this.updateRecentFilesUI();
                        } catch (cacheError) {
                            console.error('❌ Erro ao salvar no cache:', cacheError);
                        }
                    }

                    return; // Sair da função - não processar como cronograma
                } catch (notifError) {
                    throw new Error(`Erro ao processar notificações: ${notifError.message}`);
                }
            }

            // Validação para cronograma
            let requiredHeaders, missingHeaders;

            if (isLicencaPremio) {
                // Validação para tabela de licenças prêmio
                requiredHeaders = ['SERVIDOR', 'CARGO'];
                missingHeaders = requiredHeaders.filter(header =>
                    !headers.some(h => h.toUpperCase().includes(header))
                );
            } else {
                // Validação para tabela original
                requiredHeaders = ['SERVIDOR', 'CRONOGRAMA'];
                missingHeaders = requiredHeaders.filter(header =>
                    !headers.some(h => h.toUpperCase().includes(header))
                );
            }

            if (missingHeaders.length > 0) {
                throw new Error(`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}`);
            }

            this.processData(data);
            this.updateLastUpdate();

            // Salvar no cache (IndexedDB) se disponível - APÓS processamento
            console.log(`🔍 Verificando cache: cacheManager=${!!this.cacheManager}, servidores=${this.allServidores.length}`);

            if (this.cacheManager) {
                if (this.allServidores.length > 0) {
                    try {
                        console.log(`💾 Tentando salvar ${file.name} no cache...`);
                        const fileId = await this.cacheManager.saveFile(file.name, data, this.allServidores);
                        this.currentCacheFileId = fileId;
                        console.log(`✅ Arquivo salvo no cache (ID: ${fileId})`);
                        await this.updateRecentFilesUI();
                    } catch (cacheError) {
                        console.error('❌ Erro ao salvar no cache:', cacheError);
                    }
                } else {
                    console.warn('⚠️ Nenhum servidor processado - não salvando no cache');
                }
            } else {
                console.warn('⚠️ CacheManager não inicializado');
            }

            // Tentar obter file handle se suportado
            let fileHandle = null;
            if ('showOpenFilePicker' in window && event.target.files) {
                try {
                    // Para arquivos selecionados via input, não temos file handle direto
                    // Mas podemos salvar os dados de forma inteligente
                    const success = await this.saveFileHandleToStorage(null, file.name, data, fileExtension);
                    if (!success) {
                        // Fallback para método tradicional
                        this.saveFileToLocalStorage(file.name, data, fileExtension);
                    }
                } catch (error) {
                    console.warn('Erro ao salvar com File System API, usando fallback:', error);
                    this.saveFileToLocalStorage(file.name, data, fileExtension);
                }
            } else {
                // Navegador não suporta File System Access API
                this.saveFileToLocalStorage(file.name, data, fileExtension);
            }

            await this.updateStoredFileIndicators();

            // Mostrar notificação de sucesso com resumo
            this.showImportSuccessNotification(file.name, this.allServidores.length, this.loadingProblems.length);

            if (statusElement) {
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    <span class="file-info">✓ ${file.name} (${this.allServidores.length} servidores)</span>
                `;
            }

        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            
            // Adicionar problema detalhado
            this.addLoadingProblem('Importação de arquivo', this.diagnosticarErroImportacao(error), `Arquivo: ${file.name}`);
            
            // Mostrar notificação de erro
            this.showImportNotification('error', error.message, file.name);
            
            if (statusElement) {
                statusElement.className = 'upload-status error';
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="file-info">✗ ${error.message}</span>
                `;
            } else {
                window.customModal?.alert({
                    title: 'Erro ao Processar',
                    message: `Erro ao processar arquivo: ${error.message}`,
                    type: 'danger'
                });
            }

            // Reset file input on error
            event.target.value = '';

        } finally {
            this.hideGlobalLoading();
        }
    }

    // Local Storage functions for auto-reload with File System Access API
    async saveFileHandleToStorage(fileHandle, fileName, fileData, fileType) {
        try {
            // Verificar se o navegador suporta File System Access API
            if (!('showOpenFilePicker' in window)) {
                // Navegador sem File System Access API — usar fallback
                return this.saveFileToLocalStorage(fileName, fileData, fileType);
            }

            const fileInfo = {
                name: fileName,
                type: fileType,
                timestamp: Date.now(),
                uploadDate: new Date().toISOString(),
                size: fileData.length,
                hasFileHandle: true
            };

            // Salvar informações básicas no localStorage (sem os dados)
            localStorage.setItem('lastUploadedFile', JSON.stringify(fileInfo));

            // Salvar file handle no IndexedDB (mais seguro que localStorage)
            await this.saveFileHandleToIndexedDB(fileHandle, fileName);

            // File handle salvo — indicadores serão atualizados
            // Após salvar o handle, solicitar atualização da UI para mostrar indicadores imediatamente
            try {
                if (window.dashboard && typeof window.dashboard.updateStoredFileIndicators === 'function') {
                    window.dashboard.updateStoredFileIndicators();
                }
            } catch (e) {
                // Ignorar erros não críticos ao atualizar indicadores
            }
            return true;
        } catch (error) {
            console.error('Erro ao salvar file handle:', error);
            // Fallback para método tradicional
            return this.saveFileToLocalStorage(fileName, fileData, fileType);
        }
    }

    async saveFileHandleToIndexedDB(fileHandle, fileName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('DashboardFiles', 1);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['fileHandles'], 'readwrite');
                const store = transaction.objectStore('fileHandles');

                const data = {
                    id: 'lastFile',
                    handle: fileHandle,
                    fileName: fileName,
                    timestamp: Date.now()
                };

                const putRequest = store.put(data);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
        });
    }
    async getFileHandleFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('DashboardFiles', 1);

            request.onerror = () => resolve(null);

            request.onsuccess = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('fileHandles')) {
                    resolve(null);
                    return;
                }

                const transaction = db.transaction(['fileHandles'], 'readonly');
                const store = transaction.objectStore('fileHandles');
                const getRequest = store.get('lastFile');

                getRequest.onsuccess = () => {
                    resolve(getRequest.result || null);
                };
                getRequest.onerror = () => resolve(null);
            };
        });
    }

    createFallbackFileInput() {
        // Criar input file temporário para navegadores sem suporte à File System Access API
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = '.csv,.xlsx,.xls';
        tempInput.style.display = 'none';

        tempInput.addEventListener('change', (e) => {
            this.handleFileUpload(e);
            // Remover o input temporário após uso
            tempInput.remove();
        });

        document.body.appendChild(tempInput);
        tempInput.click();
    }

    showFileNotFoundError(fileName, statusElement) {
        // Atualizar status element se disponível
        if (statusElement) {
            statusElement.className = 'upload-status error';
            statusElement.innerHTML = `
                <i class="bi bi-exclamation-triangle"></i>
                <span class="file-info">✗ Arquivo não encontrado: ${fileName}</span>
            `;
        }

        // Criar modal de erro mais detalhado
        const errorModal = document.createElement('div');
        errorModal.className = 'file-not-found-modal';
        errorModal.innerHTML = `
            <div class="modal-overlay" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.7); z-index: 10000; 
                display: flex; align-items: center; justify-content: center;
            ">
                <div class="modal-content" style="
                    background: var(--bg-secondary); 
                    border-radius: 12px; 
                    padding: 24px; 
                    max-width: 500px; 
                    margin: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <div class="error-header" style="text-align: center; margin-bottom: 20px;">
                        <i class="bi bi-exclamation-triangle" style="
                            font-size: 48px; 
                            color: #dc3545; 
                            display: block; 
                            margin-bottom: 12px;
                        "></i>
                        <h3 style="color: var(--text-primary); margin: 0; font-size: 20px;">
                            Arquivo não encontrado
                        </h3>
                    </div>
                    
                    <div class="error-body" style="margin-bottom: 24px; text-align: center;">
                        <p style="color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px 0;">
                            O arquivo <strong>"${fileName}"</strong> não foi encontrado.
                        </p>
                        <p style="color: var(--text-secondary); line-height: 1.5; margin: 0; font-size: 14px;">
                            Possíveis motivos:<br>
                            • Arquivo foi movido para outra pasta<br>
                            • Arquivo foi renomeado<br>
                            • Arquivo foi excluído<br>
                            • Dispositivo removível foi desconectado
                        </p>
                    </div>
                    
                    <div class="error-actions" style="
                        display: flex; 
                        gap: 12px; 
                        justify-content: center;
                        flex-wrap: wrap;
                    ">
                        <button class="btn-select-new" style="
                            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">
                            <i class="bi bi-folder2-open"></i>
                            Selecionar Novo Arquivo
                        </button>
                        <button class="btn-cancel" style="
                            background: var(--bg-tertiary);
                            color: var(--text-secondary);
                            border: 1px solid var(--border);
                            padding: 10px 20px;
                            border-radius: 6px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        ">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(errorModal);

    // Listeners para os botões
        const selectNewBtn = errorModal.querySelector('.btn-select-new');
        const cancelBtn = errorModal.querySelector('.btn-cancel');

        selectNewBtn.addEventListener('click', () => {
            errorModal.remove();
            // Trigger do botão de upload
            const uploadButton = document.getElementById('uploadButton');
            if (uploadButton) {
                uploadButton.click();
            }
        });

        cancelBtn.addEventListener('click', () => {
            errorModal.remove();
            this.showEmptyState();
        });

        // Fechar ao clicar no overlay
        errorModal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === errorModal.querySelector('.modal-overlay')) {
                errorModal.remove();
                this.showEmptyState();
            }
        });

        // Hover effects
        selectNewBtn.addEventListener('mouseenter', () => {
            selectNewBtn.style.transform = 'translateY(-2px)';
            selectNewBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        selectNewBtn.addEventListener('mouseleave', () => {
            selectNewBtn.style.transform = 'translateY(0)';
            selectNewBtn.style.boxShadow = 'none';
        });
    }

    isFileSystemAccessSupported() {
        return 'showOpenFilePicker' in window;
    }

    addFileSystemIndicator() {
        // Deprecated: prefer controlar o indicador via elemento presente no HTML e
        // através de updateStoredFileIndicators(). 
        // Mantido para compatibilidade se chamado manualmente.
        const uploadButton = document.getElementById('uploadButton');
        if (!uploadButton) return;
        const existing = document.getElementById('fsApiIndicator');
        if (existing) return;
        const indicator = document.createElement('span');
        indicator.id = 'fsApiIndicator';
        indicator.className = 'fs-api-indicator';
        indicator.title = 'File System Access API disponível - acesso direto aos arquivos';
        indicator.style.display = 'none';
        uploadButton.appendChild(indicator);
    }

    async handleFileSystemAccess() {
        try {
            const fileHandles = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Arquivos de dados',
                        accept: {
                            'text/csv': ['.csv'],
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                            'application/vnd.ms-excel': ['.xls']
                        }
                    }
                ],
                multiple: false
            });

            const fileHandle = fileHandles[0];
            const file = await fileHandle.getFile();

            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.className = 'upload-status loading';
                statusElement.innerHTML = `
                    <i class="bi bi-arrow-repeat"></i>
                    <span class="file-info">Processando ${file.name}...</span>
                `;
            }

            this.showLoading();

            let data = '';
            const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

            if (fileExtension === '.csv') {
                data = await file.text();
            } else {
                data = await this.readExcelFileContent(file);
            }

            // ==================== DETECÇÃO AUTOMÁTICA DO TIPO DE ARQUIVO ====================
            const lines = data.split('\n');
            if (lines.length < 2) {
                throw new Error('Arquivo deve ter pelo menos uma linha de header e uma linha de dados');
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
            const headersStr = headers.join(',').toLowerCase();
            
            // Detectar se é arquivo de NOTIFICAÇÕES
            const isNotificacoes = headersStr.includes('interessado') && 
                                  (headersStr.includes('processo') || headersStr.includes('notifica'));
            
            // Se for notificações, processar como tal
            if (isNotificacoes) {
                try {
                    this.notificacoes = this.parser.processarNotificacoes(data);
                    this.filteredNotificacoes = [...this.notificacoes];
                    
                    // Limpar dados de servidores/licenças (é um ou outro, não ambos)
                    this.allServidores = [];
                    this.filteredServidores = [];
                    
                    // Trocar para aba de notificações
                    this.switchView('notificacoes');
                    
                    // Atualizar interface
                    this.updateNotificationsStats();
                    this.renderNotificationsTable();
                    
                    // Atualizar calendário e timeline se estiverem na página atual
                    if (this.currentPage === 'calendar') {
                        this.updateYearlyHeatmap();
                    } else if (this.currentPage === 'timeline') {
                        this.createTimelineChart();
                    }
                    
                    // Salvar file handle
                    await this.saveFileHandleToStorage(fileHandle, file.name, data, fileExtension);
                    await this.updateStoredFileIndicators();
                    
                    // Mostrar mensagem de sucesso
                    if (statusElement) {
                        statusElement.className = 'upload-status success';
                        statusElement.innerHTML = `
                            <i class="bi bi-check-circle"></i>
                            <span class="file-info">✓ ${file.name} (${this.notificacoes.length} notificações)</span>
                        `;
                    }
                    
                    this.hideLoading();
                    return; // Sair - não processar como cronograma
                } catch (notifError) {
                    throw new Error(`Erro ao processar notificações: ${notifError.message}`);
                }
            }

            // Processar como cronograma
            this.processData(data);
            this.updateLastUpdate();

            // Salvar file handle
            await this.saveFileHandleToStorage(fileHandle, file.name, data, fileExtension);
            await this.updateStoredFileIndicators();

            if (statusElement) {
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    <span class="file-info">✓ ${file.name} (acesso direto ativado)</span>
                `;
            }

        } catch (error) {
            console.error('Erro no File System Access:', error);

            if (error.name === 'AbortError') {
                    // usuário cancelou a seleção
                return;
            }

            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.className = 'upload-status error';
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="file-info">✗ ${error.message}</span>
                `;
            }
        } finally {
            this.hideLoading();
        }
    }

    // ==================== MÉTODOS SHAREPOINT ====================

    /**
     * Atualiza visibilidade do botão SharePoint baseado no estado de autenticação
     * Nota: Botão sempre visível, validação acontece ao clicar
     */
    updateSharePointButtonVisibility(isAuthenticated) {
        // Botão sempre visível - validações acontecem em loadDataFromSharePoint()
        return;
    }

    /**
     * Carrega dados da planilha do SharePoint
     * @param {boolean} silent - Se true, não mostra alertas de erro (para auto-load)
     */
    async loadDataFromSharePoint(silent = false) {
        // Verificar se SharePointDataLoader está disponível e inicializado
        if (typeof SharePointDataLoader === 'undefined') {
            console.warn('⚠️ SharePointDataLoader class não está carregada');
            if (!silent) {
                window.customModal?.alert({
                    title: 'SharePoint Indisponível',
                    message: 'O módulo de integração com SharePoint não está carregado.',
                    type: 'warning'
                });
            }
            throw new Error('SharePoint class not loaded');
        }

        // Inicializar SharePointDataLoader se ainda não foi
        if (!this.sharepointDataLoader && this.authenticationManager) {
            try {
                console.log('🔄 Inicializando SharePointDataLoader tardiamente...');
                this.sharepointDataLoader = new SharePointDataLoader(this);
                console.log('✅ SharePointDataLoader inicializado com sucesso');
            } catch (error) {
                console.error('❌ Erro ao inicializar SharePointDataLoader:', error);
                if (!silent) {
                    window.customModal?.alert({
                        title: 'Erro de Inicialização',
                        message: 'Não foi possível inicializar o módulo SharePoint.',
                        type: 'error'
                    });
                }
                throw new Error('Failed to initialize SharePoint module');
            }
        }

        if (!this.sharepointDataLoader) {
            console.warn('⚠️ SharePointDataLoader não pôde ser inicializado');
            if (!silent) {
                window.customModal?.alert({
                    title: 'SharePoint Indisponível',
                    message: 'O módulo de integração com SharePoint não está disponível.',
                    type: 'warning'
                });
            }
            throw new Error('SharePoint module not available');
        }

        if (!this.authenticationManager?.activeAccount) {
            if (!silent) {
                window.customModal?.alert({
                    title: 'Autenticação Necessária',
                    message: 'Faça login com sua conta Microsoft antes de carregar dados do SharePoint.',
                    type: 'warning'
                });
            }
            throw new Error('Authentication required');
        }

        const settingsManager = this.settingsManager || window.settingsManager;
        const sharepointUrl = settingsManager?.get('sharepointWorkbookUrl');
        if (!sharepointUrl || sharepointUrl.trim().length === 0) {
            if (!silent) {
                window.customModal?.alert({
                    title: 'URL não Configurada',
                    message: 'Configure a URL da planilha do SharePoint nas Configurações antes de continuar.',
                    type: 'warning'
                });
            }
            throw new Error('SharePoint URL not configured');
        }

        try {
            // Sempre mostrar skeleton loading (mesmo em modo silencioso)
            this.showHomeSkeletons();
            
            if (!silent) {
                this.showGlobalLoading('Carregando dados do SharePoint...');
            }

            // Carregar dados
            const data = await this.sharepointDataLoader.loadData();

            if (!data || data.length === 0) {
                throw new Error('Nenhum dado encontrado na planilha do SharePoint');
            }

            // Converter para CSV (formato esperado pelo parser)
            const csvData = this.convertArrayToCSV(data);

            // Processar como se fosse um arquivo carregado
            this.processData(csvData);
            this.updateLastUpdate();

            // Atualizar UI
            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-cloud-check"></i>
                    <span class="file-info">✓ SharePoint (${data.length} registros)</span>
                `;
            }

            // Sucesso silencioso ou com mensagem
            if (!silent) {
                this.showToast('success', `${data.length} registros carregados do SharePoint`);
            } else {
                console.log(`✅ SharePoint: ${data.length} registros carregados automaticamente`);
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao carregar dados do SharePoint:', error);
            
            if (!silent) {
                window.customModal?.alert({
                    title: 'Erro ao Carregar',
                    message: error.message || 'Não foi possível carregar os dados do SharePoint. Verifique a URL e suas permissões.',
                    type: 'danger'
                });
            }

            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.className = 'upload-status error';
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="file-info">✗ Erro ao carregar do SharePoint</span>
                `;
            }

            throw error; // Re-throw para que tryAutoLoad possa tratar
        } finally {
            if (!silent) {
                this.hideGlobalLoading();
            }
        }
    }

    /**
     * Mostra skeleton loading nos widgets da home
     */
    showHomeSkeletons() {
        if (!this.loadingSkeletons) return;
        
        // Skeleton no calendário
        const calendarContainer = document.querySelector('#calendarSection .chart-container');
        if (calendarContainer) {
            this.loadingSkeletons.showChartSkeleton(calendarContainer);
        }
        
        // Skeleton nos próximos vencimentos
        const timelineContainer = document.querySelector('#dashboardSection .info-cards');
        if (timelineContainer) {
            timelineContainer.innerHTML = `
                <div class="skeleton-card">
                    <div class="skeleton-line skeleton-line-title"></div>
                    <div class="skeleton-line skeleton-line-subtitle"></div>
                    <div class="skeleton-line skeleton-line-text"></div>
                </div>
            `.repeat(3);
        }
        
        // Skeleton na tabela
        const tableContainer = document.querySelector('#dashboardSection .servers-table-container');
        if (tableContainer) {
            this.loadingSkeletons.showTableSkeleton(tableContainer, 8);
        }
    }
    
    /**
     * Converte array de objetos para formato CSV
     */
    convertArrayToCSV(data) {
        if (!data || data.length === 0) {
            return '';
        }

        // Obter headers (chaves do primeiro objeto)
        const headers = Object.keys(data[0]);
        
        // Criar linha de header
        const headerLine = headers.join(',');
        
        // Criar linhas de dados
        const dataLines = data.map(obj => {
            return headers.map(header => {
                let value = obj[header];
                
                // Tratar valores especiais
                if (value === null || value === undefined) {
                    return '';
                }
                
                // Converter para string
                value = String(value);
                
                // Escapar aspas e adicionar aspas se necessário
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                
                return value;
            }).join(',');
        });
        
        // Juntar tudo
        return [headerLine, ...dataLines].join('\n');
    }

    // ==================== FIM MÉTODOS SHAREPOINT ====================

    saveFileToLocalStorage(fileName, fileData, fileType) {
        try {
            const fileInfo = {
                name: fileName,
                data: fileData,
                type: fileType,
                timestamp: Date.now(),
                uploadDate: new Date().toISOString()
            };

            // Armazenar apenas se o arquivo for menor que 5MB (limite aproximado do localStorage)
            const dataSize = new Blob([JSON.stringify(fileInfo)]).size;
            if (dataSize < 5 * 1024 * 1024) { // 5MB limit
                localStorage.setItem('lastUploadedFile', JSON.stringify(fileInfo));
                // arquivo salvo no localStorage (fallback)
                return true;
            } else {
                console.warn(`Arquivo ${fileName} muito grande para localStorage (${(dataSize / 1024 / 1024).toFixed(1)}MB)`);
                return false;
            }
        } catch (error) {
            console.error('Erro ao salvar arquivo no localStorage:', error);
            return false;
        }
    }

    async getLastFileFromStorage() {
        try {
            const storedData = localStorage.getItem('lastUploadedFile');
            if (!storedData) return null;

            const fileInfo = JSON.parse(storedData);

            // Verificar se o arquivo não é muito antigo (7 dias)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em ms
            if (Date.now() - fileInfo.timestamp > maxAge) {
                // localStorage expirado — remover entrada antiga
                this.clearStoredFile();
                return null;
            }

            // Se tem file handle, tentar recuperá-lo
            if (fileInfo.hasFileHandle && ('showOpenFilePicker' in window)) {
                const handleData = await this.getFileHandleFromIndexedDB();
                if (handleData && handleData.handle) {
                    fileInfo.fileHandle = handleData.handle;
                    return fileInfo;
                }
            }

            // Fallback: se tem dados salvos no formato antigo
            if (fileInfo.data) {
                return fileInfo;
            }

            return null;
        } catch (error) {
            console.error('Erro ao recuperar arquivo do localStorage:', error);
            return null;
        }
    }

    async getLastFileFromLocalStorage() {
        // Manter função original para compatibilidade
        return await this.getLastFileFromStorage();
    }

    async clearStoredFile() {
        try {
            localStorage.removeItem('lastUploadedFile');

            // Limpar também o IndexedDB
            try {
                const request = indexedDB.open('DashboardFiles', 1);
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    if (db.objectStoreNames.contains('fileHandles')) {
                        const transaction = db.transaction(['fileHandles'], 'readwrite');
                        const store = transaction.objectStore('fileHandles');
                        store.delete('lastFile');
                    }
                };
            } catch (dbError) {
                console.warn('Erro ao limpar IndexedDB:', dbError);
            }

            // arquivo armazenado removido do cache
            await this.updateStoredFileIndicators();
        } catch (error) {
            console.error('Erro ao remover arquivo do localStorage:', error);
        }
    }

    async updateStoredFileIndicators() {
        const storedFile = await this.getLastFileFromLocalStorage();
        const indicator = document.getElementById('storedFileIndicator');
        const uploadBtn = document.getElementById('uploadButton');
        const fsIndicator = document.getElementById('fsApiIndicator');

    // Verificar IndexedDB por um file handle, se necessário
        let hasHandle = false;
        try {
            if (storedFile && storedFile.hasFileHandle && ('showOpenFilePicker' in window)) {
                const handleData = await this.getFileHandleFromIndexedDB();
                if (handleData && handleData.handle) hasHandle = true;
            }
        } catch (e) {
            // Ignorar erro não crítico na checagem de handles
        }

        if (storedFile && indicator && uploadBtn) {
            // exibir pequeno badge no botão de upload
            indicator.style.display = 'inline-block';

            // atualizar tooltip do botão de upload para mostrar info do último arquivo
            const uploadDate = storedFile.uploadDate ? new Date(storedFile.uploadDate).toLocaleString('pt-BR') : '';
            uploadBtn.title = uploadDate ? `Carregar Dados (último: ${storedFile.name} em ${uploadDate})` : `Carregar Dados (último: ${storedFile.name})`;

            // Exibir indicador do FS somente se houver um file handle válido
            if (fsIndicator) fsIndicator.style.display = hasHandle ? 'inline-flex' : 'none';
        } else if (indicator && uploadBtn) {
            indicator.style.display = 'none';
            uploadBtn.title = 'Carregar Dados';
            if (fsIndicator) fsIndicator.style.display = 'none';
        }
    }

    async tryAutoLoad() {
        console.log('📍 tryAutoLoad() iniciado');
        
        // 1️⃣ PRIORIDADE: Tentar carregar do SharePoint automaticamente (silencioso)
        console.log('🔍 Verificando autenticação:', {
            hasAuthManager: !!this.authenticationManager,
            hasActiveAccount: !!this.authenticationManager?.activeAccount,
            accountName: this.authenticationManager?.activeAccount?.name
        });
        console.log('🔍 settingsManager:', {
            thisExists: !!this.settingsManager,
            windowExists: !!window.settingsManager,
            type: typeof window.settingsManager
        });
        
        // Usar window.settingsManager se this.settingsManager não existir
        const settingsManager = this.settingsManager || window.settingsManager;
        
        if (this.authenticationManager?.activeAccount) {
            const sharepointUrl = settingsManager?.get('sharepointWorkbookUrl');
            console.log('🔍 URL do SharePoint:', sharepointUrl);
            console.log('🔍 Todas as settings:', settingsManager?.settings);
            
            if (sharepointUrl && sharepointUrl.trim().length > 0) {
                try {
                    console.log('🔄 Iniciando carregamento automático do SharePoint...');
                    await this.loadDataFromSharePoint(true); // silent = true
                    console.log('✅ SharePoint carregado com sucesso!');
                    return true; // Sucesso - não precisa carregar arquivo local
                } catch (error) {
                    console.error('❌ Erro ao carregar do SharePoint:', error);
                    console.warn('⚠️ Falha no carregamento automático do SharePoint:', error.message);
                    // Continua para tentar arquivo local
                }
            } else {
                console.log('ℹ️ Nenhuma URL do SharePoint configurada');
            }
        } else {
            console.log('ℹ️ Usuário não autenticado - pulando SharePoint');
        }

        // 2️⃣ FALLBACK: Tentar carregar último arquivo local
        const lastFile = await this.getLastFileFromLocalStorage();
        if (!lastFile) {
            return false;
        }

        // Mostrar notificação para o usuário
        this.showAutoLoadNotification(lastFile, () => this.performAutoLoad(lastFile));
        return true;
    }

    showAutoLoadNotification(fileInfo, onConfirm) {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = 'auto-load-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <i class="bi bi-clock-history"></i>
                    <span class="notification-title">Último arquivo encontrado</span>
                </div>
                <div class="notification-body">
                    <p class="file-info">
                        <strong>${fileInfo.name}</strong><br>
                        <small>Carregado em ${new Date(fileInfo.uploadDate).toLocaleString('pt-BR')}</small>
                    </p>
                    <div class="notification-actions">
                        <button class="btn btn-primary btn-sm" id="autoLoadYes">
                            <i class="bi bi-upload"></i>
                            Carregar Novamente
                        </button>
                        <button class="btn btn-secondary btn-sm" id="autoLoadNo">
                            <i class="bi bi-x"></i>
                            Carregar Novo Arquivo
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 100);

    // Listeners
        document.getElementById('autoLoadYes').addEventListener('click', () => {
            onConfirm();
            this.removeNotification(notification);
        });

        document.getElementById('autoLoadNo').addEventListener('click', () => {
            this.clearStoredFile();
            this.removeNotification(notification);
        });

        // Auto-dismiss após 10 segundos
        setTimeout(() => {
            if (document.body.contains(notification)) {
                this.removeNotification(notification);
            }
        }, 10000);
    }

    removeNotification(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }

    async performAutoLoad(fileInfo) {
        this.showLoading();

        try {
            // Simular elemento de status
            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.className = 'upload-status loading';
                statusElement.innerHTML = `
                    <i class="bi bi-arrow-repeat"></i>
                    <span class="file-info">Recarregando ${fileInfo.name}...</span>
                `;
            }

            let fileData = null;

            // Tentar usar file handle se disponível
            if (fileInfo.fileHandle) {
                try {
                    // Solicitar permissão para ler o arquivo
                    const permissionStatus = await fileInfo.fileHandle.queryPermission({ mode: 'read' });

                    if (permissionStatus !== 'granted') {
                        const permission = await fileInfo.fileHandle.requestPermission({ mode: 'read' });
                        if (permission !== 'granted') {
                            throw new Error('Permissão negada pelo usuário');
                        }
                    }

                    // Ler o arquivo atual
                    const file = await fileInfo.fileHandle.getFile();

                    // Verificar se é CSV ou Excel
                    if (fileInfo.type === '.csv') {
                        fileData = await file.text();
                    } else {
                        // Para Excel, usar a função existente
                        fileData = await this.readExcelFileContent(file);
                    }

                    // arquivo lido do sistema via file handle

                } catch (handleError) {
                    console.warn('Erro ao usar file handle, tentando dados salvos:', handleError);

                    // Verificar se é erro de arquivo não encontrado
                    if (handleError.name === 'NotFoundError') {
                        this.showFileNotFoundError(fileInfo.name, statusElement);
                        await this.clearStoredFile();
                        return;
                    }

                    if (handleError.message.includes('Permissão negada')) {
                        if (statusElement) {
                            statusElement.className = 'upload-status error';
                            statusElement.innerHTML = `
                                <i class="bi bi-exclamation-circle"></i>
                                <span class="file-info">Permissão negada - Selecione o arquivo novamente</span>
                            `;
                        }
                        await this.clearStoredFile();
                        return;
                    }
                }
            }

            // Fallback: usar dados salvos se não conseguiu ler via handle
            if (!fileData && fileInfo.data) {
                fileData = fileInfo.data;
                // usando dados em cache (fallback)
            }

            // Validar se os dados são válidos
            if (!fileData || fileData.trim().length === 0) {
                throw new Error('Dados do arquivo inválidos ou arquivo vazio');
            }

            // ==================== DETECÇÃO AUTOMÁTICA DO TIPO DE ARQUIVO ====================
            const lines = fileData.split('\n');
            if (lines.length < 2) {
                throw new Error('Arquivo deve ter pelo menos uma linha de header e uma linha de dados');
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
            const headersStr = headers.join(',').toLowerCase();
            
            // Detectar se é arquivo de NOTIFICAÇÕES
            const isNotificacoes = headersStr.includes('interessado') && 
                                  (headersStr.includes('processo') || headersStr.includes('notifica'));
            
            // Se for notificações, processar como tal
            if (isNotificacoes) {
                this.notificacoes = this.parser.processarNotificacoes(fileData);
                this.filteredNotificacoes = [...this.notificacoes];
                
                // Limpar dados de servidores/licenças (é um ou outro, não ambos)
                this.allServidores = [];
                this.filteredServidores = [];
                
                // Trocar para aba de notificações
                this.switchView('notificacoes');
                
                // Atualizar interface
                this.updateNotificationsStats();
                this.renderNotificationsTable();
                
                // Atualizar calendário e timeline se estiverem na página atual
                if (this.currentPage === 'calendar') {
                    this.updateYearlyHeatmap();
                } else if (this.currentPage === 'timeline') {
                    this.createTimelineChart();
                }
            } else {
                // Processar como cronograma
                this.processData(fileData);
            }
            
            this.updateLastUpdate();

            if (statusElement) {
                const method = fileInfo.fileHandle ? 'arquivo atual' : 'cache';
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    <span class="file-info">✓ ${fileInfo.name} (${method})</span>
                `;
            }

            // arquivo recarregado com sucesso

        } catch (error) {
            console.error('Erro no auto-carregamento:', error);

            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.className = 'upload-status error';
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="file-info">✗ Erro ao recarregar ${fileInfo.name}</span>
                `;
            }

            // Limpar arquivo corrompido
            this.clearStoredFile();

        } finally {
            this.hideLoading();
        }
    }

    async readExcelFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csvData = XLSX.utils.sheet_to_csv(worksheet);
                    resolve(csvData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo Excel'));
            reader.readAsArrayBuffer(file);
        });
    }

    showEmptyState() {
    // Forçar atualização da interface para mostrar estado vazio
        this.filteredServidores = [];
        this.updateStats();
        this.updateTable();
        this.updateUrgencyChart();

    // sistema iniciado em estado vazio
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const csv = XLSX.utils.sheet_to_csv(firstSheet);
                    resolve(csv);
                } catch (error) {
                    reject(new Error('Erro ao processar Excel: ' + error.message));
                }
            };
            reader.onerror = () => reject(new Error('Erro ao ler arquivo Excel'));
            reader.readAsArrayBuffer(file);
        });
    }

    processData(csvData) {
        try {
            // Limpar problemas anteriores
            this.clearLoadingProblems();

            // Limpar dados de notificações (é um ou outro, não ambos)
            this.notificacoes = [];
            this.filteredNotificacoes = [];

            // Validar se o CSV tem conteúdo mínimo
            if (!csvData || csvData.trim().length === 0) {
                throw new Error('Arquivo vazio ou sem conteúdo válido');
            }

            // Validar se tem pelo menos 2 linhas (header + dados)
            const lines = csvData.trim().split('\n').filter(line => line.trim().length > 0);
            if (lines.length < 2) {
                throw new Error('Arquivo deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
            }

            // Validar se parece com CSV (tem vírgulas ou ponto-e-vírgula)
            const firstLine = lines[0];
            if (!firstLine.includes(',') && !firstLine.includes(';')) {
                throw new Error('Arquivo não parece ser um CSV válido. Certifique-se de que as colunas estão separadas por vírgulas');
            }

            // Processar dados
            this.allServidores = this.parser.processarDadosCSV(csvData);

            // VALIDAÇÃO CRÍTICA: Verificar se algum servidor foi processado
            if (!this.allServidores || this.allServidores.length === 0) {
                throw new Error('Nenhum servidor foi encontrado no arquivo. Verifique se o CSV tem as colunas obrigatórias: SERVIDOR e CRONOGRAMA (ou INICIO/FINAL para licença prêmio)');
            }

            // VALIDAÇÃO: Verificar se os servidores têm dados básicos
            const servidoresValidos = this.allServidores.filter(s => s.nome && s.nome !== 'Nome não informado');
            if (servidoresValidos.length === 0) {
                throw new Error('Nenhum servidor válido foi encontrado. Verifique se a coluna SERVIDOR contém nomes');
            }

            // Se mais de 50% dos servidores não têm nome válido, provavelmente é arquivo errado
            const percentualValidos = (servidoresValidos.length / this.allServidores.length) * 100;
            if (percentualValidos < 50) {
                throw new Error(`Apenas ${Math.round(percentualValidos)}% dos registros têm nomes válidos. Verifique se este é o arquivo correto`);
            }

            this.filteredServidores = [...this.allServidores];

            // Detectar tipo de tabela e adaptar interface
            const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';
            this.adaptUIForTableType(isLicencaPremio);

            // Verificar se existem erros de cronograma
            this.verificarErrosCronograma();

            this.updateStats();
            this.updateHeaderStatus();
            this.updateActiveFilters();

            // Atualizar conteúdo da página atual
            if (this.currentPage === 'home') {
                this.createUrgencyChart();
                this.updateTable();
            } else if (this.currentPage === 'calendar') {
                this.updateYearlyHeatmap();
            } else if (this.currentPage === 'timeline') {
                this.createTimelineChart();
            }

        } catch (error) {
            console.error('Erro ao processar dados:', error);
            this.addLoadingProblem('Processamento de dados', error.message);
            
            // Limpar servidores para não mostrar dados inválidos
            this.allServidores = [];
            this.filteredServidores = [];
            
            // Re-throw para ser capturado pelo handleFileUpload
            throw error;
        }
    }

    adaptUIForTableType(isLicencaPremio) {
        const ageFilterSection = document.getElementById('ageFilterSection');
        const periodFilterSection = document.getElementById('periodFilterSection');

        if (isLicencaPremio) {
            // Para licenças prêmio: esconder filtro de idade, mostrar filtro de período
            if (ageFilterSection) ageFilterSection.style.display = 'none';
            if (periodFilterSection) periodFilterSection.style.display = 'block';
        } else {
            // Para cronograma: mostrar filtro de idade, esconder filtro de período
            if (ageFilterSection) ageFilterSection.style.display = 'block';
            if (periodFilterSection) periodFilterSection.style.display = 'none';
        }
    }

    

    verificarErrosCronograma() {
        try {
            if (!this.allServidores || this.allServidores.length === 0) {
                this.updateProblemsCount();
                return;
            }

            // Percorrer cada servidor e validar campos relacionados a datas/licenças
            this.allServidores.forEach((servidor) => {
                const nome = servidor?.nome || 'Servidor desconhecido';

                // 1) Cronograma não interpretado pelo parser
                if (servidor.cronogramaComErro || (servidor.cronograma && servidor.cronograma.length > 0 && (!servidor.licencas || servidor.licencas.length === 0))) {
                    const cronogramaTexto = servidor.cronograma || '';
                    this.addLoadingProblem(nome, 'Cronograma não pôde ser interpretado', `"${cronogramaTexto}"`);
                    // Marcar servidor para exibir aviso no modal
                    servidor.avisoInterpretacao = `⚠️ Sistema não conseguiu interpretar: "${cronogramaTexto}"`;
                    // Marcar como erro para contabilizar no errorCard
                    servidor.cronogramaComErro = true;
                }

                // 2) Licenças extraídas: verificar se existem e se as datas são válidas
                if (!Array.isArray(servidor.licencas) || servidor.licencas.length === 0) {
                    // Se há um cronograma textual presente mas nenhuma licença extraída, marcar problema
                    if (servidor.cronograma && servidor.cronograma.toString().trim().length > 0) {
                        this.addLoadingProblem(nome, 'Nenhuma licença extraída do cronograma (formato desconhecido)');
                    }

                    // Caso especial: tabela de "licenca-premio" — verificar se colunas INICIO/FINAL estavam presentes
                    if (servidor.tipoTabela === 'licenca-premio') {
                        let rawInicio = '';
                        let rawFinal = '';
                        if (servidor.dadosOriginais) {
                            for (const k of Object.keys(servidor.dadosOriginais)) {
                                try {
                                    // Normalizar cabecalhos removendo acentos para capturar 'INÍCIO' e 'INICIO'
                                    const normKey = k.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
                                    if (normKey.includes('INICIO')) rawInicio = servidor.dadosOriginais[k] || rawInicio;
                                    if (normKey.includes('FINAL')) rawFinal = servidor.dadosOriginais[k] || rawFinal;
                                } catch (e) {
                                    // Fallback simples sem normalização
                                    const up = k.toString().toUpperCase();
                                    if (up.includes('INICIO')) rawInicio = servidor.dadosOriginais[k] || rawInicio;
                                    if (up.includes('FINAL')) rawFinal = servidor.dadosOriginais[k] || rawFinal;
                                }
                            }
                        }

                        if ((rawInicio && rawInicio.toString().trim().length > 0) || (rawFinal && rawFinal.toString().trim().length > 0)) {
                            this.addLoadingProblem(nome, 'Período de licença-prêmio não interpretado', `inicio: ${rawInicio || ''}, final: ${rawFinal || ''}`);
                        }
                    }
                } else {
                    servidor.licencas.forEach((licenca, idx) => {
                        // inicio
                        if (!licenca || !licenca.inicio || !(licenca.inicio instanceof Date) || isNaN(licenca.inicio.getTime())) {
                            this.addLoadingProblem(nome, `Licença ${idx + 1}: data de início inválida`, `licenca: ${JSON.stringify(licenca)}`);
                        }

                        // fim
                        if (!licenca || !licenca.fim || !(licenca.fim instanceof Date) || isNaN(licenca.fim.getTime())) {
                            this.addLoadingProblem(nome, `Licença ${idx + 1}: data de fim inválida`, `licenca: ${JSON.stringify(licenca)}`);
                        }

                        // fim antes do inicio
                        if (licenca && licenca.inicio instanceof Date && licenca.fim instanceof Date) {
                            if (licenca.inicio.getTime() > licenca.fim.getTime()) {
                                this.addLoadingProblem(nome, `Licença ${idx + 1}: data de fim anterior à data de início`, `licenca: ${JSON.stringify(licenca)}`);
                            }
                        }
                    });
                }

                // 3) Próxima licença (inicio/fim) validade
                const pi = servidor.proximaLicencaInicio;
                const pf = servidor.proximaLicencaFim;
                if (pi && (!(pi instanceof Date) || isNaN(pi.getTime()))) {
                    this.addLoadingProblem(nome, 'Próxima licença (início) inválida', `proximaLicencaInicio: ${pi}`);
                }
                if (pf && (!(pf instanceof Date) || isNaN(pf.getTime()))) {
                    this.addLoadingProblem(nome, 'Próxima licença (fim) inválida', `proximaLicencaFim: ${pf}`);
                }
                if (pi instanceof Date && pf instanceof Date && pi.getTime() > pf.getTime()) {
                    this.addLoadingProblem(nome, 'Próxima licença: fim anterior ao início', `proximaLicencaInicio: ${pi.toISOString()}, proximaLicencaFim: ${pf.toISOString()}`);
                }

                // 4) Verificações adicionais opcionais removidas: idade, admissão e lotação não são considerados problemas obrigatórios
            });

            // Atualizar contagem/estado do card de problemas
            this.updateProblemsCount();
        } catch (e) {
            // Erro na validação
        }
    }

    // Filtros
    applyAgeFilter() {
        const minAge = parseInt(document.getElementById('minAge').value) || 0;
        const maxAge = parseInt(document.getElementById('maxAge').value) || 100;

        this.currentFilters.age = { min: minAge, max: maxAge };
        this.applyAllFilters();
    }

    handleSearch(searchTerm) {
        this.currentFilters.search = searchTerm.toLowerCase();
        this.applyAllFilters();
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.currentFilters.search = '';
        this.applyAllFilters();
    }

    // Função para adaptar filtros baseado no tipo de tabela
    adaptFiltersForTableType(isLicencaPremio) {
        const originalFilters = document.querySelectorAll('.original-filters');
        const licencaFilters = document.querySelectorAll('.licenca-filters');

        if (isLicencaPremio) {
            // Esconder filtros originais e mostrar filtros de licença
            originalFilters.forEach(filter => filter.style.display = 'none');
            licencaFilters.forEach(filter => filter.style.display = 'block');
        } else {
            // Mostrar filtros originais e esconder filtros de licença
            originalFilters.forEach(filter => filter.style.display = 'block');
            licencaFilters.forEach(filter => filter.style.display = 'none');
        }
    }

    // Função de filtros unificada que funciona para ambos os tipos
    applyFilters() {
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyAllFilters();
        } else {
            this.applyAgeFilter();
        }
    }

    // DEPRECATED: Função substituída por applyAllFilters() que agora suporta todos os filtros
    // Mantido comentado apenas como referência histórica
    /*
    applyLicencaFilters() {
        const rawMes = document.getElementById('mesFilter')?.value?.trim() || '';
        const mesFilter = (rawMes && rawMes.toLowerCase() === 'all') ? '' : rawMes;
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';

        // Se nenhum filtro está ativo, mostrar todos os dados
        if (!mesFilter && !searchTerm && !this.currentFilters.cargo && !this.currentFilters.urgency) {
            this.filteredServidores = [...this.allServidores];
        } else {
            this.filteredServidores = this.allServidores.filter(servidor => {
                // Filtro de busca - só aplicar se há termo de busca
                if (searchTerm && !this.matchesSearch(servidor, searchTerm)) {
                    return false;
                }

                // Filtro de cargo do gráfico - usar currentFilters ao invés do dropdown
                if (this.currentFilters.cargo && servidor.cargo !== this.currentFilters.cargo) {
                    return false;
                }
                
                // Filtro de urgência (de cards ou legendas)
                if (this.currentFilters.urgency) {
                    const servidorUrgency = (servidor.urgencia || servidor.nivelUrgencia || '').toLowerCase();
                    if (servidorUrgency !== this.currentFilters.urgency.toLowerCase()) {
                        return false;
                    }
                }

                // Filtro de mês - só aplicar se há mês selecionado
                if (mesFilter && !this.matchesMonth(servidor, mesFilter)) {
                    return false;
                }

                return true;
            });
        }

    // Resultado do filtro de licença aplicado (atualiza tabela/estatísticas)

        this.updateTable();
        this.updateStats();
        this.updateUrgencyChart(); // Atualizar gráfico de pizza
        this.updateUrgencyCards(); // Atualizar cards de urgência
        this.updateHeaderStatus();
        // NÃO atualizar timeline - filtro de mês só afeta visão geral
    }
    */
    matchesMonth(servidor, targetMonth) {
        const months = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        const targetMonthIndex = months.indexOf(targetMonth.toLowerCase());
        if (targetMonthIndex === -1) {
            return false;
        }

        // Verificar se é licença-prêmio (tem array de licenças)
        if (servidor.licencas && servidor.licencas.length > 0) {
            // Para licença-prêmio, verificar QUALQUER licença que contenha o mês
            return servidor.licencas.some(licenca => {
                const inicio = new Date(licenca.inicio);
                const fim = licenca.fim ? new Date(licenca.fim) : new Date(licenca.inicio);
                
                // Verificar todos os meses cobertos pela licença
                const currentDate = new Date(inicio);
                const endDate = new Date(fim);

                while (currentDate <= endDate) {
                    if (currentDate.getMonth() === targetMonthIndex) {
                        return true;
                    }

                    // Avançar para o próximo mês
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    currentDate.setDate(1);
                }
                
                return false;
            });
        }
        
        // Para cronograma regular (proximaLicencaInicio/Fim)
        if (!servidor.proximaLicencaInicio || !servidor.proximaLicencaFim) {
            return false;
        }

        const inicio = servidor.proximaLicencaInicio;
        const fim = servidor.proximaLicencaFim;

        // Verificar todos os meses cobertos pela licença
        const currentDate = new Date(inicio);
        const endDate = new Date(fim);

        while (currentDate <= endDate) {
            if (currentDate.getMonth() === targetMonthIndex) {
                return true;
            }

            // Avançar para o próximo mês
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1); // Garantir que não há problemas com dias
        }

        return false;
    }

    // Função melhorada de busca que funciona para ambos os tipos
    matchesSearch(servidor, searchTerm) {
        const searchableFields = [
            servidor.nome,
            servidor.cargo,
            servidor.lotacao,
            servidor.urgencia || servidor.nivelUrgencia // Para compatibilidade com ambos os tipos
        ];

        // Incluir dados originais (ex.: CPF, DN) se disponíveis
        if (servidor.dadosOriginais) {
            const extras = Object.values(servidor.dadosOriginais).map(v => v && v.toString()).filter(Boolean);
            searchableFields.push(...extras);
        }

        return searchableFields.filter(f => f).some(field =>
            field.toString().toLowerCase().includes(searchTerm)
        );
    }

    applyAllFilters() {
        // Redirecionar para o sistema unificado de filtros
        this.applyFiltersAndSearch();
    }

    // Charts
    createUrgencyChart() {
        const ctx = document.getElementById('urgencyChart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.urgency) {
            this.charts.urgency.destroy();
        }

        // Criar gráfico de URGÊNCIA (barras horizontais)
        this.createUrgencyBarChart();

        // Criar gráfico de CARGO separadamente
        this.createCargoChart();
    }

    // Novo método para criar gráfico de urgência com barras horizontais
    createUrgencyBarChart() {
        const ctx = document.getElementById('urgencyChart');
        if (!ctx) return;

        // Verificar se há dados de idade/urgência disponíveis
        const hasUrgencyData = this.filteredServidores.some(s => s.urgencia);
        const hasAgeData = this.filteredServidores.some(s => s.idade || s.dataNascimento);

        // Se não há dados de idade, mostrar mensagem
        if (!hasAgeData && this.filteredServidores.length > 0) {
            const panel = ctx.closest('.chart-panel');
            if (panel) {
                const body = panel.querySelector('.chart-panel-body');
                if (body) {
                    body.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 0.5rem; color: rgb(156, 163, 175); text-align: center; padding: 1rem;">
                            <i class="bi bi-exclamation-circle" style="font-size: 2rem; color: rgb(251, 191, 36);"></i>
                            <div style="font-size: 0.875rem; font-weight: 500;">Dados insuficientes</div>
                            <div style="font-size: 0.75rem; max-width: 300px;">A tabela não possui dados de idade ou data de nascimento para calcular urgências de aposentadoria.</div>
                        </div>
                    `;
                }
            }

            const totalEl = document.getElementById('urgencyTotal');
            if (totalEl) totalEl.textContent = '0';
            return;
        }

        // Contar urgências
        const urgencyCounts = {
            'Crítico': 0,
            'Alta': 0,
            'Moderada': 0,
            'Baixa': 0
        };

        this.filteredServidores.forEach(servidor => {
            const urgencia = servidor.urgencia;
            if (urgencia === 'critica') urgencyCounts['Crítico']++;
            else if (urgencia === 'alta') urgencyCounts['Alta']++;
            else if (urgencia === 'moderada') urgencyCounts['Moderada']++;
            else if (urgencia === 'baixa') urgencyCounts['Baixa']++;
        });

        const data = [
            { name: 'Baixa', value: urgencyCounts['Baixa'], color: '#10b981' },
            { name: 'Moderada', value: urgencyCounts['Moderada'], color: '#f59e0b' },
            { name: 'Alta', value: urgencyCounts['Alta'], color: '#f97316' },
            { name: 'Crítico', value: urgencyCounts['Crítico'], color: '#ef4444' }
        ];

        const total = data.reduce((sum, item) => sum + item.value, 0);

        // Se não há urgências calculadas mesmo com dados de idade
        if (total === 0 && this.filteredServidores.length > 0) {
            const panel = ctx.closest('.chart-panel');
            if (panel) {
                const body = panel.querySelector('.chart-panel-body');
                if (body) {
                    body.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 0.5rem; color: rgb(156, 163, 175); text-align: center; padding: 1rem;">
                            <i class="bi bi-info-circle" style="font-size: 2rem; color: rgb(59, 130, 246);"></i>
                            <div style="font-size: 0.875rem; font-weight: 500;">Sem urgências calculadas</div>
                            <div style="font-size: 0.75rem; max-width: 300px;">Não foi possível calcular urgências para os servidores filtrados.</div>
                        </div>
                    `;
                }
            }

            const totalEl = document.getElementById('urgencyTotal');
            if (totalEl) totalEl.textContent = '0';
            return;
        }

        // Atualizar total no subtitle
        const totalEl = document.getElementById('urgencyTotal');
        if (totalEl) totalEl.textContent = total;

        this.charts.urgency = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderWidth: 0,
                    barThickness: 24,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y', // Barras horizontais
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.x;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${value} pessoas (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: '#6a6a6a',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: '#1a1a1a',
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#6a6a6a',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    getAdaptiveChartData() {
        // Lógica adaptativa: cargo → lotação → subsecretaria → superintendência
        const fields = ['cargo', 'lotacao', 'subsecretaria', 'superintendencia'];
        
        for (const field of fields) {
            const counts = {};
            let hasData = false;
            
            this.filteredServidores.forEach(servidor => {
                const value = (servidor[field] || '').toString().trim();
                if (value && value.length > 0 && value.toLowerCase() !== 'n/a') {
                    counts[value] = (counts[value] || 0) + 1;
                    hasData = true;
                }
            });
            
            if (hasData) {
                const labels = Object.keys(counts).sort();
                const values = labels.map(label => counts[label]);
                
                // 🎨 CRIAR MAPA DE CORES FIXAS
                // Cada label sempre terá a mesma cor, independente da ordem
                const colors = this.getFixedColorsForLabels(labels);
                
                return {
                    labels,
                    values,
                    colors,  // Array de cores na ordem dos labels
                    fieldUsed: field,
                    counts
                };
            }
        }
        
        // Fallback se nenhum campo tem dados
        return {
            labels: ['Sem Dados'],
            values: [this.filteredServidores.length],
            colors: [CARGO_COLORS[0]],
            fieldUsed: 'none',
            counts: { 'Sem Dados': this.filteredServidores.length }
        };
    }
    
    // Gerar cores fixas para labels baseado em hash do nome
    getFixedColorsForLabels(labels) {
        // Criar mapa de cores consistente
        if (!this.labelColorMap) {
            this.labelColorMap = new Map();
        }
        
        return labels.map(label => {
            // Se já tem cor mapeada, usar
            if (this.labelColorMap.has(label)) {
                return this.labelColorMap.get(label);
            }
            
            // Gerar índice baseado em hash do label
            let hash = 0;
            for (let i = 0; i < label.length; i++) {
                hash = ((hash << 5) - hash) + label.charCodeAt(i);
                hash = hash & hash; // Convert to 32bit integer
            }
            const colorIndex = Math.abs(hash) % CARGO_COLORS.length;
            const color = CARGO_COLORS[colorIndex];
            
            // Salvar no mapa
            this.labelColorMap.set(label, color);
            
            return color;
        });
    }

    createCargoChart() {
        const ctx = document.getElementById('cargoChart');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.cargo) {
            this.charts.cargo.destroy();
        }

        const cargoData = this.getAdaptiveChartData();

        // Atualizar título do gráfico baseado no campo usado
        const chartTitle = document.querySelector('.chart-title');
        if (chartTitle && cargoData.fieldUsed) {
            const titleMap = {
                'cargo': 'Distribuição por Cargos',
                'lotacao': 'Distribuição por Lotação',
                'subsecretaria': 'Distribuição por Subsecretaria',
                'superintendencia': 'Distribuição por Superintendência'
            };
            chartTitle.textContent = titleMap[cargoData.fieldUsed] || 'Distribuição';
        }

        // Atualizar total no subtitle
        const totalEl = document.getElementById('cargoTotal');
        if (totalEl) {
            const total = cargoData.values.reduce((a, b) => a + b, 0);
            totalEl.textContent = total;
        }

        // 🔒 SALVAR CORES ORIGINAIS para referência futura (imutável)
        this.originalChartColors = (cargoData.colors || CARGO_COLORS.slice(0, cargoData.labels.length)).map(c => c);

        this.charts.cargo = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cargoData.labels,
                datasets: [{
                    data: cargoData.values,
                    backgroundColor: this.originalChartColors.slice(),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const cargo = cargoData.labels[index];
                        this.filterTableByCargo(cargo, index);
                    } else {
                        this.clearCargoFilter();
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        // Registrar chart globalmente para compatibilidade
        window.dashboardChart = this.charts.cargo;

        // Atualizar contagens da legenda com dados adaptativos
        this.updateCargoLegend(cargoData);
    }

    createTimelineChart() {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;

    // Inicializar controles se ainda não estiverem prontos
        if (!ctx.dataset.controlsInitialized) {
            this.initializeTimelineControls();
            ctx.dataset.controlsInitialized = 'true';
        }

        // Destruir gráfico existente
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

    // Garantir que 'filteredServidores' esteja pronto para uso na timeline
        if (!this.filteredServidores) {
            // inicializando 'filteredServidores' quando necessário
            this.filteredServidores = [...this.allServidores];
        } else {
            // usando 'filteredServidores' já existente
        }

        // Verificar se há alguma fonte de dados (filteredServidores pode estar vazio devido a filtros)
        if (!this.filteredServidores) {
            console.warn('Nenhuma fonte de dados disponível para o gráfico de timeline');
            return;
        }

        const timelineData = this.getTimelineData();

    // Validar dados da timeline (vazio é aceitável quando filtros aplicados)
        if (!timelineData || !timelineData.labels) {
            console.warn('Estrutura de dados da timeline inválida');
            return;
        }

    // Dados do gráfico de timeline processados

    // Atualizar estatísticas
        this.updateTimelineStats(timelineData);

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Servidores em Licença',
                    data: timelineData.data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: (context) => {
                                try {
                                    const idx = context[0].dataIndex;
                                    const period = timelineData.periods && timelineData.periods[idx];
                                    if (!period) return context[0].label || '';

                                    if (period.type === 'day') {
                                        const d = new Date(period.date);
                                        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                                    }

                                    if (period.type === 'month') {
                                        const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                                        return `${monthNames[period.month] || ''} de ${period.year}`;
                                    }

                                    if (period.type === 'year') {
                                        return String(period.value || context[0].label || '');
                                    }

                                    return context[0].label || '';
                                } catch (e) {
                                    return context[0].label || '';
                                }
                            },
                            label: (context) => {
                                const count = context.parsed.y;
                                return `${count} ${count === 1 ? 'servidor' : 'servidores'} em licença`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: { size: 11 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: { size: 11 },
                            stepSize: 1
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const period = timelineData.periods[index];
                        const label = timelineData.labels[index];

                        // Clique no gráfico: aplicar filtro correspondente

                        // Mostrar detalhes para o ponto clicado
                        this.showDayDetails(period, label, timelineData.servidoresData[index]);
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });
    }

    updateTimelineStats(timelineData) {
        // Calcular estatísticas
        const totalLicenses = timelineData.data.reduce((sum, val) => sum + val, 0);
        const activeServers = new Set();

        this.filteredServidores.forEach(servidor => {
            if (servidor.licencas.length > 0) {
                activeServers.add(servidor.nome);
            }
        });

        const maxValue = Math.max(...timelineData.data);
        const peakIndex = timelineData.data.indexOf(maxValue);
        const peakPeriod = timelineData.labels[peakIndex] || '-';
        const averageLicenses = totalLicenses / timelineData.data.length || 0;

        // Determinar o tipo de período atual
        const selectedView = document.getElementById('timelineView')?.value || 'monthly';
        let periodLabel = 'Média por Período';
        switch (selectedView) {
            case 'daily':
                periodLabel = 'Média por Dia';
                break;
            case 'monthly':
                periodLabel = 'Média por Mês';
                break;
            case 'yearly':
                periodLabel = 'Média por Ano';
                break;
            default:
                periodLabel = 'Média por Período';
        }

        // Armazenar estatísticas para uso no modal
        this.currentTimelineStats = {
            totalLicenses,
            activeServersCount: activeServers.size,
            peakPeriod,
            averageLicenses: averageLicenses.toFixed(1),
            periodLabel
        };
    }

    initializeTimelineControls() {
        const dailyInput = document.getElementById('timelineDailyMonth');
        if (dailyInput) {
            const today = new Date();
            const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            dailyInput.value = yearMonth;
            
            if (this.dailyPicker) {
                this.dailyPicker.destroy();
            }
            
            this.dailyPicker = new CustomDatePicker('timelineDailyMonth', {
                type: 'month',
                onSelect: () => this.createTimelineChart()
            });
            
            this.dailyPicker.selectedYear = today.getFullYear();
            this.dailyPicker.selectedMonth = today.getMonth();
            this.dailyPicker.updateTriggerButton();
        }

        const viewSelect = document.getElementById('timelineView');
        if (viewSelect) {
            viewSelect.addEventListener('change', () => {
                this.toggleControlsVisibility();
                this.createTimelineChart();
            });

            this.toggleControlsVisibility();
        }

        const periodStatsBtn = document.getElementById('showPeriodStatsBtn');
        if (periodStatsBtn) {
            periodStatsBtn.addEventListener('click', () => {
                this.showCurrentPeriodStats();
            });
        }

        const exportBtn = document.getElementById('exportTimelineBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportTimelineData();
            });
        }
    }

    toggleControlsVisibility() {
        const viewType = document.getElementById('timelineView')?.value || 'monthly';
        const dailyGroup = document.getElementById('timelineDailyGroup');
        const periodStatsBtn = document.getElementById('showPeriodStatsBtn');
        const periodRangeGroupMonthly = document.getElementById('timelinePeriodRangeGroupMonthly');
        const periodRangeGroupYearly = document.getElementById('timelinePeriodRangeGroupYearly');

        if (periodStatsBtn) {
            if (viewType === 'daily') {
                // Daily: Mostra input type="month" único
                if (dailyGroup) dailyGroup.style.display = 'flex';
                periodStatsBtn.style.display = 'flex';
                if (periodRangeGroupMonthly) periodRangeGroupMonthly.style.display = 'none';
                if (periodRangeGroupYearly) periodRangeGroupYearly.style.display = 'none';
            } else if (viewType === 'monthly') {
                // Monthly: Mostra faixa de meses
                if (dailyGroup) dailyGroup.style.display = 'none';
                periodStatsBtn.style.display = 'flex';
                if (periodRangeGroupMonthly) {
                    periodRangeGroupMonthly.style.display = 'flex';
                    this.populateMonthlyPeriodRange();
                }
                if (periodRangeGroupYearly) periodRangeGroupYearly.style.display = 'none';
            } else { // yearly
                // Yearly: Mostra faixa de anos
                if (dailyGroup) dailyGroup.style.display = 'none';
                periodStatsBtn.style.display = 'flex';
                if (periodRangeGroupMonthly) periodRangeGroupMonthly.style.display = 'none';
                if (periodRangeGroupYearly) {
                    periodRangeGroupYearly.style.display = 'flex';
                    this.populateYearlyPeriodRange();
                }
            }
        }
    }
    
    // Popular month pickers de período (type="month" para seleção mês/ano)
    populateMonthlyPeriodRange() {
        const startInput = document.getElementById('timelinePeriodStartMonth');
        const endInput = document.getElementById('timelinePeriodEndMonth');
        
        if (!startInput || !endInput) return;
        
        // Destruir datepickers antigos se existirem
        if (this.monthStartPicker) {
            this.monthStartPicker.destroy();
        }
        if (this.monthEndPicker) {
            this.monthEndPicker.destroy();
        }
        
        // Criar novos datepickers customizados
        this.monthStartPicker = new CustomDatePicker('timelinePeriodStartMonth', {
            type: 'month',
            onSelect: () => this.createTimelineChart()
        });
        
        this.monthEndPicker = new CustomDatePicker('timelinePeriodEndMonth', {
            type: 'month',
            onSelect: () => this.createTimelineChart()
        });
        
        // Definir valores padrão se vazios
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        if (!startInput.value) {
            startInput.value = `${currentYear}-01`;
            this.monthStartPicker.selectedYear = currentYear;
            this.monthStartPicker.selectedMonth = 0;
            this.monthStartPicker.updateTriggerButton();
        }
        if (!endInput.value) {
            endInput.value = `${currentYear}-12`;
            this.monthEndPicker.selectedYear = currentYear;
            this.monthEndPicker.selectedMonth = 11;
            this.monthEndPicker.updateTriggerButton();
        }
    }
    
    // Popular year pickers de período (type="number" para seleção de ano)
    populateYearlyPeriodRange() {
        const startInput = document.getElementById('timelinePeriodStartYear');
        const endInput = document.getElementById('timelinePeriodEndYear');
        
        if (!startInput || !endInput) return;
        
        // Destruir datepickers antigos se existirem
        if (this.yearStartPicker) {
            this.yearStartPicker.destroy();
        }
        if (this.yearEndPicker) {
            this.yearEndPicker.destroy();
        }
        
        // Criar novos datepickers customizados
        this.yearStartPicker = new CustomDatePicker('timelinePeriodStartYear', {
            type: 'year',
            onSelect: () => this.createTimelineChart()
        });
        
        this.yearEndPicker = new CustomDatePicker('timelinePeriodEndYear', {
            type: 'year',
            onSelect: () => this.createTimelineChart()
        });
        
        const yearsWithLicenses = this.getYearsWithLicenses();
        
        if (yearsWithLicenses.length === 0) {
            const currentYear = new Date().getFullYear();
            if (!startInput.value) {
                startInput.value = currentYear;
                this.yearStartPicker.selectedYear = currentYear;
                this.yearStartPicker.updateTriggerButton();
            }
            if (!endInput.value) {
                endInput.value = currentYear;
                this.yearEndPicker.selectedYear = currentYear;
                this.yearEndPicker.updateTriggerButton();
            }
            return;
        }
        
        const minYear = yearsWithLicenses[0];
        const maxYear = yearsWithLicenses[yearsWithLicenses.length - 1];
        
        // Definir valores padrão se vazios
        if (!startInput.value) {
            startInput.value = minYear;
            this.yearStartPicker.selectedYear = minYear;
            this.yearStartPicker.currentYear = minYear;
            this.yearStartPicker.updateTriggerButton();
        }
        if (!endInput.value) {
            endInput.value = maxYear;
            this.yearEndPicker.selectedYear = maxYear;
            this.yearEndPicker.currentYear = maxYear;
            this.yearEndPicker.updateTriggerButton();
        }
    }
    
    // Helper para formatar data no formato YYYY-MM-DD
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    showCurrentPeriodStats() {
        const viewType = document.getElementById('timelineView')?.value || 'monthly';
        const selectedYear = parseInt(document.getElementById('timelineYear')?.value) || new Date().getFullYear();
    // Valores de mês no HTML já são 0-based (0=Janeiro, 1=Fevereiro, etc.)
        const selectedMonth = parseInt(document.getElementById('timelineMonth')?.value) || new Date().getMonth();

    // Atualização de estatísticas do período (operação interna)

        let periodLabel = '';
        let periodFilter = {};

        if (viewType === 'daily') {
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            periodLabel = `${monthNames[selectedMonth]} ${selectedYear}`;
            periodFilter = { type: 'month', year: selectedYear, month: selectedMonth };
        } else if (viewType === 'monthly') {
            periodLabel = `Ano ${selectedYear}`;
            periodFilter = { type: 'year', value: selectedYear };
        } else {
            periodLabel = 'Todos os Anos';
            periodFilter = { type: 'all' };
        }

    // Filtrar servidores para o período
        const servidores = this.filteredServidores.filter(servidor => {
            return servidor.licencas.some(licenca => {
                if (periodFilter.type === 'year') {
                    return licenca.inicio.getFullYear() === periodFilter.value;
                } else if (periodFilter.type === 'month') {
                    return licenca.inicio.getFullYear() === periodFilter.year &&
                        licenca.inicio.getMonth() === periodFilter.month;
                }
                return true; // all
            });
        });

    // Lista de servidores filtrados (uso interno)

        this.showPeriodStatsModal(periodLabel, servidores, periodFilter);
    }

    showDayDetails(period, label, servidoresNames) {
    // Detalhes diários da timeline gerados

        // Filter servers that have licenses overlapping this specific day/month/year
        const servidores = this.filteredServidores.filter(servidor => {
            return servidor.licencas.some(licenca => {
                try {
                    const inicio = new Date(licenca.inicio);
                    const fim = licenca.fim ? new Date(licenca.fim) : new Date(licenca.inicio);
                    inicio.setHours(0, 0, 0, 0);
                    fim.setHours(0, 0, 0, 0);

                    if (period.type === 'day') {
                        const target = new Date(period.year, period.month, period.day);
                        target.setHours(0, 0, 0, 0);
                        return inicio.getTime() <= target.getTime() && target.getTime() <= fim.getTime();
                    } else if (period.type === 'month') {
                        const monthStart = new Date(period.year, period.month, 1);
                        const monthEnd = new Date(period.year, period.month + 1, 0);
                        monthStart.setHours(0, 0, 0, 0);
                        monthEnd.setHours(0, 0, 0, 0);
                        return inicio.getTime() <= monthEnd.getTime() && fim.getTime() >= monthStart.getTime();
                    } else if (period.type === 'year') {
                        const yearStart = new Date(period.value, 0, 1);
                        const yearEnd = new Date(period.value, 11, 31);
                        yearStart.setHours(0, 0, 0, 0);
                        yearEnd.setHours(0, 0, 0, 0);
                        return inicio.getTime() <= yearEnd.getTime() && fim.getTime() >= yearStart.getTime();
                    }
                } catch (e) {
                    return false;
                }
                return false;
            });
        });

    // Obter elementos do modal
        const modal = document.getElementById('timelineModal');
        const modalTitle = document.getElementById('timelineModalTitle');
        const modalBody = document.getElementById('timelineModalBody');

        if (!modal || !modalTitle || !modalBody) {
            console.error('Elementos do modal da timeline não encontrados');
            return;
        }

        // Set modal title
        let titleText = '';

        if (period.type === 'day') {
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const dayOfWeek = new Date(period.year, period.month, period.day).toLocaleDateString('pt-BR', { weekday: 'long' });
            titleText = `${dayOfWeek}, ${period.day} de ${monthNames[period.month]} de ${period.year}`;
        } else if (period.type === 'month') {
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            titleText = `${monthNames[period.month]} de ${period.year}`;
        } else if (period.type === 'year') {
            titleText = `Ano de ${period.value}`;
        }

        modalTitle.textContent = titleText;

        // Detectar tipo de dados
        const hasLicencas = this.filteredServidores && this.filteredServidores.length > 0;
        const hasNotificacoes = this.notificacoes && this.notificacoes.length > 0;

        // Limpar conteúdo anterior
        modalBody.innerHTML = '';

        // Criar seção apropriada baseada no tipo de dados
        if (hasLicencas && !hasNotificacoes && servidores.length > 0) {
            // Usar helper unificado para criar seção de licenças
            const licencasSection = this.createModalSection({
                title: 'Licenças',
                icon: 'bi-calendar-check',
                badge: { count: servidores.length, class: 'success' },
                contentId: 'timelineServersList'
            });
            modalBody.appendChild(licencasSection);

            const serversList = document.getElementById('timelineServersList');
            if (serversList) {
                serversList.innerHTML = this.renderServidoresList(servidores, {
                    showLicenseInfo: false,
                    emptyIcon: 'bi-people',
                    emptyMessage: 'Nenhum servidor em licença neste período.'
                });
            }
        } else if (hasNotificacoes && !hasLicencas && servidores.length > 0) {
            // Usar helper unificado para criar seção de notificações
            const notifSection = this.createModalSection({
                title: 'Notificações',
                icon: 'bi-bell',
                badge: { count: servidores.length, class: 'info' },
                contentId: 'timelineNotifsList'
            });
            modalBody.appendChild(notifSection);

            // TODO: Implementar seção de notificações quando necessário
            const notifsList = document.getElementById('timelineNotifsList');
            if (notifsList) {
                notifsList.innerHTML = '<p class="text-muted">Visualização de notificações em desenvolvimento.</p>';
            }
        } else {
            modalBody.innerHTML = '<p class="text-muted">Nenhum dado disponível para este período.</p>';
        }

    // Exibir modal
        this._openModalElement(modal);
    }

    showPeriodStatsModal(periodLabel, servidores, periodFilter) {
        const modal = document.getElementById('periodStatsModal');
        const modalTitle = document.getElementById('periodStatsModalTitle');
        const statsGrid = document.getElementById('periodStatsGrid');

        if (!modal || !modalTitle || !statsGrid) {
            console.error('Elementos do modal de estatísticas do período não encontrados');
            return;
        }

        modalTitle.textContent = `Estatísticas - ${periodLabel}`;

    // Calcular estatísticas abrangentes
        let totalLicenses = 0;
        let urgencyStats = { 'Crítico': 0, 'Alto': 0, 'Moderado': 0, 'Baixo': 0 };
        let ageStats = { under30: 0, between30and50: 0, over50: 0 };
        let monthsWithLicenses = new Set();

        servidores.forEach(servidor => {
            // Count licenses for the period
            servidor.licencas.forEach(licenca => {
                let includeLicense = false;
                if (periodFilter.type === 'year') {
                    includeLicense = licenca.inicio.getFullYear() === periodFilter.value;
                } else if (periodFilter.type === 'month') {
                    includeLicense = licenca.inicio.getFullYear() === periodFilter.year &&
                        licenca.inicio.getMonth() === periodFilter.month;
                } else {
                    includeLicense = true; // all
                }

                if (includeLicense) {
                    totalLicenses++;
                    // Marcar quais meses possuem licenças
                    const monthKey = `${licenca.inicio.getFullYear()}-${String(licenca.inicio.getMonth() + 1).padStart(2, '0')}`;
                    monthsWithLicenses.add(monthKey);
                }
            });

            // Count urgency levels
            if (servidor.nivelUrgencia) {
                urgencyStats[servidor.nivelUrgencia] = (urgencyStats[servidor.nivelUrgencia] || 0) + 1;
            } else {
                urgencyStats['Baixo'] = urgencyStats['Baixo'] + 1;
            }

            // Age statistics
            const age = parseInt(servidor.idade) || 0;
            if (age < 30) ageStats.under30++;
            else if (age <= 50) ageStats.between30and50++;
            else ageStats.over50++;
        });

        const averageLicensesPerServer = servidores.length ? (totalLicenses / servidores.length).toFixed(1) : '0';
        const criticalUrgency = (urgencyStats['Crítico'] || 0) + (urgencyStats['Alto'] || 0);
        const totalMonthsWithLicenses = monthsWithLicenses.size;
        const hasUrgencyData = servidores.some(s => s.nivelUrgencia != null && s.nivelUrgencia !== '');

    // Determinar visualização da timeline (diária/mensal/anual) para evitar cartões redundantes na visualização diária
    const timelineView = document.getElementById('timelineView')?.value || 'monthly';
        const isDailyTimelineView = timelineView === 'daily';

        // Incluir estatísticas da timeline se disponíveis (only shown in non-daily views)
        let timelineStatsCards = '';
        if (this.currentTimelineStats && !isDailyTimelineView) {
            timelineStatsCards = `
                <div class="stats-card modal-timeline-stat">
                    <div class="stats-card-icon">
                        <i class="bi bi-calendar-event"></i>
                    </div>
                    <div class="stats-card-value">${this.currentTimelineStats.totalLicenses}</div>
                    <div class="stats-card-label">Total de Licenças</div>
                    <div class="stats-card-description">Licenças no período selecionado</div>
                </div>

                <div class="stats-card modal-timeline-stat">
                    <div class="stats-card-icon">
                        <i class="bi bi-person-check"></i>
                    </div>
                    <div class="stats-card-value">${this.currentTimelineStats.activeServersCount}</div>
                    <div class="stats-card-label">Servidores Ativos</div>
                    <div class="stats-card-description">Servidores com licenças ativas</div>
                </div>

                <div class="stats-card modal-timeline-stat">
                    <div class="stats-card-icon">
                        <i class="bi bi-graph-up-arrow"></i>
                    </div>
                    <div class="stats-card-value">${this.currentTimelineStats.peakPeriod}</div>
                    <div class="stats-card-label">Pico de Licenças</div>
                    <div class="stats-card-description">Período com mais licenças</div>
                </div>

                <div class="stats-card modal-timeline-stat">
                    <div class="stats-card-icon">
                        <i class="bi bi-bar-chart"></i>
                    </div>
                    <div class="stats-card-value">${this.currentTimelineStats.averageLicenses}</div>
                    <div class="stats-card-label">${this.currentTimelineStats.periodLabel}</div>
                    <div class="stats-card-description">Distribuição média das licenças</div>
                </div>
            `;
        }

    // Montar um conjunto compacto de cards para a visualização diária da timeline, evitando valores idênticos redundantes
        if (isDailyTimelineView) {
            // Para a visualização diária, mostrar apenas um card de servidores e urgência opcional
            const highUrgencyPercent = servidores.length ? Math.round((criticalUrgency / servidores.length) * 100) : 0;

            statsGrid.innerHTML = `
                <div class="period-stats-grid">
                    <div class="stats-card servers">
                        <div class="stats-card-icon"><i class="bi bi-people-fill"></i></div>
                        <div class="stats-card-value">${servidores.length}</div>
                        <div class="stats-card-label">Servidores em Licença</div>
                        <div class="stats-card-description">Contagem única de servidores no período</div>
                    </div>

                    ${hasUrgencyData ? `
                    <div class="stats-card critical">
                        <div class="stats-card-icon"><i class="bi bi-exclamation-circle"></i></div>
                        <div class="stats-card-value">${highUrgencyPercent}%</div>
                        <div class="stats-card-label">Alta/Crit. (%)</div>
                        <div class="stats-card-description">Percentual de servidores com urgência alta/critica</div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            // Conjunto completo para visualizações mensais/anuais
            statsGrid.innerHTML = `
                ${timelineStatsCards}
                
                <div class="stats-card servers">
                    <div class="stats-card-icon">
                        <i class="bi bi-people"></i>
                    </div>
                    <div class="stats-card-value">${servidores.length}</div>
                    <div class="stats-card-label">Servidores em Licença</div>
                    <div class="stats-card-description">Total de servidores com licenças no período</div>
                </div>

                <div class="stats-card average">
                    <div class="stats-card-icon">
                        <i class="bi bi-graph-up"></i>
                    </div>
                    <div class="stats-card-value">${averageLicensesPerServer}</div>
                    <div class="stats-card-label">Média por Servidor</div>
                    <div class="stats-card-description">Licenças por servidor no período</div>
                </div>

                <div class="stats-card months">
                    <div class="stats-card-icon">
                        <i class="bi bi-calendar-range"></i>
                    </div>
                    <div class="stats-card-value">${totalMonthsWithLicenses}</div>
                    <div class="stats-card-label">Meses com Licenças</div>
                    <div class="stats-card-description">Número de meses diferentes com licenças</div>
                </div>

                <div class="stats-card critical">
                    <div class="stats-card-icon">
                        <i class="bi bi-exclamation-triangle"></i>
                    </div>
                    <div class="stats-card-value">${criticalUrgency}</div>
                    <div class="stats-card-label">Alta Urgência</div>
                    <div class="stats-card-description">Servidores críticos/alto em licença</div>
                </div>
            `;
        }

        this._openModalElement(modal);
    }

    exportTimelineData() {
        if (!this.charts.timeline) return;

        const chart = this.charts.timeline;
        const canvas = chart.canvas;

    // Criar link de download
        const link = document.createElement('a');
        link.download = `timeline-licencas-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    // Heatmap anual (estilo GitHub)
    updateYearlyHeatmap(year = null) {
        if (!year) {
            const yearElement = document.getElementById('currentCalendarYear');
            year = yearElement ? parseInt(yearElement.textContent) : new Date().getFullYear();
        }

        const container = document.getElementById('yearlyHeatmap');

        if (!container) return;

    // Atualizar exibição do ano
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (currentYearElement) {
            currentYearElement.textContent = year;
        }

    // Verificar se temos dados válidos (licenças OU notificações)
        const hasLicencas = this.filteredServidores && this.filteredServidores.length > 0;
        const hasNotificacoes = this.notificacoes && this.notificacoes.length > 0;
        const hasImportedData = this.allServidores && this.allServidores.length > 0;
        
        if (!hasLicencas && !hasNotificacoes) {
            // Diferenciar entre "nenhum arquivo importado" vs "filtros não retornaram resultados"
            const isFiltered = hasImportedData && (!hasLicencas && !hasNotificacoes);
            const messageTitle = isFiltered 
                ? 'Nenhum resultado encontrado' 
                : 'Nenhum dado carregado';
            const messageText = isFiltered
                ? 'Nenhum servidor corresponde aos filtros aplicados. Tente ajustar ou limpar os filtros.'
                : 'Importe um arquivo CSV para visualizar o calendário de licenças e notificações';
            const iconClass = isFiltered ? 'bi-funnel-fill' : 'bi-calendar-x';
            const showButton = !isFiltered;
            
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; text-align: center;">
                    <i class="${iconClass}" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">${messageTitle}</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${messageText}</p>
                    ${showButton ? `
                    <button onclick="document.getElementById('uploadButton')?.click()" class="btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                        <i class="bi bi-upload"></i>
                        <span>Importar arquivo</span>
                    </button>` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = '';

    // Criar container de meses
        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'months-grid';

        try {
            for (let month = 0; month < 12; month++) {
                const monthDiv = this.createMonthHeatmap(year, month);
                monthsContainer.appendChild(monthDiv);
            }

            container.appendChild(monthsContainer);
        } catch (error) {
            console.error('❌ Erro ao renderizar calendário:', error);
            console.error('Stack:', error.stack);
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: red;">
                    <h3>❌ Erro ao carregar calendário</h3>
                    <p>Verifique o console para detalhes: ${error.message}</p>
                </div>
            `;
        }
    }

    changeCalendarYear(direction) {
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (!currentYearElement) return;

        const currentYear = parseInt(currentYearElement.textContent);
        
        // Calcular anos disponíveis (anos com licenças agendadas)
        const yearsWithLicenses = this.getYearsWithLicenses();
        
        if (yearsWithLicenses.length === 0) {
            // Sem dados, permitir navegação livre entre 2020 e 2035
            const newYear = currentYear + direction;
            if (newYear >= 2020 && newYear <= 2035) {
                this.updateYearlyHeatmap(newYear);
            }
            return;
        }
        
        const minYear = Math.min(...yearsWithLicenses);
        const maxYear = Math.max(...yearsWithLicenses);
        
        let newYear = currentYear + direction;
        
        // Pular anos sem licenças ao navegar
        if (direction > 0) {
            // Avançar: encontrar próximo ano com licenças
            const nextYears = yearsWithLicenses.filter(y => y > currentYear).sort((a, b) => a - b);
            newYear = nextYears.length > 0 ? nextYears[0] : maxYear;
        } else {
            // Voltar: encontrar ano anterior com licenças
            const prevYears = yearsWithLicenses.filter(y => y < currentYear).sort((a, b) => b - a);
            newYear = prevYears.length > 0 ? prevYears[0] : minYear;
        }
        
        // Limitar entre min e max dos dados
        if (newYear >= minYear && newYear <= maxYear) {
            this.updateYearlyHeatmap(newYear);
        }
    }
    
    // Obter lista de anos que têm licenças agendadas
    getYearsWithLicenses() {
        const years = new Set();
        
        if (!this.filteredServidores || this.filteredServidores.length === 0) {
            return [];
        }
        
        this.filteredServidores.forEach(servidor => {
            if (servidor.licencas && servidor.licencas.length > 0) {
                servidor.licencas.forEach(licenca => {
                    const startYear = licenca.inicio.getFullYear();
                    const endYear = licenca.fim ? licenca.fim.getFullYear() : startYear;
                    
                    // Adicionar todos os anos entre início e fim
                    for (let y = startYear; y <= endYear; y++) {
                        years.add(y);
                    }
                });
            }
        });
        
        return Array.from(years).sort((a, b) => a - b);
    }

    createMonthHeatmap(year, month) {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-heatmap';

    // Cabeçalho do mês
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.textContent = this.getMonthName(month);
        monthDiv.appendChild(monthHeader);

    // Cabeçalho dos dias da semana
        const daysHeader = document.createElement('div');
        daysHeader.className = 'days-header';
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dayNames.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'day-name';
            dayEl.textContent = day;
            daysHeader.appendChild(dayEl);
        });
        monthDiv.appendChild(daysHeader);

    // Grade do calendário
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calcular dados para este mês (APENAS licenças OU notificações, nunca ambos)
        const dayData = {};
        
        // Determinar qual tipo de dado processar
        const hasLicencas = this.filteredServidores && this.filteredServidores.length > 0;
        const hasNotificacoes = this.notificacoes && this.notificacoes.length > 0;
        
        // Processar APENAS licenças (se existirem E não houver notificações)
        if (hasLicencas && !hasNotificacoes) {
            this.filteredServidores.forEach((servidor) => {
                if (!servidor.licencas || servidor.licencas.length === 0) return;
                
                servidor.licencas.forEach(licenca => {
                // Verificar se a licença se sobrepõe a este mês
                const licenseStart = licenca.inicio;
                // Calcular fim da licença: mesmo dia no mês seguinte menos 1 dia
                let licenseEnd = licenca.fim;
                if (!licenseEnd) {
                    const nextMonth = new Date(licenseStart);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(nextMonth.getDate() - 1);
                    licenseEnd = nextMonth;
                }

                // Tratamento específico para licenças prêmio (sem logs de debug)
                if (servidor.tipoTabela === 'licenca-premio') {
                    // (licenças prêmio são tratadas de forma ligeiramente diferente)
                }

                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);

                // Se a licença se sobrepõe a este mês
                if (licenseStart <= monthEnd && licenseEnd >= monthStart) {
                    // Calcular quais dias deste mês são cobertos
                    let startDay, endDay;

                    // Para dados de licença-prêmio, tratar períodos que atravessam meses com mais cuidado
                    if (servidor.tipoTabela === 'licenca-premio') {
                        // Se a licença inicia neste mês ou antes, começar do dia 1
                        if (licenseStart <= monthStart) {
                            startDay = 1;
                        } else {
                            startDay = licenseStart.getDate();
                        }

                        // Se a licença termina neste mês ou depois, terminar no último dia do mês
                        if (licenseEnd >= monthEnd) {
                            endDay = new Date(year, month + 1, 0).getDate();
                        } else {
                            endDay = licenseEnd.getDate();
                        }
                    } else {
                        // Lógica original para cronogramas de aposentadoria
                        startDay = Math.max(1, licenseStart.getMonth() === month && licenseStart.getFullYear() === year ? licenseStart.getDate() : 1);
                        endDay = Math.min(
                            new Date(year, month + 1, 0).getDate(),
                            licenseEnd.getMonth() === month && licenseEnd.getFullYear() === year ? licenseEnd.getDate() : new Date(year, month + 1, 0).getDate()
                        );
                    }

                    // Adicionar contagem para cada dia coberto pela licença
                    for (let day = startDay; day <= endDay; day++) {
                        dayData[day] = (dayData[day] || 0) + 1;
                    }
                }
            });
        }); // Fim do forEach de filteredServidores
        } 
        // Processar APENAS notificações (se existirem E não houver licenças)
        else if (hasNotificacoes && !hasLicencas) {
            this.notificacoes.forEach(notif => {
                // Processar todas as datas de notificação
                if (notif.datas && Array.isArray(notif.datas)) {
                    notif.datas.forEach(dataObj => {
                        if (dataObj.data) {
                            const notifDate = new Date(dataObj.data);
                            if (notifDate.getFullYear() === year && notifDate.getMonth() === month) {
                                const day = notifDate.getDate();
                                dayData[day] = (dayData[day] || 0) + 1;
                            }
                        }
                    });
                }
            });
        }

    // Células vazias para dias antes do início do mês
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarGrid.appendChild(emptyCell);
        }

    // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';

            const count = dayData[day] || 0;
            
            // Lógica de cores baseada na contagem
            let level = 0;
            if (count > 0) {
                if (count === 1) level = 1;
                else if (count <= 3) level = 2;
                else if (count <= 5) level = 3;
                else level = 4;
            }

            dayCell.classList.add(`level-${level}`);
            
            dayCell.textContent = day;
            
            // Tooltip com informações detalhadas (APENAS um tipo de dado)
            let tooltip = `${day}/${month + 1}/${year}`;
            if (count > 0) {
                if (hasLicencas) {
                    tooltip += `\n${count} licença(s)`;
                } else if (hasNotificacoes) {
                    tooltip += `\n${count} notificação(ões)`;
                }
            }
            dayCell.title = tooltip;

            if (count > 0) {
                dayCell.addEventListener('click', () => {
                    this.showCalendarDayDetails(year, month, day);
                });
                dayCell.style.cursor = 'pointer';
            }

            calendarGrid.appendChild(dayCell);
        }

        monthDiv.appendChild(calendarGrid);
        return monthDiv;
    }

    showCalendarDayDetails(year, month, day) {
        const targetDate = new Date(year, month, day);
        const dateStr = targetDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const hasLicencas = this.filteredServidores && this.filteredServidores.length > 0;
        const hasNotificacoes = this.notificacoes && this.notificacoes.length > 0;

        let servidores = [];
        let notificacoes = [];

        // Processar APENAS licenças OU APENAS notificações
        if (hasLicencas && !hasNotificacoes) {
            // Encontrar servidores com licenças neste dia
            servidores = this.filteredServidores.filter(servidor => {
                return servidor.licencas && servidor.licencas.some(licenca => {
                    const licenseStart = licenca.inicio;
                    // Calcular fim da licença: mesmo dia no mês seguinte menos 1 dia
                    let licenseEnd = licenca.fim;
                    if (!licenseEnd) {
                        const nextMonth = new Date(licenseStart);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        nextMonth.setDate(nextMonth.getDate() - 1);
                        licenseEnd = nextMonth;
                    }

                    // Verificar se a data alvo está dentro do período da licença
                    return targetDate >= licenseStart && targetDate <= licenseEnd;
                });
            });
        } else if (hasNotificacoes && !hasLicencas) {
            // Encontrar notificações neste dia
            this.notificacoes.forEach(notif => {
                if (notif.datas && Array.isArray(notif.datas)) {
                    notif.datas.forEach(dataObj => {
                        if (dataObj.data) {
                            const notifDate = new Date(dataObj.data);
                            if (notifDate.getFullYear() === year && 
                                notifDate.getMonth() === month && 
                                notifDate.getDate() === day) {
                                notificacoes.push({
                                    ...notif,
                                    dataEspecifica: dataObj
                                });
                            }
                        }
                    });
                }
            });
        }

        // Atualizar modal
        const modal = document.getElementById('calendarDayModal');
        const modalTitle = document.getElementById('calendarDayTitle');
        const modalBody = document.getElementById('calendarServersList');

        if (!modal || !modalTitle || !modalBody) {
            console.error('Elementos do modal do calendário não encontrados');
            return;
        }

        // Atualizar título
        modalTitle.textContent = dateStr;

        // Limpar conteúdo anterior
        modalBody.innerHTML = '';

        // Adicionar seção de licenças (se houver)
        if (servidores.length > 0) {
            // Usar helper unificado para criar seção de licenças
            const licencasSection = this.createModalSection({
                title: 'Licenças',
                icon: 'bi-calendar-check',
                badge: { count: servidores.length, class: 'success' },
                contentId: 'licencasList'
            });
            modalBody.appendChild(licencasSection);

            // Adicionar informação de licença a cada servidor para exibição
            const servidoresComInfo = servidores.map(servidor => {
                // Encontrar licença ativa neste dia
                const activeLicense = servidor.licencas.find(licenca => {
                    const licenseStart = licenca.inicio;
                    let licenseEnd = licenca.fim;
                    if (!licenseEnd) {
                        const nextMonth = new Date(licenseStart);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        nextMonth.setDate(nextMonth.getDate() - 1);
                        licenseEnd = nextMonth;
                    }
                    return licenseStart && licenseEnd &&
                        targetDate >= licenseStart && targetDate <= licenseEnd;
                });

                const licenseInfo = activeLicense
                    ? `${activeLicense.inicio.toLocaleDateString('pt-BR')} até ${activeLicense.fim ? activeLicense.fim.toLocaleDateString('pt-BR') : 'Data não especificada'}`
                    : 'Período não especificado';

                return {
                    ...servidor,
                    licenseInfo: licenseInfo
                };
            });

            const licencasList = document.getElementById('licencasList');
            if (licencasList) {
                licencasList.innerHTML = this.renderServidoresList(servidoresComInfo, {
                    showLicenseInfo: true,
                    emptyIcon: 'bi-calendar-x',
                    emptyMessage: 'Nenhuma licença neste dia.'
                });
            }
        }

        // Adicionar seção de notificações (se houver)
        if (notificacoes.length > 0) {
            // Usar helper unificado para criar seção de notificações
            const notifSection = this.createModalSection({
                title: 'Notificações',
                icon: 'bi-bell',
                badge: { count: notificacoes.length, class: 'info' },
                contentId: 'notifsList'
            });
            modalBody.appendChild(notifSection);

            const notifsList = document.getElementById('notifsList');
            if (notifsList) {
                notifsList.innerHTML = notificacoes.map(notif => `
                    <div class="servidor-item">
                        <div class="servidor-info">
                            <h5 class="servidor-nome">${notif.interessado || 'Nome não informado'}</h5>
                            <div class="servidor-details">
                                <span class="detail-item">
                                    <i class="bi bi-file-text"></i>
                                    ${notif.processo || 'Sem processo'}
                                </span>
                                <span class="detail-item">
                                    <i class="bi bi-geo-alt"></i>
                                    ${notif.lotacao || 'Sem lotação'}
                                </span>
                            </div>
                        </div>
                        <div class="servidor-status">
                            <span class="status-badge status-${notif.status}">
                                ${notif.status === 'respondeu' ? '🟢 Respondeu' : 
                                  notif.status === 'pendente' ? '🟡 Pendente' : 
                                  '🔴 Não Concorda'}
                            </span>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Se não houver nada, mostrar mensagem apropriada
        if (servidores.length === 0 && notificacoes.length === 0) {
            modalBody.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-x"></i>
                    <p>Nenhuma informação encontrada para este dia.</p>
                </div>
            `;
        }

        // Mostrar o modal
    this._openModalElement(modal);
        modal.style.display = 'flex';
    }

    closeCalendarDayModal() {
        const modal = document.getElementById('calendarDayModal');
        if (modal) {
            this._closeModalElement(modal);
            modal.style.display = 'none';
        }
    }

    showServidoresInPeriod(period, label) {
    // Mostrar servidores no período selecionado (chamado pelo painel de timeline/calendário)

        const servidores = this.filteredServidores.filter(servidor => {
            return servidor.licencas.some(licenca => {
                if (period.type === 'year') {
                    return licenca.inicio.getFullYear() === period.value;
                } else if (period.type === 'month') {
                    return licenca.inicio.getFullYear() === period.year &&
                        licenca.inicio.getMonth() === period.month;
                } else if (period.type === 'day') {
                    return licenca.inicio.getFullYear() === period.year &&
                        licenca.inicio.getMonth() === period.month &&
                        licenca.inicio.getDate() === period.day;
                }
                return false;
            });
        });

    // Servidores filtrados para o período (pronto para exibição no modal)
        this.showTimelineModal(label, servidores, period);
    }

    showTimelineModal(label, servidores, period) {
        const modalTitle = document.querySelector('#detailsModal .modal-header h3');
        const modalBody = document.getElementById('modalBody');
        const modal = document.getElementById('detailsModal');

        if (!modalTitle || !modalBody || !modal) return;

        modalTitle.textContent = `Servidores em Licença - ${label}`;

        // Criar estatísticas do período
        const totalLicencas = servidores.reduce((sum, servidor) => sum + servidor.licencas.length, 0);
        const urgenciaStats = this.getUrgenciaStats(servidores);

        modalBody.innerHTML = `
            <div class="modal-sections timeline-modal">
                <div class="modal-section">
                    <div class="section-header">
                        <i class="bi bi-bar-chart"></i>
                        <span>Resumo do Período</span>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Total de Servidores:</span>
                            <span class="info-value">${servidores.length}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total de Licenças:</span>
                            <span class="info-value">${totalLicencas}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Média por Servidor:</span>
                            <span class="info-value">${servidores.length ? (totalLicencas / servidores.length).toFixed(1) : '0'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Urgência Crítica:</span>
                            <span class="info-value">${urgenciaStats.critico || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="section-header">
                        <i class="bi bi-people"></i>
                        <span>Lista de Servidores</span>
                    </div>
                    ${this.createServidoresList(servidores)}
                </div>
            </div>
        `;

    this._openModalElement(modal);

    // Adicionar listeners para os botões de detalhes
        setTimeout(() => {
            const detailButtons = modal.querySelectorAll('.btn-icon[data-servidor-nome]');
            detailButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const nomeServidor = btn.getAttribute('data-servidor-nome');
                    // Buscar TODOS os servidores com este nome e agregar licenças
                    this.showServidorDetails(nomeServidor);
                });
            });
        }, 100);
    }

    getUrgenciaStats(servidores) {
        const stats = {};
        servidores.forEach(servidor => {
            const urgencia = servidor.nivelUrgencia?.toLowerCase() || 'baixo';
            stats[urgencia] = (stats[urgencia] || 0) + 1;
        });
        return stats;
    }

    // Interactive functions
    filterByPeriod(period, label) {
    // Voltar para a página inicial e aplicar filtro
    this.switchPage('home');

        // Set the current filter based on period clicked
        if (period.type === 'year') {
            document.getElementById('minAge').value = 18;
            document.getElementById('maxAge').value = 70;
            this.currentFilters.age = { min: 18, max: 70 };
            this.currentFilters.period = { type: 'yearly', start: period.value, end: period.value };
        } else if (period.type === 'month') {
            document.getElementById('minAge').value = 18;
            document.getElementById('maxAge').value = 70;
            this.currentFilters.age = { min: 18, max: 70 };
            this.currentFilters.period = {
                type: 'monthly',
                year: period.year,
                monthStart: period.month,
                monthEnd: period.month
            };
        } else if (period.type === 'day') {
            document.getElementById('minAge').value = 18;
            document.getElementById('maxAge').value = 70;
            this.currentFilters.age = { min: 18, max: 70 };
            this.currentFilters.period = {
                type: 'daily',
                year: period.date.getFullYear(),
                month: period.date.getMonth()
            };
        }

        this.applyAllFilters();
    }

    highlightUrgency(urgencyLevel) {
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        // Para licenças prêmio, usar filtro de cargo em vez de urgência
        if (isLicencaPremio) {
            this.highlightCargo(urgencyLevel);
            return;
        }

        const urgencyMap = {
            'critical': 'crítico',
            'high': 'alto',
            'moderate': 'moderado',
            'low': 'baixo'
        };

        const mappedUrgency = urgencyMap[urgencyLevel];

        // Integração completa com o sistema de filtros avançados
        if (this.advancedFiltersBuilder) {
            // Verificar se já existe filtro de urgência com este valor (toggle)
            const existingFilter = this.advancedFiltersBuilder.filters.find(
                f => f.type === 'urgencia' && f.value.includes(urgencyMap[urgencyLevel])
            );
            
            if (existingFilter) {
                // TOGGLE: Remover filtro se já existe
                this.advancedFiltersBuilder.filters = this.advancedFiltersBuilder.filters.filter(f => f.type !== 'urgencia');
                
                // Remover destaque do card
                document.querySelectorAll('.legend-card').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Atualizar interface e aplicar (SILENCIOSO)
                this.advancedFiltersBuilder.renderActiveFilters();
                this.advancedFiltersBuilder.updateResultsPreview();
                this.advancedFiltersBuilder.applyFilters(true); // silent = true
            } else {
                // ADICIONAR: Novo filtro
                // Remover destaque de todos os cards
                document.querySelectorAll('.legend-card').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Destacar o card clicado
                const urgencyElement = document.querySelector(`[data-urgency="${urgencyLevel}"]`);
                if (urgencyElement) {
                    urgencyElement.classList.add('active');
                }
                
                // Remover todos os filtros de urgência existentes
                this.advancedFiltersBuilder.filters = this.advancedFiltersBuilder.filters.filter(f => f.type !== 'urgencia');
                
                // Adicionar o novo filtro de urgência ao builder
                this.advancedFiltersBuilder.addFilterProgrammatically('urgencia', mappedUrgency);
            }
        }
    }

    // Função para filtrar por cargo nas tabelas de licenças prêmio
    highlightCargo(cargoKey) {
        // Para licenças prêmio, procurar por data-cargo ao invés de data-urgency
        const cargoElement = document.querySelector(`[data-cargo="${cargoKey}"]`);
        if (!cargoElement) return;

        // Obter o nome real do cargo do elemento
        const cargoName = cargoElement.querySelector('.legend-label')?.textContent?.trim();
        if (!cargoName) return;

        // Integração completa com o sistema de filtros avançados
        if (this.advancedFiltersBuilder) {
            // Verificar se já existe filtro de cargo com este valor (toggle)
            const existingFilter = this.advancedFiltersBuilder.filters.find(
                f => f.type === 'cargo' && f.value.includes(cargoName)
            );
            
            if (existingFilter) {
                // TOGGLE: Remover filtro se já existe
                this.advancedFiltersBuilder.filters = this.advancedFiltersBuilder.filters.filter(f => f.type !== 'cargo');
                
                // Remover destaque do card
                document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
                
                // Atualizar interface e aplicar (SILENCIOSO)
                this.advancedFiltersBuilder.renderActiveFilters();
                this.advancedFiltersBuilder.updateResultsPreview();
                this.advancedFiltersBuilder.applyFilters(true); // silent = true
            } else {
                // ADICIONAR: Novo filtro
                // Remover destaque de todos os cards
                document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
                
                // Destacar o card clicado
                cargoElement.classList.add('active');
                
                // Remover todos os filtros de cargo existentes
                this.advancedFiltersBuilder.filters = this.advancedFiltersBuilder.filters.filter(f => f.type !== 'cargo');
                
                // Adicionar o novo filtro de cargo ao builder
                this.advancedFiltersBuilder.addFilterProgrammatically('cargo', cargoName);
            }
        }
    }

    /**
     * Mostra uma notificação sutil quando um filtro é aplicado/removido
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo da notificação ('success', 'info', 'warning', 'error')
     */
    showFilterNotification(message, type = 'info') {
        // Verificar se já existe uma notificação
        let notification = document.getElementById('filterNotification');
        
        if (!notification) {
            // Criar elemento de notificação
            notification = document.createElement('div');
            notification.id = 'filterNotification';
            notification.className = 'filter-notification';
            document.body.appendChild(notification);
        }

        // Definir ícone baseado no tipo
        const icons = {
            success: '<i class="bi bi-check-circle-fill"></i>',
            info: '<i class="bi bi-info-circle-fill"></i>',
            warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
            error: '<i class="bi bi-x-circle-fill"></i>'
        };

        // Definir conteúdo
        notification.innerHTML = `
            ${icons[type] || icons.info}
            <span>${message}</span>
            <button class="filter-notification-close" onclick="this.parentElement.classList.remove('show')">
                <i class="bi bi-x"></i>
            </button>
        `;

        // Remover classes anteriores e adicionar nova
        notification.className = `filter-notification ${type}`;
        
        // Forçar reflow para reiniciar animação
        notification.offsetHeight;
        
        // Mostrar notificação
        notification.classList.add('show');

        // Auto-ocultar após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    filterTableByUrgency(urgencyLevel, chartIndex, shouldHighlightChart = true) {
        const urgencyMap = {
            'critical': 'crítico',
            'high': 'alto',
            'moderate': 'moderado',
            'low': 'baixo'
        };

        const mappedUrgency = urgencyMap[urgencyLevel];

        // Toggle filter
        if (this.currentFilters.urgency === mappedUrgency && this.selectedChartIndex === chartIndex) {
            // Remove filter
            this.clearUrgencyFilter(shouldHighlightChart);
        } else {
            // Add filter
            this.selectedChartIndex = chartIndex;
            this.currentFilters.urgency = mappedUrgency;
            
            // Destacar gráfico apenas se solicitado (legendas = sim, cards = não)
            if (shouldHighlightChart) {
                this.updateChartHighlight();
            }

            // Usar filtro apropriado baseado no tipo de tabela
            const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

            if (isLicencaPremio) {
                this.applyAllFilters();
            } else {
                this.applyTableFilter();
            }
        }
    }

    clearUrgencyFilter(shouldHighlightChart = true) {
        this.selectedChartIndex = -1;
        this.currentFilters.urgency = '';
        
        // Resetar highlight do gráfico apenas se solicitado
        if (shouldHighlightChart) {
            this.updateChartHighlight();
        }

        // Usar filtro adaptativo baseado no tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyAllFilters();
        } else {
            this.applyTableFilter();
        }

        // Clear legend active states
        document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));

        // Clear stat-card selected and active states
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.remove('selected');
            card.classList.remove('active'); // Remove a classe active dos cards de urgência
        });
        document.querySelectorAll('.legend-item').forEach(item => item.classList.remove('selected'));
    }

    // MÉTODOS DESCONTINUADOS - Agora usa highlightCargo() com AdvancedFiltersBuilder
    filterTableByCargo(cargo, chartIndex) {
        console.warn('⚠️ filterTableByCargo está descontinuado. Use highlightCargo() ao invés.');
        // Redirecionar para o novo sistema
        if (cargo) {
            this.highlightCargo(cargo);
        }
    }

    clearCargoFilter() {
        console.warn('⚠️ clearCargoFilter está descontinuado.');
        // Limpar filtros usando o novo sistema
        if (this.advancedFiltersBuilder) {
            this.advancedFiltersBuilder.filters = this.advancedFiltersBuilder.filters.filter(f => f.type !== 'cargo');
            this.advancedFiltersBuilder.renderActiveFilters();
            this.advancedFiltersBuilder.applyFilters();
        }
        
        // Clear legend active states
        document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
    }

    updateChartHighlight() {
        if (this.charts.urgency) {
            const chart = this.charts.urgency;
            const dataset = chart.data.datasets[0];

            // 🔒 USAR CORES ORIGINAIS SALVAS (imutáveis)
            // Se não existir, recriar do cargoData
            if (!this.originalChartColors) {
                const cargoData = this.getAdaptiveChartData();
                this.originalChartColors = (cargoData.colors || CARGO_COLORS.slice(0, dataset.data.length)).map(c => c);
            }

            // Criar NOVO array de cores (nunca modificar original)
            const numColors = dataset.data.length;
            
            // Se há uma seleção, destacar a fatia selecionada
            if (this.selectedChartIndex >= 0 && this.selectedChartIndex < numColors) {
                // Aplicar transparência às não selecionadas
                dataset.backgroundColor = this.originalChartColors.slice(0, numColors).map((color, index) => {
                    if (index === this.selectedChartIndex) {
                        return color; // Cor original para selecionada
                    } else {
                        // Adicionar transparência
                        if (color && color.startsWith('#')) {
                            return color + '60';
                        }
                        return color;
                    }
                });
                // Borda mais grossa na selecionada
                dataset.borderWidth = Array(numColors).fill(2).map((w, index) => {
                    return index === this.selectedChartIndex ? 4 : 2;
                });
            } else {
                // SEM seleção - resetar para cores originais PURAS
                dataset.backgroundColor = this.originalChartColors.slice(0, numColors);
                dataset.borderWidth = 2;
            }

            chart.update('none');
        }
    }

    applyTableFilter() {
        // Redirecionar para o sistema unificado de filtros
        this.applyFiltersAndSearch();
    }

    /**
     * Helper unificado para criar seções modais com header padronizado
     * @param {Object} options - Opções de configuração
     * @param {string} options.title - Título da seção
     * @param {string} options.icon - Classe do ícone Bootstrap (ex: 'bi-calendar-check')
     * @param {Object} options.badge - Configuração do badge { count: number, class: string }
     * @param {string} options.contentId - ID único para o elemento de conteúdo
     * @returns {HTMLElement} Elemento div.modal-section criado
     */
    createModalSection({ title, icon, badge, contentId }) {
        const section = document.createElement('div');
        section.className = 'modal-section';
        section.innerHTML = `
            <div class="section-header">
                <i class="bi ${icon} section-icon"></i>
                <h4 class="section-title">${this.escapeHtml(title)}</h4>
                <span class="section-badge ${badge.class}">${badge.count}</span>
            </div>
            <div class="section-content" id="${contentId}"></div>
        `;
        return section;
    }

    // Função unificada para renderizar lista de servidores (usada em calendário e timeline)
    renderServidoresList(servidores, options = {}) {
        const {
            showLicenseInfo = false,
            emptyIcon = 'bi-people',
            emptyMessage = 'Nenhum servidor encontrado para este período.'
        } = options;

        if (servidores.length === 0) {
            return `
                <div class="empty-state">
                    <i class="bi ${emptyIcon}"></i>
                    <p>${emptyMessage}</p>
                </div>
            `;
        }

        let html = `<div class="servidores-list">`;
        servidores.forEach(servidor => {
            const nomeEscapado = servidor.nome.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const lotacaoEscapada = (servidor.lotacao || 'Não especificado').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const cargoEscapado = (servidor.cargo || 'Cargo não especificado').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            // Gerar iniciais para o avatar
            const initials = servidor.nome.split(' ')
                .map(word => word[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            
            html += `
                <div class="servidor-item" onclick="dashboard.showServidorDetails('${nomeEscapado}')">
                    <div class="server-avatar">${initials}</div>
                    <div class="servidor-info">
                        <strong class="servidor-nome">${nomeEscapado}</strong>
                        <div class="servidor-meta">
                            <span class="meta-item">
                                <i class="bi bi-briefcase"></i>
                                <span>${cargoEscapado}</span>
                            </span>
                            ${servidor.idade ? `
                                <span class="meta-item">
                                    <i class="bi bi-person"></i>
                                    <span>${servidor.idade} anos</span>
                                </span>
                                ${servidor.lotacao && servidor.lotacao !== 'Não especificado' ? `
                            <div class="servidor-lotacao-info">
                                <i class="bi bi-building"></i>
                                <span>${lotacaoEscapada}</span>
                            </div>
                        ` : ''}
                            ` : ''}
                        </div>
                        ${showLicenseInfo && servidor.licenseInfo ? `
                            <div class="servidor-licenca">
                                <i class="bi bi-calendar-check"></i>
                                <span>${servidor.licenseInfo}</span>
                            </div>
                        ` : ''}
                        
                    </div>
                    <div class="servidor-details">
                        ${servidor.nivelUrgencia ? `<span class="urgency-badge urgency-${servidor.nivelUrgencia.toLowerCase()}">${servidor.nivelUrgencia}</span>` : ''}
                        <button class="btn-icon" onclick="event.stopPropagation(); dashboard.showServidorDetails('${nomeEscapado}')" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        return html;
    }

    // Manter compatibilidade com código existente
    createServidoresList(servidores) {
        return this.renderServidoresList(servidores);
    }

    // Utility methods (continuing with existing methods...)
    getUrgencyData() {
        const urgencyCount = {
            'Crítico': 0,
            'Alto': 0,
            'Moderado': 0,
            'Baixo': 0
        };

        // Apenas calcular urgência para cronogramas regulares
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (!isLicencaPremio) {
            this.filteredServidores.forEach(servidor => {
                if (servidor.nivelUrgencia) {
                    urgencyCount[servidor.nivelUrgencia]++;
                }
            });
        }

        return {
            values: Object.values(urgencyCount),
            counts: urgencyCount
        };
    }

    // Versão estática para gráficos e legendas (não afetada por filtros)
    getStaticUrgencyData() {
        const urgencyCount = {
            'Crítico': 0,
            'Alto': 0,
            'Moderado': 0,
            'Baixo': 0
        };

        // Apenas calcular urgência para cronogramas regulares
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (!isLicencaPremio) {
            this.allServidores.forEach(servidor => {
                if (servidor.nivelUrgencia) {
                    urgencyCount[servidor.nivelUrgencia]++;
                }
            });
        }

        return {
            values: Object.values(urgencyCount),
            counts: urgencyCount
        };
    }

    getCargoData() {
        const cargoCount = {};

        this.filteredServidores.forEach(servidor => {
            const cargo = servidor.cargo || 'Não informado';
            cargoCount[cargo] = (cargoCount[cargo] || 0) + 1;
        });

        // Ordenar por quantidade (decrescente) e pegar os top 10
        const sortedCargos = Object.entries(cargoCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        return {
            labels: sortedCargos.map(([cargo]) => cargo),
            values: sortedCargos.map(([, count]) => count),
            counts: cargoCount
        };
    }

    // Versão estática para gráficos e legendas (não afetada por filtros)
    getStaticCargoData() {
        const cargoCount = {};

        this.allServidores.forEach(servidor => {
            const cargo = servidor.cargo || 'Não informado';
            cargoCount[cargo] = (cargoCount[cargo] || 0) + 1;
        });

        // Ordenar por quantidade (decrescente) e pegar os top 10
        const sortedCargos = Object.entries(cargoCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        return {
            labels: sortedCargos.map(([cargo]) => cargo),
            values: sortedCargos.map(([, count]) => count),
            counts: cargoCount
        };
    }

    getTimelineData() {
        const viewType = document.getElementById('timelineView') ?
            document.getElementById('timelineView').value : 'monthly';
        
        let selectedYear, selectedMonth;
        
        if (viewType === 'daily') {
            const dailyInput = document.getElementById('timelineDailyMonth');
            if (dailyInput && dailyInput.value) {
                const [year, month] = dailyInput.value.split('-').map(Number);
                selectedYear = year;
                selectedMonth = month - 1;
            } else {
                const today = new Date();
                selectedYear = today.getFullYear();
                selectedMonth = today.getMonth();
            }
        }
        
        let periodStart = null;
        let periodEnd = null;
        
        if (viewType === 'monthly') {
            // Para vista mensal, usar input type="month" (formato YYYY-MM)
            const periodStartStr = document.getElementById('timelinePeriodStartMonth')?.value;
            const periodEndStr = document.getElementById('timelinePeriodEndMonth')?.value;
            
            if (periodStartStr && periodEndStr) {
                const [startYear, startMonth] = periodStartStr.split('-').map(Number);
                const [endYear, endMonth] = periodEndStr.split('-').map(Number);
                periodStart = new Date(startYear, startMonth - 1, 1); // mês é 0-based
                periodEnd = new Date(endYear, endMonth - 1, 28); // último dia aproximado
            }
        } else if (viewType === 'yearly') {
            // Para vista anual, usar input type="number" (apenas ano)
            const periodStartYear = document.getElementById('timelinePeriodStartYear')?.value;
            const periodEndYear = document.getElementById('timelinePeriodEndYear')?.value;
            
            if (periodStartYear && periodEndYear) {
                periodStart = new Date(parseInt(periodStartYear), 0, 1);
                periodEnd = new Date(parseInt(periodEndYear), 11, 31);
            }
        }
        
        const data = {};

        // Verificar qual tipo de dado está sendo usado
        const hasLicencas = this.filteredServidores && this.filteredServidores.length > 0;
        const hasNotificacoes = this.notificacoes && this.notificacoes.length > 0;

    // Preparar dados para exibição na timeline
    // Detectar se os dados são do tipo 'licença-prêmio' e adaptar processamento
        const isLicencaPremio = hasLicencas && this.filteredServidores[0].tipoTabela === 'licenca-premio';
            if (isLicencaPremio) {
                // Para 'licença-prêmio' alguns buckets e contagens são tratados de forma diferente
            }

        let totalLicenses = 0;
        let filteredLicenses = 0;

        // Criar esqueleto completo dos períodos com valor 0 (apenas para monthly e daily)
        if (viewType === 'monthly' && periodStart && periodEnd) {
            // Para vista mensal com range: criar todos os meses entre periodStart e periodEnd
            let current = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
            const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
            
            while (current <= end) {
                const year = current.getFullYear();
                const month = current.getMonth();
                const key = `${year}-${month.toString().padStart(2, '0')}`;
                data[key] = {
                    count: 0,
                    period: { type: 'month', year, month },
                    servidores: new Set()
                };
                current.setMonth(current.getMonth() + 1);
            }
        } else if (viewType === 'monthly') {
            // Fallback: criar todos os 12 meses do ano selecionado
            for (let month = 0; month < 12; month++) {
                const key = `${selectedYear}-${month.toString().padStart(2, '0')}`;
                data[key] = {
                    count: 0,
                    period: { type: 'month', year: selectedYear, month },
                    servidores: new Set()
                };
            }
        } else if (viewType === 'daily') {
            // Para vista diária, criar todos os dias do mês selecionado
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const key = day.toString();
                data[key] = {
                    count: 0,
                    period: { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear },
                    servidores: new Set()
                };
            }
        } else if (viewType === 'yearly' && periodStart && periodEnd) {
            // Para vista anual com range: criar todos os anos entre periodStart e periodEnd
            const startYear = periodStart.getFullYear();
            const endYear = periodEnd.getFullYear();
            
            for (let year = startYear; year <= endYear; year++) {
                const key = year.toString();
                data[key] = {
                    count: 0,
                    period: { type: 'year', value: year },
                    servidores: new Set()
                };
            }
        }

        // Processar APENAS licenças (se existirem E não houver notificações)
        if (hasLicencas && !hasNotificacoes) {
        this.filteredServidores.forEach(servidor => {
            servidor.licencas.forEach(licenca => {
                totalLicenses++;
                let key, period;
                let shouldInclude = true;

                if (viewType === 'yearly') {
                    // Para vista anual, incluir TODOS os anos em que a licença está ativa
                    const startYear = licenca.inicio.getFullYear();
                    const endYear = licenca.fim ? licenca.fim.getFullYear() : startYear;
                    
                    // Aplicar filtro de range se disponível
                    let minYear = startYear;
                    let maxYear = endYear;
                    
                    if (periodStart && periodEnd) {
                        const rangeStart = periodStart.getFullYear();
                        const rangeEnd = periodEnd.getFullYear();
                        minYear = Math.max(startYear, rangeStart);
                        maxYear = Math.min(endYear, rangeEnd);
                    }
                    
                    // Adicionar todos os anos entre início e fim (dentro do range)
                    for (let year = minYear; year <= maxYear; year++) {
                        key = year.toString();
                        period = { type: 'year', value: year };
                        
                        if (!shouldInclude) continue;
                        
                        // Garantir que o bucket existe (caso não tenha esqueleto por range ausente)
                        if (!data[key]) {
                            data[key] = { count: 0, period, servidores: new Set() };
                        }
                        
                        data[key].servidores.add(servidor.nome);
                        // Incrementar apenas na primeira vez que incluímos esta licença
                        if (year === minYear) {
                            filteredLicenses++;
                        }
                    }
                } else if (viewType === 'daily') {
                    // Para a vista diária, uma licença pode abranger vários dias; incluir todos os dias que caem dentro do mês/ano selecionado
                    const licStart = new Date(licenca.inicio);
                    const licEnd = licenca.fim ? new Date(licenca.fim) : new Date(licenca.inicio);

                    // Normalize start/end (reset hours to avoid timezone issues)
                    licStart.setHours(0, 0, 0, 0);
                    licEnd.setHours(0, 0, 0, 0);

                    const monthStart = new Date(selectedYear, selectedMonth, 1);
                    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

                    // Calcular interseção entre o período da licença e o mês selecionado
                    const includeStart = licStart > monthStart ? licStart : monthStart;
                    const includeEnd = licEnd < monthEnd ? licEnd : monthEnd;

                    if (includeStart > includeEnd) {
                        // No overlap with selected month
                        return;
                    }

                    // Count this license once as filtered (it contributes to the daily view)
                    filteredLicenses++;

                    // Iterate each day in the intersection and add servidor (Set evita duplicatas)
                    const currentDay = new Date(includeStart);
                    while (currentDay <= includeEnd) {
                        const day = currentDay.getDate();
                        const dayKey = day.toString();
                        const dayPeriod = { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear };

                        if (!data[dayKey]) data[dayKey] = { count: 0, period: dayPeriod, servidores: new Set() };
                        data[dayKey].servidores.add(servidor.nome);

                        currentDay.setDate(currentDay.getDate() + 1);
                    }
                } else { // monthly
                    // Para visualização mensal, contar servidor em todos os meses que ele está ativo
                    const licStart = new Date(licenca.inicio);
                    const licEnd = licenca.fim ? new Date(licenca.fim) : new Date(licenca.inicio);
                    
                    // Normalizar para evitar problemas com horas
                    licStart.setHours(0, 0, 0, 0);
                    licEnd.setHours(0, 0, 0, 0);

                    // Determinar os limites de processamento
                    let processStart, processEnd;
                    
                    if (periodStart && periodEnd) {
                        // Se houver range ativo, processar todos os meses no range
                        processStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
                        processEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 28);
                    } else {
                        // Sem range, processar apenas o ano selecionado
                        processStart = new Date(selectedYear, 0, 1);
                        processEnd = new Date(selectedYear, 11, 31);
                    }

                    // Iterar por cada mês que a licença cobre
                    const currentMonth = new Date(licStart);
                    let addedToAnyMonth = false;
                    
                    while (currentMonth <= licEnd) {
                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();
                        
                        // Verificar se este mês está dentro dos limites de processamento
                        const monthStart = new Date(year, month, 1);
                        const monthEnd = new Date(year, month + 1, 0);
                        
                        // Verificar se o mês está dentro do range de processamento
                        if (monthEnd >= processStart && monthStart <= processEnd) {
                            // Verificar se a licença está ativa em algum dia deste mês
                            if (licStart <= monthEnd && licEnd >= monthStart) {
                                key = `${year}-${month.toString().padStart(2, '0')}`;
                                period = { type: 'month', year, month };
                                
                                if (!data[key]) data[key] = { count: 0, period, servidores: new Set() };
                                data[key].servidores.add(servidor.nome);
                                addedToAnyMonth = true;
                            }
                        }
                        
                        // Avançar para o próximo mês
                        currentMonth.setMonth(currentMonth.getMonth() + 1);
                        currentMonth.setDate(1); // Resetar para dia 1 para evitar problemas
                    }
                    
                    if (addedToAnyMonth) {
                        filteredLicenses++;
                    }
                }
            });
        });
        }
        
        // Processar APENAS notificações (se existirem E não houver licenças)
        else if (hasNotificacoes && !hasLicencas) {
            this.notificacoes.forEach(notif => {
                if (notif.datas && Array.isArray(notif.datas)) {
                    notif.datas.forEach(dataObj => {
                        if (dataObj.data) {
                            const notifDate = new Date(dataObj.data);
                            let key, period;
                            
                            if (viewType === 'yearly') {
                                const year = notifDate.getFullYear();
                                key = year.toString();
                                period = { type: 'year', value: year };
                                
                                // Garantir que o bucket existe
                                if (!data[key]) {
                                    data[key] = { count: 0, period, servidores: new Set() };
                                }
                                data[key].servidores.add(notif.interessado || 'Desconhecido');
                            } else if (viewType === 'monthly') {
                                const year = notifDate.getFullYear();
                                const month = notifDate.getMonth();
                                key = `${year}-${month.toString().padStart(2, '0')}`;
                                period = { type: 'month', year, month };
                                
                                // Garantir que o bucket existe
                                if (!data[key]) {
                                    data[key] = { count: 0, period, servidores: new Set() };
                                }
                                data[key].servidores.add(notif.interessado || 'Desconhecido');
                            } else if (viewType === 'daily') {
                                // Para daily, verificar se a data está no mês/ano selecionado
                                if (notifDate.getFullYear() === selectedYear && 
                                    notifDate.getMonth() === selectedMonth) {
                                    const day = notifDate.getDate();
                                    key = day.toString();
                                    period = { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear };
                                    
                                    // Garantir que o bucket existe
                                    if (!data[key]) {
                                        data[key] = { count: 0, period, servidores: new Set() };
                                    }
                                    data[key].servidores.add(notif.interessado || 'Desconhecido');
                                }
                            }
                        }
                    });
                }
            });
        }

    // Dados da timeline processados

        // Sort keys appropriately
        const sortedKeys = Object.keys(data).sort((a, b) => {
            if (viewType === 'daily') {
                return parseInt(a) - parseInt(b);
            } else if (viewType === 'yearly') {
                return parseInt(a) - parseInt(b);
            } else if (viewType === 'monthly') {
                // Para monthly, ordenar por year-month (já está no formato YYYY-MM)
                return a.localeCompare(b);
            }
            return a.localeCompare(b);
        });

        const labels = sortedKeys.map(key => {
            const item = data[key];
            if (item.period.type === 'year') {
                return item.period.value.toString();
            } else if (item.period.type === 'day') {
                return item.period.day.toString();
            } else if (item.period.type === 'month') {
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return `${monthNames[item.period.month]}/${item.period.year}`;
            }
            return key;
        });

        const result = {
            labels,
            data: sortedKeys.map(key => data[key].servidores.size), // Contar servidores únicos
            periods: sortedKeys.map(key => data[key].period),
            servidoresData: sortedKeys.map(key => Array.from(data[key].servidores))
        };

    // Resultado final da timeline
        return result;
    }

    getMonthName(monthIndex) {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return months[monthIndex];
    }

    updateUrgencyChart() {
        if (this.charts.urgency) {
            const urgencyData = this.getStaticUrgencyData();
            
            // Destruir e recriar o gráfico para evitar bugs visuais
            this.charts.urgency.destroy();
            this.createUrgencyChart();
            
            this.updateUrgencyLegend(urgencyData);
        }
    }

    updateTimelineChart() {
        if (this.charts.timeline) {
            const timelineData = this.getTimelineData();
            
            // DEBUG: Verificar dados da timeline
            console.log('Timeline Data:', {
                labels: timelineData.labels,
                data: timelineData.data,
                servidoresData: timelineData.servidoresData
            });
            
            this.charts.timeline.data.labels = timelineData.labels;
            this.charts.timeline.data.datasets[0].data = timelineData.data;
            this.charts.timeline.update('none'); // Força atualização completa

            // Atualizar estatísticas da timeline
            this.updateTimelineStats(timelineData);
            } else {
                // Se o gráfico não existir, criá-lo
                this.createTimelineChart();
            }
    }

    updateUrgencyLegend(urgencyData) {
        const urgencyKeys = ['critical', 'high', 'moderate', 'low'];
        const urgencyLabels = ['Crítico', 'Alto', 'Moderado', 'Baixo'];

        urgencyKeys.forEach((key, index) => {
            const countElement = document.getElementById(`${key}Count`);
            if (countElement) {
                countElement.textContent = urgencyData.counts[urgencyLabels[index]] || 0;
            }

            // Atualizar contagens customizadas da legenda
            const legendCountElement = document.getElementById(`legend${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (legendCountElement) {
                legendCountElement.textContent = urgencyData.counts[urgencyLabels[index]] || 0;
            }
        });
    }

    updateCargoLegend(cargoData) {
        const legendContainer = document.querySelector('.chart-legends');
        if (!legendContainer) return;

        legendContainer.innerHTML = '';

    // Criar grade para as legendas de cargo
        legendContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        legendContainer.style.gridTemplateRows = 'auto';

        cargoData.labels.forEach((cargo, index) => {
            const legendCard = document.createElement('div');
            legendCard.className = 'legend-card cargo';
            legendCard.dataset.cargo = cargo;
            
            // 🎨 USAR CORES FIXAS do array cargoData.colors
            const color = cargoData.colors ? cargoData.colors[index] : CARGO_COLORS[index];
            
            legendCard.innerHTML = `
                <div class="legend-color" style="background-color: ${color}"></div>
                <span class="legend-label">${cargo}</span>
                <span class="legend-count">${cargoData.values[index]}</span>
            `;

            legendCard.addEventListener('click', () => {
                this.filterTableByCargo(cargo, index);
            });

            legendContainer.appendChild(legendCard);
        });
    }

    updateTimelineView() {
        this.updateTimelineChart();
    }

    // Table functions
    updateTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Verificar se não há dados carregados
        if (!this.allServidores || this.allServidores.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
                        <img src="img/empty-state-table.svg" alt="Nenhum dado" style="max-width:120px; opacity:0.7; margin-bottom:0.5rem;" onerror="this.style.display='none'">
                        <div>
                            <h4 style="margin: 0; color: var(--text-secondary); font-weight:600;">Nenhum dado carregado</h4>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.95rem; color:var(--text-secondary);">Faça upload de um arquivo CSV ou Excel para começar</p>
                        </div>
                        <button class="btn-primary" id="tableUploadBtn" style="display:inline-flex; align-items:center; gap:0.5rem; font-size:1rem;">
                            <i class="bi bi-upload"></i>
                            <span>Fazer upload</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);

            // Atualizar contador de resultados
            const resultCount = document.getElementById('resultCount');
            if (resultCount) {
                resultCount.textContent = '0 resultados';
            }
            return;
        }

        if (this.filteredServidores.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
                        <img src="img/empty-state-search.svg" alt="Nenhum resultado" style="max-width:100px; opacity:0.7; margin-bottom:0.5rem;" onerror="this.style.display='none'">
                        <div>
                            <h4 style="margin: 0; color: var(--text-secondary); font-weight:600;">Nenhum servidor encontrado</h4>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.95rem; color:var(--text-secondary);">Tente ajustar os filtros ou buscar outro termo</p>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);
            return;
        }

        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        // Adaptar filtros para o tipo de tabela
        this.adaptFiltersForTableType(isLicencaPremio);

        // Atualizar headers da tabela se necessário
        this.updateTableHeaders(isLicencaPremio);

    // Aplicar ordenação usando TableSortManager
        let sortedServidores = [...this.filteredServidores];
        if (this.tableSortManager) {
            sortedServidores = this.tableSortManager.sortData(sortedServidores);
        }

        sortedServidores.forEach(servidor => {
            const row = document.createElement('tr');
            row.className = 'fade-in';

            const nomeEscapado = servidor.nome.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const lotacaoEscapada = (servidor.lotacao || '--').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const cargoEscapado = (servidor.cargo || '--').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            // Calcular próxima licença
            let proximaLicencaTexto = '--';
            if (servidor.proximaLicencaInicio) {
                const dataLicenca = new Date(servidor.proximaLicencaInicio);
                proximaLicencaTexto = dataLicenca.toLocaleDateString('pt-BR');
            }

            // Formatar período completo de licença - corrigido para períodos múltiplos
            const formatarPeriodoLicenca = (servidor) => {
                // Primeiro tentar usar os campos já processados
                if (servidor.proximaLicencaInicio && servidor.proximaLicencaFim) {
                    const inicio = new Date(servidor.proximaLicencaInicio);
                    const fim = new Date(servidor.proximaLicencaFim);

                    if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
                        const mesesAbrev = [
                            'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                            'jul', 'ago', 'set', 'out', 'nov', 'dez'
                        ];

                        const diaInicio = inicio.getDate();
                        const mesInicio = mesesAbrev[inicio.getMonth()];
                        const anoInicio = inicio.getFullYear();

                        const diaFim = fim.getDate();
                        const mesFim = mesesAbrev[fim.getMonth()];
                        const anoFim = fim.getFullYear();

                        // Se é o mesmo ano
                        if (anoInicio === anoFim) {
                            return `${diaInicio}/${mesInicio} - ${diaFim}/${mesFim}/${anoInicio}`;
                        }

                        // Se atravessa anos
                        return `${diaInicio}/${mesInicio}/${anoInicio} - ${diaFim}/${mesFim}/${anoFim}`;
                    }
                }

                // Fallback: usar array de licenças - pegar PRIMEIRA e ÚLTIMA para período completo
                if (servidor.licencas && servidor.licencas.length > 0) {
                    const primeiraLicenca = servidor.licencas[0];
                    const ultimaLicenca = servidor.licencas[servidor.licencas.length - 1];

                    if (primeiraLicenca.inicio && ultimaLicenca.fim) {
                        const inicio = new Date(primeiraLicenca.inicio);
                        const fim = new Date(ultimaLicenca.fim);

                        if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
                            const mesesAbrev = [
                                'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                                'jul', 'ago', 'set', 'out', 'nov', 'dez'
                            ];

                            const diaInicio = inicio.getDate();
                            const mesInicio = mesesAbrev[inicio.getMonth()];
                            const anoInicio = inicio.getFullYear();

                            const diaFim = fim.getDate();
                            const mesFim = mesesAbrev[fim.getMonth()];
                            const anoFim = fim.getFullYear();

                            if (anoInicio === anoFim) {
                                return `${diaInicio}/${mesInicio} - ${diaFim}/${mesFim}/${anoInicio}`;
                            }

                            return `${diaInicio}/${mesInicio}/${anoInicio} - ${diaFim}/${mesFim}/${anoFim}`;
                        }
                    }
                }

                return '--';
            };

            const periodoLicencaCompleto = formatarPeriodoLicenca(servidor);

            if (isLicencaPremio) {
                // Formato para tabela de licenças prêmio
                row.innerHTML = `
                    <td><strong>${nomeEscapado}</strong></td>
                    <td><span class="cargo-badge">${cargoEscapado}</span></td>
                    <td>${periodoLicencaCompleto}</td>
                    <td class="actions">
                        <button class="btn-icon" data-servidor-nome="${nomeEscapado}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
            } else {
                // Formato para tabela original
                row.innerHTML = `
                    <td><strong>${nomeEscapado}</strong></td>
                    <td>${servidor.idade}</td>
                    <td><span class="lotacao-badge">${lotacaoEscapada}</span></td>
                    <td>${periodoLicencaCompleto}</td>
                    <td><span class="urgency-badge urgency-${servidor.nivelUrgencia.toLowerCase()}">${servidor.nivelUrgencia}</span></td>
                    <td class="actions">
                        <button class="btn-icon" data-servidor-nome="${nomeEscapado}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
            }

            tbody.appendChild(row);
        });

    // Após renderizar as linhas, executar uma passagem somente no DOM para ocultar duplicatas visuais
        try {
            const allRows = Array.from(tbody.querySelectorAll('tr'));
            const nameMap = new Map(); // data-servidor-nome -> { firstRow, count }

            allRows.forEach(r => {
                const btn = r.querySelector('.btn-icon[data-servidor-nome]');
                if (!btn) return;
                const name = btn.getAttribute('data-servidor-nome');
                const info = nameMap.get(name) || { firstRow: null, count: 0, rows: [] };
                info.count++;
                info.rows.push(r);
                if (!info.firstRow) info.firstRow = r;
                nameMap.set(name, info);
            });

            // Ocultar linhas subsequentes e adicionar badge na primeira
            nameMap.forEach(info => {
                if (info.count > 1) {
                    // adicionar badge inline na célula do nome da primeira linha, se não presente
                    const firstRow = info.firstRow;
                    const strong = firstRow.querySelector('td strong');
                    if (strong && !strong.querySelector('.duplicate-inline')) {
                        const span = document.createElement('span');
                        span.className = 'duplicate-inline';
                        span.textContent = ` (${info.count})`;
                        span.style.cssText = 'font-size:0.8rem;color:var(--text-tertiary);padding-left:0.25rem;font-weight:600';
                        strong.appendChild(span);
                    }

                    // ocultar todas as linhas exceto a primeira
                    info.rows.forEach((r, idx) => {
                        if (idx === 0) return;
                        r.style.display = 'none';
                        r.classList.add('duplicate-hidden');
                    });
                }
            });
        } catch (e) {
            console.error('Erro ao aplicar deduplicação visual:', e);
        }

    // Atualizar informações da tabela
        const resultCountElement = document.getElementById('resultCount');
        if (resultCountElement) {
            resultCountElement.textContent = `${this.filteredServidores.length} resultados`;
        }
    }

    updateTableHeaders(isLicencaPremio) {
        const tableHead = document.querySelector('#servidoresTable thead tr');
        if (!tableHead) return;

        if (isLicencaPremio) {
            tableHead.innerHTML = `
                <th>Nome</th>
                <th>Cargo</th>
                <th>Período de Licença</th>
                <th>Ações</th>
            `;
        } else {
            tableHead.innerHTML = `
                <th>Nome</th>
                <th>Idade</th>
                <th>Lotação</th>
                <th>Próxima Licença</th>
                <th>Urgência</th>
                <th>Ações</th>
            `;
        }

        // Inicializar headers ordenáveis com TableSortManager
        if (this.tableSortManager) {
            setTimeout(() => {
                this.tableSortManager.initializeTableHeaders();
            }, 100);
        }
    }

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

    // Atualizar interface (UI)
        document.querySelectorAll('.sortable i').forEach(i => {
            i.className = 'bi bi-arrow-up-down';
        });

        const currentTh = document.querySelector(`[data-column="${column}"] i`);
        if (this.sortDirection === 'asc') {
            currentTh.className = 'bi bi-arrow-up';
        } else {
            currentTh.className = 'bi bi-arrow-down';
        }

        this.updateTable();
    }

    // Helper para renderizar período de forma detalhada e consistente
    renderPeriodoDetalhado(licenca, index, total) {
        const inicio = this.formatDateBR(licenca.inicio);
        const fim = this.formatDateBR(licenca.fim);
        const dias = Math.ceil((licenca.fim - licenca.inicio) / (1000 * 60 * 60 * 24)) + 1;
        const meses = Math.floor(dias / 30);
        
        // Calcular os marcos de 30 em 30 dias
        const marcos = [];
        let dataAtual = new Date(licenca.inicio);
        let diasRestantes = dias;
        let marcoNum = 1;
        
        while (diasRestantes > 0) {
            const diasNoMarco = Math.min(30, diasRestantes);
            const dataFimMarco = new Date(dataAtual);
            dataFimMarco.setDate(dataFimMarco.getDate() + diasNoMarco - 1);
            
            marcos.push({
                num: marcoNum,
                inicio: this.formatDateBR(dataAtual),
                fim: this.formatDateBR(dataFimMarco),
                dias: diasNoMarco
            });
            
            dataAtual = new Date(dataFimMarco);
            dataAtual.setDate(dataAtual.getDate() + 1);
            diasRestantes -= diasNoMarco;
            marcoNum++;
        }
        
        let html = `
            <div class="period-card" style="
                background: var(--bg-primary);
                border: 1px solid var(--border);
                padding: 1rem;
                border-radius: 8px;
                transition: all 0.2s ease;
            ">
                <!-- Header único com info resumida -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border);
                ">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 1rem;">
                        <i class="bi bi-calendar-check" style="color: var(--primary);"></i> Período ${index + 1}${total > 1 ? ` de ${total}` : ''}
                    </div>
                    <span style="
                        background-color: rgba(37, 99, 235, 0.1);
                        color: var(--primary);
                        border: 1px solid rgba(37, 99, 235, 0.2);
                        padding: 0.25rem 0.75rem;
                        border-radius: 12px;
                        font-size: 0.8rem;
                        font-weight: 600;
                    ">
                        ${meses} ${meses === 1 ? 'mês' : 'meses'} (${dias} dias)
                    </span>
                </div>

                <!-- Timeline detalhada de 30 em 30 dias -->
                <div style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                    padding: 0.5rem 0;
                ">
                    ${marcos.map((marco, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === marcos.length - 1;
                        
                        let diasAcumulados = 0;
                        for (let i = 0; i <= idx; i++) {
                            diasAcumulados += marcos[i].dias;
                        }
                        
                        let accentColor, icon, label;
                        
                        if (isFirst) {
                            accentColor = '#3b82f6';
                            icon = '🚀';
                            label = 'INÍCIO';
                        } else if (isLast) {
                            accentColor = '#10b981';
                            icon = '🏁';
                            label = 'FIM';
                        } else {
                            accentColor = '#8b5cf6';
                            icon = '📅';
                            label = `MÊS ${marco.num}`;
                        }
                        
                        return `
                            <div style="
                                flex: 1;
                                min-width: 200px;
                                background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(99, 102, 241, 0.02));
                                border: 1.5px solid ${accentColor};
                                border-radius: 8px;
                                padding: 0.75rem;
                                position: relative;
                            ">
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 0.5rem;
                                ">
                                    <span style="
                                        font-size: 0.7rem;
                                        font-weight: 700;
                                        color: ${accentColor};
                                        letter-spacing: 0.5px;
                                    ">${icon} ${label}</span>
                                    <span style="
                                        font-size: 0.7rem;
                                        color: var(--text-muted);
                                        font-weight: 600;
                                    ">${marco.dias} ${marco.dias === 1 ? 'dia' : 'dias'}</span>
                                </div>
                                <div style="
                                    font-size: 0.85rem;
                                    color: var(--text-primary);
                                    font-weight: 500;
                                    line-height: 1.4;
                                ">
                                    ${marco.inicio}<br>
                                    <span style="color: var(--text-muted); font-size: 0.75rem;">até</span><br>
                                    ${marco.fim}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        return html;
    }

    showServidorDetails(nomeServidor) {
        // Agregar TODAS as licenças de servidores com o mesmo nome
        const servidoresComMesmoNome = this.allServidores.filter(s => s.nome === nomeServidor);
        if (!servidoresComMesmoNome || servidoresComMesmoNome.length === 0) return;

        // Usar o primeiro servidor como base e agregar licenças de todos
        const servidor = { ...servidoresComMesmoNome[0] };

        // Agregar todas as licenças de todos os servidores com este nome, removendo duplicatas
        servidor.licencas = [];
        const licencasUnicas = new Set(); // Para evitar duplicatas
        const todosOsDadosOriginais = []; // Para coletar todos os dados originais
        const licencasBrutas = []; // Coletar todas as licenças brutas (com duplicatas) para exibição no modal

        servidoresComMesmoNome.forEach(s => {
            // Coletar dados originais de cada entrada
            if (s.dadosOriginais) {
                todosOsDadosOriginais.push(s.dadosOriginais);
            }
            // Coletar licenças brutas (preservando duplicatas)
            if (s.licencas && s.licencas.length > 0) {
                s.licencas.forEach(l => {
                    licencasBrutas.push(Object.assign({}, l));
                });
            }

            if (s.licencas && s.licencas.length > 0) {
                s.licencas.forEach(licenca => {
                    // Criar uma chave única para a licença baseada nas datas
                    const chave = `${licenca.inicio.getTime()}-${licenca.fim.getTime()}-${licenca.tipo}`;
                    if (!licencasUnicas.has(chave)) {
                        licencasUnicas.add(chave);
                        servidor.licencas.push(licenca);
                    }
                });
            }
        });

        // Combinar todos os dados originais únicos
        servidor.todosOsDadosOriginais = todosOsDadosOriginais;
        // Preservar licenças brutas separadamente para uso no modal (não tocar `servidor.licencas` usado por agrupamentos)
        servidor.licencasBrutas = licencasBrutas;

        // Ordenar licenças por data de início
        servidor.licencas.sort((a, b) => a.inicio - b.inicio);

        // Agrupar licenças por períodos contíguos
        const periodosAgrupados = this.agruparLicencasPorPeriodos(servidor.licencas);

        // Recalcular estatísticas agregadas
        servidor.licencasAgendadas = servidor.licencas.length;

        // Detectar se é tabela de licenças prêmio
        const isLicencaPremio = servidor.tipoTabela === 'licenca-premio';

        // Informações pessoais removidas: agora consolidadas em 'Registros da Planilha'

        // Registros da Planilha (consolidar informações únicas)
        let originalDataContent = '<div class="planilha-summary">';

        if (servidor.todosOsDadosOriginais && servidor.todosOsDadosOriginais.length > 0) {
            // Consolidar campos não pessoais extraídos da planilha

            // Consolidar informações únicas e períodos
            const dadosConsolidados = new Map();
            const periodos = [];

            // Helper: normalize month/year text from CSV to canonical Portuguese capitalization
            const normalizeMonthYearText = (txt) => {
                if (!txt) return '';
                const raw = txt.toString().trim();

                // Normalize separators and remove extra text like parentheses
                const cleaned = raw.replace(/[()]/g, '').replace(/\s*-\s*/g, ' / ').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();

                // Month name maps (Portuguese and English) to Portuguese canonical
                const monthsMap = {
                    // Portuguese
                    'jan': 'Janeiro', 'janeiro': 'Janeiro',
                    'fev': 'Fevereiro', 'fevereiro': 'Fevereiro',
                    'mar': 'Março', 'marco': 'Março', 'março': 'Março',
                    'abr': 'Abril', 'abril': 'Abril',
                    'mai': 'Maio', 'maio': 'Maio',
                    'jun': 'Junho', 'junho': 'Junho',
                    'jul': 'Julho', 'julho': 'Julho',
                    'ago': 'Agosto', 'agosto': 'Agosto',
                    'set': 'Setembro', 'setembro': 'Setembro',
                    'out': 'Outubro', 'outubro': 'Outubro',
                    'nov': 'Novembro', 'novembro': 'Novembro',
                    'dez': 'Dezembro', 'dezembro': 'Dezembro',
                    // English variants
                    'jan': 'Janeiro', 'january': 'Janeiro',
                    'feb': 'Fevereiro', 'february': 'Fevereiro',
                    'mar': 'Março', 'march': 'Março',
                    'apr': 'Abril', 'april': 'Abril',
                    'may': 'Maio',
                    'jun': 'Junho', 'june': 'Junho',
                    'jul': 'Julho', 'july': 'Julho',
                    'aug': 'Agosto', 'august': 'Agosto',
                    'sep': 'Setembro', 'sept': 'Setembro', 'september': 'Setembro',
                    'oct': 'Outubro', 'october': 'Outubro',
                    'nov': 'Novembro', 'november': 'Novembro',
                    'dec': 'Dezembro', 'december': 'Dezembro'
                };

                // Try patterns: "Month / YYYY", "Month YYYY", "MM/YYYY", "MM-YYYY", "Month / YY"
                // 1) month name + year
                let m = cleaned.match(/^([a-zçãéíóú\.]+)\s*[\/\s]\s*(\d{2,4})$/i);
                if (m) {
                    const monthPart = m[1].replace('.', '').toLowerCase();
                    let yearPart = parseInt(m[2]);
                    if (yearPart < 100) yearPart = yearPart > 50 ? 1900 + yearPart : 2000 + yearPart;
                    const key = monthPart.substring(0, monthPart.length > 3 ? monthPart.length : 3);
                    const monthName = monthsMap[monthPart] || monthsMap[monthPart.substring(0, 3)] || (monthPart.charAt(0).toUpperCase() + monthPart.slice(1));
                    return `${monthName} / ${yearPart}`;
                }

                // 2) formato numérico de mês MM/AAAA ou M/AAAA
                m = cleaned.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
                if (m) {
                    let mm = parseInt(m[1]);
                    let yy = parseInt(m[2]);
                    if (yy < 100) yy = yy > 50 ? 1900 + yy : 2000 + yy;
                    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    if (mm >= 1 && mm <= 12) return `${monthNames[mm - 1]} / ${yy}`;
                }

                // 3) Retorna apenas nome do mês sem ano
                m = cleaned.match(/^([a-zçãéíóú\.]+)$/i);
                if (m) {
                    const monthPart = m[1].replace('.', '').toLowerCase();
                    const monthName = monthsMap[monthPart] || monthsMap[monthPart.substring(0, 3)] || (monthPart.charAt(0).toUpperCase() + monthPart.slice(1));
                    return monthName;
                }

                // Retorno padrão: capitalizar primeira letra
                return raw.charAt(0).toUpperCase() + raw.slice(1);
            };

            servidor.todosOsDadosOriginais.forEach((dados) => {
                // Coletar TODOS os dados da planilha (exceto apenas o nome do servidor)
                Object.entries(dados).forEach(([key, value]) => {
                    const keyUpper = key.toUpperCase();
                    // Pular apenas o nome do servidor (já está no título do modal) e campos técnicos internos
                    if (!keyUpper.includes('SERVIDOR') &&
                        !keyUpper.includes('NOME') &&
                        !key.startsWith('_') && // Filtrar campos técnicos como _colIndexMap
                        value && value !== '' && value !== 'undefined' && value !== 'null') {
                        dadosConsolidados.set(key, value);
                    }
                });

                // Coletar períodos (incluir duplicates para que o modal mostre registros iguais)
                const inicioRaw = dados['INICIO DE LICENÇA PREMIO'] || dados['INICIO DE LICENCA PREMIO'] || dados['INICIO'] || '';
                const finalRaw = dados['FINAL DE LICENÇA PREMIO'] || dados['FINAL DE LICENCA PREMIO'] || dados['FINAL'] || '';
                if (inicioRaw && finalRaw) {
                    const inicio = normalizeMonthYearText(inicioRaw);
                    const final = normalizeMonthYearText(finalRaw);
                    const periodoStr = `${inicio} - ${final}`;
                    periodos.push(periodoStr);
                }
            });

            // Mostrar apenas se houver dados relevantes
            if (dadosConsolidados.size > 0 || periodos.length > 0) {
                // Analisar quais campos variam entre registros
                const camposPorRegistro = [];
                servidor.todosOsDadosOriginais.forEach((dados) => {
                    const registro = {};
                    Object.entries(dados).forEach(([key, value]) => {
                        const keyUpper = key.toUpperCase();
                        if (!keyUpper.includes('SERVIDOR') &&
                            !keyUpper.includes('NOME') &&
                            !key.startsWith('_') && // Filtrar campos técnicos como _colIndexMap
                            value && value !== '' && value !== 'undefined' && value !== 'null') {
                            registro[key] = value;
                        }
                    });
                    if (Object.keys(registro).length > 0) {
                        camposPorRegistro.push(registro);
                    }
                });

                // Identificar campos únicos vs múltiplos
                const camposUnicos = new Map(); // campos iguais em todos
                const camposMultiplos = new Map(); // campos diferentes
                
                if (camposPorRegistro.length > 0) {
                    const todasChaves = new Set();
                    camposPorRegistro.forEach(reg => {
                        Object.keys(reg).forEach(k => todasChaves.add(k));
                    });
                    
                    todasChaves.forEach(chave => {
                        const valores = camposPorRegistro.map(r => r[chave]).filter(v => v);
                        const valoresUnicos = new Set(valores.map(v => String(v)));
                        
                        if (valoresUnicos.size === 1) {
                            // Campo único (igual em todos os registros)
                            camposUnicos.set(chave, valores[0]);
                        } else if (valoresUnicos.size > 1) {
                            // Campo múltiplo (diferente entre registros)
                            camposMultiplos.set(chave, valores);
                        }
                    });
                }
                
                originalDataContent += '<div class="planilha-info">';
                
                // Renderizar campos únicos primeiro
                camposUnicos.forEach((value, key) => {
                    originalDataContent += `
                        <div class="info-item">
                            <span class="info-label">${this.escapeHtml(key)}</span>
                            <span class="info-value">${this.escapeHtml(String(value))}</span>
                        </div>
                    `;
                });
                
                // Renderizar campos múltiplos - um info-item por campo
                if (camposMultiplos.size > 0) {
                    const numRegistros = camposPorRegistro.length;
                    
                    // Identificar INICIO e MESES para renderizar no final
                    const campoInicio = Array.from(camposMultiplos.entries()).find(([key]) => {
                        const keyUpper = key.toUpperCase();
                        return keyUpper.includes('INICIO');
                    });
                    
                    const campoMeses = Array.from(camposMultiplos.entries()).find(([key]) => {
                        const keyUpper = key.toUpperCase();
                        return keyUpper.includes('MESES') || keyUpper.includes('QUANTIDADE');
                    });
                    
                    // Remover INICIO e MESES da lista temporariamente (renderizar depois)
                    if (campoInicio) camposMultiplos.delete(campoInicio[0]);
                    if (campoMeses) camposMultiplos.delete(campoMeses[0]);
                    
                    // Renderizar outros campos múltiplos PRIMEIRO
                    camposMultiplos.forEach((valores, key) => {
                        // Simplificar nome e adicionar ícone
                        let label = key;
                        let icone = '';
                        
                        const keyUpper = key.toUpperCase();
                        if (keyUpper.includes('FINAL') || keyUpper.includes('FIM')) {
                            label = 'Final';
                            icone = '🔴';
                        } else if (keyUpper.includes('CPF')) {
                            icone = '🆔';
                        } else if (keyUpper.includes('LOTAC')) {
                            icone = '🏢';
                        }
                        
                        // Agrupar valores iguais com seus índices
                        const valoresAgrupados = new Map();
                        valores.forEach((val, idx) => {
                            const valStr = String(val);
                            if (!valoresAgrupados.has(valStr)) {
                                valoresAgrupados.set(valStr, []);
                            }
                            valoresAgrupados.get(valStr).push(idx + 1);
                        });
                        
                        // Renderizar apenas valores únicos com seus índices inline
                        const valoresHTML = Array.from(valoresAgrupados.entries()).map(([val, indices]) => {
                            const indicesStr = indices.map(i => `[${i}]`).join('');
                            return `<strong>${indicesStr}</strong> ${this.escapeHtml(val)}`;
                        }).join(' <span class="sep">|</span> ');
                        
                        originalDataContent += `
                            <div class="info-item info-item-multi">
                                <span class="info-label">${icone} ${this.escapeHtml(label)}</span>
                                <span class="info-value info-value-inline">${valoresHTML}</span>
                            </div>
                        `;
                    });
                    
                    // Renderizar INICIO por último (badges visuais)
                    if (campoInicio && campoMeses) {
                        const [keyInicio, valoresInicio] = campoInicio;
                        const [keyMeses, valoresMeses] = campoMeses;
                        
                        let periodosHTML = '<div class="periodos-badges">';
                        valoresInicio.forEach((valorInicio, idx) => {
                            const valorMeses = valoresMeses[idx];
                            const mesesTexto = valorMeses == 1 ? '1 mês' : `${valorMeses} meses`;
                            const registroNum = idx + 1;
                            periodosHTML += `
                                <div class="periodo-badge">
                                    <span class="periodo-registro">Registro ${registroNum}</span>
                                    <span class="periodo-data">${this.escapeHtml(String(valorInicio))}</span>
                                    <span class="periodo-duracao">${mesesTexto}</span>
                                </div>
                            `;
                        });
                        periodosHTML += '</div>';
                        
                        originalDataContent += `
                            <div class="info-item info-item-periodos">
                                <span class="info-label">Períodos de Licença</span>
                                <div class="info-value">${periodosHTML}</div>
                            </div>
                        `;
                    }
                }
                
                originalDataContent += '</div>';

                // Mostrar períodos solicitados de forma compacta
                if (periodos.length > 0) {
                    originalDataContent += `
                        <div class="periodos-solicitados">
                            <div class="periodos-title">
                                <i class="bi bi-calendar2-range"></i> Períodos (${periodos.length})
                            </div>
                            <div class="periodos-list">
                    `;
                    periodos.forEach((periodo) => {
                        originalDataContent += `
                            <div class="periodo-tag">
                                ${this.escapeHtml(periodo)}
                            </div>
                        `;
                    });
                    originalDataContent += '</div></div>';
                }
            } else {
                originalDataContent += `
                    <div class="no-data">
                        <span>Dados processados automaticamente</span>
                    </div>
                `;
            }
        } else {
            originalDataContent += `
                <div class="no-data">
                    <span>Nenhum registro encontrado</span>
                </div>
            `;
        }
        originalDataContent += '</div>';

        // Interpretação do Sistema
        let interpretationContent = '';
        const issues = [];
        
        // Adicionar aviso se cronograma não foi interpretado
        if (servidor.avisoInterpretacao) {
            interpretationContent += `
                <div class="alert alert-warning" style="margin-bottom: 1rem; padding: 0.75rem; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;">
                    <i class="bi bi-exclamation-triangle" style="color: #856404;"></i>
                    <strong style="color: #856404;">Aviso:</strong> ${servidor.avisoInterpretacao}
                </div>
            `;
        }

        // Unificado: usar sempre a versão visual detalhada para ambos os tipos de planilha
        interpretationContent = '<div class="info-grid">';

        // Determinar qual array de licenças usar baseado no tipo
        const licencasParaExibir = (isLicencaPremio && periodosAgrupados && periodosAgrupados.length > 0)
            ? periodosAgrupados.map(p => ({ inicio: p.inicio, fim: p.fim }))
            : servidor.licencas;

        // Mostrar períodos interpretados de forma detalhada
        if (licencasParaExibir && licencasParaExibir.length > 0) {
                // Criar cards visuais para cada período
                interpretationContent += '<div class="periods-container" style="display: grid; grid-template-columns: 1fr; gap: 1rem;">';

                licencasParaExibir.forEach((licenca, index) => {
                    const inicio = this.formatDateBR(licenca.inicio);
                    const fim = this.formatDateBR(licenca.fim);
                    const dias = Math.ceil((licenca.fim - licenca.inicio) / (1000 * 60 * 60 * 24)) + 1;
                    const meses = Math.floor(dias / 30);
                    
                    // Calcular os marcos de 30 em 30 dias
                    const marcos = [];
                    let dataAtual = new Date(licenca.inicio);
                    let diasRestantes = dias;
                    let marcoNum = 1;
                    
                    while (diasRestantes > 0) {
                        const diasNoMarco = Math.min(30, diasRestantes);
                        const dataFimMarco = new Date(dataAtual);
                        dataFimMarco.setDate(dataFimMarco.getDate() + diasNoMarco - 1);
                        
                        marcos.push({
                            num: marcoNum,
                            inicio: this.formatDateBR(dataAtual),
                            fim: this.formatDateBR(dataFimMarco),
                            dias: diasNoMarco
                        });
                        
                        dataAtual = new Date(dataFimMarco);
                        dataAtual.setDate(dataAtual.getDate() + 1);
                        diasRestantes -= diasNoMarco;
                        marcoNum++;
                    }
                    
                    interpretationContent += `
                        <div class="period-card" style="
                            background: var(--bg-primary);
                            border: 1px solid var(--border);
                            padding: 1rem;
                            border-radius: 8px;
                            transition: all 0.2s ease;
                        ">
                            <!-- Header único com info resumida -->
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 1rem;
                                padding-bottom: 0.75rem;
                                border-bottom: 1px solid var(--border);
                            ">
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 1rem;">
                                    <i class="bi bi-calendar-check" style="color: var(--primary);"></i> Período ${index + 1}
                                </div>
                                <span style="
                                    background-color: rgba(37, 99, 235, 0.1);
                                    color: white;
                                    border: 1px solid rgba(37, 99, 235, 0.2);
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 12px;
                                    font-size: 0.8rem;
                                    font-weight: 600;
                                ">
                                    ${meses} ${meses === 1 ? 'mês' : 'meses'} (${dias} dias)
                                </span>
                            </div>

                            <!-- Timeline detalhada de 30 em 30 dias -->
                            <div style="
                                display: flex;
                                flex-wrap: wrap;
                                gap: 0.75rem;
                                padding: 0.5rem 0;
                            ">
                                ${marcos.map((marco, idx) => {
                                    const isFirst = idx === 0;
                                    const isLast = idx === marcos.length - 1;
                                    const progress = ((idx + 1) / marcos.length) * 100;
                                    
                                    // Calcular dias acumulados até este bloco
                                    let diasAcumulados = 0;
                                    for (let i = 0; i <= idx; i++) {
                                        diasAcumulados += marcos[i].dias;
                                    }
                                    
                                    // Definir cores e estilos baseados na posição
                                    let accentColor, accentGlow, gradientFrom, gradientTo, icon, label;
                                    
                                    if (isFirst) {
                                        accentColor = '#3b82f6';
                                        accentGlow = 'rgba(59, 130, 246, 0.3)';
                                        gradientFrom = 'rgba(59, 130, 246, 0.15)';
                                        gradientTo = 'rgba(99, 102, 241, 0.05)';
                                        icon = '🚀';
                                        label = 'INÍCIO';
                                    } else if (isLast) {
                                        accentColor = '#10b981';
                                        accentGlow = 'rgba(16, 185, 129, 0.3)';
                                        gradientFrom = 'rgba(16, 185, 129, 0.15)';
                                        gradientTo = 'rgba(5, 150, 105, 0.05)';
                                        icon = '🏁';
                                        label = 'FIM';
                                    } else {
                                        accentColor = '#8b5cf6';
                                        accentGlow = 'rgba(139, 92, 246, 0.25)';
                                        gradientFrom = 'rgba(139, 92, 246, 0.12)';
                                        gradientTo = 'rgba(124, 58, 237, 0.05)';
                                        icon = '⚡';
                                        label = `BLOCO ${idx + 1}`;
                                    }
                                    
                                    return `
                                        <div style="
                                            flex: 1 1 155px;
                                            min-width: 155px;
                                            max-width: 200px;
                                            background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 50%, rgba(15, 23, 42, 0.3) 100%);
                                            backdrop-filter: blur(10px);
                                            border: 1.5px solid rgba(51, 65, 85, 0.5);
                                            border-radius: 10px;
                                            padding: 0.675rem;
                                            position: relative;
                                            overflow: hidden;
                                            transition: all 0.3s ease;
                                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                                        " onmouseover="this.style.borderColor='${accentColor}'; this.style.transform='translateY(-4px) scale(1.02)'; this.style.boxShadow='0 8px 20px ${accentGlow}'" onmouseout="this.style.borderColor='rgba(51, 65, 85, 0.5)'; this.style.transform=''; this.style.boxShadow='0 2px 8px rgba(0, 0, 0, 0.2)'">
                                            
                                            <!-- Brilho decorativo superior -->
                                            <div style="
                                                position: absolute;
                                                top: 0;
                                                left: 0;
                                                right: 0;
                                                height: 3px;
                                                background: linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%);
                                                opacity: 0.8;
                                            "></div>
                                            
                                            <!-- Header com ícone e badge -->
                                            <div style="
                                                display: flex;
                                                align-items: center;
                                                justify-content: space-between;
                                                margin-bottom: 0.75rem;
                                            ">
                                                <div style="
                                                    display: flex;
                                                    align-items: center;
                                                ">
                                                    <span style="
                                                        font-size: 1.5rem;
                                                        filter: drop-shadow(0 0 8px ${accentGlow});
                                                    ">${icon}</span>
                                                    <div style="
                                                        font-size: 0.7rem;
                                                        color: ${accentColor};
                                                        font-weight: 800;
                                                        text-transform: uppercase;
                                                        letter-spacing: 0.8px;
                                                        text-shadow: 0 0 10px ${accentGlow};
                                                    ">${label}</div>
                                                </div>
                                                <div style="
                                                    background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%);
                                                    color: white;
                                                    padding: 0.3rem 0.65rem;
                                                    border-radius: 6px;
                                                    font-size: 0.85rem;
                                                    font-weight: 900;
                                                    box-shadow: 0 2px 8px ${accentGlow}, 0 0 20px ${accentGlow};
                                                    border: 1px solid ${accentColor}aa;
                                                ">${diasAcumulados}<span style="font-size: 0.7rem; opacity: 0.9;">d</span></div>
                                            </div>
                                            
                                            <!-- Box de datas com design destacado -->
                                            <div style="
                                                background: linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%);
                                                border-radius: 8px;
                                                padding: 0.75rem 0.5rem;
                                                margin-bottom: 0.625rem;
                                                border: 1px solid ${accentColor}40;
                                                position: relative;
                                                overflow: hidden;
                                            ">
                                                <!-- Brilho de fundo -->
                                                <div style="
                                                    position: absolute;
                                                    top: 50%;
                                                    left: 50%;
                                                    transform: translate(-50%, -50%);
                                                    width: 60px;
                                                    height: 60px;
                                                    background: radial-gradient(circle, ${accentGlow} 0%, transparent 70%);
                                                    pointer-events: none;
                                                "></div>
                                                
                                                <div style="
                                                    display: flex;
                                                    flex-direction: column;
                                                    align-items: center;
                                                    gap: 0.5rem;
                                                    font-family: 'Courier New', monospace;
                                                    position: relative;
                                                    z-index: 1;
                                                ">
                                                    <div style="
                                                        white-space: nowrap;
                                                        overflow: hidden;
                                                        text-overflow: ellipsis;
                                                        max-width: 100%;
                                                        font-size: 0.8rem;
                                                        color: #f1f5f9;
                                                        font-weight: 800;
                                                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
                                                    ">${marco.inicio}</div>
                                                    
                                                    <div style="
                                                        color: ${accentColor};
                                                        font-size: 1.25rem;
                                                        font-weight: 900;
                                                        text-shadow: 0 0 12px ${accentGlow}, 0 0 24px ${accentGlow};
                                                        line-height: 1;
                                                    ">↓</div>
                                                    
                                                    <div style="
                                                        white-space: nowrap;
                                                        overflow: hidden;
                                                        text-overflow: ellipsis;
                                                        max-width: 100%;
                                                        font-size: 0.8rem;
                                                        color: #f1f5f9;
                                                        font-weight: 800;
                                                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
                                                    ">${marco.fim}</div>
                                                </div>
                                            </div>
                                            
                                            <!-- Barra de progresso com efeito neon -->
                                            <div style="
                                                height: 4px;
                                                background: rgba(30, 41, 59, 0.6);
                                                border-radius: 3px;
                                                overflow: hidden;
                                                position: relative;
                                                box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
                                            ">
                                                <div style="
                                                    width: ${progress}%;
                                                    height: 100%;
                                                    background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #10b981 100%);
                                                    box-shadow: 0 0 10px ${accentGlow}, 0 0 20px ${accentGlow};
                                                    border-radius: 3px;
                                                    transition: width 0.6s ease;
                                                    position: relative;
                                                ">
                                                    <!-- Brilho animado -->
                                                    <div style="
                                                        position: absolute;
                                                        top: 0;
                                                        left: 0;
                                                        right: 0;
                                                        height: 100%;
                                                        background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
                                                    "></div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                });
                
                interpretationContent += '</div>';
        } else {
            // Nenhuma licença encontrada
            interpretationContent += `
                <div class="info-label">Status:</div>
                <div class="info-value warning" style="color: #d97706;">
                    <i class="bi bi-exclamation-triangle"></i>
                    ${isLicencaPremio ? 'Nenhuma licença processada pelo sistema' : 'Nenhuma licença identificada no cronograma'}
                </div>
            `;

            if (isLicencaPremio) {
                issues.push({
                    title: 'Nenhuma licença identificada',
                    description: 'O sistema não conseguiu interpretar ou encontrar informações de licenças nos dados fornecidos.'
                });
            }
        }

        // Informações adicionais (tempo de contribuição, serviço, próxima licença)
        if (servidor.tempoContribuicao) {
            interpretationContent += `
                <div class="info-label">Tempo de Contribuição:</div>
                <div class="info-value">${this.escapeHtml(servidor.tempoContribuicao)}</div>
            `;
        }

        if (servidor.tempoServico) {
            interpretationContent += `
                <div class="info-label">Tempo de Serviço:</div>
                <div class="info-value">${this.escapeHtml(servidor.tempoServico)}</div>
            `;
        }

        if (servidor.proximaLicenca) {
            interpretationContent += `
                <div class="info-label">Próxima Licença:</div>
                <div class="info-value highlight">${this.escapeHtml(servidor.proximaLicenca)}</div>
            `;
        }

        interpretationContent += '</div>';

        // Preencher conteúdos do modal
        const originalDataElement = document.getElementById('originalDataContent');
        const interpretationElement = document.getElementById('interpretationContent');

        if (!originalDataElement || !interpretationElement) {
            console.error('Elementos do modal não encontrados:', {
                originalDataContent: !!originalDataElement,
                interpretationContent: !!interpretationElement
            });
            return;
        }

        originalDataElement.innerHTML = originalDataContent;
        interpretationElement.innerHTML = interpretationContent;

        // Atualizar badge do header de interpretação com quantidade de períodos
        const interpretationBadge = document.querySelector('#interpretationSection .section-badge');
        if (interpretationBadge && servidor.licencas) {
            interpretationBadge.textContent = `${servidor.licencas.length} ${servidor.licencas.length === 1 ? 'período' : 'períodos'}`;
        }

        // Secção de problemas identificados
        const issuesSection = document.getElementById('issuesSection');
        const issuesContent = document.getElementById('issuesContent');

        if (issuesSection && issuesContent) {
            if (issues.length > 0) {
                const issuesHtml = issues.map(issue => `
                <div class="issue-highlight">
                    <div class="issue-title">${this.escapeHtml(issue.title)}</div>
                    <div class="issue-description">${this.escapeHtml(issue.description)}</div>
                </div>
            `).join('');
                issuesContent.innerHTML = issuesHtml;
            } else {
                issuesContent.innerHTML = '';
            }
        }

    // Atualizar título do modal - nome do servidor + badge de urgência
        const modalTitle = document.getElementById('modalTitle');
        if (!modalTitle) {
            console.error('Elemento de título do modal não encontrado');
            return;
        }
        
        // Criar HTML do título com badge de urgência se existir
        let titleHTML = `<span>${servidor.nome}</span>`;
        if (servidor.nivelUrgencia) {
            const urgencyClass = this.getUrgencyClass(servidor.nivelUrgencia);
            const urgencyClassFull = `urgency-badge ${urgencyClass}`;
            titleHTML += ` <span class="${urgencyClassFull}" style="margin-left: 0.5rem; font-size: 0.7rem;">${this.escapeHtml(servidor.nivelUrgencia)}</span>`;
        }
        modalTitle.innerHTML = titleHTML;

    // Exibir modal
        const detailsModal = document.getElementById('modal') || document.getElementById('detailsModal');
        if (!detailsModal) {
            console.error('Modal de detalhes não encontrado');
            return;
        }
        this._openModalElement(detailsModal);
    }

    getUrgencyClass(urgencia) {
        if (!urgencia) return 'low';
        const urgenciaLower = urgencia.toLowerCase();
        if (urgenciaLower.includes('crítico') || urgenciaLower.includes('critico')) return 'critical';
        if (urgenciaLower.includes('alto') || urgenciaLower.includes('alta')) return 'high';
        if (urgenciaLower.includes('moderado') || urgenciaLower.includes('moderada')) return 'moderate';
        return 'low';
    }

    extrairMesesDoPeríodo(licenca) {
        if (!licenca || !licenca.inicio || !licenca.fim) return [];

        const meses = [];
        const inicio = new Date(licenca.inicio);
        const fim = new Date(licenca.fim);

        const current = new Date(inicio);

        while (current <= fim) {
            const mesNome = current.toLocaleDateString('pt-BR', { month: 'long' });
            const mesCapitalizado = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);
            meses.push(mesCapitalizado);

            // Avançar para o próximo mês
            current.setMonth(current.getMonth() + 1);
        }

        return meses;
    }

    // Agrupar licenças por períodos contíguos
    agruparLicencasPorPeriodos(licencas) {
        if (!licencas || licencas.length === 0) return [];

    // Agrupamento de licenças por períodos contíguos
    // Lista de licenças a processar

        // Ordenar por data de início
        const licencasOrdenadas = [...licencas].sort((a, b) => a.inicio - b.inicio);

        const periodos = [];
        let periodoAtual = null;

        for (let i = 0; i < licencasOrdenadas.length; i++) {
            const licenca = licencasOrdenadas[i];

            // Processar licença atual: verificar datas e possível mesclagem com período atual

            if (!periodoAtual) {
                // Primeiro período
                periodoAtual = {
                    inicio: licenca.inicio,
                    fim: licenca.fim,
                    licencas: [licenca],
                    tipo: licenca.tipo
                };
                periodos.push(periodoAtual);
                // Criando o primeiro período agrupado
            } else {
                // Verificar se é contíguo E do mesmo período original
                const ultimaLicenca = periodoAtual.licencas[periodoAtual.licencas.length - 1];

                // Mesclar se as datas se sobrepõem ou são contíguas
                const ultimaFim = new Date(ultimaLicenca.fim);
                const licencaInicio = new Date(licenca.inicio);

                // Verificar se as datas se sobrepõem ou são contíguas
                const licencaInicioMonthStart = new Date(licencaInicio.getFullYear(), licencaInicio.getMonth(), 1);
                const ultimaFimMonthStart = new Date(ultimaFim.getFullYear(), ultimaFim.getMonth(), 1);
                const proximoMesStart = new Date(ultimaFimMonthStart);
                proximoMesStart.setMonth(proximoMesStart.getMonth() + 1);

                const overlaps = licencaInicio <= ultimaFim;
                const isContiguous = licencaInicioMonthStart.getTime() === proximoMesStart.getTime();

                if (overlaps || isContiguous) {
                    // Mesclar no período atual
                    periodoAtual.fim = new Date(Math.max(periodoAtual.fim.getTime(), licenca.fim.getTime()));
                    periodoAtual.licencas.push(licenca);
                } else {
                    // Novo período
                    periodoAtual = {
                        inicio: licenca.inicio,
                        fim: licenca.fim,
                        licencas: [licenca],
                        tipo: licenca.tipo
                    };
                    periodos.push(periodoAtual);
                }
            }
        }

        // Calcular duração para cada período agrupado (sem logs de debug)
        periodos.forEach((p, i) => {
            const duracao = this.calcularDuracaoMeses(p.inicio, p.fim);
        });

        return periodos;
    }

    // Calcular duração em formato legível
    calcularDuracaoMeses(inicio, fim) {
        // Calcular diferença em meses de forma mais precisa
        const anoInicio = inicio.getFullYear();
        const mesInicio = inicio.getMonth();
        const anoFim = fim.getFullYear();
        const mesFim = fim.getMonth();

        let meses = (anoFim - anoInicio) * 12 + (mesFim - mesInicio) + 1; // +1 para incluir o mês atual

    // Calculando duração em meses/anos do período

        if (meses === 1) {
            return '1 mês';
        } else if (meses < 12) {
            return `${meses} meses`;
        } else {
            const anos = Math.floor(meses / 12);
            const mesesRestantes = meses % 12;
            return anos === 1 ?
                (mesesRestantes > 0 ? `1 ano e ${mesesRestantes} meses` : '1 ano') :
                (mesesRestantes > 0 ? `${anos} anos e ${mesesRestantes} meses` : `${anos} anos`);
        }
    }

    // Formatar data em português brasileiro
    formatDateBR(data) {
        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
            'jul', 'ago', 'set', 'out', 'nov', 'dez'];

        return `${data.getDate()}/${meses[data.getMonth()]}/${data.getFullYear()}`;
    }

    // Gerar breakdown dos meses do período
    gerarMesesPeriodo(licencas) {
        const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        const meses = licencas.map(licenca => {
            const mes = mesesAbrev[licenca.inicio.getMonth()];
            const ano = licenca.inicio.getFullYear();
            return `<span class="month-tag">${mes}/${ano}</span>`;
        });

        return meses.join(' ');
    }

    formatDateRange(inicio, fim) {
        if (!inicio) return 'Data não disponível';

        const inicioStr = inicio.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        if (!fim) return inicioStr;

        const fimStr = fim.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return `${inicioStr} até ${fimStr}`;
    }

    // Organizar licenças por período para melhor visualização
    // Atualizar estatísticas do dashboard
    updateStats() {
        // Verificar se há dados carregados
        if (!this.allServidores || this.allServidores.length === 0) {
            const totalServidoresElement = document.getElementById('totalServidores');
            if (totalServidoresElement) {
                totalServidoresElement.textContent = '0';
            }

            // Mostrar estado vazio
            const totalLicencasFuturasElement = document.getElementById('totalLicencasFuturas');
            if (totalLicencasFuturasElement) {
                totalLicencasFuturasElement.textContent = '0';
            }

            // Limpar cards de estatísticas
            const criticalCard = document.getElementById('criticalCount');
            const highCard = document.getElementById('highCount');
            const moderateCard = document.getElementById('moderateCount');
            const errorCard = document.getElementById('errorCount');

            if (criticalCard) criticalCard.textContent = '0';
            if (highCard) highCard.textContent = '0';
            if (moderateCard) moderateCard.textContent = '0';
            if (errorCard) errorCard.textContent = '0';

            return;
        }

        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        // Atualizar estatísticas do cabeçalho
        const totalServidoresElement = document.getElementById('totalServidores');
        if (totalServidoresElement) {
            totalServidoresElement.textContent = this.allServidores.length;
        }

    // Calcular licenças futuras (licenças com início a partir de hoje)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Remover hora para comparação apenas de datas

        const licencasFuturas = this.allServidores.reduce((total, servidor) => {
            const licencasFuturasServidor = servidor.licencas.filter(licenca => {
                const licenseStart = licenca.inicio;
                // Verificar se a licença começa hoje ou no futuro
                return licenseStart >= hoje;
            }).length;

            return total + licencasFuturasServidor;
        }, 0);

    // Atualizar elementos do cabeçalho com rótulos apropriados
        const totalLicencasFuturasElement = document.getElementById('totalLicencasFuturas');
        if (totalLicencasFuturasElement) {
            totalLicencasFuturasElement.textContent = licencasFuturas;
        }

    // Atualizar rótulo com base no tipo de tabela
        const statLabel = totalLicencasFuturasElement?.parentElement?.querySelector?.('.stat-label');
        if (statLabel) {
            statLabel.textContent = isLicencaPremio ? 'Licenças Prêmio' : 'Licenças Futuras';
        }

    // SEMPRE atualizar cards com níveis de urgência (independente do tipo de tabela)
    this.updateUrgencyCards();
    }

    updateUrgencyCards() {
        // Calcular distribuição de urgência baseado em critérios:
        // - CRÍTICO: licenças terminam ≤ 2 anos antes da aposentadoria
        // - ALTO: licenças terminam entre 2-5 anos antes
        // - MODERADO: licenças terminam > 5 anos antes
        // - BAIXO: sem urgência (aposentadoria distante ou sem licenças)
        
        const urgencyCounts = {
            'Crítico': 0,
            'Alto': 0,
            'Moderado': 0,
            'Baixo': 0
        };
        
        this.filteredServidores.forEach(servidor => {
            // Se servidor já tem nível de urgência calculado, usar
            if (servidor.nivelUrgencia) {
                const nivel = servidor.nivelUrgencia.toLowerCase();
                if (nivel.includes('crítico') || nivel.includes('critico')) urgencyCounts['Crítico']++;
                else if (nivel.includes('alto')) urgencyCounts['Alto']++;
                else if (nivel.includes('moderado')) urgencyCounts['Moderado']++;
                else urgencyCounts['Baixo']++;
            } else {
                // Calcular baseado nas licenças e idade
                const ultimaLicenca = servidor.licencas && servidor.licencas.length > 0 
                    ? servidor.licencas[servidor.licencas.length - 1].fim 
                    : null;
                    
                if (!ultimaLicenca) {
                    urgencyCounts['Baixo']++;
                } else {
                    // Estimar aposentadoria (simplificado: 65 anos para homens, 62 para mulheres)
                    const idadeAposentadoria = (servidor.sexo === 'M' || servidor.sexo === 'MASC') ? 65 : 62;
                    const anoNascimento = new Date().getFullYear() - Math.floor(servidor.idade || 0);
                    const anoAposentadoria = anoNascimento + idadeAposentadoria;
                    const dataAposentadoria = new Date(anoAposentadoria, 0, 1);
                    
                    const anosEntreLicencaEAposentadoria = (dataAposentadoria - ultimaLicenca) / (365 * 24 * 60 * 60 * 1000);
                    
                    if (anosEntreLicencaEAposentadoria <= 2) urgencyCounts['Crítico']++;
                    else if (anosEntreLicencaEAposentadoria <= 5) urgencyCounts['Alto']++;
                    else if (anosEntreLicencaEAposentadoria > 5) urgencyCounts['Moderado']++;
                    else urgencyCounts['Baixo']++;
                }
            }
        });

        // Atualizar contagens nos cards
        const criticalCountEl = document.getElementById('criticalCount');
        if (criticalCountEl) {
            criticalCountEl.textContent = urgencyCounts['Crítico'];
        }

        const highCountEl = document.getElementById('highCount');
        if (highCountEl) {
            highCountEl.textContent = urgencyCounts['Alto'];
        }

        const moderateCountEl = document.getElementById('moderateCount');
        if (moderateCountEl) {
            moderateCountEl.textContent = urgencyCounts['Moderado'];
        }
        // Baixo não tem card próprio, mas podemos calcular se necessário
    }

    updateCargoCards() {
        const cargoData = this.getStaticCargoData();
        const statsCards = document.querySelector('.stats-cards');
        if (!statsCards) return;
        // Encontrar os cards existentes que NÃO são o card de problemas e atualizá-los
        // Isso evita sobrescrever o quarto card (que deve permanecer como "Problemas")
        const existingCards = statsCards.querySelectorAll('.stat-card:not(.error)');
        const topCargos = cargoData.labels.slice(0, existingCards.length);
        const cargoIcons = ['bi-briefcase', 'bi-person-badge', 'bi-building', 'bi-gear'];

        topCargos.forEach((cargo, index) => {
            const count = cargoData.counts[cargo] || 0;
            const card = existingCards[index];

            if (card) {
                const countElement = card.querySelector('h3');
                const labelElement = card.querySelector('p');
                const iconElement = card.querySelector('i');

                if (countElement) countElement.textContent = count;
                if (labelElement) labelElement.textContent = cargo;
                if (iconElement) {
                    iconElement.className = `bi ${cargoIcons[index] || 'bi-briefcase'}`;
                }

                // Replicar o card para remover listeners antigos
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);

                // Adicionar listener para filtrar por cargo ao clicar no card
                newCard.addEventListener('click', () => {
                    this.filterTableByCargo(cargo, index);
                });
            }
        });

        // garantir que o card de problemas permaneça intacto/atualizado
        this.updateProblemsCount();
    }

    formatDate(date) {
        if (!date) return '--';
        try {
            if (typeof date === 'string') date = new Date(date);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return '--';
        }
    }

    updateLastUpdate() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (!lastUpdateElement) return; // Elemento removido do header redesenhado

        const now = new Date();
        lastUpdateElement.textContent = now.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showModal(title, content, modalClass = '') {
    // Abrir modal de detalhes

        // Para compatibilidade com modais simples (não categorizados)
        if (typeof content === 'string') {
            const modalTitle = document.querySelector('#detailsModal .modal-header h3');
            const modalBody = document.getElementById('modalBody');
            const modal = document.getElementById('detailsModal');

            if (modalTitle) modalTitle.textContent = title;
            if (modalBody) {
                // Se o conteúdo não tem a estrutura de seções, usar o layout simples
                if (!content.includes('modal-sections')) {
                    modalBody.innerHTML = content;
                } else {
                    // Manter funcionalidade para modais estruturados
                    modalBody.innerHTML = content;
                }
            }

            if (modal) {
                this._openModalElement(modal);
            }
        }
    }

    closeModal() {
    // Fechar modal de detalhes
        const modal = document.getElementById('modal') || document.getElementById('detailsModal');
        if (modal) this._closeModalElement(modal);
    }

    showProblemsModal() {
        // Usar ErrorReporter se disponível, senão usar modal básico
        if (this.errorReporter && this.loadingProblems.length > 0) {
            this.errorReporter.showProblemsModal(this.loadingProblems, this.allServidores);
        } else {
            // Fallback para modal básico se ErrorReporter não estiver disponível
            const modal = document.getElementById('problemsModal');
            const content = document.getElementById('problemsContent');

            if (this.loadingProblems.length === 0) {
                content.innerHTML = `
                    <div class="no-problems">
                        <i class="bi bi-check-circle" style="font-size: 2rem; color: var(--success); margin-bottom: 0.5rem;"></i>
                        <p>Nenhum problema encontrado durante o carregamento dos dados.</p>
                    </div>
                `;
            } else {
                content.innerHTML = this.loadingProblems.map(problem => `
                    <div class="problem-item">
                        <i class="bi bi-exclamation-triangle problem-icon"></i>
                        <div class="problem-details">
                            <h4 class="problem-name">${this.escapeHtml(problem.name || 'Servidor desconhecido')}</h4>
                            <p class="problem-error">${this.escapeHtml(problem.error || 'Erro desconhecido')}</p>
                            ${problem.details ? `<pre class="problem-details-pre">${this.escapeHtml(problem.details)}</pre>` : ''}
                        </div>
                    </div>
                `).join('');
            }

            if (modal) this._openModalElement(modal);
        }
    }

    closeProblemsModal() {
        // Usar ErrorReporter se disponível, senão usar modal básico
        if (this.errorReporter) {
            this.errorReporter.closeModal();
        } else {
            // Fallback para modal básico
            const modal = document.getElementById('problemsModal');
            if (modal) this._closeModalElement(modal);
        }
    }

    closeTimelineModal() {
    // Fechar modal da timeline
        const modal = document.getElementById('timelineModal');
        if (modal) this._closeModalElement(modal);
    }

    closePeriodStatsModal() {
    // Fechar modal de estatísticas do período
        const modal = document.getElementById('periodStatsModal');
        if (modal) this._closeModalElement(modal);
    }

    // Helpers para abrir/fechar modais com gerenciamento de foco e focus-trap
    _openModalElement(modal) {
        if (!modal) return;
        try {
            // salvar foco anterior
            this._previousFocus = document.activeElement;
        } catch (e) {
            this._previousFocus = null;
        }

        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('tabindex', '-1');

        // focar primeiro elemento focável ou o próprio modal
        const firstFocusable = modal.querySelector('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable && typeof firstFocusable.focus === 'function') {
            firstFocusable.focus();
        } else {
            try { modal.focus(); } catch (e) {}
        }

        // ativar focus trap
        this._enableFocusTrap(modal);
    }

    _closeModalElement(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        this._disableFocusTrap();
        // restaurar foco
        if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
            try { this._previousFocus.focus(); } catch (e) {}
        }
    }

    _enableFocusTrap(modal) {
        if (!modal) return;
        this._focusTrapHandler = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
                .filter(el => el.offsetParent !== null);
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', this._focusTrapHandler);
    }

    _disableFocusTrap() {
        if (this._focusTrapHandler) {
            document.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
    }

    addLoadingProblem(name, error, details) {
        try {
            const key = `${name}::${error}::${(details || '')}`;
            // Verificar duplicatas antes de adicionar
            const exists = this.loadingProblems.some(p => `${p.name}::${p.error}::${(p.details || '')}` === key);
            if (!exists) {
                this.loadingProblems.push({ name, error, details: details || '' });
                this.updateProblemsCount();
            }
        } catch (e) {
            // Registro simples em caso de falha
            this.loadingProblems.push({ name, error, details: details || '' });
            this.updateProblemsCount();
        }
    }

    clearLoadingProblems() {
        this.loadingProblems = [];
        this.updateProblemsCount();
    }

    updateProblemsCount() {
        const errorCountElement = document.getElementById('errorCount');
        if (errorCountElement) {
            errorCountElement.textContent = this.loadingProblems.length;
        }

    // Atualizar visibilidade/estado dos cards com base na contagem de problemas (usar alternância de classes para evitar estilos inline)
        const errorCard = document.getElementById('errorCard');
        if (errorCard) {
            if (this.loadingProblems.length > 0) {
                errorCard.classList.remove('no-problems');
                errorCard.classList.add('has-problems');
                errorCard.setAttribute('title', 'Clique para ver detalhes');
            } else {
                errorCard.classList.remove('has-problems');
                errorCard.classList.add('no-problems');
                errorCard.setAttribute('title', 'Nenhum problema');
            }
        }

        // Atualizar badge de qualidade dos dados
        this.updateDataQualityBadge();
    }

    /**
     * Atualiza o badge de qualidade dos dados no header
     */
    updateDataQualityBadge() {
        if (!this.validationManager) return;

        const badge = document.getElementById('dataQualityBadge');
        const scoreValue = document.getElementById('qualityScoreValue');
        const qualityIcon = document.getElementById('qualityIcon');

        if (!badge || !scoreValue || !qualityIcon) return;

        // Se não há servidores, esconder badge
        if (!this.allServidores || this.allServidores.length === 0) {
            badge.style.display = 'none';
            return;
        }

        // Calcular score de qualidade
        const qualityResult = this.validationManager.calculateDataQualityScore(
            this.allServidores,
            this.loadingProblems
        );

        const score = qualityResult.score;

        // Atualizar valor
        scoreValue.textContent = `${score}%`;

        // Determinar categoria de qualidade
        let category = 'poor';
        let iconClass = 'bi-shield-x';
        let tooltipText = '';

        if (score >= 90) {
            category = 'excellent';
            iconClass = 'bi-shield-check';
            tooltipText = `Excelente (${score}%) - Completude: ${qualityResult.breakdown.completeness}%, Validade: ${qualityResult.breakdown.validity}%, Consistência: ${qualityResult.breakdown.consistency}%`;
        } else if (score >= 75) {
            category = 'good';
            iconClass = 'bi-shield-fill-check';
            tooltipText = `Bom (${score}%) - Completude: ${qualityResult.breakdown.completeness}%, Validade: ${qualityResult.breakdown.validity}%, Consistência: ${qualityResult.breakdown.consistency}%`;
        } else if (score >= 60) {
            category = 'fair';
            iconClass = 'bi-shield-exclamation';
            tooltipText = `Regular (${score}%) - Completude: ${qualityResult.breakdown.completeness}%, Validade: ${qualityResult.breakdown.validity}%, Consistência: ${qualityResult.breakdown.consistency}%`;
        } else {
            category = 'poor';
            iconClass = 'bi-shield-x';
            tooltipText = `Ruim (${score}%) - Completude: ${qualityResult.breakdown.completeness}%, Validade: ${qualityResult.breakdown.validity}%, Consistência: ${qualityResult.breakdown.consistency}%`;
        }

        // Limpar classes antigas
        scoreValue.className = 'quality-score';
        qualityIcon.className = 'quality-icon';

        // Adicionar nova classe
        scoreValue.classList.add(category);
        qualityIcon.classList.add(category);

        // Atualizar ícone
        qualityIcon.innerHTML = `<i class="bi ${iconClass}"></i>`;

        // Adicionar tooltip
        badge.setAttribute('data-tooltip', tooltipText);

        // Mostrar badge
        badge.style.display = 'flex';
    }

    // Função utilitária para escapar HTML e prevenir XSS
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Diagnostica erro de importação e retorna mensagem explicativa
     */
    diagnosticarErroImportacao(error) {
        const errorMsg = error.message.toLowerCase();
        
        // Nenhum servidor encontrado
        if (errorMsg.includes('nenhum servidor foi encontrado')) {
            return 'Arquivo incompatível - Este não parece ser um arquivo de licenças. Verifique se o CSV tem as colunas: SERVIDOR, CRONOGRAMA (ou INICIO/FINAL para licença prêmio)';
        }
        
        // Arquivo vazio
        if (errorMsg.includes('vazio') || errorMsg.includes('empty') || errorMsg.includes('sem conteúdo')) {
            return 'Arquivo vazio - Verifique se o arquivo contém dados';
        }
        
        // Não parece CSV
        if (errorMsg.includes('não parece ser um csv')) {
            return 'Formato incorreto - O arquivo não parece ser um CSV. Certifique-se de exportar como CSV (separado por vírgulas)';
        }
        
        // Percentual baixo de válidos
        if (errorMsg.includes('% dos registros')) {
            return 'Arquivo suspeito - ' + error.message + '. Este provavelmente não é um arquivo de licenças';
        }
        
        // Colunas obrigatórias faltando
        if (errorMsg.includes('colunas obrigatórias') || errorMsg.includes('required')) {
            return 'Colunas obrigatórias ausentes - Verifique se o arquivo tem as colunas SERVIDOR e CRONOGRAMA (ou INICIO/FINAL para licença prêmio)';
        }
        
        // Arquivo sem dados suficientes
        if (errorMsg.includes('pelo menos uma linha')) {
            return 'Arquivo sem dados - O CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados';
        }
        
        // Nenhum servidor válido
        if (errorMsg.includes('nenhum servidor válido')) {
            return 'Dados inválidos - A coluna SERVIDOR não contém nomes válidos. Verifique se este é o arquivo correto';
        }
        
        // Formato inválido
        if (errorMsg.includes('formato') || errorMsg.includes('parse')) {
            return 'Formato de arquivo inválido - Verifique se é um CSV válido com vírgulas separando as colunas';
        }
        
        // Encoding
        if (errorMsg.includes('encoding') || errorMsg.includes('charset')) {
            return 'Problema de codificação - Salve o arquivo como CSV UTF-8';
        }
        
        // Erro genérico
        return error.message;
    }

    /**
     * Mostra notificação de importação com resumo de problemas
     */
    showImportNotification(type, message, fileName) {
        // Remover notificação anterior se existir
        const existingNotification = document.querySelector('.import-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Criar notificação
        const notification = document.createElement('div');
        notification.className = `import-notification ${type}`;
        
        const icon = type === 'error' ? 'bi-exclamation-circle' : 
                     type === 'warning' ? 'bi-exclamation-triangle' : 
                     type === 'success' ? 'bi-check-circle' : 'bi-info-circle';
        
        const title = type === 'error' ? 'Erro na Importação' :
                     type === 'warning' ? 'Aviso de Importação' :
                     type === 'success' ? 'Importação Concluída' : 'Informação';
        
        notification.innerHTML = `
            <div class="import-notification-header">
                <i class="bi ${icon}"></i>
                <h4>${title}</h4>
                <button class="import-notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="import-notification-body">
                <p><strong>Arquivo:</strong> ${this.escapeHtml(fileName)}</p>
                <p><strong>Problema:</strong> ${this.escapeHtml(message)}</p>
                ${this.loadingProblems.length > 0 ? `
                    <p class="notification-problems-link">
                        <i class="bi bi-list-ul"></i>
                        <a href="#" onclick="event.preventDefault(); document.getElementById('errorCard')?.click();">
                            Ver ${this.loadingProblems.length} problema${this.loadingProblems.length > 1 ? 's' : ''} detectado${this.loadingProblems.length > 1 ? 's' : ''}
                        </a>
                    </p>
                ` : ''}
            </div>
        `;

        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => notification.classList.add('show'), 10);

        // Remover automaticamente após 8 segundos (mais tempo para erro)
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, type === 'error' ? 8000 : 5000);
    }

    /**
     * Mostra notificação de sucesso com resumo
     */
    showImportSuccessNotification(fileName, servidoresCount, problemsCount) {
        const notification = document.createElement('div');
        notification.className = 'import-notification success';
        
        notification.innerHTML = `
            <div class="import-notification-header">
                <i class="bi bi-check-circle"></i>
                <h4>Importação Concluída</h4>
                <button class="import-notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="import-notification-body">
                <p><strong>Arquivo:</strong> ${this.escapeHtml(fileName)}</p>
                <p><strong>Servidores carregados:</strong> ${servidoresCount}</p>
                ${problemsCount > 0 ? `
                    <p class="notification-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        ${problemsCount} registro${problemsCount > 1 ? 's' : ''} com problema${problemsCount > 1 ? 's' : ''}
                        <a href="#" onclick="event.preventDefault(); document.getElementById('errorCard')?.click();">Ver detalhes</a>
                    </p>
                ` : `
                    <p class="notification-success-text">
                        <i class="bi bi-check2"></i>
                        Todos os registros foram importados com sucesso!
                    </p>
                `}
            </div>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 6000);
    }

    showLoading(message = 'Carregando...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = loadingOverlay?.querySelector('.loading-text');

        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }

        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    // Funções modernas do cabeçalho
    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value;
        this.currentFilters.search = searchTerm.toLowerCase();

        // Aplicar filtros baseado no tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyAllFilters();
        } else {
            this.applyAllFilters();
            this.updateActiveFilters();
        }

        // Atualizar calendário se estivermos na página de calendário
        if (document.getElementById('yearlyHeatmap')) {
            this.updateYearlyHeatmap();
        }

        this.toggleClearSearchButton();
    }

    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.currentFilters.search = '';

        // Aplicar filtros baseado no tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyAllFilters();
        } else {
            this.applyAllFilters();
            this.updateActiveFilters();
        }

        // Atualizar calendário se estivermos na página de calendário
        if (document.getElementById('yearlyHeatmap')) {
            this.updateYearlyHeatmap();
        }

        this.toggleClearSearchButton();
    }

    toggleClearSearchButton() {
        const clearBtn = document.getElementById('clearSearchBtn');
        const searchInput = document.getElementById('searchInput');
        if (clearBtn && searchInput) {
            if (searchInput.value.trim()) {
                clearBtn.style.display = 'flex';
            } else {
                clearBtn.style.display = 'none';
            }
        }
    }

    // Funções de filtro avançado
    updateCalendarYear() {
        const selectedYear = document.getElementById('calendarYearFilter')?.value;
        if (selectedYear) {
            // Atualizar a exibição do calendário
            this.updateYearlyHeatmap(parseInt(selectedYear));
        }
    }

    applyTimeRange() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;

        if (startDate && endDate) {
            // Aplicar filtro de período na timeline
            this.currentFilters.timeRange = { start: startDate, end: endDate };
            this.createTimelineChart();
        }
    }

    updateTimelineView() {
        const selectedView = document.getElementById('timelineView')?.value;
        if (selectedView) {
            this.currentFilters.timelineView = selectedView;
            this.createTimelineChart();
        }
    }

    applyDepartmentFilter() {
        const selectedDept = document.getElementById('departmentFilter')?.value;
        this.currentFilters.department = selectedDept;
        this.applyAllFilters();

        // Atualizar timeline se estivermos na página de timeline
        if (this.currentPage === 'timeline') {
            this.createTimelineChart();
        }
    }

    populateDepartmentFilter() {
        const deptFilter = document.getElementById('departmentFilter');
        if (!deptFilter || !this.allServidores.length) return;

        // Extrair departamentos únicos e ordená-los
        const departments = [...new Set(this.allServidores.map(s => s.lotacao))].filter(Boolean).sort();

    // Limpar opções existentes (exceto "Todos")
        while (deptFilter.children.length > 1) {
            deptFilter.removeChild(deptFilter.lastChild);
        }

        // Adicionar opções de departamento
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            deptFilter.appendChild(option);
        });
    }

    applyAgeFilter() {
        const minAge = parseInt(document.getElementById('minAge').value) || 0;
        const maxAge = parseInt(document.getElementById('maxAge').value) || 100;

        this.currentFilters.age = { min: minAge, max: maxAge };
        this.applyAllFilters();
        this.updateActiveFilters();
        this.highlightActivePreset(minAge, maxAge);
    }

    setAgePreset(min, max) {
        document.getElementById('minAge').value = min;
        document.getElementById('maxAge').value = max;
        this.currentFilters.age = { min, max };
        this.applyAllFilters();
        this.updateActiveFilters();
        this.highlightActivePreset(min, max);
    }

    highlightActivePreset(min, max) {
        // Remover active class de todos os presets
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.classList.remove('active');
        });

        // Adicionar active class ao preset correspondente
        const presets = [
            { min: 18, max: 35, selector: ':nth-child(1)' },
            { min: 36, max: 50, selector: ':nth-child(2)' },
            { min: 51, max: 70, selector: ':nth-child(3)' }
        ];

        const activePreset = presets.find(preset => preset.min === min && preset.max === max);
        if (activePreset) {
            const presetButton = document.querySelector(`.age-presets .btn-preset${activePreset.selector}`);
            if (presetButton) {
                presetButton.classList.add('active');
            }
        }
    }

    clearAllFilters() {
        // Limpar campos de busca
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        const headerSearchInput = document.getElementById('headerSearchInput');
        if (headerSearchInput) {
            headerSearchInput.value = '';
        }

        // Limpar filtros avançados usando AdvancedFiltersBuilder
        if (this.advancedFiltersBuilder) {
            this.advancedFiltersBuilder.clearAllFilters();
        }

        // Limpar destaques visuais
        document.querySelectorAll('.legend-item.selected, .legend-card.active, .stat-card.active').forEach(el => {
            el.classList.remove('selected', 'active');
        });

        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.classList.remove('active');
        });

        // Aplicar filtros limpos e atualizar UI
        this.applyFiltersAndSearch();

        // Atualizar badge
        this.updateFiltersBadge();

        // Feedback visual
        this.showToast('Todos os filtros foram removidos', 'success');
    }

    updateActiveFilters() {
        const activeFiltersContainer = document.getElementById('activeFilters');
        if (!activeFiltersContainer) return;

        activeFiltersContainer.innerHTML = '';

        const filters = [];

        // Filtro de Pesquisa
        if (this.currentFilters.search) {
            filters.push({
                type: 'search',
                label: `Busca: "${this.currentFilters.search}"`,
                remove: () => {
                    document.getElementById('searchInput').value = '';
                    this.currentFilters.search = '';
                    this.applyAllFilters();
                    this.updateActiveFilters();
                }
            });
        }

        // Filtro de Idade
        if (this.currentFilters.age.min !== 18 || this.currentFilters.age.max !== 70) {
            filters.push({
                type: 'age',
                label: `Idade: ${this.currentFilters.age.min}-${this.currentFilters.age.max}`,
                remove: () => {
                    this.setAgePreset(18, 70);
                }
            });
        }

        // Criar elementos para cada filtro
        filters.forEach(filter => {
            const filterElement = document.createElement('span');
            filterElement.className = 'active-filter';
            filterElement.innerHTML = `
                ${filter.label}
                <span class="remove">×</span>
            `;

            // Adicionar listener para remoção do filtro
            filterElement.querySelector('.remove').addEventListener('click', (e) => {
                e.stopPropagation();
                filter.remove();
            });

            activeFiltersContainer.appendChild(filterElement);
        });
    }

    updateHeaderStatus() {
        // Atualizar contagem total
        const totalElement = document.getElementById('totalServidores');
        if (totalElement) {
            totalElement.textContent = this.allServidores.length;
        }

        // Atualizar contagem filtrada
        const filteredElement = document.getElementById('filteredCount');
        if (filteredElement) {
            filteredElement.textContent = this.filteredServidores.length;
        }
    }

    // ==================== MÉTODOS DE NOTIFICAÇÕES ====================

    /**
     * Processa upload de arquivo de notificações
     */
    async handleNotificationsUpload(file) {
        try {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const csvData = e.target.result;
                    
                    // Processar notificações usando o parser
                    this.notificacoes = this.parser.processarNotificacoes(csvData);
                    this.filteredNotificacoes = [...this.notificacoes];
                    
                    // Atualizar interface
                    this.updateNotificationsStats();
                    this.renderNotificationsTable();
                    
                    // Mostrar mensagem de sucesso
                    this.showImportNotification('success', 
                        `${this.notificacoes.length} notificações carregadas com sucesso`, 
                        file.name
                    );
                    
                } catch (error) {
                    console.error('Erro ao processar notificações:', error);
                    this.showImportNotification('error', 
                        error.message || 'Erro ao processar arquivo de notificações', 
                        file.name
                    );
                }
            };
            
            reader.onerror = () => {
                this.showImportNotification('error', 
                    'Erro ao ler o arquivo', 
                    file.name
                );
            };
            
            reader.readAsText(file, 'UTF-8');
            
        } catch (error) {
            console.error('Erro no upload de notificações:', error);
            this.showImportNotification('error', 
                'Erro ao fazer upload do arquivo', 
                file.name
            );
        }
    }

    /**
     * Atualiza os cards de estatísticas de notificações
     */
    updateNotificationsStats() {
        const total = this.notificacoes.length;
        const respondidos = this.notificacoes.filter(n => n.status === 'respondeu').length;
        const pendentes = this.notificacoes.filter(n => n.status === 'pendente').length;
        const taxaResposta = total > 0 ? Math.round((respondidos / total) * 100) : 0;
        
        // Atualizar cards
        const totalEl = document.getElementById('totalNotificacoesCount');
        const respondidosEl = document.getElementById('respondidosCount');
        const pendentesEl = document.getElementById('pendentesCount');
        const taxaEl = document.getElementById('taxaRespostaCount');
        
        if (totalEl) totalEl.textContent = total;
        if (respondidosEl) respondidosEl.textContent = respondidos;
        if (pendentesEl) pendentesEl.textContent = pendentes;
        if (taxaEl) taxaEl.textContent = `${taxaResposta}%`;
    }

    /**
     * Filtra notificações baseado nos filtros ativos
     */
    filterNotifications() {
        const searchTerm = document.getElementById('notificationsSearchInput')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        this.filteredNotificacoes = this.notificacoes.filter(notif => {
            // Filtro de busca
            const matchesSearch = !searchTerm || 
                notif.interessado.toLowerCase().includes(searchTerm) ||
                notif.processo.toLowerCase().includes(searchTerm) ||
                notif.lotacao.toLowerCase().includes(searchTerm);
            
            // Filtro de status
            const matchesStatus = statusFilter === 'all' || notif.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        this.renderNotificationsTable();
    }

    /**
     * Renderiza a tabela de notificações
     */
    renderNotificationsTable() {
        const tbody = document.getElementById('notificationsTableBody');
        if (!tbody) return;
        
        if (this.filteredNotificacoes.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="8">
                        <div class="empty-state-content">
                            <i class="bi bi-inbox"></i>
                            <p>Nenhuma notificação encontrada</p>
                            <small>${this.notificacoes.length === 0 ? 
                                'Importe um arquivo CSV com as notificações' : 
                                'Tente ajustar os filtros'
                            }</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredNotificacoes.map(notif => {
            const statusBadge = this.getStatusBadge(notif.status);
            
            return `
                <tr>
                    <td>
                        <strong>${this.escapeHtml(notif.interessado)}</strong>
                    </td>
                    <td>${this.escapeHtml(notif.processo)}</td>
                    <td>${this.escapeHtml(notif.dataNotificacao1)}</td>
                    <td>${this.escapeHtml(notif.dataNotificacao2)}</td>
                    <td>${this.escapeHtml(notif.periodoGozo)}</td>
                    <td>${this.escapeHtml(notif.lotacao)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-icon" onclick="window.dashboard.showNotificationDetails('${this.escapeHtml(notif.interessado).replace(/'/g, "\\'")}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Retorna o badge HTML para o status
     */
    getStatusBadge(status) {
        const badges = {
            'respondeu': '<span class="status-badge status-success"><i class="bi bi-check-circle-fill"></i> Respondeu</span>',
            'pendente': '<span class="status-badge status-warning"><i class="bi bi-clock-fill"></i> Pendente</span>',
            'nao-concorda': '<span class="status-badge status-danger"><i class="bi bi-x-circle-fill"></i> Não Concorda</span>'
        };
        return badges[status] || '<span class="status-badge status-secondary">-</span>';
    }

    /**
     * Mostra detalhes de uma notificação
     */
    showNotificationDetails(interessado) {
        const notif = this.notificacoes.find(n => n.interessado === interessado);
        if (!notif) return;
        
        // Mostrar modal customizado com detalhes
        const detalhes = `
Processo: ${notif.processo}
1ª Notificação: ${notif.dataNotificacao1}
2ª Notificação: ${notif.dataNotificacao2}
Período Escolhido: ${notif.periodoGozo || 'Não informado'}
Lotação: ${notif.lotacao}
Status: ${notif.status}
${notif.obs ? `\nObservações: ${notif.obs}` : ''}
        `.trim();
        
        window.customModal?.alert({
            title: `Notificação - ${notif.interessado}`,
            message: detalhes,
            type: 'info'
        });
    }

    /**
     * Exporta notificações filtradas para CSV
     */
    exportNotifications() {
        if (this.filteredNotificacoes.length === 0) {
            window.customModal?.alert({
                title: 'Sem Dados',
                message: 'Nenhuma notificação para exportar',
                type: 'warning'
            });
            return;
        }
        
        // Criar CSV
        const headers = ['Interessado', 'Processo', '1ª Notificação', '2ª Notificação', 'Período do Gozo', 'Lotação', 'Status', 'OBS'];
        const rows = this.filteredNotificacoes.map(notif => [
            notif.interessado,
            notif.processo,
            notif.dataNotificacao1,
            notif.dataNotificacao2,
            notif.periodoGozo,
            notif.lotacao,
            notif.status,
            notif.obs
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `notificacoes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ==================== MÉTODOS DA PÁGINA DE RELATÓRIOS ====================

    /**
     * Atualizar estatísticas da página de relatórios
     */
    updateReportsStats() {
        const totalElement = document.getElementById('reportTotalServidores');
        const filteredElement = document.getElementById('reportFilteredServidores');

        if (totalElement) {
            totalElement.textContent = this.allServidores.length;
        }

        if (filteredElement) {
            filteredElement.textContent = this.filteredServidores.length;
        }
    }

    /**
     * Inicializar event listeners da página de relatórios
     */
    setupReportsPageListeners() {
        // Seleção de templates
        document.querySelectorAll('.report-template-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectReportTemplate(card.dataset.template);
            });
        });

        // Botão cancelar
        const cancelBtn = document.getElementById('cancelExportBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideExportConfig();
            });
        }

        // Botão gerar relatório
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateReport();
            });
        }

        // Mudança de formato
        document.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateReportPreview();
            });
        });

        // Mudança de opções
        ['includeCharts', 'includeStats', 'includeFilters', 'includeTimestamp'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updateReportPreview();
                });
            }
        });
    }

    /**
     * Selecionar template de relatório
     */
    selectReportTemplate(templateType) {
        // Remover seleção anterior
        document.querySelectorAll('.report-template-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Selecionar novo template
        const selectedCard = document.querySelector(`[data-template="${templateType}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // Armazenar template selecionado
        this.selectedReportTemplate = templateType;

        // Abrir modal de configuração
        this.openReportModal(templateType);
    }

    /**
     * Mostrar seção de configuração de exportação
     */
    showExportConfig(templateType) {
        const configSection = document.getElementById('exportConfigSection');
        if (configSection) {
            configSection.style.display = 'block';
            // Scroll suave até a seção
            configSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Esconder seção de configuração
     */
    hideExportConfig() {
        const configSection = document.getElementById('exportConfigSection');
        if (configSection) {
            configSection.style.display = 'none';
        }

        // Remover seleção de template
        document.querySelectorAll('.report-template-card').forEach(card => {
            card.classList.remove('selected');
        });

        this.currentReportTemplate = null;
    }

    /**
     * Atualizar pré-visualização do relatório
     */
    updateReportPreview() {
        const previewElement = document.getElementById('reportPreview');
        if (!previewElement || !this.currentReportTemplate) return;

        const includeCharts = document.getElementById('includeCharts')?.checked ?? true;
        const includeStats = document.getElementById('includeStats')?.checked ?? true;

        let previewHTML = '';

        switch (this.currentReportTemplate) {
            case 'executive':
                previewHTML = this.generateExecutivePreview(includeCharts, includeStats);
                break;
            case 'complete':
                previewHTML = this.generateCompletePreview(includeCharts, includeStats);
                break;
            case 'urgency':
                previewHTML = this.generateUrgencyPreview(includeCharts, includeStats);
                break;
            case 'department':
                previewHTML = this.generateDepartmentPreview(includeCharts, includeStats);
                break;
        }

        previewElement.innerHTML = previewHTML;
    }

    /**
     * Gerar pré-visualização do relatório executivo
     */
    generateExecutivePreview(includeCharts, includeStats) {
        const data = this.filteredServidores;
        
        let html = '<div class="preview-report">';
        html += '<h3 style="margin-top: 0;">📊 Relatório Executivo</h3>';

        if (includeStats) {
            const urgencias = {
                critical: data.filter(s => s.nivelUrgencia === 'critical').length,
                high: data.filter(s => s.nivelUrgencia === 'high').length,
                moderate: data.filter(s => s.nivelUrgencia === 'moderate').length,
                low: data.filter(s => s.nivelUrgencia === 'low').length
            };

            html += '<div style="margin: 1rem 0; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">';
            html += `<p style="margin: 0 0 0.5rem 0;"><strong>Total de Servidores:</strong> ${data.length}</p>`;
            html += `<p style="margin: 0 0 0.5rem 0;"><strong>Crítica:</strong> ${urgencias.critical} | <strong>Alta:</strong> ${urgencias.high} | <strong>Moderada:</strong> ${urgencias.moderate} | <strong>Baixa:</strong> ${urgencias.low}</p>`;
            html += '</div>';
        }

        if (includeCharts) {
            html += '<p style="color: var(--text-secondary); font-style: italic;">📈 Gráficos serão incluídos na exportação</p>';
        }

        html += '<p style="font-size: 0.875rem; color: var(--text-secondary);">Resumo executivo com as principais métricas e indicadores.</p>';
        html += '</div>';

        return html;
    }

    /**
     * Gerar pré-visualização do relatório completo
     */
    generateCompletePreview(includeCharts, includeStats) {
        const data = this.filteredServidores;
        
        let html = '<div class="preview-report">';
        html += '<h3 style="margin-top: 0;">📋 Relatório Completo</h3>';
        html += `<p style="margin: 0.5rem 0;"><strong>Servidores:</strong> ${data.length}</p>`;
        html += '<p style="font-size: 0.875rem; color: var(--text-secondary);">Inclui tabela completa com todos os servidores, cronogramas detalhados, estatísticas completas e todos os gráficos disponíveis.</p>';
        html += '</div>';

        return html;
    }

    /**
     * Gerar pré-visualização do relatório por urgência
     */
    generateUrgencyPreview(includeCharts, includeStats) {
        const data = this.filteredServidores;
        const urgencias = {
            critical: data.filter(s => s.nivelUrgencia === 'critical').length,
            high: data.filter(s => s.nivelUrgencia === 'high').length,
            moderate: data.filter(s => s.nivelUrgencia === 'moderate').length,
            low: data.filter(s => s.nivelUrgencia === 'low').length
        };

        let html = '<div class="preview-report">';
        html += '<h3 style="margin-top: 0;">⚠️ Relatório por Urgência</h3>';
        html += '<div style="margin: 1rem 0;">';
        html += `<p style="margin: 0.5rem 0;">🔴 <strong>Crítica:</strong> ${urgencias.critical} servidores</p>`;
        html += `<p style="margin: 0.5rem 0;">🟠 <strong>Alta:</strong> ${urgencias.high} servidores</p>`;
        html += `<p style="margin: 0.5rem 0;">🟡 <strong>Moderada:</strong> ${urgencias.moderate} servidores</p>`;
        html += `<p style="margin: 0.5rem 0;">🟢 <strong>Baixa:</strong> ${urgencias.low} servidores</p>`;
        html += '</div>';
        html += '<p style="font-size: 0.875rem; color: var(--text-secondary);">Dados agrupados por nível de urgência para priorização de ações.</p>';
        html += '</div>';

        return html;
    }

    /**
     * Gerar pré-visualização do relatório por departamento
     */
    generateDepartmentPreview(includeCharts, includeStats) {
        const data = this.filteredServidores;
        const lotacoes = {};
        
        data.forEach(s => {
            const lot = s.lotacao || 'Sem lotação';
            lotacoes[lot] = (lotacoes[lot] || 0) + 1;
        });

        const topLotacoes = Object.entries(lotacoes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        let html = '<div class="preview-report">';
        html += '<h3 style="margin-top: 0;">🏢 Relatório por Departamento</h3>';
        html += '<p style="margin-bottom: 1rem;"><strong>Top 5 Lotações:</strong></p>';
        html += '<div style="margin: 1rem 0;">';
        topLotacoes.forEach(([lot, count]) => {
            html += `<p style="margin: 0.5rem 0;">• <strong>${lot}:</strong> ${count} servidores</p>`;
        });
        html += '</div>';
        html += '<p style="font-size: 0.875rem; color: var(--text-secondary);">Análise organizada por lotação/departamento com impacto operacional.</p>';
        html += '</div>';

        return html;
    }

    /**
     * Gerar relatório final
     */
    generateReport() {
        if (!this.exportManager) {
            window.customModal?.alert({
                title: 'Indisponível',
                message: 'Sistema de exportação não disponível',
                type: 'warning'
            });
            return;
        }

        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'excel';
        const template = this.currentReportTemplate;

        if (!template) {
            window.customModal?.alert({
                title: 'Template Necessário',
                message: 'Selecione um template de relatório',
                type: 'warning'
            });
            return;
        }

        const options = {
            includeCharts: document.getElementById('includeCharts')?.checked ?? true,
            includeStats: document.getElementById('includeStats')?.checked ?? true,
            includeFilters: document.getElementById('includeFilters')?.checked ?? true,
            includeTimestamp: document.getElementById('includeTimestamp')?.checked ?? true,
            template: template
        };

        // Usar o ExportManager para gerar o relatório
        if (format === 'excel') {
            this.exportManager.exportServidoresToExcel(this.filteredServidores, options);
        } else if (format === 'csv') {
            this.exportManager.exportServidoresToCSV(this.filteredServidores);
        } else if (format === 'pdf') {
            // PDF será implementado posteriormente
            window.customModal?.alert({
                title: 'Em Desenvolvimento',
                message: 'Exportação para PDF será implementada em breve!',
                type: 'info'
            });
        }
    }

    /**
     * Abrir modal de configuração de relatório
     */
    openReportModal(templateType) {
        const modal = document.getElementById('reportConfigModal');
        const modalTitle = document.getElementById('modalTemplateTitle');

        if (!modal) return;

        // Definir título do template
        const templateTitles = {
            'executive': 'Relatório Executivo',
            'complete': 'Relatório Completo',
            'urgency': 'Por Nível de Urgência',
            'department': 'Por Departamento'
        };

        if (modalTitle) {
            modalTitle.textContent = templateTitles[templateType] || 'Relatório';
        }

        // Armazenar template atual
        this.currentReportTemplate = templateType;

        // Atualizar informações de filtros
        this.updateModalFilterInfo();

        // Gerar preview inicial
        this.updateModalPreview();

        // Mostrar modal
        modal.classList.add('active');

        // Prevenir scroll do body
        document.body.style.overflow = 'hidden';
    }

    /**
     * Fechar modal de configuração
     */
    closeReportModal() {
        const modal = document.getElementById('reportConfigModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Atualizar informações de filtros no modal
     */
    updateModalFilterInfo() {
        const filterCount = document.getElementById('modalActiveFiltersCount');
        if (!filterCount) return;

        const total = this.allServidores.length;
        const filtered = this.filteredServidores.length;

        if (filtered === total) {
            filterCount.textContent = 'Todos os servidores';
        } else {
            filterCount.textContent = `${filtered} de ${total} servidores`;
        }
    }

    /**
     * Atualizar preview do modal
     */
    updateModalPreview() {
        const previewContainer = document.getElementById('modalReportPreview');
        if (!previewContainer) return;

        // Mostrar loading
        previewContainer.innerHTML = `
            <div class="preview-loading">
                <div class="spinner"></div>
                <p>Gerando pré-visualização...</p>
            </div>
        `;

        // Simular delay de processamento
        setTimeout(() => {
            const includeCharts = document.getElementById('modalIncludeCharts')?.checked || false;
            const includeStats = document.getElementById('modalIncludeStats')?.checked || false;

            let previewHTML = '';

            switch (this.currentReportTemplate) {
                case 'executive':
                    previewHTML = this.generateExecutivePreview(includeCharts, includeStats);
                    break;
                case 'complete':
                    previewHTML = this.generateCompletePreview(includeCharts, includeStats);
                    break;
                case 'urgency':
                    previewHTML = this.generateUrgencyPreview(includeCharts, includeStats);
                    break;
                case 'department':
                    previewHTML = this.generateDepartmentPreview(includeCharts, includeStats);
                    break;
                default:
                    previewHTML = '<p class="text-muted">Template não encontrado</p>';
            }

            previewContainer.innerHTML = previewHTML;
        }, 500);
    }

    /**
     * Inicializar listeners do modal
     */
    setupReportModalListeners() {
        // Fechar modal
        const closeBtn = document.getElementById('closeReportModal');
        const cancelBtn = document.getElementById('cancelReportModalBtn');
        const modal = document.getElementById('reportConfigModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeReportModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeReportModal());
        }

        // Fechar ao clicar fora
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeReportModal();
                }
            });
        }

        // Botão de download
        const downloadBtn = document.getElementById('downloadReportBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadReportFromModal();
            });
        }

        // Botão de refresh do preview
        const refreshBtn = document.getElementById('refreshPreviewBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateModalPreview();
            });
        }

        // Listeners para mudanças de configuração
        document.querySelectorAll('input[name="modalExportFormat"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateModalPreview();
            });
        });

        // Listeners para checkboxes
        ['modalIncludeCharts', 'modalIncludeStats', 'modalIncludeFilters', 'modalIncludeTimestamp'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updateModalPreview();
                });
            }
        });

        // Tecla ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeReportModal();
            }
        });
    }

    /**
     * Baixar relatório a partir do modal
     */
    downloadReportFromModal() {
        const format = document.querySelector('input[name="modalExportFormat"]:checked')?.value || 'excel';
        const includeCharts = document.getElementById('modalIncludeCharts')?.checked || false;
        const includeStats = document.getElementById('modalIncludeStats')?.checked || false;
        const includeFilters = document.getElementById('modalIncludeFilters')?.checked || false;
        const includeTimestamp = document.getElementById('modalIncludeTimestamp')?.checked || false;

        const options = {
            includeCharts,
            includeStats,
            includeFilters,
            includeTimestamp,
            template: this.currentReportTemplate
        };

        // Fechar modal
        this.closeReportModal();

        // Gerar relatório
        if (format === 'excel') {
            this.exportManager.exportServidoresToExcel(this.filteredServidores, options);
        } else if (format === 'csv') {
            this.exportManager.exportServidoresToCSV(this.filteredServidores);
        } else if (format === 'pdf') {
            window.customModal?.alert({
                title: 'Em Desenvolvimento',
                message: 'Exportação para PDF será implementada em breve!',
                type: 'info'
            });
        }
    }

    /**
     * Renderiza sugestões de autocomplete
     */
    renderAutocompleteSuggestions(suggestions) {
        const autocompleteList = document.getElementById('autocompleteList');
        const autocompleteDropdown = document.getElementById('autocompleteDropdown');

        if (!autocompleteList || !autocompleteDropdown) return;

        // Limpar lista
        autocompleteList.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            autocompleteDropdown.style.display = 'none';
            return;
        }

        // Criar sugestões
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-suggestion';
            item.setAttribute('data-type', suggestion.type);

            const icon = document.createElement('div');
            icon.className = 'autocomplete-suggestion-icon';

            let iconClass = 'bi bi-person';
            if (suggestion.type === 'cargo') iconClass = 'bi bi-briefcase';
            else if (suggestion.type === 'lotacao') iconClass = 'bi bi-building';

            icon.innerHTML = `<i class="${iconClass}"></i>`;

            const content = document.createElement('div');
            content.className = 'autocomplete-suggestion-content';

            const text = document.createElement('div');
            text.className = 'autocomplete-suggestion-text';
            text.textContent = suggestion.text;

            const type = document.createElement('div');
            type.className = 'autocomplete-suggestion-type';
            type.textContent = suggestion.type === 'nome' ? 'Nome' :
                               suggestion.type === 'cargo' ? 'Cargo' : 'Lotação';

            content.appendChild(text);
            content.appendChild(type);

            item.appendChild(icon);
            item.appendChild(content);

            // Click seleciona sugestão
            item.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = suggestion.text;
                    autocompleteDropdown.style.display = 'none';
                    this.handleSearch();
                }
            });

            autocompleteList.appendChild(item);
        });

        // Mostrar dropdown
        autocompleteDropdown.style.display = 'block';
        autocompleteDropdown.classList.add('show');
    }

    /**
     * Abre modal de filtros avançados
     */
    openFiltersModal(focusType = null) {
        // Usa exclusivamente o AdvancedFiltersBuilder
        if (this.advancedFiltersBuilder) {
            this.advancedFiltersBuilder.openModal(focusType);
            return;
        }
        
        console.warn('⚠️ AdvancedFiltersBuilder não inicializado');
    }

    /**
     * Fecha modal de filtros avançados
     */
    closeFiltersModal() {
        // Usa exclusivamente o AdvancedFiltersBuilder
        if (this.advancedFiltersBuilder) {
            this.advancedFiltersBuilder.closeModal();
            return;
        }
        
        console.warn('⚠️ AdvancedFiltersBuilder não inicializado');
    }

    /**
     * MÉTODO DESCONTINUADO - Modal antigo não é mais usado
     * AdvancedFiltersBuilder gerencia seus próprios dropdowns
     */
    populateFilterDropdowns() {
        console.warn('⚠️ populateFilterDropdowns está descontinuado');
        return;

        // Cargo
        const cargoFilter = document.getElementById('cargoFilter');
        if (cargoFilter) {
            const cargos = this.advancedFilterManager.getUniqueValues('cargo');
            cargoFilter.innerHTML = '<option value="">Todos</option>';
            cargos.forEach(cargo => {
                const option = document.createElement('option');
                option.value = cargo;
                option.textContent = cargo;
                cargoFilter.appendChild(option);
            });
        }

        // Lotação
        const lotacaoFilter = document.getElementById('lotacaoFilter');
        if (lotacaoFilter) {
            const lotacoes = this.advancedFilterManager.getUniqueValues('lotacao');
            lotacaoFilter.innerHTML = '<option value="">Todas</option>';
            lotacoes.forEach(lotacao => {
                const option = document.createElement('option');
                option.value = lotacao;
                option.textContent = lotacao;
                lotacaoFilter.appendChild(option);
            });
        }

        // Superintendência
        const superFilter = document.getElementById('superintendenciaFilter');
        if (superFilter) {
            const supers = this.advancedFilterManager.getUniqueValues('superintendencia');
            superFilter.innerHTML = '<option value="">Todas</option>';
            supers.forEach(super_ => {
                const option = document.createElement('option');
                option.value = super_;
                option.textContent = super_;
                superFilter.appendChild(option);
            });
        }
    }

    /**
     * MÉTODO DESCONTINUADO - Modal antigo não é mais usado
     * AdvancedFiltersBuilder gerencia seus próprios valores
     */
    restoreFilterValues() {
        console.warn('⚠️ restoreFilterValues está descontinuado');
        return;

        const filters = this.advancedFilterManager.activeFilters;

        // Cargo
        const cargoFilter = document.getElementById('cargoFilter');
        if (cargoFilter && filters.cargo) {
            cargoFilter.value = filters.cargo;
        }

        // Lotação
        const lotacaoFilter = document.getElementById('lotacaoFilter');
        if (lotacaoFilter && filters.lotacao) {
            lotacaoFilter.value = filters.lotacao;
        }

        // Superintendência
        const superFilter = document.getElementById('superintendenciaFilter');
        if (superFilter && filters.superintendencia) {
            superFilter.value = filters.superintendencia;
            this.updateSubsecretariaOptions(filters.superintendencia);
        }

        // Subsecretaria
        const subFilter = document.getElementById('subsecretariaFilter');
        if (subFilter && filters.subsecretaria) {
            subFilter.value = filters.subsecretaria;
        }

        // Urgência
        if (filters.urgencia) {
            const urgenciaRadio = document.querySelector(`input[name="urgencia"][value="${filters.urgencia}"]`);
            if (urgenciaRadio) {
                urgenciaRadio.checked = true;
            }
        }

        // Status
        const statusCom = document.getElementById('statusComLicenca');
        const statusSem = document.getElementById('statusSemLicenca');
        const statusVenc = document.getElementById('statusVencidas');

        if (statusCom) statusCom.checked = filters.status.includes('com-licenca');
        if (statusSem) statusSem.checked = filters.status.includes('sem-licenca');
        if (statusVenc) statusVenc.checked = filters.status.includes('vencidas');
    }

    /**
     * MÉTODO DESCONTINUADO - Modal antigo não é mais usado
     * AdvancedFiltersBuilder gerencia seus próprios listeners
     */
    setupFiltersModalListeners() {
        console.warn('⚠️ setupFiltersModalListeners está descontinuado');
        return;
        // Fechar modal
        const closeBtn = document.getElementById('closeFiltersModal');
        const cancelBtn = document.getElementById('cancelFiltersBtn');
        const applyBtn = document.getElementById('applyFiltersBtn');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeFiltersModal();
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeFiltersModal();
        }

        if (applyBtn) {
            applyBtn.onclick = () => this.applyAdvancedFilters();
        }

        // Filtro cascata (Super → Sub)
        const superFilter = document.getElementById('superintendenciaFilter');
        if (superFilter) {
            superFilter.onchange = (e) => {
                this.updateSubsecretariaOptions(e.target.value);
            };
        }

        // Searchable dropdowns
        this.setupSearchableDropdown('cargoSearch', 'cargoFilter');
        this.setupSearchableDropdown('lotacaoSearch', 'lotacaoFilter');

        // ESC fecha modal
        const modal = document.getElementById('filtersModal');
        if (modal) {
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    this.closeFiltersModal();
                    modal.removeEventListener('keydown', handleEsc);
                }
            };
            modal.addEventListener('keydown', handleEsc);
        }
    }

    /**
     * Atualiza opções de subsecretaria baseado na superintendência
     */
    updateSubsecretariaOptions(superintendencia) {
        const subFilter = document.getElementById('subsecretariaFilter');
        if (!subFilter || !this.advancedFilterManager) return;

        if (!superintendencia) {
            subFilter.disabled = true;
            subFilter.innerHTML = '<option value="">Selecione a superintendência primeiro</option>';
            return;
        }

        const subsecretarias = this.advancedFilterManager.getSubsecretariasBySuper(superintendencia);
        subFilter.disabled = false;
        subFilter.innerHTML = '<option value="">Todas</option>';

        subsecretarias.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            subFilter.appendChild(option);
        });
    }

    /**
     * Setup para dropdown searchable
     */
    setupSearchableDropdown(searchId, selectId) {
        const searchInput = document.getElementById(searchId);
        const select = document.getElementById(selectId);

        if (!searchInput || !select) return;

        // Guardar opções originais
        const originalOptions = Array.from(select.options);

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            // Filtrar opções
            select.innerHTML = '';

            originalOptions.forEach(option => {
                if (option.textContent.toLowerCase().includes(query)) {
                    select.appendChild(option.cloneNode(true));
                }
            });
        });
    }

    /**
     * Aplica filtros avançados
     */
    applyAdvancedFilters() {
        if (!this.advancedFilterManager) return;

        // Coletar valores dos filtros
        const cargoFilter = document.getElementById('cargoFilter');
        const lotacaoFilter = document.getElementById('lotacaoFilter');
        const superFilter = document.getElementById('superintendenciaFilter');
        const subFilter = document.getElementById('subsecretariaFilter');

        // Definir filtros
        if (cargoFilter) {
            this.advancedFilterManager.setFilter('cargo', cargoFilter.value || null);
        }

        if (lotacaoFilter) {
            this.advancedFilterManager.setFilter('lotacao', lotacaoFilter.value || null);
        }

        if (superFilter) {
            this.advancedFilterManager.setFilter('superintendencia', superFilter.value || null);
        }

        if (subFilter) {
            this.advancedFilterManager.setFilter('subsecretaria', subFilter.value || null);
        }

        // Urgência
        const urgenciaRadio = document.querySelector('input[name="urgencia"]:checked');
        if (urgenciaRadio) {
            this.advancedFilterManager.setFilter('urgencia', urgenciaRadio.value);
        }

        // Status
        const statusArray = [];
        const statusCom = document.getElementById('statusComLicenca');
        const statusSem = document.getElementById('statusSemLicenca');
        const statusVenc = document.getElementById('statusVencidas');

        if (statusCom && statusCom.checked) statusArray.push('com-licenca');
        if (statusSem && statusSem.checked) statusArray.push('sem-licenca');
        if (statusVenc && statusVenc.checked) statusArray.push('vencidas');

        this.advancedFilterManager.setFilter('status', statusArray);

        // Aplicar filtros e atualizar UI
        this.applyFiltersAndSearch();

        // Fechar modal
        this.closeFiltersModal();
    }

    /**
     * Aplica filtros e busca combinados
     */
    applyFiltersAndSearch() {
        // Começar com todos os servidores
        let filtered = [...this.allServidores];

        // Aplicar filtros avançados
        if (this.advancedFilterManager && this.advancedFilterManager.hasActiveFilters()) {
            filtered = this.advancedFilterManager.applyFilters(filtered);
        }

        // Aplicar busca se houver - verificar ambos campos de busca
        const searchInput = document.getElementById('searchInput');
        const headerSearchInput = document.getElementById('headerSearchInput');

        // Pegar o termo de busca do campo que estiver preenchido
        let searchTerm = '';
        if (searchInput && searchInput.value.trim()) {
            searchTerm = searchInput.value.trim();
        } else if (headerSearchInput && headerSearchInput.value.trim()) {
            searchTerm = headerSearchInput.value.trim();
        }

        // Aplicar busca se houver termo
        if (searchTerm && this.smartSearchManager) {
            filtered = this.smartSearchManager.search(searchTerm, filtered);
        }

        // Atualizar servidores filtrados
        this.filteredServidores = filtered;

        // Atualizar UI
        this.updateTable();
        this.updateStats();

        // Atualizar chips e contador
        if (this.filterChipsUI) {
            this.filterChipsUI.render();
            this.filterChipsUI.updateCounter(filtered.length, this.allServidores.length);
        }

        // Renderizar lista de filtros ativos no modal (sempre, não só se estiver aberto)
        if (this.advancedFilterManager && this.advancedFilterManager.renderActiveFiltersList) {
            this.advancedFilterManager.renderActiveFiltersList();
        }

        // Sincronizar notice de filtros na página de relatórios
        if (this.reportsManager) {
            this.reportsManager.syncFilterNotice();
        }

        console.log(`Filtros aplicados: ${filtered.length} de ${this.allServidores.length} servidores`);
    }

    /**
     * Popular atalhos de teclado na página de dicas
     */
    populateTipsKeyboardShortcuts() {
        const grid = document.getElementById('keyboardShortcutsGrid');
        if (!grid) return;

        // Lista de atalhos disponíveis
        const shortcuts = [
            { keys: ['Ctrl', 'K'], description: 'Abrir busca rápida' },
            { keys: ['Ctrl', 'D'], description: 'Alternar modo escuro/claro' },
            { keys: ['Ctrl', 'F'], description: 'Abrir filtros avançados' },
            { keys: ['Ctrl', 'E'], description: 'Exportar dados' },
            { keys: ['Esc'], description: 'Fechar modais e diálogos' },
            { keys: ['Ctrl', '/'], description: 'Mostrar/ocultar atalhos' },
            { keys: ['1'], description: 'Navegar para Visão Geral' },
            { keys: ['2'], description: 'Navegar para Calendário' },
            { keys: ['3'], description: 'Navegar para Timeline' },
            { keys: ['4'], description: 'Navegar para Relatórios' },
            { keys: ['5'], description: 'Navegar para Dicas' },
            { keys: ['6'], description: 'Navegar para Configurações' }
        ];

        // Gerar HTML dos atalhos
        const html = shortcuts.map(shortcut => {
            const keysHtml = shortcut.keys.map(key => `<kbd class="shortcut-key">${key}</kbd>`).join('<span class="shortcut-plus">+</span>');
            return `
                <div class="shortcut-card">
                    <div class="shortcut-keys">${keysHtml}</div>
                    <p class="shortcut-description">${shortcut.description}</p>
                </div>
            `;
        }).join('');

        grid.innerHTML = html;
    }

    /**
     * Configurar event listeners para filtros do header
     */
    setupHeaderFilters() {
        // Busca no header
        const headerSearchInput = document.getElementById('headerSearchInput');
        const clearHeaderSearchBtn = document.getElementById('clearHeaderSearchBtn');
        const usingAdvancedBuilder = typeof AdvancedFiltersBuilder !== 'undefined' && document.querySelector('.filters-builder');

        if (headerSearchInput) {
            headerSearchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();

                // Mostrar/ocultar botão limpar
                if (clearHeaderSearchBtn) {
                    clearHeaderSearchBtn.style.display = searchTerm ? 'block' : 'none';
                }

                // Aplicar filtro
                this.currentFilters.search = searchTerm;
                this.applyTableFilter();
            });

            // Limpar busca
            if (clearHeaderSearchBtn) {
                clearHeaderSearchBtn.addEventListener('click', () => {
                    headerSearchInput.value = '';
                    clearHeaderSearchBtn.style.display = 'none';
                    this.currentFilters.search = '';
                    this.applyTableFilter();
                });
            }
        }

        // Select de idade no header (faixas pré-definidas)
        const headerAgeFilter = document.getElementById('headerAgeFilter');
        if (headerAgeFilter) {
            headerAgeFilter.addEventListener('change', (e) => {
                const value = e.target.value;
                this.applyAgeRangeFilter(value);
            });
        }

        // Botão de notificações - gerenciado pelo NotificationManager
        // O event listener é adicionado em NotificationManager.createNotificationBell()

        // Configurar modal de filtros avançados (para atalhos de teclado)
        const closeFiltersBtn = document.getElementById('closeFiltersModal');
        const cancelFiltersBtn = document.getElementById('cancelFiltersBtn');

        if (!usingAdvancedBuilder) {
            if (closeFiltersBtn) {
                closeFiltersBtn.addEventListener('click', () => {
                    const modal = document.getElementById('filtersModal');
                    if (modal) {
                        this._closeModalElement(modal);
                        setTimeout(() => { modal.style.display = 'none'; }, 300);
                    }
                });
            }

            if (cancelFiltersBtn) {
                cancelFiltersBtn.addEventListener('click', () => {
                    const modal = document.getElementById('filtersModal');
                    if (modal) {
                        this._closeModalElement(modal);
                        setTimeout(() => { modal.style.display = 'none'; }, 300);
                    }
                });
            }
        }

        // Clicar fora do modal para fechar
        const filtersModal = document.getElementById('filtersModal');
        if (filtersModal) {
            filtersModal.addEventListener('click', (e) => {
                if (e.target === filtersModal) {
                    this.closeFiltersModal();
                }
            });
        }

        // Botão de aplicar filtros
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (!usingAdvancedBuilder && applyFiltersBtn && this.advancedFilterManager) {
            applyFiltersBtn.addEventListener('click', () => {
                // Aplicar filtros avançados
                this.advancedFilterManager.applyFilters();

                // Atualizar badge
                this.updateFiltersBadge();

                // Feedback visual
                const btn = document.getElementById('btnAdvancedFilters');
                if (btn) {
                    btn.classList.add('success');
                    setTimeout(() => btn.classList.remove('success'), 600);
                }

                // Fechar modal
                const modal = document.getElementById('filtersModal');
                if (modal) {
                    this._closeModalElement(modal);
                    setTimeout(() => { modal.style.display = 'none'; }, 300);
                }
            });
        }
    }

    /**
     * Aplicar filtro por faixa de idade
     */
    applyAgeRangeFilter(value) {
        if (value === 'all') {
            // Não filtrar por idade
            this.currentFilters.age = null;
        } else {
            // Determinar min e max com base na faixa selecionada
            let min, max;

            switch (value) {
                case '18-30':
                    min = 18;
                    max = 30;
                    break;
                case '31-40':
                    min = 31;
                    max = 40;
                    break;
                case '41-50':
                    min = 41;
                    max = 50;
                    break;
                case '51-60':
                    min = 51;
                    max = 60;
                    break;
                case '61-70':
                    min = 61;
                    max = 70;
                    break;
                case '71+':
                    min = 71;
                    max = 150;
                    break;
                default:
                    this.currentFilters.age = null;
                    this.applyTableFilter();
                    return;
            }

            this.currentFilters.age = { min, max };
        }

        this.applyTableFilter();
    }

    /**
     * Configurar event listeners para botões da sidebar (compatibilidade)
     */
    setupSidebarButtons() {
        // Chamar setupHeaderFilters para compatibilidade
        this.setupHeaderFilters();
    }
}


// exportar a classe para uso global
window.DashboardMultiPage = DashboardMultiPage;

// Inicializar o dashboard quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof window.DashboardMultiPage === 'function') {
            window.dashboard = new window.DashboardMultiPage();
        } else {
            console.error('DashboardMultiPage não está disponível em window no DOMContentLoaded');
        }
        
        // Inicializar tooltips customizados
        if (typeof window.CustomTooltip === 'function') {
            window.customTooltip = new window.CustomTooltip();
            // Pequeno delay para garantir que os elementos foram renderizados
            setTimeout(() => {
                window.customTooltip.initAll();
            }, 200);
        }
        
        // Configurar listeners da página de relatórios após inicialização
        setTimeout(() => {
            if (window.dashboard && typeof window.dashboard.setupReportsPageListeners === 'function') {
                window.dashboard.setupReportsPageListeners();
            }
            if (window.dashboard && typeof window.dashboard.setupReportModalListeners === 'function') {
                window.dashboard.setupReportModalListeners();
            }
        }, 300);
    } catch (e) {
        console.error('Erro ao inicializar DashboardMultiPage:', e);
    }
});

// Função para atualizar indicadores de arquivos armazenados após o carregamento da página
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Aguardar um breve período para garantir que todos os componentes estejam carregados
        setTimeout(() => {
            if (window.dashboard && typeof window.dashboard.updateStoredFileIndicators === 'function') {
                window.dashboard.updateStoredFileIndicators();
            }
        }, 150);
    } catch (e) {
    console.warn('Não foi possível disparar updateStoredFileIndicators ao carregar', e);
    }
});
