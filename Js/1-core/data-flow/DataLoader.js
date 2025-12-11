/**
 * DataLoader - Módulo de carregamento e cache de dados
 * 
 * Responsabilidades:
 * - Carregar dados de diferentes fontes
 * - Implementar cache inteligente
 * - Validar integridade dos dados
 * - Gerenciar estado de carregamento
 * 
 * @module DataLoader
 */

const DataLoader = (function () {

    // Dependências (Node.js / Browser)
    const DataParser = (typeof window !== 'undefined' && window.DataParser) || (typeof require !== 'undefined' && require('./DataParser.js'));
    const ValidationUtils = (typeof window !== 'undefined' && window.ValidationUtils) || (typeof require !== 'undefined' && require('../utilities/ValidationUtils.js'));

    /**
     * Estados de carregamento
     */
    const LOADING_STATES = {
        IDLE: 'idle',
        LOADING: 'loading',
        SUCCESS: 'success',
        ERROR: 'error',
        CACHED: 'cached'
    };

    /**
     * Tipos de fonte de dados
     */
    const DATA_SOURCES = {
        CSV: 'csv',
        JSON: 'json',
        API: 'api',
        LOCAL_STORAGE: 'localStorage',
        SESSION_STORAGE: 'sessionStorage'
    };

    /**
     * Configuração de cache
     */
    const CACHE_CONFIG = {
        DEFAULT_TTL: 5 * 60 * 1000, // 5 minutos
        MAX_SIZE: 100, // Máximo de entradas
        STORAGE_KEY: 'licencas_cache'
    };

    /**
     * Cache em memória
     */
    let memoryCache = new Map();
    let cacheMetadata = new Map();

    /**
     * Carrega dados de um arquivo CSV
     * 
     * @param {File|string} source - Arquivo ou conteúdo CSV
     * @param {Object} [options] - Opções de carregamento
     * @returns {Promise<Object>} Dados carregados
     */
    async function loadFromCSV(source, options = {}) {
        try {
            let csvContent;

            // Se for um objeto File do navegador
            if (source instanceof File || (source && source.text)) {
                csvContent = await source.text();
            } else if (typeof source === 'string') {
                csvContent = source;
            } else {
                throw new Error('Fonte CSV inválida');
            }

            const dados = DataParser.parse ? DataParser.parse(csvContent) : DataParser.parseCSV(csvContent);

            if (!dados || dados.length === 0) {
                throw new Error('CSV vazio ou inválido');
            }

            return {
                source: DATA_SOURCES.CSV,
                state: LOADING_STATES.SUCCESS,
                data: dados,
                count: dados.length,
                timestamp: Date.now(),
                metadata: {
                    fileSize: csvContent.length,
                    encoding: 'utf-8'
                }
            };
        } catch (error) {
            return {
                source: DATA_SOURCES.CSV,
                state: LOADING_STATES.ERROR,
                error: error.message,
                data: null,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Carrega dados de JSON
     * 
     * @param {string|Object} source - String JSON ou objeto
     * @param {Object} [options] - Opções de carregamento
     * @returns {Promise<Object>} Dados carregados
     */
    async function loadFromJSON(source, options = {}) {
        try {
            let dados;

            if (typeof source === 'string') {
                dados = JSON.parse(source);
            } else if (typeof source === 'object') {
                dados = source;
            } else {
                throw new Error('Fonte JSON inválida');
            }

            // Normaliza para array
            if (!Array.isArray(dados)) {
                dados = [dados];
            }

            return {
                source: DATA_SOURCES.JSON,
                state: LOADING_STATES.SUCCESS,
                data: dados,
                count: dados.length,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                source: DATA_SOURCES.JSON,
                state: LOADING_STATES.ERROR,
                error: error.message,
                data: null,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Carrega dados do localStorage
     * 
     * @param {string} key - Chave de armazenamento
     * @param {Object} [options] - Opções de carregamento
     * @returns {Object} Dados carregados
     */
    function loadFromLocalStorage(key, options = {}) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                throw new Error('localStorage não disponível');
            }

            const stored = window.localStorage.getItem(key);

            if (!stored) {
                throw new Error('Dados não encontrados no localStorage');
            }

            const parsed = JSON.parse(stored);
            const dados = Array.isArray(parsed) ? parsed : [parsed];

            return {
                source: DATA_SOURCES.LOCAL_STORAGE,
                state: LOADING_STATES.SUCCESS,
                data: dados,
                count: dados.length,
                timestamp: Date.now(),
                storageKey: key
            };
        } catch (error) {
            return {
                source: DATA_SOURCES.LOCAL_STORAGE,
                state: LOADING_STATES.ERROR,
                error: error.message,
                data: null,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Salva dados no localStorage
     * 
     * @param {string} key - Chave de armazenamento
     * @param {*} data - Dados a salvar
     * @returns {boolean} Sucesso da operação
     */
    function saveToLocalStorage(key, data) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }

            const serialized = JSON.stringify(data);
            window.localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    }

    /**
     * Carrega dados do sessionStorage
     * 
     * @param {string} key - Chave de armazenamento
     * @param {Object} [options] - Opções de carregamento
     * @returns {Object} Dados carregados
     */
    function loadFromSessionStorage(key, options = {}) {
        try {
            if (typeof window === 'undefined' || !window.sessionStorage) {
                throw new Error('sessionStorage não disponível');
            }

            const stored = window.sessionStorage.getItem(key);

            if (!stored) {
                throw new Error('Dados não encontrados no sessionStorage');
            }

            const parsed = JSON.parse(stored);
            const dados = Array.isArray(parsed) ? parsed : [parsed];

            return {
                source: DATA_SOURCES.SESSION_STORAGE,
                state: LOADING_STATES.SUCCESS,
                data: dados,
                count: dados.length,
                timestamp: Date.now(),
                storageKey: key
            };
        } catch (error) {
            return {
                source: DATA_SOURCES.SESSION_STORAGE,
                state: LOADING_STATES.ERROR,
                error: error.message,
                data: null,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Verifica se há dados em cache válidos
     * 
     * @param {string} key - Chave do cache
     * @param {number} [ttl] - Time to live em ms
     * @returns {boolean} Se cache é válido
     */
    function isCacheValid(key, ttl = CACHE_CONFIG.DEFAULT_TTL) {
        if (!memoryCache.has(key)) {
            return false;
        }

        const metadata = cacheMetadata.get(key);
        if (!metadata) {
            return false;
        }

        const age = Date.now() - metadata.timestamp;
        return age < ttl;
    }

    /**
     * Obtém dados do cache
     * 
     * @param {string} key - Chave do cache
     * @returns {*} Dados cacheados ou null
     */
    function getFromCache(key) {
        if (!memoryCache.has(key)) {
            return null;
        }

        const metadata = cacheMetadata.get(key);

        return {
            source: 'cache',
            state: LOADING_STATES.CACHED,
            data: memoryCache.get(key),
            count: memoryCache.get(key).length,
            timestamp: metadata.timestamp,
            age: Date.now() - metadata.timestamp
        };
    }

    /**
     * Salva dados no cache
     * 
     * @param {string} key - Chave do cache
     * @param {*} data - Dados a cachear
     * @param {Object} [options] - Opções de cache
     */
    function saveToCache(key, data, options = {}) {
        // Limita tamanho do cache
        if (memoryCache.size >= CACHE_CONFIG.MAX_SIZE) {
            // Remove entrada mais antiga
            const oldestKey = Array.from(cacheMetadata.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];

            memoryCache.delete(oldestKey);
            cacheMetadata.delete(oldestKey);
        }

        memoryCache.set(key, data);
        cacheMetadata.set(key, {
            timestamp: Date.now(),
            size: JSON.stringify(data).length,
            ttl: options.ttl || CACHE_CONFIG.DEFAULT_TTL
        });
    }

    /**
     * Limpa cache
     * 
     * @param {string} [key] - Chave específica (se omitida, limpa tudo)
     */
    function clearCache(key) {
        if (key) {
            memoryCache.delete(key);
            cacheMetadata.delete(key);
        } else {
            memoryCache.clear();
            cacheMetadata.clear();
        }
    }

    /**
     * Obtém estatísticas do cache
     * 
     * @returns {Object} Estatísticas
     */
    function getCacheStats() {
        const entries = Array.from(cacheMetadata.entries());
        const totalSize = entries.reduce((sum, [_, meta]) => sum + meta.size, 0);
        const avgAge = entries.length > 0 ?
            entries.reduce((sum, [_, meta]) => sum + (Date.now() - meta.timestamp), 0) / entries.length :
            0;

        return {
            size: memoryCache.size,
            maxSize: CACHE_CONFIG.MAX_SIZE,
            totalBytes: totalSize,
            avgAge,
            entries: entries.map(([key, meta]) => ({
                key,
                age: Date.now() - meta.timestamp,
                size: meta.size,
                ttl: meta.ttl
            }))
        };
    }

    /**
     * Carrega dados com cache automático
     * 
     * @param {string} key - Chave do cache
     * @param {Function} loadFn - Função de carregamento
     * @param {Object} [options] - Opções
     * @returns {Promise<Object>} Dados carregados
     */
    async function loadWithCache(key, loadFn, options = {}) {
        const useCache = options.useCache !== false;
        const ttl = options.ttl || CACHE_CONFIG.DEFAULT_TTL;

        // Verifica cache
        if (useCache && isCacheValid(key, ttl)) {
            return getFromCache(key);
        }

        // Carrega dados
        try {
            const result = await loadFn();

            if (result.state === LOADING_STATES.SUCCESS && result.data) {
                // Salva no cache
                if (useCache) {
                    saveToCache(key, result.data, { ttl });
                }
            }

            return result;
        } catch (error) {
            // Em caso de erro, tenta retornar cache expirado
            if (useCache && memoryCache.has(key)) {
                const cached = getFromCache(key);
                cached.state = LOADING_STATES.CACHED;
                cached.stale = true;
                return cached;
            }

            throw error;
        }
    }

    /**
     * Valida integridade dos dados carregados
     * 
     * @param {Array} dados - Dados a validar
     * @param {Object} [schema] - Schema de validação
     * @returns {Object} Resultado da validação
     */
    function validateData(dados, schema = {}) {
        if (!Array.isArray(dados)) {
            return {
                valid: false,
                errors: ['Dados devem ser um array'],
                warnings: []
            };
        }

        const errors = [];
        const warnings = [];

        dados.forEach((item, index) => {
            // Validações básicas
            if (!item || typeof item !== 'object') {
                errors.push(`Item ${index}: deve ser um objeto`);
                return;
            }

            // Validações específicas para licenças
            if (schema.type === 'licenca') {
                if (!item.servidor && !item.nome) {
                    warnings.push(`Item ${index}: servidor/nome não informado`);
                }

                if (item.diasAdquiridos && !ValidationUtils.isNumeric(item.diasAdquiridos)) {
                    errors.push(`Item ${index}: diasAdquiridos inválido`);
                }

                if (item.saldo && !ValidationUtils.isNumeric(item.saldo)) {
                    errors.push(`Item ${index}: saldo inválido`);
                }

                if (item.dataExpiracao && !ValidationUtils.isValidDate(item.dataExpiracao)) {
                    warnings.push(`Item ${index}: dataExpiracao inválida`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            itemsValidated: dados.length
        };
    }

    /**
     * Carrega dados de múltiplas fontes
     * 
     * @param {Array<Object>} sources - Array de fontes
     * @returns {Promise<Object>} Resultado consolidado
     */
    async function loadFromMultipleSources(sources) {
        if (!Array.isArray(sources) || sources.length === 0) {
            throw new Error('Fontes inválidas');
        }

        const results = await Promise.allSettled(
            sources.map(async (source) => {
                if (source.type === DATA_SOURCES.CSV) {
                    return await loadFromCSV(source.data, source.options);
                } else if (source.type === DATA_SOURCES.JSON) {
                    return await loadFromJSON(source.data, source.options);
                } else if (source.type === DATA_SOURCES.LOCAL_STORAGE) {
                    return loadFromLocalStorage(source.key, source.options);
                } else if (source.type === DATA_SOURCES.SESSION_STORAGE) {
                    return loadFromSessionStorage(source.key, source.options);
                } else {
                    throw new Error(`Tipo de fonte não suportado: ${source.type}`);
                }
            })
        );

        const successful = results
            .filter(r => r.status === 'fulfilled' && r.value.state === LOADING_STATES.SUCCESS)
            .map(r => r.value);

        const failed = results
            .filter(r => r.status === 'rejected' || r.value.state === LOADING_STATES.ERROR);

        // Combina todos os dados
        const allData = successful.flatMap(r => r.data || []);

        return {
            state: successful.length > 0 ? LOADING_STATES.SUCCESS : LOADING_STATES.ERROR,
            data: allData,
            count: allData.length,
            sources: {
                total: sources.length,
                successful: successful.length,
                failed: failed.length
            },
            details: successful,
            timestamp: Date.now()
        };
    }

    /**
     * Pré-carrega dados em cache
     * 
     * @param {Object} sources - Mapa de fontes (key -> loadFn)
     * @returns {Promise<Object>} Resultado do pré-carregamento
     */
    async function preloadCache(sources) {
        const results = {};

        for (const [key, loadFn] of Object.entries(sources)) {
            try {
                const result = await loadFn();
                if (result.state === LOADING_STATES.SUCCESS && result.data) {
                    saveToCache(key, result.data);
                    results[key] = { success: true, count: result.data.length };
                } else {
                    results[key] = { success: false, error: result.error };
                }
            } catch (error) {
                results[key] = { success: false, error: error.message };
            }
        }

        return {
            timestamp: Date.now(),
            results,
            cacheStats: getCacheStats()
        };
    }

    // Exporta módulo
    return {
        // Constantes
        LOADING_STATES,
        DATA_SOURCES,
        CACHE_CONFIG,

        // Funções de carregamento
        loadFromCSV,
        loadFromJSON,
        loadFromLocalStorage,
        saveToLocalStorage,
        loadFromSessionStorage,
        loadFromMultipleSources,

        // Gerenciamento de cache
        isCacheValid,
        getFromCache,
        saveToCache,
        clearCache,
        getCacheStats,
        loadWithCache,
        preloadCache,

        // Validação
        validateData
    };
})();

// Exports para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}

if (typeof window !== 'undefined') {
    window.DataLoader = DataLoader;
}
