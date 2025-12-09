/**
 * DataAggregator - Agregação e Estatísticas de Dados
 * 
 * Responsável por:
 * - Calcular estatísticas gerais
 * - Agrupar dados por diferentes critérios
 * - Gerar dados para gráficos
 * - Calcular totalizações
 * - Análises temporais
 * 
 * Dependências: DateUtils
 */

// Compatibilidade Node.js / Browser
const DateUtils = typeof require !== 'undefined' ? require('../utilities/DateUtils.js') : window.DateUtils;

const DataAggregator = (function() {
    'use strict';

    // ============================================================
    // ESTATÍSTICAS GERAIS
    // ============================================================

    /**
     * Calcula estatísticas básicas de um array
     * @param {Array<Object>} data - Dados para agregar
     * @returns {Object} Estatísticas gerais
     */
    function calculateBasicStats(data) {
        if (!Array.isArray(data)) return null;

        return {
            total: data.length,
            totalDias: data.reduce((sum, item) => sum + (item.dias || 0), 0),
            totalGozados: data.reduce((sum, item) => sum + (item.diasGozados || 0), 0),
            totalSaldo: data.reduce((sum, item) => sum + (item.saldo || 0), 0),
            mediaDias: data.length > 0 ? data.reduce((sum, item) => sum + (item.dias || 0), 0) / data.length : 0,
            mediaSaldo: data.length > 0 ? data.reduce((sum, item) => sum + (item.saldo || 0), 0) / data.length : 0
        };
    }

    /**
     * Calcula estatísticas por urgência
     * @param {Array<Object>} data - Dados para agregar
     * @returns {Object} Contagens por urgência
     */
    function countByUrgency(data) {
        if (!Array.isArray(data)) return {};

        const counts = {
            critica: 0,
            alta: 0,
            media: 0,
            baixa: 0,
            'em-gozo': 0,
            expirada: 0,
            indefinida: 0
        };

        for (const item of data) {
            const urgencia = item.urgencia;
            if (counts.hasOwnProperty(urgencia)) {
                counts[urgencia]++;
            }
        }

        return counts;
    }

    /**
     * Calcula estatísticas por status
     * @param {Array<Object>} data - Dados para agregar
     * @returns {Object} Contagens por status
     */
    function countByStatus(data) {
        if (!Array.isArray(data)) return {};

        const counts = {};

        for (const item of data) {
            const status = item.status || 'indefinido';
            counts[status] = (counts[status] || 0) + 1;
        }

        return counts;
    }

    // ============================================================
    // AGRUPAMENTO DE DADOS
    // ============================================================

    /**
     * Agrupa dados por campo específico
     * @param {Array<Object>} data - Dados para agrupar
     * @param {string} field - Campo para agrupar
     * @returns {Object} Dados agrupados { valor: [items] }
     */
    function groupBy(data, field) {
        if (!Array.isArray(data) || !field) return {};

        const grouped = {};

        for (const item of data) {
            const key = item[field] || 'não-definido';
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        }

        return grouped;
    }

    /**
     * Agrupa por urgência com dados completos
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por urgência
     */
    function groupByUrgency(data) {
        return groupBy(data, 'urgencia');
    }

    /**
     * Agrupa por cargo
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por cargo
     */
    function groupByCargo(data) {
        return groupBy(data, 'cargo');
    }

    /**
     * Agrupa por lotação
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por lotação
     */
    function groupByLotacao(data) {
        return groupBy(data, 'lotacao');
    }

    /**
     * Agrupa por status
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por status
     */
    function groupByStatus(data) {
        return groupBy(data, 'status');
    }

    // ============================================================
    // AGRUPAMENTO TEMPORAL
    // ============================================================

    /**
     * Agrupa por mês (data de início)
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por mês { 'YYYY-MM': count }
     */
    function groupByMonth(data) {
        if (!Array.isArray(data)) return {};

        const grouped = {};

        for (const item of data) {
            if (!item.dataInicio) continue;

            const date = new Date(item.dataInicio);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            grouped[key] = (grouped[key] || 0) + 1;
        }

        return grouped;
    }

    /**
     * Agrupa por ano
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por ano { 'YYYY': count }
     */
    function groupByYear(data) {
        if (!Array.isArray(data)) return {};

        const grouped = {};

        for (const item of data) {
            if (!item.dataInicio) continue;

            const date = new Date(item.dataInicio);
            const key = String(date.getFullYear());

            grouped[key] = (grouped[key] || 0) + 1;
        }

        return grouped;
    }

    /**
     * Agrupa por trimestre
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por trimestre { 'YYYY-Q1': count }
     */
    function groupByQuarter(data) {
        if (!Array.isArray(data)) return {};

        const grouped = {};

        for (const item of data) {
            if (!item.dataInicio) continue;

            const date = new Date(item.dataInicio);
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            const key = `${date.getFullYear()}-Q${quarter}`;

            grouped[key] = (grouped[key] || 0) + 1;
        }

        return grouped;
    }

    /**
     * Agrupa por semana
     * @param {Array<Object>} data - Dados para agrupar
     * @returns {Object} Dados agrupados por semana { 'YYYY-Www': count }
     */
    function groupByWeek(data) {
        if (!Array.isArray(data)) return {};

        const grouped = {};

        for (const item of data) {
            if (!item.dataInicio) continue;

            const date = new Date(item.dataInicio);
            const week = getWeekNumber(date);
            const key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;

            grouped[key] = (grouped[key] || 0) + 1;
        }

        return grouped;
    }

    /**
     * Calcula número da semana no ano
     * @param {Date} date - Data para calcular
     * @returns {number} Número da semana (1-53)
     */
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // ============================================================
    // AGREGAÇÃO COM ESTATÍSTICAS
    // ============================================================

    /**
     * Agrupa e calcula estatísticas por campo
     * @param {Array<Object>} data - Dados para agregar
     * @param {string} field - Campo para agrupar
     * @returns {Object} { valor: { count, totalDias, totalSaldo, items } }
     */
    function groupWithStats(data, field) {
        if (!Array.isArray(data) || !field) return {};

        const grouped = {};

        for (const item of data) {
            const key = item[field] || 'não-definido';
            
            if (!grouped[key]) {
                grouped[key] = {
                    count: 0,
                    totalDias: 0,
                    totalGozados: 0,
                    totalSaldo: 0,
                    items: []
                };
            }

            grouped[key].count++;
            grouped[key].totalDias += item.dias || 0;
            grouped[key].totalGozados += item.diasGozados || 0;
            grouped[key].totalSaldo += item.saldo || 0;
            grouped[key].items.push(item);
        }

        return grouped;
    }

    /**
     * Top N itens por critério
     * @param {Array<Object>} data - Dados para analisar
     * @param {string} field - Campo para ordenar
     * @param {number} n - Quantidade de itens
     * @param {string} order - 'asc' ou 'desc'
     * @returns {Array<Object>} Top N itens
     */
    function topN(data, field, n = 10, order = 'desc') {
        if (!Array.isArray(data) || !field) return [];

        const sorted = [...data].sort((a, b) => {
            const valueA = a[field] || 0;
            const valueB = b[field] || 0;
            return order === 'desc' ? valueB - valueA : valueA - valueB;
        });

        return sorted.slice(0, n);
    }

    /**
     * Top cargos por quantidade de licenças
     * @param {Array<Object>} data - Dados para analisar
     * @param {number} n - Quantidade de cargos
     * @returns {Array<Object>} Top cargos
     */
    function topCargosByCount(data, n = 10) {
        if (!Array.isArray(data)) return [];

        const counts = {};

        for (const item of data) {
            const cargo = item.cargo || 'não-definido';
            counts[cargo] = (counts[cargo] || 0) + 1;
        }

        const sorted = Object.entries(counts)
            .map(([cargo, count]) => ({ cargo, count }))
            .sort((a, b) => b.count - a.count);

        return sorted.slice(0, n);
    }

    /**
     * Top lotações por quantidade de licenças
     * @param {Array<Object>} data - Dados para analisar
     * @param {number} n - Quantidade de lotações
     * @returns {Array<Object>} Top lotações
     */
    function topLotacoesByCount(data, n = 10) {
        if (!Array.isArray(data)) return [];

        const counts = {};

        for (const item of data) {
            const lotacao = item.lotacao || 'não-definido';
            counts[lotacao] = (counts[lotacao] || 0) + 1;
        }

        const sorted = Object.entries(counts)
            .map(([lotacao, count]) => ({ lotacao, count }))
            .sort((a, b) => b.count - a.count);

        return sorted.slice(0, n);
    }

    // ============================================================
    // DADOS PARA GRÁFICOS
    // ============================================================

    /**
     * Prepara dados para gráfico de pizza
     * @param {Object} grouped - Dados agrupados
     * @returns {Object} { labels: [], values: [] }
     */
    function toPieChartData(grouped) {
        if (!grouped || typeof grouped !== 'object') return { labels: [], values: [] };

        const labels = [];
        const values = [];

        for (const [key, value] of Object.entries(grouped)) {
            labels.push(key);
            values.push(typeof value === 'object' ? value.count : value);
        }

        return { labels, values };
    }

    /**
     * Prepara dados para gráfico de barras
     * @param {Object} grouped - Dados agrupados
     * @param {string} labelField - Campo para label
     * @param {string} valueField - Campo para valor
     * @returns {Object} { labels: [], values: [] }
     */
    function toBarChartData(grouped, labelField = 'label', valueField = 'count') {
        if (!grouped || typeof grouped !== 'object') return { labels: [], values: [] };

        const labels = [];
        const values = [];

        for (const [key, value] of Object.entries(grouped)) {
            labels.push(key);
            
            if (typeof value === 'object') {
                values.push(value[valueField] || 0);
            } else {
                values.push(value);
            }
        }

        return { labels, values };
    }

    /**
     * Prepara dados para gráfico de linha (temporal)
     * @param {Object} grouped - Dados agrupados por período
     * @returns {Object} { labels: [], values: [] }
     */
    function toLineChartData(grouped) {
        if (!grouped || typeof grouped !== 'object') return { labels: [], values: [] };

        // Ordena por período
        const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));

        const labels = sorted.map(([key]) => key);
        const values = sorted.map(([, value]) => typeof value === 'object' ? value.count : value);

        return { labels, values };
    }

    // ============================================================
    // ANÁLISES AVANÇADAS
    // ============================================================

    /**
     * Calcula percentis
     * @param {Array<Object>} data - Dados para analisar
     * @param {string} field - Campo numérico
     * @param {Array<number>} percentiles - Percentis desejados (ex: [25, 50, 75])
     * @returns {Object} Percentis calculados
     */
    function calculatePercentiles(data, field, percentiles = [25, 50, 75, 90, 95]) {
        if (!Array.isArray(data) || !field) return {};

        const values = data
            .map(item => item[field])
            .filter(v => v !== null && v !== undefined && !isNaN(v))
            .sort((a, b) => a - b);

        if (values.length === 0) return {};

        const result = {};

        for (const p of percentiles) {
            const index = Math.ceil((p / 100) * values.length) - 1;
            result[`p${p}`] = values[Math.max(0, index)];
        }

        return result;
    }

    /**
     * Calcula distribuição de frequência
     * @param {Array<Object>} data - Dados para analisar
     * @param {string} field - Campo numérico
     * @param {number} bins - Número de faixas
     * @returns {Array<Object>} Distribuição { range, count }
     */
    function calculateDistribution(data, field, bins = 10) {
        if (!Array.isArray(data) || !field) return [];

        const values = data
            .map(item => item[field])
            .filter(v => v !== null && v !== undefined && !isNaN(v));

        if (values.length === 0) return [];

        const min = Math.min(...values);
        const max = Math.max(...values);
        const binSize = (max - min) / bins;

        const distribution = [];

        for (let i = 0; i < bins; i++) {
            const rangeStart = min + (i * binSize);
            const rangeEnd = rangeStart + binSize;
            
            const count = values.filter(v => v >= rangeStart && v < rangeEnd).length;
            
            distribution.push({
                range: `${rangeStart.toFixed(0)}-${rangeEnd.toFixed(0)}`,
                rangeStart,
                rangeEnd,
                count
            });
        }

        return distribution;
    }

    /**
     * Calcula tendência ao longo do tempo
     * @param {Object} timeGrouped - Dados agrupados por tempo
     * @returns {Object} { trend: 'up'|'down'|'stable', change: number }
     */
    function calculateTrend(timeGrouped) {
        if (!timeGrouped || typeof timeGrouped !== 'object') {
            return { trend: 'stable', change: 0 };
        }

        const sorted = Object.entries(timeGrouped).sort((a, b) => a[0].localeCompare(b[0]));
        
        if (sorted.length < 2) {
            return { trend: 'stable', change: 0 };
        }

        const firstValue = typeof sorted[0][1] === 'object' ? sorted[0][1].count : sorted[0][1];
        const lastValue = typeof sorted[sorted.length - 1][1] === 'object' 
            ? sorted[sorted.length - 1][1].count 
            : sorted[sorted.length - 1][1];

        const change = lastValue - firstValue;
        const percentChange = firstValue > 0 ? (change / firstValue) * 100 : 0;

        let trend = 'stable';
        if (percentChange > 5) trend = 'up';
        else if (percentChange < -5) trend = 'down';

        return { trend, change, percentChange };
    }

    // ============================================================
    // COMPARAÇÕES E ANÁLISES
    // ============================================================

    /**
     * Compara dois períodos
     * @param {Array<Object>} period1 - Dados do período 1
     * @param {Array<Object>} period2 - Dados do período 2
     * @returns {Object} Comparação
     */
    function comparePeriods(period1, period2) {
        if (!Array.isArray(period1) || !Array.isArray(period2)) return null;

        const stats1 = calculateBasicStats(period1);
        const stats2 = calculateBasicStats(period2);

        return {
            period1: stats1,
            period2: stats2,
            difference: {
                total: stats2.total - stats1.total,
                totalDias: stats2.totalDias - stats1.totalDias,
                totalSaldo: stats2.totalSaldo - stats1.totalSaldo
            },
            percentChange: {
                total: stats1.total > 0 ? ((stats2.total - stats1.total) / stats1.total) * 100 : 0,
                totalDias: stats1.totalDias > 0 ? ((stats2.totalDias - stats1.totalDias) / stats1.totalDias) * 100 : 0,
                totalSaldo: stats1.totalSaldo > 0 ? ((stats2.totalSaldo - stats1.totalSaldo) / stats1.totalSaldo) * 100 : 0
            }
        };
    }

    // ============================================================
    // EXPORTAÇÃO
    // ============================================================

    return {
        // Estatísticas básicas
        calculateBasicStats,
        countByUrgency,
        countByStatus,
        
        // Agrupamento simples
        groupBy,
        groupByUrgency,
        groupByCargo,
        groupByLotacao,
        groupByStatus,
        
        // Agrupamento temporal
        groupByMonth,
        groupByYear,
        groupByQuarter,
        groupByWeek,
        
        // Agrupamento com estatísticas
        groupWithStats,
        
        // Top N
        topN,
        topCargosByCount,
        topLotacoesByCount,
        
        // Dados para gráficos
        toPieChartData,
        toBarChartData,
        toLineChartData,
        
        // Análises avançadas
        calculatePercentiles,
        calculateDistribution,
        calculateTrend,
        
        // Comparações
        comparePeriods
    };
})();

// Exportação para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataAggregator;
}
