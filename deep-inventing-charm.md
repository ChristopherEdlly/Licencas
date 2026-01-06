### FASE 2: Redesign Completo do Modal de Edição/Adição

**Objetivo**: Criar wizard em 2 etapas com busca inteligente, cálculo automático de períodos e validações

**Arquitetura do Wizard:**

#### 2.1 Estrutura em 2 Etapas

**STEP 1: Dados do Servidor** (busca + dados pessoais/profissionais)
**STEP 2: Dados da Licença** (período aquisitivo + datas + cálculos)

```
┌──────────────────────────────────────────────────────────┐
│  [X] Adicionar Nova Licença                     [1/2]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  👤 DADOS DO SERVIDOR                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🔍 Buscar por CPF ou Nome:                         │ │
│  │ [________________] [🔍 Buscar] ou pressione Enter  │ │
│  │                                                    │ │
│  │ ─── Dados Pessoais ───                            │ │
│  │ Nome Completo: [João Silva____________] (auto)    │ │
│  │ CPF: [123.456.789-00] (auto)  RG: [12345] (auto) │ │
│  │                                                    │ │
│  │ ─── Dados Profissionais ───                       │ │
│  │ Cargo: [Auditor Fiscal_______] (auto)            │ │
│  │ Lotação: [SEFAZ______________] (auto)            │ │
│  │ Unidade: [SUTRI__] (auto) REF: [A-123] (auto)    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Cancelar]                        [Próximo: Licença →] │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  [X] Adicionar Nova Licença - João Silva        [2/2]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📅 DADOS DA LICENÇA                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Número do Processo: [________________]             │ │
│  │ Data de Emissão: [__/__/____]                     │ │
│  │                                                    │ │
│  │ Período Aquisitivo: [Selecionar ▼]                │ │
│  │ ┌────────────────────────────────────────────┐    │ │
│  │ │ 01/01/2020 - 31/12/2024 (90 dias) ✓       │    │ │
│  │ │ 01/01/2025 - 31/12/2029 (90 dias)         │    │ │
│  │ │ 01/01/2030 - 31/12/2034 (90 dias)         │    │ │
│  │ └────────────────────────────────────────────┘    │ │
│  │                                                    │ │
│  │ ℹ️ Disponível neste período: 90 dias               │ │
│  │                                                    │ │
│  │ A Partir de: [__/__/____]                         │ │
│  │ Dias de Gozo: [30] (múltiplos de 30)             │ │
│  │ Término: [__/__/____] (calculado automaticamente) │ │
│  │ Restando: [60] dias (calculado automaticamente)   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [← Voltar]  [Cancelar]               [💾 Salvar]        │
└──────────────────────────────────────────────────────────┘
```

#### 2.2 Mapeamento de Campos do Excel

**Colunas Obrigatórias no Excel:**
- `NUMERO` - Número do processo
- `EMISSAO` - Data de emissão
- `UNIDADE` - Unidade de lotação
- `LOTACAO` - Lotação do servidor
- `NOME` - Nome completo
- `CARGO` - Cargo
- `REF` - Referência
- `CPF` - CPF
- `RG` - RG
- `AQUISITIVO_INICIO` - Início do período aquisitivo
- `AQUISITIVO_FIM` - Fim do período aquisitivo
- `A_PARTIR` - Data de início da licença
- `TERMINO` - Data de término da licença
- `RESTANDO` - Dias restantes no período
- `GOZO` - Dias gozados

#### 2.3 Lógica de Busca e Auto-Preenchimento

**Step 1 - Busca de Servidor:**
1. Usuário digita CPF ou Nome e pressiona Enter ou clica em "Buscar"
2. Sistema busca no cache (DataStateManager.getAllServidores())
3. Se encontrar: preenche automaticamente todos os campos (nome, cpf, rg, cargo, lotação, unidade, ref)
4. Se não encontrar: permite preenchimento manual (modo "novo servidor")
5. Campos auto-preenchidos têm indicação visual "(auto)"

**Comportamento em Modo Edição:**
- Campos de dados pessoais (nome, cpf, rg) ficam readonly
- Se alterar dados pessoais: mostrar alerta "⚠️ Estes dados são do servidor e afetarão todas as suas licenças"
- Campos profissionais (cargo, lotação, etc.) podem ser editados

#### 2.4 Cálculo Automático de Períodos Aquisitivos

**Lógica:**
1. Servidor tem 90 dias de licença-prêmio a cada 5 anos de serviço
2. Sistema detecta períodos existentes nas licenças do servidor
3. Se houver períodos: continua a sequência (próximo período começa 5 anos depois)
4. Se não houver períodos: usa data de admissão como base (se disponível)
5. Calcula períodos futuros automaticamente

**Exemplo:**
```
Última licença: 01/01/2020 - 31/12/2024
Próximo período calculado: 01/01/2025 - 31/12/2029
Próximo após esse: 01/01/2030 - 31/12/2034
```

**Implementação:**
```javascript
function calcularPeriodosAquisitivos(servidor) {
  const periodos = [];
  const licencas = servidor.licencas || [];
  
  // Pegar último período conhecido
  let ultimoPeriodo = null;
  licencas.forEach(lic => {
    if (lic.AQUISITIVO_FIM) {
      const fim = new Date(lic.AQUISITIVO_FIM);
      if (!ultimoPeriodo || fim > new Date(ultimoPeriodo.fim)) {
        ultimoPeriodo = {
          inicio: lic.AQUISITIVO_INICIO,
          fim: lic.AQUISITIVO_FIM
        };
      }
    }
  });
  
  // Se não houver período, usar base default ou data admissão
  let baseDate = ultimoPeriodo 
    ? new Date(ultimoPeriodo.fim)
    : new Date(); // ou usar data de admissão se disponível
  
  // Gerar próximos 3 períodos (15 anos no futuro)
  for (let i = 0; i < 3; i++) {
    const inicio = new Date(baseDate);
    inicio.setDate(inicio.getDate() + 1); // Dia seguinte ao fim anterior
    
    const fim = new Date(inicio);
    fim.setFullYear(fim.getFullYear() + 5);
    fim.setDate(fim.getDate() - 1); // Último dia antes de completar 5 anos
    
    // Calcular dias disponíveis (90 - já usado)
    const diasUsados = licencas.filter(lic => 
      lic.AQUISITIVO_INICIO === inicio.toISOString().split('T')[0]
    ).reduce((sum, lic) => sum + (parseInt(lic.GOZO) || 0), 0);
    
    periodos.push({
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0],
      disponiveis: 90 - diasUsados
    });
    
    baseDate = fim;
  }
  
  return periodos;
}
```

#### 2.5 Cálculo Automático de Datas e Validação

**Step 2 - Auto-cálculo:**
1. Usuário seleciona período aquisitivo
2. Sistema mostra "Disponível: X dias"
3. Usuário preenche "A partir de" (data início)
4. Usuário preenche "Dias de Gozo" (deve ser múltiplo de 30)
5. Sistema calcula automaticamente:
   - `TERMINO = A_PARTIR + GOZO dias`
   - `RESTANDO = DISPONIVEL - GOZO`

**Validações:**
- `GOZO % 30 === 0` (deve ser 30, 60, 90, etc.)
- `GOZO <= disponível no período`
- `A_PARTIR` deve estar dentro do período aquisitivo
- `TERMINO` não pode ultrapassar fim do período aquisitivo

**Feedback Visual:**
- Campo válido: borda verde + ✓
- Campo inválido: borda vermelha + mensagem de erro
- Campos calculados: fundo azul claro + label "(calculado)"

#### 2.6 Implementação - Arquivos Necessários

#### 2.6 Implementação - Arquivos Necessários

**Novos Arquivos:**
1. `Js/2-services/WizardModal.js` - Componente principal do wizard
2. `css/components/wizard-modal.css` - Estilos do wizard

**Arquivos Modificados:**
1. `index.html` - Adicionar script do WizardModal
2. `Js/5-app/App.js` - Integrar WizardModal no lugar do LicenseEditModal

**Estrutura do WizardModal.js:**
```javascript
class WizardModal {
  constructor(app) {
    this.app = app;
    this.currentStep = 1;
    this.totalSteps = 2;
    this.data = {};
    this.servidorData = null;
    this.periodosDisponiveis = [];
  }

  // Lifecycle
  open(mode, servidorData = null, licenseData = null) {}
  close() {}
  
  // Steps
  _showStep(stepNumber) {}
  _nextStep() {}
  _previousStep() {}
  
  // Step 1: Servidor
  _renderStep1() {}
  _searchServidor() {}
  _fillServidorData(servidor) {}
  
  // Step 2: Licença
  _renderStep2() {}
  _calcularPeriodosAquisitivos() {}
  _onPeriodoChange() {}
  _onAPartirChange() {}
  _onGozoChange() {}
  _calcularTermino() {}
  _calcularRestando() {}
  
  // Validação
  _validateStep1() {}
  _validateStep2() {}
  
  // Save
  _save() {}
}
```

#### 2.7 CSS Principal do Wizard

```css
/* Wizard Container */
.wizard-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.wizard-modal.active {
  display: flex;
}

.wizard-content {
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.wizard-header {
  padding: 1.5rem 2rem;
  border-bottom: 2px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wizard-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wizard-step-indicator {
  font-size: 0.875rem;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
}

/* Body */
.wizard-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

/* Section */
.wizard-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.wizard-section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border);
}

/* Search Box */
.wizard-search-box {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.wizard-search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.wizard-search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
}

.wizard-search-button {
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.wizard-search-button:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

/* Field Group */
.wizard-field-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.wizard-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wizard-field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wizard-field-auto-tag {
  font-size: 0.75rem;
  color: var(--success);
  font-weight: normal;
}

.wizard-field-calc-tag {
  font-size: 0.75rem;
  color: var(--info);
  font-weight: normal;
}

.wizard-field-input {
  padding: 0.75rem 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.wizard-field-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
}

.wizard-field-input.valid {
  border-color: var(--success);
}

.wizard-field-input.invalid {
  border-color: var(--danger);
}

.wizard-field-input.calculated {
  background: rgba(var(--info-rgb), 0.05);
}

.wizard-field-input:disabled {
  background: var(--bg-tertiary);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Period Selector */
.wizard-period-select {
  position: relative;
}

.wizard-period-option {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wizard-period-badge {
  background: var(--success);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Info Box */
.wizard-info-box {
  background: rgba(var(--info-rgb), 0.1);
  border-left: 4px solid var(--info);
  padding: 1rem 1.25rem;
  border-radius: 8px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
  color: var(--text-primary);
}

/* Footer */
.wizard-footer {
  padding: 1.5rem 2rem;
  border-top: 2px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.wizard-footer-left {
  display: flex;
  gap: 0.75rem;
}

.wizard-footer-right {
  display: flex;
  gap: 0.75rem;
}

.wizard-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.wizard-button-back {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.wizard-button-cancel {
  background: transparent;
  color: var(--text-secondary);
}

.wizard-button-next {
  background: var(--primary);
  color: white;
}

.wizard-button-save {
  background: var(--success);
  color: white;
}

.wizard-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.wizard-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

## 📊 Resultado Final Esperado

### Após Fase 2 (Wizard UI):

- ✅ Wizard em 2 etapas intuitivo
- ✅ Busca inteligente integrada nos campos
- ✅ Auto-preenchimento de dados do servidor
- ✅ Cálculo automático de períodos aquisitivos (5 anos, 90 dias)
- ✅ Cálculo automático de datas (inicio + gozo = termino)
- ✅ Validação em tempo real (gozo múltiplo de 30)
- ✅ Feedback visual claro (bordas coloridas, tags de status)
- ✅ Navegação fluida entre steps
- ✅ Experiência de usuário profissional

## 🔧 Ordem de Implementação

**FASE 2 - Wizard Modal:**

1. ✅ Atualizar documentação (deep-inventing-charm.md)
2. 🔄 Criar WizardModal.js com estrutura base
3. 🔄 Implementar Step 1 com busca integrada
4. 🔄 Implementar calcularPeriodosAquisitivos()
5. 🔄 Implementar Step 2 com auto-cálculo
6. 🔄 Adicionar validações e feedback visual
7. 🔄 Criar wizard-modal.css
8. 🔄 Integrar no App.js

## 🧪 Testes Necessários

### Fase 2:

**Step 1:**
1. Buscar servidor existente por CPF → Dados auto-preenchem
2. Buscar servidor por nome → Dados auto-preenchem
3. Buscar servidor inexistente → Permite preenchimento manual
4. Tentar avançar com campos obrigatórios vazios → Mostra erro

**Step 2:**
1. Selecionar período aquisitivo → Mostra dias disponíveis
2. Preencher "A partir de" e "Gozo" → Calcula "Término" automaticamente
3. Preencher gozo não múltiplo de 30 → Mostra erro de validação
4. Preencher gozo maior que disponível → Mostra erro
5. Salvar licença → Adiciona ao Excel e atualiza tabela

**Modo Edição:**
1. Abrir licença existente → Campos preenchidos corretamente
2. Alterar dados pessoais → Mostra alerta de impacto
3. Salvar alterações → Atualiza corretamente no Excel

## 🔧 Implementação Detalhada - FASE 1 (Prioridade)

### Mudança 1: App.js - Método `_loadPrimaryData()` (linha ~1070)

**Localização**: Quando carrega dados do SharePoint pela primeira vez

**Código Atual**:

```javascript
await this.cacheService.saveToCache('sharepoint-data', transformedData, {
    source: 'sharepoint',
    timestamp: Date.now()
});
```

**Código Novo**:

```javascript
// Obter metadados completos do DataStateManager
const sourceMetadata = this.dataStateManager.getSourceMetadata();

await this.cacheService.saveToCache('sharepoint-data', transformedData, {
    source: 'sharepoint',
    timestamp: Date.now(),
    // Adicionar metadados do SharePoint
    fileId: sourceMetadata?.fileId,
    tableName: sourceMetadata?.tableName,
    tableInfo: sourceMetadata?.tableInfo
});

console.log('[App] 💾 Cache salvo com metadados:', {
    fileId: sourceMetadata?.fileId,
    tableName: sourceMetadata?.tableName,
    hasTableInfo: !!sourceMetadata?.tableInfo
});
```

---

### Mudança 2: App.js - Método `_restoreFromCache()` (linha ~847-882)

**Localização**: Quando restaura dados do cache no startup

**Código Atual** (aproximadamente linha 870-880):

```javascript
// Restaurar dados
this.dataStateManager.setAllServidores(cached.data);
this.dataStateManager.setFilteredServidores(cached.data);

// ... outras atualizações de UI ...
```

**Código Novo** (adicionar ANTES de setAllServidores):

```javascript
// CRÍTICO: Restaurar metadados do SharePoint se existirem
if (cached.metadata) {
    const { fileId, tableName, tableInfo, ...otherMeta } = cached.metadata;

    if (fileId && tableName && tableInfo) {
        // Reconstituir objeto de metadados
        const sourceMetadata = {
            fileId: fileId,
            tableName: tableName,
            tableInfo: tableInfo
        };

        this.dataStateManager.setSourceMetadata(sourceMetadata);

        console.log('[App] ✅ Metadados restaurados do cache:', {
            fileId: fileId,
            tableName: tableName,
            columnCount: tableInfo?.columns?.length || 0
        });
    } else {
        console.warn('[App] ⚠️ Cache tem metadata mas faltam campos críticos:', {
            hasFileId: !!fileId,
            hasTableName: !!tableName,
            hasTableInfo: !!tableInfo
        });
    }
}

// Restaurar dados
this.dataStateManager.setAllServidores(cached.data);
this.dataStateManager.setFilteredServidores(cached.data);
```

---

### Mudança 3: App.js - Método `loadFile()` (linha ~702)

**Localização**: Quando carrega arquivo local (não SharePoint)

**Código Atual**:

```javascript
await this.cacheService.saveToCache(file.name, transformedData);
```

**Código Novo**:

```javascript
// Para arquivos locais, não temos fileId/tableName do SharePoint
// mas ainda salvamos a estrutura do cache corretamente
await this.cacheService.saveToCache(file.name, transformedData, {
    source: 'local',
    fileName: file.name,
    timestamp: Date.now()
});

console.log('[App] 💾 Arquivo local salvo no cache:', file.name);
```

**Nota**: Para arquivos locais, não precisamos dos metadados do SharePoint (não há edição inline). Esta mudança é só para manter consistência na estrutura do cache.

---

### Mudança 4: DataLoader.js - Função `saveToCache()` (linha ~604)

**ATENÇÃO**: Esta mudança é **OPCIONAL** e de menor prioridade. O DataLoader.js é usado internamente pelo SharePointExcelService, mas o App.js já salva no cache depois com metadados completos.

**Avaliação**: **NÃO MODIFICAR** por enquanto. As mudanças em App.js são suficientes para resolver o problema.

---

## 🎯 Verificações Pós-Implementação

Após aplicar as 3 mudanças acima, verificar:

### 1. Console Logs ao Carregar do SharePoint:

```
[App] 💾 Cache salvo com metadados: {fileId: "...", tableName: "...", hasTableInfo: true}
```

### 2. Console Logs ao Recarregar Página (com cache):

```
[App] ✅ Metadados restaurados do cache: {fileId: "...", tableName: "...", columnCount: X}
[App] ✅ Botão addRecordButton encontrado
[App] 📊 Metadados do SharePoint: {hasMeta: true, hasFileId: true, fileId: "..."}
[TableManager] 🔐 _applyEditButtonsState chamado {canEdit: true, totalButtons: X}
```

### 3. UI Funcional:

- ✅ Botão "Adicionar" visível após reload
- ✅ Botões "Editar" habilitados (não disabled)
- ✅ Clicar em editar abre o modal
- ✅ Salvar alterações funciona

---

## ⚙️ Ordem de Implementação

**FASE 1 (PRIORITÁRIA)**: Corrigir cache - 3 mudanças em App.js

1. Mudança 1: `_loadPrimaryData()` - Salvar metadados
2. Mudança 2: `_restoreFromCache()` - Restaurar metadados
3. Mudança 3: `loadFile()` - Consistência (opcional)

**FASE 2 (FUTURO)**: Redesign do modal - Apenas após Fase 1 testada e aprovada

---

## 🧪 Testes Necessários

### Fase 1:

1. **Teste 1**: Carregar do SharePoint → Verificar console logs de "Cache salvo com metadados"
2. **Teste 2**: Recarregar página (F5) → Verificar console logs de "Metadados restaurados"
3. **Teste 3**: Verificar botão "Adicionar" está visível
4. **Teste 4**: Verificar botões "Editar" estão habilitados
5. **Teste 5**: Clicar em "Editar" → Modal abre
6. **Teste 6**: Editar dados e salvar → Dados atualizam no SharePoint

### Fase 2 (quando implementada):

1. Abrir modal e verificar agrupamento visual
2. Testar validação em tempo real
3. Testar keyboard navigation (Tab, Enter, Esc)
4. Testar em mobile (responsividade)
5. Testar loading state ao salvar
6. Testar feedback de sucesso/erro



# Pontos importantes para o redesign do modal de edição/adicionar licença prêmio:
1. identificação do periodo aquisitivo do servidor (lembrando que o periodo aquisitivo é fixo de 5 em 5 anos, porem varia de um servidor para outro, por exemplo para uns seria 2005-2010-2025 outros seria 2013-2018-2023 muda por causa da data de entrada), o sistema deve identificar o periodos aquisitivos do servidor automaticamente( mas não vai ser 100% automatico o usuario deve poder mudar ), inclusive identificar os futuros periodos aquisitivos
2. na seleção do periodo aquisitivo deve ser um select com opção de personalizado, as opções do select deve conter a quantidade de dias disponiveis naquele periodo aquisitivo.
3. facilitar o preenchimento de dados do servidor e pessoais que ja existe usando nome ou cpf ou rg durante a primeira etapa
4. unir dados pessoais e profissionais dada a baixa quantia de dados e facilidade de preenchimento automatico
5. na na etapa de dados da licença, é possivel deduzir facilmente algumas coisas como: inicio - fim = gozo ou inicio + gozo = fim, aquisitivo restante - gozo = dias restando;

OBS's:

- cada periodo aquiditivo dispõe 90 dias de licença.
- cada periodo de licença deve ser multiplo de 30 dias.
- colunas na planilha: NUMERO(é o id do registro em outro sistema, deve ser inserido na etapa de periodo aquisitivo), EMISSAO( data de emissão inserido pelo usuario), UNIDADE( geralmente é ligada ao servidor dificilmente muda, pode ser na etapa de dados profissionais), LOTACAO( gerencia que o servidor está sediado ), NOME, CARGO, REF(nunca foi usada, geralmente fica vazia), CPF, RG, AQUISITIVO_INICIO, AQUISITIVO_FIM, A_PARTIR, TERMINO, RESTANDO, GOZO
- Exemplo retirado da planilha para entender o padrão das licenças e periodo aquisitivo:
AQUISITIVO_INICIO AQUISITIVO_FIM A_PARTIR TERMINO RESTANDO GOZO
16/11/1998 14/11/2003 26/11/2018 25/12/2018 0(DIAS) 30
13/11/2008 12/11/2013 30/11/2020 28/01/2021 30(DIAS) 60
13/11/2008 12/11/2013 28/11/2022 27/12/2022 0(DIAS) 30
13/11/2013 12/11/2018 28/12/2022 26/01/2023 60(DIAS) 30
13/11/2013 12/11/2018 02/01/2024 31/01/2024 30(DIAS) 30
13/11/2013 12/11/2018 26/12/2024 24/01/2025 0(DIAS) 30
17/11/2018 16/11/2023 11/06/2025 10/07/2025 60(DIAS) 30
17/11/2018 16/11/2023 01/11/2025 30/12/2025 0(DIAS) 60