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
    }

    // Função principal para processar dados do CSV
    processarDadosCSV(csvData) {
        console.log('Processando dados CSV:', csvData);
        
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
        
        console.log('Servidores processados:', servidores);
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
                nome: dados.SERVIDOR?.trim() || 'Nome não informado',
                cpf: dados.CPF?.trim() || '',
                idade: this.extrairIdade(dados.IDADE),
                sexo: dados.SEXO?.trim() || '',
                admissao: this.parseDate(dados.ADMISSÃO),
                meses: parseInt(dados.MESES) || 0,
                lotacao: dados.LOTAÇÃO?.trim() || '',
                superintendencia: dados.SUPERINTENDENCIA?.trim() || '',
                subsecretaria: dados.SUBSECRETARIA?.trim() || '',
                cargo: dados.CARGO?.trim() || '',
                cronograma: dados.CRONOGRAMA?.trim() || '',
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
            const inicioMes = dados['INICIO DE LICENÇA PREMIO']?.trim();
            const finalMes = dados['FINAL DE LICENÇA PREMIO']?.trim();
            
            if (inicioMes && finalMes) {
                const licencas = this.processarPeriodoLicencaPremioMultiplo(inicioMes, finalMes);
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
            
            // Para licenças prêmio, se não há próxima licença futura, usar a primeira licença disponível
            if (!proximaLicenca && servidor.licencas.length > 0) {
                const primeiraLicenca = servidor.licencas[0];
                servidor.proximaLicencaInicio = primeiraLicenca.inicio;
                servidor.proximaLicencaFim = primeiraLicenca.fim;
            } else {
                servidor.proximaLicencaInicio = proximaLicenca?.inicio || null;
                servidor.proximaLicencaFim = proximaLicenca?.fim || null;
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

    parseDate(dateStr) {
        if (!dateStr || dateStr.trim() === '') return null;
        
        try {
            // Remove aspas e espaços
            const cleaned = dateStr.replace(/['"]/g, '').trim();
            
            // Tenta vários formatos de data
            const formats = [
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/AAAA ou D/M/AAAA
                /^(\d{4})-(\d{2})-(\d{2})$/,        // AAAA-MM-DD
            ];
            
            for (const format of formats) {
                const match = cleaned.match(format);
                if (match) {
                    if (format.toString().includes('4})-')) {
                        // Formato ISO AAAA-MM-DD
                        return new Date(match[1], match[2] - 1, match[3]);
                    } else {
                        // Formato brasileiro DD/MM/AAAA
                        return new Date(match[3], match[2] - 1, match[1]);
                    }
                }
            }
            
            // Fallback: tentar Date parse direto
            const parsed = new Date(cleaned);
            return isNaN(parsed.getTime()) ? null : parsed;
        } catch (error) {
            console.warn('Erro ao processar data:', dateStr, error);
            return null;
        }
    }

    parseCronograma(cronograma) {
        if (!cronograma) return [];
        
        const licencas = [];
        const texto = cronograma.toLowerCase().trim();
        
        console.log('CRONOGRAMA:', cronograma);

        // Verificar padrões ambíguos ou impossíveis de parsear
        // APENAS casos realmente impossíveis sem informação de ano
        const padroesAmbiguos = [
            /um\s+m[êe]s\s*\([^)]*\)\s*a\s*cada\s*ano(?!\s*,\s*a\s*partir\s+de)(?!.*\d{4})/i, // Só ambíguo se não tiver ano em lugar nenhum
        ];
        
        for (const padrao of padroesAmbiguos) {
            if (padrao.test(texto)) {
                console.log(JSON.stringify({
                    status: "ERRO",
                    original: cronograma,
                    motivo: "Cronograma ambíguo - não é possível determinar o ano de início",
                    interpretado: []
                }, null, 2));
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
        
        console.log(JSON.stringify(result, null, 2));
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
            const [dia, mes, ano] = dataStr.split('/');
            let anoCompleto = parseInt(ano);
            
            // Ajustar ano de 2 dígitos
            if (anoCompleto < 100) {
                anoCompleto += anoCompleto > 50 ? 1900 : 2000;
            }
            
            return new Date(anoCompleto, parseInt(mes) - 1, parseInt(dia));
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
        if (!servidor.proximaLicencaInicio) return 'Baixo';
        
        const agora = new Date();
        const diasAteProxima = Math.ceil((servidor.proximaLicencaInicio - agora) / (1000 * 60 * 60 * 24));
        
        if (diasAteProxima <= 30) return 'Crítico';
        if (diasAteProxima <= 90) return 'Alto';
        if (diasAteProxima <= 180) return 'Moderado';
        return 'Baixo';
    }

    // Processar período de licença prêmio (formato mês inicial - mês final)
    processarPeriodoLicencaPremio(inicioMes, finalMes) {
        try {
            const agora = new Date();
            const anoAtual = agora.getFullYear();
            
            const mesInicio = this.parseMesTexto(inicioMes);
            const mesFinal = this.parseMesTexto(finalMes);
            
            if (!mesInicio || !mesFinal) {
                console.warn(`Meses inválidos: ${inicioMes} - ${finalMes}`);
                return null;
            }
            
            // Usar sempre o ano atual, não tentar adivinhar
            let anoInicio = anoAtual;
            let anoFinal = anoAtual;
            
            // Apenas se o período atravessa o ano (ex: novembro-fevereiro)
            if (mesFinal < mesInicio) {
                anoFinal = anoInicio + 1;
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
        
        const mesLimpo = mesTexto.toLowerCase().trim();
        
        // Verificar meses completos
        if (this.mesesCompletos[mesLimpo]) {
            return this.mesesCompletos[mesLimpo];
        }
        
        // Verificar abreviações
        const mesAbrev = mesLimpo.substring(0, 3);
        if (this.mesesAbrev[mesAbrev]) {
            return this.mesesAbrev[mesAbrev];
        }
        
        return null;
    }

    // Processar período de licença prêmio criando uma licença para cada mês
    processarPeriodoLicencaPremioMultiplo(inicioMes, finalMes) {
        try {
            const agora = new Date();
            const anoAtual = agora.getFullYear();
            const mesAtual = agora.getMonth(); // 0-based
            
            const mesInicio = this.parseMesTexto(inicioMes);
            const mesFinal = this.parseMesTexto(finalMes);
            
            if (!mesInicio || !mesFinal) {
                console.warn(`Meses inválidos: ${inicioMes} - ${finalMes}`);
                return [];
            }
            
            const licencas = [];
            
            // Para licenças prêmio sem ano especificado, usar sempre o ano atual
            // Não assumir se são dados passados ou futuros - deixar como estão
            let anoBase = anoAtual;
            
            // Criar uma licença para cada mês no período
            let mesCorrente = mesInicio;
            let anoCorrente = anoBase;
            
            // Caso especial: período atravessa o ano (ex: novembro-fevereiro)
            const atravessaAno = mesFinal < mesInicio;
            
            do {
                const dataInicio = new Date(anoCorrente, mesCorrente - 1, 1);
                const dataFinal = new Date(anoCorrente, mesCorrente, 0); // Último dia do mês
                
                licencas.push({
                    inicio: dataInicio,
                    fim: dataFinal,
                    tipo: 'licenca-premio',
                    descricao: `${this.obterNomeMes(mesCorrente)} de ${anoCorrente}`
                });
                
                mesCorrente++;
                
                // Se chegou ao final do ano, vai para o próximo ano
                if (mesCorrente > 12) {
                    mesCorrente = 1;
                    anoCorrente++;
                }
                
                // Condições de parada
                if (atravessaAno) {
                    // Para períodos que atravessam o ano, para quando chegar no mês final do próximo ano
                    if (mesCorrente > mesFinal && anoCorrente > anoBase) {
                        break;
                    }
                } else {
                    // Para períodos normais, para quando chegar no mês final do mesmo ano
                    if (mesCorrente > mesFinal) {
                        break;
                    }
                }
                
                // Proteção contra loop infinito - máximo 12 meses
                if (licencas.length >= 12) {
                    break;
                }
                
            } while (true);
            
            return licencas;
            
        } catch (error) {
            console.error('Erro ao processar período múltiplo de licença prêmio:', error);
            return [];
        }
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