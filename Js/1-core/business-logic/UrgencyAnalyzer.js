/**
 * UrgencyAnalyzer - Análise de urgência de licenças
 * Lógica de negócio para classificar e priorizar licenças por urgência
 */

const UrgencyAnalyzer = {

    // Helper para obter dependências
    _getDateUtils() {
        return (typeof window !== 'undefined' && window.DateUtils) || (typeof require !== 'undefined' && require('../utilities/DateUtils.js'));
    },

    // Níveis de urgência
    URGENCY_LEVELS: {
        CRITICA: { value: 5, label: 'Crítica', color: '#d32f2f', days: 30 },
        ALTA: { value: 4, label: 'Alta', color: '#f57c00', days: 60 },
        MEDIA: { value: 3, label: 'Média', color: '#fbc02d', days: 90 },
        BAIXA: { value: 2, label: 'Baixa', color: '#388e3c', days: 180 },
        NENHUMA: { value: 1, label: 'Nenhuma', color: '#757575', days: Infinity }
    },

    /**
     * Calcula urgência de uma licença baseada em dias até expiração
     * @param {Date|string} dataExpiracao - Data de expiração
     * @param {Date|string} dataReferencia - Data de referência (default: hoje)
     * @returns {Object} Nível de urgência e detalhes
     */
    calcularUrgencia(dataExpiracao, dataReferencia = null) {
        if (!dataExpiracao) {
            console.log('[UrgencyAnalyzer] Data de expiração não fornecida');
            return {
                nivel: 'NENHUMA',
                value: 1,
                label: 'Nenhuma',
                color: '#757575',
                diasRestantes: null,
                mensagem: 'Sem data de expiração'
            };
        }

        const DateUtils = this._getDateUtils();
        const expiracao = DateUtils.parseDate(dataExpiracao);
        const referencia = dataReferencia ? DateUtils.parseDate(dataReferencia) : new Date();

        if (!expiracao || !referencia) {
            console.log('[UrgencyAnalyzer] Erro ao processar datas');
            return this._createUrgencyResult('NENHUMA', null, 'Dados inválidos');
        }

        const diasRestantes = DateUtils.diffInDays(referencia, expiracao);

        // Já expirou
        if (diasRestantes < 0) {
            return this._createUrgencyResult('CRITICA', diasRestantes, 'Licença expirada!');
        }

        // Determina nível baseado em dias restantes
        if (diasRestantes <= this.URGENCY_LEVELS.CRITICA.days) {
            return this._createUrgencyResult('CRITICA', diasRestantes, `Expira em ${diasRestantes} dias!`);
        }

        if (diasRestantes <= this.URGENCY_LEVELS.ALTA.days) {
            return this._createUrgencyResult('ALTA', diasRestantes, `Expira em ${diasRestantes} dias`);
        }

        if (diasRestantes <= this.URGENCY_LEVELS.MEDIA.days) {
            return this._createUrgencyResult('MEDIA', diasRestantes, `Expira em ${diasRestantes} dias`);
        }

        if (diasRestantes <= this.URGENCY_LEVELS.BAIXA.days) {
            return this._createUrgencyResult('BAIXA', diasRestantes, `Expira em ${diasRestantes} dias`);
        }

        return this._createUrgencyResult('NENHUMA', diasRestantes, 'Sem urgência');
    },

    /**
     * Cria objeto de resultado de urgência
     * @private
     */
    _createUrgencyResult(nivel, diasRestantes, mensagem) {
        const config = this.URGENCY_LEVELS[nivel];
        return {
            nivel,
            value: config.value,
            label: config.label,
            color: config.color,
            diasRestantes,
            mensagem
        };
    },

    /**
     * Calcula urgência composta considerando múltiplos fatores
     * @param {Object} licenca - Objeto de licença com dados completos
     * @returns {Object} Análise de urgência detalhada
     */
    calcularUrgenciaComposta(licenca) {
        if (!licenca) {
            return this._createUrgencyResult('NENHUMA', null, 'Licença não fornecida');
        }

        const fatores = [];
        let pontuacaoTotal = 0;

        // Fator 1: Dias até expiração (peso: 40%)
        const urgenciaExpiracao = this.calcularUrgencia(licenca.dataExpiracao);
        pontuacaoTotal += urgenciaExpiracao.value * 0.4;
        fatores.push({
            nome: 'Expiração',
            peso: 0.4,
            pontuacao: urgenciaExpiracao.value,
            detalhes: urgenciaExpiracao.mensagem
        });

        // Fator 2: Percentual de saldo não utilizado (peso: 30%)
        if (ValidationUtils.isValidNumber(licenca.saldo) && ValidationUtils.isValidNumber(licenca.diasAdquiridos)) {
            const percentualSaldo = (licenca.saldo / licenca.diasAdquiridos) * 100;
            let pontuacaoSaldo = 1;

            if (percentualSaldo >= 90) pontuacaoSaldo = 5; // 90%+ não utilizado = crítico
            else if (percentualSaldo >= 70) pontuacaoSaldo = 4;
            else if (percentualSaldo >= 50) pontuacaoSaldo = 3;
            else if (percentualSaldo >= 30) pontuacaoSaldo = 2;

            pontuacaoTotal += pontuacaoSaldo * 0.3;
            fatores.push({
                nome: 'Saldo',
                peso: 0.3,
                pontuacao: pontuacaoSaldo,
                detalhes: `${percentualSaldo.toFixed(1)}% não utilizado`
            });
        }

        // Fator 3: Impacto operacional (peso: 20%)
        if (licenca.cargoEstrategico || licenca.funcaoGratificada) {
            pontuacaoTotal += 4 * 0.2;
            fatores.push({
                nome: 'Impacto',
                peso: 0.2,
                pontuacao: 4,
                detalhes: 'Cargo estratégico'
            });
        } else {
            pontuacaoTotal += 2 * 0.2;
            fatores.push({
                nome: 'Impacto',
                peso: 0.2,
                pontuacao: 2,
                detalhes: 'Impacto normal'
            });
        }

        // Fator 4: Histórico de prorrogações (peso: 10%)
        const prorrogacoes = licenca.numeroProrrogacoes || 0;
        let pontuacaoProrrogacao = 1;

        if (prorrogacoes >= 3) pontuacaoProrrogacao = 5;
        else if (prorrogacoes >= 2) pontuacaoProrrogacao = 4;
        else if (prorrogacoes >= 1) pontuacaoProrrogacao = 3;

        pontuacaoTotal += pontuacaoProrrogacao * 0.1;
        fatores.push({
            nome: 'Histórico',
            peso: 0.1,
            pontuacao: pontuacaoProrrogacao,
            detalhes: `${prorrogacoes} prorrogação(ões)`
        });

        // Determina nível final baseado na pontuação total
        let nivelFinal = 'NENHUMA';
        if (pontuacaoTotal >= 4.5) nivelFinal = 'CRITICA';
        else if (pontuacaoTotal >= 3.5) nivelFinal = 'ALTA';
        else if (pontuacaoTotal >= 2.5) nivelFinal = 'MEDIA';
        else if (pontuacaoTotal >= 1.5) nivelFinal = 'BAIXA';

        const config = this.URGENCY_LEVELS[nivelFinal];

        return {
            nivel: nivelFinal,
            value: config.value,
            label: config.label,
            color: config.color,
            pontuacaoTotal: parseFloat(pontuacaoTotal.toFixed(2)),
            fatores,
            diasRestantes: urgenciaExpiracao.diasRestantes,
            recomendacao: this._gerarRecomendacao(nivelFinal, urgenciaExpiracao.diasRestantes, licenca)
        };
    },

    /**
     * Gera recomendação baseada no nível de urgência
     * @private
     */
    _gerarRecomendacao(nivel, diasRestantes, licenca) {
        switch (nivel) {
            case 'CRITICA':
                if (diasRestantes < 0) {
                    return 'AÇÃO IMEDIATA: Licença expirada! Verificar possibilidade de recuperação.';
                }
                return `AÇÃO URGENTE: Programar gozo imediatamente (${diasRestantes} dias restantes).`;

            case 'ALTA':
                return `Programar gozo nas próximas 2-4 semanas (${diasRestantes} dias restantes).`;

            case 'MEDIA':
                return `Planejar gozo para os próximos 2-3 meses (${diasRestantes} dias restantes).`;

            case 'BAIXA':
                return `Monitorar e planejar com antecedência (${diasRestantes} dias restantes).`;

            default:
                return 'Sem ações urgentes necessárias.';
        }
    },

    /**
     * Classifica lista de licenças por urgência
     * @param {Array} licencas - Array de licenças
     * @param {boolean} apenasUrgentes - Retornar apenas críticas e altas
     * @returns {Array} Licenças ordenadas por urgência
     */
    classificarPorUrgencia(licencas, apenasUrgentes = false) {
        if (!Array.isArray(licencas) || licencas.length === 0) {
            return [];
        }

        // Adiciona análise de urgência a cada licença
        const licencasComUrgencia = licencas.map(lic => ({
            ...lic,
            urgencia: this.calcularUrgencia(lic.dataExpiracao)
        }));

        // Filtra se necessário
        let resultado = licencasComUrgencia;
        if (apenasUrgentes) {
            resultado = licencasComUrgencia.filter(lic =>
                lic.urgencia.value >= 4 // ALTA ou CRITICA
            );
        }

        // Ordena por valor de urgência (decrescente) e depois por dias restantes (crescente)
        return resultado.sort((a, b) => {
            if (b.urgencia.value !== a.urgencia.value) {
                return b.urgencia.value - a.urgencia.value;
            }
            // Se mesmo nível, prioriza menor dias restantes
            if (a.urgencia.diasRestantes === null) return 1;
            if (b.urgencia.diasRestantes === null) return -1;
            return a.urgencia.diasRestantes - b.urgencia.diasRestantes;
        });
    },

    /**
     * Conta licenças por nível de urgência
     * @param {Array} licencas - Array de licenças
     * @returns {Object} Contagem por nível
     */
    contarPorUrgencia(licencas) {
        if (!Array.isArray(licencas) || licencas.length === 0) {
            return {
                CRITICA: 0,
                ALTA: 0,
                MEDIA: 0,
                BAIXA: 0,
                NENHUMA: 0,
                total: 0
            };
        }

        const contagem = {
            CRITICA: 0,
            ALTA: 0,
            MEDIA: 0,
            BAIXA: 0,
            NENHUMA: 0
        };

        licencas.forEach(lic => {
            const urgencia = this.calcularUrgencia(lic.dataExpiracao);
            contagem[urgencia.nivel]++;
        });

        contagem.total = licencas.length;

        return contagem;
    },

    /**
     * Identifica licenças em risco crítico
     * @param {Array} licencas - Array de licenças
     * @param {number} diasLimite - Dias limite para considerar crítico (default: 30)
     * @returns {Array} Licenças críticas com análise detalhada
     */
    identificarCriticas(licencas, diasLimite = 30) {
        if (!Array.isArray(licencas) || licencas.length === 0) {
            return [];
        }

        return licencas
            .map(lic => {
                const urgencia = this.calcularUrgencia(lic.dataExpiracao);
                return {
                    ...lic,
                    urgencia,
                    analiseComposta: this.calcularUrgenciaComposta(lic)
                };
            })
            .filter(lic =>
                lic.urgencia.diasRestantes !== null &&
                lic.urgencia.diasRestantes <= diasLimite
            )
            .sort((a, b) => a.urgencia.diasRestantes - b.urgencia.diasRestantes);
    },

    /**
     * Gera relatório de urgências
     * @param {Array} licencas - Array de licenças
     * @returns {Object} Relatório completo
     */
    gerarRelatorioUrgencias(licencas) {
        if (!Array.isArray(licencas) || licencas.length === 0) {
            return {
                total: 0,
                contagem: this.contarPorUrgencia([]),
                criticas: [],
                altas: [],
                alertas: [],
                estatisticas: null
            };
        }

        const contagem = this.contarPorUrgencia(licencas);
        const classificadas = this.classificarPorUrgencia(licencas);

        const criticas = classificadas.filter(lic => lic.urgencia.nivel === 'CRITICA');
        const altas = classificadas.filter(lic => lic.urgencia.nivel === 'ALTA');

        const alertas = [];

        // Alerta: Muitas licenças críticas
        if (criticas.length > 5) {
            alertas.push({
                tipo: 'CRITICO',
                mensagem: `${criticas.length} licenças em situação crítica!`,
                prioridade: 5
            });
        }

        // Alerta: Alto percentual de urgentes
        const percentualUrgente = ((criticas.length + altas.length) / licencas.length) * 100;
        if (percentualUrgente > 30) {
            alertas.push({
                tipo: 'ATENCAO',
                mensagem: `${percentualUrgente.toFixed(1)}% das licenças são urgentes`,
                prioridade: 4
            });
        }

        // Alerta: Licenças expiradas
        const expiradas = criticas.filter(lic => lic.urgencia.diasRestantes < 0);
        if (expiradas.length > 0) {
            alertas.push({
                tipo: 'EXPIRADO',
                mensagem: `${expiradas.length} licença(s) já expirada(s)!`,
                prioridade: 5
            });
        }

        // Estatísticas
        const diasRestantesValidos = classificadas
            .map(lic => lic.urgencia.diasRestantes)
            .filter(d => d !== null && d >= 0);

        const estatisticas = diasRestantesValidos.length > 0 ? {
            mediaDiasRestantes: Math.round(
                diasRestantesValidos.reduce((a, b) => a + b, 0) / diasRestantesValidos.length
            ),
            menorDiasRestantes: Math.min(...diasRestantesValidos),
            maiorDiasRestantes: Math.max(...diasRestantesValidos)
        } : null;

        return {
            total: licencas.length,
            contagem,
            criticas: criticas.slice(0, 10), // Top 10 críticas
            altas: altas.slice(0, 10), // Top 10 altas
            alertas: alertas.sort((a, b) => b.prioridade - a.prioridade),
            estatisticas
        };
    },

    /**
     * Calcula score de priorização para ordenação
     * @param {Object} licenca - Licença a avaliar
     * @returns {number} Score de 0-100
     */
    calcularScorePriorizacao(licenca) {
        if (!licenca) return 0;

        const urgencia = this.calcularUrgencia(licenca.dataExpiracao);
        let score = 0;

        // 50 pontos baseados em urgência
        score += (urgencia.value / 5) * 50;

        // 30 pontos baseados em saldo não utilizado
        if (ValidationUtils.isValidNumber(licenca.saldo) && ValidationUtils.isValidNumber(licenca.diasAdquiridos)) {
            const percentualSaldo = (licenca.saldo / licenca.diasAdquiridos) * 100;
            score += (percentualSaldo / 100) * 30;
        }

        // 10 pontos para cargos estratégicos
        if (licenca.cargoEstrategico || licenca.funcaoGratificada) {
            score += 10;
        }

        // 10 pontos baseados em histórico de prorrogações
        const prorrogacoes = licenca.numeroProrrogacoes || 0;
        score += Math.min(prorrogacoes * 3, 10);

        return Math.min(Math.round(score), 100);
    },

    /**
     * Verifica se licença precisa de ação imediata
     * @param {Object} licenca - Licença a verificar
     * @param {number} diasCriticos - Dias para considerar crítico (default: 15)
     * @returns {boolean} True se precisa ação imediata
     */
    precisaAcaoImediata(licenca, diasCriticos = 15) {
        if (!licenca) return false;

        const urgencia = this.calcularUrgencia(licenca.dataExpiracao);

        // Já expirou ou vai expirar muito em breve
        if (urgencia.diasRestantes !== null && urgencia.diasRestantes <= diasCriticos) {
            return true;
        }

        // Alto saldo não utilizado e próximo de expirar
        if (ValidationUtils.isValidNumber(licenca.saldo) && ValidationUtils.isValidNumber(licenca.diasAdquiridos)) {
            const percentualSaldo = (licenca.saldo / licenca.diasAdquiridos) * 100;
            if (percentualSaldo >= 80 && urgencia.diasRestantes !== null && urgencia.diasRestantes <= 45) {
                return true;
            }
        }

        return false;
    },

    /**
     * Filtra licenças por nível de urgência
     * @param {Array} licencas - Array de licenças
     * @param {string} nivel - Nível de urgência (CRITICA, ALTA, etc)
     * @returns {Array} Licenças filtradas
     */
    filtrarPorNivel(licencas, nivel) {
        if (!Array.isArray(licencas) || !nivel) {
            return [];
        }

        return licencas
            .map(lic => ({
                ...lic,
                urgencia: this.calcularUrgencia(lic.dataExpiracao)
            }))
            .filter(lic => lic.urgencia.nivel === nivel);
    }
};

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UrgencyAnalyzer;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.UrgencyAnalyzer = UrgencyAnalyzer;
}
