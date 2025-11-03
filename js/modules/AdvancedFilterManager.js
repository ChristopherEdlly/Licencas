/**
 * AdvancedFilterManager.js
 * Gerencia filtros avançados: Cargo, Lotação, Superintendência, Urgência, Status
 * Suporta filtros cascata e persistência no localStorage
 */

class AdvancedFilterManager {
    constructor(dashboard) {
        this.dashboard = dashboard;

        // Estado dos filtros ativos
        this.activeFilters = {
            cargo: null,                // String ou null
            lotacao: null,              // String ou null
            superintendencia: null,     // String ou null
            subsecretaria: null,        // String ou null
            urgencia: 'all',            // 'all', 'critica', 'alta', 'moderada', 'baixa'
            status: []                  // Array: ['com-licenca', 'sem-licenca', 'vencidas']
        };

        // Cache de valores únicos
        this.uniqueValues = {
            cargos: [],
            lotacoes: [],
            superintendencias: [],
            subsecretarias: [],
            subsecretariasBySuper: new Map()
        };

        // Carregar filtros salvos
        this.loadFilters();
    }

    /**
     * Aplica todos os filtros ativos nos servidores
     *
     * @param {Array} servidores - Lista de servidores
     * @returns {Array} - Servidores filtrados
     */
    applyFilters(servidores) {
        if (!servidores || servidores.length === 0) {
            return [];
        }

        let filtered = [...servidores];

        // Aplicar filtro de cargo
        if (this.activeFilters.cargo) {
            filtered = filtered.filter(s =>
                this.normalizeValue(s.cargo) === this.normalizeValue(this.activeFilters.cargo)
            );
            console.log(`🔍 Filtro Cargo: ${this.activeFilters.cargo} → ${filtered.length} servidores`);
        }

        // Aplicar filtro de lotação
        if (this.activeFilters.lotacao) {
            filtered = filtered.filter(s =>
                this.normalizeValue(s.lotacao) === this.normalizeValue(this.activeFilters.lotacao)
            );
            console.log(`🔍 Filtro Lotação: ${this.activeFilters.lotacao} → ${filtered.length} servidores`);
        }

        // Aplicar filtro de superintendência
        if (this.activeFilters.superintendencia) {
            filtered = filtered.filter(s =>
                this.normalizeValue(s.superintendencia) === this.normalizeValue(this.activeFilters.superintendencia)
            );
            console.log(`🔍 Filtro Superintendência: ${this.activeFilters.superintendencia} → ${filtered.length} servidores`);
        }

        // Aplicar filtro de subsecretaria
        if (this.activeFilters.subsecretaria) {
            filtered = filtered.filter(s =>
                this.normalizeValue(s.subsecretaria) === this.normalizeValue(this.activeFilters.subsecretaria)
            );
            console.log(`🔍 Filtro Subsecretaria: ${this.activeFilters.subsecretaria} → ${filtered.length} servidores`);
        }

        // Aplicar filtro de urgência
        if (this.activeFilters.urgencia && this.activeFilters.urgencia !== 'all') {
            filtered = filtered.filter(s => {
                const urgencia = this.normalizeValue(s.nivelUrgencia || s.urgencia || '');
                return urgencia === this.activeFilters.urgencia;
            });
            console.log(`🔍 Filtro Urgência: ${this.activeFilters.urgencia} → ${filtered.length} servidores`);
        }

        // Aplicar filtros de status
        if (this.activeFilters.status.length > 0) {
            filtered = filtered.filter(s => this.matchesStatusFilters(s));
            console.log(`🔍 Filtro Status: ${this.activeFilters.status.join(', ')} → ${filtered.length} servidores`);
        }

        return filtered;
    }

    /**
     * Verifica se servidor atende aos filtros de status
     *
     * @param {Object} servidor
     * @returns {boolean}
     */
    matchesStatusFilters(servidor) {
        const { status } = this.activeFilters;
        if (status.length === 0) return true;

        const hasLicenca = servidor.licencas && servidor.licencas.length > 0;
        const hasVencidas = servidor.licencas && servidor.licencas.some(l => {
            const hoje = new Date();
            const fim = l.dataFim ? new Date(l.dataFim) : null;
            return fim && fim < hoje;
        });

        // Se múltiplos status selecionados, usar OR
        return status.some(s => {
            if (s === 'com-licenca') return hasLicenca;
            if (s === 'sem-licenca') return !hasLicenca;
            if (s === 'vencidas') return hasVencidas;
            return false;
        });
    }

    /**
     * Extrai valores únicos dos servidores para preencher dropdowns
     *
     * @param {Array} servidores
     */
    extractUniqueValues(servidores) {
        if (!servidores || servidores.length === 0) return;

        const cargosSet = new Set();
        const lotacoesSet = new Set();
        const superintendenciasSet = new Set();
        const subsecretariasSet = new Set();
        const subsecretariasBySuper = new Map();

        for (const servidor of servidores) {
            // Cargos
            if (servidor.cargo) {
                cargosSet.add(servidor.cargo);
            }

            // Lotações
            if (servidor.lotacao) {
                lotacoesSet.add(servidor.lotacao);
            }

            // Superintendências
            if (servidor.superintendencia) {
                superintendenciasSet.add(servidor.superintendencia);

                // Mapa de subsecretarias por superintendência
                if (servidor.subsecretaria) {
                    if (!subsecretariasBySuper.has(servidor.superintendencia)) {
                        subsecretariasBySuper.set(servidor.superintendencia, new Set());
                    }
                    subsecretariasBySuper.get(servidor.superintendencia).add(servidor.subsecretaria);
                }
            }

            // Subsecretarias
            if (servidor.subsecretaria) {
                subsecretariasSet.add(servidor.subsecretaria);
            }
        }

        // Converter Sets para Arrays ordenados
        this.uniqueValues.cargos = Array.from(cargosSet).sort();
        this.uniqueValues.lotacoes = Array.from(lotacoesSet).sort();
        this.uniqueValues.superintendencias = Array.from(superintendenciasSet).sort();
        this.uniqueValues.subsecretarias = Array.from(subsecretariasSet).sort();

        // Converter Map de subsecretarias
        this.uniqueValues.subsecretariasBySuper = new Map();
        for (const [super_, subs] of subsecretariasBySuper) {
            this.uniqueValues.subsecretariasBySuper.set(super_, Array.from(subs).sort());
        }

        console.log('📊 Valores únicos extraídos:', {
            cargos: this.uniqueValues.cargos.length,
            lotacoes: this.uniqueValues.lotacoes.length,
            superintendencias: this.uniqueValues.superintendencias.length,
            subsecretarias: this.uniqueValues.subsecretarias.length
        });
    }

    /**
     * Retorna valores únicos para um campo específico
     *
     * @param {string} field - 'cargo', 'lotacao', 'superintendencia', 'subsecretaria'
     * @returns {Array<string>}
     */
    getUniqueValues(field) {
        switch (field) {
            case 'cargo':
                return this.uniqueValues.cargos;
            case 'lotacao':
                return this.uniqueValues.lotacoes;
            case 'superintendencia':
                return this.uniqueValues.superintendencias;
            case 'subsecretaria':
                return this.uniqueValues.subsecretarias;
            default:
                return [];
        }
    }

    /**
     * Retorna subsecretarias disponíveis para uma superintendência
     *
     * @param {string} superintendencia
     * @returns {Array<string>}
     */
    getSubsecretariasBySuper(superintendencia) {
        if (!superintendencia) return [];
        return this.uniqueValues.subsecretariasBySuper.get(superintendencia) || [];
    }

    /**
     * Atualiza filtro cascata (Super → Sub)
     * Quando superintendência muda, limpa subsecretaria se não for mais válida
     *
     * @param {string} superintendencia
     * @returns {Array<string>} - Subsecretarias disponíveis
     */
    updateCascadeFilters(superintendencia) {
        const availableSubs = this.getSubsecretariasBySuper(superintendencia);

        // Se subsecretaria atual não está disponível para nova super, limpar
        if (this.activeFilters.subsecretaria) {
            if (!availableSubs.includes(this.activeFilters.subsecretaria)) {
                this.activeFilters.subsecretaria = null;
                console.log('ℹ️ Subsecretaria limpa (não disponível para nova superintendência)');
            }
        }

        return availableSubs;
    }

    /**
     * Define um filtro
     *
     * @param {string} filterType - Tipo do filtro
     * @param {*} value - Valor do filtro
     */
    setFilter(filterType, value) {
        switch (filterType) {
            case 'cargo':
            case 'lotacao':
            case 'superintendencia':
            case 'subsecretaria':
                this.activeFilters[filterType] = value || null;
                break;

            case 'urgencia':
                this.activeFilters.urgencia = value || 'all';
                break;

            case 'status':
                // Status é array de checkboxes
                if (Array.isArray(value)) {
                    this.activeFilters.status = value;
                }
                break;

            default:
                console.warn('Tipo de filtro desconhecido:', filterType);
                return;
        }

        // Salvar filtros
        this.saveFilters();

        console.log(`✅ Filtro ${filterType} atualizado:`, value);
    }

    /**
     * Remove um filtro específico
     *
     * @param {string} filterType
     */
    removeFilter(filterType) {
        switch (filterType) {
            case 'cargo':
            case 'lotacao':
            case 'superintendencia':
            case 'subsecretaria':
                this.activeFilters[filterType] = null;
                break;

            case 'urgencia':
                this.activeFilters.urgencia = 'all';
                break;

            case 'status':
                this.activeFilters.status = [];
                break;
        }

        this.saveFilters();
        console.log(`🗑️ Filtro ${filterType} removido`);
    }

    /**
     * Limpa todos os filtros
     */
    clearAll() {
        this.activeFilters = {
            cargo: null,
            lotacao: null,
            superintendencia: null,
            subsecretaria: null,
            urgencia: 'all',
            status: []
        };

        this.saveFilters();
        console.log('🗑️ Todos os filtros limpos');
    }

    /**
     * Verifica se há filtros ativos
     *
     * @returns {boolean}
     */
    hasActiveFilters() {
        return this.activeFilters.cargo !== null ||
               this.activeFilters.lotacao !== null ||
               this.activeFilters.superintendencia !== null ||
               this.activeFilters.subsecretaria !== null ||
               this.activeFilters.urgencia !== 'all' ||
               this.activeFilters.status.length > 0;
    }

    /**
     * Conta quantos filtros estão ativos
     *
     * @returns {number}
     */
    countActiveFilters() {
        let count = 0;

        if (this.activeFilters.cargo) count++;
        if (this.activeFilters.lotacao) count++;
        if (this.activeFilters.superintendencia) count++;
        if (this.activeFilters.subsecretaria) count++;
        if (this.activeFilters.urgencia !== 'all') count++;
        if (this.activeFilters.status.length > 0) count++;

        return count;
    }

    /**
     * Retorna lista de filtros ativos em formato legível
     *
     * @returns {Array<{type, label, value}>}
     */
    getActiveFiltersList() {
        const list = [];

        if (this.activeFilters.cargo) {
            list.push({
                type: 'cargo',
                label: 'Cargo',
                value: this.activeFilters.cargo
            });
        }

        if (this.activeFilters.lotacao) {
            list.push({
                type: 'lotacao',
                label: 'Lotação',
                value: this.activeFilters.lotacao
            });
        }

        if (this.activeFilters.superintendencia) {
            list.push({
                type: 'superintendencia',
                label: 'Superintendência',
                value: this.activeFilters.superintendencia
            });
        }

        if (this.activeFilters.subsecretaria) {
            list.push({
                type: 'subsecretaria',
                label: 'Subsecretaria',
                value: this.activeFilters.subsecretaria
            });
        }

        if (this.activeFilters.urgencia !== 'all') {
            const urgenciaLabels = {
                'critica': 'Crítica',
                'alta': 'Alta',
                'moderada': 'Moderada',
                'baixa': 'Baixa'
            };
            list.push({
                type: 'urgencia',
                label: 'Urgência',
                value: urgenciaLabels[this.activeFilters.urgencia] || this.activeFilters.urgencia
            });
        }

        if (this.activeFilters.status.length > 0) {
            const statusLabels = {
                'com-licenca': 'Com licença',
                'sem-licenca': 'Sem licença',
                'vencidas': 'Vencidas'
            };
            const statusText = this.activeFilters.status
                .map(s => statusLabels[s] || s)
                .join(', ');

            list.push({
                type: 'status',
                label: 'Status',
                value: statusText
            });
        }

        return list;
    }

    /**
     * Salva filtros no localStorage
     */
    saveFilters() {
        try {
            const data = {
                version: '2.0',
                timestamp: Date.now(),
                filters: this.activeFilters
            };

            localStorage.setItem('advancedFilters', JSON.stringify(data));
            console.log('💾 Filtros salvos no localStorage');
        } catch (error) {
            console.warn('Erro ao salvar filtros:', error);
        }
    }

    /**
     * Carrega filtros do localStorage
     */
    loadFilters() {
        try {
            const saved = localStorage.getItem('advancedFilters');
            if (!saved) return;

            const data = JSON.parse(saved);

            // Verificar versão
            if (data.version !== '2.0') {
                console.warn('Versão incompatível de filtros salvos');
                return;
            }

            // Verificar se não está muito antigo (> 7 dias)
            const age = Date.now() - (data.timestamp || 0);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias

            if (age > maxAge) {
                console.log('ℹ️ Filtros salvos muito antigos - ignorando');
                return;
            }

            // Restaurar filtros
            if (data.filters) {
                this.activeFilters = {
                    ...this.activeFilters,
                    ...data.filters
                };
                console.log('✅ Filtros carregados do localStorage:', this.countActiveFilters(), 'ativos');
            }
        } catch (error) {
            console.warn('Erro ao carregar filtros:', error);
        }
    }

    /**
     * Normaliza valor para comparação
     *
     * @param {string} value
     * @returns {string}
     */
    normalizeValue(value) {
        if (typeof value !== 'string') return '';

        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Retorna estatísticas dos filtros
     *
     * @returns {Object}
     */
    getStats() {
        return {
            activeFilters: this.activeFilters,
            activeCount: this.countActiveFilters(),
            hasFilters: this.hasActiveFilters(),
            uniqueValues: {
                cargos: this.uniqueValues.cargos.length,
                lotacoes: this.uniqueValues.lotacoes.length,
                superintendencias: this.uniqueValues.superintendencias.length,
                subsecretarias: this.uniqueValues.subsecretarias.length
            }
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AdvancedFilterManager = AdvancedFilterManager;
}
