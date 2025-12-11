/**
 * DataStateManager - Gerenciamento de estado global dos dados
 *
 * Responsabilidades:
 * - Armazenar dados de servidores (original e filtrado)
 * - Notificar observadores sobre mudanças (Observer Pattern)
 * - Manter single source of truth
 *
 * @module 3-managers/state/DataStateManager
 */

class DataStateManager {
    /**
     * Construtor privado (Singleton)
     */
    constructor() {
        // Dados
        this._allServidores = [];           // Dataset original completo
        this._filteredServidores = [];      // Dados após aplicar filtros
        this._notificacoes = [];            // Notificações
        this._loadingProblems = [];         // Problemas no carregamento

        // Observers
        this._listeners = [];               // Lista de callbacks registrados

        // Histórico
        this._history = [];                 // Histórico de mudanças
        this._maxHistorySize = 50;

        console.log('✅ DataStateManager criado');
    }

    // ==================== AÇÕES DE FILTRO ====================

    /**
     * Aplica filtros aos dados carregados
     * @param {Object} filters - Objeto com critérios de filtro
     */
    applyFilters(filters) {
        if (!filters || Object.keys(filters).length === 0) {
            this.clearFilters();
            return;
        }

        if (typeof window !== 'undefined' && window.DataFilter) {
            try {
                const filtered = window.DataFilter.applyFilters(this._allServidores, filters);
                this.setFilteredServidores(filtered);
                console.log('🔍 Filtros aplicados via DataStateManager');
            } catch (error) {
                console.error('❌ Erro ao aplicar filtros:', error);
            }
        } else {
            console.warn('⚠️ DataFilter não disponível para aplicar filtros');
        }
    }

    /**
     * Limpa filtros e restaura dados originais
     */
    clearFilters() {
        this.setFilteredServidores(this._allServidores);
        console.log('🔄 Filtros limpos via DataStateManager');
    }

    // ==================== GETTERS ====================

    /**
     * Retorna todos os servidores (original)
     * @returns {Array<Object>}
     */
    getAllServidores() {
        return this._allServidores;
    }

    /**
     * Retorna servidores filtrados
     * @returns {Array<Object>}
     */
    getFilteredServidores() {
        return this._filteredServidores;
    }

    /**
     * Alias para getFilteredServidores() (compatibilidade)
     * @returns {Array<Object>}
     */
    getFilteredData() {
        return this.getFilteredServidores();
    }

    /**
     * Retorna notificações
     * @returns {Array<Object>}
     */
    getNotificacoes() {
        return this._notificacoes;
    }

    /**
     * Retorna problemas de carregamento
     * @returns {Array<Object>}
     */
    getLoadingProblems() {
        return this._loadingProblems;
    }

    /**
     * Retorna servidor por índice
     * @param {number} index - Índice no array filtrado
     * @returns {Object|null}
     */
    getServidorByIndex(index) {
        if (index < 0 || index >= this._filteredServidores.length) {
            return null;
        }
        return this._filteredServidores[index];
    }

    /**
     * Busca servidor por nome
     * @param {string} nome - Nome do servidor
     * @returns {Object|null}
     */
    getServidorByNome(nome) {
        return this._allServidores.find(s =>
            s.servidor && s.servidor.toLowerCase() === nome.toLowerCase()
        ) || null;
    }

    /**
     * Busca servidor por CPF
     * @param {string} cpf - CPF do servidor
     * @returns {Object|null}
     */
    getServidorByCPF(cpf) {
        return this._allServidores.find(s =>
            s.cpf && s.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, '')
        ) || null;
    }

    // ==================== SETTERS ====================

    /**
     * Define dataset completo de servidores
     * @param {Array<Object>} data - Dados dos servidores
     */
    setAllServidores(data) {
        this._allServidores = Array.isArray(data) ? data : [];

        this._addToHistory('allServidores', data.length);
        this._notifyChange('all-data-changed', {
            data: this._allServidores,
            count: this._allServidores.length
        });

        console.log(`📊 AllServidores atualizado: ${this._allServidores.length} registros`);
    }

    /**
     * Define servidores filtrados
     * @param {Array<Object>} data - Dados filtrados
     */
    setFilteredServidores(data) {
        this._filteredServidores = Array.isArray(data) ? data : [];

        this._addToHistory('filteredServidores', data.length);
        this._notifyChange('filtered-data-changed', {
            data: this._filteredServidores,
            count: this._filteredServidores.length
        });

        console.log(`🔍 FilteredServidores atualizado: ${this._filteredServidores.length} registros`);
    }

    /**
     * Define notificações
     * @param {Array<Object>} data - Notificações
     */
    setNotificacoes(data) {
        this._notificacoes = Array.isArray(data) ? data : [];

        this._notifyChange('notifications-changed', {
            data: this._notificacoes,
            count: this._notificacoes.length
        });

        console.log(`🔔 Notificações atualizadas: ${this._notificacoes.length} registros`);
    }

    /**
     * Define problemas de carregamento
     * @param {Array<Object>} problems - Lista de problemas
     */
    setLoadingProblems(problems) {
        this._loadingProblems = Array.isArray(problems) ? problems : [];

        this._notifyChange('loading-problems-changed', {
            problems: this._loadingProblems,
            count: this._loadingProblems.length
        });

        if (this._loadingProblems.length > 0) {
            console.warn(`⚠️ ${this._loadingProblems.length} problemas no carregamento`);
        }
    }

    // ==================== OBSERVER PATTERN ====================

    /**
     * Registra listener para mudanças
     * @param {string} eventType - Tipo de evento (ex: 'all-data-changed')
     * @param {Function} callback - Função a ser chamada
     * @returns {Function} - Função para desregistrar
     */
    subscribe(eventType, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }

        const listener = { eventType, callback };
        this._listeners.push(listener);

        console.log(`👂 Listener registrado para: ${eventType}`);

        // Retornar função para desregistrar
        return () => this.unsubscribe(eventType, callback);
    }

    /**
     * Remove listener
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Callback a remover
     */
    unsubscribe(eventType, callback) {
        this._listeners = this._listeners.filter(
            l => !(l.eventType === eventType && l.callback === callback)
        );

        console.log(`🔇 Listener removido para: ${eventType}`);
    }

    /**
     * Notifica todos os listeners de um tipo de evento
     * @private
     * @param {string} eventType - Tipo de evento
     * @param {*} data - Dados a passar
     */
    _notifyChange(eventType, data) {
        const relevantListeners = this._listeners.filter(l => l.eventType === eventType);

        relevantListeners.forEach(listener => {
            try {
                listener.callback(data);
            } catch (error) {
                console.error(`Erro ao notificar listener de ${eventType}:`, error);
            }
        });

        // Também emitir evento customizado no document
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }

    // ==================== ESTATÍSTICAS ====================

    /**
     * Retorna estatísticas dos dados
     * @returns {Object}
     */
    getStatistics() {
        return {
            total: this._allServidores.length,
            filtered: this._filteredServidores.length,
            notifications: this._notificacoes.length,
            problems: this._loadingProblems.length,
            urgencies: this._getUrgencyBreakdown(),
            hasData: this._allServidores.length > 0
        };
    }

    /**
     * Retorna distribuição de urgências
     * @private
     * @returns {Object}
     */
    _getUrgencyBreakdown() {
        const breakdown = {
            critica: 0,
            alta: 0,
            moderada: 0,
            baixa: 0,
            undefined: 0
        };

        this._filteredServidores.forEach(servidor => {
            const urgencia = servidor.urgencia || 'undefined';
            if (breakdown.hasOwnProperty(urgencia)) {
                breakdown[urgencia]++;
            }
        });

        return breakdown;
    }

    // ==================== HISTÓRICO ====================

    /**
     * Adiciona entrada ao histórico
     * @private
     * @param {string} action - Ação realizada
     * @param {*} data - Dados da ação
     */
    _addToHistory(action, data) {
        this._history.push({
            action,
            data,
            timestamp: new Date().toISOString()
        });

        // Limitar tamanho do histórico
        if (this._history.length > this._maxHistorySize) {
            this._history.shift();
        }
    }

    /**
     * Retorna histórico de mudanças
     * @returns {Array<Object>}
     */
    getHistory() {
        return [...this._history];
    }

    /**
     * Limpa histórico
     */
    clearHistory() {
        this._history = [];
        console.log('🗑️ Histórico limpo');
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Limpa todos os dados
     */
    clear() {
        this._allServidores = [];
        this._filteredServidores = [];
        this._notificacoes = [];
        this._loadingProblems = [];

        this._notifyChange('data-cleared', {});

        console.log('🗑️ Todos os dados limpos');
    }

    /**
     * Verifica se tem dados carregados
     * @returns {boolean}
     */
    hasData() {
        return this._allServidores.length > 0;
    }

    /**
     * Retorna informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            allServidores: this._allServidores.length,
            filteredServidores: this._filteredServidores.length,
            notificacoes: this._notificacoes.length,
            loadingProblems: this._loadingProblems.length,
            listeners: this._listeners.length,
            historySize: this._history.length,
            memoryUsage: this._estimateMemoryUsage()
        };
    }

    /**
     * Estima uso de memória (aproximado)
     * @private
     * @returns {string}
     */
    _estimateMemoryUsage() {
        const dataSize = JSON.stringify({
            all: this._allServidores,
            filtered: this._filteredServidores,
            notifications: this._notificacoes
        }).length;

        const sizeMB = (dataSize / 1024 / 1024).toFixed(2);
        return `~${sizeMB} MB`;
    }
}

// Criar instância global (Singleton)
if (typeof window !== 'undefined') {
    if (!window.dataStateManager) {
        window.dataStateManager = new DataStateManager();
    }
}

// Expor classe também
if (typeof window !== 'undefined') {
    window.DataStateManager = DataStateManager;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStateManager;
}
