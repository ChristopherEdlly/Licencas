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
            'nome',
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
     * Executa busca (melhorada com SmartSearch)
     * @param {string} query - Termo de busca
     * @param {Array<Object>} data - Dados para buscar
     * @param {Object} options - Opções de busca
     * @returns {Array<Object>}
     */
    search(query, data, options = {}) {
        if (!query || query.trim() === '') {
            return data;
        }

        if (!data || data.length === 0) {
            return [];
        }

        // Merge options
        const searchOptions = { ...this.options, ...options };

        // Adicionar ao histórico
        this._addToHistory(query);

        this.currentQuery = query;

        let results;

        // Detectar tipo de busca
        if (query.includes(',')) {
            // Busca multi-campo (separado por vírgula)
            console.log('🔍 Busca multi-campo:', query);
            results = this._multiFieldSearch(query, data, searchOptions);
        } else {
            // Usar busca exata E fuzzy combinadas
            console.log('🔍 Busca inteligente:', query);
            const exactResults = this._exactSearch(query, data, searchOptions);

            // Se query >= 3 chars, também fazer busca fuzzy e combinar resultados
            if (query.length >= 3) {
                const fuzzyResults = this._fuzzySearch(query, data, searchOptions);

                // Combinar resultados (removendo duplicatas)
                const combinedMap = new Map();

                // Adicionar resultados exatos primeiro (prioridade)
                exactResults.forEach(item => {
                    const key = item.cpf || item.servidor || JSON.stringify(item);
                    if (key) combinedMap.set(key, item);
                });

                // Adicionar resultados fuzzy
                fuzzyResults.forEach(item => {
                    const key = item.cpf || item.servidor || JSON.stringify(item);
                    if (key && !combinedMap.has(key)) {
                        combinedMap.set(key, item);
                    }
                });

                results = Array.from(combinedMap.values());
                console.log(`  → Combinados: ${exactResults.length} exatos + ${fuzzyResults.length} fuzzy = ${results.length} total`);
            } else {
                results = exactResults;
            }
        }

        console.log(`✅ Busca "${query}": ${results.length} resultados`);

        return results.slice(0, searchOptions.maxResults);
    }

    /**
     * Busca exata com suporte a múltiplas palavras
     * @private
     */
    _exactSearch(query, data, options) {
        const normalizedQuery = this._normalizeString(query, options);
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

        const results = data.filter(item => {
            // Buscar em cada campo
            return this.searchableFields.some(field => {
                const value = item[field];
                if (!value) return false;

                const normalizedValue = this._normalizeString(String(value), options);
                const valueWords = normalizedValue.split(/\s+/);

                // Verificar se TODAS as palavras da query estão presentes no valor
                const matches = queryWords.every(qWord =>
                    valueWords.some(vWord => vWord.startsWith(qWord) || vWord.includes(qWord))
                );

                return matches;
            });
        });

        console.log(`  → Busca exata encontrou ${results.length} resultados`);
        return results;
    }

    /**
     * Busca multi-campo (separado por vírgula)
     * Ex: "Maria, GEROT, 60" busca Maria E GEROT E 60
     * @private
     */
    _multiFieldSearch(query, data, options) {
        const terms = query.split(',').map(t => t.trim()).filter(t => t.length > 0);

        const results = data.filter(item => {
            // Item deve conter TODOS os termos (em qualquer campo)
            return terms.every(term => {
                const normalizedTerm = this._normalizeString(term, options);

                return this.searchableFields.some(field => {
                    const value = item[field];
                    if (!value) return false;

                    const normalizedValue = this._normalizeString(String(value), options);
                    return normalizedValue.includes(normalizedTerm);
                });
            });
        });

        console.log(`  → Busca multi-campo encontrou ${results.length} resultados`);
        return results;
    }

    /**
     * Busca fuzzy (tolerante a erros) usando FuzzySearch.js
     * @private
     * @param {string} query - Termo de busca
     * @param {Array<Object>} data - Dados
     * @param {Object} options - Opções
     * @returns {Array<Object>}
     */
    _fuzzySearch(query, data, options) {
        // Usar FuzzySearch se disponível, senão fallback para método interno
        if (typeof FuzzySearch !== 'undefined') {
            return this._fuzzySearchAdvanced(query, data, options);
        }

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
     * Busca fuzzy avançada usando FuzzySearch.js (com busca por palavras)
     * @private
     */
    _fuzzySearchAdvanced(query, data, options) {
        const normalizedQuery = FuzzySearch.normalize(query).toLowerCase();
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

        const results = data.filter(item => {
            // Buscar em cada campo
            return this.searchableFields.some(field => {
                const value = item[field];
                if (!value) return false;

                const normalizedValue = FuzzySearch.normalize(String(value)).toLowerCase();
                const valueWords = normalizedValue.split(/\s+/);

                // Para cada palavra da query, verificar se há similaridade com alguma palavra do valor
                const matches = queryWords.every(qWord =>
                    valueWords.some(vWord => {
                        const similarity = FuzzySearch.similarity(qWord, vWord);
                        return similarity >= 0.7; // 70% de similaridade
                    })
                );

                return matches;
            });
        });

        console.log(`  → Busca fuzzy encontrou ${results.length} resultados (threshold: 0.7)`);
        return results;
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
