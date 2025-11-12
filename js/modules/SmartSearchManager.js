/**
 * SmartSearchManager.js
 * Gerencia busca inteligente com fuzzy search, autocomplete e multi-campo
 * Integra com FuzzySearch.js para busca tolerante a erros
 */

class SmartSearchManager {
    constructor(dashboard) {
        this.dashboard = dashboard;

        // Configurações
        this.config = {
            fuzzyThreshold: 0.6,          // Similaridade mínima para fuzzy (60%)
            debounceDelay: 300,           // Delay para busca (ms)
            autocompleteDelay: 150,       // Delay para autocomplete (ms)
            maxAutocompleteSuggestions: 5, // Máximo de sugestões
            minQueryLength: 2             // Tamanho mínimo da query
        };

        // Cache
        this.autocompleteCache = new Map();
        this.searchCache = new Map();
        this.debounceTimer = null;
        this.autocompleteTimer = null;

        // Estado
        this.lastQuery = '';
        this.searchHistory = this.loadSearchHistory();
    }

    /**
     * Busca principal - ponto de entrada
     * Decide qual tipo de busca usar baseado na query
     *
     * @param {string} query - Termo de busca
     * @param {Array} servidores - Lista de servidores
     * @returns {Array} - Servidores filtrados
     */
    search(query, servidores) {
        if (!query || !servidores || servidores.length === 0) {
            return servidores || [];
        }

        // Salvar query no histórico
        this.addToHistory(query);
        this.lastQuery = query;

        // NÃO USAR CACHE - o cache estava retornando resultados vazios errados
        // const cacheKey = this.getCacheKey(query, servidores.length);
        // if (this.searchCache.has(cacheKey)) {
        //     console.log('🎯 Busca do cache:', query);
        //     return this.searchCache.get(cacheKey);
        // }

        let results;

        // Detectar tipo de busca
        if (query.includes(',')) {
            // Busca multi-campo (separado por vírgula)
            console.log('🔍 Busca multi-campo:', query);
            results = this.multiFieldSearch(query, servidores);
        } else {
            // Usar busca exata E fuzzy combinadas
            console.log('🔍 Busca substring:', query);
            const exactResults = this.exactSearch(query, servidores);
            
            // Se query >= 3 chars, também fazer busca fuzzy e combinar resultados
            if (query.length >= 3) {
                console.log('🔍 Também fazendo busca fuzzy...');
                const fuzzyResults = this.fuzzySearch(query, servidores);
                
                // Combinar resultados (removendo duplicatas)
                const combinedMap = new Map();
                
                // Adicionar resultados exatos primeiro (prioridade)
                exactResults.forEach(s => {
                    const key = s.nome || s.servidor || s.cpf;
                    if (key) combinedMap.set(key, s);
                });
                
                // Adicionar resultados fuzzy
                fuzzyResults.forEach(s => {
                    const key = s.nome || s.servidor || s.cpf;
                    if (key && !combinedMap.has(key)) {
                        combinedMap.set(key, s);
                    }
                });
                
                results = Array.from(combinedMap.values());
                console.log(`  → Combinados: ${exactResults.length} exatos + ${fuzzyResults.length} fuzzy = ${results.length} total`);
            } else {
                results = exactResults;
            }
        }

        console.log(`✅ Busca "${query}": ${results.length} resultados`);

        // NÃO salvar no cache por enquanto
        // this.searchCache.set(cacheKey, results);

        return results;
    }

    /**
     * Busca exata (substring simples)
     * Usada para queries muito curtas
     *
     * @param {string} query
     * @param {Array} servidores
     * @returns {Array}
     */
    exactSearch(query, servidores) {
        const normalizedQuery = FuzzySearch.normalize(query).toLowerCase();
        
        // Dividir a query em palavras
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

        const results = servidores.filter(servidor => {
            const nome = FuzzySearch.normalize(servidor.nome || servidor.servidor || '').toLowerCase();
            const cargo = FuzzySearch.normalize(servidor.cargo || '').toLowerCase();
            const lotacao = FuzzySearch.normalize(servidor.lotacao || '').toLowerCase();
            
            // Dividir o nome em palavras
            const nomeWords = nome.split(/\s+/);

            // Verificar se TODAS as palavras da query estão presentes no nome (ou cargo ou lotação)
            const matchesName = queryWords.every(qWord => 
                nomeWords.some(nWord => nWord.startsWith(qWord) || nWord.includes(qWord))
            );
            
            const matchesCargo = queryWords.every(qWord => cargo.includes(qWord));
            const matchesLotacao = queryWords.every(qWord => lotacao.includes(qWord));

            return matchesName || matchesCargo || matchesLotacao;
        });

        console.log(`  → Busca exata encontrou ${results.length} resultados`);
        return results;
    }

    /**
     * Busca fuzzy tolerante a erros
     *
     * @param {string} query
     * @param {Array} servidores
     * @returns {Array}
     */
    fuzzySearch(query, servidores) {
        const normalizedQuery = FuzzySearch.normalize(query).toLowerCase();
        const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
        
        const results = servidores.filter(servidor => {
            const nome = FuzzySearch.normalize(servidor.nome || servidor.servidor || '').toLowerCase();
            const cargo = FuzzySearch.normalize(servidor.cargo || '').toLowerCase();
            const lotacao = FuzzySearch.normalize(servidor.lotacao || '').toLowerCase();
            
            // Dividir em palavras
            const nomeWords = nome.split(/\s+/);
            const cargoWords = cargo.split(/\s+/);
            const lotacaoWords = lotacao.split(/\s+/);
            
            // Para cada palavra da query, verificar se há similaridade com alguma palavra do nome/cargo/lotação
            const matchesNome = queryWords.every(qWord => 
                nomeWords.some(nWord => {
                    const similarity = FuzzySearch.similarity(qWord, nWord);
                    return similarity >= 0.7; // 70% de similaridade (mais permissivo)
                })
            );
            
            const matchesCargo = queryWords.every(qWord => 
                cargoWords.some(cWord => {
                    const similarity = FuzzySearch.similarity(qWord, cWord);
                    return similarity >= 0.7;
                })
            );
            
            const matchesLotacao = queryWords.every(qWord => 
                lotacaoWords.some(lWord => {
                    const similarity = FuzzySearch.similarity(qWord, lWord);
                    return similarity >= 0.7;
                })
            );
            
            return matchesNome || matchesCargo || matchesLotacao;
        });

        console.log(`  → Busca fuzzy encontrou ${results.length} resultados (threshold: 0.7)`);
        return results;
    }

    /**
     * Busca multi-campo (separado por vírgula)
     * Ex: "Maria, GEROT, 60" busca Maria E GEROT E 60
     *
     * @param {string} query
     * @param {Array} servidores
     * @returns {Array}
     */
    multiFieldSearch(query, servidores) {
        // Separar termos por vírgula
        const terms = query.split(',').map(t => t.trim()).filter(t => t.length > 0);

        if (terms.length === 0) return servidores;

        console.log('📝 Termos de busca:', terms);

        // Filtrar servidores que atendem TODOS os termos
        return servidores.filter(servidor => {
            return terms.every(term => {
                return this.matchesTerm(servidor, term);
            });
        });
    }

    /**
     * Verifica se servidor atende a um termo de busca
     *
     * @param {Object} servidor
     * @param {string} term
     * @returns {boolean}
     */
    matchesTerm(servidor, term) {
        const normalizedTerm = FuzzySearch.normalize(term);

        // Campos para buscar
        const fields = [
            servidor.nome || servidor.servidor || '',
            servidor.cargo || '',
            servidor.lotacao || '',
            servidor.superintendencia || '',
            servidor.subsecretaria || '',
            String(servidor.idade || ''),
            String(servidor.cpf || '')
        ];

        // Busca em cada campo
        for (const field of fields) {
            const normalizedField = FuzzySearch.normalize(field);

            // Busca exata primeiro
            if (normalizedField.includes(normalizedTerm)) {
                return true;
            }

            // Busca fuzzy se termo tem tamanho mínimo
            if (normalizedTerm.length >= 3) {
                const similarity = FuzzySearch.similarity(normalizedTerm, normalizedField);
                if (similarity >= this.config.fuzzyThreshold) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Retorna sugestões de autocomplete
     *
     * @param {string} partial - Termo parcial
     * @param {number} limit - Máximo de sugestões
     * @returns {Array<{text, type, score}>}
     */
    getAutocompleteSuggestions(partial, limit = null) {
        if (!partial || partial.length < 2) return [];

        limit = limit || this.config.maxAutocompleteSuggestions;

        // Verificar cache
        const cacheKey = `${partial.toLowerCase()}_${limit}`;
        if (this.autocompleteCache.has(cacheKey)) {
            return this.autocompleteCache.get(cacheKey);
        }

        const suggestions = [];
        const servidores = this.dashboard.allServidores || [];
        const normalizedPartial = FuzzySearch.normalize(partial);

        // Coletar valores únicos
        const names = new Set();
        const cargos = new Set();
        const lotacoes = new Set();

        for (const servidor of servidores) {
            if (servidor.nome || servidor.servidor) names.add(servidor.nome || servidor.servidor);
            if (servidor.cargo) cargos.add(servidor.cargo);
            if (servidor.lotacao) lotacoes.add(servidor.lotacao);
        }

        // Buscar em nomes
        const nameMatches = FuzzySearch.search(partial, Array.from(names), 0.5);
        for (const match of nameMatches.slice(0, limit)) {
            suggestions.push({
                text: match.item,
                type: 'nome',
                score: match.score
            });
        }

        // Buscar em cargos
        const cargoMatches = FuzzySearch.search(partial, Array.from(cargos), 0.5);
        for (const match of cargoMatches.slice(0, Math.floor(limit / 2))) {
            suggestions.push({
                text: match.item,
                type: 'cargo',
                score: match.score * 0.9 // Peso menor para cargos
            });
        }

        // Buscar em lotações
        const lotacaoMatches = FuzzySearch.search(partial, Array.from(lotacoes), 0.5);
        for (const match of lotacaoMatches.slice(0, Math.floor(limit / 2))) {
            suggestions.push({
                text: match.item,
                type: 'lotacao',
                score: match.score * 0.8 // Peso menor para lotações
            });
        }

        // Ordenar por score e limitar
        const sorted = suggestions
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Salvar no cache
        this.autocompleteCache.set(cacheKey, sorted);

        return sorted;
    }

    /**
     * Aplica highlight nos resultados
     *
     * @param {Array} servidores
     * @param {string} query
     * @returns {Array} - Servidores com campo _highlight
     */
    highlightResults(servidores, query) {
        if (!query) return servidores;

        return servidores.map(servidor => {
            return {
                ...servidor,
                _highlight: {
                    servidor: FuzzySearch.highlight(servidor.servidor || '', query),
                    cargo: FuzzySearch.highlight(servidor.cargo || '', query),
                    lotacao: FuzzySearch.highlight(servidor.lotacao || '', query)
                }
            };
        });
    }

    /**
     * Busca com debounce
     *
     * @param {string} query
     * @param {Function} callback
     */
    searchWithDebounce(query, callback) {
        clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
            const results = this.search(query, this.dashboard.allServidores);
            callback(results);
        }, this.config.debounceDelay);
    }

    /**
     * Autocomplete com debounce
     *
     * @param {string} partial
     * @param {Function} callback
     */
    autocompleteWithDebounce(partial, callback) {
        clearTimeout(this.autocompleteTimer);

        this.autocompleteTimer = setTimeout(() => {
            const suggestions = this.getAutocompleteSuggestions(partial);
            callback(suggestions);
        }, this.config.autocompleteDelay);
    }

    /**
     * Limpa cache
     */
    clearCache() {
        this.searchCache.clear();
        this.autocompleteCache.clear();
        console.log('🧹 Cache de busca limpo');
    }

    /**
     * Adiciona query ao histórico
     *
     * @param {string} query
     */
    addToHistory(query) {
        if (!query || query.length < 2) return;

        // Remove duplicatas
        this.searchHistory = this.searchHistory.filter(q => q !== query);

        // Adiciona no início
        this.searchHistory.unshift(query);

        // Limita a 10 itens
        this.searchHistory = this.searchHistory.slice(0, 10);

        // Salva no localStorage
        this.saveSearchHistory();
    }

    /**
     * Retorna histórico de buscas
     *
     * @returns {Array<string>}
     */
    getHistory() {
        return this.searchHistory;
    }

    /**
     * Salva histórico no localStorage
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Erro ao salvar histórico de busca:', error);
        }
    }

    /**
     * Carrega histórico do localStorage
     *
     * @returns {Array<string>}
     */
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('searchHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Erro ao carregar histórico de busca:', error);
            return [];
        }
    }

    /**
     * Limpa histórico
     */
    clearHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }

    /**
     * Gera chave de cache
     *
     * @param {string} query
     * @param {number} servidoresCount
     * @returns {string}
     */
    getCacheKey(query, servidoresCount) {
        return `${query.toLowerCase()}_${servidoresCount}`;
    }

    /**
     * Retorna estatísticas da busca
     *
     * @returns {Object}
     */
    getStats() {
        return {
            lastQuery: this.lastQuery,
            cacheSize: this.searchCache.size,
            autocompleteCacheSize: this.autocompleteCache.size,
            historySize: this.searchHistory.length,
            config: this.config
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SmartSearchManager = SmartSearchManager;
}
