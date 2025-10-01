# Guia do Desenvolvedor

## Sumário

- [Visão rápida](#resumo)
- [js/cronogramaParser.js](#arquivo-js-cronograma-parser)
- [js/dashboard.js](#arquivo-js-dashboard-js)
- [js/themeManager.js](#arquivo-js-theme-manager-js)

---

<a id="Resumo"></a>

Bem-vindo ao Guia do Desenvolvedor do dashboard de licenças. Esta página é um mapa funcionais das principais unidades JavaScript do projeto — suficiente para entender responsabilidades, assinaturas, efeitos colaterais e decisões importantes que impactam manutenção ou alterações rápidas.

O que você encontrará aqui
- Sumário navegável para saltar direto às seções de cada arquivo.
- Documentação por arquivo (`js/cronogramaParser.js`, `js/dashboard.js`, `js/themeManager.js`) com: assinatura, propósito, parâmetros, retorno e efeitos colaterais.
- Observações de implementação e casos de borda importantes para testes e refatoração.

Como usar este documento (rápido)
- Leia o Sumário para localizar o arquivo/funcionalidade de interesse.
- Cada função tem: Assinatura | Propósito | Parâmetros | Retorno | Efeitos colaterais | Casos de borda | Exemplo rápido (quando aplicável).
- Use a seção "Casos de borda" antes de alterar parsing ou persistência — essas são as situações que mais quebram o sistema em produção.

Contrato resumido (2–4 itens)
- Inputs: CSV (geralmente convertido de `.xlsx`) ou File/Blob/strings fornecidos pela UI.
- Outputs: arrays de objetos `servidor` com campo `licencas` (cada licença contém `{inicio, fim, tipo, descricao}`) e objetos de estatísticas agregadas.
- Erros: funções de leitura retornam Promises que rejeitam em falha; parsing pode retornar arrays vazios `[]` para sinalizar que não interpretou com confiança.
- Efeitos colaterais esperados: manipulação do DOM (render), gravação em localStorage/IndexedDB e logs condicionais quando `debug` está ativo.

Casos de borda principais
- CSV com campos multilinha dentro de células — o parser CSV simples pode falhar; prefira pré-processar com biblioteca robusta quando houver entradas complexas.
- Cronogramas sem ano explícito — heurísticas conservadoras são aplicadas e podem produzir [] (não interpretado).
- Intervalos que atravessam anos (ex.: nov → fev) — atenção na inferência de ano final.
- Tamanhos de arquivo grandes (> ~5MB) — fallback de persistência pode ocorrer (IndexedDB/localStorage) e salvamento imediato pode falhar.

---

<a id="arquivo-js-cronograma-parser"></a>
## Arquivo: js/cronogramaParser.js

  Observação geral: o parser recebe como entrada o CSV (geralmente gerado a partir de uma planilha Excel pela camada superior) e tenta extrair, por linha, uma lista de licenças mensais ou períodos, obedecendo heurísticas.

  constructor()
  - Assinatura: new CronogramaParser()
  - Propósito: inicializar estruturas internas (mapas de meses, flags de debug e config padrão).
  - Parâmetros: nenhum
  - Retorno: instância de CronogramaParser
  - Efeitos colaterais: cria propriedades internas: mesesAbrev, mesesCompletos, debug (false por padrão)
  - Exemplo:
    const parser = new CronogramaParser();
  - Casos de borda: nenhuma entrada esperada

  setDebug(flag)
  - Assinatura: setDebug(flag: boolean)
  - Propósito: habilitar logs verbosos para diagnóstico
  - Parâmetros: flag — boolean (true: logs ativos; false: logs silenciosos)
  - Retorno: void
  - Efeitos colaterais: define this.debug = !!flag
  - Exemplo: parser.setDebug(true)

  normalizeMonthKey(raw)
  - Assinatura: normalizeMonthKey(raw)
  - Propósito: normalizar texto de mês removendo acentos, pontuação e espaços; converte para minúsculas
  - Parâmetros: raw — string | any
  - Retorno: string (ex.: 'janeiro') ou '' quando inválido
  - Efeitos colaterais: nenhum
  - Exemplo: normalizeMonthKey('Janeiro') -> 'janeiro'
  - Casos de borda: aceita null/undefined, retorna '' nesses casos

  normalizeKey(key)
  - Assinatura: normalizeKey(key)
  - Propósito: normalizar cabeçalhos de coluna (remoção de acentos e uppercase)
  - Parâmetros: key — string
  - Retorno: string normalizado (EX.: 'SERVIDOR') ou ''
  - Efeitos colaterais: nenhum

  getField(dados, names)
  - Assinatura: getField(dados: Object, names: string | string[])
  - Propósito: procurar um campo em `dados` por uma lista de nomes possíveis (case-insensitive, sem acentos)
  - Parâmetros:
    - dados: Object — objeto mapeado por headers (ex.: { SERVIDOR: 'Maria', CRONOGRAMA: '...' })
    - names: string | string[] — um nome ou lista de nomes alternativos (ex.: ['SERVIDOR','NOME'])
  - Retorno: o valor do campo encontrado (string) ou '' quando não encontrado
  - Efeitos colaterais: nenhum
  - Exemplo: getField(row, ['SERVIDOR','NOME'])
  - Casos de borda: quando nenhum header casa, pode tentar correspondência por inclusão (contains) em headers existentes — resultado pode ser incorreto se headers curtos/ambíguos

  parseLinha(linha, headers)
  - Assinatura: parseLinha(linha: string, headers: string[])
  - Propósito: parser CSV simples que respeita aspas e vírgulas internas; retorna um objeto mapeado por header
  - Parâmetros:
    - linha: string — uma linha CSV
    - headers: string[] — lista de headers já extraídos
  - Retorno: Object mapeado por header (ex.: { SERVIDOR: 'x', CRONOGRAMA: '...' })
  - Efeitos colaterais: nenhum
  - Exemplo: parseLinha('A,B,"C,D"', ['col1','col2','col3']) -> {col1:'A',col2:'B',col3:'C,D'}
  - Casos de borda: quebras de linha embutidas em campos podem quebrar este parser simples; para CSVs complexos, recomenda-se usar biblioteca CSV robusta antes

  processarDadosCSV(csvData)
  - Assinatura: processarDadosCSV(csvData: string)
  - Propósito: ponto de entrada que transforma o conteúdo CSV em um array de `servidor` com licenças interpretadas
  - Parâmetros: csvData — string (conteúdo do CSV; o código superior normalmente converte `.xlsx` em CSV antes de chamar esta função)
  - Retorno: Array<servidor>
  - Efeitos colaterais: pode emitir console.warn/console.debug quando parser.debug === true
  - Exemplo:
    const servidores = parser.processarDadosCSV(csvText)
  - Casos de borda:
    - linhas vazias são ignoradas
    - cabeçalhos muito imprecisos podem levar a correspondências erradas
    - entrada com multilinhas em um campo pode produzir parsing incorreto

  detectarTipoTabela(headers)
  - Assinatura: detectarTipoTabela(headers: string[])
  - Propósito: identificar se a tabela segue o formato 'licenca-premio' (colunas `INICIO`/`FINAL` ou variações)
  - Parâmetros: headers — string[]
  - Retorno: boolean — true se reconhece formato licenca-premio, false caso contrário
  - Efeitos colaterais: nenhum
  - Observação: função usa normalização de header para aceitar variações (ex.: 'INÍCIO','Inicio','DATA INICIAL')

  processarServidor(dados)
  - Assinatura: processarServidor(dados: Object)
  - Propósito: construir o objeto `servidor` a partir de uma linha do tipo cronograma (campo texto)
  - Parâmetros: dados — Object mapeado por header (de parseLinha)
  - Retorno: servidor | null — retorna null em caso de erro/linha inválida
  - Efeitos colaterais: chama internamente parseCronograma(dados.CRONOGRAMA) e calcula estatísticas (próxima licença, urgência)
  - Exemplo:
    const s = parser.processarServidor(row)
  - Casos de borda: quando cronograma for ambíguo, retorna servidor com licencas vazias ou null

  processarServidorLicencaPremio(dados)
  - Assinatura: processarServidorLicencaPremio(dados: Object)
  - Propósito: processar linhas onde existem colunas de `INICIO` e `FINAL` explícitas e gerar licenças mensais entre esses pontos
  - Parâmetros: dados — Object
  - Retorno: servidor
  - Efeitos colaterais: popula `servidor.licencas` com licenças mensais entre inicio e fim (inclusive)
  - Exemplo: parser.processarServidorLicencaPremio(row)
  - Casos de borda: se os meses forem inválidos ou `INICIO` > `FINAL`, a linha será marcada nos problemas de carregamento e `licencas` poderá ficar vazia

  parseCronograma(cronograma)
  - Assinatura: parseCronograma(cronograma: string)
  - Propósito: interpretar uma string livre de cronograma aplicando uma sequência de handlers (ordem determinística)
  - Parâmetros: cronograma — string
  - Retorno: Array<licenca> — lista de licenças interpretadas, ou [] se não conseguiu interpretar com confiança
  - Efeitos colaterais: nenhum
  - Observação: a ordem dos handlers é importante (primeiro que resolver, vence):
    - handleInicioEm
    - handleAPartirDe
    - handleDataEspecificaComAnual
    - handleDatasEspecificas
    - handleMesesListados
    - handleMesAno
    - handleMesAnoUmaPorAno
  - Exemplo: parseCronograma('Início em 01/2026 (3 meses consecutivos)') -> [{inicio:Date(2026-01-01), fim:Date(2026-01-31), tipo:'consecutiva'}, ...]
  - Casos de borda: cronogramas sem ano podem ser ambíguos; parser pode retornar [] para sinalizar erro

  handleInicioEm(texto, licencas)
  - Assinatura: handleInicioEm(texto: string, licencas: Array)
  - Propósito: reconhecer e processar padrões "Início em <mes/ano> (N meses consecutivos)" e gerar N licenças mensais
  - Parâmetros:
    - texto: string — cronograma original
    - licencas: Array — array mutado onde serão empurradas as licenças geradas
  - Retorno: boolean — true se processou com sucesso
  - Efeitos colaterais: adiciona objetos licença ao array licencas
  - Casos de borda: se não encontra data válida retorna false

  handleAPartirDe(texto, licencas)
  - Assinatura: handleAPartirDe(texto: string, licencas: Array)
  - Propósito: reconhecer expressões do tipo "a partir de <data>" e gerar recorrência (mensal ou anual)
  - Parâmetros: iguais a handleInicioEm
  - Retorno: boolean — true se processou
  - Efeitos colaterais: adiciona licenças (por padrão 12 meses quando mensal; 5 anos quando anual)
  - Casos de borda: detecta palavras-chave como 'cada ano' para tratar como anual

  handleDataEspecificaComAnual(texto, licencas)
  - Assinatura: handleDataEspecificaComAnual(texto: string, licencas: Array)
  - Propósito: tratar casos mistos: uma data específica + recorrência anual (ex.: "16/11/25 (um mês) e janeiro de cada ano, a partir de 2027")
  - Parâmetros / Retorno / Efeitos colaterais: iguais aos handlers anteriores

  handleDatasEspecificas(texto, licencas)
  - Assinatura: handleDatasEspecificas(texto: string, licencas: Array)
  - Propósito: detectar e processar múltiplas datas no formato DD/MM[/YY(YY)] e produzir licenças isoladas para cada data
  - Parâmetros / Retorno / Efeitos colaterais: iguais aos handlers anteriores

  handleMesesListados(texto, licencas)
  - Assinatura: handleMesesListados(texto: string, licencas: Array)
  - Propósito: processar listas de meses separados por `;` ou `,` (ex.: "01/2026; 09/2026") e gerar licenças mensais para cada item
  - Parâmetros / Retorno / Efeitos colaterais: iguais aos handlers anteriores

  handleMesAno(texto, licencas)
  - Assinatura: handleMesAno(texto: string, licencas: Array)
  - Propósito: reconhecer formatos abreviados como "jan-25" ou "jan/2025"
  - Parâmetros / Retorno / Efeitos colaterais: iguais aos handlers anteriores

  handleMesAnoUmaPorAno(texto, licencas)
  - Assinatura: handleMesAnoUmaPorAno(texto: string, licencas: Array)
  - Propósito: reconhecer expressões "uma por ano" / "a cada ano" para um mês específico e gerar ocorrências anuais (padrão 5 anos)
  - Parâmetros / Retorno / Efeitos colaterais: iguais aos handlers anteriores

  parseDataCronograma(dataStr)
  - Assinatura: parseDataCronograma(dataStr: string)
  - Propósito: parse estrito de strings DD/MM[/YY(YY)] e normalizar anos de 2 dígitos aplicando regra cutoff (50 → século)
  - Parâmetros: dataStr — string
  - Retorno: Date | null
  - Efeitos colaterais: nenhum
  - Casos de borda: ano com 2 dígitos → aplica regra cutoff; formatos inválidos retornam null

  extrairNumeroMeses(texto)
  - Assinatura: extrairNumeroMeses(texto: string)
  - Propósito: extrair um número de meses de uma string (ex.: "3 meses consecutivos")
  - Parâmetros: texto — string
  - Retorno: integer (default 12 quando não detectado explicitamente)

  adicionarMeses(data, meses)
  - Assinatura: adicionarMeses(data: Date, meses: integer)
  - Propósito: retorno de uma nova Date deslocada em `meses` meses preservando fim de mês quando aplicável
  - Parâmetros: data — Date, meses — integer
  - Retorno: Date

  calcularFimLicenca(dataInicio)
  - Assinatura: calcularFimLicenca(dataInicio: Date)
  - Propósito: calcular o último dia do mês da data de início
  - Parâmetros: dataInicio — Date
  - Retorno: Date (último dia do mês)

  ajustarInicioParaPrimeiroDia(data)
  - Assinatura: ajustarInicioParaPrimeiroDia(data: Date)
  - Propósito: garantir que a data de início esteja no dia 1 do mês
  - Parâmetros: data — Date
  - Retorno: Date (dia 1 do mês)

  adicionarAnos(data, anos)
  - Assinatura: adicionarAnos(data: Date, anos: integer)
  - Propósito: retornar nova Date adicionando anos
  - Parâmetros: data — Date, anos — integer
  - Retorno: Date

  obterProximaLicenca(licencas)
  - Assinatura: obterProximaLicenca(licencas: Array<licenca>)
  - Propósito: a partir de uma lista de licenças, retornar a primeira cuja `fim` está no futuro (relativo a hoje)
  - Parâmetros: licencas — Array<licenca>
  - Retorno: licenca | null
  - Casos de borda: lista vazia → null; todas no passado → null

  calcularNivelUrgencia(servidor)
  - Assinatura: calcularNivelUrgencia(servidor: Object)
  - Propósito: calcular string de urgência (`Crítico`/`Alto`/`Moderado`/`Baixo`) usando heurísticas internas
  - Parâmetros: servidor — Object contendo campos como idade, admissao, meses, licencasAgendadas, totalLicencasAdquiridas, dadosOriginais
  - Retorno: string
  - Efeitos colaterais: nenhum direto; função lê `dadosOriginais` para tentar extrair data de nascimento se necessário
  - Casos de borda: ausência de dados → heurística conservadora (ex.: `Moderado`)

  processarPeriodoLicencaPremio(inicioMes, finalMes)
  - Assinatura: processarPeriodoLicencaPremio(inicioMes: string, finalMes: string)
  - Propósito: gerar um objeto período { inicio: Date, fim: Date, tipo, descricao } para um intervalo expresso como "junho - agosto" (inferindo anos quando necessário)
  - Parâmetros:
    - inicioMes: string — exemplo: 'jan/2025', 'janeiro/2025', '01/2025' ou apenas 'janeiro'
    - finalMes: string — idem
  - Retorno: objeto período ou null quando não possível inferir
  - Regras importantes: se anos estiverem ausentes e final < inicio em número do mês, assume travessia de ano (ex.: nov → fev significa avanço para o ano seguinte)

  processarPeriodoLicencaPremioMultiplo(inicioMes, finalMes, periodoOriginalId)
  - Assinatura: processarPeriodoLicencaPremioMultiplo(inicioMes: string, finalMes: string, periodoOriginalId?: string)
  - Propósito: gerar um Array<licenca> com uma licença por mês entre início e fim (inclusive). Quando anos faltam, tenta inferir com heurística conservadora.
  - Parâmetros: inicioMes, finalMes — strings; periodoOriginalId — string opcional usada para rastrear origem
  - Retorno: Array<licenca>
  - Casos de borda: quando não há ano e o intervalo atravessa ano, incrementa o ano final; se a inferência falhar, retorna []

  parseMesTexto(mesTexto)
  - Assinatura: parseMesTexto(mesTexto: string)
  - Propósito: converter texto de mês (PT-BR) para número (1-12)
  - Parâmetros: mesTexto — string
  - Retorno: integer (1-12) ou null

  parseMesTextoComAno(mesTexto)
  - Assinatura: parseMesTextoComAno(mesTexto: string)
  - Propósito: extrair {month, year} de formatos como "jan/25", "janeiro/2025", "outubro 2026"
  - Parâmetros: mesTexto — string
  - Retorno: {month:number, year:number} | null

  getMonthYearFromText(mesTexto)
  - Assinatura: getMonthYearFromText(mesTexto: string)
  - Propósito: wrapper que tenta parseMesTextoComAno e faz fallback para parseMesTexto quando só há mês
  - Parâmetros: mesTexto — string
  - Retorno: {month, year|null} | null

  obterNomeMes(numeroMes)
  - Assinatura: obterNomeMes(numeroMes: integer)
  - Propósito: retornar nome do mês por número (1-12)
  - Parâmetros: numeroMes — integer
  - Retorno: string (nome do mês)

  obterEstatisticas(servidores)
  - Assinatura: obterEstatisticas(servidores: Array<servidor>)
  - Propósito: agregar estatísticas (totalServidores, licencasPorMes/Ano, urgencia)
  - Parâmetros: servidores — Array<servidor>
  - Retorno: Object com os campos agregados (ex.: { totalServidores: number, licencasPorMes: {...} })

  Casos gerais de borda do parser
  - Entradas sem ano são ambíguas: o parser aplica heurísticas conservadoras e pode retornar [] para sinalizar erro de interpretação.
  - Campos multiline dentro do CSV podem quebrar o parser simples: pré-processar com biblioteca CSV é recomendado.
  - Quando houver múltiplos períodos para o mesmo servidor, prefira linhas separadas na planilha; o parser suporta múltiplas linhas com o mesmo nome.

  ---

  <a id="arquivo-js-dashboard-js"></a>
  ## Arquivo: js/dashboard.js

  Observação geral: esta camada é responsável por interação com o DOM, leitura de arquivos (FileReader/XLSX), salvar/recuperar última carga (localStorage/IndexedDB) e orquestrar o parser e a renderização dos gráficos/tabelas.

  Classe: DashboardMultiPage

  constructor()
  - Assinatura: new DashboardMultiPage(opts?)
  - Propósito: inicializar estado, instanciar parser CronogramaParser e armazenar referências DOM
  - Parâmetros: opts? — objeto de configuração opcional (ex.: { debug: true })
  - Retorno: instância
  - Efeitos colaterais: cria this.parser, this.charts, this.allServidores, e liga elementos DOM quando init() for chamado

  init()
  - Assinatura: init()
  - Propósito: configurar event listeners, inicializar navegação/páginas e tentar auto-load do último arquivo salvo
  - Parâmetros: none
  - Retorno: void
  - Efeitos colaterais: chama setupEventListeners(), initNavigation(), tryAutoLoad()

  setupThemeIntegration()
  - Assinatura: setupThemeIntegration()
  - Propósito: integrar ThemeManager e expor objeto de chart global para atualizações de tema
  - Parâmetros: none
  - Retorno: void

  setupEventListeners()
  - Assinatura: setupEventListeners()
  - Propósito: registrar todos os listeners DOM (upload, botões, filtros, teclas)
  - Parâmetros: none
  - Retorno: void
  - Efeitos colaterais: cria handlers para sidebar toggle, upload button (note: sem drag-and-drop), pesquisa, filtros
  - Observação: o projeto usa input[type=file] ou File System Access API quando disponível; não há drag-and-drop

  initNavigation()
  - Assinatura: initNavigation()
  - Propósito: preparar navegação entre páginas (home/calendar/timeline)
  - Parâmetros: none
  - Retorno: void

  switchPage(pageId)
  - Assinatura: switchPage(pageId: string)
  - Propósito: trocar a view ativa e inicializar conteúdos específicos da página (ex.: carregar timeline)
  - Parâmetros: pageId — string (ex.: 'home','timeline')
  - Retorno: void

  handleFileUpload(event)
  - Assinatura: async handleFileUpload(event: Event)
  - Propósito: handler para o input file — valida e lê `.csv`/`.xlsx`/`.xls` e delega para processData
  - Parâmetros: event — Event (espera-se event.target.files[0] como File)
  - Retorno: Promise<void>
  - Efeitos colaterais: atualiza indicadores de upload no DOM, chama readExcelFile/readFileAsText, chama processData, salva metadados/handle em storage (localStorage/IndexedDB)
  - Casos de borda: arquivos com tipos não suportados, arquivos vazios ou leitura falha

  isFileSystemAccessSupported()
  - Assinatura: isFileSystemAccessSupported()
  - Propósito: detectar suporte à File System Access API no browser
  - Parâmetros: none
  - Retorno: boolean

  createFallbackFileInput()
  - Assinatura: createFallbackFileInput()
  - Propósito: criar input[type=file] temporário para navegadores sem FS API
  - Parâmetros: none
  - Retorno: void — a implementação cria um input temporário, o usa para disparar o seletor e remove-o após uso (não retorna o elemento)
  - Efeitos colaterais: quando usado, dispara o seletor de arquivos do usuário

  showFileNotFoundError(fileName, statusElement)
  - Assinatura: showFileNotFoundError(fileName: string, statusElement: HTMLElement | null)
  - Propósito: mostrar modal/alerta quando o file handle salvo não puder ser lido
  - Parâmetros: fileName — string; statusElement — elemento do DOM onde mostrar status (opcional)
  - Retorno: void

  saveFileHandleToStorage(fileHandle, fileName, fileData, fileType)
  - Assinatura: async saveFileHandleToStorage(fileHandle, fileName: string, fileData: string, fileType: string)
  - Propósito: salvar metadados do arquivo e tentar persistir handle (quando disponível) para auto-load futuro
  - Parâmetros:
    - fileHandle — FileSystemFileHandle | null (quando disponível)
    - fileName — string
    - fileData — string (conteúdo CSV)
    - fileType — string (ex.: 'csv'|'xlsx')
  - Retorno: Promise<boolean> — true se salvou com sucesso (handle persistido ou conteúdo salvo), false caso contrário
  - Efeitos colaterais: grava `lastUploadedFile` no localStorage e tenta persistir handle no IndexedDB
  - Casos de borda: tamanho > ~5MB → fallback para IndexedDB ou não salvar no localStorage

  saveFileHandleToIndexedDB(fileHandle, fileName)
  - Assinatura: async saveFileHandleToIndexedDB(fileHandle, fileName)
  - Propósito: persistir handle no IndexedDB (object store: fileHandles)
  - Parâmetros: fileHandle — FileSystemFileHandle, fileName — string
  - Retorno: Promise<void>

  getFileHandleFromIndexedDB()
  - Assinatura: async getFileHandleFromIndexedDB()
  - Propósito: recuperar handle salvo em IndexedDB
  - Parâmetros: none
  - Retorno: Promise<{fileHandle, fileName}|null>

  saveFileToLocalStorage(fileName, fileData, fileType)
  - Assinatura: saveFileToLocalStorage(fileName: string, fileData: string, fileType: string)
  - Propósito: fallback para salvar conteúdo no localStorage (limite aproximado ~5MB)
  - Parâmetros: fileName, fileData, fileType
  - Retorno: boolean — true se salvo, false se falhou (por tamanho ou falta de espaço)

  getLastFileFromStorage() / getLastFileFromLocalStorage()
  - Assinatura: async getLastFileFromStorage()
  - Propósito: recuperar a última entrada salva (IndexedDB ou localStorage)
  - Parâmetros: none
  - Retorno: Promise<{fileName, fileData, fileType, fileHandle?}|null>

  clearStoredFile()
  - Assinatura: async clearStoredFile()
  - Propósito: remover referência ao último arquivo salvo (localStorage + IndexedDB)
  - Parâmetros: none
  - Retorno: Promise<void>

  updateStoredFileIndicators()
  - Assinatura: async updateStoredFileIndicators()
  - Propósito: atualizar badges/tooltip do botão de upload conforme armazenamento disponível/estado
  - Parâmetros: none
  - Retorno: Promise<void>

  tryAutoLoad()
  - Assinatura: async tryAutoLoad()
  - Propósito: tentar recarregar o último arquivo salvo e mostrar uma notificação ao usuário
  - Parâmetros: none
  - Retorno: Promise<boolean> — true se encontrou e exibiu opção de recarregar
  - Efeitos colaterais: pode iniciar leitura do handle salvo ou preencher uma notificação no DOM

  showAutoLoadNotification(fileInfo, onConfirm)
  - Assinatura: showAutoLoadNotification(fileInfo: Object, onConfirm: Function)
  - Propósito: UI - mostrar notificação com opção de recarregar o arquivo salvo ou selecionar novo
  - Parâmetros: fileInfo — objeto com metadados; onConfirm — função chamada se o usuário confirmar
  - Retorno: void

  performAutoLoad(fileInfo)
  - Assinatura: async performAutoLoad(fileInfo: Object)
  - Propósito: executar efetivamente o recarregamento do arquivo (usando handle quando disponível)
  - Parâmetros: fileInfo — objeto previamente retornado por getLastFileFromStorage
  - Retorno: Promise<void>

  readExcelFileContent(file)
  - Assinatura: readExcelFileContent(file: File) -> Promise<string>
  - Propósito: ler `.xlsx`/`.xls` usando FileReader + XLSX e retornar CSV (string)
  - Parâmetros: file — File
  - Retorno: Promise<string> (CSV)
  - Efeitos colaterais: leitura via FileReader
  - Casos de borda: arquivos protegidos/errados → rejeita a Promise

  readFileAsText(file)
  - Assinatura: readFileAsText(file: File) -> Promise<string>
  - Propósito: ler File como texto UTF-8
  - Parâmetros: file — File
  - Retorno: Promise<string>

  readExcelFile(file)
  - Assinatura: readExcelFile(file: File) -> Promise<string>
  - Propósito: wrapper/compatibilidade para leitura de arquivos Excel (chama readExcelFileContent internamente)
  - Parâmetros: file — File
  - Retorno: Promise<string> (CSV)

  processData(csvData)
  - Assinatura: processData(csvData: string)
  - Propósito: fluxo principal pós-leitura: limpar problemas, chamar parser.processarDadosCSV, adaptar UI, verificar erros e renderizar
  - Parâmetros: csvData — string
  - Retorno: void
  - Efeitos colaterais: atualiza this.allServidores / this.filteredServidores e chama renderizações

  adaptUIForTableType(isLicencaPremio)
  - Assinatura: adaptUIForTableType(isLicencaPremio: boolean)
  - Propósito: ajustar visibilidade de filtros e seções conforme o tipo de tabela detectado
  - Parâmetros: isLicencaPremio — boolean
  - Retorno: void

  verificarErrosCronograma()
  - Assinatura: verificarErrosCronograma()
  - Propósito: validar cada servidor e suas licenças, preenchendo this.loadingProblems
  - Parâmetros: none
  - Retorno: void
  - Efeitos colaterais: preenche this.loadingProblems e atualiza cartão de problemas no DOM

  applyAgeFilter(), handleSearch(term), clearSearch(), clearAllFilters()
  - Assinatura: applyAgeFilter(ageRange?), handleSearch(term: string), clearSearch(), clearAllFilters()
  - Propósito: aplicar filtros locais (idade, busca, período), atualizar this.currentFilters e reenfileirar applyAllFilters
  - Parâmetros: conforme função
  - Retorno: void

  adaptFiltersForTableType(isLicencaPremio)
  - Assinatura: adaptFiltersForTableType(isLicencaPremio: boolean)
  - Propósito: esconder/exibir filtros específicos de cada formato de tabela
  - Parâmetros: isLicencaPremio — boolean
  - Retorno: void

  applyLicencaFilters(), matchesMonth(servidor, targetMonth), matchesSearch(servidor, searchTerm), applyAllFilters()
  - Assinatura: conforme função
  - Propósito: aplicar filtros sobre this.allServidores para produzir this.filteredServidores
  - Parâmetros: conforme função
  - Retorno: void

  createUrgencyChart(), createOriginalUrgencyChart(), createCargoChart()
  - Assinatura: createUrgencyChart()
  - Propósito: construir/atualizar gráficos Chart.js usados na UI (urgência, cargo, etc.)
  - Parâmetros: nenhum (obtêm dados de this.filteredServidores)
  - Retorno: void
  - Efeitos colaterais: altera objetos Chart.js e atualiza canvas relacionados no DOM

  createTimelineChart(), initializeTimelineControls(), updateTimelineChart(), updateYearlyHeatmap()
  - Assinatura: conforme função
  - Propósito: funções de timeline/calendário (criação e atualização)

  updateTable(), updateStats(), updateHeaderStatus(), updateActiveFilters(), updateProblemsCount()
  - Propósito: funções de renderização/atualização do estado visual (DOM)
  - Assinatura: conforme função

  showServidorDetails(nomeServidor)
  - Assinatura: showServidorDetails(nomeServidor: string)
  - Propósito: abrir modal com detalhes do servidor (procura por nome nos dados carregados)
  - Parâmetros: nomeServidor — string
  - Retorno: void

  escapeHtml(text)
  - Assinatura: escapeHtml(text: string)
  - Propósito: escapar caracteres para evitar XSS ao injetar conteúdo CSV no DOM
  - Parâmetros: text — string
  - Retorno: string escapada

  showLoading(), hideLoading()
  - Assinatura: showLoading(), hideLoading()
  - Propósito: gerenciar indicador global de loading (mostrar/ocultar)

  ---

  <a id="arquivo-js-theme-manager-js"></a>
  ## Arquivo: js/themeManager.js

  Observação: gerencia tema (light/dark), persiste escolha em localStorage e notifica via evento `themeChanged`.

  constructor()
  - Assinatura: new ThemeManager()
  - Propósito: inicializar estado do tema e aplicar tema salvo ou preferência do sistema
  - Parâmetros: none
  - Retorno: instância

  init()
  - Assinatura: init()
  - Propósito: aplicar tema inicial, configurar botão toggle e listener de preferência do sistema
  - Parâmetros: none
  - Retorno: void

  applyTheme(theme)
  - Assinatura: applyTheme(theme: 'light'|'dark')
  - Propósito: aplicar tema no `document.documentElement`, persistir em localStorage e emitir evento `themeChanged`
  - Parâmetros: theme — 'light' ou 'dark'
  - Retorno: void
  - Efeitos colaterais: altera atributo `data-theme` no `document.documentElement` e salva preferência em localStorage

  toggleTheme()
  - Assinatura: toggleTheme()
  - Propósito: alternar entre light/dark
  - Parâmetros: none
  - Retorno: void

  showThemeChangeNotification(theme)
  - Assinatura: showThemeChangeNotification(theme: string)
  - Propósito: mostrar breve notificação visual ao usuário quando o tema muda

  setupToggleButton()
  - Assinatura: setupToggleButton()
  - Propósito: ligar o botão do DOM (id 'themeToggle') ao toggleTheme

  setupSystemPreferenceListener()
  - Assinatura: setupSystemPreferenceListener()
  - Propósito: aplicar tema automaticamente se o usuário não definiu preferência manual

  updateChartColors()
  - Assinatura: updateChartColors()
  - Propósito: atualizar cores do Chart.js (window.dashboardChart) para manter contraste após troca de tema
  - Parâmetros: none
  - Retorno: void

  getCurrentTheme(), isDarkTheme(), setTheme(theme)
  - Assinatura: getCurrentTheme(): string, isDarkTheme(): boolean, setTheme(theme: string)
  - Propósito: API pública para consultar e forçar tema

  ----

