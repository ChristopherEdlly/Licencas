// Teste de carregamento de módulos (simula browser)
console.log('🧪 Testando carregamento de módulos...\n');

// Simular ambiente browser
global.window = {};
global.document = {};

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Erro: ${error.message}`);
        failed++;
    }
}

// Teste 1: DateUtils
test('DateUtils carrega', () => {
    require('./js/1-core/utilities/DateUtils.js');
    if (!window.DateUtils) throw new Error('DateUtils não exportado para window');
});

// Teste 2: FormatUtils
test('FormatUtils carrega', () => {
    require('./js/1-core/utilities/FormatUtils.js');
    if (!window.FormatUtils) throw new Error('FormatUtils não exportado para window');
});

// Teste 3: ValidationUtils
test('ValidationUtils carrega', () => {
    require('./js/1-core/utilities/ValidationUtils.js');
    if (!window.ValidationUtils) throw new Error('ValidationUtils não exportado para window');
});

// Teste 4: MathUtils
test('MathUtils carrega', () => {
    require('./js/1-core/utilities/MathUtils.js');
    if (!window.MathUtils) throw new Error('MathUtils não exportado para window');
});

// Teste 5: DataParser (CRÍTICO - estava falhando)
test('DataParser carrega', () => {
    require('./js/1-core/data-flow/DataParser.js');
    if (!window.DataParser) throw new Error('DataParser não exportado para window');
});

// Teste 6: DataTransformer
test('DataTransformer carrega', () => {
    require('./js/1-core/data-flow/DataTransformer.js');
    if (!window.DataTransformer) throw new Error('DataTransformer não exportado para window');
});

// Teste 7: FileService
test('FileService carrega', () => {
    require('./js/2-services/FileService.js');
    if (!window.FileService) throw new Error('FileService não exportado para window');
});

// Teste 8: EventBus
test('EventBus carrega', () => {
    require('./js/5-app/EventBus.js');
    if (!window.EventBus) throw new Error('EventBus não exportado para window');
});

// Teste 9: Router
test('Router carrega', () => {
    require('./js/5-app/Router.js');
    if (!window.Router) throw new Error('Router não exportado para window');
});

// Teste 10: App
test('App carrega', () => {
    require('./js/5-app/App.js');
    if (!window.App) throw new Error('App não exportado para window');
});

console.log('\n' + '='.repeat(50));
console.log(`✅ Passaram: ${passed}`);
console.log(`❌ Falharam: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log('='.repeat(50));

process.exit(failed > 0 ? 1 : 0);
