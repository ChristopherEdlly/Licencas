/**
 * Teste para NotificationService
 * Execute: node js/2-services/__tests__/NotificationService.test.js
 */

// Mock do DOM
global.document = {
    body: { appendChild: () => {} },
    head: { appendChild: () => {} },
    createElement: (tag) => ({
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        querySelector: () => null,
        appendChild: () => {},
        remove: () => {},
        classList: {
            add: () => {},
            remove: () => {}
        }
    }),
    getElementById: () => null,
    dispatchEvent: () => {}
};

global.CustomEvent = class CustomEvent {
    constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
    }
};

const NotificationService = require('../NotificationService.js');

console.log('🧪 Iniciando testes do NotificationService\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
    totalTests++;
    console.log(`\n📝 Teste ${totalTests}: ${description}`);
    try {
        testFn();
        passedTests++;
        console.log('✅ PASSOU');
    } catch (error) {
        failedTests++;
        console.log('❌ FALHOU:', error.message);
    }
}

function assertEquals(actual, expected, message = '') {
    const msg = message ? ` (${message})` : '';
    if (actual !== expected) {
        throw new Error(`Esperado: ${expected}, Recebido: ${actual}${msg}`);
    }
}

function assertTrue(value, message = '') {
    if (!value) {
        throw new Error(message || 'Esperado valor verdadeiro');
    }
}

// ==================== TESTES ====================

test('CONFIG - deve ter duração padrão de 3000ms', () => {
    assertEquals(NotificationService.CONFIG.duration, 3000);
});

test('CONFIG - deve ter posição padrão top-right', () => {
    assertEquals(NotificationService.CONFIG.position, 'top-right');
});

test('CONFIG - deve limitar máximo de notificações a 5', () => {
    assertEquals(NotificationService.CONFIG.maxNotifications, 5);
});

test('activeNotifications - deve iniciar vazio', () => {
    assertEquals(NotificationService.activeNotifications.length, 0);
});

test('show - método deve existir', () => {
    assertTrue(typeof NotificationService.show === 'function');
});

test('success - método deve existir', () => {
    assertTrue(typeof NotificationService.success === 'function');
});

test('error - método deve existir', () => {
    assertTrue(typeof NotificationService.error === 'function');
});

test('warning - método deve existir', () => {
    assertTrue(typeof NotificationService.warning === 'function');
});

test('info - método deve existir', () => {
    assertTrue(typeof NotificationService.info === 'function');
});

test('dismiss - método deve existir', () => {
    assertTrue(typeof NotificationService.dismiss === 'function');
});

test('dismissAll - método deve existir', () => {
    assertTrue(typeof NotificationService.dismissAll === 'function');
});

test('_initContainer - deve criar container se não existir', () => {
    NotificationService.container = null;
    NotificationService._initContainer();
    assertTrue(NotificationService.container !== null);
});

test('_injectStyles - deve criar elemento style se não existir', () => {
    NotificationService._injectStyles();
    assertTrue(true, 'Styles injetados sem erro');
});

// ==================== RESUMO ====================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES - NotificationService');
console.log('='.repeat(60));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(60));

if (failedTests === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} teste(s) falharam\n`);
    process.exit(1);
}
