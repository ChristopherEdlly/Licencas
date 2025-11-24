# Estrutura CSS Otimizada

## 📋 Visão Geral

O projeto foi reestruturado para usar um sistema modular de CSS baseado em variáveis CSS e componentes isolados.

## 🎨 Arquivos Principais do Modelo

### 1. **modelo-layout.css** (Principal)
**Responsabilidade:** Layout estrutural e variáveis CSS globais

**Contém:**
- ✅ **Variáveis CSS** (`:root` e `[data-theme="light"]`)
  - Cores (background, texto, bordas, ações)
  - Espaçamentos (xs, sm, md, lg, xl, 2xl)
  - Border radius (sm, md, lg, xl, 2xl)
  - Tamanhos de fonte (xs, sm, base, lg)
- ✅ **Layout principal** (.main-content, .content-area)
- ✅ **Header** (.main-header e todos os componentes)
- ✅ **Tabela** (.prototype-table-wrapper e elementos)
- ✅ **Gráficos** (.charts-grid, .chart-panel)
- ✅ **Responsividade** (mobile, tablet, desktop)

### 2. **sidebar-modelo.css**
**Responsabilidade:** Sidebar e navegação

**Contém:**
- Sidebar container
- User account (topo)
- Links de navegação
- Banner promocional
- Footer da sidebar
- Botões de filtro
- Estados collapsed
- Tema claro/escuro

### 3. **pages-modelo.css** (Novo)
**Responsabilidade:** Estilos para páginas internas

**Contém:**
- Calendar Page
- Timeline Page
- Reports Page
- Settings Page
- Tips Page

## 🎯 Variáveis CSS Disponíveis

### Cores
```css
/* Tema Escuro */
--bg-primary: #1a1a1a
--bg-secondary: #0f0f0f
--bg-tertiary: #0a0a0a
--border-color: rgb(39, 39, 42)

--text-primary: #ffffff
--text-secondary: rgb(156, 163, 175)
--text-tertiary: rgb(107, 114, 128)
--text-muted: rgb(75, 85, 99)

--color-blue: rgb(37, 99, 235)
--color-blue-hover: rgb(29, 78, 216)
--color-blue-light: rgb(96, 165, 250)

--color-critical: #ef4444
--color-high: #f97316
--color-moderate: #f59e0b
--color-low: #10b981
```

### Espaçamentos
```css
--spacing-xs: 0.25rem     (4px)
--spacing-sm: 0.375rem    (6px)
--spacing-md: 0.5rem      (8px)
--spacing-lg: 0.75rem     (12px)
--spacing-xl: 1rem        (16px)
--spacing-2xl: 1.5rem     (24px)
```

### Border Radius
```css
--radius-sm: 0.375rem     (6px)
--radius-md: 0.5rem       (8px)
--radius-lg: 0.75rem      (12px)
--radius-xl: 1rem         (16px)
--radius-2xl: 1.25rem     (20px)
```

### Fontes
```css
--font-xs: 0.75rem        (12px)
--font-sm: 0.8125rem      (13px)
--font-base: 0.875rem     (14px)
--font-lg: 1rem           (16px)
```

## 📝 Como Usar as Variáveis

### Exemplo 1: Criar novo componente
```css
.meu-componente {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xl);
    color: var(--text-primary);
    font-size: var(--font-sm);
}
```

### Exemplo 2: Suportar tema claro automaticamente
```css
/* As variáveis já mudam automaticamente */
.meu-card {
    background-color: var(--bg-primary); /* #1a1a1a no escuro, #ffffff no claro */
    color: var(--text-primary);          /* #ffffff no escuro, #111827 no claro */
}

/* Sem necessidade de escrever: */
[data-theme="light"] .meu-card { ... }
```

## 🔄 Migração de CSS Antigo

### ❌ Antes (código duplicado)
```css
.component-a {
    background-color: #0f0f0f;
    border: 1px solid rgb(39, 39, 42);
    border-radius: 0.5rem;
    padding: 1rem;
}

.component-b {
    background-color: #0f0f0f;
    border: 1px solid rgb(39, 39, 42);
    border-radius: 0.75rem;
    padding: 1rem;
}
```

### ✅ Depois (com variáveis)
```css
.component-a {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xl);
}

.component-b {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
}
```

## 📊 Otimizações Implementadas

### Redução de Tamanhos
| Elemento | Antes | Depois | Economia |
|----------|-------|--------|----------|
| Header Padding | 1rem 1.5rem | 0.75rem 1rem | -33% |
| Tabela Altura | min-height 400px | max-height 280px | -30% |
| Gráficos Altura | 16rem (256px) | 200px | -22% |
| Fonte Tabela | 0.875rem | 0.8125rem | -7% |
| Gap Gráficos | 1.5rem | 1rem | -33% |

### Compactação para 100vh
- ✅ Main content com `max-height: 100vh`
- ✅ Tabela com scroll interno (`max-height: 280px`)
- ✅ Header da tabela sticky
- ✅ Gráficos com altura fixa (200px)
- ✅ Padding reduzido em todos os elementos

## 🎨 Ordem de Carregamento CSS

```html
<!-- Estilos base -->
<link href="css/new-styles.css">

<!-- Componentes específicos -->
<link href="css/components/smart-search.css">
<link href="css/components/advanced-filters-modal.css">
<!-- ... outros componentes ... -->

<!-- Modelo (deve ser o último para sobrescrever) -->
<link href="css/components/sidebar-modelo.css">
<link href="css/components/modelo-layout.css">
<link href="css/components/pages-modelo.css">
```

## ⚠️ Importante

1. **Não edite new-styles.css** - Está sendo gradualmente substituído pelos arquivos do modelo
2. **Use sempre as variáveis CSS** ao criar novos estilos
3. **Mantenha a ordem de carregamento** - modelo-layout.css deve ser carregado por último
4. **Evite !important** - As variáveis CSS já fornecem a especificidade necessária

## 🚀 Próximos Passos (Sugestões)

1. [ ] Migrar estilos de modais para usar variáveis CSS
2. [ ] Consolidar estilos de botões em um arquivo único
3. [ ] Remover CSS morto de new-styles.css
4. [ ] Criar utility classes reutilizáveis
5. [ ] Documentar componentes individuais

## 📚 Referências

- **Modelo de referência:** `Modelo-de-intefrace-layout/`
- **Documentação principal:** `CLAUDE.md`
- **Guia do desenvolvedor:** `docs/GUIA-DO-DESENVOLVEDOR.md`
