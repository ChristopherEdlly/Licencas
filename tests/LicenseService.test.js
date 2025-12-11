/**
 * Testes para LicenseService
 */

import { LicenseService } from '../js/services/LicenseService.js';

// Mock do DataLoader
class MockDataLoader {
    constructor(mockData = []) {
        this.mockData = mockData;
        this.loadCalls = 0;
    }

    async loadFromSource(source) {
        this.loadCalls++;
        return [...this.mockData];
    }
}

// Mock do LicencaCalculator
class MockCalculator {
    calcularLicenca(license) {
        if (license.mockDaysRemaining !== undefined) {
            return {
                diasRestantes: license.mockDaysRemaining,
                dataLimite: new Date(Date.now() + license.mockDaysRemaining * 24 * 60 * 60 * 1000)
            };
        }
        return { diasRestantes: null, dataLimite: null };
    }
}

// Mock do UrgencyAnalyzer
class MockUrgencyAnalyzer {
    analyzeUrgency(license) {
        if (license.mockDaysRemaining <= 7) {
            return { level: 'critica', message: 'Crítico' };
        } else if (license.mockDaysRemaining <= 30) {
            return { level: 'alta', message: 'Urgente' };
        } else if (license.mockDaysRemaining <= 60) {
            return { level: 'media', message: 'Atenção' };
        }
        return { level: 'baixa', message: 'Normal' };
    }
}

// Dados de teste
const mockLicenses = [
    {
        matricula: '001',
        nome: 'João Silva',
        tipo: 'premio',
        status: 'pendente',
        lotacao: 'Setor A',
        mockDaysRemaining: 5
    },
    {
        matricula: '002',
        nome: 'Maria Santos',
        tipo: 'saude',
        status: 'aprovado',
        lotacao: 'Setor B',
        mockDaysRemaining: 15
    },
    {
        matricula: '003',
        nome: 'Pedro Costa',
        tipo: 'premio',
        status: 'pendente',
        lotacao: 'Setor A',
        mockDaysRemaining: 45
    },
    {
        matricula: '004',
        nome: 'Ana Lima',
        tipo: 'maternidade',
        status: 'aprovado',
        lotacao: 'Setor C',
        mockDaysRemaining: 90
    }
];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
    }
}

async function runTests() {
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: []
    };

    async function test(description, fn) {
        results.total++;
        try {
            await fn();
            results.passed++;
            console.log(`✓ ${description}`);
        } catch (error) {
            results.failed++;
            results.failures.push({ description, error: error.message });
            console.log(`✗ ${description}`);
            console.log(`  Error: ${error.message}`);
        }
    }

    console.log('Executando testes do LicenseService...\n');

    // Testes de Construtor
    await test('Construtor: deve criar instância com dependências padrão', async () => {
        const service = new LicenseService();
        assert(service.dataLoader !== null, 'DataLoader não deve ser null');
        assert(service.calculator !== null, 'Calculator não deve ser null');
        assert(service.urgencyAnalyzer !== null, 'UrgencyAnalyzer não deve ser null');
    });

    await test('Construtor: deve aceitar dependências customizadas', async () => {
        const mockLoader = new MockDataLoader();
        const service = new LicenseService(mockLoader, null, null);
        assert(service.dataLoader === mockLoader, 'Deve usar o loader fornecido');
    });

    // Testes de loadAllLicenses
    await test('loadAllLicenses: deve carregar todas as licenças', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const licenses = await service.loadAllLicenses();
        assertEqual(licenses.length, 4, 'Deve retornar 4 licenças');
    });

    await test('loadAllLicenses: deve cachear resultados', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        await service.loadAllLicenses();
        await service.loadAllLicenses();
        
        assertEqual(mockLoader.loadCalls, 1, 'Deve carregar apenas uma vez');
    });

    await test('loadAllLicenses: deve forçar refresh quando solicitado', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        await service.loadAllLicenses();
        await service.loadAllLicenses(true);
        
        assertEqual(mockLoader.loadCalls, 2, 'Deve carregar duas vezes');
    });

    await test('loadAllLicenses: deve tratar erros de carregamento', async () => {
        const mockLoader = {
            loadFromSource: async () => {
                throw new Error('Erro de rede');
            }
        };
        const service = new LicenseService(mockLoader, null, null);
        
        try {
            await service.loadAllLicenses();
            throw new Error('Deveria ter lançado erro');
        } catch (error) {
            assert(error.message.includes('Falha ao carregar licenças'), 'Deve lançar erro apropriado');
        }
    });

    // Testes de findLicenseByMatricula
    await test('findLicenseByMatricula: deve encontrar licença por matrícula', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const license = await service.findLicenseByMatricula('002');
        assert(license !== null, 'Deve encontrar a licença');
        assertEqual(license.nome, 'Maria Santos', 'Deve retornar a licença correta');
    });

    await test('findLicenseByMatricula: deve retornar null se não encontrar', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const license = await service.findLicenseByMatricula('999');
        assertEqual(license, null, 'Deve retornar null');
    });

    await test('findLicenseByMatricula: deve validar matrícula', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        try {
            await service.findLicenseByMatricula(null);
            throw new Error('Deveria ter lançado erro');
        } catch (error) {
            assert(error.message.includes('Matrícula inválida'), 'Deve validar matrícula');
        }
    });

    // Testes de filterLicenses
    await test('filterLicenses: deve filtrar por lotação', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const filtered = await service.filterLicenses({ lotacao: 'Setor A' });
        assertEqual(filtered.length, 2, 'Deve retornar 2 licenças do Setor A');
    });

    await test('filterLicenses: deve filtrar por tipo', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const filtered = await service.filterLicenses({ tipo: 'premio' });
        assertEqual(filtered.length, 2, 'Deve retornar 2 licenças de prêmio');
    });

    await test('filterLicenses: deve filtrar por status', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const filtered = await service.filterLicenses({ status: 'pendente' });
        assertEqual(filtered.length, 2, 'Deve retornar 2 licenças pendentes');
    });

    await test('filterLicenses: deve filtrar por urgência', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockAnalyzer = new MockUrgencyAnalyzer();
        const service = new LicenseService(mockLoader, null, mockAnalyzer);
        
        const filtered = await service.filterLicenses({ urgency: 'critica' });
        assertEqual(filtered.length, 1, 'Deve retornar 1 licença crítica');
    });

    await test('filterLicenses: deve filtrar por prazo mínimo', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const service = new LicenseService(mockLoader, mockCalculator, null);
        
        const filtered = await service.filterLicenses({ minDaysRemaining: 30 });
        assertEqual(filtered.length, 2, 'Deve retornar 2 licenças com prazo >= 30 dias');
    });

    await test('filterLicenses: deve filtrar por prazo máximo', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const service = new LicenseService(mockLoader, mockCalculator, null);
        
        const filtered = await service.filterLicenses({ maxDaysRemaining: 30 });
        assertEqual(filtered.length, 2, 'Deve retornar 2 licenças com prazo <= 30 dias');
    });

    await test('filterLicenses: deve aplicar múltiplos filtros', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const service = new LicenseService(mockLoader, mockCalculator, null);
        
        const filtered = await service.filterLicenses({
            lotacao: 'Setor A',
            tipo: 'premio',
            status: 'pendente'
        });
        assertEqual(filtered.length, 2, 'Deve aplicar todos os filtros');
    });

    // Testes de getEnrichedLicenses
    await test('getEnrichedLicenses: deve enriquecer licenças com cálculos', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const mockAnalyzer = new MockUrgencyAnalyzer();
        const service = new LicenseService(mockLoader, mockCalculator, mockAnalyzer);
        
        const enriched = await service.getEnrichedLicenses();
        assert(enriched[0].calculated !== undefined, 'Deve ter dados calculados');
        assert(enriched[0].urgency !== undefined, 'Deve ter dados de urgência');
    });

    // Testes de groupLicensesBy
    await test('groupLicensesBy: deve agrupar por lotação', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const grouped = await service.groupLicensesBy('lotacao');
        assertEqual(grouped['Setor A'].length, 2, 'Deve agrupar corretamente');
    });

    await test('groupLicensesBy: deve agrupar por tipo', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const grouped = await service.groupLicensesBy('tipo');
        assertEqual(grouped['premio'].length, 2, 'Deve agrupar corretamente');
    });

    await test('groupLicensesBy: deve agrupar por urgência', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockAnalyzer = new MockUrgencyAnalyzer();
        const service = new LicenseService(mockLoader, null, mockAnalyzer);
        
        const grouped = await service.groupLicensesBy('urgency');
        assert(grouped['critica'] !== undefined, 'Deve ter grupo crítico');
    });

    await test('groupLicensesBy: deve validar campo de agrupamento', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        try {
            await service.groupLicensesBy('invalido');
            throw new Error('Deveria ter lançado erro');
        } catch (error) {
            assert(error.message.includes('Campo inválido'), 'Deve validar campo');
        }
    });

    // Testes de countLicenses
    await test('countLicenses: deve contar todas as licenças', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const count = await service.countLicenses();
        assertEqual(count, 4, 'Deve contar 4 licenças');
    });

    await test('countLicenses: deve contar licenças filtradas', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const count = await service.countLicenses({ tipo: 'premio' });
        assertEqual(count, 2, 'Deve contar 2 licenças de prêmio');
    });

    // Testes de getUrgentLicenses
    await test('getUrgentLicenses: deve retornar licenças urgentes', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const service = new LicenseService(mockLoader, mockCalculator, null);
        
        const urgent = await service.getUrgentLicenses();
        assertEqual(urgent.length, 2, 'Deve retornar 2 licenças urgentes');
    });

    // Testes de getCriticalLicenses
    await test('getCriticalLicenses: deve retornar licenças críticas', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const service = new LicenseService(mockLoader, mockCalculator, null);
        
        const critical = await service.getCriticalLicenses();
        assertEqual(critical.length, 1, 'Deve retornar 1 licença crítica');
    });

    // Testes de getBasicStats
    await test('getBasicStats: deve calcular estatísticas básicas', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const service = new LicenseService(mockLoader, mockCalculator, null);
        
        const stats = await service.getBasicStats();
        assertEqual(stats.total, 4, 'Deve contar total correto');
        assertEqual(stats.byType['premio'], 2, 'Deve contar tipos corretamente');
        assertEqual(stats.urgent, 2, 'Deve contar urgentes');
        assertEqual(stats.critical, 1, 'Deve contar críticos');
    });

    // Testes de searchLicenses
    await test('searchLicenses: deve buscar por nome', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const results = await service.searchLicenses('Maria');
        assertEqual(results.length, 1, 'Deve encontrar 1 resultado');
        assertEqual(results[0].nome, 'Maria Santos', 'Deve encontrar por nome');
    });

    await test('searchLicenses: deve buscar por matrícula', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const results = await service.searchLicenses('003');
        assertEqual(results.length, 1, 'Deve encontrar 1 resultado');
        assertEqual(results[0].matricula, '003', 'Deve encontrar por matrícula');
    });

    await test('searchLicenses: deve buscar case-insensitive', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const results = await service.searchLicenses('JOÃO');
        assertEqual(results.length, 1, 'Deve encontrar ignorando case');
    });

    await test('searchLicenses: deve validar texto de busca', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        try {
            await service.searchLicenses(null);
            throw new Error('Deveria ter lançado erro');
        } catch (error) {
            assert(error.message.includes('Texto de busca inválido'), 'Deve validar texto');
        }
    });

    // Testes de clearCache
    await test('clearCache: deve limpar o cache', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        await service.loadAllLicenses();
        service.clearCache();
        
        assertEqual(service.cachedLicenses, null, 'Cache deve estar null');
        assertEqual(service.lastLoadTime, null, 'Tempo deve estar null');
    });

    // Testes de validateLicense
    await test('validateLicense: deve validar licença válida', async () => {
        const service = new LicenseService();
        const valid = service.validateLicense({
            matricula: '001',
            nome: 'Teste',
            tipo: 'premio'
        });
        assert(valid, 'Deve validar como verdadeiro');
    });

    await test('validateLicense: deve rejeitar licença sem campos obrigatórios', async () => {
        const service = new LicenseService();
        const invalid = service.validateLicense({
            matricula: '001'
        });
        assert(!invalid, 'Deve validar como falso');
    });

    await test('validateLicense: deve rejeitar valores não-objeto', async () => {
        const service = new LicenseService();
        assert(!service.validateLicense(null), 'Deve rejeitar null');
        assert(!service.validateLicense('string'), 'Deve rejeitar string');
    });

    // Testes de getLicenseSummary
    await test('getLicenseSummary: deve retornar resumo completo', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const mockCalculator = new MockCalculator();
        const mockAnalyzer = new MockUrgencyAnalyzer();
        const service = new LicenseService(mockLoader, mockCalculator, mockAnalyzer);
        
        const summary = await service.getLicenseSummary('001');
        assert(summary !== null, 'Deve retornar resumo');
        assertEqual(summary.matricula, '001', 'Deve ter matrícula');
        assertEqual(summary.nome, 'João Silva', 'Deve ter nome');
        assert(summary.diasRestantes !== undefined, 'Deve ter dias restantes');
        assert(summary.urgencia !== undefined, 'Deve ter urgência');
    });

    await test('getLicenseSummary: deve retornar null se não encontrar', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        const summary = await service.getLicenseSummary('999');
        assertEqual(summary, null, 'Deve retornar null');
    });

    // Teste de cache expiração
    await test('Cache: deve expirar após tempo limite', async () => {
        const mockLoader = new MockDataLoader(mockLicenses);
        const service = new LicenseService(mockLoader, null, null);
        
        await service.loadAllLicenses();
        
        // Simular passagem de tempo
        service.lastLoadTime = Date.now() - (6 * 60 * 1000); // 6 minutos atrás
        
        await service.loadAllLicenses();
        assertEqual(mockLoader.loadCalls, 2, 'Deve recarregar após expiração');
    });

    // Resultados
    console.log('\n' + '='.repeat(50));
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.failures.length > 0) {
        console.log('\nFalhas:');
        results.failures.forEach(failure => {
            console.log(`- ${failure.description}`);
            console.log(`  ${failure.error}`);
        });
    }

    return results;
}

// Executar testes
runTests().then(results => {
    if (results.failed > 0) {
        process.exit(1);
    }
});
