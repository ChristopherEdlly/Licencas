/**
 * LotacaoHierarchyManager.js
 * Gerenciador de hierarquia de lotação para visualização e filtragem
 * Fornece funções de mapeamento, busca e filtragem hierárquica
 *
 * VERSÃO 2.0: Agora carrega hierarquia do SharePoint via HierarchyService
 */

class LotacaoHierarchyManager {
    constructor(hierarchyService = null) {
        // Serviço de hierarquia (SharePoint) - OBRIGATÓRIO
        this.hierarchyService = hierarchyService;

        // Mapas de busca
        this.flatMap = new Map(); // Mapa lotação -> caminho hierárquico
        this.reverseMap = new Map(); // Mapa de siglas para nomes completos

        // Estado
        this.loaded = false;
        this.loading = false;

        // Validação: HierarchyService é obrigatório
        if (!this.hierarchyService) {
            console.error('❌ LotacaoHierarchyManager: HierarchyService é obrigatório!');
            throw new Error('HierarchyService não fornecido ao LotacaoHierarchyManager');
        }
    }

    /**
     * Carrega hierarquia do SharePoint (assíncrono)
     * @param {boolean} forceRefresh - Forçar recarregamento
     */
    async loadFromSharePoint(forceRefresh = false) {
        if (!this.hierarchyService) {
            console.warn('[LotacaoHierarchyManager] HierarchyService não disponível');
            return false;
        }

        if (this.loading) {
            console.log('[LotacaoHierarchyManager] Já está carregando...');
            await this._waitForLoading();
            return this.loaded;
        }

        try {
            this.loading = true;
            console.log('[LotacaoHierarchyManager] Carregando do SharePoint...');

            const data = await this.hierarchyService.loadHierarchy(forceRefresh);

            // Construir mapas a partir dos dados do SharePoint
            this.buildMapsFromSharePoint(data);

            this.loaded = true;
            console.log('[LotacaoHierarchyManager] ✓ Hierarquia carregada do SharePoint');
            return true;

        } catch (error) {
            console.error('[LotacaoHierarchyManager] ❌ Erro ao carregar do SharePoint:', error);
            this.loaded = false;
            throw error; // Propaga erro para que App.js possa tratar

        } finally {
            this.loading = false;
        }
    }

    /**
     * Constrói mapas a partir dos dados do SharePoint
     */
    buildMapsFromSharePoint(data) {
        this.flatMap.clear();
        this.reverseMap.clear();

        console.log(`[LotacaoHierarchyManager] Construindo mapas de ${data.length} registros...`);

        data.forEach(item => {
            // Obter caminho completo (do filho até a raiz)
            const path = this.hierarchyService.getPath(item.codigo);

            // Mapear por código e nome normalizado
            const key = item.nomeNorm;

            this.flatMap.set(key, {
                name: item.nome,
                codigo: item.codigo,
                path: path.map(p => p.nome),
                level: path.length - 1,
                type: item.tipo.toLowerCase(),
                secretaria: path.length > 0 ? path[0].nome : null,
                subsecretaria: path.length > 1 ? path[1].nome : null,
                superintendencia: path.length > 2 ? path[2].nome : null,
                gerencia: path.length > 3 ? path[3].nome : null
            });

            // Mapear também por código
            this.flatMap.set(item.codigoNorm, this.flatMap.get(key));

            // Armazenar no reverseMap (sigla -> info) usando método auxiliar
            this.extractAndStoreSigla(
                item.nome,
                item.codigo,
                path.map(p => p.nome),
                item.tipo.toLowerCase()
            );
        });

        console.log(`[LotacaoHierarchyManager] ✓ ${this.flatMap.size} entradas no flatMap`);
    }

    /**
     * Aguarda carregamento
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
     * Extrai e armazena sigla do nome (do SharePoint)
     */
    extractAndStoreSigla(name, codigo, path, type) {
        // Adiciona pelo código
        this.reverseMap.set(codigo.toLowerCase(), {
            sigla: codigo,
            fullName: name,
            path,
            type
        });

        // Também extrai sigla do nome se tiver padrão "SIGLA - Nome"
        const match = name.match(/^([A-Z0-9/]+)\s*-/);
        if (match) {
            const sigla = match[1].trim();
            this.reverseMap.set(sigla.toLowerCase(), {
                sigla,
                fullName: name,
                path,
                type
            });
        }
    }

    /**
     * Busca lotação na hierarquia
     * @param {string} lotacao - Nome da lotação a buscar
     * @returns {Object|null} Informações da lotação ou null
     */
    findLotacao(lotacao) {
        if (!lotacao) return null;
        
        const normalized = lotacao.toLowerCase().trim();
        
        // Busca exata
        if (this.flatMap.has(normalized)) {
            return this.flatMap.get(normalized);
        }
        
        // Busca por sigla
        const siglaMatch = lotacao.match(/^([A-Z0-9/]+)/);
        if (siglaMatch) {
            const sigla = siglaMatch[1].toLowerCase();
            if (this.reverseMap.has(sigla)) {
                const info = this.reverseMap.get(sigla);
                return this.flatMap.get(info.fullName.toLowerCase().trim());
            }
        }
        
        // Busca parcial
        for (const [key, value] of this.flatMap.entries()) {
            if (key.includes(normalized) || normalized.includes(key)) {
                return value;
            }
        }
        
        return null;
    }

    /**
     * Enriquece dados do servidor com informações hierárquicas
     * @param {Object} servidor - Objeto do servidor
     * @returns {Object} Servidor com dados hierárquicos
     */
    enrichServidor(servidor) {
        if (!servidor) return servidor;

        const lotacaoInfo = this.findLotacao(servidor.lotacao);
        
        if (lotacaoInfo) {
            return {
                ...servidor,
                hierarquia: {
                    secretaria: lotacaoInfo.secretaria,
                    subsecretaria: lotacaoInfo.subsecretaria,
                    superintendencia: lotacaoInfo.superintendencia,
                    gerencia: lotacaoInfo.type === 'gerencia' ? lotacaoInfo.name : null,
                    nivel: lotacaoInfo.level,
                    tipo: lotacaoInfo.type,
                    caminho: lotacaoInfo.path
                }
            };
        }

        return {
            ...servidor,
            hierarquia: {
                secretaria: 'SEFAZ - secretaria de estado da fazenda',
                subsecretaria: servidor.subsecretaria || null,
                superintendencia: servidor.superintendencia || null,
                gerencia: servidor.lotacao || null,
                nivel: -1,
                tipo: 'desconhecido',
                caminho: [servidor.lotacao]
            }
        };
    }

    /**
     * Obtém subsecretarias da hierarquia (NOVO: usa SharePoint)
     * @returns {Array} Lista de subsecretarias
     */
    getSubsecretarias() {
        if (!this.hierarchyService) {
            console.error('[LotacaoHierarchyManager] HierarchyService não disponível');
            return [];
        }

        const subsecretarias = this.hierarchyService.getByType('Subsecretaria');
        return subsecretarias.map(sub => ({
            code: sub.codigo,
            name: sub.nome,
            fullName: sub.nome
        })).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtém superintendências de uma subsecretaria (NOVO: usa SharePoint)
     * @param {string} subsecretaria - Nome ou código da subsecretaria
     * @returns {Array} Lista de superintendências
     */
    getSuperintendencias(subsecretaria = null) {
        if (!this.hierarchyService) {
            console.error('[LotacaoHierarchyManager] HierarchyService não disponível');
            return [];
        }

        let superintendencias = this.hierarchyService.getByType('Superintendência');

        // Se especificou subsecretaria, filtrar apenas as que pertencem a ela
        if (subsecretaria) {
            const subsecNorm = subsecretaria.toLowerCase().trim();
            superintendencias = superintendencias.filter(sup => {
                const path = this.hierarchyService.getPath(sup.codigo);
                return path.some(p =>
                    p.nome.toLowerCase().includes(subsecNorm) ||
                    p.codigo.toLowerCase() === subsecNorm
                );
            });
        }

        return superintendencias.map(sup => {
            const path = this.hierarchyService.getPath(sup.codigo);
            const subsec = path.find(p => p.tipo.toLowerCase() === 'subsecretaria');

            return {
                code: sup.codigo,
                name: sup.nome,
                fullName: sup.nome,
                subsecretaria: subsec ? subsec.nome : null
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtém gerências de uma superintendência (NOVO: usa SharePoint)
     * @param {string} superintendencia - Nome ou código da superintendência
     * @returns {Array} Lista de gerências
     */
    getGerencias(superintendencia = null) {
        if (!this.hierarchyService) {
            console.error('[LotacaoHierarchyManager] HierarchyService não disponível');
            return [];
        }

        let gerencias = this.hierarchyService.getByType('Gerência');

        // Se especificou superintendência, filtrar apenas as que pertencem a ela
        if (superintendencia) {
            const superNorm = superintendencia.toLowerCase().trim();
            gerencias = gerencias.filter(ger => {
                const path = this.hierarchyService.getPath(ger.codigo);
                return path.some(p =>
                    p.nome.toLowerCase().includes(superNorm) ||
                    p.codigo.toLowerCase() === superNorm
                );
            });
        }

        return gerencias.map(ger => {
            const path = this.hierarchyService.getPath(ger.codigo);
            const super_ = path.find(p => p.tipo.toLowerCase() === 'superintendência');
            const subsec = path.find(p => p.tipo.toLowerCase() === 'subsecretaria');

            return {
                code: ger.codigo,
                name: ger.nome,
                fullName: ger.nome,
                superintendencia: super_ ? super_.nome : null,
                subsecretaria: subsec ? subsec.nome : null
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Extrai sigla de um nome
     */
    extractSigla(name) {
        const match = name.match(/^([A-Z0-9/]+)\s*-/);
        return match ? match[1].trim() : name.substring(0, 10);
    }

    /**
     * Filtra servidores por nível hierárquico
     * @param {Array} servidores - Lista de servidores
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Servidores filtrados
     */
    filterByHierarchy(servidores, filters = {}) {
        const { subsecretaria, superintendencia, gerencia } = filters;
        
        return servidores.filter(servidor => {
            const info = this.findLotacao(servidor.lotacao);
            
            if (!info && (subsecretaria || superintendencia || gerencia)) {
                return false;
            }
            
            if (subsecretaria) {
                const normalizedFilter = subsecretaria.toLowerCase();
                const normalizedSubsec = (info?.subsecretaria || '').toLowerCase();
                if (!normalizedSubsec.includes(normalizedFilter) && !normalizedFilter.includes(normalizedSubsec)) {
                    return false;
                }
            }
            
            if (superintendencia) {
                const normalizedFilter = superintendencia.toLowerCase();
                const normalizedSuper = (info?.superintendencia || '').toLowerCase();
                if (!normalizedSuper.includes(normalizedFilter) && !normalizedFilter.includes(normalizedSuper)) {
                    return false;
                }
            }
            
            if (gerencia) {
                const normalizedFilter = gerencia.toLowerCase();
                const normalizedGerencia = (servidor.lotacao || '').toLowerCase();
                if (!normalizedGerencia.includes(normalizedFilter) && !normalizedFilter.includes(normalizedGerencia)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Obtém estatísticas por nível hierárquico
     * @param {Array} servidores - Lista de servidores
     * @returns {Object} Estatísticas agrupadas
     */
    getHierarchyStats(servidores) {
        const stats = {
            bySubsecretaria: {},
            bySuperintendencia: {},
            byGerencia: {},
            unmapped: []
        };

        servidores.forEach(servidor => {
            const info = this.findLotacao(servidor.lotacao);
            
            if (info) {
                // Por subsecretaria
                if (info.subsecretaria) {
                    if (!stats.bySubsecretaria[info.subsecretaria]) {
                        stats.bySubsecretaria[info.subsecretaria] = {
                            name: info.subsecretaria,
                            count: 0,
                            servidores: []
                        };
                    }
                    stats.bySubsecretaria[info.subsecretaria].count++;
                    stats.bySubsecretaria[info.subsecretaria].servidores.push(servidor);
                }

                // Por superintendência
                if (info.superintendencia) {
                    if (!stats.bySuperintendencia[info.superintendencia]) {
                        stats.bySuperintendencia[info.superintendencia] = {
                            name: info.superintendencia,
                            subsecretaria: info.subsecretaria,
                            count: 0,
                            servidores: []
                        };
                    }
                    stats.bySuperintendencia[info.superintendencia].count++;
                    stats.bySuperintendencia[info.superintendencia].servidores.push(servidor);
                }

                // Por gerência
                const gerenciaName = servidor.lotacao;
                if (gerenciaName) {
                    if (!stats.byGerencia[gerenciaName]) {
                        stats.byGerencia[gerenciaName] = {
                            name: gerenciaName,
                            superintendencia: info.superintendencia,
                            subsecretaria: info.subsecretaria,
                            count: 0,
                            servidores: []
                        };
                    }
                    stats.byGerencia[gerenciaName].count++;
                    stats.byGerencia[gerenciaName].servidores.push(servidor);
                }
            } else {
                stats.unmapped.push(servidor);
            }
        });

        return stats;
    }

    /**
     * Gera estrutura de árvore para visualização
     * @param {Array} servidores - Lista de servidores (opcional, para contagem)
     * @returns {Object} Estrutura de árvore com contagens
     */
    generateTreeStructure(servidores = []) {
        const stats = servidores.length > 0 ? this.getHierarchyStats(servidores) : null;
        
        const buildNode = (name, level, children = [], path = []) => {
            const currentPath = [...path, name];
            const count = this.countServidoresInPath(stats, name, level);
            
            return {
                id: this.generateNodeId(currentPath),
                name: name,
                shortName: this.extractSigla(name),
                level: level,
                type: this.getLevelType(level),
                path: currentPath,
                count: count,
                children: children,
                expanded: false
            };
        };

        const processHierarchy = (obj, level = 0, path = []) => {
            if (Array.isArray(obj)) {
                return obj
                    .filter(item => item && item !== 'nan')
                    .map(item => buildNode(item, level, [], path));
            }
            
            if (typeof obj === 'object' && obj !== null) {
                return Object.entries(obj)
                    .filter(([key]) => key && key !== 'nan')
                    .map(([key, value]) => {
                        const children = processHierarchy(value, level + 1, [...path, key]);
                        return buildNode(key, level, children, path);
                    });
            }
            
            return [];
        };

        return processHierarchy(this.hierarchy);
    }

    /**
     * Conta servidores em um caminho da hierarquia
     */
    countServidoresInPath(stats, name, level) {
        if (!stats) return 0;
        
        switch (level) {
            case 1: // Subsecretaria
                return stats.bySubsecretaria[name]?.count || 0;
            case 2: // Superintendência
                return stats.bySuperintendencia[name]?.count || 0;
            case 3: // Gerência
                return stats.byGerencia[name]?.count || 0;
            default:
                return 0;
        }
    }

    /**
     * Gera ID único para nó
     */
    generateNodeId(path) {
        return path.map(p => p.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)).join('_');
    }

    /**
     * Busca na hierarquia
     * @param {string} query - Termo de busca
     * @returns {Array} Resultados da busca
     */
    search(query) {
        if (!query || query.length < 2) return [];
        
        const normalizedQuery = query.toLowerCase().trim();
        const results = [];
        
        for (const [key, value] of this.flatMap.entries()) {
            if (key.includes(normalizedQuery) || value.name.toLowerCase().includes(normalizedQuery)) {
                results.push(value);
            }
        }
        
        // Busca por sigla
        for (const [sigla, info] of this.reverseMap.entries()) {
            if (sigla.includes(normalizedQuery)) {
                const fullInfo = this.flatMap.get(info.fullName.toLowerCase().trim());
                if (fullInfo && !results.includes(fullInfo)) {
                    results.push(fullInfo);
                }
            }
        }
        
        return results.slice(0, 20); // Limita a 20 resultados
    }

    /**
     * Obtém caminho formatado (breadcrumb)
     * @param {string} lotacao - Lotação
     * @returns {string} Caminho formatado
     */
    getBreadcrumb(lotacao) {
        const info = this.findLotacao(lotacao);
        if (!info || !info.path) return lotacao;
        
        return info.path
            .map(p => this.extractSigla(p))
            .join(' > ');
    }

    /**
     * Obtém todas as lotações como lista plana
     * @returns {Array} Lista de todas as lotações
     */
    getAllLotacoes() {
        const lotacoes = [];
        
        for (const value of this.flatMap.values()) {
            lotacoes.push({
                name: value.name,
                shortName: this.extractSigla(value.name),
                type: value.type,
                path: value.path,
                breadcrumb: value.path.map(p => this.extractSigla(p)).join(' > ')
            });
        }
        
        return lotacoes.sort((a, b) => a.name.localeCompare(b.name));
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LotacaoHierarchyManager = LotacaoHierarchyManager;
}
