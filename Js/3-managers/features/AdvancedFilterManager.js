/**
 * AdvancedFilterManager - ported from js - old/modules/AdvancedFilterManager.js
 * Manages advanced filters (cargo, lotacao, superintendencia, subsecretaria, urgencia, status)
 * Persists filters to localStorage and exposes helper methods. Integrates with App via events.
 */

class AdvancedFilterManager {
    constructor(app) {
        this.app = app;

        // Estado dos filtros ativos
        this.activeFilters = {
            cargo: null,
            lotacao: null,
            superintendencia: null,
            subsecretaria: null,
            urgencia: 'all',
            status: []
        };
        // Extended filters
        this.activeFilters.servidor = null;
        this.activeFilters.periodo = null; // { inicio: 'yyyy-mm-dd', fim: 'yyyy-mm-dd' }
        this.activeFilters.idade = null; // { min: number, max: number }
        this.activeFilters.meses = null; // number

        // Cache de valores únicos
        this.uniqueValues = {
            cargos: [],
            lotacoes: [],
            superintendencias: [],
            subsecretarias: [],
            subsecretariasBySuper: new Map(),
            servidores: [],
            urgencias: []
        };

        // Carregar filtros salvos
        this.loadFilters();
    }

    applyFilters(servidores) {
        if (!servidores || servidores.length === 0) return [];
        let filtered = [...servidores];

        if (this.activeFilters.cargo) {
            filtered = filtered.filter(s => this.normalizeValue(s.cargo) === this.normalizeValue(this.activeFilters.cargo));
        }
        if (this.activeFilters.lotacao) {
            filtered = filtered.filter(s => this.normalizeValue(s.lotacao) === this.normalizeValue(this.activeFilters.lotacao));
        }
        if (this.activeFilters.superintendencia) {
            filtered = filtered.filter(s => this.normalizeValue(s.superintendencia) === this.normalizeValue(this.activeFilters.superintendencia));
        }
        if (this.activeFilters.subsecretaria) {
            filtered = filtered.filter(s => this.normalizeValue(s.subsecretaria) === this.normalizeValue(this.activeFilters.subsecretaria));
        }
        if (this.activeFilters.urgencia && this.activeFilters.urgencia !== 'all') {
            filtered = filtered.filter(s => {
                const urgencia = this.normalizeValue(s.nivelUrgencia || s.urgencia || '');
                return urgencia === this.activeFilters.urgencia;
            });
        }
        if (this.activeFilters.status && this.activeFilters.status.length > 0) {
            filtered = filtered.filter(s => this.matchesStatusFilters(s));
        }

        // Filtrar por servidor (nome)
        if (this.activeFilters.servidor) {
            const q = this.normalizeValue(this.activeFilters.servidor);
            filtered = filtered.filter(s => {
                const nome = this.findFieldValue(s, ['nome', 'NOME', 'servidor', 'SERVIDOR']) || '';
                return this.normalizeValue(nome).includes(q);
            });
        }

        // Filtrar por periodo: incluir servidores que tenham alguma licença dentro do intervalo
        if (this.activeFilters.periodo && this.activeFilters.periodo.inicio && this.activeFilters.periodo.fim) {
            const from = this._parseDate(this.activeFilters.periodo.inicio);
            const to = this._parseDate(this.activeFilters.periodo.fim);
            if (from && to) {
                filtered = filtered.filter(s => {
                    const licencas = Array.isArray(s.licencas) ? s.licencas : [];
                    return licencas.some(l => {
                        const inicio = this._parseDate(l.A_PARTIR || l.aPartir || l.inicio || l.dataInicio || l.DATA_INICIO);
                        const fim = this._parseDate(l.TERMINO || l.termino || l.fim || l.dataFim || l.DATA_FIM);
                        if (!inicio || !fim) return false;
                        return (inicio <= to && fim >= from);
                    });
                });
            }
        }

        // Filtrar por idade (min/max) se houver campo de idade ou data nascimento
        if (this.activeFilters.idade && (this.activeFilters.idade.min || this.activeFilters.idade.max)) {
            const min = this.activeFilters.idade.min || 0;
            const max = this.activeFilters.idade.max || 200;
            filtered = filtered.filter(s => {
                const idadeVal = s.idade || s.IDADE || this._calculateAgeFromFields(s);
                if (idadeVal == null) return false;
                return idadeVal >= min && idadeVal <= max;
            });
        }

        // Filtrar por meses (interpretação: GOZO em meses)
        if (this.activeFilters.meses) {
            const minDays = parseInt(this.activeFilters.meses) * 30;
            filtered = filtered.filter(s => {
                const licencas = Array.isArray(s.licencas) ? s.licencas : [];
                return licencas.some(l => {
                    const gozo = parseInt(l.GOZO || l.gozo || 0) || 0;
                    return gozo >= minDays;
                });
            });
        }

        return filtered;
    }

    matchesStatusFilters(servidor) {
        const status = this.activeFilters.status || [];
        if (status.length === 0) return true;

        const hasLicenca = servidor.licencas && servidor.licencas.length > 0;
        const hasVencidas = servidor.licencas && servidor.licencas.some(l => {
            const hoje = new Date();
            const fim = l.dataFim ? new Date(l.dataFim) : (l.fim || l.TERMINO ? new Date(l.fim || l.TERMINO) : null);
            return fim && fim < hoje;
        });

        return status.some(s => {
            if (s === 'com-licenca') return hasLicenca;
            if (s === 'sem-licenca') return !hasLicenca;
            if (s === 'vencidas') return hasVencidas;
            return false;
        });
    }

    // Helper: parse several date formats
    _parseDate(raw) {
        if (!raw) return null;
        if (raw instanceof Date) return raw;
        if (typeof raw === 'number') return new Date(raw);
        if (typeof raw === 'string') {
            let match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
            match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            const parsed = new Date(raw);
            if (!isNaN(parsed)) return parsed;
        }
        return null;
    }

    _calculateAgeFromFields(s) {
        // try birth date fields
        const candidate = this.findFieldValue(s, ['nasc', 'nascimento', 'data_nasc', 'dataNascimento', 'dt_nasc']);
        const d = this._parseDate(candidate);
        if (!d) return null;
        const diff = Date.now() - d.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    findFieldValue(obj, patterns) {
        if (!obj) return null;
        const keys = Object.keys(obj);
        for (const p of patterns) {
            const re = new RegExp(p, 'i');
            const k = keys.find(key => re.test(key));
            if (k) return obj[k];
        }
        return null;
    }

    extractUniqueValues(servidores) {
        if (!servidores || servidores.length === 0) return;

        const cargosSet = new Set();
        const lotacoesSet = new Set();
        const superintendenciasSet = new Set();
        const subsecretariasSet = new Set();
        const subsecretariasBySuper = new Map();

        const findField = (obj, patterns) => {
            if (!obj) return null;
            const keys = Object.keys(obj || {});
            for (const p of patterns) {
                const re = new RegExp(p, 'i');
                const k = keys.find(key => re.test(key));
                if (k) return obj[k];
            }
            return null;
        };

        for (const servidor of servidores) {
            const cargoVal = findField(servidor, ['^cargo$', 'cargo', 'CARGO']);
            const lotacaoVal = findField(servidor, ['lotac', 'lotação', 'LOTACAO']);
            const superVal = findField(servidor, ['super', 'superintend']);
            const subsecVal = findField(servidor, ['subsec', 'subsecret', 'subsecretaria']);

            if (cargoVal) cargosSet.add(String(cargoVal).trim());
            if (lotacaoVal) lotacoesSet.add(String(lotacaoVal).trim());
            if (superVal) superintendenciasSet.add(String(superVal).trim());
            if (subsecVal) subsecretariasSet.add(String(subsecVal).trim());

            if (superVal && subsecVal) {
                const supKey = String(superVal).trim();
                if (!subsecretariasBySuper.has(supKey)) subsecretariasBySuper.set(supKey, new Set());
                subsecretariasBySuper.get(supKey).add(String(subsecVal).trim());
            }
            // collect servidores (names)
            const nomeVal = this.findFieldValue(servidor, ['^nome$', 'nome', 'NOME', 'SERVIDOR', 'servidor']);
            if (nomeVal) this.uniqueValues.servidores.push(String(nomeVal).trim());

            // collect urgencias
            const urg = this.findFieldValue(servidor, ['urg', 'nivelUrgencia', 'nivel_urgencia']);
            if (urg) this.uniqueValues.urgencias.push(String(urg).trim());
        }

        this.uniqueValues.cargos = Array.from(cargosSet).sort();
        this.uniqueValues.lotacoes = Array.from(lotacoesSet).sort();
        this.uniqueValues.superintendencias = Array.from(superintendenciasSet).sort();
        this.uniqueValues.subsecretarias = Array.from(subsecretariasSet).sort();

        this.uniqueValues.subsecretariasBySuper = new Map();
        for (const [sup, subs] of subsecretariasBySuper) {
            this.uniqueValues.subsecretariasBySuper.set(sup, Array.from(subs).sort());
        }
        // finalize servidores and urgencias unique arrays
        this.uniqueValues.servidores = Array.from(new Set(this.uniqueValues.servidores)).sort();
        this.uniqueValues.urgencias = Array.from(new Set(this.uniqueValues.urgencias)).sort();
    }

    getUniqueValues(field) {
        switch (field) {
            case 'cargo': return this.uniqueValues.cargos;
            case 'lotacao': return this.uniqueValues.lotacoes;
            case 'superintendencia': return this.uniqueValues.superintendencias;
            case 'subsecretaria': return this.uniqueValues.subsecretarias;
            case 'servidor': return this.uniqueValues.servidores;
            case 'urgencia': return this.uniqueValues.urgencias;
            default: return [];
        }
    }

    getSubsecretariasBySuper(superintendencia) {
        if (!superintendencia) return [];
        return this.uniqueValues.subsecretariasBySuper.get(superintendencia) || [];
    }

    updateCascadeFilters(superintendencia) {
        const available = this.getSubsecretariasBySuper(superintendencia);
        if (this.activeFilters.subsecretaria && !available.includes(this.activeFilters.subsecretaria)) {
            this.activeFilters.subsecretaria = null;
        }
        return available;
    }

    setFilter(filterType, value) {
        switch (filterType) {
            case 'cargo':
            case 'lotacao':
            case 'superintendencia':
            case 'subsecretaria':
                this.activeFilters[filterType] = value || null;
                break;
            case 'servidor':
                this.activeFilters.servidor = value || null;
                break;
            case 'urgencia':
                this.activeFilters.urgencia = value || 'all';
                break;
            case 'periodo':
                // expect { inicio, fim }
                this.activeFilters.periodo = value && typeof value === 'object' ? value : null;
                break;
            case 'idade':
                // expect { min, max }
                this.activeFilters.idade = value && typeof value === 'object' ? value : null;
                break;
            case 'meses':
                this.activeFilters.meses = value ? Number(value) : null;
                break;
            case 'status':
                if (Array.isArray(value)) this.activeFilters.status = value;
                break;
            default:
                console.warn('Tipo de filtro desconhecido:', filterType);
                return;
        }

        this.saveFilters();
        this._notifyFiltersChanged();
    }

    removeFilter(filterType) {
        switch (filterType) {
            case 'cargo':
            case 'lotacao':
            case 'superintendencia':
            case 'subsecretaria':
                this.activeFilters[filterType] = null;
                break;
            case 'servidor':
                this.activeFilters.servidor = null;
                break;
            case 'periodo':
                this.activeFilters.periodo = null;
                break;
            case 'idade':
                this.activeFilters.idade = null;
                break;
            case 'meses':
                this.activeFilters.meses = null;
                break;
            case 'urgencia':
                this.activeFilters.urgencia = 'all';
                break;
            case 'status':
                this.activeFilters.status = [];
                break;
        }

        this.saveFilters();
        this._notifyFiltersChanged();
    }

    clearAll() {
        this.activeFilters = { cargo: null, lotacao: null, superintendencia: null, subsecretaria: null, urgencia: 'all', status: [] };
        this.saveFilters();
        this._notifyFiltersChanged();
    }

    hasActiveFilters() {
         return this.activeFilters.cargo !== null || this.activeFilters.lotacao !== null ||
             this.activeFilters.superintendencia !== null || this.activeFilters.subsecretaria !== null ||
             this.activeFilters.servidor !== null || this.activeFilters.periodo !== null ||
             this.activeFilters.idade !== null || this.activeFilters.meses !== null ||
             this.activeFilters.urgencia !== 'all' || (this.activeFilters.status && this.activeFilters.status.length>0);
    }

    countActiveFilters() {
        let count = 0;
        if (this.activeFilters.cargo) count++;
        if (this.activeFilters.lotacao) count++;
        if (this.activeFilters.superintendencia) count++;
        if (this.activeFilters.subsecretaria) count++;
        if (this.activeFilters.servidor) count++;
        if (this.activeFilters.periodo) count++;
        if (this.activeFilters.idade) count++;
        if (this.activeFilters.meses) count++;
        if (this.activeFilters.urgencia !== 'all') count++;
        if (this.activeFilters.status && this.activeFilters.status.length>0) count++;
        return count;
    }

    getActiveFiltersList() {
        const list = [];
        if (this.activeFilters.cargo) list.push({type:'cargo', label:'Cargo', value:this.activeFilters.cargo});
        if (this.activeFilters.lotacao) list.push({type:'lotacao', label:'Lotação', value:this.activeFilters.lotacao});
        if (this.activeFilters.superintendencia) list.push({type:'superintendencia', label:'Superintendência', value:this.activeFilters.superintendencia});
        if (this.activeFilters.subsecretaria) list.push({type:'subsecretaria', label:'Subsecretaria', value:this.activeFilters.subsecretaria});
        if (this.activeFilters.servidor) list.push({type:'servidor', label:'Servidor', value:this.activeFilters.servidor});
        if (this.activeFilters.periodo) list.push({type:'periodo', label:'Período', value:`${this.activeFilters.periodo.inicio || ''} → ${this.activeFilters.periodo.fim || ''}`});
        if (this.activeFilters.idade) list.push({type:'idade', label:'Idade', value:`${this.activeFilters.idade.min || ''}–${this.activeFilters.idade.max || ''}`});
        if (this.activeFilters.meses) list.push({type:'meses', label:'Meses', value:String(this.activeFilters.meses)});
        if (this.activeFilters.urgencia !== 'all') list.push({type:'urgencia', label:'Urgência', value:this.activeFilters.urgencia});
        if (this.activeFilters.status && this.activeFilters.status.length>0) list.push({type:'status', label:'Status', value:this.activeFilters.status.join(', ')});
        return list;
    }

    saveFilters() {
        try {
            const data = { version: '2.0', timestamp: Date.now(), filters: this.activeFilters };
            localStorage.setItem('advancedFilters', JSON.stringify(data));
        } catch (e) { console.warn('Erro ao salvar filtros:', e); }
    }

    loadFilters() {
        try {
            const saved = localStorage.getItem('advancedFilters');
            if (!saved) return;
            const data = JSON.parse(saved);
            if (data.version !== '2.0') return;
            const age = Date.now() - (data.timestamp || 0);
            const maxAge = 7*24*60*60*1000;
            if (age > maxAge) return;
            if (data.filters) this.activeFilters = { ...this.activeFilters, ...data.filters };
        } catch (e) { console.warn('Erro ao carregar filtros:', e); }
    }

    normalizeValue(value) {
        if (typeof value !== 'string') return '';
        return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    getStats() {
        return { activeFilters: this.activeFilters, activeCount: this.countActiveFilters(), hasFilters: this.hasActiveFilters(), uniqueValues: { cargos: this.uniqueValues.cargos.length, lotacoes: this.uniqueValues.lotacoes.length, superintendencias: this.uniqueValues.superintendencias.length, subsecretarias: this.uniqueValues.subsecretarias.length } };
    }

    // UI rendering for modal (optional, used if modal exists in DOM)
    renderActiveFiltersList() {
        const container = document.getElementById('activeFiltersList');
        const countBadge = document.getElementById('activeFiltersCount');
        if (!container) return;
        const filters = this.getActiveFiltersList();
        if (countBadge) countBadge.textContent = `(${filters.length})`;
        container.innerHTML = '';
        if (filters.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="bi bi-funnel"></i><p>Nenhum filtro ativo</p><small>Adicione filtros usando o formulário ao lado</small></div>`;
            return;
        }
        filters.forEach(filter => {
            const filterCard = document.createElement('div');
            filterCard.className = 'active-filter-item';
            filterCard.innerHTML = `<div class="filter-item-header"><span class="filter-item-label">${filter.label}</span><button class="filter-item-remove" data-filter-type="${filter.type}" title="Remover filtro"><i class="bi bi-x"></i></button></div><div class="filter-item-value">${this.escapeHtml(filter.value)}</div>`;
            const removeBtn = filterCard.querySelector('.filter-item-remove');
            removeBtn.addEventListener('click', () => {
                this.removeFilter(filter.type);
                this.renderActiveFiltersList();
                if (this.app && typeof this.app.applyFiltersAndSearch === 'function') this.app.applyFiltersAndSearch();
                document.dispatchEvent(new CustomEvent('filtersChanged'));
            });
            container.appendChild(filterCard);
        });
    }

    escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

    _notifyFiltersChanged() {
        // Emit event so other modules react
        document.dispatchEvent(new CustomEvent('advanced-filters-changed', { detail: { filters: this.activeFilters } }));
        document.dispatchEvent(new CustomEvent('filtersChanged'));
    }
}

// Export
if (typeof window !== 'undefined') window.AdvancedFilterManager = AdvancedFilterManager;
if (typeof module !== 'undefined' && module.exports) module.exports = AdvancedFilterManager;
