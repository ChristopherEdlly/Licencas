# Plano de Soluções: Integração com Planilha Externa

## Contexto da Decisão
Foi decidido em reunião que **cargo** e **lotação** virão de uma planilha externa (fonte de verdade), ao invés da planilha de licenças.

### Estrutura da Nova Planilha
- Cada linha = um servidor
- Colunas: CPF, NASCIMENTO, CARGO, SUPERINTENDENCIA, SUBSECRETARIA, GERENCIA

### O que muda
- Hierarquia (tabela.csv) será **deprecada**
- Lotação = coluna GERENCIA da nova planilha
- Campos de hierarquia armazenados separadamente para filtros

---

## Problema 1: Matching por CPF com formatação diferente

### O Problema
CPF pode vir em formatos diferentes entre as duas planilhas:
- `123.456.789-00` (formatado com pontos e traço)
- `12345678900` (apenas números)
- `123456789-00` (parcialmente formatado)
- ` 123.456.789-00 ` (com espaços)

Se comparar diretamente, não vai encontrar match mesmo sendo o mesmo CPF.

### Solução: Normalização antes da comparação

**Estratégia:**
1. Remover todos os caracteres não-numéricos (pontos, traços, espaços)
2. Garantir 11 dígitos (pad com zeros à esquerda se necessário)
3. Comparar apenas os dígitos

**Exemplo:**
| Planilha Licenças | Planilha Externa | Normalizado | Match? |
|-------------------|------------------|-------------|--------|
| `123.456.789-00` | `12345678900` | `12345678900` = `12345678900` | ✅ Sim |
| `12345678900` | `123.456.789-00` | `12345678900` = `12345678900` | ✅ Sim |
| `123456789-00` | `12345678900` | `12345678900` = `12345678900` | ✅ Sim |

**Por que funciona:** CPF sempre tem 11 dígitos. Removendo formatação, todos os formatos convergem para o mesmo valor.

---

## Problema 2: Servidores que não existem na planilha externa

### Entendendo o Cenário Real

**Contexto:** A planilha externa é usada pelo sistema de férias como "banco de dados" de servidores ativos. Se um servidor não está lá, significa que ele **não está mais ativo** (aposentou, foi desligado, transferido, etc.).

**Implicação:** Servidores na planilha de licenças que não estão na planilha externa são, na prática, **histórico**.

### Análise: Quem são esses servidores?

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANILHA DE LICENÇAS                         │
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │ SERVIDORES ATIVOS   │    │ SERVIDORES INATIVOS │            │
│  │ (estão na externa)  │    │ (NÃO estão na ext.) │            │
│  │                     │    │                     │            │
│  │ • Têm cargo atual   │    │ • Aposentados       │            │
│  │ • Têm lotação atual │    │ • Desligados        │            │
│  │ • Podem tirar férias│    │ • Transferidos      │            │
│  │ • Sistema precisa   │    │ • Falecidos         │            │
│  │   mostrar           │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  PERGUNTA: O que fazer com os inativos?                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Proposta Detalhada: Separação Inteligente de Dados

#### Estratégia: Duas Zonas de Dados

```
                     PLANILHA DE LICENÇAS (única)
                              │
                              │ CPF match com planilha externa?
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  ZONA ATIVA     │             │  ZONA HISTÓRICA │
    │                 │             │                 │
    │ • Match OK      │             │ • Sem match     │
    │ • Dados atuais  │             │ • Dados antigos │
    │ • Exibição      │             │ • Consulta      │
    │   principal     │             │   opcional      │
    └─────────────────┘             └─────────────────┘
```

#### Como funciona na prática:

**1. Carregamento:**
- Sistema carrega planilha de licenças
- Para cada servidor, tenta match na planilha externa (por CPF)
- Se match: marca como `status: "ativo"`
- Se não match: marca como `status: "historico"`

**2. Exibição padrão:**
- Por padrão, mostra apenas servidores ativos
- Toggle "Incluir histórico" para ver todos

**3. Tratamento dos dados:**

| Campo | Servidor Ativo | Servidor Histórico |
|-------|----------------|-------------------|
| Cargo | Da planilha externa | Da planilha de licenças (último conhecido) |
| Lotação | Da planilha externa | Da planilha de licenças (última conhecida) |
| Licenças | Todas | Todas |
| Exibição | Sempre | Opcional (toggle) |

**4. Indicador visual:**
- Ativo: Nenhum indicador especial
- Histórico: Tag discreta "Inativo" ou ícone cinza

---

### Benefícios desta Abordagem

| Aspecto | Benefício |
|---------|-----------|
| **Dados** | Não perde nenhum histórico |
| **Performance** | Carrega menos dados por padrão (só ativos) |
| **UX** | Interface limpa focada em quem importa |
| **Auditoria** | Histórico sempre acessível quando necessário |
| **Manutenção** | Uma única planilha (não precisa separar manualmente) |
| **Automático** | Sistema decide baseado no match (não precisa marcar manualmente) |

---

### Alternativas Consideradas e Descartadas

**❌ Mover para planilha separada**
- Problema: Trabalho manual, propenso a erros, difícil manter sincronizado

**❌ Deletar histórico**
- Problema: Perde informação que pode ser útil (auditorias, consultas)

**❌ Manter tudo junto sem distinção**
- Problema: Polui a visualização com pessoas que não interessam mais

**❌ Match alternativo (nome, CPF parcial)**
- Problema: Risco de falsos positivos, complexidade desnecessária
- Se não está na externa, provavelmente é inativo mesmo

---

---

## Problema 2.1: O que fazer com as colunas CARGO e LOTAÇÃO na planilha de licenças?

### O Problema Real

Se cargo e lotação vão vir da planilha externa, **as colunas CARGO e LOTAÇÃO na planilha de licenças se tornam redundantes**.

Pergunta: **Deletar essas colunas? Manter? Usar de alguma forma?**

### Análise das Opções

```
┌─────────────────────────────────────────────────────────────────────┐
│           PLANILHA DE LICENÇAS (SITUAÇÃO ATUAL)                     │
│                                                                     │
│  CPF | NOME | CARGO | LOTAÇÃO | A_PARTIR | ATE | GOZO | RESTANDO   │
│                 ↑        ↑                                          │
│                 │        │                                          │
│            Redundante?  Redundante?                                 │
│                 │        │                                          │
│         ┌──────┴────────┴──────┐                                   │
│         │   O QUE FAZER?       │                                   │
│         └──────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Opção A: Deletar as colunas

**Prós:**
- Planilha mais limpa
- Sem dados duplicados
- Menos manutenção

**Contras:**
- ❌ Perde histórico (cargo/lotação quando a licença foi concedida)
- ❌ Servidores inativos ficam sem cargo/lotação
- ❌ Se planilha externa ficar indisponível, sistema fica sem dados

**Veredicto:** ❌ Não recomendado

---

### Opção B: Manter como backup/histórico

**Como funciona:**
- Colunas permanecem na planilha de licenças
- Sistema usa planilha externa como **fonte primária**
- Se não encontrar na externa → usa valor da planilha de licenças

**Prós:**
- Histórico preservado
- Fallback para servidores inativos
- Resiliência se planilha externa falhar

**Contras:**
- Dados podem ficar desatualizados (mas não importa para inativos)
- Manutenção duplicada (mas já existe hoje)

**Veredicto:** ⚠️ Funciona, mas não é elegante

---

### Opção C: Transformar em "Cargo/Lotação na época da licença" (RECOMENDADA)

**Conceito:** As colunas CARGO e LOTAÇÃO na planilha de licenças passam a representar **o cargo e lotação quando a licença foi registrada**, não o atual.

**Por que faz sentido:**
1. Um servidor pode mudar de cargo/lotação ao longo do tempo
2. A licença foi concedida em um contexto específico
3. Para auditoria, pode ser útil saber: "Onde ele estava quando tirou essa licença?"

**Como funciona:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NOVO MODELO                                  │
│                                                                     │
│  PLANILHA EXTERNA              PLANILHA DE LICENÇAS                │
│  ┌──────────────────┐          ┌──────────────────────────────┐    │
│  │ CPF              │          │ CPF                          │    │
│  │ CARGO_ATUAL      │───┐      │ CARGO_NA_CONCESSAO          │    │
│  │ LOTACAO_ATUAL    │   │      │ LOTACAO_NA_CONCESSAO        │    │
│  │ SUPER/SUB/GER    │   │      │ A_PARTIR, ATE, GOZO, etc.   │    │
│  └──────────────────┘   │      └──────────────────────────────┘    │
│                         │                                          │
│                         ▼                                          │
│                    ┌───────────┐                                   │
│                    │ SISTEMA   │                                   │
│                    │           │                                   │
│                    │ Exibe:    │                                   │
│                    │ - ATUAL   │ ← da planilha externa             │
│                    │ - ÉPOCA   │ ← da planilha de licenças         │
│                    └───────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Exemplo prático:**

| Servidor | Cargo ATUAL (externa) | Cargo na ÉPOCA (licenças) |
|----------|----------------------|---------------------------|
| Maria | Auditor III | Auditor II |
| João | Gerente | Analista |
| Pedro (inativo) | - | Técnico |

**Benefícios:**
1. ✅ Não perde informação (cargo/lotação na época da licença)
2. ✅ Dados atuais vêm da fonte correta (externa)
3. ✅ Servidores inativos mantêm último registro
4. ✅ Histórico de progressão de carreira implícito
5. ✅ Não precisa deletar colunas (menos trabalho)
6. ✅ Útil para auditorias ("ele estava onde quando tirou licença?")

**Mudança necessária:**
- Renomear colunas na planilha (opcional, mas clarifica):
  - `CARGO` → `CARGO_CONCESSAO` ou `CARGO_EPOCA`
  - `LOTACAO` → `LOTACAO_CONCESSAO` ou `LOTACAO_EPOCA`

---

### Opção D: Sincronização automática

**Como funciona:**
- Sistema atualiza automaticamente as colunas da planilha de licenças com dados da externa
- Mantém sempre sincronizado

**Prós:**
- Dados sempre iguais

**Contras:**
- ❌ Complexidade alta (escrita na planilha)
- ❌ Perde histórico (sobrescreve valores antigos)
- ❌ Risco de erros de sincronização
- ❌ Permissões de escrita necessárias

**Veredicto:** ❌ Complexidade não justifica

---

### Recomendação Final: Opção C

**Manter as colunas como "cargo/lotação na época da concessão"**

**Ações práticas:**
1. **Não deletar** as colunas CARGO e LOTAÇÃO da planilha de licenças
2. **Renomear** (opcional) para clarificar o propósito
3. **Sistema** usa planilha externa para dados atuais
4. **Sistema** usa planilha de licenças para dados históricos/época

**Resultado:**
- Dados atuais: Planilha externa (sempre correto)
- Dados históricos: Planilha de licenças (preservado)
- Servidores inativos: Usa último registro conhecido

---

---

## Solução Final para Problema 2.1: Separação de Contextos

### Decisão do Usuário

**Listagem/Filtros:** Dados da planilha externa (atuais)
**Modal de Detalhes do Servidor:** Dados da planilha externa (atuais)
**Detalhes da Licença/Período Aquisitivo:** Botão "Ver dados na época" → mostra dados do registro original

### Fluxo Visual

```
┌─────────────────────────────────────────────────────────────┐
│  LISTAGEM (filtros funcionam com dados limpos)              │
│                                                             │
│  [Filtro: Gerência ▼] [Filtro: Cargo ▼]  ← dados externos  │
│                                                             │
│  Nome: Maria Silva | Cargo: Gerente | Lotação: SUFIP       │
│                                        [Ver detalhes]       │
└─────────────────────────────────────────────────────────────┘
                         ↓ clica
┌─────────────────────────────────────────────────────────────┐
│  MODAL: DETALHES DO SERVIDOR                                │
│                                                             │
│  Nome: Maria Silva                                          │
│  Cargo: Gerente              ← planilha externa (atual)     │
│  Superintendência: SUFIP                                    │
│  Subsecretaria: COOFIN                                      │
│  Gerência: GETES                                            │
│  ───────────────────────────────────────                    │
│  LICENÇAS:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Período: 15/03/2025 - 14/04/2025                    │   │
│  │ Gozo: 30 dias                                       │   │
│  │                      [📋 Ver dados na época]        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓ clica "Ver dados na época"
┌─────────────────────────────────────────────────────────────┐
│  DADOS DO REGISTRO ORIGINAL                                 │
│                                                             │
│  Cargo no registro: Analista    ← planilha de licenças      │
│  Lotação no registro: GETES     ← planilha de licenças      │
│  (como estava quando a licença foi registrada)              │
└─────────────────────────────────────────────────────────────┘
```

### Benefícios

1. ✅ Filtros funcionam com dados limpos (planilha externa)
2. ✅ Hierarquia correta para navegação
3. ✅ Histórico preservado e acessível
4. ✅ Não precisa alterar planilha de licenças
5. ✅ Contexto claro (atual vs época)

---

## Dados da Planilha Externa

### Localização
- **Arquivo:** LOTAÇÃO GERAL SERVIDORES.xlsx
- **Site:** sefazsegovbr.sharepoint.com/sites/SUGEP
- **Aba:** "Censo Enrriquecido"
- **Tabela:** TblServidores

### Colunas Disponíveis

| Coluna | Uso no Sistema |
|--------|----------------|
| `SERVIDOR` | Nome do servidor |
| `CPF` | Chave de matching |
| `CPFLimpo` | CPF já normalizado (sem formatação) |
| `CARGO` | Cargo atual |
| `FUNÇÃO` | Função (se diferente do cargo) |
| `DN` | Data de nascimento |
| `IDADE` | Idade calculada |
| `ADMISSÃO` | Data de admissão |
| `T.SERVIÇO` | Tempo de serviço |
| `SEXO` | Sexo |
| `Após. Comp.` | Data aposentadoria compulsória |
| `Subsecretaria/Gabinete` | Nível hierárquico 1 |
| `Superintendência` | Nível hierárquico 2 |
| `Gerência/CEAC` | Nível hierárquico 3 (LOTAÇÃO PRINCIPAL) |
| `Coordenadoria/Posto Fiscal` | Nível hierárquico 4 (se aplicável) |
| `Telefone` | Contato |
| `E-mail` | E-mail institucional |

### Mapeamento de Campos

```
PLANILHA EXTERNA          →    SISTEMA
─────────────────────────────────────────
CPFLimpo                  →    cpf (matching)
SERVIDOR                  →    nome
CARGO                     →    cargo
Gerência/CEAC             →    lotacao (exibição principal)
Subsecretaria/Gabinete    →    subsecretaria
Superintendência          →    superintendencia
Coordenadoria/Posto Fiscal →   coordenadoria (opcional)
DN                        →    dataNascimento
ADMISSÃO                  →    dataAdmissao
SEXO                      →    sexo
Após. Comp.               →    aposentadoriaCompulsoria
```

### Vantagem: CPFLimpo

A planilha externa já tem a coluna `CPFLimpo` com CPF normalizado!
- Isso simplifica o matching
- Não precisa normalizar no sistema (já está pronto)

---

## Problema 3: Como usar as 4 colunas de lotação

### Estrutura Hierárquica Real

```
Subsecretaria/Gabinete
    └── Superintendência
            └── Gerência/CEAC
                    └── Coordenadoria/Posto Fiscal (opcional)
```

### Decisão: Gerência/CEAC como Lotação Principal

**Campo `lotacao`** = valor da coluna `Gerência/CEAC`

**Hierarquia completa armazenada para filtros:**
- `subsecretaria` = Subsecretaria/Gabinete
- `superintendencia` = Superintendência
- `gerencia` = Gerência/CEAC (= lotação principal)
- `coordenadoria` = Coordenadoria/Posto Fiscal (quando existir)

---

## Resumo Final das Soluções

| Problema | Solução |
|----------|---------|
| **1. CPF com formatação** | Usar coluna `CPFLimpo` da planilha externa (já normalizado) |
| **2. Servidor não encontrado** | Marcar como "histórico", ocultar por padrão, toggle para mostrar |
| **2.1 Colunas redundantes** | Manter na planilha de licenças, exibir como "dados na época" via botão |
| **3. Hierarquia de lotação** | `Gerência/CEAC` como lotação principal, demais níveis para filtros |

---

## Configuração da Planilha Externa

| Item | Valor |
|------|-------|
| **Arquivo** | LOTAÇÃO GERAL SERVIDORES.xlsx |
| **SharePoint** | sefazsegovbr.sharepoint.com/sites/SUGEP |
| **Aba** | Censo Enrriquecido |
| **Tabela** | TblServidores |
| **Coluna de Match** | CPFLimpo |

---

## Fluxo Resumido

```
1. Carregar planilha de licenças
2. Carregar planilha externa (TblServidores)
3. Para cada servidor na planilha de licenças:
   │
   ├─ CPFLimpo encontrado na externa?
   │   ├─ SIM → status: "ativo", usa dados externos para servidor.cargo/lotacao
   │   └─ NÃO → status: "historico", usa dados da licença
   │
4. Exibição:
   ├─ Listagem/Filtros: dados externos (atuais)
   ├─ Modal detalhes: dados externos (atuais)
   └─ Detalhes licença: botão "ver dados na época" → licenca.CARGO/LOTACAO
```

---

## Descoberta Importante: Histórico Já Existe!

O sistema atual **já preserva** cargo/lotação por licença:

```javascript
servidor.cargo = "Último valor"           // ❌ Sobrescrito
servidor.lotacao = "Último valor"         // ❌ Sobrescrito

servidor.licencas[0].CARGO = "Analista"   // ✅ Preservado!
servidor.licencas[0].LOTACAO = "GERP"     // ✅ Preservado!

servidor.licencas[1].CARGO = "Auditor"    // ✅ Preservado!
servidor.licencas[1].LOTACAO = "GEADP"    // ✅ Preservado!
```

**Implicação:** Não preciso criar estrutura nova de histórico. Apenas:
1. Substituir `servidor.cargo/lotacao` com dados da planilha externa
2. Exibir `licenca.CARGO/LOTACAO` na UI via botão "ver dados na época"

---

## Implementação Final

### O que vou fazer:

1. **Criar serviço para carregar planilha externa** (`ServidorMasterDataService.js`)
   - Conectar ao SharePoint SUGEP
   - Carregar tabela TblServidores
   - Criar mapa CPFLimpo → dados

2. **Modificar fluxo de dados** (`DataLoader.js` ou `App.js`)
   - Após carregar licenças, carregar planilha externa
   - Para cada servidor: buscar por CPFLimpo
   - Se encontrar: atualizar `servidor.cargo/lotacao/hierarquia` com dados externos
   - Se não encontrar: marcar como histórico

3. **Modificar UI** (`ModalManager.js`)
   - No modal de detalhes: mostrar dados atuais (externos)
   - Nos cards de licença: adicionar botão "Ver dados na época"
   - Botão mostra `licenca.CARGO` e `licenca.LOTACAO` (já existem!)

4. **Adicionar toggle para histórico** (`HomePage.js`)
   - Checkbox "Incluir servidores inativos"
   - Por padrão: desmarcado

5. **Indicadores visuais** (CSS)
   - Tag "Inativo" para servidores sem match

### O que NÃO vou fazer:

- ❌ Alterar planilha de licenças
- ❌ Criar nova estrutura de histórico (já existe!)
- ❌ Match fuzzy (apenas CPFLimpo exato)
