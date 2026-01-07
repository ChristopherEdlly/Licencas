# Redesign - Step 1 do Wizard Modal

## 📋 Problema Atual

A primeira etapa do wizard está **confusa e sobrecarregada**:

1. **Busca + Formulário sempre visíveis juntos** - usuário não sabe para onde olhar
2. **Lista de resultados aparece no meio** - entre busca e formulário, com X para fechar
3. **Sem separação clara de estados** - tudo misturado na mesma tela
4. **Atualizações "escondidas"** - campos preenchem mas usuário pode não perceber

## 🎯 Solução: Estados Separados e Fluxo Linear

### Princípio: **Uma coisa de cada vez, transições explícitas**

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────┐
│          ESTADO 1: BUSCA (inicial)              │
│                                                 │
│     🔍 Buscar Servidor Existente                │
│                                                 │
│     [________________________________]          │
│              [🔍 Buscar]                        │
│                                                 │
│     ℹ️ Digite CPF ou Nome (mínimo 3 chars)     │
│                                                 │
│              ─── ou ───                         │
│                                                 │
│     [➕ Cadastrar Novo Servidor]                │
│          (botão secundário)                     │
│                                                 │
└─────────────────────────────────────────────────┘
              │
              ├──→ BUSCA: 0 resultados
              │    └→ Notificação: "Nenhum servidor encontrado"
              │       └→ Permanece na tela de busca
              │          (pode tentar novamente ou cadastrar novo)
              │
              ├──→ BUSCA: 1 resultado
              │    └→ Preenche dados automaticamente
              │       └→ VAI PARA ESTADO 2 (formulário preenchido)
              │
              ├──→ BUSCA: 2+ resultados
              │    └→ MODAL overlay com lista (ESTADO 3)
              │       ├→ Clica em servidor → VAI PARA ESTADO 2
              │       └→ Clica "Cancelar" → Volta para ESTADO 1
              │
              └──→ Clica "Cadastrar Novo"
                   └→ VAI PARA ESTADO 2 (formulário vazio)

┌─────────────────────────────────────────────────┐
│          ESTADO 2: FORMULÁRIO                   │
│                                                 │
│  [← Voltar para Busca]     (link no topo)      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│  📝 Dados do Servidor                           │
│                                                 │
│  Nome Completo *                                │
│  [Maria Acacia Silva] ✓ (auto)                 │
│                                                 │
│  CPF *                                          │
│  [123.456.789-00] ✓ (auto)                     │
│                                                 │
│  RG                                             │
│  [_________________]                            │
│                                                 │
│  Cargo                                          │
│  [Auditor Fiscal] ✓ (auto)                     │
│                                                 │
│  ... demais campos ...                          │
│                                                 │
│  [Cancelar]              [Próximo →]            │
│                                                 │
└─────────────────────────────────────────────────┘

┌═════════════════════════════════════════════════┐
║   ESTADO 3: MÚLTIPLOS RESULTADOS (overlay)     ║
║                                                 ║
║   👥 Encontrados 2 servidores                  ║
║                                                 ║
║   Clique em um para selecionar:                ║
║                                                 ║
║   ┌───────────────────────────────────────┐   ║
║   │ Maria Acacia Silva                    │   ║
║   │ CPF: 123.456.789-00                   │   ║
║   │ Auditor Fiscal • SUTRI                │   ║
║   │───────────────────────────────────────│   ║
║   │ Josefina Acacia Santos                │   ║
║   │ CPF: 987.654.321-00                   │   ║
║   │ Técnico • SUPER-X                     │   ║
║   └───────────────────────────────────────┘   ║
║                                                 ║
║              [Cancelar busca]                   ║
║                                                 ║
└═════════════════════════════════════════════════┘
```

---

## 🎨 Design de Cada Estado

### ESTADO 1: Busca (inicial)

**Características:**
- Único conteúdo visível (formulário **OCULTO**)
- Busca grande e centralizada
- Dois CTAs claros:
  - Primário: "🔍 Buscar" (azul)
  - Secundário: "➕ Cadastrar Novo" (outline/ghost)
- Feedback em tempo real enquanto digita
- Notificações inline (não modais)

**Layout:**
```css
.wizard-step-1-search {
    padding: 3rem 2rem;
    text-align: center;
}

.wizard-search-primary {
    max-width: 500px;
    margin: 0 auto;
}

.wizard-search-input-large {
    font-size: 1.125rem;
    padding: 1rem 1.25rem;
}
```

---

### ESTADO 2: Formulário

**Características:**
- Busca **OCULTA** (substituída)
- Link "← Voltar para Busca" sempre visível no topo
- Formulário completo e limpo
- Badges "(auto)" apenas em campos realmente preenchidos
- Validação em tempo real
- Pode editar qualquer campo, mesmo os auto-preenchidos

**Navegação:**
- **← Voltar**: Limpa dados e volta para ESTADO 1
- **Cancelar**: Fecha modal
- **Próximo →**: Vai para Step 2 (validação antes)

**Layout:**
```html
<div class="wizard-step-1-form">
    <div class="wizard-back-link">
        <a href="#" id="wizardBackToSearch">← Voltar para Busca</a>
    </div>

    <div class="wizard-section">
        <!-- Campos do formulário -->
    </div>
</div>
```

---

### ESTADO 3: Múltiplos Resultados (modal overlay)

**Características:**
- **Modal overlay** com backdrop escuro
- Bloqueia interação com fundo até escolher
- Lista scrollável (max 5 visíveis, scroll para mais)
- Hover states claros
- Botões:
  - **Cancelar**: Volta para ESTADO 1
  - Cada item é clicável: Vai para ESTADO 2 preenchido

**Comportamento:**
- ESC fecha e volta para busca
- Click fora do modal fecha
- Click em item preenche e vai para formulário

---

## 🔧 Implementação Técnica

### Estrutura de Dados

```javascript
class WizardModal {
    constructor() {
        // Estado atual do Step 1
        this.step1Mode = 'search'; // 'search' | 'form'

        // Dados do servidor (vazio ou preenchido)
        this.servidorData = null;

        // Resultados da busca (para múltiplos)
        this.searchResults = [];
    }
}
```

### Transições de Estado

```javascript
// ESTADO 1 → ESTADO 2 (cadastrar novo)
_showForm(data = null) {
    this.step1Mode = 'form';
    this.servidorData = data;
    this._renderStep1(); // Re-render
}

// ESTADO 2 → ESTADO 1 (voltar)
_showSearch() {
    this.step1Mode = 'search';
    this.servidorData = null;
    this._renderStep1(); // Re-render
}

// ESTADO 1 → ESTADO 3 (múltiplos resultados)
_showMultipleResults(results) {
    this.searchResults = results;
    this._showResultsModal(); // Overlay
}

// ESTADO 3 → ESTADO 2 (selecionou servidor)
_selectFromResults(servidor) {
    this._closeResultsModal();
    this._showForm(servidor);
}
```

### Renderização Condicional

```javascript
_renderStep1() {
    const isEditMode = this.mode === 'edit';

    if (isEditMode) {
        // Modo edição: sempre formulário
        return this._renderStep1Form();
    }

    // Modo criar: busca ou formulário
    if (this.step1Mode === 'search') {
        return this._renderStep1Search();
    } else {
        return this._renderStep1Form();
    }
}
```

---

## 📐 CSS Classes Principais

### Estados
```css
/* Esconde/mostra baseado no modo */
.wizard-step-1-search {
    display: block;
}

.wizard-step-1-form {
    display: none;
}

/* Quando modo = 'form' */
.wizard-step-1-mode-form .wizard-step-1-search {
    display: none;
}

.wizard-step-1-mode-form .wizard-step-1-form {
    display: block;
}
```

### Modal de Resultados
```css
.wizard-search-results-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001; /* Acima do modal principal */
}

.wizard-search-results-modal-content {
    background: var(--bg-primary);
    border-radius: 16px;
    max-width: 600px;
    max-height: 80vh;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}
```

---

## ✅ Vantagens da Nova Abordagem

### UX
1. **Foco único**: Usuário vê uma coisa de cada vez
2. **Transições explícitas**: Botões/links claros sobre o que vai acontecer
3. **Sem surpresas**: Nada "atualiza magicamente" embaixo
4. **Navegação clara**: Sempre sabe onde está e como voltar
5. **Menos erros**: Reduz confusão e cliques errados

### Desenvolvimento
1. **Estados isolados**: Mais fácil de testar e debugar
2. **Renderização condicional**: Lógica simples (if/else)
3. **CSS limpo**: Classes descritivas por estado
4. **Manutenível**: Adicionar/modificar estados é trivial

---

## 🚀 Próximos Passos

### Fase 1: Estrutura Base
- [ ] Adicionar propriedade `step1Mode` ao WizardModal
- [ ] Criar `_renderStep1Search()` (tela de busca)
- [ ] Criar `_renderStep1Form()` (formulário separado)
- [ ] Implementar `_showForm()` e `_showSearch()`

### Fase 2: Navegação
- [ ] Botão "Cadastrar Novo" → vai para formulário vazio
- [ ] Link "← Voltar para Busca" → volta para busca
- [ ] Busca com 1 resultado → preenche e vai para form
- [ ] Busca com 0 resultados → notificação, fica na busca

### Fase 3: Múltiplos Resultados
- [ ] Converter lista atual em modal overlay
- [ ] Adicionar backdrop com blur
- [ ] Implementar ESC e click-fora para fechar
- [ ] Botão "Cancelar" volta para busca
- [ ] Click em item vai para formulário preenchido

### Fase 4: Polish
- [ ] Animações de transição entre estados
- [ ] Loading states consistentes
- [ ] Validações em tempo real
- [ ] Testes com usuários reais

---

## 🎯 Métricas de Sucesso

- **Redução de confusão**: Usuários não perguntam "onde preencho?"
- **Taxa de conclusão**: Mais usuários completam o cadastro
- **Menos erros**: Redução de campos preenchidos incorretamente
- **Feedback positivo**: Usuários acham "mais fácil" e "mais claro"

---

## 📝 Notas de Implementação

### Compatibilidade com Modo Edição
- Modo edição **sempre** mostra formulário (sem busca)
- Não afeta Step 2 (permanece igual)
- Mudanças isoladas no Step 1

### Dados Persistidos
- `this.data` continua sendo a fonte única de verdade
- `this.servidorData` é apenas referência temporária
- Limpar `servidorData` ao voltar para busca

### Acessibilidade
- Focus trap no modal de múltiplos resultados
- ARIA labels descritivos
- Navegação por teclado (Tab, Enter, ESC)
- Anúncio de mudanças de estado para leitores de tela

---

**Data:** 2026-01-07
**Versão:** 1.0
**Status:** Proposta Aprovada - Aguardando Implementação
