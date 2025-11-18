# Arquitetura CSS - Sistema Modular

## 📋 Visão Geral

Sistema CSS modular otimizado para **máxima performance** através de carregamento individual de arquivos. Cada componente e página possui seu próprio arquivo CSS isolado.

**Princípios:**
- ✅ **1 componente = 1 arquivo CSS**
- ✅ **Carregamento paralelo** (HTTP/2)
- ✅ **Zero duplicação** de código
- ✅ **Manutenção simplificada**
- ✅ **Responsabilidade única** por arquivo

---

## 🗂️ Estrutura de Diretórios

```
css/
│
├── 1-base/                    # Foundation (variáveis e reset)
│   ├── variables.css          # APENAS variáveis CSS (cores, espaçamentos, fontes)
│   ├── reset.css              # Reset/normalize do navegador
│   └── typography.css         # Estilos tipográficos globais
│
├── 2-layout/                  # Estrutura e utilitários
│   ├── app-layout.css         # Layout principal (.app-layout, .main-content)
│   ├── grid.css               # Sistema de grid (se necessário)
│   ├── spacing.css            # Classes utilitárias de espaçamento
│   └── utilities.css          # Classes utilitárias gerais
│
├── 3-components/              # Componentes reutilizáveis
│   ├── sidebar.css            # TODO CSS da sidebar
│   ├── header.css             # TODO CSS do header principal
│   ├── table.css              # TODO CSS das tabelas
│   ├── charts.css             # TODO CSS dos gráficos (Chart.js)
│   ├── buttons.css            # Todos os estilos de botões
│   ├── modals.css             # Todos os modais (base e específicos)
│   ├── forms.css              # Inputs, selects, checkboxes, labels
│   ├── cards.css              # Cards e panels
│   ├── badges.css             # Badges, labels e chips
│   ├── tooltips.css           # Sistema de tooltips
│   ├── breadcrumbs.css        # Navegação breadcrumbs
│   ├── smart-search.css       # Componente de busca inteligente
│   ├── filter-chips.css       # Chips de filtros ativos
│   ├── advanced-filters.css   # Modal de filtros avançados
│   ├── loading-skeletons.css  # Skeletons de carregamento
│   ├── notifications.css      # Sistema de notificações/toasts
│   ├── dropdown.css           # Dropdowns e menus
│   └── stats-cards.css        # Cards de estatísticas
│
├── 4-pages/                   # Estilos específicos por página
│   ├── home.css               # Página inicial (visão geral/dashboard)
│   ├── calendar.css           # Página de calendário
│   ├── timeline.css           # Página de timeline
│   ├── reports.css            # Página de relatórios
│   ├── settings.css           # Página de configurações
│   └── tips.css               # Página de dicas e atalhos
│
├── 5-themes/                  # Temas e acessibilidade
│   ├── dark-theme.css         # Sobrescritas para tema escuro (se necessário)
│   └── high-contrast.css      # Modo alto contraste (acessibilidade)
│
└── README-CSS.md              # Documentação do sistema de variáveis
```

---

## 🚀 Estratégia de Carregamento

### **Carregamento Individual no HTML**

Cada arquivo CSS é carregado diretamente no `<head>` do `index.html` para **máxima performance** através de:
- ✅ **Carregamento paralelo** (HTTP/2 permite múltiplas requisições simultâneas)
- ✅ **Cache granular** (navegador cacheia cada arquivo individualmente)
- ✅ **Loading progressivo** (CSS crítico carrega primeiro)
- ✅ **Debug facilitado** (DevTools mostra arquivo específico)

---

## 📄 Ordem de Carregamento no index.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Licenças</title>

    <!-- ==================== 1. BASE - FOUNDATION ==================== -->
    <!-- CRÍTICO: Carrega primeiro - contém variáveis usadas por todos -->
    <link rel="stylesheet" href="css/1-base/variables.css">
    <link rel="stylesheet" href="css/1-base/reset.css">
    <link rel="stylesheet" href="css/1-base/typography.css">

    <!-- ==================== 2. LAYOUT - STRUCTURE ==================== -->
    <!-- CRÍTICO: Estrutura básica da aplicação -->
    <link rel="stylesheet" href="css/2-layout/app-layout.css">
    <link rel="stylesheet" href="css/2-layout/utilities.css">
    <link rel="stylesheet" href="css/2-layout/spacing.css">

    <!-- ==================== 3. COMPONENTS - BUILDING BLOCKS ==================== -->
    <!-- Componentes principais sempre visíveis -->
    <link rel="stylesheet" href="css/3-components/sidebar.css">
    <link rel="stylesheet" href="css/3-components/header.css">
    <link rel="stylesheet" href="css/3-components/buttons.css">

    <!-- Componentes de dados -->
    <link rel="stylesheet" href="css/3-components/table.css">
    <link rel="stylesheet" href="css/3-components/charts.css">
    <link rel="stylesheet" href="css/3-components/stats-cards.css">

    <!-- Componentes de UI -->
    <link rel="stylesheet" href="css/3-components/modals.css">
    <link rel="stylesheet" href="css/3-components/forms.css">
    <link rel="stylesheet" href="css/3-components/cards.css">
    <link rel="stylesheet" href="css/3-components/badges.css">
    <link rel="stylesheet" href="css/3-components/tooltips.css">
    <link rel="stylesheet" href="css/3-components/dropdown.css">

    <!-- Componentes de funcionalidade -->
    <link rel="stylesheet" href="css/3-components/smart-search.css">
    <link rel="stylesheet" href="css/3-components/filter-chips.css">
    <link rel="stylesheet" href="css/3-components/advanced-filters.css">
    <link rel="stylesheet" href="css/3-components/breadcrumbs.css">
    <link rel="stylesheet" href="css/3-components/loading-skeletons.css">
    <link rel="stylesheet" href="css/3-components/notifications.css">

    <!-- ==================== 4. PAGES - SPECIFIC LAYOUTS ==================== -->
    <!-- Cada página tem seu próprio CSS -->
    <link rel="stylesheet" href="css/4-pages/home.css">
    <link rel="stylesheet" href="css/4-pages/calendar.css">
    <link rel="stylesheet" href="css/4-pages/timeline.css">
    <link rel="stylesheet" href="css/4-pages/reports.css">
    <link rel="stylesheet" href="css/4-pages/settings.css">
    <link rel="stylesheet" href="css/4-pages/tips.css">

    <!-- ==================== 5. THEMES - VISUAL OVERRIDES ==================== -->
    <!-- Carrega por último para sobrescrever quando necessário -->
    <link rel="stylesheet" href="css/5-themes/high-contrast.css">

    <!-- Bibliotecas externas -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
</head>
<body>
    <!-- ... conteúdo ... -->
</body>
</html>
```

---

## 📐 Regras de Ouro por Categoria

### **1-base/variables.css**

**APENAS variáveis CSS - NENHUM SELETOR**

```css
:root {
    /* Cores */
    --bg-primary: #1a1a1a;
    --bg-secondary: #0f0f0f;
    --text-primary: #ffffff;

    /* Espaçamentos */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.375rem;

    /* Fontes */
    --font-xs: 0.75rem;
    --font-sm: 0.8125rem;
}

[data-theme="light"] {
    --bg-primary: #ffffff;
    --text-primary: #111827;
}
```

**❌ NUNCA faça:**
```css
/* ERRADO - não coloque seletores aqui */
.button {
    background: var(--bg-primary);
}
```

---

### **2-layout/app-layout.css**

**APENAS estrutura do layout principal**

```css
/* Layout da aplicação */
.app-layout {
    display: flex;
    min-height: 100vh;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-secondary);
    padding: var(--spacing-lg);
}

.content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-xl);
}

.page-content {
    flex: 1;
    display: none; /* controlado por JS */
}

.page-content.active {
    display: flex;
}
```

**❌ NUNCA inclua:**
- Estilos de componentes (sidebar, header, etc.)
- Estilos específicos de páginas
- Estilos de elementos (botões, formulários, etc.)

---

### **3-components/sidebar.css**

**TODO CSS relacionado à sidebar - NADA MAIS**

```css
/* ==================== SIDEBAR CONTAINER ==================== */
.sidebar {
    width: 16rem;
    background-color: var(--bg-primary);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

/* ==================== USER ACCOUNT ==================== */
.sidebar-header { /* ... */ }
.sidebar-user-account { /* ... */ }
.sidebar-user-avatar { /* ... */ }
.sidebar-user-info { /* ... */ }

/* ==================== NAVIGATION ==================== */
.sidebar-nav { /* ... */ }
.sidebar .nav-link { /* ... */ }

/* ==================== PROMOTIONAL BANNER ==================== */
.sidebar-promo-banner { /* ... */ }

/* ==================== FOOTER ==================== */
.sidebar-footer { /* ... */ }

/* ==================== COLLAPSED STATE ==================== */
.sidebar.collapsed { /* ... */ }

/* ==================== TEMA CLARO ==================== */
[data-theme="light"] .sidebar { /* ... */ }
```

**✅ Incluir:**
- Todas as classes que começam com `.sidebar`
- Estados (hover, active, collapsed)
- Variações de tema ([data-theme="light"])
- Responsividade da sidebar

**❌ NUNCA incluir:**
- Estilos do header (`.main-header`)
- Estilos de tabelas ou gráficos
- Estilos de páginas específicas

---

### **3-components/header.css**

**TODO CSS do header principal - ISOLADO**

```css
/* ==================== HEADER CONTAINER ==================== */
.main-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg) var(--spacing-xl);
}

/* ==================== SERVER COUNT ==================== */
.server-count {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
}

/* ==================== SEARCH BAR ==================== */
.header-search { /* ... */ }
.header-search input { /* ... */ }
.btn-clear-search { /* ... */ }

/* ==================== UPLOAD WRAPPER ==================== */
.upload-wrapper { /* ... */ }
.btn-import { /* ... */ }
.btn-recent-files { /* ... */ }

/* ==================== AUTH WRAPPER ==================== */
.auth-wrapper { /* ... */ }
.btn-microsoft { /* ... */ }
.account-chip { /* ... */ }

/* ==================== THEME TOGGLE ==================== */
.btn-theme { /* ... */ }

/* ==================== TEMA CLARO ==================== */
[data-theme="light"] .main-header { /* ... */ }
[data-theme="light"] .server-count { /* ... */ }

/* ==================== RESPONSIVIDADE ==================== */
@media (max-width: 768px) {
    .main-header { /* ... */ }
}
```

**✅ Incluir:**
- `.main-header` e todos os filhos diretos
- Botões específicos do header (import, theme, auth)
- Barra de busca do header
- Contador de servidores
- Responsividade do header

**❌ NUNCA incluir:**
- Estilos de botões genéricos (vai em `buttons.css`)
- Estilos de modais
- Estilos de outras partes do layout

---

### **3-components/table.css**

**TODO CSS de tabelas - TODAS as tabelas**

```css
/* ==================== TABLE WRAPPER ==================== */
.prototype-table-wrapper {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: auto;
    max-height: 280px;
}

/* ==================== TABLE STRUCTURE ==================== */
.prototype-table {
    width: 100%;
    border-collapse: collapse;
}

.prototype-table thead {
    border-bottom: 1px solid var(--border-color);
}

.prototype-table thead th {
    padding: var(--spacing-md) var(--spacing-lg);
    text-align: left;
    font-size: var(--font-xs);
    font-weight: 500;
    color: var(--text-secondary);
    position: sticky;
    top: 0;
    background-color: var(--bg-secondary);
    z-index: 10;
}

.prototype-table tbody tr {
    border-bottom: 1px solid var(--border-color);
}

.prototype-table tbody tr:hover {
    background-color: var(--bg-primary);
}

.prototype-table tbody td {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-sm);
    color: var(--text-primary);
}

/* ==================== URGENCY BADGES ==================== */
.urgency-badge {
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: var(--font-xs);
    font-weight: 600;
}

.urgency-badge.critica {
    background-color: rgba(239, 68, 68, 0.2);
    color: var(--color-critical);
}

/* ... outras urgências ... */

/* ==================== TEMA CLARO ==================== */
[data-theme="light"] .prototype-table-wrapper { /* ... */ }

/* ==================== RESPONSIVIDADE ==================== */
@media (max-width: 768px) {
    .prototype-table-wrapper { /* ... */ }
}
```

---

### **3-components/charts.css**

**TODO CSS de gráficos (Chart.js)**

```css
/* ==================== CHARTS GRID ==================== */
.charts-grid {
    display: flex;
    gap: var(--spacing-xl);
    flex-wrap: wrap;
}

/* ==================== CHART PANEL ==================== */
.chart-panel {
    flex: 1;
    min-width: 300px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xl);
}

.chart-panel-header {
    margin-bottom: var(--spacing-lg);
}

.chart-panel-title {
    font-size: var(--font-base);
    font-weight: 500;
    color: var(--text-primary);
}

.chart-panel-subtitle {
    font-size: var(--font-xs);
    color: var(--text-secondary);
}

.chart-panel-body {
    position: relative;
    height: 200px;
}

/* ==================== EMPTY STATE ==================== */
.chart-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-md);
    color: var(--text-secondary);
    text-align: center;
}

/* ==================== TEMA CLARO ==================== */
[data-theme="light"] .chart-panel { /* ... */ }

/* ==================== RESPONSIVIDADE ==================== */
@media (max-width: 1024px) {
    .charts-grid {
        flex-direction: column;
    }
}
```

---

### **4-pages/home.css**

**APENAS estilos específicos da página Home**

```css
/* ==================== HOME PAGE LAYOUT ==================== */
#homePage {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
}

/* ==================== STATS CARDS ROW ==================== */
.stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-lg);
}

/* ==================== VIEW SWITCHER ==================== */
.view-switcher {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
}

.view-switcher button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    cursor: pointer;
}

.view-switcher button.active {
    background-color: var(--color-blue);
    border-color: var(--color-blue);
    color: white;
}

/* ==================== VIEWS ==================== */
#cronogramaView,
#notificacoesView {
    display: none;
    flex-direction: column;
    gap: var(--spacing-xl);
}

#cronogramaView.active,
#notificacoesView.active {
    display: flex;
}

/* ==================== RESPONSIVIDADE ==================== */
@media (max-width: 768px) {
    .stats-row {
        grid-template-columns: 1fr;
    }
}
```

**✅ Incluir:**
- Layout específico da página Home
- Switcher de views (cronograma/notificações)
- Grid de cards de estatísticas
- Responsividade específica da Home

**❌ NUNCA incluir:**
- Estilos de componentes reutilizáveis (tabelas, gráficos, cards)
- Estilos de outras páginas (calendar, timeline, etc.)

---

### **4-pages/calendar.css**

**APENAS estilos da página de Calendário**

```css
/* ==================== CALENDAR PAGE ==================== */
#calendarPage {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
}

/* ==================== CALENDAR CONTAINER ==================== */
.calendar-container {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
}

/* ==================== CALENDAR HEADER ==================== */
.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xl);
}

/* ==================== CALENDAR CONTROLS ==================== */
.calendar-controls {
    display: flex;
    gap: var(--spacing-md);
}

.calendar-controls button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    cursor: pointer;
}

/* ==================== CALENDAR GRID ==================== */
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background-color: var(--border-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.calendar-day {
    aspect-ratio: 1;
    background-color: var(--bg-tertiary);
    padding: var(--spacing-sm);
    cursor: pointer;
    transition: all 0.2s;
}

.calendar-day:hover {
    background-color: var(--bg-primary);
}

/* ==================== TEMA CLARO ==================== */
[data-theme="light"] .calendar-container { /* ... */ }

/* ==================== RESPONSIVIDADE ==================== */
@media (max-width: 768px) {
    .calendar-grid {
        grid-template-columns: repeat(7, 1fr);
        gap: 0;
    }
}
```

---

## 🎯 Benefícios da Arquitetura

### **Performance**

| Aspecto | Benefício |
|---------|-----------|
| **Carregamento Paralelo** | Navegador baixa múltiplos arquivos simultaneamente (HTTP/2) |
| **Cache Granular** | Mudanças em 1 componente não invalidam cache dos outros |
| **Loading Progressivo** | CSS crítico (base/layout) carrega primeiro |
| **Lazy Loading** | Possibilidade futura de carregar CSS sob demanda via JS |

### **Manutenção**

| Aspecto | Benefício |
|---------|-----------|
| **Localização Imediata** | Sabe exatamente onde está cada estilo |
| **Zero Duplicação** | 1 componente = 1 arquivo = 1 fonte de verdade |
| **Conflitos Reduzidos** | Desenvolvedores trabalham em arquivos diferentes |
| **Debug Facilitado** | DevTools mostra arquivo específico da regra CSS |

### **Escalabilidade**

| Aspecto | Benefício |
|---------|-----------|
| **Adicionar Componentes** | Criar novo arquivo sem tocar nos existentes |
| **Remover Features** | Deletar arquivo sem afetar o resto |
| **Refatoração Segura** | Escopo isolado reduz efeitos colaterais |
| **Testes de CSS** | Possível testar componentes isoladamente |

---

## 📊 Comparação: Antes vs. Depois

### **ANTES** (Atual)

```
modelo-layout.css (560+ linhas)
├── Variáveis + Layout + Header + Tabela + Gráficos + Responsividade
├── Difícil localizar estilos específicos
├── Duplicação entre arquivos
└── Manutenção complexa

sidebar-modelo.css (475 linhas)
├── Todo CSS da sidebar
└── Bem organizado ✅

pages-modelo.css (376 linhas)
├── Calendar + Timeline + Reports + Settings + Tips
├── Mistura de responsabilidades
└── Difícil isolar uma página

new-styles.css (?)
├── Estilos legados
├── Duplicações
└── CSS morto
```

**Problemas:**
- ❌ Arquivos gigantes (560+ linhas)
- ❌ Múltiplas responsabilidades por arquivo
- ❌ Difícil encontrar estilos
- ❌ Duplicação de código

### **DEPOIS** (Nova Arquitetura)

```
1-base/variables.css (80 linhas)
└── APENAS variáveis CSS

2-layout/app-layout.css (100 linhas)
└── APENAS estrutura do layout

3-components/sidebar.css (450 linhas)
└── TODO CSS da sidebar isolado

3-components/header.css (200 linhas)
└── TODO CSS do header isolado

3-components/table.css (150 linhas)
└── TODO CSS de tabelas isolado

3-components/charts.css (120 linhas)
└── TODO CSS de gráficos isolado

4-pages/home.css (80 linhas)
└── APENAS estilos da Home

4-pages/calendar.css (100 linhas)
└── APENAS estilos do Calendar

... (outros componentes e páginas)
```

**Benefícios:**
- ✅ Arquivos menores e focados (80-200 linhas cada)
- ✅ Responsabilidade única
- ✅ Fácil localização
- ✅ Zero duplicação
- ✅ Manutenção simplificada
- ✅ Cache otimizado

---

## 🔍 Como Encontrar Estilos

### **Pergunta: "Onde está o CSS do botão de importar?"**

**Resposta:**
1. É um botão → `3-components/buttons.css`
2. Está no header → `3-components/header.css` (`.btn-import`)

**Decisão:** Como é específico do header, fica em `header.css`

---

### **Pergunta: "Onde está o CSS da tabela de servidores?"**

**Resposta:**
1. É uma tabela → `3-components/table.css`
2. Toda a estrutura `.prototype-table` está lá

---

### **Pergunta: "Onde está o CSS do calendário?"**

**Resposta:**
1. É uma página → `4-pages/calendar.css`
2. Layout específico do calendário está lá

---

### **Pergunta: "Onde estão as variáveis de cores?"**

**Resposta:**
1. Variáveis → `1-base/variables.css`
2. `:root` e `[data-theme="light"]` estão lá

---

## 🚦 Checklist de Migração

### **Fase 1: Preparação (Não Quebra Nada)**
- [ ] Criar estrutura de pastas (`1-base/`, `2-layout/`, etc.)
- [ ] Criar `1-base/variables.css` (copiar de `modelo-layout.css`)
- [ ] Testar se variáveis funcionam linkando apenas `variables.css`

### **Fase 2: Layout Base**
- [ ] Criar `2-layout/app-layout.css`
- [ ] Mover estilos de `.app-layout`, `.main-content`, `.content-area`
- [ ] Testar layout principal

### **Fase 3: Componentes Principais**
- [ ] Criar `3-components/sidebar.css` (já existe `sidebar-modelo.css` - mover)
- [ ] Criar `3-components/header.css` (extrair de `modelo-layout.css`)
- [ ] Criar `3-components/table.css` (extrair de `modelo-layout.css`)
- [ ] Criar `3-components/charts.css` (extrair de `modelo-layout.css`)
- [ ] Testar cada componente após migração

### **Fase 4: Componentes Secundários**
- [ ] Criar `3-components/buttons.css`
- [ ] Criar `3-components/modals.css`
- [ ] Criar `3-components/forms.css`
- [ ] Mover `smart-search.css` (já existe - apenas mover para `3-components/`)
- [ ] Mover `filter-chips.css` (já existe - apenas mover)
- [ ] Mover `advanced-filters-modal.css` → `advanced-filters.css`
- [ ] Continuar com outros componentes...

### **Fase 5: Páginas**
- [ ] Criar `4-pages/home.css` (extrair de `pages-modelo.css`)
- [ ] Criar `4-pages/calendar.css` (extrair de `pages-modelo.css`)
- [ ] Criar `4-pages/timeline.css` (extrair de `pages-modelo.css`)
- [ ] Criar `4-pages/reports.css` (extrair de `pages-modelo.css`)
- [ ] Criar `4-pages/settings.css` (extrair de `pages-modelo.css`)
- [ ] Criar `4-pages/tips.css` (extrair de `pages-modelo.css`)

### **Fase 6: Temas**
- [ ] Criar `5-themes/high-contrast.css` (já existe - apenas mover)
- [ ] Verificar se tema escuro precisa de arquivo separado

### **Fase 7: Atualizar index.html**
- [ ] Remover links antigos
- [ ] Adicionar links na ordem correta (base → layout → components → pages → themes)
- [ ] Testar funcionamento completo

### **Fase 8: Limpeza Final**
- [ ] Deletar `modelo-layout.css` (após confirmar migração)
- [ ] Deletar `pages-modelo.css` (após confirmar migração)
- [ ] Deletar `new-styles.css` (após confirmar que não há CSS necessário)
- [ ] Verificar e remover CSS duplicado
- [ ] Testar todas as páginas e componentes
- [ ] Testar tema claro e escuro
- [ ] Testar modo high contrast
- [ ] Testar responsividade

---

## ⚠️ Regras Importantes

### **1. NUNCA misture responsabilidades**

```css
/* ❌ ERRADO - variables.css */
:root {
    --bg-primary: #1a1a1a;
}

.button { /* ← NÃO! Isso vai em buttons.css */
    background: var(--bg-primary);
}
```

```css
/* ✅ CORRETO - variables.css */
:root {
    --bg-primary: #1a1a1a;
}

/* ✅ CORRETO - buttons.css */
.button {
    background: var(--bg-primary);
}
```

---

### **2. Use SEMPRE variáveis CSS**

```css
/* ❌ EVITE valores hardcoded */
.component {
    background-color: #0f0f0f;
    padding: 1rem;
    border-radius: 0.5rem;
}

/* ✅ USE variáveis */
.component {
    background-color: var(--bg-secondary);
    padding: var(--spacing-xl);
    border-radius: var(--radius-md);
}
```

---

### **3. Mantenha tema claro no mesmo arquivo**

```css
/* sidebar.css */

/* Tema escuro (padrão) */
.sidebar {
    background-color: var(--bg-primary);
}

/* Tema claro (override) */
[data-theme="light"] .sidebar {
    background-color: var(--bg-primary); /* variável muda automaticamente */
}
```

---

### **4. Inclua responsividade no mesmo arquivo**

```css
/* header.css */

.main-header {
    display: flex;
    gap: var(--spacing-lg);
}

/* Responsividade do header */
@media (max-width: 768px) {
    .main-header {
        flex-wrap: wrap;
    }
}
```

---

## 📚 Referências

- **Sistema de Variáveis:** [css/README-CSS.md](./README-CSS.md)
- **Modelo de Referência:** `Modelo-de-intefrace-layout/`
- **Guia do Desenvolvedor:** `docs/GUIA-DO-DESENVOLVEDOR.md`
- **Guia do Usuário:** `docs/GUIA-DO-USUARIO.md`

---

## 🎓 Exemplos Práticos

### **Exemplo 1: Adicionar Novo Componente**

**Cenário:** Criar um componente de "User Profile Card"

**Passos:**
1. Criar `css/3-components/user-profile-card.css`
2. Escrever CSS usando variáveis:
```css
.user-profile-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
}

.user-profile-avatar {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
}

/* Tema claro */
[data-theme="light"] .user-profile-card {
    background-color: var(--bg-secondary);
}

/* Responsividade */
@media (max-width: 768px) {
    .user-profile-card {
        padding: var(--spacing-lg);
    }
}
```
3. Adicionar link no `index.html`:
```html
<!-- 3-components/ -->
<link rel="stylesheet" href="css/3-components/user-profile-card.css">
```

**Resultado:** Componente isolado, sem tocar em outros arquivos

---

### **Exemplo 2: Adicionar Nova Página**

**Cenário:** Criar página de "Analytics"

**Passos:**
1. Criar `css/4-pages/analytics.css`
2. Escrever CSS específico da página:
```css
#analyticsPage {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
}

.analytics-dashboard {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-xl);
}

/* Responsividade */
@media (max-width: 1024px) {
    .analytics-dashboard {
        grid-template-columns: 1fr;
    }
}
```
3. Adicionar link no `index.html`:
```html
<!-- 4-pages/ -->
<link rel="stylesheet" href="css/4-pages/analytics.css">
```

**Resultado:** Nova página com CSS isolado

---

### **Exemplo 3: Modificar Variável Global**

**Cenário:** Mudar cor primária de azul para verde

**Passos:**
1. Abrir `css/1-base/variables.css`
2. Modificar apenas a variável:
```css
:root {
    /* ANTES */
    /* --color-blue: rgb(37, 99, 235); */

    /* DEPOIS */
    --color-blue: rgb(34, 197, 94); /* verde */
}
```
3. Salvar

**Resultado:** Todos os componentes que usam `var(--color-blue)` mudam automaticamente

---

## ✅ Vantagens Finais

| Aspecto | Vantagem |
|---------|----------|
| **Performance** | Carregamento paralelo + cache granular |
| **Manutenção** | Localização imediata + zero duplicação |
| **Debug** | DevTools mostra arquivo específico |
| **Escalabilidade** | Adicionar/remover sem efeitos colaterais |
| **Colaboração** | Trabalho paralelo sem conflitos |
| **Consistência** | Variáveis CSS garantem uniformidade |
| **Acessibilidade** | Temas isolados e fáceis de manter |
| **Responsividade** | Media queries junto com componente |

---

**Data de criação:** 2025-01-17
**Versão:** 1.0
**Status:** Documentação da nova arquitetura - Pronto para implementação
