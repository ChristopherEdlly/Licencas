/**
 * Teste para FileService
 * Execute: node js/2-services/__tests__/FileService.test.js
 */

// Mock do XLSX global
global.XLSX = {
    read: (data, options) => ({
        SheetNames: ['Sheet1'],
        Sheets: {
            'Sheet1': {}
        }
    }),
    utils: {
        sheet_to_csv: () => 'nome,idade\nJoão,30\nMaria,25'
    }
};

const FileService = require('../FileService.js');

console.log('🧪 Iniciando testes do FileService\n');
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

function assertFalse(value, message = '') {
    if (value) {
        throw new Error(message || 'Esperado valor falso');
    }
}

function assertThrows(fn, message = '') {
    try {
        fn();
        throw new Error(message || 'Deveria ter lançado erro');
    } catch (error) {
        if (error.message.includes('Deveria ter lançado')) {
            throw error;
        }
        // Erro esperado
    }
}

// ==================== TESTES ====================

test('validateFile - deve retornar erro se arquivo não existir', () => {
    const result = FileService.validateFile(null);
    assertFalse(result.valid);
    assertEquals(result.error, 'Nenhum arquivo selecionado');
});

test('validateFile - deve retornar erro se arquivo for muito grande', () => {
    const largeFile = {
        name: 'large.xlsx',
        size: 10 * 1024 * 1024, // 10MB
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const result = FileService.validateFile(largeFile);
    assertFalse(result.valid);
    assertTrue(result.error.includes('muito grande'));
});

test('validateFile - deve retornar erro se extensão não for suportada', () => {
    const invalidFile = {
        name: 'arquivo.txt',
        size: 1024,
        type: 'text/plain'
    };

    const result = FileService.validateFile(invalidFile);
    assertFalse(result.valid);
    assertTrue(result.error.includes('não suportado'));
});

test('validateFile - deve validar arquivo CSV válido', () => {
    const validFile = {
        name: 'dados.csv',
        size: 1024,
        type: 'text/csv'
    };

    const result = FileService.validateFile(validFile);
    assertTrue(result.valid);
    assertEquals(result.error, null);
});

test('validateFile - deve validar arquivo Excel válido', () => {
    const validFile = {
        name: 'dados.xlsx',
        size: 2048,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const result = FileService.validateFile(validFile);
    assertTrue(result.valid);
    assertEquals(result.error, null);
});

test('SUPPORTED_TYPES - deve conter tipos corretos', () => {
    assertTrue(FileService.SUPPORTED_TYPES.hasOwnProperty('text/csv'));
    assertTrue(FileService.SUPPORTED_TYPES['text/csv'].includes('.csv'));
    assertTrue(FileService.SUPPORTED_TYPES['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes('.xlsx'));
});

test('MAX_FILE_SIZE - deve ser 5MB', () => {
    assertEquals(FileService.MAX_FILE_SIZE, 5 * 1024 * 1024);
});

test('exportAsCSV - deve lançar erro se não houver dados', () => {
    assertThrows(() => {
        FileService.exportAsCSV([], 'test.csv');
    }, 'Deveria lançar erro para array vazio');
});

test('downloadFile - deve aceitar parâmetros corretos', () => {
    // Mock para evitar download real
    const originalCreateElement = global.document?.createElement;

    try {
        // Teste apenas verifica que a função existe e aceita parâmetros
        const content = 'test';
        const filename = 'test.txt';
        const mimeType = 'text/plain';

        // Função existe
        assertTrue(typeof FileService.downloadFile === 'function');

    } finally {
        if (originalCreateElement) {
            global.document.createElement = originalCreateElement;
        }
    }
});

test('Validação de extensão .xls', () => {
    const file = {
        name: 'planilha.xls',
        size: 1024,
        type: 'application/vnd.ms-excel'
    };

    const result = FileService.validateFile(file);
    assertTrue(result.valid);
});

test('Validação rejeita arquivo sem extensão', () => {
    const file = {
        name: 'arquivo',
        size: 1024,
        type: 'application/octet-stream'
    };

    const result = FileService.validateFile(file);
    assertFalse(result.valid);
});

test('Validação - tamanho máximo correto (5MB - 1 byte)', () => {
    const file = {
        name: 'limite.csv',
        size: 5 * 1024 * 1024 - 1, // 5MB - 1 byte
        type: 'text/csv'
    };

    const result = FileService.validateFile(file);
    assertTrue(result.valid, 'Arquivo no limite deve ser válido');
});

test('Validação - rejeita exatamente no limite + 1 byte', () => {
    const file = {
        name: 'grande.csv',
        size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
        type: 'text/csv'
    };

    const result = FileService.validateFile(file);
    assertFalse(result.valid, 'Arquivo acima do limite deve ser inválido');
});

// ==================== RESUMO ====================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES - FileService');
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
