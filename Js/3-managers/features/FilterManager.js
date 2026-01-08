/**
 * FilterManager - Gerenciamento de filtros avançados
 *
 * Responsabilidades:
 * - Aplicar filtros aos dados
 * - Combinar múltiplos filtros
 * - Filtros predefinidos (templates)
 * - Validação de filtros
 *
 * @module 3-managers/features/FilterManager
 */

class FilterManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;

        // Templates de filtros predefinidos
        this.filterTemplates = {
            'urgencia-critica': {
                name: 'Urgência Crítica',
                filters: { urgencies: ['critica'] }
            },
            'urgencia-alta': {
                name: 'Urgência Alta ou Crítica',
                filters: { urgencies: ['critica', 'alta'] }
            },
            'proximos-12-meses': {
                name: 'Licenças nos próximos 12 meses',
                filters: {
                    dateRange: {
                        start: new Date(),
                        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    }
                }
            },
            'perto-aposentadoria': {
                name: 'Perto da Aposentadoria (≤ 5 anos)',
                filters: {
                    customFilters: [{
                        field: 'aposentadoria.maiorData',
                        operator: '<=',
                        value: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000)
                    }]
                }
            },
            'sem-licenca-agendada': {
                name: 'Sem Licença Agendada',
                filters: {
                    customFilters: [{
                        field: 'proximaLicenca',
                        operator: 'null',
                        value: null
                    }]
                }
            }
        };

        console.log('✅ FilterManager criado');
    }

    // ==================== APLICAR FILTROS ====================

    /**
     * Aplica filtros aos dados
     * @param {Array<Object>} data - Dados originais
     * @param {Object} filters - Objeto de filtros do FilterStateManager
     * @returns {Array<Object>}
     */
    applyFilters(data, filters) {
        if (!data || data.length === 0) {
            return [];
        }

        let filtered = [...data];

        // Aplicar cada tipo de filtro
        if (filters.searchTerm) {
            filtered = this._filterBySearch(filtered, filters.searchTerm);
        }

        if (filters.urgencies && filters.urgencies.length > 0) {
            filtered = this._filterByUrgency(filtered, filters.urgencies);
        }

        if (filters.cargos && filters.cargos.length > 0) {
            filtered = this._filterByCargos(filtered, filters.cargos);
        }

        if (filters.lotacoes && filters.lotacoes.length > 0) {
            filtered = this._filterByLotacoes(filtered, filters.lotacoes);
        }

        if (filters.superintendencias && filters.superintendencias.length > 0) {
            filtered = this._filterBySuperintendencias(filtered, filters.superintendencias);
        }

        if (filters.subsecretarias && filters.subsecretarias.length > 0) {
            filtered = this._filterBySubsecretarias(filtered, filters.subsecretarias);
        }

        if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
            filtered = this._filterByDateRange(filtered, filters.dateRange);
        }

        if (filters.ageRange && (filters.ageRange.min !== null || filters.ageRange.max !== null)) {
            filtered = this._filterByAgeRange(filtered, filters.ageRange);
        }

        if (filters.mesesRange && (filters.mesesRange.min !== null || filters.mesesRange.max !== null)) {
            filtered = this._filterByMesesRange(filtered, filters.mesesRange);
        }

        if (filters.customFilters && filters.customFilters.length > 0) {
            filtered = this._filterByCustomFilters(filtered, filters.customFilters);
        }

        return filtered;
    }

    // ==================== FILTROS INDIVIDUAIS ====================

    /**
     * Filtro por busca de texto
     * @private
     */
    _filterBySearch(data, searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return data;

        return data.filter(servidor => {
            const searchableFields = [
                servidor.servidor,
                servidor.cpf,
                servidor.cargo,
                servidor.lotacao,
                servidor.superintendencia,
                servidor.subsecretaria
            ];

            return searchableFields.some(field => {
                if (!field) return false;
                return String(field).toLowerCase().includes(term);
            });
        });
    }

    /**
     * Filtro por urgência
     * @private
     */
    _filterByUrgency(data, urgencies) {
        return data.filter(servidor => {
            return urgencies.includes(servidor.urgencia);
        });
    }

    /**
     * Filtro por cargos
     * @private
     */
    _filterByCargos(data, cargos) {
        return data.filter(servidor => {
            return cargos.includes(servidor.cargo);
        });
    }

    /**
     * Filtro por lotações
     * Suporta siglas e nomes completos (ex: SUTRI, GECAP, etc)
     * @private
     */
    _filterByLotacoes(data, lotacoes) {
        return data.filter(servidor => {
            const servidorLotacao = (servidor.lotacao || '').toUpperCase().trim();
            const servidorLotacaoNormalizada = servidor._lotacaoNormalizada || servidorLotacao;
            
            return lotacoes.some(filtroLotacao => {
                const filtroNormalizado = (filtroLotacao || '').toUpperCase().trim();
                
                // Match exato
                if (servidorLotacao === filtroNormalizado) return true;
                
                // Match por lotação normalizada
                if (servidorLotacaoNormalizada === filtroNormalizado) return true;
                
                // Match parcial (contém)
                if (servidorLotacao.includes(filtroNormalizado)) return true;
                if (servidorLotacaoNormalizada.includes(filtroNormalizado)) return true;
                
                return false;
            });
        });
    }

    /**
     * Filtro por superintendências
     * @private
     */
    _filterBySuperintendencias(data, superintendencias) {
        return data.filter(servidor => {
            return superintendencias.includes(servidor.superintendencia);
        });
    }

    /**
     * Filtro por subsecretarias
     * @private
     */
    _filterBySubsecretarias(data, subsecretarias) {
        return data.filter(servidor => {
            return subsecretarias.includes(servidor.subsecretaria);
        });
    }

    /**
     * Filtro por período de licença
     * @private
     */
    _filterByDateRange(data, dateRange) {
        return data.filter(servidor => {
            if (!servidor.proximaLicenca) return false;

            const licencaDate = new Date(servidor.proximaLicenca);

            if (dateRange.start && licencaDate < new Date(dateRange.start)) {
                return false;
            }

            if (dateRange.end && licencaDate > new Date(dateRange.end)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Filtro por faixa etária
     * @private
     */
    _filterByAgeRange(data, ageRange) {
        return data.filter(servidor => {
            if (typeof servidor.idade !== 'number') return false;

            if (ageRange.min !== null && servidor.idade < ageRange.min) {
                return false;
            }

            if (ageRange.max !== null && servidor.idade > ageRange.max) {
                return false;
            }

            return true;
        });
    }

    /**
     * Filtro por meses de licença
     * @private
     */
    _filterByMesesRange(data, mesesRange) {
        return data.filter(servidor => {
            const meses = servidor.mesesLicenca || 0;

            if (mesesRange.min !== null && meses < mesesRange.min) {
                return false;
            }

            if (mesesRange.max !== null && meses > mesesRange.max) {
                return false;
            }

            return true;
        });
    }

    /**
     * Filtro customizado
     * @private
     */
    _filterByCustomFilters(data, customFilters) {
        return data.filter(servidor => {
            return customFilters.every(filter => {
                const value = this._getNestedValue(servidor, filter.field);

                switch (filter.operator) {
                    case '=':
                    case '==':
                        return value == filter.value;
                    case '!=':
                        return value != filter.value;
                    case '>':
                        return value > filter.value;
                    case '>=':
                        return value >= filter.value;
                    case '<':
                        return value < filter.value;
                    case '<=':
                        return value <= filter.value;
                    case 'contains':
                        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
                    case 'startsWith':
                        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
                    case 'endsWith':
                        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
                    case 'null':
                        return value === null || value === undefined;
                    case 'notNull':
                        return value !== null && value !== undefined;
                    default:
                        return true;
                }
            });
        });
    }

    /**
     * Busca valor em objeto aninhado
     * @private
     * @param {Object} obj - Objeto
     * @param {string} path - Caminho (ex: 'aposentadoria.maiorData')
     * @returns {*}
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => {
            return current ? current[prop] : undefined;
        }, obj);
    }

    // ==================== TEMPLATES ====================

    /**
     * Aplica template de filtro
     * @param {string} templateId - ID do template
     * @param {Array<Object>} data - Dados
     * @returns {Array<Object>}
     */
    applyTemplate(templateId, data) {
        const template = this.filterTemplates[templateId];
        if (!template) {
            console.warn(`Template de filtro não encontrado: ${templateId}`);
            return data;
        }

        console.log(`🔧 Aplicando template: ${template.name}`);
        return this.applyFilters(data, template.filters);
    }

    /**
     * Retorna todos os templates disponíveis
     * @returns {Object}
     */
    getTemplates() {
        return { ...this.filterTemplates };
    }

    /**
     * Adiciona novo template
     * @param {string} id - ID do template
     * @param {string} name - Nome do template
     * @param {Object} filters - Filtros
     */
    addTemplate(id, name, filters) {
        this.filterTemplates[id] = { name, filters };
        console.log(`➕ Template adicionado: ${name}`);
    }

    /**
     * Remove template
     * @param {string} id - ID do template
     */
    removeTemplate(id) {
        if (this.filterTemplates[id]) {
            delete this.filterTemplates[id];
            console.log(`🗑️ Template removido: ${id}`);
        }
    }

    // ==================== EXTRAÇÃO DE VALORES ÚNICOS ====================

    /**
     * Extrai valores únicos de um campo
     * @param {Array<Object>} data - Dados
     * @param {string} field - Campo
     * @returns {Array<string>}
     */
    getUniqueValues(data, field) {
        const values = new Set();

        data.forEach(item => {
            const value = item[field];
            if (value !== null && value !== undefined && value !== '') {
                values.add(value);
            }
        });

        return Array.from(values).sort();
    }

    /**
     * Extrai todos os cargos únicos
     * @param {Array<Object>} data - Dados
     * @returns {Array<string>}
     */
    getUniqueCargos(data) {
        return this.getUniqueValues(data, 'cargo');
    }

    /**
     * Extrai todas as lotações únicas
     * @param {Array<Object>} data - Dados
     * @returns {Array<string>}
     */
    getUniqueLotacoes(data) {
        return this.getUniqueValues(data, 'lotacao');
    }

    /**
     * Extrai todas as superintendências únicas
     * @param {Array<Object>} data - Dados
     * @returns {Array<string>}
     */
    getUniqueSuperintendencias(data) {
        return this.getUniqueValues(data, 'superintendencia');
    }

    /**
     * Extrai todas as subsecretarias únicas
     * @param {Array<Object>} data - Dados
     * @returns {Array<string>}
     */
    getUniqueSubsecretarias(data) {
        return this.getUniqueValues(data, 'subsecretaria');
    }

    // ==================== ESTATÍSTICAS ====================

    /**
     * Retorna estatísticas dos filtros aplicados
     * @param {Array<Object>} originalData - Dados originais
     * @param {Array<Object>} filteredData - Dados filtrados
     * @returns {Object}
     */
    getFilterStats(originalData, filteredData) {
        const originalCount = originalData.length;
        const filteredCount = filteredData.length;
        const removedCount = originalCount - filteredCount;
        const removedPercentage = originalCount > 0 ? (removedCount / originalCount) * 100 : 0;

        return {
            original: originalCount,
            filtered: filteredCount,
            removed: removedCount,
            removedPercentage: removedPercentage.toFixed(1)
        };
    }

    // ==================== VALIDAÇÃO ====================

    /**
     * Valida se filtros são válidos
     * @param {Object} filters - Filtros a validar
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validateFilters(filters) {
        const errors = [];

        // Validar date range
        if (filters.dateRange) {
            if (filters.dateRange.start && filters.dateRange.end) {
                if (new Date(filters.dateRange.start) > new Date(filters.dateRange.end)) {
                    errors.push('Data inicial não pode ser posterior à data final');
                }
            }
        }

        // Validar age range
        if (filters.ageRange) {
            if (filters.ageRange.min !== null && filters.ageRange.max !== null) {
                if (filters.ageRange.min > filters.ageRange.max) {
                    errors.push('Idade mínima não pode ser maior que idade máxima');
                }
            }
            if (filters.ageRange.min !== null && filters.ageRange.min < 0) {
                errors.push('Idade mínima não pode ser negativa');
            }
        }

        // Validar meses range
        if (filters.mesesRange) {
            if (filters.mesesRange.min !== null && filters.mesesRange.max !== null) {
                if (filters.mesesRange.min > filters.mesesRange.max) {
                    errors.push('Meses mínimos não podem ser maiores que meses máximos');
                }
            }
            if (filters.mesesRange.min !== null && filters.mesesRange.min < 0) {
                errors.push('Meses mínimos não podem ser negativos');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Limpa filtros vazios
     * @param {Object} filters - Filtros
     * @returns {Object}
     */
    cleanEmptyFilters(filters) {
        const cleaned = {};

        Object.keys(filters).forEach(key => {
            const value = filters[key];

            if (Array.isArray(value) && value.length > 0) {
                cleaned[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                const hasValues = Object.values(value).some(v => v !== null && v !== undefined);
                if (hasValues) {
                    cleaned[key] = value;
                }
            } else if (value !== null && value !== undefined && value !== '') {
                cleaned[key] = value;
            }
        });

        return cleaned;
    }

    /**
     * Informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            templatesCount: Object.keys(this.filterTemplates).length,
            templateIds: Object.keys(this.filterTemplates)
        };
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.FilterManager = FilterManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterManager;
}
