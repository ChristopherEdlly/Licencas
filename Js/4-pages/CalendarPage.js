/**
 * CalendarPage - Controller da página de calendário (heatmap)
 *
 * Responsabilidades:
 * - Gerenciar visualização do calendário anual (heatmap)
 * - Coordenar CalendarManager (renderização do heatmap)
 * - Controlar navegação de ano (anterior/próximo)
 * - Gerenciar modal de detalhes do dia
 * - Responder a eventos de filtros e busca
 *
 * @class CalendarPage
 */
class CalendarPage {
    /**
     * @param {Object} app - Referência ao App principal
     */
    constructor(app) {
        this.app = app;

        // Estado da página
        this.isActive = false;
        this.isInitialized = false;
        this.currentYear = new Date().getFullYear();

        // Referências aos managers (serão inicializados no init)
        this.dataStateManager = null;
        this.calendarManager = null;
        this.modalManager = null;

        // Elementos do DOM (lazy loading)
        this.elements = {
            page: null,
            yearlyHeatmap: null,
            currentCalendarYear: null,
            prevYearBtn: null,
            nextYearBtn: null,
            calendarDayModal: null,
            calendarDayTitle: null,
            calendarServersList: null,
            calendarDayCloseBtn: null
        };

        // Event listeners registrados (para cleanup)
        this.eventListeners = [];

        console.log('✅ CalendarPage instanciado');
    }

    /**
     * Inicializa a página e seus managers
     * Deve ser chamado apenas uma vez
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ CalendarPage já foi inicializado');
            return;
        }

        console.log('🔧 Inicializando CalendarPage...');

        // 1. Cache de elementos do DOM
        this._cacheElements();

        // 2. Obter referências aos managers do App
        this._initManagers();

        // 3. Setup de event listeners
        this._setupEventListeners();

        // 4. Setup de navegação de ano
        this._setupYearNavigation();

        this.isInitialized = true;
        console.log('✅ CalendarPage inicializado');
    }

    /**
     * Faz cache dos elementos do DOM
     * @private
     */
    _cacheElements() {
        this.elements.page = document.getElementById('calendarPage');
        this.elements.yearlyHeatmap = document.getElementById('yearlyHeatmap');
        this.elements.currentCalendarYear = document.getElementById('currentCalendarYear');
        this.elements.prevYearBtn = document.getElementById('prevYearBtn');
        this.elements.nextYearBtn = document.getElementById('nextYearBtn');
        this.elements.calendarDayModal = document.getElementById('calendarDayModal');
        this.elements.calendarDayTitle = document.getElementById('calendarDayTitle');
        this.elements.calendarServersList = document.getElementById('calendarServersList');
        this.elements.calendarDayCloseBtn = document.getElementById('calendarDayCloseBtn');

        // Validar elementos críticos
        if (!this.elements.page) {
            console.error('❌ Elemento #calendarPage não encontrado no DOM');
        }
        if (!this.elements.yearlyHeatmap) {
            console.error('❌ Elemento #yearlyHeatmap não encontrado no DOM');
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
        this.calendarManager = this.app.calendarManager;
        this.modalManager = this.app.modalManager;

        // Validar managers críticos
        if (!this.dataStateManager) {
            console.error('❌ DataStateManager não disponível');
        }
        if (!this.calendarManager) {
            console.error('❌ CalendarManager não disponível');
        }
    }

    /**
     * Setup de event listeners
     * @private
     */
    _setupEventListeners() {
        // Listener para mudanças no DataStateManager (Observer Pattern)
        if (this.dataStateManager && typeof this.dataStateManager.subscribe === 'function') {
            const dataChangeHandler = () => {
                if (this.isActive) {
                    this.render();
                }
            };

            // Subscribe to both all-data and filtered-data changes
            const unsubFiltered = this.dataStateManager.subscribe('filtered-data-changed', dataChangeHandler);
            const unsubAll = this.dataStateManager.subscribe('all-data-changed', dataChangeHandler);

            // Store unsubscribe functions for cleanup
            this.eventListeners.push({ element: this.dataStateManager, event: 'filtered-data-changed', handler: unsubFiltered });
            this.eventListeners.push({ element: this.dataStateManager, event: 'all-data-changed', handler: unsubAll });
        }

        // Listener para mudanças nos filtros
        const filterChangeHandler = () => {
            if (this.isActive) {
                this.render();
            }
        };

        document.addEventListener('filtersChanged', filterChangeHandler);

        this.eventListeners.push({
            element: document,
            event: 'filtersChanged',
            handler: filterChangeHandler
        });

        // Listener para fechar modal de detalhes do dia
        if (this.elements.calendarDayCloseBtn) {
            const closeModalHandler = () => {
                this._closeCalendarDayModal();
            };

            this.elements.calendarDayCloseBtn.addEventListener('click', closeModalHandler);

            this.eventListeners.push({
                element: this.elements.calendarDayCloseBtn,
                event: 'click',
                handler: closeModalHandler
            });
        }

        console.log('✅ Event listeners configurados');
    }

    /**
     * Setup de navegação de ano
     * @private
     */
    _setupYearNavigation() {
        // Botão ano anterior
        if (this.elements.prevYearBtn) {
            const prevYearHandler = () => {
                this.currentYear--;
                this._updateYearDisplay();
                this.render();
            };

            this.elements.prevYearBtn.addEventListener('click', prevYearHandler);

            this.eventListeners.push({
                element: this.elements.prevYearBtn,
                event: 'click',
                handler: prevYearHandler
            });
        }

        // Botão próximo ano
        if (this.elements.nextYearBtn) {
            const nextYearHandler = () => {
                this.currentYear++;
                this._updateYearDisplay();
                this.render();
            };

            this.elements.nextYearBtn.addEventListener('click', nextYearHandler);

            this.eventListeners.push({
                element: this.elements.nextYearBtn,
                event: 'click',
                handler: nextYearHandler
            });
        }

        console.log('✅ Navegação de ano configurada');
    }

    /**
     * Atualiza display do ano atual
     * @private
     */
    _updateYearDisplay() {
        if (this.elements.currentCalendarYear) {
            this.elements.currentCalendarYear.textContent = this.currentYear;
        }
    }

    /**
     * Renderiza a página com os dados atuais
     * Chamado quando a página é ativada ou quando dados mudam
     */
    render() {
        if (!this.isInitialized) {
            console.warn('⚠️ CalendarPage não foi inicializado. Chamando init()...');
            this.init();
        }

        console.log(`🎨 Renderizando CalendarPage (ano: ${this.currentYear})...`);

        // 1. Obter dados filtrados do DataStateManager
        const servidores = this._getFilteredData();

        // 2. Renderizar heatmap do calendário
        this._renderCalendar(servidores);

        console.log(`✅ CalendarPage renderizado com ${servidores.length} servidores`);
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
     * Renderiza o calendário (heatmap)
     * @private
     * @param {Array} servidores - Array de servidores
     */
    _renderCalendar(servidores) {
        if (!this.calendarManager || !this.elements.yearlyHeatmap) {
            console.warn('⚠️ CalendarManager ou yearlyHeatmap não disponível');
            return;
        }
        // Usar lógica legada: chama updateYearlyHeatmap do CalendarManager
        if (typeof this.calendarManager.updateYearlyHeatmap === 'function') {
            this.calendarManager.updateYearlyHeatmap(this.currentYear);
        }
    }

    /**
     * Ativa a página (torna visível)
     * Chamado pelo Router quando usuário navega para Calendar
     */
    show(params) {
        if (!this.isInitialized) {
            this.init();
        }

        console.log('👁️ Mostrando CalendarPage');

        // Tornar página visível
        if (this.elements.page) {
            this.elements.page.classList.add('active');
        }

        this.isActive = true;

        // Atualizar display do ano
        this._updateYearDisplay();

        // Renderizar com dados atuais
        this.render();
    }

    /**
     * Mostra modal com detalhes dos servidores de um dia específico
     * @private
     * @param {Date} date - Data selecionada
     * @param {Array} servidores - Servidores com licença nesse dia
     */
    _showCalendarDayModal(date, servidores) {
        if (!this.elements.calendarDayModal) {
            console.warn('⚠️ Modal de detalhes do dia não disponível');
            return;
        }

        // Formatar data para exibição
        const dateStr = this._formatDate(date);

        // Atualizar título do modal
        if (this.elements.calendarDayTitle) {
            this.elements.calendarDayTitle.textContent = `Licenças em ${dateStr}`;
        }

        // Renderizar lista de servidores
        if (this.elements.calendarServersList) {
            this.elements.calendarServersList.innerHTML = this._renderServersList(servidores);
        }

        // Mostrar modal
        if (this.modalManager) {
            // Usar ModalManager se disponível
            this.modalManager.open(this.elements.calendarDayModal);
        } else {
            // Fallback: mostrar modal diretamente
            this.elements.calendarDayModal.style.display = 'flex';
        }
    }

    /**
     * Fecha modal de detalhes do dia
     * @private
     */
    _closeCalendarDayModal() {
        if (!this.elements.calendarDayModal) {
            return;
        }

        if (this.modalManager) {
            // Usar ModalManager se disponível
            this.modalManager.close(this.elements.calendarDayModal);
        } else {
            // Fallback: esconder modal diretamente
            this.elements.calendarDayModal.style.display = 'none';
        }
    }

    /**
     * Formata data para exibição (DD/MM/YYYY)
     * @private
     * @param {Date} date - Data a formatar
     * @returns {string} Data formatada
     */
    _formatDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Renderiza HTML da lista de servidores
     * @private
     * @param {Array} servidores - Array de servidores
     * @returns {string} HTML da lista
     */
    _renderServersList(servidores) {
        if (!servidores || servidores.length === 0) {
            return '<p class="no-data">Nenhum servidor com licença neste dia.</p>';
        }

        let html = '<div class="servers-list">';

        servidores.forEach(servidor => {
            const nome = servidor.nome || servidor.servidor || 'Não informado';
            const cargo = servidor.cargo || 'Cargo não informado';
            const lotacao = servidor.lotacao || 'Lotação não informada';
            const urgencia = servidor.urgencia || 'baixa';

            html += `
                <div class="server-item">
                    <div class="server-header">
                        <span class="server-name">${this._escapeHtml(nome)}</span>
                        <span class="badge badge-${urgencia}">${urgencia}</span>
                    </div>
                    <div class="server-details">
                        <span class="server-cargo">
                            <i class="bi bi-briefcase"></i>
                            ${this._escapeHtml(cargo)}
                        </span>
                        <span class="server-lotacao">
                            <i class="bi bi-building"></i>
                            ${this._escapeHtml(lotacao)}
                        </span>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        return html;
    }

    /**
     * Desativa a página (esconde)
     * Chamado pelo Router quando usuário navega para outra página
     */
    hide() {
        console.log('🙈 Escondendo CalendarPage');

        // Esconder página
        if (this.elements.page) {
            this.elements.page.classList.remove('active');
        }

        // Fechar modal se estiver aberto
        this._closeCalendarDayModal();

        this.isActive = false;
    }

    /**
     * Vai para um ano específico
     * @param {number} year - Ano desejado
     */
    goToYear(year) {
        this.currentYear = year;
        this._updateYearDisplay();

        if (this.isActive) {
            this.render();
        }
    }

    /**
     * Vai para o ano atual
     */
    goToCurrentYear() {
        this.goToYear(new Date().getFullYear());
    }

    /**
     * Cleanup - Remove event listeners
     * Chamado quando a página é destruída (se necessário)
     */
    destroy() {
        console.log('🧹 Destruindo CalendarPage...');

        // Fechar modal se estiver aberto
        this._closeCalendarDayModal();

        // Remover todos os event listeners registrados
        this.eventListeners.forEach(({ element, event, handler }) => {
            try {
                // If the element is the DataStateManager, handler might be an unsubscribe function
                if (element === this.dataStateManager && typeof handler === 'function') {
                    // If it's an unsubscribe function, calling it will unregister
                    try { handler(); } catch (err) { /* ignore */ }
                } else if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(event, handler);
                }
            } catch (err) {
                // ignore any error during cleanup
            }
        });

        this.eventListeners = [];
        this.isInitialized = false;
        this.isActive = false;

        console.log('✅ CalendarPage destruído');
    }
}

// Exportar para uso no App
if (typeof window !== 'undefined') {
    window.CalendarPage = CalendarPage;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarPage;
}
