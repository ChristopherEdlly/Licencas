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
    const DataTransformer = (typeof window !== 'undefined' && window.DataTransformer) || (typeof require !== 'undefined' && require('./DataTransformer.js'));
    const ValidationUtils = (typeof window !== 'undefined' && window.ValidationUtils) || (typeof require !== 'undefined' && require('../utilities/ValidationUtils.js'));
    function getSharePointExcelService() {
        if (typeof window !== 'undefined' && window.SharePointExcelService) return window.SharePointExcelService;
        if (typeof require !== 'undefined') {
            try {
                return require('../../2-services/SharePointExcelService.js');
            } catch (e) {
                return null;
            }
        }
        return null;
    }

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
        DEFAULT_TTL: 10 * 60 * 1000, // 10 minutos
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
     * Carrega dados a partir de uma tabela Excel hospedada no SharePoint/OneDrive via Graph
     * @param {string} fileId - ID do arquivo no drive
     * @param {string} tableName - Nome da tabela (ListObject) dentro do workbook
     * @param {Object} [options]
     */
    async function loadFromSharePointExcel(fileId, tableName, options = {}) {
        try {
            const SharePointExcelService = getSharePointExcelService();
            if (!SharePointExcelService) throw new Error('SharePointExcelService não disponível');

            // If fileId/tableName not provided, attempt automatic resolution from env config
            let resolvedFileId = fileId;
            let resolvedTableName = tableName;
            if (!resolvedFileId || !resolvedTableName) {
                try {
                    const resolved = await SharePointExcelService.resolveFileFromEnv();
                    resolvedFileId = resolvedFileId || resolved.fileId;
                    resolvedTableName = resolvedTableName || resolved.tableName;
                } catch (e) {
                    // If resolution fails, continue and let getTableInfo throw a clear error
                    console.warn('SharePoint env resolution failed:', e && e.message);
                }
            }

            let tableInfo;
            let rows;
            try {
                tableInfo = await SharePointExcelService.getTableInfo(resolvedFileId, resolvedTableName);
                rows = await SharePointExcelService.getTableRows(resolvedFileId, resolvedTableName);
                console.log('✅ Dados carregados via Workbook API (arquivo .xlsx moderno)');
            } catch (err) {
                // If Graph workbook endpoints are not available (e.g., old .xls files or WAC errors),
                // attempt download+parse fallback using the XLSX library (read-only).
                console.log('📦 Workbook API não disponível (arquivo .xls antigo?) - usando método alternativo de leitura...');
                try {
                    const fallback = await SharePointExcelService.downloadAndParseWorkbook(resolvedFileId, resolvedTableName);
                    tableInfo = fallback.tableInfo;
                    rows = fallback.rows;
                    console.log('✅ Arquivo lido com sucesso via método alternativo (XLSX library)');
                } catch (fallbackErr) {
                    console.error('❌ Falha ao ler arquivo mesmo com método alternativo:', fallbackErr.message);
                    throw fallbackErr;
                }
            }

            const columns = (tableInfo.columns || []).map(c => c.name);
            
            const data = (rows || []).map((row, idx) => {
                const values = Array.isArray(row.values) && row.values.length > 0 ? row.values[0] : [];
                
                const obj = {};

                // Mapear colunas para nomes padronizados (maiúsculas para compatibilidade com DataParser)
                columns.forEach((col, i) => {
                    // Manter nome original em MAIÚSCULAS (padrão do DataParser)
                    const normalizedCol = col.toUpperCase();
                    obj[normalizedCol] = values[i] ?? null;

                    // Adicionar versão lowercase para compatibilidade
                    obj[col.toLowerCase()] = values[i] ?? null;
                });

                // metadata
                obj.__rowIndex = idx;
                obj.__odata = { row: row };
                return obj;
            });

            console.log(`[DataLoader] ✓ SharePoint: ${data.length} linhas carregadas (formato RAW)`);

            // validação básica
            const validation = validateData(data, { type: 'licenca' });
            if (!validation.valid) {
                return {
                    source: 'sharepoint-excel',
                    state: LOADING_STATES.ERROR,
                    error: 'Dados inválidos: ' + validation.errors.join('; '),
                    data: null,
                    timestamp: Date.now(),
                    validation
                };
            }

            // salvar no cache
            const cacheKey = `spx:${resolvedFileId}:${resolvedTableName}`;
            saveToCache(cacheKey, data, { ttl: options.ttl });

            // Informar DataStateManager sobre a fonte atual para UI (fileId, tableName, tableInfo)
            try {
                if (typeof window !== 'undefined' && window.dataStateManager && typeof window.dataStateManager.setSourceMetadata === 'function') {
                    window.dataStateManager.setSourceMetadata({ fileId: resolvedFileId, tableName: resolvedTableName, tableInfo });
                }
            } catch (e) {
                console.warn('Não foi possível setar source metadata no DataStateManager:', e && e.message);
            }

            return {
                source: 'sharepoint-excel',
                state: LOADING_STATES.SUCCESS,
                data,
                count: data.length,
                timestamp: Date.now(),
                metadata: {
                    fileId: resolvedFileId,
                    tableName: resolvedTableName,
                    tableInfo
                }
            };

        } catch (error) {
            return {
                source: 'sharepoint-excel',
                state: LOADING_STATES.ERROR,
                error: error.message,
                data: null,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Backwards-compatible loader used by higher-level services.
     * Supported sources:
     *  - 'primary' -> SharePoint/OneDrive Excel resolved from env
     * 
     * RETORNA DADOS RAW (não processados) para que o chamador (App.js) processe
     * da mesma forma que processa dados locais (CSV)
     */
    async function loadFromSource(source = 'primary', options = {}) {
        if (source === 'primary') {
            // Attempt to use env resolution; caller may pass explicit fileId/tableName in options
            const fileId = options.fileId || null;
            const tableName = options.tableName || null;
            const result = await loadFromSharePointExcel(fileId, tableName, options);
            if (result && result.state === LOADING_STATES.SUCCESS) {
                // Retornar dados RAW sem processar
                // O processamento (groupByServidor + enrichServidoresBatch) será feito pelo App.js
                console.log(`[DataLoader] ✓ Retornando ${result.data.length} linhas RAW para processamento`);
                return result.data;
            }

            // propagate error for callers expecting exceptions
            throw new Error(result && result.error ? result.error : 'Failed to load primary data source');
        }

        throw new Error(`Unknown data source: ${source}`);
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
        loadFromSource,

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
