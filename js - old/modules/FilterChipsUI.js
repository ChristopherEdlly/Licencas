/**
 * FilterChipsUI.js
 * Gerencia a UI de chips/tags para filtros ativos
 * Renderiza chips visuais, contador de resultados e botões de ação
 */

class FilterChipsUI {
    constructor(filterManager, dashboard) {
        this.filterManager = filterManager;
        this.dashboard = dashboard;

        // Elementos DOM
        this.container = null;
        this.chipsList = null;
        this.counter = null;
        this.addFilterBtn = null;
        this.clearAllBtn = null;

        // Estado
        this.isVisible = false;

        this.init();
    }

    /**
     * Inicializa o componente
     */
    init() {
        // Buscar elementos DOM
        this.container = document.getElementById('filterChipsContainer');
        this.chipsList = document.getElementById('filterChipsList');
        this.counter = document.getElementById('resultsCounter');
        this.addFilterBtn = document.getElementById('addFilterBtn');
        this.clearAllBtn = document.getElementById('clearAllFiltersBtn');

        if (!this.container) {
            console.warn('Container de chips não encontrado');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Botão "Adicionar Filtro"
        if (this.addFilterBtn) {
            this.addFilterBtn.addEventListener('click', () => {
                this.openFiltersModal();
            });
        }

        // Botão "Limpar Todos"
        if (this.clearAllBtn) {
            this.clearAllBtn.addEventListener('click', () => {
                this.handleClearAll();
            });
        }
    }

    /**
     * Renderiza todos os chips baseado nos filtros ativos
     */
    render() {
        if (!this.chipsList) return;

        // Limpar chips existentes
        this.chipsList.innerHTML = '';

        // Obter lista de filtros ativos
        const activeFilters = this.filterManager.getActiveFiltersList();

        if (activeFilters.length === 0) {
            this.hide();
            return;
        }

        // Renderizar cada chip
        activeFilters.forEach(filter => {
            const chip = this.createChip(filter);
            this.chipsList.appendChild(chip);
        });

        // Mostrar container
        this.show();
    }

    /**
     * Cria um chip individual
     *
     * @param {Object} filter - {type, label, value}
     * @returns {HTMLElement}
     */
    createChip(filter) {
        const chip = document.createElement('div');
        chip.className = `filter-chip filter-chip-${filter.type}`;
        chip.setAttribute('data-filter-type', filter.type);

        // Ícone do chip
        const icon = document.createElement('i');
        icon.className = this.getChipIcon(filter.type);

        // Label e valor
        const text = document.createElement('span');
        text.className = 'chip-text';
        text.innerHTML = `<strong>${filter.label}:</strong> ${this.escapeHtml(filter.value)}`;

        // Botão remover
        const removeBtn = document.createElement('button');
        removeBtn.className = 'chip-remove';
        removeBtn.innerHTML = '<i class="bi bi-x"></i>';
        removeBtn.setAttribute('aria-label', `Remover filtro ${filter.label}`);
        removeBtn.setAttribute('title', 'Remover filtro');

        // Event listener para remover
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeChip(filter.type);
        });

        // Event listener para editar (clicar no chip)
        chip.addEventListener('click', () => {
            this.editChip(filter.type);
        });

        // Montar chip
        chip.appendChild(icon);
        chip.appendChild(text);
        chip.appendChild(removeBtn);

        // Animação de entrada
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.8)';

        requestAnimationFrame(() => {
            chip.style.transition = 'all 0.3s ease';
            chip.style.opacity = '1';
            chip.style.transform = 'scale(1)';
        });

        return chip;
    }

    /**
     * Retorna o ícone apropriado para o tipo de filtro
     *
     * @param {string} type
     * @returns {string}
     */
    getChipIcon(type) {
        const icons = {
            cargo: 'bi bi-briefcase',
            lotacao: 'bi bi-building',
            superintendencia: 'bi bi-diagram-3',
            subsecretaria: 'bi bi-diagram-2',
            urgencia: 'bi bi-exclamation-triangle',
            status: 'bi bi-check-circle'
        };

        return icons[type] || 'bi bi-filter';
    }

    /**
     * Remove um chip e atualiza filtros
     *
     * @param {string} type
     */
    removeChip(type) {
        // Buscar chip no DOM
        const chip = this.chipsList.querySelector(`[data-filter-type="${type}"]`);

        if (chip) {
            // Animação de saída
            chip.style.transition = 'all 0.3s ease';
            chip.style.opacity = '0';
            chip.style.transform = 'scale(0.8)';

            setTimeout(() => {
                chip.remove();

                // Se não há mais chips, esconder container
                if (this.chipsList.children.length === 0) {
                    this.hide();
                }
            }, 300);
        }

        // Remover filtro do manager
        this.filterManager.removeFilter(type);

        // Reaplicar filtros
        this.applyFiltersAndUpdate();
    }

    /**
     * Edita um chip (abre modal de filtros)
     *
     * @param {string} type
     */
    editChip(type) {
        // Abrir modal de filtros com foco no filtro específico
        this.openFiltersModal(type);
    }

    /**
     * Limpa todos os chips
     */
    clearAll() {
        if (!this.chipsList) return;

        // Animação de saída para todos os chips
        const chips = Array.from(this.chipsList.children);

        chips.forEach((chip, index) => {
            setTimeout(() => {
                chip.style.transition = 'all 0.3s ease';
                chip.style.opacity = '0';
                chip.style.transform = 'scale(0.8)';
            }, index * 50);
        });

        setTimeout(() => {
            this.chipsList.innerHTML = '';
            this.hide();
        }, chips.length * 50 + 300);
    }

    /**
     * Handler para botão "Limpar Todos"
     */
    handleClearAll() {
        this.filterManager.clearAll();
        this.clearAll();
        this.applyFiltersAndUpdate();
    }

    /**
     * Atualiza o contador de resultados
     *
     * @param {number} current - Número de resultados filtrados
     * @param {number} total - Total de servidores
     */
    updateCounter(current, total) {
        const counterText = document.getElementById('resultsCountText');

        if (!counterText) return;

        counterText.textContent = `Mostrando ${current} de ${total} servidores`;

        // Adicionar classe de destaque se houver filtros ativos
        if (this.counter) {
            if (current < total) {
                this.counter.classList.add('filtered');
            } else {
                this.counter.classList.remove('filtered');
            }
        }
    }

    /**
     * Mostra o container de chips
     * NOTA: Chips não aparecem mais na home, apenas no modal de filtros avançados
     */
    show() {
        // Desabilitado - chips não devem aparecer na home para não comprometer o layout
        return;
    }

    /**
     * Esconde o container de chips
     */
    hide() {
        if (!this.container) return;

        if (this.isVisible) {
            this.container.style.transition = 'all 0.3s ease';
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                this.container.style.display = 'none';
            }, 300);

            this.isVisible = false;
        }
    }

    /**
     * Abre modal de filtros
     *
     * @param {string} focusType - Tipo de filtro para focar (opcional)
     */
    openFiltersModal(focusType = null) {
        if (this.dashboard && this.dashboard.openFiltersModal) {
            this.dashboard.openFiltersModal(focusType);
        }
    }

    /**
     * Aplica filtros e atualiza dashboard
     */
    applyFiltersAndUpdate() {
        if (this.dashboard && this.dashboard.applyFiltersAndSearch) {
            this.dashboard.applyFiltersAndSearch();
        }
    }

    /**
     * Escapa HTML para prevenir XSS
     *
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Retorna estatísticas da UI
     *
     * @returns {Object}
     */
    getStats() {
        return {
            isVisible: this.isVisible,
            activeChips: this.chipsList ? this.chipsList.children.length : 0
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.FilterChipsUI = FilterChipsUI;
}
