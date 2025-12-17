/**
 * AdvancedFiltersBuilder.js - Sistema de construção visual de filtros avançados
 *
 * Gerencia o modal de filtros avançados, permitindo ao usuário construir visualmente
 * filtros complexos através de uma interface interativa.
 *
 * Responsabilidades:
 * - Renderizar e gerenciar o modal de filtros avançados
 * - Criar formulários dinâmicos para cada tipo de filtro
 * - Gerenciar dual list boxes para seleção múltipla
 * - Integrar com CustomDatePicker para filtros de período
 * - Aplicar filtros e atualizar preview de resultados
 * - Persistir filtros ativos
 *
 * @module 3-managers/features/AdvancedFiltersBuilder
 */

class AdvancedFiltersBuilder {
    /**
     * @param {Object} app - Referência à aplicação principal
     */
    constructor(app) {
        this.app = app;
        this.dashboard = app; // Compatibilidade com código legado
    this.filters = []; // Array de filtros ativos
    this.currentEditingId = null; // ID do filtro sendo editado
    this.currentFilterType = null; // Tipo de filtro atual no popup
    this.filterIdCounter = 0; // Contador para IDs únicos
    this.periodoInicioPicker = null;
    this.periodoFimPicker = null;
        
        // Gerenciador de hierarquia de lotação
        this.hierarchyManager = window.lotacaoHierarchyManager || new LotacaoHierarchyManager();
        
        // Valores únicos extraídos dos dados
        this.uniqueValues = {
            cargos: [],
            lotacoes: [],
            superintendencias: [],
            subsecretarias: [],
            servidores: []
        };
        
        // Elementos DOM
        this.modal = null;
        this.filterTypeSelect = null;
        this.filterConfigForm = null;
        this.activeFiltersList = null;
        this.resultsPreview = null;
        
        this.init();
    }
    
    /**
     * Inicializa o gerenciador
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
    }
    
    /**
     * Cacheia elementos DOM
     */
    cacheElements() {
        this.modal = document.getElementById('filtersModal');
        this.filterConfigPopup = document.getElementById('filterConfigPopup');
        this.filterConfigPopupTitle = document.getElementById('filterConfigPopupTitle');
        this.filterConfigPopupBody = document.getElementById('filterConfigPopupBody');
        this.activeFiltersList = document.getElementById('activeFiltersList');
        this.resultsPreview = document.getElementById('resultsPreview');
        this.activeFiltersCount = document.getElementById('activeFiltersCount');
        this.resultsCount = document.getElementById('resultsCount');

        // Adiciona listeners nos botões do popup
        const closePopupBtn = document.getElementById('closeFilterConfigPopup');
        const cancelPopupBtn = document.getElementById('cancelFilterPopupBtn');
        const confirmPopupBtn = document.getElementById('confirmFilterPopupBtn');

        if (closePopupBtn) {
            closePopupBtn.addEventListener('click', () => this.closeFilterConfigPopup());
        }
        if (cancelPopupBtn) {
            cancelPopupBtn.addEventListener('click', () => this.closeFilterConfigPopup());
        }
        if (confirmPopupBtn) {
            confirmPopupBtn.addEventListener('click', () => this.handleConfirmFilterFromPopup());
        }

        // Usa delegação de eventos no modal body para capturar cliques nos cards de filtro
        const modalBody = this.modal.querySelector('.modal-body');
        if (modalBody) {
            // Cards de tipo de filtro (delegação)
            modalBody.addEventListener('click', (e) => {
                const filterCard = e.target.closest('.filter-type-card');
                
                if (filterCard) {
                    const filterType = filterCard.dataset.filterType;
                    
                    if (filterType) {
                        this.openFilterConfigPopup(filterType);
                    }
                    return;
                }

                // Botões de editar/remover filtro
                const editButton = e.target.closest('.btn-edit');
                if (editButton) {
                    const filterId = parseInt(editButton.dataset.filterId);
                    if (filterId) {
                        this.editFilter(filterId);
                    }
                    return;
                }

                const removeButton = e.target.closest('.btn-remove');
                if (removeButton) {
                    const filterId = parseInt(removeButton.dataset.filterId);
                    if (filterId) {
                        this.removeFilter(filterId);
                    }
                }
            });
        }
    }
    
    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botões do modal principal
        const closeBtn = document.getElementById('closeFiltersModal');
        const cancelModalBtn = document.getElementById('cancelFiltersModalBtn');
        const clearAllBtn = document.getElementById('clearAllFiltersModalBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', () => this.closeModal());
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', async () => {
                // Usar modal customizado ao invés de confirm()
                const confirmed = await window.customModal.confirm({
                    title: 'Limpar Todos os Filtros',
                    message: 'Tem certeza que deseja remover todos os filtros do construtor? Esta ação não pode ser desfeita.',
                    type: 'danger',
                    confirmText: 'Limpar Tudo',
                    cancelText: 'Cancelar'
                });

                if (confirmed) {
                    this.clearAllFilters();
                }
            });
        }

        if (this.modal) {
            this.modal.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    this.closeModal();
                }
            });
        }
    }

    /**
     * Limpa instâncias específicas utilizadas em formulários dinâmicos
     */
    cleanupFormInstances() {
        if (this.periodoInicioPicker) {
            this.periodoInicioPicker.destroy();
            this.periodoInicioPicker = null;
        }

        if (this.periodoFimPicker) {
            this.periodoFimPicker.destroy();
            this.periodoFimPicker = null;
        }
    }

    /**
     * Abre o modal especial de filtro hierárquico
     */
    openHierarchyFilterModal(editingFilterId = null) {
        // Cria o modal se não existir
        if (!this.hierarchyFilterModal) {
            this.hierarchyFilterModal = new HierarchyFilterModal({
                onApply: (selection) => this.handleHierarchyFilterApply(selection, editingFilterId),
                onClose: () => {}
            });
        }
        
        // Se estiver editando, carrega a seleção existente
        let initialSelection = null;
        if (editingFilterId) {
            const filter = this.filters.find(f => f.id === editingFilterId);
            if (filter && filter.type === 'hierarquia') {
                initialSelection = filter.value;
            }
        }
        
        // Atualiza o callback com o ID correto
        this.hierarchyFilterModal.onApply = (selection) => this.handleHierarchyFilterApply(selection, editingFilterId);
        
        // Abre o modal
        this.hierarchyFilterModal.open(initialSelection);
    }
    
    /**
     * Manipula a aplicação do filtro hierárquico
     */
    handleHierarchyFilterApply(selection, editingFilterId = null) {
        // Verifica se há alguma seleção
        const hasSelection = selection.subsecretarias.length > 0 || 
                            selection.superintendencias.length > 0 || 
                            selection.lotacoes.length > 0;
        
        if (!hasSelection) {
            // Se não há seleção e está editando, remove o filtro
            if (editingFilterId) {
                this.removeFilter(editingFilterId);
            } else {
                // Se não está editando, remove qualquer filtro de hierarquia existente
                const existingFilter = this.filters.find(f => f.type === 'hierarquia');
                if (existingFilter) {
                    this.removeFilter(existingFilter.id);
                }
            }
            // Fecha o modal
            this.hierarchyFilterModal?.close();
            return;
        }
        
        // Verifica se já existe um filtro de hierarquia (só pode ter um)
        const existingHierarchyFilter = this.filters.find(f => f.type === 'hierarquia');
        const targetFilterId = editingFilterId || (existingHierarchyFilter ? existingHierarchyFilter.id : null);
        const isUpdate = !!targetFilterId;
        
        if (targetFilterId) {
            // Atualiza filtro existente
            const filter = this.filters.find(f => f.id === targetFilterId);
            if (filter) {
                filter.value = selection;
                filter.displayText = this.buildHierarchyFilterLabel(selection);
            }
        } else {
            // Cria novo filtro (só se não existir nenhum)
            const newFilter = {
                id: ++this.filterIdCounter,
                type: 'hierarquia',
                icon: '<i class="bi bi-diagram-3"></i>',
                label: 'Lotação',
                value: selection,
                displayText: this.buildHierarchyFilterLabel(selection)
            };
            this.filters.push(newFilter);
        }
        
        // Atualiza a UI
        this.renderActiveFilters();
        this.updateResultsPreview();
        
        // Fecha o modal de hierarquia
        this.hierarchyFilterModal?.close();
    }
    
    /**
     * Constrói o label para o filtro hierárquico
     */
    buildHierarchyFilterLabel(selection) {
        const parts = [];
        
        if (selection.subsecretarias.length > 0) {
            const count = selection.subsecretarias.length;
            parts.push(`${count} Subsec.`);
        }
        
        if (selection.superintendencias.length > 0) {
            const count = selection.superintendencias.length;
            parts.push(`${count} Super.`);
        }
        
        if (selection.lotacoes.length > 0) {
            const count = selection.lotacoes.length;
            parts.push(`${count} Gerência${count > 1 ? 's' : ''}`);
        }
        
        return parts.join(' • ') || 'Lotação';
    }

    /**
     * Abre o popup de configuração de filtro
     */
    openFilterConfigPopup(filterType, editingFilterId = null) {
        // Se for filtro de hierarquia, abre o modal especial
        if (filterType === 'hierarquia') {
            this.openHierarchyFilterModal(editingFilterId);
            return;
        }
        
        this.currentFilterType = filterType;
        this.currentEditingId = editingFilterId;

        // Garante que componentes anteriores sejam destruídos antes de renderizar um novo formulário
        this.cleanupFormInstances();

        // Define o título do popup
        const titles = {
            idade: 'Filtro por Idade',
            cargo: 'Filtro por Cargo',
            urgencia: 'Filtro por Nível de Urgência',
            servidor: 'Filtro por Servidor',
            periodo: 'Filtro por Período de Gozo',
            meses: 'Filtro por Meses Acumulados'
        };

        this.filterConfigPopupTitle.textContent = titles[filterType] || 'Configurar Filtro';

        // Renderiza o formulário no popup
        const formHTML = this.renderFormForType(filterType);
        this.filterConfigPopupBody.innerHTML = formHTML;
        
        // Verificar se é um estado vazio (sem dados) e desabilitar botão de confirmar
        const hasEmptyState = formHTML.includes('filter-popup-empty-state');
        const confirmBtn = this.filterConfigPopup.querySelector('.btn-primary');
        
        if (hasEmptyState && confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.title = 'Não há dados disponíveis para este filtro';
        } else if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.title = '';
        }

        // Se estiver editando, preenche os valores
        if (editingFilterId) {
            const filter = this.filters.find(f => f.id === editingFilterId);
            if (filter) {
                this.populateFormWithFilter(filter);
                document.getElementById('filterPopupActionText').textContent = 'Atualizar';
            }
        } else {
            const actionText = document.getElementById('filterPopupActionText');
            if (actionText) actionText.textContent = 'Adicionar';
        }

        // Configura os event listeners específicos do formulário
        this.setupFormEventListeners(filterType);

        // Mostra o popup secundário (semelhante à versão original, com ajustes mínimos)
        if (this.filterConfigPopup) {
            this.filterConfigPopup.style.display = 'flex';
            this.filterConfigPopup.setAttribute('aria-hidden', 'false');
            this.filterConfigPopup.classList.add('active');
            this.filterConfigPopup.classList.add('show');
            this.focusFirstPopupField();
        }
    }

    /**
     * Fecha o popup de configuração
     */
    closeFilterConfigPopup() {
        if (this.filterConfigPopup) {
            this.filterConfigPopup.classList.remove('active');
            this.filterConfigPopup.classList.remove('show');
            this.filterConfigPopup.setAttribute('aria-hidden', 'true');
            this.filterConfigPopup.style.display = 'none';
        }

        this.currentFilterType = null;
        this.currentEditingId = null;
        this.cleanupFormInstances();
    }

    focusFirstPopupField() {
        if (!this.filterConfigPopup) return;
        const firstFocusable = this.filterConfigPopup.querySelector('input, select, textarea, button:not([disabled])');
        if (firstFocusable && typeof firstFocusable.focus === 'function') {
            try {
                firstFocusable.focus();
            } catch (error) {
                // Ignorado intencionalmente
            }
        } else {
            try {
                this.filterConfigPopup.focus();
            } catch (error) {
                // Ignorado intencionalmente
            }
        }
    }

    /**
     * Confirma a configuração do filtro no popup
     */
    handleConfirmFilterFromPopup() {
        const filterData = this.extractFilterData(this.currentFilterType);
        
        if (!filterData) {
            // Silenciosamente fecha o popup se nada foi selecionado
            this.closeFilterConfigPopup();
            return;
        }

        if (this.currentEditingId) {
            // Atualizar filtro existente
            const index = this.filters.findIndex(f => f.id === this.currentEditingId);
            if (index !== -1) {
                this.filters[index] = { ...filterData, id: this.currentEditingId };
            }
        } else {
            // Adicionar novo filtro
            filterData.id = ++this.filterIdCounter;
            this.filters.push(filterData);
        }

        this.renderActiveFilters();
        this.updateResultsPreview();
        this.closeFilterConfigPopup();
    }

    /**
     * Renderiza o formulário para um tipo específico
     */
    renderFormForType(type) {
        switch (type) {
            case 'idade':
                return this.renderIdadeForm();
            case 'cargo':
                return this.renderCargoForm();
            case 'lotacao':
                return this.renderLotacaoForm();
            case 'superintendencia':
                return this.renderSuperintendenciaForm();
            case 'subsecretaria':
                return this.renderSubsecretariaForm();
            case 'urgencia':
                return this.renderUrgenciaForm();
            case 'servidor':
                return this.renderServidorForm();
            case 'periodo':
                return this.renderPeriodoForm();
            case 'meses':
                return this.renderMesesForm();
            default:
                return '<p>Tipo de filtro não implementado</p>';
        }
    }

    /**
     * Configura event listeners específicos do formulário
     */
    setupFormEventListeners(type) {
        // Preset buttons para idade
        if (type === 'idade') {
            const presetButtons = document.querySelectorAll('.preset-btn');
            presetButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const min = parseInt(e.target.dataset.min);
                    const max = parseInt(e.target.dataset.max);
                    document.getElementById('filterIdadeMin').value = min;
                    document.getElementById('filterIdadeMax').value = max;
                });
            });
        }

        // Preset buttons para meses
        if (type === 'meses') {
            const presetButtons = document.querySelectorAll('.preset-btn');
            presetButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const min = parseInt(e.target.dataset.min);
                    const max = parseInt(e.target.dataset.max);
                    document.getElementById('filterMesesMin').value = min;
                    document.getElementById('filterMesesMax').value = max;
                });
            });
        }

        if (type === 'periodo') {
            // Aguardar um pouco mais para garantir que o DOM foi renderizado e o popup esteja visível
            setTimeout(() => {
                const popup = document.getElementById('filterConfigPopup');
                if (popup && (popup.style.display === 'flex' || popup.classList.contains('show'))) {
                    this.initializePeriodoPickers();
                } else {
                    setTimeout(() => this.initializePeriodoPickers(), 200);
                }
            }, 100);
        }
    }
    
    /**
     * Extrai valores únicos dos dados
     */
    extractUniqueValues(servidores) {
        if (!servidores || servidores.length === 0) return;
        
        // Cargos
        this.uniqueValues.cargos = [...new Set(
            servidores
                .map(s => s.cargo)
                .filter(Boolean)
        )].sort();
        
        // Lotações
        this.uniqueValues.lotacoes = [...new Set(
            servidores
                .map(s => s.lotacao)
                .filter(Boolean)
        )].sort();
        
        // Superintendências
        this.uniqueValues.superintendencias = [...new Set(
            servidores
                .map(s => s.superintendencia)
                .filter(Boolean)
        )].sort();
        
        // Subsecretarias
        this.uniqueValues.subsecretarias = [...new Set(
            servidores
                .map(s => s.subsecretaria)
                .filter(Boolean)
        )].sort();
        
        // Servidores (nome + matrícula para identificação única)
        this.uniqueValues.servidores = servidores
            .map(s => ({
                nome: s.nome,
                matricula: s.matricula,
                displayName: `${s.nome} ${s.matricula ? `(${s.matricula})` : ''}`
            }))
            .filter(s => s.nome)
            .sort((a, b) => a.nome.localeCompare(b.nome));
    }
    
    /**
     * Abre o modal
     */
    openModal(focusType = null) {
        if (!this.modal) return;
        
        // Extrair valores únicos se ainda não foi feito
        if (this.dashboard.allServidores && this.dashboard.allServidores.length > 0) {
            this.extractUniqueValues(this.dashboard.allServidores);
        }
        
        // Atualizar contador de resultados
        this.updateResultsPreview();
        
        // Mostrar modal usando o método do dashboard
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        
        setTimeout(() => {
            if (this.dashboard._openModalElement) {
                this.dashboard._openModalElement(this.modal);
            }

            if (focusType) {
                const focusTarget = this.modal.querySelector(`[data-filter-type="${focusType}"]`);
                if (focusTarget && typeof focusTarget.focus === 'function') {
                    focusTarget.focus();
                }
            }
        }, 10);
    }
    
    /**
     * Fecha o modal e aplica os filtros
     */
    closeModal() {
        if (!this.modal) return;
        
        // Aplicar filtros ao fechar (já são aplicados em tempo real no preview)
        const filtered = this.applyFiltersToData(this.dashboard.allServidores);
        this.dashboard.filteredServidores = filtered;
        
        // Atualizar UI do dashboard
        if (this.dashboard.updateTable) this.dashboard.updateTable();
        if (this.dashboard.updateStats) this.dashboard.updateStats();
        if (this.dashboard.updateCharts) this.dashboard.updateCharts();
        
        this.modal.classList.remove('active');
        
        if (this.dashboard._closeModalElement) {
            this.dashboard._closeModalElement(this.modal);
        }
        
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
        
        // Limpar formulário
        this.resetForm();
    }
    
    /**
     * Manipula mudança no tipo de filtro
     */
    handleFilterTypeChange(type) {
        if (!type) {
            this.filterConfigForm.style.display = 'none';
            this.filterFormActions.style.display = 'none';
            return;
        }
        
        // Renderizar formulário específico
        this.renderFilterConfigForm(type);
        
        // Mostrar form e ações
        this.filterConfigForm.style.display = 'block';
        this.filterFormActions.style.display = 'flex';
    }
    
    /**
     * Renderiza formulário de configuração baseado no tipo
     */
    renderFilterConfigForm(type) {
        let formHTML = '';
        
        switch (type) {
            case 'idade':
                formHTML = this.renderIdadeForm();
                break;
            case 'cargo':
                formHTML = this.renderCargoForm();
                break;
            case 'lotacao':
                formHTML = this.renderLotacaoForm();
                break;
            case 'superintendencia':
                formHTML = this.renderSuperintendenciaForm();
                break;
            case 'subsecretaria':
                formHTML = this.renderSubsecretariaForm();
                break;
            case 'urgencia':
                formHTML = this.renderUrgenciaForm();
                break;
            // case 'status':
            //     formHTML = this.renderStatusForm();
            //     break;
            // REMOVIDO: O sistema não gerencia status real de licenças, apenas cronograma
            case 'servidor':
                formHTML = this.renderServidorForm();
                break;
            case 'periodo':
                formHTML = this.renderPeriodoForm();
                break;
            case 'meses':
                formHTML = this.renderMesesForm();
                break;
            default:
                formHTML = '<p>Tipo de filtro não implementado</p>';
        }
        
        this.filterConfigForm.innerHTML = formHTML;
        
        // Setup listeners específicos
        this.setupFormSpecificListeners(type);
    }
    
    /**
     * Formulário: Idade
     */
    renderIdadeForm() {
        return `
            <div class="range-inputs">
                <div class="input-with-label">
                    <label for="filterIdadeMin">Idade Mínima</label>
                    <input type="number" id="filterIdadeMin" class="form-control" min="18" max="100" value="18">
                </div>
                <div class="input-with-label">
                    <label for="filterIdadeMax">Idade Máxima</label>
                    <input type="number" id="filterIdadeMax" class="form-control" min="18" max="100" value="70">
                </div>
            </div>
            <div class="form-group">
                <label>Ou selecione uma faixa:</label>
                <div class="preset-buttons">
                    <button type="button" class="btn-preset" data-min="18" data-max="30">18-30</button>
                    <button type="button" class="btn-preset" data-min="31" data-max="40">31-40</button>
                    <button type="button" class="btn-preset" data-min="41" data-max="50">41-50</button>
                    <button type="button" class="btn-preset" data-min="51" data-max="60">51-60</button>
                    <button type="button" class="btn-preset" data-min="61" data-max="70">61-70</button>
                    <button type="button" class="btn-preset" data-min="71" data-max="100">71+</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Formulário: Cargo
     */
    renderCargoForm() {
        // Verificar se há dados disponíveis
        if (!this.uniqueValues.cargos || this.uniqueValues.cargos.length === 0) {
            return `
                <div class="filter-popup-empty-state">
                    <div class="filter-popup-empty-state-icon">📭</div>
                    <div class="filter-popup-empty-state-title">Nenhum cargo disponível</div>
                    <div class="filter-popup-empty-state-text">Não existem cargos nos dados carregados para aplicar este filtro.</div>
                </div>
            `;
        }
        
        const dualListHtml = this.createDualListBox(
            'cargo',
            this.uniqueValues.cargos,
            [],
            'Cargos Disponíveis',
            'Cargos Selecionados'
        );
        
        // Configurar listeners após renderização
        setTimeout(() => this.setupDualListBoxListeners('cargo'), 0);
        
        return `
            <div class="form-group">
                <label>Selecione os Cargos</label>
                ${dualListHtml}
            </div>
        `;
    }
    
    /**
     * Formulário: Lotação
     */
    /**
     * Formulário: Lotação (usando hierarquia com filtro em cascata)
     */
    renderLotacaoForm() {
        // Verificar se há filtros de subsecretaria ou superintendência ativos
        const subsecretariaFilter = this.filters.find(f => f.type === 'subsecretaria' && f.values && f.values.length > 0);
        const superintendenciaFilter = this.filters.find(f => f.type === 'superintendencia' && f.values && f.values.length > 0);
        
        // Obter lotações (gerências) da hierarquia
        let lotacoesHierarquia = [];
        
        if (superintendenciaFilter && superintendenciaFilter.values.length > 0) {
            // Filtrar lotações pelas superintendências selecionadas
            superintendenciaFilter.values.forEach(super_name => {
                const gerencias = this.hierarchyManager.getGerencias(super_name);
                lotacoesHierarquia.push(...gerencias);
            });
        } else if (subsecretariaFilter && subsecretariaFilter.values.length > 0) {
            // Filtrar lotações pelas subsecretarias selecionadas
            subsecretariaFilter.values.forEach(subsec => {
                const supers = this.hierarchyManager.getSuperintendencias(subsec);
                supers.forEach(s => {
                    const gerencias = this.hierarchyManager.getGerencias(s.name);
                    lotacoesHierarquia.push(...gerencias);
                });
            });
        } else {
            // Obter todas as gerências
            lotacoesHierarquia = this.hierarchyManager.getGerencias();
        }
        
        // Combinar com dados únicos existentes
        const lotacoesSet = new Set();
        
        // Adicionar da hierarquia
        lotacoesHierarquia.forEach(g => lotacoesSet.add(g.name));
        
        // Adicionar dos dados únicos extraídos (se não houver filtro de cascata)
        if (!subsecretariaFilter && !superintendenciaFilter && this.uniqueValues.lotacoes) {
            this.uniqueValues.lotacoes.forEach(l => {
                if (l && l !== 'nan') lotacoesSet.add(l);
            });
        }
        
        const lotacoes = Array.from(lotacoesSet).sort();
        
        if (lotacoes.length === 0) {
            const hasFilter = subsecretariaFilter || superintendenciaFilter;
            return `
                <div class="filter-popup-empty-state">
                    <div class="filter-popup-empty-state-icon">📭</div>
                    <div class="filter-popup-empty-state-title">Nenhuma lotação disponível</div>
                    <div class="filter-popup-empty-state-text">
                        ${hasFilter ? 
                            'Não existem lotações nos filtros selecionados.' : 
                            'Não existem lotações nos dados carregados para aplicar este filtro.'
                        }
                    </div>
                </div>
            `;
        }
        
        const dualListHtml = this.createDualListBox(
            'lotacao',
            lotacoes,
            [],
            'Lotações Disponíveis',
            'Lotações Selecionadas'
        );
        
        // Configurar listeners após renderização
        setTimeout(() => this.setupDualListBoxListeners('lotacao'), 0);
        
        // Mensagem informativa sobre cascata
        let cascadeInfo = '';
        if (superintendenciaFilter) {
            cascadeInfo = `<div class="alert alert-info py-2 mb-2" style="font-size: 0.85rem;">
                <i class="bi bi-funnel-fill me-1"></i>
                Filtrado por superintendência(s): <strong>${superintendenciaFilter.values.length}</strong> selecionada(s)
            </div>`;
        } else if (subsecretariaFilter) {
            cascadeInfo = `<div class="alert alert-info py-2 mb-2" style="font-size: 0.85rem;">
                <i class="bi bi-funnel-fill me-1"></i>
                Filtrado por subsecretaria(s): <strong>${subsecretariaFilter.values.length}</strong> selecionada(s)
            </div>`;
        } else {
            cascadeInfo = `<p class="filter-hint text-muted small mb-2">
                <i class="bi bi-info-circle"></i> Dica: Adicione filtros de Subsecretaria ou Superintendência primeiro para restringir as opções.
            </p>`;
        }
        
        return `
            <div class="form-group">
                <label>Selecione as Lotações</label>
                ${cascadeInfo}
                ${dualListHtml}
            </div>
        `;
    }
    
    /**
     * Formulário: Superintendência
     */
    /**
     * Formulário: Superintendência (usando hierarquia com filtro em cascata)
     */
    renderSuperintendenciaForm() {
        // Verificar se há filtro de subsecretaria ativo para aplicar cascata
        const subsecretariaFilter = this.filters.find(f => f.type === 'subsecretaria' && f.values && f.values.length > 0);
        
        // Obter superintendências da hierarquia
        let superintendenciasHierarquia = [];
        
        if (subsecretariaFilter && subsecretariaFilter.values.length > 0) {
            // Filtrar superintendências pelas subsecretarias selecionadas
            subsecretariaFilter.values.forEach(subsec => {
                const supers = this.hierarchyManager.getSuperintendencias(subsec);
                superintendenciasHierarquia.push(...supers);
            });
        } else {
            // Obter todas as superintendências
            superintendenciasHierarquia = this.hierarchyManager.getSuperintendencias();
        }
        
        // Combinar com dados únicos existentes
        const superintendenciasSet = new Set();
        
        // Adicionar da hierarquia
        superintendenciasHierarquia.forEach(s => superintendenciasSet.add(s.name));
        
        // Adicionar dos dados únicos extraídos (se não houver filtro de subsecretaria)
        if (!subsecretariaFilter && this.uniqueValues.superintendencias) {
            this.uniqueValues.superintendencias.forEach(s => {
                if (s && s !== 'nan') superintendenciasSet.add(s);
            });
        }
        
        const superintendencias = Array.from(superintendenciasSet).sort();
        
        if (superintendencias.length === 0) {
            return `
                <div class="filter-popup-empty-state">
                    <div class="filter-popup-empty-state-icon">📭</div>
                    <div class="filter-popup-empty-state-title">Nenhuma superintendência disponível</div>
                    <div class="filter-popup-empty-state-text">
                        ${subsecretariaFilter ? 
                            'Não existem superintendências nas subsecretarias selecionadas.' : 
                            'Não existem superintendências nos dados carregados para aplicar este filtro.'
                        }
                    </div>
                </div>
            `;
        }
        
        const dualListHtml = this.createDualListBox(
            'superintendencia',
            superintendencias,
            [],
            'Superintendências Disponíveis',
            'Superintendências Selecionadas'
        );
        
        // Configurar listeners após renderização
        setTimeout(() => this.setupDualListBoxListeners('superintendencia'), 0);
        
        // Mensagem informativa sobre cascata
        const cascadeInfo = subsecretariaFilter ? 
            `<div class="alert alert-info py-2 mb-2" style="font-size: 0.85rem;">
                <i class="bi bi-funnel-fill me-1"></i>
                Filtrado por subsecretaria(s): <strong>${subsecretariaFilter.values.length}</strong> selecionada(s)
            </div>` : 
            `<p class="filter-hint text-muted small mb-2">
                <i class="bi bi-info-circle"></i> Dica: Adicione um filtro de Subsecretaria primeiro para restringir as opções.
            </p>`;
        
        return `
            <div class="form-group">
                <label>Selecione as Superintendências</label>
                ${cascadeInfo}
                ${dualListHtml}
            </div>
        `;
    }
    
    /**
     * Formulário: Subsecretaria
     */
    /**
     * Formulário: Subsecretaria (usando hierarquia)
     */
    renderSubsecretariaForm() {
        // Obter subsecretarias da hierarquia
        const subsecretariasHierarquia = this.hierarchyManager.getSubsecretarias();
        
        // Combinar com dados únicos existentes (para garantir que todos os dados apareçam)
        const subsecretariasSet = new Set();
        
        // Adicionar da hierarquia
        subsecretariasHierarquia.forEach(s => subsecretariasSet.add(s.name));
        
        // Adicionar dos dados únicos extraídos
        if (this.uniqueValues.subsecretarias) {
            this.uniqueValues.subsecretarias.forEach(s => {
                if (s && s !== 'nan') subsecretariasSet.add(s);
            });
        }
        
        const subsecretarias = Array.from(subsecretariasSet).sort();
        
        if (subsecretarias.length === 0) {
            return `
                <div class="filter-popup-empty-state">
                    <div class="filter-popup-empty-state-icon">📭</div>
                    <div class="filter-popup-empty-state-title">Nenhuma subsecretaria disponível</div>
                    <div class="filter-popup-empty-state-text">Não existem subsecretarias nos dados carregados para aplicar este filtro.</div>
                </div>
            `;
        }
        
        const dualListHtml = this.createDualListBox(
            'subsecretaria',
            subsecretarias,
            [],
            'Subsecretarias Disponíveis',
            'Subsecretarias Selecionadas'
        );
        
        // Configurar listeners após renderização
        setTimeout(() => this.setupDualListBoxListeners('subsecretaria'), 0);
        
        return `
            <div class="form-group">
                <label>Selecione as Subsecretarias</label>
                <p class="filter-hint text-muted small mb-2">
                    <i class="bi bi-info-circle"></i> As superintendências e lotações serão filtradas com base nas subsecretarias selecionadas.
                </p>
                ${dualListHtml}
            </div>
        `;
    }
    
    /**
     * Formulário: Urgência
     */
    renderUrgenciaForm() {
        const urgenciaLevels = [
            { value: 'critical', label: '🔴 Crítica' },
            { value: 'high', label: '🟠 Alta' },
            { value: 'moderate', label: '🟡 Moderada' },
            { value: 'low', label: '� Baixa' }
        ];
        
        const dualListHtml = this.createDualListBox(
            'urgencia',
            urgenciaLevels.map(u => u.label),
            [],
            'Níveis Disponíveis',
            'Níveis Selecionados'
        );
        
        // Configurar listeners após renderização
        setTimeout(() => this.setupDualListBoxListeners('urgencia'), 0);
        
        return `
            <div class="form-group">
                <label>Selecione os Níveis de Urgência</label>
                ${dualListHtml}
            </div>
        `;
    }
    
    /**
     * Formulário: Status
     */
    /**
     * Formulário: Status de Licença
     * REMOVIDO: O sistema apenas visualiza cronogramas de licenças.
     * Não recebe informações sobre se a licença foi realmente usada,
     * nem dados de servidores sem cronograma definido.
     * Portanto, este filtro não é aplicável ao contexto do sistema.
     */
    // renderStatusForm() {
    //     return `
    //         <div class="form-group">
    //             <label>Selecione os status</label>
    //             <div class="checkbox-group">
    //                 <label>
    //                     <input type="checkbox" name="status" value="com-licenca">
    //                     <span>✅ Com Licença Agendada</span>
    //                 </label>
    //                 <label>
    //                     <input type="checkbox" name="status" value="sem-licenca">
    //                     <span>⏳ Sem Licença Agendada</span>
    //                 </label>
    //                 <label>
    //                     <input type="checkbox" name="status" value="vencidas">
    //                     <span>⚠️ Licenças Vencidas</span>
    //                 </label>
    //             </div>
    //         </div>
    //     `;
    // }
    
    /**
     * Formulário: Servidor
     */
    renderServidorForm() {
        // Verificar se há dados disponíveis
        if (!this.uniqueValues.servidores || this.uniqueValues.servidores.length === 0) {
            return `
                <div class="filter-popup-empty-state">
                    <div class="filter-popup-empty-state-icon">📭</div>
                    <div class="filter-popup-empty-state-title">Nenhum servidor disponível</div>
                    <div class="filter-popup-empty-state-text">Não existem servidores nos dados carregados para aplicar este filtro.</div>
                </div>
            `;
        }
        
        // Criar lista de display names para os servidores
        const servidoresDisplay = this.uniqueValues.servidores.map(s => s.displayName);
        
        const dualListHtml = this.createDualListBox(
            'servidor',
            servidoresDisplay,
            [],
            'Servidores Disponíveis',
            'Servidores Selecionados'
        );
        
        // Configurar listeners após renderização
        setTimeout(() => this.setupDualListBoxListeners('servidor'), 0);
        
        return `
            <div class="form-group">
                <label>Selecione os Servidores</label>
                ${dualListHtml}
            </div>
        `;
    }

    /**
     * Formulário: Período
     */
    renderPeriodoForm() {
        return `
            <div class="range-inputs">
                <div class="input-with-label">
                    <label for="filterPeriodoInicio">Data Início</label>
                    <input type="date"
                           id="filterPeriodoInicio"
                           class="form-control"
                           autocomplete="off"
                           placeholder="Selecione a data inicial">
                </div>
                <div class="input-with-label">
                    <label for="filterPeriodoFim">Data Fim</label>
                    <input type="date"
                           id="filterPeriodoFim"
                           class="form-control"
                           autocomplete="off"
                           placeholder="Selecione a data final">
                </div>
            </div>
        `;
    }
    
    /**
     * Formulário: Meses
     */
    renderMesesForm() {
        return `
            <div class="range-inputs">
                <div class="input-with-label">
                    <label for="filterMesesMin">Mínimo de Meses</label>
                    <input type="number" id="filterMesesMin" class="form-control" min="0" max="60" value="0">
                </div>
                <div class="input-with-label">
                    <label for="filterMesesMax">Máximo de Meses</label>
                    <input type="number" id="filterMesesMax" class="form-control" min="0" max="60" value="12">
                </div>
            </div>
            <div class="form-group">
                <label>Ou selecione:</label>
                <div class="preset-buttons">
                    <button type="button" class="btn-preset" data-min="0" data-max="3">0-3 meses</button>
                    <button type="button" class="btn-preset" data-min="3" data-max="6">3-6 meses</button>
                    <button type="button" class="btn-preset" data-min="6" data-max="12">6-12 meses</button>
                    <button type="button" class="btn-preset" data-min="12" data-max="24">12-24 meses</button>
                    <button type="button" class="btn-preset" data-min="24" data-max="60">24+ meses</button>
                </div>
            </div>
        `;
    }

    /**
     * Inicializa os date pickers customizados do filtro de período
     */
    initializePeriodoPickers() {
        const inicioInput = document.getElementById('filterPeriodoInicio');
        const fimInput = document.getElementById('filterPeriodoFim');

        if (!inicioInput || !fimInput) {
            return;
        }

        if (typeof CustomDatePicker === 'undefined') {
            return;
        }

        // Destruir instâncias anteriores se existirem
        if (this.periodoInicioPicker) {
            try {
                this.periodoInicioPicker.destroy();
            } catch (e) {
                // Ignorar erros de destruição
            }
            this.periodoInicioPicker = null;
        }

        if (this.periodoFimPicker) {
            try {
                this.periodoFimPicker.destroy();
            } catch (e) {
                // Ignorar erros de destruição
            }
            this.periodoFimPicker = null;
        }

        try {
            this.periodoInicioPicker = new CustomDatePicker('filterPeriodoInicio', {
                type: 'date',
                onSelect: ({ value }) => {
                    this.syncPeriodoRange('inicio', value);
                }
            });
        } catch (e) {
            // Ignorar erros de criação
        }

        try {
            this.periodoFimPicker = new CustomDatePicker('filterPeriodoFim', {
                type: 'date',
                onSelect: ({ value }) => {
                    this.syncPeriodoRange('fim', value);
                }
            });
        } catch (e) {
            // Ignorar erros de criação
        }

        if (inicioInput.value && this.periodoInicioPicker) {
            this.periodoInicioPicker.setValue(inicioInput.value);
        }

        if (fimInput.value && this.periodoFimPicker) {
            this.periodoFimPicker.setValue(fimInput.value);
        }
    }

    /**
     * Mantém a coerência entre as datas inicial e final do filtro de período
     */
    syncPeriodoRange(changedField, value) {
        const inicioInput = document.getElementById('filterPeriodoInicio');
        const fimInput = document.getElementById('filterPeriodoFim');

        if (!inicioInput || !fimInput) return;

        const inicioValue = inicioInput.value;
        const fimValue = fimInput.value;

        if (changedField === 'inicio' && !fimValue && value) {
            fimInput.value = value;
            if (this.periodoFimPicker) {
                this.periodoFimPicker.setValue(value);
            }
            return;
        }

        if (changedField === 'fim' && !inicioValue && value) {
            inicioInput.value = value;
            if (this.periodoInicioPicker) {
                this.periodoInicioPicker.setValue(value);
            }
            return;
        }

        if (inicioValue && fimValue && inicioValue > fimValue) {
            if (changedField === 'inicio') {
                fimInput.value = inicioValue;
                if (this.periodoFimPicker) {
                    this.periodoFimPicker.setValue(inicioValue);
                }
            } else {
                inicioInput.value = fimValue;
                if (this.periodoInicioPicker) {
                    this.periodoInicioPicker.setValue(fimValue);
                }
            }
        }
    }
    
    /**
     * Setup listeners específicos do formulário
     */
    setupFormSpecificListeners(type) {
        // Presets de idade e meses
        if (type === 'idade' || type === 'meses') {
            const presetButtons = this.filterConfigForm.querySelectorAll('.btn-preset');
            const minInput = type === 'idade' ? 
                document.getElementById('filterIdadeMin') : 
                document.getElementById('filterMesesMin');
            const maxInput = type === 'idade' ? 
                document.getElementById('filterIdadeMax') : 
                document.getElementById('filterMesesMax');
                
            presetButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const min = btn.dataset.min;
                    const max = btn.dataset.max;
                    if (minInput) minInput.value = min;
                    if (maxInput) maxInput.value = max;
                    
                    // Highlight ativo
                    presetButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }
        
        // Busca em selects - REMOVIDO (agora usando select simples)
        // if (type === 'cargo') {
        //     this.setupSearchableSelect('filterCargoSearch', 'filterCargo');
        // }
        
        // if (type === 'lotacao') {
        //     this.setupSearchableSelect('filterLotacaoSearch', 'filterLotacao');
        // }
        
        // if (type === 'servidor') {
        //     this.setupSearchableCheckboxList('filterServidorSearch', 'filterServidorList');
        // }
    }
    
    /**
     * Setup busca em select
     */
    setupSearchableSelect(searchId, selectId) {
        const searchInput = document.getElementById(searchId);
        const select = document.getElementById(selectId);
        
        if (!searchInput || !select) return;
        
        const originalOptions = Array.from(select.options);
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            select.innerHTML = '<option value="">Selecione...</option>';
            
            originalOptions.forEach(option => {
                if (option.value === '') return;
                if (option.text.toLowerCase().includes(query)) {
                    select.appendChild(option.cloneNode(true));
                }
            });
        });
    }
    
    /**
     * Setup busca em lista de checkboxes
     */
    setupSearchableCheckboxList(searchId, listId) {
        const searchInput = document.getElementById(searchId);
        const list = document.getElementById(listId);
        
        if (!searchInput || !list) return;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = list.querySelectorAll('.multi-select-item');
            
            items.forEach(item => {
                const label = item.querySelector('label');
                if (label && label.textContent.toLowerCase().includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    /**
     * Adicionar ou atualizar filtro
     */
    handleAddOrUpdateFilter() {
        const type = this.filterTypeSelect.value;
        if (!type) return;
        
        const filterData = this.extractFilterData(type);
        if (!filterData) return;
        
        if (this.currentEditingId) {
            // Atualizar filtro existente
            const index = this.filters.findIndex(f => f.id === this.currentEditingId);
            if (index !== -1) {
                this.filters[index] = { ...filterData, id: this.currentEditingId };
            }
            this.currentEditingId = null;
        } else {
            // Adicionar novo filtro
            filterData.id = `filter-${++this.filterIdCounter}`;
            this.filters.push(filterData);
        }
        
        // Renderizar lista
        this.renderActiveFilters();
        
        // Atualizar preview
        this.updateResultsPreview();
        
        // Resetar formulário
        this.resetForm();
    }
    
    /**
     * Extrai dados do formulário baseado no tipo
     */
    extractFilterData(type) {
        const data = {
            type,
            label: this.getFilterLabel(type),
            icon: this.getFilterIcon(type),
            value: null,
            displayText: ''
        };
        
        switch (type) {
            case 'idade': {
                const min = parseInt(document.getElementById('filterIdadeMin')?.value) || 18;
                const max = parseInt(document.getElementById('filterIdadeMax')?.value) || 70;
                data.value = { min, max };
                data.displayText = `${min}-${max} anos`;
                break;
            }
            case 'cargo': {
                const selected = this.getDualListSelectedValues('cargo');
                if (selected.length === 0) return null;
                data.value = selected;
                data.displayText = selected.length === 1 ? selected[0] : `${selected.length} cargos`;
                break;
            }
            case 'lotacao': {
                const selected = this.getDualListSelectedValues('lotacao');
                if (selected.length === 0) return null;
                data.value = selected; // Sempre array
                data.displayText = selected.length === 1 ? selected[0] : `${selected.length} lotações`;
                break;
            }
            case 'superintendencia': {
                const selected = this.getDualListSelectedValues('superintendencia');
                if (selected.length === 0) return null;
                data.value = selected; // Sempre array
                data.displayText = selected.length === 1 ? selected[0] : `${selected.length} superintendências`;
                break;
            }
            case 'subsecretaria': {
                const selected = this.getDualListSelectedValues('subsecretaria');
                if (selected.length === 0) return null;
                data.value = selected; // Sempre array
                data.displayText = selected.length === 1 ? selected[0] : `${selected.length} subsecretarias`;
                break;
            }
            case 'urgencia': {
                const selected = this.getDualListSelectedValues('urgencia');
                if (selected.length === 0) return null;
                // Mapear de volta para os valores (remover emojis)
                const values = selected.map(label => {
                    if (label.includes('Crítica')) return 'critical';
                    if (label.includes('Alta')) return 'high';
                    if (label.includes('Moderada')) return 'moderate';
                    if (label.includes('Baixa')) return 'low';
                    return label;
                });
                data.value = values;
                data.displayText = selected.join(', ');
                break;
            }
            // case 'status': {
            //     const checked = Array.from(document.querySelectorAll('input[name="status"]:checked'))
            //         .map(cb => cb.value);
            //     if (checked.length === 0) return null;
            //     data.value = checked;
            //     data.displayText = checked.map(v => {
            //         const labels = { 'com-licenca': 'Com Licença', 'sem-licenca': 'Sem Licença', 'vencidas': 'Vencidas' };
            //         return labels[v] || v;
            //     }).join(', ');
            //     break;
            // }
            // REMOVIDO: Status não é gerenciado pelo sistema
            case 'servidor': {
                const selected = this.getDualListSelectedValues('servidor');
                if (selected.length === 0) return null;
                data.value = selected;
                data.displayText = selected.length === 1 ? selected[0] : `${selected.length} servidor${selected.length > 1 ? 'es' : ''}`;
                break;
            }
            case 'periodo': {
                const inicio = document.getElementById('filterPeriodoInicio')?.value;
                const fim = document.getElementById('filterPeriodoFim')?.value;
                if (!inicio || !fim) return null;

                const inicioDate = new Date(`${inicio}T00:00:00`);
                const fimDate = new Date(`${fim}T23:59:59`);

                if (inicioDate > fimDate) {
                    window.customModal?.alert({
                        title: 'Data Inválida',
                        message: 'A data inicial não pode ser maior que a data final.',
                        type: 'warning'
                    });
                    return null;
                }

                data.value = { inicio, fim };
                data.displayText = `${this.formatDate(inicio)} a ${this.formatDate(fim)}`;
                break;
            }
            case 'meses': {
                const min = parseInt(document.getElementById('filterMesesMin')?.value) || 0;
                const max = parseInt(document.getElementById('filterMesesMax')?.value) || 12;
                data.value = { min, max };
                data.displayText = `${min}-${max} meses`;
                break;
            }
        }
        
        return data;
    }
    
    /**
     * Renderiza lista de filtros ativos
     */
    renderActiveFilters() {
        if (!this.activeFiltersList) return;
        
        if (this.filters.length === 0) {
            this.activeFiltersList.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-funnel"></i>
                    <p>Nenhum filtro ativo</p>
                    <small>Adicione filtros usando o formulário ao lado</small>
                </div>
            `;
            
            // Desabilitar botão limpar
            const clearAllBtn = document.getElementById('clearAllFiltersModalBtn');
            if (clearAllBtn) clearAllBtn.disabled = true;
            
            // Atualizar contador
            if (this.activeFiltersCount) {
                this.activeFiltersCount.textContent = '(0)';
            }
            
            // Atualizar badge no header
            this.updateHeaderBadge();
            
            return;
        }
        
        const html = this.filters.map(filter => `
            <div class="filter-card" data-type="${filter.type}" data-id="${filter.id}">
                <div class="filter-card-header">
                    <div class="filter-card-icon">${filter.icon}</div>
                    <div class="filter-card-title">${filter.label}</div>
                </div>
                <div class="filter-card-value">${this.escapeHtml(filter.displayText)}</div>
                <div class="filter-card-actions">
                    <button class="btn btn-edit" data-filter-id="${filter.id}">
                        <i class="bi bi-pencil"></i>
                        Editar
                    </button>
                    <button class="btn btn-remove" data-filter-id="${filter.id}">
                        <i class="bi bi-trash"></i>
                        Remover
                    </button>
                </div>
            </div>
        `).join('');
        
        this.activeFiltersList.innerHTML = html;
        
        // Habilitar botão limpar
        const clearAllBtn = document.getElementById('clearAllFiltersModalBtn');
        if (clearAllBtn) clearAllBtn.disabled = false;
        
        // Atualizar contador
        if (this.activeFiltersCount) {
            this.activeFiltersCount.textContent = `(${this.filters.length})`;
        }
        
        // Atualizar badge no header
        this.updateHeaderBadge();
    }
    
    /**
     * Editar filtro
     */
    editFilter(filterId) {
        const filter = this.filters.find(f => f.id === filterId);
        if (!filter) return;
        
        // Abre o popup com os dados do filtro
        this.openFilterConfigPopup(filter.type, filterId);
    }
    
    /**
     * Preenche formulário com dados do filtro
     */
    populateFormWithFilter(filter) {
        // Aguardar um pouco para o dual list box ser renderizado
        setTimeout(() => {
            switch (filter.type) {
                case 'idade':
                    document.getElementById('filterIdadeMin').value = filter.value.min;
                    document.getElementById('filterIdadeMax').value = filter.value.max;
                    break;
                case 'cargo':
                case 'lotacao':
                case 'superintendencia':
                case 'subsecretaria':
                case 'servidor':
                case 'urgencia':
                    // Para dual list boxes, mover itens do array de valores para a lista de selecionados
                    this.populateDualListBox(filter.type, filter.value);
                    break;
                case 'periodo':
                    const inicioInput = document.getElementById('filterPeriodoInicio');
                    const fimInput = document.getElementById('filterPeriodoFim');

                    if (inicioInput) inicioInput.value = filter.value.inicio;
                    if (fimInput) fimInput.value = filter.value.fim;

                    if (this.periodoInicioPicker) {
                        this.periodoInicioPicker.setValue(filter.value.inicio);
                    }

                    if (this.periodoFimPicker) {
                        this.periodoFimPicker.setValue(filter.value.fim);
                    }
                    break;
                case 'meses':
                    document.getElementById('filterMesesMin').value = filter.value.min;
                    document.getElementById('filterMesesMax').value = filter.value.max;
                    break;
            }
        }, 100);
    }
    
    /**
     * Popula um dual list box com valores pré-selecionados
     */
    populateDualListBox(type, selectedValues) {
        const container = document.querySelector(`[data-dual-list="${type}"]`);
        if (!container) return;
        
        const availableItems = container.querySelector('[data-items-available]');
        const selectedItems = container.querySelector('[data-items-selected]');
        
        // Para cada valor que deve estar selecionado
        selectedValues.forEach(value => {
            // Procurar o item na lista de disponíveis
            const item = availableItems.querySelector(`[data-value="${value}"]`);
            if (item) {
                // Simular clique para mover para selecionados
                item.click();
            }
        });
    }
    
    /**
     * Remover filtro
     */
    removeFilter(filterId) {
        // Adicionar animação de remoção
        const card = document.querySelector(`.filter-card[data-id="${filterId}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => {
                this.filters = this.filters.filter(f => f.id !== filterId);
                this.renderActiveFilters();
                this.updateResultsPreview();
            }, 300);
        } else {
            this.filters = this.filters.filter(f => f.id !== filterId);
            this.renderActiveFilters();
            this.updateResultsPreview();
        }
    }
    
    /**
     * Limpar todos os filtros
     */
    async clearAllFilters() {
        if (this.filters.length === 0) return;
        
        const confirmed = await window.customModal?.confirm({
            title: 'Limpar Filtros',
            message: 'Deseja realmente remover todos os filtros?',
            type: 'warning',
            confirmText: 'Sim, limpar',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            this.filters = [];
            this.renderActiveFilters();
            this.updateResultsPreview();
            this.resetForm();
        }
    }
    
    /**
     * Cancelar edição
     */
    cancelFilterEdit() {
        this.currentEditingId = null;
        this.resetForm();
    }
    
    /**
     * Resetar formulário
     */
    resetForm() {
        this.cleanupFormInstances();

        if (this.filterTypeSelect) {
            this.filterTypeSelect.value = '';
        }
        
        if (this.filterConfigForm) {
            this.filterConfigForm.style.display = 'none';
            this.filterConfigForm.innerHTML = '';
        }
        
        if (this.filterFormActions) {
            this.filterFormActions.style.display = 'none';
        }
        
        const actionText = document.getElementById('filterActionText');
        if (actionText) actionText.textContent = 'Adicionar Filtro';
        
        this.currentEditingId = null;
    }
    
    /**
     * Atualizar preview de resultados
     */
    updateResultsPreview() {
        if (!this.resultsCount || !this.dashboard.allServidores) return;
        
        const total = this.dashboard.allServidores.length;
        const filtered = this.applyFiltersToData(this.dashboard.allServidores).length;
        
        this.resultsCount.innerHTML = `Mostrando <strong>${filtered}</strong> de <strong>${total}</strong> servidores`;
    }
    
    /**
     * Aplicar filtros aos dados (preview)
     */
    applyFiltersToData(servidores) {
        if (this.filters.length === 0) return servidores;
        
        const filtered = servidores.filter(servidor => {
            return this.filters.every(filter => {
                return this.checkFilter(servidor, filter);
            });
        });
        
        return filtered;
    }
    
    /**
     * Verifica se servidor passa no filtro
     */
    checkFilter(servidor, filter) {
        switch (filter.type) {
            case 'idade':
                const idade = servidor.idade || 0;
                return idade >= filter.value.min && idade <= filter.value.max;
                
            case 'cargo':
                // filter.value agora é um array de cargos
                return Array.isArray(filter.value) 
                    ? filter.value.includes(servidor.cargo)
                    : servidor.cargo === filter.value;
                
            case 'lotacao':
                // Filtro por gerência/lotação específica
                // A lotação do servidor pode ser qualquer nível da hierarquia
                return this.checkHierarchyFilter(servidor, filter.value, 'gerencia');
                
            case 'superintendencia':
                // Filtro hierárquico: traz servidores da superintendência E todas suas gerências
                return this.checkHierarchyFilter(servidor, filter.value, 'superintendencia');
                
            case 'subsecretaria':
                // Filtro hierárquico: traz servidores da subsecretaria E todas superintendências E gerências abaixo
                return this.checkHierarchyFilter(servidor, filter.value, 'subsecretaria');
                
            case 'urgencia':
                // filter.value é array de níveis de urgência
                return filter.value.includes(servidor.nivelUrgencia);
                
            case 'servidor':
                // filter.value é array de display names de servidores
                // Precisamos verificar pelo display name
                const displayName = `${servidor.nome} ${servidor.matricula ? `(${servidor.matricula})` : ''}`;
                return filter.value.some(selected => {
                    // Comparar com o display name ou apenas com o nome
                    return selected === displayName || selected === servidor.nome;
                });
                
            case 'periodo':
                // Filtro por período de gozo considera sobreposição entre intervalos
                if (!filter.value?.inicio || !filter.value?.fim) return true;

                const filterStart = new Date(`${filter.value.inicio}T00:00:00`);
                const filterEnd = new Date(`${filter.value.fim}T23:59:59`);

                const normalizeDate = (date) => {
                    if (!date) return null;
                    if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
                    const parsed = new Date(date);
                    return isNaN(parsed.getTime()) ? null : parsed;
                };

                const intervals = [];

                const inicioPrincipal = normalizeDate(servidor.inicioLicenca);
                const fimPrincipal = normalizeDate(servidor.fimLicenca);

                if (inicioPrincipal) {
                    intervals.push({ inicio: inicioPrincipal, fim: fimPrincipal || inicioPrincipal });
                }

                if (Array.isArray(servidor.licencas)) {
                    servidor.licencas.forEach(licenca => {
                        const inicio = normalizeDate(licenca?.inicio);
                        const fim = normalizeDate(licenca?.fim) || inicio;
                        if (inicio) {
                            intervals.push({ inicio, fim });
                        }
                    });
                }

                if (intervals.length === 0) return false;

                return intervals.some(({ inicio, fim }) => {
                    if (!inicio) return false;
                    const fimCalculado = fim || inicio;
                    return fimCalculado >= filterStart && inicio <= filterEnd;
                });
                
            case 'meses':
                // Filtro por meses acumulados de licença
                const meses = servidor.mesesLicenca || servidor.mesesCalculados || 0;
                return meses >= filter.value.min && meses <= filter.value.max;
            
            case 'hierarquia':
                // Filtro hierárquico unificado
                return this.checkUnifiedHierarchyFilter(servidor, filter.value);
                
            default:
                return true;
        }
    }
    
    /**
     * Aplicar filtros ao dashboard
     */
    applyFilters(silent = false) {
        const filtered = this.applyFiltersToData(this.dashboard.allServidores);
        this.dashboard.filteredServidores = filtered;
        
        // Atualizar UI do dashboard
        if (this.dashboard.updateTable) this.dashboard.updateTable();
        if (this.dashboard.updateStats) this.dashboard.updateStats();
        if (this.dashboard.updateCharts) this.dashboard.updateCharts();
        
        // Fechar modal
        this.closeModal();
        
        // Feedback (apenas se não for silencioso)
        if (!silent && this.dashboard.showToast) {
            this.dashboard.showToast(
                `Filtros aplicados: ${filtered.length} de ${this.dashboard.allServidores.length} servidores`,
                'success'
            );
        }
    }
    
    /**
     * Verifica se um servidor pertence à hierarquia selecionada
     * O campo 'lotacao' do servidor pode conter qualquer nível: subsecretaria, superintendência ou gerência
     * @param {Object} servidor - Objeto do servidor com campo 'lotacao'
     * @param {Array|string} filterValues - Valores selecionados no filtro
     * @param {string} filterLevel - Nível do filtro: 'subsecretaria', 'superintendencia' ou 'gerencia'
     * @returns {boolean} True se o servidor pertence à hierarquia
     */
    checkHierarchyFilter(servidor, filterValues, filterLevel) {
        const values = Array.isArray(filterValues) ? filterValues : [filterValues];
        const lotacao = servidor.lotacao;
        
        if (!lotacao) return false;
        
        // Buscar informações hierárquicas da lotação do servidor
        const lotacaoInfo = this.hierarchyManager.findLotacao(lotacao);
        
        // Verificar para cada valor selecionado no filtro
        return values.some(selectedValue => {
            if (!selectedValue) return false;
            
            const normalizedSelected = selectedValue.toLowerCase().trim();
            const normalizedLotacao = lotacao.toLowerCase().trim();
            
            // 1. Verificação direta: a lotação do servidor corresponde exatamente ao filtro
            if (normalizedLotacao.includes(normalizedSelected) || normalizedSelected.includes(normalizedLotacao)) {
                return true;
            }
            
            // 2. Se não encontrou info hierárquica, tenta match por sigla
            if (!lotacaoInfo) {
                // Extrai sigla do valor selecionado e da lotação
                const siglaSelected = this.extractSigla(selectedValue);
                const siglaLotacao = this.extractSigla(lotacao);
                return siglaSelected && siglaLotacao && siglaSelected === siglaLotacao;
            }
            
            // 3. Verificação hierárquica baseada no nível do filtro
            switch (filterLevel) {
                case 'subsecretaria':
                    // Filtro de subsecretaria: verificar se a lotação pertence a esta subsecretaria
                    // (pode ser a própria subsecretaria, uma superintendência ou gerência dentro dela)
                    if (lotacaoInfo.subsecretaria) {
                        const normalizedSubsec = lotacaoInfo.subsecretaria.toLowerCase();
                        if (normalizedSubsec.includes(normalizedSelected) || normalizedSelected.includes(normalizedSubsec)) {
                            return true;
                        }
                    }
                    break;
                    
                case 'superintendencia':
                    // Filtro de superintendência: verificar se a lotação pertence a esta superintendência
                    // (pode ser a própria superintendência ou uma gerência dentro dela)
                    if (lotacaoInfo.superintendencia) {
                        const normalizedSuper = lotacaoInfo.superintendencia.toLowerCase();
                        if (normalizedSuper.includes(normalizedSelected) || normalizedSelected.includes(normalizedSuper)) {
                            return true;
                        }
                    }
                    // Também verifica se a própria lotação é uma superintendência selecionada
                    if (lotacaoInfo.type === 'superintendencia') {
                        const normalizedName = lotacaoInfo.name.toLowerCase();
                        if (normalizedName.includes(normalizedSelected) || normalizedSelected.includes(normalizedName)) {
                            return true;
                        }
                    }
                    break;
                    
                case 'gerencia':
                    // Filtro de gerência/lotação: verificação direta (já foi feita acima)
                    // Verifica também pelo nome completo na hierarquia
                    if (lotacaoInfo.name) {
                        const normalizedName = lotacaoInfo.name.toLowerCase();
                        if (normalizedName.includes(normalizedSelected) || normalizedSelected.includes(normalizedName)) {
                            return true;
                        }
                    }
                    break;
            }
            
            return false;
        });
    }
    
    /**
     * Verifica se servidor passa no filtro hierárquico unificado
     * O filtro contém subsecretarias, superintendencias e lotacoes selecionadas
     * Um servidor passa se sua lotação pertence a QUALQUER um dos itens selecionados
     */
    checkUnifiedHierarchyFilter(servidor, filterValue) {
        if (!filterValue) return true;
        
        const { subsecretarias = [], superintendencias = [], lotacoes = [] } = filterValue;
        
        // Se não há nenhuma seleção, passa todos
        if (subsecretarias.length === 0 && superintendencias.length === 0 && lotacoes.length === 0) {
            return true;
        }
        
        const lotacao = servidor.lotacao;
        if (!lotacao) return false;
        
        // Buscar informações hierárquicas da lotação do servidor
        const lotacaoInfo = this.hierarchyManager.findLotacao(lotacao);
        const normalizedLotacao = lotacao.toLowerCase().trim();
        
        // Verificar se a lotação está diretamente selecionada
        if (lotacoes.some(l => {
            const normalized = l.toLowerCase().trim();
            return normalizedLotacao.includes(normalized) || normalized.includes(normalizedLotacao);
        })) {
            return true;
        }
        
        // Se temos info hierárquica, verificar nos níveis superiores
        if (lotacaoInfo) {
            // Verificar se a superintendência do servidor está selecionada
            if (lotacaoInfo.superintendencia && superintendencias.some(s => {
                const normalized = s.toLowerCase().trim();
                const normalizedSuper = lotacaoInfo.superintendencia.toLowerCase();
                return normalizedSuper.includes(normalized) || normalized.includes(normalizedSuper);
            })) {
                return true;
            }
            
            // Verificar se a subsecretaria do servidor está selecionada
            if (lotacaoInfo.subsecretaria && subsecretarias.some(sub => {
                const normalized = sub.toLowerCase().trim();
                const normalizedSubsec = lotacaoInfo.subsecretaria.toLowerCase();
                return normalizedSubsec.includes(normalized) || normalized.includes(normalizedSubsec);
            })) {
                return true;
            }
        }
        
        // Fallback: tentar match por sigla
        const siglaLotacao = this.extractSigla(lotacao);
        if (siglaLotacao) {
            // Verificar em todas as listas
            const allSelected = [...subsecretarias, ...superintendencias, ...lotacoes];
            return allSelected.some(selected => {
                const siglaSelected = this.extractSigla(selected);
                return siglaSelected && siglaSelected === siglaLotacao;
            });
        }
        
        return false;
    }
    
    /**
     * Extrai sigla de um nome (ex: "STE - Subsecretaria..." -> "STE")
     */
    extractSigla(name) {
        if (!name) return null;
        const match = name.match(/^([A-Z0-9/]+)\s*-/);
        return match ? match[1].trim().toLowerCase() : null;
    }
    
    /**
     * Obter label do filtro
     */
    getFilterLabel(type) {
        const labels = {
            idade: 'Idade',
            cargo: 'Cargo',
            lotacao: 'Lotação',
            superintendencia: 'Superintendência',
            subsecretaria: 'Subsecretaria',
            urgencia: 'Urgência',
            status: 'Status',
            servidor: 'Servidor',
            periodo: 'Período de Gozo',
            meses: 'Meses Acumulados',
            hierarquia: 'Hierarquia'
        };
        return labels[type] || type;
    }
    
    /**
     * Obter ícone do filtro
     */
    getFilterIcon(type) {
        const icons = {
            idade: '🎂',
            cargo: '💼',
            lotacao: '🏢',
            superintendencia: '🏛️',
            subsecretaria: '📋',
            urgencia: '⚠️',
            status: '📊',
            servidor: '👤',
            periodo: '📅',
            meses: '⏱️',
            hierarquia: '🗂️'
        };
        return icons[type] || '🔹';
    }
    
    /**
     * Atualizar badge no header
     */
    updateHeaderBadge() {
        const badge = document.getElementById('activeFiltersBadge');
        if (!badge) return;
        
        if (this.filters.length > 0) {
            badge.textContent = this.filters.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    /**
     * Formatar data
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }
    
    /**
     * Normaliza texto removendo acentos para busca
     */
    normalizeText(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    /**
     * Cria um componente Dual List Box (duas colunas para seleção)
     * @param {string} id - ID único para o componente
     * @param {Array} availableItems - Lista de itens disponíveis
     * @param {Array} selectedItems - Lista de itens já selecionados
     * @param {string} availableLabel - Label da coluna de disponíveis
     * @param {string} selectedLabel - Label da coluna de selecionados
     * @returns {string} HTML do componente
     */
    createDualListBox(id, availableItems, selectedItems = [], availableLabel = 'Disponíveis', selectedLabel = 'Selecionados') {
        const selectedSet = new Set(selectedItems);
        const available = availableItems.filter(item => !selectedSet.has(item));
        
        return `
            <div class="dual-list-container" data-dual-list="${id}">
                <!-- Coluna da Esquerda: Disponíveis -->
                <div class="dual-list-panel">
                    <div class="dual-list-header">
                        <span class="dual-list-title">
                            ${availableLabel}
                            <span class="dual-list-count" data-count-available>${available.length}</span>
                        </span>
                    </div>
                    <div class="dual-list-search">
                        <input 
                            type="text" 
                            placeholder="Buscar..."
                            data-search-available
                            autocomplete="off"
                        >
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
                
                <!-- Coluna da Direita: Selecionados -->
                <div class="dual-list-panel selected">
                    <div class="dual-list-header">
                        <span class="dual-list-title">
                            ${selectedLabel}
                            <span class="dual-list-count" data-count-selected>${selectedItems.length}</span>
                        </span>
                    </div>
                    <div class="dual-list-search">
                        <input 
                            type="text" 
                            placeholder="Buscar..."
                            data-search-selected
                            autocomplete="off"
                        >
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
     * @param {string} id - ID do componente dual list
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
        
        // Função para mover item da esquerda para direita
        const moveToSelected = (itemElement) => {
            const value = itemElement.dataset.value;
            itemElement.remove();
            
            // Remove empty state se existir
            const emptyState = selectedItems.querySelector('.dual-list-empty');
            if (emptyState) emptyState.remove();
            
            // Adiciona na lista de selecionados
            const newItem = document.createElement('div');
            newItem.className = 'dual-list-item';
            newItem.dataset.value = value;
            newItem.dataset.itemSelected = '';
            newItem.innerHTML = `
                <span class="dual-list-item-text">${this.escapeHtml(value)}</span>
                <i class="bi bi-x-lg dual-list-item-icon"></i>
            `;
            selectedItems.appendChild(newItem);
            
            // Atualiza contadores
            this.updateDualListCounts(container, countAvailable, countSelected);
            
            // Verifica se lista disponível ficou vazia
            if (availableItems.querySelectorAll('[data-item-available]').length === 0) {
                availableItems.innerHTML = `
                    <div class="dual-list-empty">
                        <div class="dual-list-empty-icon">✓</div>
                        <div class="dual-list-empty-text">Todos os itens foram selecionados</div>
                    </div>
                `;
            }
        };
        
        // Função para mover item da direita para esquerda
        const moveToAvailable = (itemElement) => {
            const value = itemElement.dataset.value;
            itemElement.remove();
            
            // Remove empty state se existir
            const emptyState = availableItems.querySelector('.dual-list-empty');
            if (emptyState) emptyState.remove();
            
            // Adiciona na lista de disponíveis
            const newItem = document.createElement('div');
            newItem.className = 'dual-list-item';
            newItem.dataset.value = value;
            newItem.dataset.itemAvailable = '';
            newItem.innerHTML = `
                <span class="dual-list-item-text">${this.escapeHtml(value)}</span>
                <i class="bi bi-chevron-right dual-list-item-icon"></i>
            `;
            availableItems.appendChild(newItem);
            
            // Atualiza contadores
            this.updateDualListCounts(container, countAvailable, countSelected);
            
            // Verifica se lista selecionada ficou vazia
            if (selectedItems.querySelectorAll('[data-item-selected]').length === 0) {
                selectedItems.innerHTML = `
                    <div class="dual-list-empty">
                        <div class="dual-list-empty-icon">👈</div>
                        <div class="dual-list-empty-text">Clique nos itens à esquerda para selecioná-los</div>
                    </div>
                `;
            }
        };
        
        // Event delegation para cliques nos itens
        availableItems.addEventListener('click', (e) => {
            const item = e.target.closest('[data-item-available]');
            if (item) moveToSelected(item);
        });
        
        selectedItems.addEventListener('click', (e) => {
            const item = e.target.closest('[data-item-selected]');
            if (item) moveToAvailable(item);
        });
        
        // Busca na lista de disponíveis
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
                
                // Mostra mensagem se não houver resultados
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
        
        // Busca na lista de selecionados
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
                
                // Mostra mensagem se não houver resultados
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
    }
    
    /**
     * Atualiza os contadores do dual list box
     */
    updateDualListCounts(container, countAvailable, countSelected) {
        const availableCount = container.querySelectorAll('[data-item-available]').length;
        const selectedCount = container.querySelectorAll('[data-item-selected]').length;
        
        if (countAvailable) countAvailable.textContent = availableCount;
        if (countSelected) countSelected.textContent = selectedCount;
    }
    
    /**
     * Obtém os valores selecionados de um dual list box
     * @param {string} id - ID do componente
     * @returns {Array} Array com os valores selecionados
     */
    getDualListSelectedValues(id) {
        const container = document.querySelector(`[data-dual-list="${id}"]`);
        
        if (!container) {
            return [];
        }
        
        const selectedItems = container.querySelectorAll('[data-item-selected]');
        const values = Array.from(selectedItems).map(item => item.dataset.value);
        
        return values;
    }

    /**
     * Adiciona um filtro programaticamente (usado quando clica em cards/gráficos)
     * @param {string} type - Tipo do filtro ('cargo', 'urgencia', etc)
     * @param {string} value - Valor do filtro (ex: 'Contador', 'moderado')
     */
    addFilterProgrammatically(type, value) {
        // Criar objeto de filtro EXATAMENTE como extractFilterData faria
        const filterData = {
            id: ++this.filterIdCounter,
            type: type,
            label: this.getFilterLabel(type),
            icon: this.getFilterIcon(type),
            value: null,
            displayText: ''
        };
        
        // Processar conforme o tipo, IGUAL ao extractFilterData
        if (type === 'urgencia') {
            // O valor vem como 'crítico', 'moderado', etc. (em português)
            // Precisa mapear para o formato interno E criar displayText com emoji
            const urgencyMap = {
                'crítico': { internal: 'critical', display: '🔴 Crítica' },
                'alto': { internal: 'high', display: '🟠 Alta' },
                'moderado': { internal: 'moderate', display: '🟡 Moderada' },
                'baixo': { internal: 'low', display: '🟢 Baixa' }
            };
            
            const normalized = value.toLowerCase();
            const mapped = urgencyMap[normalized];
            
            if (mapped) {
                filterData.value = [mapped.internal]; // Array de valores internos
                filterData.displayText = mapped.display; // Label com emoji
            } else {
                // Fallback se não encontrar no map
                filterData.value = [value];
                filterData.displayText = value;
            }
        } else if (type === 'cargo') {
            // Para cargo, o valor já vem correto
            filterData.value = Array.isArray(value) ? value : [value];
            filterData.displayText = Array.isArray(value) 
                ? (value.length === 1 ? value[0] : `${value.length} cargos`)
                : value;
        } else {
            // Para outros tipos, usar lógica genérica
            filterData.value = Array.isArray(value) ? value : [value];
            filterData.displayText = Array.isArray(value) ? value.join(', ') : value;
        }
        
        // Adicionar ao array de filtros
        this.filters.push(filterData);
        
        // Atualizar a interface (renderiza a lista de filtros ativos)
        this.renderActiveFilters();
        
        // Atualizar preview de resultados
        this.updateResultsPreview();
        
        // Aplicar filtros automaticamente (SILENCIOSO - sem toast chato)
        this.applyFilters(true);
        
        console.log('✅ Filtro adicionado programaticamente:', filterData);
    }

    /**
     * Escapar HTML
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Instância global (será criada pelo dashboard)
let advancedFiltersBuilder = null;
