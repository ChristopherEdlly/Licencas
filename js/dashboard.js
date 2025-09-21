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

if (typeof DashboardMultiPage === 'undefined') {
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
        this.selectedChartIndex = -1; // Para rastrear fatia selecionada
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initNavigation();
        this.initPeriodTabs();
        this.updateProblemsCount(); // Initialize problems count
        this.loadExampleData();
        this.updateLastUpdate();
        this.setupThemeIntegration();
        
        // Initialize calendar with current year
        const currentYear = new Date().getFullYear();
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (currentYearElement) {
            currentYearElement.textContent = currentYear;
        }
    }

    setupThemeIntegration() {
        // Registrar o chart globalmente para o ThemeManager
        window.dashboardChart = this.charts.urgency;
        
        // Escutar mudanças de tema
        window.addEventListener('themeChanged', (e) => {
            this.onThemeChanged(e.detail.theme);
        });
    }

    onThemeChanged(theme) {
        // Atualizar cores se necessário (mantemos as mesmas cores para consistência)
        // Mas podemos ajustar outros aspectos visuais se necessário
        
        if (this.charts.urgency) {
            // Registrar novamente para o ThemeManager
            window.dashboardChart = this.charts.urgency;
        }
        
        // Outras atualizações de tema podem ser adicionadas aqui
        console.log(`Tema alterado para: ${theme}`);
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebarToggle && sidebar && mainContent) {
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
                
                // Update toggle icon
                const icon = sidebarToggle.querySelector('i');
                if (sidebar.classList.contains('collapsed')) {
                    icon.className = 'bi bi-list';
                    sidebarToggle.title = 'Expandir sidebar';
                } else {
                    icon.className = 'bi bi-x-lg';
                    sidebarToggle.title = 'Recolher sidebar';
                }
                
                // Save state in localStorage
                localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
            });
            
            // Restore sidebar state from localStorage
            const savedState = localStorage.getItem('sidebarCollapsed');
            if (savedState === 'true') {
                sidebar.classList.add('collapsed');
                document.body.classList.add('sidebar-collapsed');
                mainContent.style.marginLeft = '70px';
                const icon = sidebarToggle.querySelector('i');
                icon.className = 'bi bi-list';
                sidebarToggle.title = 'Expandir sidebar';
            } else {
                const icon = sidebarToggle.querySelector('i');
                icon.className = 'bi bi-x-lg';
                sidebarToggle.title = 'Recolher sidebar';
            }
        }
        
        // Upload de arquivo
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // Search with automatic filtering
        const searchInput = document.getElementById('searchInput');
        
        if (searchInput) {
            // Input change to show/hide clear button
            searchInput.addEventListener('input', () => {
                this.toggleClearSearchButton();
                // Auto-apply search filter
                this.handleSearch();
            });
            
            // Enter key triggers search
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            });
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }
        
        // Age filter inputs
        const minAgeInput = document.getElementById('minAge');
        const maxAgeInput = document.getElementById('maxAge');
        if (minAgeInput && maxAgeInput) {
            [minAgeInput, maxAgeInput].forEach(input => {
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
        
                // Page navigation
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
        
        // Period tabs removidos - não existem no novo layout
        // document.querySelectorAll('.period-tab').forEach(tab => {
        //     tab.addEventListener('click', (e) => this.switchPeriodTab(e.target.dataset.period));
        // });
        
        // Table sorting
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => this.handleSort(e.currentTarget.dataset.column));
        });
        
        // Timeline view change
        const timelineView = document.getElementById('timelineView');
        if (timelineView) {
            timelineView.addEventListener('change', (e) => this.updateTimelineView());
        }
        
        // Timeline year change
        const timelineYear = document.getElementById('timelineYear');
        if (timelineYear) {
            timelineYear.addEventListener('change', (e) => this.updateTimelineChart());
        }
        
        // Timeline month change
        const timelineMonth = document.getElementById('timelineMonth');
        if (timelineMonth) {
            timelineMonth.addEventListener('change', (e) => this.updateTimelineChart());
        }
        
        // Calendar year change
        const calendarYear = document.getElementById('calendarYearFilter');
        if (calendarYear) {
            calendarYear.addEventListener('change', (e) => this.updateYearlyHeatmap());
        }

        // Calendar year navigation buttons
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

        // Urgency legend clicks
        document.querySelectorAll('.legend-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.highlightUrgency(e.currentTarget.dataset.urgency);
            });
        });

        // Event listeners para filtros de licenças prêmio
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
        
        // Modal close with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeProblemsModal();
                this.closeTimelineModal();
                this.closePeriodStatsModal();
            }
        });
        
                // Modal backdrop click to close
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
        
        // Modal close button
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Problems modal close button
        const problemsModalCloseBtn = document.getElementById('problemsModalCloseBtn');
        if (problemsModalCloseBtn) {
            problemsModalCloseBtn.addEventListener('click', () => this.closeProblemsModal());
        }
        
        // Timeline modal close button
        const timelineModalCloseBtn = document.getElementById('timelineModalCloseBtn');
        if (timelineModalCloseBtn) {
            timelineModalCloseBtn.addEventListener('click', () => this.closeTimelineModal());
        }

        // Period Stats Modal close button
        const periodStatsModalCloseBtn = document.getElementById('periodStatsModalCloseBtn');
        if (periodStatsModalCloseBtn) {
            periodStatsModalCloseBtn.addEventListener('click', () => this.closePeriodStatsModal());
        }
        
        // Problems card click
        const errorCard = document.getElementById('errorCard');
        if (errorCard) {
            errorCard.addEventListener('click', () => this.showProblemsModal());
        }
        
        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            // Handle servidor details buttons
            if (e.target.closest('.btn-icon[data-servidor-nome]')) {
                const button = e.target.closest('.btn-icon[data-servidor-nome]');
                const nomeServidorEscapado = button.getAttribute('data-servidor-nome');
                // Unescape the name to find the servidor
                const nomeServidor = nomeServidorEscapado.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                this.showServidorDetails(nomeServidor);
            }
            
            // Handle legend card clicks
            if (e.target.closest('.legend-card[data-urgency]')) {
                const legendCard = e.target.closest('.legend-card[data-urgency]');
                const urgency = legendCard.getAttribute('data-urgency');
                const urgencyIndex = ['critical', 'high', 'moderate', 'low'].indexOf(urgency);
                this.filterTableByUrgency(urgency, urgencyIndex);
                
                // Update legend visual state
                document.querySelectorAll('.legend-card').forEach(card => card.classList.remove('active'));
                legendCard.classList.add('active');
            }
            
            // Handle stat-card clicks - devem ser apenas informativos na página home
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
        // Update navigation buttons
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-link[data-page="${pageId}"]`)?.classList.add('active');
        
        // Show/hide pages
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        document.getElementById(`${pageId}Page`).classList.add('active');
        
        // Update page title
        const titles = {
            'home': 'Visão Geral',
            'calendar': 'Calendário',
            'timeline': 'Timeline'
        };
        document.getElementById('pageTitle').textContent = titles[pageId] || pageId;
        
        this.currentPage = pageId;
        
        // Initialize page-specific content
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
        // Hide all page filters
        document.querySelectorAll('.page-filters').forEach(filters => {
            filters.style.display = 'none';
            filters.classList.remove('active');
        });
        
        // Show filters for current page
        const currentFilters = document.getElementById(`${pageId}Filters`);
        if (currentFilters) {
            currentFilters.style.display = 'flex';
            currentFilters.classList.add('active');
        }
        
        // Update filters container visibility
        const filtersBar = document.querySelector('.filters-bar');
        if (filtersBar) {
            filtersBar.style.display = currentFilters ? 'block' : 'none';
        }
    }

    initPeriodTabs() {
        // Função removida - elementos não existem no novo layout
        // Os filtros de ano são aplicados diretamente nos elementos existentes
        const currentYear = new Date().getFullYear();
        console.log('Ano atual:', currentYear);
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
            
            // Update current page content
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
        // Simular verificação de problemas nos dados
        this.allServidores.forEach(servidor => {
            try {
                // Verificar dados inválidos ou inconsistentes
                if (!servidor.nome || servidor.nome.trim() === '') {
                    this.addLoadingProblem(servidor.nome || 'Nome vazio', 'Nome do servidor está vazio ou inválido');
                }
                
                if (!servidor.dataLicenca || isNaN(new Date(servidor.dataLicenca))) {
                    this.addLoadingProblem(servidor.nome, 'Data de licença inválida ou não encontrada');
                }
                
                if (!servidor.lotacao || servidor.lotacao.trim() === '') {
                    this.addLoadingProblem(servidor.nome, 'Lotação não informada');
                }
                
                // Verificar idade inválida
                if (servidor.idade && (servidor.idade < 18 || servidor.idade > 100)) {
                    this.addLoadingProblem(servidor.nome, `Idade suspeita: ${servidor.idade} anos`);
                }
                
                // Verificar datas muito antigas ou muito futuras
                const dataLicenca = new Date(servidor.dataLicenca);
                const anoAtual = new Date().getFullYear();
                if (dataLicenca.getFullYear() < 1990 || dataLicenca.getFullYear() > anoAtual + 50) {
                    this.addLoadingProblem(servidor.nome, `Data de licença suspeita: ${dataLicenca.getFullYear()}`);
                }
                
            } catch (error) {
                this.addLoadingProblem(servidor.nome, `Erro ao validar dados: ${error.message}`);
            }
        });
    }
    
    verificarErrosCronograma() {
        const servidoresComErro = this.allServidores.filter(s => s.cronogramaComErro);
        
        if (servidoresComErro.length > 0) {
            console.warn(`⚠️  Encontrados ${servidoresComErro.length} servidores com cronogramas problemáticos:`);
            
            servidoresComErro.forEach(servidor => {
                console.warn(`- ${servidor.nome}: "${servidor.cronograma}"`);
            });
            
            // Exibir alerta para o usuário
            const nomes = servidoresComErro.map(s => s.nome).join(', ');
            const mensagem = `⚠️  Atenção: ${servidoresComErro.length} servidor(es) com cronogramas ambíguos foram detectados:\n\n${nomes}\n\nEstes cronogramas não puderam ser interpretados por não conterem informações suficientes (ex: ano de início).`;
            
            setTimeout(() => {
                alert(mensagem);
            }, 500);
        }
    }

    // Filtros
    applyAgeFilter() {
        const minAge = parseInt(document.getElementById('minAge').value) || 0;
        const maxAge = parseInt(document.getElementById('maxAge').value) || 100;
        
        this.currentFilters.age = { min: minAge, max: maxAge };
        this.applyAllFilters();
    }

    applyPeriodFilter() {
        // Função desabilitada - elementos period-tab não existem no novo layout
        console.log('Period filter não implementado no novo layout');
        return null;
        
        // const periodType = document.querySelector('.period-tab.active').dataset.period;
        
        let periodFilter = { type: periodType };
        
        if (periodType === 'yearly') {
            periodFilter.start = parseInt(document.getElementById('startYear').value);
            periodFilter.end = parseInt(document.getElementById('endYear').value);
        } else if (periodType === 'monthly') {
            periodFilter.year = parseInt(document.getElementById('monthYearRange').value);
            periodFilter.monthStart = parseInt(document.getElementById('monthStart').value);
            periodFilter.monthEnd = parseInt(document.getElementById('monthEnd').value);
        } else if (periodType === 'daily') {
            periodFilter.year = parseInt(document.getElementById('dailyYear').value);
            periodFilter.month = parseInt(document.getElementById('dailyMonthSelect').value);
        }
        
        this.currentFilters.period = periodFilter;
        this.applyAllFilters();
    }

    switchPeriodTab(period) {
        // Função desabilitada - period tabs não existem no novo layout
        console.log('Period tab switching não implementado no novo layout');
        return;
        
        // Update active tab
        // document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        // Show corresponding controls
        document.querySelectorAll('.period-controls > div').forEach(div => div.classList.remove('active'));
        document.querySelector(`.${period}-controls`).classList.add('active');
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
        
        // Reset period filter
        const currentYear = new Date().getFullYear();
        const startYearInput = document.getElementById('startYear');
        const endYearInput = document.getElementById('endYear');
        if (startYearInput) startYearInput.value = currentYear;
        if (endYearInput) endYearInput.value = currentYear + 3;
        this.currentFilters.period = { type: 'yearly', start: currentYear, end: currentYear + 3 };
        
        // Reset search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.currentFilters.search = '';
        
        // Reset urgency filter
        this.currentFilters.urgency = '';
        
        // Reset filtros específicos de licenças prêmio
        const mesFilter = document.getElementById('mesFilter');
        if (mesFilter) {
            mesFilter.value = '';
        }
        this.currentFilters.cargo = ''; // Reset cargo filter
        
        // Reset period tabs - removido do novo layout
        // document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
        // document.querySelector('[data-period="yearly"]').classList.add('active');
        // document.querySelectorAll('.period-controls > div').forEach(div => div.classList.remove('active'));
        // document.querySelector('.yearly-controls').classList.add('active');
        
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

    // Filtros específicos para licenças prêmio
    applyLicencaFilters() {
        const mesFilter = document.getElementById('mesFilter')?.value?.trim() || '';
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';
        
        console.log('ApplyLicencaFilters Debug:', {
            mesFilter,
            searchTerm,
            cargoFilter: this.currentFilters.cargo,
            beforeFilter: this.allServidores.length
        });
        
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
        
        console.log('ApplyLicencaFilters Result:', {
            beforeFilter: this.allServidores.length,
            afterFilter: this.filteredServidores.length,
            hasFilters: !!(mesFilter || searchTerm || this.currentFilters.cargo)
        });
        
        this.updateTable();
        this.updateStats();
        this.updateHeaderStatus();
        this.updateTimelineChart(); // Atualizar timeline quando filtros mudarem
    }

    // Verificar se o servidor tem licença no mês especificado
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
        
        const inicioMonth = inicio.getMonth(); // 0-based
        const fimMonth = fim.getMonth(); // 0-based
        const inicioYear = inicio.getFullYear();
        const fimYear = fim.getFullYear();
        
        // Se é o mesmo ano, verificar se o mês está entre início e fim (inclusive)
        if (inicioYear === fimYear) {
            return targetMonthIndex >= inicioMonth && targetMonthIndex <= fimMonth;
        }
        
        // Se licença atravessa anos (ex: dezembro 2025 - fevereiro 2026)
        // Precisamos verificar se o mês alvo está em qualquer um dos períodos
        
        // Para ano de início: mês alvo deve estar entre inicioMonth e dezembro
        if (targetMonthIndex >= inicioMonth) {
            return true;
        }
        
        // Para ano de fim: mês alvo deve estar entre janeiro e fimMonth
        if (targetMonthIndex <= fimMonth) {
            return true;
        }
        
        return false;
    }

    // Função melhorada de busca que funciona para ambos os tipos
    matchesSearch(servidor, searchTerm) {
        const searchableFields = [
            servidor.nome,
            servidor.cargo,
            servidor.urgencia || servidor.nivelUrgencia // Para compatibilidade com ambos os tipos
        ].filter(field => field); // Remove campos null/undefined
        
        return searchableFields.some(field => 
            field && field.toLowerCase().includes(searchTerm)
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

        // Use performance timing for debugging
        const startTime = performance.now();
        
        const filters = this.currentFilters;
        
        this.filteredServidores = this.allServidores.filter(servidor => {
            // Quick age filter check first (most common filter)
            if (servidor.idade < filters.age.min || servidor.idade > filters.age.max) {
                return false;
            }
            
            // Search filter (use early return for performance)
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
            
            // Period filter optimization - only check if servidor has licenses
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

        // Debug performance
        const endTime = performance.now();
        if (endTime - startTime > 10) {
            console.warn(`Filter performance: ${(endTime - startTime).toFixed(2)}ms for ${this.allServidores.length} servers`);
        }

        this.updateStats();
        this.updateHeaderStatus();
        
        // Update current page
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
        
        // Destroy existing chart
        if (this.charts.urgency) {
            this.charts.urgency.destroy();
        }

        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';
        
        // Update chart title
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
                            // Para aposentadorias, limpar filtro de urgência
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

        // Update legend counts with static data
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

        // Update legend counts with static data
        this.updateCargoLegend(this.getStaticCargoData());
    }

    createTimelineChart() {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;
        
        // Initialize controls if not already done
        if (!ctx.dataset.controlsInitialized) {
            this.initializeTimelineControls();
            ctx.dataset.controlsInitialized = 'true';
        }
        
        // Destroy existing chart
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        // Ensure filtered servidores are available for timeline
        if (!this.filteredServidores) {
            console.log('Initializing filteredServidores from allServidores for timeline (first time only)');
            this.filteredServidores = [...this.allServidores];
        } else {
            console.log('Using existing filteredServidores for timeline:', this.filteredServidores.length);
        }

        // Check if we have any data source (filteredServidores can be empty due to filters)
        if (!this.filteredServidores) {
            console.warn('No data source available for timeline chart');
            return;
        }

        const timelineData = this.getTimelineData();

        // Validate timeline data (empty is okay with filters)
        if (!timelineData || !timelineData.labels) {
            console.warn('Invalid timeline data structure');
            return;
        }
        
        console.log('Timeline chart data:', {
            labels: timelineData.labels.length,
            dataPoints: timelineData.data.length,
            filteredServidores: this.filteredServidores.length
        });

        // Update stats
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
                                return `${context[0].label}`;
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
                        
                        console.log('Chart clicked:', { index, period, label });
                        
                        // Show details for specific clicked point
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
        // Atualizar estatísticas
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
        
        // Atualizar elementos DOM
        document.getElementById('totalLicensesCount').textContent = totalLicenses;
        document.getElementById('activeServersCount').textContent = activeServers.size;
        document.getElementById('peakPeriod').textContent = peakPeriod;
        document.getElementById('averageLicenses').textContent = averageLicenses.toFixed(1);
        
        // Gerar insights
        this.generateTimelineInsights(timelineData, {
            totalLicenses,
            activeServers: activeServers.size,
            peakPeriod,
            averageLicenses
        });
    }

    generateTimelineInsights(timelineData, stats) {
        const insightsContainer = document.getElementById('timelineInsights');
        if (!insightsContainer) return;
        
        const insights = [];
        
        // Insight sobre pico de licenças
        if (stats.peakPeriod !== '-') {
            insights.push({
                title: 'Período de Maior Demanda',
                description: `O período ${stats.peakPeriod} registrou o maior número de licenças, com ${Math.max(...timelineData.data)} servidores em licença. Considere planejar recursos adicionais para períodos similares.`,
                type: 'warning'
            });
        }
        
        // Insight sobre média
        if (stats.averageLicenses > 0) {
            const aboveAverage = timelineData.data.filter(val => val > stats.averageLicenses).length;
            const percentage = ((aboveAverage / timelineData.data.length) * 100).toFixed(0);
            
            insights.push({
                title: 'Distribuição de Licenças',
                description: `${percentage}% dos períodos ficaram acima da média (${stats.averageLicenses.toFixed(1)} licenças). ${percentage > 50 ? 'Há uma tendência de concentração em períodos específicos.' : 'A distribuição está bem equilibrada ao longo do tempo.'}`,
                type: 'info'
            });
        }
        
        // Insight sobre tendência
        const firstHalf = timelineData.data.slice(0, Math.floor(timelineData.data.length / 2));
        const secondHalf = timelineData.data.slice(Math.floor(timelineData.data.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.2) {
            insights.push({
                title: 'Tendência Crescente',
                description: `Há um aumento de ${((secondAvg - firstAvg) / firstAvg * 100).toFixed(0)}% nas licenças comparando a primeira e segunda metade do período. Monitore esta tendência para futuro planejamento.`,
                type: 'warning'
            });
        } else if (firstAvg > secondAvg * 1.2) {
            insights.push({
                title: 'Tendência Decrescente',
                description: `Há uma redução de ${((firstAvg - secondAvg) / firstAvg * 100).toFixed(0)}% nas licenças comparando a primeira e segunda metade do período. Isso pode indicar melhoria na gestão.`,
                type: 'success'
            });
        }
        
        // Renderizar insights
        insightsContainer.innerHTML = insights.map(insight => `
            <div class="insight-item ${insight.type}">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `).join('');
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
            // Ajustar para mês baseado em 1 (HTML)
            const currentMonth = new Date().getMonth() + 1;
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
            
            // Initialize visibility
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
        // Ajustar para mês baseado em 0 (JavaScript)
        const selectedMonthFromHTML = parseInt(document.getElementById('timelineMonth')?.value) || (new Date().getMonth() + 1);
        const selectedMonth = selectedMonthFromHTML - 1; // Converter de 1-12 para 0-11
        
        console.log('Period stats debug:', { viewType, selectedYear, selectedMonth: selectedMonth + 1, selectedMonthFromHTML });
        
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
        
        // Filter servers for the period
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
        
        console.log('Filtered servers for period:', servidores.length, 'found for', periodLabel);
        
        this.showPeriodStatsModal(periodLabel, servidores, periodFilter);
    }

    showDayDetails(period, label, servidoresNames) {
        console.log('Timeline day details:', { period, label, servidoresNames });
        
        // Filter servers that have licenses on this specific day/month/year
        const servidores = this.filteredServidores.filter(servidor => {
            return servidor.licencas.some(licenca => {
                if (period.type === 'day') {
                    return licenca.inicio.getFullYear() === period.year &&
                           licenca.inicio.getMonth() === period.month &&
                           licenca.inicio.getDate() === period.day;
                } else if (period.type === 'month') {
                    return licenca.inicio.getFullYear() === period.year &&
                           licenca.inicio.getMonth() === period.month;
                } else if (period.type === 'year') {
                    return licenca.inicio.getFullYear() === period.value;
                }
                return false;
            });
        });

        // Get modal elements
        const modal = document.getElementById('timelineModal');
        const modalTitle = document.getElementById('timelineModalTitle');
        const serversList = document.getElementById('timelineServersList');
        const serversCount = document.getElementById('serversCount');
        
        if (!modal || !modalTitle || !serversList || !serversCount) {
            console.error('Timeline modal elements not found');
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

        // Create clean servers list
        if (servidores.length === 0) {
            serversList.innerHTML = '<p class="text-muted">Nenhum servidor em licença neste período.</p>';
        } else {
            serversList.innerHTML = servidores.map(servidor => {
                const urgencyClass = servidor.nivelUrgencia ? 
                    `urgency-${servidor.nivelUrgencia.toLowerCase()}` : 'urgency-low';
                
                return `
                    <div class="timeline-server-item">
                        <div class="timeline-server-info">
                            <div class="timeline-server-name">${this.escapeHtml(servidor.nome)}</div>
                            <div class="timeline-server-details">
                                <span><i class="bi bi-person-badge"></i> ${servidor.cargo || 'Não informado'}</span>
                                <span><i class="bi bi-calendar-date"></i> ${servidor.idade || 'N/A'} anos</span>
                                <span><i class="bi bi-building"></i> ${servidor.lotacao || 'Não informado'}</span>
                            </div>
                        </div>
                        <div class="timeline-server-actions">
                            ${servidor.nivelUrgencia ? 
                                `<span class="status-badge ${urgencyClass}">${servidor.nivelUrgencia}</span>` : ''}
                            <button class="btn-icon" onclick="dashboard.showServidorDetails('${this.escapeHtml(servidor.nome)}')" title="Ver detalhes completos">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Show modal
        modal.classList.add('show');
    }

    showPeriodStatsModal(periodLabel, servidores, periodFilter) {
        const modal = document.getElementById('periodStatsModal');
        const modalTitle = document.getElementById('periodStatsModalTitle');
        const statsGrid = document.getElementById('periodStatsGrid');
        
        if (!modal || !modalTitle || !statsGrid) {
            console.error('Period stats modal elements not found');
            return;
        }

        modalTitle.textContent = `Estatísticas - ${periodLabel}`;

        // Calculate comprehensive statistics
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
                    // Track which months have licenses
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
        const criticalUrgency = urgencyStats['Crítico'] + urgencyStats['Alto'];
        const totalMonthsWithLicenses = monthsWithLicenses.size;

        // Create stats cards
        statsGrid.innerHTML = `
            <div class="stats-card servers">
                <div class="stats-card-icon">
                    <i class="bi bi-people"></i>
                </div>
                <div class="stats-card-value">${servidores.length}</div>
                <div class="stats-card-label">Servidores em Licença</div>
                <div class="stats-card-description">Total de servidores com licenças no período</div>
            </div>

            <div class="stats-card licenses">
                <div class="stats-card-icon">
                    <i class="bi bi-calendar-check"></i>
                </div>
                <div class="stats-card-value">${totalLicenses}</div>
                <div class="stats-card-label">Total de Licenças</div>
                <div class="stats-card-description">Quantidade total de licenças concedidas</div>
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

        modal.classList.add('show');
    }

    exportTimelineData() {
        if (!this.charts.timeline) return;
        
        const chart = this.charts.timeline;
        const canvas = chart.canvas;
        
        // Create download link
        const link = document.createElement('a');
        link.download = `timeline-licencas-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    // Yearly Heatmap (GitHub style)
    updateYearlyHeatmap(year = null) {
        if (!year) {
            const yearElement = document.getElementById('currentCalendarYear');
            year = yearElement ? parseInt(yearElement.textContent) : new Date().getFullYear();
        }
        
        const container = document.getElementById('yearlyHeatmap');
        
        if (!container) return;
        
        // Update year display
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (currentYearElement) {
            currentYearElement.textContent = year;
        }
        
        // Check if we have valid data
        if (!this.filteredServidores || this.filteredServidores.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhum dado disponível para visualização.</p>';
            return;
        }
        
        container.innerHTML = '';
        
        // Create months container
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
        
        // Month header
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        monthHeader.textContent = this.getMonthName(month);
        monthDiv.appendChild(monthHeader);
        
        // Days of week header
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
        
        // Calendar grid
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Calculate license data for this month
        const dayData = {};
        this.filteredServidores.forEach(servidor => {
            servidor.licencas.forEach(licenca => {
                // Check if license overlaps with this month
                const licenseStart = licenca.inicio;
                // Calculate license end: same day next month minus 1 day
                let licenseEnd = licenca.fim;
                if (!licenseEnd) {
                    const nextMonth = new Date(licenseStart);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(nextMonth.getDate() - 1);
                    licenseEnd = nextMonth;
                }
                
                // Debugging for license premium data
                if (servidor.tipoTabela === 'licenca-premio') {
                    console.log('License premium data:', {
                        servidor: servidor.nome,
                        tipo: licenca.tipo,
                        inicio: licenseStart,
                        fim: licenseEnd,
                        monthChecking: `${year}-${month+1}`
                    });
                }
                
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);
                
                // If license overlaps with this month
                if (licenseStart <= monthEnd && licenseEnd >= monthStart) {
                    // Calculate which days in this month are covered
                    let startDay, endDay;
                    
                    // For license premium data, handle month-spanning periods more carefully
                    if (servidor.tipoTabela === 'licenca-premio') {
                        // If license starts in this month or before, start from day 1
                        if (licenseStart <= monthStart) {
                            startDay = 1;
                        } else {
                            startDay = licenseStart.getDate();
                        }
                        
                        // If license ends in this month or after, end at last day of month
                        if (licenseEnd >= monthEnd) {
                            endDay = new Date(year, month + 1, 0).getDate();
                        } else {
                            endDay = licenseEnd.getDate();
                        }
                    } else {
                        // Original logic for retirement cronograms
                        startDay = Math.max(1, licenseStart.getMonth() === month && licenseStart.getFullYear() === year ? licenseStart.getDate() : 1);
                        endDay = Math.min(
                            new Date(year, month + 1, 0).getDate(),
                            licenseEnd.getMonth() === month && licenseEnd.getFullYear() === year ? licenseEnd.getDate() : new Date(year, month + 1, 0).getDate()
                        );
                    }
                    
                    // Add count to each day covered by the license
                    for (let day = startDay; day <= endDay; day++) {
                        dayData[day] = (dayData[day] || 0) + 1;
                    }
                }
            });
        });
        
        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarGrid.appendChild(emptyCell);
        }
        
        // Days of the month
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
                // Calculate license end: same day next month minus 1 day
                let licenseEnd = licenca.fim;
                if (!licenseEnd) {
                    const nextMonth = new Date(licenseStart);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(nextMonth.getDate() - 1);
                    licenseEnd = nextMonth;
                }
                
                // Check if the target date falls within the license period
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
                            <p class="server-details">${servidor.cargo || 'Cargo não informado'} • ${licenseInfo}</p>
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
        console.log('Show servidores period debug:', { period, label });
        
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

        console.log('Filtered servers for period:', servidores.length);
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
        
        // Adicionar event listeners para os botões de detalhes
        setTimeout(() => {
            const detailButtons = modal.querySelectorAll('.btn-icon[data-servidor-nome]');
            detailButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const nomeServidor = btn.getAttribute('data-servidor-nome');
                    const servidor = servidores.find(s => s.nome === nomeServidor);
                    if (servidor) {
                        this.showServidorDetails(servidor);
                    }
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
        // Switch to home page and apply filter
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
        
        // Apply filters
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
        
        // Apply filters
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

        // Apply age filter
        if (this.currentFilters.age) {
            filtered = filtered.filter(servidor => 
                servidor.idade >= this.currentFilters.age.min && 
                servidor.idade <= this.currentFilters.age.max
            );
        }

        // Apply search filter
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(servidor => 
                servidor.nome.toLowerCase().includes(search) ||
                (servidor.cargo && servidor.cargo.toLowerCase().includes(search)) ||
                (servidor.lotacao && servidor.lotacao.toLowerCase().includes(search))
            );
        }

        // Apply urgency filter
        if (this.currentFilters.urgency) {
            filtered = filtered.filter(servidor => 
                servidor.nivelUrgencia && servidor.nivelUrgencia.toLowerCase() === this.currentFilters.urgency.toLowerCase()
            );
        }

        // Apply cargo filter (for licenças prêmio)
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
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            labels: sortedCargos.map(([cargo]) => cargo),
            values: sortedCargos.map(([,count]) => count),
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
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        return {
            labels: sortedCargos.map(([cargo]) => cargo),
            values: sortedCargos.map(([,count]) => count),
            counts: cargoCount
        };
    }

    getTimelineData() {
        const viewType = document.getElementById('timelineView') ? 
                         document.getElementById('timelineView').value : 'monthly';
        const selectedYear = parseInt(document.getElementById('timelineYear')?.value) || new Date().getFullYear();
        // Ajustar para mês baseado em 0 (JavaScript)
        const selectedMonthFromHTML = parseInt(document.getElementById('timelineMonth')?.value) || (new Date().getMonth() + 1);
        const selectedMonth = selectedMonthFromHTML - 1; // Converter de 1-12 para 0-11
        const data = {};
        
        console.log('Timeline Data Debug:', { 
            viewType, 
            selectedYear, 
            selectedMonth: selectedMonth + 1, 
            selectedMonthFromHTML,
            filteredServidoresCount: this.filteredServidores.length,
            allServidoresCount: this.allServidores.length
        });
        
        // Debug license premium data
        const isLicencaPremio = this.filteredServidores.length > 0 && this.filteredServidores[0].tipoTabela === 'licenca-premio';
        if (isLicencaPremio) {
            console.log('Timeline processing license premium data, view type:', viewType);
            console.log('Filtered servidores:', this.filteredServidores.map(s => s.nome));
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
                } else if (viewType === 'daily') {
                    // Filtrar apenas os dias do mês/ano selecionado
                    const licenseYear = licenca.inicio.getFullYear();
                    const licenseMonth = licenca.inicio.getMonth();
                    
                    if (licenseYear === selectedYear && licenseMonth === selectedMonth) {
                        const day = licenca.inicio.getDate();
                        key = day.toString();
                        period = { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear };
                    } else {
                        shouldInclude = false;
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
                }
                
                if (!shouldInclude) return;
                
                filteredLicenses++;
                
                // Debug license premium data in timeline
                if (servidor.tipoTabela === 'licenca-premio' && isLicencaPremio) {
                    console.log('Timeline license premium entry:', {
                        servidor: servidor.nome,
                        tipo: licenca.tipo,
                        inicio: licenca.inicio,
                        key: key,
                        period: period
                    });
                }
                
                // Incrementar contador (o objeto já existe do esqueleto)
                if (!data[key]) {
                    // Fallback caso o esqueleto não tenha criado (caso edge)
                    data[key] = { count: 0, period, servidores: new Set() };
                }
                data[key].count++;
                data[key].servidores.add(servidor.nome);
            });
        });

        console.log('Timeline data processed:', {
            periodsFound: Object.keys(data).length,
            totalLicenses,
            filteredLicenses,
            yearFilter: selectedYear,
            viewType
        });

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
        
        console.log('Timeline result:', result);
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
            
            // Update timeline stats
            this.updateTimelineStats(timelineData);
        } else {
            // If chart doesn't exist, create it
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
            
            // Update custom legend counts
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
        
        // Create grid layout for cargo legends
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

        // Apply sorting
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
            
            if (isLicencaPremio) {
                // Formato para tabela de licenças prêmio
                let periodoLicenca = '--';
                if (servidor.licencas && servidor.licencas.length > 0) {
                    periodoLicenca = servidor.licencas[0].descricao || proximaLicencaTexto;
                }
                
                row.innerHTML = `
                    <td><strong>${nomeEscapado}</strong></td>
                    <td><span class="cargo-badge">${cargoEscapado}</span></td>
                    <td>${periodoLicenca}</td>
                    <td class="actions">
                        <button class="btn-icon" data-servidor-nome="${nomeEscapado}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
            } else {
                // Formato para tabela original de aposentadorias
                row.innerHTML = `
                    <td><strong>${nomeEscapado}</strong></td>
                    <td>${servidor.idade}</td>
                    <td><span class="lotacao-badge">${lotacaoEscapada}</span></td>
                    <td>${proximaLicencaTexto}</td>
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

        // Update table info
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

        // Update UI
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
        const servidor = this.allServidores.find(s => s.nome === nomeServidor);
        if (!servidor) return;

        // Detectar se é tabela de licenças prêmio
        const isLicencaPremio = servidor.tipoTabela === 'licenca-premio';

        // Informações Pessoais (sem repetir o nome)
        const personalInfoContent = `
            <div class="info-grid">                
                <div class="info-label">Cargo/Função:</div>
                <div class="info-value">${this.escapeHtml(servidor.cargo || 'Não informado')}</div>
                
                ${servidor.idade ? `
                    <div class="info-label">Idade:</div>
                    <div class="info-value">${servidor.idade} anos</div>
                ` : ''}
                
                ${servidor.lotacao ? `
                    <div class="info-label">Lotação:</div>
                    <div class="info-value">${this.escapeHtml(servidor.lotacao)}</div>
                ` : ''}
            </div>
        `;

        // Dados Originais (sem repetir o nome do servidor)
        let originalDataContent = '<div class="info-grid">';
        
        if (servidor.dadosOriginais) {
            Object.entries(servidor.dadosOriginais).forEach(([key, value]) => {
                // Pular campos do nome do servidor para evitar repetição
                if (key.toUpperCase() === 'SERVIDOR' || key.toUpperCase() === 'NOME') {
                    return;
                }
                
                if (value && value !== '' && value !== 'undefined' && value !== 'null') {
                    originalDataContent += `
                        <div class="info-label">${this.escapeHtml(key)}:</div>
                        <div class="info-value">${this.escapeHtml(String(value))}</div>
                    `;
                }
            });
        } else {
            originalDataContent += `
                <div class="info-label">Status:</div>
                <div class="info-value warning">Dados originais não disponíveis</div>
            `;
        }
        originalDataContent += '</div>';

        // Interpretação do Sistema
        let interpretationContent = '';
        const issues = [];

        if (isLicencaPremio) {
            interpretationContent = '<div class="info-grid">';
            
            if (servidor.licencas && servidor.licencas.length > 0) {
                interpretationContent += `
                    <div class="info-label">Licenças Processadas:</div>
                    <div class="info-value">${servidor.licencas.length} licença(s)</div>
                `;
                
                servidor.licencas.forEach((licenca, index) => {
                    interpretationContent += `
                        <div class="info-label">Licença ${index + 1}:</div>
                        <div class="info-value">${this.formatDateRange(licenca.inicio, licenca.fim)}
                            ${licenca.descricao ? `<br><small>${this.escapeHtml(licenca.descricao)}</small>` : ''}
                        </div>
                    `;
                    
                    // Verificar possíveis problemas
                    if (!licenca.inicio || !licenca.fim) {
                        issues.push({
                            title: `Licença ${index + 1} com data incompleta`,
                            description: 'O sistema não conseguiu identificar corretamente as datas de início e/ou fim desta licença.'
                        });
                    }
                });
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
            // Para cronograma de aposentadoria
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

        // Populate modal sections
        const personalInfoElement = document.getElementById('personalInfoContent');
        const originalDataElement = document.getElementById('originalDataContent');
        const interpretationElement = document.getElementById('interpretationContent');
        
        if (!personalInfoElement || !originalDataElement || !interpretationElement) {
            console.error('Modal elements not found:', {
                personalInfoContent: !!personalInfoElement,
                originalDataContent: !!originalDataElement,
                interpretationContent: !!interpretationElement
            });
            return;
        }
        
        personalInfoElement.innerHTML = personalInfoContent;
        originalDataElement.innerHTML = originalDataContent;
        interpretationElement.innerHTML = interpretationContent;

        // Handle issues section
        const issuesSection = document.getElementById('issuesSection');
        const issuesContent = document.getElementById('issuesContent');
        
        if (!issuesSection || !issuesContent) {
            console.error('Issues elements not found:', {
                issuesSection: !!issuesSection,
                issuesContent: !!issuesContent
            });
            return;
        }
        
        if (issues.length > 0) {
            issuesSection.style.display = 'block';
            const issuesHtml = issues.map(issue => `
                <div class="issue-highlight">
                    <div class="issue-title">${this.escapeHtml(issue.title)}</div>
                    <div class="issue-description">${this.escapeHtml(issue.description)}</div>
                </div>
            `).join('');
            issuesContent.innerHTML = issuesHtml;
        } else {
            issuesSection.style.display = 'none';
        }

        // Update modal title - apenas o nome do servidor
        const modalTitle = document.getElementById('modalTitle');
        if (!modalTitle) {
            console.error('Modal title element not found');
            return;
        }
        modalTitle.textContent = servidor.nome;

        // Show modal
        const detailsModal = document.getElementById('detailsModal');
        if (!detailsModal) {
            console.error('Details modal not found');
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
    // Utility functions
    updateStats() {
        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';
        
        // Update header stats
        document.getElementById('totalServidores').textContent = this.allServidores.length;
        
        // Calculate future licenses (licenses starting from today onwards)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        
        const licencasFuturas = this.allServidores.reduce((total, servidor) => {
            const licencasFuturasServidor = servidor.licencas.filter(licenca => {
                const licenseStart = licenca.inicio;
                // Check if license starts today or in the future
                return licenseStart >= hoje;
            }).length;
            
            return total + licencasFuturasServidor;
        }, 0);
        
        // Update header elements with appropriate labels
        const totalLicencasFuturasElement = document.getElementById('totalLicencasFuturas');
        if (totalLicencasFuturasElement) {
            totalLicencasFuturasElement.textContent = licencasFuturas;
        }
        
        // Update label based on table type
        const statLabel = totalLicencasFuturasElement?.parentElement.querySelector('.stat-label');
        if (statLabel) {
            statLabel.textContent = isLicencaPremio ? 'Licenças Prêmio' : 'Licenças Futuras';
        }

        // Update cards based on table type
        if (isLicencaPremio) {
            this.updateCargoCards();
        } else {
            this.updateUrgencyCards();
        }
    }

    updateUrgencyCards() {
        // Calculate active licenses for the home page cards (static - not affected by filters)
        const licensasAtivas = this.allServidores.reduce((total, servidor) => {
            const licensasAtivasServidor = servidor.licencas.filter(licenca => {
                const licenseStart = licenca.inicio;
                // Calculate license end: same day next month minus 1 day
                let licenseEnd = licenca.fim;
                if (!licenseEnd) {
                    const nextMonth = new Date(licenseStart);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    nextMonth.setDate(nextMonth.getDate() - 1);
                    licenseEnd = nextMonth;
                }
                
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                // Check if today is within the license period
                return hoje >= licenseStart && hoje <= licenseEnd;
            }).length;
            
            return total + licensasAtivasServidor;
        }, 0);
        
        // Update urgency counts in cards (static data)
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

        // Encontrar os cards existentes de urgência e atualizar seu conteúdo para mostrar cargos
        const existingCards = statsCards.querySelectorAll('.stat-card');
        const topCargos = cargoData.labels.slice(0, 4);
        const cargoIcons = ['bi-briefcase', 'bi-person-badge', 'bi-building', 'bi-gear'];

        topCargos.forEach((cargo, index) => {
            const count = cargoData.counts[cargo] || 0;
            const card = existingCards[index];
            
            if (card) {
                // Atualizar conteúdo do card existente sem remover event listeners
                const countElement = card.querySelector('h3');
                const labelElement = card.querySelector('p');
                const iconElement = card.querySelector('i');
                
                if (countElement) countElement.textContent = count;
                if (labelElement) labelElement.textContent = cargo;
                if (iconElement) {
                    iconElement.className = `bi ${cargoIcons[index]}`;
                }
                
                // Remover handlers anteriores e adicionar novo
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                
                // Add click handler for filtering
                newCard.addEventListener('click', () => {
                    this.filterTableByCargo(cargo, index);
                });
            }
        });
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
        console.log('Opening modal:', title);
        
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
        console.log('Closing modal');
        document.getElementById('detailsModal').classList.remove('show');
    }

    showProblemsModal() {
        console.log('Opening problems modal');
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
                    </div>
                </div>
            `).join('');
        }
        
        if (modal) modal.classList.add('show');
    }

    closeProblemsModal() {
        console.log('Closing problems modal');
        const modal = document.getElementById('problemsModal');
        if (modal) modal.classList.remove('show');
    }

    closeTimelineModal() {
        console.log('Closing timeline modal');
        const modal = document.getElementById('timelineModal');
        if (modal) modal.classList.remove('show');
    }

    closePeriodStatsModal() {
        console.log('Closing period stats modal');
        const modal = document.getElementById('periodStatsModal');
        if (modal) modal.classList.remove('show');
    }

    addLoadingProblem(name, error) {
        this.loadingProblems.push({ name, error });
        this.updateProblemsCount();
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
        
        // Update card visibility/state based on problems count
        const errorCard = document.getElementById('errorCard');
        if (errorCard) {
            if (this.loadingProblems.length > 0) {
                errorCard.style.opacity = '1';
                errorCard.style.cursor = 'pointer';
            } else {
                errorCard.style.opacity = '0.6';
                errorCard.style.cursor = 'default';
            }
        }
    }

    // Utility function to escape HTML to prevent XSS
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

    // Modern Header Functions
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

    // Page-specific filter functions
    updateCalendarYear() {
        const selectedYear = document.getElementById('calendarYearFilter')?.value;
        if (selectedYear) {
            // Update the calendar display
            this.updateYearlyHeatmap(parseInt(selectedYear));
        }
    }

    applyTimeRange() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (startDate && endDate) {
            // Apply time range filter to timeline
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
        
        // Update timeline chart if on timeline page
        if (this.currentPage === 'timeline') {
            this.createTimelineChart();
        }
    }

    populateDepartmentFilter() {
        const deptFilter = document.getElementById('departmentFilter');
        if (!deptFilter || !this.allServidores.length) return;
        
        // Get unique departments
        const departments = [...new Set(this.allServidores.map(s => s.lotacao))].filter(Boolean).sort();
        
        // Clear existing options (except "Todos")
        while (deptFilter.children.length > 1) {
            deptFilter.removeChild(deptFilter.lastChild);
        }
        
        // Add department options
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
        // Remove active class from all presets
        document.querySelectorAll('.btn-preset').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to matching preset
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
        // Reset all filters
        this.currentFilters = {
            age: { min: 18, max: 70 },
            period: { type: 'yearly', start: 2025, end: 2028 },
            search: '',
            urgency: '',
            selectedData: null
        };

        // Reset UI elements
        document.getElementById('searchInput').value = '';
        document.getElementById('minAge').value = 18;
        document.getElementById('maxAge').value = 70;
        
        // Remove active preset highlighting
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

        // Search filter
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

        // Age filter (only show if not default)
        if (this.currentFilters.age.min !== 18 || this.currentFilters.age.max !== 70) {
            filters.push({
                type: 'age',
                label: `Idade: ${this.currentFilters.age.min}-${this.currentFilters.age.max}`,
                remove: () => {
                    this.setAgePreset(18, 70);
                }
            });
        }

        // Create filter elements
        filters.forEach(filter => {
            const filterElement = document.createElement('span');
            filterElement.className = 'active-filter';
            filterElement.innerHTML = `
                ${filter.label}
                <span class="remove">×</span>
            `;
            
            // Add click handler for remove
            filterElement.querySelector('.remove').addEventListener('click', (e) => {
                e.stopPropagation();
                filter.remove();
            });

            activeFiltersContainer.appendChild(filterElement);
        });
    }

    updateHeaderStatus() {
        // Update total count
        const totalElement = document.getElementById('totalServidores');
        if (totalElement) {
            totalElement.textContent = this.allServidores.length;
        }

        // Update filtered count
        const filteredElement = document.getElementById('filteredCount');
        if (filteredElement) {
            filteredElement.textContent = this.filteredServidores.length;
        }
    }

    loadExampleData() {
        const exampleCSV = `SERVIDOR,CPF,DN,SEXO,IDADE,ADMISSÃO,MESES,LOTAÇÃO,SUPERINTENDENCIA,SUBSECRETARIA,CARGO,CRONOGRAMA
GILVAN DE LIMA,,16/9/1964,MAS,61,13/9/1989,3,GEROT,SUTRI,SURE,AFT,Meses: 09/2026; 09/2027; 09/2028
ISRAEL BATISTA FRANÇA JUNIOR,,12/1/1965,MAS,60,14/9/1989,12,GEROT,SUTRI,SURE,AFT,A partir de 01/04/2026
JOSE ROBERTO DE ARAGÃO,,22/7/1968,MAS,57,14/9/1989,12,SUTRI,SUTRI,SURE,AFT,16/11/25 (um mês) e janeiro de cada ano
ROGERIO LUIZ SANTOS FREITAS,,1/5/1966,MAS,59,14/9/1989,9,GELEG,SUTRI,SURE,AFT,jan/2026 uma por ano
CARLOS ANDRADE,,15/05/1961,MAS,64,01/03/1987,12,GELEG,SUTRI,SURE,AFT,Início em 10/2025 (12 meses consecutivos)
MARIANA COSTA,,01/07/1980,FEM,45,01/02/2005,65,GELEG,SUTRI,SURE,AFT,Meses: 03/2028; 04/2028; e 05/2028
PEDRO MARTINS,,12/01/1985,MAS,40,10/08/2010,15,GELEG,SUTRI,SURE,AFT,Meses: 06/2027; 07/2027; e 08/2027
ANA SILVA,,25/03/1978,FEM,47,05/06/2000,24,SUTRI,SUTRI,SURE,AFT,jan/2025 uma por ano
JOÃO SANTOS,,10/12/1972,MAS,53,20/01/1995,36,GEROT,SUTRI,SURE,AFT,Meses: 02/2025; 08/2025; 02/2026
MARIA OLIVEIRA,,03/08/1983,FEM,42,15/09/2008,18,GELEG,SUTRI,SURE,AFT,jul/2025 uma por ano`;
        
        this.processData(exampleCSV);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardMultiPage();
});

}