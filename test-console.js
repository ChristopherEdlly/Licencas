/**
 * Script de Teste E2E - Para executar no console do index.html
 * 
 * Como usar:
 * 1. Abra index.html no navegador
 * 2. Abra o Console (F12)
 * 3. Cole este script inteiro e pressione Enter
 * 4. Aguarde os resultados
 */

(async function () {
    console.log('%c🧪 INICIANDO TESTES E2E', 'background: #667eea; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    console.log('');

    let passed = 0;
    let failed = 0;
    const results = [];

    function test(name, condition) {
        const success = typeof condition === 'function' ? condition() : condition;
        if (success) {
            console.log(`%c✅ ${name}`, 'color: #10b981; font-weight: bold;');
            passed++;
        } else {
            console.log(`%c❌ ${name}`, 'color: #ef4444; font-weight: bold;');
            failed++;
        }
        results.push({ name, success });
        return success;
    }

    console.log('%c📦 Teste 1: Carregamento Inicial', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('Página carregada', document.readyState === 'complete');
    test('Scripts carregados', document.querySelectorAll('script[src]').length > 0);
    test('DOM renderizado', document.body !== null);
    console.log('');

    console.log('%c🔧 Teste 2: Módulos Core (Camada 1)', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('DateUtils disponível', typeof DateUtils !== 'undefined');
    test('FormatUtils disponível', typeof FormatUtils !== 'undefined');
    test('ValidationUtils disponível', typeof ValidationUtils !== 'undefined');
    test('MathUtils disponível', typeof MathUtils !== 'undefined');
    test('DataParser disponível', typeof DataParser !== 'undefined');
    test('DataTransformer disponível', typeof DataTransformer !== 'undefined');
    test('DataFilter disponível', typeof DataFilter !== 'undefined');
    test('DataAggregator disponível', typeof DataAggregator !== 'undefined');
    console.log('');

    console.log('%c🔌 Teste 3: Services (Camada 2)', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('FileService disponível', typeof FileService !== 'undefined');
    test('CacheService disponível', typeof CacheService !== 'undefined');
    test('ExportService disponível', typeof ExportService !== 'undefined');
    test('NotificationService disponível', typeof NotificationService !== 'undefined');
    test('SharePointService disponível', typeof SharePointService !== 'undefined');
    test('AuthenticationService disponível', typeof AuthenticationService !== 'undefined');
    console.log('');

    console.log('%c⚙️ Teste 4: Managers (Camada 3)', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('DataStateManager disponível', typeof window.dataStateManager !== 'undefined');
    test('FilterStateManager disponível', typeof window.filterStateManager !== 'undefined');
    test('UIStateManager disponível', typeof window.uiStateManager !== 'undefined');
    test('TableManager disponível', typeof TableManager !== 'undefined');
    test('ChartManager disponível', typeof ChartManager !== 'undefined');
    test('ModalManager disponível', typeof ModalManager !== 'undefined');
    test('SidebarManager disponível', typeof SidebarManager !== 'undefined');
    console.log('');

    console.log('%c📄 Teste 5: Pages (Camada 4)', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('HomePage disponível', typeof HomePage !== 'undefined');
    test('CalendarPage disponível', typeof CalendarPage !== 'undefined');
    test('TimelinePage disponível', typeof TimelinePage !== 'undefined');
    test('ReportsPage disponível', typeof ReportsPage !== 'undefined');
    test('SettingsPage disponível', typeof SettingsPage !== 'undefined');
    test('TipsPage disponível', typeof TipsPage !== 'undefined');
    console.log('');

    console.log('%c🚀 Teste 6: App Layer (Camada 5)', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('EventBus disponível', typeof EventBus !== 'undefined');
    test('Router disponível', typeof Router !== 'undefined');
    test('App disponível', typeof App !== 'undefined');
    console.log('');

    console.log('%c🌉 Teste 7: Compatibility Bridge', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');
    test('FEATURE_FLAGS definido', typeof window.FEATURE_FLAGS !== 'undefined');
    test('updateFeatureFlags() disponível', typeof window.updateFeatureFlags === 'function');
    test('resetFeatureFlags() disponível', typeof window.resetFeatureFlags === 'function');
    console.log('');

    console.log('%c🧪 Teste 8: Funcionalidades', 'background: #3b82f6; color: white; padding: 5px; font-weight: bold;');

    // Teste EventBus
    if (typeof window.eventBus !== 'undefined') {
        let eventReceived = false;
        window.eventBus.on('test:e2e', () => { eventReceived = true; });
        window.eventBus.emit('test:e2e');
        test('EventBus funciona (emit/on)', eventReceived);
    } else {
        test('EventBus funciona (emit/on)', false);
    }

    // Teste Router
    if (typeof window.router !== 'undefined') {
        test('Router tem rotas', window.router.getRoutes().length > 0);
    } else {
        test('Router tem rotas', false);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('');

    if (failed === 0) {
        console.log(`%c🎉 TODOS OS TESTES PASSARAM! (${passed}/${passed + failed})`, 'background: #10b981; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    } else {
        console.log(`%c⚠️ ${failed} TESTE(S) FALHARAM (${passed}/${passed + failed})`, 'background: #ef4444; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
        console.log('');
        console.log('%cTestes que falharam:', 'font-weight: bold; color: #ef4444;');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  ❌ ${r.name}`);
        });
    }

    console.log('');
    console.log('='.repeat(60));

    // Retornar resultados
    return {
        total: passed + failed,
        passed,
        failed,
        success: failed === 0,
        results
    };
})();
