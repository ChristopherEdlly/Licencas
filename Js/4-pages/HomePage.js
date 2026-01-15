/**
 * HomePage - Controller da página inicial (Visão Geral / Cronograma)
 *
 * Responsabilidades:
 * - Gerenciar visualização do cronograma de licenças
 * - Coordenar TableManager (tabela de servidores)
 * - Coordenar ChartManager (gráficos de urgência e cargos)
 * - Responder a eventos de filtros e busca
 * - Atualizar contadores e estatísticas
 *
 * @class HomePage
 */
class HomePage {
    /**
     * @param {Object} app - Referência ao App principal
     */
    constructor(app) {
        this.app = app;

        // Estado da página
        this.isActive = false;
        this.isInitialized = false;

        // Estado do filtro de servidores inativos
        this.includeInactiveServers = false;

        // Referências aos managers (serão inicializados no init)
        this.dataStateManager = null;
        this.tableManager = null;
        this.chartManager = null;
        this.filterStateManager = null;
        this.searchManager = null;

        // Elementos do DOM (lazy loading)
        this.elements = {
            page: null,
            cronogramaView: null,
            totalServidores: null,
            tableBody: null,
            urgencyChart: null,
            cargoChart: null,
            urgencyTotal: null,
            cargoTotal: null,
            includeInactiveToggle: null
        };

        // Event listeners registrados (para cleanup)
        this.eventListeners = [];

    }

    /**
     * Inicializa a página e seus managers
     * Deve ser chamado apenas uma vez
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ HomePage já foi inicializado');
            return;
        }

        // 1. Cache de elementos do DOM
        this._cacheElements();

        // 2. Obter referências aos managers do App
        this._initManagers();

        // 3. Setup de event listeners
        this._setupEventListeners();

        this.isInitialized = true;

    }

    /**
     * Faz cache dos elementos do DOM
     * @private
     */
    _cacheElements() {
        this.elements.page = document.getElementById('homePage');
        this.elements.cronogramaView = document.getElementById('cronogramaView');
        this.elements.totalServidores = document.getElementById('totalServidores');
        this.elements.tableBody = document.getElementById('tableBody');
        this.elements.urgencyChart = document.getElementById('urgencyChart');
        this.elements.cargoChart = document.getElementById('cargoChart');
        this.elements.urgencyTotal = document.getElementById('urgencyTotal');
        this.elements.cargoTotal = document.getElementById('cargoTotal');
        this.elements.includeInactiveToggle = document.getElementById('includeInactiveServersToggle');

        // Validar elementos críticos
        if (!this.elements.page) {
            console.error('❌ Elemento #homePage não encontrado no DOM');
        }
        if (!this.elements.tableBody) {
            console.error('❌ Elemento #tableBody não encontrado no DOM');
        }
    }

    /**
     * Inicializa referências aos managers do App
     * @private
     */
    _initManagers() {
        // Managers de estado
        this.dataStateManager = this.app.dataStateManager;
        this.filterStateManager = this.app.filterStateManager;

        // Managers de UI
        this.tableManager = this.app.tableManager;
        this.chartManager = this.app.chartManager;

        // Managers de features
        this.searchManager = this.app.searchManager;

        // Inicializar TableManager com a tabela da HomePage
        if (this.tableManager && typeof this.tableManager.init === 'function') {
            this.tableManager.init('servidoresTable');
        }

        // Validar managers críticos
        if (!this.dataStateManager) {
            console.error('❌ DataStateManager não disponível');
        }
        if (!this.tableManager) {
            console.error('❌ TableManager não disponível');
        }
        if (!this.chartManager) {
            console.error('❌ ChartManager não disponível');
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
                if (this.isActive) {
                    this.render();
                }
            };

            // Subscrever ao evento 'filtered-data-changed'
            document.addEventListener('filtered-data-changed', dataChangeHandler);

            // Guardar referência para cleanup posterior
            this.eventListeners.push({
                element: document,
                event: 'filtered-data-changed',
                handler: dataChangeHandler
            });
        }

        // Listener para mudanças nos filtros
        if (this.filterStateManager) {
            const filterChangeHandler = () => {
                if (this.isActive) {
                    this.render();
                }
            };

            document.addEventListener('filters-changed', filterChangeHandler);

            this.eventListeners.push({
                element: document,
                event: 'filters-changed',
                handler: filterChangeHandler
            });
        }
// Listener para toggle de servidores inativos
        if (this.elements.includeInactiveToggle) {
            const toggleHandler = (e) => {
                this.includeInactiveServers = e.target.checked;

                this.render();
            };

            this.elements.includeInactiveToggle.addEventListener('change', toggleHandler);

            this.eventListeners.push({
                element: this.elements.includeInactiveToggle,
                event: 'change',
                handler: toggleHandler
            });
        }

    }

    /**
     * Renderiza a página com os dados atuais
     * Chamado quando a página é ativada ou quando dados mudam
     */
    render() {
        if (!this.isInitialized) {
            console.warn('⚠️ HomePage não foi inicializado. Chamando init()...');
            this.init();
        }

        // 1. Obter dados filtrados do DataStateManager
        const servidores = this._getFilteredData();

        // 2. Atualizar contador no header
        this._updateServerCount(servidores.length);

        // 3. Renderizar tabela
        this._renderTable(servidores);

        // 4. Renderizar gráficos
        this._renderCharts(servidores);

    }

    /**
     * Atualiza apenas a tabela e gráficos com um conjunto de resultados
     * Usado por outros managers (ex: HeaderManager) para aplicar resultados de busca
     * @param {Array} results - Array de servidores filtrados
     */
    updateTable(results) {
        if (!this.isInitialized) {
            this.init();
        }

        // Atualizar contador
        this._updateServerCount(Array.isArray(results) ? results.length : 0);

        // Atualizar tabela e gráficos diretamente
        this._renderTable(results || []);
        this._renderCharts(results || []);
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
        let servidores = this.dataStateManager.getFilteredData() || [];

        // Aplicar filtro de servidores inativos
        if (!this.includeInactiveServers) {
            servidores = servidores.filter(s => {
                // Servidores sem a flag _status ou com _status === 'ativo' são considerados ativos
                return !s._status || s._status === 'ativo';
            });
        }

        return servidores;
    }

    /**
     * Atualiza contador de servidores no header
     * @private
     * @param {number} count - Quantidade de servidores
     */
    _updateServerCount(count) {
        if (this.elements.totalServidores) {
            this.elements.totalServidores.textContent = count;
        }
    }

    /**
     * Renderiza a tabela de servidores
     * @private
     * @param {Array} servidores - Array de servidores
     */
    _renderTable(servidores) {
        if (!this.tableManager || !this.elements.tableBody) {
            console.warn('⚠️ TableManager ou tableBody não disponível');
            return;
        }

        // Delegar renderização para o TableManager
        // (TableManager já sabe como renderizar a tabela corretamente)
        this.tableManager.render(servidores, this.elements.tableBody);
    }

    /**
     * Renderiza os gráficos (urgência e cargos)
     * @private
     * @param {Array} servidores - Array de servidores
     */
    _renderCharts(servidores) {
        if (!this.chartManager) {
            console.warn('⚠️ ChartManager não disponível');
            return;
        }

        // 1. Gráfico de Urgência (barras horizontais)
        this._renderUrgencyChart(servidores);

        // 2. Gráfico de Cargos (pizza/rosca)
        this._renderCargoChart(servidores);
    }

    /**
     * Renderiza gráfico de próximas licenças
     * @private
     * @param {Array} servidores - Array de servidores
     */
    _renderUrgencyChart(servidores) {
        if (!this.elements.urgencyChart) {
            return;
        }

        // Atualizar total no header do gráfico (total de licenças nos próximos 90 dias)
        if (this.elements.urgencyTotal) {
            if (typeof LicenseAnalyzer !== 'undefined') {
                const data = LicenseAnalyzer.contarProximasLicencas(servidores);
                const total = (data.dias30 || 0) + (data.dias60 || 0) + (data.dias90 || 0);
                this.elements.urgencyTotal.textContent = total;
            } else {
                this.elements.urgencyTotal.textContent = '0';
            }
        }

        // Delegar renderização para ChartManager
        const canvasId = this.elements.urgencyChart.id || 'urgencyChart';
        this.chartManager.renderProximasLicencasChart(servidores, canvasId);
    }

    /**
     * Renderiza gráfico de status de licenças
     * @private
     * @param {Array} servidores - Array de servidores
     */
    _renderCargoChart(servidores) {
        if (!this.elements.cargoChart) {
            return;
        }

        // Atualizar total no header do gráfico
        if (this.elements.cargoTotal) {
            this.elements.cargoTotal.textContent = servidores.length;
        }

        // Delegar renderização para ChartManager
        const canvasId = this.elements.cargoChart.id || 'cargoChart';
        this.chartManager.renderStatusLicencasChart(servidores, canvasId);
    }


    /**
     * Ativa a página (torna visível)
     * Chamado pelo Router quando usuário navega para Home
     */
    show() {
        if (!this.isInitialized) {
            this.init();
        }

        // Tornar página visível
        if (this.elements.page) {
            this.elements.page.classList.add('active');
        }

        this.isActive = true;

        // Renderizar com dados atuais
        this.render();
    }

    /**
     * Desativa a página (esconde)
     * Chamado pelo Router quando usuário navega para outra página
     */
    hide() {

        // Esconder página
        if (this.elements.page) {
            this.elements.page.classList.remove('active');
        }

        this.isActive = false;
    }

    /**
     * Cleanup - Remove event listeners
     * Chamado quando a página é destruída (se necessário)
     */
    destroy() {

        // Remover todos os event listeners registrados
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        this.eventListeners = [];
        this.isInitialized = false;
        this.isActive = false;

    }
}

// Exportar para uso no App
if (typeof window !== 'undefined') {
    window.HomePage = HomePage;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomePage;
}
