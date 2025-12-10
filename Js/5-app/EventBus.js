/**
 * EventBus - Sistema de comunicação desacoplada entre módulos
 *
 * Responsabilidades:
 * - Implementar padrão Pub/Sub para comunicação entre componentes
 * - Gerenciar registro e emissão de eventos customizados
 * - Manter histórico de eventos para debug
 * - Suportar priorização de listeners
 *
 * @module 5-app/EventBus
 */

class EventBus {
    /**
     * Construtor privado (Singleton)
     */
    constructor() {
        // Listeners registrados
        this._listeners = new Map(); // Map<eventType, Array<{callback, priority}>>

        // Histórico de eventos
        this._eventHistory = [];
        this._maxHistorySize = 50;

        // Debug mode
        this._debugMode = false;

        // Estatísticas
        this._stats = {
            totalEvents: 0,
            totalListeners: 0
        };

        console.log('✅ EventBus criado');
    }

    // ==================== SINGLETON ====================

    /**
     * Retorna instância única do EventBus
     * @returns {EventBus}
     */
    static getInstance() {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }

    // ==================== REGISTRO DE LISTENERS ====================

    /**
     * Registra listener para um evento
     * @param {string} eventType - Tipo de evento (ex: 'data:loaded')
     * @param {Function} callback - Função a ser chamada
     * @param {number} priority - Prioridade (maior = executado primeiro)
     * @returns {Function} - Função para desregistrar
     */
    on(eventType, callback, priority = 0) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }

        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }

        const listener = { callback, priority };
        this._listeners.get(eventType).push(listener);

        // Ordenar por prioridade (maior primeiro)
        this._listeners.get(eventType).sort((a, b) => b.priority - a.priority);

        this._stats.totalListeners++;

        if (this._debugMode) {
            console.log(`👂 Listener registrado: ${eventType} (prioridade: ${priority})`);
        }

        // Retornar função para desregistrar
        return () => this.off(eventType, callback);
    }

    /**
     * Remove listener de um evento
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Callback a remover
     */
    off(eventType, callback) {
        if (!this._listeners.has(eventType)) {
            return;
        }

        const listeners = this._listeners.get(eventType);
        const filtered = listeners.filter(l => l.callback !== callback);

        if (filtered.length === 0) {
            this._listeners.delete(eventType);
        } else {
            this._listeners.set(eventType, filtered);
        }

        this._stats.totalListeners--;

        if (this._debugMode) {
            console.log(`🔇 Listener removido: ${eventType}`);
        }
    }

    /**
     * Registra listener que será executado apenas uma vez
     * @param {string} eventType - Tipo de evento
     * @param {Function} callback - Função a ser chamada
     * @param {number} priority - Prioridade
     * @returns {Function} - Função para desregistrar
     */
    once(eventType, callback, priority = 0) {
        const wrappedCallback = (data) => {
            callback(data);
            this.off(eventType, wrappedCallback);
        };

        return this.on(eventType, wrappedCallback, priority);
    }

    /**
     * Remove todos os listeners de um evento
     * @param {string} eventType - Tipo de evento (opcional)
     */
    removeAllListeners(eventType = null) {
        if (eventType) {
            const count = this._listeners.has(eventType)
                ? this._listeners.get(eventType).length
                : 0;
            this._listeners.delete(eventType);
            this._stats.totalListeners -= count;

            if (this._debugMode) {
                console.log(`🗑️ Removidos ${count} listeners de: ${eventType}`);
            }
        } else {
            this._listeners.clear();
            this._stats.totalListeners = 0;

            if (this._debugMode) {
                console.log('🗑️ Todos os listeners removidos');
            }
        }
    }

    // ==================== EMISSÃO DE EVENTOS ====================

    /**
     * Emite um evento para todos os listeners registrados
     * @param {string} eventType - Tipo de evento
     * @param {*} data - Dados a passar para os listeners
     */
    emit(eventType, data = null) {
        this._stats.totalEvents++;

        // Adicionar ao histórico
        this._addToHistory(eventType, data);

        if (this._debugMode) {
            console.log(`📢 Evento emitido: ${eventType}`, data);
        }

        // Notificar listeners específicos
        this._notifyListeners(eventType, data);

        // Notificar listeners wildcard (*)
        this._notifyListeners('*', { eventType, data });
    }

    /**
     * Notifica listeners de um tipo de evento
     * @private
     * @param {string} eventType - Tipo de evento
     * @param {*} data - Dados do evento
     */
    _notifyListeners(eventType, data) {
        if (!this._listeners.has(eventType)) {
            return;
        }

        const listeners = this._listeners.get(eventType);

        listeners.forEach(listener => {
            try {
                listener.callback(data);
            } catch (error) {
                console.error(`❌ Erro ao executar listener de ${eventType}:`, error);
            }
        });
    }

    // ==================== HISTÓRICO ====================

    /**
     * Adiciona evento ao histórico
     * @private
     * @param {string} eventType - Tipo de evento
     * @param {*} data - Dados do evento
     */
    _addToHistory(eventType, data) {
        this._eventHistory.push({
            eventType,
            data,
            timestamp: new Date().toISOString()
        });

        // Limitar tamanho do histórico
        if (this._eventHistory.length > this._maxHistorySize) {
            this._eventHistory.shift();
        }
    }

    /**
     * Retorna histórico de eventos
     * @param {number} limit - Limite de eventos (padrão: todos)
     * @returns {Array<Object>}
     */
    getHistory(limit = null) {
        if (limit) {
            return this._eventHistory.slice(-limit);
        }
        return [...this._eventHistory];
    }

    /**
     * Limpa histórico de eventos
     */
    clearHistory() {
        this._eventHistory = [];
        if (this._debugMode) {
            console.log('🗑️ Histórico de eventos limpo');
        }
    }

    // ==================== DEBUG E ESTATÍSTICAS ====================

    /**
     * Ativa/desativa modo debug
     * @param {boolean} enabled - Se true, ativa debug
     */
    setDebugMode(enabled) {
        this._debugMode = enabled;
        console.log(`🐛 Debug mode: ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
    }

    /**
     * Retorna estatísticas do EventBus
     * @returns {Object}
     */
    getStats() {
        return {
            totalEvents: this._stats.totalEvents,
            totalListeners: this._stats.totalListeners,
            eventTypes: Array.from(this._listeners.keys()),
            historySize: this._eventHistory.length,
            debugMode: this._debugMode
        };
    }

    /**
     * Retorna informações detalhadas de debug
     * @returns {Object}
     */
    getDebugInfo() {
        const listenersByEvent = {};
        this._listeners.forEach((listeners, eventType) => {
            listenersByEvent[eventType] = listeners.length;
        });

        return {
            stats: this.getStats(),
            listenersByEvent,
            recentEvents: this.getHistory(10)
        };
    }

    /**
     * Lista todos os listeners registrados
     * @returns {Object}
     */
    listListeners() {
        const result = {};
        this._listeners.forEach((listeners, eventType) => {
            result[eventType] = listeners.map(l => ({
                priority: l.priority,
                callback: l.callback.name || 'anonymous'
            }));
        });
        return result;
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Verifica se existe listener para um evento
     * @param {string} eventType - Tipo de evento
     * @returns {boolean}
     */
    hasListeners(eventType) {
        return this._listeners.has(eventType) && this._listeners.get(eventType).length > 0;
    }

    /**
     * Retorna quantidade de listeners de um evento
     * @param {string} eventType - Tipo de evento
     * @returns {number}
     */
    getListenerCount(eventType) {
        return this._listeners.has(eventType) ? this._listeners.get(eventType).length : 0;
    }

    /**
     * Aguarda um evento ser emitido (retorna Promise)
     * @param {string} eventType - Tipo de evento
     * @param {number} timeout - Timeout em ms (0 = sem timeout)
     * @returns {Promise<*>}
     */
    waitFor(eventType, timeout = 0) {
        return new Promise((resolve, reject) => {
            let timeoutId = null;

            const unsubscribe = this.once(eventType, (data) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                resolve(data);
            });

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    unsubscribe();
                    reject(new Error(`Timeout aguardando evento: ${eventType}`));
                }, timeout);
            }
        });
    }
}

// ==================== EVENTOS PREDEFINIDOS ====================

/**
 * Eventos padrão do sistema
 * @readonly
 * @enum {string}
 */
EventBus.Events = {
    // Dados
    DATA_LOADED: 'data:loaded',
    DATA_FILTERED: 'data:filtered',
    DATA_CLEARED: 'data:cleared',

    // Páginas
    PAGE_CHANGED: 'page:changed',
    PAGE_BEFORE_CHANGE: 'page:before-change',

    // Modais
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',

    // Filtros
    FILTER_APPLIED: 'filter:applied',
    FILTER_CLEARED: 'filter:cleared',

    // Busca
    SEARCH_PERFORMED: 'search:performed',
    SEARCH_CLEARED: 'search:cleared',

    // Exportação
    EXPORT_STARTED: 'export:started',
    EXPORT_COMPLETED: 'export:completed',
    EXPORT_FAILED: 'export:failed',

    // UI
    THEME_CHANGED: 'ui:theme-changed',
    LOADING_STARTED: 'ui:loading-started',
    LOADING_COMPLETED: 'ui:loading-completed',

    // Erros
    ERROR_OCCURRED: 'error:occurred',
    WARNING_OCCURRED: 'warning:occurred'
};

// ==================== EXPORTAÇÃO ====================

// Criar instância global (Singleton)
if (typeof window !== 'undefined') {
    if (!window.eventBus) {
        window.eventBus = EventBus.getInstance();
    }
}

// Expor classe também
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}
