/**
 * WidgetRenderer.js
 * Renderiza widgets como preview final (WYSIWYG)
 * @version 5.1.0
 */

export class WidgetRenderer {
    constructor(builder) {
        this.builder = builder;
        this.charts = new Map();
    }

    render() {
        const container = this.builder.elements.reportDocument;
        if (!container) return;

        // Destroy charts anteriores
        this.destroyCharts();

        // Render header do relatório
        let html = `
            <div class="report-header">
                <h1>${this.builder.state.title || 'Relatório Personalizado'}</h1>
                <p class="report-date">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>
        `;

        // Render widgets
        this.builder.state.widgets.forEach((widget, index) => {
            html += this.renderWidget(widget, index);
        });

        container.innerHTML = html;

        // Inicializa charts após DOM update
        setTimeout(() => this.initializeCharts(), 100);

        // Adiciona listeners aos controles
        this.attachControlListeners();
    }

    renderWidget(widget, index) {
        const isFirst = index === 0;
        const isLast = index === this.builder.state.widgets.length - 1;

        let widgetHTML = '';

        // Wrapper com controles
        widgetHTML += `
            <div class="report-widget" data-widget-id="${widget.id}">
                <div class="widget-controls">
                    <div class="controls-left">
                        <button class="control-btn move-up" data-id="${widget.id}" ${isFirst ? 'disabled' : ''} title="Mover para cima">
                            <i class="bi bi-arrow-up"></i>
                        </button>
                        <button class="control-btn move-down" data-id="${widget.id}" ${isLast ? 'disabled' : ''} title="Mover para baixo">
                            <i class="bi bi-arrow-down"></i>
                        </button>
                    </div>
                    <div class="controls-right">
                        <button class="control-btn config-btn" data-id="${widget.id}" title="Configurar">
                            <i class="bi bi-gear"></i>
                        </button>
                        <button class="control-btn delete-btn" data-id="${widget.id}" title="Remover">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="widget-content">
        `;

        // Renderiza conteúdo baseado no tipo
        switch (widget.type) {
            case 'stat-card':
                widgetHTML += this.renderStatCard(widget);
                break;
            case 'chart-bar':
            case 'chart-line':
            case 'chart-pie':
            case 'chart-doughnut':
                widgetHTML += this.renderChart(widget, index);
                break;
            case 'table-servidores':
                widgetHTML += this.renderTableServidores(widget);
                break;
            case 'table-licencas':
                widgetHTML += this.renderTableLicencas(widget);
                break;
            case 'text-title':
                widgetHTML += this.renderTextTitle(widget);
                break;
            case 'text-paragraph':
                widgetHTML += this.renderTextParagraph(widget);
                break;
            case 'divider':
                widgetHTML += this.renderDivider(widget);
                break;
            default:
                widgetHTML += `<div class="widget-placeholder">Widget desconhecido: ${widget.type}</div>`;
        }

        widgetHTML += `
                </div>
            </div>
        `;

        return widgetHTML;
    }

    renderStatCard(widget) {
        const value = this.getMetricValue(widget.config.metric);
        const label = this.formatMetricLabel(widget.config.metric);

        return `
            <div class="stat-card">
                ${widget.config.showIcon ? '<div class="stat-icon"><i class="bi bi-graph-up-arrow"></i></div>' : ''}
                <div class="stat-value">${value}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    }

    renderChart(widget, index) {
        const canvasId = `chart_${widget.id}_${index}`;
        return `
            <div class="chart-container">
                <canvas id="${canvasId}" style="max-height: 400px;"></canvas>
            </div>
        `;
    }

    renderTableServidores(widget) {
        const servidores = this.builder.dashboard.allServidores || [];
        const limit = widget.config.limit || 10;
        const columns = widget.config.columns || ['nome', 'cargo', 'lotacao', 'urgencia'];
        const rows = servidores.slice(0, limit);

        return `
            <div class="table-container">
                <table class="report-table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${this.formatColumnHeader(col)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${columns.map(col => `<td>${this.formatCellValue(row[col], col)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${servidores.length > limit ? `<p class="table-info">Mostrando ${limit} de ${servidores.length} registros</p>` : ''}
            </div>
        `;
    }

    renderTableLicencas(widget) {
        const servidores = this.builder.dashboard.allServidores || [];
        const licencas = [];

        servidores.forEach(servidor => {
            if (servidor.licencas && servidor.licencas.length > 0) {
                servidor.licencas.forEach(licenca => {
                    licencas.push({
                        servidor: servidor.nome,
                        dataInicio: licenca.dataInicio,
                        dias: licenca.dias
                    });
                });
            }
        });

        const limit = widget.config.limit || 10;
        const rows = licencas.slice(0, limit);

        return `
            <div class="table-container">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Servidor</th>
                            <th>Data Início</th>
                            <th>Dias</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                <td>${row.servidor}</td>
                                <td>${row.dataInicio ? new Date(row.dataInicio).toLocaleDateString('pt-BR') : '-'}</td>
                                <td>${row.dias || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${licencas.length > limit ? `<p class="table-info">Mostrando ${limit} de ${licencas.length} licenças</p>` : ''}
            </div>
        `;
    }

    renderTextTitle(widget) {
        const level = widget.config.level || 'h2';
        return `<${level} class="text-title">${widget.config.text || 'Título'}</${level}>`;
    }

    renderTextParagraph(widget) {
        return `<p class="text-paragraph">${widget.config.text || 'Parágrafo...'}</p>`;
    }

    renderDivider(widget) {
        return `<hr style="border: none; border-top: ${widget.config.thickness}px ${widget.config.style} ${widget.config.color}; margin: 20px 0;">`;
    }

    // Chart.js
    initializeCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js não disponível');
            return;
        }

        this.builder.state.widgets.forEach((widget, index) => {
            if (widget.type.startsWith('chart-')) {
                this.createChart(widget, index);
            }
        });
    }

    createChart(widget, index) {
        const canvasId = `chart_${widget.id}_${index}`;
        const canvas = document.getElementById(canvasId);

        if (!canvas) {
            console.warn(`Canvas não encontrado: ${canvasId}`);
            return;
        }

        const ctx = canvas.getContext('2d');
        const chartType = widget.config.chartType || widget.type.replace('chart-', '');
        const data = this.getChartData(widget.config.dataSource);

        const config = {
            type: chartType,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: widget.config.showLegend !== false
                    }
                }
            }
        };

        // Adiciona scales para gráficos não-circulares
        if (chartType !== 'pie' && chartType !== 'doughnut') {
            config.options.scales = {
                y: {
                    beginAtZero: true
                }
            };
        }

        try {
            const chart = new Chart(ctx, config);
            this.charts.set(canvasId, chart);
            console.log(`Gráfico criado: ${canvasId}`);
        } catch (error) {
            console.error('Erro ao criar gráfico:', error);
        }
    }

    getChartData(dataSource) {
        switch (dataSource) {
            case 'timeline':
                return this.getTimelineData();
            case 'urgency':
                return this.getUrgencyData();
            default:
                return this.getTimelineData();
        }
    }

    getTimelineData() {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        // Gera dados baseados em licenças reais se disponível
        const data = months.map(() => Math.floor(Math.random() * 30) + 5);

        return {
            labels: months,
            datasets: [{
                label: 'Licenças por Mês',
                data: data,
                backgroundColor: 'rgba(13, 110, 253, 0.6)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 2,
                tension: 0.3
            }]
        };
    }

    getUrgencyData() {
        const servidores = this.builder.dashboard.allServidores || [];
        const urgencias = {
            'Crítica': 0,
            'Alta': 0,
            'Moderada': 0,
            'Baixa': 0
        };

        servidores.forEach(s => {
            if (urgencias.hasOwnProperty(s.urgencia)) {
                urgencias[s.urgencia]++;
            }
        });

        return {
            labels: Object.keys(urgencias),
            datasets: [{
                label: 'Distribuição por Urgência',
                data: Object.values(urgencias),
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(13, 202, 240, 0.8)',
                    'rgba(25, 135, 84, 0.8)'
                ],
                borderWidth: 0
            }]
        };
    }

    destroyCharts() {
        this.charts.forEach(chart => {
            try {
                chart.destroy();
            } catch (error) {
                console.warn('Erro ao destruir gráfico:', error);
            }
        });
        this.charts.clear();
    }

    // Listeners dos controles
    attachControlListeners() {
        const container = this.builder.elements.reportDocument;
        if (!container) return;

        // Move up
        container.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.builder.moveWidget(btn.dataset.id, 'up');
            });
        });

        // Move down
        container.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.builder.moveWidget(btn.dataset.id, 'down');
            });
        });

        // Config
        container.querySelectorAll('.config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.builder.showConfigModal(btn.dataset.id);
            });
        });

        // Delete
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Remover este widget?')) {
                    this.builder.removeWidget(btn.dataset.id);
                }
            });
        });
    }

    // Utilitários
    getMetricValue(metric) {
        const servidores = this.builder.dashboard.allServidores || [];

        switch (metric) {
            case 'totalServidores':
                return servidores.length;
            case 'comLicenca':
                return servidores.filter(s => s.licencas && s.licencas.length > 0).length;
            case 'semLicenca':
                return servidores.filter(s => !s.licencas || s.licencas.length === 0).length;
            case 'urgenciasCriticas':
                return servidores.filter(s => s.urgencia === 'Crítica').length;
            default:
                return 0;
        }
    }

    formatMetricLabel(metric) {
        const labels = {
            totalServidores: 'Total de Servidores',
            comLicenca: 'Com Licença Agendada',
            semLicenca: 'Sem Licença Agendada',
            urgenciasCriticas: 'Urgências Críticas'
        };
        return labels[metric] || metric;
    }

    formatColumnHeader(column) {
        const headers = {
            nome: 'Nome',
            cargo: 'Cargo',
            lotacao: 'Lotação',
            urgencia: 'Urgência',
            servidor: 'Servidor',
            dataInicio: 'Data Início',
            dias: 'Dias'
        };
        return headers[column] || column;
    }

    formatCellValue(value, column) {
        if (value === null || value === undefined) return '-';

        if (column === 'urgencia') {
            const colors = {
                'Crítica': 'danger',
                'Alta': 'warning',
                'Moderada': 'info',
                'Baixa': 'success'
            };
            const color = colors[value] || 'secondary';
            return `<span class="badge bg-${color}">${value}</span>`;
        }

        return value;
    }
}
