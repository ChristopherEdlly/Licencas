/**
 * CacheManager.js
 * Gerencia cache de arquivos usando IndexedDB
 * Armazena os últimos 3 arquivos importados com timestamp
 */

class CacheManager {
    constructor() {
        this.dbName = 'LicencasDB';
        this.dbVersion = 1;
        this.storeName = 'files';
        this.maxFiles = 3; // Máximo de arquivos em cache
        this.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
        this.db = null;
    }

    /**
     * Inicializa o banco de dados IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        if (this.db) {
            console.log('✅ IndexedDB já inicializado - reutilizando conexão');
            return this.db;
        }

        console.log('🔧 Abrindo IndexedDB:', this.dbName, 'versão:', this.dbVersion);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB aberto com sucesso');
                console.log('📊 Object stores disponíveis:', Array.from(this.db.objectStoreNames));
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('🔄 Atualizando esquema do banco de dados...');
                const db = event.target.result;

                // Criar object store se não existir
                if (!db.objectStoreNames.contains(this.storeName)) {
                    console.log('📦 Criando object store:', this.storeName);
                    const objectStore = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });

                    // Índices para queries eficientes
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('fileName', 'fileName', { unique: false });
                    console.log('✅ Object store criado com índices');
                } else {
                    console.log('ℹ️ Object store já existe');
                }
            };

            request.onblocked = () => {
                console.warn('⚠️ IndexedDB bloqueado - feche outras abas com esta aplicação');
            };
        });
    }

    /**
     * Salva um arquivo no cache
     * @param {string} fileName - Nome do arquivo
     * @param {string} csvData - Dados CSV do arquivo
     * @param {Array} servidores - Array de servidores processados
     * @returns {Promise<number>} - ID do arquivo salvo
     */
    async saveFile(fileName, csvData, servidores) {
        console.log(`📦 CacheManager.saveFile chamado: ${fileName}, ${servidores.length} servidores`);
        try {
            console.log('📦 Inicializando IndexedDB...');
            await this.init();
            console.log('✅ IndexedDB inicializado - db:', this.db);

            if (!this.db) {
                throw new Error('Banco de dados não inicializado');
            }

            const fileData = {
                fileName: fileName,
                csvData: csvData,
                servidoresCount: servidores.length,
                timestamp: Date.now(),
                metadata: {
                    size: new Blob([csvData]).size,
                    servidoresWithProblems: servidores.filter(s => s.problemas?.length > 0).length,
                    tipoTabela: servidores[0]?.tipoTabela || 'unknown'
                }
            };

            console.log('📦 Criando transação para salvar arquivo...');

            return new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const objectStore = transaction.objectStore(this.storeName);
                    const request = objectStore.add(fileData);

                    request.onsuccess = async () => {
                        const fileId = request.result;
                        console.log(`✅ Arquivo "${fileName}" salvo no cache (ID: ${fileId})`);

                        // Limpar cache antigo após salvar (não await para não bloquear)
                        this.cleanOldCache().then(() => {
                            console.log('✅ Limpeza de cache concluída');
                        }).catch(err => {
                            console.warn('⚠️ Erro ao limpar cache:', err);
                        });

                        resolve(fileId);
                    };

                    request.onerror = () => {
                        console.error('❌ Erro ao adicionar arquivo:', request.error);
                        reject(request.error);
                    };

                    transaction.onerror = () => {
                        console.error('❌ Erro na transação:', transaction.error);
                        reject(transaction.error);
                    };
                } catch (transactionError) {
                    console.error('❌ Erro ao criar transação:', transactionError);
                    reject(transactionError);
                }
            });
        } catch (error) {
            console.error('❌ Erro no saveFile:', error);
            throw error;
        }
    }

    /**
     * Recupera lista de arquivos recentes
     * @param {number} limit - Quantidade máxima de arquivos
     * @returns {Promise<Array>} - Lista de arquivos
     */
    async getRecentFiles(limit = 3) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const index = objectStore.index('timestamp');

                // Cursor em ordem decrescente (mais recentes primeiro)
                const request = index.openCursor(null, 'prev');
                const files = [];

                request.onsuccess = (event) => {
                    const cursor = event.target.result;

                    if (cursor && files.length < limit) {
                        const file = cursor.value;
                        // Não incluir csvData para economizar memória
                        files.push({
                            id: file.id,
                            fileName: file.fileName,
                            timestamp: file.timestamp,
                            servidoresCount: file.servidoresCount,
                            metadata: file.metadata
                        });
                        cursor.continue();
                    } else {
                        resolve(files);
                    }
                };

                request.onerror = () => {
                    console.error('Erro ao buscar arquivos recentes:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Erro no getRecentFiles:', error);
            return [];
        }
    }

    /**
     * Carrega um arquivo específico do cache
     * @param {number} fileId - ID do arquivo
     * @returns {Promise<Object>} - Dados do arquivo
     */
    async loadFileById(fileId) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.get(fileId);

                request.onsuccess = () => {
                    if (request.result) {
                        console.log(`✅ Arquivo carregado do cache (ID: ${fileId})`);
                        resolve(request.result);
                    } else {
                        reject(new Error('Arquivo não encontrado'));
                    }
                };

                request.onerror = () => {
                    console.error('Erro ao carregar arquivo:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Erro no loadFileById:', error);
            throw error;
        }
    }

    /**
     * Deleta um arquivo do cache
     * @param {number} fileId - ID do arquivo
     * @returns {Promise<void>}
     */
    async deleteFile(fileId) {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.delete(fileId);

                request.onsuccess = () => {
                    console.log(`🗑️ Arquivo removido do cache (ID: ${fileId})`);
                    resolve();
                };

                request.onerror = () => {
                    console.error('Erro ao deletar arquivo:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Erro no deleteFile:', error);
            throw error;
        }
    }

    /**
     * Limpa cache antigo (mantém apenas os últimos N arquivos)
     * @returns {Promise<void>}
     */
    async cleanOldCache() {
        try {
            const allFiles = await this.getAllFiles();

            // Ordenar por timestamp (mais recentes primeiro)
            allFiles.sort((a, b) => b.timestamp - a.timestamp);

            // Deletar arquivos além do limite ou muito antigos
            const now = Date.now();
            for (let i = 0; i < allFiles.length; i++) {
                const file = allFiles[i];
                const age = now - file.timestamp;

                // Manter só os últimos maxFiles E que não sejam muito antigos
                if (i >= this.maxFiles || age > this.maxAge) {
                    await this.deleteFile(file.id);
                }
            }
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }

    /**
     * Retorna todos os arquivos (para limpeza)
     * @returns {Promise<Array>}
     */
    async getAllFiles() {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.getAll();

                request.onsuccess = () => {
                    resolve(request.result || []);
                };

                request.onerror = () => {
                    console.error('Erro ao buscar todos os arquivos:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Erro no getAllFiles:', error);
            return [];
        }
    }

    /**
     * Limpa todo o cache
     * @returns {Promise<void>}
     */
    async clearAll() {
        try {
            await this.init();

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const objectStore = transaction.objectStore(this.storeName);
                const request = objectStore.clear();

                request.onsuccess = () => {
                    console.log('🗑️ Todo o cache foi limpo');
                    resolve();
                };

                request.onerror = () => {
                    console.error('Erro ao limpar cache:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Erro no clearAll:', error);
            throw error;
        }
    }

    /**
     * Verifica se IndexedDB está disponível
     * @returns {boolean}
     */
    static isAvailable() {
        return typeof indexedDB !== 'undefined';
    }

    /**
     * Formata timestamp para exibição
     * @param {number} timestamp
     * @returns {string}
     */
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Menos de 1 minuto
        if (diff < 60000) {
            return 'Agora mesmo';
        }

        // Menos de 1 hora
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
        }

        // Menos de 24 horas
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
        }

        // Menos de 7 dias
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days} dia${days > 1 ? 's' : ''} atrás`;
        }

        // Mais de 7 dias: mostrar data
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Formata tamanho de arquivo
     * @param {number} bytes
     * @returns {string}
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;
}
