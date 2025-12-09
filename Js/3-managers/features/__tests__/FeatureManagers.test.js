/**
 * Testes consolidados para Feature Managers
 * Execute: node js/3-managers/features/__tests__/FeatureManagers.test.js
 */

const FilterManager = require('../FilterManager.js');
const CalendarManager = require('../CalendarManager.js');
const TimelineManager = require('../TimelineManager.js');
const ReportsManager = require('../ReportsManager.js');
const KeyboardManager = require('../KeyboardManager.js');

console.log('🧪 Iniciando testes dos Feature Managers\n');
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

const mockApp = {};

// ==================== FILTER MANAGER ====================

test('FilterManager - construtor', () => {
    const manager = new FilterManager(mockApp);
    assertTrue(manager instanceof FilterManager);
});

test('FilterManager - tem templates predefinidos', () => {
    const manager = new FilterManager(mockApp);
    const templates = manager.getTemplates();
    assertTrue(Object.keys(templates).length > 0);
});

test('FilterManager - applyFilters com filtro de urgência', () => {
    const manager = new FilterManager(mockApp);
    const data = [
        { servidor: 'João', urgencia: 'critica' },
        { servidor: 'Maria', urgencia: 'baixa' }
    ];
    const filters = { urgencies: ['critica'] };
    const result = manager.applyFilters(data, filters);
    assertEquals(result.length, 1);
});

test('FilterManager - validateFilters', () => {
    const manager = new FilterManager(mockApp);
    const filters = { ageRange: { min: 30, max: 50 } };
    const validation = manager.validateFilters(filters);
    assertTrue(validation.valid);
});

test('FilterManager - getUniqueValues', () => {
    const manager = new FilterManager(mockApp);
    const data = [
        { cargo: 'Auditor' },
        { cargo: 'Analista' },
        { cargo: 'Auditor' }
    ];
    const unique = manager.getUniqueValues(data, 'cargo');
    assertEquals(unique.length, 2);
});

// ==================== CALENDAR MANAGER ====================

test('CalendarManager - construtor', () => {
    const manager = new CalendarManager(mockApp);
    assertTrue(manager instanceof CalendarManager);
});

test('CalendarManager - viewMode padrão é year', () => {
    const manager = new CalendarManager(mockApp);
    assertEquals(manager.viewMode, 'year');
});

test('CalendarManager - _formatDateKey', () => {
    const manager = new CalendarManager(mockApp);
    const date = new Date('2025-12-09');
    const key = manager._formatDateKey(date);
    assertTrue(key.includes('2025'));
});

test('CalendarManager - navigateNext', () => {
    const manager = new CalendarManager(mockApp);
    const yearBefore = manager.currentYear;
    manager.navigateNext();
    const yearAfter = manager.currentYear;
    assertEquals(yearAfter, yearBefore + 1);
});

test('CalendarManager - _getIntensityLevel', () => {
    const manager = new CalendarManager(mockApp);
    assertEquals(manager._getIntensityLevel(0), 0);
    assertEquals(manager._getIntensityLevel(1), 1);
    assertEquals(manager._getIntensityLevel(3), 2);
    assertEquals(manager._getIntensityLevel(6), 3);
    assertEquals(manager._getIntensityLevel(11), 4);
});

// ==================== TIMELINE MANAGER ====================

test('TimelineManager - construtor', () => {
    const manager = new TimelineManager(mockApp);
    assertTrue(manager instanceof TimelineManager);
});

test('TimelineManager - viewMode padrão é month', () => {
    const manager = new TimelineManager(mockApp);
    assertEquals(manager.viewMode, 'month');
});

test('TimelineManager - _daysBetween', () => {
    const manager = new TimelineManager(mockApp);
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-11');
    const days = manager._daysBetween(start, end);
    assertEquals(days, 10);
});

test('TimelineManager - _formatDate', () => {
    const manager = new TimelineManager(mockApp);
    const formatted = manager._formatDate(new Date('2025-12-09'));
    assertTrue(formatted.includes('/'));
});

test('TimelineManager - goToToday', () => {
    const manager = new TimelineManager(mockApp);
    manager.goToToday();
    const today = new Date();
    assertEquals(manager.currentDate.getFullYear(), today.getFullYear());
});

// ==================== REPORTS MANAGER ====================

test('ReportsManager - construtor', () => {
    const manager = new ReportsManager(mockApp);
    assertTrue(manager instanceof ReportsManager);
});

test('ReportsManager - getAvailableReports', () => {
    const manager = new ReportsManager(mockApp);
    const reports = manager.getAvailableReports();
    assertTrue(Array.isArray(reports));
    assertTrue(reports.length >= 8);
});

test('ReportsManager - _groupBy', () => {
    const manager = new ReportsManager(mockApp);
    const data = [
        { cargo: 'Auditor', nome: 'João' },
        { cargo: 'Analista', nome: 'Maria' },
        { cargo: 'Auditor', nome: 'Pedro' }
    ];
    const grouped = manager._groupBy(data, 'cargo');
    assertEquals(Object.keys(grouped).length, 2);
    assertEquals(grouped['Auditor'].length, 2);
});

test('ReportsManager - _countUrgencies', () => {
    const manager = new ReportsManager(mockApp);
    const data = [
        { urgencia: 'critica' },
        { urgencia: 'critica' },
        { urgencia: 'baixa' }
    ];
    const counts = manager._countUrgencies(data);
    assertEquals(counts.critica, 2);
    assertEquals(counts.baixa, 1);
});

test('ReportsManager - exportAsJSON', () => {
    const manager = new ReportsManager(mockApp);
    const report = { name: 'Teste', data: [{ foo: 'bar' }] };
    const json = manager.exportAsJSON(report);
    assertTrue(json.includes('Teste'));
});

// ==================== KEYBOARD MANAGER ====================

test('KeyboardManager - construtor', () => {
    const manager = new KeyboardManager(mockApp);
    assertTrue(manager instanceof KeyboardManager);
});

test('KeyboardManager - atalhos registrados', () => {
    const manager = new KeyboardManager(mockApp);
    assertTrue(manager.shortcuts.size > 0);
});

test('KeyboardManager - getAllShortcuts', () => {
    const manager = new KeyboardManager(mockApp);
    const shortcuts = manager.getAllShortcuts();
    assertTrue(Array.isArray(shortcuts));
    assertTrue(shortcuts.length >= 10);
});

test('KeyboardManager - _normalizeKeys', () => {
    const manager = new KeyboardManager(mockApp);
    const normalized = manager._normalizeKeys('Ctrl+K');
    assertEquals(normalized, 'ctrl+k');
});

test('KeyboardManager - _buildCombination', () => {
    const manager = new KeyboardManager(mockApp);
    const event = {
        ctrlKey: true,
        key: 'k',
        altKey: false,
        shiftKey: false
    };
    const combo = manager._buildCombination(event);
    assertEquals(combo, 'ctrl+k');
});

test('KeyboardManager - enable/disable', () => {
    const manager = new KeyboardManager(mockApp);
    manager.disable();
    assertEquals(manager.isEnabled(), false);
    manager.enable();
    assertEquals(manager.isEnabled(), true);
});

test('KeyboardManager - register/unregister', () => {
    const manager = new KeyboardManager(mockApp);
    const sizeBefore = manager.shortcuts.size;
    manager.register('Ctrl+T', 'Teste', () => {});
    assertEquals(manager.shortcuts.size, sizeBefore + 1);
    manager.unregister('Ctrl+T');
    assertEquals(manager.shortcuts.size, sizeBefore);
});

// ==================== RESUMO ====================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES - Feature Managers');
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
