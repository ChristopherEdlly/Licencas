# Dashboard de Licenças — Manual de Continuidade

Este repositório contém um painel (dashboard) para visualização e análise de cronogramas de licenças de servidores. Foi desenvolvido como um projeto frontend leve (HTML/CSS/JS) com um parser próprio para interpretar cronogramas exportados de planilhas.

 # Dashboard de Licenças

 Este repositório contém um dashboard frontend (HTML/CSS/JS) para visualização e análise de cronogramas de licenças de servidores.

 Documentação principal (em português):

 - `docs/USO.md` — Guia de uso: como preparar a planilha/CSV, exemplos, passos para carregar e interpretar os resultados.
 - `docs/DESENVOLVEDOR.md` — Guia técnico: arquitetura, funções e handlers do parser, entrada/saída de cada função, como estender e testar.

 OBS: Se desejar, eu faço o commit e push desses arquivos para o repositório quando autorizar.

---

**Última atualização:** 2025-09-23

**Observação importante sobre o repositório remoto:** o remoto principal foi movido para `https://github.com/ChristopherEdlly/Licencas.git`. Verifique o `git remote -v` e atualize seu `origin` se necessário.

---

**Índice**
- Visão Geral
- Arquitetura e arquivos chave
- Funcionalidades principais
- Formato de entrada (CSV) e exemplos
- Como rodar localmente
- Desenvolvimento e workflow
- Como o parser funciona (cronograma)
- Debugging e testes rápidos
- Checklist para continuidade / Handoff
- Melhores práticas e ideias futuras
Josivania Maria Santos,00000000000,Of. Administrativo,"Janeiro/2025,fevereiro/2026",14
```

- Exemplos de formatos que o parser tenta reconhecer:
  - `Janeiro/2025` ou `Jan/25`
  - `16/11/25` (interpreta como data específica)
  - `Início em 01/2025 (12 meses consecutivos)`
  - `Janeiro a cada ano, a partir de 2027`


**Como rodar localmente (rápido)**
- Requisitos: navegador moderno (Chrome/Edge/Firefox). Node/NPM não são obrigatórios.
- Modo rápido: abra `index.html` no navegador (recomendado via servidor local para evitar restrições de CORS quando carregar arquivos):

```bash
# Usando Python 3 (servidor simples)
python3 -m http.server 8000
# abra http://localhost:8000 no navegador
```

- Carregue um CSV via interface (botão de upload) ou edite `teste_completo.csv` para testes.


**Desenvolvimento e workflow**
- Para mudanças rápidas em CSS/JS: editar arquivos em `css/` e `js/`, recarregar a página.
- Commit/push padrão:

```bash
git add -A
git commit -m "feat: descrição curta"
git push origin main
```

- Se o remoto foi movido (mensagem do servidor), atualize `origin` com:

```bash
git remote set-url origin https://github.com/ChristopherEdlly/Licencas.git
git push -u origin main
```


**Como o parser funciona (resumo técnico)**
- Arquivo principal: `js/cronogramaParser.js`.
- Fluxo geral:
  1. `processarDadosCSV(csvData)` divide linhas e headers, cria objetos `servidor` por linha.
  2. Para cada `servidor.cronograma`, chamamos `parseCronograma(cronograma)` — que tenta vários "handlers" em ordem: `handleInicioEm`, `handleAPartirDe`, `handleDataEspecificaComAnual`, `handleDatasEspecificas`, `handleMesesListados`, `handleMesAno`, `handleMesAnoUmaPorAno`.
  3. Para licenças prêmio (formato `inícioMes,finalMes`), existe `processarPeriodoLicencaPremio` e `processarPeriodoLicencaPremioMultiplo` que agora entendem meses com anos e iteram mês-a-mês gerando cada licença com `inicio` (1º dia) e `fim` (último dia desse mês).
  4. Datas com ano em dois dígitos são normalizadas (`adjustYear`).

- Entrada ambígua: o parser tenta detectar padrões ambíguos e, em alguns casos, retorna `[]` (cronograma não interpretado) e marca `servidor.cronogramaComErro = true` para facilitar revisão manual.


**Debugging e testes rápidos (desenvolvimento)**

- Para debug e testes rápidos veja `docs/DESENVOLVEDOR.md` — lá constam instruções sobre como habilitar logs e executar casos de teste de forma controlada.

- O parser expõe pontos onde logs podem ser ativados de forma controlada; prefira usar uma API do parser (ex: `parser.setDebug(true)`) ou habilitar logs centralizados em vez de definir variáveis globais diretamente.

```note
Se precisar executar um teste local rápido, consulte `docs/USO.md` e `docs/DESENVOLVEDOR.md` para o fluxo recomendado; evite deixar flags de debug globais no código de produção.
```


**Checklist para continuidade / Handoff**
- Prioridade imediata para TI que for assumir:
  - Revisar `js/cronogramaParser.js` — este é o núcleo da lógica; compreenda cada handler.
  - Verificar entradas reais do CSV que serão usadas em produção — ajustar handlers ou adicionar padrões conforme formatos que o RH fornecer.
  - Revisar `css/new-styles.css` para componentes visuais; as variáveis no topo do arquivo controlam as cores do site.
  - Remover dados sensíveis em `teste_completo.csv` antes de compartilhar publicamente.
  - Ajustar o remoto Git: atualizar `origin` se o repositório foi movido.

- Arquivos/locais que merecem atenção:
  - `index.html` — estrutura do modal e marcação de conteúdo dinâmico
  - `js/dashboard.js` — renderização de cartões e interação do usuário
  - `js/cronogramaParser.js` — parsing e regras de transformação
  - `css/new-styles.css` — estilos e temas (light/dark variables)


**Sugestões de melhorias (prioritárias)**
- Cobertura de testes automatizados (unit tests) para `cronogramaParser` — sugerido usar Jest (Node) com pequenos harnesses que validem todos os exemplos reais de CSV.
- Normalizar/forçar headers do CSV (mapear sinônimos de colunas) para reduzir erros na produção.
- Adicionar página de administração com upload de CSV e validação prévia (report de linhas com problemas).
- Internacionalização (i18n) se precisar atender unidades com diferentes formatos de data.


**Padrões de código / Contribuição**
- JavaScript: estilo imperativo, funções responsáveis por um único propósito preferencialmente.
- CSS: variáveis no topo de `new-styles.css` definem cores. Reutilizar `--primary`, `--primary-dark`, `--bg-primary`, etc.


**Licença e dados sensíveis**
- Se houver dados pessoais (nomes, CPFs, datas), trate com cautela e remova antes de publicar. Repositorio atual contém exemplos; revisar antes de disponibilizar publicamente.


**Contatos / Observações finais**
- Se alguém da TI for assumir, recomendo começar por testar com os CSVs reais do RH, habilitar os logs do parser e ajustar os patterns.
- Se quiser, eu posso:
  - adicionar um conjunto de testes automatizados para `cronogramaParser.js` (Jest + cases), ou
  - abrir um documento `MIGRATION.md` com notas de deploy (como atualizar remotes e configurar servidor simples).

---

Obrigado pelo trabalho e boa transição — deixei comentários importantes no código e marquei áreas sensíveis no `js/cronogramaParser.js` e `css/new-styles.css` para facilitar a continuidade.
