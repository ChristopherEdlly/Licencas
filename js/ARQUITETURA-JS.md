# Arquitetura JavaScript - Sistema Baseado em Fluxos

## 📋 Visão Geral

Sistema JavaScript modular organizado por **fluxos de dados** e **responsabilidades funcionais**. Diferente do CSS, a migração JS requer **extremo cuidado** pois qualquer erro quebra completamente a aplicação.

**Princípios:**
- ✅ **Organização por fluxo de dados** (input → transformação → output)
- ✅ **Migração incremental e testada** (nunca quebrar o que funciona)
- ✅ **Dependências explícitas** (clear imports/exports)
- ✅ **Backward compatibility** durante migração
- ⚠️ **SEGURANÇA MÁXIMA**: Testar cada passo antes de prosseguir

---

## 🎯 Diferenças Críticas: CSS vs. JavaScript

| Aspecto | CSS | JavaScript |
|---------|-----|------------|
| **Erro** | Visual (não quebra) | Fatal (quebra tudo) |
| **Ordem** | Pode variar | **CRÍTICA** - ordem importa |
| **Dependências** | Independente | **Altamente acoplado** |
| **Teste** | Visual imediato | Precisa rodar código |
| **Rollback** | Fácil | Complexo |
| **Risco** | Baixo | **ALTO** |

**CONCLUSÃO**: JavaScript precisa de **estratégia de migração gradual** com testes em cada etapa.

---

## 🗂️ Estrutura Proposta por Fluxos

```
js/
│
├── 1-core/                    # Lógica de negócio pura (funções puras)
│   ├── data-flow/             # 🔄 FLUXO DE DADOS
│   │   ├── DataLoader.js          # Carregamento (Excel → Raw Data)
│   │   ├── DataParser.js          # Parsing (Raw → Structured)
│   │   ├── DataTransformer.js     # Transformação (Structured → Enhanced)
│   │   ├── DataFilter.js          # Filtragem (Enhanced → Filtered)
│   │   └── DataAggregator.js      # Agregação (Filtered → Stats)
│   │
│   ├── business-logic/        # 📊 REGRAS DE NEGÓCIO
│   │   ├── AposentadoriaAnalyzer.js  # Cálculo aposentadoria
│   │   ├── LicencaCalculator.js      # Cálculo licenças
│   │   ├── UrgencyAnalyzer.js        # Análise urgência
│   │   └── OperationalImpact.js      # Impacto operacional
│   │
│   └── utilities/             # 🔧 UTILITÁRIOS PUROS
│       ├── DateUtils.js           # Manipulação datas
│       ├── FormatUtils.js         # Formatação texto/números
│       ├── ValidationUtils.js     # Validação dados
│       └── MathUtils.js           # Cálculos matemáticos
│
├── 2-services/                # Serviços e integrações externas
│   ├── FileService.js             # Upload/download arquivos
│   ├── SharePointService.js       # Integração SharePoint
│   ├── AuthenticationService.js   # Microsoft Entra (MSAL)
│   ├── CacheService.js            # IndexedDB cache
│   ├── ExportService.js           # PDF/Excel export
│   └── NotificationService.js     # Sistema notificações
│
├── 3-managers/                # Gerenciadores de estado e UI
│   ├── state/                 # 📦 GERENCIAMENTO DE ESTADO
│   │   ├── DataStateManager.js    # Estado global dos dados
│   │   ├── FilterStateManager.js  # Estado dos filtros
│   │   ├── UIStateManager.js      # Estado da UI
│   │   └── SettingsManager.js     # Configurações usuário
│   │
│   ├── ui/                    # 🎨 GERENCIADORES DE UI
│   │   ├── TableManager.js        # Renderização tabelas
│   │   ├── ChartManager.js        # Renderização gráficos
│   │   ├── ModalManager.js        # Sistema de modais
│   │   ├── SidebarManager.js      # Sidebar navegação
│   │   ├── BreadcrumbsManager.js  # Navegação breadcrumbs
│   │   └── TooltipManager.js      # Sistema tooltips
│   │
│   └── features/              # 🎯 FEATURES ESPECÍFICAS
│       ├── SearchManager.js       # Busca inteligente
│       ├── FilterManager.js       # Sistema filtros
│       ├── CalendarManager.js     # Calendário
│       ├── TimelineManager.js     # Timeline
│       ├── ReportsManager.js      # Relatórios
│       └── KeyboardManager.js     # Atalhos teclado
│
├── 4-pages/                   # Controllers das páginas
│   ├── HomePage.js                # Controller página Home
│   ├── CalendarPage.js            # Controller calendário
│   ├── TimelinePage.js            # Controller timeline
│   ├── ReportsPage.js             # Controller relatórios
│   ├── SettingsPage.js            # Controller configurações
│   └── TipsPage.js                # Controller dicas
│
├── 5-app/                     # Inicialização da aplicação
│   ├── App.js                     # Main application controller
│   ├── Router.js                  # Roteamento páginas
│   ├── EventBus.js                # Comunicação entre módulos
│   └── DependencyInjector.js      # Injeção dependências
│
└── legacy/                    # 🗄️ CÓDIGO LEGADO (temporário)
    ├── dashboard.js               # Dashboard atual (manter até migração)
    ├── cronogramaParser.js        # Parser atual (migrar gradualmente)
    └── ...outros arquivos...      # Mantidos até migração completa
```

---

## 🔄 Fluxo de Dados - Arquitetura Completa

### **Pipeline de Dados - Do Input ao Output**

```
┌─────────────────────────────────────────────────────────────────┐
│                       FLUXO DE DADOS                             │
└─────────────────────────────────────────────────────────────────┘

1. CARREGAMENTO (Input)
   ├─ FileService.uploadFile() → Excel/CSV file
   ├─ SharePointService.loadFromSharePoint() → SharePoint file
   └─ CacheService.getFromCache() → Cached data
                    ↓
2. PARSING (Raw → Structured)
   ├─ DataLoader.loadFile() → raw CSV string
   ├─ DataParser.parseCSV() → array of rows
   └─ DataParser.extractColumns() → structured objects
                    ↓
3. TRANSFORMAÇÃO (Structured → Enhanced)
   ├─ DataTransformer.enrichWithAge() → adiciona idade
   ├─ DataTransformer.enrichWithLicencas() → adiciona licenças
   ├─ AposentadoriaAnalyzer.calculate() → adiciona aposentadoria
   └─ UrgencyAnalyzer.analyze() → adiciona urgência
                    ↓
4. ARMAZENAMENTO (State)
   ├─ DataStateManager.setAllServidores(data)
   └─ DataStateManager.setFilteredServidores(data)
                    ↓
5. FILTRAGEM (Enhanced → Filtered)
   ├─ FilterStateManager.getActiveFilters()
   ├─ DataFilter.applyFilters(data, filters)
   └─ DataStateManager.setFilteredServidores(filtered)
                    ↓
6. AGREGAÇÃO (Filtered → Stats)
   ├─ DataAggregator.calculateStats(filtered)
   ├─ DataAggregator.groupByUrgency(filtered)
   └─ DataAggregator.groupByCargo(filtered)
                    ↓
7. RENDERIZAÇÃO (Output)
   ├─ TableManager.render(filtered)
   ├─ ChartManager.renderCharts(stats)
   └─ UIManager.updateCounters(stats)
```

---

## 📐 Estrutura Detalhada de Cada Camada

### **1-core/data-flow/ - Fluxo de Dados**

#### **DataLoader.js** - Carregamento
```javascript
/**
 * Responsabilidade: Carregar dados de diferentes fontes
 * Input: File, URL, Cache
 * Output: Raw string/binary data
 */
class DataLoader {
    /**
     * Carrega arquivo local
     * @param {File} file - Arquivo selecionado
     * @returns {Promise<string>} - Conteúdo CSV
     */
    static async loadLocalFile(file) { }

    /**
     * Carrega de SharePoint
     * @param {string} url - URL do SharePoint
     * @returns {Promise<string>} - Conteúdo CSV
     */
    static async loadFromSharePoint(url) { }

    /**
     * Carrega do cache
     * @param {string} cacheKey - Chave do cache
     * @returns {Promise<string>} - Conteúdo CSV
     */
    static async loadFromCache(cacheKey) { }
}
```

#### **DataParser.js** - Parsing
```javascript
/**
 * Responsabilidade: Converter raw data → structured data
 * Input: CSV string, Excel binary
 * Output: Array de objetos estruturados
 */
class DataParser {
    /**
     * Parse CSV para array de objetos
     * @param {string} csvString - String CSV
     * @returns {Array<Object>} - Array de servidores
     */
    static parseCSV(csvString) { }

    /**
     * Extrai colunas com headers flexíveis
     * @param {Array<Object>} rows - Linhas do CSV
     * @returns {Array<Object>} - Objetos com colunas mapeadas
     */
    static extractColumns(rows) { }

    /**
     * Parse datas brasileiras
     * @param {string} dateStr - Data em formato BR
     * @returns {Date|null} - Data parseada
     */
    static parseBrazilianDate(dateStr) { }
}
```

#### **DataTransformer.js** - Transformação
```javascript
/**
 * Responsabilidade: Enriquecer dados com cálculos
 * Input: Structured data (básico)
 * Output: Enhanced data (com cálculos)
 */
class DataTransformer {
    /**
     * Enriquece com idade calculada
     * @param {Array<Object>} servidores
     * @returns {Array<Object>} - Com campo 'idade'
     */
    static enrichWithAge(servidores) { }

    /**
     * Enriquece com licenças parseadas
     * @param {Array<Object>} servidores
     * @returns {Array<Object>} - Com campo 'licencas'
     */
    static enrichWithLicencas(servidores) { }

    /**
     * Enriquece com aposentadoria
     * @param {Array<Object>} servidores
     * @returns {Array<Object>} - Com campo 'aposentadoria'
     */
    static enrichWithAposentadoria(servidores) { }

    /**
     * Enriquece com urgência
     * @param {Array<Object>} servidores
     * @returns {Array<Object>} - Com campo 'urgencia'
     */
    static enrichWithUrgency(servidores) { }

    /**
     * Pipeline completo de transformação
     * @param {Array<Object>} servidores - Dados básicos
     * @returns {Array<Object>} - Dados completos
     */
    static transformAll(servidores) {
        let data = servidores;
        data = this.enrichWithAge(data);
        data = this.enrichWithLicencas(data);
        data = this.enrichWithAposentadoria(data);
        data = this.enrichWithUrgency(data);
        return data;
    }
}
```

#### **DataFilter.js** - Filtragem
```javascript
/**
 * Responsabilidade: Filtrar dados com múltiplos critérios
 * Input: Enhanced data + Filter criteria
 * Output: Filtered data
 */
class DataFilter {
    /**
     * Aplica múltiplos filtros
     * @param {Array<Object>} data - Dados completos
     * @param {Object} filters - Critérios de filtro
     * @returns {Array<Object>} - Dados filtrados
     */
    static applyFilters(data, filters) { }

    /**
     * Filtra por texto (busca fuzzy)
     * @param {Array<Object>} data
     * @param {string} searchTerm
     * @returns {Array<Object>}
     */
    static filterByText(data, searchTerm) { }

    /**
     * Filtra por urgência
     * @param {Array<Object>} data
     * @param {Array<string>} urgencies - ['critica', 'alta', ...]
     * @returns {Array<Object>}
     */
    static filterByUrgency(data, urgencies) { }

    /**
     * Filtra por data range
     * @param {Array<Object>} data
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Array<Object>}
     */
    static filterByDateRange(data, startDate, endDate) { }
}
```

#### **DataAggregator.js** - Agregação
```javascript
/**
 * Responsabilidade: Agregar dados para estatísticas
 * Input: Filtered data
 * Output: Aggregated stats
 */
class DataAggregator {
    /**
     * Calcula estatísticas gerais
     * @param {Array<Object>} data
     * @returns {Object} - { total, critica, alta, moderada, baixa }
     */
    static calculateStats(data) { }

    /**
     * Agrupa por urgência
     * @param {Array<Object>} data
     * @returns {Object} - { critica: [], alta: [], ... }
     */
    static groupByUrgency(data) { }

    /**
     * Agrupa por cargo
     * @param {Array<Object>} data
     * @returns {Object} - { 'Auditor': [], 'Analista': [], ... }
     */
    static groupByCargo(data) { }

    /**
     * Agrupa por mês (para timeline)
     * @param {Array<Object>} data
     * @returns {Object} - { '2025-01': 5, '2025-02': 8, ... }
     */
    static groupByMonth(data) { }
}
```

---

### **3-managers/state/ - Gerenciamento de Estado**

#### **DataStateManager.js** - Estado Global dos Dados
```javascript
/**
 * Responsabilidade: Single source of truth para dados
 * Padrão: Singleton
 */
class DataStateManager {
    constructor() {
        this._allServidores = [];      // Todos os dados (original)
        this._filteredServidores = []; // Dados filtrados (atual)
        this._notificacoes = [];       // Notificações
        this._listeners = [];          // Observers
    }

    // Getters
    getAllServidores() { return this._allServidores; }
    getFilteredServidores() { return this._filteredServidores; }

    // Setters (com notificação de mudança)
    setAllServidores(data) {
        this._allServidores = data;
        this._notifyChange('all-data-changed', data);
    }

    setFilteredServidores(data) {
        this._filteredServidores = data;
        this._notifyChange('filtered-data-changed', data);
    }

    // Observer pattern
    subscribe(eventType, callback) {
        this._listeners.push({ eventType, callback });
    }

    _notifyChange(eventType, data) {
        this._listeners
            .filter(l => l.eventType === eventType)
            .forEach(l => l.callback(data));
    }
}

// Singleton global
window.dataStateManager = new DataStateManager();
```

#### **FilterStateManager.js** - Estado dos Filtros
```javascript
/**
 * Responsabilidade: Gerenciar filtros ativos
 * Padrão: Singleton
 */
class FilterStateManager {
    constructor() {
        this._activeFilters = {
            searchTerm: '',
            urgencies: [],
            cargos: [],
            dateRange: { start: null, end: null },
            lotacoes: [],
            customFilters: []
        };
        this._listeners = [];
    }

    getActiveFilters() { return this._activeFilters; }

    setFilter(filterType, value) {
        this._activeFilters[filterType] = value;
        this._notifyChange('filters-changed', this._activeFilters);
    }

    clearAllFilters() {
        this._activeFilters = {
            searchTerm: '',
            urgencies: [],
            cargos: [],
            dateRange: { start: null, end: null },
            lotacoes: [],
            customFilters: []
        };
        this._notifyChange('filters-cleared', this._activeFilters);
    }

    subscribe(eventType, callback) {
        this._listeners.push({ eventType, callback });
    }

    _notifyChange(eventType, data) {
        this._listeners
            .filter(l => l.eventType === eventType)
            .forEach(l => l.callback(data));
    }
}

window.filterStateManager = new FilterStateManager();
```

---

### **5-app/ - Aplicação Principal**

#### **App.js** - Controller Principal
```javascript
/**
 * Responsabilidade: Orquestrador principal da aplicação
 * Substitui: dashboard.js (atual DashboardMultiPage)
 */
class App {
    constructor() {
        this.dataStateManager = window.dataStateManager;
        this.filterStateManager = window.filterStateManager;

        // Managers (lazy initialization)
        this.tableManager = null;
        this.chartManager = null;
        this.searchManager = null;
        // ... outros managers
    }

    /**
     * Inicializa aplicação
     */
    async init() {
        console.log('🚀 Inicializando aplicação...');

        // 1. Inicializar managers
        this._initializeManagers();

        // 2. Setup event listeners
        this._setupEventListeners();

        // 3. Carregar configurações
        await this._loadSettings();

        // 4. Setup routing
        this._setupRouting();

        // 5. Restaurar cache se existir
        await this._restoreCache();

        console.log('✅ Aplicação inicializada');
    }

    /**
     * Carrega arquivo e processa
     */
    async loadFile(file) {
        try {
            // 1. Carregamento
            const rawData = await DataLoader.loadLocalFile(file);

            // 2. Parsing
            const parsedData = DataParser.parseCSV(rawData);

            // 3. Transformação
            const transformedData = DataTransformer.transformAll(parsedData);

            // 4. Armazenamento
            this.dataStateManager.setAllServidores(transformedData);
            this.dataStateManager.setFilteredServidores(transformedData);

            // 5. Cache
            await CacheService.saveToCache(file.name, transformedData);

            // 6. UI será atualizada automaticamente via observers

        } catch (error) {
            console.error('Erro ao carregar arquivo:', error);
            NotificationService.showError('Erro ao processar arquivo');
        }
    }

    /**
     * Aplica filtros
     */
    applyFilters() {
        const allData = this.dataStateManager.getAllServidores();
        const filters = this.filterStateManager.getActiveFilters();

        // Filtrar dados
        const filtered = DataFilter.applyFilters(allData, filters);

        // Atualizar estado (observers serão notificados)
        this.dataStateManager.setFilteredServidores(filtered);
    }

    _initializeManagers() {
        // Inicialização condicional (igual ao dashboard.js atual)
        if (typeof TableManager !== 'undefined') {
            this.tableManager = new TableManager(this);
            console.log('✅ TableManager inicializado');
        }

        if (typeof ChartManager !== 'undefined') {
            this.chartManager = new ChartManager(this);
            console.log('✅ ChartManager inicializado');
        }

        // ... outros managers
    }

    _setupEventListeners() {
        // Observer pattern - auto-atualização da UI
        this.dataStateManager.subscribe('filtered-data-changed', (data) => {
            this.tableManager?.render(data);
            this.chartManager?.updateCharts(data);
        });

        this.filterStateManager.subscribe('filters-changed', () => {
            this.applyFilters();
        });
    }
}

// Singleton global (compatibilidade com código existente)
window.app = new App();
window.dashboard = window.app; // Alias para compatibilidade

// Auto-inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
```

---

## 🚦 Estratégia de Migração - SEGURANÇA MÁXIMA

### **Princípios da Migração Segura**

1. ✅ **NUNCA deletar código que funciona** antes de validar novo código
2. ✅ **Backward compatibility** - manter aliases e bridges
3. ✅ **Migração incremental** - um fluxo por vez
4. ✅ **Testes em cada etapa** - validar antes de prosseguir
5. ✅ **Rollback fácil** - manter código antigo comentado

---

### **Fase 1: Preparação (SEM QUEBRAR NADA)**

**Objetivo:** Criar estrutura sem tocar no código existente

**Passos:**
1. Criar estrutura de pastas vazia
2. Copiar (não mover) arquivos existentes para `legacy/`
3. Criar arquivos novos vazios com comentários de TODOs
4. Testar que aplicação continua funcionando normalmente

**Duração:** 30 minutos
**Risco:** 🟢 Zero (não modificamos código)

**Checklist:**
- [ ] Criar pastas: `1-core/`, `2-services/`, `3-managers/`, `4-pages/`, `5-app/`, `legacy/`
- [ ] Copiar `dashboard.js` → `legacy/dashboard.js` (backup)
- [ ] Criar arquivos vazios com TODOs
- [ ] Testar aplicação (deve funcionar normalmente)

---

### **Fase 2: Migrar Utilitários (BAIXO RISCO)**

**Objetivo:** Migrar funções puras sem dependências

**Ordem:**
1. `DateUtils.js` - Funções de data (já existe)
2. `FormatUtils.js` - Formatação (já existe)
3. `ValidationUtils.js` - Validação (já existe)

**Estratégia:**
```javascript
// 1-core/utilities/DateUtils.js (NOVO)
class DateUtils {
    static parseBrazilianDate(str) {
        // Copiar código do cronogramaParser.js
    }
}

// legacy/cronogramaParser.js (MANTER)
// Criar bridge de compatibilidade
if (typeof DateUtils !== 'undefined') {
    // Usar nova implementação
    window.parseBrazilianDate = DateUtils.parseBrazilianDate.bind(DateUtils);
} else {
    // Usar implementação antiga
    window.parseBrazilianDate = function(str) { /* código antigo */ };
}
```

**Teste:**
```javascript
// No console do navegador
console.log(DateUtils.parseBrazilianDate('jan/2025')); // Deve funcionar
console.log(window.parseBrazilianDate('jan/2025'));    // Deve funcionar (bridge)
```

**Checklist:**
- [ ] Migrar `DateUtils.js`
- [ ] Criar bridge de compatibilidade
- [ ] Testar todas as funções
- [ ] Validar que cronogramaParser continua funcionando
- [ ] Repetir para `FormatUtils` e `ValidationUtils`

**Duração:** 2-3 horas
**Risco:** 🟡 Baixo (funções puras sem dependências)

---

### **Fase 3: Migrar Lógica de Negócio (MÉDIO RISCO)**

**Objetivo:** Isolar cálculos de aposentadoria, licenças e urgência

**Ordem:**
1. `AposentadoriaAnalyzer.js` - Já existe em `core/`
2. `LicencaCalculator.js` - Já existe em `core/`
3. `UrgencyAnalyzer.js` - Já existe em `core/`

**Esses já estão isolados!** ✅

**Teste:**
```javascript
// Testar que continuam funcionando
const servidor = { idade: 45, sexo: 'F', dataAdmissao: new Date('2000-01-01') };
const resultado = AposentadoriaAnalyzer.calculate(servidor, settings);
console.log(resultado); // Deve retornar objeto correto
```

**Checklist:**
- [ ] Verificar que `AposentadoriaAnalyzer` funciona isoladamente
- [ ] Verificar que `LicencaCalculator` funciona isoladamente
- [ ] Verificar que `UrgencyAnalyzer` funciona isoladamente
- [ ] Documentar dependências entre eles

**Duração:** 1 hora
**Risco:** 🟢 Zero (já estão isolados)

---

### **Fase 4: Criar Camada de Estado (MÉDIO RISCO)**

**Objetivo:** Centralizar estado em managers

**Estratégia:** Criar managers que **WRAPEIAM** código existente

```javascript
// 3-managers/state/DataStateManager.js (NOVO)
class DataStateManager {
    constructor(dashboardInstance) {
        this.dashboard = dashboardInstance; // Referência ao dashboard.js
    }

    getAllServidores() {
        // Bridge para código existente
        return this.dashboard.allServidores;
    }

    setAllServidores(data) {
        // Bridge para código existente
        this.dashboard.allServidores = data;
        this._notifyChange('all-data-changed', data);
    }

    // Novo: Observer pattern
    _notifyChange(event, data) {
        // Emitir evento customizado
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
}

// dashboard.js (MODIFICAR MINIMAMENTE)
class DashboardMultiPage {
    constructor() {
        this.allServidores = [];

        // NOVO: Criar manager que wrapeia este objeto
        if (typeof DataStateManager !== 'undefined') {
            this.dataStateManager = new DataStateManager(this);
        }
    }
}
```

**Teste:**
```javascript
// Código antigo continua funcionando
dashboard.allServidores = [/* dados */];

// Código novo também funciona
dashboard.dataStateManager.setAllServidores([/* dados */]);

// Ambos acessam mesma variável
console.log(dashboard.allServidores === dashboard.dataStateManager.getAllServidores()); // true
```

**Checklist:**
- [ ] Criar `DataStateManager` como wrapper
- [ ] Criar `FilterStateManager` como wrapper
- [ ] Testar que código antigo continua funcionando
- [ ] Testar que código novo acessa mesmos dados
- [ ] Validar que eventos customizados funcionam

**Duração:** 3-4 horas
**Risco:** 🟡 Médio (modifica dashboard.js minimamente)

---

### **Fase 5: Migrar Fluxo de Carregamento (ALTO RISCO)**

**Objetivo:** Isolar carregamento de dados em pipeline

**CRÍTICO:** Esta é a parte mais arriscada - requer testes extensivos

**Estratégia:** Criar novo pipeline mas manter antigo funcionando

```javascript
// 1-core/data-flow/DataPipeline.js (NOVO)
class DataPipeline {
    /**
     * Pipeline completo: File → Enhanced Data
     */
    static async processFile(file) {
        // 1. Carregamento
        const rawData = await DataLoader.loadLocalFile(file);

        // 2. Parsing (usar cronogramaParser existente temporariamente)
        const parsed = window.cronogramaParser.parse(rawData);

        // 3. Transformação
        const transformed = DataTransformer.transformAll(parsed);

        return transformed;
    }
}

// dashboard.js (ADICIONAR OPÇÃO NOVA)
class DashboardMultiPage {
    async handleFileUpload(file) {
        // Opção 1: Usar pipeline novo (se disponível)
        if (typeof DataPipeline !== 'undefined' && window.USE_NEW_PIPELINE) {
            const data = await DataPipeline.processFile(file);
            this.allServidores = data;
        }
        // Opção 2: Usar código antigo (fallback seguro)
        else {
            // Código antigo que já funciona
            const data = await this.processFileOldWay(file);
            this.allServidores = data;
        }
    }
}
```

**Teste A/B:**
```javascript
// Testar pipeline antigo
window.USE_NEW_PIPELINE = false;
await dashboard.handleFileUpload(file);
const resultadoAntigo = dashboard.allServidores;

// Testar pipeline novo
window.USE_NEW_PIPELINE = true;
await dashboard.handleFileUpload(file);
const resultadoNovo = dashboard.allServidores;

// Comparar resultados
console.log('Resultados idênticos?',
    JSON.stringify(resultadoAntigo) === JSON.stringify(resultadoNovo)
);
```

**Checklist:**
- [ ] Criar `DataLoader.js`
- [ ] Criar `DataParser.js` (copiar de cronogramaParser)
- [ ] Criar `DataTransformer.js`
- [ ] Criar `DataPipeline.js` (orquestrador)
- [ ] Adicionar flag `USE_NEW_PIPELINE` no dashboard
- [ ] Testar com pipeline antigo (deve funcionar)
- [ ] Testar com pipeline novo (deve gerar mesmos resultados)
- [ ] Fazer testes A/B com vários arquivos
- [ ] Validar que tabelas e gráficos renderizam igualmente

**Duração:** 1-2 dias
**Risco:** 🔴 Alto (mexe em parsing crítico)

---

### **Fase 6: Migrar Renderização (MÉDIO RISCO)**

**Objetivo:** Isolar TableManager e ChartManager

**Esses já estão parcialmente isolados!** ✅

**Estratégia:** Torná-los mais independentes

```javascript
// 3-managers/ui/TableManager.js (REFATORAR)
class TableManager {
    constructor() {
        // Remover dependência do dashboard
        this.dataStateManager = window.dataStateManager;

        // Auto-subscribe para mudanças
        this.dataStateManager.subscribe('filtered-data-changed', (data) => {
            this.render(data);
        });
    }

    render(data) {
        // Código de renderização (já existe)
    }
}
```

**Checklist:**
- [ ] Refatorar `TableManager` para usar DataStateManager
- [ ] Refatorar `ChartManager` para usar DataStateManager
- [ ] Adicionar auto-subscribe em ambos
- [ ] Testar renderização automática ao mudar dados
- [ ] Validar que tabela e gráficos atualizam corretamente

**Duração:** 4-6 horas
**Risco:** 🟡 Médio (já está parcialmente isolado)

---

### **Fase 7: Criar App.js Principal (ALTO RISCO)**

**Objetivo:** Criar novo orquestrador principal

**Estratégia:** Criar `App.js` que COEXISTE com `dashboard.js`

```javascript
// 5-app/App.js (NOVO)
class App {
    constructor() {
        // Usar mesmos managers do dashboard
        this.dataStateManager = window.dataStateManager;
        this.tableManager = window.tableManager;
        this.chartManager = window.chartManager;
    }

    async init() {
        console.log('🚀 App.js inicializado');
        // Inicialização mínima
    }
}

// Criar instância mas NÃO substituir dashboard ainda
window.app = new App();

// Dashboard continua sendo usado
window.dashboard = new DashboardMultiPage();
window.dashboard.init();
```

**Teste:**
```javascript
// Ambos devem coexistir
console.log(window.app);       // App instance
console.log(window.dashboard); // Dashboard instance
console.log(window.app.dataStateManager === window.dashboard.dataStateManager); // true
```

**Checklist:**
- [ ] Criar `App.js` básico
- [ ] Fazer App e Dashboard compartilharem managers
- [ ] Testar que ambos funcionam simultaneamente
- [ ] Validar que não há conflitos

**Duração:** 2-3 horas
**Risco:** 🟡 Médio (coexistência)

---

### **Fase 8: Switchover Gradual (CRÍTICO)**

**Objetivo:** Migrar código para usar App.js ao invés de dashboard.js

**Estratégia:** Feature flags e testes extensivos

```javascript
// index.html
<script>
    // Feature flag
    window.USE_NEW_APP = false; // Inicialmente falso (seguro)
</script>

// Inicialização condicional
document.addEventListener('DOMContentLoaded', () => {
    if (window.USE_NEW_APP) {
        window.app.init();
        console.log('🆕 Usando App.js (novo)');
    } else {
        window.dashboard.init();
        console.log('🗄️ Usando Dashboard.js (legado)');
    }
});
```

**Testes extensivos:**
1. Testar TODAS as funcionalidades com `USE_NEW_APP = false`
2. Testar TODAS as funcionalidades com `USE_NEW_APP = true`
3. Comparar resultados
4. Validar que não há regressões

**Checklist:**
- [ ] Adicionar feature flag
- [ ] Testar com app antigo (baseline)
- [ ] Testar com app novo
- [ ] Validar upload de arquivo
- [ ] Validar parsing de dados
- [ ] Validar filtros
- [ ] Validar gráficos
- [ ] Validar exportação
- [ ] Validar SharePoint
- [ ] Validar todas as páginas
- [ ] Fazer testes de performance
- [ ] Validar em diferentes navegadores

**Duração:** 2-3 dias (incluindo testes)
**Risco:** 🔴 Crítico (mudança fundamental)

---

### **Fase 9: Limpeza Final**

**Objetivo:** Remover código legado após validação completa

**SOMENTE APÓS:**
- ✅ 2 semanas de uso em produção sem problemas
- ✅ Todos os testes passando
- ✅ Validação de usuários

**Checklist:**
- [ ] Mover `dashboard.js` para `legacy/` (não deletar)
- [ ] Remover feature flags
- [ ] Limpar bridges de compatibilidade
- [ ] Atualizar documentação
- [ ] Criar backup completo antes de deletar

**Duração:** 1 dia
**Risco:** 🟡 Médio (mas com backup)

---

## 📊 Ordem de Carregamento dos Scripts

### **ATUAL (index.html existente)**

```html
<!-- Bibliotecas externas -->
<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Theme (deve ser primeiro) -->
<script src="js/themeManager.js"></script>

<!-- Core -->
<script src="js/core/AposentadoriaAnalyzer.js"></script>
<script src="js/core/DataParser.js"></script>
<script src="js/core/LicencaCalculator.js"></script>
<script src="js/core/UrgencyAnalyzer.js"></script>

<!-- Utils -->
<script src="js/utils/DateUtils.js"></script>
<script src="js/utils/FormatUtils.js"></script>
<script src="js/utils/ValidationUtils.js"></script>

<!-- Modules (managers) -->
<script src="js/modules/FileManager.js"></script>
<script src="js/modules/TableManager.js"></script>
<script src="js/modules/ChartManager.js"></script>
<!-- ... outros 24 managers ... -->

<!-- Main (ÚLTIMO) -->
<script src="js/dashboard.js"></script>
```

---

### **NOVA ARQUITETURA (ordem proposta)**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <!-- ... meta tags ... -->

    <!-- ==================== BIBLIOTECAS EXTERNAS ==================== -->
    <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://alcdn.msauth.net/browser/2.14.2/js/msal-browser.min.js"></script>

    <!-- ==================== 1. CORE - UTILITIES ==================== -->
    <script src="js/1-core/utilities/DateUtils.js"></script>
    <script src="js/1-core/utilities/FormatUtils.js"></script>
    <script src="js/1-core/utilities/ValidationUtils.js"></script>
    <script src="js/1-core/utilities/MathUtils.js"></script>

    <!-- ==================== 1. CORE - BUSINESS LOGIC ==================== -->
    <script src="js/1-core/business-logic/AposentadoriaAnalyzer.js"></script>
    <script src="js/1-core/business-logic/LicencaCalculator.js"></script>
    <script src="js/1-core/business-logic/UrgencyAnalyzer.js"></script>
    <script src="js/1-core/business-logic/OperationalImpact.js"></script>

    <!-- ==================== 1. CORE - DATA FLOW ==================== -->
    <script src="js/1-core/data-flow/DataLoader.js"></script>
    <script src="js/1-core/data-flow/DataParser.js"></script>
    <script src="js/1-core/data-flow/DataTransformer.js"></script>
    <script src="js/1-core/data-flow/DataFilter.js"></script>
    <script src="js/1-core/data-flow/DataAggregator.js"></script>

    <!-- ==================== 2. SERVICES ==================== -->
    <script src="js/2-services/FileService.js"></script>
    <script src="js/2-services/CacheService.js"></script>
    <script src="js/2-services/AuthenticationService.js"></script>
    <script src="js/2-services/SharePointService.js"></script>
    <script src="js/2-services/ExportService.js"></script>
    <script src="js/2-services/NotificationService.js"></script>

    <!-- ==================== 3. MANAGERS - STATE ==================== -->
    <script src="js/3-managers/state/DataStateManager.js"></script>
    <script src="js/3-managers/state/FilterStateManager.js"></script>
    <script src="js/3-managers/state/UIStateManager.js"></script>
    <script src="js/3-managers/state/SettingsManager.js"></script>

    <!-- ==================== 3. MANAGERS - UI ==================== -->
    <script src="js/3-managers/ui/TableManager.js"></script>
    <script src="js/3-managers/ui/ChartManager.js"></script>
    <script src="js/3-managers/ui/ModalManager.js"></script>
    <script src="js/3-managers/ui/SidebarManager.js"></script>
    <script src="js/3-managers/ui/BreadcrumbsManager.js"></script>
    <script src="js/3-managers/ui/TooltipManager.js"></script>

    <!-- ==================== 3. MANAGERS - FEATURES ==================== -->
    <script src="js/3-managers/features/SearchManager.js"></script>
    <script src="js/3-managers/features/FilterManager.js"></script>
    <script src="js/3-managers/features/CalendarManager.js"></script>
    <script src="js/3-managers/features/TimelineManager.js"></script>
    <script src="js/3-managers/features/ReportsManager.js"></script>
    <script src="js/3-managers/features/KeyboardManager.js"></script>

    <!-- ==================== 4. PAGES ==================== -->
    <script src="js/4-pages/HomePage.js"></script>
    <script src="js/4-pages/CalendarPage.js"></script>
    <script src="js/4-pages/TimelinePage.js"></script>
    <script src="js/4-pages/ReportsPage.js"></script>
    <script src="js/4-pages/SettingsPage.js"></script>
    <script src="js/4-pages/TipsPage.js"></script>

    <!-- ==================== 5. APP - MAIN APPLICATION ==================== -->
    <script src="js/5-app/EventBus.js"></script>
    <script src="js/5-app/Router.js"></script>
    <script src="js/5-app/App.js"></script>

    <!-- ==================== LEGACY (temporário durante migração) ==================== -->
    <script src="js/legacy/dashboard.js"></script>
    <script src="js/legacy/cronogramaParser.js"></script>
</head>
<body>
    <!-- ... conteúdo ... -->
</body>
</html>
```

---

## ⚠️ Regras Críticas de Migração

### **🔴 NUNCA:**

1. ❌ Deletar código que funciona antes de validar substituição
2. ❌ Modificar múltiplos arquivos simultaneamente
3. ❌ Fazer commit sem testar
4. ❌ Migrar sem criar backup
5. ❌ Confiar em "acho que funciona" - SEMPRE testar
6. ❌ Fazer merge de branches sem code review
7. ❌ Modificar código em produção diretamente

### **🟢 SEMPRE:**

1. ✅ Criar backup antes de qualquer mudança
2. ✅ Testar CADA passo antes de prosseguir
3. ✅ Manter código antigo funcionando (bridges)
4. ✅ Usar feature flags para switchover
5. ✅ Fazer commits pequenos e frequentes
6. ✅ Documentar cada mudança
7. ✅ Validar com dados reais

---

## 📚 Dependências Entre Módulos

### **Grafo de Dependências**

```
Utilities (sem dependências)
    ↓
Business Logic (depende de Utilities)
    ↓
Data Flow (depende de Business Logic + Utilities)
    ↓
Services (depende de Data Flow)
    ↓
State Managers (depende de Services + Data Flow)
    ↓
UI Managers (depende de State Managers)
    ↓
Features (depende de UI Managers + State Managers)
    ↓
Pages (depende de Features + UI Managers)
    ↓
App (depende de tudo)
```

**Regra:** Camadas inferiores NÃO podem depender de camadas superiores

---

## 🎓 Exemplos Práticos

### **Exemplo 1: Adicionar Novo Filtro**

**Cenário:** Adicionar filtro por "Subsecretaria"

**Passos:**

1. **Atualizar FilterStateManager:**
```javascript
// 3-managers/state/FilterStateManager.js
this._activeFilters = {
    // ... filtros existentes
    subsecretarias: [] // NOVO
};
```

2. **Atualizar DataFilter:**
```javascript
// 1-core/data-flow/DataFilter.js
static filterBySubsecretaria(data, subsecretarias) {
    if (!subsecretarias || subsecretarias.length === 0) return data;
    return data.filter(s => subsecretarias.includes(s.subsecretaria));
}
```

3. **Atualizar UI:**
```javascript
// HTML - adicionar checkboxes
// JS - conectar ao FilterStateManager
document.querySelector('#filter-subsec-x').addEventListener('change', (e) => {
    const current = filterStateManager.getActiveFilters().subsecretarias;
    if (e.target.checked) {
        current.push('SUBSEC-X');
    } else {
        current.splice(current.indexOf('SUBSEC-X'), 1);
    }
    filterStateManager.setFilter('subsecretarias', current);
});
```

4. **Testar:**
- Selecionar filtro
- Verificar que dados são filtrados
- Verificar que tabela atualiza
- Verificar que gráficos atualizam

---

### **Exemplo 2: Adicionar Nova Página**

**Cenário:** Criar página de "Impacto Operacional"

**Passos:**

1. **Criar controller:**
```javascript
// 4-pages/ImpactPage.js
class ImpactPage {
    constructor(app) {
        this.app = app;
        this.dataStateManager = app.dataStateManager;
    }

    render() {
        const data = this.dataStateManager.getFilteredServidores();
        const impact = DataAggregator.calculateOperationalImpact(data);
        this._renderImpactCharts(impact);
    }

    _renderImpactCharts(impact) {
        // Renderizar gráficos específicos
    }
}
```

2. **Adicionar HTML:**
```html
<div id="impactPage" class="page-content">
    <h1>Impacto Operacional</h1>
    <!-- ... conteúdo ... -->
</div>
```

3. **Adicionar roteamento:**
```javascript
// 5-app/Router.js
this.routes['impact'] = () => {
    this.impactPage.render();
};
```

4. **Adicionar link na sidebar:**
```html
<a href="#" class="nav-link" data-page="impact">
    <i class="bi bi-bar-chart"></i>
    <span>Impacto Operacional</span>
</a>
```

---

## 🔍 Debugging e Testes

### **Console Utilities**

```javascript
// Helpers globais para debug
window.DEBUG = {
    // Ver estado atual
    getState() {
        return {
            all: dataStateManager.getAllServidores().length,
            filtered: dataStateManager.getFilteredServidores().length,
            filters: filterStateManager.getActiveFilters()
        };
    },

    // Testar pipeline
    async testPipeline(file) {
        console.time('Pipeline');
        const result = await DataPipeline.processFile(file);
        console.timeEnd('Pipeline');
        return result;
    },

    // Comparar pipelines
    async comparePipelines(file) {
        console.log('🔵 Testando pipeline antigo...');
        window.USE_NEW_PIPELINE = false;
        const old = await dashboard.handleFileUpload(file);

        console.log('🟢 Testando pipeline novo...');
        window.USE_NEW_PIPELINE = true;
        const novo = await dashboard.handleFileUpload(file);

        console.log('Resultados:');
        console.log('Antigo:', old.length, 'registros');
        console.log('Novo:', novo.length, 'registros');
        console.log('Idênticos?', JSON.stringify(old) === JSON.stringify(novo));
    },

    // Ver dependências
    checkDependencies() {
        const required = [
            'DateUtils', 'FormatUtils', 'ValidationUtils',
            'DataStateManager', 'FilterStateManager',
            'TableManager', 'ChartManager'
        ];

        required.forEach(dep => {
            const exists = typeof window[dep] !== 'undefined';
            console.log(exists ? '✅' : '❌', dep);
        });
    }
};
```

---

## 📊 Checklist Geral de Migração

### **Antes de Começar**
- [ ] Criar branch de feature
- [ ] Fazer backup completo do código
- [ ] Documentar estado atual
- [ ] Definir critérios de sucesso

### **Durante Migração**
- [ ] Seguir ordem das fases
- [ ] Testar CADA passo
- [ ] Fazer commits pequenos
- [ ] Manter backward compatibility
- [ ] Documentar mudanças

### **Validação**
- [ ] Todos os testes passando
- [ ] Upload de arquivo funciona
- [ ] Parsing correto
- [ ] Filtros funcionam
- [ ] Gráficos renderizam
- [ ] Exportação funciona
- [ ] SharePoint funciona
- [ ] Performance mantida/melhorada
- [ ] Sem erros no console
- [ ] Funciona em todos os navegadores

### **Deploy**
- [ ] Code review completo
- [ ] Testes em staging
- [ ] Validação com usuários
- [ ] Monitoramento pós-deploy
- [ ] Plano de rollback pronto

---

## 🎯 Estimativa de Tempo Total

| Fase | Duração | Risco | Prioridade |
|------|---------|-------|------------|
| 1. Preparação | 30 min | 🟢 Zero | Alta |
| 2. Utilitários | 2-3 horas | 🟡 Baixo | Média |
| 3. Lógica Negócio | 1 hora | 🟢 Zero | Alta |
| 4. Estado | 3-4 horas | 🟡 Médio | Alta |
| 5. Carregamento | 1-2 dias | 🔴 Alto | **CRÍTICA** |
| 6. Renderização | 4-6 horas | 🟡 Médio | Alta |
| 7. App.js | 2-3 horas | 🟡 Médio | Alta |
| 8. Switchover | 2-3 dias | 🔴 Crítico | **CRÍTICA** |
| 9. Limpeza | 1 dia | 🟡 Médio | Baixa |

**TOTAL:** 1-2 semanas de trabalho (com testes extensivos)

---

## ✅ Conclusão

Esta arquitetura proporciona:

1. ✅ **Organização por fluxo de dados** (input → transformação → output)
2. ✅ **Migração segura** com backward compatibility
3. ✅ **Testabilidade** em cada etapa
4. ✅ **Manutenibilidade** com responsabilidades claras
5. ✅ **Escalabilidade** para futuras features

**PRÓXIMO PASSO:** Decidir se/quando começar a migração e qual fase priorizar.

---

**Data de criação:** 2025-01-17
**Versão:** 1.0
**Status:** Documentação completa - Pronto para discussão e aprovação
