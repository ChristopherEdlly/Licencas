# Sprint 2 - Filtros Avançados e Busca Inteligente

## 📋 Visão Geral

**Objetivo**: Implementar sistema completo de filtros avançados e busca inteligente para melhorar significativamente a experiência de encontrar e filtrar servidores no dashboard.

**Status**: 🚧 Em Desenvolvimento
**Data de Início**: Outubro 2025
**Sprint Anterior**: Sprint 1 (Ordenação, Cache, Validação) - ✅ Completo

---

## 🎯 Objetivos do Sprint

### Problemas a Resolver

1. **Busca Básica**: Atualmente a busca é simples (substring) e não tolera erros de digitação
2. **Filtros Limitados**: Apenas filtros básicos de idade e mês, faltam filtros por cargo, lotação, urgência
3. **Falta de Feedback Visual**: Usuário não vê claramente quais filtros estão ativos
4. **Sem Persistência**: Filtros não são salvos entre sessões
5. **Difícil Combinar Filtros**: Não há forma visual de combinar múltiplos filtros

### Soluções Implementadas

✅ **Busca Fuzzy**: Tolera erros de digitação usando algoritmo Levenshtein
✅ **Busca Multi-Campo**: Separar termos por vírgula para buscar em múltiplos campos
✅ **Autocomplete**: Sugestões enquanto digita
✅ **Filtros Avançados**: Cargo, Lotação, Superintendência, Urgência, Status
✅ **Visual Feedback**: Chips/tags mostrando filtros ativos
✅ **Persistência**: Salvar filtros no localStorage
✅ **Contador em Tempo Real**: "125 de 250 servidores"

---

## 🏗️ Arquitetura

### Componentes Principais

```
js/
├── utils/
│   └── FuzzySearch.js           # Algoritmo Levenshtein + utilitários
├── modules/
│   ├── SmartSearchManager.js     # Busca inteligente com fuzzy + autocomplete
│   ├── AdvancedFilterManager.js  # Gerenciamento de filtros avançados
│   └── FilterChipsUI.js          # Interface visual de chips/tags
└── dashboard.js                  # Integração de todos os managers

css/components/
├── smart-search.css              # Estilos para busca e autocomplete
├── advanced-filters.css          # Estilos para filtros e modal
└── filter-chips.css              # Estilos para chips/tags
```

---

## 📦 Componentes Detalhados

### 1. FuzzySearch.js (~250 linhas) ✅ COMPLETO

**Localização**: `js/utils/FuzzySearch.js`

**Responsabilidade**: Algoritmo de busca fuzzy usando Levenshtein distance

**Métodos Principais**:
```javascript
// Calcula distância entre duas strings (número de edições)
FuzzySearch.levenshteinDistance(str1, str2) → number

// Calcula similaridade (0-1, sendo 1 = idênticas)
FuzzySearch.similarity(str1, str2) → number (0-1)

// Normaliza string (remove acentos, lowercase, trim)
FuzzySearch.normalize(str) → string

// Busca fuzzy em array de strings
FuzzySearch.search(query, items, threshold=0.6) → [{item, score}]

// Busca fuzzy em array de objetos
FuzzySearch.searchObjects(query, objects, fields, threshold=0.6) → [{object, score, matchedField}]

// Verifica se query está contida em target (permite erros)
FuzzySearch.fuzzyContains(query, target, maxErrors=1) → boolean

// Destaca matches com <mark>
FuzzySearch.highlight(text, query) → HTML string

// Sugere correções para palavra com erro
FuzzySearch.suggest(word, dictionary, maxSuggestions=5) → [strings]
```

**Exemplo de Uso**:
```javascript
// Busca simples
const results = FuzzySearch.search('Joao Silva', ['João Silva', 'Maria Santos'], 0.7);
// → [{item: 'João Silva', score: 0.95}]

// Busca em objetos
const servidores = [
    {nome: 'João Silva', cargo: 'Analista'},
    {nome: 'Maria Santos', cargo: 'Técnico'}
];
const results = FuzzySearch.searchObjects('Jauo', servidores, ['nome'], 0.6);
// → [{object: {...}, score: 0.75, matchedField: 'nome'}]

// Highlight
FuzzySearch.highlight('João Silva', 'joao');
// → '<mark>João</mark> Silva'
```

**Algoritmo Levenshtein**:
- Calcula número mínimo de operações (inserir, deletar, substituir) para transformar string A em B
- Complexidade: O(m*n) onde m e n são os tamanhos das strings
- Otimizado com normalização (remove acentos, lowercase)

---

### 2. SmartSearchManager.js (~400 linhas) 🚧 EM DESENVOLVIMENTO

**Localização**: `js/modules/SmartSearchManager.js`

**Responsabilidade**: Gerenciar busca inteligente com fuzzy, autocomplete e multi-campo

**Funcionalidades**:
- ✅ Busca fuzzy tolerante a erros
- ✅ Busca multi-campo separada por vírgula
- ✅ Autocomplete com sugestões ranqueadas
- ✅ Debounce otimizado (300ms)
- ✅ Highlight de termos encontrados
- ✅ Cache de sugestões para performance

**API**:
```javascript
class SmartSearchManager {
    constructor(dashboard) { ... }

    // Processa query de busca
    search(query) → [servidores filtrados]

    // Retorna sugestões autocomplete
    getAutocompleteSuggestions(partial, limit=5) → [{text, type, score}]

    // Busca multi-campo (vírgula separada)
    multiFieldSearch(terms, servidores) → [servidores]

    // Aplica highlight nos resultados
    highlightResults(servidores, query) → [servidores com _highlight]

    // Limpa cache
    clearCache()
}
```

**Exemplo de Uso**:
```javascript
// Inicializar
const searchManager = new SmartSearchManager(dashboard);

// Busca simples com fuzzy
const results = searchManager.search('Joao Silva');
// Encontra 'João Silva' mesmo com erro

// Busca multi-campo
const results = searchManager.search('Maria, GEROT, 60');
// Encontra Maria com 60 anos na GEROT

// Autocomplete
const suggestions = searchManager.getAutocompleteSuggestions('Mar');
// → [
//     {text: 'Maria Silva', type: 'nome', score: 0.95},
//     {text: 'Maria Santos', type: 'nome', score: 0.92},
//     {text: 'Marcos', type: 'nome', score: 0.85}
// ]
```

**Campos de Busca**:
- Nome do servidor
- Cargo
- Lotação
- Superintendência
- Subsecretaria
- CPF (parcial)

---

### 3. AdvancedFilterManager.js (~500 linhas) 🔜 PRÓXIMO

**Localização**: `js/modules/AdvancedFilterManager.js`

**Responsabilidade**: Gerenciar todos os filtros avançados

**Filtros Disponíveis**:

1. **Filtro de Cargo**
   - Tipo: Dropdown searchable
   - Valores: Únicos extraídos dos dados
   - Múltipla seleção: Não

2. **Filtro de Lotação**
   - Tipo: Dropdown searchable
   - Valores: Únicos extraídos dos dados
   - Múltipla seleção: Não

3. **Filtro de Superintendência → Subsecretaria**
   - Tipo: Cascata de dropdowns
   - Ao selecionar Super, filtra Subs disponíveis
   - Múltipla seleção: Não

4. **Filtro de Urgência**
   - Tipo: Radio buttons
   - Valores: Crítica, Alta, Moderada, Baixa, Todas
   - Múltipla seleção: Não (conforme especificado)

5. **Filtro de Status de Licença**
   - Tipo: Checkboxes
   - Opções:
     - Com licença agendada
     - Sem licença agendada
     - Licenças vencidas (não usadas)

**API**:
```javascript
class AdvancedFilterManager {
    constructor(dashboard) { ... }

    activeFilters = {
        cargo: null,
        lotacao: null,
        superintendencia: null,
        subsecretaria: null,
        urgencia: 'all', // 'critica', 'alta', 'moderada', 'baixa', 'all'
        status: [] // ['com-licenca', 'sem-licenca', 'vencidas']
    }

    // Aplicar todos os filtros
    applyFilters(servidores) → [servidores filtrados]

    // Obter valores únicos para dropdowns
    getUniqueValues(field) → [valores]

    // Atualizar filtro cascata (Super → Sub)
    updateCascadeFilters(superintendencia) → [subsecretarias disponíveis]

    // Contar resultados
    countResults(servidores) → number

    // Salvar/Carregar do localStorage
    saveFilters()
    loadFilters() → activeFilters

    // Limpar todos os filtros
    clearAll()

    // Verificar se há filtros ativos
    hasActiveFilters() → boolean
}
```

**Exemplo de Uso**:
```javascript
// Aplicar filtro de cargo
filterManager.activeFilters.cargo = 'Analista';
const results = filterManager.applyFilters(dashboard.allServidores);

// Filtro cascata
const subs = filterManager.updateCascadeFilters('SUPERINTENDÊNCIA ADMINISTRATIVA');
// → ['SUBSECRETARIA DE RECURSOS HUMANOS', ...]

// Múltiplos filtros
filterManager.activeFilters.cargo = 'AFT';
filterManager.activeFilters.urgencia = 'critica';
filterManager.activeFilters.status = ['sem-licenca'];
const results = filterManager.applyFilters(dashboard.allServidores);
```

---

### 4. FilterChipsUI.js (~250 linhas) 🔜 PRÓXIMO

**Localização**: `js/modules/FilterChipsUI.js`

**Responsabilidade**: Interface visual de chips/tags mostrando filtros ativos

**Funcionalidades**:
- Renderizar chips para cada filtro ativo
- Remover filtro ao clicar no X
- Clicar no chip para editar filtro
- Animações suaves (fade in/out)
- Contador de resultados
- Botão "Limpar Todos"

**Visual**:
```
┌────────────────────────────────────────────────────────┐
│ Filtros Ativos:                                       │
│ [Cargo: Analista ×] [Lotação: GEROT ×] [Urgência: Crítica ×] │
│ [+ Adicionar Filtro]  [Limpar Todos]                 │
│                                                        │
│ 📊 Mostrando 25 de 250 servidores                     │
└────────────────────────────────────────────────────────┘
```

**API**:
```javascript
class FilterChipsUI {
    constructor(filterManager, dashboard) { ... }

    // Renderizar todos os chips
    render()

    // Adicionar chip
    addChip(type, label, value)

    // Remover chip
    removeChip(type)

    // Atualizar contador
    updateCounter(current, total)

    // Limpar todos os chips
    clearAll()

    // Mostrar/Ocultar container
    show()
    hide()
}
```

**Exemplo de Uso**:
```javascript
// Renderizar chips
chipsUI.render();

// Adicionar chip programaticamente
chipsUI.addChip('cargo', 'Cargo: Analista', 'Analista');

// Atualizar contador
chipsUI.updateCounter(25, 250);
// Mostra: "📊 Mostrando 25 de 250 servidores"
```

---

## 🎨 Interface do Usuário

### Layout Integrado na Barra de Busca

```
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD DE LICENÇAS PRÊMIO                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 🔍 Buscar: [Maria, GEROT, 60________________] [X]            │
│    ↓ Sugestões:                                              │
│       • Maria Silva - Analista - GEROT                       │
│       • Maria Santos - Técnico - GEROT                       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Filtros Ativos:                                              │
│ [Cargo: Analista ×] [Lotação: GEROT ×] [Urgência: Crítica ×] │
│ [+ Adicionar Filtro]  [Limpar Todos]                        │
│                                                              │
│ 📊 Mostrando 25 de 250 servidores                            │
├──────────────────────────────────────────────────────────────┤
│ [TABELA DE SERVIDORES]                                       │
└──────────────────────────────────────────────────────────────┘
```

### Modal de Adicionar Filtros

```
╔═══════════════════════════════════════════════════════╗
║ ⚙️  Adicionar Filtros                                  ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ Cargo:                                                ║
║ [🔍 Buscar cargo...              ▼]                   ║
║   • Analista                                          ║
║   • Técnico                                           ║
║   • AFT                                               ║
║                                                       ║
║ Lotação:                                              ║
║ [🔍 Buscar lotação...            ▼]                   ║
║   • GEROT                                             ║
║   • DIPAT                                             ║
║                                                       ║
║ Superintendência:                                     ║
║ [Selecione...                    ▼]                   ║
║                                                       ║
║ Subsecretaria:                                        ║
║ [Selecione a superintendência primeiro]               ║
║                                                       ║
║ Urgência:                                             ║
║ ( ) Todas                                             ║
║ (•) Crítica  ( ) Alta  ( ) Moderada  ( ) Baixa        ║
║                                                       ║
║ Status da Licença:                                    ║
║ [✓] Com licença agendada                              ║
║ [ ] Sem licença agendada                              ║
║ [ ] Licenças vencidas                                 ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║           [Cancelar]  [Aplicar Filtros]               ║
╚═══════════════════════════════════════════════════════╝
```

---

## 💻 Fluxo de Uso

### Cenário 1: Busca Simples com Fuzzy

```
Usuário digita: "Joao Silva"
↓
SmartSearchManager detecta:
- Normaliza para "joao silva"
- Calcula similaridade com todos os servidores
- Encontra "João Silva" (score: 0.95)
- Encontra "João Silveira" (score: 0.78)
↓
Retorna resultados ordenados por score
↓
Dashboard atualiza tabela + estatísticas
```

### Cenário 2: Busca Multi-Campo

```
Usuário digita: "Maria, GEROT, 60"
↓
SmartSearchManager:
1. Split por vírgula → ['Maria', 'GEROT', '60']
2. Para cada servidor:
   - Busca 'Maria' em nome
   - Busca 'GEROT' em lotação
   - Busca '60' em idade
3. Retorna apenas servidores que atendem TODOS os termos
↓
Dashboard atualiza com servidores filtrados
```

### Cenário 3: Autocomplete

```
Usuário digita: "Mar"
↓
SmartSearchManager:
1. Busca em cache de sugestões
2. Se não encontrar:
   - Busca fuzzy em nomes começando com "Mar"
   - Busca fuzzy em cargos começando com "Mar"
   - Ranqueia por score de similaridade
3. Retorna top 5 sugestões
↓
UI mostra dropdown com sugestões
↓
Usuário clica em sugestão
↓
Preenche campo de busca automaticamente
```

### Cenário 4: Adicionar Filtros

```
Usuário clica "+ Adicionar Filtro"
↓
Modal abre com todos os filtros
↓
Usuário seleciona:
- Cargo: Analista
- Lotação: GEROT
- Urgência: Crítica
↓
Clica "Aplicar Filtros"
↓
AdvancedFilterManager:
1. Valida filtros
2. Aplica filtros sequencialmente
3. Retorna servidores filtrados
↓
FilterChipsUI:
1. Cria chips para cada filtro
2. Mostra contador de resultados
↓
Dashboard atualiza interface
```

### Cenário 5: Remover Filtro Individual

```
Usuário clica no X de um chip
↓
FilterChipsUI:
1. Remove chip da interface
2. Notifica AdvancedFilterManager
↓
AdvancedFilterManager:
1. Remove filtro do activeFilters
2. Reaplica filtros restantes
3. Retorna novos resultados
↓
Dashboard atualiza
```

---

## 📊 Estrutura de Dados

### Filtros Ativos (localStorage)
```javascript
{
    version: '2.0',
    timestamp: 1729523456789,
    filters: {
        cargo: 'Analista',
        lotacao: 'GEROT',
        superintendencia: null,
        subsecretaria: null,
        urgencia: 'critica',
        status: ['sem-licenca']
    },
    search: {
        query: 'Maria',
        lastSearches: [
            'Maria, GEROT',
            'João',
            'AFT, critica'
        ]
    }
}
```

### Cache de Autocomplete
```javascript
{
    'mar': [
        {text: 'Maria Silva', type: 'nome', score: 0.95},
        {text: 'Maria Santos', type: 'nome', score: 0.92},
        {text: 'Marcos', type: 'nome', score: 0.85}
    ],
    'ana': [
        {text: 'Analista', type: 'cargo', score: 1.0},
        {text: 'Ana Paula', type: 'nome', score: 0.95}
    ]
}
```

---

## 🎯 Performance e Otimizações

### Debouncing
- Busca: 300ms
- Autocomplete: 150ms
- Filtros: Instantâneo (apenas UI)

### Caching
- Cache de sugestões autocomplete (Map)
- Cache de valores únicos para dropdowns
- Invalidar cache ao trocar arquivo

### Algoritmo Otimizado
```javascript
// Em vez de buscar em TODOS os campos sempre:
if (query.includes(',')) {
    // Busca multi-campo (mais lenta)
    return multiFieldSearch(query);
} else if (query.length < 3) {
    // Busca exata (rápida)
    return exactSearch(query);
} else {
    // Busca fuzzy (moderada)
    return fuzzySearch(query);
}
```

### Virtualização (Futura)
- Para datasets > 1000 registros
- Renderizar apenas linhas visíveis
- Implementar em Sprint 3

---

## ✅ Checklist de Implementação

### Fase 1: Fundação
- [x] Criar FuzzySearch.js com algoritmo Levenshtein
- [ ] Criar SmartSearchManager.js
- [ ] Criar AdvancedFilterManager.js
- [ ] Criar FilterChipsUI.js

### Fase 2: Interface
- [ ] Adicionar HTML para chips
- [ ] Adicionar HTML para modal de filtros
- [ ] Criar CSS para smart-search.css
- [ ] Criar CSS para advanced-filters.css
- [ ] Criar CSS para filter-chips.css

### Fase 3: Integração
- [ ] Integrar SmartSearchManager no dashboard.js
- [ ] Integrar AdvancedFilterManager no dashboard.js
- [ ] Integrar FilterChipsUI no dashboard.js
- [ ] Adicionar script tags no index.html
- [ ] Testar integração completa

### Fase 4: Testes
- [ ] Testar busca fuzzy ("Joao" → "João")
- [ ] Testar busca multi-campo ("Maria, GEROT, 60")
- [ ] Testar autocomplete
- [ ] Testar filtros individuais
- [ ] Testar combinação de filtros
- [ ] Testar persistência (localStorage)
- [ ] Testar com datasets grandes (1000+ registros)

### Fase 5: Documentação
- [ ] Atualizar GUIA-DO-USUARIO.md
- [ ] Atualizar GUIA-DO-DESENVOLVEDOR.md
- [ ] Criar vídeo/GIF demonstrativo
- [ ] Documentar API no código

---

## 🐛 Possíveis Problemas e Soluções

### Problema 1: Performance com datasets grandes
**Sintoma**: Busca fica lenta com > 1000 registros
**Solução**:
- Implementar Web Workers para busca em background
- Adicionar paginação
- Limitar autocomplete a 10 sugestões

### Problema 2: Acentos não funcionam
**Sintoma**: "Joao" não encontra "João"
**Solução**:
- Já implementado em `FuzzySearch.normalize()`
- Remove acentos usando NFD + regex

### Problema 3: Filtros não persistem
**Sintoma**: Ao recarregar página, filtros somem
**Solução**:
- Salvar no localStorage ao aplicar filtro
- Carregar no init() do dashboard
- Versionar estrutura para evitar erros

### Problema 4: Conflito entre busca e filtros
**Sintoma**: Busca sobrescreve filtros ou vice-versa
**Solução**:
- Busca E filtros devem ser aplicados juntos
- Ordem: Filtros → Busca → Renderizar
- Dashboard mantém estado de ambos

---

## 📈 Métricas de Sucesso

### Quantitativas
- ✅ Reduzir tempo de busca em 50%
- ✅ Aumentar precisão de busca para 95%
- ✅ Suportar 2000+ registros sem lag
- ✅ Autocomplete em < 150ms

### Qualitativas
- ✅ Usuário consegue encontrar servidor com nome incompleto/errado
- ✅ Usuário consegue combinar múltiplos filtros visualmente
- ✅ Usuário entende quais filtros estão ativos
- ✅ Filtros persistem entre sessões

---

## 🚀 Próximos Passos (Sprint 3)

Após completar Sprint 2, focar em:

1. **Acessibilidade e UX**
   - Atalhos de teclado (Ctrl+F, ESC, etc.)
   - Modo alto contraste
   - Skeleton screens

2. **Notificações Inteligentes**
   - Alertas automáticos
   - Sugestões de ação

3. **Página de Relatórios**
   - Nova aba dedicada
   - Exportação Excel/CSV/PDF
   - Templates de relatório

---

*Documento criado em Outubro 2025 - Dashboard de Licenças Prêmio*
