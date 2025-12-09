/**
 * OperationalImpact - Módulo de análise de impacto operacional
 * 
 * Responsabilidades:
 * - Calcular impacto de licenças nas operações
 * - Analisar disponibilidade de equipe
 * - Avaliar riscos operacionais
 * - Gerar recomendações de gestão
 * 
 * @module OperationalImpact
 */

import ValidationUtils from '../utilities/ValidationUtils.js';
import MathUtils from '../utilities/MathUtils.js';
import DateUtils from '../utilities/DateUtils.js';

/**
 * Níveis de impacto operacional
 */
const IMPACT_LEVELS = {
    CRITICO: {
        value: 5,
        label: 'Crítico',
        color: '#dc3545',
        threshold: 0.7 // 70% ou mais da equipe ausente
    },
    ALTO: {
        value: 4,
        label: 'Alto',
        color: '#fd7e14',
        threshold: 0.5 // 50-69% ausente
    },
    MODERADO: {
        value: 3,
        label: 'Moderado',
        color: '#ffc107',
        threshold: 0.3 // 30-49% ausente
    },
    BAIXO: {
        value: 2,
        label: 'Baixo',
        color: '#17a2b8',
        threshold: 0.15 // 15-29% ausente
    },
    MINIMO: {
        value: 1,
        label: 'Mínimo',
        color: '#28a745',
        threshold: 0 // Menos de 15% ausente
    }
};

/**
 * Categorias de cargo por criticidade operacional
 */
const CARGO_CRITICIDADE = {
    ALTA: ['gestor', 'coordenador', 'supervisor', 'diretor', 'gerente', 'chefe'],
    MEDIA: ['analista', 'técnico', 'especialista', 'assistente'],
    BAIXA: ['auxiliar', 'apoio', 'estagiário', 'trainee']
};

/**
 * Calcula impacto operacional de uma licença
 * 
 * @param {Object} licenca - Dados da licença
 * @param {Object} servidor - Dados do servidor
 * @param {Object} [options] - Opções adicionais
 * @returns {Object} Análise de impacto
 */
function calcularImpactoLicenca(licenca, servidor, options = {}) {
    if (!licenca || !servidor) {
        throw new Error('Licença e servidor são obrigatórios');
    }

    const diasLicenca = parseInt(licenca.diasAdquiridos) || 0;
    const saldo = parseInt(licenca.saldo) || 0;
    const cargo = (servidor.cargo || '').toLowerCase();
    
    // Calcula criticidade do cargo
    const criticidadeCargo = calcularCriticidadeCargo(cargo);
    
    // Calcula impacto pela duração
    let impactoDuracao = 1;
    if (saldo > 60) {
        impactoDuracao = 5; // Crítico
    } else if (saldo > 30) {
        impactoDuracao = 4; // Alto
    } else if (saldo > 15) {
        impactoDuracao = 3; // Moderado
    } else if (saldo > 7) {
        impactoDuracao = 2; // Baixo
    }
    
    // Calcula impacto pela proporção usada
    const proporcaoUsada = diasLicenca > 0 ? 
        (diasLicenca - saldo) / diasLicenca : 0;
    
    let impactoProporcao = 1;
    if (proporcaoUsada > 0.8) {
        impactoProporcao = 5; // Crítico - quase tudo usado
    } else if (proporcaoUsada > 0.6) {
        impactoProporcao = 4; // Alto
    } else if (proporcaoUsada > 0.4) {
        impactoProporcao = 3; // Moderado
    } else if (proporcaoUsada > 0.2) {
        impactoProporcao = 2; // Baixo
    }
    
    // Score final ponderado
    const scoreImpacto = (
        criticidadeCargo * 0.4 +
        impactoDuracao * 0.35 +
        impactoProporcao * 0.25
    );
    
    const nivelImpacto = obterNivelImpacto(scoreImpacto);
    
    return {
        scoreImpacto: MathUtils.round(scoreImpacto, 2),
        nivelImpacto,
        criticidadeCargo,
        impactoDuracao,
        impactoProporcao,
        diasLicenca,
        saldo,
        proporcaoUsada: MathUtils.round(proporcaoUsada * 100, 1),
        detalhes: {
            cargo,
            tempoAusencia: `${saldo} dias`,
            nivelLabel: nivelImpacto.label,
            cor: nivelImpacto.color
        }
    };
}

/**
 * Calcula criticidade do cargo
 * 
 * @param {string} cargo - Nome do cargo
 * @returns {number} Nível de criticidade (1-5)
 */
function calcularCriticidadeCargo(cargo) {
    if (!cargo) return 2; // Média por padrão
    
    const cargoLower = cargo.toLowerCase();
    
    // Alta criticidade
    for (const termo of CARGO_CRITICIDADE.ALTA) {
        if (cargoLower.includes(termo)) {
            return 5;
        }
    }
    
    // Média criticidade
    for (const termo of CARGO_CRITICIDADE.MEDIA) {
        if (cargoLower.includes(termo)) {
            return 3;
        }
    }
    
    // Baixa criticidade
    for (const termo of CARGO_CRITICIDADE.BAIXA) {
        if (cargoLower.includes(termo)) {
            return 1;
        }
    }
    
    return 2; // Padrão médio-baixo
}

/**
 * Obtém nível de impacto baseado no score
 * 
 * @param {number} score - Score de impacto (1-5)
 * @returns {Object} Nível de impacto
 */
function obterNivelImpacto(score) {
    if (score >= 4.5) return IMPACT_LEVELS.CRITICO;
    if (score >= 3.5) return IMPACT_LEVELS.ALTO;
    if (score >= 2.5) return IMPACT_LEVELS.MODERADO;
    if (score >= 1.5) return IMPACT_LEVELS.BAIXO;
    return IMPACT_LEVELS.MINIMO;
}

/**
 * Analisa impacto em uma equipe/departamento
 * 
 * @param {Array<Object>} servidores - Lista de servidores da equipe
 * @returns {Object} Análise de impacto da equipe
 */
function analisarImpactoEquipe(servidores) {
    if (!Array.isArray(servidores) || servidores.length === 0) {
        throw new Error('Lista de servidores inválida');
    }
    
    const totalServidores = servidores.length;
    let servidoresComLicenca = 0;
    let totalDiasAusencia = 0;
    let impactosIndividuais = [];
    
    servidores.forEach(servidor => {
        if (servidor.licencas && Array.isArray(servidor.licencas)) {
            servidor.licencas.forEach(licenca => {
                const saldo = parseInt(licenca.saldo) || 0;
                if (saldo > 0) {
                    servidoresComLicenca++;
                    totalDiasAusencia += saldo;
                    
                    const impacto = calcularImpactoLicenca(licenca, servidor);
                    impactosIndividuais.push({
                        servidor: servidor.nome || 'Não informado',
                        cargo: servidor.cargo || 'Não informado',
                        impacto
                    });
                }
            });
        }
    });
    
    const percentualAusente = servidoresComLicenca / totalServidores;
    const mediaDiasAusencia = servidoresComLicenca > 0 ? 
        totalDiasAusencia / servidoresComLicenca : 0;
    
    // Determina nível de impacto da equipe
    let nivelImpactoEquipe = IMPACT_LEVELS.MINIMO;
    if (percentualAusente >= IMPACT_LEVELS.CRITICO.threshold) {
        nivelImpactoEquipe = IMPACT_LEVELS.CRITICO;
    } else if (percentualAusente >= IMPACT_LEVELS.ALTO.threshold) {
        nivelImpactoEquipe = IMPACT_LEVELS.ALTO;
    } else if (percentualAusente >= IMPACT_LEVELS.MODERADO.threshold) {
        nivelImpactoEquipe = IMPACT_LEVELS.MODERADO;
    } else if (percentualAusente >= IMPACT_LEVELS.BAIXO.threshold) {
        nivelImpactoEquipe = IMPACT_LEVELS.BAIXO;
    }
    
    // Ordena por impacto decrescente
    impactosIndividuais.sort((a, b) => 
        b.impacto.scoreImpacto - a.impacto.scoreImpacto
    );
    
    return {
        totalServidores,
        servidoresComLicenca,
        servidoresDisponiveis: totalServidores - servidoresComLicenca,
        percentualAusente: MathUtils.round(percentualAusente * 100, 1),
        percentualDisponivel: MathUtils.round((1 - percentualAusente) * 100, 1),
        totalDiasAusencia,
        mediaDiasAusencia: MathUtils.round(mediaDiasAusencia, 1),
        nivelImpactoEquipe,
        impactosIndividuais,
        alertas: gerarAlertasEquipe(percentualAusente, impactosIndividuais)
    };
}

/**
 * Gera alertas para a equipe
 * 
 * @param {number} percentualAusente - Percentual de ausência
 * @param {Array<Object>} impactos - Lista de impactos individuais
 * @returns {Array<Object>} Lista de alertas
 */
function gerarAlertasEquipe(percentualAusente, impactos) {
    const alertas = [];
    
    if (percentualAusente >= 0.7) {
        alertas.push({
            tipo: 'error',
            nivel: 'critico',
            mensagem: `Alerta crítico: ${MathUtils.round(percentualAusente * 100, 1)}% da equipe em licença`,
            recomendacao: 'Ação imediata necessária: reavaliar concessões de licenças'
        });
    } else if (percentualAusente >= 0.5) {
        alertas.push({
            tipo: 'warning',
            nivel: 'alto',
            mensagem: `Alerta alto: ${MathUtils.round(percentualAusente * 100, 1)}% da equipe em licença`,
            recomendacao: 'Considerar redistribuição de tarefas ou adiamento de licenças'
        });
    } else if (percentualAusente >= 0.3) {
        alertas.push({
            tipo: 'info',
            nivel: 'moderado',
            mensagem: `Impacto moderado: ${MathUtils.round(percentualAusente * 100, 1)}% da equipe em licença`,
            recomendacao: 'Monitorar situação e planejar contingências'
        });
    }
    
    // Alerta para cargos críticos
    const cargosCriticos = impactos.filter(i => 
        i.impacto.criticidadeCargo >= 4
    );
    
    if (cargosCriticos.length > 0) {
        alertas.push({
            tipo: 'warning',
            nivel: 'alto',
            mensagem: `${cargosCriticos.length} cargo(s) crítico(s) com licenças pendentes`,
            detalhes: cargosCriticos.map(c => c.cargo),
            recomendacao: 'Priorizar cobertura ou substituição para cargos de gestão'
        });
    }
    
    return alertas;
}

/**
 * Analisa conflitos de períodos de licença
 * 
 * @param {Array<Object>} licencas - Lista de licenças com datas
 * @returns {Object} Análise de conflitos
 */
function analisarConflitosLicencas(licencas) {
    if (!Array.isArray(licencas)) {
        throw new Error('Lista de licenças inválida');
    }
    
    const conflitos = [];
    const periodos = [];
    
    // Prepara períodos
    licencas.forEach((licenca, index) => {
        if (licenca.dataInicio && licenca.dataFim) {
            periodos.push({
                index,
                inicio: DateUtils.parseDate(licenca.dataInicio),
                fim: DateUtils.parseDate(licenca.dataFim),
                servidor: licenca.servidor || `Servidor ${index + 1}`,
                cargo: licenca.cargo || 'Não informado'
            });
        }
    });
    
    // Detecta sobreposições
    for (let i = 0; i < periodos.length; i++) {
        for (let j = i + 1; j < periodos.length; j++) {
            const p1 = periodos[i];
            const p2 = periodos[j];
            
            // Verifica sobreposição
            if (p1.inicio <= p2.fim && p2.inicio <= p1.fim) {
                const inicioConflito = p1.inicio > p2.inicio ? p1.inicio : p2.inicio;
                const fimConflito = p1.fim < p2.fim ? p1.fim : p2.fim;
                const diasConflito = DateUtils.diffInDays(inicioConflito, fimConflito);
                
                conflitos.push({
                    servidores: [p1.servidor, p2.servidor],
                    cargos: [p1.cargo, p2.cargo],
                    inicioConflito: DateUtils.formatBrazilianDate(inicioConflito),
                    fimConflito: DateUtils.formatBrazilianDate(fimConflito),
                    diasConflito,
                    severidade: diasConflito > 15 ? 'alta' : diasConflito > 7 ? 'media' : 'baixa'
                });
            }
        }
    }
    
    return {
        totalLicencas: periodos.length,
        conflitosDetectados: conflitos.length,
        temConflitos: conflitos.length > 0,
        conflitos: conflitos.sort((a, b) => b.diasConflito - a.diasConflito),
        severidadeMaxima: conflitos.length > 0 ? 
            conflitos[0].severidade : 'nenhuma'
    };
}

/**
 * Calcula capacidade operacional disponível
 * 
 * @param {Array<Object>} servidores - Lista de servidores
 * @param {string|Date} [dataReferencia] - Data de referência
 * @returns {Object} Análise de capacidade
 */
function calcularCapacidadeOperacional(servidores, dataReferencia = new Date()) {
    if (!Array.isArray(servidores)) {
        throw new Error('Lista de servidores inválida');
    }
    
    const referencia = DateUtils.parseDate(dataReferencia);
    const totalServidores = servidores.length;
    let capacidadeDisponivel = totalServidores;
    let capacidadeReduzida = 0;
    
    const detalhamento = {
        disponiveis: [],
        emLicenca: [],
        capacidadeReduzida: []
    };
    
    servidores.forEach(servidor => {
        let estaEmLicenca = false;
        let reducao = 0;
        
        if (servidor.licencas && Array.isArray(servidor.licencas)) {
            servidor.licencas.forEach(licenca => {
                const saldo = parseInt(licenca.saldo) || 0;
                if (saldo > 0) {
                    estaEmLicenca = true;
                    // Redução proporcional baseada no saldo
                    if (saldo > 30) {
                        reducao = 1; // Indisponível
                    } else if (saldo > 15) {
                        reducao = 0.5; // 50% reduzido
                    } else if (saldo > 7) {
                        reducao = 0.25; // 25% reduzido
                    }
                }
            });
        }
        
        if (estaEmLicenca) {
            capacidadeDisponivel -= reducao;
            capacidadeReduzida += reducao;
            
            if (reducao >= 1) {
                detalhamento.emLicenca.push({
                    nome: servidor.nome,
                    cargo: servidor.cargo,
                    reducao: '100%'
                });
            } else if (reducao > 0) {
                detalhamento.capacidadeReduzida.push({
                    nome: servidor.nome,
                    cargo: servidor.cargo,
                    reducao: `${MathUtils.round(reducao * 100, 0)}%`
                });
            }
        } else {
            detalhamento.disponiveis.push({
                nome: servidor.nome,
                cargo: servidor.cargo
            });
        }
    });
    
    const percentualCapacidade = totalServidores > 0 ? 
        (capacidadeDisponivel / totalServidores) * 100 : 100;
    
    return {
        totalServidores,
        capacidadeTotal: totalServidores,
        capacidadeDisponivel: MathUtils.round(capacidadeDisponivel, 2),
        capacidadeReduzida: MathUtils.round(capacidadeReduzida, 2),
        percentualCapacidade: MathUtils.round(percentualCapacidade, 1),
        status: percentualCapacidade >= 80 ? 'adequado' :
                percentualCapacidade >= 60 ? 'atencao' : 'critico',
        detalhamento
    };
}

/**
 * Gera recomendações de gestão
 * 
 * @param {Object} impactoEquipe - Análise de impacto da equipe
 * @param {Object} capacidade - Análise de capacidade
 * @returns {Array<Object>} Lista de recomendações
 */
function gerarRecomendacoes(impactoEquipe, capacidade) {
    const recomendacoes = [];
    
    // Recomendações baseadas no impacto
    if (impactoEquipe.nivelImpactoEquipe.value >= 4) {
        recomendacoes.push({
            prioridade: 'alta',
            categoria: 'gestao',
            acao: 'Revisar concessões de licenças imediatamente',
            justificativa: `Impacto ${impactoEquipe.nivelImpactoEquipe.label.toLowerCase()} com ${impactoEquipe.percentualAusente}% da equipe ausente`,
            prazo: 'imediato'
        });
        
        recomendacoes.push({
            prioridade: 'alta',
            categoria: 'operacional',
            acao: 'Implementar plano de contingência',
            justificativa: 'Capacidade operacional comprometida',
            prazo: '24-48h'
        });
    }
    
    // Recomendações baseadas na capacidade
    if (capacidade.percentualCapacidade < 60) {
        recomendacoes.push({
            prioridade: 'alta',
            categoria: 'recursos',
            acao: 'Buscar reforço temporário ou redistribuir cargas de trabalho',
            justificativa: `Capacidade operacional em ${capacidade.percentualCapacidade}%`,
            prazo: 'urgente'
        });
    } else if (capacidade.percentualCapacidade < 80) {
        recomendacoes.push({
            prioridade: 'media',
            categoria: 'planejamento',
            acao: 'Planejar escalonamento de licenças',
            justificativa: 'Capacidade reduzida, necessário melhor distribuição',
            prazo: '1-2 semanas'
        });
    }
    
    // Recomendações para cargos críticos
    const cargosCriticos = impactoEquipe.impactosIndividuais.filter(i => 
        i.impacto.criticidadeCargo >= 4
    );
    
    if (cargosCriticos.length > 0) {
        recomendacoes.push({
            prioridade: 'alta',
            categoria: 'cobertura',
            acao: 'Designar substitutos para cargos de gestão',
            justificativa: `${cargosCriticos.length} cargo(s) crítico(s) afetado(s)`,
            prazo: 'imediato',
            detalhes: cargosCriticos.map(c => c.cargo)
        });
    }
    
    // Recomendação preventiva
    if (impactoEquipe.percentualAusente > 20 && impactoEquipe.percentualAusente < 30) {
        recomendacoes.push({
            prioridade: 'baixa',
            categoria: 'preventiva',
            acao: 'Monitorar evolução e preparar ações preventivas',
            justificativa: 'Percentual de ausências se aproximando de limite de atenção',
            prazo: 'contínuo'
        });
    }
    
    return recomendacoes;
}

/**
 * Gera relatório completo de impacto operacional
 * 
 * @param {Array<Object>} servidores - Lista de servidores
 * @param {Object} [options] - Opções adicionais
 * @returns {Object} Relatório completo
 */
function gerarRelatorioImpacto(servidores, options = {}) {
    if (!Array.isArray(servidores)) {
        throw new Error('Lista de servidores inválida');
    }
    
    const dataReferencia = options.dataReferencia || new Date();
    
    const impactoEquipe = analisarImpactoEquipe(servidores);
    const capacidade = calcularCapacidadeOperacional(servidores, dataReferencia);
    const recomendacoes = gerarRecomendacoes(impactoEquipe, capacidade);
    
    // Prepara licenças para análise de conflitos
    const licencasComDatas = [];
    servidores.forEach(servidor => {
        if (servidor.licencas) {
            servidor.licencas.forEach(licenca => {
                if (licenca.dataInicio && licenca.dataFim) {
                    licencasComDatas.push({
                        ...licenca,
                        servidor: servidor.nome,
                        cargo: servidor.cargo
                    });
                }
            });
        }
    });
    
    const conflitos = licencasComDatas.length > 0 ? 
        analisarConflitosLicencas(licencasComDatas) : 
        { totalLicencas: 0, conflitosDetectados: 0, temConflitos: false, conflitos: [] };
    
    return {
        dataReferencia: DateUtils.formatBrazilianDate(dataReferencia),
        resumo: {
            nivelImpacto: impactoEquipe.nivelImpactoEquipe.label,
            statusCapacidade: capacidade.status,
            totalServidores: servidores.length,
            servidoresAfetados: impactoEquipe.servidoresComLicenca,
            percentualDisponibilidade: capacidade.percentualCapacidade
        },
        impactoEquipe,
        capacidade,
        conflitos,
        recomendacoes,
        alertasPrioritarios: [
            ...impactoEquipe.alertas,
            ...recomendacoes.filter(r => r.prioridade === 'alta')
        ]
    };
}

// Exporta módulo
const OperationalImpact = {
    // Constantes
    IMPACT_LEVELS,
    CARGO_CRITICIDADE,
    
    // Funções principais
    calcularImpactoLicenca,
    calcularCriticidadeCargo,
    obterNivelImpacto,
    analisarImpactoEquipe,
    analisarConflitosLicencas,
    calcularCapacidadeOperacional,
    gerarRecomendacoes,
    gerarRelatorioImpacto
};

export default OperationalImpact;
