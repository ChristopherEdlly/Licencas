# Plano: Correção do Fluxo de Dados - Agregação de Licenças por Servidor

## 📋 Resumo Executivo

**O que está errado**: O CSV tem **UMA LINHA POR LICENÇA** (não uma linha por servidor). ACACIA CHAVES tem 8 linhas (8 períodos de licença). O sistema precisa AGREGAR essas linhas em um único objeto servidor com array `licencas[]`, mas isso não está acontecendo corretamente.

**Estrutura real do CSV**:
```csv
LOTACAO,NOME,A_PARTIR,TERMINO,GOZO
GECAP,ACACIA CHAVES DA SILVA COSTA,2018-11-26,2018-12-25,30
GECAP,ACACIA CHAVES DA SILVA COSTA,2020-11-30,2021-01-28,60
GECAP,ACACIA CHAVES DA SILVA COSTA,2022-11-28,2022-12-27,30
... (8 linhas para a mesma pessoa!)
```

**Estrutura esperada após parse**:
```javascript
{
    nome: "ACACIA CHAVES DA SILVA COSTA",
    lotacao: "GECAP - Gerência de Suporte...",
    _lotacaoNormalizada: "gecap - gerencia de suporte...",
    licencas: [
        {inicio: Date(2018,10,26), fim: Date(2018,11,25), dias: 30, ...},
        {inicio: Date(2020,10,30), fim: Date(2021,0,28), dias: 60, ...},
        {inicio: Date(2022,10,28), fim: Date(2022,11,27), dias: 30, ...},
        ... (8 licenças em um array!)
    ]
}
```

**A solução**:
1. 🔴 **CRÍTICO**: DataParser/DataTransformer deve AGRUPAR linhas por servidor (CPF ou NOME)
2. 🔴 **CRÍTICO**: Cada linha do CSV vira um item no array `servidor.licencas[]`
3. 🔴 **CRÍTICO**: Normalizar campos para busca (`_lotacaoNormalizada`, `_nomeNormalizado`)
4. 🟡 Simplificar ReportsPage e ReportsManager (apenas formatar, não parsear)
5. 🟢 Adicionar validação

**Arquivos principais**:
- 🔴 `DataParser.js` ou `DataTransformer.js` - AGREGAR linhas do CSV em objetos servidor
- 🔴 `DataTransformer.js` - Normalizar campos para busca
- 🟡 `ReportsPage.js` - Simplificar (já feito parcialmente)
- 🟡 `ReportsManager.js` - Simplificar (já feito parcialmente)

---

## 🎯 Problema Identificado (REVISADO)

**Sintoma**:
- ReportsPage: ACACIA CHAVES mostra apenas 1 licença (mas tem 8!)
- HomePage: Pode mostrar diferente
- Lotação com acentos não funciona em filtros

**Causa Raiz (CORRIGIDA)**:
1. **CSV tem UMA LINHA POR LICENÇA**, não uma linha por servidor
2. O parsing NÃO está agregando as linhas em um único objeto servidor
3. Cada página acaba vendo dados diferentes porque não há agregação consistente

**Exemplo do CSV real**:
```csv
NOME,LOTACAO,A_PARTIR,TERMINO,GOZO
ABILIO CASTANHEIRA,GERPLAF,1899-12-30,,0          ← SEM licença (data 1899 = vazio)
ACACIA CHAVES,GECAP,2018-11-26,2018-12-25,30      ← Licença 1
ACACIA CHAVES,GECAP,2020-11-30,2021-01-28,60      ← Licença 2
ACACIA CHAVES,GECAP,2022-11-28,2022-12-27,30      ← Licença 3
... (mais 5 linhas para ACACIA CHAVES)
```

**O que DEVERIA acontecer**:
- Parser lê o CSV e identifica: "8 linhas têm NOME = ACACIA CHAVES"
- Agrupa essas 8 linhas em UM objeto:
  ```javascript
  {
      nome: "ACACIA CHAVES DA SILVA COSTA",
      lotacao: "GECAP - Gerência...",  // da primeira linha
      licencas: [
          {inicio: Date(...), fim: Date(...), dias: 30},
          {inicio: Date(...), fim: Date(...), dias: 60},
          {inicio: Date(...), fim: Date(...), dias: 30},
          ... // 8 itens total
      ]
  }
  ```

## 📊 Fluxo Atual (PROBLEMÁTICO)

```
CSV (8 linhas para ACACIA)
         ↓
    DataParser.parseCSV()
         ↓
    [{linha1}, {linha2}, {linha3}, ..., {linha8}]  ← 8 objetos separados!
         ↓
    DataTransformer.enrichServidor()
         ↓
    [{servidor1}, {servidor2}, ..., {servidor8}]   ← Ainda 8 objetos!
         ↓
    DataStateManager
         ↓
❌ ReportsPage vê 8 "servidores" diferentes (ou só pega o primeiro?)
```

## ✅ Fluxo Correto (PROPOSTO)

```
CSV (8 linhas para ACACIA)
         ↓
    DataParser.parseCSV()
         ↓
    [{linha1}, {linha2}, {linha3}, ..., {linha8}]  ← 8 objetos (normal)
         ↓
    🆕 DataParser.groupByServidor()  OU  DataTransformer.aggregateServidores()
         ↓
    [{
        nome: "ACACIA",
        licencas: [{...}, {...}, {...}, {...}, {...}, {...}, {...}, {...}]  ← 8 licenças!
    }]  ← 1 objeto com 8 licenças!
         ↓
    DataTransformer.enrichServidor()
         ↓
    [{
        nome: "ACACIA",
        _nomeNormalizado: "acacia",
        lotacao: "GECAP - Gerência...",
        _lotacaoNormalizada: "gecap - gerencia...",
        licencas: [{inicio: Date, fim: Date}, ...]  ← Datas normalizadas
    }]
         ↓
    DataStateManager
         ↓
✅ ReportsPage vê 1 servidor com 8 licenças!
```

---

## 🔧 Modificações Necessárias

### 1️⃣ **DataParser.js** - Adicionar Agregação por Servidor (CRÍTICO)

**Arquivo**: `Js/1-core/data-flow/DataParser.js`

**Problema**: O método `parseCSV()` retorna um array onde cada linha do CSV é um objeto. Para arquivos onde **cada linha é uma licença**, precisamos AGRUPAR por servidor.

**Solução**: Adicionar função `groupByServidor()` ou modificar o fluxo de parsing.

**Passo 1**: Verificar se DataParser já tem lógica de agregação. Se não, adicionar método:

```javascript
/**
 * Agrupa linhas do CSV por servidor (quando cada linha é uma licença)
 * @param {Array<Object>} rows - Array de objetos parseados do CSV
 * @returns {Array<Object>} - Array de servidores com licencas agregadas
 */
static groupByServidor(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const servidoresMap = new Map();

    rows.forEach((row, index) => {
        // Identificar servidor (usar CPF se disponível, senão NOME)
        const cpf = row.CPF || row.cpf;
        const nome = row.NOME || row.nome || row.SERVIDOR || row.servidor;

        if (!nome) {
            console.warn(`Linha ${index}: sem nome, pulando`);
            return;
        }

        // Chave única: CPF (se tiver) ou NOME normalizado
        const chave = cpf || nome.trim().toUpperCase();

        // Se servidor ainda não existe no map, criar
        if (!servidoresMap.has(chave)) {
            servidoresMap.set(chave, {
                nome: nome.trim(),
                cpf: cpf || '',
                cargo: row.CARGO || row.cargo || '',
                lotacao: row.LOTACAO || row.LOTAÇÃO || row.lotacao || '',
                unidade: row.UNIDADE || row.unidade || '',
                licencas: []
            });
        }

        const servidor = servidoresMap.get(chave);

        // Extrair dados da licença desta linha
        const inicioRaw = row.A_PARTIR || row['A_PARTIR'] || row.INICIO || row['INÍCIO'];
        const fimRaw = row.TERMINO || row.FINAL || row.FIM;
        const gozoRaw = row.GOZO || row.gozo || '';
        const restante = row.RESTANDO || row.restando || '';

        // Parse de dias (formato: "30", "60", "90")
        let dias = 0;
        if (typeof gozoRaw === 'number') {
            dias = gozoRaw;
        } else if (typeof gozoRaw === 'string') {
            const match = gozoRaw.match(/\d+/);
            if (match) dias = parseInt(match[0], 10);
        }

        // Ignorar linhas com data "1899-12-30" (marca de "sem licença")
        if (inicioRaw && !inicioRaw.toString().includes('1899')) {
            // Adicionar licença ao array
            servidor.licencas.push({
                inicio: inicioRaw,  // String ainda, será convertida no Transformer
                fim: fimRaw,
                dias: dias,
                restando: restante,
                aquisitivoInicio: row.AQUISITIVO_INICIO || row.aquisitivoInicio,
                aquisitivoFim: row.AQUISITIVO_FIM || row.aquisitivoFim,
                tipo: 'periodo-gozo'
            });
        }

        // Atualizar lotação se mudou (usar a mais recente)
        if (row.LOTACAO || row.LOTAÇÃO) {
            servidor.lotacao = row.LOTACAO || row.LOTAÇÃO || servidor.lotacao;
        }
    });

    // Converter Map para Array
    return Array.from(servidoresMap.values());
}
```

**Passo 2**: Modificar o fluxo de parsing. Verificar onde `parseCSV()` é chamado e adicionar a agregação:

```javascript
// ANTES (no arquivo que chama DataParser.parseCSV):
const parsedData = DataParser.parseCSV(csvString);

// DEPOIS:
const rawRows = DataParser.parseCSV(csvString);
const parsedData = DataParser.groupByServidor(rawRows);
```

**Onde aplicar**: Provavelmente em `App.js` no método `_parseData()` ou em `FileService`.

---

### 2️⃣ **DataTransformer.js** - Normalizar Datas e Adicionar Campos de Busca

**Arquivo**: `Js/1-core/data-flow/DataTransformer.js`

**Problema**:
- As datas vêm como strings do DataParser (`"2018-11-26 00:00:00"`)
- Faltam campos normalizados para busca (`_lotacaoNormalizada`)

**Solução**: Modificar `enrichServidor()` para:
1. Converter TODAS as datas em `licencas[]` para Date objects
2. Adicionar `_lotacaoNormalizada`, `_nomeNormalizado`, `_cargoNormalizado`

**Código**:

**Passo 1**: Adicionar funções auxiliares ANTES de `enrichServidor()` (linha ~175):

```javascript
/**
 * Normaliza texto para busca (remove acentos, lowercase)
 * @param {string} text - Texto para normalizar
 * @returns {string} Texto normalizado
 */
function normalizeForSearch(text) {
    if (!text) return '';
    return text.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .toLowerCase()
        .trim();
}

/**
 * Converte valor para Date object
 * @param {*} value - String, Date, ou outro
 * @returns {Date|null} Date object ou null se inválido
 */
function ensureDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    // Tentar parse direto (funciona com "YYYY-MM-DD HH:MM:SS")
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Tentar via CronogramaParser se disponível
    if (typeof window !== 'undefined' && window.CronogramaParser) {
        const parser = new window.CronogramaParser();
        return parser.parseDate(value);
    }

    return null;
}
```

**Passo 2**: Modificar `enrichServidor()` (linha 181-262):

Adicionar **APÓS** a linha 219 (depois do bloco de licencasPremio):

```javascript
// === NOVO CÓDIGO ===

// 1. GARANTIR que licencas é um array
if (!Array.isArray(enriched.licencas)) {
    enriched.licencas = [];
}

// 2. Normalizar TODAS as licenças (converter datas para Date objects)
enriched.licencas = enriched.licencas.map((lic, index) => {
    const licNormalizada = {
        inicio: ensureDate(lic.inicio || lic.dataInicio),
        fim: ensureDate(lic.fim || lic.dataFim),
        tipo: lic.tipo || 'prevista',
        descricao: lic.descricao || '',
        dias: lic.dias || 30,
        meses: lic.meses || Math.ceil((lic.dias || 30) / 30),
        restando: lic.restando || '',
        aquisitivoInicio: ensureDate(lic.aquisitivoInicio),
        aquisitivoFim: ensureDate(lic.aquisitivoFim)
    };

    // Se não tem fim mas tem inicio e dias, calcular fim
    if (!licNormalizada.fim && licNormalizada.inicio && licNormalizada.dias) {
        const fimCalculado = new Date(licNormalizada.inicio);
        fimCalculado.setDate(fimCalculado.getDate() + licNormalizada.dias - 1);
        licNormalizada.fim = fimCalculado;
    }

    return licNormalizada;
}).filter(lic => lic.inicio && lic.inicio instanceof Date); // Remove licenças sem data válida

// 3. Normalizar campos para busca (preserva originais para exibição)
if (enriched.lotacao) {
    enriched._lotacaoNormalizada = normalizeForSearch(enriched.lotacao);
}

if (enriched.nome || enriched.servidor) {
    const nomeOriginal = enriched.nome || enriched.servidor;
    enriched.nome = nomeOriginal; // Padronizar em "nome"
    enriched._nomeNormalizado = normalizeForSearch(nomeOriginal);
}

if (enriched.cargo) {
    enriched._cargoNormalizado = normalizeForSearch(enriched.cargo);
}

// === FIM DO NOVO CÓDIGO ===

// Continuar com o código existente (linha 221 em diante)
// Calcula estatísticas de licenças (se disponível)
if (enriched.licencas && Array.isArray(enriched.licencas)) {
    // ... (código já existente)
}
```

**Resultado**: Objeto servidor sempre terá:
```javascript
{
    nome: "ACACIA CHAVES DA SILVA COSTA",
    _nomeNormalizado: "acacia chaves da silva costa",
    lotacao: "GECAP - Gerência de Suporte...",
    _lotacaoNormalizada: "gecap - gerencia de suporte...",
    cargo: "OFICIAL ADMINISTRATIVO",
    _cargoNormalizado: "oficial administrativo",
    licencas: [
        {
            inicio: Date(2018, 10, 26),  // Date object
            fim: Date(2018, 11, 25),     // Date object
            dias: 30,
            meses: 1,
            tipo: 'periodo-gozo'
        },
        // ... mais 7 licenças
    ]
}
```

---

### 3️⃣ **DataFilter.js** - Usar Campos Normalizados (JÁ CORRIGIDO)

**Arquivo**: `Js/1-core/data-flow/DataFilter.js`

**Status**: ✅ **JÁ IMPLEMENTADO**

A função `filterByField()` já usa `normalizeForComparison()` (linha ~252) que remove acentos.

**Possível melhoria**: Se o filtro ainda não funciona, verificar se está comparando com o campo `_lotacaoNormalizada`:

```javascript
function filterByField(data, field, values) {
    if (!Array.isArray(data)) return [];
    if (!field || !Array.isArray(values) || values.length === 0) return data;

    const normalizedValues = values.map(v => normalizeForComparison(v));

    return data.filter(item => {
        // Tentar campo normalizado primeiro (ex: _lotacaoNormalizada)
        const normalizedField = `_${field}Normalizada`;
        let itemValue = item[normalizedField] || item[field];

        if (!itemValue) return false;

        const normalizedItemValue = normalizeForComparison(itemValue);
        return normalizedValues.includes(normalizedItemValue);
    });
}
```

---

### 4️⃣ **ReportsPage.js** - REMOVER Parsing Local (SIMPLIFICAR)

**Arquivo**: `Js/4-pages/ReportsPage.js`

**Problema**: Método `_formatPeriodoLicenca()` ainda tenta fazer parsing.

**Solução**: Confiar nos dados do DataTransformer (já tem Date objects).

**Código**:

```javascript
/**
 * Formata período de licença para exibição
 * @param {Object} servidor - Objeto servidor (dados já normalizados)
 * @returns {string} - String formatada com períodos
 */
_formatPeriodoLicenca(servidor) {
    // Dados JÁ vêm normalizados: servidor.licencas = Array<{inicio: Date, fim: Date}>
    const licencas = servidor.licencas || [];

    if (licencas.length === 0) {
        return 'Não informado';
    }

    // Apenas FORMATAR (não parsear!)
    const periodos = licencas.map(lic => {
        if (!lic.inicio) return null;

        const inicio = this._formatDate(lic.inicio);
        const fim = this._formatDate(lic.fim || lic.inicio);

        return `${inicio} - ${fim}`;
    }).filter(Boolean); // Remove nulls

    return periodos.length > 0 ? periodos.join('\n') : 'Não informado';
}

/**
 * Formata uma data para exibição (DD/MM/YYYY)
 * @param {Date} date - Date object
 * @returns {string} - Data formatada
 */
_formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}
```

**Remover**:
- Método `_getLicenses()` (se existir)
- Debug logging (`window._reportDebugCount`, `console.log`)

---

### 5️⃣ **ReportsManager.js** - SIMPLIFICAR

**Arquivo**: `Js/3-managers/features/ReportsManager.js`

**Solução**: Simplificar `getAllLicenses()` e `getCellValue()`.

**Código**:

```javascript
/**
 * Obtém todas as licenças de um servidor
 * @param {Object} servidor - Objeto servidor (dados normalizados)
 * @returns {Array<Object>} - Array de licenças
 */
getAllLicenses(servidor) {
    // Dados já vêm prontos do DataTransformer!
    return servidor.licencas || [];
}

/**
 * Obtém valor de uma célula para export
 */
getCellValue(servidor, column, options = {}) {
    switch(column) {
        case 'periodoLicenca':
            const licencas = servidor.licencas || [];
            if (licencas.length === 0) return '';

            return licencas.map(lic => {
                if (!lic.inicio) return null;

                const inicio = this.formatDate(lic.inicio);
                const fim = this.formatDate(lic.fim || lic.inicio);

                return `${inicio} até ${fim}`;
            }).filter(Boolean).join('\n');

        case 'lotacao':
            // Usar valor ORIGINAL para exibição (não normalizado)
            return servidor.lotacao || '';

        case 'nome':
            return servidor.nome || servidor.servidor || '';

        default:
            return servidor[column] || '';
    }
}

/**
 * Formata data para exibição
 */
formatDate(date) {
    if (!date) return '';

    let dateObj = date;
    if (!(date instanceof Date)) {
        dateObj = new Date(date);
    }

    if (isNaN(dateObj.getTime())) return '';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
}
```

---

### 6️⃣ **App.js** - Integrar Agregação de Servidores

**Arquivo**: `Js/5-app/App.js`

**Problema**: O método `_parseData()` ou `loadFile()` precisa chamar a nova função de agregação.

**Solução**: Adicionar chamada para `DataParser.groupByServidor()` após o parse do CSV.

**Passo 1**: Localizar o método que chama `DataParser.parseCSV()` (provavelmente `_parseData()`).

**Passo 2**: Modificar para incluir agregação:

```javascript
async _parseData(csvContent) {
    if (!csvContent) {
        throw new Error('Conteúdo CSV vazio');
    }

    // 1. Parse do CSV (cada linha vira um objeto)
    const rawRows = DataParser.parseCSV(csvContent);
    console.log(`📋 CSV parseado: ${rawRows.length} linhas`);

    // 2. NOVO: Agrupar por servidor (agregando licenças)
    const servidores = DataParser.groupByServidor(rawRows);
    console.log(`👥 Servidores agregados: ${servidores.length} servidores`);

    return servidores;
}
```

**Passo 3** (OPCIONAL): Adicionar validação após transformação:

```javascript
async loadFile(file) {
    // ... código existente de validação e load ...

    const parsedData = await this._parseData(content);
    const transformedData = await this._transformData(parsedData);

    // NOVO: Validar qualidade dos dados
    if (console.groupCollapsed) {
        const validationReport = this._validateTransformedData(transformedData);
        if (validationReport.errors.length > 0 || validationReport.warnings.length > 0) {
            console.groupCollapsed(`⚠️ Validação (${validationReport.total} servidores)`);
            if (validationReport.errors.length > 0) {
                console.error('Erros:', validationReport.errors);
            }
            if (validationReport.warnings.length > 0) {
                console.warn('Avisos:', validationReport.warnings);
            }
            console.groupEnd();
        } else {
            console.log(`✅ ${validationReport.total} servidores validados`);
        }
    }

    // ... continua com setAllServidores ...
}

_validateTransformedData(data) {
    const report = {
        total: data.length,
        errors: [],
        warnings: []
    };

    if (!Array.isArray(data)) {
        report.errors.push('Dados não são um array');
        return report;
    }

    data.forEach((servidor, index) => {
        const nome = servidor.nome || servidor.servidor;

        if (!nome) {
            report.warnings.push(`Servidor ${index}: sem nome`);
        }

        // Validar licencas é array
        if (!Array.isArray(servidor.licencas)) {
            report.errors.push(`"${nome}" (${index}): licencas não é array`);
            return;
        }

        // Validar cada licença tem Date objects
        servidor.licencas.forEach((lic, licIndex) => {
            if (!lic.inicio) {
                report.warnings.push(`"${nome}": Licença ${licIndex} sem inicio`);
            } else if (!(lic.inicio instanceof Date)) {
                report.errors.push(`"${nome}": Licença ${licIndex} inicio não é Date`);
            }

            if (lic.fim && !(lic.fim instanceof Date)) {
                report.errors.push(`"${nome}": Licença ${licIndex} fim não é Date`);
            }
        });

        // Validar campos normalizados
        if (servidor.lotacao && !servidor._lotacaoNormalizada) {
            report.warnings.push(`"${nome}": falta _lotacaoNormalizada`);
        }
    });

    return report;
}
```

---

## 📁 Arquivos a Modificar (PRIORIDADE)

| Prioridade | Arquivo | Ação | Descrição |
|-----------|---------|------|-----------|
| 🔴 **CRÍTICO** | `Js/1-core/data-flow/DataParser.js` | Adicionar `groupByServidor()` | Agregar linhas do CSV por servidor |
| 🔴 **CRÍTICO** | `Js/5-app/App.js` | Chamar `groupByServidor()` em `_parseData()` | Integrar agregação no fluxo |
| 🔴 **CRÍTICO** | `Js/1-core/data-flow/DataTransformer.js` | Adicionar normalização de datas/campos | Converter strings para Date, adicionar `_lotacaoNormalizada` |
| 🟡 **MÉDIO** | `Js/4-pages/ReportsPage.js` | Simplificar `_formatPeriodoLicenca()` | Remover parsing, apenas formatar |
| 🟡 **MÉDIO** | `Js/3-managers/features/ReportsManager.js` | Simplificar `getAllLicenses()` e `getCellValue()` | Remover parsing duplicado |
| 🟢 **BAIXO** | `Js/1-core/data-flow/DataFilter.js` | Verificar uso de campos normalizados | Já corrigido, apenas verificar |
| 🟢 **BAIXO** | `Js/5-app/App.js` | Adicionar `_validateTransformedData()` | Validação para debug |

---

## ✅ Critérios de Sucesso

Após as modificações:

1. ✅ **Agregação correta**: CSV com 8 linhas para ACACIA → 1 objeto com 8 licenças
2. ✅ **Datas normalizadas**: `licencas[].inicio` e `.fim` são Date objects (não strings)
3. ✅ **Lotação normalizada**: Filtros funcionam com "GERPLAF" encontrando "GERPLAF - Gerência..."
4. ✅ **Licenças completas**: ReportsPage mostra TODAS as licenças de cada servidor
5. ✅ **Consistência**: Todas as páginas veem os mesmos dados
6. ✅ **Sem duplicação**: Nenhuma página faz parsing próprio

---

## 🧪 Testes Sugeridos

```javascript
// Console do navegador após carregar exemplo/NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA.csv:

// 1. Verificar agregação
const allServidores = dashboard.dataStateManager.getAllServidores();
console.log('Total de servidores:', allServidores.length); // Deve ser ~300-400, não ~3000

// 2. Verificar ACACIA CHAVES tem 8 licenças
const acacia = allServidores.find(s => s.nome && s.nome.includes('ACACIA CHAVES DA SILVA COSTA'));
console.log('ACACIA CHAVES:', acacia);
console.assert(acacia, 'ACACIA CHAVES não encontrada!');
console.assert(acacia.licencas.length === 8, `ACACIA deveria ter 8 licenças, tem ${acacia.licencas.length}`);

// 3. Verificar licenças têm Date objects
acacia.licencas.forEach((lic, i) => {
    console.assert(lic.inicio instanceof Date, `Licença ${i}: inicio deveria ser Date`);
    console.assert(lic.fim instanceof Date, `Licença ${i}: fim deveria ser Date`);
});

// 4. Verificar normalização de lotação
console.log('Lotação original:', acacia.lotacao);
console.log('Lotação normalizada:', acacia._lotacaoNormalizada);
console.assert(acacia._lotacaoNormalizada, 'Falta campo _lotacaoNormalizada');

// 5. Testar filtro de lotação com acentos
const filtrados = dashboard.dataFilter.filterByField(allServidores, 'lotacao', ['GERPLAF']);
console.log('Filtrados por GERPLAF:', filtrados.length);
console.assert(filtrados.length > 0, 'Filtro de lotação não funcionou!');

// 6. Verificar ABILIO (que NÃO tem licenças - linha 2 do CSV tem data 1899)
const abilio = allServidores.find(s => s.nome && s.nome.includes('ABILIO CASTANHEIRA'));
console.log('ABILIO:', abilio);
if (abilio) {
    console.log('Licenças de ABILIO:', abilio.licencas.length); // Deve ser 0
    console.assert(abilio.licencas.length === 0, 'ABILIO não deveria ter licenças (data 1899)');
}
```

---

## 📝 Notas Importantes

### Formato do CSV

O CSV real tem:
- **Colunas**: `NOME`, `LOTACAO`, `A_PARTIR`, `TERMINO`, `GOZO`, `RESTANDO`, `AQUISITIVO_INICIO`, `AQUISITIVO_FIM`
- **Datas**: Formato `YYYY-MM-DD HH:MM:SS` (ex: `2018-11-26 00:00:00`)
- **Data vazia**: `1899-12-30 00:00:00` significa "sem licença programada"
- **Estrutura**: **UMA LINHA = UMA LICENÇA** (não uma linha por servidor!)

### Agregação

- **Chave primária**: Usar CPF se disponível, senão NOME normalizado
- **Múltiplas lotações**: Se servidor aparece em lotações diferentes, usar a mais recente
- **Licenças vazias**: Ignorar linhas com `A_PARTIR = 1899-12-30`

### Backward Compatibility

- Manter campos `servidor` e `nome` (alguns lugares usam um, outros usam outro)
- Manter campos originais (`lotacao`, `cargo`) para exibição
- Adicionar campos normalizados (`_lotacaoNormalizada`) apenas para busca

---

## 🚀 Ordem de Implementação

1. **DataParser.js**: Adicionar `groupByServidor()` (função de agregação)
2. **App.js**: Chamar `groupByServidor()` após `parseCSV()`
3. **DataTransformer.js**: Normalizar datas e adicionar campos `_lotacaoNormalizada`
4. **Testar**: Carregar CSV e verificar no console
5. **ReportsPage.js**: Simplificar formatação
6. **ReportsManager.js**: Simplificar formatação
7. **Validar**: Testes completos com CSV real

---

**Estimativa de complexidade**:
- DataParser.groupByServidor(): ~40-50 linhas
- DataTransformer normalização: ~30 linhas (adição)
- App.js integração: ~5 linhas
- ReportsPage simplificação: ~20 linhas (redução de ~66 para ~30)
- ReportsManager simplificação: ~15 linhas (redução de ~44 para ~3)

**Total**: ~100 linhas de código novo, ~80 linhas removidas/simplificadas
