/**
 * Configuração Global e Feature Flags
 * Deve ser carregado antes de qualquer outro script da aplicação.
 */
(function() {
    window.FEATURE_FLAGS = window.FEATURE_FLAGS || {
        // Core
        USE_NEW_APP: true,            // ATIVADO - Usar novo App.js
        USE_EVENT_BUS: true,          // Usar EventBus para comunicação
        USE_ROUTER: true,             // Usar Router para navegação
        USE_NEW_PIPELINE: true,       // ATIVADO - Usar novo pipeline de dados

        // Features
        USE_NEW_SEARCH: true,         // ATIVADO - Usar novo SearchManager
        USE_NEW_FILTERS: true,        // ATIVADO - Usar novo FilterManager
        USE_NEW_CALENDAR: true,       // ATIVADO - Usar novo CalendarManager
        USE_NEW_TIMELINE: true,       // ATIVADO - Usar novo TimelineManager
        USE_NEW_REPORTS: true,        // ATIVADO - Usar novo ReportsManager

        // Debug
        DEBUG_MODE: true,             // ATIVADO - Modo debug
        VERBOSE_LOGGING: false        // Logs verbosos
    };

    // Carregar overrides do localStorage
    try {
        const saved = localStorage.getItem('featureFlags');
        if (saved) {
            Object.assign(window.FEATURE_FLAGS, JSON.parse(saved));
            console.log('✅ Feature flags carregadas do localStorage');
        }
    } catch (e) {
        console.warn('⚠️ Erro ao carregar feature flags:', e);
    }
    
    console.log('🏁 Config carregado: Feature Flags init');
})();
