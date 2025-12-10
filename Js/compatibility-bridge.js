/**
 * Compatibility Bridge
 * 
 * Garante backward compatibility entre o sistema legado e o novo sistema reestruturado.
 * Este arquivo atua como uma ponte, permitindo que ambos os sistemas coexistam durante
 * a migração gradual.
 * 
 * @version 1.0.0
 * @date 2025-12-10
 */

(function () {
    'use strict';

    console.log('🌉 Carregando Compatibility Bridge...');

    // ==================== FEATURE FLAGS ====================

    /**
     * Feature flags para controlar a migração gradual
     */
    window.FEATURE_FLAGS = window.FEATURE_FLAGS || {
        // Core
        USE_NEW_APP: false,           // Usar novo App.js ao invés de dashboard.js
        USE_EVENT_BUS: true,          // Usar EventBus para comunicação
        USE_ROUTER: true,             // Usar Router para navegação
        USE_NEW_PIPELINE: false,      // Usar novo pipeline de dados

        // Features
        USE_NEW_SEARCH: false,        // Usar novo SearchManager
        USE_NEW_FILTERS: false,       // Usar novo FilterManager
        USE_NEW_CALENDAR: false,      // Usar novo CalendarManager
        USE_NEW_TIMELINE: false,      // Usar novo TimelineManager
        USE_NEW_REPORTS: false,       // Usar novo ReportsManager

        // Debug
        DEBUG_MODE: false,            // Modo debug (logs extras)
        VERBOSE_LOGGING: false        // Logs verbosos
    };

    // Carregar flags do localStorage (se existirem)
    try {
        const savedFlags = localStorage.getItem('featureFlags');
        if (savedFlags) {
            const parsedFlags = JSON.parse(savedFlags);
            Object.assign(window.FEATURE_FLAGS, parsedFlags);
            console.log('✅ Feature flags carregadas do localStorage');
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar feature flags:', error);
    }

    // ==================== ALIASES ====================

    /**
     * Criar aliases para backward compatibility
     */
    function createAliases() {
        // Alias: window.dashboard → window.app
        if (window.app && !window.dashboard) {
            window.dashboard = window.app;
            console.log('✅ Alias criado: window.dashboard → window.app');
        }

        // Alias: window.cronogramaParser → window.CronogramaParser (se necessário)
        if (window.CronogramaParser && !window.cronogramaParser) {
            window.cronogramaParser = window.CronogramaParser;
            console.log('✅ Alias criado: window.cronogramaParser → window.CronogramaParser');
        }
    }

    // ==================== DATA MIGRATION ====================

    /**
     * Migrar dados do sistema antigo para o novo
     */
    function migrateData() {
        // Se houver dados no sistema antigo, migrar para o novo
        if (window.dataStateManager && window.oldData) {
            try {
                window.dataStateManager.setAllServidores(window.oldData);
                console.log('✅ Dados migrados do sistema antigo para o novo');
            } catch (error) {
                console.error('❌ Erro ao migrar dados:', error);
            }
        }
    }

    // ==================== EVENT BRIDGE ====================

    /**
     * Criar ponte de eventos entre sistema legado e novo
     */
    function setupEventBridge() {
        // Eventos legados → Novo EventBus
        if (window.eventBus) {
            // Evento: dataLoaded
            document.addEventListener('dataLoaded', (e) => {
                if (window.FEATURE_FLAGS.VERBOSE_LOGGING) {
                    console.log('🔄 Propagando evento dataLoaded para EventBus');
                }
                window.eventBus.emit('data:loaded', e.detail);
            });

            // Evento: filterApplied
            document.addEventListener('filterApplied', (e) => {
                if (window.FEATURE_FLAGS.VERBOSE_LOGGING) {
                    console.log('🔄 Propagando evento filterApplied para EventBus');
                }
                window.eventBus.emit('filter:applied', e.detail);
            });

            // Evento: pageChanged
            document.addEventListener('pageChanged', (e) => {
                if (window.FEATURE_FLAGS.VERBOSE_LOGGING) {
                    console.log('🔄 Propagando evento pageChanged para EventBus');
                }
                window.eventBus.emit('page:changed', e.detail);
            });

            console.log('✅ Ponte de eventos configurada');
        }

        // Novo EventBus → Eventos legados
        if (window.eventBus) {
            window.eventBus.on('data:loaded', (data) => {
                const event = new CustomEvent('dataLoaded', { detail: data });
                document.dispatchEvent(event);
            });

            window.eventBus.on('filter:applied', (data) => {
                const event = new CustomEvent('filterApplied', { detail: data });
                document.dispatchEvent(event);
            });

            window.eventBus.on('page:changed', (data) => {
                const event = new CustomEvent('pageChanged', { detail: data });
                document.dispatchEvent(event);
            });
        }
    }

    // ==================== INITIALIZATION ====================

    /**
     * Inicializar o Compatibility Bridge
     */
    function init() {
        createAliases();
        migrateData();
        setupEventBridge();

        // Log de status
        console.log('✅ Compatibility Bridge carregado');
        console.log('📊 Feature Flags:', window.FEATURE_FLAGS);

        // Expor função para atualizar flags
        window.updateFeatureFlags = function (flags) {
            Object.assign(window.FEATURE_FLAGS, flags);
            localStorage.setItem('featureFlags', JSON.stringify(window.FEATURE_FLAGS));
            console.log('✅ Feature flags atualizadas:', window.FEATURE_FLAGS);

            // Recarregar página se necessário
            if (flags.USE_NEW_APP !== undefined) {
                console.log('🔄 Recarregando página para aplicar mudanças...');
                setTimeout(() => location.reload(), 500);
            }
        };

        // Expor função para resetar flags
        window.resetFeatureFlags = function () {
            localStorage.removeItem('featureFlags');
            console.log('✅ Feature flags resetadas');
            location.reload();
        };
    }

    // Executar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
