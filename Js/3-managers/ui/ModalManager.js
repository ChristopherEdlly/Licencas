/**
 * ModalManager - Gerenciamento de modais
 *
 * Responsabilidades:
 * - Abrir/fechar modais
 * - Gerenciar stack de modais
 * - Trap de foco para acessibilidade
 * - Animações de entrada/saída
 * - ESC para fechar
 * - Gerar conteúdo dinâmico (Servidor, Timeline, Problemas, etc)
 *
 * @module 3-managers/ui/ModalManager
 */

class ModalManager {
    /**
     * Construtor
     * @param {Object} app - Instância do App/Dashboard
     */
    constructor(app) {
        this.app = app;

        // Stack de modais abertos
        this.modalStack = [];

        // Elemento com foco anterior
        this.previousFocus = null;

        // Event listeners
        this.escapeHandler = null;
        this.clickOutsideHandler = null;

        // Estado para timeline
        this.currentTimelineState = null;

        console.log('✅ ModalManager inicializado');
    }

    /**
     * Escapa HTML para prevenir XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    /**
     * Inicializa o manager
     */
    init() {
        // Setup global event listeners
        this._setupGlobalListeners();

        // Setup modais existentes
        this._setupExistingModals();

        // Setup advanced filters modal interactions (sub-modais)
        this._setupFiltersModalHandlers();

        console.log('📋 Modais configurados');
    }

    // ============================================================
    // CONTROLE DE MODAIS (UI/UX)
    // ============================================================

    /**
     * Abre modal
     * @param {string} modalId - ID do modal
     * @param {Object} options - Opções de abertura
     */
    open(modalId, options = {}) {
        let modal = null;
        if (typeof modalId === 'string') modal = document.getElementById(modalId);
        else if (modalId instanceof HTMLElement) modal = modalId;

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        // Salvar foco anterior
        this.previousFocus = document.activeElement;

        // Adicionar ao stack
        this.modalStack.push(modalId);

        // Ajustar z-index para empilhar modais corretamente
        try {
            const base = 1050;
            const z = base + (this.modalStack.length * 10);
            modal.style.zIndex = z;
            const backdrop = modal.querySelector('.modal-backdrop');
            const content = modal.querySelector('.modal-content');
            if (backdrop) backdrop.style.zIndex = z;
            if (content) content.style.zIndex = z + 1;
        } catch (e) { /* ignore */ }

        // Mostrar modal
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        // Animação de entrada
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });

        // Focar no modal
        setTimeout(() => {
            this._trapFocus(modal);
        }, 100);

        // Bloquear scroll do body
        document.body.style.overflow = 'hidden';

        // Callback
        if (options.onOpen) {
            options.onOpen(modal);
        }

        // Specialized hook: when opening filters modal, initialize its UI
        try {
            if ((typeof modalId === 'string' ? modalId : (modal.id || '')) === 'filtersModal') {
                this._onFiltersModalOpened();
            }
        } catch (e) { /* ignore */ }

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.openModal(modalId);
        }

        console.log(`📋 Modal aberto: ${modalId}`);
    }

    /**
     * Fecha modal
     * @param {string} modalId - ID do modal
     * @param {Object} options - Opções de fechamento
     */
    close(modalId, options = {}) {

        let modal = null;
        let resolvedId = modalId;
        if (typeof modalId === 'string') modal = document.getElementById(modalId);
        else if (modalId instanceof HTMLElement) { modal = modalId; resolvedId = modal.id || resolvedId; }

        if (!modal) {
            console.warn(`Modal ${resolvedId} não encontrado`);
            return;
        }

        // Remover do stack
        this.modalStack = this.modalStack.filter(id => id !== resolvedId);

        // Animação de saída
        modal.classList.remove('show');

        // Ocultar após animação
        setTimeout(() => {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');

            // Restaurar foco
            if (this.previousFocus && this.modalStack.length === 0) {
                this.previousFocus.focus();
                this.previousFocus = null;
            }

            // Desbloquear scroll se não houver mais modais
            if (this.modalStack.length === 0) {
                document.body.style.overflow = '';
            }

            // Callback
            if (options.onClose) {
                options.onClose(modal);
            }
        }, 300); // Duração da animação CSS

        // Atualizar UIStateManager
        if (this.app?.uiStateManager) {
            this.app.uiStateManager.closeModal(resolvedId);
        }

        console.log(`📋 Modal fechado: ${resolvedId}`);
    }

    /**
     * Alterna modal
     * @param {string} modalId - ID do modal
     */
    toggle(modalId) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        const isOpen = modal.style.display === 'flex';

        if (isOpen) {
            this.close(modalId);
        } else {
            this.open(modalId);
        }
    }

    /**
     * Fecha todos os modais
     */
    closeAll() {
        // Copiar stack para evitar problemas de iteração
        const modalsToClose = [...this.modalStack];

        modalsToClose.forEach(modalId => {
            this.close(modalId);
        });

        console.log('📋 Todos os modais fechados');
    }

    /**
     * Verifica se modal está aberto
     * @param {string} modalId - ID do modal
     * @returns {boolean}
     */
    isOpen(modalId) {
        return this.modalStack.includes(modalId);
    }

    /**
     * Retorna modal do topo do stack
     * @returns {string|null}
     */
    getTopModal() {
        return this.modalStack[this.modalStack.length - 1] || null;
    }

    /**
     * Setup event listeners globais
     * @private
     */
    _setupGlobalListeners() {
        // ESC para fechar modal do topo
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                const topModal = this.getTopModal();
                if (topModal) {
                    this.close(topModal);
                }
            }
        };

        document.addEventListener('keydown', this.escapeHandler);
        // Delegated click for filter-type-card: prefer AdvancedFiltersBuilder if present
        this._delegatedFilterCardHandler = (e) => {
            try {
                const card = e.target.closest && e.target.closest('.filter-type-card');
                if (!card) return;
                const filtersModal = document.getElementById('filtersModal');
                if (!filtersModal) return;
                const isVisible = (filtersModal.style.display === 'flex') || filtersModal.classList.contains('show') || filtersModal.classList.contains('active');
                if (!isVisible) return;
                const filterType = card.dataset && card.dataset.filterType;
                console.debug('[ModalManager] delegated click on filter-type-card', { filterType, card, target: e.target });
                if (!filterType) return;
                const builder = this.app?.advancedFiltersBuilder || window.advancedFiltersBuilder;
                if (builder && typeof builder.openFilterConfigPopup === 'function') {
                    try { builder.openFilterConfigPopup(filterType); } catch (err) { console.warn('Erro ao abrir popup de filtro via Builder:', err); }
                } else {
                    try { this._openFilterConfigPopup(filterType); } catch (err) { console.warn('Erro ao abrir popup de filtro:', err); }
                }
            } catch (err) {
                console.error('[ModalManager] error in delegatedFilterCardHandler', err);
            }
        };

        document.addEventListener('click', this._delegatedFilterCardHandler);
    }

    /**
     * Setup modais existentes no DOM
     * @private
     */
    _setupExistingModals() {
        const modals = document.querySelectorAll('[role="dialog"], .modal');

        modals.forEach(modal => {
            const modalId = modal.id;

            if (!modalId) return;

            // Botão de fechar (X)
            const closeBtn = modal.querySelector('[data-modal-close], .btn-close, .modal-close');
            if (closeBtn) {
                // Remover listeners antigos para evitar duplicação (simple clone hack)
                const newBtn = closeBtn.cloneNode(true);
                const parent = closeBtn.parentNode;
                if (parent) parent.replaceChild(newBtn, closeBtn);

                newBtn.addEventListener('click', () => {
                    this.close(modalId);
                });
            }

            // Clique fora do modal (backdrop)
            const backdrop = modal.querySelector('.modal-backdrop');
            if (backdrop) {
                // Remover listeners antigos
                const newBackdrop = backdrop.cloneNode(true);
                const parent = backdrop.parentNode;
                if (parent) parent.replaceChild(newBackdrop, backdrop);

                newBackdrop.addEventListener('click', (e) => {
                    if (e.target === newBackdrop) {
                        this.close(modalId);
                    }
                });
            }

            // Garantir que modal está oculto inicialmente
            if (!this.isOpen(modalId) && modal.style.display !== 'flex') {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    /**
     * Trap de foco dentro do modal (acessibilidade)
     * @private
     * @param {HTMLElement} modal - Elemento do modal
     */
    _trapFocus(modal) {
        // Elementos focáveis
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focar no primeiro elemento
        firstFocusable.focus();

        // Listener para trap de foco
        const trapHandler = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        modal.addEventListener('keydown', trapHandler);

        // Remover listener ao fechar
        modal.dataset.trapHandler = 'active';
    }

    /**
     * Cria modal dinamicamente
     * @param {Object} config - Configuração do modal
     * @returns {HTMLElement} - Elemento do modal
     */
    createModal(config) {
        const {
            id,
            title,
            content,
            footer,
            size = 'medium', // small, medium, large
            closeButton = true
        } = config;

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = `modal modal-${size}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `${id}-title`);
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title-section">
                        <h3 id="${id}-title">${title}</h3>
                    </div>
                    ${closeButton ? `
                        <button class="btn-close" data-modal-close aria-label="Fechar modal">
                            <i class="bi bi-x"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${footer ? `
                    <div class="modal-footer">
                        ${footer}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this._setupExistingModals(); // Re-setup

        console.log(`📋 Modal criado: ${id}`);

        return modal;
    }

    /**
     * Remove modal do DOM
     * @param {string} modalId - ID do modal
     */
    destroyModal(modalId) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }

        // Fechar se estiver aberto
        if (this.isOpen(modalId)) {
            this.close(modalId);
        }

        // Remover do DOM
        modal.remove();

        console.log(`📋 Modal removido: ${modalId}`);
    }

    /**
     * Atualiza conteúdo do modal
     * @param {string} modalId - ID do modal
     * @param {string} content - Novo conteúdo HTML
     */
    updateContent(modalId, content) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = content;
        }
        // Reatribuir listeners de fechar após atualização dinâmica
        this._setupExistingModals();
    }

    /**
     * Atualiza título do modal
     * @param {string} modalId - ID do modal
     * @param {string} title - Novo título
     */
    updateTitle(modalId, title) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal ${modalId} não encontrado`);
            return;
        }
        const titleElement = modal.querySelector('.modal-title-section h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
        // Reatribuir listeners de fechar após atualização dinâmica
        this._setupExistingModals();
    }

    // ============================================================
    // MÉTODOS DE UTILIDADE (Alert/Confirm)
    // ============================================================

    /**
     * Called when the Filters modal is opened to render active list and wire buttons
     * @private
     */
    _onFiltersModalOpened() {
        // Priorizar AdvancedFiltersBuilder (novo) sobre AdvancedFilterManager (legado)
        const mgr = this.app?.advancedFiltersBuilder || window.advancedFiltersBuilder || this.app?.advancedFilterManager || window.advancedFilterManager;

        console.log('[ModalManager] _onFiltersModalOpened - manager:', mgr?.constructor?.name);

        // Chamar openModal se for AdvancedFiltersBuilder
        if (mgr && typeof mgr.openModal === 'function') {
            try {
                mgr.openModal();
                return; // openModal já faz tudo necessário
            } catch (e) {
                console.error('[ModalManager] Erro ao chamar openModal:', e);
            }
        }

        // Fallback para compatibilidade com AdvancedFilterManager legado
        // Ensure manager has up-to-date unique values (populate from current data)
        try {
            const data = this.app?.dataStateManager?.getFilteredData ? this.app.dataStateManager.getFilteredData() : (this.app?.dataStateManager?.getAllServidores ? this.app.dataStateManager.getAllServidores() : []);
            if (mgr && typeof mgr.extractUniqueValues === 'function') {
                mgr.extractUniqueValues(data || []);
            }
        } catch (e) { console.warn('[ModalManager] Falha ao popular valores únicos do AdvancedFilterManager', e); }
        const activeListEl = document.getElementById('activeFiltersList');
        const resultsCount = document.getElementById('resultsCount');
        const clearAllBtn = document.getElementById('clearAllFiltersModalBtn');
        const cancelBtn = document.getElementById('cancelFiltersModalBtn');

        if (mgr && typeof mgr.renderActiveFiltersList === 'function') {
            try { mgr.renderActiveFiltersList(); } catch (e) { console.warn('Erro renderActiveFiltersList', e); }
        }

        // Update results preview if possible
        try {
            const data = this.app?.dataStateManager?.getFilteredData ? this.app.dataStateManager.getFilteredData() : [];
            const filtered = mgr && typeof mgr.applyFilters === 'function' ? mgr.applyFilters(data) : data;
            if (resultsCount) {
                resultsCount.innerHTML = `Mostrando <strong>${filtered.length}</strong> de <strong>${(data||[]).length}</strong> servidores`;
            }
        } catch (e) { /* ignore */ }

        // Wire clear all button
        if (clearAllBtn) {
            clearAllBtn.disabled = !(mgr && typeof mgr.hasActiveFilters === 'function' && mgr.hasActiveFilters());
            clearAllBtn.onclick = () => {
                try { if (mgr && typeof mgr.clearAll === 'function') mgr.clearAll(); } catch(e){ }
                try { if (mgr && typeof mgr.renderActiveFiltersList === 'function') mgr.renderActiveFiltersList(); } catch(e){}
                // update badge
                document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                clearAllBtn.disabled = true;
            };
        }

        // Wire cancel/close button
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.close('filtersModal');
            };
        }
    }

    /**
     * Setup handlers specific to the Advanced Filters modal and its sub-popup
     * @private
     */
    _setupFiltersModalHandlers() {
        const filtersModal = document.getElementById('filtersModal');
        const popup = document.getElementById('filterConfigPopup');
        const popupTitle = document.getElementById('filterConfigPopupTitle');
        const popupBody = document.getElementById('filterConfigPopupBody');
        const closePopupBtn = document.getElementById('closeFilterConfigPopup');
        const cancelPopupBtn = document.getElementById('cancelFilterPopupBtn');
        // If modal or popup not present yet, skip; delegated handler will still work
        if (!filtersModal || !popup) return;

        // Wire popup close buttons
        this._closeFilterConfigPopup = () => {
            popup.classList.remove('active', 'show');
            popup.setAttribute('aria-hidden', 'true');
            popup.style.display = 'none';
        };
        if (closePopupBtn) closePopupBtn.addEventListener('click', () => this._closeFilterConfigPopup());
        if (cancelPopupBtn) cancelPopupBtn.addEventListener('click', () => this._closeFilterConfigPopup());

        // When clicking a filter-type-card inside the filters modal, open popup
        filtersModal.addEventListener('click', (e) => {
            const card = e.target.closest && e.target.closest('.filter-type-card');
            if (!card) return;
            const filterType = card.dataset && card.dataset.filterType;
            console.debug('[ModalManager] modal click on filter-type-card', { filterType, card, target: e.target });
            if (!filterType) return;
            const builder = this.app?.advancedFiltersBuilder || window.advancedFiltersBuilder;
            if (builder && typeof builder.openFilterConfigPopup === 'function') {
                try { builder.openFilterConfigPopup(filterType); } catch (err) { console.warn('Erro ao abrir popup de filtro via Builder:', err); }
            } else {
                this._openFilterConfigPopup(filterType);
            }
        });

        // Close popup if clicked outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) this._closeFilterConfigPopup();
        });
    }

    /**
     * Abre o popup de configuração de filtro (reutilizável)
     * @param {string} filterType
     * @private
     */
    _openFilterConfigPopup(filterType) {
        const popup = document.getElementById('filterConfigPopup');
        const popupTitle = document.getElementById('filterConfigPopupTitle');
        const popupBody = document.getElementById('filterConfigPopupBody');
        if (!popup || !popupBody) return;

        let mgr = this.app?.advancedFilterManager || window.advancedFilterManager;
        // Ensure unique values are populated
        try {
            const valuesBefore = mgr && typeof mgr.getUniqueValues === 'function' ? (mgr.getUniqueValues(filterType) || []) : [];
            if ((!valuesBefore || valuesBefore.length === 0) && this.app?.dataStateManager && mgr && typeof mgr.extractUniqueValues === 'function') {
                const data = this.app.dataStateManager.getFilteredData ? this.app.dataStateManager.getFilteredData() : this.app.dataStateManager.getAllServidores ? this.app.dataStateManager.getAllServidores() : [];
                mgr.extractUniqueValues(data || []);
                mgr = this.app?.advancedFilterManager || window.advancedFilterManager || mgr;
            }
        } catch (e) { console.warn('[ModalManager] Erro ao tentar popular valores únicos antes de abrir popup', e); }

        let html = '';
        const values = mgr && typeof mgr.getUniqueValues === 'function' ? (mgr.getUniqueValues(filterType) || []) : [];

        // Fallback UIs for specific filter types
        const renderServidorSearch = () => {
            const dataNames = values.length ? values : (this.app?.dataStateManager?.getFilteredData ? (this.app.dataStateManager.getFilteredData() || []).map(s => (s.NOME||s.nome||s.SERVIDOR||s.servidor||'')).filter(Boolean) : []);
            return `
                <div class="filter-search">
                    <input type="search" id="filterServidorSearchInput" placeholder="Buscar servidor..." class="form-control" />
                    <div id="filterServidorResults" class="filter-search-results" style="margin-top:0.5rem; max-height:200px; overflow:auto;"></div>
                </div>
            `;
        };

        const renderPeriodoForm = () => `
            <div class="filter-periodo-form">
                <label>Início</label>
                <input type="date" id="filterPeriodoInicio" class="form-control" />
                <label>Fim</label>
                <input type="date" id="filterPeriodoFim" class="form-control" />
                <div style="margin-top:0.75rem; display:flex; gap:0.5rem;"><button id="applyPeriodoBtn" class="btn btn-primary">Aplicar</button><button id="clearPeriodoBtn" class="btn btn-outline">Limpar</button></div>
            </div>
        `;

        const renderIdadeForm = () => `
            <div class="filter-idade-form">
                <label>Idade mínima</label>
                <input type="number" id="filterIdadeMin" class="form-control" />
                <label>Idade máxima</label>
                <input type="number" id="filterIdadeMax" class="form-control" />
                <div style="margin-top:0.75rem; display:flex; gap:0.5rem;"><button id="applyIdadeBtn" class="btn btn-primary">Aplicar</button><button id="clearIdadeBtn" class="btn btn-outline">Limpar</button></div>
            </div>
        `;

        const renderMesesForm = () => `
            <div class="filter-meses-form">
                <label>Meses (mínimo)</label>
                <input type="number" id="filterMesesInput" class="form-control" />
                <div style="margin-top:0.75rem;"><button id="applyMesesBtn" class="btn btn-primary">Aplicar</button></div>
            </div>
        `;

        if (filterType === 'servidor') {
            html = renderServidorSearch();
        } else if (filterType === 'periodo') {
            html = renderPeriodoForm();
        } else if (filterType === 'idade') {
            html = renderIdadeForm();
        } else if (filterType === 'meses') {
            html = renderMesesForm();
        } else if (values && values.length > 0) {
            html = '<div class="filter-options-list">';
            for (const v of values) {
                const safe = this.escapeHtml(v);
                html += `<button type="button" class="btn btn-link filter-option-btn" data-value="${safe}">${safe}</button>`;
            }
            html += '</div>';
        } else {
            html = '<div class="empty-state"><p>Nenhuma opção disponível</p></div>';
        }
        popupBody.innerHTML = html;

        const mgrRef = this.app?.advancedFilterManager || window.advancedFilterManager;

        // If this is a dual-list based filter, wire dual-list listeners and confirm behaviour
        const dualTypes = ['cargo','lotacao','superintendencia','subsecretaria','urgencia','servidor'];
        if (dualTypes.includes(filterType)) {
            const dualId = filterType;
            // For urgencia, map internal values to display labels
            let dualValues = values || [];
            if (filterType === 'urgencia') {
                const map = { 'critical': '🔴 Crítica', 'high': '🟠 Alta', 'moderate': '🟡 Moderada', 'low': '🟢 Baixa' };
                dualValues = Object.values(map);
            }
            // Render dual list HTML (if not already created by render functions)
            if (!popupBody.querySelector(`[data-dual-list="${dualId}"]`)) {
                popupBody.innerHTML = this.createDualListBox(dualId, dualValues, [], 'Disponíveis', 'Selecionados');
            }
            setTimeout(() => this.setupDualListBoxListeners(dualId), 0);

            const confirmBtn = document.getElementById('confirmFilterPopupBtn');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    let selected = this.getDualListSelectedValues(dualId) || [];
                    // Map urgencia labels back to internal values
                    if (filterType === 'urgencia') {
                        const reverseMap = { '🔴 Crítica': 'critical', '🟠 Alta': 'high', '🟡 Moderada': 'moderate', '🟢 Baixa': 'low' };
                        selected = selected.map(s => reverseMap[s] || s);
                    }
                    console.log('[ModalManager] applying filter', filterType, selected);
                    try {
                        if (mgrRef && typeof mgrRef.setFilter === 'function') {
                            mgrRef.setFilter(filterType, selected.length === 1 ? selected[0] : selected);
                            console.log('[ModalManager] called setFilter on manager');
                        } else {
                            console.warn('[ModalManager] mgrRef.setFilter not available');
                        }
                    } catch (e) {
                        console.warn('[ModalManager] error calling setFilter', e);
                    }
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    console.log('[ModalManager] dispatching advanced-filters-changed');
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                };
            }
        } else {
            // Attach option handlers for static lists
            const optionButtons = popupBody.querySelectorAll('.filter-option-btn');
            optionButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const val = e.currentTarget.dataset.value;
                    try {
                        if (mgrRef && typeof mgrRef.setFilter === 'function') {
                            mgrRef.setFilter(filterType, val);
                        }
                    } catch (err) { console.warn('Erro ao aplicar filtro:', err); }
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                });
            });

            // Fallback handlers for special UIs
            if (filterType === 'servidor') {
                const input = popupBody.querySelector('#filterServidorSearchInput');
                const results = popupBody.querySelector('#filterServidorResults');
                const names = values.length ? values : (this.app?.dataStateManager?.getFilteredData ? (this.app.dataStateManager.getFilteredData() || []).map(s => (s.NOME||s.nome||s.SERVIDOR||s.servidor||'')).filter(Boolean) : []);
                const renderResults = (list) => {
                    if (!results) return;
                    results.innerHTML = list.map(n => `<button type="button" class="btn btn-link filter-option-btn" data-value="${this.escapeHtml(n)}">${this.escapeHtml(n)}</button>`).join('');
                    results.querySelectorAll('.filter-option-btn').forEach(b => b.addEventListener('click', (e) => {
                        const val = e.currentTarget.dataset.value;
                        try { if (mgrRef && typeof mgrRef.setFilter === 'function') mgrRef.setFilter('servidor', val); } catch (err) { console.warn(err); }
                        if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                        try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                        document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                    }));
                };
                renderResults(names.slice(0, 50));
                if (input) {
                    input.addEventListener('input', () => {
                        const q = (input.value || '').toLowerCase();
                        const filtered = names.filter(n => n && n.toLowerCase().includes(q));
                        renderResults(filtered.slice(0, 200));
                    });
                }
            }

            if (filterType === 'periodo') {
                const inicio = popupBody.querySelector('#filterPeriodoInicio');
                const fim = popupBody.querySelector('#filterPeriodoFim');
                const applyBtn = popupBody.querySelector('#applyPeriodoBtn');
                const clearBtn = popupBody.querySelector('#clearPeriodoBtn');
                if (applyBtn) applyBtn.addEventListener('click', () => {
                    const val = { inicio: inicio?.value || null, fim: fim?.value || null };
                    try { if (mgrRef && typeof mgrRef.setFilter === 'function') mgrRef.setFilter('periodo', val); } catch(e){ console.warn(e); }
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                });
                if (clearBtn) clearBtn.addEventListener('click', () => {
                    try { if (mgrRef && typeof mgrRef.removeFilter === 'function') mgrRef.removeFilter('periodo'); else if (mgrRef && typeof mgrRef.setFilter === 'function') mgrRef.setFilter('periodo', null); } catch(e){}
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                });
            }

            if (filterType === 'idade') {
                const min = popupBody.querySelector('#filterIdadeMin');
                const max = popupBody.querySelector('#filterIdadeMax');
                const applyBtn = popupBody.querySelector('#applyIdadeBtn');
                const clearBtn = popupBody.querySelector('#clearIdadeBtn');
                if (applyBtn) applyBtn.addEventListener('click', () => {
                    const val = { min: min?.value ? parseInt(min.value,10) : null, max: max?.value ? parseInt(max.value,10) : null };
                    try { if (mgrRef && typeof mgrRef.setFilter === 'function') mgrRef.setFilter('idade', val); } catch(e){ console.warn(e); }
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                });
                if (clearBtn) clearBtn.addEventListener('click', () => {
                    try { if (mgrRef && typeof mgrRef.removeFilter === 'function') mgrRef.removeFilter('idade'); else if (mgrRef && typeof mgrRef.setFilter === 'function') mgrRef.setFilter('idade', null); } catch(e){}
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                });
            }

            if (filterType === 'meses') {
                const input = popupBody.querySelector('#filterMesesInput');
                const applyBtn = popupBody.querySelector('#applyMesesBtn');
                if (applyBtn) applyBtn.addEventListener('click', () => {
                    const val = input?.value ? parseInt(input.value,10) : null;
                    try { if (mgrRef && typeof mgrRef.setFilter === 'function') mgrRef.setFilter('meses', val); } catch(e){ console.warn(e); }
                    if (typeof this._closeFilterConfigPopup === 'function') this._closeFilterConfigPopup();
                    try { if (mgrRef && typeof mgrRef.renderActiveFiltersList === 'function') mgrRef.renderActiveFiltersList(); } catch(e){}
                    document.dispatchEvent(new CustomEvent('advanced-filters-changed'));
                });
            }
        }

        popup.style.display = 'flex';
        popup.setAttribute('aria-hidden', 'false');
        popup.classList.add('active', 'show');
        setTimeout(() => { popup.focus(); }, 50);
    }

    /**
     * Normaliza texto removendo acentos para busca
     */
    normalizeText(text) {
        if (!text) return '';
            try {
                return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        } catch (e) {
            return String(text).toLowerCase();
        }
    }

    /**
     * Cria um componente Dual List Box (duas colunas para seleção)
     */
    createDualListBox(id, availableItems, selectedItems = [], availableLabel = 'Disponíveis', selectedLabel = 'Selecionados') {
        const selectedSet = new Set(selectedItems);
        const available = availableItems.filter(item => !selectedSet.has(item));

        return `
            <div class="dual-list-container" data-dual-list="${id}">
                <div class="dual-list-panel">
                    <div class="dual-list-header">
                        <span class="dual-list-title">
                            ${availableLabel}
                            <span class="dual-list-count" data-count-available>${available.length}</span>
                        </span>
                    </div>
                    <div class="dual-list-search">
                        <input type="text" placeholder="Buscar..." data-search-available autocomplete="off">
                    </div>
                    <div class="dual-list-items" data-items-available>
                        ${available.length > 0 ? available.map(item => `
                            <div class="dual-list-item" data-value="${this.escapeHtml(item)}" data-item-available>
                                <span class="dual-list-item-text">${this.escapeHtml(item)}</span>
                                <i class="bi bi-chevron-right dual-list-item-icon"></i>
                            </div>
                        `).join('') : `
                            <div class="dual-list-empty">
                                <div class="dual-list-empty-icon">✓</div>
                                <div class="dual-list-empty-text">Todos os itens foram selecionados</div>
                            </div>
                        `}
                    </div>
                </div>
                <div class="dual-list-panel selected">
                    <div class="dual-list-header">
                        <span class="dual-list-title">
                            ${selectedLabel}
                            <span class="dual-list-count" data-count-selected>${selectedItems.length}</span>
                        </span>
                    </div>
                    <div class="dual-list-search">
                        <input type="text" placeholder="Buscar..." data-search-selected autocomplete="off">
                    </div>
                    <div class="dual-list-items" data-items-selected>
                        ${selectedItems.length > 0 ? selectedItems.map(item => `
                            <div class="dual-list-item" data-value="${this.escapeHtml(item)}" data-item-selected>
                                <span class="dual-list-item-text">${this.escapeHtml(item)}</span>
                                <i class="bi bi-x-lg dual-list-item-icon"></i>
                            </div>
                        `).join('') : `
                            <div class="dual-list-empty">
                                <div class="dual-list-empty-icon">👈</div>
                                <div class="dual-list-empty-text">Clique nos itens à esquerda para selecioná-los</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configura os event listeners para um Dual List Box
     */
    setupDualListBoxListeners(id) {
        const container = document.querySelector(`[data-dual-list="${id}"]`);
        if (!container) return;

        const availableItems = container.querySelector('[data-items-available]');
        const selectedItems = container.querySelector('[data-items-selected]');
        const searchAvailable = container.querySelector('[data-search-available]');
        const searchSelected = container.querySelector('[data-search-selected]');
        const countAvailable = container.querySelector('[data-count-available]');
        const countSelected = container.querySelector('[data-count-selected]');

        // Prevent attaching listeners more than once
        if (container.dataset.listenersAttached) return;

        const renderItems = (parent, values, type) => {
            if (!parent) return;
            if (!Array.isArray(values) || values.length === 0) {
                parent.innerHTML = type === 'available' ? `
                    <div class="dual-list-empty">
                        <div class="dual-list-empty-icon">✓</div>
                        <div class="dual-list-empty-text">Todos os itens foram selecionados</div>
                    </div>
                ` : `
                    <div class="dual-list-empty">
                        <div class="dual-list-empty-icon">👈</div>
                        <div class="dual-list-empty-text">Clique nos itens à esquerda para selecioná-los</div>
                    </div>
                `;
                return;
            }
            const html = values.map(v => `
                <div class="dual-list-item" data-value="${this.escapeHtml(v)}" data-item-${type}>
                    <span class="dual-list-item-text">${this.escapeHtml(v)}</span>
                    <i class="bi ${type === 'available' ? 'bi-chevron-right' : 'bi-x-lg'} dual-list-item-icon"></i>
                </div>
            `).join('');
            parent.innerHTML = html;
        };

        const collectValues = (parent, selector) => Array.from(parent.querySelectorAll(selector)).map(n => n.querySelector('.dual-list-item-text')?.textContent?.trim() || n.dataset.value);

        const moveToSelected = (itemElement) => {
            const value = itemElement.dataset.value;
            const text = itemElement.querySelector('.dual-list-item-text')?.textContent || value;
            itemElement.remove();
            const newEl = document.createElement('div');
            newEl.className = 'dual-list-item';
            newEl.setAttribute('data-value', value);
            newEl.setAttribute('data-item-selected', '');
            newEl.innerHTML = `
                <span class="dual-list-item-text">${this.escapeHtml(text)}</span>
                <i class="bi bi-x-lg dual-list-item-icon"></i>
            `;
            selectedItems.appendChild(newEl);
            this.updateDualListCounts(container, countAvailable, countSelected);
        };

        const moveToAvailable = (itemElement) => {
            const value = itemElement.dataset.value;
            const text = itemElement.querySelector('.dual-list-item-text')?.textContent || value;
            itemElement.remove();
            const newEl = document.createElement('div');
            newEl.className = 'dual-list-item';
            newEl.setAttribute('data-value', value);
            newEl.setAttribute('data-item-available', '');
            newEl.innerHTML = `
                <span class="dual-list-item-text">${this.escapeHtml(text)}</span>
                <i class="bi bi-chevron-right dual-list-item-icon"></i>
            `;
            availableItems.appendChild(newEl);
            this.updateDualListCounts(container, countAvailable, countSelected);
        };

        availableItems.addEventListener('click', (e) => {
            const item = e.target.closest('[data-item-available]');
            if (item) moveToSelected(item);
        });

        selectedItems.addEventListener('click', (e) => {
            const item = e.target.closest('[data-item-selected]');
            if (item) moveToAvailable(item);
        });

        if (searchAvailable) {
            searchAvailable.addEventListener('input', (e) => {
                const searchTerm = this.normalizeText(e.target.value);
                const items = availableItems.querySelectorAll('[data-item-available]');
                let visibleCount = 0;
                items.forEach(item => {
                    const text = this.normalizeText(item.querySelector('.dual-list-item-text').textContent);
                    const matches = text.includes(searchTerm);
                    item.style.display = matches ? '' : 'none';
                    if (matches) visibleCount++;
                });
                const existingNoResults = availableItems.querySelector('.dual-list-no-results');
                if (existingNoResults) existingNoResults.remove();
                if (visibleCount === 0 && items.length > 0) {
                    const noResults = document.createElement('div');
                    noResults.className = 'dual-list-no-results';
                    noResults.innerHTML = `
                        <div class="dual-list-no-results-icon">🔍</div>
                        <div class="dual-list-no-results-text">Nenhum resultado encontrado</div>
                    `;
                    availableItems.appendChild(noResults);
                }
            });
        }

        if (searchSelected) {
            searchSelected.addEventListener('input', (e) => {
                const searchTerm = this.normalizeText(e.target.value);
                const items = selectedItems.querySelectorAll('[data-item-selected]');
                let visibleCount = 0;
                items.forEach(item => {
                    const text = this.normalizeText(item.querySelector('.dual-list-item-text').textContent);
                    const matches = text.includes(searchTerm);
                    item.style.display = matches ? '' : 'none';
                    if (matches) visibleCount++;
                });
                const existingNoResults = selectedItems.querySelector('.dual-list-no-results');
                if (existingNoResults) existingNoResults.remove();
                if (visibleCount === 0 && items.length > 0) {
                    const noResults = document.createElement('div');
                    noResults.className = 'dual-list-no-results';
                    noResults.innerHTML = `
                        <div class="dual-list-no-results-icon">🔍</div>
                        <div class="dual-list-no-results-text">Nenhum resultado encontrado</div>
                    `;
                    selectedItems.appendChild(noResults);
                }
            });
        }
        // mark listeners attached to avoid duplicates
        container.dataset.listenersAttached = 'true';
    }

    updateDualListCounts(container, countAvailable, countSelected) {
        const availableCount = container.querySelectorAll('[data-item-available]').length;
        const selectedCount = container.querySelectorAll('[data-item-selected]').length;
        if (countAvailable) countAvailable.textContent = availableCount;
        if (countSelected) countSelected.textContent = selectedCount;
    }

    getDualListSelectedValues(id) {
        const container = document.querySelector(`[data-dual-list="${id}"]`);
        if (!container) return [];
        const selectedItems = container.querySelectorAll('[data-item-selected]');
        return Array.from(selectedItems).map(item => item.querySelector('.dual-list-item-text')?.textContent?.trim() || item.dataset.value);
    }

    populateDualListBox(type, selectedValues) {
        const container = document.querySelector(`[data-dual-list="${type}"]`);
        if (!container) return;
        const availableItems = container.querySelector('[data-items-available]');
        const selectedItems = container.querySelector('[data-items-selected]');
        if (!Array.isArray(selectedValues)) selectedValues = [selectedValues];
        selectedValues.forEach(value => {
            const items = availableItems.querySelectorAll('[data-item-available]');
            for (const it of items) {
                const text = it.querySelector('.dual-list-item-text')?.textContent?.trim();
                if (text && text === String(value)) {
                    const evt = new Event('click', { bubbles: true });
                    it.dispatchEvent(evt);
                    break;
                }
            }
        });
    }
    /**
     * Mostra um alerta (substitui window.alert)
     * @param {string} message - Mensagem
     * @param {string} title - Título (opcional)
     * @returns {Promise} - Resolve quando fechado
     */
    alert(message, title = 'Atenção') {
        return new Promise((resolve) => {
            const modalId = 'alertModal';
            const content = `
                <div class="alert-content" style="padding: 1rem; text-align: center;">
                    <i class="bi bi-exclamation-circle" style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem; display: block;"></i>
                    <p style="font-size: 1.1rem; color: var(--text-primary);">${message}</p>
                </div>
            `;

            const footer = `
                <button class="btn btn-primary w-100" id="alert-ok-btn">OK</button>
            `;

            this.createModal({
                id: modalId,
                title: title,
                content: content,
                footer: footer,
                size: 'small',
                closeButton: true
            });

            const modal = document.getElementById(modalId);
            const okBtn = modal.querySelector('#alert-ok-btn');

            const closeHandler = () => {
                this.close(modalId);
                resolve();
            };

            okBtn.addEventListener('click', closeHandler);

            // Sobrescrever comportamento de fechar para resolver a promise também
            const originalClose = this.close.bind(this);
            this.close = (id, opts) => {
                originalClose(id, opts);
                if (id === modalId) resolve();
            };

            this.open(modalId);

            // Restaurar método close original após um tempo (hack seguro)
            setTimeout(() => {
                this.close = originalClose;
            }, 500);
        });
    }

    /**
     * Mostra confirmação (substitui window.confirm)
     * @param {string} message - Mensagem
     * @param {string} title - Título
     * @returns {Promise<boolean>} - Resolve true ou false
     */
    confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const modalId = 'confirmModal';
            // Ensure message is a string (avoid [object Object])
            let safeMessage = '';
            try {
                if (message === null || message === undefined) safeMessage = '';
                else if (typeof message === 'string') safeMessage = message;
                else if (message && typeof message === 'object') {
                    if (typeof message.message === 'string') safeMessage = message.message;
                    else safeMessage = JSON.stringify(message, null, 2);
                } else {
                    safeMessage = String(message);
                }
            } catch (e) {
                safeMessage = String(message);
            }

            const content = `
                <div class="confirm-content" style="padding: 1rem; text-align: center;">
                    <i class="bi bi-question-circle" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem; display: block;"></i>
                    <p style="font-size: 1.1rem; color: var(--text-primary); white-space: pre-wrap; text-align: left;">${this.escapeHtml(safeMessage)}</p>
                </div>
            `;

            const footer = `
                <div style="display: flex; gap: 1rem; width: 100%;">
                    <button class="btn btn-secondary w-50" id="confirm-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary w-50" id="confirm-ok-btn">Confirmar</button>
                </div>
            `;

            this.createModal({
                id: modalId,
                title: title,
                content: content,
                footer: footer,
                size: 'small',
                closeButton: false
            });

            const modal = document.getElementById(modalId);
            const okBtn = modal.querySelector('#confirm-ok-btn');
            const cancelBtn = modal.querySelector('#confirm-cancel-btn');

            okBtn.addEventListener('click', () => {
                this.close(modalId);
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                this.close(modalId);
                resolve(false);
            });

            this.open(modalId);
        });
    }

    // ============================================================
    // GERAÇÃO DE CONTEÚDO (Migrado de ModalContentManager)
    // ============================================================

    /**
     * Mostra modal de detalhes do servidor
     * @param {Object} servidor - Objeto do servidor
     */
    /**
     * Versão portada e adaptada da showServidorDetails do dashboard.js legado
     * @param {string|object} nomeOuServidor - Nome do servidor (string) ou objeto servidor
     */
    showServidorDetails(nomeOuServidor) {
        console.log('[ModalManager] showServidorDetails chamado com:', nomeOuServidor);

        // Extrair nome do servidor (pode receber string ou objeto)
        let nomeServidor;
        if (typeof nomeOuServidor === 'string') {
            nomeServidor = nomeOuServidor;
        } else if (nomeOuServidor && typeof nomeOuServidor === 'object') {
            nomeServidor = nomeOuServidor.NOME || nomeOuServidor.nome || nomeOuServidor.SERVIDOR || nomeOuServidor.servidor;
        }

        console.log('[ModalManager] Nome extraído:', nomeServidor);

        // Buscar todos os registros do servidor
        const allServidores = this.app.dataStateManager.getAllServidores();
        console.log('[ModalManager] Total servidores:', allServidores.length);

        const servidoresComMesmoNome = allServidores.filter(s =>
            s.nome === nomeServidor || s.NOME === nomeServidor || s.servidor === nomeServidor || s.SERVIDOR === nomeServidor
        );

        console.log('[ModalManager] Servidores encontrados:', servidoresComMesmoNome.length);

        if (!servidoresComMesmoNome || servidoresComMesmoNome.length === 0) {
            console.error('[ModalManager] Nenhum servidor encontrado!');
            return;
        }

        // Consolidar dados do servidor
        const servidor = { ...servidoresComMesmoNome[0] };
        // CORREÇÃO: dadosOriginais pode não existir, usar o próprio registro
        servidor.todosOsDadosOriginais = servidoresComMesmoNome.map(s => s.dadosOriginais || s);

        // IMPORTANTE: Em licença prêmio, cada LINHA do CSV É uma licença
        // Se não tiver array de licencas, usar os próprios registros
        servidor.licencas = servidoresComMesmoNome.flatMap(s => Array.isArray(s.licencas) ? s.licencas : []);
        if (servidor.licencas.length === 0) {
            // Usar os próprios registros como licenças (cada linha CSV = uma licença)
            servidor.licencas = servidoresComMesmoNome;
        }

        console.log('[ModalManager] Licenças consolidadas:', servidor.licencas.length);

        // Normalizar nome (pode vir como 'nome', 'NOME', 'servidor' ou 'SERVIDOR')
        if (!servidor.nome) {
            servidor.nome = servidor.NOME || servidor.servidor || servidor.SERVIDOR || nomeServidor;
        }

        // Extrair dados do primeiro registro (DEVE VIR ANTES)
        const primeiroRegistro = servidor.todosOsDadosOriginais?.[0] || {};

        console.log('[ModalManager] DEBUG - primeiroRegistro:', primeiroRegistro);
        console.log('[ModalManager] DEBUG - campos disponíveis:', Object.keys(primeiroRegistro));

        // IMPORTANTE: Como só existe licença prêmio no sistema, sempre TRUE
        const isLicencaPremio = true;

        console.log('[ModalManager] isLicencaPremio:', isLicencaPremio);
        // Helper para buscar campo
        const buscarCampo = (keys, exclude = []) => {
            const entrada = Object.entries(primeiroRegistro).find(([k]) => {
                const keyUpper = k.toUpperCase();
                const match = keys.some(key => keyUpper === key || keyUpper.includes(key));
                if (match && exclude.length) {
                    return !exclude.some(ex => keyUpper.includes(ex));
                }
                return match;
            });
            return entrada?.[1] || '';
        };
        const cargo = buscarCampo(['CARGO']);
        const lotacao = buscarCampo(['LOTACAO', 'LOTAÇÃO']);
        const unidade = buscarCampo(['UNIDADE']);
        const numero = buscarCampo(['NUMERO', 'NÚMERO']);
        const cpf = buscarCampo(['CPF']);
        const rg = buscarCampo(['RG'], ['CARGO']);

        console.log('[ModalManager] DEBUG - campos extraídos:', { cargo, lotacao, unidade, numero, cpf, rg });

        // Calcular balanço (EXATO DO DASHBOARD ANTIGO - linha 6141-6143)
        const balancoInfo = isLicencaPremio
            ? this.calcularSaldoServidorCompleto(servidoresComMesmoNome)
            : { dias: 0, diasGanhos: 0, diasUsados: 0, periodosTotal: 0 };

        console.log('[ModalManager] DEBUG - balancoInfo:', balancoInfo);

        const percentualUsado = balancoInfo.diasGanhos > 0 
            ? Math.round((balancoInfo.diasUsados / balancoInfo.diasGanhos) * 100) 
            : 0;
        const progressClass = percentualUsado < 50 ? 'baixo' : percentualUsado < 80 ? 'medio' : 'alto';

        // ==================== HERO CARD (COPIADO EXATO DO DASHBOARD.JS) ====================
        let heroHTML = `
            <div class="hero-header">
                <div class="hero-info">
                    ${cargo ? `<div class="hero-cargo">${this.escapeHtml(cargo)}</div>` : ''}
                    <h2 class="hero-name">${this.escapeHtml(servidor.nome)}</h2>
                    <div class="hero-meta">
                        ${lotacao ? `<span class="hero-meta-item"><i class="bi bi-building"></i> ${this.escapeHtml(lotacao)}</span>` : ''}
                        ${unidade ? `<span class="hero-meta-item"><i class="bi bi-geo-alt"></i> ${this.escapeHtml(unidade)}</span>` : ''}
                        ${numero ? `<span class="hero-meta-item"><i class="bi bi-hash"></i> ${this.escapeHtml(numero)}</span>` : ''}
                    </div>
                </div>
                <div class="hero-saldo">
                    <div class="hero-saldo-label">Saldo Disponível</div>
                    <div class="hero-saldo-value ${balancoInfo.dias > 0 ? 'positivo' : 'zerado'}">${balancoInfo.dias}</div>
                    <div class="hero-saldo-unit">dias</div>
                </div>
            </div>
        `;

        if (isLicencaPremio && balancoInfo.diasGanhos > 0) {
            heroHTML += `
                <div class="hero-stats">
                    <div class="hero-stat">
                        <div class="hero-stat-value stat-periodos">${balancoInfo.periodosTotal}</div>
                        <div class="hero-stat-label">Períodos (5 anos)</div>
                    </div>
                    <div class="hero-stat">
                        <div class="hero-stat-value stat-direito">${balancoInfo.diasGanhos}</div>
                        <div class="hero-stat-label">Dias de Direito</div>
                    </div>
                    <div class="hero-stat">
                        <div class="hero-stat-value stat-usado">${balancoInfo.diasUsados}</div>
                        <div class="hero-stat-label">Dias Utilizados</div>
                    </div>
                </div>
                <div class="hero-progress">
                    <div class="hero-progress-bar">
                        <div class="hero-progress-fill ${progressClass}" style="width: ${percentualUsado}%"></div>
                    </div>
                    <div class="hero-progress-label">
                        <span>${percentualUsado}% utilizado</span>
                        <span>${balancoInfo.dias} dias restantes</span>
                    </div>
                </div>
            `;
        }

        // ==================== LICENÇAS GOZADAS (visualização rápida) ====================
        let licencasHTML = '';
        let licencaIndex = 0;
        servidor.licencas.forEach((licenca) => {
            const dataInicio = licenca.A_PARTIR || licenca.aPartir || licenca.inicio;
            const dataFim = licenca.TERMINO || licenca.termino || licenca.fim;
            const diasGozo = parseInt(licenca.GOZO || licenca.gozo || 0);
            const saldoRestante = parseInt(licenca.RESTANDO || licenca.restando || 0);
            const aquisitivoInicio = licenca.AQUISITIVO_INICIO || licenca.aquisitivoInicio;
            const aquisitivoFim = licenca.AQUISITIVO_FIM || licenca.aquisitivoFim;
            if (!dataInicio || !dataFim) return;
            licencaIndex++;
            const formatDate = (date) => {
                if (!date) return '-';
                if (typeof date === 'string') return date;
                if (date instanceof Date) return date.toLocaleDateString('pt-BR');
                return String(date);
            };
            const extractYear = (date) => {
                if (!date) return '?';
                if (typeof date === 'string') {
                    const match = date.match(/(\d{4})/);
                    return match ? match[1] : '';
                }
                return date instanceof Date ? date.getFullYear() : '';
            };
            const parseDate = (d) => {
                if (!d) return null;
                if (d instanceof Date) return d;
                if (typeof d === 'string') {
                    let match = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                    if (match) {
                        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                    }
                    match = d.match(/(\d{4})-(\d{2})-(\d{2})/);
                    if (match) {
                        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                    }
                    const parsed = new Date(d);
                    if (!isNaN(parsed)) return parsed;
                }
                return null;
            };
            const inicio = parseDate(dataInicio);
            const fim = parseDate(dataFim);
            let blocos = [];
            let totalDiasCalculado = 0;
            if (inicio && fim && !isNaN(inicio) && !isNaN(fim)) {
                totalDiasCalculado = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
                let dataAtual = new Date(inicio);
                let diasRestantes = totalDiasCalculado;
                let blocoNum = 1;
                while (diasRestantes > 0) {
                    const diasNoBloco = Math.min(30, diasRestantes);
                    const dataFimBloco = new Date(dataAtual);
                    dataFimBloco.setDate(dataFimBloco.getDate() + diasNoBloco - 1);
                    let tipoBloco = 'bloco-meio';
                    let labelBloco = `Bloco ${blocoNum}`;
                    if (blocoNum === 1) {
                        tipoBloco = 'bloco-inicio';
                        labelBloco = 'Início';
                    } else if (diasRestantes <= 30) {
                        tipoBloco = 'bloco-fim';
                        labelBloco = 'Fim';
                    }
                    blocos.push({
                        tipo: tipoBloco,
                        label: labelBloco,
                        dias: diasNoBloco,
                        inicio: dataAtual.toLocaleDateString('pt-BR'),
                        fim: dataFimBloco.toLocaleDateString('pt-BR')
                    });
                    dataAtual = new Date(dataFimBloco);
                    dataAtual.setDate(dataAtual.getDate() + 1);
                    diasRestantes -= diasNoBloco;
                    blocoNum++;
                }
            }
            const periodoAquisitivo = aquisitivoInicio && aquisitivoFim 
                ? `${extractYear(aquisitivoInicio)} - ${extractYear(aquisitivoFim)}`
                : 'N/A';
            const totalMeses = blocos.length;
            const diasExibir = diasGozo > 0 ? diasGozo : totalDiasCalculado;
            const blocosHTML = blocos.map((bloco, idx) => `
                <div class="licenca-bloco ${bloco.tipo}" style="min-width:120px; border:2px solid #3b82f6; border-radius:8px; overflow:hidden; background:#1e293b;">
                    <div class="bloco-header" style="display:flex; align-items:center; gap:0.35rem; padding:0.4rem 0.5rem; background:#334155; border-bottom:1px solid #475569;">
                        <i class="bi bi-calendar3 bloco-icon" style="color:#3b82f6;"></i>
                        <span class="bloco-label" style="font-size:0.7rem; font-weight:700; text-transform:uppercase;">${bloco.label}</span>
                        <span class="bloco-dias" style="margin-left:auto; font-size:0.65rem; font-weight:700; color:white; background:#3b82f6; padding:0.15rem 0.4rem; border-radius:3px;">${bloco.dias}d</span>
                    </div>
                    <div class="bloco-datas" style="padding:0.5rem; font-size:0.8rem; line-height:1.5;">
                        <div style="color:#e2e8f0;">${bloco.inicio}</div>
                        <div style="color:#94a3b8;">${bloco.fim}</div>
                    </div>
                </div>
            `).join('');
            licencasHTML += `
                <div class="licenca-card expanded" data-licenca-index="${licencaIndex}" style="background:#0f172a; border:1px solid #334155; border-radius:8px; margin-bottom:0.5rem;">
                    <div class="licenca-card-header" style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.75rem; background:#1e293b; border-bottom:1px solid #334155;">
                        <div class="licenca-card-title" style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; font-weight:600; color:#e2e8f0;">
                            <i class="bi bi-calendar2-check" style="color:#3b82f6;"></i>
                            <span>Período ${licencaIndex}</span>
                        </div>
                        <div class="licenca-total-info" style="font-size:0.75rem; color:#3b82f6; font-weight:600;">
                            <span class="total-meses">${totalMeses} ${totalMeses === 1 ? 'mês' : 'meses'} (${diasExibir} dias)</span>
                        </div>
                    </div>
                    <div class="licenca-card-body" style="padding:0.75rem !important; display:block !important; height:auto !important; max-height:none !important; overflow:visible !important;">
                        <div class="licenca-blocos" style="display:flex !important; flex-wrap:wrap !important; gap:0.6rem !important;">
                            ${blocosHTML}
                        </div>
                    </div>
                    <div class="licenca-card-footer" style="padding:0.5rem 0.75rem; background:#1e293b; border-top:1px solid #334155; font-size:0.7rem; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
                        <span class="licenca-aquisitivo">
                            <i class="bi bi-calendar-range" style="color:#3b82f6;"></i> Período Aquisitivo: ${periodoAquisitivo}
                        </span>
                    </div>
                </div>
            `;
        });

        // ==================== PERÍODOS AQUISITIVOS ====================
        let periodosHTML = '';
        const periodosMap = new Map();
        servidor.licencas.forEach(licenca => {
            const aquisitivoInicio = licenca.AQUISITIVO_INICIO || licenca.aquisitivoInicio;
            const aquisitivoFim = licenca.AQUISITIVO_FIM || licenca.aquisitivoFim;
            if (aquisitivoInicio && aquisitivoFim) {
                const periodoKey = `${aquisitivoInicio}-${aquisitivoFim}`;
                if (!periodosMap.has(periodoKey)) {
                    periodosMap.set(periodoKey, {
                        inicio: aquisitivoInicio,
                        fim: aquisitivoFim,
                        gozos: [],
                        diasGozados: 0,
                        diasRestando: 0
                    });
                }
                const periodo = periodosMap.get(periodoKey);
                periodo.gozos.push(licenca);
                let gozo = parseInt(licenca.GOZO || licenca.gozo || 0);
                if (gozo === 0) {
                    const parseDate = (d) => {
                        if (!d) return null;
                        if (d instanceof Date) return d;
                        if (typeof d === 'string') {
                            let match = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                            if (match) {
                                return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                            }
                            match = d.match(/(\d{4})-(\d{2})-(\d{2})/);
                            if (match) {
                                return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                            }
                            const parsed = new Date(d);
                            if (!isNaN(parsed)) return parsed;
                        }
                        return null;
                    };
                    const dataInicioRaw = licenca.A_PARTIR || licenca.aPartir || licenca.inicio;
                    const dataFimRaw = licenca.TERMINO || licenca.termino || licenca.fim;
                    const inicio = parseDate(dataInicioRaw);
                    const fim = parseDate(dataFimRaw);
                    if (inicio && fim && !isNaN(inicio) && !isNaN(fim)) {
                        gozo = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
                    }
                }
                periodo.diasGozados += gozo;
            }
        });

        // Recalcular saldo restante de cada período
        periodosMap.forEach((periodo) => {
            // Cada período = 90 dias de direito
            // Se gozou >= 90, restante = 0 (completo)
            // Se gozou < 90, restante = 90 - gozado
            periodo.diasRestando = Math.max(0, 90 - periodo.diasGozados);
        });
        if (periodosMap.size > 0) {
            let periodoIndex = 0;
            periodosMap.forEach((periodo, key) => {
                const diasDireito = 90;
                const percentual = Math.min(100, Math.round((periodo.diasGozados / diasDireito) * 100));
                const progressClassPeriodo = percentual < 50 ? 'baixo' : percentual < 80 ? 'medio' : 'alto';
                const isFirst = periodoIndex === 0;
                const extractYear = (date) => {
                    if (!date) return '?';
                    if (typeof date === 'string') {
                        const match = date.match(/(\d{4})/);
                        return match ? match[1] : date.substring(0, 4);
                    }
                    return date instanceof Date ? date.getFullYear() : String(date).substring(0, 4);
                };
                const anoInicio = extractYear(periodo.inicio);
                const anoFim = extractYear(periodo.fim);
                const periodoLabel = `${anoInicio} - ${anoFim}`;
                const numeroOrdinal = periodoIndex + 1;
                periodosHTML += `
                    <div class="periodo-accordion ${isFirst ? 'active' : ''}">
                        <div class="periodo-accordion-header">
                            <div class="periodo-indicator ${periodo.diasRestando > 0 ? 'parcial' : 'completo'}">
                                ${numeroOrdinal}º
                            </div>
                            <div class="periodo-info">
                                <div class="periodo-dates">Período Aquisitivo: ${periodoLabel}</div>
                                <div class="periodo-summary">${periodo.diasGozados}/${diasDireito} dias utilizados</div>
                            </div>
                            <div class="periodo-progress-mini">
                                <div class="periodo-progress-mini-fill ${progressClassPeriodo}" style="width: ${percentual}%"></div>
                            </div>
                            <span class="periodo-saldo-badge ${periodo.diasRestando > 0 ? 'positivo' : 'zerado'}">
                                ${periodo.diasRestando > 0 ? `${periodo.diasRestando}d restantes` : 'Completo'}
                            </span>
                            <i class="bi bi-chevron-down periodo-expand-icon"></i>
                        </div>
                        <div class="periodo-accordion-content">
                            <div class="periodo-accordion-body">
                                <div class="periodo-gozos-header">
                                    <i class="bi bi-calendar-event"></i>
                                    <span>Licenças gozadas</span>
                                </div>
                                <div class="gozos-timeline">
                `;
                periodo.gozos.forEach((gozo, gozoIdx) => {
                    const formatDate = (date) => {
                        if (!date) return '-';
                        if (typeof date === 'string') return date;
                        if (date instanceof Date) return date.toLocaleDateString('pt-BR');
                        return String(date);
                    };
                    const parseDate = (d) => {
                        if (!d) return null;
                        if (d instanceof Date) return d;
                        if (typeof d === 'string') {
                            let match = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                            if (match) {
                                return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                            }
                            match = d.match(/(\d{4})-(\d{2})-(\d{2})/);
                            if (match) {
                                return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                            }
                            const parsed = new Date(d);
                            if (!isNaN(parsed)) return parsed;
                        }
                        return null;
                    };
                    const dataInicioRaw = gozo.A_PARTIR || gozo.aPartir || gozo.inicio;
                    const dataFimRaw = gozo.TERMINO || gozo.termino || gozo.fim;
                    // Função para formatar datas no padrão dd/mm/yyyy
                    const formatDateBR = (date) => {
                        if (!date) return '-';
                        if (typeof date === 'string') {
                            const d = new Date(date.replace(' ', 'T'));
                            if (!isNaN(d)) {
                                return d.toLocaleDateString('pt-BR');
                            }
                            // fallback: tentar manualmente
                            const match = date.match(/(\d{4})-(\d{2})-(\d{2})/);
                            if (match) return `${match[3]}/${match[2]}/${match[1]}`;
                            return date;
                        }
                        if (date instanceof Date) return date.toLocaleDateString('pt-BR');
                        return String(date);
                    };
                    const dataInicio = formatDateBR(dataInicioRaw);
                    const dataFim = formatDateBR(dataFimRaw);
                    let diasGozo = parseInt(gozo.GOZO || gozo.gozo || 0);
                    if (diasGozo === 0) {
                        const inicio = parseDate(dataInicioRaw);
                        const fim = parseDate(dataFimRaw);
                        if (inicio && fim && !isNaN(inicio) && !isNaN(fim)) {
                            diasGozo = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
                        }
                    }
                    const saldoPos = parseInt(gozo.RESTANDO || gozo.restando || 0);
                    periodosHTML += `
                        <div class="gozo-timeline-item">
                            <div class="gozo-content">
                                <div class="gozo-dates">${dataInicio} → ${dataFim}</div>
                                <div class="gozo-info">
                                    <span class="gozo-dias"><i class="bi bi-calendar-check"></i> ${diasGozo} dias</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                periodosHTML += `
                                </div>
                                <div class="periodo-resumo">
                                    <div class="periodo-resumo-item">
                                        <span class="periodo-resumo-label">Total utilizado:</span>
                                        <span class="periodo-resumo-value">${periodo.diasGozados} dias</span>
                                    </div>
                                    <div class="periodo-resumo-item">
                                        <span class="periodo-resumo-label">Saldo restante:</span>
                                        <span class="periodo-resumo-value">${periodo.diasRestando} dias</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                periodoIndex++;
            });
        } else {
            periodosHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-x"></i>
                    <p>Nenhum período aquisitivo encontrado</p>
                </div>
            `;
        }

        // ==================== PREENCHER O MODAL ====================
        const modalId = 'detailsModal';
        const title = `Detalhes do Servidor`;
        // ORDEM CORRETA (conforme index.html linha 1199-1221):
        // 1. Hero Card (com classe servidor-hero-card)
        // 2. Períodos Aquisitivos (com container periodos-section + header)
        // 3. Licenças Gozadas (com container licencas-section + header)
        const content = `
            <div class="servidor-hero-card" id="servidorHeroCard">${heroHTML}</div>

            <div class="periodos-section" id="periodosSection">
                <div class="periodos-section-header">
                    <h4><i class="bi bi-calendar-range"></i> Períodos Aquisitivos</h4>
                </div>
                <div class="periodos-section-content" id="periodosContent">
                    ${periodosHTML}
                </div>
            </div>

            <div class="licencas-section" id="licencasSection">
                <div class="licencas-section-header">
                    <h4><i class="bi bi-calendar-check"></i> Detalhes das Licenças Gozadas</h4>
                    <span class="licencas-count" id="licencasCount">${servidor.licencas.length} períodos</span>
                </div>
                <div class="licencas-section-content" id="licencasContent">
                    ${licencasHTML}
                </div>
            </div>
        `;

        console.log('[ModalManager] HTML gerado:');
        console.log('- heroHTML length:', heroHTML.length);
        console.log('- licencasHTML length:', licencasHTML.length);
        console.log('- periodosHTML length:', periodosHTML.length);
        console.log('- content length:', content.length);

        const existingModal = document.getElementById(modalId);
        if (!existingModal) {
            console.log('[ModalManager] Criando novo modal detailsModal');
            this.createModal({
                id: modalId,
                title: title,
                content: content,
                size: 'large',
                closeButton: true
            });
        } else {
            console.log('[ModalManager] Atualizando modal existente');
            this.updateTitle(modalId, title);
            this.updateContent(modalId, content);
        }
        setTimeout(() => {
            this._setupAccordionListeners(modalId);
        }, 100);
        this.open(modalId);
    }

    /**
     * Mostra modal de problemas de carregamento
     */
    showProblemsModal() {
        const modalId = 'problemsModal';
        const problems = this.app.loadingProblems || [];

        if (!problems || problems.length === 0) {
            this.alert('Nenhum problema encontrado durante o carregamento.', 'Tudo Certo');
            return;
        }

        let content = `<div class="problems-list" style="max-height: 60vh; overflow-y: auto;">`;
        content += `<div class="alert alert-warning">Total de problemas encontrados: <strong>${problems.length}</strong></div>`;
        content += `<div class="problem-items">`;

        problems.forEach((problem, index) => {
            content += `
                <div class="card mb-2">
                    <div class="card-header d-flex justify-content-between align-items-center py-2">
                        <span class="badge bg-secondary">${index + 1}</span>
                        <span class="badge bg-danger">${problem.tipo || 'ERRO'}</span>
                    </div>
                    <div class="card-body py-2">
                        <div class="small"><strong>Servidor:</strong> ${problem.servidor || 'N/A'}</div>
                        <div class="small"><strong>Linha:</strong> ${problem.linha || 'N/A'}</div>
                        <div class="mt-1 text-danger"><strong>Mensagem:</strong> ${problem.mensagem}</div>
                    </div>
                </div>
            `;
        });

        content += `</div></div>`;

        this.createModal({
            id: modalId,
            title: '⚠️ Problemas no Carregamento',
            content: content,
            size: 'medium',
            closeButton: true
        });

        this.open(modalId);
    }

    /**
     * Mostra modal de Timeline (Lista de servidores)
     * @param {string} label - Título do período
     * @param {Array} servidores - Lista de servidores
     * @param {string} period - Identificador do período
     */
    showTimelineModal(label, servidores, period) {
        if (!servidores || servidores.length === 0) {
            this.alert('Nenhum servidor encontrado para este período.', 'Timeline');
            return;
        }

        const modalId = 'timelineModal';

        // Armazenar estado para ordenação
        this.currentTimelineState = {
            label,
            servidores: [...servidores], // Copia para não mutar original
            period,
            sortField: 'nome',
            sortDirection: 'asc'
        };

        const content = this._generateTimelineContent();

        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            this.updateTitle(modalId, `Timeline - ${label}`);
            this.updateContent(modalId, content);
            this.open(modalId);
        } else {
            this.createModal({
                id: modalId,
                title: `Timeline - ${label}`,
                content: content,
                size: 'large',
                closeButton: true
            });
            this.open(modalId);
        }
    }

    /**
     * Gera conteúdo do modal de timeline (com suporte a ordenação)
     * @private
     */
    _generateTimelineContent() {
        if (!this.currentTimelineState) return '';
        const { servidores, sortField, sortDirection, label } = this.currentTimelineState;

        // Ordenar
        const sorted = [...servidores].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Campos calculados
            if (sortField === 'diasRestantes') {
                // Mock de função se não existir globalmente - tentar usar dados do objeto
                valA = a.nome;
                valB = b.nome;
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        const getSortIcon = (field) => {
            if (sortField !== field) return '';
            return sortDirection === 'asc' ? '↑' : '↓';
        };

        let html = `
            <div class="timeline-modal-content">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <p class="mb-0 text-muted">${servidores.length} servidor(es)</p>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary ${sortField === 'nome' ? 'active' : ''}" onclick="window.app.modalManager.sortTimeline('nome')">Nome ${getSortIcon('nome')}</button>
                        <button class="btn btn-outline-secondary ${sortField === 'cargo' ? 'active' : ''}" onclick="window.app.modalManager.sortTimeline('cargo')">Cargo ${getSortIcon('cargo')}</button>
                    </div>
                </div>
                <div class="list-group" style="max-height: 60vh; overflow-y: auto;">
        `;

        sorted.forEach(servidor => {
            // Tentar calcular urgência com o UrgencyAnalyzer novo
            let urgenciaClass = 'secondary';
            let urgenciaLabel = 'N/A';

            if (typeof UrgencyAnalyzer !== 'undefined' && servidor.dataExpiracao) {
                const urg = UrgencyAnalyzer.calcularUrgencia(servidor.dataExpiracao);
                urgenciaLabel = urg.nivel;
                urgenciaClass = urg.nivel === 'CRITICA' ? 'danger' : (urg.nivel === 'ALTA' ? 'warning' : 'success');
            }

            // Precisamos escapar as strings para passar no onclick
            const nomeEscaped = (servidor.nome || '').replace(/'/g, "\\'");
            const cargo = (servidor.cargo || '').replace(/'/g, "\\'");
            const lotacao = (servidor.lotacao || '').replace(/'/g, "\\'");

            html += `
                <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                    onclick="window.app.modalManager.showServidorDetails({nome: '${nomeEscaped}', cargo: '${cargo}', lotacao: '${lotacao}', admissao: '${servidor.admissao || ''}', licenca: []})">
                    
                    <div>
                        <div class="fw-bold">${servidor.nome}</div>
                        <small class="text-muted">${servidor.cargo || 'Cargo N/A'}</small>
                    </div>
                    <div>
                        <span class="badge bg-${urgenciaClass}">${urgenciaLabel}</span>
                    </div>
                </button>
            `;
        });

        html += `</div></div>`;
        return html;
    }

    /**
     * Ordena a timeline atual
     * @param {string} field - Campo para ordenar
     */
    sortTimeline(field) {
        if (!this.currentTimelineState) return;

        if (this.currentTimelineState.sortField === field) {
            // Inverter direção
            this.currentTimelineState.sortDirection = this.currentTimelineState.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentTimelineState.sortField = field;
            this.currentTimelineState.sortDirection = 'asc';
        }

        const content = this._generateTimelineContent();
        this.updateContent('timelineModal', content);
    }

    /**
     * Mostra estatísticas do período
     */
    showPeriodStatsModal(periodLabel, servidores, periodFilter) {
        if (!servidores || servidores.length === 0) {
            this.alert('Nenhum servidor encontrado.', 'Estatísticas');
            return;
        }

        // Reutilizar lógica da timeline, mas com cabeçalho de stats
        this.showTimelineModal(periodLabel, servidores, periodFilter);
    }

    /**
     * Processa dados do servidor (Portado e adaptado do legado)
     * @private
     */
    _processarDadosServidor(servidorInput) {
        // Garantir compatibilidade com campos em maiúsculas/minúsculas
        let servidor = { ...servidorInput };
        // Se vier de planilha, mapear campos para minúsculo
        const mapField = (obj, key) => obj[key] || obj[key.toUpperCase()] || obj[key.toLowerCase()] || '';
        if (servidor.dadosOriginais && typeof servidor.dadosOriginais === 'object') {
            const orig = servidor.dadosOriginais;
            servidor = {
                ...orig,
                ...servidor, // prioriza campos já presentes
            };
        }
        servidor.nome = servidor.nome || servidor.servidor || mapField(servidor, 'nome') || mapField(servidor, 'servidor') || 'NOME NÃO INFORMADO';
        servidor.cargo = servidor.cargo || mapField(servidor, 'cargo') || 'CARGO NÃO INFORMADO';
        servidor.lotacao = servidor.lotacao || mapField(servidor, 'lotacao') || 'N/A';
        servidor.matricula = servidor.matricula || mapField(servidor, 'matricula') || 'N/A';
        servidor.admissao = servidor.admissao || mapField(servidor, 'admissao') || '-';
        // Tentar extrair licenças/períodos de campos alternativos (planilha)
        servidor.licencas = servidor.licencas || mapField(servidor, 'licencas') || [];
        // Se não houver array de licenças, mas houver campos de período/gozo, criar um array fake
        if ((!Array.isArray(servidor.licencas) || servidor.licencas.length === 0) && (servidor.GOZO || servidor.AQUISITIVO_INICIO || servidor.AQUISITIVO_FIM)) {
            servidor.licencas = [{
                inicio: servidor.A_PARTIR || servidor.AQUISITIVO_INICIO || '',
                fim: servidor.TERMINO || servidor.AQUISITIVO_FIM || '',
                dias: servidor.GOZO || '',
                saldo: servidor.RESTANDO || '',
                tipo: servidor.CARGO || servidor.cargo || '',
                aquisitivoInicio: servidor.AQUISITIVO_INICIO || '',
                aquisitivoFim: servidor.AQUISITIVO_FIM || '',
            }];
        }
        // Agrupar licenças por período aquisitivo
        const periodosMap = new Map();
        (servidor.licencas || []).forEach(licenca => {
            const aquisitivoInicio = licenca.AQUISITIVO_INICIO || licenca.aquisitivoInicio || licenca.aquisitivo_inicio || licenca.inicio || '';
            const aquisitivoFim = licenca.AQUISITIVO_FIM || licenca.aquisitivoFim || licenca.aquisitivo_fim || licenca.fim || '';
            const periodoKey = `${aquisitivoInicio}-${aquisitivoFim}`;
            if (!periodosMap.has(periodoKey)) {
                periodosMap.set(periodoKey, {
                    inicio: aquisitivoInicio,
                    fim: aquisitivoFim,
                    licencas: [],
                });
            }
            periodosMap.get(periodoKey).licencas.push(licenca);
        });
        servidor.periodos = Array.from(periodosMap.values()).filter(p => p.inicio || p.fim || (p.licencas && p.licencas.length));
        // Dados originais: exibir tudo que não for nome/cargo/lotacao/matricula/admissao
        servidor.todosOsDadosOriginais = servidor.todosOsDadosOriginais || [];
        const dadosOriginais = {};
        Object.entries(servidorInput).forEach(([k, v]) => {
            const key = k.toUpperCase();
            if (!['NOME','CARGO','LOTACAO','MATRICULA','ADMISSAO','LICENCAS','PERIODOS'].includes(key) && v && v !== '') {
                dadosOriginais[k] = v;
            }
        });
        if (Object.keys(dadosOriginais).length > 0) {
            servidor.todosOsDadosOriginais.push(dadosOriginais);
        }
        // Debug: logar entrada
        if (typeof window !== 'undefined' && window.DEBUG_MODAL) {
            console.log('[ModalManager] _processarDadosServidor input:', servidorInput);
        }

        // Tentar encontrar outros registros do mesmo servidor (se DataStateManager estiver disponível)
        let todosOsDadosOriginais = [];
        let todasLicencas = [];

        // Fallback: garantir nome
        const nomeServidor = servidor.nome || servidor.servidor || '';

        if (this.app && this.app.dataStateManager && typeof this.app.dataStateManager.getAllServidores === 'function') {
            const allServidores = this.app.dataStateManager.getAllServidores();
            const sameServidor = allServidores.filter(s => (s.nome || s.servidor) === nomeServidor);
            sameServidor.forEach(s => {
                if (s.dadosOriginais) todosOsDadosOriginais.push(s.dadosOriginais);
                if (s.licencas && s.licencas.length > 0) {
                    todasLicencas = [...todasLicencas, ...s.licencas];
                }
            });
        } else {
            // Fallback se não tiver state manager ou se for mock
            if (servidor.dadosOriginais) todosOsDadosOriginais.push(servidor.dadosOriginais);
            if (servidor.licencas) todasLicencas = [...servidor.licencas];
        }

        // Se não encontrou nada, tentar usar o próprio objeto
        if (todosOsDadosOriginais.length === 0 && servidor.dadosOriginais) {
            todosOsDadosOriginais.push(servidor.dadosOriginais);
        }
        if (todasLicencas.length === 0 && servidor.licencas) {
            todasLicencas = [...servidor.licencas];
        }

        // Deduplicar licenças
        const licencasUnicas = new Set();
        const licencasLimpas = [];
        todasLicencas.forEach(l => {
            if (!l || !l.inicio || !l.fim) return;
            const inicio = l.inicio instanceof Date ? l.inicio.getTime() : new Date(l.inicio).getTime();
            const fim = l.fim instanceof Date ? l.fim.getTime() : new Date(l.fim).getTime();
            const chave = `${inicio}-${fim}-${l.tipo}`;
            if (!licencasUnicas.has(chave)) {
                licencasUnicas.add(chave);
                licencasLimpas.push(l);
            }
        });

        licencasLimpas.sort((a, b) => {
            const dateA = a.inicio instanceof Date ? a.inicio : new Date(a.inicio);
            const dateB = b.inicio instanceof Date ? b.inicio : new Date(b.inicio);
            return dateA - dateB;
        });

        // Agrupar períodos (Lógica complexa do legado)
        const periodosAgrupados = this._agruparLicencasPorPeriodos(licencasLimpas);

        // Calcular estatísticas
        const hoje = new Date();
        const proximaLicenca = licencasLimpas.find(l => {
            if (!l || !l.inicio) return false;
            const inicio = l.inicio instanceof Date ? l.inicio : new Date(l.inicio);
            return inicio > hoje;
        });

        let diasAteProxima = null;
        if (proximaLicenca) {
            // Usar DateUtils global se disponível
            const dateUtils = (typeof window !== 'undefined' && window.DateUtils) ? window.DateUtils : null;
            if (dateUtils && dateUtils.diffInDays) {
                const inicio = proximaLicenca.inicio instanceof Date ? proximaLicenca.inicio : new Date(proximaLicenca.inicio);
                diasAteProxima = dateUtils.diffInDays(hoje, inicio);
            }
        }

        // Calcular urgência (Usando o novo UrgencyAnalyzer se disponível)
        let urgencia = { nivel: 'NENHUMA', diasRestantes: null };
        if (typeof UrgencyAnalyzer !== 'undefined') {
            if (servidor.urgencia && typeof servidor.urgencia === 'object') {
                urgencia = servidor.urgencia;
            } else if (servidor.dataExpiracao) {
                urgencia = UrgencyAnalyzer.calcularUrgencia(servidor.dataExpiracao);
            }
        }

        // Saldo total
        let saldoTotal = servidor.saldo || 0;
        if ((!servidor.saldo || isNaN(servidor.saldo)) && licencasLimpas.length > 0) {
            saldoTotal = licencasLimpas.reduce((acc, curr) => acc + (parseInt(curr.saldo) || 0), 0);
        }

        // Debug: logar saída
        if (typeof window !== 'undefined' && window.DEBUG_MODAL) {
            console.log('[ModalManager] _processarDadosServidor output:', {
                ...servidor,
                licencas: licencasLimpas,
                periodos: periodosAgrupados,
                todosOsDadosOriginais,
                stats: {
                    totalLicencas: licencasLimpas.length,
                    proximaLicenca,
                    diasAteProxima,
                    saldoTotal,
                    urgencia
                }
            });
        }

        return {
            ...servidor,
            licencas: licencasLimpas,
            periodos: periodosAgrupados,
            todosOsDadosOriginais,
            stats: {
                totalLicencas: licencasLimpas.length,
                proximaLicenca,
                diasAteProxima,
                saldoTotal,
                urgencia
            }
        };
    }

    /**
     * Agrupa licenças por períodos contíguos ou sobrepostos (Lógica portada)
     * @private
     */
    _agruparLicencasPorPeriodos(licencas) {
        if (!licencas || licencas.length === 0) return [];

        const licencasOrdenadas = [...licencas].sort((a, b) => {
            const dA = a.inicio instanceof Date ? a.inicio : new Date(a.inicio);
            const dB = b.inicio instanceof Date ? b.inicio : new Date(b.inicio);
            return dA - dB;
        });

        const periodos = [];
        let periodoAtual = null;

        for (let i = 0; i < licencasOrdenadas.length; i++) {
            const licenca = licencasOrdenadas[i];
            const licInicio = licenca.inicio instanceof Date ? licenca.inicio : new Date(licenca.inicio);
            const licFim = licenca.fim instanceof Date ? licenca.fim : new Date(licenca.fim);

            if (!periodoAtual) {
                periodoAtual = {
                    inicio: licInicio,
                    fim: licFim,
                    licencas: [licenca],
                    tipo: licenca.tipo
                };
                periodos.push(periodoAtual);
            } else {
                const ultimaLicenca = periodoAtual.licencas[periodoAtual.licencas.length - 1];
                const ultimaFim = ultimaLicenca.fim instanceof Date ? ultimaLicenca.fim : new Date(ultimaLicenca.fim);

                // Lógica de contiguidade
                const overlapping = licInicio <= ultimaFim;

                // Se o início da próxima for muito próximo do fim da anterior (ex: até 1 dia de gap)
                const diffDays = Math.ceil((licInicio - ultimaFim) / (1000 * 60 * 60 * 24));
                const isClose = diffDays <= 1;

                if (overlapping || isClose) {
                    periodoAtual.fim = new Date(Math.max(periodoAtual.fim.getTime(), licFim.getTime()));
                    periodoAtual.licencas.push(licenca);
                } else {
                    periodoAtual = {
                        inicio: licInicio,
                        fim: licFim,
                        licencas: [licenca],
                        tipo: licenca.tipo
                    };
                    periodos.push(periodoAtual);
                }
            }
        }

        return periodos;
    }

    /**
     * Gets DateUtils safe reference
     * @private
     */
    _getDateUtils() {
        return (typeof window !== 'undefined' && window.DateUtils) ? window.DateUtils : {
            formatBrazilianDate: (d) => d ? new Date(d).toLocaleDateString('pt-BR') : 'N/A',
            diffInDays: () => 0
        };
    }

    /**
     * Gets FormatUtils safe reference
     * @private
     */
    _getFormatUtils() {
        return (typeof window !== 'undefined' && window.FormatUtils) ? window.FormatUtils : {
            formatNumber: (n) => n
        };
    }

    /**
     * Gera Hero Section (Card Principal)
     * @private
     */
    _generateHeroSection(dados) {
        const dateUtils = this._getDateUtils();

        const saldoClass = dados.stats.saldoTotal > 0 ? 'positivo' : 'zerado';
        const urgenciaClass = dados.stats.urgencia.nivel ? dados.stats.urgencia.nivel.toLowerCase() : 'nenhuma';

        return `
            <div class="servidor-hero-card">
                <div class="hero-header">
                    <div class="hero-info">
                        <div class="hero-cargo">${dados.cargo || 'Cargo não informado'}</div>
                        <h2 class="hero-name">${dados.nome || dados.servidor}</h2>
                        <div class="hero-meta">
                            <div class="hero-meta-item">
                                <i class="bi bi-building"></i>
                                <span>${dados.lotacao || 'N/A'}</span>
                            </div>
                            <div class="hero-meta-item">
                                <i class="bi bi-card-heading"></i>
                                <span>${dados.matricula || 'Matrícula N/A'}</span>
                            </div>
                            <div class="hero-meta-item">
                                <i class="bi bi-calendar-event"></i>
                                <span>Admissão: ${dateUtils.formatBrazilianDate(dados.admissao)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hero-saldo">
                        <div class="hero-saldo-label">Saldo Total</div>
                        <div class="hero-saldo-value ${saldoClass}">${dados.stats.saldoTotal}</div>
                        <div class="hero-saldo-unit">dias</div>
                    </div>
                </div>

                <div class="hero-progress">
                    <div class="hero-progress-bar">
                        <div class="hero-progress-fill ${urgenciaClass}" style="width: 100%"></div>
                    </div>
                    <div class="hero-progress-label">
                        <span>Urgência: <strong>${dados.stats.urgencia.label || 'Normal'}</strong></span>
                        <span>${dados.stats.urgencia.mensagem || ''}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Gera Seção de Estatísticas
     * @private
     */
    _generateStatsSection(dados) {
        return `
            <div class="hero-stats">
                <div class="hero-stat">
                    <div class="hero-stat-value stat-periodos">${dados.periodos && dados.periodos.length ? dados.periodos.length : 0}</div>
                    <div class="hero-stat-label">Períodos Aquisitivos</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value stat-direito">${dados.mesesConcedidos || 0}</div>
                    <div class="hero-stat-label">Meses Concedidos</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-value stat-usado">${dados.licencas && dados.licencas.length ? dados.licencas.length : 0}</div>
                    <div class="hero-stat-label">Licenças Registradas</div>
                </div>
            </div>
        `;
    }

    /**
     * Gera Seção de Períodos (Acordeão)
     * @private
     */
    _generatePeriodosSection(dados) {
        const dateUtils = this._getDateUtils();
        let html = `
            <div class="periodos-section" style="margin-top: 1.5rem;">
                <div class="periodos-section-header">
                    <h4><i class="bi bi-calendar-range"></i> Histórico de Períodos</h4>
                </div>
                <div class="periodos-section-content">
        `;
        if (!dados.periodos || dados.periodos.length === 0) {
            html += `<div class="no-data">Nenhum período aquisitivo encontrado para este servidor.</div>`;
        } else {
            dados.periodos.forEach((periodo, index) => {
                const inicio = dateUtils.formatBrazilianDate(periodo.inicio);
                const fim = dateUtils.formatBrazilianDate(periodo.fim);
                const dias = dateUtils.diffInDays(periodo.inicio, periodo.fim);
                // Calculando saldo específico deste período
                const saldoPeriodo = periodo.licencas.reduce((acc, l) => acc + (parseInt(l.saldo) || 0), 0);
                const saldoClass = saldoPeriodo > 0 ? 'positivo' : 'zerado';
                html += `
                    <div class="periodo-accordion">
                        <div class="periodo-accordion-header">
                            <div class="periodo-indicator ${saldoPeriodo > 0 ? 'parcial' : 'completo'}">
                                ${index + 1}
                            </div>
                            <div class="periodo-info">
                                <div class="periodo-dates">${inicio} - ${fim}</div>
                                <div class="periodo-summary">${dias} dias totais • ${periodo.licencas.length} registros</div>
                            </div>
                            <div class="periodo-saldo-badge ${saldoClass}">${saldoPeriodo} dias</div>
                            <i class="bi bi-chevron-down periodo-expand-icon"></i>
                        </div>
                        <div class="periodo-accordion-content">
                            <div class="periodo-accordion-body">
                                ${this._generateLicencasTable(periodo.licencas)}
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        html += `</div></div>`;
        return html;
    }

    /**
     * Gera tabela de licenças para dentro do acordeão
     * @private
     */
    _generateLicencasTable(licencas) {
        const dateUtils = this._getDateUtils();

        if (!licencas || licencas.length === 0) return '<p>Nenhuma licença neste período.</p>';

        let html = `
            <table class="table table-sm table-hover" style="font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th>Início</th>
                        <th>Fim</th>
                        <th>Dias</th>
                        <th>Gozados</th>
                        <th>Saldo</th>
                    </tr>
                </thead>
                <tbody>
        `;

        licencas.forEach(l => {
            html += `
                <tr>
                    <td>${dateUtils.formatBrazilianDate(l.inicio)}</td>
                    <td>${dateUtils.formatBrazilianDate(l.fim)}</td>
                    <td>${l.dias || '--'}</td>
                    <td>${l.diasGozados || 0}</td>
                    <td><strong class="${l.saldo > 0 ? 'text-success' : 'text-danger'}">${l.saldo}</strong></td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        return html;
    }

    /**
     * Gera Seção de Licenças (Lista Simples - Fallback ou Adicional)
     * @private
     */
    _generateLicencasSection(dados) {
        // Se já mostramos nos períodos, talvez não precise duplicar
        // Implementar apenas se necessário
        return '';
    }

    /**
     * Gera Seção de Dados Originais
     * @private
     */
    _generateDadosOriginaisSection(dados) {
        let html = `
            <div class="periodos-section" style="margin-top: 1rem;">
                <div class="periodos-section-header" style="background: var(--bg-primary);">
                    <h4><i class="bi bi-table"></i> Dados Originais (Planilha)</h4>
                </div>
                <div class="periodos-section-content">
        `;
        if (!dados.todosOsDadosOriginais || dados.todosOsDadosOriginais.length === 0) {
            html += `<div class="no-data">Nenhum dado original encontrado para este servidor.</div>`;
        } else {
            // Consolidar dados
            const dadosConsolidados = new Map();
            dados.todosOsDadosOriginais.forEach((d) => {
                Object.entries(d).forEach(([key, value]) => {
                    const keyUpper = key.toUpperCase();
                    // Filtrar chaves irrelevantes
                    if (!keyUpper.includes('SERVIDOR') && !keyUpper.includes('NOME') &&
                        value && value !== '' && value !== 'undefined' && value !== 'null') {
                        dadosConsolidados.set(key, value);
                    }
                });
            });
            if (dadosConsolidados.size === 0) {
                html += `<div class="no-data">Nenhum dado original encontrado para este servidor.</div>`;
            } else {
                html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; padding: 0.5rem;">`;
                dadosConsolidados.forEach((value, key) => {
                    html += `
                        <div style="font-size: 0.8rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 4px;">
                            <strong style="display: block; color: var(--text-secondary); margin-bottom: 0.2rem;">${key}</strong>
                            <span style="color: var(--text-primary);">${value}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            }
        }
        html += `</div></div>`;
        return html;
    }

    /**
     * Setup dos listeners de accordion
     * @private
     */
    _setupAccordionListeners(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const headers = modal.querySelectorAll('.periodo-accordion-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const accordion = header.parentElement;
                accordion.classList.toggle('active');
            });
        });
    }

    // ==================== CÁLCULO DE SALDO (Portado do dashboard.js) ====================

    /**
     * Calcula saldo de licenças usando TODOS os registros de um servidor
     * @param {Array} registros - Array de todos os registros do servidor
     * @returns {Object} { dias, diasGanhos, diasUsados, periodosTotal }
     */
    calcularSaldoServidorCompleto(registros) {
        if (!registros || registros.length === 0) {
            return { dias: 0, diasGanhos: 0, diasUsados: 0, periodosTotal: 0 };
        }

        // Agrupar por período aquisitivo (cada período = 5 anos = 90 dias de direito)
        const periodosAquisitivosMap = new Map();

        registros.forEach(registro => {
            // Coletar dados APENAS das licenças, não do registro raiz
            // (para evitar duplicação)
            const fontesTodas = [];

            // Processar licenças do registro
            if (registro.licencas && Array.isArray(registro.licencas)) {
                registro.licencas.forEach(lic => {
                    // Preferir dados originais da licença
                    if (lic.dadosOriginais) {
                        fontesTodas.push(lic.dadosOriginais);
                    } else {
                        // Fallback: usar a própria licença
                        fontesTodas.push(lic);
                    }
                });
            }

            // Se não encontrou licenças, usar dadosOriginais do registro
            if (fontesTodas.length === 0 && registro.dadosOriginais) {
                fontesTodas.push(registro.dadosOriginais);
            }

            // Se ainda não tem dados, usar o próprio registro
            if (fontesTodas.length === 0) {
                fontesTodas.push(registro);
            }

            // Processar cada fonte de dados
            fontesTodas.forEach(dados => {
                const aquisitivoInicio = dados.AQUISITIVO_INICIO || dados.aquisitivoInicio;
                const aquisitivoFim = dados.AQUISITIVO_FIM || dados.aquisitivoFim;
                const gozo = this._parseNumero(dados.GOZO || dados.gozo || dados.diasGozo || 0);
                const restando = this._parseRestando(dados.RESTANDO || dados.restando || '0');

                // Ignorar registros sem período aquisitivo ou com data nula (1899)
                if (!aquisitivoInicio) return;
                const aquisitivoStr = String(aquisitivoInicio);
                if (aquisitivoStr.includes('1899') || aquisitivoStr.includes('29/12/1899')) return;

                // Criar chave do período aquisitivo (cada período = 5 anos = 90 dias)
                const chavePeriodo = `${aquisitivoInicio}-${aquisitivoFim}`;

                if (!periodosAquisitivosMap.has(chavePeriodo)) {
                    periodosAquisitivosMap.set(chavePeriodo, {
                        diasUsados: 0,
                        restando: 0,
                        ultimoRestando: restando // Rastrear o último RESTANDO deste período
                    });
                }

                const periodo = periodosAquisitivosMap.get(chavePeriodo);
                periodo.diasUsados += gozo; // Somar todos os GOZO deste período aquisitivo
                periodo.ultimoRestando = restando; // Atualizar com o último RESTANDO
            });
        });

        // Converter map para array ordenado
        const periodos = Array.from(periodosAquisitivosMap.values());

        // O saldo disponível é o RESTANDO do ÚLTIMO período aquisitivo
        const ultimoPeriodo = periodos.length > 0 ? periodos[periodos.length - 1] : null;

        return {
            dias: ultimoPeriodo ? ultimoPeriodo.ultimoRestando : 0,
            diasGanhos: periodos.length * 90, // Cada período aquisitivo = 90 dias
            diasUsados: periodos.reduce((sum, p) => sum + p.diasUsados, 0),
            periodosTotal: periodos.length
        };
    }

    /**
     * Parse de número de string
     * @private
     */
    _parseNumero(valor) {
        if (!valor) return 0;
        const num = parseInt(String(valor).replace(/\D/g, ''), 10);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Parse do campo RESTANDO
     * @private
     */
    _parseRestando(valor) {
        if (!valor) return 0;
        const str = String(valor).trim();
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Cleanup - remove event listeners
     */
    destroy() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }

        this.closeAll();

        console.log('📋 ModalManager destruído');
    }

    /**
     * Debug info
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            openModals: [...this.modalStack],
            modalCount: this.modalStack.length,
            topModal: this.getTopModal()
        };
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
