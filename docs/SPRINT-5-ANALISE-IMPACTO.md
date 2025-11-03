# Sprint 5 - Análise de Impacto Operacional

## 📋 Visão Geral

**Objetivo**: Implementar análise inteligente do impacto operacional das licenças nos departamentos, permitindo visualizar gargalos, calcular capacidade disponível e receber sugestões de redistribuição.

**Status**: ✅ COMPLETO  
**Data de Conclusão**: Janeiro 2025  
**Sprint Anterior**: Sprint 4 (Notificações e Relatórios) - ✅ Completo

---

## 🎯 Funcionalidades Implementadas

### 1. **OperationalImpactAnalyzer.js** (~600 linhas) ✅

**Arquivo**: `js/modules/OperationalImpactAnalyzer.js`

**Responsabilidade**: Analisar impacto operacional completo das ausências por licença

**Funcionalidades Principais**:

#### 📊 Análise por Departamento
- ✅ Agrupamento automático por Lotação/Superintendência/Subsecretaria
- ✅ Cálculo de capacidade disponível por mês (%)
- ✅ Identificação de servidores ausentes vs disponíveis
- ✅ Detecção de meses críticos (> 30-40% ausentes)
- ✅ Score de risco (0-100) por departamento

#### 📈 Análise Global
- ✅ Visão geral de todos os departamentos
- ✅ Média de ausências mensal
- ✅ Pico de ausências (mês com mais afastados)
- ✅ Meses sem ausências programadas

#### ⚠️ Detecção de Períodos Críticos
- ✅ Identificação de meses onde múltiplos departamentos estão afetados
- ✅ Cálculo de gravidade (nº departamentos × % ausente)
- ✅ Ordenação por prioridade de intervenção

#### 💡 Sugestões Inteligentes
- ✅ Redistribuição de licenças para meses menos afetados
- ✅ Priorização por nível de urgência do servidor
- ✅ Top 3 meses alternativos com maior disponibilidade

#### 📉 Visualizações
- ✅ Heatmap de ausências (dados estruturados)
- ✅ Gráficos de capacidade mensal (Chart.js ready)
- ✅ Comparação disponível vs. ausente

---

## 🏗️ Arquitetura

### Estrutura de Dados

#### Análise Completa (Retorno de `analyze()`)
```javascript
{
    timestamp: 1704153600000,
    totalServidores: 250,
    
    byDepartment: {
        "GEROT": {
            nome: "GEROT",
            totalServidores: 30,
            capacidadePorMes: {
                "2025-03": {
                    disponivel: 60,      // %
                    ausente: 40,         // %
                    servidoresAusentes: 12,
                    servidoresDisponiveis: 18,
                    nivel: "high"        // 'normal', 'warning', 'high', 'critical'
                },
                // ...outros meses
            },
            mesesCriticos: [
                {
                    mes: "2025-03",
                    ausente: 40,
                    servidoresAusentes: 12,
                    nivel: "high"
                }
            ],
            riskScore: 68,              // 0-100
            status: "Alto Risco"        // 'Normal', 'Moderado', 'Alto Risco', 'Crítico'
        },
        // ...outros departamentos
    },
    
    global: {
        totalServidores: 250,
        capacidadePorMes: { /* similar ao byDepartment */ },
        mediaAusencias: 8.5,
        picoAusencias: 25,
        mesesSemAusencias: 2
    },
    
    criticalPeriods: [
        {
            mes: "2025-03",
            departamentos: [
                { nome: "GEROT", ausentes: 12, porcentagem: 40, nivel: "high" },
                { nome: "DIPAT", ausentes: 8, porcentagem: 35, nivel: "high" }
            ],
            totalAusentes: 20,
            mediaPorcentagem: 37.5,
            gravidade: 75               // departamentos × média
        }
    ],
    
    suggestions: [
        {
            tipo: "redistribuicao",
            departamento: "GEROT",
            problematico: "2025-03",
            ausentes: 12,
            porcentagem: 40,
            nivel: "high",
            servidores: [
                { nome: "João Silva", urgencia: "Baixa", periodo: {...} },
                { nome: "Maria Santos", urgencia: "Moderada", periodo: {...} }
            ],
            mesesAlternativos: [
                { mes: "2025-04", disponibilidade: 85 },
                { mes: "2025-05", disponibilidade: 82 },
                { mes: "2025-02", disponibilidade: 80 }
            ]
        }
    ],
    
    summary: {
        totalDepartamentos: 15,
        departamentosComProblemas: 5,
        totalMesesCriticos: 3,
        departamentoMaiorRisco: {
            nome: "GEROT",
            riskScore: 68,
            status: "Alto Risco"
        },
        status: "Atenção"               // 'Normal', 'Atenção', 'Alto Risco', 'Crítico'
    }
}
```

---

## 💻 API Completa

### Métodos Principais

#### `analyze(servidores)` → `Object`
Analisa impacto operacional completo.

**Parâmetros**:
- `servidores` (Array): Lista de todos os servidores com períodos de licença

**Retorna**: Objeto com análise completa (ver estrutura acima)

**Exemplo**:
```javascript
const analyzer = new OperationalImpactAnalyzer(dashboard);
const result = analyzer.analyze(dashboard.allServidores);

console.log(result.summary);
// {
//     totalDepartamentos: 15,
//     departamentosComProblemas: 5,
//     status: "Atenção"
// }
```

---

#### `analyzeDepartment(name, servidores)` → `Object`
Analisa um departamento específico.

**Parâmetros**:
- `name` (string): Nome do departamento
- `servidores` (Array): Servidores do departamento

**Retorna**: Análise do departamento

---

#### `generateHeatmap(analysisResult)` → `Array`
Gera dados para heatmap de ausências.

**Retorna**: Array de objetos `{mes, valor, nivel, disponivel}`

**Exemplo**:
```javascript
const heatmapData = analyzer.generateHeatmap(result);
// [
//     { mes: "2025-01", valor: 15, nivel: "normal", disponivel: 85 },
//     { mes: "2025-02", valor: 25, nivel: "warning", disponivel: 75 },
//     { mes: "2025-03", valor: 40, nivel: "high", disponivel: 60 }
// ]
```

---

#### `generateCapacityChart(analysisResult, departamento?)` → `Object`
Gera dados para gráfico Chart.js.

**Parâmetros**:
- `analysisResult` (Object): Resultado de `analyze()`
- `departamento` (string, opcional): Nome do dept. Se null, usa global

**Retorna**: Objeto com formato Chart.js

**Exemplo**:
```javascript
const chartData = analyzer.generateCapacityChart(result, 'GEROT');

// Usar com Chart.js:
new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: { /* ... */ }
});
```

---

#### `detectCriticalPeriods(departmentAnalyses)` → `Array`
Detecta meses onde múltiplos departamentos têm problemas.

**Retorna**: Array de períodos críticos ordenados por gravidade

---

#### `generateSuggestions(departmentAnalyses, servidores)` → `Array`
Gera sugestões inteligentes de redistribuição.

**Retorna**: Array de sugestões ordenadas por prioridade

**Exemplo**:
```javascript
const suggestions = result.suggestions;

suggestions.forEach(sug => {
    console.log(`📍 ${sug.departamento} - ${sug.problematico}`);
    console.log(`   ${sug.ausentes} ausentes (${sug.porcentagem}%)`);
    console.log(`   Sugestão: Mover para ${sug.mesesAlternativos[0].mes}`);
});
```

---

## 🎯 Thresholds Configuráveis

```javascript
this.thresholds = {
    critical: 40,      // >= 40% ausentes = CRÍTICO
    high: 30,          // >= 30% ausentes = ALTO
    warning: 20        // >= 20% ausentes = AVISO
};
```

**Personalização**:
```javascript
analyzer.thresholds.critical = 50; // Aumentar limite crítico
analyzer.thresholds.warning = 15;  // Diminuir limite de aviso
```

---

## 📊 Níveis de Risco

### Por Percentual de Ausentes

| % Ausente | Nível | Cor Sugerida | Ação |
|-----------|-------|--------------|------|
| < 20% | Normal | 🟢 Verde | Nenhuma ação necessária |
| 20-29% | Warning | 🟡 Amarelo | Monitorar |
| 30-39% | High | 🟠 Laranja | Considerar redistribuição |
| ≥ 40% | Critical | 🔴 Vermelho | **Ação imediata** |

### Score de Risco (0-100)

| Score | Status | Descrição |
|-------|--------|-----------|
| 0-24 | Normal | Operação sem problemas |
| 25-49 | Moderado | Atenção recomendada |
| 50-74 | Alto Risco | Intervenção recomendada |
| 75-100 | Crítico | **Intervenção urgente** |

---

## 🔧 Integração com Dashboard

### Inicialização

No `dashboard.js`:
```javascript
class Dashboard {
    constructor() {
        // ...outros managers
        this.impactAnalyzer = new OperationalImpactAnalyzer(this);
    }
}
```

### Executar Análise

Após carregar dados:
```javascript
// Executar análise
const impactResult = this.impactAnalyzer.analyze(this.allServidores);

// Exibir resumo
console.log('📊 Status Operacional:', impactResult.summary.status);

// Verificar sugestões
if (impactResult.suggestions.length > 0) {
    console.log(`💡 ${impactResult.suggestions.length} sugestões disponíveis`);
}
```

---

## 🎨 Visualizações Sugeridas

### 1. Heatmap de Ausências (Calendário Anual)

**Dados**: `generateHeatmap(result)`

**Visual Sugerido**:
```
      JAN  FEV  MAR  ABR  MAI  JUN  JUL  AGO  SET  OUT  NOV  DEZ
2025  🟢   🟡   🔴   🟢   🟢   🟡   🟠   🟢   🟢   🟡   🟢   🟢
      15%  25%  40%  10%  12%  22%  35%  18%  16%  28%  14%  20%
```

**Implementação CSS**:
```css
.heatmap-cell {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s;
}

.heatmap-cell.normal { background: #10b981; }
.heatmap-cell.warning { background: #f59e0b; }
.heatmap-cell.high { background: #f97316; }
.heatmap-cell.critical { background: #ef4444; }

.heatmap-cell:hover {
    transform: scale(1.1);
    cursor: pointer;
}
```

---

### 2. Gráfico de Capacidade Mensal

**Dados**: `generateCapacityChart(result, departamento)`

**Tipo**: Line Chart (Chart.js)

**Visual**:
```
100% ┤              ●──●──●     
     ┤           ●              
 80% ┤        ●                 
     ┤     ●           ●──●──●  
 60% ┤  ●                       
     ┤                          
 40% ┤──────────────────────────
     └─┬───┬───┬───┬───┬───┬───
      JAN FEV MAR ABR MAI JUN  
      
  ● Disponível    ● Ausente
```

---

### 3. Dashboard de Departamentos

**Layout Sugerido**:
```html
<div class="department-grid">
    <!-- Para cada departamento -->
    <div class="dept-card" data-risk="high">
        <div class="dept-header">
            <h4>GEROT</h4>
            <span class="risk-badge high">Alto Risco</span>
        </div>
        <div class="dept-stats">
            <div class="stat">
                <span class="label">Risk Score</span>
                <span class="value">68/100</span>
            </div>
            <div class="stat">
                <span class="label">Meses Críticos</span>
                <span class="value">3</span>
            </div>
            <div class="stat">
                <span class="label">Total Servidores</span>
                <span class="value">30</span>
            </div>
        </div>
        <button class="btn-view-details">Ver Detalhes</button>
    </div>
</div>
```

---

## 🧪 Casos de Uso

### Cenário 1: Gargalo Detectado
```javascript
const result = analyzer.analyze(servidores);

// Verificar períodos críticos
if (result.criticalPeriods.length > 0) {
    const piorMes = result.criticalPeriods[0];
    
    console.log(`⚠️ Período crítico: ${piorMes.mes}`);
    console.log(`   ${piorMes.departamentos.length} departamentos afetados`);
    console.log(`   ${piorMes.totalAusentes} servidores ausentes`);
    
    // Buscar sugestões para este mês
    const sugestoes = result.suggestions.filter(s => s.problematico === piorMes.mes);
    console.log(`💡 ${sugestoes.length} sugestões de redistribuição disponíveis`);
}
```

---

### Cenário 2: Análise de Departamento Específico
```javascript
const deptData = result.byDepartment['GEROT'];

console.log(`📊 Análise de GEROT:`);
console.log(`   Risk Score: ${deptData.riskScore}/100`);
console.log(`   Status: ${deptData.status}`);
console.log(`   Meses críticos: ${deptData.mesesCriticos.length}`);

// Listar meses críticos
deptData.mesesCriticos.forEach(mes => {
    console.log(`   - ${mes.mes}: ${mes.ausente}% ausentes (${mes.nivel})`);
});
```

---

### Cenário 3: Geração de Relatório de Sugestões
```javascript
const suggestions = result.suggestions;

console.log(`💡 RELATÓRIO DE SUGESTÕES (${suggestions.length} total)\n`);

suggestions.forEach((sug, i) => {
    console.log(`${i + 1}. ${sug.departamento} - ${sug.problematico}`);
    console.log(`   Problema: ${sug.ausentes} ausentes (${sug.porcentagem}%)`);
    console.log(`   Nível: ${sug.nivel.toUpperCase()}`);
    console.log(`   Sugestão: Redistribuir ${sug.servidores.length} servidores`);
    console.log(`   Meses alternativos:`);
    sug.mesesAlternativos.forEach(alt => {
        console.log(`      - ${alt.mes} (${alt.disponibilidade}% disponível)`);
    });
    console.log('');
});
```

---

## 🚀 Próximos Passos (Opcional)

### Interface Visual Completa (Sprint 5B - Opcional)
Se desejar adicionar UI completa:

1. **Nova Aba "Análise de Impacto"**
   - Heatmap interativo
   - Gráficos de capacidade
   - Lista de sugestões clicáveis

2. **Modal de Sugestões**
   - Detalhes da redistribuição
   - Botões "Aplicar" / "Rejeitar"
   - Simulação de resultados

3. **Exportação de Análise**
   - PDF com heatmap + gráficos
   - Excel com sugestões

---

## 📈 Métricas de Implementação

| Componente | Linhas de Código | Complexidade | Status |
|------------|------------------|--------------|---------|
| OperationalImpactAnalyzer.js | ~600 | Alta | ✅ 100% |
| Análise por Departamento | ~150 | Média | ✅ 100% |
| Detecção de Críticos | ~80 | Média | ✅ 100% |
| Sugestões Inteligentes | ~120 | Alta | ✅ 100% |
| Geração de Visualizações | ~100 | Baixa | ✅ 100% |
| **TOTAL Sprint 5** | **~600** | **Alta** | **✅ 100%** |

---

## ✅ Checklist de Implementação

### Fase 1: Core (Completo)
- [x] Criar OperationalImpactAnalyzer.js
- [x] Implementar agrupamento por departamento
- [x] Calcular capacidade mensal
- [x] Detectar períodos críticos
- [x] Gerar sugestões de redistribuição
- [x] Implementar scores de risco
- [x] Gerar dados para visualizações

### Fase 2: Integração (Completo)
- [x] Integrar no dashboard.js
- [x] Testar com dados reais
- [x] Validar cálculos
- [x] Documentar API

### Fase 3: Visualizações (Opcional - Futuro)
- [ ] Criar heatmap UI
- [ ] Criar gráficos de capacidade
- [ ] Criar dashboard de departamentos
- [ ] Criar modal de sugestões

### Fase 4: Exportação (Opcional - Futuro)
- [ ] Exportar análise para PDF
- [ ] Exportar sugestões para Excel
- [ ] Incluir em ReportsManager

---

## 🎉 Resumo

Sprint 5 implementa análise avançada de impacto operacional, permitindo:

✅ **Visibilidade**: Ver capacidade disponível por departamento/mês  
✅ **Detecção Proativa**: Identificar gargalos antes que se tornem problemas  
✅ **Sugestões Inteligentes**: Recomendações de redistribuição automáticas  
✅ **Visualizações Prontas**: Dados estruturados para heatmaps e gráficos  
✅ **Escalável**: Funciona com 10-2000+ servidores  

**Total de código**: ~600 linhas  
**Tempo de desenvolvimento**: Sprint de 2 semanas  
**Impacto**: Alto - Ferramenta estratégica para gestão de RH  

---

*Documento criado em Janeiro 2025 - Dashboard de Licenças Prêmio*
*Sprint 5: Análise de Impacto Operacional*
