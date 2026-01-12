/* Migrated from js - old/components/HierarchyFilterModal.js */
class HierarchyFilterModal {
    constructor(options = {}) {
        // CRÍTICO: Usar o gerenciador global que já tem HierarchyService inicializado
        this.hierarchyManager = window.lotacaoHierarchyManager;

        if (!this.hierarchyManager) {
            console.error('❌ [HierarchyFilterModal] LotacaoHierarchyManager global não encontrado!');
            console.error('   Certifique-se de que window.lotacaoHierarchyManager foi inicializado em App.js');
        }

        this.onApply = options.onApply || (() => {});
        this.onClose = options.onClose || (() => {});
        this.selected = {
            subsecretarias: new Set(),
            superintendencias: new Set(),
            lotacoes: new Set()
        };
        this.data = { subsecretarias: [], superintendencias: [], lotacoes: [] };
        this.modal = null;
        this.searchTerms = { subsecretaria: '', superintendencia: '', lotacao: '' };
        this.init();
    }

    init() {
        this.loadData();
        this.createModal();
        this.attachEventListeners();
    }

    loadData() {
        if (!this.hierarchyManager) {
            console.error('❌ [HierarchyFilterModal] Não é possível carregar dados - hierarchyManager não disponível');
            this.data.subsecretarias = [];
            this.data.superintendencias = [];
            this.data.lotacoes = [];
            return;
        }

        // Verificar se a hierarquia foi carregada
        if (!this.hierarchyManager.loaded) {
            console.warn('⚠️ [HierarchyFilterModal] Hierarquia ainda não carregada do SharePoint');
            this.data.subsecretarias = [];
            this.data.superintendencias = [];
            this.data.lotacoes = [];
            return;
        }

        // Carregar dados da hierarquia do SharePoint
        this.data.subsecretarias = this.hierarchyManager.getSubsecretarias();
        this.data.superintendencias = this.hierarchyManager.getSuperintendencias();
        this.data.lotacoes = this.hierarchyManager.getGerencias();

        // MELHORIA: Adicionar lotações dos dados que não estão na hierarquia
        // Isso garante que TODAS as lotações presentes nos dados apareçam no filtro
        if (window.app?.dataStateManager?.getAllServidores || window.app?.allServidores) {
            const allServidores = window.app?.dataStateManager?.getAllServidores?.() || window.app?.allServidores || [];

            // Extrair lotações únicas dos servidores
            const lotacoesDosDados = new Set();
            allServidores.forEach(servidor => {
                const lotacao = servidor.lotacao || servidor.Lotacao || servidor.LOTACAO ||
                               servidor.lotação || servidor.Lotação || servidor.LOTAÇÃO ||
                               servidor.unidade || servidor.Unidade || null;
                if (lotacao && lotacao !== 'nan') {
                    lotacoesDosDados.add(String(lotacao).trim());
                }
            });

            // Adicionar lotações que não estão na hierarquia
            const lotacoesNaHierarquia = new Set(this.data.lotacoes.map(l => l.name));
            lotacoesDosDados.forEach(lotacao => {
                if (!lotacoesNaHierarquia.has(lotacao)) {
                    // Tentar buscar informações hierárquicas
                    const info = this.hierarchyManager.findLotacao(lotacao);
                    this.data.lotacoes.push({
                        name: lotacao,
                        code: info?.code || null,
                        subsecretaria: info?.subsecretaria || null,
                        superintendencia: info?.superintendencia || null
                    });
                }
            });

            console.log(`[HierarchyFilterModal] Lotações adicionadas dos dados: ${lotacoesDosDados.size - lotacoesNaHierarquia.size}`);
        }

        console.log(`[HierarchyFilterModal] Dados carregados:`, {
            subsecretarias: this.data.subsecretarias.length,
            superintendencias: this.data.superintendencias.length,
            lotacoes: this.data.lotacoes.length
        });
    }

    createModal() {
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
                                    <input type="text" class="hierarchy-search-input" data-level="subsecretaria" placeholder="Buscar..." autocomplete="off">
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
                                    <input type="text" class="hierarchy-search-input" data-level="superintendencia" placeholder="Buscar..." autocomplete="off">
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
                                    <input type="text" class="hierarchy-search-input" data-level="lotacao" placeholder="Buscar..." autocomplete="off">
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
                        <div class="hierarchy-selection-summary" id="hierarchySelectionSummary">Nenhum filtro selecionado</div>
                        <div class="hierarchy-modal-buttons">
                            <button class="btn-hierarchy-clear" id="hierarchyClearBtn"><i class="bi bi-eraser"></i> Limpar</button>
                            <button class="btn-hierarchy-cancel" id="hierarchyCancelBtn">Cancelar</button>
                            <button class="btn-hierarchy-apply" id="hierarchyApplyBtn"><i class="bi bi-check-lg"></i> Aplicar Filtro</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById('hierarchyFilterModal');
    }

    attachEventListeners() {
        document.getElementById('hierarchyModalClose')?.addEventListener('click', () => this.close());
        document.getElementById('hierarchyCancelBtn')?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) this.close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen()) this.close(); });
        document.getElementById('hierarchyApplyBtn')?.addEventListener('click', () => this.apply());
        document.getElementById('hierarchyClearBtn')?.addEventListener('click', () => this.clearSelection());
        this.modal?.querySelectorAll('.hierarchy-search-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const level = e.target.dataset.level;
                this.searchTerms[level] = e.target.value.toLowerCase().trim();
                this.renderColumn(level, this.getDataForLevel(level), this.getSelectedSetForLevel(level));
            });
        });
        this.modal?.querySelectorAll('.hierarchy-select-all, .hierarchy-select-none').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const level = btn.dataset.level;
                const action = btn.dataset.action;
                this.handleBulkAction(level, action);
            });
        });
    }

    getDataForLevel(level) {
        switch (level) {
            case 'subsecretaria': return this.data.subsecretarias;
            case 'superintendencia': return this.data.superintendencias;
            case 'lotacao': return this.data.lotacoes;
            default: return [];
        }
    }

    getSelectedSetForLevel(level) {
        switch (level) {
            case 'subsecretaria': return this.selected.subsecretarias;
            case 'superintendencia': return this.selected.superintendencias;
            case 'lotacao': return this.selected.lotacoes;
            default: return new Set();
        }
    }

    open(initialSelection = null) {
        // Recarregar dados ao abrir (garante dados atualizados do SharePoint)
        this.loadData();

        // Se ainda não tiver dados, mostrar erro
        if (this.data.subsecretarias.length === 0 &&
            this.data.superintendencias.length === 0 &&
            this.data.lotacoes.length === 0) {
            console.error('❌ [HierarchyFilterModal] Impossível abrir modal - hierarquia não carregada');

            if (window.app?.notificationService) {
                window.app.notificationService.error(
                    'Hierarquia não disponível',
                    'Aguarde o carregamento dos dados do SharePoint ou verifique sua conexão.'
                );
            } else {
                alert('Erro: A hierarquia de lotações ainda não foi carregada do SharePoint. Por favor, aguarde alguns segundos e tente novamente.');
            }
            return;
        }

        if (initialSelection) {
            this.selected.subsecretarias = new Set(initialSelection.subsecretarias || []);
            this.selected.superintendencias = new Set(initialSelection.superintendencias || []);
            this.selected.lotacoes = new Set(initialSelection.lotacoes || []);
        }
        this.searchTerms = { subsecretaria: '', superintendencia: '', lotacao: '' };
        this.modal.querySelectorAll('.hierarchy-search-input').forEach(input => { input.value = ''; });
        this.renderAllColumns();
        this.updateSummary();
        this.modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.modal.classList.remove('open');
        document.body.style.overflow = '';
        this.searchTerms = { subsecretaria: '', superintendencia: '', lotacao: '' };
        this.modal.querySelectorAll('.hierarchy-search-input').forEach(input => { input.value = ''; });
        this.onClose();
    }

    isOpen() { return this.modal?.classList.contains('open'); }

    apply() {
        const result = {
            subsecretarias: Array.from(this.selected.subsecretarias),
            superintendencias: Array.from(this.selected.superintendencias),
            lotacoes: Array.from(this.selected.lotacoes)
        };
        this.onApply(result);
    }

    clearSelection() {
        this.selected.subsecretarias.clear();
        this.selected.superintendencias.clear();
        this.selected.lotacoes.clear();
        this.renderAllColumns();
        this.updateSummary();
    }

    renderAllColumns() {
        this.renderColumn('subsecretaria', this.data.subsecretarias, this.selected.subsecretarias);
        this.renderColumn('superintendencia', this.data.superintendencias, this.selected.superintendencias);
        this.renderColumn('lotacao', this.data.lotacoes, this.selected.lotacoes);
        this.updateCounts();
    }

    renderColumn(level, items, selectedSet) {
        const listEl = document.getElementById(`list${this.capitalize(level)}`);
        if (!listEl) return;
        const searchTerm = this.searchTerms[level] || '';
        let filteredItems = items;
        if (searchTerm) {
            filteredItems = items.filter(item => {
                // Buscar no nome completo, código/sigla, subsecretaria e superintendência
                const sigla = this.extractSigla(item.name) || '';
                const codigo = item.code || '';
                const searchIn = `${item.name} ${sigla} ${codigo} ${item.subsecretaria || ''} ${item.superintendencia || ''}`.toLowerCase();
                return searchIn.includes(searchTerm);
            });
        }
        const selected = filteredItems.filter(item => selectedSet.has(item.name));
        const notSelected = filteredItems.filter(item => !selectedSet.has(item.name));
        let html = '';
        if (selected.length > 0) {
            selected.forEach(item => { html += this.renderItem(item, level, true); });
            if (notSelected.length > 0) { html += '<div class="hierarchy-separator"></div>'; }
        }
        notSelected.forEach(item => { html += this.renderItem(item, level, false); });
        if (filteredItems.length === 0) {
            html = `
                <div class="hierarchy-empty">
                    <i class="bi bi-search"></i>
                    <span>Nenhum resultado para "${searchTerm}"</span>
                </div>
            `;
        }
        listEl.innerHTML = html;
        listEl.querySelectorAll('.hierarchy-item').forEach(itemEl => {
            itemEl.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = itemEl.querySelector('input[type="checkbox"]');
                    if (checkbox) checkbox.click();
                }
            });
            const checkbox = itemEl.querySelector('input[type="checkbox"]');
            checkbox?.addEventListener('change', (e) => { this.handleItemToggle(level, e.target.value, e.target.checked); });
        });
        this.updateCounts();
    }

    renderItem(item, level, isSelected) {
        const path = this.getItemPath(item, level);
        const highlightClass = isSelected ? 'hierarchy-item-selected' : '';
        const sigla = this.extractSigla(item.name);
        const cleanedName = this.cleanName(item.name);

        return `
            <div class="hierarchy-item ${highlightClass}" data-name="${item.name}">
                <label>
                    <input type="checkbox" value="${item.name}" ${isSelected ? 'checked' : ''}>
                    <span class="hierarchy-item-checkbox"></span>
                    <span class="hierarchy-item-content">
                        <span class="hierarchy-item-name" title="${item.name}">
                            ${sigla ? `<strong>${sigla}</strong> - ${cleanedName}` : cleanedName}
                        </span>
                        ${path ? `<span class="hierarchy-item-path">${path}</span>` : ''}
                    </span>
                </label>
            </div>
        `;
    }

    extractSigla(name) {
        if (!name) return null;
        try {
            const simple = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const match = simple.match(/^([A-Z0-9/]+)\s*-/i);
            return match ? match[1].trim() : null;
        } catch (e) {
            const match = String(name).match(/^([A-Z0-9/]+)\s*-/i);
            return match ? match[1].trim() : null;
        }
    }

    /**
     * Remove prefixos comuns (Subsecretaria de/da/do, Superintendência de/da/do, Gerência de/da/do)
     * e retorna apenas a parte significativa do nome
     */
    cleanName(name, tipo = null) {
        if (!name) return name;

        let cleaned = name;

        // Remove sigla inicial se existir (ex: "SUFIP - Superintendência..." → "Superintendência...")
        const withoutSigla = name.replace(/^[A-Z0-9/]+\s*-\s*/i, '');

        // Padrões a remover baseado no tipo
        const patterns = [
            /^Subsecretaria\s+(de|da|do)\s+/i,
            /^Superintendência\s+(de|da|do)\s+/i,
            /^Gerência\s+(de|da|do)\s+/i,
        ];

        cleaned = withoutSigla;
        for (const pattern of patterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        return cleaned.trim();
    }
    getItemPath(item, level) {
        if (level === 'subsecretaria') return null;

        if (level === 'superintendencia') {
            if (item.subsecretaria) {
                const sigla = this.extractSigla(item.subsecretaria);
                return sigla || this.cleanName(item.subsecretaria).substring(0, 20);
            }
            return null;
        }

        if (level === 'lotacao') {
            const parts = [];
            if (item.subsecretaria) {
                const sigla = this.extractSigla(item.subsecretaria);
                parts.push(sigla || this.cleanName(item.subsecretaria).substring(0, 15));
            }
            if (item.superintendencia) {
                const sigla = this.extractSigla(item.superintendencia);
                parts.push(sigla || this.cleanName(item.superintendencia).substring(0, 15));
            }
            return parts.length > 0 ? parts.join(' › ') : null;
        }

        return null;
    }

    capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

    handleItemToggle(level, itemName, isChecked) {
        if (isChecked) this.selectItem(level, itemName); else this.deselectItem(level, itemName);
        this.renderAllColumns();
        this.updateSummary();
    }

    selectItem(level, itemName) {
        if (level === 'subsecretaria') {
            this.selected.subsecretarias.add(itemName);
            const supers = this.data.superintendencias.filter(s => s.subsecretaria && s.subsecretaria.toLowerCase() === itemName.toLowerCase());
            supers.forEach(s => { this.selected.superintendencias.add(s.name); const gerencias = this.data.lotacoes.filter(g => g.superintendencia && g.superintendencia.toLowerCase() === s.name.toLowerCase()); gerencias.forEach(g => this.selected.lotacoes.add(g.name)); });
        } else if (level === 'superintendencia') {
            this.selected.superintendencias.add(itemName);
            const gerencias = this.data.lotacoes.filter(g => g.superintendencia && g.superintendencia.toLowerCase() === itemName.toLowerCase()); gerencias.forEach(g => this.selected.lotacoes.add(g.name));
        } else if (level === 'lotacao') {
            this.selected.lotacoes.add(itemName);
        }
    }

    deselectItem(level, itemName) {
        if (level === 'subsecretaria') {
            this.selected.subsecretarias.delete(itemName);
            const supers = this.data.superintendencias.filter(s => s.subsecretaria && s.subsecretaria.toLowerCase() === itemName.toLowerCase());
            supers.forEach(s => { this.selected.superintendencias.delete(s.name); const gerencias = this.data.lotacoes.filter(g => g.superintendencia && g.superintendencia.toLowerCase() === s.name.toLowerCase()); gerencias.forEach(g => this.selected.lotacoes.delete(g.name)); });
        } else if (level === 'superintendencia') {
            this.selected.superintendencias.delete(itemName);
            const gerencias = this.data.lotacoes.filter(g => g.superintendencia && g.superintendencia.toLowerCase() === itemName.toLowerCase()); gerencias.forEach(g => this.selected.lotacoes.delete(g.name));
            const item = this.data.superintendencias.find(s => s.name === itemName);
            if (item?.subsecretaria) {
                const siblingSupers = this.data.superintendencias.filter(s => s.subsecretaria === item.subsecretaria && s.name !== itemName);
                const anySelected = siblingSupers.some(s => this.selected.superintendencias.has(s.name));
                if (!anySelected) this.selected.subsecretarias.delete(item.subsecretaria);
            }
        } else if (level === 'lotacao') {
            this.selected.lotacoes.delete(itemName);
            const item = this.data.lotacoes.find(l => l.name === itemName);
            if (item?.superintendencia) {
                const siblingGerencias = this.data.lotacoes.filter(g => g.superintendencia === item.superintendencia && g.name !== itemName);
                const anySelected = siblingGerencias.some(g => this.selected.lotacoes.has(g.name));
                if (!anySelected) {
                    this.selected.superintendencias.delete(item.superintendencia);
                    const superItem = this.data.superintendencias.find(s => s.name === item.superintendencia);
                    if (superItem?.subsecretaria) {
                        const siblingSupers = this.data.superintendencias.filter(s => s.subsecretaria === superItem.subsecretaria);
                        const anySupSelected = siblingSupers.some(s => this.selected.superintendencias.has(s.name));
                        if (!anySupSelected) this.selected.subsecretarias.delete(superItem.subsecretaria);
                    }
                }
            }
        }
    }

    handleBulkAction(level, action) {
        const items = level === 'subsecretaria' ? this.data.subsecretarias : level === 'superintendencia' ? this.data.superintendencias : this.data.lotacoes;
        const searchTerm = this.searchTerms[level] || '';
        let targetItems = items;
        if (searchTerm) {
            targetItems = items.filter(item => { const searchIn = `${item.name} ${item.subsecretaria || ''} ${item.superintendencia || ''}`.toLowerCase(); return searchIn.includes(searchTerm); });
        }
        if (action === 'all') targetItems.forEach(item => this.selectItem(level, item.name)); else targetItems.forEach(item => this.deselectItem(level, item.name));
        this.renderAllColumns();
        this.updateSummary();
    }

    updateCounts() { document.getElementById('countSubsecretaria').textContent = this.selected.subsecretarias.size; document.getElementById('countSuperintendencia').textContent = this.selected.superintendencias.size; document.getElementById('countLotacao').textContent = this.selected.lotacoes.size; }

    updateSummary() {
        const summaryEl = document.getElementById('hierarchySelectionSummary');
        if (!summaryEl) return;
        const total = this.selected.subsecretarias.size + this.selected.superintendencias.size + this.selected.lotacoes.size;
        if (total === 0) { summaryEl.innerHTML = '<i class="bi bi-info-circle"></i> Nenhum filtro selecionado - todos os servidores serão exibidos'; summaryEl.className = 'hierarchy-selection-summary empty'; } else { const parts = []; if (this.selected.subsecretarias.size > 0) parts.push(`${this.selected.subsecretarias.size} subsec.`); if (this.selected.superintendencias.size > 0) parts.push(`${this.selected.superintendencias.size} superint.`); if (this.selected.lotacoes.size > 0) parts.push(`${this.selected.lotacoes.size} lotações`); summaryEl.innerHTML = `<i class="bi bi-funnel-fill"></i> Selecionados: ${parts.join(', ')}`; summaryEl.className = 'hierarchy-selection-summary active'; }
    }

    setSelection(selection) { this.selected.subsecretarias = new Set(selection.subsecretarias || []); this.selected.superintendencias = new Set(selection.superintendencias || []); this.selected.lotacoes = new Set(selection.lotacoes || []); }
    getSelection() { return { subsecretarias: Array.from(this.selected.subsecretarias), superintendencias: Array.from(this.selected.superintendencias), lotacoes: Array.from(this.selected.lotacoes) }; }
    hasSelection() { return this.selected.subsecretarias.size > 0 || this.selected.superintendencias.size > 0 || this.selected.lotacoes.size > 0; }
}

window.HierarchyFilterModal = HierarchyFilterModal;
