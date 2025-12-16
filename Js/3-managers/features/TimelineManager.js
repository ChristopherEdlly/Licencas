/**
 * TimelineManager - Gerenciamento de gráfico de timeline de licenças
 *
 * Baseado no dashboard.js antigo (createTimelineChart, getTimelineData)
 * Usa Chart.js para renderizar gráfico de linha
 * Suporta 3 modos: daily, monthly, yearly
 */

class TimelineManager {
    constructor(app) {
        this.app = app;

        // Referência ao chart
        this.chart = null;
        this.chartCanvas = null;

        // Dados atuais
        this.currentData = null;
        this.currentStats = null;

        console.log('✅ TimelineManager criado');
    }

    /**
     * Inicializa o gráfico de timeline
     * @param {HTMLCanvasElement|string} canvas - Canvas ou ID do canvas
     */
    init(canvas) {
        if (typeof canvas === 'string') {
            this.chartCanvas = document.getElementById(canvas);
        } else {
            this.chartCanvas = canvas;
        }

        if (!this.chartCanvas) {
            console.error('[TimelineManager] Canvas não encontrado');
            return;
        }

        console.log('[TimelineManager] Inicializado com canvas:', this.chartCanvas.id);
    }

    /**
     * Renderiza o gráfico com os dados dos servidores
     * @param {Array} servidores - Dados filtrados dos servidores
     */
    render(servidores) {
        if (!this.chartCanvas) {
            console.warn('[TimelineManager] Canvas não inicializado');
            return;
        }

        if (!servidores || servidores.length === 0) {
            console.warn('[TimelineManager] Nenhum servidor fornecido');
            this._renderEmptyState();
            return;
        }

        console.log('[TimelineManager] Renderizando com', servidores.length, 'servidores');
        console.log('[TimelineManager] Exemplo de servidor:', servidores[0]);

        // Destruir gráfico existente
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Obter dados processados
        const timelineData = this._getTimelineData(servidores);

        if (!timelineData || !timelineData.labels || timelineData.labels.length === 0) {
            this._renderEmptyState();
            return;
        }

        // Salvar stats
        this.currentStats = this._calculateStats(timelineData, servidores);

        // Criar gráfico
        this._createChart(timelineData);

        console.log('[TimelineManager] Gráfico renderizado:', {
            pontos: timelineData.labels.length,
            maxValue: Math.max(...timelineData.data)
        });
    }

    /**
     * Processa dados dos servidores para formato do gráfico
     * @private
     * @param {Array} servidores - Servidores filtrados
     * @returns {Object} Dados formatados {labels, data, periods, servidoresData}
     */
    _getTimelineData(servidores) {
        const viewType = this._getViewType();
        const data = {};

        console.log('[TimelineManager] ViewType:', viewType);

        // Obter período selecionado
        const {selectedYear, selectedMonth, periodStart, periodEnd} = this._getSelectedPeriod(viewType);

        console.log('[TimelineManager] Período selecionado:', {selectedYear, selectedMonth, periodStart, periodEnd});

        // Criar esqueleto de períodos
        this._createPeriodSkeleton(data, viewType, selectedYear, selectedMonth, periodStart, periodEnd);

        console.log('[TimelineManager] Períodos criados:', Object.keys(data).length);

        // Processar licenças
        // Em licença prêmio, cada SERVIDOR É uma licença (cada linha do CSV)
        let processedCount = 0;
        servidores.forEach(servidor => {
            // Verificar se tem array de licenças (formato novo)
            if (servidor.licencas && Array.isArray(servidor.licencas) && servidor.licencas.length > 0) {
                servidor.licencas.forEach(licenca => {
                    if (!licenca.inicio && !licenca.A_PARTIR) return;

                    const inicioRaw = licenca.inicio || licenca.A_PARTIR;
                    const fimRaw = licenca.fim || licenca.TERMINO;

                    const inicio = typeof inicioRaw === 'string' ? new Date(inicioRaw) : inicioRaw;
                    const fim = fimRaw ? (typeof fimRaw === 'string' ? new Date(fimRaw) : fimRaw) : inicio;

                    if (viewType === 'yearly') {
                        this._processYearlyLicense(data, inicio, fim, servidor, periodStart, periodEnd);
                    } else if (viewType === 'monthly') {
                        this._processMonthlyLicense(data, inicio, fim, servidor, periodStart, periodEnd, selectedYear);
                    } else if (viewType === 'daily') {
                        this._processDailyLicense(data, inicio, fim, servidor, selectedYear, selectedMonth);
                    }
                    processedCount++;
                });
            } else {
                // Formato antigo: cada servidor É uma licença (linha do CSV)
                const inicioRaw = servidor.A_PARTIR || servidor.inicio;
                const fimRaw = servidor.TERMINO || servidor.fim;

                if (!inicioRaw) return;

                const inicio = typeof inicioRaw === 'string' ? new Date(inicioRaw) : inicioRaw;
                const fim = fimRaw ? (typeof fimRaw === 'string' ? new Date(fimRaw) : fimRaw) : inicio;

                if (viewType === 'yearly') {
                    this._processYearlyLicense(data, inicio, fim, servidor, periodStart, periodEnd);
                } else if (viewType === 'monthly') {
                    this._processMonthlyLicense(data, inicio, fim, servidor, periodStart, periodEnd, selectedYear);
                } else if (viewType === 'daily') {
                    this._processDailyLicense(data, inicio, fim, servidor, selectedYear, selectedMonth);
                }
                processedCount++;
            }
        });

        console.log('[TimelineManager] Servidores processados:', processedCount);
        console.log('[TimelineManager] Data final:', data);

        // Converter para arrays ordenados
        return this._convertToArrays(data, viewType);
    }

    /**
     * Obtém tipo de visualização selecionado
     * @private
     */
    _getViewType() {
        const select = document.getElementById('timelineView');
        return select ? select.value : 'monthly';
    }

    /**
     * Obtém período selecionado pelos controles
     * @private
     */
    _getSelectedPeriod(viewType) {
        let selectedYear, selectedMonth, periodStart, periodEnd;

        if (viewType === 'daily') {
            const dailyInput = document.getElementById('timelineDailyMonth');
            if (dailyInput && dailyInput.value) {
                const [year, month] = dailyInput.value.split('-').map(Number);
                selectedYear = year;
                selectedMonth = month - 1;
            } else {
                const today = new Date();
                selectedYear = today.getFullYear();
                selectedMonth = today.getMonth();
            }
        } else if (viewType === 'monthly') {
            const startInput = document.getElementById('timelinePeriodStartMonth');
            const endInput = document.getElementById('timelinePeriodEndMonth');

            if (startInput && startInput.value && endInput && endInput.value) {
                const [startYear, startMonth] = startInput.value.split('-').map(Number);
                const [endYear, endMonth] = endInput.value.split('-').map(Number);
                periodStart = new Date(startYear, startMonth - 1, 1);
                periodEnd = new Date(endYear, endMonth - 1, 28);
            }
        } else if (viewType === 'yearly') {
            const startInput = document.getElementById('timelinePeriodStartYear');
            const endInput = document.getElementById('timelinePeriodEndYear');

            if (startInput && startInput.value && endInput && endInput.value) {
                periodStart = new Date(parseInt(startInput.value), 0, 1);
                periodEnd = new Date(parseInt(endInput.value), 11, 31);
            }
        }

        return {selectedYear, selectedMonth, periodStart, periodEnd};
    }

    /**
     * Cria esqueleto de períodos com count = 0
     * @private
     */
    _createPeriodSkeleton(data, viewType, selectedYear, selectedMonth, periodStart, periodEnd) {
        if (viewType === 'monthly' && periodStart && periodEnd) {
            let current = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
            const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

            while (current <= end) {
                const year = current.getFullYear();
                const month = current.getMonth();
                const key = `${year}-${month.toString().padStart(2, '0')}`;
                data[key] = {
                    count: 0,
                    period: {type: 'month', year, month},
                    servidores: new Set()
                };
                current.setMonth(current.getMonth() + 1);
            }
        } else if (viewType === 'daily') {
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const key = day.toString();
                data[key] = {
                    count: 0,
                    period: {type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear},
                    servidores: new Set()
                };
            }
        } else if (viewType === 'yearly' && periodStart && periodEnd) {
            const startYear = periodStart.getFullYear();
            const endYear = periodEnd.getFullYear();

            for (let year = startYear; year <= endYear; year++) {
                const key = year.toString();
                data[key] = {
                    count: 0,
                    period: {type: 'year', value: year},
                    servidores: new Set()
                };
            }
        }
    }

    /**
     * Processa licença para view yearly
     * @private
     */
    _processYearlyLicense(data, inicio, fim, servidor, periodStart, periodEnd) {
        const startYear = inicio.getFullYear();
        const endYear = fim.getFullYear();

        let minYear = startYear;
        let maxYear = endYear;

        if (periodStart && periodEnd) {
            const rangeStart = periodStart.getFullYear();
            const rangeEnd = periodEnd.getFullYear();
            minYear = Math.max(startYear, rangeStart);
            maxYear = Math.min(endYear, rangeEnd);
        }

        for (let year = minYear; year <= maxYear; year++) {
            const key = year.toString();
            if (!data[key]) {
                data[key] = {count: 0, period: {type: 'year', value: year}, servidores: new Set()};
            }
            data[key].servidores.add(servidor.nome || servidor.NOME);
        }
    }

    /**
     * Processa licença para view monthly
     * @private
     */
    _processMonthlyLicense(data, inicio, fim, servidor, periodStart, periodEnd, selectedYear) {
        const current = new Date(inicio);
        const end = new Date(fim);

        while (current <= end) {
            const year = current.getFullYear();
            const month = current.getMonth();
            const key = `${year}-${month.toString().padStart(2, '0')}`;

            // Filtrar por range se existir
            if (periodStart && periodEnd) {
                if (current < periodStart || current > periodEnd) {
                    current.setMonth(current.getMonth() + 1);
                    continue;
                }
            }

            if (!data[key]) {
                data[key] = {count: 0, period: {type: 'month', year, month}, servidores: new Set()};
            }
            data[key].servidores.add(servidor.nome || servidor.NOME);
            current.setMonth(current.getMonth() + 1);
        }
    }

    /**
     * Processa licença para view daily
     * @private
     */
    _processDailyLicense(data, inicio, fim, servidor, selectedYear, selectedMonth) {
        const current = new Date(inicio);
        const end = new Date(fim);

        while (current <= end) {
            const year = current.getFullYear();
            const month = current.getMonth();
            const day = current.getDate();

            // Apenas dias do mês selecionado
            if (year === selectedYear && month === selectedMonth) {
                const key = day.toString();
                if (data[key]) {
                    data[key].servidores.add(servidor.nome || servidor.NOME);
                }
            }

            current.setDate(current.getDate() + 1);
        }
    }

    /**
     * Converte objeto de dados para arrays ordenados
     * @private
     */
    _convertToArrays(data, viewType) {
        // Ordenar keys
        const sortedKeys = Object.keys(data).sort((a, b) => {
            if (viewType === 'daily') {
                return parseInt(a) - parseInt(b);
            } else if (viewType === 'yearly') {
                return parseInt(a) - parseInt(b);
            } else {
                return a.localeCompare(b);
            }
        });

        const labels = [];
        const values = [];
        const periods = [];
        const servidoresData = [];

        sortedKeys.forEach(key => {
            const item = data[key];
            item.count = item.servidores.size;

            // Label
            if (viewType === 'daily') {
                labels.push(item.period.day);
            } else if (viewType === 'monthly') {
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                labels.push(`${monthNames[item.period.month]}/${item.period.year}`);
            } else if (viewType === 'yearly') {
                labels.push(item.period.value);
            }

            values.push(item.count);
            periods.push(item.period);
            servidoresData.push(Array.from(item.servidores));
        });

        return {labels, data: values, periods, servidoresData};
    }

    /**
     * Calcula estatísticas dos dados
     * @private
     */
    _calculateStats(timelineData, servidores) {
        const totalLicenses = timelineData.data.reduce((sum, val) => sum + val, 0);
        const activeServers = new Set();

        servidores.forEach(s => {
            if (s.licencas && s.licencas.length > 0) {
                activeServers.add(s.nome || s.NOME);
            }
        });

        const maxValue = Math.max(...timelineData.data);
        const peakIndex = timelineData.data.indexOf(maxValue);
        const peakPeriod = timelineData.labels[peakIndex] || '-';
        const averageLicenses = timelineData.data.length > 0 ? (totalLicenses / timelineData.data.length).toFixed(1) : 0;

        return {
            totalLicenses,
            activeServersCount: activeServers.size,
            peakPeriod,
            averageLicenses
        };
    }

    /**
     * Cria o gráfico Chart.js
     * @private
     */
    _createChart(timelineData) {
        this.chart = new Chart(this.chartCanvas, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Servidores em Licença',
                    data: timelineData.data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (_event, elements) => {
                    if (elements.length > 0) {
                        const dataIndex = elements[0].index;
                        this._showPeriodDetails(dataIndex);
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: (context) => {
                                const idx = context[0].dataIndex;
                                const period = timelineData.periods[idx];

                                if (period.type === 'day') {
                                    return new Date(period.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'});
                                } else if (period.type === 'month') {
                                    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                                    return `${monthNames[period.month]} de ${period.year}`;
                                } else if (period.type === 'year') {
                                    return String(period.value);
                                }

                                return context[0].label;
                            },
                            label: (context) => {
                                const count = context.parsed.y;
                                return `${count} ${count === 1 ? 'servidor' : 'servidores'} em licença`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {size: 11}
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {size: 11},
                            stepSize: 1
                        }
                    }
                }
            }
        });

        this.currentData = timelineData;
    }

    /**
     * Renderiza estado vazio
     * @private
     */
    _renderEmptyState() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        const ctx = this.chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhum dado disponível para o período selecionado', this.chartCanvas.width / 2, this.chartCanvas.height / 2);
    }

    /**
     * Retorna estatísticas atuais
     */
    getStats() {
        return this.currentStats;
    }

    /**
     * Mostra modal com lista de servidores do período clicado
     * @private
     * @param {number} dataIndex - Índice do ponto clicado no gráfico
     */
    _showPeriodDetails(dataIndex) {
        if (!this.currentData || !this.currentData.servidoresData) {
            console.warn('[TimelineManager] Dados não disponíveis para mostrar detalhes');
            return;
        }

        const servidores = this.currentData.servidoresData[dataIndex];
        const period = this.currentData.periods[dataIndex];
        const label = this.currentData.labels[dataIndex];

        if (!servidores || servidores.length === 0) {
            console.warn('[TimelineManager] Nenhum servidor encontrado para o período');
            return;
        }

        console.log('[TimelineManager] Mostrando detalhes do período:', label, 'Servidores:', servidores.length);

        // Atualizar título do modal
        const modalTitle = document.getElementById('timelinePeriodTitle');
        if (modalTitle) {
            let titleText = 'Licenças do Período';
            if (period.type === 'day') {
                titleText = new Date(period.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'});
            } else if (period.type === 'month') {
                const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                titleText = `${monthNames[period.month]} de ${period.year}`;
            } else if (period.type === 'year') {
                titleText = `Ano de ${period.value}`;
            }
            modalTitle.textContent = titleText;
        }

        // Popular lista de servidores
        const listContainer = document.getElementById('timelineServersList');
        if (!listContainer) {
            console.error('[TimelineManager] Elemento #timelineServersList não encontrado');
            return;
        }

        // Criar HTML dos servidores
        const servidoresHtml = servidores.map((servidor, index) => {
            const nome = servidor.nome || servidor.NOME || servidor.servidor || servidor.SERVIDOR || 'Nome não informado';
            const cargo = servidor.cargo || servidor.CARGO || '';
            const lotacao = servidor.lotacao || servidor.LOTACAO || servidor.lotação || '';

            return `
                <div class="servidor-item" data-index="${index}"
                     style="cursor: pointer; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem; transition: all 0.2s;"
                     onmouseover="this.style.backgroundColor='var(--bg-hover)'; this.style.borderColor='var(--primary)';"
                     onmouseout="this.style.backgroundColor=''; this.style.borderColor='var(--border)';">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${nome}</div>
                            ${cargo ? `<div style="font-size: 0.875rem; color: var(--text-secondary);">${cargo}</div>` : ''}
                            ${lotacao ? `<div style="font-size: 0.875rem; color: var(--text-secondary);">${lotacao}</div>` : ''}
                        </div>
                        <i class="bi bi-chevron-right" style="color: var(--text-secondary);"></i>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    <strong>${servidores.length}</strong> ${servidores.length === 1 ? 'servidor' : 'servidores'} em licença neste período
                </div>
            </div>
            ${servidoresHtml}
        `;

        // Adicionar event listener para abrir detalhes do servidor
        listContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.servidor-item');
            if (!item) return;

            const index = parseInt(item.getAttribute('data-index'), 10);
            const servidor = servidores[index];
            const nomeToShow = (servidor.nome || servidor.NOME || servidor.servidor || servidor.SERVIDOR || '').trim();

            console.log('[TimelineManager] Abrindo detalhes do servidor:', nomeToShow);

            // Tentar abrir via ModalManager
            if (this.app && this.app.modalManager && typeof this.app.modalManager.showServidorDetails === 'function') {
                this.app.modalManager.showServidorDetails(nomeToShow);
            } else if (window.ModalManager && typeof window.ModalManager.showServidorDetails === 'function') {
                window.ModalManager.showServidorDetails(nomeToShow);
            } else {
                console.warn('[TimelineManager] ModalManager não disponível para mostrar detalhes');
            }
        });

        // Abrir modal
        const modal = document.getElementById('timelinePeriodModal');
        if (modal) {
            modal.style.display = 'flex';

            // Adicionar listener para fechar
            const closeBtn = document.getElementById('timelinePeriodCloseBtn');
            const backdrop = modal.querySelector('.modal-backdrop');

            const closeHandler = () => {
                modal.style.display = 'none';
            };

            if (closeBtn) {
                closeBtn.removeEventListener('click', closeHandler);
                closeBtn.addEventListener('click', closeHandler);
            }
            if (backdrop) {
                backdrop.removeEventListener('click', closeHandler);
                backdrop.addEventListener('click', closeHandler);
            }

            // Fechar com ESC
            const escHandler = (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    }

    /**
     * Destrói o gráfico
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.TimelineManager = TimelineManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimelineManager;
}
