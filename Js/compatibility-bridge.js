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

    // Feature Flags agora são gerenciadas em js/0-config/Config.js
    // Mantendo referência para garantir acesso se necessário, mas não redefinindo
    if (!window.FEATURE_FLAGS) {
        console.warn('⚠️ FEATURE_FLAGS não encontrado! Verifique se Config.js foi carregado.');
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
     * NOTA: Apenas UMA direção para evitar loop infinito
     */
    function setupEventBridge() {
        if (!window.eventBus) {
            return;
        }

        // Flag para prevenir loops
        let isProcessingEvent = false;

        // Eventos legados → Novo EventBus (apenas quando originados do sistema legado)
        document.addEventListener('dataLoaded', (e) => {
            if (isProcessingEvent) return; // Prevenir loop
            if (e.__fromEventBus) return; // Já foi processado pelo EventBus

            if (window.FEATURE_FLAGS.VERBOSE_LOGGING) {
                console.log('🔄 Propagando evento dataLoaded para EventBus');
            }
            isProcessingEvent = true;
            window.eventBus.emit('data:loaded', e.detail);
            isProcessingEvent = false;
        });

        document.addEventListener('filterApplied', (e) => {
            if (isProcessingEvent) return;
            if (e.__fromEventBus) return;

            if (window.FEATURE_FLAGS.VERBOSE_LOGGING) {
                console.log('🔄 Propagando evento filterApplied para EventBus');
            }
            isProcessingEvent = true;
            window.eventBus.emit('filter:applied', e.detail);
            isProcessingEvent = false;
        });

        document.addEventListener('pageChanged', (e) => {
            if (isProcessingEvent) return;
            if (e.__fromEventBus) return;

            if (window.FEATURE_FLAGS.VERBOSE_LOGGING) {
                console.log('🔄 Propagando evento pageChanged para EventBus');
            }
            isProcessingEvent = true;
            window.eventBus.emit('page:changed', e.detail);
            isProcessingEvent = false;
        });

        // Novo EventBus → Eventos legados (marcados para evitar re-processamento)
        window.eventBus.on('data:loaded', (data) => {
            if (isProcessingEvent) return;

            isProcessingEvent = true;
            const event = new CustomEvent('dataLoaded', {
                detail: data,
                __fromEventBus: true // Marcador para evitar loop
            });
            document.dispatchEvent(event);
            isProcessingEvent = false;
        });

        window.eventBus.on('filter:applied', (data) => {
            if (isProcessingEvent) return;

            isProcessingEvent = true;
            const event = new CustomEvent('filterApplied', {
                detail: data,
                __fromEventBus: true
            });
            document.dispatchEvent(event);
            isProcessingEvent = false;
        });

        window.eventBus.on('page:changed', (data) => {
            if (isProcessingEvent) return;

            isProcessingEvent = true;
            const event = new CustomEvent('pageChanged', {
                detail: data,
                __fromEventBus: true
            });
            document.dispatchEvent(event);
            isProcessingEvent = false;
        });

        console.log('✅ Ponte de eventos configurada (com proteção anti-loop)');
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
