/**
 * HierarchyService.js
 * Serviço para carregar e gerenciar hierarquia de lotação do SharePoint
 *
 * Estrutura da tabela no SharePoint (aba "hierarquia", tabela "lotacao"):
 * - Código: Código único da lotação (ex: SEFAZ, STE, GEMAC)
 * - Nome: Nome completo da lotação
 * - Tipo: Tipo (Secretaria, Subsecretaria, Superintendência, Gerência, etc)
 * - Superior: Código da lotação superior (vazio para raiz)
 */

class HierarchyService {
    constructor(authService, excelService) {
        this.authService = authService;
        this.excelService = excelService;

        // Configuração de cache
        this.CACHE_KEY = 'hierarchyCache';
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas (em ms)

        // Estado
        this.hierarchyData = null;
        this.hierarchyTree = null;
        this.loading = false;
    }

    /**
     * Carrega hierarquia (com cache)
     * @param {boolean} forceRefresh - Força recarregamento ignorando cache
     * @returns {Promise<Array>} Array de objetos de hierarquia
     */
    async loadHierarchy(forceRefresh = false) {
        console.log('[HierarchyService] Carregando hierarquia...', { forceRefresh });

        // Verificar cache se não forçar refresh
        if (!forceRefresh) {
            const cached = this._getCachedHierarchy();
            if (cached) {
                console.log('[HierarchyService] ✓ Hierarquia carregada do cache');
                this.hierarchyData = cached;
                this.hierarchyTree = this._buildHierarchyTree(cached);
                return cached;
            }
        }

        // Carregar do SharePoint
        if (this.loading) {
            console.log('[HierarchyService] Já está carregando, aguardando...');
            await this._waitForLoading();
            return this.hierarchyData;
        }

        try {
            this.loading = true;
            console.log('[HierarchyService] Carregando do SharePoint...');

            // Obter fileId da planilha configurada
            const fileInfo = await this.excelService.resolveFileFromEnv();
            if (!fileInfo || !fileInfo.fileId) {
                throw new Error('FileId não configurado. Verifique env.config.js');
            }

            // Ler aba "hierarquia" diretamente (mais confiável que tabelas nomeadas)
            console.log('[HierarchyService] Lendo aba "hierarquia" via downloadAndParseWorkbook...');
            const result = await this.excelService.downloadAndParseWorkbook(fileInfo.fileId, 'hierarquia');

            if (!result || !result.rows || result.rows.length === 0) {
                throw new Error('Tabela de hierarquia vazia ou não encontrada');
            }

            // Converter formato {tableInfo, rows} para array de objetos
            const headers = result.tableInfo.columns.map(col => col.name);
            const data = result.rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row.values[0][index];
                });
                return obj;
            });

            console.log(`[HierarchyService] ✓ ${data.length} registros carregados`);

            // Validar estrutura
            this._validateHierarchyData(data);

            // Processar dados
            const processed = this._processHierarchyData(data);

            // Salvar cache
            this._saveCacheHierarchy(processed);

            // Construir árvore
            this.hierarchyData = processed;
            this.hierarchyTree = this._buildHierarchyTree(processed);

            return processed;

        } catch (error) {
            console.error('[HierarchyService] ❌ Erro ao carregar hierarquia:', error);

            // Em caso de erro, tentar usar cache mesmo expirado
            const cached = this._getCachedHierarchy(true);
            if (cached) {
                console.warn('[HierarchyService] ⚠️ Usando cache expirado devido a erro');
                this.hierarchyData = cached;
                this.hierarchyTree = this._buildHierarchyTree(cached);
                return cached;
            }

            throw error;

        } finally {
            this.loading = false;
        }
    }

    /**
     * Valida estrutura dos dados
     */
    _validateHierarchyData(data) {
        data.forEach((item, index) => {
            // Código é obrigatório
            if (!item.hasOwnProperty('Código') && !item.hasOwnProperty('Código')) {
                throw new Error(`Campo obrigatório "Código" ausente no registro ${index + 1}`);
            }

            if (!item.Código || item.Código.toString().trim() === '') {
                throw new Error(`Código vazio no registro ${index + 1}`);
            }

            // Nome (aceita "Nome" ou "Nome da Lotação")
            if (!item.hasOwnProperty('Nome') && !item.hasOwnProperty('Nome da Lotação')) {
                throw new Error(`Campo obrigatório "Nome" ou "Nome da Lotação" ausente no registro ${index + 1}`);
            }

            // Tipo é obrigatório
            if (!item.hasOwnProperty('Tipo')) {
                throw new Error(`Campo obrigatório "Tipo" ausente no registro ${index + 1}`);
            }
        });

        console.log('[HierarchyService] ✓ Validação OK');
    }

    /**
     * Processa dados brutos do SharePoint
     */
    _processHierarchyData(data) {
        return data.map(item => ({
            codigo: (item.Código || item['Código'] || '').toString().trim(),
            nome: (item.Nome || item['Nome da Lotação'] || '').toString().trim(),
            tipo: (item.Tipo || '').toString().trim(),
            superior: (item.Superior || '').toString().trim() || null,
            // Normalizar para busca
            codigoNorm: (item.Código || '').toString().toLowerCase().trim(),
            nomeNorm: (item.Nome || item['Nome da Lotação'] || '').toString().toLowerCase().trim()
        }));
    }

    /**
     * Constrói árvore hierárquica a partir dos dados planos
     */
    _buildHierarchyTree(data) {
        console.log('[HierarchyService] Construindo árvore hierárquica...');

        const map = new Map();
        const roots = [];

        // Primeiro, criar map de todos os nós
        data.forEach(item => {
            map.set(item.codigo, {
                ...item,
                children: []
            });
        });

        // Depois, conectar pais e filhos
        data.forEach(item => {
            const node = map.get(item.codigo);

            if (item.superior) {
                const parent = map.get(item.superior);
                if (parent) {
                    parent.children.push(node);
                } else {
                    console.warn(`[HierarchyService] Superior "${item.superior}" não encontrado para "${item.codigo}"`);
                    roots.push(node); // Adiciona como raiz se superior não existir
                }
            } else {
                // Sem superior = raiz
                roots.push(node);
            }
        });

        console.log(`[HierarchyService] ✓ Árvore construída: ${roots.length} raízes`);
        return roots;
    }

    /**
     * Busca lotação por código ou nome
     * @param {string} query - Código ou nome para buscar
     * @returns {Object|null} Dados da lotação ou null
     */
    findLotacao(query) {
        if (!this.hierarchyData || !query) return null;

        const normalized = query.toLowerCase().trim();

        // Busca por código exato
        let found = this.hierarchyData.find(item => item.codigoNorm === normalized);
        if (found) return found;

        // Busca por nome exato
        found = this.hierarchyData.find(item => item.nomeNorm === normalized);
        if (found) return found;

        // Busca parcial por código (começa com)
        found = this.hierarchyData.find(item => item.codigoNorm.startsWith(normalized));
        if (found) return found;

        // Busca parcial por nome (contém)
        found = this.hierarchyData.find(item => item.nomeNorm.includes(normalized));
        if (found) return found;

        return null;
    }

    /**
     * Obtém caminho completo de uma lotação (até a raiz)
     * @param {string} codigo - Código da lotação
     * @returns {Array} Array de objetos representando o caminho
     */
    getPath(codigo) {
        if (!this.hierarchyData) return [];

        const path = [];
        let current = this.hierarchyData.find(item => item.codigo === codigo);

        while (current) {
            path.unshift(current); // Adiciona no início

            if (current.superior) {
                current = this.hierarchyData.find(item => item.codigo === current.superior);
            } else {
                break;
            }
        }

        return path;
    }

    /**
     * Obtém todos os filhos de uma lotação
     * @param {string} codigo - Código da lotação pai
     * @returns {Array} Array de filhos diretos
     */
    getChildren(codigo) {
        if (!this.hierarchyData) return [];
        return this.hierarchyData.filter(item => item.superior === codigo);
    }

    /**
     * Obtém todas as lotações de um tipo específico
     * @param {string} tipo - Tipo (Secretaria, Subsecretaria, etc)
     * @returns {Array} Array de lotações do tipo
     */
    getByType(tipo) {
        if (!this.hierarchyData) return [];
        return this.hierarchyData.filter(item =>
            item.tipo.toLowerCase() === tipo.toLowerCase()
        );
    }

    /**
     * Obtém hierarquia como objeto aninhado (formato antigo)
     * Para compatibilidade com código existente
     */
    getAsNestedObject() {
        if (!this.hierarchyTree) return {};

        const buildNested = (node) => {
            if (node.children.length === 0) {
                return node.nome;
            }

            const obj = {};
            node.children.forEach(child => {
                obj[child.nome] = buildNested(child);
            });
            return obj;
        };

        const result = {};
        this.hierarchyTree.forEach(root => {
            result[root.nome] = buildNested(root);
        });

        return result;
    }

    /**
     * Salva hierarquia no cache
     */
    _saveCacheHierarchy(data) {
        try {
            const cache = {
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
            console.log('[HierarchyService] ✓ Cache salvo');
        } catch (error) {
            console.error('[HierarchyService] Erro ao salvar cache:', error);
        }
    }

    /**
     * Obtém hierarquia do cache
     * @param {boolean} ignoreExpiration - Ignora expiração do cache
     * @returns {Array|null} Dados em cache ou null
     */
    _getCachedHierarchy(ignoreExpiration = false) {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const cache = JSON.parse(cached);
            const age = Date.now() - cache.timestamp;

            if (!ignoreExpiration && age > this.CACHE_DURATION) {
                console.log('[HierarchyService] Cache expirado', {
                    age: Math.floor(age / 1000 / 60),
                    maxAge: Math.floor(this.CACHE_DURATION / 1000 / 60)
                });
                return null;
            }

            console.log('[HierarchyService] Cache encontrado', {
                age: Math.floor(age / 1000 / 60) + ' minutos',
                records: cache.data.length
            });

            return cache.data;

        } catch (error) {
            console.error('[HierarchyService] Erro ao ler cache:', error);
            return null;
        }
    }

    /**
     * Limpa cache
     */
    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
        this.hierarchyData = null;
        this.hierarchyTree = null;
        console.log('[HierarchyService] ✓ Cache limpo');
    }

    /**
     * Aguarda carregamento em andamento
     */
    async _waitForLoading() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (!this.loading) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Retorna informações do cache
     */
    getCacheInfo() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const cache = JSON.parse(cached);
            const age = Date.now() - cache.timestamp;
            const expired = age > this.CACHE_DURATION;

            return {
                exists: true,
                timestamp: new Date(cache.timestamp).toLocaleString('pt-BR'),
                age: Math.floor(age / 1000 / 60) + ' minutos',
                expired: expired,
                records: cache.data.length,
                version: cache.version
            };

        } catch (error) {
            return null;
        }
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.HierarchyService = HierarchyService;
}
