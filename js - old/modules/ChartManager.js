/**
 * ChartManager - Gerenciamento de gráficos (Chart.js)
 * Responsável por: Criação, atualização e interação com gráficos
 */

// Cores consistentes para gráficos de cargo
const CARGO_COLORS = [
    '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#84cc16',
    '#ec4899', '#6b7280', '#14b8a6', '#f59e0b', '#6366f1'
];

class ChartManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.charts = {};
        this.selectedChartIndex = -1;
    }

    /**
     * Criar gráfico de urgência
     */
    createUrgencyChart() {
        const ctx = document.getElementById('urgencyChart');
        if (!ctx) return;

        if (this.charts.urgency) {
            this.charts.urgency.destroy();
        }

        this.createCargoChart();
    }

    getAdaptiveChartData() {
        const fields = ['cargo', 'lotacao', 'subsecretaria', 'superintendencia'];
        
        for (const field of fields) {
            const counts = {};
            let hasData = false;
            
            this.dashboard.filteredServidores.forEach(servidor => {
                const value = (servidor[field] || '').toString().trim();
                if (value && value.length > 0 && value.toLowerCase() !== 'n/a') {
                    counts[value] = (counts[value] || 0) + 1;
                    hasData = true;
                }
            });
            
            if (hasData) {
                const labels = Object.keys(counts).sort();
                const values = labels.map(label => counts[label]);
                const colors = this.getFixedColorsForLabels(labels);
                
                return {
                    labels,
                    values,
                    colors,
                    fieldUsed: field,
                    counts
                };
            }
        }
        
        return {
            labels: ['Sem Dados'],
            values: [this.dashboard.filteredServidores.length],
            colors: [CARGO_COLORS[0]],
            fieldUsed: 'none',
            counts: {}
        };
    }

    getFixedColorsForLabels(labels) {
        if (!this.labelColorMap) {
            this.labelColorMap = new Map();
        }
        
        return labels.map(label => {
            if (this.labelColorMap.has(label)) {
                return this.labelColorMap.get(label);
            }
            
            let hash = 0;
            for (let i = 0; i < label.length; i++) {
                hash = ((hash << 5) - hash) + label.charCodeAt(i);
                hash = hash & hash;
            }
            const colorIndex = Math.abs(hash) % CARGO_COLORS.length;
            const color = CARGO_COLORS[colorIndex];
            
            this.labelColorMap.set(label, color);
            
            return color;
        });
    }

    createCargoChart() {
        const ctx = document.getElementById('urgencyChart');
        const cargoData = this.getAdaptiveChartData();

        const chartTitle = document.querySelector('.chart-title');
        if (chartTitle && cargoData.fieldUsed) {
            const titleMap = {
                'cargo': 'Distribuição por Cargos',
                'lotacao': 'Distribuição por Lotação',
                'subsecretaria': 'Distribuição por Subsecretaria',
                'superintendencia': 'Distribuição por Superintendência'
            };
            chartTitle.textContent = titleMap[cargoData.fieldUsed] || 'Distribuição';
        }

        this.originalChartColors = (cargoData.colors || CARGO_COLORS.slice(0, cargoData.labels.length)).map(c => c);

        this.charts.urgency = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cargoData.labels,
                datasets: [{
                    data: cargoData.values,
                    backgroundColor: this.originalChartColors.slice(),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
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
                        const cargo = cargoData.labels[index];
                        this.dashboard.filterTableByCargo(cargo, index);
                    } else {
                        this.dashboard.clearCargoFilter();
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        window.dashboardChart = this.charts.urgency;
        this.updateCargoLegend(cargoData);
    }

    createCargoChartForLicenca() {
        const ctx = document.getElementById('urgencyChart');
        const cargoData = this.getAdaptiveChartData();

        const chartTitle = document.querySelector('.chart-title');
        if (chartTitle && cargoData.fieldUsed) {
            const titleMap = {
                'cargo': 'Distribuição por Cargos',
                'lotacao': 'Distribuição por Lotação',
                'subsecretaria': 'Distribuição por Subsecretaria',
                'superintendencia': 'Distribuição por Superintendência'
            };
            chartTitle.textContent = titleMap[cargoData.fieldUsed] || 'Distribuição';
        }

        this.originalChartColors = (cargoData.colors || ChartManager.CARGO_COLORS.slice(0, cargoData.labels.length)).map(c => c);

        this.charts.urgency = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: cargoData.labels,
                datasets: [{
                    data: cargoData.values,
                    backgroundColor: this.originalChartColors.slice(),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8,
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '50%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
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
                        const cargo = cargoData.labels[index];
                        this.dashboard.filterTableByCargo(cargo, index);
                    } else {
                        this.dashboard.currentFilters.cargo = '';
                        this.dashboard.applyAllFilters();
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        window.dashboardChart = this.charts.urgency;
        this.updateCargoLegend(cargoData);
    }

    getAdaptiveChartData() {
        const fields = ['cargo', 'lotacao', 'subsecretaria', 'superintendencia'];
        
        for (const field of fields) {
            const counts = {};
            let hasData = false;
            
            this.dashboard.filteredServidores.forEach(servidor => {
                const value = (servidor[field] || '').toString().trim();
                if (value && value.length > 0 && value.toLowerCase() !== 'n/a') {
                    counts[value] = (counts[value] || 0) + 1;
                    hasData = true;
                }
            });

            if (hasData) {
                const sorted = Object.entries(counts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10);

                return {
                    labels: sorted.map(([k]) => k),
                    values: sorted.map(([, v]) => v),
                    counts: counts,
                    fieldUsed: field,
                    colors: sorted.map((_, i) => ChartManager.CARGO_COLORS[i % ChartManager.CARGO_COLORS.length])
                };
            }
        }

        return { labels: ['Sem Dados'], values: [0], counts: {}, fieldUsed: null, colors: ['#d1d5db'] };
    }

    updateCargoLegend(cargoData) {
        const legendContainer = document.querySelector('.chart-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = '';
        
        cargoData.labels.forEach((label, index) => {
            const count = cargoData.values[index];
            const color = cargoData.colors[index];
            
            const legendCard = document.createElement('div');
            legendCard.className = 'legend-card';
            legendCard.innerHTML = `
                <div class="legend-color" style="background-color: ${color}"></div>
                <span class="legend-label">${label}</span>
                <span class="legend-count">${count}</span>
            `;
            legendContainer.appendChild(legendCard);
        });
    }

    /**
     * Criar gráfico de cargos
     */
    createCargoChart() {
        const ctx = document.getElementById('cargoChart');
        if (!ctx) return;

        const cargoData = this.dashboard.getCargoData();
        
        if (this.charts.cargo) {
            this.charts.cargo.destroy();
        }

        this.charts.cargo = new Chart(ctx, {
            type: 'bar',
            data: cargoData,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.parsed.x} servidor(es)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const cargo = this.charts.cargo.data.labels[index];
                        this.dashboard.filterTableByCargo(cargo, index);
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de timeline
     */
    createTimelineChart() {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;

        if (!ctx.dataset.controlsInitialized) {
            this.initializeTimelineControls();
            ctx.dataset.controlsInitialized = 'true';
        }

        if (!this.dashboard.filteredServidores) {
            return;
        }

        const timelineData = this.dashboard.getTimelineData();
        
        if (!timelineData || !timelineData.labels) {
            return;
        }

        this.dashboard.updateTimelineStats(timelineData);
        
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Servidores em Licença',
                    data: timelineData.data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#3b82f6',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: (items) => items[0].label,
                            label: (context) => `${context.parsed.y} servidor(es)`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const period = timelineData.periods[index];
                        const label = timelineData.labels[index];
                        const servidoresData = timelineData.servidoresData[index];
                        if (servidoresData && servidoresData.length > 0) {
                            this.dashboard.modalManager.showTimelineModal(label, servidoresData, period);
                        }
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        console.log('✅ Gráfico de timeline criado');
        
        if (typeof this.dashboard.updateTimelineStats === 'function') {
            this.dashboard.updateTimelineStats(timelineData);
        }
    }

    initializeTimelineControls() {
        const yearSelect = document.getElementById('timelineYear');
        if (yearSelect && yearSelect.options.length === 0) {
            const years = new Set();
            this.dashboard.filteredServidores.forEach(servidor => {
                servidor.licencas.forEach(licenca => {
                    if (licenca.inicio) {
                        years.add(licenca.inicio.getFullYear());
                    }
                });
            });

            const sortedYears = Array.from(years).sort((a, b) => a - b);
            
            if (sortedYears.length === 0) {
                const currentYear = new Date().getFullYear();
                for (let year = currentYear - 1; year <= currentYear + 2; year++) {
                    sortedYears.push(year);
                }
            }

            sortedYears.forEach((year, index) => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (index === 0) option.selected = true;
                yearSelect.appendChild(option);
            });
        }

        const monthSelect = document.getElementById('timelineMonth');
        if (monthSelect) {
            const currentMonth = new Date().getMonth();
            monthSelect.value = currentMonth;
        }

        this.toggleControlsVisibility();
    }

    toggleControlsVisibility() {
        const viewType = document.getElementById('timelineView')?.value || 'monthly';
        const monthGroup = document.getElementById('timelineMonthGroup');
        const yearGroup = document.getElementById('timelineYearGroup');
        const periodStatsBtn = document.getElementById('showPeriodStatsBtn');

        if (monthGroup && yearGroup && periodStatsBtn) {
            if (viewType === 'daily') {
                monthGroup.style.display = 'flex';
                yearGroup.style.display = 'flex';
                periodStatsBtn.style.display = 'flex';
            } else if (viewType === 'monthly') {
                monthGroup.style.display = 'none';
                yearGroup.style.display = 'flex';
                periodStatsBtn.style.display = 'flex';
            } else {
                monthGroup.style.display = 'none';
                yearGroup.style.display = 'none';
                periodStatsBtn.style.display = 'flex';
            }
        }
    }

    /**
     * Atualizar gráfico de urgência
     */
    updateUrgencyChart() {
        this.createUrgencyChart();
    }

    /**
     * Atualizar gráfico de timeline
     */
    updateTimelineChart() {
        if (!this.charts.timeline) {
            this.createTimelineChart();
            return;
        }

        const timelineData = this.dashboard.getTimelineData();
        this.charts.timeline.data.labels = timelineData.labels;
        this.charts.timeline.data.datasets[0].data = timelineData.data;
        this.charts.timeline.update();
        
        this.dashboard.updateTimelineStats(timelineData);
    }

    /**
     * Destacar elemento do gráfico de urgência
     */
    highlightUrgency(urgencyLevel) {
        if (!this.charts.urgency) return;

        const chart = this.charts.urgency;
        const index = chart.data.labels.indexOf(urgencyLevel);

        if (index === -1) {
            chart.setActiveElements([]);
            this.selectedChartIndex = -1;
        } else {
            chart.setActiveElements([{ datasetIndex: 0, index }]);
            this.selectedChartIndex = index;
        }

        chart.update();
    }

    /**
     * Destacar elemento do gráfico de cargos
     */
    highlightCargo(cargoKey) {
        if (!this.charts.cargo) return;

        const chart = this.charts.cargo;
        const index = chart.data.labels.indexOf(cargoKey);

        if (index === -1) {
            chart.setActiveElements([]);
            this.selectedChartIndex = -1;
        } else {
            chart.setActiveElements([{ datasetIndex: 0, index }]);
            this.selectedChartIndex = index;
        }

        chart.update();
    }

    /**
     * Atualizar destaque nos gráficos
     */
    updateChartHighlight() {
        const { urgency, cargo } = this.dashboard.currentFilters;

        if (urgency) {
            this.highlightUrgency(urgency);
        } else if (this.charts.urgency) {
            this.charts.urgency.setActiveElements([]);
            this.charts.urgency.update();
        }

        if (cargo) {
            this.highlightCargo(cargo);
        } else if (this.charts.cargo) {
            this.charts.cargo.setActiveElements([]);
            this.charts.cargo.update();
        }
    }

    /**
     * Obter cores fixas para labels
     */
    getFixedColorsForLabels(labels) {
        const colorMap = {
            'Alta': '#ef4444',
            'Média': '#f59e0b',
            'Baixa': '#10b981',
            'Indefinida': '#6b7280'
        };

        return labels.map(label => colorMap[label] || '#6b7280');
    }

    /**
     * Destruir todos os gráficos
     */
    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}
