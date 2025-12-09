/**
 * AposentadoriaAnalyzer.js
 * Módulo responsável por calcular aposentadoria com base nas regras brasileiras
 * 
 * Regras implementadas:
 * 1. Por idade: 62F / 65M + 15 anos de contribuição
 * 2. Por pontos: 92F / 102M em 2025 (soma idade + tempo de serviço)
 * 3. Por idade progressiva: 59F / 64M em 2025
 */

class AposentadoriaAnalyzer {
    constructor() {
        this.dateUtils = new DateUtils();
        
        // Regras de aposentadoria (atualizadas para 2025)
        this.regras = {
            porIdade: {
                idadeMinima: { F: 62, M: 65 },
                tempoContribuicaoMinimo: 15
            },
            porPontos: {
                // Pontos aumentam 1 por ano até limite
                pontosMinimos2025: { F: 92, M: 102 },
                pontosMaximos: { F: 100, M: 105 },
                incrementoAnual: 1,
                anoBase: 2025
            },
            porIdadeProgressiva: {
                // Idade aumenta 6 meses por ano até limite
                idadeMinima2025: { F: 59, M: 64 },
                idadeMaxima: { F: 62, M: 65 },
                incrementoSemestral: 0.5,
                anoBase: 2025,
                tempoContribuicaoMinimo: 30
            }
        };
    }

    /**
     * Calcula data prevista de aposentadoria usando todas as regras
     * @param {Object} servidor - Dados do servidor
     * @returns {Object} Análise completa de aposentadoria
     */
    calcularAposentadoria(servidor) {
        const sexo = servidor.sexo || 'M';
        const idade = servidor.idade || 0;
        const dataAdmissao = servidor.dataAdmissao;
        const tempoServico = servidor.tempoServico || 0;

        // Calcular cada regra
        const porIdade = this.calcularPorIdade(idade, tempoServico, sexo, dataAdmissao);
        const porPontos = this.calcularPorPontos(idade, tempoServico, sexo, dataAdmissao);
        const porIdadeProgressiva = this.calcularPorIdadeProgressiva(idade, tempoServico, sexo, dataAdmissao);

        // Determinar qual é a mais próxima
        const opcoes = [porIdade, porPontos, porIdadeProgressiva].filter(o => o.elegivel);
        
        let melhorOpcao = null;
        let dataMaisProxima = null;

        opcoes.forEach(opcao => {
            if (!dataMaisProxima || opcao.dataPrevista < dataMaisProxima) {
                dataMaisProxima = opcao.dataPrevista;
                melhorOpcao = opcao;
            }
        });

        return {
            elegivel: opcoes.length > 0,
            melhorOpcao: melhorOpcao,
            porIdade: porIdade,
            porPontos: porPontos,
            porIdadeProgressiva: porIdadeProgressiva,
            todasOpcoes: opcoes,
            dataPrevista: dataMaisProxima,
            anosRestantes: dataMaisProxima ? 
                Math.max(0, Math.floor((dataMaisProxima - new Date()) / (365.25 * 24 * 60 * 60 * 1000))) : null
        };
    }

    /**
     * Calcula aposentadoria por idade (regra permanente)
     * @param {number} idade - Idade atual
     * @param {number} tempoServico - Tempo de serviço em anos
     * @param {string} sexo - Sexo (M/F)
     * @param {Date} dataAdmissao - Data de admissão
     * @returns {Object} Análise da regra
     */
    calcularPorIdade(idade, tempoServico, sexo, dataAdmissao) {
        const idadeMinima = this.regras.porIdade.idadeMinima[sexo];
        const tempoMinimo = this.regras.porIdade.tempoContribuicaoMinimo;

        const anosAteIdade = Math.max(0, idadeMinima - idade);
        const anosAteTempoMinimo = Math.max(0, tempoMinimo - tempoServico);
        const anosNecessarios = Math.max(anosAteIdade, anosAteTempoMinimo);

        const elegivel = idade >= idadeMinima && tempoServico >= tempoMinimo;
        const dataPrevista = this.calcularDataFutura(anosNecessarios);

        return {
            tipo: 'Por Idade',
            descricao: `${idadeMinima} anos de idade + ${tempoMinimo} anos de contribuição`,
            elegivel: elegivel,
            atendeIdade: idade >= idadeMinima,
            atendeTempo: tempoServico >= tempoMinimo,
            idadeAtual: idade,
            idadeNecessaria: idadeMinima,
            tempoServicoAtual: tempoServico,
            tempoNecessario: tempoMinimo,
            anosRestantes: anosNecessarios,
            dataPrevista: dataPrevista
        };
    }

    /**
     * Calcula aposentadoria por pontos (soma idade + tempo)
     * @param {number} idade - Idade atual
     * @param {number} tempoServico - Tempo de serviço em anos
     * @param {string} sexo - Sexo (M/F)
     * @param {Date} dataAdmissao - Data de admissão
     * @returns {Object} Análise da regra
     */
    calcularPorPontos(idade, tempoServico, sexo, dataAdmissao) {
        const anoAtual = new Date().getFullYear();
        const anosDesdeBase = anoAtual - this.regras.porPontos.anoBase;
        
        // Calcular pontos necessários para o ano atual
        const pontosBase = this.regras.porPontos.pontosMinimos2025[sexo];
        const pontosMax = this.regras.porPontos.pontosMaximos[sexo];
        const pontosNecessarios = Math.min(
            pontosBase + (anosDesdeBase * this.regras.porPontos.incrementoAnual),
            pontosMax
        );

        const pontosAtuais = idade + tempoServico;
        const pontosFaltam = Math.max(0, pontosNecessarios - pontosAtuais);

        // Cada ano adiciona 2 pontos (1 de idade + 1 de tempo de serviço)
        const anosNecessarios = Math.ceil(pontosFaltam / 2);
        const elegivel = pontosAtuais >= pontosNecessarios;
        const dataPrevista = this.calcularDataFutura(anosNecessarios);

        return {
            tipo: 'Por Pontos',
            descricao: `${pontosNecessarios} pontos (idade + tempo de serviço)`,
            elegivel: elegivel,
            pontosAtuais: pontosAtuais,
            pontosNecessarios: pontosNecessarios,
            pontosFaltam: pontosFaltam,
            anosRestantes: anosNecessarios,
            dataPrevista: dataPrevista,
            detalhamento: `${idade} (idade) + ${tempoServico} (tempo) = ${pontosAtuais} pontos`
        };
    }

    /**
     * Calcula aposentadoria por idade progressiva
     * @param {number} idade - Idade atual
     * @param {number} tempoServico - Tempo de serviço em anos
     * @param {string} sexo - Sexo (M/F)
     * @param {Date} dataAdmissao - Data de admissão
     * @returns {Object} Análise da regra
     */
    calcularPorIdadeProgressiva(idade, tempoServico, sexo, dataAdmissao) {
        const anoAtual = new Date().getFullYear();
        const anosDesdeBase = anoAtual - this.regras.porIdadeProgressiva.anoBase;
        
        // Calcular idade mínima para o ano atual
        const idadeBase = this.regras.porIdadeProgressiva.idadeMinima2025[sexo];
        const idadeMax = this.regras.porIdadeProgressiva.idadeMaxima[sexo];
        
        // Incremento é 0.5 por ano (6 meses)
        const idadeMinima = Math.min(
            idadeBase + (anosDesdeBase * this.regras.porIdadeProgressiva.incrementoSemestral),
            idadeMax
        );

        const tempoMinimo = this.regras.porIdadeProgressiva.tempoContribuicaoMinimo;

        const anosAteIdade = Math.max(0, idadeMinima - idade);
        const anosAteTempoMinimo = Math.max(0, tempoMinimo - tempoServico);
        const anosNecessarios = Math.max(anosAteIdade, anosAteTempoMinimo);

        const elegivel = idade >= idadeMinima && tempoServico >= tempoMinimo;
        const dataPrevista = this.calcularDataFutura(anosNecessarios);

        return {
            tipo: 'Por Idade Progressiva',
            descricao: `${idadeMinima} anos de idade + ${tempoMinimo} anos de contribuição`,
            elegivel: elegivel,
            atendeIdade: idade >= idadeMinima,
            atendeTempo: tempoServico >= tempoMinimo,
            idadeAtual: idade,
            idadeNecessaria: idadeMinima,
            tempoServicoAtual: tempoServico,
            tempoNecessario: tempoMinimo,
            anosRestantes: anosNecessarios,
            dataPrevista: dataPrevista,
            observacao: `Idade mínima aumenta 6 meses por ano até ${idadeMax}`
        };
    }

    /**
     * Calcula data futura baseada em anos
     * @param {number} anos - Quantidade de anos
     * @returns {Date} Data futura
     */
    calcularDataFutura(anos) {
        if (anos <= 0) {
            return new Date();
        }

        const dataFutura = new Date();
        dataFutura.setFullYear(dataFutura.getFullYear() + anos);
        return dataFutura;
    }

    /**
     * Gera relatório textual de aposentadoria
     * @param {Object} analise - Análise de aposentadoria
     * @returns {string} Relatório formatado
     */
    gerarRelatorio(analise) {
        if (!analise.elegivel) {
            return 'Não atende a nenhuma regra de aposentadoria no momento.';
        }

        const melhor = analise.melhorOpcao;
        const dataFormatada = this.dateUtils.formatarData(melhor.dataPrevista, 'longo');

        let relatorio = `Melhor opção: ${melhor.tipo}\n`;
        relatorio += `Data prevista: ${dataFormatada}\n`;
        relatorio += `Anos restantes: ${analise.anosRestantes}\n\n`;

        relatorio += `Todas as opções disponíveis:\n`;
        analise.todasOpcoes.forEach(opcao => {
            const data = this.dateUtils.formatarData(opcao.dataPrevista);
            relatorio += `- ${opcao.tipo}: ${data}\n`;
        });

        return relatorio;
    }

    /**
     * Verifica se servidor já pode se aposentar
     * @param {Object} servidor - Dados do servidor
     * @returns {boolean} True se já pode se aposentar
     */
    podeAposentar(servidor) {
        const analise = this.calcularAposentadoria(servidor);
        return analise.elegivel && analise.melhorOpcao.elegivel;
    }

    /**
     * Calcula anos até aposentadoria
     * @param {Object} servidor - Dados do servidor
     * @returns {number} Anos até aposentadoria (0 se já pode)
     */
    anosAteAposentadoria(servidor) {
        const analise = this.calcularAposentadoria(servidor);
        return analise.anosRestantes || 0;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AposentadoriaAnalyzer = AposentadoriaAnalyzer;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AposentadoriaAnalyzer;
}
