# Sistema de Estilos - Estrutura Modular

## 📁 Estrutura de Pastas

```
css/
├── main.css                    # Arquivo principal (importa todos os módulos)
├── new-styles.css             # Arquivo monolítico (versão atual/backup)
├── themes.css                 # Sistema de temas (claro/escuro)
│
├── utilities/                 # Utilitários base
│   ├── reset.css             # Reset CSS global
│   ├── scrollbar.css         # Estilos de scrollbars
│   ├── variables.css         # Variáveis CSS (cores, tamanhos, etc)
│   └── responsive.css        # Media queries e responsividade
│
├── components/               # Componentes reutilizáveis
│   ├── sidebar.css          # Barra lateral de navegação
│   ├── header.css           # Cabeçalho principal
│   ├── cards.css            # Cards de estatísticas
│   ├── buttons.css          # Botões e controles
│   ├── forms.css            # Inputs, selects, formulários
│   ├── tables.css           # Tabelas de dados
│   ├── modals.css           # Modais e popups
│   ├── charts.css           # Gráficos e visualizações
│   ├── tooltips.css         # Tooltips customizados
│   ├── badges.css           # Badges e status
│   └── notifications.css    # Notificações e alertas
│
└── pages/                    # Estilos específicos de páginas
    ├── home.css             # Página inicial (Visão Geral)
    ├── calendar.css         # Calendário
    ├── timeline.css         # Timeline
    └── settings.css         # Configurações
```

## 🎯 Arquivos Criados (Modularização Iniciada)

### ✅ Criados:
1. **`css/main.css`** - Arquivo principal que importa todos os módulos
2. **`css/utilities/reset.css`** - Reset CSS básico
3. **`css/utilities/scrollbar.css`** - Estilos de scrollbars customizados
4. **`css/utilities/variables.css`** - Variáveis CSS (cores, temas, tamanhos)

### ⏳ Pendentes (para refatoração futura):
- Componentes individuais (sidebar, header, cards, etc.)
- Páginas individuais (home, calendar, timeline, settings)
- Utilitários responsivos

## 📝 Notas Importantes

### Estado Atual:
- **`new-styles.css`** continua sendo o arquivo principal usado
- A estrutura modular foi criada mas ainda não está em uso
- Backup foi feito antes das mudanças

### Próximos Passos para Modularização Completa:
1. Extrair estilos de componentes do `new-styles.css`
2. Mover para arquivos modulares correspondentes
3. Atualizar `index.html` para usar `main.css` ao invés de `new-styles.css`
4. Testar em todos os navegadores
5. Remover `new-styles.css` (manter como backup)

## 🔄 Como Migrar (Quando Decidir)

1. **Substitua no `index.html`:**
   ```html
   <!-- De: -->
   <link rel="stylesheet" href="css/new-styles.css">
   
   <!-- Para: -->
   <link rel="stylesheet" href="css/main.css">
   ```

2. **Mantenha o backup:**
   - `new-styles.css` pode ser mantido como referência
   - Use controle de versão (git) para segurança

## 📌 Convenções de Nomenclatura

### BEM (Block Element Modifier)
```css
.block-name { }
.block-name__element { }
.block-name--modifier { }
```

### Prefixos Semânticos
- `.view-` - Visualizações/Abas
- `.stat-` - Estatísticas
- `.btn-` - Botões
- `.modal-` - Modais
- `.card-` - Cards

## 🎨 Sistema de Cores

Cores definidas em `utilities/variables.css`:

- **Urgências**: `--chart-critical`, `--chart-high`, `--chart-moderate`, `--chart-low`
- **Status**: `--success`, `--warning`, `--danger`, `--info`
- **Textos**: `--text-primary`, `--text-secondary`, `--text-tertiary`
- **Fundos**: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- **Bordas**: `--border`, `--border-hover`, `--border-focus`

## 📱 Responsividade

Breakpoints recomendados:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
