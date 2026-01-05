# Plano de Correção: Modal de Edição e Criação de Registros

## 📋 Resumo Executivo

Corrigir 3 problemas críticos identificados no sistema de edição/criação de registros do SharePoint:

1. **🔴 CRÍTICO:** Bug na edição - edita registro aleatório em vez do clicado
2. **🟠 ALTO:** Falta de CSS no modal de edição (formulário sem estilo)
3. **🟠 ALTO:** Impossível escolher qual período editar quando servidor tem múltiplos registros

---

## 🎯 Objetivos

### Prioridade 1: Corrigir Bug de Edição Aleatória
**Problema:** Quando usuário clica "Editar", o sistema pode editar um registro diferente do esperado, especialmente em páginas 2+, dados filtrados/ordenados.

**Causa raiz:** Confusão entre `row.dataset.index` (índice paginado instável) e `servidor.__rowIndex` (índice real na planilha Excel).

**Solução:** Usar `__rowIndex` consistentemente para identificar o registro correto.

### Prioridade 2: Adicionar CSS ao Modal de Edição
**Problema:** Formulário renderizado sem classes CSS, labels e inputs sem estilo, experiência visual ruim.

**Solução:** Criar arquivo `css/components/license-edit-modal.css` com estilos para `.form-row`, labels, inputs, validação visual.

### Prioridade 3: Seleção de Período ao Editar
**Problema:** Quando servidor tem 3 períodos (2020-2024, 2025-2029, 2030-2034), modal abre direto editando o primeiro, sem permitir escolha.

**Solução:** Implementar modal intermediária com lista de períodos para usuário escolher qual editar.

### Bônus: Melhorar "Novo Registro"
**Requisito:** Campo nome com autocomplete sugerindo servidores existentes, permitindo adicionar novo período a servidor existente OU criar servidor novo.

---

## 🔧 Implementação Detalhada

### TAREFA 1: Corrigir Bug de Identificação de Registro

#### Arquivo: `Js/3-managers/ui/TableManager.js`

**Mudança 1.1: Event Listener (linhas 631-640)**

**ANTES:**
```javascript
const editBtn = e.target.closest('[data-action="edit"]');
if (editBtn) {
    const row = editBtn.closest('tr');
    const index = parseInt(row.dataset.index);  // ❌ USA ÍNDICE PAGINADO
    this._handleAction('edit', index);
}
```

**DEPOIS:**
```javascript
const editBtn = e.target.closest('[data-action="edit"]');
if (editBtn) {
    const rowIndex = parseInt(editBtn.dataset.rowIndex);  // ✅ USA __rowIndex DO BOTÃO
    this._handleAction('edit', rowIndex);
}
```

**Mudança 1.2: _handleAction (linhas 642-673)**

**ANTES:**
```javascript
_handleAction(action, index) {
    const sortedData = this._sortData(this.app?.dataStateManager?.getFilteredServidores() || []);
    const servidor = sortedData[index];  // ❌ BUSCA NO ARRAY ORDENADO
```

**DEPOIS:**
```javascript
_handleAction(action, rowIndex) {
    const allData = this.app?.dataStateManager?.getAllServidores() || [];
    const servidor = allData.find(s => s.__rowIndex === rowIndex);  // ✅ BUSCA PELO __rowIndex

    if (!servidor) {
        console.error('Servidor não encontrado com __rowIndex:', rowIndex);
        return;
    }
```

**Mudança 1.3: Passar __rowIndex para modal (linha 661)**

**ANTES:**
```javascript
this.app.licenseEditModal.open({ mode: 'edit', row: servidor, rowIndex: index });
```

**DEPOIS:**
```javascript
this.app.licenseEditModal.open({
    mode: 'edit',
    row: servidor,
    rowIndex: servidor.__rowIndex  // ✅ PASSA O __rowIndex CORRETO
});
```

**Validação:** `data-row-index` já está correto nos botões (linhas 295, 326), não precisa mudar.

---

### TAREFA 2: Criar CSS para Modal de Edição

#### Arquivo NOVO: `css/components/license-edit-modal.css`

```css
/* ========================================
   License Edit Modal - Estilos específicos
   ======================================== */

/* Container do formulário */
#licenseEditModal-body form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Form Row - Layout de cada campo */
.form-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-row label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.form-row input,
.form-row select,
.form-row textarea {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    transition: all 0.2s ease;
    width: 100%;
}

.form-row input:focus,
.form-row select:focus,
.form-row textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 59, 130, 246), 0.1);
}

.form-row input:hover:not(:focus),
.form-row select:hover:not(:focus),
.form-row textarea:hover:not(:focus) {
    border-color: var(--text-secondary);
}

/* Input desabilitado */
.form-row input:disabled,
.form-row select:disabled {
    background: var(--bg-secondary);
    color: var(--text-disabled);
    cursor: not-allowed;
    opacity: 0.6;
}

/* Estados de validação */
.form-row.error input,
.form-row.error select {
    border-color: var(--danger);
}

.form-row.success input,
.form-row.success select {
    border-color: var(--success);
}

.form-row .error-message {
    font-size: 0.75rem;
    color: var(--danger);
    margin-top: 0.25rem;
}

/* Textarea específico */
.form-row textarea {
    min-height: 80px;
    resize: vertical;
}

/* Responsividade */
@media (min-width: 768px) {
    .form-row-inline {
        flex-direction: row;
        align-items: center;
        gap: 1rem;
    }

    .form-row-inline label {
        min-width: 150px;
        margin-bottom: 0;
    }

    .form-row-inline input,
    .form-row-inline select {
        flex: 1;
    }
}

/* Modal de seleção de período */
.period-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 0;
}

.period-selector-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--bg-primary);
}

.period-selector-item:hover {
    border-color: var(--primary);
    background: var(--bg-hover);
}

.period-selector-item.selected {
    border-color: var(--primary);
    background: rgba(var(--primary-rgb, 59, 130, 246), 0.1);
}

.period-selector-item input[type="radio"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.period-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.period-info-title {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--text-primary);
}

.period-info-subtitle {
    font-size: 0.8125rem;
    color: var(--text-secondary);
}

/* Autocomplete para nome do servidor */
.autocomplete-wrapper {
    position: relative;
}

.autocomplete-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    box-shadow: var(--shadow-md);
    z-index: 1000;
    display: none;
}

.autocomplete-suggestions.show {
    display: block;
}

.autocomplete-suggestion-item {
    padding: 0.75rem;
    cursor: pointer;
    transition: background 0.15s ease;
}

.autocomplete-suggestion-item:hover,
.autocomplete-suggestion-item.selected {
    background: var(--bg-hover);
}

.autocomplete-suggestion-item strong {
    color: var(--primary);
}
```

#### Arquivo: `index.html`

Adicionar importação do CSS ANTES de `</head>`:

```html
<link rel="stylesheet" href="css/components/license-edit-modal.css">
```

---

### TAREFA 3: Implementar Seleção de Período

#### Arquivo: `Js/3-managers/ui/LicenseEditModal.js`

**Mudança 3.1: Adicionar método _renderPeriodSelector (NOVO)**

Adicionar após linha 54 (antes do método `open`):

```javascript
/**
 * Renderiza modal de seleção de período
 * @private
 * @param {Object} servidor - Servidor com múltiplos períodos
 * @returns {Promise<number>} - __rowIndex do período escolhido
 */
async _renderPeriodSelector(servidor) {
    return new Promise((resolve, reject) => {
        // Obter todos os registros com mesmo nome
        const allData = this.app?.dataStateManager?.getAllServidores() || [];
        const allPeriods = allData.filter(s =>
            (s.servidor || s.SERVIDOR || s.nome) === (servidor.servidor || servidor.SERVIDOR || servidor.nome)
        );

        if (allPeriods.length <= 1) {
            // Só um período, retorna direto
            resolve(servidor.__rowIndex);
            return;
        }

        // Renderizar lista de períodos
        const bodyEl = document.getElementById('licenseEditModal-body');
        bodyEl.innerHTML = `
            <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                Este servidor possui <strong>${allPeriods.length} períodos</strong> cadastrados.
                Selecione qual deseja editar:
            </p>
            <div class="period-selector" id="periodSelectorList"></div>
        `;

        const listEl = document.getElementById('periodSelectorList');

        allPeriods.forEach((period, index) => {
            const periodStart = period.AQUISITIVO_INICIO || period.aquisitivo_inicio || '?';
            const periodEnd = period.AQUISITIVO_FIM || period.aquisitivo_fim || '?';
            const gozo = period.GOZO || period.gozo || 0;
            const restando = period.RESTANDO || period.restando || 0;

            const item = document.createElement('div');
            item.className = 'period-selector-item';
            item.dataset.rowIndex = period.__rowIndex;
            item.innerHTML = `
                <input type="radio" name="period" value="${period.__rowIndex}" id="period-${index}">
                <label for="period-${index}" class="period-info">
                    <div class="period-info-title">
                        Período ${index + 1}: ${periodStart} a ${periodEnd}
                    </div>
                    <div class="period-info-subtitle">
                        Gozo: ${gozo} dias • Restando: ${restando} dias
                    </div>
                </label>
            `;

            // Click no item seleciona o radio
            item.addEventListener('click', () => {
                const radio = item.querySelector('input[type="radio"]');
                radio.checked = true;

                // Marcar visualmente
                listEl.querySelectorAll('.period-selector-item').forEach(el =>
                    el.classList.remove('selected')
                );
                item.classList.add('selected');
            });

            listEl.appendChild(item);
        });

        // Atualizar título
        const titleEl = document.getElementById('licenseEditModal-title');
        titleEl.textContent = `Selecionar Período - ${servidor.servidor || servidor.SERVIDOR || servidor.nome}`;

        // Configurar botões
        const saveBtn = document.getElementById('licenseEditModal-save');
        const cancelBtn = document.getElementById('licenseEditModal-cancel');

        saveBtn.textContent = 'Avançar';

        const handleSave = () => {
            const selected = listEl.querySelector('input[type="radio"]:checked');
            if (!selected) {
                alert('Por favor, selecione um período para editar.');
                return;
            }

            cleanup();
            resolve(parseInt(selected.value));
        };

        const handleCancel = () => {
            cleanup();
            this.modal.close();
            reject(new Error('Cancelado pelo usuário'));
        };

        const cleanup = () => {
            saveBtn.removeEventListener('click', handleSave);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);
    });
}
```

**Mudança 3.2: Modificar método `open` (linhas 55-98)**

**ANTES:**
```javascript
async open(options = {}) {
    const { mode = 'create', row = null, rowIndex = null } = options;

    this.mode = mode;
    this.currentRow = row;
    this.currentRowIndex = rowIndex;

    // Renderizar formulário
    this._renderForm(row);

    // Abrir modal
    this.modal.open();
}
```

**DEPOIS:**
```javascript
async open(options = {}) {
    const { mode = 'create', row = null, rowIndex = null } = options;

    this.mode = mode;
    this.currentRow = row;

    // Abrir modal primeiro
    this.modal.open();

    if (mode === 'edit' && row) {
        try {
            // Se múltiplos períodos, mostrar seletor
            const selectedRowIndex = await this._renderPeriodSelector(row);

            // Buscar dados do período selecionado
            const allData = this.app?.dataStateManager?.getAllServidores() || [];
            const selectedPeriod = allData.find(s => s.__rowIndex === selectedRowIndex);

            if (!selectedPeriod) {
                throw new Error('Período não encontrado');
            }

            this.currentRow = selectedPeriod;
            this.currentRowIndex = selectedRowIndex;

            // Renderizar formulário do período escolhido
            this._renderForm(selectedPeriod);

        } catch (error) {
            console.error('Erro ao selecionar período:', error);
            this.modal.close();
            return;
        }
    } else {
        // Modo create ou sem seletor
        this.currentRowIndex = rowIndex;
        this._renderForm(row);
    }
}
```

---

### TAREFA 4: Adicionar Autocomplete para Nome do Servidor

#### Arquivo: `Js/3-managers/ui/LicenseEditModal.js`

**Mudança 4.1: Modificar _renderForm (linhas 74-88)**

Adicionar lógica especial para campo "nome" ou "servidor":

```javascript
this.columns.forEach(col => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = col;
    label.htmlFor = `licenseEditModal-field-${col}`;

    const colLower = col.toLowerCase();
    const isNameField = colLower === 'servidor' || colLower === 'nome';

    if (isNameField && this.mode === 'create') {
        // Campo nome com autocomplete
        wrapper.classList.add('autocomplete-wrapper');

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `licenseEditModal-field-${col}`;
        input.name = col;
        input.value = (row && row[col]) != null ? row[col] : '';
        input.placeholder = 'Digite o nome do servidor...';
        input.autocomplete = 'off';

        // Criar container de sugestões
        const suggestions = document.createElement('div');
        suggestions.className = 'autocomplete-suggestions';
        suggestions.id = `autocomplete-${col}`;

        // Listener de input
        input.addEventListener('input', (e) => {
            this._handleAutocomplete(e.target.value, suggestions, col);
        });

        // Listener de seleção
        suggestions.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-suggestion-item');
            if (item) {
                input.value = item.dataset.value;
                suggestions.classList.remove('show');
            }
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        wrapper.appendChild(suggestions);
    } else {
        // Campo normal
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `licenseEditModal-field-${col}`;
        input.name = col;
        input.value = (row && row[col]) != null ? row[col] : '';

        wrapper.appendChild(label);
        wrapper.appendChild(input);
    }

    form.appendChild(wrapper);
});
```

**Mudança 4.2: Adicionar método _handleAutocomplete (NOVO)**

```javascript
/**
 * Lida com autocomplete de nome de servidor
 * @private
 */
_handleAutocomplete(query, suggestionsEl, columnName) {
    if (!query || query.length < 2) {
        suggestionsEl.classList.remove('show');
        return;
    }

    const allData = this.app?.dataStateManager?.getAllServidores() || [];

    // Obter nomes únicos
    const uniqueNames = new Set();
    allData.forEach(s => {
        const name = s[columnName] || s[columnName.toLowerCase()] || s[columnName.toUpperCase()];
        if (name) uniqueNames.add(String(name));
    });

    // Filtrar por query
    const queryLower = query.toLowerCase();
    const matches = Array.from(uniqueNames).filter(name =>
        name.toLowerCase().includes(queryLower)
    ).slice(0, 10); // Máximo 10 sugestões

    if (matches.length === 0) {
        suggestionsEl.classList.remove('show');
        return;
    }

    // Renderizar sugestões
    suggestionsEl.innerHTML = matches.map(name => {
        // Destacar parte que deu match
        const regex = new RegExp(`(${query})`, 'gi');
        const highlighted = name.replace(regex, '<strong>$1</strong>');

        return `<div class="autocomplete-suggestion-item" data-value="${name}">${highlighted}</div>`;
    }).join('');

    suggestionsEl.classList.add('show');
}
```

---

## 📁 Arquivos a Modificar

| Arquivo | Tipo | Mudanças |
|---------|------|----------|
| `Js/3-managers/ui/TableManager.js` | EDITAR | Event listener, _handleAction (bug fix) |
| `Js/3-managers/ui/LicenseEditModal.js` | EDITAR | open(), _renderForm(), +_renderPeriodSelector(), +_handleAutocomplete() |
| `css/components/license-edit-modal.css` | CRIAR | Novo arquivo CSS completo |
| `index.html` | EDITAR | Adicionar import do CSS |

---

## ✅ Checklist de Implementação

### Fase 1: Bug Fix Crítico
- [ ] Modificar event listener para ler `data-row-index`
- [ ] Modificar `_handleAction()` para usar `find()` com `__rowIndex`
- [ ] Passar `servidor.__rowIndex` correto para modal
- [ ] Testar edição em página 1, página 2+, com filtros ativos

### Fase 2: CSS
- [ ] Criar arquivo `css/components/license-edit-modal.css`
- [ ] Adicionar estilos para `.form-row`, labels, inputs
- [ ] Adicionar estilos para `.period-selector`
- [ ] Adicionar estilos para `.autocomplete-suggestions`
- [ ] Importar CSS no `index.html`
- [ ] Testar visual em modo claro e escuro

### Fase 3: Seleção de Período
- [ ] Implementar `_renderPeriodSelector()`
- [ ] Modificar `open()` para chamar seletor em modo edit
- [ ] Testar com servidor de 1 período (deve pular seletor)
- [ ] Testar com servidor de 3 períodos (deve mostrar lista)
- [ ] Validar que edita o período correto

### Fase 4: Autocomplete
- [ ] Implementar `_handleAutocomplete()`
- [ ] Modificar `_renderForm()` para campo nome
- [ ] Testar sugestões ao digitar
- [ ] Testar criação de servidor novo
- [ ] Testar criação de período para servidor existente

---

## 🧪 Testes de Validação

### Teste 1: Bug de Edição Resolvido
1. Carregar planilha com 100+ registros
2. Ir para página 2 da tabela
3. Aplicar filtro de cargo
4. Ordenar por nome descendente
5. Clicar "Editar" na linha 3
6. **Esperado:** Modal abre com dados EXATOS da linha clicada
7. Salvar alteração
8. **Esperado:** Linha correta é atualizada no SharePoint

### Teste 2: CSS Aplicado
1. Abrir modal de edição
2. **Esperado:** Labels legíveis, inputs com borda, espaçamento adequado
3. Passar mouse sobre input
4. **Esperado:** Borda muda de cor
5. Focar em input
6. **Esperado:** Box-shadow azul aparece

### Teste 3: Seleção de Período
1. Servidor "Maria Silva" tem 3 períodos
2. Clicar "Editar" na linha de Maria
3. **Esperado:** Modal mostra lista com 3 opções
4. Selecionar "Período 2: 2025-2029"
5. Clicar "Avançar"
6. **Esperado:** Formulário abre com dados de 2025-2029
7. Editar campo GOZO
8. Salvar
9. **Esperado:** Apenas linha de 2025-2029 é atualizada

### Teste 4: Autocomplete
1. Clicar "Novo Registro"
2. Digitar "Mar" no campo SERVIDOR
3. **Esperado:** Sugestões aparecem ("Maria Silva", "Marcos Santos")
4. Clicar em "Maria Silva"
5. **Esperado:** Campo preenche com "Maria Silva"
6. Preencher outros campos
7. Salvar
8. **Esperado:** Nova linha criada com nome "Maria Silva"

---

## 🚨 Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| __rowIndex não está definido em todos os dados | Alto | Validar presença antes de usar, fallback para outro identificador |
| Múltiplos servidores com mesmo nome exato | Médio | Documentar que é esperado (períodos diferentes) |
| CSS não carrega | Baixo | Testar importação, validar caminho do arquivo |
| Autocomplete lento com 1000+ servidores | Médio | Limitar a 10 sugestões, debounce de 300ms |

---

## 📝 Notas de Implementação

1. **Manter compatibilidade:** Não quebrar funcionalidade de "Ver Detalhes" que já funciona
2. **Preservar deduplicação visual:** Tabela continua mostrando uma linha com contador "(3)"
3. **Testar ambos modos:** create e edit devem funcionar perfeitamente
4. **Validar permissões:** Continuar checando `canEdit` antes de salvar
5. **Logs de debug:** Adicionar console.log temporários para debugging, remover depois

---

## 🎨 UX Esperado Final

### Fluxo de Edição:
```
Tabela → Clica "Editar" (linha Maria Silva com 3 períodos)
   ↓
Modal: "Selecionar Período - Maria Silva"
   Lista:
   ○ Período 1: 01/01/2020 a 31/12/2024 (Gozo: 15, Restando: 75)
   ● Período 2: 01/01/2025 a 31/12/2029 (Gozo: 20, Restando: 70) [SELECIONADO]
   ○ Período 3: 01/01/2030 a 31/12/2034 (Gozo: 30, Restando: 60)
   [Cancelar] [Avançar]
   ↓
Clica "Avançar"
   ↓
Modal: "Editar registro - Maria Silva (Período 2)"
   Formulário com campos preenchidos do período 2025-2029
   [Cancelar] [Salvar]
   ↓
Edita campos, clica "Salvar"
   ↓
SharePoint atualizado, dados recarregados, notificação de sucesso
```

### Fluxo de Criação:
```
Header → Clica "Novo Registro"
   ↓
Modal: "Criar novo registro"
   SERVIDOR: [Mar__________] ← Digite "Mar"
             [Maria Silva  ] ← Sugestão aparece
             [Marcos Santos]
   Clica "Maria Silva" ou digita "Novo Servidor X"

   AQUISITIVO_INICIO: [___________]
   AQUISITIVO_FIM: [___________]
   GOZO: [___________]
   ... (todos os campos)

   [Cancelar] [Salvar]
   ↓
Clica "Salvar"
   ↓
Nova linha adicionada no SharePoint, dados recarregados
```

---

## 🔚 Resultado Final

Após implementação:
- ✅ Edição sempre edita o registro correto (não mais aleatório)
- ✅ Modal visualmente agradável com CSS profissional
- ✅ Usuário escolhe qual período editar se houver múltiplos
- ✅ Autocomplete facilita criação de novos períodos para servidores existentes
- ✅ Experiência consistente e intuitiva
