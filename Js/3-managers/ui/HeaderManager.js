/**
 * HeaderManager - Gerenciamento do header global
 *
 * Responsabilidades:
 * - Gerenciar barra de pesquisa do header
 * - Atualizar contador de servidores
 * - Gerenciar botões de importação e tema
 * - Integrar com SearchManager para busca inteligente
 * - Reagir a eventos de dados carregados
 *
 * @module 3-managers/ui/HeaderManager
 */

class HeaderManager {
    /**
     * Construtor
     * @param {Object} app - Referência à aplicação
     */
    constructor(app) {
        this.app = app;

        // Elementos DOM
        this.headerSearchInput = null;
        this.clearSearchBtn = null;
        this.totalServidoresSpan = null;

        // Estado
        this.isSearching = false;
        this.searchDebounceTimer = null;
        this.searchDebounceDelay = 300; // ms

        console.log('✅ HeaderManager criado');
    }

    /**
     * Inicializa o manager
     */
    init() {
        this._cacheElements();
        this._setupEventListeners();
        this._subscribeToEvents();

        console.log('✅ HeaderManager inicializado');
    }

    // ==================== INICIALIZAÇÃO ====================

    /**
     * Cacheia elementos DOM
     * @private
     */
    _cacheElements() {
        this.headerSearchInput = document.getElementById('headerSearchInput');
        this.clearSearchBtn = document.getElementById('clearHeaderSearchBtn');
        this.totalServidoresSpan = document.getElementById('totalServidores');

        if (!this.headerSearchInput) {
            console.warn('⚠️ Elemento #headerSearchInput não encontrado');
        }
        if (!this.totalServidoresSpan) {
            console.warn('⚠️ Elemento #totalServidores não encontrado');
        }
    }

    /**
     * Configura event listeners
     * @private
     */
    _setupEventListeners() {
        // Barra de pesquisa
        if (this.headerSearchInput) {
            this.headerSearchInput.addEventListener('input', (e) => {
                this._handleSearchInput(e.target.value);
            });

            this.headerSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }

        // Botão limpar pesquisa
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }

    /**
     * Inscreve-se em eventos do EventBus
     * @private
     */
    _subscribeToEvents() {
        if (!this.app.eventBus) return;

        // Atualizar contador quando dados são carregados
        this.app.eventBus.on('data:loaded', (data) => {
            this.updateCounter(data?.allServidores || []);
        });

        // Atualizar contador quando dados são atualizados
        this.app.eventBus.on('data:updated', (data) => {
            this.updateCounter(data?.allServidores || []);
        });

        // Atualizar contador quando filtros são aplicados
        this.app.eventBus.on('filter:applied', (data) => {
            // Mostrar contagem filtrada se houver filtros
            if (data?.filteredServidores) {
                this.updateCounter(data.filteredServidores, data.allServidores);
            }
        });

        // Limpar contador quando dados são limpos
        this.app.eventBus.on('data:cleared', () => {
            this.updateCounter([]);
        });

        console.log('📡 HeaderManager inscrito em eventos do EventBus');
    }

    // ==================== BUSCA ====================

    /**
     * Manipula input de pesquisa (com debounce)
     * @private
     * @param {string} query - Termo de busca
     */
    _handleSearchInput(query) {
        // Mostrar/ocultar botão limpar
        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = query.trim() ? 'block' : 'none';
        }

        // Debounce da busca
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        this.searchDebounceTimer = setTimeout(() => {
            this._executeSearch(query);
        }, this.searchDebounceDelay);
    }

    /**
     * Executa busca usando SearchManager
     * @private
     * @param {string} query - Termo de busca
     */
    _executeSearch(query) {
        if (!this.app.searchManager) {
            console.warn('⚠️ SearchManager não disponível');
            return;
        }

        // Obter dados para buscar
        const data = this.app.dataStateManager?.getAllServidores() ||
                     this.app.allServidores ||
                     [];

        if (data.length === 0) {
            console.log('ℹ️ Nenhum dado para buscar');
            return;
        }

        this.isSearching = true;

        // Executar busca
        const results = this.app.searchManager.search(query, data);

        console.log(`🔍 Busca no header: "${query}" → ${results.length} resultados`);

        // Atualizar dados filtrados
        if (this.app.dataStateManager) {
            this.app.dataStateManager.setFilteredServidores(results);
        } else {
            this.app.filteredServidores = results;
        }

        // Emitir evento de busca
        if (this.app.eventBus) {
            this.app.eventBus.emit('search:executed', {
                query,
                results,
                count: results.length
            });
        }

        // Atualizar UI (através de evento ou diretamente)
        this._notifySearchResults(query, results);

        this.isSearching = false;
    }

    /**
     * Notifica resultados de busca para atualizar UI
     * @private
     * @param {string} query - Termo de busca
     * @param {Array} results - Resultados
     */
    _notifySearchResults(query, results) {
        // Atualizar tabela na HomePage
        if (this.app.pages?.home) {
            this.app.pages.home.updateTable(results);
        }

        // Atualizar contador
        const totalCount = this.app.dataStateManager?.getAllServidores()?.length ||
                          this.app.allServidores?.length ||
                          0;
        this.updateCounter(results, totalCount);

        // Emitir evento para outros componentes
        if (this.app.eventBus) {
            this.app.eventBus.emit('filter:applied', {
                type: 'search',
                query,
                filteredServidores: results,
                allServidores: this.app.dataStateManager?.getAllServidores() || this.app.allServidores
            });
        }
    }

    /**
     * Limpa busca e restaura dados
     */
    clearSearch() {
        if (this.headerSearchInput) {
            this.headerSearchInput.value = '';
        }

        if (this.clearSearchBtn) {
            this.clearSearchBtn.style.display = 'none';
        }

        // Limpar query no SearchManager
        if (this.app.searchManager) {
            this.app.searchManager.clearCurrentQuery();
        }

        // Restaurar todos os dados
        const allData = this.app.dataStateManager?.getAllServidores() ||
                        this.app.allServidores ||
                        [];

        if (this.app.dataStateManager) {
            this.app.dataStateManager.setFilteredServidores(allData);
        } else {
            this.app.filteredServidores = allData;
        }

        // Emitir evento
        if (this.app.eventBus) {
            this.app.eventBus.emit('search:cleared');
        }

        // Atualizar UI
        this._notifySearchResults('', allData);

        console.log('🗑️ Busca do header limpa');
    }

    // ==================== CONTADOR ====================

    /**
     * Atualiza contador de servidores
     * @param {Array} filtered - Servidores filtrados (opcional)
     * @param {Array|number} total - Total de servidores ou array de todos
     */
    updateCounter(filtered = [], total = null) {
        if (!this.totalServidoresSpan) return;

        let filteredCount = Array.isArray(filtered) ? filtered.length : filtered;
        let totalCount = total;

        // Se total não foi fornecido, usar filtered como total
        if (totalCount === null) {
            totalCount = filteredCount;
        } else if (Array.isArray(total)) {
            totalCount = total.length;
        }

        // Formatar texto
        let text = '';
        if (filteredCount === totalCount) {
            // Sem filtros ativos
            text = `${totalCount.toLocaleString('pt-BR')}`;
        } else {
            // Com filtros ativos
            text = `${filteredCount.toLocaleString('pt-BR')} de ${totalCount.toLocaleString('pt-BR')}`;
        }

        this.totalServidoresSpan.textContent = text;

        // Adicionar classe para indicar filtro ativo
        if (filteredCount < totalCount) {
            this.totalServidoresSpan.classList.add('filtered');
        } else {
            this.totalServidoresSpan.classList.remove('filtered');
        }

        console.log(`📊 Contador atualizado: ${text}`);
    }

    /**
     * Reseta contador para zero
     */
    resetCounter() {
        if (this.totalServidoresSpan) {
            this.totalServidoresSpan.textContent = '0';
            this.totalServidoresSpan.classList.remove('filtered');
        }
    }

    // ==================== UTILITÁRIOS ====================

    /**
     * Foca no input de pesquisa
     */
    focusSearch() {
        if (this.headerSearchInput) {
            this.headerSearchInput.focus();
        }
    }

    /**
     * Define valor da busca programaticamente
     * @param {string} query - Termo de busca
     */
    setSearchQuery(query) {
        if (this.headerSearchInput) {
            this.headerSearchInput.value = query;
            this._handleSearchInput(query);
        }
    }

    /**
     * Retorna query atual
     * @returns {string}
     */
    getSearchQuery() {
        return this.headerSearchInput?.value || '';
    }

    /**
     * Verifica se está buscando
     * @returns {boolean}
     */
    isCurrentlySearching() {
        return this.isSearching;
    }

    /**
     * Informações de debug
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            isSearching: this.isSearching,
            currentQuery: this.getSearchQuery(),
            counterValue: this.totalServidoresSpan?.textContent || 'N/A'
        };
    }
}

// Expor classe
if (typeof window !== 'undefined') {
    window.HeaderManager = HeaderManager;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderManager;
}
