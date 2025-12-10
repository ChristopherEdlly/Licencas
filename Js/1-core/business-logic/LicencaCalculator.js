/**
 * LicencaCalculator - Cálculos de licença-prêmio
 * Lógica de negócio para aquisição, gozo, conversão e saldo de licenças
 */

// Compatibilidade Node.js / Browser
const DateUtils = (typeof window !== 'undefined' && window.DateUtils) || (typeof require !== 'undefined' && require('../utilities/DateUtils.js'));
const MathUtils = (typeof window !== 'undefined' && window.MathUtils) || (typeof require !== 'undefined' && require('../utilities/MathUtils.js'));
const ValidationUtils = (typeof window !== 'undefined' && window.ValidationUtils) || (typeof require !== 'undefined' && require('../utilities/ValidationUtils.js'));

const LicencaCalculator = {

    /**
     * Calcula dias totais de licença adquirida
     * @param {Date|string} dataAquisicao - Data de aquisição
     * @returns {number} Dias de licença (padrão: 90 dias para 5 anos)
     */
    calcularDiasAdquiridos(dataAquisicao) {
        if (!dataAquisicao) {
            console.log('[LicencaCalculator] Data de aquisição não fornecida');
            return 0;
        }

        // Padrão legal: 90 dias a cada 5 anos
        return 90;
    },

    /**
     * Calcula dias gozados de licença
     * @param {Date|string} dataInicio - Data de início do gozo
     * @param {Date|string} dataFim - Data de fim do gozo
     * @returns {number} Dias gozados
     */
    calcularDiasGozados(dataInicio, dataFim) {
        if (!dataInicio || !dataFim) {
            console.log('[LicencaCalculator] Datas de gozo incompletas');
            return 0;
        }

        const inicio = DateUtils.parseDate(dataInicio);
        const fim = DateUtils.parseDate(dataFim);

        if (!inicio || !fim) {
            console.log('[LicencaCalculator] Erro ao processar datas de gozo');
            return 0;
        }

        // Calcula diferença em dias (inclusivo)
        const dias = DateUtils.diffInDays(inicio, fim) + 1;
        return dias > 0 ? dias : 0;
    },

    /**
     * Calcula dias convertidos em abono pecuniário
     * @param {number} diasTotal - Total de dias disponíveis
     * @param {number} percentualConversao - Percentual a converter (ex: 33.33 para 1/3)
     * @returns {number} Dias convertidos
     */
    calcularDiasConvertidos(diasTotal, percentualConversao) {
        if (!ValidationUtils.isValidNumber(diasTotal) || !ValidationUtils.isValidNumber(percentualConversao)) {
            return 0;
        }

        if (diasTotal <= 0 || percentualConversao <= 0) {
            return 0;
        }

        // Calcula conversão e arredonda
        const diasConvertidos = (diasTotal * percentualConversao) / 100;
        return MathUtils.round(diasConvertidos);
    },

    /**
     * Calcula saldo restante de licença
     * @param {number} diasAdquiridos - Dias adquiridos
     * @param {number} diasGozados - Dias já gozados
     * @param {number} diasConvertidos - Dias convertidos em abono
     * @returns {number} Saldo de dias
     */
    calcularSaldo(diasAdquiridos, diasGozados = 0, diasConvertidos = 0) {
        if (!ValidationUtils.isValidNumber(diasAdquiridos)) {
            return 0;
        }

        const saldo = diasAdquiridos - diasGozados - diasConvertidos;
        return saldo > 0 ? saldo : 0;
    },

    /**
     * Calcula percentual de utilização da licença
     * @param {number} diasUtilizados - Dias utilizados (gozados + convertidos)
     * @param {number} diasTotal - Total de dias disponíveis
     * @returns {number} Percentual de utilização (0-100)
     */
    calcularPercentualUtilizacao(diasUtilizados, diasTotal) {
        if (!ValidationUtils.isValidNumber(diasUtilizados) || !ValidationUtils.isValidNumber(diasTotal)) {
            return 0;
        }

        if (diasTotal === 0) {
            return 0;
        }

        const percentual = MathUtils.percentage(diasUtilizados, diasTotal);
        return MathUtils.round(percentual, 2);
    },

    /**
     * Verifica se licença está completamente utilizada
     * @param {number} saldo - Saldo de dias
     * @returns {boolean} True se totalmente utilizada
     */
    isLicencaTotalmenteUtilizada(saldo) {
        return ValidationUtils.isValidNumber(saldo) && saldo === 0;
    },

    /**
     * Verifica se licença está parcialmente utilizada
     * @param {number} diasAdquiridos - Dias adquiridos
     * @param {number} saldo - Saldo atual
     * @returns {boolean} True se parcialmente utilizada
     */
    isLicencaParcialmenteUtilizada(diasAdquiridos, saldo) {
        if (!ValidationUtils.isValidNumber(diasAdquiridos) || !ValidationUtils.isValidNumber(saldo)) {
            return false;
        }

        return saldo > 0 && saldo < diasAdquiridos;
    },

    /**
     * Calcula data prevista de término do gozo
     * @param {Date|string} dataInicio - Data de início
     * @param {number} dias - Número de dias
     * @returns {Date|null} Data de término prevista
     */
    calcularDataTermino(dataInicio, dias) {
        if (!dataInicio || !ValidationUtils.isValidNumber(dias) || dias <= 0) {
            return null;
        }

        const inicio = DateUtils.parseDate(dataInicio);
        if (!inicio) {
            return null;
        }

        return DateUtils.addDays(inicio, dias - 1); // -1 porque o primeiro dia conta
    },

    /**
     * Calcula dias restantes até o início de uma licença
     * @param {Date|string} dataInicio - Data de início programada
     * @param {Date|string} dataReferencia - Data de referência (default: hoje)
     * @returns {number} Dias restantes (negativo se já passou)
     */
    calcularDiasAteInicio(dataInicio, dataReferencia = null) {
        if (!dataInicio) {
            return 0;
        }

        const inicio = DateUtils.parseDate(dataInicio);
        const referencia = dataReferencia ? DateUtils.parseDate(dataReferencia) : new Date();

        if (!inicio || !referencia) {
            return 0;
        }

        return DateUtils.diffInDays(referencia, inicio);
    },

    /**
     * Verifica se uma licença está dentro de um período
     * @param {Date|string} dataInicio - Data de início da licença
     * @param {Date|string} dataFim - Data de fim da licença
     * @param {Date|string} periodoInicio - Início do período
     * @param {Date|string} periodoFim - Fim do período
     * @returns {boolean} True se há sobreposição
     */
    isLicencaNoPeriodo(dataInicio, dataFim, periodoInicio, periodoFim) {
        if (!dataInicio || !dataFim || !periodoInicio || !periodoFim) {
            return false;
        }

        const licInicio = DateUtils.parseDate(dataInicio);
        const licFim = DateUtils.parseDate(dataFim);
        const perInicio = DateUtils.parseDate(periodoInicio);
        const perFim = DateUtils.parseDate(periodoFim);

        if (!licInicio || !licFim || !perInicio || !perFim) {
            return false;
        }

        // Verifica sobreposição: licença começa antes do fim do período E termina depois do início
        return licInicio <= perFim && licFim >= perInicio;
    },

    /**
     * Calcula número de licenças que expiram em um período
     * @param {Array} licencas - Array de licenças
     * @param {Date|string} periodoInicio - Início do período
     * @param {Date|string} periodoFim - Fim do período
     * @returns {number} Quantidade de licenças que expiram
     */
    contarLicencasExpirandoNoPeriodo(licencas, periodoInicio, periodoFim) {
        if (!Array.isArray(licencas) || licencas.length === 0) {
            return 0;
        }

        const perInicio = DateUtils.parseDate(periodoInicio);
        const perFim = DateUtils.parseDate(periodoFim);

        if (!perInicio || !perFim) {
            return 0;
        }

        return licencas.filter(lic => {
            if (!lic.dataExpiracao) return false;

            const expiracao = DateUtils.parseDate(lic.dataExpiracao);
            if (!expiracao) return false;

            return expiracao >= perInicio && expiracao <= perFim;
        }).length;
    },

    /**
     * Calcula projeção de utilização futura
     * @param {number} saldoAtual - Saldo atual
     * @param {number} mediaDiasGozadosPorMes - Média histórica
     * @param {number} meses - Número de meses a projetar
     * @returns {Object} Projeção com saldo projetado e mês de esgotamento
     */
    calcularProjecaoUtilizacao(saldoAtual, mediaDiasGozadosPorMes, meses) {
        if (!ValidationUtils.isValidNumber(saldoAtual) ||
            !ValidationUtils.isValidNumber(mediaDiasGozadosPorMes) ||
            !ValidationUtils.isValidNumber(meses)) {
            return { saldoProjetado: saldoAtual, mesEsgotamento: null };
        }

        if (mediaDiasGozadosPorMes <= 0) {
            return { saldoProjetado: saldoAtual, mesEsgotamento: null };
        }

        const diasTotais = mediaDiasGozadosPorMes * meses;
        const saldoProjetado = saldoAtual - diasTotais;

        // Calcula em qual mês o saldo se esgota
        let mesEsgotamento = null;
        if (saldoAtual > 0 && mediaDiasGozadosPorMes > 0) {
            mesEsgotamento = Math.ceil(saldoAtual / mediaDiasGozadosPorMes);
        }

        return {
            saldoProjetado: saldoProjetado > 0 ? MathUtils.round(saldoProjetado) : 0,
            mesEsgotamento: mesEsgotamento
        };
    },

    /**
     * Calcula impacto financeiro da conversão em abono
     * @param {number} diasConvertidos - Dias a converter
     * @param {number} salarioDiario - Salário diário do servidor
     * @returns {number} Valor do abono
     */
    calcularValorAbono(diasConvertidos, salarioDiario) {
        if (!ValidationUtils.isValidNumber(diasConvertidos) || !ValidationUtils.isValidNumber(salarioDiario)) {
            return 0;
        }

        if (diasConvertidos <= 0 || salarioDiario <= 0) {
            return 0;
        }

        const valor = diasConvertidos * salarioDiario;
        return MathUtils.round(valor, 2);
    },

    /**
     * Sugere melhor estratégia de utilização baseada no saldo
     * @param {number} saldo - Saldo atual
     * @param {Date|string} dataExpiracao - Data de expiração
     * @param {Date|string} dataReferencia - Data de referência (default: hoje)
     * @returns {Object} Estratégia sugerida
     */
    sugerirEstrategia(saldo, dataExpiracao, dataReferencia = null) {
        if (!ValidationUtils.isValidNumber(saldo) || saldo <= 0) {
            return { estrategia: 'nenhuma', urgencia: 'baixa', detalhes: 'Sem saldo disponível' };
        }

        const referencia = dataReferencia ? DateUtils.parseDate(dataReferencia) : new Date();
        const expiracao = DateUtils.parseDate(dataExpiracao);

        if (!expiracao || !referencia) {
            return { estrategia: 'indefinida', urgencia: 'baixa', detalhes: 'Dados insuficientes' };
        }

        const diasAteExpiracao = DateUtils.diffInDays(referencia, expiracao);

        if (diasAteExpiracao < 0) {
            return { estrategia: 'expirada', urgencia: 'crítica', detalhes: 'Licença já expirou' };
        }

        if (diasAteExpiracao <= 30) {
            return {
                estrategia: 'urgente',
                urgencia: 'crítica',
                detalhes: `Apenas ${diasAteExpiracao} dias até expiração. Programar imediatamente!`
            };
        }

        if (diasAteExpiracao <= 90) {
            return {
                estrategia: 'programar',
                urgencia: 'alta',
                detalhes: `${diasAteExpiracao} dias até expiração. Programar nas próximas semanas.`
            };
        }

        if (diasAteExpiracao <= 180) {
            return {
                estrategia: 'planejar',
                urgencia: 'média',
                detalhes: `${diasAteExpiracao} dias até expiração. Iniciar planejamento.`
            };
        }

        // Sugerir conversão se saldo pequeno e tempo suficiente
        if (saldo <= 30) {
            return {
                estrategia: 'converter',
                urgencia: 'baixa',
                detalhes: 'Considerar conversão parcial em abono pecuniário.'
            };
        }

        return {
            estrategia: 'monitorar',
            urgencia: 'baixa',
            detalhes: `${diasAteExpiracao} dias até expiração. Sem ações urgentes necessárias.`
        };
    },

    /**
     * Valida se uma solicitação de licença é viável
     * @param {number} diasSolicitados - Dias solicitados
     * @param {number} saldoDisponivel - Saldo disponível
     * @param {Date|string} dataInicio - Data de início proposta
     * @param {Array} licencasExistentes - Licenças já programadas
     * @returns {Object} Resultado da validação
     */
    validarSolicitacao(diasSolicitados, saldoDisponivel, dataInicio, licencasExistentes = []) {
        const erros = [];
        const avisos = [];

        // Valida saldo
        if (!ValidationUtils.isValidNumber(diasSolicitados) || diasSolicitados <= 0) {
            erros.push('Número de dias inválido');
        }

        if (!ValidationUtils.isValidNumber(saldoDisponivel) || saldoDisponivel <= 0) {
            erros.push('Sem saldo disponível');
        }

        if (diasSolicitados > saldoDisponivel) {
            erros.push(`Dias solicitados (${diasSolicitados}) excedem saldo disponível (${saldoDisponivel})`);
        }

        // Valida data
        const inicio = DateUtils.parseDate(dataInicio);
        if (!inicio) {
            erros.push('Data de início inválida');
        } else {
            const hoje = new Date();
            if (inicio < hoje) {
                avisos.push('Data de início no passado');
            }

            // Verifica conflitos com licenças existentes
            const dataFim = this.calcularDataTermino(inicio, diasSolicitados);
            if (dataFim && Array.isArray(licencasExistentes)) {
                const conflitos = licencasExistentes.filter(lic =>
                    this.isLicencaNoPeriodo(inicio, dataFim, lic.dataInicio, lic.dataFim)
                );

                if (conflitos.length > 0) {
                    erros.push(`Conflito com ${conflitos.length} licença(s) existente(s)`);
                }
            }
        }

        const valida = erros.length === 0;

        return {
            valida,
            erros,
            avisos,
            diasDisponiveis: saldoDisponivel,
            diasSolicitados
        };
    }
};

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicencaCalculator;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.LicencaCalculator = LicencaCalculator;
}
