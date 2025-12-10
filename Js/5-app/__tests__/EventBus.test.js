/**
 * Testes para EventBus
 * 
 * Cobertura:
 * - Singleton pattern
 * - Registro e remoção de listeners
 * - Emissão de eventos
 * - Priorização de listeners
 * - Histórico de eventos
 * - Wildcards
 * - Debug mode
 */

const EventBus = require('../EventBus.js');

// Mock de document para Node.js
global.document = {
    dispatchEvent: () => { }
};

// Helper para criar nova instância (resetar singleton)
function resetEventBus() {
    EventBus._instance = null;
    return EventBus.getInstance();
}

// ==================== TESTES ====================

console.log('🧪 Iniciando testes do EventBus...\n');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✅ ${description}`);
        passedTests++;
    } catch (error) {
        console.error(`❌ ${description}`);
        console.error(`   ${error.message}`);
        failedTests++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// ==================== SINGLETON ====================

test('EventBus é singleton', () => {
    const instance1 = EventBus.getInstance();
    const instance2 = EventBus.getInstance();
    assert(instance1 === instance2, 'Instâncias devem ser iguais');
});

// ==================== REGISTRO DE LISTENERS ====================

test('Registra listener com on()', () => {
    const bus = resetEventBus();
    const callback = () => { };
    const unsubscribe = bus.on('test:event', callback);

    assert(typeof unsubscribe === 'function', 'on() deve retornar função de unsubscribe');
    assert(bus.hasListeners('test:event'), 'Deve ter listeners registrados');
    assert(bus.getListenerCount('test:event') === 1, 'Deve ter 1 listener');
});

test('Remove listener com off()', () => {
    const bus = resetEventBus();
    const callback = () => { };
    bus.on('test:event', callback);
    bus.off('test:event', callback);

    assert(!bus.hasListeners('test:event'), 'Não deve ter listeners');
    assert(bus.getListenerCount('test:event') === 0, 'Contagem deve ser 0');
});

test('Unsubscribe via função retornada', () => {
    const bus = resetEventBus();
    const callback = () => { };
    const unsubscribe = bus.on('test:event', callback);
    unsubscribe();

    assert(!bus.hasListeners('test:event'), 'Listener deve ser removido');
});

test('Registra listener com once()', () => {
    const bus = resetEventBus();
    let callCount = 0;

    bus.once('test:event', () => {
        callCount++;
    });

    bus.emit('test:event');
    bus.emit('test:event');

    assert(callCount === 1, 'Listener once() deve ser chamado apenas uma vez');
});

test('Remove todos os listeners de um evento', () => {
    const bus = resetEventBus();
    bus.on('test:event', () => { });
    bus.on('test:event', () => { });
    bus.on('test:event', () => { });

    assert(bus.getListenerCount('test:event') === 3, 'Deve ter 3 listeners');

    bus.removeAllListeners('test:event');

    assert(bus.getListenerCount('test:event') === 0, 'Todos os listeners devem ser removidos');
});

test('Remove todos os listeners de todos os eventos', () => {
    const bus = resetEventBus();
    bus.on('event1', () => { });
    bus.on('event2', () => { });
    bus.on('event3', () => { });

    bus.removeAllListeners();

    assert(bus.getListenerCount('event1') === 0, 'Listeners de event1 removidos');
    assert(bus.getListenerCount('event2') === 0, 'Listeners de event2 removidos');
    assert(bus.getListenerCount('event3') === 0, 'Listeners de event3 removidos');
});

// ==================== EMISSÃO DE EVENTOS ====================

test('Emite evento e chama listener', () => {
    const bus = resetEventBus();
    let called = false;

    bus.on('test:event', () => {
        called = true;
    });

    bus.emit('test:event');

    assert(called, 'Listener deve ser chamado');
});

test('Passa dados para listener', () => {
    const bus = resetEventBus();
    let receivedData = null;

    bus.on('test:event', (data) => {
        receivedData = data;
    });

    const testData = { foo: 'bar' };
    bus.emit('test:event', testData);

    assert(receivedData === testData, 'Dados devem ser passados corretamente');
});

test('Chama múltiplos listeners', () => {
    const bus = resetEventBus();
    let count = 0;

    bus.on('test:event', () => count++);
    bus.on('test:event', () => count++);
    bus.on('test:event', () => count++);

    bus.emit('test:event');

    assert(count === 3, 'Todos os listeners devem ser chamados');
});

// ==================== PRIORIZAÇÃO ====================

test('Listeners são executados por ordem de prioridade', () => {
    const bus = resetEventBus();
    const order = [];

    bus.on('test:event', () => order.push('low'), 1);
    bus.on('test:event', () => order.push('high'), 10);
    bus.on('test:event', () => order.push('medium'), 5);

    bus.emit('test:event');

    assert(order[0] === 'high', 'Primeiro deve ser high (prioridade 10)');
    assert(order[1] === 'medium', 'Segundo deve ser medium (prioridade 5)');
    assert(order[2] === 'low', 'Terceiro deve ser low (prioridade 1)');
});

// ==================== WILDCARDS ====================

test('Listener wildcard (*) recebe todos os eventos', () => {
    const bus = resetEventBus();
    const receivedEvents = [];

    bus.on('*', (data) => {
        receivedEvents.push(data.eventType);
    });

    bus.emit('event1');
    bus.emit('event2');
    bus.emit('event3');

    assert(receivedEvents.includes('event1'), 'Deve receber event1');
    assert(receivedEvents.includes('event2'), 'Deve receber event2');
    assert(receivedEvents.includes('event3'), 'Deve receber event3');
});

// ==================== HISTÓRICO ====================

test('Adiciona eventos ao histórico', () => {
    const bus = resetEventBus();

    bus.emit('event1', { data: 1 });
    bus.emit('event2', { data: 2 });

    const history = bus.getHistory();

    assert(history.length === 2, 'Histórico deve ter 2 eventos');
    assert(history[0].eventType === 'event1', 'Primeiro evento deve ser event1');
    assert(history[1].eventType === 'event2', 'Segundo evento deve ser event2');
});

test('Limita tamanho do histórico', () => {
    const bus = resetEventBus();

    // Emitir 60 eventos (limite é 50)
    for (let i = 0; i < 60; i++) {
        bus.emit(`event${i}`);
    }

    const history = bus.getHistory();

    assert(history.length === 50, 'Histórico deve ter no máximo 50 eventos');
});

test('Retorna histórico limitado', () => {
    const bus = resetEventBus();

    for (let i = 0; i < 20; i++) {
        bus.emit(`event${i}`);
    }

    const last5 = bus.getHistory(5);

    assert(last5.length === 5, 'Deve retornar últimos 5 eventos');
});

test('Limpa histórico', () => {
    const bus = resetEventBus();

    bus.emit('event1');
    bus.emit('event2');

    bus.clearHistory();

    const history = bus.getHistory();
    assert(history.length === 0, 'Histórico deve estar vazio');
});

// ==================== ESTATÍSTICAS ====================

test('Retorna estatísticas corretas', () => {
    const bus = resetEventBus();

    bus.on('event1', () => { });
    bus.on('event2', () => { });
    bus.emit('event1');
    bus.emit('event2');

    const stats = bus.getStats();

    assert(stats.totalEvents === 2, 'Total de eventos deve ser 2');
    assert(stats.totalListeners === 2, 'Total de listeners deve ser 2');
    assert(stats.eventTypes.includes('event1'), 'Deve incluir event1');
    assert(stats.eventTypes.includes('event2'), 'Deve incluir event2');
});

// ==================== DEBUG ====================

test('Ativa/desativa debug mode', () => {
    const bus = resetEventBus();

    bus.setDebugMode(true);
    assert(bus.getStats().debugMode === true, 'Debug mode deve estar ativado');

    bus.setDebugMode(false);
    assert(bus.getStats().debugMode === false, 'Debug mode deve estar desativado');
});

// ==================== TRATAMENTO DE ERROS ====================

test('Continua executando outros listeners se um falhar', () => {
    const bus = resetEventBus();
    let count = 0;

    bus.on('test:event', () => {
        throw new Error('Erro proposital');
    });
    bus.on('test:event', () => {
        count++;
    });

    bus.emit('test:event');

    assert(count === 1, 'Segundo listener deve ser executado mesmo com erro no primeiro');
});

// ==================== WAITFOR ====================

// Note: waitFor tests are async, so we'll run them separately
(async () => {
    const bus1 = resetEventBus();

    setTimeout(() => {
        bus1.emit('test:event', { data: 'test' });
    }, 10);

    try {
        const data = await bus1.waitFor('test:event', 1000);
        assert(data.data === 'test', 'Deve receber dados do evento');
        console.log('✅ waitFor() resolve quando evento é emitido');
        passedTests++;
    } catch (error) {
        console.error('❌ waitFor() resolve quando evento é emitido');
        console.error(`   ${error.message}`);
        failedTests++;
    }

    const bus2 = resetEventBus();
    let timedOut = false;

    try {
        await bus2.waitFor('test:event', 50);
    } catch (error) {
        timedOut = true;
    }

    try {
        assert(timedOut, 'Deve dar timeout');
        console.log('✅ waitFor() rejeita após timeout');
        passedTests++;
    } catch (error) {
        console.error('❌ waitFor() rejeita após timeout');
        console.error(`   ${error.message}`);
        failedTests++;
    }

    // ==================== EVENTOS PREDEFINIDOS ====================

    test('Possui eventos predefinidos', () => {
        assert(EventBus.Events.DATA_LOADED === 'data:loaded', 'Evento DATA_LOADED definido');
        assert(EventBus.Events.PAGE_CHANGED === 'page:changed', 'Evento PAGE_CHANGED definido');
        assert(EventBus.Events.MODAL_OPENED === 'modal:opened', 'Evento MODAL_OPENED definido');
    });

    // ==================== RESULTADOS ====================

    console.log('\\n' + '='.repeat(50));
    console.log(`✅ Testes passados: ${passedTests}`);
    console.log(`❌ Testes falhados: ${failedTests}`);
    console.log(`📊 Total: ${passedTests + failedTests}`);
    console.log('='.repeat(50));

    if (failedTests > 0) {
        process.exit(1);
    }
})();
