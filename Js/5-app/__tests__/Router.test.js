/**
 * Testes para Router
 * 
 * Cobertura:
 * - Singleton pattern
 * - Registro de rotas
 * - Navegação
 * - Histórico
 * - Guardas de rota
 * - Parâmetros de rota
 * - Hash handling
 */

const Router = require('../Router.js');

// Mock de window e location para Node.js
global.window = {
    location: {
        hash: '',
        toString: function () { return this.hash; }
    },
    addEventListener: () => { },
    removeEventListener: () => { }
};

// Helper para criar nova instância (resetar singleton)
function resetRouter() {
    Router._instance = null;
    return Router.getInstance();
}

// Mock de controller
function createMockController() {
    return {
        shown: false,
        hidden: false,
        showParams: null,
        show(params) {
            this.shown = true;
            this.hidden = false;
            this.showParams = params;
        },
        hide() {
            this.shown = false;
            this.hidden = true;
        }
    };
}

// ==================== TESTES ====================

console.log('🧪 Iniciando testes do Router...\n');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
    return new Promise(async (resolve) => {
        try {
            await fn();
            console.log(`✅ ${description}`);
            passedTests++;
            resolve();
        } catch (error) {
            console.error(`❌ ${description}`);
            console.error(`   ${error.message}`);
            failedTests++;
            resolve();
        }
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// ==================== SINGLETON ====================

test('Router é singleton', async () => {
    const instance1 = Router.getInstance();
    const instance2 = Router.getInstance();
    assert(instance1 === instance2, 'Instâncias devem ser iguais');
});

// ==================== REGISTRO DE ROTAS ====================

test('Registra rota simples', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);

    assert(router.hasRoute('/home'), 'Rota /home deve estar registrada');
    assert(router.getRoutes().includes('/home'), 'Lista de rotas deve incluir /home');
});

test('Normaliza path ao registrar', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('#/home', controller);

    assert(router.hasRoute('/home'), 'Deve normalizar removendo #');
});

test('Registra múltiplas rotas', async () => {
    const router = resetRouter();
    const controller1 = createMockController();
    const controller2 = createMockController();
    const controller3 = createMockController();

    router.registerRoutes([
        { path: '/home', controller: controller1 },
        { path: '/about', controller: controller2 },
        { path: '/contact', controller: controller3 }
    ]);

    assert(router.getRoutes().length === 3, 'Deve ter 3 rotas registradas');
    assert(router.hasRoute('/home'), 'Deve ter /home');
    assert(router.hasRoute('/about'), 'Deve ter /about');
    assert(router.hasRoute('/contact'), 'Deve ter /contact');
});

test('Define rota padrão', async () => {
    const router = resetRouter();

    router.setDefaultRoute('/home');

    assert(router._defaultRoute === '/home', 'Rota padrão deve ser /home');
});

// ==================== NAVEGAÇÃO ====================

test('Navega para rota registrada', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    const success = await router.navigate('/home');

    assert(success === true, 'Navegação deve ser bem-sucedida');
    assert(router.getCurrentRoute() === '/home', 'Rota atual deve ser /home');
    assert(controller.shown === true, 'Controller deve estar visível');
});

test('Esconde controller anterior ao navegar', async () => {
    const router = resetRouter();
    const controller1 = createMockController();
    const controller2 = createMockController();

    router.register('/page1', controller1);
    router.register('/page2', controller2);
    router.init();

    await router.navigate('/page1');
    await router.navigate('/page2');

    assert(controller1.hidden === true, 'Controller1 deve estar escondido');
    assert(controller2.shown === true, 'Controller2 deve estar visível');
});

test('Passa parâmetros ao navegar', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    const params = { foo: 'bar' };
    await router.navigate('/home', params);

    assert(controller.showParams === params, 'Parâmetros devem ser passados');
});

test('Retorna false ao navegar para rota inexistente', async () => {
    const router = resetRouter();
    router.setDefaultRoute('/');
    router.register('/', createMockController());
    router.init();

    const success = await router.navigate('/nonexistent');

    // Deve redirecionar para rota padrão
    assert(router.getCurrentRoute() === '/', 'Deve redirecionar para rota padrão');
});

test('Recarrega rota atual', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    await router.navigate('/home');
    controller.shown = false; // Reset

    router.reload();

    // Aguardar um pouco para reload processar
    await new Promise(resolve => setTimeout(resolve, 10));

    assert(controller.shown === true, 'Controller deve ser mostrado novamente');
});

// ==================== HISTÓRICO ====================

test('Adiciona navegação ao histórico', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    // Limpar histórico criado pelo init()
    router.clearHistory();

    await router.navigate('/home');

    const history = router.getHistory();

    assert(history.length === 1, 'Histórico deve ter 1 entrada');
    assert(history[0].path === '/home', 'Entrada deve ser /home');
});

test('Navega para trás no histórico', async () => {
    const router = resetRouter();
    const controller1 = createMockController();
    const controller2 = createMockController();

    router.register('/page1', controller1);
    router.register('/page2', controller2);
    router.init();

    await router.navigate('/page1');
    await router.navigate('/page2');

    const canGoBack = await router.back();

    assert(canGoBack === true, 'Deve poder voltar');
    assert(router.getCurrentRoute() === '/page1', 'Deve voltar para /page1');
});

test('Navega para frente no histórico', async () => {
    const router = resetRouter();
    const controller1 = createMockController();
    const controller2 = createMockController();

    router.register('/page1', controller1);
    router.register('/page2', controller2);
    router.init();

    await router.navigate('/page1');
    await router.navigate('/page2');
    await router.back();

    const canGoForward = await router.forward();

    assert(canGoForward === true, 'Deve poder avançar');
    assert(router.getCurrentRoute() === '/page2', 'Deve avançar para /page2');
});

test('Retorna false ao tentar voltar sem histórico', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    await router.navigate('/home');

    const canGoBack = await router.back();

    assert(canGoBack === false, 'Não deve poder voltar');
});

test('Limpa histórico', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    await router.navigate('/home');

    router.clearHistory();

    const history = router.getHistory();
    assert(history.length === 0, 'Histórico deve estar vazio');
});

test('Limita tamanho do histórico', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/page', controller);
    router.init();

    // Navegar 60 vezes (limite é 50)
    for (let i = 0; i < 60; i++) {
        await router.navigate('/page', { index: i });
    }

    const history = router.getHistory();

    assert(history.length === 50, 'Histórico deve ter no máximo 50 entradas');
});

// ==================== GUARDAS DE ROTA ====================

test('beforeEnter permite navegação', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/protected', controller, {
        beforeEnter: async () => true
    });
    router.init();

    const success = await router.navigate('/protected');

    assert(success === true, 'Navegação deve ser permitida');
    assert(router.getCurrentRoute() === '/protected', 'Deve estar em /protected');
});

test('beforeEnter bloqueia navegação', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/protected', controller, {
        beforeEnter: async () => false
    });
    router.init();

    const success = await router.navigate('/protected');

    assert(success === false, 'Navegação deve ser bloqueada');
    assert(router.getCurrentRoute() !== '/protected', 'Não deve estar em /protected');
});

test('beforeLeave permite saída', async () => {
    const router = resetRouter();
    const controller1 = createMockController();
    const controller2 = createMockController();

    router.register('/page1', controller1, {
        beforeLeave: async () => true
    });
    router.register('/page2', controller2);
    router.init();

    await router.navigate('/page1');
    const success = await router.navigate('/page2');

    assert(success === true, 'Saída deve ser permitida');
    assert(router.getCurrentRoute() === '/page2', 'Deve estar em /page2');
});

test('beforeLeave bloqueia saída', async () => {
    const router = resetRouter();
    const controller1 = createMockController();
    const controller2 = createMockController();

    router.register('/page1', controller1, {
        beforeLeave: async () => false
    });
    router.register('/page2', controller2);
    router.init();

    await router.navigate('/page1');
    const success = await router.navigate('/page2');

    assert(success === false, 'Saída deve ser bloqueada');
    assert(router.getCurrentRoute() === '/page1', 'Deve permanecer em /page1');
});

// ==================== PARÂMETROS DE ROTA ====================

test('Extrai parâmetros de rota', async () => {
    const router = resetRouter();

    const params = router.extractParams('/user/:id', '/user/123');

    assert(params !== null, 'Deve extrair parâmetros');
    assert(params.id === '123', 'ID deve ser 123');
});

test('Extrai múltiplos parâmetros', async () => {
    const router = resetRouter();

    const params = router.extractParams('/user/:id/post/:postId', '/user/123/post/456');

    assert(params !== null, 'Deve extrair parâmetros');
    assert(params.id === '123', 'ID deve ser 123');
    assert(params.postId === '456', 'PostID deve ser 456');
});

test('Retorna null para padrão incompatível', async () => {
    const router = resetRouter();

    const params = router.extractParams('/user/:id', '/post/123');

    assert(params === null, 'Deve retornar null para padrão incompatível');
});

// ==================== GETTERS ====================

test('Retorna rota atual', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    await router.navigate('/home');

    assert(router.getCurrentRoute() === '/home', 'Deve retornar /home');
});

test('Retorna controller atual', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.init();

    await router.navigate('/home');

    assert(router.getCurrentController() === controller, 'Deve retornar controller correto');
});

test('Retorna todas as rotas', async () => {
    const router = resetRouter();

    router.register('/home', createMockController());
    router.register('/about', createMockController());
    router.register('/contact', createMockController());

    const routes = router.getRoutes();

    assert(routes.length === 3, 'Deve retornar 3 rotas');
    assert(routes.includes('/home'), 'Deve incluir /home');
    assert(routes.includes('/about'), 'Deve incluir /about');
    assert(routes.includes('/contact'), 'Deve incluir /contact');
});

// ==================== DEBUG ====================

test('Retorna informações de debug', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller);
    router.setDefaultRoute('/home');
    router.init();

    await router.navigate('/home');

    const debugInfo = router.getDebugInfo();

    assert(debugInfo.currentRoute === '/home', 'Rota atual deve ser /home');
    assert(debugInfo.defaultRoute === '/home', 'Rota padrão deve ser /home');
    assert(debugInfo.totalRoutes === 1, 'Total de rotas deve ser 1');
});

test('Lista rotas com detalhes', async () => {
    const router = resetRouter();
    const controller = createMockController();

    router.register('/home', controller, {
        beforeEnter: () => true,
        beforeLeave: () => true
    });

    const routesList = router.listRoutes();

    assert(routesList['/home'].hasController === true, 'Deve ter controller');
    assert(routesList['/home'].hasBeforeEnter === true, 'Deve ter beforeEnter');
    assert(routesList['/home'].hasBeforeLeave === true, 'Deve ter beforeLeave');
});

// ==================== EXECUTAR TESTES ====================

(async () => {
    // Aguardar todos os testes
    await new Promise(resolve => setTimeout(resolve, 100));

    // ==================== RESULTADOS ====================

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Testes passados: ${passedTests}`);
    console.log(`❌ Testes falhados: ${failedTests}`);
    console.log(`📊 Total: ${passedTests + failedTests}`);
    console.log('='.repeat(50));

    if (failedTests > 0) {
        process.exit(1);
    }
})();
