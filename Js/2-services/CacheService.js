/**
 * CacheService - Gerenciamento de cache com IndexedDB
 *
 * Responsabilidades:
 * - Armazenar arquivos processados em IndexedDB
 * - Gerenciar expiração de cache (30 dias)
 * - Listar arquivos em cache
 * - Limpar cache antigo automaticamente
 *
 * @module 2-services/CacheService
 */

class CacheService {
    /**
     * Configurações do cache
     */
    static CONFIG = {
        DB_NAME: 'DashboardCache',
        DB_VERSION: 1,
        STORE_NAME: 'files',
        EXPIRATION_DAYS: 30
    };

    /**
     * Instância do banco de dados
     */
    static db = null;

    /**
     * Inicializa conexão com IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    static async init() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.CONFIG.DB_NAME, this.CONFIG.DB_VERSION);

            request.onerror = () => {
                console.warn('IndexedDB não disponível, cache desabilitado');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ CacheService inicializado');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Criar object store se não existir
                if (!db.objectStoreNames.contains(this.CONFIG.STORE_NAME)) {
                    const store = db.createObjectStore(this.CONFIG.STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Índices
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('lastUsed', 'lastUsed', { unique: false });

                    console.log('📦 Object store criado');
                }
            };
        });
    }

    /**
     * Salva arquivo no cache
     * @param {string} fileName - Nome do arquivo
     * @param {Array<Object>} data - Dados processados
     * @param {Object} metadata - Metadados adicionais
     * @returns {Promise<number>} - ID do registro
     */
    static async saveToCache(fileName, data, metadata = {}) {
        try {
            const db = await this.init();

            const cacheEntry = {
                name: fileName,
                data: data,
                metadata: {
                    ...metadata,
                    size: JSON.stringify(data).length,
                    recordCount: data.length
                },
                savedAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.CONFIG.STORE_NAME);

                const request = store.add(cacheEntry);

                request.onsuccess = () => {
                    console.log(`✅ Arquivo salvo no cache: ${fileName}`);
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.warn('Erro ao salvar no cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.warn('Cache não disponível:', error);
            return null;
        }
    }

    /**
     * Recupera arquivo do cache por ID
     * @param {number} id - ID do registro
     * @returns {Promise<Object|null>}
     */
    static async getFromCache(id) {
        try {
            const db = await this.init();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.CONFIG.STORE_NAME);

                const request = store.get(id);

                request.onsuccess = () => {
                    if (request.result) {
                        // Atualizar lastUsed
                        this._updateLastUsed(id);
                        resolve(request.result);
                    } else {
                        resolve(null);
                    }
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.warn('Erro ao recuperar do cache:', error);
            return null;
        }
    }

    /**
     * Lista todos os arquivos em cache
     * @returns {Promise<Array<Object>>}
     */
    static async listCachedFiles() {
        try {
            const db = await this.init();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readonly');
                const store = transaction.objectStore(this.CONFIG.STORE_NAME);

                const request = store.getAll();

                request.onsuccess = () => {
                    // Ordenar por lastUsed (mais recente primeiro)
                    const files = request.result.sort((a, b) =>
                        new Date(b.lastUsed) - new Date(a.lastUsed)
                    );
                    resolve(files);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.warn('Erro ao listar cache:', error);
            return [];
        }
    }

    /**
     * Obtém o arquivo mais recente do cache
     * @returns {Promise<Object|null>}
     */
    static async getLatestCache() {
        try {
            const files = await this.listCachedFiles();
            if (files && files.length > 0) {
                // listCachedFiles já retorna ordenado por lastUsed (mais recente primeiro)
                return files[0];
            }
            return null;
        } catch (error) {
            console.warn('Erro ao obter último cache:', error);
            return null;
        }
    }

    /**
     * Remove arquivo do cache
     * @param {number} id - ID do registro
     * @returns {Promise<boolean>}
     */
    static async removeFromCache(id) {
        try {
            const db = await this.init();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.CONFIG.STORE_NAME);

                const request = store.delete(id);

                request.onsuccess = () => {
                    console.log(`🗑️ Arquivo removido do cache: ${id}`);
                    resolve(true);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.warn('Erro ao remover do cache:', error);
            return false;
        }
    }

    /**
     * Limpa todo o cache
     * @returns {Promise<boolean>}
     */
    static async clearCache() {
        try {
            const db = await this.init();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.CONFIG.STORE_NAME);

                const request = store.clear();

                request.onsuccess = () => {
                    console.log('🗑️ Cache limpo completamente');
                    resolve(true);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.warn('Erro ao limpar cache:', error);
            return false;
        }
    }

    /**
     * Remove entradas antigas do cache (> 30 dias)
     * @returns {Promise<number>} - Número de entradas removidas
     */
    static async cleanOldEntries() {
        try {
            const files = await this.listCachedFiles();
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() - this.CONFIG.EXPIRATION_DAYS);

            let removedCount = 0;

            for (const file of files) {
                const lastUsed = new Date(file.lastUsed);
                if (lastUsed < expirationDate) {
                    await this.removeFromCache(file.id);
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                console.log(`🗑️ ${removedCount} arquivos antigos removidos do cache`);
            }

            return removedCount;
        } catch (error) {
            console.warn('Erro ao limpar entradas antigas:', error);
            return 0;
        }
    }

    /**
     * Atualiza timestamp de último uso
     * @private
     * @param {number} id - ID do registro
     */
    static async _updateLastUsed(id) {
        try {
            const db = await this.init();

            const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.CONFIG.STORE_NAME);

            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.lastUsed = new Date().toISOString();
                    store.put(record);
                }
            };
        } catch (error) {
            console.warn('Erro ao atualizar lastUsed:', error);
        }
    }

    /**
     * Atualiza timestamp do cache para evitar expiração
     * @param {string} cacheKey - Chave do cache (ex: excel_data_fileId)
     */
    static async updateTimestamp(cacheKey) {
        try {
            const db = await this.init();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.CONFIG.STORE_NAME], 'readwrite');
                const store = transaction.objectStore(this.CONFIG.STORE_NAME);

                const getRequest = store.get(cacheKey);

                getRequest.onsuccess = () => {
                    const record = getRequest.result;
                    if (record) {
                        record.timestamp = Date.now();
                        record.lastUsed = new Date().toISOString();
                        
                        const putRequest = store.put(record);
                        putRequest.onsuccess = () => {
                            console.log(`✅ Cache timestamp atualizado: ${cacheKey}`);
                            resolve();
                        };
                        putRequest.onerror = () => reject(putRequest.error);
                    } else {
                        resolve(); // Não existe no cache
                    }
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            console.warn('Erro ao atualizar timestamp:', error);
        }
    }

    /**
     * Obtém tamanho total do cache
     * @returns {Promise<{count: number, sizeBytes: number}>}
     */
    static async getCacheSize() {
        try {
            const files = await this.listCachedFiles();

            const sizeBytes = files.reduce((total, file) => {
                return total + (file.metadata?.size || 0);
            }, 0);

            return {
                count: files.length,
                sizeBytes,
                sizeMB: (sizeBytes / 1024 / 1024).toFixed(2)
            };
        } catch (error) {
            console.warn('Erro ao calcular tamanho do cache:', error);
            return { count: 0, sizeBytes: 0, sizeMB: '0.00' };
        }
    }
}

// Auto-limpar cache antigo ao inicializar
if (typeof window !== 'undefined') {
    window.CacheService = CacheService;

    // Limpar cache antigo quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            CacheService.cleanOldEntries();
        });
    } else {
        CacheService.cleanOldEntries();
    }
}
