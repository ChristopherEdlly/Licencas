/**
 * HierarchyFilterModal.js
 * Modal de filtro hierárquico com 3 colunas (Subsecretaria, Superintendência, Lotação)
 * Permite seleção em cascata com auto-preenchimento e remoção granular
 */

class HierarchyFilterModal {
    constructor(options = {}) {
        this.hierarchyManager = window.lotacaoHierarchyManager || new LotacaoHierarchyManager();
        this.onApply = options.onApply || (() => {});
        this.onClose = options.onClose || (() => {});
        
        // Estado de seleção
        this.selected = {
            subsecretarias: new Set(),
            superintendencias: new Set(),
            lotacoes: new Set()
        };
        
        // Cache de dados
        this.data = {
            subsecretarias: [],
            superintendencias: [],
            lotacoes: []
        };
        
        this.modal = null;
        
        // Termos de busca por coluna
        this.searchTerms = {
            subsecretaria: '',
            superintendencia: '',
            lotacao: ''
        };
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.createModal();
        this.attachEventListeners();
    }
    
    /**
     * Carrega dados da hierarquia
     */
    loadData() {
        this.data.subsecretarias = this.hierarchyManager.getSubsecretarias();
        this.data.superintendencias = this.hierarchyManager.getSuperintendencias();
        this.data.lotacoes = this.hierarchyManager.getGerencias();
    }
    
    /**
     * Cria o modal no DOM
     */
    createModal() {
        // Remove modal existente se houver
        const existing = document.getElementById('hierarchyFilterModal');
        if (existing) existing.remove();
        
        const modalHtml = `
            <div class="hierarchy-modal-overlay" id="hierarchyFilterModal">
                <div class="hierarchy-modal">
                    <div class="hierarchy-modal-header">
                        <h3>
                            <i class="bi bi-diagram-3"></i>
                            Filtro por Lotação
                        </h3>
                        <button class="hierarchy-modal-close" id="hierarchyModalClose">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                    
                    <div class="hierarchy-modal-body">
                        <div class="hierarchy-columns">
                            <div class="hierarchy-column" id="colSubsecretaria">
                                <div class="hierarchy-column-header">
                                    <span>Subsecretaria</span>
                                    <span class="hierarchy-column-count" id="countSubsecretaria">0</span>
                                </div>
                                <div class="hierarchy-column-search">
                                    <i class="bi bi-search"></i>
                                    <input type="text" 
                                           class="hierarchy-search-input"
                                           data-level="subsecretaria"
                                           placeholder="Buscar..." 
                                           autocomplete="off">
                                </div>
                                <div class="hierarchy-column-actions">
                                    <button class="hierarchy-select-all" data-level="subsecretaria" data-action="all">
                                        <i class="bi bi-check-all"></i> Todos
                                    </button>
                                    <button class="hierarchy-select-none" data-level="subsecretaria" data-action="none">
                                        <i class="bi bi-x"></i> Nenhum
                                    </button>
                                </div>
                                <div class="hierarchy-column-list" id="listSubsecretaria"></div>
                            </div>
                            
                            <div class="hierarchy-column" id="colSuperintendencia">
                                <div class="hierarchy-column-header">
                                    <span>Superintendência</span>
                                    <span class="hierarchy-column-count" id="countSuperintendencia">0</span>
                                </div>
                                <div class="hierarchy-column-search">
                                    <i class="bi bi-search"></i>
                                    <input type="text" 
                                           class="hierarchy-search-input"
                                           data-level="superintendencia"
                                           placeholder="Buscar..." 
                                           autocomplete="off">
                                </div>
                                <div class="hierarchy-column-actions">
                                    <button class="hierarchy-select-all" data-level="superintendencia" data-action="all">
                                        <i class="bi bi-check-all"></i> Todos
                                    </button>
                                    <button class="hierarchy-select-none" data-level="superintendencia" data-action="none">
                                        <i class="bi bi-x"></i> Nenhum
                                    </button>
                                </div>
                                <div class="hierarchy-column-list" id="listSuperintendencia"></div>
                            </div>
                            
                            <div class="hierarchy-column" id="colLotacao">
                                <div class="hierarchy-column-header">
                                    <span>Lotação / Gerência</span>
                                    <span class="hierarchy-column-count" id="countLotacao">0</span>
                                </div>
                                <div class="hierarchy-column-search">
                                    <i class="bi bi-search"></i>
                                    <input type="text" 
                                           class="hierarchy-search-input"
                                           data-level="lotacao"
                                           placeholder="Buscar..." 
                                           autocomplete="off">
                                </div>
                                <div class="hierarchy-column-actions">
                                    <button class="hierarchy-select-all" data-level="lotacao" data-action="all">
                                        <i class="bi bi-check-all"></i> Todos
                                    </button>
                                    <button class="hierarchy-select-none" data-level="lotacao" data-action="none">
                                        <i class="bi bi-x"></i> Nenhum
                                    </button>
                                </div>
                                <div class="hierarchy-column-list" id="listLotacao"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hierarchy-modal-footer">
                        <div class="hierarchy-selection-summary" id="hierarchySelectionSummary">
                            Nenhum filtro selecionado
                        </div>
                        <div class="hierarchy-modal-buttons">
                            <button class="btn-hierarchy-clear" id="hierarchyClearBtn">
                                <i class="bi bi-eraser"></i> Limpar
                            </button>
                            <button class="btn-hierarchy-cancel" id="hierarchyCancelBtn">
                                Cancelar
                            </button>
                            <button class="btn-hierarchy-apply" id="hierarchyApplyBtn">
                                <i class="bi bi-check-lg"></i> Aplicar Filtro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById('hierarchyFilterModal');
    }
    
    /**
     * Anexa event listeners
     */
    attachEventListeners() {
        // Fechar modal
        document.getElementById('hierarchyModalClose')?.addEventListener('click', () => this.close());
        document.getElementById('hierarchyCancelBtn')?.addEventListener('click', () => this.close());
        
        // Fechar ao clicar fora
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });
        
        // Aplicar filtro
        document.getElementById('hierarchyApplyBtn')?.addEventListener('click', () => this.apply());
        
        // Limpar seleção
        document.getElementById('hierarchyClearBtn')?.addEventListener('click', () => this.clearSelection());
        
        // Busca por coluna
        this.modal?.querySelectorAll('.hierarchy-search-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const level = e.target.dataset.level;
                this.searchTerms[level] = e.target.value.toLowerCase().trim();
                this.renderColumn(
                    level,
                    this.getDataForLevel(level),
                    this.getSelectedSetForLevel(level)
                );
            });
        });
        
        // Botões de selecionar todos/nenhum
        this.modal?.querySelectorAll('.hierarchy-select-all, .hierarchy-select-none').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = btn.dataset.level;
                const action = btn.dataset.action;
                this.handleBulkAction(level, action);
            });
        });
    }
    
    /**
     * Retorna os dados para um nível específico
     */
    getDataForLevel(level) {
        switch (level) {
            case 'subsecretaria': return this.data.subsecretarias;
            case 'superintendencia': return this.data.superintendencias;
            case 'lotacao': return this.data.lotacoes;
            default: return [];
        }
    }
    
    /**
     * Retorna o Set de selecionados para um nível
     */
    getSelectedSetForLevel(level) {
        switch (level) {
            case 'subsecretaria': return this.selected.subsecretarias;
            case 'superintendencia': return this.selected.superintendencias;
            case 'lotacao': return this.selected.lotacoes;
            default: return new Set();
        }
    }
    
    /**
     * Abre o modal
     */
    open(initialSelection = null) {
        if (initialSelection) {
            this.selected.subsecretarias = new Set(initialSelection.subsecretarias || []);
            this.selected.superintendencias = new Set(initialSelection.superintendencias || []);
            this.selected.lotacoes = new Set(initialSelection.lotacoes || []);
        }
        
        // Limpar buscas
        this.searchTerms = { subsecretaria: '', superintendencia: '', lotacao: '' };
        this.modal.querySelectorAll('.hierarchy-search-input').forEach(input => {
            input.value = '';
        });
        
        this.renderAllColumns();
        this.updateSummary();
        this.modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Fecha o modal
     */
    close() {
        this.modal.classList.remove('open');
        document.body.style.overflow = '';
        
        // Limpar buscas
        this.searchTerms = { subsecretaria: '', superintendencia: '', lotacao: '' };
        this.modal.querySelectorAll('.hierarchy-search-input').forEach(input => {
            input.value = '';
        });
        
        this.onClose();
    }
    
    /**
     * Verifica se modal está aberto
     */
    isOpen() {
        return this.modal?.classList.contains('open');
    }
    
    /**
     * Aplica o filtro
     */
    apply() {
        const result = {
            subsecretarias: Array.from(this.selected.subsecretarias),
            superintendencias: Array.from(this.selected.superintendencias),
            lotacoes: Array.from(this.selected.lotacoes)
        };
        
        this.onApply(result);
        // O fechamento é feito pelo handler (handleHierarchyFilterApply)
    }
    
    /**
     * Limpa toda a seleção
     */
    clearSelection() {
        this.selected.subsecretarias.clear();
        this.selected.superintendencias.clear();
        this.selected.lotacoes.clear();
        this.renderAllColumns();
        this.updateSummary();
    }
    
    /**
     * Renderiza todas as colunas
     */
    renderAllColumns() {
        this.renderColumn('subsecretaria', this.data.subsecretarias, this.selected.subsecretarias);
        this.renderColumn('superintendencia', this.data.superintendencias, this.selected.superintendencias);
        this.renderColumn('lotacao', this.data.lotacoes, this.selected.lotacoes);
        this.updateCounts();
    }
    
    /**
     * Renderiza uma coluna específica
     */
    renderColumn(level, items, selectedSet) {
        const listEl = document.getElementById(`list${this.capitalize(level)}`);
        if (!listEl) return;
        
        // Filtrar por busca específica da coluna
        const searchTerm = this.searchTerms[level] || '';
        let filteredItems = items;
        if (searchTerm) {
            filteredItems = items.filter(item => {
                const searchIn = `${item.name} ${item.subsecretaria || ''} ${item.superintendencia || ''}`.toLowerCase();
                return searchIn.includes(searchTerm);
            });
        }
        
        // Separar selecionados e não selecionados
        const selected = filteredItems.filter(item => selectedSet.has(item.name));
        const notSelected = filteredItems.filter(item => !selectedSet.has(item.name));
        
        let html = '';
        
        // Renderizar selecionados primeiro
        if (selected.length > 0) {
            selected.forEach(item => {
                html += this.renderItem(item, level, true);
            });
            
            // Separador se houver não selecionados
            if (notSelected.length > 0) {
                html += '<div class="hierarchy-separator"></div>';
            }
        }
        
        // Renderizar não selecionados
        notSelected.forEach(item => {
            html += this.renderItem(item, level, false);
        });
        
        // Mensagem se vazio
        if (filteredItems.length === 0) {
            html = `
                <div class="hierarchy-empty">
                    <i class="bi bi-search"></i>
                    <span>Nenhum resultado para "${searchTerm}"</span>
                </div>
            `;
        }
        
        listEl.innerHTML = html;
        
        // Anexar listeners aos checkboxes
        listEl.querySelectorAll('.hierarchy-item').forEach(itemEl => {
            itemEl.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = itemEl.querySelector('input[type="checkbox"]');
                    if (checkbox) checkbox.click();
                }
            });
            
            const checkbox = itemEl.querySelector('input[type="checkbox"]');
            checkbox?.addEventListener('change', (e) => {
                this.handleItemToggle(level, e.target.value, e.target.checked);
            });
        });
        
        // Atualizar contador
        this.updateCounts();
    }
    
    /**
     * Renderiza um item da lista
     */
    renderItem(item, level, isSelected) {
        const path = this.getItemPath(item, level);
        const highlightClass = isSelected ? 'hierarchy-item-selected' : '';
        const sigla = this.extractSigla(item.name);
        
        return `
            <div class="hierarchy-item ${highlightClass}" data-name="${item.name}">
                <label>
                    <input type="checkbox" 
                           value="${item.name}" 
                           ${isSelected ? 'checked' : ''}>
                    <span class="hierarchy-item-checkbox"></span>
                    <span class="hierarchy-item-content">
                        <span class="hierarchy-item-name" title="${item.name}">
                            ${sigla ? `<strong>${sigla}</strong> - ${item.name.replace(/^[A-Z0-9/]+\s*-\s*/, '')}` : item.name}
                        </span>
                        ${path ? `<span class="hierarchy-item-path">${path}</span>` : ''}
                    </span>
                </label>
            </div>
        `;
    }
    
    /**
     * Extrai sigla do nome
     */
    extractSigla(name) {
        const match = name.match(/^([A-Z0-9/]+)\s*-/);
        return match ? match[1].trim() : null;
    }
    
    /**
     * Obtém o path hierárquico de um item
     */
    getItemPath(item, level) {
        if (level === 'subsecretaria') {
            return null; // Subsecretaria não tem path
        }
        
        if (level === 'superintendencia') {
            if (item.subsecretaria) {
                const sigla = this.extractSigla(item.subsecretaria);
                return sigla || item.subsecretaria.substring(0, 15);
            }
            return null;
        }
        
        if (level === 'lotacao') {
            const parts = [];
            if (item.subsecretaria) {
                parts.push(this.extractSigla(item.subsecretaria) || item.subsecretaria.substring(0, 10));
            }
            if (item.superintendencia) {
                parts.push(this.extractSigla(item.superintendencia) || item.superintendencia.substring(0, 10));
            }
            return parts.length > 0 ? parts.join(' › ') : null;
        }
        
        return null;
    }
    
    /**
     * Capitaliza primeira letra
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Manipula toggle de item
     */
    handleItemToggle(level, itemName, isChecked) {
        if (isChecked) {
            this.selectItem(level, itemName);
        } else {
            this.deselectItem(level, itemName);
        }
        
        this.renderAllColumns();
        this.updateSummary();
    }
    
    /**
     * Seleciona um item e seus filhos (cascata)
     */
    selectItem(level, itemName) {
        if (level === 'subsecretaria') {
            this.selected.subsecretarias.add(itemName);
            
            // Auto-selecionar superintendências desta subsecretaria
            const supers = this.data.superintendencias.filter(s => 
                s.subsecretaria && s.subsecretaria.toLowerCase() === itemName.toLowerCase()
            );
            supers.forEach(s => {
                this.selected.superintendencias.add(s.name);
                
                // Auto-selecionar gerências desta superintendência
                const gerencias = this.data.lotacoes.filter(g => 
                    g.superintendencia && g.superintendencia.toLowerCase() === s.name.toLowerCase()
                );
                gerencias.forEach(g => this.selected.lotacoes.add(g.name));
            });
            
        } else if (level === 'superintendencia') {
            this.selected.superintendencias.add(itemName);
            
            // Auto-selecionar gerências desta superintendência
            const gerencias = this.data.lotacoes.filter(g => 
                g.superintendencia && g.superintendencia.toLowerCase() === itemName.toLowerCase()
            );
            gerencias.forEach(g => this.selected.lotacoes.add(g.name));
            
        } else if (level === 'lotacao') {
            this.selected.lotacoes.add(itemName);
        }
    }
    
    /**
     * Desseleciona um item e seus filhos (cascata)
     */
    deselectItem(level, itemName) {
        if (level === 'subsecretaria') {
            this.selected.subsecretarias.delete(itemName);
            
            // Auto-desselecionar superintendências desta subsecretaria
            const supers = this.data.superintendencias.filter(s => 
                s.subsecretaria && s.subsecretaria.toLowerCase() === itemName.toLowerCase()
            );
            supers.forEach(s => {
                this.selected.superintendencias.delete(s.name);
                
                // Auto-desselecionar gerências desta superintendência
                const gerencias = this.data.lotacoes.filter(g => 
                    g.superintendencia && g.superintendencia.toLowerCase() === s.name.toLowerCase()
                );
                gerencias.forEach(g => this.selected.lotacoes.delete(g.name));
            });
            
        } else if (level === 'superintendencia') {
            this.selected.superintendencias.delete(itemName);
            
            // Auto-desselecionar gerências desta superintendência
            const gerencias = this.data.lotacoes.filter(g => 
                g.superintendencia && g.superintendencia.toLowerCase() === itemName.toLowerCase()
            );
            gerencias.forEach(g => this.selected.lotacoes.delete(g.name));
            
            // Verificar se deve desselecionar a subsecretaria pai
            const item = this.data.superintendencias.find(s => s.name === itemName);
            if (item?.subsecretaria) {
                const siblingSupers = this.data.superintendencias.filter(s => 
                    s.subsecretaria === item.subsecretaria && s.name !== itemName
                );
                const anySelected = siblingSupers.some(s => this.selected.superintendencias.has(s.name));
                if (!anySelected) {
                    this.selected.subsecretarias.delete(item.subsecretaria);
                }
            }
            
        } else if (level === 'lotacao') {
            this.selected.lotacoes.delete(itemName);
            
            // Verificar se deve desselecionar a superintendência pai
            const item = this.data.lotacoes.find(l => l.name === itemName);
            if (item?.superintendencia) {
                const siblingGerencias = this.data.lotacoes.filter(g => 
                    g.superintendencia === item.superintendencia && g.name !== itemName
                );
                const anySelected = siblingGerencias.some(g => this.selected.lotacoes.has(g.name));
                if (!anySelected) {
                    this.selected.superintendencias.delete(item.superintendencia);
                    
                    // Verificar subsecretaria também
                    const superItem = this.data.superintendencias.find(s => s.name === item.superintendencia);
                    if (superItem?.subsecretaria) {
                        const siblingSupers = this.data.superintendencias.filter(s => 
                            s.subsecretaria === superItem.subsecretaria
                        );
                        const anySupSelected = siblingSupers.some(s => this.selected.superintendencias.has(s.name));
                        if (!anySupSelected) {
                            this.selected.subsecretarias.delete(superItem.subsecretaria);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Manipula ação em massa (todos/nenhum)
     */
    handleBulkAction(level, action) {
        const items = level === 'subsecretaria' ? this.data.subsecretarias :
                      level === 'superintendencia' ? this.data.superintendencias :
                      this.data.lotacoes;
        
        // Se há busca ativa na coluna, aplicar apenas aos filtrados
        const searchTerm = this.searchTerms[level] || '';
        let targetItems = items;
        if (searchTerm) {
            targetItems = items.filter(item => {
                const searchIn = `${item.name} ${item.subsecretaria || ''} ${item.superintendencia || ''}`.toLowerCase();
                return searchIn.includes(searchTerm);
            });
        }
        
        if (action === 'all') {
            targetItems.forEach(item => this.selectItem(level, item.name));
        } else {
            targetItems.forEach(item => this.deselectItem(level, item.name));
        }
        
        this.renderAllColumns();
        this.updateSummary();
    }
    
    /**
     * Atualiza contadores das colunas
     */
    updateCounts() {
        document.getElementById('countSubsecretaria').textContent = this.selected.subsecretarias.size;
        document.getElementById('countSuperintendencia').textContent = this.selected.superintendencias.size;
        document.getElementById('countLotacao').textContent = this.selected.lotacoes.size;
    }
    
    /**
     * Atualiza o resumo da seleção
     */
    updateSummary() {
        const summaryEl = document.getElementById('hierarchySelectionSummary');
        if (!summaryEl) return;
        
        const total = this.selected.subsecretarias.size + 
                      this.selected.superintendencias.size + 
                      this.selected.lotacoes.size;
        
        if (total === 0) {
            summaryEl.innerHTML = '<i class="bi bi-info-circle"></i> Nenhum filtro selecionado - todos os servidores serão exibidos';
            summaryEl.className = 'hierarchy-selection-summary empty';
        } else {
            const parts = [];
            if (this.selected.subsecretarias.size > 0) {
                parts.push(`${this.selected.subsecretarias.size} subsec.`);
            }
            if (this.selected.superintendencias.size > 0) {
                parts.push(`${this.selected.superintendencias.size} superint.`);
            }
            if (this.selected.lotacoes.size > 0) {
                parts.push(`${this.selected.lotacoes.size} lotações`);
            }
            
            summaryEl.innerHTML = `<i class="bi bi-funnel-fill"></i> Selecionados: ${parts.join(', ')}`;
            summaryEl.className = 'hierarchy-selection-summary active';
        }
    }
    
    /**
     * Define seleção programaticamente
     */
    setSelection(selection) {
        this.selected.subsecretarias = new Set(selection.subsecretarias || []);
        this.selected.superintendencias = new Set(selection.superintendencias || []);
        this.selected.lotacoes = new Set(selection.lotacoes || []);
    }
    
    /**
     * Obtém seleção atual
     */
    getSelection() {
        return {
            subsecretarias: Array.from(this.selected.subsecretarias),
            superintendencias: Array.from(this.selected.superintendencias),
            lotacoes: Array.from(this.selected.lotacoes)
        };
    }
    
    /**
     * Verifica se há alguma seleção
     */
    hasSelection() {
        return this.selected.subsecretarias.size > 0 ||
               this.selected.superintendencias.size > 0 ||
               this.selected.lotacoes.size > 0;
    }
}

// Exportar para uso global
window.HierarchyFilterModal = HierarchyFilterModal;
