/**
 * DataFilter - Sistema de Filtragem de Dados
 * 
 * Responsável por:
 * - Filtragem por texto (busca fuzzy)
 * - Filtragem por urgência
 * - Filtragem por datas
 * - Filtragem por múltiplos critérios
 * - Filtragem hierárquica (lotação)
 * 
 * Dependências: DateUtils, ValidationUtils
 */

// Compatibilidade Node.js / Browser
const DateUtils = typeof require !== 'undefined' ? require('../utilities/DateUtils.js') : window.DateUtils;
const ValidationUtils = typeof require !== 'undefined' ? require('../utilities/ValidationUtils.js') : window.ValidationUtils;

const DataFilter = (function() {
    'use strict';

    // ============================================================
    // FILTRAGEM POR TEXTO
    // ============================================================

    /**
     * Normaliza texto para busca (remove acentos, lowercase)
     * @param {string} text - Texto para normalizar
     * @returns {string} Texto normalizado
     */
    function normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
    }

    /**
     * Verifica se um texto contém o termo de busca (fuzzy)
     * @param {string} text - Texto para verificar
     * @param {string} searchTerm - Termo de busca
     * @returns {boolean} true se contém
     */
    function textContains(text, searchTerm) {
        if (!searchTerm || !text) return true;
        
        const normalizedText = normalizeText(text);
        const normalizedSearch = normalizeText(searchTerm);
        
        return normalizedText.includes(normalizedSearch);
    }

    /**
     * Filtra por texto em múltiplos campos
     * @param {Array<Object>} data - Dados para filtrar
     * @param {string} searchTerm - Termo de busca
     * @param {Array<string>} fields - Campos para buscar
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByText(data, searchTerm, fields = ['nome', 'cpf', 'matricula', 'cargo', 'lotacao']) {
        if (!Array.isArray(data)) return [];
        if (!searchTerm || searchTerm.trim() === '') return data;

        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                if (!value) return false;
                return textContains(String(value), searchTerm);
            });
        });
    }

    /**
     * Filtra por múltiplos termos (AND logic)
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Array<string>} searchTerms - Termos de busca
     * @param {Array<string>} fields - Campos para buscar
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByMultipleTerms(data, searchTerms, fields) {
        if (!Array.isArray(data) || !Array.isArray(searchTerms)) return data;
        
        let result = data;
        
        for (const term of searchTerms) {
            result = filterByText(result, term, fields);
        }
        
        return result;
    }

    // ============================================================
    // FILTRAGEM POR URGÊNCIA
    // ============================================================

    /**
     * Filtra por níveis de urgência
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Array<string>} urgencies - Urgências aceitas
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByUrgency(data, urgencies) {
        if (!Array.isArray(data)) return [];
        if (!Array.isArray(urgencies) || urgencies.length === 0) return data;

        return data.filter(item => {
            return urgencies.includes(item.urgencia);
        });
    }

    /**
     * Filtra por urgência mínima
     * @param {Array<Object>} data - Dados para filtrar
     * @param {string} minUrgency - Urgência mínima ('critica', 'alta', 'media', 'baixa')
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByMinUrgency(data, minUrgency) {
        if (!Array.isArray(data)) return [];
        if (!minUrgency) return data;

        const urgencyOrder = {
            'critica': 1,
            'alta': 2,
            'media': 3,
            'baixa': 4,
            'em-gozo': 5,
            'expirada': 6,
            'indefinida': 7
        };

        const minLevel = urgencyOrder[minUrgency] || 999;

        return data.filter(item => {
            const itemLevel = urgencyOrder[item.urgencia] || 999;
            return itemLevel <= minLevel;
        });
    }

    // ============================================================
    // FILTRAGEM POR DATAS
    // ============================================================

    /**
     * Filtra por data de início (período)
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByStartDate(data, startDate, endDate) {
        if (!Array.isArray(data)) return [];
        if (!startDate && !endDate) return data;

        return data.filter(item => {
            if (!item.dataInicio) return false;

            const itemDate = new Date(item.dataInicio);
            itemDate.setHours(0, 0, 0, 0);

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return itemDate >= start && itemDate <= end;
            } else if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                return itemDate >= start;
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);
                return itemDate <= end;
            }

            return true;
        });
    }

    /**
     * Filtra por data de fim (período)
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByEndDate(data, startDate, endDate) {
        if (!Array.isArray(data)) return [];
        if (!startDate && !endDate) return data;

        return data.filter(item => {
            if (!item.dataFim) return false;

            const itemDate = new Date(item.dataFim);
            itemDate.setHours(0, 0, 0, 0);

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                return itemDate >= start && itemDate <= end;
            } else if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                return itemDate >= start;
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);
                return itemDate <= end;
            }

            return true;
        });
    }

    /**
     * Filtra por intervalo de dias até o início
     * @param {Array<Object>} data - Dados para filtrar
     * @param {number} minDays - Dias mínimos
     * @param {number} maxDays - Dias máximos
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByDaysUntilStart(data, minDays, maxDays) {
        if (!Array.isArray(data)) return [];
        if (minDays === undefined && maxDays === undefined) return data;

        return data.filter(item => {
            const dias = item.diasAteInicio;
            if (dias === undefined || dias === null) return false;

            if (minDays !== undefined && maxDays !== undefined) {
                return dias >= minDays && dias <= maxDays;
            } else if (minDays !== undefined) {
                return dias >= minDays;
            } else if (maxDays !== undefined) {
                return dias <= maxDays;
            }

            return true;
        });
    }

    // ============================================================
    // FILTRAGEM POR VALORES ESPECÍFICOS
    // ============================================================

    /**
     * Filtra por valores em um campo específico
     * @param {Array<Object>} data - Dados para filtrar
     * @param {string} field - Campo para filtrar
     * @param {Array<any>} values - Valores aceitos
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByField(data, field, values) {
        if (!Array.isArray(data)) return [];
        if (!field || !Array.isArray(values) || values.length === 0) return data;

        return data.filter(item => {
            return values.includes(item[field]);
        });
    }

    /**
     * Filtra por cargo
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Array<string>} cargos - Cargos aceitos
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByCargo(data, cargos) {
        return filterByField(data, 'cargo', cargos);
    }

    /**
     * Filtra por lotação
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Array<string>} lotacoes - Lotações aceitas
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByLotacao(data, lotacoes) {
        return filterByField(data, 'lotacao', lotacoes);
    }

    /**
     * Filtra por status
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Array<string>} statuses - Status aceitos
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByStatus(data, statuses) {
        return filterByField(data, 'status', statuses);
    }

    // ============================================================
    // FILTRAGEM POR VALORES NUMÉRICOS
    // ============================================================

    /**
     * Filtra por intervalo numérico
     * @param {Array<Object>} data - Dados para filtrar
     * @param {string} field - Campo numérico
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByRange(data, field, min, max) {
        if (!Array.isArray(data)) return [];
        if (!field || (min === undefined && max === undefined)) return data;

        return data.filter(item => {
            const value = item[field];
            if (value === undefined || value === null) return false;

            if (min !== undefined && max !== undefined) {
                return value >= min && value <= max;
            } else if (min !== undefined) {
                return value >= min;
            } else if (max !== undefined) {
                return value <= max;
            }

            return true;
        });
    }

    /**
     * Filtra por dias de licença
     * @param {Array<Object>} data - Dados para filtrar
     * @param {number} minDias - Dias mínimos
     * @param {number} maxDias - Dias máximos
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByDias(data, minDias, maxDias) {
        return filterByRange(data, 'dias', minDias, maxDias);
    }

    /**
     * Filtra por saldo
     * @param {Array<Object>} data - Dados para filtrar
     * @param {number} minSaldo - Saldo mínimo
     * @param {number} maxSaldo - Saldo máximo
     * @returns {Array<Object>} Dados filtrados
     */
    function filterBySaldo(data, minSaldo, maxSaldo) {
        return filterByRange(data, 'saldo', minSaldo, maxSaldo);
    }

    // ============================================================
    // FILTRAGEM POR CONDIÇÕES BOOLEANAS
    // ============================================================

    /**
     * Filtra por condição customizada
     * @param {Array<Object>} data - Dados para filtrar
     * @param {Function} predicate - Função de teste (item => boolean)
     * @returns {Array<Object>} Dados filtrados
     */
    function filterByCondition(data, predicate) {
        if (!Array.isArray(data)) return [];
        if (typeof predicate !== 'function') return data;

        return data.filter(predicate);
    }

    /**
     * Filtra licenças com saldo
     * @param {Array<Object>} data - Dados para filtrar
     * @returns {Array<Object>} Dados filtrados
     */
    function filterWithSaldo(data) {
        return filterByCondition(data, item => {
            return item.saldo && item.saldo > 0;
        });
    }

    /**
     * Filtra licenças expiradas
     * @param {Array<Object>} data - Dados para filtrar
     * @returns {Array<Object>} Dados filtrados
     */
    function filterExpired(data) {
        return filterByCondition(data, item => {
            return item.status === 'expirada' || item.status === 'expirada-com-saldo';
        });
    }

    /**
     * Filtra licenças ativas (não expiradas)
     * @param {Array<Object>} data - Dados para filtrar
     * @returns {Array<Object>} Dados filtrados
     */
    function filterActive(data) {
        return filterByCondition(data, item => {
            return item.status !== 'expirada' && item.status !== 'expirada-com-saldo';
        });
    }

    // ============================================================
    // FILTRAGEM MÚLTIPLA (PIPELINE)
    // ============================================================

    /**
     * Aplica múltiplos filtros em sequência
     * @param {Array<Object>} data - Dados iniciais
     * @param {Object} filters - Objeto com critérios de filtro
     * @returns {Array<Object>} Dados filtrados
     */
    function applyFilters(data, filters) {
        if (!Array.isArray(data)) return [];
        if (!filters || typeof filters !== 'object') return data;

        let result = data;

        // Texto
        if (filters.searchTerm) {
            result = filterByText(result, filters.searchTerm, filters.searchFields);
        }

        // Urgência
        if (filters.urgencies && filters.urgencies.length > 0) {
            result = filterByUrgency(result, filters.urgencies);
        }

        // Urgência mínima
        if (filters.minUrgency) {
            result = filterByMinUrgency(result, filters.minUrgency);
        }

        // Datas de início
        if (filters.startDateRange) {
            result = filterByStartDate(
                result,
                filters.startDateRange.min,
                filters.startDateRange.max
            );
        }

        // Datas de fim
        if (filters.endDateRange) {
            result = filterByEndDate(
                result,
                filters.endDateRange.min,
                filters.endDateRange.max
            );
        }

        // Dias até início
        if (filters.daysUntilStart) {
            result = filterByDaysUntilStart(
                result,
                filters.daysUntilStart.min,
                filters.daysUntilStart.max
            );
        }

        // Cargo
        if (filters.cargos && filters.cargos.length > 0) {
            result = filterByCargo(result, filters.cargos);
        }

        // Lotação
        if (filters.lotacoes && filters.lotacoes.length > 0) {
            result = filterByLotacao(result, filters.lotacoes);
        }

        // Status
        if (filters.statuses && filters.statuses.length > 0) {
            result = filterByStatus(result, filters.statuses);
        }

        // Dias de licença
        if (filters.diasRange) {
            result = filterByDias(result, filters.diasRange.min, filters.diasRange.max);
        }

        // Saldo
        if (filters.saldoRange) {
            result = filterBySaldo(result, filters.saldoRange.min, filters.saldoRange.max);
        }

        // Filtros booleanos
        if (filters.onlyWithSaldo) {
            result = filterWithSaldo(result);
        }

        if (filters.onlyActive) {
            result = filterActive(result);
        }

        if (filters.onlyExpired) {
            result = filterExpired(result);
        }

        // Condição customizada
        if (filters.customCondition && typeof filters.customCondition === 'function') {
            result = filterByCondition(result, filters.customCondition);
        }

        return result;
    }

    /**
     * Conta quantos itens passariam por cada filtro
     * @param {Array<Object>} data - Dados para analisar
     * @param {Object} filters - Filtros para testar
     * @returns {Object} Contagens por filtro
     */
    function countByFilters(data, filters) {
        if (!Array.isArray(data) || !filters) return {};

        const counts = {};

        if (filters.urgencies) {
            counts.byUrgency = {};
            for (const urgency of filters.urgencies) {
                counts.byUrgency[urgency] = filterByUrgency(data, [urgency]).length;
            }
        }

        if (filters.cargos) {
            counts.byCargo = {};
            for (const cargo of filters.cargos) {
                counts.byCargo[cargo] = filterByCargo(data, [cargo]).length;
            }
        }

        if (filters.statuses) {
            counts.byStatus = {};
            for (const status of filters.statuses) {
                counts.byStatus[status] = filterByStatus(data, [status]).length;
            }
        }

        return counts;
    }

    // ============================================================
    // EXPORTAÇÃO
    // ============================================================

    return {
        // Texto
        normalizeText,
        textContains,
        filterByText,
        filterByMultipleTerms,
        
        // Urgência
        filterByUrgency,
        filterByMinUrgency,
        
        // Datas
        filterByStartDate,
        filterByEndDate,
        filterByDaysUntilStart,
        
        // Valores específicos
        filterByField,
        filterByCargo,
        filterByLotacao,
        filterByStatus,
        
        // Valores numéricos
        filterByRange,
        filterByDias,
        filterBySaldo,
        
        // Condições booleanas
        filterByCondition,
        filterWithSaldo,
        filterExpired,
        filterActive,
        
        // Pipeline
        applyFilters,
        countByFilters
    };
})();

// Exportação para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataFilter;
}
