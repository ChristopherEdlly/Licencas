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
     * Cria gráfico de urgências (pizza/rosca)
     * @param {string} canvasId - ID do canvas
     * @param {Object} data - Dados agregados
     */
    createUrgencyChart(canvasId, data) {
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
            labels: ['Crítica', 'Alta', 'Moderada', 'Baixa'],
            datasets: [{
                data: [
                    data.critica || 0,
                    data.alta || 0,
                    data.moderada || 0,
                    data.baixa || 0
                ],
                backgroundColor: [
                    this.colors.critica,
                    this.colors.alta,
                    this.colors.moderada,
                    this.colors.baixa
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        // Criar gráfico
        this.charts.urgency = new Chart(canvas, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
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
                }
            }
        });

        console.log('📊 Gráfico de urgências criado');
        return this.charts.urgency;
    }

    /**
     * Cria gráfico de cargos (barras horizontais)
     * @param {string} canvasId - ID do canvas
     * @param {Object} data - Dados por cargo
     */
    createCargoChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Canvas ${canvasId} não encontrado`);
            return null;
        }

        // Destruir gráfico existente
        if (this.charts.cargo) {
            this.charts.cargo.destroy();
        }

        // Preparar dados (top 10 cargos)
        const sortedCargos = Object.entries(data)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const chartData = {
            labels: sortedCargos.map(([cargo]) => cargo),
            datasets: [{
                label: 'Quantidade',
                data: sortedCargos.map(([, count]) => count),
                backgroundColor: this.colors.primary,
                borderRadius: 6
            }]
        };

        // Criar gráfico
        this.charts.cargo = new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Quantidade: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        grid: {
                            display: true,
                            drawBorder: false
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        console.log('📊 Gráfico de cargos criado');
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
            chart.data.datasets[0].data = [
                newData.critica || 0,
                newData.alta || 0,
                newData.moderada || 0,
                newData.baixa || 0
            ];
        } else if (chartType === 'cargo') {
            const sortedCargos = Object.entries(newData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            chart.data.labels = sortedCargos.map(([cargo]) => cargo);
            chart.data.datasets[0].data = sortedCargos.map(([, count]) => count);
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
     * Renderiza gráfico de urgência (wrapper para compatibilidade)
     * Agrega dados e chama createUrgencyChart
     * @param {Array<Object>} servidores - Array de servidores
     * @param {string} canvasId - ID do canvas (padrão: 'urgencyChart')
     */
    renderUrgencyChart(servidores, canvasId = 'urgencyChart') {
        if (!servidores || servidores.length === 0) {
            console.warn('⚠️ Sem dados para renderizar gráfico de urgência');
            return;
        }

        // Agregar dados por nível de urgência
        const urgencyData = {
            critica: 0,
            alta: 0,
            moderada: 0,
            baixa: 0
        };

        servidores.forEach(servidor => {
            // Helper para busca case-insensitive
            const getKey = (obj, key) => {
                const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                return found ? obj[found] : undefined;
            };

            const urgenciaData = getKey(servidor, 'urgencia');
            const nivelUrgenciaData = getKey(servidor, 'nivelUrgencia');

            const urgencia = urgenciaData || nivelUrgenciaData || 'baixa';
            const nivel = String(urgencia).toLowerCase().trim();

            if (urgencyData.hasOwnProperty(nivel)) {
                urgencyData[nivel]++;
            } else {
                urgencyData.baixa++; // Fallback para urgência desconhecida
            }
        });

        // Criar gráfico usando método existente
        return this.createUrgencyChart(canvasId, urgencyData);
    }

    /**
     * Renderiza gráfico de cargos (wrapper para compatibilidade)
     * @param {Array<Object>} servidores - Array de servidores
     * @param {string} canvasId - ID do canvas (padrão: 'cargoChart')
     */
    renderCargoChart(servidores, canvasId = 'cargoChart') {
        if (!servidores || servidores.length === 0) {
            console.warn('⚠️ Sem dados para renderizar gráfico de cargos');
            return;
        }

        // Agregar dados por cargo
        const cargoData = {};

        servidores.forEach(servidor => {
            // Tenta encontrar a chave 'cargo' de forma case-insensitive
            const cargoKey = Object.keys(servidor).find(k => k.toLowerCase() === 'cargo');
            const cargo = cargoKey ? servidor[cargoKey] : 'Não informado';

            // Ignorar valores vazios ou nulos se necessário, ou agrupar como "Não informado"
            const cargoLabel = (cargo && cargo.trim() !== '') ? cargo.trim().toUpperCase() : 'NÃO INFORMADO';

            cargoData[cargoLabel] = (cargoData[cargoLabel] || 0) + 1;
        });

        // Criar gráfico usando método existente
        return this.createCargoChart(canvasId, cargoData);
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
