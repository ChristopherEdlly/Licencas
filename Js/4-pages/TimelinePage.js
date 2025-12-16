/**
 * TimelinePage - Controller da página de timeline
 *
 * Responsabilidades:
 * - Gerenciar visualização da timeline de licenças
 * - Coordenar TimelineManager (renderização do gráfico)
 * - Controlar modos de visualização (diário/mensal/anual)
 * - Gerenciar filtros de período
 * - Responder a eventos de filtros e busca
 *
 * @class TimelinePage
 */
class TimelinePage {
    /**
     * @param {Object} app - Referência ao App principal
     */
    constructor(app) {
        this.app = app;

        // Estado da página
        this.isActive = false;
        this.isInitialized = false;

        // Estado da timeline
        this.currentView = 'monthly'; // 'daily', 'monthly', 'yearly'
        this.currentPeriod = {
            daily: null,       // Date ou null
            monthly: {         // { start: Date, end: Date } ou null
                start: null,
                end: null
            },
            yearly: {          // { start: year, end: year } ou null
                start: null,
                end: null
            }
        };

        // Referências aos managers (serão inicializados no init)
        this.dataStateManager = null;
        this.timelineManager = null;
        this.exportManager = null;

        // Elementos do DOM (lazy loading)
        this.elements = {
            page: null,
            timelineView: null,
            timelineChart: null,
            timelineDailyGroup: null,
            timelineDailyMonth: null,
            timelinePeriodRangeGroupMonthly: null,
            timelinePeriodStartMonth: null,
            timelinePeriodEndMonth: null,
            timelinePeriodRangeGroupYearly: null,
            timelinePeriodStartYear: null,
            timelinePeriodEndYear: null,
            showPeriodStatsBtn: null,
            exportTimelineBtn: null
        };

        // Event listeners registrados (para cleanup)
        this.eventListeners = [];

        console.log('✅ TimelinePage instanciado');
    }

    /**
     * Inicializa a página e seus managers
     * Deve ser chamado apenas uma vez
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ TimelinePage já foi inicializado');
            return;
        }

        console.log('🔧 Inicializando TimelinePage...');

        // 1. Cache de elementos do DOM
        this._cacheElements();

        // 2. Obter referências aos managers do App
        this._initManagers();

        // 3. Setup de event listeners
        this._setupEventListeners();

        // 4. Setup de controles (modo de visualização)
        this._setupViewControls();

        // 4.1 Restaurar estado salvo dos controles (se houver)
        try { this._loadTimelineState(); } catch (e) { console.warn('[TimelinePage] Falha ao restaurar estado dos controles', e); }

        // 5. Inicializar custom datepickers
        this._initDatePickers();

        this.isInitialized = true;
        // Atualizar controles visuais e tentar render inicial se a página estiver visível
        this._updateViewControls();

        // Se a página estiver visível, marcar active e renderizar
        try {
            if (this.elements.page && this.elements.page.offsetParent !== null) {
                this.isActive = true;
                this.render();
            }
        } catch (e) { /* ignore */ }

        console.log('✅ TimelinePage inicializado');
    }

    /**
     * Faz cache dos elementos do DOM
     * @private
     */
    _cacheElements() {
        this.elements.page = document.getElementById('timelinePage');
        this.elements.timelineView = document.getElementById('timelineView');
        this.elements.timelineChart = document.getElementById('timelineChart');
        this.elements.timelineDailyGroup = document.getElementById('timelineDailyGroup');
        this.elements.timelineDailyMonth = document.getElementById('timelineDailyMonth');
        this.elements.timelinePeriodRangeGroupMonthly = document.getElementById('timelinePeriodRangeGroupMonthly');
        this.elements.timelinePeriodStartMonth = document.getElementById('timelinePeriodStartMonth');
        this.elements.timelinePeriodEndMonth = document.getElementById('timelinePeriodEndMonth');
        this.elements.timelinePeriodRangeGroupYearly = document.getElementById('timelinePeriodRangeGroupYearly');
        this.elements.timelinePeriodStartYear = document.getElementById('timelinePeriodStartYear');
        this.elements.timelinePeriodEndYear = document.getElementById('timelinePeriodEndYear');
        this.elements.showPeriodStatsBtn = document.getElementById('showPeriodStatsBtn');
        this.elements.exportTimelineBtn = document.getElementById('exportTimelineBtn');

        // Validar elementos críticos
        if (!this.elements.page) {
            console.error('❌ Elemento #timelinePage não encontrado no DOM');
        }
        if (!this.elements.timelineChart) {
            console.error('❌ Elemento #timelineChart não encontrado no DOM');
        }
    }

    /**
     * Inicializa referências aos managers do App
     * @private
     */
    _initManagers() {
        // Managers de estado
        this.dataStateManager = this.app.dataStateManager;

        // Managers de UI
        this.timelineManager = this.app.timelineManager;

        // Managers de features
        this.exportManager = this.app.exportManager;

        // Validar managers críticos
        if (!this.dataStateManager) {
            console.error('❌ DataStateManager não disponível');
        }
        if (!this.timelineManager) {
            console.error('❌ TimelineManager não disponível');
        }
    }

    /**
     * Setup de event listeners
     * @private
     */
    _setupEventListeners() {
        // Listener para mudanças no DataStateManager (Observer Pattern)
        if (this.dataStateManager) {
            const dataChangeHandler = () => {
                try {
                    const visible = this.elements.page ? this.elements.page.offsetParent !== null : this.isActive;
                    if (visible) this.render();
                } catch (e) { /* ignore */ }
            };

            // Listen to document events dispatched by DataStateManager
            document.addEventListener('filtered-data-changed', dataChangeHandler);
            document.addEventListener('all-data-changed', dataChangeHandler);

            this.eventListeners.push({ element: document, event: 'filtered-data-changed', handler: dataChangeHandler });
            this.eventListeners.push({ element: document, event: 'all-data-changed', handler: dataChangeHandler });

            // Also subscribe via the manager API for robustness
            try {
                const unsub = this.dataStateManager.subscribe('filtered-data-changed', dataChangeHandler);
                this.eventListeners.push({ element: this.dataStateManager, event: 'filtered-data-changed', handler: dataChangeHandler, unsub });
            } catch (e) { /* ignore */ }
        }

        // Listener para mudanças nos filtros
        const filterChangeHandler = () => {
            try {
                const visible = this.elements.page ? this.elements.page.offsetParent !== null : this.isActive;
                if (visible) this.render();
            } catch (e) { /* ignore */ }
        };

        document.addEventListener('filtersChanged', filterChangeHandler);

        this.eventListeners.push({ element: document, event: 'filtersChanged', handler: filterChangeHandler });

        // Listener para botão de exportar
        if (this.elements.exportTimelineBtn) {
            const exportHandler = () => {
                this._handleExport();
            };

            this.elements.exportTimelineBtn.addEventListener('click', exportHandler);

            this.eventListeners.push({
                element: this.elements.exportTimelineBtn,
                event: 'click',
                handler: exportHandler
            });
        }

        console.log('✅ Event listeners configurados');
    }

    /**
     * Setup de controles de visualização
     * @private
     */
    _setupViewControls() {
        // Listener para mudança de modo de visualização
        if (this.elements.timelineView) {
            const viewChangeHandler = (e) => {
                this.currentView = e.target.value;
                this._updateViewControls();
                this._saveTimelineState();
                this.render();
            };

            this.elements.timelineView.addEventListener('change', viewChangeHandler);

            this.eventListeners.push({
                element: this.elements.timelineView,
                event: 'change',
                handler: viewChangeHandler
            });
        }

        // Listeners para filtros de período (diário)
        if (this.elements.timelineDailyMonth) {
            const dailyChangeHandler = (e) => {
                const value = e.target.value; // "2025-01"
                if (value) {
                    const [year, month] = value.split('-').map(Number);
                    this.currentPeriod.daily = new Date(year, month - 1, 1);
                } else {
                    this.currentPeriod.daily = null;
                }
                this._saveTimelineState();
                this.render();
            };

            this.elements.timelineDailyMonth.addEventListener('change', dailyChangeHandler);

            this.eventListeners.push({
                element: this.elements.timelineDailyMonth,
                event: 'change',
                handler: dailyChangeHandler
            });
        }

        // Listeners para filtros de período (mensal)
        if (this.elements.timelinePeriodStartMonth) {
            const monthlyStartHandler = (e) => {
                const value = e.target.value; // "2025-01"
                if (value) {
                    const [year, month] = value.split('-').map(Number);
                    this.currentPeriod.monthly.start = new Date(year, month - 1, 1);
                } else {
                    this.currentPeriod.monthly.start = null;
                }
                this._saveTimelineState();
                this.render();
            };

            this.elements.timelinePeriodStartMonth.addEventListener('change', monthlyStartHandler);

            this.eventListeners.push({
                element: this.elements.timelinePeriodStartMonth,
                event: 'change',
                handler: monthlyStartHandler
            });
        }

        if (this.elements.timelinePeriodEndMonth) {
            const monthlyEndHandler = (e) => {
                const value = e.target.value; // "2025-12"
                if (value) {
                    const [year, month] = value.split('-').map(Number);
                    this.currentPeriod.monthly.end = new Date(year, month - 1, 1);
                } else {
                    this.currentPeriod.monthly.end = null;
                }
                this._saveTimelineState();
                this.render();
            };

            this.elements.timelinePeriodEndMonth.addEventListener('change', monthlyEndHandler);

            this.eventListeners.push({
                element: this.elements.timelinePeriodEndMonth,
                event: 'change',
                handler: monthlyEndHandler
            });
        }

        // Listeners para filtros de período (anual)
        if (this.elements.timelinePeriodStartYear) {
            const yearlyStartHandler = (e) => {
                const value = parseInt(e.target.value, 10);
                this.currentPeriod.yearly.start = isNaN(value) ? null : value;
                this._saveTimelineState();
                this.render();
            };

            this.elements.timelinePeriodStartYear.addEventListener('change', yearlyStartHandler);

            this.eventListeners.push({
                element: this.elements.timelinePeriodStartYear,
                event: 'change',
                handler: yearlyStartHandler
            });
        }

        if (this.elements.timelinePeriodEndYear) {
            const yearlyEndHandler = (e) => {
                const value = parseInt(e.target.value, 10);
                this.currentPeriod.yearly.end = isNaN(value) ? null : value;
                this._saveTimelineState();
                this.render();
            };

            this.elements.timelinePeriodEndYear.addEventListener('change', yearlyEndHandler);

            this.eventListeners.push({
                element: this.elements.timelinePeriodEndYear,
                event: 'change',
                handler: yearlyEndHandler
            });
        }

        console.log('✅ Controles de visualização configurados');
    }

    /**
     * Atualiza visibilidade dos controles baseado no modo atual
     * @private
     */
    _updateViewControls() {
        // Esconder todos os grupos de controles
        if (this.elements.timelineDailyGroup) {
            this.elements.timelineDailyGroup.style.display = 'none';
        }
        if (this.elements.timelinePeriodRangeGroupMonthly) {
            this.elements.timelinePeriodRangeGroupMonthly.style.display = 'none';
        }
        if (this.elements.timelinePeriodRangeGroupYearly) {
            this.elements.timelinePeriodRangeGroupYearly.style.display = 'none';
        }

        // Mostrar grupo relevante baseado no modo
        switch (this.currentView) {
            case 'daily':
                if (this.elements.timelineDailyGroup) {
                    this.elements.timelineDailyGroup.style.display = 'block';
                }
                break;
            case 'monthly':
                if (this.elements.timelinePeriodRangeGroupMonthly) {
                    this.elements.timelinePeriodRangeGroupMonthly.style.display = 'block';
                }
                break;
            case 'yearly':
                if (this.elements.timelinePeriodRangeGroupYearly) {
                    this.elements.timelinePeriodRangeGroupYearly.style.display = 'block';
                }
                break;
        }
    }

    /**
     * Inicializa custom datepickers para os controles de timeline
     * @private
     */
    _initDatePickers() {
        // Verificar se CustomDatePicker está disponível
        if (typeof CustomDatePicker === 'undefined') {
            console.warn('⚠️ CustomDatePicker não disponível - usando inputs nativos');
            return;
        }

        // Datepicker para visualização diária (escolher mês/ano)
        if (this.elements.timelineDailyMonth) {
            const today = new Date();
            const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            if (!this.elements.timelineDailyMonth.value) this.elements.timelineDailyMonth.value = yearMonth;

            this.dailyPicker = new CustomDatePicker('timelineDailyMonth', {
                type: 'month',
                onSelect: () => {
                    console.log('[TimelinePage] Data diária selecionada');
                    // O evento 'change' já está configurado em _setupViewControls
                    // Disparar manualmente o evento para garantir atualização
                    const event = new Event('change', { bubbles: true });
                    this.elements.timelineDailyMonth.dispatchEvent(event);
                }
            });
        }

        // Datepicker para período mensal - início
        if (this.elements.timelinePeriodStartMonth) {
            const today = new Date();
            const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            if (!this.elements.timelinePeriodStartMonth.value) this.elements.timelinePeriodStartMonth.value = yearMonth;

            this.monthlyStartPicker = new CustomDatePicker('timelinePeriodStartMonth', {
                type: 'month',
                onSelect: () => {
                    console.log('[TimelinePage] Data mensal início selecionada');
                    const event = new Event('change', { bubbles: true });
                    this.elements.timelinePeriodStartMonth.dispatchEvent(event);
                }
            });
        }

        // Datepicker para período mensal - fim
        if (this.elements.timelinePeriodEndMonth) {
            const today = new Date();
            const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // último dia do mês
            const yearMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 2).padStart(2, '0')}`;
            if (!this.elements.timelinePeriodEndMonth.value) this.elements.timelinePeriodEndMonth.value = yearMonth;

            this.monthlyEndPicker = new CustomDatePicker('timelinePeriodEndMonth', {
                type: 'month',
                onSelect: () => {
                    console.log('[TimelinePage] Data mensal fim selecionada');
                    const event = new Event('change', { bubbles: true });
                    this.elements.timelinePeriodEndMonth.dispatchEvent(event);
                }
            });
        }

        console.log('✅ Custom datepickers inicializados');
    }

    /**
     * Renderiza a página com os dados atuais
     * Chamado quando a página é ativada ou quando dados mudam
     */
    render() {
        if (!this.isInitialized) {
            console.warn('⚠️ TimelinePage não foi inicializado. Chamando init()...');
            this.init();
        }

        console.log(`🎨 Renderizando TimelinePage (modo: ${this.currentView})...`);

        // 1. Obter dados filtrados do DataStateManager
        const servidores = this._getFilteredData();

        // 2. Renderizar timeline
        this._renderTimeline(servidores);

        console.log(`✅ TimelinePage renderizado com ${servidores.length} servidores`);
    }

    /**
     * Obtém dados filtrados do DataStateManager
     * @private
     * @returns {Array} Array de servidores filtrados
     */
    _getFilteredData() {
        if (!this.dataStateManager) {
            return [];
        }

        // Obter dados filtrados (já aplicados pelo FilterStateManager)
        return this.dataStateManager.getFilteredData() || [];
    }

    /**
     * Renderiza o gráfico de timeline
     * @private
     * @param {Array} servidores - Array de servidores
     */
    _renderTimeline(servidores) {
        if (!this.timelineManager || !this.elements.timelineChart) {
            console.warn('⚠️ TimelineManager ou timelineChart não disponível');
            return;
        }

        // Inicializar se necessário
        if (!this.timelineManager.chartCanvas) {
            this.timelineManager.init(this.elements.timelineChart);
        }

        // Renderizar com dados filtrados
        this.timelineManager.render(servidores);
    }

    /**
     * Storage key for timeline controls
     * @private
     */
    _timelineStorageKey() {
        return 'timelineState:v1';
    }

    /**
     * Load timeline controls state from localStorage
     * @private
     */
    _loadTimelineState() {
        const raw = localStorage.getItem(this._timelineStorageKey());
        if (!raw) return;
        let state = null;
        try { state = JSON.parse(raw); } catch (e) { return; }
        if (!state) return;

        if (this.elements.timelineView && state.view) this.elements.timelineView.value = state.view;
        if (this.elements.timelineDailyMonth && state.daily) this.elements.timelineDailyMonth.value = state.daily;
        if (this.elements.timelinePeriodStartMonth && state.periodStart) this.elements.timelinePeriodStartMonth.value = state.periodStart;
        if (this.elements.timelinePeriodEndMonth && state.periodEnd) this.elements.timelinePeriodEndMonth.value = state.periodEnd;
        if (this.elements.timelinePeriodStartYear && state.yearStart) this.elements.timelinePeriodStartYear.value = state.yearStart;
        if (this.elements.timelinePeriodEndYear && state.yearEnd) this.elements.timelinePeriodEndYear.value = state.yearEnd;

        // Reflect into current state
        if (this.elements.timelineView) this.currentView = this.elements.timelineView.value || this.currentView;
        if (this.elements.timelineDailyMonth && this.elements.timelineDailyMonth.value) {
            const [y,m] = this.elements.timelineDailyMonth.value.split('-').map(Number);
            this.currentPeriod.daily = new Date(y, m - 1, 1);
        }
        if (this.elements.timelinePeriodStartMonth && this.elements.timelinePeriodStartMonth.value) {
            const [y,m] = this.elements.timelinePeriodStartMonth.value.split('-').map(Number);
            this.currentPeriod.monthly.start = new Date(y, m - 1, 1);
        }
        if (this.elements.timelinePeriodEndMonth && this.elements.timelinePeriodEndMonth.value) {
            const [y,m] = this.elements.timelinePeriodEndMonth.value.split('-').map(Number);
            this.currentPeriod.monthly.end = new Date(y, m - 1, 1);
        }
        if (this.elements.timelinePeriodStartYear && this.elements.timelinePeriodStartYear.value) {
            this.currentPeriod.yearly.start = parseInt(this.elements.timelinePeriodStartYear.value, 10) || null;
        }
        if (this.elements.timelinePeriodEndYear && this.elements.timelinePeriodEndYear.value) {
            this.currentPeriod.yearly.end = parseInt(this.elements.timelinePeriodEndYear.value, 10) || null;
        }
    }

    /**
     * Save timeline controls state to localStorage
     * @private
     */
    _saveTimelineState() {
        const state = {
            view: this.elements.timelineView ? this.elements.timelineView.value : undefined,
            daily: this.elements.timelineDailyMonth ? this.elements.timelineDailyMonth.value : undefined,
            periodStart: this.elements.timelinePeriodStartMonth ? this.elements.timelinePeriodStartMonth.value : undefined,
            periodEnd: this.elements.timelinePeriodEndMonth ? this.elements.timelinePeriodEndMonth.value : undefined,
            yearStart: this.elements.timelinePeriodStartYear ? this.elements.timelinePeriodStartYear.value : undefined,
            yearEnd: this.elements.timelinePeriodEndYear ? this.elements.timelinePeriodEndYear.value : undefined
        };

        try { localStorage.setItem(this._timelineStorageKey(), JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    /**
     * Obtém período atual baseado no modo de visualização
     * @private
     * @returns {Object|null} Configuração de período
     */
    _getCurrentPeriod() {
        switch (this.currentView) {
            case 'daily':
                return this.currentPeriod.daily;
            case 'monthly':
                return this.currentPeriod.monthly;
            case 'yearly':
                return this.currentPeriod.yearly;
            default:
                return null;
        }
    }

    /**
     * Manipula exportação da timeline
     * @private
     */
    _handleExport() {
        if (!this.exportManager) {
            console.warn('⚠️ ExportManager não disponível');
            return;
        }

        // Obter dados filtrados
        const servidores = this._getFilteredData();

        // Exportar via ExportManager
        // (ExportManager decide formato baseado em preferências do usuário)
        this.exportManager.exportTimeline(
            servidores,
            {
                view: this.currentView,
                period: this._getCurrentPeriod()
            }
        );
    }

    /**
     * Ativa a página (torna visível)
     * Chamado pelo Router quando usuário navega para Timeline
     */
    show() {
        if (!this.isInitialized) {
            this.init();
        }

        console.log('👁️ Mostrando TimelinePage');

        // Tornar página visível
        if (this.elements.page) {
            this.elements.page.classList.add('active');
        }

        this.isActive = true;

        // Atualizar controles de visualização
        this._updateViewControls();

        // Renderizar com dados atuais
        this.render();
    }

    /**
     * Desativa a página (esconde)
     * Chamado pelo Router quando usuário navega para outra página
     */
    hide() {
        console.log('🙈 Escondendo TimelinePage');

        // Esconder página
        if (this.elements.page) {
            this.elements.page.classList.remove('active');
        }

        this.isActive = false;
    }

    /**
     * Altera modo de visualização
     * @param {string} view - 'daily', 'monthly' ou 'yearly'
     */
    setView(view) {
        if (['daily', 'monthly', 'yearly'].includes(view)) {
            this.currentView = view;

            // Atualizar select
            if (this.elements.timelineView) {
                this.elements.timelineView.value = view;
            }

            this._updateViewControls();

            if (this.isActive) {
                this.render();
            }
        }
    }

    /**
     * Define período para visualização diária
     * @param {Date} date - Data para visualizar
     */
    setDailyPeriod(date) {
        this.currentPeriod.daily = date;

        if (this.isActive && this.currentView === 'daily') {
            this.render();
        }
    }

    /**
     * Define período para visualização mensal
     * @param {Date} start - Data inicial
     * @param {Date} end - Data final
     */
    setMonthlyPeriod(start, end) {
        this.currentPeriod.monthly = { start, end };

        if (this.isActive && this.currentView === 'monthly') {
            this.render();
        }
    }

    /**
     * Define período para visualização anual
     * @param {number} startYear - Ano inicial
     * @param {number} endYear - Ano final
     */
    setYearlyPeriod(startYear, endYear) {
        this.currentPeriod.yearly = { start: startYear, end: endYear };

        if (this.isActive && this.currentView === 'yearly') {
            this.render();
        }
    }

    /**
     * Cleanup - Remove event listeners
     * Chamado quando a página é destruída (se necessário)
     */
    destroy() {
        console.log('🧹 Destruindo TimelinePage...');

        // Destruir custom datepickers
        if (this.dailyPicker && typeof this.dailyPicker.destroy === 'function') {
            this.dailyPicker.destroy();
            this.dailyPicker = null;
        }
        if (this.monthlyStartPicker && typeof this.monthlyStartPicker.destroy === 'function') {
            this.monthlyStartPicker.destroy();
            this.monthlyStartPicker = null;
        }
        if (this.monthlyEndPicker && typeof this.monthlyEndPicker.destroy === 'function') {
            this.monthlyEndPicker.destroy();
            this.monthlyEndPicker = null;
        }

        // Remover todos os event listeners registrados
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        this.eventListeners = [];
        this.isInitialized = false;
        this.isActive = false;

        console.log('✅ TimelinePage destruído');
    }
}

// Exportar para uso no App
if (typeof window !== 'undefined') {
    window.TimelinePage = TimelinePage;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelinePage;
}
