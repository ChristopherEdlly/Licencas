// Parser de Cronogramas - Versão Corrigida e Melhorada
if (typeof CronogramaParser === 'undefined') {
class CronogramaParser {
    constructor() {
        this.mesesAbrev = {
            'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
            'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
        };
        
        this.mesesCompletos = {
            'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
            'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        };
        
    // Suporte focado em PT-BR; mapeamentos em inglês removidos para reduzir comentários de desenvolvimento
    // Flag de debug (false por padrão) — chame `parser.setDebug(true)` para habilitar logs locais
    this.debug = false;
    }

    // Habilitar/Desabilitar debug de logs do parser
    setDebug(flag) {
        this.debug = !!flag;
    }

    // Normaliza um nome de mês (remove acentos, pontuação e espaços extras)
    normalizeMonthKey(raw) {
        if (!raw) return '';
        return raw.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z]/g, '').trim();
    }

    // Normaliza chaves/headers para comparação (remove acentos, transforma em maiúsculas e trim)
    normalizeKey(key) {
        if (!key) return '';
        return key.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
    }

    // Localiza um campo no objeto `dados` ignorando maiúsculas e acentos; aceita um nome único ou um array de alternativas
    getField(dados, names) {
        if (!dados || !names) return '';
        const keys = Object.keys(dados || {});
        const normalizedMap = new Map();
        keys.forEach(k => normalizedMap.set(this.normalizeKey(k), k));

        const tryNames = Array.isArray(names) ? names : [names];
        for (const name of tryNames) {
            const nk = this.normalizeKey(name);
            if (normalizedMap.has(nk)) {
                const originalKey = normalizedMap.get(nk);
                return dados[originalKey] || '';
            }
        }

    // Se não encontrado, tentar correspondência aproximada verificando se algum cabeçalho normalizado contém o nome normalizado
        for (const name of tryNames) {
            const nk = this.normalizeKey(name);
            for (const [normKey, origKey] of normalizedMap.entries()) {
                if (normKey.includes(nk) || nk.includes(normKey)) {
                    return dados[origKey] || '';
                }
            }
        }

        return '';
    }

    // Função principal para processar dados do CSV
    processarDadosCSV(csvData) {
    // Processando dados CSV (logs removidos para produção)
        
        const linhas = csvData.split('\n');
        const headers = linhas[0].split(',').map(h => h.trim());
        
        // Detectar tipo de tabela baseado nos headers
        const isLicencasPremio = this.detectarTipoTabela(headers);
        
        const servidores = [];
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const dados = this.parseLinha(linha, headers);
            if (dados && dados.SERVIDOR) {
                let servidor;
                if (isLicencasPremio) {
                    servidor = this.processarServidorLicencaPremio(dados);
                } else {
                    servidor = this.processarServidor(dados);
                }
                
                if (servidor) {
                    servidores.push(servidor);
                }
            }
        }
        
    // Servidores processados (logs removidos para produção)
        return servidores;
    }

    // Detectar tipo de tabela baseado nos headers
    detectarTipoTabela(headers) {
        const headersStr = headers.join(',').toLowerCase();
        return headersStr.includes('inicio de licença') || headersStr.includes('final de licença');
    }

    parseLinha(linha, headers) {
        const valores = [];
        let valorAtual = '';
        let dentroAspas = false;
        
        for (let i = 0; i < linha.length; i++) {
            const char = linha[i];
            
            if (char === '"') {
                dentroAspas = !dentroAspas;
            } else if (char === ',' && !dentroAspas) {
                valores.push(valorAtual.trim());
                valorAtual = '';
            } else {
                valorAtual += char;
            }
        }
        
        valores.push(valorAtual.trim());
        
        const dados = {};
        headers.forEach((header, index) => {
            // Ignore colunas vazias ou com nomes inválidos
            if (header && header.trim() !== '' && index < valores.length) {
                dados[header] = valores[index] || '';
            }
        });
        
        return dados;
    }

    processarServidor(dados) {
        try {
            const servidor = {
                nome: this.getField(dados, ['SERVIDOR', 'NOME'])?.trim() || 'Nome não informado',
                cpf: this.getField(dados, ['CPF'])?.trim() || '',
                idade: this.extrairIdade(this.getField(dados, ['IDADE'])),
                sexo: this.getField(dados, ['SEXO'])?.trim() || '',
                admissao: this.parseDate(this.getField(dados, ['ADMISSAO', 'ADMISSÃO'])),
                meses: parseInt(this.getField(dados, ['MESES'])) || 0,
                lotacao: this.getField(dados, ['LOTACAO', 'LOTAÇÃO'])?.trim() || '',
                superintendencia: this.getField(dados, ['SUPERINTENDENCIA', 'SUPERINTENDÊNCIA'])?.trim() || '',
                subsecretaria: this.getField(dados, ['SUBSECRETARIA'])?.trim() || '',
                cargo: this.getField(dados, ['CARGO'])?.trim() || '',
                cronograma: this.getField(dados, ['CRONOGRAMA', 'CRONOGRAMA DE LICENCA'])?.trim() || '',
                licensas: [],
                nivelUrgencia: 'Baixo',
                tipoTabela: 'cronograma',
                // Armazenar dados originais para referência
                dadosOriginais: { ...dados }
            };

            // Processar cronograma para extrair licenças
            const licencas = this.parseCronograma(servidor.cronograma);
            servidor.licencas = licencas;
            
            // Verificar se houve erro no parsing (cronograma ambíguo)
            servidor.cronogramaComErro = licencas.length === 0 && servidor.cronograma.length > 0;
            if (servidor.cronogramaComErro) {
                console.warn(`⚠️  Servidor ${servidor.nome}: Cronograma não pôde ser interpretado - "${servidor.cronograma}"`);
            }
            
            // Calcular estatísticas
            servidor.licencasAgendadas = licencas.length;
            servidor.licencasGozadas = 0; // Implementar lógica baseada em datas passadas
            servidor.totalLicencasAdquiridas = servidor.meses;
            
            // Determinar próxima licença
            const proximaLicenca = this.obterProximaLicenca(licencas);
            servidor.proximaLicencaInicio = proximaLicenca?.inicio || null;
            servidor.proximaLicencaFim = proximaLicenca?.fim || null;
            
            // Calcular nível de urgência
            servidor.nivelUrgencia = this.calcularNivelUrgencia(servidor);
            
            return servidor;
        } catch (error) {
            console.error('Erro ao processar servidor:', error);
            return null;
        }
    }

    // Processar servidor da tabela de licenças prêmio
    processarServidorLicencaPremio(dados) {
        try {
            const servidor = {
                nome: dados.SERVIDOR?.trim() || 'Nome não informado',
                cpf: '', // Não disponível nesta tabela
                idade: 0, // Não disponível nesta tabela
                sexo: '', // Não disponível nesta tabela
                admissao: null, // Não disponível nesta tabela
                meses: 0, // Não disponível nesta tabela
                lotacao: '', // Não disponível nesta tabela
                superintendencia: '', // Não disponível nesta tabela
                subsecretaria: '', // Não disponível nesta tabela
                cargo: dados.CARGO?.trim() || '',
                cronograma: '', // Não há cronograma textual
                licencas: [],
                nivelUrgencia: 'Baixo',
                tipoTabela: 'licenca-premio',
                // Armazenar dados originais para referência
                dadosOriginais: { ...dados }
            };

            // Processar período de licença
            const inicioMes = this.getField(dados, ['INICIO DE LICENCA PREMIO', 'INICIO DE LICENÇA PREMIO', 'INICIO'])?.trim();
            const finalMes = this.getField(dados, ['FINAL DE LICENCA PREMIO', 'FINAL DE LICENÇA PREMIO', 'FINAL'])?.trim();
            
            if (inicioMes && finalMes) {
                const periodoOriginalId = `${inicioMes}-${finalMes}`;
                const licencas = this.processarPeriodoLicencaPremioMultiplo(inicioMes, finalMes, periodoOriginalId);
                if (licencas && licencas.length > 0) {
                    servidor.licencas.push(...licencas);
                }
            }
            
            // Calcular estatísticas
            servidor.licencasAgendadas = servidor.licencas.length;
            servidor.licencasGozadas = 0;
            servidor.totalLicencasAdquiridas = servidor.licencas.length;
            
            // Determinar próxima licença
            const proximaLicenca = this.obterProximaLicenca(servidor.licencas);
            
            // Para licenças prêmio, SEMPRE usar o período COMPLETO (da primeira até a última licença)
            // Não importa se são passadas ou futuras - mostrar sempre o período completo do CSV
            if (servidor.licencas.length > 0) {
                const primeiraLicenca = servidor.licencas[0];
                const ultimaLicenca = servidor.licencas[servidor.licencas.length - 1];
                servidor.proximaLicencaInicio = primeiraLicenca.inicio;
                servidor.proximaLicencaFim = ultimaLicenca.fim;
            } else {
                servidor.proximaLicencaInicio = null;
                servidor.proximaLicencaFim = null;
            }
            
            // Licenças prêmio não têm cálculo de urgência (removido)
            servidor.nivelUrgencia = null;
            
            return servidor;
        } catch (error) {
            console.error('Erro ao processar servidor de licença prêmio:', error);
            return null;
        }
    }

    extrairIdade(idadeStr) {
        if (!idadeStr) return 0;
        // Remove aspas, espaços e converte vírgula decimal para ponto
        const cleaned = idadeStr.toString().replace(/['"]/g, '').replace(',', '.').trim();
        const idade = parseFloat(cleaned);
        return isNaN(idade) ? 0 : Math.floor(idade);
    }

    // Parse de datas genérico e validado. Retorna Date ou null se inválida.
    parseDate(dateStr) {
        if (!dateStr || dateStr.toString().trim() === '') return null;

        const cleaned = dateStr.toString().replace(/['"]/g, '').trim();

        const isValidDateParts = (y, m, d) => {
            if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
            if (m < 1 || m > 12) return false;
            const daysInMonth = new Date(y, m, 0).getDate();
            if (d < 1 || d > daysInMonth) return false;
            return true;
        };

        // DD/MM/YYYY
        const brMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (brMatch) {
            const dia = parseInt(brMatch[1], 10);
            const mes = parseInt(brMatch[2], 10);
            const ano = parseInt(brMatch[3], 10);
            if (!isValidDateParts(ano, mes, dia)) return null;
            return new Date(ano, mes - 1, dia);
        }

        // ISO YYYY-MM-DD
        const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            const ano = parseInt(isoMatch[1], 10);
            const mes = parseInt(isoMatch[2], 10);
            const dia = parseInt(isoMatch[3], 10);
            if (!isValidDateParts(ano, mes, dia)) return null;
            return new Date(ano, mes - 1, dia);
        }

        // Tentar parse genérico e validar
        const parsed = new Date(cleaned);
        if (isNaN(parsed.getTime())) return null;
        const pY = parsed.getFullYear();
        const pM = parsed.getMonth() + 1;
        const pD = parsed.getDate();
        if (!isValidDateParts(pY, pM, pD)) return null;
        return parsed;
    }

    parseCronograma(cronograma) {
        if (!cronograma) return [];
        
        const licencas = [];
        const texto = cronograma.toLowerCase().trim();
        
    // CRONOGRAMA (logs de debug removidos por padrão)

        // Verificar padrões ambíguos ou impossíveis de parsear
        // APENAS casos realmente impossíveis sem informação de ano
        const padroesAmbiguos = [
            /um\s+m[êe]s\s*\([^)]*\)\s*a\s*cada\s*ano(?!\s*,\s*a\s*partir\s+de)(?!.*\d{4})/i, // Só ambíguo se não tiver ano em lugar nenhum
        ];
        
            for (const padrao of padroesAmbiguos) {
            if (padrao.test(texto)) {
                // Cronograma ambíguo detectado — retorna array vazio para indicar erro de interpretação
                return []; // Retorna array vazio para indicar erro
            }
        }

        try {
            // 1. Padrão: "Início em MM/AAAA (N meses consecutivos)"
            if (this.handleInicioEm(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
            // 2. Padrão: "A partir de data/ano" (DEVE VIR ANTES de datas específicas)
            if (this.handleAPartirDe(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
            // 3. Padrão complexo: "Data específica + mês anual a partir de ano"
            // Ex: "16/11/25 (um mês) e janeiro de cada ano, a partir de 2027"
            if (this.handleDataEspecificaComAnual(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
            // 4. Padrão: Datas específicas como "16/11/25" (SEM "a partir de")
            if (this.handleDatasEspecificas(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
            // 5. Padrão: "Meses: 09/2026; 09/2027"
            if (this.handleMesesListados(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
            // 6. Padrão: Mês específico por ano (jan.-28, jul.-29)
            if (this.handleMesAno(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
            // 7. Padrão: "jan/2030 uma por ano" ou similar
            if (this.handleMesAnoUmaPorAno(texto, licencas)) {
                this.logCronogramaInterpretado(cronograma, licencas);
                return licencas;
            }
            
        } catch (error) {
            console.error('❌ Erro ao parsear cronograma:', error);
        }

        this.logCronogramaInterpretado(cronograma, licencas);
        return licencas;
    }
    
    // Baseado na função HandleInicioEm do Power Query
    handleInicioEm(texto, licencas) {
        const hasInicio = texto.includes('início em') || texto.includes('inicio em');
        if (!hasInicio) return false;
        
        // Extrair a parte após "início em"
        const inicioMatch = texto.match(/iní?cio\s+em\s+([^.]+)/i);
        if (!inicioMatch) return false;
        
        const afterInicio = inicioMatch[1];
        
        // Procurar primeira data MM/AAAA ou DD/MM/AAAA
        const dateTokens = afterInicio.split(/[\s,.;:()]/);
        const firstDateToken = dateTokens.find(token => token.includes('/'));
        
        if (!firstDateToken) return false;
        
        let baseDate = null;
        
        // Tentar DD/MM/AAAA primeiro
        const ddmmyyyyMatch = firstDateToken.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        if (ddmmyyyyMatch) {
            const [, dia, mes, ano] = ddmmyyyyMatch;
            const anoCompleto = this.adjustYear(parseInt(ano));
            baseDate = new Date(anoCompleto, parseInt(mes) - 1, 1); // Sempre dia 1
        } else {
            // Tentar MM/AAAA
            const mmyyyyMatch = firstDateToken.match(/(\d{1,2})\/(\d{4})/);
            if (mmyyyyMatch) {
                const [, mes, ano] = mmyyyyMatch;
                baseDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            }
        }
        
        if (!baseDate) return false;
        
        // Extrair quantidade de meses
        let qtdMeses = 12; // default
        
        // Procurar número dentro de parênteses
        const parenMatch = afterInicio.match(/\(([^)]+)\)/);
        if (parenMatch) {
            const insideParens = parenMatch[1];
            const numberMatch = insideParens.match(/(\d+)/);
            if (numberMatch) {
                qtdMeses = parseInt(numberMatch[1]);
            }
        }
        
        // Verificar se é consecutivo
        const isConsecutivo = afterInicio.includes('consecutiv');
        
        if (isConsecutivo) {
            // Gerar licenças mensais consecutivas
            for (let i = 0; i < qtdMeses; i++) {
                const inicioLicenca = this.adicionarMeses(baseDate, i);
                const fimLicenca = this.calcularFimLicenca(inicioLicenca);
                
                licencas.push({
                    inicio: inicioLicenca,
                    fim: fimLicenca,
                    tipo: 'consecutiva'
                });
            }
        } else {
            // Apenas uma licença no mês especificado
            const fimLicenca = this.calcularFimLicenca(baseDate);
            licencas.push({
                inicio: baseDate,
                fim: fimLicenca,
                tipo: 'única'
            });
        }
        
        return true;
    }
    
    // Baseado na lógica complexa do Power Query para casos como "16/11/25 (um mês) e janeiro de cada ano, a partir de 2027"
    handleDataEspecificaComAnual(texto, licencas) {
        const hasJaneiroAnual = texto.includes('janeiro') && texto.includes('cada ano');
        const hasAPartirDe = texto.includes('a partir de');
        
        if (!hasJaneiroAnual || !hasAPartirDe) return false;
        
        // 1. Extrair data específica (ex: 16/11/25)
        const dataEspecificaMatch = texto.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (dataEspecificaMatch) {
            const dataEspecifica = this.parseDataCronograma(dataEspecificaMatch[1]);
            if (dataEspecifica) {
                const inicioEspecifica = new Date(dataEspecifica.getFullYear(), dataEspecifica.getMonth(), 1);
                const fimEspecifica = this.calcularFimLicenca(inicioEspecifica);
                
                licencas.push({
                    inicio: inicioEspecifica,
                    fim: fimEspecifica,
                    tipo: 'específica'
                });
            }
        }
        
        // 2. Extrair ano de início para janeiro anual
        const apartirMatch = texto.match(/a\s+partir\s+de\s+(\d{4})/);
        if (apartirMatch) {
            const anoInicio = parseInt(apartirMatch[1]);
            
            // Gerar janeiro de cada ano por 5 anos a partir do ano especificado
            for (let i = 0; i < 5; i++) {
                const janeiroAno = new Date(anoInicio + i, 0, 1); // Janeiro = mês 0
                const fimJaneiro = this.calcularFimLicenca(janeiroAno);
                
                licencas.push({
                    inicio: janeiroAno,
                    fim: fimJaneiro,
                    tipo: 'anual'
                });
            }
        }
        
        return licencas.length > 0;
    }
    
    // Função auxiliar para ajustar anos de 2 dígitos
    adjustYear(ano) {
        if (ano < 100) {
            return ano > 50 ? 1900 + ano : 2000 + ano;
        }
        return ano;
    }
    
    // Implementar métodos auxiliares baseados no Power Query
    handleAPartirDe(texto, licencas) {
        const hasAPartir = texto.includes('a partir de');
        if (!hasAPartir) return false;
        
        // Primeiro tentar MM/AAAA
        let match = texto.match(/a\s+partir\s+de\s+(\d{2}\/\d{4})/);
        let dataInicio = null;
        
        if (match) {
            const [, dataStr] = match;
            const [mes, ano] = dataStr.split('/');
            dataInicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        } else {
            // Tentar DD/MM/AAAA
            match = texto.match(/a\s+partir\s+de\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/);
            if (match) {
                const data = this.parseDataCronograma(match[1]);
                if (data) {
                    dataInicio = new Date(data.getFullYear(), data.getMonth(), 1); // Sempre dia 1
                }
            }
        }
        
        if (!dataInicio) return false;
        
        // Verificar se é anual
        const isAnual = texto.includes('cada ano') || texto.includes('por ano');
        const qtdLicencas = isAnual ? 5 : 12; // 5 anos ou 12 meses
        
        for (let i = 0; i < qtdLicencas; i++) {
            const proximaData = isAnual ? 
                this.adicionarAnos(dataInicio, i) : 
                this.adicionarMeses(dataInicio, i);
            
            const fimLicenca = this.calcularFimLicenca(proximaData);
            
            licencas.push({
                inicio: proximaData,
                fim: fimLicenca,
                tipo: isAnual ? 'anual' : 'mensal'
            });
        }
        
        return true;
    }

    handleDatasEspecificas(texto, licencas) {
        if (!texto.includes('/') || texto.includes('início em') || texto.includes('inicio em') || texto.includes('a partir de')) {
            return false;
        }
        
        const matches = texto.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g);
        if (matches) {
            matches.forEach((match, index) => {
                const data = this.parseDataCronograma(match);
                if (data) {
                    const inicioLicenca = new Date(data.getFullYear(), data.getMonth(), 1);
                    const fimLicenca = this.calcularFimLicenca(inicioLicenca);
                    
                    licencas.push({
                        inicio: inicioLicenca,
                        fim: fimLicenca,
                        tipo: 'específica'
                    });
                }
            });
            
            return licencas.length > 0;
        }
        
        return false;
    }
    
    handleMesesListados(texto, licencas) {
        if (!texto.includes('meses:')) return false;
        
        const mesMatch = texto.match(/meses:\s*([^.]+)/);
        if (mesMatch) {
            const mesesTexto = mesMatch[1];
            const meses = mesesTexto.split(/[;,]/);
            
            meses.forEach((mes, index) => {
                const mesLimpo = mes.trim();
                const dataMatch = mesLimpo.match(/(\d{2})\/(\d{4})/);
                if (dataMatch) {
                    const [, mesNum, ano] = dataMatch;
                    const data = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
                    const fimLicenca = this.calcularFimLicenca(data);
                    
                    licencas.push({
                        inicio: data,
                        fim: fimLicenca,
                        tipo: 'mensal'
                    });
                }
            });
            
            return licencas.length > 0;
        }
        
        return false;
    }
    
    handleMesAno(texto, licencas) {
        const mesAnoMatch = texto.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?-(\d{2})/g);
        if (!mesAnoMatch) return false;
        
        mesAnoMatch.forEach((match, index) => {
            const [mesAbrev, ano] = match.split(/\.?-/);
            const mesNum = this.mesesAbrev[mesAbrev.toLowerCase()];
            if (mesNum) {
                const anoCompleto = this.adjustYear(parseInt(ano));
                const data = new Date(anoCompleto, mesNum - 1, 1);
                const fimLicenca = this.calcularFimLicenca(data);
                
                licencas.push({
                    inicio: data,
                    fim: fimLicenca,
                    tipo: 'anual'
                });
            }
        });
        
        return licencas.length > 0;
    }
    
    // Novo padrão: "jan/2030 uma por ano", "janeiro a cada ano" com ano específico
    handleMesAnoUmaPorAno(texto, licencas) {
        // Padrão: mês/ano + "uma por ano" ou "a cada ano"
        const mesAnoMatch = texto.match(/(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[\/\s]*(\d{4})/);
        const hasUmaPorAno = texto.includes('uma por ano') || texto.includes('a cada ano');
        
        if (!mesAnoMatch || !hasUmaPorAno) return false;
        
        const [, mesTexto, anoStr] = mesAnoMatch;
        const anoInicial = parseInt(anoStr);
        
        // Converter nome do mês para número
        let mesNum = this.mesesAbrev[mesTexto.toLowerCase()] || this.mesesCompletos[mesTexto.toLowerCase()];
        
        if (!mesNum) return false;
        
        // Gerar 5 anos consecutivos a partir do ano especificado
        for (let i = 0; i < 5; i++) {
            const ano = anoInicial + i;
            const data = new Date(ano, mesNum - 1, 1);
            const fimLicenca = this.calcularFimLicenca(data);
            
            licencas.push({
                inicio: data,
                fim: fimLicenca,
                tipo: 'anual-recorrente'
            });
        }
        
        return licencas.length > 0;
    }

    logCronogramaInterpretado(cronogramaOriginal, licencas) {
        const result = {
            original: cronogramaOriginal,
            interpretado: licencas.map(licenca => ({
                inicio: licenca.inicio.toISOString().split('T')[0],
                fim: licenca.fim.toISOString().split('T')[0],
                tipo: licenca.tipo
            }))
        };
        // Resultado do cronograma interpretado — emite no console somente quando debug estiver habilitado
        if (this.debug && typeof console !== 'undefined' && console.debug) {
            console.debug('Cronograma interpretado:', result);
        }
    }    getTipoIcon(tipo) {
        const icons = {
            'consecutiva': '📅',
            'específica': '📆',
            'mensal': '🗓️',
            'anual': '📋'
        };
        return icons[tipo] || '📝';
    }

    parseDataCronograma(dataStr) {
        try {
            if (!dataStr || dataStr.toString().trim() === '') return null;
            const parts = dataStr.toString().split('/').map(p => p.trim());
            if (parts.length < 2) return null;

            const dia = parseInt(parts[0], 10);
            const mes = parseInt(parts[1], 10);
            let ano = parts[2] ? parseInt(parts[2], 10) : null;

            // Ajustar ano de 2 d edgitos quando presente
            if (ano !== null && !isNaN(ano) && ano < 100) {
                ano = ano > 50 ? 1900 + ano : 2000 + ano;
            }

            // If year missing, infer a sane year (use current year)
            if (ano === null || isNaN(ano)) {
                ano = new Date().getFullYear();
            }

            // Valida e7 e3o de componentes
            if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(ano)) return null;
            if (mes < 1 || mes > 12) return null;
            const daysInMonth = new Date(ano, mes, 0).getDate();
            if (dia < 1 || dia > daysInMonth) return null;

            return new Date(ano, mes - 1, dia);
        } catch (error) {
            console.error('Erro ao fazer parse da data do cronograma:', dataStr, error);
            return null;
        }
    }

    extrairNumeroMeses(texto) {
        const match = texto.match(/(\d+)\s*meses?\s*consecutivos/);
        return match ? parseInt(match[1]) : 12;
    }

    adicionarMeses(data, meses) {
        const novaData = new Date(data);
        novaData.setMonth(novaData.getMonth() + meses);
        return novaData;
    }
    
    // Função para calcular o fim da licença (último dia do mês)
    calcularFimLicenca(dataInicio) {
        const fimMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, 0);
        return fimMes;
    }
    
    // Função para garantir que a licença comece no primeiro dia do mês
    ajustarInicioParaPrimeiroDia(data) {
        return new Date(data.getFullYear(), data.getMonth(), 1);
    }

    adicionarAnos(data, anos) {
        const novaData = new Date(data);
        novaData.setFullYear(novaData.getFullYear() + anos);
        return novaData;
    }

    obterProximaLicenca(licencas) {
        const agora = new Date();
        const proximasLicencas = licencas.filter(l => l.inicio > agora);
        return proximasLicencas.length > 0 ? proximasLicencas[0] : null;
    }

    calcularNivelUrgencia(servidor) {
        try {
            // Parâmetros / constantes (padronizados conforme sua proposta)
            const PontosMinimosHomem = 102;
            const PontosMinimosMulher = 92;
            const IdadeMinimaHomem = 63;
            const IdadeMinimaMulher = 58;
            const IdadeCompulsoria = 75;
            const MargemDeSegurancaEmAnos = 2;
            const MargemDeSegurancaEmMeses = MargemDeSegurancaEmAnos * 12;

            const agora = new Date();

            // Idade atual (preferir campo já extraído, senão tentar a partir de dadosOriginais.DN)
            let IdadeAtual = servidor.idade || 0;

            // Tempo de serviço em anos (inteiro)
            let TempoDeServico = 0;
            if (servidor.admissao) {
                const adm = new Date(servidor.admissao);
                TempoDeServico = agora.getFullYear() - adm.getFullYear();
                // Ajuste por mês/dia para aproximar anos completos
                const admMonth = adm.getMonth();
                const admDay = adm.getDate();
                if (agora.getMonth() < admMonth || (agora.getMonth() === admMonth && agora.getDate() < admDay)) {
                    TempoDeServico -= 1;
                }
                if (TempoDeServico < 0) TempoDeServico = 0;
            }

            const PontosAtuais = IdadeAtual + TempoDeServico;

            // Total de licenças adquiridas (meses) e quantas já estão agendadas
            const totalAdquiridas = Number(servidor.totalLicencasAdquiridas || servidor.meses || 0);
            const agendadas = Number(servidor.licencasAgendadas || 0);

            // Licenças restantes reais (meses)
            const LicencasRestantes = Math.max(0, totalAdquiridas - agendadas);

            // Licenças não agendadas — interpretar como LicencasRestantes (disponível para agendamento)
            const LicencasNaoAgendadas = LicencasRestantes;

            // Meses restantes até a compulsória — preferir Data de Nascimento (DN) se disponível
            let TemDataNasc = false;
            let DataCompulsoria = null;
            if (servidor.dadosOriginais && servidor.dadosOriginais.DN) {
                // tentar parse com parseDataCronograma (aceita DD/MM/YY(YY)) ou parseDate
                const dnRaw = servidor.dadosOriginais.DN.toString().trim();
                let dn = this.parseDataCronograma(dnRaw);
                if (!dn) {
                    dn = this.parseDate(dnRaw);
                }
                if (dn) {
                    TemDataNasc = true;
                    DataCompulsoria = new Date(dn.getFullYear() + IdadeCompulsoria, dn.getMonth(), dn.getDate());
                }
            }

            let MesesRestantesPossiveis = 0;
            if (TemDataNasc && DataCompulsoria) {
                // calcular meses entre agora e DataCompulsoria
                const years = DataCompulsoria.getFullYear() - agora.getFullYear();
                const months = DataCompulsoria.getMonth() - agora.getMonth();
                let totalMonths = years * 12 + months;
                // ajustar pelo dia do mês
                if (DataCompulsoria.getDate() < agora.getDate()) totalMonths -= 1;
                MesesRestantesPossiveis = Math.max(0, totalMonths);
            } else {
                MesesRestantesPossiveis = Math.max(0, (IdadeCompulsoria - IdadeAtual) * 12);
            }

            const MesesNecessariosParaLicencas = LicencasRestantes;
            const FolgaEmMeses = MesesRestantesPossiveis - MesesNecessariosParaLicencas;

            // Elegibilidade para aposentadoria voluntária (pontos e idade mínima)
            const sexo = (servidor.sexo || '').toString().toLowerCase();
            const AtingiuPontos = (sexo === 'f' || sexo === 'fem' || sexo === 'fem.')
                ? PontosAtuais >= PontosMinimosMulher
                : PontosAtuais >= PontosMinimosHomem;

            const AtingiuIdadeMinima = (sexo === 'f' || sexo === 'fem' || sexo === 'fem.')
                ? IdadeAtual >= IdadeMinimaMulher
                : IdadeAtual >= IdadeMinimaHomem;

            // Ajuste da regra: exigir ambas ou qualquer uma (padrão: exigir ambas)
            const ExigeAmbasRegras = true;
            const PodeAposentarAgora = ExigeAmbasRegras ? (AtingiuPontos && AtingiuIdadeMinima) : (AtingiuPontos || AtingiuIdadeMinima);

            // Lógica de níveis (seguindo a estrutura proposta)
            // Crítico
            if ((PodeAposentarAgora && LicencasRestantes > 0)
                || (MesesNecessariosParaLicencas > MesesRestantesPossiveis)
                || (FolgaEmMeses <= MargemDeSegurancaEmMeses)) {
                return 'Crítico';
            }

            // Alto: folga pequena (até 2x a margem)
            if (FolgaEmMeses <= MargemDeSegurancaEmMeses * 2) {
                return 'Alto';
            }

            // Moderado: pendências de agendamento/organização
            if (LicencasNaoAgendadas > 0) {
                return 'Moderado';
            }

            // Baixo (padrão)
            return 'Baixo';
        } catch (e) {
            console.error('Erro ao calcular nível de urgência:', e);
            return 'Baixo';
        }
    }

    // Processar período de licença prêmio (formato mês inicial - mês final)
    processarPeriodoLicencaPremio(inicioMes, finalMes) {
        try {
            const agora = new Date();
            const anoAtual = agora.getFullYear();
            
            const inicioInfo = this.getMonthYearFromText(inicioMes);
            const finalInfo = this.getMonthYearFromText(finalMes);
            const mesInicio = inicioInfo?.month || null;
            const mesFinal = finalInfo?.month || null;
            
            if (!mesInicio || !mesFinal) {
                console.warn(`Meses inválidos: ${inicioMes} - ${finalMes}`);
                return null;
            }
            
            // Determinar anos base — se mês contém ano explícito, respeitar
            let anoInicio = inicioInfo?.year ?? anoAtual;
            let anoFinal = finalInfo?.year ?? anoInicio;

            // Se não houver anos explícitos e final < inicio, atravessa ano
            if (!inicioInfo?.year && !finalInfo?.year && mesFinal < mesInicio) {
                anoFinal = anoInicio + 1;
            }

            // Se finalInfo contém ano e é menor que anoInicio, ajusta para próxima ocorrência
            if (finalInfo?.year && finalInfo.year < anoInicio) {
                anoFinal = finalInfo.year;
            }

            const dataInicio = new Date(anoInicio, mesInicio - 1, 1);
            const dataFinal = new Date(anoFinal, mesFinal, 0); // Último dia do mês
            
            return {
                inicio: dataInicio,
                fim: dataFinal,
                tipo: 'licenca-premio',
                descricao: `${inicioMes} - ${finalMes}`
            };
        } catch (error) {
            console.error('Erro ao processar período de licença prêmio:', error);
            return null;
        }
    }

    // Converter texto do mês para número
    parseMesTexto(mesTexto) {
        if (!mesTexto) return null;
        const key = this.normalizeMonthKey(mesTexto);

        // Checar mapeamentos PT
        if (this.mesesCompletos[key]) return this.mesesCompletos[key];
        const abrev = key.substring(0,3);
        if (this.mesesAbrev[abrev]) return this.mesesAbrev[abrev];

    // Limitar suporte a PT-BR para evitar dependências de desenvolvimento

        return null;
    }

    // Tenta extrair mês e ano do texto, ex: "janeiro/2025" ou "jan/25" -> { month: 1, year: 2025 }
    parseMesTextoComAno(mesTexto) {
        if (!mesTexto) return null;
        // Normalizar espaços em volta de '/', remover pontos finais
        let mt = mesTexto.toString().toLowerCase().trim();
        mt = mt.replace(/\s*\/\s*/, '/').replace(/\.+$/, '').trim();

        // Formato com barra, aceitando espaços originalmente presentes: "janeiro/2025" ou "jan/2025" ou "jan/25" ou "outubro/2026"
        const slashMatch = mt.match(/^([a-zçãéíóú\.\s]+)\/(\d{2,4})$/i);
            if (slashMatch) {
            let mesPart = slashMatch[1].replace('.', '').trim();
            let anoPart = parseInt(slashMatch[2]);
            if (anoPart < 100) anoPart = this.adjustYear(anoPart);

            const key = this.normalizeMonthKey(mesPart);
                let mesNum = this.mesesCompletos[key] || this.mesesAbrev[key.substring(0,3)];
            if (mesNum) return { month: mesNum, year: anoPart };
        }

        // Formato "mês de 2025" ou "month 2025" (espaço ano)
        const deMatch = mt.match(/^([a-zçãéíóú\.\s]+)\s+de\s+(\d{4})$/i);
        if (deMatch) {
            let mesPart = deMatch[1].replace('.', '').trim();
            const anoPart = parseInt(deMatch[2]);
            const key = this.normalizeMonthKey(mesPart);
            let mesNum = this.mesesCompletos[key] || this.mesesAbrev[key.substring(0,3)];
            if (mesNum) return { month: mesNum, year: anoPart };
        }

        // Também aceitar formato "outubro 2026" (sem 'de')
        const spaceYearMatch = mt.match(/^([a-zçãéíóú\.\s]+)\s+(\d{4})$/i);
        if (spaceYearMatch) {
            let mesPart = spaceYearMatch[1].replace('.', '').trim();
            const anoPart = parseInt(spaceYearMatch[2]);
            const key = this.normalizeMonthKey(mesPart);
            let mesNum = this.mesesCompletos[key] || this.mesesAbrev[key.substring(0,3)];
            if (mesNum) return { month: mesNum, year: anoPart };
        }

        return null;
    }

    // Retorna objeto {month, year} onde year pode ser null se não especificado
    getMonthYearFromText(mesTexto) {
        const withYear = this.parseMesTextoComAno(mesTexto);
        if (withYear) return withYear;
        const mesOnly = this.parseMesTexto(mesTexto);
        return mesOnly ? { month: mesOnly, year: null } : null;
    }

    // Processar período de licença prêmio criando uma licença para cada mês
    processarPeriodoLicencaPremioMultiplo(inicioMes, finalMes, periodoOriginalId = null) {
        // Melhor inferência de anos para períodos como "junho - agosto" possivelmente atravessando ano
        const agora = new Date();
        const anoAtual = agora.getFullYear();

        const inicioInfo = this.getMonthYearFromText(inicioMes);
        const finalInfo = this.getMonthYearFromText(finalMes);
        const mesInicio = inicioInfo?.month || null;
        const mesFinal = finalInfo?.month || null;

        if (!mesInicio || !mesFinal) {
            return [];
        }

        // Inferir anos com as seguintes regras:
        // - Se ambos os anos estão presentes, usá-los.
        // - Se só o ano de início está presente, assumir final no mesmo ano, a menos que o mês final seja menor -> ano+1.
        // - Se só o ano final está presente, assumir início no mesmo ano, a menos que o mês final seja menor que o início -> início no ano-1.
        // - Se nenhum ano presente, assumir ano atual e, se final < início, atravessa ano.
        let anoInicio;
        let anoFinal;

        if (inicioInfo?.year && finalInfo?.year) {
            anoInicio = inicioInfo.year;
            anoFinal = finalInfo.year;
        } else if (inicioInfo?.year && !finalInfo?.year) {
            anoInicio = inicioInfo.year;
            anoFinal = anoInicio + (mesFinal < mesInicio ? 1 : 0);
        } else if (!inicioInfo?.year && finalInfo?.year) {
            anoFinal = finalInfo.year;
            anoInicio = anoFinal - (mesFinal < mesInicio ? 1 : 0);
        } else {
            anoInicio = anoAtual;
            anoFinal = anoInicio + (mesFinal < mesInicio ? 1 : 0);
        }

        const start = new Date(anoInicio, mesInicio - 1, 1);
        let end = new Date(anoFinal, mesFinal - 1, 1);

        // Garantia: se por algum motivo end for anterior a start, avançar end até ficar >= start
        if (end < start) {
            end = new Date(start.getFullYear() + 1, mesFinal - 1, 1);
        }

        const licencas = [];
        for (let cursor = new Date(start); cursor <= end; cursor = this.adicionarMeses(cursor, 1)) {
            const inicioMesData = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
            const fimMesData = this.calcularFimLicenca(inicioMesData);

            licencas.push({
                inicio: inicioMesData,
                fim: fimMesData,
                tipo: 'licenca-premio',
                descricao: `${this.obterNomeMes(inicioMesData.getMonth() + 1)} de ${inicioMesData.getFullYear()}`,
                periodoOriginalId: periodoOriginalId || `${inicioMes}-${finalMes}`
            });
        }

        return licencas;
    }

    // Obter nome do mês por número
    obterNomeMes(numeroMes) {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return meses[numeroMes - 1] || 'Mês inválido';
    }

    // Funções utilitárias para análise estatística
    obterEstatisticas(servidores) {
        const agora = new Date();
        
        const estatisticas = {
            totalServidores: servidores.length,
            idadeMinima: Math.min(...servidores.map(s => s.idade)),
            idadeMaxima: Math.max(...servidores.map(s => s.idade)),
            anoMinimo: 2025,
            anoMaximo: 2030,
            licensasComFim: 0,
            urgencia: {
                'Crítico': 0,
                'Alto': 0,
                'Moderado': 0,
                'Baixo': 0
            },
            licencasPorMes: {},
            licencasPorAno: {}
        };

        servidores.forEach(servidor => {
            // Contar licenças com fim definido
            if (servidor.proximaLicencaFim) {
                estatisticas.licensasComFim++;
            }

            // Contar urgências
            estatisticas.urgencia[servidor.nivelUrgencia]++;

            // Contar licenças por período
            servidor.licencas.forEach(licenca => {
                const ano = licenca.inicio.getFullYear();
                const mes = licenca.inicio.getMonth();
                const chaveAno = ano.toString();
                const chaveMes = `${ano}-${mes.toString().padStart(2, '0')}`;

                estatisticas.licencasPorAno[chaveAno] = (estatisticas.licencasPorAno[chaveAno] || 0) + 1;
                estatisticas.licencasPorMes[chaveMes] = (estatisticas.licencasPorMes[chaveMes] || 0) + 1;
            });
        });

        // Atualizar anos baseado nos dados reais
        const anosLicencas = Object.keys(estatisticas.licencasPorAno).map(a => parseInt(a));
        if (anosLicencas.length > 0) {
            estatisticas.anoMinimo = Math.min(...anosLicencas);
            estatisticas.anoMaximo = Math.max(...anosLicencas);
        }

        return estatisticas;
    }
}

// Exportar para uso global
window.CronogramaParser = CronogramaParser;
}

// Modo debug inline removido para produção. Utilize logs controlados externamente se necessário.