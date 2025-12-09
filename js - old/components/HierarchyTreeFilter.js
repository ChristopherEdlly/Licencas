/**
 * HierarchyTreeFilter.js
 * Componente visual de árvore para filtro hierárquico de lotações
 */

class HierarchyTreeFilter {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.options = {
            multiSelect: options.multiSelect ?? true,
            showCounts: options.showCounts ?? true,
            expandAll: options.expandAll ?? false,
            searchable: options.searchable ?? true,
            showBreadcrumbs: options.showBreadcrumbs ?? true,
            maxHeight: options.maxHeight ?? '400px',
            onChange: options.onChange ?? (() => {}),
            servidores: options.servidores ?? []
        };

        this.hierarchyManager = new LotacaoHierarchyManager();
        this.selectedItems = new Set();
        this.expandedNodes = new Set();
        this.treeData = [];
        this.filteredTreeData = [];
        this.searchQuery = '';

        this.init();
    }

    /**
     * Inicializa o componente
     */
    init() {
        if (!this.container) {
            console.error('HierarchyTreeFilter: Container não encontrado');
            return;
        }

        this.treeData = this.hierarchyManager.generateTreeStructure(this.options.servidores);
        this.filteredTreeData = this.treeData;
        this.render();
        this.setupEventListeners();
    }

    /**
     * Renderiza o componente
     */
    render() {
        this.container.innerHTML = `
            <div class="hierarchy-tree-filter">
                ${this.options.searchable ? this.renderSearchBar() : ''}
                ${this.options.showBreadcrumbs ? this.renderBreadcrumbs() : ''}
                <div class="hierarchy-tree-actions">
                    <button type="button" class="btn-tree-action" data-action="expand-all" title="Expandir todos">
                        <i class="bi bi-arrows-expand"></i>
                        <span>Expandir</span>
                    </button>
                    <button type="button" class="btn-tree-action" data-action="collapse-all" title="Recolher todos">
                        <i class="bi bi-arrows-collapse"></i>
                        <span>Recolher</span>
                    </button>
                    <button type="button" class="btn-tree-action" data-action="clear-selection" title="Limpar seleção">
                        <i class="bi bi-x-circle"></i>
                        <span>Limpar</span>
                    </button>
                </div>
                <div class="hierarchy-tree-container" style="max-height: ${this.options.maxHeight}">
                    ${this.renderTree(this.filteredTreeData)}
                </div>
                <div class="hierarchy-tree-footer">
                    <span class="selection-count">
                        <strong>${this.selectedItems.size}</strong> ${this.selectedItems.size === 1 ? 'item selecionado' : 'itens selecionados'}
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza barra de busca
     */
    renderSearchBar() {
        return `
            <div class="hierarchy-search">
                <i class="bi bi-search"></i>
                <input type="text" 
                    class="hierarchy-search-input" 
                    placeholder="Buscar na hierarquia..."
                    value="${this.searchQuery}">
                <button type="button" class="btn-clear-search" style="display: ${this.searchQuery ? 'flex' : 'none'}">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
    }

    /**
     * Renderiza breadcrumbs dos itens selecionados
     */
    renderBreadcrumbs() {
        if (this.selectedItems.size === 0) {
            return '<div class="hierarchy-breadcrumbs empty">Nenhuma lotação selecionada</div>';
        }

        const chips = Array.from(this.selectedItems).map(id => {
            const node = this.findNodeById(id);
            if (!node) return '';
            
            return `
                <span class="hierarchy-chip" data-id="${id}">
                    <span class="chip-text">${node.shortName}</span>
                    <button type="button" class="chip-remove" data-id="${id}">
                        <i class="bi bi-x"></i>
                    </button>
                </span>
            `;
        }).join('');

        return `<div class="hierarchy-breadcrumbs">${chips}</div>`;
    }

    /**
     * Renderiza árvore
     */
    renderTree(nodes, level = 0) {
        if (!nodes || nodes.length === 0) {
            return '<div class="hierarchy-empty">Nenhum item encontrado</div>';
        }

        return `
            <ul class="hierarchy-tree-list" data-level="${level}">
                ${nodes.map(node => this.renderNode(node, level)).join('')}
            </ul>
        `;
    }

    /**
     * Renderiza nó da árvore
     */
    renderNode(node, level) {
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = this.expandedNodes.has(node.id);
        const isSelected = this.selectedItems.has(node.id);
        const isPartiallySelected = this.isPartiallySelected(node);

        const levelIcons = {
            0: 'bi-building',
            1: 'bi-diagram-3',
            2: 'bi-diagram-2',
            3: 'bi-geo-alt'
        };

        const levelClasses = {
            0: 'level-secretaria',
            1: 'level-subsecretaria',
            2: 'level-superintendencia',
            3: 'level-gerencia'
        };

        return `
            <li class="hierarchy-tree-item ${levelClasses[level] || ''}" data-id="${node.id}" data-level="${level}">
                <div class="hierarchy-tree-node ${isSelected ? 'selected' : ''} ${isPartiallySelected ? 'partial' : ''}">
                    ${hasChildren ? `
                        <button type="button" class="btn-expand ${isExpanded ? 'expanded' : ''}" data-id="${node.id}">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    ` : '<span class="expand-placeholder"></span>'}
                    
                    <label class="hierarchy-checkbox">
                        <input type="checkbox" 
                            ${isSelected ? 'checked' : ''} 
                            ${isPartiallySelected ? 'data-indeterminate="true"' : ''}
                            data-id="${node.id}">
                        <span class="checkmark"></span>
                    </label>
                    
                    <i class="bi ${levelIcons[level] || 'bi-folder'} node-icon"></i>
                    
                    <span class="node-name" title="${node.name}">
                        <span class="node-short-name">${node.shortName}</span>
                        ${level > 0 ? `<span class="node-full-name">${this.getNodeDescription(node)}</span>` : ''}
                    </span>
                    
                    ${this.options.showCounts && node.count > 0 ? `
                        <span class="node-count" title="${node.count} servidor(es)">${node.count}</span>
                    ` : ''}
                </div>
                
                ${hasChildren ? `
                    <div class="hierarchy-children ${isExpanded ? 'expanded' : ''}">
                        ${this.renderTree(node.children, level + 1)}
                    </div>
                ` : ''}
            </li>
        `;
    }

    /**
     * Obtém descrição do nó (parte após o " - ")
     */
    getNodeDescription(node) {
        const match = node.name.match(/^[A-Z0-9/]+\s*-\s*(.+)$/);
        return match ? match[1] : '';
    }

    /**
     * Verifica se nó está parcialmente selecionado
     */
    isPartiallySelected(node) {
        if (!node.children || node.children.length === 0) return false;
        
        const selectedChildren = node.children.filter(child => 
            this.selectedItems.has(child.id) || this.isPartiallySelected(child)
        );
        
        return selectedChildren.length > 0 && selectedChildren.length < node.children.length;
    }

    /**
     * Encontra nó por ID
     */
    findNodeById(id, nodes = this.treeData) {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = this.findNodeById(id, node.children);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Busca
        const searchInput = this.container.querySelector('.hierarchy-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Limpar busca
        const clearSearchBtn = this.container.querySelector('.hierarchy-search .btn-clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.handleSearch('');
                searchInput.value = '';
            });
        }

        // Delegação de eventos na árvore
        const treeContainer = this.container.querySelector('.hierarchy-tree-container');
        if (treeContainer) {
            treeContainer.addEventListener('click', (e) => {
                // Expandir/recolher
                const expandBtn = e.target.closest('.btn-expand');
                if (expandBtn) {
                    this.toggleExpand(expandBtn.dataset.id);
                    return;
                }

                // Checkbox
                const checkbox = e.target.closest('.hierarchy-checkbox input');
                if (checkbox) {
                    this.handleSelection(checkbox.dataset.id, checkbox.checked);
                    return;
                }

                // Click no nó (toggle seleção)
                const nodeEl = e.target.closest('.hierarchy-tree-node');
                if (nodeEl && !e.target.closest('.btn-expand') && !e.target.closest('.hierarchy-checkbox')) {
                    const item = nodeEl.closest('.hierarchy-tree-item');
                    if (item) {
                        const id = item.dataset.id;
                        this.handleSelection(id, !this.selectedItems.has(id));
                    }
                }
            });
        }

        // Ações da barra de ferramentas
        const actionsContainer = this.container.querySelector('.hierarchy-tree-actions');
        if (actionsContainer) {
            actionsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-tree-action');
                if (!btn) return;

                const action = btn.dataset.action;
                switch (action) {
                    case 'expand-all':
                        this.expandAll();
                        break;
                    case 'collapse-all':
                        this.collapseAll();
                        break;
                    case 'clear-selection':
                        this.clearSelection();
                        break;
                }
            });
        }

        // Remover chip
        const breadcrumbsContainer = this.container.querySelector('.hierarchy-breadcrumbs');
        if (breadcrumbsContainer) {
            breadcrumbsContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.chip-remove');
                if (removeBtn) {
                    this.handleSelection(removeBtn.dataset.id, false);
                }
            });
        }
    }

    /**
     * Manipula busca
     */
    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        const clearBtn = this.container.querySelector('.hierarchy-search .btn-clear-search');
        if (clearBtn) {
            clearBtn.style.display = this.searchQuery ? 'flex' : 'none';
        }

        if (!this.searchQuery) {
            this.filteredTreeData = this.treeData;
        } else {
            this.filteredTreeData = this.filterTreeBySearch(this.treeData, this.searchQuery);
            // Expandir nós com resultados
            this.expandMatchingNodes(this.filteredTreeData);
        }

        this.updateTree();
    }

    /**
     * Filtra árvore por busca
     */
    filterTreeBySearch(nodes, query) {
        return nodes
            .map(node => {
                const matches = node.name.toLowerCase().includes(query) ||
                               node.shortName.toLowerCase().includes(query);
                
                const filteredChildren = node.children 
                    ? this.filterTreeBySearch(node.children, query)
                    : [];
                
                if (matches || filteredChildren.length > 0) {
                    return {
                        ...node,
                        children: filteredChildren.length > 0 ? filteredChildren : node.children
                    };
                }
                return null;
            })
            .filter(Boolean);
    }

    /**
     * Expande nós correspondentes à busca
     */
    expandMatchingNodes(nodes) {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                this.expandedNodes.add(node.id);
                this.expandMatchingNodes(node.children);
            }
        });
    }

    /**
     * Atualiza renderização da árvore
     */
    updateTree() {
        const treeContainer = this.container.querySelector('.hierarchy-tree-container');
        if (treeContainer) {
            treeContainer.innerHTML = this.renderTree(this.filteredTreeData);
            this.updateIndeterminateState();
        }

        // Atualizar breadcrumbs
        const breadcrumbsContainer = this.container.querySelector('.hierarchy-breadcrumbs');
        if (breadcrumbsContainer) {
            breadcrumbsContainer.outerHTML = this.renderBreadcrumbs();
            // Re-attach event listener
            const newBreadcrumbs = this.container.querySelector('.hierarchy-breadcrumbs');
            if (newBreadcrumbs) {
                newBreadcrumbs.addEventListener('click', (e) => {
                    const removeBtn = e.target.closest('.chip-remove');
                    if (removeBtn) {
                        this.handleSelection(removeBtn.dataset.id, false);
                    }
                });
            }
        }

        // Atualizar contador
        const countEl = this.container.querySelector('.selection-count');
        if (countEl) {
            countEl.innerHTML = `<strong>${this.selectedItems.size}</strong> ${this.selectedItems.size === 1 ? 'item selecionado' : 'itens selecionados'}`;
        }
    }

    /**
     * Atualiza estado indeterminado dos checkboxes
     */
    updateIndeterminateState() {
        this.container.querySelectorAll('.hierarchy-checkbox input[data-indeterminate="true"]').forEach(cb => {
            cb.indeterminate = true;
        });
    }

    /**
     * Alterna expansão de nó
     */
    toggleExpand(nodeId) {
        if (this.expandedNodes.has(nodeId)) {
            this.expandedNodes.delete(nodeId);
        } else {
            this.expandedNodes.add(nodeId);
        }
        this.updateTree();
    }

    /**
     * Expande todos os nós
     */
    expandAll() {
        const collectIds = (nodes) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    this.expandedNodes.add(node.id);
                    collectIds(node.children);
                }
            });
        };
        collectIds(this.filteredTreeData);
        this.updateTree();
    }

    /**
     * Recolhe todos os nós
     */
    collapseAll() {
        this.expandedNodes.clear();
        this.updateTree();
    }

    /**
     * Manipula seleção
     */
    handleSelection(nodeId, selected) {
        const node = this.findNodeById(nodeId);
        if (!node) return;

        if (selected) {
            this.selectedItems.add(nodeId);
            // Selecionar filhos também
            if (node.children) {
                this.selectChildren(node.children);
            }
        } else {
            this.selectedItems.delete(nodeId);
            // Desselecionar filhos também
            if (node.children) {
                this.deselectChildren(node.children);
            }
        }

        this.updateTree();
        this.notifyChange();
    }

    /**
     * Seleciona filhos recursivamente
     */
    selectChildren(children) {
        children.forEach(child => {
            this.selectedItems.add(child.id);
            if (child.children) {
                this.selectChildren(child.children);
            }
        });
    }

    /**
     * Desseleciona filhos recursivamente
     */
    deselectChildren(children) {
        children.forEach(child => {
            this.selectedItems.delete(child.id);
            if (child.children) {
                this.deselectChildren(child.children);
            }
        });
    }

    /**
     * Limpa seleção
     */
    clearSelection() {
        this.selectedItems.clear();
        this.updateTree();
        this.notifyChange();
    }

    /**
     * Notifica mudança
     */
    notifyChange() {
        const selectedNodes = Array.from(this.selectedItems)
            .map(id => this.findNodeById(id))
            .filter(Boolean);

        this.options.onChange({
            selectedIds: Array.from(this.selectedItems),
            selectedNodes: selectedNodes,
            selectedNames: selectedNodes.map(n => n.name),
            count: this.selectedItems.size
        });
    }

    /**
     * Obtém itens selecionados
     */
    getSelected() {
        return Array.from(this.selectedItems)
            .map(id => this.findNodeById(id))
            .filter(Boolean);
    }

    /**
     * Define itens selecionados
     */
    setSelected(ids) {
        this.selectedItems = new Set(ids);
        this.updateTree();
    }

    /**
     * Atualiza dados de servidores
     */
    updateServidores(servidores) {
        this.options.servidores = servidores;
        this.treeData = this.hierarchyManager.generateTreeStructure(servidores);
        this.filteredTreeData = this.searchQuery 
            ? this.filterTreeBySearch(this.treeData, this.searchQuery)
            : this.treeData;
        this.updateTree();
    }

    /**
     * Destrói o componente
     */
    destroy() {
        this.container.innerHTML = '';
        this.selectedItems.clear();
        this.expandedNodes.clear();
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.HierarchyTreeFilter = HierarchyTreeFilter;
}
