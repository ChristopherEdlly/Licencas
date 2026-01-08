# lanejamento: Cálculo Correto de Períodos Aquisitivos

## Objetivo

Calcular o saldo individual de cada período aquisitivo considerando:

- Licenças antigas não registradas na planilha
- Licenças que usam múltiplos períodos de uma vez (GOZO > 90)
- Agrupamento por ano (evitar duplicação por dias diferentes)

---

## Lógica Principal

### 1. Agrupar Licenças por Período (por ANO)

```javascript
periodo_key = `${ano_inicio}_${ano_fim}`

Para cada licença:
  - Extrair ano_inicio e ano_fim do AQUISITIVO
  - Agrupar na chave periodo_key
  - Somar GOZO de cada período
```

---

### 2. Detectar Licenças Antigas Não Registradas

```javascript
Para cada período:
  soma_gozo = Σ GOZO (licenças visíveis)
  restante_calculado = 90 - soma_gozo
  restante_da_planilha = último RESTANDO das licenças deste período
  
  SE restante_calculado ≠ restante_da_planilha {
    // Há inconsistência!
  
    CASO 1: restante_calculado > restante_da_planilha
      // Há licenças antigas não registradas
      dias_faltantes = restante_calculado - restante_da_planilha
    
      // Criar período indeterminado
      periodo_indeterminado = {
        label: "Anterior a " + ano_inicio,
        diasGerados: 90,
        diasGozados: dias_faltantes,
        disponivel: 90 - dias_faltantes,
        nota: "Licenças não registradas"
      }
  
    CASO 2: restante_calculado < restante_da_planilha
      // Servidor acumulou saldo de períodos anteriores não usados
      // (Verificar se isso é possível nas regras)
  }
```

---

### 3. Dividir Licenças que Usam Múltiplos Períodos (GOZO > 90)

```javascript
Para cada licença com GOZO > 90:
  periodos_usados = Math.ceil(GOZO / 90)
  
  // Dividir o GOZO entre os períodos
  periodo_atual = período_registrado
  gozo_restante = GOZO
  
  ENQUANTO gozo_restante > 0 {
    dias_deste_periodo = Math.min(gozo_restante, 90)
  
    SE periodo_atual == período_registrado {
      // Adicionar ao período principal
      periodo_atual.diasGozados += dias_deste_periodo
    } SENÃO {
      // Criar novo período indeterminado
      periodo_indeterminado = {
        label: "Anterior a " + periodo_atual.ano_inicio,
        diasGerados: 90,
        diasGozados: dias_deste_periodo,
        disponivel: 90 - dias_deste_periodo,
        nota: "Usado em licença de " + periodo_atual.label
      }
    }
  
    gozo_restante -= dias_deste_periodo
    periodo_atual = periodo_anterior // retroceder 5 anos
  }
```

---

## Exemplo Completo: GOZO = 120

**Dados da planilha:**

```
AQUISITIVO: 29/04/2002 - 27/04/2012
GOZO: 120
RESTANDO: 0
```

**Processamento:**

1. **Período Principal (2002-2012):**

   - GOZO desta licença: 120 dias
   - Limite do período: 90 dias
   - Usado neste período: 90 dias
   - Excedente: 30 dias
2. **Período Anterior (calculado):**

   - Label: "Anterior a 2002" (ou "1997-2002")
   - Usado: 30 dias (excedente)
   - Disponível: 60 dias

**Resultado Final:**

```
Período 1997-2002 (indeterminado):
  ├─ 90 dias gerados
  ├─ 30 dias usados (33%)
  └─ 60 dias disponíveis

Período 2002-2012:
  ├─ 90 dias gerados
  ├─ 90 dias usados (100%)
  └─ 0 dias disponíveis
```

---

## Regras de Negócio

1. **Cada período = 90 dias fixos** (não acumula de períodos anteriores)
2. **RESTANDO é global** (soma de todos os períodos)
3. **Períodos de 5 anos** (quinquênio)
4. **Licenças podem ser gozadas anos depois** do período aquisitivo
5. **GOZO > 90 → múltiplos períodos** consecutivos foram usados
6. **Agrupar por ANO** (não por data exata) para evitar duplicação

---

## Implementação Pendente

- [ ] Modificar `DataTransformer.calcularPeriodosAquisitivos()`
- [ ] Adicionar detecção de licenças não registradas
- [ ] Implementar divisão de GOZO > 90
- [ ] Criar períodos "indeterminados" quando necessário
- [ ] Atualizar ModalManager para exibir períodos indeterminados
- [ ] Adicionar ícone/badge diferenciado para períodos indeterminados

---

## Questões em Aberto

1. **Períodos anteriores podem acumular?**

   - Resposta: NÃO, cada período é isolado (90 dias fixos)
2. **Como ordenar períodos indeterminados?**

   - Sugestão: Sempre antes do período registrado mais antigo
3. **Mostrar aviso quando há inconsistências?**

   - Sugestão: Badge "⚠️ Dados parciais" em períodos com licenças não registradas

# Casos de Períodos Aquisitivos

## Casos Identificados

### Caso 1: Licença Simples (dentro do limite)

```
AQUISITIVO_INICIO: 06/04/2008
AQUISITIVO_FIM: 05/04/2013
A_PARTIR: 01/04/2015
TERMINO: 30/04/2015
RESTANDO: 60(DIAS)
GOZO: 30
```

**Interpretação:**

- Período: 2008-2013
- Total gerado: 90 dias
- Usado: 30 dias
- Disponível: 60 dias ✓

---

### Caso 2: Período com licenças antigas não registradas

```
AQUISITIVO_INICIO: 08/04/2003
AQUISITIVO_FIM: 05/04/2008
A_PARTIR: 03/11/2014
TERMINO: 02/12/2014
RESTANDO: 0(DIAS)
GOZO: 30
```

**Problema:**

- Sistema calcula: 90 - 30 = 60 disponíveis
- Planilha diz: 0 disponíveis
- **Diferença:** 60 dias foram usados em licenças antigas não registradas

**Solução:**

- Criar período "Anterior a 2003" com 60 dias usados

---

### Caso 3: Licença que usa múltiplos períodos (GOZO > 90)

```
AQUISITIVO_INICIO: 29/04/2002
AQUISITIVO_FIM: 27/04/2012
A_PARTIR: 01/03/2016
TERMINO: 28/06/2016
RESTANDO: 0(DIAS)
GOZO: 120
```

**Interpretação:**

- Servidor usou licenças de **2 períodos** de uma vez
- Período 1 (2002-2007): 90 dias usados (100%)
- Período 2 (2007-2012): 30 dias usados (33%)

---

### Caso 4: Licença que usa 2 períodos completos (GOZO = 180)

```
AQUISITIVO_INICIO: 04/09/1999
AQUISITIVO_FIM: 31/08/2009
A_PARTIR: 19/02/2015
TERMINO: 17/08/2015
RESTANDO: 0(DIAS)
GOZO: 180
```

**Interpretação:**

- Servidor usou licenças de **2 períodos completos**
- Período 1 (1999-2004): 90 dias usados (100%)
- Período 2 (2004-2009): 90 dias usados (100%)

---

### Caso 5: Datas levemente diferentes no mesmo período

```
AQUISITIVO_INICIO: 06/04/2013  |  GOZO: 30
AQUISITIVO_FIM: 05/04/2018     |

AQUISITIVO_INICIO: 06/04/2013  |  GOZO: 30
AQUISITIVO_FIM: 05/04/2018     |

AQUISITIVO_INICIO: 04/04/2013  |  GOZO: 30  ← Dia diferente!
AQUISITIVO_FIM: 04/04/2018     |
```

**Problema:**

- Sistema criava 2 períodos: 06/04/2013-05/04/2018 e 04/04/2013-04/04/2018

**Solução:**

- Agrupar por ANO (2013-2018)
- Resultado: 1 período único com 90 dias usados

---

## Regras Importantes

1. **Cada período gera exatamente 90 dias** (não acumula)
2. **RESTANDO = saldo global** (todos os períodos somados)
3. **Gozo pode acontecer anos depois** do período aquisitivo
4. **GOZO > 90** indica uso de múltiplos períodos consecutivos
5. **Diferença entre calculado e RESTANDO** indica licenças antigas não registradas
