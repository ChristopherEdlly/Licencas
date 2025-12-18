# Arquitetura JavaScript - Sistema Baseado em Fluxos

## 📋 Visão Geral

Sistema JavaScript modular organizado por **fluxos de dados** e **responsabilidades funcionais**. Diferente do CSS, a migração JS requer **extremo cuidado** pois qualquer erro quebra completamente a aplicação.

**Princípios:**

- ✅ **Organização por fluxo de dados** (input → transformação → output)
- ✅ **Migração incremental e testada** (nunca quebrar o que funciona)
- ✅ **Dependências explícitas** (clear imports/exports)
- ✅ **Backward compatibility** durante migração

---

## 🎯 Diferenças Críticas: CSS vs. JavaScript

| Aspecto                 | CSS                  | JavaScript                         |
| ----------------------- | -------------------- | ---------------------------------- |
| **Erro**          | Visual (não quebra) | Fatal (quebra tudo)                |
| **Ordem**         | Pode variar          | **CRÍTICA** - ordem importa |
| **Dependências** | Independente         | **Altamente acoplado**       |
| **Teste**         | Visual imediato      | Precisa rodar código              |
| **Rollback**      | Fácil               | Complexo                           |
| **Risco**         | Baixo                | **ALTO**                     |

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
