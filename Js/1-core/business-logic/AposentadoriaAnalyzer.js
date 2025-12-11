/**
 * AposentadoriaAnalyzer - Módulo de análise de aposentadoria
 *
 * Responsabilidades:
 * - Calcular elegibilidade para aposentadoria
 * - Projetar datas de aposentadoria
 * - Analisar impacto de licenças na aposentadoria
 * - Gerar relatórios de aposentadoria
 *
 * @module AposentadoriaAnalyzer
 *
 * Dependências globais: DateUtils, ValidationUtils, MathUtils
 */

/**
 * Regras de aposentadoria conforme legislação brasileira
 */
const REGRAS_APOSENTADORIA = {
    // Aposentadoria por idade (regra geral pós-reforma 2019)
    IDADE_MINIMA_HOMEM: 65,
    IDADE_MINIMA_MULHER: 62,
    TEMPO_CONTRIBUICAO_MINIMO: 15, // anos
    
    // Aposentadoria por tempo de contribuição (regra de transição)
    TEMPO_CONTRIBUICAO_INTEGRAL_HOMEM: 35, // anos
    TEMPO_CONTRIBUICAO_INTEGRAL_MULHER: 30, // anos
    
    // Sistema de pontos (idade + tempo de contribuição)
    PONTOS_MINIMOS_HOMEM: 100,
    PONTOS_MINIMOS_MULHER: 90,
    
    // Pedágio (regra de transição)
    PEDAGIO_50: 0.5, // 50% do tempo que faltava em 13/11/2019
    PEDAGIO_100: 1.0, // 100% do tempo que faltava
    
    // Idade mínima para pedágio 100%
    IDADE_PEDAGIO_100_HOMEM: 60,
    IDADE_PEDAGIO_100_MULHER: 57
};

/**
 * Tipos de aposentadoria disponíveis
 */
const TIPOS_APOSENTADORIA = {
    IDADE: 'idade',
    TEMPO_CONTRIBUICAO: 'tempo_contribuicao',
    PONTOS: 'pontos',
    PEDAGIO_50: 'pedagio_50',
    PEDAGIO_100: 'pedagio_100',
    ESPECIAL: 'especial',
    COMPULSORIA: 'compulsoria'
};

/**
 * Calcula a idade atual de uma pessoa
 * 
 * @param {string|Date} dataNascimento - Data de nascimento
 * @param {string|Date} [dataReferencia] - Data de referência (padrão: hoje)
 * @returns {number} Idade em anos
 */
function calcularIdade(dataNascimento, dataReferencia = new Date()) {
    if (!ValidationUtils.isValidDate(dataNascimento)) {
        throw new Error('Data de nascimento inválida');
    }
    
    const nascimento = DateUtils.parseDate(dataNascimento);
    const referencia = DateUtils.parseDate(dataReferencia);
    
    let idade = referencia.getFullYear() - nascimento.getFullYear();
    const mesAtual = referencia.getMonth();
    const mesNascimento = nascimento.getMonth();
    
    // Ajusta se ainda não fez aniversário no ano
    if (mesAtual < mesNascimento || 
        (mesAtual === mesNascimento && referencia.getDate() < nascimento.getDate())) {
        idade--;
    }
    
    return idade;
}

/**
 * Calcula tempo de contribuição considerando licenças
 * 
 * @param {string|Date} dataAdmissao - Data de admissão
 * @param {Array<Object>} [licencas] - Licenças do servidor
 * @param {string|Date} [dataReferencia] - Data de referência
 * @returns {Object} Tempo de contribuição detalhado
 */
function calcularTempoContribuicao(dataAdmissao, licencas = [], dataReferencia = new Date()) {
    if (!ValidationUtils.isValidDate(dataAdmissao)) {
        throw new Error('Data de admissão inválida');
    }
    
    const admissao = DateUtils.parseDate(dataAdmissao);
    const referencia = DateUtils.parseDate(dataReferencia);
    
    // Tempo bruto em dias
    const diasTotais = DateUtils.diffInDays(admissao, referencia);
    
    // Calcular dias de licença sem remuneração (não contam para aposentadoria)
    let diasLicencaSemRemuneracao = 0;
    let diasLicencaPremio = 0;
    let diasOutrasLicencas = 0;
    
    if (Array.isArray(licencas)) {
        licencas.forEach(licenca => {
            const tipo = (licenca.tipoLicenca || '').toLowerCase();
            const dias = parseInt(licenca.diasAdquiridos) || 0;
            
            if (tipo.includes('sem') && tipo.includes('remuneração')) {
                diasLicencaSemRemuneracao += dias;
            } else if (tipo.includes('prêmio')) {
                diasLicencaPremio += dias;
            } else {
                diasOutrasLicencas += dias;
            }
        });
    }
    
    // Dias que contam para aposentadoria
    // Licença prêmio e outras licenças remuneradas contam
    const diasContribuicao = diasTotais - diasLicencaSemRemuneracao;
    
    return {
        diasTotais,
        diasContribuicao,
        anosContribuicao: MathUtils.round(diasContribuicao / 365, 2),
        diasLicencaSemRemuneracao,
        diasLicencaPremio,
        diasOutrasLicencas
    };
}

/**
 * Verifica elegibilidade para aposentadoria por idade
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Resultado da verificação
 */
function verificarElegibilidadeIdade(servidor) {
    if (!servidor || !servidor.dataNascimento) {
        throw new Error('Dados do servidor inválidos');
    }
    
    const idade = calcularIdade(servidor.dataNascimento);
    const sexo = (servidor.sexo || '').toUpperCase();
    const tempoContrib = calcularTempoContribuicao(
        servidor.dataAdmissao, 
        servidor.licencas
    );
    
    const idadeMinima = sexo === 'F' ? 
        REGRAS_APOSENTADORIA.IDADE_MINIMA_MULHER : 
        REGRAS_APOSENTADORIA.IDADE_MINIMA_HOMEM;
    
    const temIdadeSuficiente = idade >= idadeMinima;
    const temTempoMinimo = tempoContrib.anosContribuicao >= REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_MINIMO;
    
    const elegivel = temIdadeSuficiente && temTempoMinimo;
    
    return {
        tipo: TIPOS_APOSENTADORIA.IDADE,
        elegivel,
        idadeAtual: idade,
        idadeMinima,
        idadeFaltante: Math.max(0, idadeMinima - idade),
        tempoContribuicao: tempoContrib.anosContribuicao,
        tempoMinimo: REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_MINIMO,
        tempoFaltante: Math.max(0, REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_MINIMO - tempoContrib.anosContribuicao),
        requisitos: {
            idade: temIdadeSuficiente,
            tempoContribuicao: temTempoMinimo
        }
    };
}

/**
 * Verifica elegibilidade para aposentadoria por tempo de contribuição
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Resultado da verificação
 */
function verificarElegibilidadeTempoContribuicao(servidor) {
    if (!servidor || !servidor.dataNascimento) {
        throw new Error('Dados do servidor inválidos');
    }
    
    const sexo = (servidor.sexo || '').toUpperCase();
    const tempoContrib = calcularTempoContribuicao(
        servidor.dataAdmissao, 
        servidor.licencas
    );
    
    const tempoMinimo = sexo === 'F' ? 
        REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_INTEGRAL_MULHER : 
        REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_INTEGRAL_HOMEM;
    
    const elegivel = tempoContrib.anosContribuicao >= tempoMinimo;
    
    return {
        tipo: TIPOS_APOSENTADORIA.TEMPO_CONTRIBUICAO,
        elegivel,
        tempoContribuicao: tempoContrib.anosContribuicao,
        tempoMinimo,
        tempoFaltante: Math.max(0, tempoMinimo - tempoContrib.anosContribuicao),
        diasTotais: tempoContrib.diasTotais,
        diasContribuicao: tempoContrib.diasContribuicao
    };
}

/**
 * Verifica elegibilidade para aposentadoria por pontos
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Resultado da verificação
 */
function verificarElegibilidadePontos(servidor) {
    if (!servidor || !servidor.dataNascimento) {
        throw new Error('Dados do servidor inválidos');
    }
    
    const idade = calcularIdade(servidor.dataNascimento);
    const sexo = (servidor.sexo || '').toUpperCase();
    const tempoContrib = calcularTempoContribuicao(
        servidor.dataAdmissao, 
        servidor.licencas
    );
    
    const pontosAtuais = idade + tempoContrib.anosContribuicao;
    const pontosMinimos = sexo === 'F' ? 
        REGRAS_APOSENTADORIA.PONTOS_MINIMOS_MULHER : 
        REGRAS_APOSENTADORIA.PONTOS_MINIMOS_HOMEM;
    
    const tempoMinimo = sexo === 'F' ? 
        REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_INTEGRAL_MULHER : 
        REGRAS_APOSENTADORIA.TEMPO_CONTRIBUICAO_INTEGRAL_HOMEM;
    
    const temPontosNecessarios = pontosAtuais >= pontosMinimos;
    const temTempoMinimo = tempoContrib.anosContribuicao >= tempoMinimo;
    const elegivel = temPontosNecessarios && temTempoMinimo;
    
    return {
        tipo: TIPOS_APOSENTADORIA.PONTOS,
        elegivel,
        pontosAtuais: MathUtils.round(pontosAtuais, 1),
        pontosMinimos,
        pontosFaltantes: Math.max(0, pontosMinimos - pontosAtuais),
        idade,
        tempoContribuicao: tempoContrib.anosContribuicao,
        tempoMinimo,
        requisitos: {
            pontos: temPontosNecessarios,
            tempoContribuicao: temTempoMinimo
        }
    };
}

/**
 * Projeta data de aposentadoria baseada nas regras mais favoráveis
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Projeção de aposentadoria
 */
function projetarAposentadoria(servidor) {
    if (!servidor || !servidor.dataNascimento) {
        throw new Error('Dados do servidor inválidos');
    }
    
    const idade = verificarElegibilidadeIdade(servidor);
    const tempo = verificarElegibilidadeTempoContribuicao(servidor);
    const pontos = verificarElegibilidadePontos(servidor);
    
    // Identifica opções elegíveis
    const opcoesElegiveis = [idade, tempo, pontos].filter(o => o.elegivel);
    
    // Se já é elegível para alguma modalidade
    if (opcoesElegiveis.length > 0) {
        return {
            elegivelAgora: true,
            melhorOpcao: opcoesElegiveis[0],
            todasOpcoes: opcoesElegiveis,
            dataProjetada: new Date(),
            diasAteAposentadoria: 0
        };
    }
    
    // Calcula quando será elegível para cada modalidade
    const projecoes = [];
    
    // Projeção por idade
    if (idade.idadeFaltante > 0 || idade.tempoFaltante > 0) {
        const anosAteIdade = Math.max(idade.idadeFaltante, idade.tempoFaltante);
        const dataIdade = DateUtils.addDays(new Date(), anosAteIdade * 365);
        projecoes.push({
            tipo: TIPOS_APOSENTADORIA.IDADE,
            dataProjetada: dataIdade,
            diasAte: DateUtils.diffInDays(new Date(), dataIdade),
            detalhes: idade
        });
    }
    
    // Projeção por tempo de contribuição
    if (tempo.tempoFaltante > 0) {
        const diasAte = Math.ceil(tempo.tempoFaltante * 365);
        const dataTempo = DateUtils.addDays(new Date(), diasAte);
        projecoes.push({
            tipo: TIPOS_APOSENTADORIA.TEMPO_CONTRIBUICAO,
            dataProjetada: dataTempo,
            diasAte,
            detalhes: tempo
        });
    }
    
    // Projeção por pontos
    if (pontos.pontosFaltantes > 0) {
        // Assume que ganha 1 ponto por ano (idade + tempo)
        const anosAtePontos = Math.ceil(pontos.pontosFaltantes / 2);
        const dataPontos = DateUtils.addDays(new Date(), anosAtePontos * 365);
        projecoes.push({
            tipo: TIPOS_APOSENTADORIA.PONTOS,
            dataProjetada: dataPontos,
            diasAte: DateUtils.diffInDays(new Date(), dataPontos),
            detalhes: pontos
        });
    }
    
    // Ordena por data mais próxima
    projecoes.sort((a, b) => a.diasAte - b.diasAte);
    
    return {
        elegivelAgora: false,
        melhorOpcao: projecoes[0],
        todasProjecoes: projecoes,
        dataProjetada: projecoes[0]?.dataProjetada,
        diasAteAposentadoria: projecoes[0]?.diasAte || 0
    };
}

/**
 * Analisa impacto de licenças na aposentadoria
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Análise de impacto
 */
function analisarImpactoLicencas(servidor) {
    if (!servidor || !servidor.dataAdmissao) {
        throw new Error('Dados do servidor inválidos');
    }
    
    // Calcula tempo com e sem licenças
    const tempoComLicencas = calcularTempoContribuicao(
        servidor.dataAdmissao, 
        servidor.licencas
    );
    
    const tempoSemLicencas = calcularTempoContribuicao(
        servidor.dataAdmissao, 
        []
    );
    
    const diasImpacto = tempoSemLicencas.diasContribuicao - tempoComLicencas.diasContribuicao;
    const anosImpacto = MathUtils.round(diasImpacto / 365, 2);
    
    // Projeta aposentadoria com e sem licenças
    const projecaoComLicencas = projetarAposentadoria(servidor);
    
    const servidorSemLicencas = { ...servidor, licencas: [] };
    const projecaoSemLicencas = projetarAposentadoria(servidorSemLicencas);
    
    const diasAtraso = projecaoComLicencas.diasAteAposentadoria - 
                       projecaoSemLicencas.diasAteAposentadoria;
    
    return {
        temImpacto: diasImpacto > 0,
        diasImpacto,
        anosImpacto,
        diasAtraso: Math.max(0, diasAtraso),
        tempoComLicencas: tempoComLicencas.anosContribuicao,
        tempoSemLicencas: tempoSemLicencas.anosContribuicao,
        projecaoComLicencas: projecaoComLicencas.dataProjetada,
        projecaoSemLicencas: projecaoSemLicencas.dataProjetada,
        licencasSemRemuneracao: tempoComLicencas.diasLicencaSemRemuneracao,
        detalhamento: {
            comLicencas: projecaoComLicencas,
            semLicencas: projecaoSemLicencas
        }
    };
}

/**
 * Gera relatório completo de aposentadoria
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Relatório completo
 */
function gerarRelatorioAposentadoria(servidor) {
    if (!servidor) {
        throw new Error('Servidor inválido');
    }
    
    const idade = calcularIdade(servidor.dataNascimento);
    const tempoContrib = calcularTempoContribuicao(
        servidor.dataAdmissao, 
        servidor.licencas
    );
    
    const elegibilidadeIdade = verificarElegibilidadeIdade(servidor);
    const elegibilidadeTempo = verificarElegibilidadeTempoContribuicao(servidor);
    const elegibilidadePontos = verificarElegibilidadePontos(servidor);
    
    const projecao = projetarAposentadoria(servidor);
    const impacto = analisarImpactoLicencas(servidor);
    
    return {
        servidor: {
            nome: servidor.nome || 'Não informado',
            dataNascimento: servidor.dataNascimento,
            dataAdmissao: servidor.dataAdmissao,
            sexo: servidor.sexo || 'N/A',
            cargo: servidor.cargo || 'Não informado'
        },
        situacaoAtual: {
            idade,
            tempoContribuicao: tempoContrib.anosContribuicao,
            diasTotais: tempoContrib.diasTotais,
            diasContribuicao: tempoContrib.diasContribuicao
        },
        elegibilidade: {
            porIdade: elegibilidadeIdade,
            porTempo: elegibilidadeTempo,
            porPontos: elegibilidadePontos,
            elegivelAgora: projecao.elegivelAgora
        },
        projecao: {
            elegivelAgora: projecao.elegivelAgora,
            melhorOpcao: projecao.melhorOpcao,
            dataProjetada: projecao.dataProjetada,
            diasAteAposentadoria: projecao.diasAteAposentadoria,
            anosAteAposentadoria: MathUtils.round(
                projecao.diasAteAposentadoria / 365, 
                1
            )
        },
        impactoLicencas: impacto,
        alertas: gerarAlertasAposentadoria(projecao, impacto)
    };
}

/**
 * Gera alertas sobre aposentadoria
 * 
 * @param {Object} projecao - Projeção de aposentadoria
 * @param {Object} impacto - Impacto de licenças
 * @returns {Array<Object>} Lista de alertas
 */
function gerarAlertasAposentadoria(projecao, impacto) {
    const alertas = [];
    
    if (projecao.elegivelAgora) {
        alertas.push({
            tipo: 'info',
            nivel: 'alto',
            mensagem: 'Servidor já elegível para aposentadoria',
            modalidade: projecao.melhorOpcao.tipo
        });
    } else if (projecao.diasAteAposentadoria <= 365) {
        alertas.push({
            tipo: 'warning',
            nivel: 'alto',
            mensagem: `Faltam menos de 1 ano para elegibilidade (${Math.ceil(projecao.diasAteAposentadoria / 30)} meses)`,
            dataProjetada: projecao.dataProjetada
        });
    } else if (projecao.diasAteAposentadoria <= 730) {
        alertas.push({
            tipo: 'info',
            nivel: 'medio',
            mensagem: `Faltam aproximadamente ${Math.ceil(projecao.diasAteAposentadoria / 365)} anos para elegibilidade`,
            dataProjetada: projecao.dataProjetada
        });
    }
    
    if (impacto.temImpacto && impacto.anosImpacto >= 1) {
        alertas.push({
            tipo: 'warning',
            nivel: 'medio',
            mensagem: `Licenças sem remuneração impactam ${impacto.anosImpacto} anos na aposentadoria`,
            diasImpacto: impacto.diasImpacto
        });
    }
    
    if (impacto.diasAtraso > 365) {
        alertas.push({
            tipo: 'alert',
            nivel: 'alto',
            mensagem: `Licenças atrasam aposentadoria em ${Math.ceil(impacto.diasAtraso / 365)} anos`,
            diasAtraso: impacto.diasAtraso
        });
    }
    
    return alertas;
}

/**
 * Calcula percentual de progresso até aposentadoria
 * 
 * @param {Object} servidor - Dados do servidor
 * @returns {Object} Progresso detalhado
 */
function calcularProgressoAposentadoria(servidor) {
    if (!servidor) {
        throw new Error('Servidor inválido');
    }
    
    const idade = verificarElegibilidadeIdade(servidor);
    const tempo = verificarElegibilidadeTempoContribuicao(servidor);
    const pontos = verificarElegibilidadePontos(servidor);
    
    // Calcula progresso para cada modalidade
    const progressoIdade = Math.min(100, 
        (idade.idadeAtual / idade.idadeMinima) * 100
    );
    
    const progressoTempo = Math.min(100, 
        (tempo.tempoContribuicao / tempo.tempoMinimo) * 100
    );
    
    const progressoPontos = Math.min(100, 
        (pontos.pontosAtuais / pontos.pontosMinimos) * 100
    );
    
    // Progresso geral é o maior dos três
    const progressoGeral = Math.max(progressoIdade, progressoTempo, progressoPontos);
    
    return {
        geral: MathUtils.round(progressoGeral, 1),
        porIdade: MathUtils.round(progressoIdade, 1),
        porTempo: MathUtils.round(progressoTempo, 1),
        porPontos: MathUtils.round(progressoPontos, 1),
        maisProximo: progressoGeral === progressoIdade ? 'idade' :
                     progressoGeral === progressoTempo ? 'tempo' : 'pontos'
    };
}

// Exporta módulo para uso global
const AposentadoriaAnalyzer = {
    // Constantes
    REGRAS_APOSENTADORIA,
    TIPOS_APOSENTADORIA,

    // Funções principais
    calcularIdade,
    calcularTempoContribuicao,
    verificarElegibilidadeIdade,
    verificarElegibilidadeTempoContribuicao,
    verificarElegibilidadePontos,
    projetarAposentadoria,
    analisarImpactoLicencas,
    gerarRelatorioAposentadoria,
    calcularProgressoAposentadoria
};

// Exportar para uso no browser
if (typeof window !== 'undefined') {
    window.AposentadoriaAnalyzer = AposentadoriaAnalyzer;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AposentadoriaAnalyzer;
}
