/**
 * SearchManager - Gerenciamento de busca inteligente
 *
 * Responsabilidades:
 * - Busca fuzzy (tolerante a erros)
 * - Busca por múltiplos campos
 * - Histórico de buscas
 * - Sugestões de pesquisa
 * - Busca em tempo real
 *
 * @module 3-managers/features/SearchManager
 */

class SearchManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;

        // Estado da busca
        this.currentQuery = '';
        this.searchHistory = [];
        this.maxHistorySize = 20;

        // Campos pesquisáveis
        this.searchableFields = [
            'servidor',
            'cpf',
            'cargo',
            'lotacao',
            'superintendencia',
            'subsecretaria'
        ];

        // Opções de busca
        this.options = {
            fuzzyThreshold: 0.6,        // Limiar de similaridade (0-1)
            maxResults: 100,             // Máximo de resultados
            caseSensitive: false,
            accentSensitive: false,
            partialMatch: true           // Permite matches parciais
        };

        // Carregar histórico do localStorage
        this._loadHistory();

        console.log('✅ SearchManager criado');
    }

    // ==================== BUSCA PRINCIPAL ====================

    /**
     * Executa busca
     * @param {string} query - Termo de busca
     * @param {Array<Object>} data - Dados para buscar
     * @param {Object} options - Opções de busca
     * @returns {Array<Object>}
     */
    search(query, data, options = {}) {
        if (!query || query.trim() === '') {
            return data;
        }

        // Merge options
        const searchOptions = { ...this.options, ...options };

        // Normalizar query
        const normalizedQuery = this._normalizeString(query, searchOptions);

        // Adicionar ao histórico
        this._addToHistory(query);

        // Buscar em todos os campos
        const results = data.filter(item => {
            return this.searchableFields.some(field => {
                const value = item[field];
                if (!value) return false;

                const normalizedValue = this._normalizeString(String(value), searchOptions);

                // Match exato ou parcial
                if (searchOptions.partialMatch) {
                    return normalizedValue.includes(normalizedQuery);
                } else {
                    return normalizedValue === normalizedQuery;
                }
            });
        });

        this.currentQuery = query;

        // Se não encontrou resultados e fuzzy está ativo, tentar busca fuzzy
        if (results.length === 0 && searchOptions.fuzzyThreshold > 0) {
            return this._fuzzySearch(query, data, searchOptions);
        }

        return results.slice(0, searchOptions.maxResults);
    }

    /**
     * Busca fuzzy (tolerante a erros)
     * @private
     * @param {string} query - Termo de busca
     * @param {Array<Object>} data - Dados
     * @param {Object} options - Opções
     * @returns {Array<Object>}
     */
    _fuzzySearch(query, data, options) {
        const normalizedQuery = this._normalizeString(query, options);

        const scoredResults = data.map(item => {
            let maxScore = 0;

            // Calcular score para cada campo
            this.searchableFields.forEach(field => {
                const value = item[field];
                if (!value) return;

                const normalizedValue = this._normalizeString(String(value), options);
                const score = this._calculateSimilarity(normalizedQuery, normalizedValue);

                if (score > maxScore) {
                    maxScore = score;
                }
            });

            return { item, score: maxScore };
        });

        // Filtrar por limiar e ordenar
        return scoredResults
            .filter(result => result.score >= options.fuzzyThreshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, options.maxResults)
            .map(result => result.item);
    }

    /**
     * Calcula similaridade entre duas strings (Levenshtein simplificado)
     * @private
     * @param {string} str1 - String 1
     * @param {string} str2 - String 2
     * @returns {number} - Score 0-1
     */
    _calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;

        // Match parcial
        if (str2.includes(str1)) {
            return 0.9; // Alta similaridade para substring exata
        }

        // Levenshtein distance simplificado
        const distance = this._levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);

        return 1 - (distance / maxLength);
    }

    /**
     * Calcula distância de Levenshtein
     * @private
     * @param {string} str1 - String 1
     * @param {string} str2 - String 2
     * @returns {number}
     */
    _levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substituição
                        matrix[i][j - 1] + 1,     // inserção
                        matrix[i - 1][j] + 1      // remoção
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // ==================== BUSCA POR CAMPO ====================

    /**
     * Busca em campo específico
     * @param {string} field - Nome do campo
     * @param {string} query - Termo de busca
     * @param {Array<Object>} data - Dados
     * @returns {Array<Object>}
     */
    searchByField(field, query, data) {
        if (!query || query.trim() === '') {
            return data;
        }

        const normalizedQuery = this._normalizeString(query, this.options);

        return data.filter(item => {
            const value = item[field];
            if (!value) return false;

            const normalizedValue = this._normalizeString(String(value), this.options);

            return normalizedValue.includes(normalizedQuery);
        });
    }

    /**
     * Busca por CPF
     * @param {string} cpf - CPF a buscar
     * @param {Array<Object>} data - Dados
     * @returns {Array<Object>}
     */
    searchByCPF(cpf, data) {
        // Remover pontuação do CPF
        const cleanCPF = cpf.replace(/\D/g, '');

        return data.filter(item => {
            if (!item.cpf) return false;
            const itemCPF = item.cpf.replace(/\D/g, '');
            return itemCPF.includes(cleanCPF);
        });
    }

    /**
     * Busca por nome
     * @param {string} name - Nome a buscar
     * @param {Array<Object>} data - Dados
     * @returns {Array<Object>}
     */
    searchByName(name, data) {
        return this.searchByField('servidor', name, data);
    }

    // ==================== NORMALIZAÇÃO ====================

    /**
     * Normaliza string para busca
     * @private
     * @param {string} str - String a normalizar
     * @param {Object} options - Opções
     * @returns {string}
     */
    _normalizeString(str, options) {
        let normalized = str;

        if (!options.caseSensitive) {
            normalized = normalized.toLowerCase();
        }

        if (!options.accentSensitive) {
            normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        return normalized.trim();
    }

    // ==================== HISTÓRICO ====================

    /**
     * Adiciona termo ao histórico
     * @private
     * @param {string} query - Termo de busca
     */
    _addToHistory(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return;

        // Remover duplicatas
        this.searchHistory = this.searchHistory.filter(q => q !== trimmedQuery);

        // Adicionar no início
        this.searchHistory.unshift(trimmedQuery);

        // Limitar tamanho
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }

        this._saveHistory();
    }

    /**
     * Retorna histórico de buscas
     * @returns {Array<string>}
     */
    getHistory() {
        return [...this.searchHistory];
    }

    /**
     * Limpa histórico de buscas
     */
    clearHistory() {
        this.searchHistory = [];
        this._saveHistory();
        console.log('🗑️ Histórico de buscas limpo');
    }

    /**
     * Salva histórico no localStorage
     * @private
     */
    _saveHistory() {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Erro ao salvar histórico de buscas:', error);
        }
    }

    /**
     * Carrega histórico do localStorage
     * @private
     */
    _loadHistory() {
        if (typeof localStorage === 'undefined') return;

        try {
            const stored = localStorage.getItem('searchHistory');
            if (stored) {
                this.searchHistory = JSON.parse(stored);
                console.log('📥 Histórico de buscas carregado');
            }
        } catch (error) {
            console.warn('Erro ao carregar histórico de buscas:', error);
        }
    }

    // ==================== SUGESTÕES ====================

    /**
     * Gera sugestões de pesquisa
     * @param {string} query - Termo parcial
     * @param {Array<Object>} data - Dados
     * @param {number} maxSuggestions - Máximo de sugestões
     * @returns {Array<string>}
     */
    getSuggestions(query, data, maxSuggestions = 5) {
        if (!query || query.trim() === '') {
            return this.searchHistory.slice(0, maxSuggestions);
        }

        const normalizedQuery = this._normalizeString(query, this.options);
        const suggestions = new Set();

        // Buscar em todos os campos
        data.forEach(item => {
            this.searchableFields.forEach(field => {
                const value = item[field];
                if (!value) return;

                const normalizedValue = this._normalizeString(String(value), this.options);

                if (normalizedValue.includes(normalizedQuery)) {
                    suggestions.add(String(value));
                }
            });

            if (suggestions.size >= maxSuggestions) {
                return;
            }
        });

        return Array.from(suggestions).slice(0, maxSuggestions);
    }

    // ==================== CONFIGURAÇÕES ====================

    /**
     * Define opções de busca
     * @param {Object} options - Opções
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
        console.log('⚙️ Opções de busca atualizadas');
    }

    /**
     * Retorna opções atuais
     * @returns {Object}
     */
    getOptions() {
        return { ...this.options };
    }

    /**
     * Define campos pesquisáveis
     * @param {Array<string>} fields - Lista de campos
     */
    setSearchableFields(fields) {
        this.searchableFields = fields;
        console.log('📋 Campos pesquisáveis atualizados');
    }

    /**
     * Retorna campos pesquisáveis
     * @returns {Array<string>}
     */
    getSearchableFields() {
        return [...this.searchableFields];
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Retorna query atual
     * @returns {string}
     */
    getCurrentQuery() {
        return this.currentQuery;
    }

    /**
     * Limpa query atual
     */
    clearCurrentQuery() {
        this.currentQuery = '';
    }

    /**
     * Informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            currentQuery: this.currentQuery,
            historySize: this.searchHistory.length,
            searchableFields: this.searchableFields,
            options: this.options
        };
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.SearchManager = SearchManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}
