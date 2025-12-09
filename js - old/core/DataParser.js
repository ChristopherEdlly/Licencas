/**
 * DataParser.js
 * Módulo responsável por fazer o parsing dos dados da planilha Excel
 * Identifica automaticamente o tipo de tabela e processa os dados
 */

class DataParser {
    constructor() {
        this.dateUtils = new DateUtils();
        this.validationUtils = new ValidationUtils();
        
        // Nomes possíveis para cada campo (case-insensitive)
        this.camposPossiveis = {
            servidor: ['SERVIDOR', 'NOME', 'NOME DO SERVIDOR', 'NAME'],
            cpf: ['CPF', 'CPF DO SERVIDOR'],
            dataNascimento: ['DN', 'DATA DE NASCIMENTO', 'NASCIMENTO', 'DATA NASC', 'DT NASCIMENTO'],
            sexo: ['SEXO', 'GENERO', 'GÊNERO', 'SEX'],
            idade: ['IDADE', 'AGE'],
            admissao: ['ADMISSÃO', 'ADMISSAO', 'DATA DE ADMISSÃO', 'DATA ADMISSAO', 'DT ADMISSAO'],
            meses: ['MESES', 'MESES DE LICENÇA', 'MESES DE LICENCA', 'QTD MESES'],
            licencaConcedida: ['LICENÇA PREMIO JA CONCEDIDA', 'LICENCA PREMIO JA CONCEDIDA', 'JA CONCEDIDA', 'CONCEDIDA'],
            licencaConceder: ['LICENÇA PREMIO A CONCEDER', 'LICENCA PREMIO A CONCEDER', 'A CONCEDER', 'CONCEDER'],
            lotacao: ['LOTAÇÃO', 'LOTACAO', 'LOCAL'],
            superintendencia: ['SUPERINTENDENCIA', 'SUPERINTENDÊNCIA', 'SUPER'],
            subsecretaria: ['SUBSECRETARIA', 'SUB'],
            cargo: ['CARGO', 'FUNÇÃO', 'FUNCAO', 'POSITION'],
            inicioLicenca: [
                'INICIO DA LICENÇA', 'INICIO DA LICENCA', 'INÍCIO DA LICENÇA', 'INÍCIO DA LICENCA',
                'INICIO', 'INÍCIO', 'DATA INICIO', 'DATA INÍCIO',
                'CRONOGRAMA', 'INICIO/FIM', 'PERÍODO', 'PERIODO'
            ],
            fimLicenca: ['FIM DA LICENÇA', 'FIM DA LICENCA', 'FIM', 'DATA FIM', 'FINAL']
        };
    }

    /**
     * Detecta o tipo de tabela baseado nos headers
     * @param {Array<string>} headers - Headers da planilha
     * @returns {string} 'licenca_premio' ou 'cronograma'
     */
    detectarTipoTabela(headers) {
        const headersStr = headers.map(h => h.toLowerCase()).join(',');
        
        // Verifica se tem campos específicos de licença prêmio
        const temInicioLicenca = headersStr.includes('inicio') || headersStr.includes('início');
        const temFimLicenca = headersStr.includes('fim') || headersStr.includes('final');
        const temCronograma = headersStr.includes('cronograma');
        
        if (temInicioLicenca || temFimLicenca || temCronograma) {
            return 'licenca_premio';
        }
        
        return 'cronograma'; // Fallback para formato antigo
    }

    /**
     * Busca campo no objeto de dados (case-insensitive e fuzzy)
     * @param {Object} dados - Objeto com dados da linha
     * @param {string} tipoCampo - Tipo do campo (chave em camposPossiveis)
     * @returns {any} Valor do campo ou null
     */
    buscarCampo(dados, tipoCampo) {
        if (!dados || !this.camposPossiveis[tipoCampo]) {
            return null;
        }
        
        const nomesPossiveis = this.camposPossiveis[tipoCampo];
        return this.validationUtils.getField(dados, nomesPossiveis);
    }

    /**
     * Processa dados CSV da planilha
     * @param {string} csvData - Dados em formato CSV
     * @returns {Object} { servidores: Array, tipo: string, erros: Array }
     */
    processarCSV(csvData) {
        try {
            const linhas = csvData.split('\n').filter(l => l.trim());
            if (linhas.length === 0) {
                return { servidores: [], tipo: 'vazio', erros: ['Planilha vazia'] };
            }

            // Processar headers
            const headers = this.parseLinhaCSV(linhas[0]);
            const tipo = this.detectarTipoTabela(headers);

            const servidores = [];
            const erros = [];

            // Processar linhas de dados
            for (let i = 1; i < linhas.length; i++) {
                try {
                    const valores = this.parseLinhaCSV(linhas[i]);
                    
                    // Criar objeto de dados
                    const dados = {};
                    headers.forEach((header, index) => {
                        dados[header] = valores[index] || '';
                    });

                    // Processar servidor
                    const servidor = this.processarLinha(dados, tipo);
                    
                    if (servidor) {
                        servidores.push(servidor);
                    }
                } catch (error) {
                    erros.push({
                        linha: i + 1,
                        erro: error.message
                    });
                }
            }

            return {
                servidores,
                tipo,
                erros
            };
        } catch (error) {
            return {
                servidores: [],
                tipo: 'erro',
                erros: [error.message]
            };
        }
    }

    /**
     * Parse de uma linha CSV (lida com vírgulas dentro de aspas)
     * @param {string} linha - Linha CSV
     * @returns {Array<string>} Valores da linha
     */
    parseLinhaCSV(linha) {
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
        return valores;
    }

    /**
     * Processa uma linha de dados
     * @param {Object} dados - Dados da linha
     * @param {string} tipo - Tipo da tabela
     * @returns {Object|null} Objeto servidor ou null se inválido
     */
    processarLinha(dados, tipo) {
        // Extrair nome do servidor (campo obrigatório)
        const nome = this.buscarCampo(dados, 'servidor');
        
        if (!this.validationUtils.validarNomeServidor(nome)) {
            return null; // Linha inválida, pular
        }

        // Validar dados
        const validacao = this.validationUtils.validarServidor({
            SERVIDOR: nome,
            CPF: this.buscarCampo(dados, 'cpf'),
            SEXO: this.buscarCampo(dados, 'sexo'),
            IDADE: this.buscarCampo(dados, 'idade'),
            MESES: this.buscarCampo(dados, 'meses')
        });

        // Extrair campos comuns
        const servidor = {
            nome: nome.trim(),
            cpf: this.buscarCampo(dados, 'cpf') || '',
            sexo: this.validationUtils.normalizarSexo(this.buscarCampo(dados, 'sexo')),
            idade: this.validationUtils.extrairIdade(this.buscarCampo(dados, 'idade')),
            cargo: this.buscarCampo(dados, 'cargo') || '',
            lotacao: this.buscarCampo(dados, 'lotacao') || '',
            superintendencia: this.buscarCampo(dados, 'superintendencia') || '',
            subsecretaria: this.buscarCampo(dados, 'subsecretaria') || '',
            mesesLicenca: this.validationUtils.extrairMeses(this.buscarCampo(dados, 'meses')),
            licencaConcedida: this.validationUtils.extrairMeses(this.buscarCampo(dados, 'licencaConcedida')),
            licencaConceder: this.validationUtils.extrairMeses(this.buscarCampo(dados, 'licencaConceder')),
            validacao: validacao,
            tipo: tipo
        };

        // Processar datas
        this.processarDatas(servidor, dados);

        // Processar data de nascimento
        const dnStr = this.buscarCampo(dados, 'dataNascimento');
        if (dnStr) {
            const dnParsed = this.dateUtils.parseSingleDate(dnStr);
            if (dnParsed) {
                servidor.dataNascimento = dnParsed;
                
                // Recalcular idade se não foi fornecida
                if (!servidor.idade) {
                    servidor.idade = this.dateUtils.calcularIdade(dnParsed);
                }
            }
        }

        // Processar data de admissão
        const admissaoStr = this.buscarCampo(dados, 'admissao');
        if (admissaoStr) {
            const admissaoParsed = this.dateUtils.parseSingleDate(admissaoStr);
            if (admissaoParsed) {
                servidor.dataAdmissao = admissaoParsed;
                servidor.tempoServico = this.dateUtils.calcularTempoServico(admissaoParsed);
            }
        }

        return servidor;
    }

    /**
     * Processa datas de início e fim da licença
     * @param {Object} servidor - Objeto do servidor
     * @param {Object} dados - Dados brutos
     */
    processarDatas(servidor, dados) {
        const inicioStr = this.buscarCampo(dados, 'inicioLicenca');
        const fimStr = this.buscarCampo(dados, 'fimLicenca');

        // Parse da data de início
        if (inicioStr) {
            const resultado = this.dateUtils.parseData(inicioStr);
            
            if (resultado) {
                servidor.inicioLicenca = resultado.inicio;
                servidor.tipoData = resultado.tipo;
                
                // Se for período customizado, já temos o fim
                if (resultado.tipo === 'periodo_customizado' && resultado.fim) {
                    servidor.fimLicenca = resultado.fim;
                    servidor.diasLicenca = this.dateUtils.diferencaDias(resultado.inicio, resultado.fim);
                    servidor.mesesCalculados = Math.ceil(servidor.diasLicenca / 30);
                }
            } else {
                // Data inválida
                servidor.validacao.avisos.push({
                    campo: 'inicioLicenca',
                    mensagem: `Formato de data não reconhecido: ${inicioStr}`
                });
            }
        }

        // Parse da data de fim (se fornecida separadamente)
        if (fimStr && !servidor.fimLicenca) {
            const fimParsed = this.dateUtils.parseSingleDate(fimStr);
            if (fimParsed) {
                servidor.fimLicenca = fimParsed;
                
                if (servidor.inicioLicenca) {
                    servidor.diasLicenca = this.dateUtils.diferencaDias(servidor.inicioLicenca, fimParsed);
                    servidor.mesesCalculados = Math.ceil(servidor.diasLicenca / 30);
                }
            }
        }

        // Marcar se não tem licença agendada
        if (!servidor.inicioLicenca) {
            servidor.semLicenca = true;
        }
    }

    /**
     * Agrupa servidores por nome (múltiplas linhas do mesmo servidor)
     * @param {Array} servidores - Lista de servidores
     * @returns {Map} Map de servidores agrupados por nome
     */
    agruparServidoresPorNome(servidores) {
        const grupos = new Map();

        servidores.forEach(servidor => {
            const nome = servidor.nome.toUpperCase().trim();
            
            if (!grupos.has(nome)) {
                grupos.set(nome, {
                    ...servidor,
                    licencas: []
                });
            }

            const grupo = grupos.get(nome);

            // Adicionar licença se houver
            if (servidor.inicioLicenca) {
                grupo.licencas.push({
                    inicio: servidor.inicioLicenca,
                    fim: servidor.fimLicenca,
                    meses: servidor.mesesLicenca,
                    dias: servidor.diasLicenca,
                    tipo: servidor.tipoData
                });
            }

            // Somar meses totais
            if (servidor.mesesLicenca) {
                grupo.mesesLicenca = (grupo.mesesLicenca || 0) + servidor.mesesLicenca;
            }
        });

        return grupos;
    }

    /**
     * Valida e retorna resumo do parsing
     * @param {Array} servidores - Lista de servidores
     * @returns {Object} Resumo do parsing
     */
    obterResumo(servidores) {
        const total = servidores.length;
        const comLicenca = servidores.filter(s => s.inicioLicenca).length;
        const semLicenca = total - comLicenca;
        const comErros = servidores.filter(s => s.validacao.erros.length > 0).length;
        const comAvisos = servidores.filter(s => s.validacao.avisos.length > 0).length;

        return {
            total,
            comLicenca,
            semLicenca,
            comErros,
            comAvisos,
            porcentagemComLicenca: total > 0 ? (comLicenca / total) * 100 : 0
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DataParser = DataParser;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataParser;
}
