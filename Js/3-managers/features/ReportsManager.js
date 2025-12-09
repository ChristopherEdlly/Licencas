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

        console.log('✅ ReportsManager criado');
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
