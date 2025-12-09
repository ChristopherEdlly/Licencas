/**
 * FilterStateManager - Gerenciamento de estado dos filtros
 *
 * Responsabilidades:
 * - Armazenar filtros ativos
 * - Validar combinações de filtros
 * - Notificar mudanças (Observer Pattern)
 * - Persistir filtros no localStorage
 *
 * @module 3-managers/state/FilterStateManager
 */

class FilterStateManager {
    /**
     * Construtor privado (Singleton)
     */
    constructor() {
        // Estado dos filtros
        this._activeFilters = {
            searchTerm: '',                     // Termo de busca
            urgencies: [],                      // ['critica', 'alta', 'moderada', 'baixa']
            cargos: [],                         // Lista de cargos
            lotacoes: [],                       // Lista de lotações
            superintendencias: [],              // Lista de superintendências
            subsecretarias: [],                 // Lista de subsecretarias
            dateRange: {                        // Período de licenças
                start: null,
                end: null
            },
            ageRange: {                         // Faixa etária
                min: null,
                max: null
            },
            mesesRange: {                       // Meses de licença
                min: null,
                max: null
            },
            customFilters: []                   // Filtros customizados
        };

        // Histórico de filtros
        this._filterHistory = [];
        this._maxHistorySize = 20;

        // Observers
        this._listeners = [];

        // Carregar do localStorage se existir
        this._loadFromStorage();

        console.log('✅ FilterStateManager criado');
    }

    // ==================== GETTERS ====================

    /**
     * Retorna todos os filtros ativos
     * @returns {Object}
     */
    getActiveFilters() {
        return { ...this._activeFilters };
    }

    /**
     * Retorna filtro específico
     * @param {string} filterType - Tipo do filtro
     * @returns {*}
     */
    getFilter(filterType) {
        return this._activeFilters[filterType];
    }

    /**
     * Verifica se tem filtros ativos
     * @returns {boolean}
     */
    hasActiveFilters() {
        const filters = this._activeFilters;

        return (
            filters.searchTerm !== '' ||
            filters.urgencies.length > 0 ||
            filters.cargos.length > 0 ||
            filters.lotacoes.length > 0 ||
            filters.superintendencias.length > 0 ||
            filters.subsecretarias.length > 0 ||
            filters.dateRange.start !== null ||
            filters.dateRange.end !== null ||
            filters.ageRange.min !== null ||
            filters.ageRange.max !== null ||
            filters.mesesRange.min !== null ||
            filters.mesesRange.max !== null ||
            filters.customFilters.length > 0
        );
    }

    /**
     * Conta quantos filtros estão ativos
     * @returns {number}
     */
    getActiveFiltersCount() {
        let count = 0;
        const filters = this._activeFilters;

        if (filters.searchTerm) count++;
        if (filters.urgencies.length > 0) count++;
        if (filters.cargos.length > 0) count++;
        if (filters.lotacoes.length > 0) count++;
        if (filters.superintendencias.length > 0) count++;
        if (filters.subsecretarias.length > 0) count++;
        if (filters.dateRange.start || filters.dateRange.end) count++;
        if (filters.ageRange.min || filters.ageRange.max) count++;
        if (filters.mesesRange.min || filters.mesesRange.max) count++;
        count += filters.customFilters.length;

        return count;
    }

    // ==================== SETTERS ====================

    /**
     * Define filtro específico
     * @param {string} filterType - Tipo do filtro
     * @param {*} value - Valor do filtro
     */
    setFilter(filterType, value) {
        if (!this._activeFilters.hasOwnProperty(filterType)) {
            console.warn(`Tipo de filtro desconhecido: ${filterType}`);
            return;
        }

        this._activeFilters[filterType] = value;

        this._addToHistory(filterType, value);
        this._saveToStorage();
        this._notifyChange('filter-changed', {
            filterType,
            value,
            allFilters: this.getActiveFilters()
        });

        console.log(`🔧 Filtro atualizado: ${filterType}`);
    }

    /**
     * Define múltiplos filtros de uma vez
     * @param {Object} filters - Objeto com filtros
     */
    setFilters(filters) {
        Object.keys(filters).forEach(filterType => {
            if (this._activeFilters.hasOwnProperty(filterType)) {
                this._activeFilters[filterType] = filters[filterType];
            }
        });

        this._saveToStorage();
        this._notifyChange('filters-changed', {
            allFilters: this.getActiveFilters()
        });

        console.log(`🔧 Múltiplos filtros atualizados`);
    }

    /**
     * Adiciona valor a um filtro de array
     * @param {string} filterType - Tipo do filtro (deve ser array)
     * @param {*} value - Valor a adicionar
     */
    addToFilter(filterType, value) {
        if (!Array.isArray(this._activeFilters[filterType])) {
            console.warn(`Filtro ${filterType} não é um array`);
            return;
        }

        if (!this._activeFilters[filterType].includes(value)) {
            this._activeFilters[filterType].push(value);
            this.setFilter(filterType, this._activeFilters[filterType]);
        }
    }

    /**
     * Remove valor de um filtro de array
     * @param {string} filterType - Tipo do filtro
     * @param {*} value - Valor a remover
     */
    removeFromFilter(filterType, value) {
        if (!Array.isArray(this._activeFilters[filterType])) {
            console.warn(`Filtro ${filterType} não é um array`);
            return;
        }

        this._activeFilters[filterType] = this._activeFilters[filterType].filter(
            v => v !== value
        );
        this.setFilter(filterType, this._activeFilters[filterType]);
    }

    /**
     * Limpa filtro específico
     * @param {string} filterType - Tipo do filtro
     */
    clearFilter(filterType) {
        if (!this._activeFilters.hasOwnProperty(filterType)) {
            return;
        }

        const defaultValue = Array.isArray(this._activeFilters[filterType]) ? [] :
                            typeof this._activeFilters[filterType] === 'object' ?
                            (filterType.includes('Range') ? { start: null, end: null, min: null, max: null } : {}) :
                            '';

        this.setFilter(filterType, defaultValue);
    }

    /**
     * Limpa todos os filtros
     */
    clearAllFilters() {
        this._activeFilters = {
            searchTerm: '',
            urgencies: [],
            cargos: [],
            lotacoes: [],
            superintendencias: [],
            subsecretarias: [],
            dateRange: { start: null, end: null },
            ageRange: { min: null, max: null },
            mesesRange: { min: null, max: null },
            customFilters: []
        };

        this._saveToStorage();
        this._notifyChange('filters-cleared', {});

        console.log('🗑️ Todos os filtros limpos');
    }

    // ==================== OBSERVER PATTERN ====================

    /**
     * Registra listener para mudanças
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Função a ser chamada
     * @returns {Function} - Função para desregistrar
     */
    subscribe(eventType, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }

        const listener = { eventType, callback };
        this._listeners.push(listener);

        console.log(`👂 Listener registrado para: ${eventType}`);

        return () => this.unsubscribe(eventType, callback);
    }

    /**
     * Remove listener
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Callback a remover
     */
    unsubscribe(eventType, callback) {
        this._listeners = this._listeners.filter(
            l => !(l.eventType === eventType && l.callback === callback)
        );
    }

    /**
     * Notifica listeners
     * @private
     * @param {string} eventType - Tipo de evento
     * @param {*} data - Dados a passar
     */
    _notifyChange(eventType, data) {
        const relevantListeners = this._listeners.filter(l => l.eventType === eventType);

        relevantListeners.forEach(listener => {
            try {
                listener.callback(data);
            } catch (error) {
                console.error(`Erro ao notificar listener de ${eventType}:`, error);
            }
        });

        // Também emitir evento customizado
        if (typeof document !== 'undefined') {
            const event = new CustomEvent(eventType, { detail: data });
            document.dispatchEvent(event);
        }
    }

    // ==================== HISTÓRICO ====================

    /**
     * Adiciona entrada ao histórico
     * @private
     * @param {string} filterType - Tipo do filtro
     * @param {*} value - Valor
     */
    _addToHistory(filterType, value) {
        this._filterHistory.push({
            filterType,
            value: JSON.parse(JSON.stringify(value)), // Deep copy
            timestamp: new Date().toISOString()
        });

        if (this._filterHistory.length > this._maxHistorySize) {
            this._filterHistory.shift();
        }
    }

    /**
     * Retorna histórico de mudanças
     * @returns {Array<Object>}
     */
    getHistory() {
        return [...this._filterHistory];
    }

    /**
     * Limpa histórico
     */
    clearHistory() {
        this._filterHistory = [];
    }

    // ==================== PERSISTÊNCIA ====================

    /**
     * Salva filtros no localStorage
     * @private
     */
    _saveToStorage() {
        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            localStorage.setItem('dashboardFilters', JSON.stringify(this._activeFilters));
        } catch (error) {
            console.warn('Erro ao salvar filtros no localStorage:', error);
        }
    }

    /**
     * Carrega filtros do localStorage
     * @private
     */
    _loadFromStorage() {
        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            const stored = localStorage.getItem('dashboardFilters');
            if (stored) {
                const filters = JSON.parse(stored);
                // Merge com estrutura padrão (caso tenha novos campos)
                this._activeFilters = {
                    ...this._activeFilters,
                    ...filters
                };
                console.log('📥 Filtros carregados do localStorage');
            }
        } catch (error) {
            console.warn('Erro ao carregar filtros do localStorage:', error);
        }
    }

    // ==================== VALIDAÇÃO ====================

    /**
     * Valida se combinação de filtros é válida
     * @returns {{valid: boolean, errors: Array<string>}}
     */
    validateFilters() {
        const errors = [];

        // Validar ranges
        if (this._activeFilters.ageRange.min !== null &&
            this._activeFilters.ageRange.max !== null &&
            this._activeFilters.ageRange.min > this._activeFilters.ageRange.max) {
            errors.push('Idade mínima não pode ser maior que idade máxima');
        }

        if (this._activeFilters.mesesRange.min !== null &&
            this._activeFilters.mesesRange.max !== null &&
            this._activeFilters.mesesRange.min > this._activeFilters.mesesRange.max) {
            errors.push('Meses mínimos não podem ser maiores que meses máximos');
        }

        if (this._activeFilters.dateRange.start &&
            this._activeFilters.dateRange.end &&
            this._activeFilters.dateRange.start > this._activeFilters.dateRange.end) {
            errors.push('Data inicial não pode ser posterior à data final');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Exporta filtros como objeto
     * @returns {Object}
     */
    exportFilters() {
        return JSON.parse(JSON.stringify(this._activeFilters));
    }

    /**
     * Importa filtros de objeto
     * @param {Object} filters - Filtros a importar
     */
    importFilters(filters) {
        this.setFilters(filters);
    }

    /**
     * Retorna informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            activeFiltersCount: this.getActiveFiltersCount(),
            hasActiveFilters: this.hasActiveFilters(),
            filters: this.getActiveFilters(),
            historySize: this._filterHistory.length,
            listenersCount: this._listeners.length,
            validation: this.validateFilters()
        };
    }
}

// Criar instância global (Singleton)
if (typeof window !== 'undefined') {
    if (!window.filterStateManager) {
        window.filterStateManager = new FilterStateManager();
    }
}

// Expor classe também
if (typeof window !== 'undefined') {
    window.FilterStateManager = FilterStateManager;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterStateManager;
}
