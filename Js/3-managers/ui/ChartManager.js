/**
 * ChartManager - Gerenciamento de gráficos
 *
 * Responsabilidades:
 * - Criar e atualizar gráficos Chart.js
 * - Gráfico de urgências (pizza/rosca)
 * - Gráfico de cargos (barras)
 * - Gráfico de timeline
 * - Exportação de gráficos
 *
 * @module 3-managers/ui/ChartManager
 */

class ChartManager {
    /**
     * Construtor
     * @param {Object} app - Instância do App/Dashboard
     */
    constructor(app) {
        this.app = app;

        // Instâncias de gráficos
        this.charts = {
            urgency: null,
            cargo: null,
            timeline: null,
            calendar: null
        };

        // Cores padrão
        this.colors = {
            critica: '#dc2626',      // Vermelho
            alta: '#f97316',         // Laranja
            moderada: '#eab308',     // Amarelo
            baixa: '#22c55e',        // Verde
            primary: '#4f46e5',      // Indigo
            secondary: '#64748b'     // Slate
        };

        console.log('✅ ChartManager inicializado');
    }

    /**
     * Inicializa gráficos
     */
    init() {
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js não está carregado');
            return;
        }

        // Configurações globais do Chart.js
        Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
        Chart.defaults.color = '#64748b';
        Chart.defaults.plugins.legend.display = true;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;

        console.log('📊 Chart.js configurado');
    }

    /**
     * Cria gráfico de próximas licenças (barras verticais)
     * @param {string} canvasId - ID do canvas
     * @param {Object} data - Dados { dias30, dias60, dias90 }
     */
    createProximasLicencasChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas ${canvasId} não encontrado`);
            return null;
        }

        // Destruir gráfico existente
        if (this.charts.urgency) {
            this.charts.urgency.destroy();
        }

        // Preparar dados
        const chartData = {
            labels: ['0-30 dias', '31-60 dias', '61-90 dias'],
            datasets: [{
                label: 'Licenças',
                data: [
                    data.dias30 || 0,
                    data.dias60 || 0,
                    data.dias90 || 0
                ],
                backgroundColor: [
                    '#ef4444',  // Vermelho (urgente)
                    '#f97316',  // Laranja (moderado)
                    '#eab308'   // Amarelo (menos urgente)
                ],
                borderRadius: 6,
                maxBarThickness: 60
            }]
        };

        // Criar gráfico
        this.charts.urgency = new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${value} licença${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        grid: {
                            drawBorder: false
                        }
                    }
                }
            }
        });

        console.log('📊 Gráfico de próximas licenças criado');
        return this.charts.urgency;
    }

    /**
     * Cria gráfico de status de licenças (pizza/rosca)
     * @param {string} canvasId - ID do canvas
     * @param {Object} data - Dados { agendadas, emAndamento, concluidas, naoAgendadas }
     */
    createStatusLicencasChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas ${canvasId} não encontrado`);
            return null;
        }

        // Destruir gráfico existente
        if (this.charts.cargo) {
            this.charts.cargo.destroy();
        }

        // Preparar dados
        const chartData = {
            labels: ['Agendadas', 'Em Andamento', 'Concluídas', 'Não Agendadas'],
            datasets: [{
                data: [
                    data.agendadas || 0,
                    data.emAndamento || 0,
                    data.concluidas || 0,
                    data.naoAgendadas || 0
                ],
                backgroundColor: [
                    '#3b82f6',  // Azul (agendadas)
                    '#10b981',  // Verde (em andamento)
                    '#6b7280',  // Cinza (concluídas)
                    '#f59e0b'   // Âmbar (não agendadas)
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        // Criar gráfico
        this.charts.cargo = new Chart(canvas, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,  // Permite controlar a altura manualmente
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 30,
                        right: 30
                    }
                },
                plugins: {
                    legend: {
                        position: 'right',  // Legenda à direita para melhor aproveitamento do espaço
                        align: 'center',    // Centraliza verticalmente
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 13
                            },
                            boxWidth: 15,
                            boxHeight: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const statusKeys = ['agendadas', 'emAndamento', 'concluidas', 'naoAgendadas'];
                        const statusKey = statusKeys[index];
                        this._handleStatusChartClick(statusKey);
                    }
                }
            }
        });

        console.log('📊 Gráfico de status de licenças criado');
        return this.charts.cargo;
    }

    /**
     * Cria gráfico de timeline (barras verticais)
     * @param {string} canvasId - ID do canvas
     * @param {Object} data - Dados por período
     * @param {string} viewMode - Modo de visualização (daily, monthly, yearly)
     */
    createTimelineChart(canvasId, data, viewMode = 'monthly') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas ${canvasId} não encontrado`);
            return null;
        }

        // Destruir gráfico existente
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        // Preparar dados baseado no modo
        const { labels, values } = this._prepareTimelineData(data, viewMode);

        const chartData = {
            labels,
            datasets: [{
                label: 'Licenças',
                data: values,
                backgroundColor: this.colors.primary,
                borderRadius: 6,
                maxBarThickness: 40
            }]
        };

        // Criar gráfico
        this.charts.timeline = new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                return items[0].label;
                            },
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${value} licença${value !== 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        grid: {
                            drawBorder: false
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const period = labels[index];
                        this._handleTimelineClick(period, viewMode);
                    }
                }
            }
        });

        console.log('📊 Gráfico de timeline criado');
        return this.charts.timeline;
    }

    /**
     * Prepara dados para timeline
     * @private
     * @param {Object} data - Dados brutos
     * @param {string} viewMode - Modo de visualização
     * @returns {{labels: Array<string>, values: Array<number>}}
     */
    _prepareTimelineData(data, viewMode) {
        const labels = [];
        const values = [];

        // Ordenar por período
        const sortedEntries = Object.entries(data).sort((a, b) => {
            return a[0].localeCompare(b[0]);
        });

        sortedEntries.forEach(([period, count]) => {
            labels.push(this._formatPeriodLabel(period, viewMode));
            values.push(count);
        });

        return { labels, values };
    }

    /**
     * Formata label do período
     * @private
     * @param {string} period - Período (ex: '2025-01')
     * @param {string} viewMode - Modo de visualização
     * @returns {string} - Label formatado
     */
    _formatPeriodLabel(period, viewMode) {
        if (viewMode === 'monthly') {
            const [year, month] = period.split('-');
            const monthNames = [
                'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
            ];
            return `${monthNames[parseInt(month) - 1]}/${year}`;
        }

        if (viewMode === 'yearly') {
            return period; // Apenas o ano
        }

        // Daily format
        try {
            const date = new Date(period);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit'
            });
        } catch {
            return period;
        }
    }

    /**
     * Manipula clique no timeline
     * @private
     * @param {string} period - Período clicado
     * @param {string} viewMode - Modo de visualização
     */
    _handleTimelineClick(period, viewMode) {
        if (this.app && this.app.onTimelinePeriodClick) {
            this.app.onTimelinePeriodClick(period, viewMode);
        }
    }

    /**
     * Manipula clique no gráfico de status
     * @private
     * @param {string} statusKey - Chave do status clicado (agendadas, emAndamento, concluidas, naoAgendadas)
     */
    _handleStatusChartClick(statusKey) {
        if (this.app && this.app.onStatusChartClick) {
            this.app.onStatusChartClick(statusKey);
        }
    }

    /**
     * Atualiza dados de um gráfico existente
     * @param {string} chartType - Tipo do gráfico (urgency, cargo, timeline)
     * @param {Object} newData - Novos dados
     */
    updateChart(chartType, newData) {
        const chart = this.charts[chartType];

        if (!chart) {
            console.warn(`Gráfico ${chartType} não existe`);
            return;
        }

        // Atualizar dados
        if (chartType === 'urgency') {
            // Novo formato: próximas licenças (30/60/90 dias)
            chart.data.datasets[0].data = [
                newData.dias30 || 0,
                newData.dias60 || 0,
                newData.dias90 || 0
            ];
        } else if (chartType === 'cargo') {
            // Novo formato: status de licenças
            chart.data.datasets[0].data = [
                newData.agendadas || 0,
                newData.emAndamento || 0,
                newData.concluidas || 0,
                newData.naoAgendadas || 0
            ];
        }

        chart.update();
        console.log(`📊 Gráfico ${chartType} atualizado`);
    }

    /**
     * Exporta gráfico como imagem
     * @param {string} chartType - Tipo do gráfico
     * @param {string} filename - Nome do arquivo
     * @returns {Promise<void>}
     */
    async exportChart(chartType, filename) {
        const chart = this.charts[chartType];

        if (!chart) {
            console.warn(`Gráfico ${chartType} não existe`);
            return;
        }

        try {
            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `grafico-${chartType}.png`;
            link.click();

            console.log(`📊 Gráfico ${chartType} exportado`);
        } catch (error) {
            console.error('Erro ao exportar gráfico:', error);
        }
    }

    /**
     * Destroi todos os gráficos
     */
    destroyAll() {
        Object.keys(this.charts).forEach(chartType => {
            if (this.charts[chartType]) {
                this.charts[chartType].destroy();
                this.charts[chartType] = null;
            }
        });

        console.log('📊 Todos os gráficos destruídos');
    }

    /**
     * Aplica tema aos gráficos
     * @param {string} theme - 'light' ou 'dark'
     */
    applyTheme(theme) {
        const isDark = theme === 'dark';

        // Atualizar cores padrão
        Chart.defaults.color = isDark ? '#e2e8f0' : '#64748b';
        Chart.defaults.plugins.tooltip.backgroundColor = isDark ?
            'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        Chart.defaults.plugins.tooltip.titleColor = isDark ? '#1e293b' : '#ffffff';
        Chart.defaults.plugins.tooltip.bodyColor = isDark ? '#1e293b' : '#ffffff';

        // Atualizar gráficos existentes
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.update();
            }
        });

        console.log(`📊 Tema ${theme} aplicado aos gráficos`);
    }

    /**
     * Retorna informações de debug
     * @returns {Object}
     */
    /**
     * Renderiza gráfico de próximas licenças
     * Calcula licenças nos próximos 30/60/90 dias usando LicenseAnalyzer
     * @param {Array<Object>} servidores - Array de servidores
     * @param {string} canvasId - ID do canvas (padrão: 'urgencyChart')
     */
    renderProximasLicencasChart(servidores, canvasId = 'urgencyChart') {
        if (!servidores || servidores.length === 0) {
            console.warn('⚠️ Sem dados para renderizar gráfico de próximas licenças');
            return;
        }

        // Verificar se LicenseAnalyzer está disponível
        if (typeof LicenseAnalyzer === 'undefined') {
            console.error('❌ LicenseAnalyzer não está carregado');
            return;
        }

        // Usar LicenseAnalyzer para calcular dados
        const data = LicenseAnalyzer.contarProximasLicencas(servidores);

        // Criar gráfico
        return this.createProximasLicencasChart(canvasId, data);
    }

    /**
     * Renderiza gráfico de status de licenças
     * Classifica licenças por status usando LicenseAnalyzer
     * @param {Array<Object>} servidores - Array de servidores
     * @param {string} canvasId - ID do canvas (padrão: 'cargoChart')
     */
    renderStatusLicencasChart(servidores, canvasId = 'cargoChart') {
        if (!servidores || servidores.length === 0) {
            console.warn('⚠️ Sem dados para renderizar gráfico de status de licenças');
            return;
        }

        // Verificar se LicenseAnalyzer está disponível
        if (typeof LicenseAnalyzer === 'undefined') {
            console.error('❌ LicenseAnalyzer não está carregado');
            return;
        }

        // Usar LicenseAnalyzer para calcular dados
        const data = LicenseAnalyzer.contarStatusLicencas(servidores);

        // Criar gráfico
        return this.createStatusLicencasChart(canvasId, data);
    }

    getDebugInfo() {
        return {
            activeCharts: Object.keys(this.charts).filter(k => this.charts[k] !== null),
            chartInstances: Object.keys(this.charts).reduce((acc, key) => {
                acc[key] = this.charts[key] ? 'active' : 'inactive';
                return acc;
            }, {})
        };
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.ChartManager = ChartManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}
