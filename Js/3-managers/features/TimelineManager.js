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

        // Helper para gerar chaves estáveis para servidores (evita duplicatas)
        this._servidorWeakMap = new WeakMap();
        this._anonServidorCounter = 1;

        console.log('✅ TimelineManager criado');
    }

    /**
     * Parse a raw date value from various formats into a Date object.
     * Supports Date objects, ISO strings, and dd/mm/yyyy (common in CSVs).
     * Returns null when input is falsy.
     * @private
     */
    _parseDate(raw) {
        if (!raw && raw !== 0) return null;
        if (raw instanceof Date) return raw;
        if (typeof raw !== 'string') return new Date(raw);

        const s = raw.trim();

        // dd/mm/yyyy or d/m/yyyy
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
            const parts = s.split('/');
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            let y = parseInt(parts[2], 10);
            if (y < 100) y += 2000;
            return new Date(y, m, d);
        }

        // yyyy-mm-dd
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
            const parts = s.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }

        // yyyy-mm
        if (/^\d{4}-\d{1,2}$/.test(s)) {
            const parts = s.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, 1);
        }

        // Fallback to Date constructor
        const dt = new Date(s);
        return isNaN(dt) ? null : dt;
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
        let skippedCount = 0;
        servidores.forEach(servidor => {
            const nomeServidor = servidor.nome || servidor.NOME || servidor.servidor || servidor.SERVIDOR || 'SEM NOME';
            const isAcacia = nomeServidor.toUpperCase().includes('ACACIA');

            // Verificar se tem array de licenças (formato novo)
            if (servidor.licencas && Array.isArray(servidor.licencas) && servidor.licencas.length > 0) {
                servidor.licencas.forEach(licenca => {
                    if (!licenca.inicio && !licenca.A_PARTIR) {
                        if (isAcacia) console.log('[TimelineManager] ACACIA: licença sem data de início', licenca);
                        skippedCount++;
                        return;
                    }

                    const inicioRaw = licenca.inicio || licenca.A_PARTIR;
                    const fimRaw = licenca.fim || licenca.TERMINO;

                    const inicio = this._parseDate(inicioRaw);
                    const fim = fimRaw ? this._parseDate(fimRaw) : inicio;

                    if (isAcacia) {
                        console.log('[TimelineManager] ACACIA: processando licença');
                        console.log('  - inicioRaw:', inicioRaw);
                        console.log('  - fimRaw:', fimRaw);
                        console.log('  - inicio (Date):', inicio);
                        console.log('  - fim (Date):', fim);
                        console.log('  - viewType:', viewType);
                        console.log('  - selectedYear:', selectedYear, 'selectedMonth:', selectedMonth);
                    }

                    // CRÍTICO: Criar um clone do servidor com informações da licença específica
                    // para evitar que o Set remova duplicatas quando o mesmo servidor tem múltiplas licenças
                    const servidorComLicenca = {
                        ...servidor,
                        licenseInfo: null, // Será calculado depois
                        A_PARTIR: inicio,
                        TERMINO: fim,
                        inicio: inicio,
                        fim: fim
                    };

                    if (viewType === 'yearly') {
                        this._processYearlyLicense(data, inicio, fim, servidorComLicenca, periodStart, periodEnd);
                    } else if (viewType === 'monthly') {
                        this._processMonthlyLicense(data, inicio, fim, servidorComLicenca, periodStart, periodEnd, selectedYear);
                    } else if (viewType === 'daily') {
                        this._processDailyLicense(data, inicio, fim, servidorComLicenca, selectedYear, selectedMonth);
                    }
                    processedCount++;
                });
            } else {
                // Formato antigo: cada servidor É uma licença (linha do CSV)
                const inicioRaw = servidor.A_PARTIR || servidor.inicio;
                const fimRaw = servidor.TERMINO || servidor.fim;

                if (!inicioRaw) {
                    if (isAcacia) console.log('[TimelineManager] ACACIA: servidor sem data de início (formato antigo)');
                    skippedCount++;
                    return;
                }

                const inicio = this._parseDate(inicioRaw);
                const fim = fimRaw ? this._parseDate(fimRaw) : inicio;

                if (isAcacia) {
                    console.log('[TimelineManager] ACACIA: processando no formato antigo');
                    console.log('  - inicioRaw:', inicioRaw);
                    console.log('  - fimRaw:', fimRaw);
                    console.log('  - inicio (Date):', inicio);
                    console.log('  - fim (Date):', fim);
                    console.log('  - viewType:', viewType);
                    console.log('  - selectedYear:', selectedYear, 'selectedMonth:', selectedMonth);
                }

                // CRÍTICO: Criar um clone do servidor com informações da licença específica
                // para evitar que o Set remova duplicatas quando o mesmo servidor tem múltiplas licenças
                const servidorComLicenca = {
                    ...servidor,
                    licenseInfo: null, // Será calculado depois
                    A_PARTIR: inicio,
                    TERMINO: fim,
                    inicio: inicio,
                    fim: fim
                };

                if (viewType === 'yearly') {
                    this._processYearlyLicense(data, inicio, fim, servidorComLicenca, periodStart, periodEnd);
                } else if (viewType === 'monthly') {
                    this._processMonthlyLicense(data, inicio, fim, servidorComLicenca, periodStart, periodEnd, selectedYear);
                } else if (viewType === 'daily') {
                    this._processDailyLicense(data, inicio, fim, servidorComLicenca, selectedYear, selectedMonth);
                }
                processedCount++;
            }
        });

        console.log('[TimelineManager] Servidores processados:', processedCount);
        console.log('[TimelineManager] Servidores ignorados (sem data):', skippedCount);
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
     * Generate a stable key for a servidor object to avoid duplicates across licenses
     * @private
     */
    _getServidorKey(s) {
        if (!s || typeof s !== 'object') return null;
        const id = s.id || s.ID || s.NUMERO || s.numero || s.NUM || s.MATRICULA || s.matricula;
        if (id) return `id:${String(id)}`;
        const cpf = s.cpf || s.CPF || s.cpf_cnpj || s.CPFCNPJ;
        if (cpf) return `cpf:${String(cpf)}`;
        const nome = (s.nome || s.NOME || s.servidor || s.SERVIDOR || '').toString().trim();
        if (nome) return `nome:${nome.replace(/\s+/g, ' ').toUpperCase()}`;

        let key = this._servidorWeakMap.get(s);
        if (!key) {
            key = `anon:${this._anonServidorCounter++}`;
            this._servidorWeakMap.set(s, key);
        }
        return key;
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
            // fallback default: last 12 months
            if (!periodStart || !periodEnd) {
                const now = new Date();
                const end = new Date(now.getFullYear(), now.getMonth(), 28);
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                start.setMonth(start.getMonth() - 11);
                periodStart = start;
                periodEnd = end;
            }
        } else if (viewType === 'yearly') {
            const startInput = document.getElementById('timelinePeriodStartYear');
            const endInput = document.getElementById('timelinePeriodEndYear');

            if (startInput && startInput.value && endInput && endInput.value) {
                periodStart = new Date(parseInt(startInput.value), 0, 1);
                periodEnd = new Date(parseInt(endInput.value), 11, 31);
            }
            // fallback default: last 5 years
            if (!periodStart || !periodEnd) {
                const now = new Date();
                periodEnd = new Date(now.getFullYear(), 11, 31);
                periodStart = new Date(now.getFullYear() - 4, 0, 1);
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
                    servidores: [], // Array para permitir múltiplas licenças do mesmo servidor
                    servidoresSet: new Set()
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
                    servidores: [], // Array para permitir múltiplas licenças do mesmo servidor
                    servidoresSet: new Set()
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
                    servidores: [], // Array para permitir múltiplas licenças do mesmo servidor
                    servidoresSet: new Set()
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
                data[key] = {count: 0, period: {type: 'year', value: year}, servidores: [], servidoresSet: new Set()};
            }
            const skey = this._getServidorKey(servidor);
            if (!data[key].servidoresSet.has(skey)) {
                data[key].servidoresSet.add(skey);
                data[key].servidores.push(servidor);
            }
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
                data[key] = {count: 0, period: {type: 'month', year, month}, servidores: [], servidoresSet: new Set()};
            }
            const skey = this._getServidorKey(servidor);
            if (!data[key].servidoresSet.has(skey)) {
                data[key].servidoresSet.add(skey);
                data[key].servidores.push(servidor);
            }
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
                    const skey = this._getServidorKey(servidor);
                    if (!data[key].servidoresSet) data[key].servidoresSet = new Set();
                    if (!data[key].servidoresSet.has(skey)) {
                        data[key].servidoresSet.add(skey);
                        data[key].servidores.push(servidor);
                    }
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
            item.count = item.servidores.length; // Array em vez de Set

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
            servidoresData.push(item.servidores); // Já é array, não precisa converter
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
                    console.log('[TimelineManager] onClick disparado. Elements:', elements);
                    if (elements.length > 0) {
                        const dataIndex = elements[0].index;
                        console.log('[TimelineManager] Clicado no índice:', dataIndex);
                        this._showPeriodDetails(dataIndex);
                    } else {
                        console.log('[TimelineManager] Clique fora dos pontos do gráfico');
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
     * Reutiliza o modal do calendário (calendarDayModal)
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
        console.log('[TimelineManager] Period:', period);
        console.log('[TimelineManager] currentData:', this.currentData);
        console.log('[TimelineManager] Exemplo de servidor:', servidores[0]);
        console.log('[TimelineManager] Todas as propriedades do servidor:', Object.keys(servidores[0]));

        // Calcular licenseInfo para cada servidor (período de licença ativo)
        servidores.forEach(servidor => {
            if (servidor.licenseInfo) return; // Já tem

            // Tentar encontrar a licença ativa para este período
            const inicio = servidor.A_PARTIR || servidor.inicio;
            const fim = servidor.TERMINO || servidor.fim;

            if (inicio) {
                const inicioDate = this._parseDate(inicio);
                const fimDate = this._parseDate(fim) || inicioDate;

                const inicioStr = inicioDate ? inicioDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '';
                const fimStr = fimDate ? fimDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '';

                servidor.licenseInfo = `${inicioStr} até ${fimStr}`;
            }
        });

        // Formatar título baseado no tipo de período
        let titleText = 'Licenças do Período';
        if (period.type === 'day') {
            titleText = new Date(period.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'});
        } else if (period.type === 'month') {
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            titleText = `${monthNames[period.month]} de ${period.year}`;
        } else if (period.type === 'year') {
            titleText = `Ano de ${period.value}`;
        }

        console.log('[TimelineManager] Título do modal:', titleText);

        // Função para criar HTML de cada servidor (EXATAMENTE igual ao CalendarManager)
        const createItemHtml = (servidor, index) => {
            const nome = servidor.nome || servidor.NOME || servidor.servidor || servidor.SERVIDOR || 'Nome não informado';
            const cargo = servidor.cargo || servidor.CARGO || '';
            const lotacao = servidor.lotacao || servidor.LOTACAO || servidor.lotação || '';
            const licenseInfo = servidor.licenseInfo || '';

            // Gerar iniciais para o avatar
            const nameParts = nome.trim().split(' ');
            const initials = nameParts.length >= 2
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : nome.substring(0, 2).toUpperCase();

            return `
                <div class="servidor-item" data-index="${index}">
                    <div class="server-avatar">${initials}</div>
                    <div class="servidor-info">
                        <strong class="servidor-nome">${nome}</strong>
                        <div class="servidor-meta">
                            <span class="meta-item">
                                <i class="bi bi-briefcase"></i>
                                <span>${cargo || 'Cargo não informado'}</span>
                            </span>
                        </div>
                        ${licenseInfo ? `
                            <div class="servidor-licenca">
                                <i class="bi bi-calendar-check"></i>
                                <span>${licenseInfo}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="servidor-details">
                        <button class="btn-icon btn-eye" data-index="${index}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        };

        // Usar modal do calendário (reutilizar)
        const legacyModal = document.getElementById('calendarDayModal');
        console.log('[TimelineManager] Modal calendarDayModal:', legacyModal);
        if (!legacyModal) {
            console.error('[TimelineManager] Modal calendarDayModal não encontrado');
            return;
        }

        // Atualizar título
        const modalTitleEl = document.getElementById('calendarDayTitle');
        console.log('[TimelineManager] Modal title element:', modalTitleEl);
        if (modalTitleEl) {
            modalTitleEl.textContent = titleText;
        }

        // Atualizar conteúdo
        const modalBodyEl = document.getElementById('calendarServersList');
        console.log('[TimelineManager] Modal body element:', modalBodyEl);
        if (modalBodyEl) {
            const sectionHtml = `
                <div class="modal-section">
                    <div class="section-header">
                        <i class="bi bi-calendar-check section-icon"></i>
                        <h4 class="section-title">Licenças</h4>
                        <span class="section-badge success">${servidores.length}</span>
                    </div>
                    <div class="section-content" id="licencasList"></div>
                </div>
            `;

            modalBodyEl.innerHTML = sectionHtml;

            const licencasList = document.getElementById('licencasList');
            if (licencasList) {
                const htmlList = servidores.map((s, i) => createItemHtml(s, i)).join('');
                console.log('[TimelineManager] HTML dos primeiros 2 servidores:', servidores.slice(0, 2).map((s, i) => createItemHtml(s, i)));

                // Popular lista usando a mesma estrutura do CalendarManager
                licencasList.innerHTML = `<div class="servidores-list">${htmlList}</div>`;

                // Delegated click handler
                const wrapper = licencasList.querySelector('.servidores-list');
                if (wrapper) {
                    if (wrapper._timelineClickHandler) {
                        wrapper.removeEventListener('click', wrapper._timelineClickHandler);
                    }

                    wrapper._representantes = servidores;
                    wrapper._timelineClickHandler = (ev) => {
                        // Click no botão "olho" ou no card inteiro
                        const eye = ev.target.closest('.btn-eye');
                        const card = ev.target.closest('.servidor-item');

                        if (eye || card) {
                            ev.stopPropagation();
                            const idx = eye ? parseInt(eye.getAttribute('data-index'), 10) : parseInt(card.getAttribute('data-index'), 10);
                            const representante = wrapper._representantes[idx];
                            if (!representante) return;

                            const nomeToShow = (representante.nome || representante.NOME || representante.servidor || representante.SERVIDOR || '').trim();
                            console.log('[TimelineManager] Abrindo detalhes do servidor:', nomeToShow);

                            // Abrir via ModalManager
                            if (this.app && this.app.modalManager && typeof this.app.modalManager.showServidorDetails === 'function') {
                                this.app.modalManager.showServidorDetails(nomeToShow);
                            } else if (window.ModalManager && typeof window.ModalManager.showServidorDetails === 'function') {
                                window.ModalManager.showServidorDetails(nomeToShow);
                            }
                        }
                    };

                    wrapper.addEventListener('click', wrapper._timelineClickHandler);
                }
            }
        }

        // IMPORTANTE: Apenas abrir o modal (igual ao CalendarManager faz)
        // NÃO fechar antes, pois isso causa problemas com os event listeners
        console.log('[TimelineManager] Tentando abrir modal...');
        console.log('[TimelineManager] this.app:', this.app);
        console.log('[TimelineManager] this.app.modalManager:', this.app ? this.app.modalManager : null);

        if (this.app && this.app.modalManager && typeof this.app.modalManager.open === 'function') {
            console.log('[TimelineManager] Abrindo modal via ModalManager.open()');
            this.app.modalManager.open('calendarDayModal');

            // Verificar estado após abrir
            setTimeout(() => {
                console.log('[TimelineManager] Estado do modal após open():');
                console.log('  - display:', legacyModal.style.display);
                console.log('  - classList:', legacyModal.classList.toString());
                console.log('  - aria-hidden:', legacyModal.getAttribute('aria-hidden'));
                console.log('  - offsetWidth:', legacyModal.offsetWidth);
                console.log('  - offsetHeight:', legacyModal.offsetHeight);
                console.log('  - Posição na tela:', legacyModal.getBoundingClientRect());
            }, 100);

            // Scroll para o topo do modal
            const modalContent = legacyModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
        } else {
            console.log('[TimelineManager] Abrindo via style.display direto');
            legacyModal.style.display = 'flex';
        }

        console.log('[TimelineManager] Modal display após abertura:', legacyModal.style.display);
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
