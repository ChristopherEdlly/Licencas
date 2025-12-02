/**
 * LicencaCalculator.js
 * Módulo responsável pelos cálculos de licenças
 * Regras:
 * - 1 mês = sempre 30 dias (fixo, incluindo dia inicial e final)
 * - 1 licença = 3 meses = 90 dias
 * - Campo MESES indica quantos meses o servidor vai tirar
 */

class LicencaCalculator {
    constructor() {
        this.dateUtils = new DateUtils();
        this.DIAS_POR_MES = 30;
        this.MESES_POR_LICENCA = 3;
        this.DIAS_POR_LICENCA = 90;
    }

    /**
     * Calcula o fim da licença baseado no início e quantidade de meses
     * @param {Date} dataInicio - Data de início
     * @param {number} quantidadeMeses - Quantidade de meses de licença
     * @returns {Date} Data de fim
     */
    calcularFimLicenca(dataInicio, quantidadeMeses) {
        if (!dataInicio || !quantidadeMeses) {
            return null;
        }

        const totalDias = quantidadeMeses * this.DIAS_POR_MES;
        
        // Adicionar (totalDias - 1) porque o dia inicial já conta
        return this.dateUtils.adicionarDias(dataInicio, totalDias - 1);
    }

    /**
     * Divide licença em períodos de 30 dias
     * Exemplo: 3 meses = 3 períodos de 30 dias cada
     * @param {Date} dataInicio - Data de início
     * @param {number} quantidadeMeses - Quantidade de meses
     * @returns {Array<Object>} Array de períodos { inicio, fim, sequencia }
     */
    dividirEmPeriodos(dataInicio, quantidadeMeses) {
        if (!dataInicio || !quantidadeMeses) {
            return [];
        }

        const periodos = [];
        let dataAtual = new Date(dataInicio);

        for (let i = 0; i < quantidadeMeses; i++) {
            const inicio = new Date(dataAtual);
            const fim = this.dateUtils.adicionarDias(inicio, this.DIAS_POR_MES - 1);

            periodos.push({
                sequencia: i + 1,
                inicio: inicio,
                fim: fim,
                dias: this.DIAS_POR_MES,
                mesReferencia: inicio.getMonth() + 1,
                anoReferencia: inicio.getFullYear()
            });

            // Próximo período começa no dia seguinte
            dataAtual = this.dateUtils.adicionarDias(fim, 1);
        }

        return periodos;
    }

    /**
     * Calcula informações detalhadas da licença
     * @param {Object} servidor - Dados do servidor
     * @returns {Object} Informações calculadas
     */
    calcularDetalhesLicenca(servidor) {
        if (!servidor.inicioLicenca || !servidor.mesesLicenca) {
            return {
                temLicenca: false,
                inicio: null,
                fim: null,
                totalDias: 0,
                totalMeses: 0,
                quantidadeLicencas: 0,
                mesesRestantes: 0,
                periodos: []
            };
        }

        const meses = servidor.mesesLicenca;
        const inicio = servidor.inicioLicenca;
        
        // Se já tem fim calculado (período customizado), usar ele
        let fim = servidor.fimLicenca;
        if (!fim) {
            fim = this.calcularFimLicenca(inicio, meses);
        }

        const totalDias = meses * this.DIAS_POR_MES;
        const quantidadeLicencas = Math.floor(meses / this.MESES_POR_LICENCA);
        const mesesRestantes = meses % this.MESES_POR_LICENCA;

        // Dividir em períodos
        const periodos = this.dividirEmPeriodos(inicio, meses);

        return {
            temLicenca: true,
            inicio: inicio,
            fim: fim,
            totalDias: totalDias,
            totalMeses: meses,
            quantidadeLicencas: quantidadeLicencas,
            mesesRestantes: mesesRestantes,
            periodos: periodos,
            descricao: this.gerarDescricaoLicenca(quantidadeLicencas, mesesRestantes, totalDias)
        };
    }

    /**
     * Gera descrição textual da licença
     * @param {number} quantidadeLicencas - Número de licenças completas
     * @param {number} mesesRestantes - Meses restantes
     * @param {number} totalDias - Total de dias
     * @returns {string} Descrição
     */
    gerarDescricaoLicenca(quantidadeLicencas, mesesRestantes, totalDias) {
        const partes = [];

        if (quantidadeLicencas > 0) {
            partes.push(`${quantidadeLicencas} ${quantidadeLicencas === 1 ? 'licença' : 'licenças'}`);
        }

        if (mesesRestantes > 0) {
            partes.push(`${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`);
        }

        const descricao = partes.join(' + ');
        return `${descricao} (${totalDias} dias)`;
    }

    /**
     * Calcula total de licenças disponíveis baseado em licenças concedidas e a conceder
     * @param {number} licencaConcedida - Meses já concedidos
     * @param {number} licencaConceder - Meses a conceder
     * @returns {Object} { totalDisponivel, jaUsado, restante }
     */
    calcularLicencasDisponiveis(licencaConcedida = 0, licencaConceder = 0) {
        const jaUsado = licencaConcedida || 0;
        const restante = licencaConceder || 0;
        const totalDisponivel = jaUsado + restante;

        return {
            totalDisponivel: totalDisponivel,
            jaUsado: jaUsado,
            restante: restante,
            percentualUsado: totalDisponivel > 0 ? (jaUsado / totalDisponivel) * 100 : 0
        };
    }

    /**
     * Agrupa múltiplas licenças de um servidor
     * @param {Array<Object>} licencas - Array de licenças do servidor
     * @returns {Object} Licenças agrupadas e analisadas
     */
    agruparLicencas(licencas) {
        if (!licencas || licencas.length === 0) {
            return {
                total: 0,
                totalMeses: 0,
                totalDias: 0,
                periodos: [],
                proximaLicenca: null
            };
        }

        // Ordenar por data de início
        const ordenadas = licencas.sort((a, b) => a.inicio - b.inicio);

        const agora = new Date();
        const proximaLicenca = ordenadas.find(l => l.inicio > agora);

        const totalMeses = licencas.reduce((sum, l) => sum + (l.meses || 0), 0);
        const totalDias = totalMeses * this.DIAS_POR_MES;

        return {
            total: licencas.length,
            totalMeses: totalMeses,
            totalDias: totalDias,
            periodos: ordenadas,
            proximaLicenca: proximaLicenca,
            primeiraLicenca: ordenadas[0],
            ultimaLicenca: ordenadas[ordenadas.length - 1]
        };
    }

    /**
     * Verifica se uma data está dentro de algum período de licença
     * @param {Date} data - Data para verificar
     * @param {Array<Object>} periodos - Períodos de licença
     * @returns {Object|null} Período correspondente ou null
     */
    verificarDataEmLicenca(data, periodos) {
        if (!data || !periodos || periodos.length === 0) {
            return null;
        }

        return periodos.find(p => 
            this.dateUtils.estaEntrePeriodo(data, p.inicio, p.fim)
        );
    }

    /**
     * Calcula quantos dias de licença faltam até uma data limite
     * @param {Array<Object>} periodos - Períodos de licença
     * @param {Date} dataLimite - Data limite
     * @returns {number} Dias restantes
     */
    calcularDiasRestantesAte(periodos, dataLimite) {
        if (!periodos || periodos.length === 0 || !dataLimite) {
            return 0;
        }

        const agora = new Date();
        let diasRestantes = 0;

        periodos.forEach(periodo => {
            // Só contar períodos futuros ou em andamento
            if (periodo.fim >= agora && periodo.inicio <= dataLimite) {
                const inicio = periodo.inicio > agora ? periodo.inicio : agora;
                const fim = periodo.fim < dataLimite ? periodo.fim : dataLimite;
                
                if (fim >= inicio) {
                    diasRestantes += this.dateUtils.diferencaDias(inicio, fim);
                }
            }
        });

        return diasRestantes;
    }

    /**
     * Gera cronograma completo de licenças para um servidor
     * @param {Object} servidor - Dados do servidor
     * @returns {Object} Cronograma completo
     */
    gerarCronograma(servidor) {
        const detalhes = this.calcularDetalhesLicenca(servidor);
        
        if (!detalhes.temLicenca) {
            return {
                temCronograma: false,
                mensagem: 'Servidor sem licença agendada'
            };
        }

        // Calcular licenças disponíveis
        const disponiveis = this.calcularLicencasDisponiveis(
            servidor.licencaConcedida,
            servidor.licencaConceder
        );

        return {
            temCronograma: true,
            servidor: servidor.nome,
            inicio: detalhes.inicio,
            fim: detalhes.fim,
            totalMeses: detalhes.totalMeses,
            totalDias: detalhes.totalDias,
            quantidadeLicencas: detalhes.quantidadeLicencas,
            mesesRestantes: detalhes.mesesRestantes,
            descricao: detalhes.descricao,
            periodos: detalhes.periodos,
            licencasDisponiveis: disponiveis,
            utilizandoTodas: detalhes.totalMeses >= disponiveis.restante
        };
    }

    /**
     * Calcula estatísticas de licenças para um grupo de servidores
     * @param {Array<Object>} servidores - Lista de servidores
     * @returns {Object} Estatísticas
     */
    calcularEstatisticas(servidores) {
        const stats = {
            total: servidores.length,
            comLicenca: 0,
            semLicenca: 0,
            totalDiasLicenca: 0,
            totalMesesLicenca: 0,
            mediaMesesPorServidor: 0,
            servidoresComLicencaCompleta: 0,
            servidoresComLicencaParcial: 0
        };

        servidores.forEach(servidor => {
            const detalhes = this.calcularDetalhesLicenca(servidor);
            
            if (detalhes.temLicenca) {
                stats.comLicenca++;
                stats.totalDiasLicenca += detalhes.totalDias;
                stats.totalMesesLicenca += detalhes.totalMeses;

                if (detalhes.quantidadeLicencas > 0 && detalhes.mesesRestantes === 0) {
                    stats.servidoresComLicencaCompleta++;
                } else {
                    stats.servidoresComLicencaParcial++;
                }
            } else {
                stats.semLicenca++;
            }
        });

        if (stats.comLicenca > 0) {
            stats.mediaMesesPorServidor = stats.totalMesesLicenca / stats.comLicenca;
        }

        return stats;
    }

    /**
     * Valida se um cronograma de licenças é viável
     * @param {Object} cronograma - Cronograma calculado
     * @param {Date} dataLimite - Data limite (ex: aposentadoria)
     * @returns {Object} { viavel: boolean, problemas: Array }
     */
    validarCronograma(cronograma, dataLimite) {
        const problemas = [];

        if (!cronograma.temCronograma) {
            return {
                viavel: false,
                problemas: ['Sem cronograma definido']
            };
        }

        // Verificar se termina antes da data limite
        if (dataLimite && cronograma.fim > dataLimite) {
            problemas.push(`Licença termina após a data limite (${this.dateUtils.formatarData(dataLimite)})`);
        }

        // Verificar se está usando todas as licenças disponíveis
        if (cronograma.licencasDisponiveis.restante > cronograma.totalMeses) {
            const mesesNaoUsados = cronograma.licencasDisponiveis.restante - cronograma.totalMeses;
            problemas.push(`Ainda restam ${mesesNaoUsados} meses de licença disponíveis não agendados`);
        }

        return {
            viavel: problemas.length === 0,
            problemas: problemas
        };
    }

    /**
     * Calcula o balanço de licenças prêmio de um servidor
     * Baseado nos períodos aquisitivos (5 anos = 90 dias de direito)
     * @param {Array<Object>} licencas - Array de registros de licença do servidor
     * @returns {Object} Balanço completo de licenças
     */
    calcularBalancoLicencas(licencas) {
        if (!licencas || licencas.length === 0) {
            return {
                temDados: false,
                periodosAquisitivos: [],
                diasGanhos: 0,
                diasUsados: 0,
                diasRestantes: 0,
                dataAdmissao: null
            };
        }

        // Filtrar registros válidos (ignorar datas 1899-12-30 que são marcadores de vazio)
        const registrosValidos = licencas.filter(l => {
            const aquisitivoInicio = l.aquisitivoInicio || l.AQUISITIVO_INICIO;
            if (!aquisitivoInicio) return false;
            const dataStr = String(aquisitivoInicio);
            return !dataStr.includes('1899-12-30') && !dataStr.includes('1899/12/30');
        });

        if (registrosValidos.length === 0) {
            return {
                temDados: false,
                periodosAquisitivos: [],
                diasGanhos: 0,
                diasUsados: 0,
                diasRestantes: 0,
                dataAdmissao: null
            };
        }

        // Agrupar por período aquisitivo único
        const periodosMap = new Map();
        let dataAdmissaoMaisAntiga = null;

        registrosValidos.forEach(registro => {
            const aquisitivoInicio = this._parseData(registro.aquisitivoInicio || registro.AQUISITIVO_INICIO);
            const aquisitivoFim = this._parseData(registro.aquisitivoFim || registro.AQUISITIVO_FIM);
            const gozo = this._parseGozo(registro.gozo || registro.GOZO);
            const restando = this._parseRestando(registro.restando || registro.RESTANDO);
            
            if (!aquisitivoInicio) return;

            // Atualizar data de admissão mais antiga
            if (!dataAdmissaoMaisAntiga || aquisitivoInicio < dataAdmissaoMaisAntiga) {
                dataAdmissaoMaisAntiga = aquisitivoInicio;
            }

            // Chave única para o período aquisitivo
            const chave = `${aquisitivoInicio.getTime()}-${aquisitivoFim ? aquisitivoFim.getTime() : 'null'}`;
            
            if (!periodosMap.has(chave)) {
                periodosMap.set(chave, {
                    inicio: aquisitivoInicio,
                    fim: aquisitivoFim,
                    direito: 90, // 5 anos = 90 dias
                    gozos: [],
                    totalUsado: 0,
                    ultimoRestando: restando
                });
            }

            const periodo = periodosMap.get(chave);
            periodo.gozos.push(gozo);
            periodo.totalUsado += gozo;
            periodo.ultimoRestando = restando; // Atualiza com o último valor
        });

        // Converter map para array e calcular totais
        const periodosAquisitivos = Array.from(periodosMap.values())
            .sort((a, b) => a.inicio - b.inicio);

        const diasGanhos = periodosAquisitivos.length * 90;
        const diasUsados = periodosAquisitivos.reduce((sum, p) => sum + p.totalUsado, 0);
        
        // Pegar o restando do último período (mais recente)
        const ultimoPeriodo = periodosAquisitivos[periodosAquisitivos.length - 1];
        const diasRestantes = ultimoPeriodo ? ultimoPeriodo.ultimoRestando : 0;

        return {
            temDados: true,
            periodosAquisitivos: periodosAquisitivos,
            diasGanhos: diasGanhos,
            diasUsados: diasUsados,
            diasRestantes: diasRestantes,
            dataAdmissao: dataAdmissaoMaisAntiga,
            tempoServico: dataAdmissaoMaisAntiga ? this._calcularAnosServico(dataAdmissaoMaisAntiga) : 0
        };
    }

    /**
     * Parse de data flexível
     * @private
     */
    _parseData(valor) {
        if (!valor) return null;
        if (valor instanceof Date) return valor;
        
        const str = String(valor).trim();
        if (!str || str === '--') return null;

        // Tentar parse direto
        let data = new Date(str);
        if (!isNaN(data.getTime())) return data;

        // Tentar formato DD/MM/YYYY
        const partes = str.split(/[\/\-]/);
        if (partes.length === 3) {
            const [p1, p2, p3] = partes.map(p => parseInt(p.replace(/\D/g, ''), 10));
            // Se p1 > 12, assume DD/MM/YYYY
            if (p1 > 12) {
                data = new Date(p3, p2 - 1, p1);
            } else if (p3 > 31) {
                // YYYY-MM-DD ou similar
                data = new Date(p1, p2 - 1, p3);
            }
            if (!isNaN(data.getTime())) return data;
        }

        return null;
    }

    /**
     * Parse do campo GOZO (dias usados)
     * @private
     */
    _parseGozo(valor) {
        if (!valor) return 0;
        const num = parseInt(String(valor).replace(/\D/g, ''), 10);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Parse do campo RESTANDO (dias restantes)
     * Formatos: "0(DIAS)", "30(DIAS)", "(0) DIAS", "0(ZERO)", "30"
     * @private
     */
    _parseRestando(valor) {
        if (!valor) return 0;
        const str = String(valor).trim();
        // Extrair primeiro número encontrado
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Calcula anos de serviço desde a data de admissão
     * @private
     */
    _calcularAnosServico(dataAdmissao) {
        if (!dataAdmissao) return 0;
        const hoje = new Date();
        const diffMs = hoje - dataAdmissao;
        const diffAnos = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(diffAnos);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LicencaCalculator = LicencaCalculator;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicencaCalculator;
}
