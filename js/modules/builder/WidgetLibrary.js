/**
 * WidgetLibrary.js
 * Biblioteca de widgets disponíveis
 * @version 5.1.0
 */

class WidgetLibrary {
    constructor(builder) {
        this.builder = builder;

        this.widgets = [
            // Estatísticas
            {
                id: 'stat-card',
                name: 'Card de Estatística',
                icon: 'bi-card-heading',
                category: 'Estatísticas',
                defaultConfig: { metric: 'totalServidores', showIcon: true }
            },
            // Gráficos
            {
                id: 'chart-bar',
                name: 'Gráfico de Barras',
                icon: 'bi-bar-chart-fill',
                category: 'Gráficos',
                defaultConfig: { chartType: 'bar', dataSource: 'timeline', showLegend: true }
            },
            {
                id: 'chart-line',
                name: 'Gráfico de Linha',
                icon: 'bi-graph-up',
                category: 'Gráficos',
                defaultConfig: { chartType: 'line', dataSource: 'timeline', showLegend: true }
            },
            {
                id: 'chart-pie',
                name: 'Gráfico de Pizza',
                icon: 'bi-pie-chart-fill',
                category: 'Gráficos',
                defaultConfig: { chartType: 'pie', dataSource: 'urgency', showLegend: true }
            },
            {
                id: 'chart-doughnut',
                name: 'Gráfico de Rosca',
                icon: 'bi-circle',
                category: 'Gráficos',
                defaultConfig: { chartType: 'doughnut', dataSource: 'urgency', showLegend: true }
            },
            // Tabelas
            {
                id: 'table-servidores',
                name: 'Tabela de Servidores',
                icon: 'bi-table',
                category: 'Tabelas',
                defaultConfig: { columns: ['nome', 'cargo', 'lotacao', 'urgencia'], limit: 10 }
            },
            {
                id: 'table-licencas',
                name: 'Tabela de Licenças',
                icon: 'bi-calendar-check',
                category: 'Tabelas',
                defaultConfig: { columns: ['servidor', 'dataInicio', 'dias'], limit: 10 }
            },
            // Texto
            {
                id: 'text-title',
                name: 'Título',
                icon: 'bi-type-h1',
                category: 'Texto',
                defaultConfig: { text: 'Título da Seção', level: 'h2' }
            },
            {
                id: 'text-paragraph',
                name: 'Parágrafo',
                icon: 'bi-text-paragraph',
                category: 'Texto',
                defaultConfig: { text: 'Digite o texto aqui...' }
            },
            // Layout
            {
                id: 'divider',
                name: 'Divisor',
                icon: 'bi-dash-lg',
                category: 'Layout',
                defaultConfig: { style: 'solid', color: '#e2e8f0', thickness: 1 }
            }
        ];

        this.widgetIndex = new Map();
        this.widgets.forEach(w => this.widgetIndex.set(w.id, w));

        this.filteredWidgets = [...this.widgets];
    }

    render() {
        const container = this.builder.elements.widgetsList;
        if (!container) return;

        const categories = this.groupByCategory(this.filteredWidgets);

        let html = '';
        for (const [category, widgets] of Object.entries(categories)) {
            html += `
                <div class="widget-category">
                    <div class="category-name">${category}</div>
                    ${widgets.map(w => `
                        <button class="widget-btn" data-widget-id="${w.id}">
                            <i class="bi ${w.icon}"></i>
                            <span>${w.name}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        }

        container.innerHTML = html;

        // Adiciona listeners
        container.querySelectorAll('.widget-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.builder.addWidget(btn.dataset.widgetId);
            });
        });
    }

    groupByCategory(widgets) {
        const groups = {};
        widgets.forEach(widget => {
            if (!groups[widget.category]) {
                groups[widget.category] = [];
            }
            groups[widget.category].push(widget);
        });
        return groups;
    }

    filter(query) {
        if (!query || query.trim() === '') {
            this.filteredWidgets = [...this.widgets];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredWidgets = this.widgets.filter(w =>
                w.name.toLowerCase().includes(lowerQuery) ||
                w.category.toLowerCase().includes(lowerQuery)
            );
        }
        this.render();
    }

    getWidget(id) {
        return this.widgetIndex.get(id);
    }

    getWidgetName(id) {
        const widget = this.widgetIndex.get(id);
        return widget ? widget.name : 'Widget';
    }

    createWidget(widgetId) {
        const widget = this.widgetIndex.get(widgetId);
        if (!widget) return null;

        // Tamanho padrão por tipo
        let defaultSize = { width: 320, height: 120 };
        if (widgetId.startsWith('chart-')) defaultSize = { width: 400, height: 260 };
        if (widgetId.startsWith('table-')) defaultSize = { width: 520, height: 220 };
        if (widgetId === 'divider') defaultSize = { width: 320, height: 24 };
        if (widgetId === 'text-title') defaultSize = { width: 320, height: 60 };
        if (widgetId === 'text-paragraph') defaultSize = { width: 320, height: 80 };

        return {
            id: this.builder.generateId(),
            type: widgetId,
            config: { ...widget.defaultConfig },
            size: { ...defaultSize },
            position: { x: 0, y: 0 },
            style: {} // permite estilização futura
        };
    }

    /**
     * Backwards-compatible helper used by older builders: render the full sidebar (list + icons)
     */
    renderSidebar() {
        // render main list
        this.render();

        // render compact icons area if available
        const iconsContainer = this.builder.elements?.widgetsIcons;
        if (!iconsContainer) return;

        iconsContainer.innerHTML = this.widgets.map(w => `
            <button class="widget-icon" data-widget-id="${w.id}" title="${w.name}">
                <i class="bi ${w.icon}"></i>
            </button>
        `).join('');

        iconsContainer.querySelectorAll('.widget-icon').forEach(btn => {
            btn.addEventListener('click', () => {
                this.builder.addWidget(btn.dataset.widgetId);
            });
        });
    }
}
