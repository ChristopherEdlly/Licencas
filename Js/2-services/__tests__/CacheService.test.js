/**
 * @jest-environment jsdom
 */

describe('CacheService', () => {
    let mockDB;
    let mockTransaction;
    let mockStore;

    beforeEach(() => {
        // Mock IndexedDB
        mockStore = {
            add: jest.fn((data) => ({
                onsuccess: null,
                onerror: null,
                result: 1
            })),
            get: jest.fn((id) => ({
                onsuccess: null,
                onerror: null,
                result: null
            })),
            getAll: jest.fn(() => ({
                onsuccess: null,
                onerror: null,
                result: []
            })),
            delete: jest.fn(() => ({
                onsuccess: null,
                onerror: null
            })),
            clear: jest.fn(() => ({
                onsuccess: null,
                onerror: null
            })),
            put: jest.fn(() => ({
                onsuccess: null,
                onerror: null
            })),
            createIndex: jest.fn()
        };

        mockTransaction = {
            objectStore: jest.fn(() => mockStore)
        };

        mockDB = {
            transaction: jest.fn(() => mockTransaction),
            objectStoreNames: {
                contains: jest.fn(() => false)
            },
            createObjectStore: jest.fn(() => mockStore)
        };

        global.indexedDB = {
            open: jest.fn((name, version) => ({
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null,
                result: mockDB
            }))
        };

        // Reset singleton
        CacheService.db = null;
    });

    describe('init', () => {
        test('deve inicializar banco de dados', async () => {
            const openRequest = global.indexedDB.open();

            setTimeout(() => {
                openRequest.result = mockDB;
                openRequest.onsuccess();
            }, 0);

            const db = await CacheService.init();

            expect(db).toBe(mockDB);
            expect(CacheService.db).toBe(mockDB);
        });

        test('deve retornar instância existente se já inicializado', async () => {
            CacheService.db = mockDB;

            const db = await CacheService.init();

            expect(db).toBe(mockDB);
            expect(global.indexedDB.open).not.toHaveBeenCalled();
        });

        test('deve criar object store no upgrade', (done) => {
            const openRequest = global.indexedDB.open();

            mockDB.objectStoreNames.contains = jest.fn(() => false);

            setTimeout(() => {
                const event = { target: { result: mockDB } };
                openRequest.onupgradeneeded(event);

                expect(mockDB.createObjectStore).toHaveBeenCalledWith(
                    'files',
                    { keyPath: 'id', autoIncrement: true }
                );
                expect(mockStore.createIndex).toHaveBeenCalledWith('name', 'name', { unique: false });
                expect(mockStore.createIndex).toHaveBeenCalledWith('lastUsed', 'lastUsed', { unique: false });

                done();
            }, 0);
        });

        test('deve rejeitar se IndexedDB falhar', async () => {
            const openRequest = global.indexedDB.open();

            setTimeout(() => {
                openRequest.error = new Error('DB Error');
                openRequest.onerror();
            }, 0);

            await expect(CacheService.init()).rejects.toThrow();
        });
    });

    describe('saveToCache', () => {
        test('deve salvar arquivo no cache', async () => {
            CacheService.db = mockDB;

            const testData = [
                { nome: 'João', idade: 30 },
                { nome: 'Maria', idade: 25 }
            ];

            const addRequest = mockStore.add();

            setTimeout(() => {
                addRequest.result = 1;
                addRequest.onsuccess();
            }, 0);

            const result = await CacheService.saveToCache('test.csv', testData, { source: 'upload' });

            expect(result).toBe(1);
            expect(mockDB.transaction).toHaveBeenCalledWith(['files'], 'readwrite');
            expect(mockStore.add).toHaveBeenCalled();

            const savedData = mockStore.add.mock.calls[0][0];
            expect(savedData.name).toBe('test.csv');
            expect(savedData.data).toEqual(testData);
            expect(savedData.metadata.recordCount).toBe(2);
            expect(savedData.savedAt).toBeDefined();
        });

        test('deve retornar null se cache não estiver disponível', async () => {
            CacheService.db = null;
            global.indexedDB.open = jest.fn(() => {
                throw new Error('IndexedDB não disponível');
            });

            const result = await CacheService.saveToCache('test.csv', []);

            expect(result).toBeNull();
        });
    });

    describe('getFromCache', () => {
        test('deve recuperar arquivo do cache', async () => {
            CacheService.db = mockDB;

            const cachedData = {
                id: 1,
                name: 'test.csv',
                data: [{ nome: 'João' }],
                lastUsed: new Date().toISOString()
            };

            const getRequest = mockStore.get(1);

            setTimeout(() => {
                getRequest.result = cachedData;
                getRequest.onsuccess();
            }, 0);

            const result = await CacheService.getFromCache(1);

            expect(result).toEqual(cachedData);
            expect(mockStore.get).toHaveBeenCalledWith(1);
        });

        test('deve retornar null se arquivo não existir', async () => {
            CacheService.db = mockDB;

            const getRequest = mockStore.get(999);

            setTimeout(() => {
                getRequest.result = null;
                getRequest.onsuccess();
            }, 0);

            const result = await CacheService.getFromCache(999);

            expect(result).toBeNull();
        });

        test('deve atualizar lastUsed ao recuperar', async () => {
            CacheService.db = mockDB;

            jest.spyOn(CacheService, '_updateLastUsed').mockImplementation(() => Promise.resolve());

            const cachedData = { id: 1, name: 'test.csv' };
            const getRequest = mockStore.get(1);

            setTimeout(() => {
                getRequest.result = cachedData;
                getRequest.onsuccess();
            }, 0);

            await CacheService.getFromCache(1);

            expect(CacheService._updateLastUsed).toHaveBeenCalledWith(1);
        });
    });

    describe('listCachedFiles', () => {
        test('deve listar arquivos em cache ordenados por lastUsed', async () => {
            CacheService.db = mockDB;

            const files = [
                { id: 1, name: 'old.csv', lastUsed: '2024-01-01T00:00:00Z' },
                { id: 2, name: 'new.csv', lastUsed: '2024-12-01T00:00:00Z' },
                { id: 3, name: 'mid.csv', lastUsed: '2024-06-01T00:00:00Z' }
            ];

            const getAllRequest = mockStore.getAll();

            setTimeout(() => {
                getAllRequest.result = files;
                getAllRequest.onsuccess();
            }, 0);

            const result = await CacheService.listCachedFiles();

            expect(result).toHaveLength(3);
            expect(result[0].name).toBe('new.csv'); // Mais recente primeiro
            expect(result[2].name).toBe('old.csv'); // Mais antigo por último
        });

        test('deve retornar array vazio em caso de erro', async () => {
            CacheService.db = null;

            global.indexedDB.open = jest.fn(() => {
                throw new Error('DB Error');
            });

            const result = await CacheService.listCachedFiles();

            expect(result).toEqual([]);
        });
    });

    describe('removeFromCache', () => {
        test('deve remover arquivo do cache', async () => {
            CacheService.db = mockDB;

            const deleteRequest = mockStore.delete(1);

            setTimeout(() => {
                deleteRequest.onsuccess();
            }, 0);

            const result = await CacheService.removeFromCache(1);

            expect(result).toBe(true);
            expect(mockStore.delete).toHaveBeenCalledWith(1);
        });

        test('deve retornar false em caso de erro', async () => {
            CacheService.db = null;

            global.indexedDB.open = jest.fn(() => {
                throw new Error('DB Error');
            });

            const result = await CacheService.removeFromCache(1);

            expect(result).toBe(false);
        });
    });

    describe('clearCache', () => {
        test('deve limpar todo o cache', async () => {
            CacheService.db = mockDB;

            const clearRequest = mockStore.clear();

            setTimeout(() => {
                clearRequest.onsuccess();
            }, 0);

            const result = await CacheService.clearCache();

            expect(result).toBe(true);
            expect(mockStore.clear).toHaveBeenCalled();
        });
    });

    describe('cleanOldEntries', () => {
        test('deve remover entradas antigas (> 30 dias)', async () => {
            CacheService.db = mockDB;

            const now = new Date();
            const old = new Date();
            old.setDate(old.getDate() - 35); // 35 dias atrás

            const recent = new Date();
            recent.setDate(recent.getDate() - 10); // 10 dias atrás

            const files = [
                { id: 1, name: 'old.csv', lastUsed: old.toISOString() },
                { id: 2, name: 'recent.csv', lastUsed: recent.toISOString() },
                { id: 3, name: 'very-old.csv', lastUsed: new Date('2020-01-01').toISOString() }
            ];

            jest.spyOn(CacheService, 'listCachedFiles').mockResolvedValue(files);
            jest.spyOn(CacheService, 'removeFromCache').mockResolvedValue(true);

            const removedCount = await CacheService.cleanOldEntries();

            expect(removedCount).toBe(2); // old.csv e very-old.csv
            expect(CacheService.removeFromCache).toHaveBeenCalledWith(1);
            expect(CacheService.removeFromCache).toHaveBeenCalledWith(3);
            expect(CacheService.removeFromCache).not.toHaveBeenCalledWith(2);
        });

        test('deve retornar 0 se não houver entradas antigas', async () => {
            CacheService.db = mockDB;

            const recent = new Date();
            recent.setDate(recent.getDate() - 10);

            const files = [
                { id: 1, name: 'recent.csv', lastUsed: recent.toISOString() }
            ];

            jest.spyOn(CacheService, 'listCachedFiles').mockResolvedValue(files);
            jest.spyOn(CacheService, 'removeFromCache').mockResolvedValue(true);

            const removedCount = await CacheService.cleanOldEntries();

            expect(removedCount).toBe(0);
            expect(CacheService.removeFromCache).not.toHaveBeenCalled();
        });
    });

    describe('getCacheSize', () => {
        test('deve calcular tamanho total do cache', async () => {
            const files = [
                { id: 1, metadata: { size: 1024 } },
                { id: 2, metadata: { size: 2048 } },
                { id: 3, metadata: { size: 512 } }
            ];

            jest.spyOn(CacheService, 'listCachedFiles').mockResolvedValue(files);

            const result = await CacheService.getCacheSize();

            expect(result.count).toBe(3);
            expect(result.sizeBytes).toBe(3584);
            expect(parseFloat(result.sizeMB)).toBeCloseTo(0.0034, 2);
        });

        test('deve retornar zero se cache estiver vazio', async () => {
            jest.spyOn(CacheService, 'listCachedFiles').mockResolvedValue([]);

            const result = await CacheService.getCacheSize();

            expect(result.count).toBe(0);
            expect(result.sizeBytes).toBe(0);
            expect(result.sizeMB).toBe('0.00');
        });
    });
});
