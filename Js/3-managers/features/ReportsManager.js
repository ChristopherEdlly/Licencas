/**
 * ReportsManager - Gerenciamento de relatórios
 *
 * Responsabilidades:
 * - Geração de relatórios predefinidos
 * - Relatórios customizados
 * - Templates de relatórios
 * - Agregação e análise de dados
 * - Exportação de relatórios (PDF, Excel, CSV)
 *
 * @module 3-managers/features/ReportsManager
 */

class ReportsManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;
        this.showOnlyFilteredLicenses = false; // Estado do toggle
        this.debug = false; // Flag de debug

        // Templates de relatórios predefinidos
        this.reportTemplates = {
            'urgencias-criticas': {
                name: 'Servidores com Urgência Crítica',
                description: 'Lista todos os servidores com licenças em urgência crítica',
                generator: (data) => this._generateUrgencyReport(data, 'critica')
            },
            'licencas-proximas': {
                name: 'Licenças nos Próximos 12 Meses',
                description: 'Licenças programadas para os próximos 12 meses',
                generator: (data) => this._generateUpcomingLicensesReport(data, 12)
            },
            'perto-aposentadoria': {
                name: 'Perto da Aposentadoria',
                description: 'Servidores que irão se aposentar nos próximos 5 anos',
                generator: (data) => this._generateRetirementReport(data, 5)
            },
            'por-lotacao': {
                name: 'Relatório por Lotação',
                description: 'Agrupa servidores e licenças por lotação',
                generator: (data) => this._generateByLotacaoReport(data)
            },
            'por-cargo': {
                name: 'Relatório por Cargo',
                description: 'Agrupa servidores e licenças por cargo',
                generator: (data) => this._generateByCargoReport(data)
            },
            'impacto-operacional': {
                name: 'Impacto Operacional',
                description: 'Análise de impacto por período e local',
                generator: (data) => this._generateOperationalImpactReport(data)
            },
            'estatisticas-gerais': {
                name: 'Estatísticas Gerais',
                description: 'Visão geral com números e indicadores',
                generator: (data) => this._generateStatisticsReport(data)
            },
            'conflitos': {
                name: 'Conflitos e Sobreposições',
                description: 'Identifica conflitos de licenças no mesmo período',
                generator: (data) => this._generateConflictsReport(data)
            }
        };

        this.init();
        console.log('✅ ReportsManager criado');
    }

    /**
     * Inicialização
     */
    init() {
        this.loadToggleState();
        this.setupToggleListener();
    }

    /**
     * Carregar estado do toggle do localStorage
     */
    loadToggleState() {
        const savedState = localStorage.getItem('licenseViewToggleState');
        this.showOnlyFilteredLicenses = savedState === 'true';

        const toggle = document.getElementById('licenseViewToggle');
        if (toggle) {
            toggle.checked = this.showOnlyFilteredLicenses;
            this.updateToggleLabels();
        }
    }

    /**
     * Salvar estado do toggle no localStorage
     */
    saveToggleState() {
        localStorage.setItem('licenseViewToggleState', this.showOnlyFilteredLicenses.toString());
    }

    /**
     * Atualizar labels do toggle
     */
    updateToggleLabels() {
        const labelComplete = document.getElementById('toggleLabelComplete');
        const labelFiltered = document.getElementById('toggleLabelFiltered');
        const description = document.getElementById('toggleDescriptionText');

        if (labelComplete) {
            labelComplete.classList.toggle('active', !this.showOnlyFilteredLicenses);
        }
        if (labelFiltered) {
            labelFiltered.classList.toggle('active', this.showOnlyFilteredLicenses);
        }
        if (description) {
            description.textContent = this.showOnlyFilteredLicenses
                ? 'Exibindo apenas licenças dentro do período filtrado nos Filtros Avançados'
                : 'Exibindo todas as licenças dos servidores encontrados';
        }
    }

    /**
     * Configurar listener do toggle
     */
    setupToggleListener() {
        const toggle = document.getElementById('licenseViewToggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.showOnlyFilteredLicenses = e.target.checked;
                this.saveToggleState();
                this.updateToggleLabels();
                console.log(`🔄 Toggle alterado: ${this.showOnlyFilteredLicenses ? 'Apenas Filtradas' : 'Visão Completa'}`);
            });
            console.log('✅ ReportsManager: Toggle de visualização conectado');
        }
    }

    // ==================== GERAÇÃO DE RELATÓRIOS ====================

    /**
     * Gera relatório usando template
     * @param {string} templateId - ID do template
     * @param {Array<Object>} data - Dados dos servidores
     * @returns {Object} - Relatório gerado
     */
    generateReport(templateId, data) {
        const template = this.reportTemplates[templateId];

        if (!template) {
            throw new Error(`Template de relatório não encontrado: ${templateId}`);
        }

        console.log(`📊 Gerando relatório: ${template.name}`);

        const startTime = Date.now();
        const report = template.generator(data);
        const duration = Date.now() - startTime;

        return {
            templateId,
            name: template.name,
            description: template.description,
            generatedAt: new Date().toISOString(),
            duration,
            ...report
        };
    }

    /**
     * Retorna lista de templates disponíveis
     * @returns {Array<Object>}
     */
    getAvailableReports() {
        return Object.keys(this.reportTemplates).map(id => ({
            id,
            name: this.reportTemplates[id].name,
            description: this.reportTemplates[id].description
        }));
    }

    // ==================== RELATÓRIOS PREDEFINIDOS ====================

    /**
     * Relatório de urgência
     * @private
     */
    _generateUrgencyReport(data, urgency) {
        const filtered = data.filter(s => s.urgencia === urgency);

        return {
            type: 'urgency',
            urgency,
            summary: {
                total: filtered.length,
                percentage: data.length > 0 ? ((filtered.length / data.length) * 100).toFixed(1) : 0
            },
            data: filtered.map(s => ({
                servidor: s.servidor,
                cpf: s.cpf,
                cargo: s.cargo,
                lotacao: s.lotacao,
                proximaLicenca: s.proximaLicenca,
                aposentadoria: s.aposentadoria?.maiorData,
                urgenciaInfo: s.urgenciaInfo
            })),
            charts: [
                {
                    type: 'bar',
                    title: `Distribuição por Cargo (Urgência: ${urgency})`,
                    data: this._groupBy(filtered, 'cargo')
                }
            ]
        };
    }

    /**
     * Relatório de licenças próximas
     * @private
     */
    _generateUpcomingLicensesReport(data, months) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + months);

        const filtered = data.filter(s => {
            if (!s.proximaLicenca) return false;
            const licencaDate = new Date(s.proximaLicenca);
            return licencaDate <= futureDate;
        });

        // Agrupar por mês
        const byMonth = {};
        filtered.forEach(s => {
            const date = new Date(s.proximaLicenca);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[monthKey]) byMonth[monthKey] = [];
            byMonth[monthKey].push(s);
        });

        return {
            type: 'upcoming-licenses',
            period: `${months} meses`,
            summary: {
                total: filtered.length,
                byMonth: Object.keys(byMonth).map(month => ({
                    month,
                    count: byMonth[month].length
                }))
            },
            data: filtered.map(s => ({
                servidor: s.servidor,
                cargo: s.cargo,
                lotacao: s.lotacao,
                proximaLicenca: s.proximaLicenca,
                mesesLicenca: s.mesesLicenca,
                urgencia: s.urgencia
            })),
            charts: [
                {
                    type: 'line',
                    title: 'Licenças por Mês',
                    data: byMonth
                }
            ]
        };
    }

    /**
     * Relatório de aposentadoria
     * @private
     */
    _generateRetirementReport(data, years) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + years);

        const filtered = data.filter(s => {
            if (!s.aposentadoria?.maiorData) return false;
            const aposentadoriaDate = new Date(s.aposentadoria.maiorData);
            return aposentadoriaDate <= futureDate;
        });

        // Agrupar por ano
        const byYear = {};
        filtered.forEach(s => {
            const year = new Date(s.aposentadoria.maiorData).getFullYear();
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(s);
        });

        return {
            type: 'retirement',
            period: `${years} anos`,
            summary: {
                total: filtered.length,
                byYear: Object.keys(byYear).map(year => ({
                    year,
                    count: byYear[year].length
                }))
            },
            data: filtered.map(s => ({
                servidor: s.servidor,
                idade: s.idade,
                cargo: s.cargo,
                lotacao: s.lotacao,
                aposentadoria: s.aposentadoria.maiorData,
                tipoAposentadoria: s.aposentadoria.mensagem,
                urgencia: s.urgencia
            })),
            charts: [
                {
                    type: 'bar',
                    title: 'Aposentadorias por Ano',
                    data: byYear
                }
            ]
        };
    }

    /**
     * Relatório por lotação
     * @private
     */
    _generateByLotacaoReport(data) {
        const byLotacao = this._groupBy(data, 'lotacao');

        const lotacoes = Object.keys(byLotacao).map(lotacao => {
            const servidores = byLotacao[lotacao];
            const urgencias = this._countUrgencies(servidores);

            return {
                lotacao,
                total: servidores.length,
                comLicenca: servidores.filter(s => s.proximaLicenca).length,
                urgencias,
                servidores: servidores.map(s => ({
                    servidor: s.servidor,
                    cargo: s.cargo,
                    proximaLicenca: s.proximaLicenca,
                    urgencia: s.urgencia
                }))
            };
        });

        return {
            type: 'by-lotacao',
            summary: {
                totalLotacoes: lotacoes.length,
                totalServidores: data.length
            },
            data: lotacoes,
            charts: [
                {
                    type: 'bar',
                    title: 'Servidores por Lotação',
                    data: byLotacao
                }
            ]
        };
    }

    /**
     * Relatório por cargo
     * @private
     */
    _generateByCargoReport(data) {
        const byCargo = this._groupBy(data, 'cargo');

        const cargos = Object.keys(byCargo).map(cargo => {
            const servidores = byCargo[cargo];
            const urgencias = this._countUrgencies(servidores);

            return {
                cargo,
                total: servidores.length,
                comLicenca: servidores.filter(s => s.proximaLicenca).length,
                urgencias,
                mediaIdade: this._average(servidores.map(s => s.idade).filter(i => i))
            };
        });

        return {
            type: 'by-cargo',
            summary: {
                totalCargos: cargos.length,
                totalServidores: data.length
            },
            data: cargos,
            charts: [
                {
                    type: 'bar',
                    title: 'Servidores por Cargo',
                    data: byCargo
                }
            ]
        };
    }

    /**
     * Relatório de impacto operacional
     * @private
     */
    _generateOperationalImpactReport(data) {
        // Calcular impacto por período
        const next3Months = this._getLicensesInPeriod(data, 3);
        const next6Months = this._getLicensesInPeriod(data, 6);
        const next12Months = this._getLicensesInPeriod(data, 12);

        // Impacto por lotação
        const byLotacao = this._groupBy(data, 'lotacao');
        const lotacaoImpact = Object.keys(byLotacao).map(lotacao => {
            const servidores = byLotacao[lotacao];
            const comLicenca = servidores.filter(s => s.proximaLicenca).length;
            const percentage = (comLicenca / servidores.length) * 100;

            return {
                lotacao,
                total: servidores.length,
                comLicenca,
                impacto: percentage.toFixed(1) + '%',
                nivel: this._getImpactLevel(percentage)
            };
        });

        return {
            type: 'operational-impact',
            summary: {
                next3Months: next3Months.length,
                next6Months: next6Months.length,
                next12Months: next12Months.length
            },
            impactByLotacao: lotacaoImpact.sort((a, b) => parseFloat(b.impacto) - parseFloat(a.impacto)),
            charts: [
                {
                    type: 'bar',
                    title: 'Impacto por Lotação (%)',
                    data: lotacaoImpact
                }
            ]
        };
    }

    /**
     * Relatório de estatísticas gerais
     * @private
     */
    _generateStatisticsReport(data) {
        const urgencias = this._countUrgencies(data);
        const cargosUnicos = new Set(data.map(s => s.cargo).filter(c => c)).size;
        const lotacoesUnicas = new Set(data.map(s => s.lotacao).filter(l => l)).size;

        const comLicenca = data.filter(s => s.proximaLicenca).length;
        const semLicenca = data.length - comLicenca;

        const idades = data.map(s => s.idade).filter(i => i);
        const mediaIdade = this._average(idades);
        const menorIdade = Math.min(...idades);
        const maiorIdade = Math.max(...idades);

        return {
            type: 'statistics',
            summary: {
                totalServidores: data.length,
                comLicenca,
                semLicenca,
                percentualComLicenca: ((comLicenca / data.length) * 100).toFixed(1) + '%'
            },
            urgencias,
            organizacao: {
                cargosUnicos,
                lotacoesUnicas
            },
            demografico: {
                mediaIdade: mediaIdade.toFixed(1),
                menorIdade,
                maiorIdade
            },
            charts: [
                {
                    type: 'pie',
                    title: 'Distribuição de Urgências',
                    data: urgencias
                }
            ]
        };
    }

    /**
     * Relatório de conflitos
     * @private
     */
    _generateConflictsReport(data) {
        const conflicts = [];
        const dateMap = new Map();

        // Mapear licenças por data
        data.forEach(servidor => {
            if (!servidor.licencas || servidor.licencas.length === 0) return;

            servidor.licencas.forEach(licenca => {
                if (!licenca.inicio || !licenca.fim) return;

                const start = new Date(licenca.inicio);
                const end = new Date(licenca.fim);

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const key = d.toISOString().split('T')[0];
                    if (!dateMap.has(key)) {
                        dateMap.set(key, []);
                    }
                    dateMap.get(key).push({
                        servidor: servidor.servidor,
                        cargo: servidor.cargo,
                        lotacao: servidor.lotacao
                    });
                }
            });
        });

        // Identificar conflitos (mais de 1 servidor no mesmo dia)
        dateMap.forEach((servidores, date) => {
            if (servidores.length > 1) {
                conflicts.push({
                    data: date,
                    count: servidores.length,
                    servidores
                });
            }
        });

        // Ordenar por quantidade
        conflicts.sort((a, b) => b.count - a.count);

        return {
            type: 'conflicts',
            summary: {
                totalConflicts: conflicts.length,
                maxConflictCount: conflicts.length > 0 ? conflicts[0].count : 0
            },
            data: conflicts.slice(0, 50), // Top 50 conflitos
            charts: []
        };
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Agrupa dados por campo
     * @private
     */
    _groupBy(data, field) {
        const grouped = {};

        data.forEach(item => {
            const value = item[field] || 'Não informado';
            if (!grouped[value]) {
                grouped[value] = [];
            }
            grouped[value].push(item);
        });

        return grouped;
    }

    /**
     * Conta urgências
     * @private
     */
    _countUrgencies(data) {
        const urgencias = { critica: 0, alta: 0, moderada: 0, baixa: 0, null: 0 };

        data.forEach(s => {
            const urg = s.urgencia || 'null';
            urgencias[urg] = (urgencias[urg] || 0) + 1;
        });

        return urgencias;
    }

    /**
     * Calcula média
     * @private
     */
    _average(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    }

    /**
     * Pega licenças em período
     * @private
     */
    _getLicensesInPeriod(data, months) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + months);

        return data.filter(s => {
            if (!s.proximaLicenca) return false;
            const licencaDate = new Date(s.proximaLicenca);
            return licencaDate <= futureDate;
        });
    }

    /**
     * Determina nível de impacto
     * @private
     */
    _getImpactLevel(percentage) {
        if (percentage >= 50) return 'Alto';
        if (percentage >= 30) return 'Médio';
        return 'Baixo';
    }

    // ==================== EXPORTAÇÃO ====================

    /**
     * Exporta relatório como JSON
     * @param {Object} report - Relatório
     * @returns {string}
     */
    exportAsJSON(report) {
        return JSON.stringify(report, null, 2);
    }

    /**
     * Exporta relatório como CSV
     * @param {Object} report - Relatório
     * @returns {string}
     */
    exportAsCSV(report) {
        if (!report.data || !Array.isArray(report.data)) {
            throw new Error('Relatório não possui dados em formato de array');
        }

        const rows = report.data;
        if (rows.length === 0) return '';

        // Headers
        const headers = Object.keys(rows[0]);
        let csv = headers.join(',') + '\n';

        // Rows
        rows.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value).replace(/,/g, ';');
            });
            csv += values.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Exporta relatório como HTML
     * @param {Object} report - Relatório
     * @returns {string}
     */
    exportAsHTML(report) {
        let html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${report.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #007bff; color: white; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <h1>${report.name}</h1>
                <p><em>${report.description}</em></p>
                <p><small>Gerado em: ${new Date(report.generatedAt).toLocaleString('pt-BR')}</small></p>
        `;

        // Summary
        if (report.summary) {
            html += '<div class="summary"><h2>Resumo</h2><pre>' + JSON.stringify(report.summary, null, 2) + '</pre></div>';
        }

        // Data table
        if (report.data && Array.isArray(report.data) && report.data.length > 0) {
            html += '<h2>Dados</h2><table><thead><tr>';

            const headers = Object.keys(report.data[0]);
            headers.forEach(h => {
                html += `<th>${h}</th>`;
            });
            html += '</tr></thead><tbody>';

            report.data.forEach(row => {
                html += '<tr>';
                headers.forEach(h => {
                    const value = row[h];
                    const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
                    html += `<td>${displayValue || ''}</td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
        }

        html += '</body></html>';
        return html;
    }

    /**
     * Obter filtro de período ativo
     */
    getActivePeriodFilter() {
        // Tentar obter do AdvancedFiltersBuilder primeiro (usado com dados reais)
        const advFiltersBuilder = this.app?.advancedFiltersBuilder;
        if (advFiltersBuilder && advFiltersBuilder.filters) {
            const periodFilters = advFiltersBuilder.filters.filter(f => f.type === 'periodo');
            if (periodFilters.length > 0) {
                const filter = periodFilters[0];
                // AdvancedFiltersBuilder armazena como { inicio, fim }
                return {
                    dataInicio: filter.value?.inicio,
                    dataFim: filter.value?.fim
                };
            }
        }

        // Fallback: tentar currentFilters (usado nos testes com dados mock)
        const currentPeriod = this.app?.currentFilters?.periodo;
        if (currentPeriod && (currentPeriod.dataInicio || currentPeriod.dataFim)) {
            return currentPeriod;
        }

        return null;
    }

    /**
     * Obtém todas as licenças de um servidor
     * SIMPLIFICADO: Dados já vêm normalizados do DataTransformer
     * @param {Object} servidor - Objeto servidor (dados normalizados)
     * @returns {Array<Object>} - Array de licenças
     */
    getAllLicenses(servidor) {
        // Dados já vêm prontos do DataTransformer!
        // Cada licença tem: { inicio: Date, fim: Date, tipo, descricao, meses }
        return servidor.licencas || [];
    }

    /**
     * Habilitar/desabilitar modo debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`🔍 Debug do ReportsManager: ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
    }

    /**
     * Parsear data
     */
    parseDate(value, endOfDay = false) {
        if (!value) return null;
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        if (endOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }
        return date;
    }

    /**
     * Formatar data
     */
    formatDate(dateInput, options = {}) {
        const { raw = false } = options;
        if (!dateInput) return raw ? '' : '';

        let date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (Number.isNaN(date.getTime())) return raw ? '' : '';

        if (raw) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Normalizar texto para comparação (remove acentos, mantém espaços e hífens)
     */
    normalizeText(text) {
        if (!text) return '';
        return text.toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .trim();
    }

    /**
     * Obter valor de célula com suporte a múltiplas licenças
     */
    getCellValue(servidor, column, options = {}) {
        const { raw = false, showOnlyFilteredLicenses = false } = options;

        // Para coluna de período, mostrar TODAS as licenças (dados normalizados)
        if (column === 'periodoLicenca') {
            const licenses = this.getAllLicenses(servidor) || [];

            if (licenses.length === 0) return '';

            let filtered = licenses;

            if (showOnlyFilteredLicenses) {
                const periodFilter = this.getActivePeriodFilter();
                if (periodFilter && (periodFilter.dataInicio || periodFilter.dataFim)) {
                    const filterStart = this.parseDate(periodFilter.dataInicio) || new Date(1900, 0, 1);
                    const filterEnd = this.parseDate(periodFilter.dataFim, true) || new Date(2100, 0, 1);

                    filtered = filtered.filter(lic => {
                        const inicio = lic.inicio instanceof Date ? lic.inicio : this.parseDate(lic.inicio);
                        const fim = lic.fim instanceof Date ? lic.fim : this.parseDate(lic.fim) || inicio;
                        if (!inicio) return false;
                        return inicio <= filterEnd && fim >= filterStart;
                    });
                }
            }

            if (filtered.length === 0) return '';

            // Ordenar por data de início
            filtered.sort((a, b) => (a.inicio?.getTime?.() || 0) - (b.inicio?.getTime?.() || 0));

            const segmentJoiner = raw ? '\u000a' : '\n';
            const segments = filtered.map(lic => {
                const inicio = lic.inicio ? this.formatDate(lic.inicio) : '';
                const fim = lic.fim ? this.formatDate(lic.fim) : inicio;
                return inicio ? `${inicio} até ${fim}` : '';
            }).filter(Boolean);

            return segments.join(segmentJoiner);
        }

        // Outros campos
        switch(column) {
            case 'nome':
                return servidor.nome || servidor.servidor || '';
            case 'cpf':
                return servidor.cpf || '';
            case 'cargo':
                return servidor.cargo || '';
            case 'lotacao':
                // Normalizar para preservar acentos e hífens originais
                return servidor.lotacao || servidor.lotação || '';
            case 'urgencia':
                return servidor.urgencia || servidor.nivelUrgencia || '';
            default:
                return servidor[column] || '';
        }
    }

    /**
     * Exportar dados filtrados para XLSX real
     */
    async exportToXLSX(button) {
        const data = this.getBaseDataset();

        if (data.length === 0) {
            console.warn('Nenhum dado para exportar');
            return;
        }

        if (typeof XLSX === 'undefined') {
            console.error('Biblioteca XLSX não carregada');
            return;
        }

        let originalContent = null;
        if (button) {
            originalContent = button.innerHTML;
            button.innerHTML = '<i class="bi bi-arrow-repeat"></i> Exportando...';
            button.disabled = true;
        }

        try {
            // Preparar dados para exportação (sem colunas de início/fim separadas)
            const columns = ['nome', 'cargo', 'lotacao', 'periodoLicenca', 'urgencia'];
            const header = columns.map(col => {
                const labels = {
                    nome: 'Nome',
                    cargo: 'Cargo',
                    lotacao: 'Lotação',
                    periodoLicenca: 'Períodos de Licença',
                    urgencia: 'Urgência'
                };
                return labels[col] || col;
            });

            const rows = data.map(servidor => {
                return columns.map(col => this.getCellValue(servidor, col, { raw: true, showOnlyFilteredLicenses: this.showOnlyFilteredLicenses }));
            });

            // Criar workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

            // Ajustar largura das colunas
            const columnWidths = columns.map((_, columnIndex) => {
                const headerText = header[columnIndex] ? String(header[columnIndex]) : '';
                let maxLength = headerText.length;

                rows.forEach(row => {
                    const cellValue = row[columnIndex];
                    if (cellValue === null || cellValue === undefined) return;
                    const text = String(cellValue);
                    text.replace(/\r?\n/g, '\n').split(/\n/).forEach(line => {
                        if (line.length > maxLength) {
                            maxLength = line.length;
                        }
                    });
                });

                return { wch: Math.min(Math.max(maxLength + 2, 14), 64) };
            });

            worksheet['!cols'] = columnWidths;

            // Adicionar ao workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

            // Gerar e baixar arquivo
            const fileName = `relatorio_licencas_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });

            console.log(`✅ Arquivo exportado: ${fileName}`);
        } catch (error) {
            console.error('Erro ao exportar XLSX:', error);
        } finally {
            if (button) {
                button.innerHTML = originalContent || '<i class="bi bi-file-earmark-spreadsheet"></i> Baixar Excel';
                button.disabled = false;
            }
        }
    }

    /**
     * Gerar PDF real com jsPDF
     */
    async generatePDF() {
        const data = this.getBaseDataset();

        if (data.length === 0) {
            console.warn('Nenhum dado para gerar PDF');
            return;
        }

        const btn = document.getElementById('generatePdfRedesign');
        let originalText = null;

        try {
            if (btn) {
                originalText = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando...';
                btn.disabled = true;
            }

            // Criar documento PDF
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                console.error('jsPDF não está carregado');
                return;
            }

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 14;
            let yPosition = margin + 6;

            // Cabeçalho
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text('Relatório de Licenças', pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 8;

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(120, 120, 120);
            const generatedAt = new Date();
            const dateText = `Gerado em ${generatedAt.toLocaleDateString('pt-BR')} às ${generatedAt.toLocaleTimeString('pt-BR')}`;
            doc.text(dateText, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;

            // Tabela de dados (sem colunas de início/fim separadas)
            const columns = ['nome', 'cargo', 'lotacao', 'periodoLicenca', 'urgencia'];
            const headers = ['Nome', 'Cargo', 'Lotação', 'Períodos de Licença', 'Urgência'];
            const tableData = data.map(servidor => columns.map(col => this.getCellValue(servidor, col, { showOnlyFilteredLicenses: this.showOnlyFilteredLicenses })));

            doc.autoTable({
                startY: yPosition,
                head: [headers],
                body: tableData,
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    cellWidth: 'wrap',
                },
                headStyles: {
                    fillColor: [59, 130, 246],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                },
                margin: { left: margin, right: margin },
                tableWidth: 'auto',
                theme: 'grid'
            });

            // Adicionar rodapé com número de páginas
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }

            // Baixar PDF (não abrir em nova janela)
            const fileName = `relatorio_licencas_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            console.log(`✅ PDF gerado: ${fileName}`);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
        } finally {
            if (btn) {
                btn.innerHTML = originalText || '<i class="bi bi-file-earmark-pdf"></i> Gerar PDF';
                btn.disabled = false;
            }
        }
    }

    /**
     * Obter dataset base (compatibilidade)
     */
    getBaseDataset() {
        const filtered = Array.isArray(this.app.filteredServidores) ? this.app.filteredServidores : [];
        if (filtered.length > 0) {
            return filtered;
        }
        const all = Array.isArray(this.app.allServidores) ? this.app.allServidores : [];
        return all;
    }

    // ==================== GERENCIAMENTO DE TEMPLATES ====================

    /**
     * Adiciona template customizado
     * @param {string} id - ID do template
     * @param {string} name - Nome
     * @param {string} description - Descrição
     * @param {Function} generator - Função geradora
     */
    addTemplate(id, name, description, generator) {
        this.reportTemplates[id] = { name, description, generator };
        console.log(`➕ Template de relatório adicionado: ${name}`);
    }

    /**
     * Remove template
     * @param {string} id - ID do template
     */
    removeTemplate(id) {
        if (this.reportTemplates[id]) {
            delete this.reportTemplates[id];
            console.log(`🗑️ Template de relatório removido: ${id}`);
        }
    }

    /**
     * Informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            templatesCount: Object.keys(this.reportTemplates).length,
            templateIds: Object.keys(this.reportTemplates)
        };
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.ReportsManager = ReportsManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
}
