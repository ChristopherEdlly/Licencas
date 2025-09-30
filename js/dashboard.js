// Dashboard Multi-Páginas SUTRI

// Cores consistentes para charts (compatíveis com ambos os temas)
const CHART_COLORS = {
    critical: '#ef4444',  // Vermelho
    high: '#f97316',      // Laranja
    moderate: '#eab308',  // Amarelo
    low: '#059669'        // Verde
};

// Array de cores para usar nos charts de urgência
const CHART_COLOR_ARRAY = [
    CHART_COLORS.critical,
    CHART_COLORS.high,
    CHART_COLORS.moderate,
    CHART_COLORS.low
];

// Cores consistentes para gráficos de cargo (usadas tanto no chart quanto na legenda)
// Cores completamente independentes das cores de urgência
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
    constructor() {
        this.parser = new CronogramaParser();
        this.allServidores = [];
        this.filteredServidores = [];
        this.loadingProblems = [];
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

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initNavigation();
        this.initPeriodTabs();
        this.updateProblemsCount();
        this.updateLastUpdate();
        this.setupThemeIntegration();

        const currentYear = new Date().getFullYear();
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (currentYearElement) {
            currentYearElement.textContent = currentYear;
        }

        // Tentar auto-carregamento após inicialização completa
        setTimeout(async () => {
            await this.updateStoredFileIndicators();

            // Se não conseguir auto-carregar, mostrar estado inicial vazio
            if (!await this.tryAutoLoad()) {
                this.showEmptyState();
            }
        }, 250);
    }

    setupThemeIntegration() {
        // Registrar o chart globalmente para o ThemeManager
        window.dashboardChart = this.charts.urgency;

        // Escutar mudanças de tema
        window.addEventListener('themeChanged', (e) => {
            this.onThemeChanged(e.detail.theme);
        });

        // Atualizar cores se necessário (mantemos as mesmas cores para consistência)
        // Mas podemos ajustar outros aspectos visuais se necessário

        if (this.charts.urgency) {
            // Registrar novamente para o ThemeManager
            window.dashboardChart = this.charts.urgency;
        }

    // Outras atualizações de tema podem ser adicionadas aqui
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

    // Observação: o botão de limpar foi removido do header intencionalmente - usuários substituem arquivos abrindo novos

    // Busca com filtro automático
        const searchInput = document.getElementById('searchInput');

        if (searchInput) {
            // Ao digitar, mostrar/esconder o botão de limpar
            searchInput.addEventListener('input', () => {
                this.toggleClearSearchButton();
                // Aplicar filtro de busca automaticamente
                this.handleSearch();
            });

            // Tecla Enter executa a busca
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            });
        }

    // Botão de limpar busca
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
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
            periodFilter.addEventListener('change', () => this.applyLicencaFilters());
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

        // Close day details panel
        const closePanelBtn = document.getElementById('closePanelBtn');
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', () => this.closeDayDetailsPanel());
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
                    this.applyLicencaFilters();
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
                if (e.target.closest('#detailsModal')) {
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
        const modalCloseBtn = document.getElementById('modalCloseBtn');
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
                this.filterTableByUrgency(urgency, urgencyIndex);

                // Atualizar estado visual da legenda
                document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
                legendCard.classList.add('active');
            }

            // Clique em stat-card - apenas informativo na página inicial
            if (e.target.closest('.stat-card')) {
                if (this.currentPage === 'home') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        });
    }

    initNavigation() {
        this.switchPage('home');
    }

    switchPage(pageId) {
    // Atualizar botões de navegação
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');

    // Mostrar/ocultar páginas
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        document.getElementById(`${pageId}Page`).classList.add('active');

    // Atualizar título da página
        const titles = {
            'home': 'Visão Geral',
            'calendar': 'Calendário',
            'timeline': 'Timeline'
        };
        document.getElementById('pageTitle').textContent = titles[pageId] || pageId;

        this.currentPage = pageId;

    // Inicializar conteúdo específico da página
        if (pageId === 'calendar') {
            this.updateYearlyHeatmap();
        } else if (pageId === 'timeline') {
            this.createTimelineChart();
        } else if (pageId === 'home') {
            this.createUrgencyChart();
            this.updateTable();
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
                alert('Tipo de arquivo não suportado. Use arquivos CSV ou Excel (.csv, .xlsx, .xls)');
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

        this.showLoading();

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

            // Validar headers CSV básicos
            const lines = data.split('\n');
            if (lines.length < 2) {
                throw new Error('Arquivo deve ter pelo menos uma linha de header e uma linha de dados');
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));

            // Detectar tipo de tabela para validar headers apropriados
            const headersStr = headers.join(',').toLowerCase();
            const isLicencaPremio = headersStr.includes('inicio de licença') || headersStr.includes('final de licença');

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
                console.warn('Headers disponíveis:', headers);
                throw new Error(`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}`);
            }

            this.processData(data);
            this.updateLastUpdate();

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

            if (statusElement) {
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    <span class="file-info">✓ ${file.name} (${this.allServidores.length} servidores)</span>
                `;
            }

        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            if (statusElement) {
                statusElement.className = 'upload-status error';
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="file-info">✗ ${error.message}</span>
                `;
            } else {
                alert('Erro ao processar arquivo: ' + error.message);
            }

            // Reset file input on error
            event.target.value = '';

        } finally {
            this.hideLoading();
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

            // Processar dados
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

            // Processar dados
            this.processData(fileData);
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

            this.allServidores = this.parser.processarDadosCSV(csvData);
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
            alert('Erro ao processar dados: ' + error.message);
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
                if (servidor.cronogramaComErro) {
                    this.addLoadingProblem(nome, 'Cronograma ambíguo ou não interpretável', `cronograma: ${servidor.cronograma || ''}`);
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

            // Se houver problemas, log resumido
            if (this.loadingProblems && this.loadingProblems.length > 0) {
                console.warn(`⚠️  Encontrados ${this.loadingProblems.length} problema(s) durante a validação dos dados.`);
            }
        } catch (e) {
            console.error('Erro na verificação de erros do cronograma:', e);
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

    clearAllFilters() {
        // Reset age filter
        const minAgeInput = document.getElementById('minAge');
        const maxAgeInput = document.getElementById('maxAge');
        if (minAgeInput) minAgeInput.value = 18;
        if (maxAgeInput) maxAgeInput.value = 70;
        this.currentFilters.age = { min: 18, max: 70 };
        const currentYear = new Date().getFullYear();
        const startYearInput = document.getElementById('startYear');
        const endYearInput = document.getElementById('endYear');
        if (startYearInput) startYearInput.value = currentYear;
        if (endYearInput) endYearInput.value = currentYear + 3;
        this.currentFilters.period = { type: 'yearly', start: currentYear, end: currentYear + 3 };
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.currentFilters.search = '';
        this.currentFilters.urgency = '';
        const mesFilter = document.getElementById('mesFilter');
        if (mesFilter) {
            try {
                mesFilter.value = 'all';
                mesFilter.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                // Se ocorrer erro ao disparar o evento (ex.: browsers antigos), apenas definir o valor
                mesFilter.value = 'all';
            }
        }
        this.currentFilters.cargo = ''; // Reset cargo filter

        // Clear legend highlights
        document.querySelectorAll('.legend-item').forEach(item => item.classList.remove('selected'));

        // Clear chart highlights
        this.selectedChartIndex = -1;
        this.updateChartHighlight();

        // Clear legend and stat card active states
        document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
        document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('selected'));

        // Aplicar filtros baseado no tipo de tabela
        if (!this.allServidores || this.allServidores.length === 0) {
            // Se não há dados carregados, apenas limpar a interface
            this.filteredServidores = [];
            this.updateStats();
            this.updateHeaderStatus();
            return;
        }

        const isLicencaPremio = this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyLicencaFilters();
        } else {
            this.applyTableFilter();
        }
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
            this.applyLicencaFilters();
        } else {
            this.applyAgeFilter();
        }
    }

    applyLicencaFilters() {
        const rawMes = document.getElementById('mesFilter')?.value?.trim() || '';
        const mesFilter = (rawMes && rawMes.toLowerCase() === 'all') ? '' : rawMes;
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';

        // Se nenhum filtro está ativo, mostrar todos os dados
        if (!mesFilter && !searchTerm && !this.currentFilters.cargo) {
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
        this.updateHeaderStatus();
        this.updateTimelineChart(); // Atualizar timeline quando filtros mudarem
    }
    matchesMonth(servidor, targetMonth) {
        if (!servidor.proximaLicencaInicio || !servidor.proximaLicencaFim) {
            return false;
        }

        const months = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        const targetMonthIndex = months.indexOf(targetMonth.toLowerCase());
        if (targetMonthIndex === -1) return false;

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
        // Early return if no data
        if (!this.allServidores || this.allServidores.length === 0) {
            this.filteredServidores = [];
            this.updateStats();
            this.updateHeaderStatus();
            return;
        }

    // Medição rápida de performance para diagnóstico (opcional)
        const startTime = performance.now();

        const filters = this.currentFilters;

        this.filteredServidores = this.allServidores.filter(servidor => {
            // Verificação rápida de idade primeiro (filtro mais comum)
            if (servidor.idade < filters.age.min || servidor.idade > filters.age.max) {
                return false;
            }

            // Filtro de busca (retorno antecipado para melhorar performance)
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const serverName = servidor.nome.toLowerCase();
                const serverLotacao = servidor.lotacao?.toLowerCase() || '';
                const serverCargo = servidor.cargo?.toLowerCase() || '';

                if (!serverName.includes(searchTerm) &&
                    !serverLotacao.includes(searchTerm) &&
                    !serverCargo.includes(searchTerm)) {
                    return false;
                }
            }

            // Urgency filter - apenas aplicar se o servidor tem urgência (cronogramas regulares)
            if (filters.urgency && servidor.nivelUrgencia && servidor.nivelUrgencia.toLowerCase() !== filters.urgency) {
                return false;
            }

            // Otimização do filtro por período - verificar apenas se o servidor possui licenças
            if (servidor.licencas && servidor.licencas.length > 0) {
                if (filters.period.type === 'yearly' && (filters.period.start || filters.period.end)) {
                    const hasLicenseInPeriod = servidor.licencas.some(licenca => {
                        if (!licenca.inicio) return false;
                        const year = licenca.inicio.getFullYear();
                        return year >= filters.period.start && year <= filters.period.end;
                    });
                    if (!hasLicenseInPeriod) return false;

                } else if (filters.period.type === 'monthly' && filters.period.year) {
                    const hasLicenseInPeriod = servidor.licencas.some(licenca => {
                        if (!licenca.inicio) return false;
                        const year = licenca.inicio.getFullYear();
                        const month = licenca.inicio.getMonth();
                        return year === filters.period.year &&
                            month >= filters.period.monthStart &&
                            month <= filters.period.monthEnd;
                    });
                    if (!hasLicenseInPeriod) return false;

                } else if (filters.period.type === 'daily' && filters.period.year !== undefined && filters.period.month !== undefined) {
                    const hasLicenseInPeriod = servidor.licencas.some(licenca => {
                        if (!licenca.inicio) return false;
                        const year = licenca.inicio.getFullYear();
                        const month = licenca.inicio.getMonth();
                        return year === filters.period.year && month === filters.period.month;
                    });
                    if (!hasLicenseInPeriod) return false;
                }
            }

            return true;
        });

    // Verifica duração da filtragem e registra se acima do limiar
        const endTime = performance.now();
        if (endTime - startTime > 10) {
            console.warn(`Desempenho do filtro: ${(endTime - startTime).toFixed(2)}ms para ${this.allServidores.length} servidores`);
        }

        this.updateStats();
        this.updateHeaderStatus();

    // Atualizar página atual
        if (this.currentPage === 'home') {
            this.updateUrgencyChart();
            this.updateTable();
        } else if (this.currentPage === 'calendar') {
            this.updateYearlyHeatmap();
        } else if (this.currentPage === 'timeline') {
            this.updateTimelineChart();
        }
    }

    // Charts
    createUrgencyChart() {
        const ctx = document.getElementById('urgencyChart');
        if (!ctx) return;

    // Destruir gráfico existente
        if (this.charts.urgency) {
            this.charts.urgency.destroy();
        }

        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

    // Atualizar título do gráfico
        const chartTitle = document.querySelector('.chart-title');
        if (chartTitle) {
            chartTitle.textContent = isLicencaPremio ? 'Distribuição por Cargos' : 'Distribuição por Urgência';
        }

        if (isLicencaPremio) {
            this.createCargoChart();
        } else {
            this.createOriginalUrgencyChart();
        }
    }

    createOriginalUrgencyChart() {
        const ctx = document.getElementById('urgencyChart');
        const urgencyData = this.getStaticUrgencyData();

        this.charts.urgency = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Crítico', 'Alto', 'Moderado', 'Baixo'],
                datasets: [{
                    data: urgencyData.values,
                    backgroundColor: CHART_COLOR_ARRAY,
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
                        display: false  // Desabilitar legenda padrão
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
                        const urgencyLevels = ['critical', 'high', 'moderate', 'low'];
                        const urgency = urgencyLevels[index];
                        this.filterTableByUrgency(urgency, index);
                    } else {
                        // Clicou fora das fatias - limpar filtro
                        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

                        if (isLicencaPremio) {
                            // Para licenças prêmio, limpar filtro de cargo
                            this.clearCargoFilter();
                        } else {
                            // limpar filtro de urgência
                            this.clearUrgencyFilter();
                        }
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        // Registrar chart globalmente para ThemeManager
        window.dashboardChart = this.charts.urgency;

    // Atualizar contagens da legenda com dados estáticos
        this.updateUrgencyLegend(this.getStaticUrgencyData());
    }

    createCargoChart() {
        const ctx = document.getElementById('urgencyChart');
        const cargoData = this.getStaticCargoData();

        this.charts.urgency = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cargoData.labels,
                datasets: [{
                    data: cargoData.values,
                    backgroundColor: CARGO_COLORS.slice(0, cargoData.labels.length),
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

        // Registrar chart globalmente
        window.dashboardChart = this.charts.urgency;

    // Atualizar contagens da legenda com dados estáticos
    this.updateCargoLegend(this.getStaticCargoData());
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
        // Populate year selector
        const yearSelect = document.getElementById('timelineYear');
        if (yearSelect) {
            yearSelect.innerHTML = '';

            // Extrair anos que realmente têm dados
            const yearsWithData = new Set();
            this.filteredServidores.forEach(servidor => {
                servidor.licencas.forEach(licenca => {
                    yearsWithData.add(licenca.inicio.getFullYear());
                });
            });

            // Converter para array e ordenar
            const sortedYears = Array.from(yearsWithData).sort((a, b) => a - b);

            // Se não há dados, usar anos padrão
            if (sortedYears.length === 0) {
                const currentYear = new Date().getFullYear();
                for (let year = currentYear - 1; year <= currentYear + 2; year++) {
                    sortedYears.push(year);
                }
            }

            // Popular dropdown
            sortedYears.forEach((year, index) => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (index === 0) option.selected = true; // Selecionar o primeiro ano com dados
                yearSelect.appendChild(option);
            });

            yearSelect.addEventListener('change', () => {
                this.createTimelineChart();
            });
        }

        // Timeline month selector
        const monthSelect = document.getElementById('timelineMonth');
        if (monthSelect) {
            // HTML values are 0-based (0=Janeiro, 1=Fevereiro, etc.) which matches JavaScript months
            const currentMonth = new Date().getMonth();  // 0-based month (0-11)
            monthSelect.value = currentMonth;

            monthSelect.addEventListener('change', () => {
                this.createTimelineChart();
            });
        }

        // Timeline view selector
        const viewSelect = document.getElementById('timelineView');
        if (viewSelect) {
            viewSelect.addEventListener('change', () => {
                this.toggleControlsVisibility();
                this.createTimelineChart();
            });

            // Inicializar visibilidade
            this.toggleControlsVisibility();
        }

        // Show period stats button
        const periodStatsBtn = document.getElementById('showPeriodStatsBtn');
        if (periodStatsBtn) {
            periodStatsBtn.addEventListener('click', () => {
                this.showCurrentPeriodStats();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportTimelineBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportTimelineData();
            });
        }
    }

    toggleControlsVisibility() {
        const viewType = document.getElementById('timelineView')?.value || 'monthly';
        const monthGroup = document.getElementById('timelineMonthGroup');
        const yearGroup = document.getElementById('timelineYearGroup');
        const periodStatsBtn = document.getElementById('showPeriodStatsBtn');

        if (monthGroup && yearGroup && periodStatsBtn) {
            if (viewType === 'daily') {
                monthGroup.style.display = 'flex';
                yearGroup.style.display = 'flex';
                periodStatsBtn.style.display = 'flex';
            } else if (viewType === 'monthly') {
                monthGroup.style.display = 'none';
                yearGroup.style.display = 'flex';
                periodStatsBtn.style.display = 'flex';
            } else { // yearly
                monthGroup.style.display = 'none';
                yearGroup.style.display = 'none';
                periodStatsBtn.style.display = 'flex';
            }
        }
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
        const serversList = document.getElementById('timelineServersList');
        const serversCount = document.getElementById('serversCount');

        if (!modal || !modalTitle || !serversList || !serversCount) {
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
        serversCount.textContent = servidores.length;

    // Criar lista limpa de servidores
        if (servidores.length === 0) {
            serversList.innerHTML = '<p class="text-muted">Nenhum servidor em licença neste período.</p>';
        } else {
            serversList.innerHTML = servidores.map(servidor => {
                const urgencyClass = servidor.nivelUrgencia ? `urgency-${servidor.nivelUrgencia.toLowerCase()}` : 'urgency-low';
                const details = [];

                if (servidor.cargo) {
                    details.push(`<span><i class="bi bi-person-badge"></i> ${this.escapeHtml(servidor.cargo)}</span>`);
                }
                if (servidor.idade || servidor.idade === 0) {
                    details.push(`<span><i class="bi bi-calendar-date"></i> ${this.escapeHtml(String(servidor.idade))} anos</span>`);
                }
                if (servidor.lotacao) {
                    details.push(`<span><i class="bi bi-building"></i> ${this.escapeHtml(servidor.lotacao)}</span>`);
                }

                const detailsHtml = details.length > 0 ? `<div class="timeline-server-details">${details.join('')}</div>` : '';

                return `
                    <div class="timeline-server-item">
                        <div class="timeline-server-info">
                            <div class="timeline-server-name">${this.escapeHtml(servidor.nome)}</div>
                            ${detailsHtml}
                        </div>
                        <div class="timeline-server-actions">
                            ${servidor.nivelUrgencia ? `<span class="status-badge ${urgencyClass}">${this.escapeHtml(servidor.nivelUrgencia)}</span>` : ''}
                            <button class="btn-icon" onclick="dashboard.showServidorDetails('${this.escapeHtml(servidor.nome)}')" title="Ver detalhes completos">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

    // Exibir modal
        modal.classList.add('show');
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

        modal.classList.add('show');
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

    // Verificar se temos dados válidos
        if (!this.filteredServidores || this.filteredServidores.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum dado disponível para visualização.</p>';
            return;
        }

        container.innerHTML = '';

    // Criar container de meses
        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'months-grid';

        for (let month = 0; month < 12; month++) {
            const monthDiv = this.createMonthHeatmap(year, month);
            monthsContainer.appendChild(monthDiv);
        }

        container.appendChild(monthsContainer);
    }

    changeCalendarYear(direction) {
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (!currentYearElement) return;

        const currentYear = parseInt(currentYearElement.textContent);
        const newYear = currentYear + direction;

        // Limitar anos (por exemplo, entre 2020 e 2030)
        if (newYear >= 2020 && newYear <= 2030) {
            this.updateYearlyHeatmap(newYear);
        }
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

    // Calcular dados de licença para este mês
        const dayData = {};
        this.filteredServidores.forEach(servidor => {
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
        });

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
            // Lógica de cores consistente: level baseado na quantidade absoluta, não relativa ao mês
            let level = 0;
            if (count > 0) {
                if (count === 1) level = 1;
                else if (count <= 3) level = 2;
                else if (count <= 5) level = 3;
                else level = 4;
            }

            dayCell.classList.add(`level-${level}`);
            dayCell.textContent = day;
            dayCell.title = `${day}/${month + 1}/${year}: ${count} licenças`;

            if (count > 0) {
                dayCell.addEventListener('click', () => {
                    this.showCalendarDayDetails(year, month, day, count);
                });
                dayCell.style.cursor = 'pointer';
            }

            calendarGrid.appendChild(dayCell);
        }

        monthDiv.appendChild(calendarGrid);
        return monthDiv;
    }

    showCalendarDayDetails(year, month, day, count) {
        const targetDate = new Date(year, month, day);
        const dateStr = targetDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Encontrar servidores com licenças neste dia
        const servidores = this.filteredServidores.filter(servidor => {
            return servidor.licencas.some(licenca => {
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

        // Atualizar título do painel
        const titleElement = document.getElementById('selectedDateTitle');
        if (titleElement) {
            titleElement.textContent = `${dateStr} - ${servidores.length} servidor(es)`;
        }

        // Gerar HTML para a lista de servidores
        const serversListElement = document.getElementById('selectedDateServers');
        if (serversListElement && servidores.length > 0) {
            serversListElement.innerHTML = servidores.map(servidor => {
                const initials = servidor.nome.split(' ')
                    .map(word => word[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

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

                return `
                    <div class="server-card" onclick="dashboard.showServidorDetails('${servidor.nome}')">
                        <div class="server-avatar">${initials}</div>
                        <div class="server-info">
                            <h5 class="server-name">${servidor.nome}</h5>
                            <p class="server-details">${servidor.cargo || 'Cargo não    do'} • ${licenseInfo}</p>
                        </div>
                        <div class="server-status">
                            <div class="status-indicator"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else if (serversListElement) {
            serversListElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="bi bi-calendar-x" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Nenhum servidor encontrado neste dia.</p>
                </div>
            `;
        }

        // Mostrar o painel
        const panel = document.getElementById('dayDetailsPanel');
        if (panel) {
            panel.style.display = 'flex';

            // Adicionar evento para fechar clicando fora
            setTimeout(() => {
                document.addEventListener('click', this.handlePanelOutsideClick.bind(this));
            }, 100);
        }
    }

    handlePanelOutsideClick(event) {
        const panel = document.getElementById('dayDetailsPanel');
        const target = event.target;

        // Se clicou fora do painel, fechá-lo
        if (panel && !panel.contains(target) && !target.closest('.day-cell')) {
            this.closeDayDetailsPanel();
        }
    }

    closeDayDetailsPanel() {
        const panel = document.getElementById('dayDetailsPanel');
        if (panel) {
            panel.style.display = 'none';

            // Remover evento de clique fora
            document.removeEventListener('click', this.handlePanelOutsideClick.bind(this));
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

        modal.classList.add('show');

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

        // Toggle filter instead of just highlighting
        if (this.currentFilters.urgency === mappedUrgency) {
            // Remove filter
            this.currentFilters.urgency = '';
            document.querySelectorAll('.legend-item').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            // Add filter
            document.querySelectorAll('.legend-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.currentFilters.urgency = mappedUrgency;
            const urgencyElement = document.querySelector(`[data-urgency="${urgencyLevel}"]`);
            if (urgencyElement) {
                urgencyElement.classList.add('selected');
            }
        }

    // Aplicar filtros
        this.applyAllFilters();
    }

    // Função para filtrar por cargo nas tabelas de licenças prêmio
    highlightCargo(cargoKey) {
        // Para licenças prêmio, procurar por data-cargo ao invés de data-urgency
        const cargoElement = document.querySelector(`[data-cargo="${cargoKey}"]`);
        if (!cargoElement) return;

        // Obter o nome real do cargo do elemento
        const cargoName = cargoElement.querySelector('.legend-label')?.textContent?.trim();
        if (!cargoName) return;

        // Toggle filter usando currentFilters ao invés do dropdown
        if (this.currentFilters.cargo === cargoName) {
            // Remove filter
            this.currentFilters.cargo = '';
            document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
        } else {
            // Add filter
            this.currentFilters.cargo = cargoName;
            document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
            cargoElement.classList.add('active');
        }

    // Aplicar filtros
        this.applyLicencaFilters();
    }

    filterTableByUrgency(urgencyLevel, chartIndex) {
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
            this.clearUrgencyFilter();
        } else {
            // Add filter
            this.selectedChartIndex = chartIndex;
            this.currentFilters.urgency = mappedUrgency;
            this.updateChartHighlight();

            // Usar filtro apropriado baseado no tipo de tabela
            const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

            if (isLicencaPremio) {
                this.applyLicencaFilters();
            } else {
                this.applyTableFilter();
            }
        }
    }

    clearUrgencyFilter() {
        this.selectedChartIndex = -1;
        this.currentFilters.urgency = '';
        this.updateChartHighlight();

        // Usar filtro adaptativo baseado no tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyLicencaFilters();
        } else {
            this.applyTableFilter();
        }

        // Clear legend active states
        document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));

        // Clear stat-card selected states
        document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.legend-item').forEach(item => item.classList.remove('selected'));
    }

    filterTableByCargo(cargo, chartIndex) {
        // Toggle filter
        if (this.currentFilters.cargo === cargo && this.selectedChartIndex === chartIndex) {
            // Remove filter
            this.clearCargoFilter();
        } else {
            // Add filter
            this.selectedChartIndex = chartIndex;
            this.currentFilters.cargo = cargo;
            this.updateChartHighlight();

            // Usar filtro apropriado baseado no tipo de tabela
            const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

            if (isLicencaPremio) {
                this.applyLicencaFilters();
            } else {
                this.applyTableFilter();
            }
        }
    }

    clearCargoFilter() {
        this.selectedChartIndex = -1;
        this.currentFilters.cargo = '';
        this.updateChartHighlight();

        // Usar filtro adaptativo baseado no tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyLicencaFilters();
        } else {
            this.applyTableFilter();
        }

        // Clear legend active states
        document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
    }

    updateChartHighlight() {
        if (this.charts.urgency) {
            const chart = this.charts.urgency;
            const dataset = chart.data.datasets[0];

            // Detectar tipo de gráfico para usar as cores corretas
            const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';
            const correctColors = isLicencaPremio ? CARGO_COLORS : CHART_COLOR_ARRAY;

            // Reset todas as cores para o padrão correto baseado no tipo de gráfico
            dataset.backgroundColor = correctColors.slice(0, dataset.data.length);
            dataset.borderWidth = 2;

            // Se há uma seleção, destacar a fatia selecionada
            if (this.selectedChartIndex >= 0) {
                dataset.backgroundColor = dataset.backgroundColor.map((color, index) => {
                    if (index === this.selectedChartIndex) {
                        return color; // Cor normal para selecionada
                    } else {
                        return color + '60'; // Adiciona transparência às outras
                    }
                });
                dataset.borderWidth = dataset.backgroundColor.map((color, index) => {
                    return index === this.selectedChartIndex ? 4 : 2; // Borda mais grossa na selecionada
                });
            }

            chart.update('none'); // Atualiza sem animação
        }
    }

    applyTableFilter() {
        // Aplica apenas os filtros existentes sem recriar gráficos
        let filtered = [...this.allServidores];

    // Aplicar filtro de idade
        if (this.currentFilters.age) {
            filtered = filtered.filter(servidor =>
                servidor.idade >= this.currentFilters.age.min &&
                servidor.idade <= this.currentFilters.age.max
            );
        }

    // Aplicar filtro de busca
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(servidor =>
                servidor.nome.toLowerCase().includes(search) ||
                (servidor.cargo && servidor.cargo.toLowerCase().includes(search)) ||
                (servidor.lotacao && servidor.lotacao.toLowerCase().includes(search))
            );
        }

    // Aplicar filtro de urgência
        if (this.currentFilters.urgency) {
            filtered = filtered.filter(servidor =>
                servidor.nivelUrgencia && servidor.nivelUrgencia.toLowerCase() === this.currentFilters.urgency.toLowerCase()
            );
        }

    // Aplicar filtro de cargo (para licenças prêmio)
        if (this.currentFilters.cargo) {
            filtered = filtered.filter(servidor =>
                servidor.cargo && servidor.cargo === this.currentFilters.cargo
            );
        }

        this.filteredServidores = filtered;
        this.updateTable(); // Apenas atualiza a tabela
    }

    createServidoresList(servidores) {
        if (servidores.length === 0) {
            return '<p>Nenhum servidor encontrado para este período.</p>';
        }

        let html = `<div class="servidores-list">`;
        servidores.forEach(servidor => {
            const nomeEscapado = servidor.nome.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const lotacaoEscapada = (servidor.lotacao || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            html += `
                <div class="servidor-item">
                    <div class="servidor-info">
                        <strong>${nomeEscapado}</strong>
                        <span class="servidor-idade">${servidor.idade} anos</span>
                    </div>
                    <div class="servidor-details">
                        <span class="servidor-lotacao">${lotacaoEscapada}</span>
                        ${servidor.nivelUrgencia ? `<span class="urgency-badge urgency-${servidor.nivelUrgencia.toLowerCase()}">${servidor.nivelUrgencia}</span>` : ''}
                        <button class="btn-icon" data-servidor-nome="${nomeEscapado}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        return html;
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
        const selectedYear = parseInt(document.getElementById('timelineYear')?.value) || new Date().getFullYear();
        // HTML month values are already 0-based (0=Janeiro, 1=Fevereiro, etc.)
        const selectedMonth = parseInt(document.getElementById('timelineMonth')?.value) || new Date().getMonth();
        const data = {};

    // Preparar dados para exibição na timeline
    // Detectar se os dados são do tipo 'licença-prêmio' e adaptar processamento
        const isLicencaPremio = this.filteredServidores.length > 0 && this.filteredServidores[0].tipoTabela === 'licenca-premio';
            if (isLicencaPremio) {
                // Para 'licença-prêmio' alguns buckets e contagens são tratados de forma diferente
            }

        let totalLicenses = 0;
        let filteredLicenses = 0;

        // Criar esqueleto completo dos períodos com valor 0
        if (viewType === 'monthly') {
            // Para vista mensal, criar todos os 12 meses do ano selecionado
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
        }
        // Para yearly, não precisamos de esqueleto pois mostra apenas anos com dados

        this.filteredServidores.forEach(servidor => {
            servidor.licencas.forEach(licenca => {
                totalLicenses++;
                let key, period;
                let shouldInclude = true;

                if (viewType === 'yearly') {
                    const year = licenca.inicio.getFullYear();
                    key = year.toString();
                    period = { type: 'year', value: year };
                    if (!shouldInclude) return;
                    filteredLicenses++;

                    if (!data[key]) data[key] = { count: 0, period, servidores: new Set() };
                    data[key].count++;
                    data[key].servidores.add(servidor.nome);
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

                    // Iterate each day in the intersection and increment that day's bucket
                    const currentDay = new Date(includeStart);
                    while (currentDay <= includeEnd) {
                        const day = currentDay.getDate();
                        const dayKey = day.toString();
                        const dayPeriod = { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear };

                        if (!data[dayKey]) data[dayKey] = { count: 0, period: dayPeriod, servidores: new Set() };
                        data[dayKey].count++;
                        data[dayKey].servidores.add(servidor.nome);

                        currentDay.setDate(currentDay.getDate() + 1);
                    }
                } else { // monthly
                    const year = licenca.inicio.getFullYear();
                    const month = licenca.inicio.getMonth();

                    // Para visualização mensal, filtrar pelo ano selecionado
                    if (year !== selectedYear) {
                        shouldInclude = false;
                    } else {
                        key = `${year}-${month.toString().padStart(2, '0')}`;
                        period = { type: 'month', year, month };
                    }

                    if (!shouldInclude) return;
                    filteredLicenses++;

                    if (!data[key]) data[key] = { count: 0, period, servidores: new Set() };
                    data[key].count++;
                    data[key].servidores.add(servidor.nome);
                }
            });
        });

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
            data: sortedKeys.map(key => data[key].count),
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
            this.charts.urgency.data.datasets[0].data = urgencyData.values;
            this.charts.urgency.update('active');
            this.updateUrgencyLegend(urgencyData);
        }
    }

    updateTimelineChart() {
        if (this.charts.timeline) {
            const timelineData = this.getTimelineData();
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
            legendCard.innerHTML = `
                <div class="legend-color" style="background-color: ${CARGO_COLORS[index]}"></div>
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
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.5;"></i>
                        <div>
                            <h4 style="margin: 0; color: var(--text-secondary);">Nenhum dado carregado</h4>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Faça upload de um arquivo CSV ou Excel para começar</p>
                            <div style="margin-top:0.75rem; display:flex; gap:0.5rem; justify-content:center;">
                                <button class="btn-primary" id="tableUploadBtn" style="display:inline-flex; align-items:center; gap:0.5rem;">
                                    <i class="bi bi-upload"></i>
                                    <span>Fazer upload</span>
                                </button>
                            </div>
                        </div>
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
            emptyRow.innerHTML = '<td colspan="6" style="text-align: center; color: #666;">Nenhum servidor encontrado</td>';
            tbody.appendChild(emptyRow);
            return;
        }

        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        // Adaptar filtros para o tipo de tabela
        this.adaptFiltersForTableType(isLicencaPremio);

        // Atualizar headers da tabela se necessário
        this.updateTableHeaders(isLicencaPremio);

    // Aplicar ordenação
        let sortedServidores = [...this.filteredServidores];
        if (this.sortColumn) {
            sortedServidores.sort((a, b) => {
                let aVal = a[this.sortColumn];
                let bVal = b[this.sortColumn];

                if (this.sortColumn === 'proximaLicencaInicio' || this.sortColumn === 'proximaLicencaFim') {
                    aVal = aVal ? aVal.getTime() : 0;
                    bVal = bVal ? bVal.getTime() : 0;
                }

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
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
                // Coletar apenas dados não pessoais
                Object.entries(dados).forEach(([key, value]) => {
                    const keyUpper = key.toUpperCase();
                    // Pular informações pessoais e desnecessárias
                    if (!keyUpper.includes('SERVIDOR') &&
                        !keyUpper.includes('NOME') &&
                        !keyUpper.includes('CPF') &&
                        !keyUpper.includes('MATRÍCULA') &&
                        !keyUpper.includes('MATRICULA') &&
                        !keyUpper.includes('INICIO') &&
                        !keyUpper.includes('FINAL') &&
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
                originalDataContent += '<div class="planilha-info">';
                dadosConsolidados.forEach((value, key) => {
                    originalDataContent += `
                        <div class="info-item">
                            <span class="info-label">${this.escapeHtml(key)}</span>
                            <span class="info-value">${this.escapeHtml(String(value))}</span>
                        </div>
                    `;
                });
                originalDataContent += '</div>';

                // Mostrar períodos solicitados se houver
                if (periodos.length > 0) {
                    originalDataContent += `
                        <div class="periodos-solicitados">
                            <div class="periodos-title">Períodos Solicitados</div>
                            <div class="periodos-list">
                    `;
                    periodos.forEach(periodo => {
                        originalDataContent += `<span class="periodo-tag">${this.escapeHtml(periodo)}</span>`;
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

        if (isLicencaPremio) {
            interpretationContent = '<div class="info-grid">';

            if (periodosAgrupados && periodosAgrupados.length > 0) {
                interpretationContent += `
                    <div class="info-label">Períodos de Licença:</div>
                    <div class="info-value">${periodosAgrupados.length} período(s) identificado(s)</div>
                `;

                // Criar seção visual para cada período
                let periodosHtml = '<div class="periods-container">';

                periodosAgrupados.forEach((periodo, index) => {
                    const formatoInicio = this.formatDateBR(periodo.inicio);
                    const formatoFim = this.formatDateBR(periodo.fim);
                    const totalLicencas = periodo.licencas.length;
                    const licencaLabel = totalLicencas === 1 ? 'mês' : 'meses';

                    periodosHtml += `
                        <div class="period-card">
                            <div class="period-header">
                                <div class="period-title">
                                    <i class="bi bi-calendar-range"></i>
                                    Período ${index + 1}
                                </div>
                                <div class="period-count">${totalLicencas} ${licencaLabel}</div>
                            </div>
                            <div class="period-dates">
                                <span class="date-range">${formatoInicio} - ${formatoFim}</span>
                            </div>
                            <div class="months-breakdown">
                                ${this.gerarMesesPeriodo(periodo.licencas)}
                            </div>
                        </div>
                    `;
                });

                periodosHtml += '</div>';
                interpretationContent += periodosHtml;

            } else {
                interpretationContent += `
                    <div class="info-label">Status:</div>
                    <div class="info-value warning">Nenhuma licença processada pelo sistema</div>
                `;
                issues.push({
                    title: 'Nenhuma licença identificada',
                    description: 'O sistema não conseguiu interpretar ou encontrar informações de licenças nos dados fornecidos.'
                });
            }
            interpretationContent += '</div>';
        } else {
            interpretationContent = '<div class="info-grid">';

            if (servidor.cronograma) {
                interpretationContent += `
                    <div class="info-label">Cronograma:</div>
                    <div class="info-value highlight">${this.escapeHtml(servidor.cronograma)}</div>
                `;
            }

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

            if (servidor.nivelUrgencia) {
                const urgencyClass = this.getUrgencyClass(servidor.nivelUrgencia);
                interpretationContent += `
                    <div class="info-label">Nível de Urgência:</div>
                    <div class="info-value">
                        <span class="status-badge ${urgencyClass}">${this.escapeHtml(servidor.nivelUrgencia)}</span>
                    </div>
                `;

                // Verificar se a urgência é alta sem dados suficientes
                if ((servidor.nivelUrgencia === 'Crítico' || servidor.nivelUrgencia === 'Alto') &&
                    (!servidor.tempoContribuicao || !servidor.tempoServico)) {
                    issues.push({
                        title: 'Urgência alta com dados incompletos',
                        description: 'O sistema classificou como urgência alta, mas pode estar faltando dados de tempo de contribuição ou serviço.'
                    });
                }
            }

            if (servidor.proximaLicenca) {
                interpretationContent += `
                    <div class="info-label">Próxima Licença:</div>
                    <div class="info-value highlight">${this.escapeHtml(servidor.proximaLicenca)}</div>
                `;
            }

            interpretationContent += '</div>';
        }

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

    // Atualizar título do modal - apenas o nome do servidor
        const modalTitle = document.getElementById('modalTitle');
        if (!modalTitle) {
            console.error('Elemento de título do modal não encontrado');
            return;
        }
        modalTitle.textContent = servidor.nome;

    // Exibir modal
        const detailsModal = document.getElementById('detailsModal');
        if (!detailsModal) {
            console.error('Modal de detalhes não encontrado');
            return;
        }
        detailsModal.classList.add('show');
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
            // Mostrar estado vazio
            document.getElementById('totalServidores').textContent = '0';
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
        document.getElementById('totalServidores').textContent = this.allServidores.length;

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
        const statLabel = totalLicencasFuturasElement?.parentElement.querySelector('.stat-label');
        if (statLabel) {
            statLabel.textContent = isLicencaPremio ? 'Licenças Prêmio' : 'Licenças Futuras';
        }

    // Atualizar cards com base no tipo de tabela
        if (isLicencaPremio) {
            this.updateCargoCards();
        } else {
            this.updateUrgencyCards();
        }
    }

    updateUrgencyCards() {
        // Calcular licenças ativas
        const licensasAtivas = this.allServidores.reduce((total, servidor) => {
            const licensasAtivasServidor = servidor.licencas.filter(licenca => {
                const licenseStart = licenca.inicio;
                // Calcular data de término padrão se não fornecida
                let licenseEnd = licenca.fim;
                if (!licenseEnd) {
                    const nextMonth = new Date(licenseStart);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(nextMonth.getDate() - 1);
                    licenseEnd = nextMonth;
                }

                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                // Vrificar se a licença está ativa no período atual
                return hoje >= licenseStart && hoje <= licenseEnd;
            }).length;

            return total + licensasAtivasServidor;
        }, 0);

    // Atualizar contagens de urgência nos cards (dados estáticos)
        const urgencyData = this.getStaticUrgencyData();
        const urgencyKeys = ['critical', 'high', 'moderate', 'low'];
        const urgencyLabels = ['Crítico', 'Alto', 'Moderado', 'Baixo'];

        urgencyKeys.forEach((key, index) => {
            const countElement = document.getElementById(`${key}Count`);
            if (countElement) {
                countElement.textContent = urgencyData.counts[urgencyLabels[index]] || 0;
            }
        });
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
        const now = new Date();
        document.getElementById('lastUpdate').textContent =
            now.toLocaleString('pt-BR', {
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

            if (modal) modal.classList.add('show');
        }
    }

    closeModal() {
    // Fechar modal de detalhes
        document.getElementById('detailsModal').classList.remove('show');
    }

    showProblemsModal() {
    // Abrir modal de problemas carregamento
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

        if (modal) modal.classList.add('show');
    }

    closeProblemsModal() {
    // Fechar modal de problemas
        const modal = document.getElementById('problemsModal');
        if (modal) modal.classList.remove('show');
    }

    closeTimelineModal() {
    // Fechar modal da timeline
        const modal = document.getElementById('timelineModal');
        if (modal) modal.classList.remove('show');
    }

    closePeriodStatsModal() {
    // Fechar modal de estatísticas do período
        const modal = document.getElementById('periodStatsModal');
        if (modal) modal.classList.remove('show');
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
            this.applyLicencaFilters();
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
            this.applyLicencaFilters();
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
        // Resetar filtros para valores padrão
        this.currentFilters = {
            age: { min: 18, max: 70 },
            period: { type: 'yearly', start: 2025, end: 2028 },
            search: '',
            urgency: '',
            selectedData: null
        };

        // Resetar campos de entrada
        document.getElementById('searchInput').value = '';
        document.getElementById('minAge').value = 18;
        document.getElementById('maxAge').value = 70;

        // resetar filtro de mês se existir
        try {
            const mesFilter = document.getElementById('mesFilter');
            if (mesFilter) {
                mesFilter.value = 'all';
                // Disparar evento de mudança para atualizar a tabela
                mesFilter.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } catch (e) {
        }

        this.currentFilters.cargo = '';

        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.classList.remove('active');
        });

        // Usar filtro apropriado baseado no tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        if (isLicencaPremio) {
            this.applyLicencaFilters();
        } else {
            this.applyTableFilter();
        }

        this.updateActiveFilters();
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