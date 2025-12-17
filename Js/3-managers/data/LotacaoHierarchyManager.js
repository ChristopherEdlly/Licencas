/**
 * LotacaoHierarchyManager.js
 * Gerenciador de hierarquia de lotação para visualização e filtragem
 * Fornece funções de mapeamento, busca e filtragem hierárquica
 */

class LotacaoHierarchyManager {
    constructor() {
        this.hierarchy = window.LOTACAO_HIERARCHY || {};
        this.flatMap = new Map(); // Mapa lotação -> caminho hierárquico
        this.reverseMap = new Map(); // Mapa de siglas para nomes completos
        this.buildMaps();
    }

    /**
     * Constrói mapas para busca rápida
     */
    buildMaps() {
        this.flatMap.clear();
        this.reverseMap.clear();

        const processLevel = (obj, path = [], level = 0) => {
            if (Array.isArray(obj)) {
                // Nível de gerências (folhas)
                obj.forEach(gerencia => {
                    if (gerencia && gerencia !== 'nan') {
                        const fullPath = [...path, gerencia];
                        this.flatMap.set(gerencia.toLowerCase().trim(), {
                            name: gerencia,
                            path: fullPath,
                            level: level,
                            type: 'gerencia',
                            secretaria: path[0] || null,
                            subsecretaria: path[1] || null,
                            superintendencia: path[2] || null
                        });
                        this.extractAndStoreSigla(gerencia, fullPath, 'gerencia');
                    }
                });
            } else if (typeof obj === 'object' && obj !== null) {
                Object.entries(obj).forEach(([key, value]) => {
                    if (key && key !== 'nan') {
                        const newPath = [...path, key];
                        const type = this.getLevelType(level);
                        
                        this.flatMap.set(key.toLowerCase().trim(), {
                            name: key,
                            path: newPath,
                            level: level,
                            type: type,
                            secretaria: newPath[0] || null,
                            subsecretaria: level >= 1 ? newPath[1] : null,
                            superintendencia: level >= 2 ? newPath[2] : null
                        });
                        this.extractAndStoreSigla(key, newPath, type);
                        
                        processLevel(value, newPath, level + 1);
                    }
                });
            }
        };

        processLevel(this.hierarchy);
    }

    /**
     * Extrai e armazena sigla do nome
     */
    extractAndStoreSigla(name, path, type) {
        // Extrai sigla antes do " - "
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
     * Retorna o tipo baseado no nível
     */
    getLevelType(level) {
        const types = ['secretaria', 'subsecretaria', 'superintendencia', 'gerencia'];
        return types[level] || 'unknown';
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
     * Obtém subsecretarias da hierarquia
     * @returns {Array} Lista de subsecretarias
     */
    getSubsecretarias() {
        const subsecretarias = [];
        const secretaria = this.hierarchy['SEFAZ - secretaria de estado da fazenda'];
        
        if (secretaria) {
            Object.keys(secretaria).forEach(subsec => {
                if (subsec && subsec !== 'nan') {
                    subsecretarias.push({
                        code: this.extractSigla(subsec),
                        name: subsec,
                        fullName: subsec
                    });
                }
            });
        }
        
        return subsecretarias.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtém superintendências de uma subsecretaria
     * @param {string} subsecretaria - Nome da subsecretaria
     * @returns {Array} Lista de superintendências
     */
    getSuperintendencias(subsecretaria = null) {
        const superintendencias = [];
        const secretaria = this.hierarchy['SEFAZ - secretaria de estado da fazenda'];
        
        if (!secretaria) return superintendencias;

        const processSubsec = (subsecObj, subsecName) => {
            Object.keys(subsecObj).forEach(super_name => {
                if (super_name && super_name !== 'nan') {
                    superintendencias.push({
                        code: this.extractSigla(super_name),
                        name: super_name,
                        fullName: super_name,
                        subsecretaria: subsecName
                    });
                }
            });
        };

        if (subsecretaria) {
            const normalizedSubsec = subsecretaria.toLowerCase().trim();
            Object.entries(secretaria).forEach(([key, value]) => {
                if (key.toLowerCase().includes(normalizedSubsec) || normalizedSubsec.includes(key.toLowerCase())) {
                    processSubsec(value, key);
                }
            });
        } else {
            Object.entries(secretaria).forEach(([key, value]) => {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    processSubsec(value, key);
                }
            });
        }

        return superintendencias.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Obtém gerências de uma superintendência
     * @param {string} superintendencia - Nome da superintendência
     * @returns {Array} Lista de gerências
     */
    getGerencias(superintendencia = null) {
        const gerencias = [];
        const secretaria = this.hierarchy['SEFAZ - secretaria de estado da fazenda'];
        
        if (!secretaria) return gerencias;

        const processSuper = (superArray, superName, subsecName) => {
            if (Array.isArray(superArray)) {
                superArray.forEach(gerencia => {
                    if (gerencia && gerencia !== 'nan') {
                        gerencias.push({
                            code: this.extractSigla(gerencia),
                            name: gerencia,
                            fullName: gerencia,
                            superintendencia: superName,
                            subsecretaria: subsecName
                        });
                    }
                });
            }
        };

        if (superintendencia) {
            const normalizedSuper = superintendencia.toLowerCase().trim();
            Object.entries(secretaria).forEach(([subsecKey, subsecValue]) => {
                if (typeof subsecValue === 'object' && !Array.isArray(subsecValue)) {
                    Object.entries(subsecValue).forEach(([superKey, superValue]) => {
                        if (superKey.toLowerCase().includes(normalizedSuper) || normalizedSuper.includes(superKey.toLowerCase())) {
                            processSuper(superValue, superKey, subsecKey);
                        }
                    });
                }
            });
        } else {
            Object.entries(secretaria).forEach(([subsecKey, subsecValue]) => {
                if (typeof subsecValue === 'object' && !Array.isArray(subsecValue)) {
                    Object.entries(subsecValue).forEach(([superKey, superValue]) => {
                        processSuper(superValue, superKey, subsecKey);
                    });
                }
            });
        }

        return gerencias.sort((a, b) => a.name.localeCompare(b.name));
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
