/**
 * UrgencyAnalyzer.js
 * Módulo responsável por analisar urgência dos servidores
 * 
 * Níveis de urgência baseados no prazo entre fim das licenças e aposentadoria:
 * - URGENTE: Licenças terminam até 2 anos antes da aposentadoria
 * - MEDIO: Licenças terminam entre 2 e 5 anos antes
 * - BAIXO: Licenças terminam com mais de 5 anos antes
 * - SEM_LICENCA: Servidor não tem licenças agendadas
 */

class UrgencyAnalyzer {
    constructor() {
        this.dateUtils = new DateUtils();
        this.licencaCalculator = new LicencaCalculator();
        this.aposentadoriaAnalyzer = new AposentadoriaAnalyzer();

        // Definição dos níveis de urgência (em anos)
        this.niveis = {
            URGENTE: { max: 2, cor: '#ef4444', texto: 'Urgente', prioridade: 1 },
            MEDIO: { min: 2, max: 5, cor: '#f97316', texto: 'Médio', prioridade: 2 },
            BAIXO: { min: 5, cor: '#059669', texto: 'Baixo', prioridade: 3 },
            SEM_LICENCA: { cor: '#6b7280', texto: 'Sem Licença', prioridade: 4 }
        };
    }

    /**
     * Analisa urgência de um servidor
     * @param {Object} servidor - Dados do servidor
     * @returns {Object} Análise de urgência
     */
    analisarUrgencia(servidor) {
        // Calcular detalhes da licença
        const licenca = this.licencaCalculator.calcularDetalhesLicenca(servidor);
        
        // Se não tem licença, urgência especial
        if (!licenca.temLicenca) {
            return {
                nivel: 'SEM_LICENCA',
                ...this.niveis.SEM_LICENCA,
                temLicenca: false,
                motivoUrgencia: 'Servidor não possui licença agendada'
            };
        }

        // Calcular aposentadoria
        const aposentadoria = this.aposentadoriaAnalyzer.calcularAposentadoria(servidor);
        
        if (!aposentadoria.elegivel || !aposentadoria.dataPrevista) {
            // Sem data de aposentadoria prevista, urgência baixa por padrão
            return {
                nivel: 'BAIXO',
                ...this.niveis.BAIXO,
                temLicenca: true,
                temAposentadoria: false,
                fimLicenca: licenca.fim,
                motivoUrgencia: 'Não foi possível calcular data de aposentadoria'
            };
        }

        // Calcular intervalo entre fim da licença e aposentadoria
        const fimLicenca = licenca.fim;
        const dataAposentadoria = aposentadoria.dataPrevista;
        
        // Anos entre fim da licença e aposentadoria
        const anosEntreFimLicencaEAposentadoria = 
            (dataAposentadoria - fimLicenca) / (365.25 * 24 * 60 * 60 * 1000);

        // Determinar nível de urgência
        let nivel = 'BAIXO';
        let motivoUrgencia = '';

        if (anosEntreFimLicencaEAposentadoria < 0) {
            // Licença termina DEPOIS da aposentadoria - CRÍTICO!
            nivel = 'URGENTE';
            motivoUrgencia = 'CRÍTICO: Licença termina após a data prevista de aposentadoria';
        } else if (anosEntreFimLicencaEAposentadoria <= this.niveis.URGENTE.max) {
            nivel = 'URGENTE';
            motivoUrgencia = `Licença termina apenas ${Math.floor(anosEntreFimLicencaEAposentadoria * 12)} meses antes da aposentadoria`;
        } else if (anosEntreFimLicencaEAposentadoria <= this.niveis.MEDIO.max) {
            nivel = 'MEDIO';
            motivoUrgencia = `Licença termina ${Math.floor(anosEntreFimLicencaEAposentadoria)} anos antes da aposentadoria`;
        } else {
            nivel = 'BAIXO';
            motivoUrgencia = `Licença termina com folga (${Math.floor(anosEntreFimLicencaEAposentadoria)} anos antes da aposentadoria)`;
        }

        // Verificar se há licenças não utilizadas
        const licencasDisponiveis = this.licencaCalculator.calcularLicencasDisponiveis(
            servidor.licencaConcedida,
            servidor.licencaConceder
        );

        const temLicencasNaoUsadas = licencasDisponiveis.restante > licenca.totalMeses;
        
        if (temLicencasNaoUsadas) {
            const mesesNaoUsados = licencasDisponiveis.restante - licenca.totalMeses;
            
            // Se tem licenças não usadas, aumentar urgência
            if (nivel === 'BAIXO' && mesesNaoUsados >= 3) {
                nivel = 'MEDIO';
                motivoUrgencia += ` | ATENÇÃO: ${mesesNaoUsados} meses de licença não agendados`;
            } else if (nivel === 'MEDIO' && mesesNaoUsados >= 6) {
                nivel = 'URGENTE';
                motivoUrgencia += ` | ALERTA: ${mesesNaoUsados} meses de licença não agendados`;
            }
        }

        return {
            nivel: nivel,
            ...this.niveis[nivel],
            temLicenca: true,
            temAposentadoria: true,
            fimLicenca: fimLicenca,
            dataAposentadoria: dataAposentadoria,
            anosEntreFimEAposentadoria: anosEntreFimLicencaEAposentadoria,
            mesesEntreFimEAposentadoria: Math.floor(anosEntreFimLicencaEAposentadoria * 12),
            motivoUrgencia: motivoUrgencia,
            licencasNaoUsadas: temLicencasNaoUsadas,
            mesesNaoUsados: temLicencasNaoUsadas ? 
                licencasDisponiveis.restante - licenca.totalMeses : 0,
            detalhesLicenca: licenca,
            detalhesAposentadoria: aposentadoria
        };
    }

    /**
     * Analisa múltiplos servidores e os classifica por urgência
     * @param {Array<Object>} servidores - Lista de servidores
     * @returns {Object} Servidores agrupados por urgência
     */
    analisarMultiplos(servidores) {
        const resultado = {
            URGENTE: [],
            MEDIO: [],
            BAIXO: [],
            SEM_LICENCA: [],
            estatisticas: {
                total: servidores.length,
                urgentes: 0,
                medios: 0,
                baixos: 0,
                semLicenca: 0
            }
        };

        servidores.forEach(servidor => {
            const analise = this.analisarUrgencia(servidor);
            servidor.urgencia = analise.nivel;
            servidor.analiseUrgencia = analise;

            // Adicionar ao grupo correspondente
            resultado[analise.nivel].push(servidor);
            
            // Atualizar estatísticas
            if (analise.nivel === 'URGENTE') resultado.estatisticas.urgentes++;
            else if (analise.nivel === 'MEDIO') resultado.estatisticas.medios++;
            else if (analise.nivel === 'BAIXO') resultado.estatisticas.baixos++;
            else if (analise.nivel === 'SEM_LICENCA') resultado.estatisticas.semLicenca++;
        });

        // Ordenar cada grupo por prioridade (mais urgente primeiro)
        Object.keys(resultado).forEach(nivel => {
            if (Array.isArray(resultado[nivel])) {
                resultado[nivel].sort((a, b) => {
                    if (!a.analiseUrgencia || !b.analiseUrgencia) return 0;
                    
                    // Ordenar por meses entre fim e aposentadoria (menor = mais urgente)
                    const mesesA = a.analiseUrgencia.mesesEntreFimEAposentadoria || 999;
                    const mesesB = b.analiseUrgencia.mesesEntreFimEAposentadoria || 999;
                    return mesesA - mesesB;
                });
            }
        });

        return resultado;
    }

    /**
     * Gera relatório de urgência
     * @param {Object} analise - Análise de urgência
     * @returns {string} Relatório formatado
     */
    gerarRelatorio(analise) {
        let relatorio = `Nível de Urgência: ${analise.texto}\n`;
        relatorio += `Motivo: ${analise.motivoUrgencia}\n\n`;

        if (analise.temLicenca) {
            relatorio += `Fim da licença: ${this.dateUtils.formatarData(analise.fimLicenca)}\n`;
        }

        if (analise.temAposentadoria) {
            relatorio += `Aposentadoria prevista: ${this.dateUtils.formatarData(analise.dataAposentadoria)}\n`;
            relatorio += `Intervalo: ${analise.anosEntreFimEAposentadoria.toFixed(1)} anos (${analise.mesesEntreFimEAposentadoria} meses)\n`;
        }

        if (analise.licencasNaoUsadas) {
            relatorio += `\n⚠️ ATENÇÃO: ${analise.mesesNaoUsados} meses de licença não agendados!\n`;
        }

        return relatorio;
    }

    /**
     * Calcula score de urgência (0-100, onde 100 = mais urgente)
     * @param {Object} servidor - Dados do servidor
     * @returns {number} Score de urgência
     */
    calcularScore(servidor) {
        const analise = this.analisarUrgencia(servidor);

        if (analise.nivel === 'SEM_LICENCA') return 50; // Meio termo
        if (!analise.temAposentadoria) return 25; // Baixa urgência se não tem previsão

        const meses = analise.mesesEntreFimEAposentadoria;

        // Score inversamente proporcional aos meses
        // 0 meses = 100 score, 120 meses (10 anos) = 0 score
        const score = Math.max(0, Math.min(100, 100 - (meses * 100 / 120)));

        // Penalizar se tem licenças não usadas
        if (analise.licencasNaoUsadas) {
            return Math.min(100, score + (analise.mesesNaoUsados * 2));
        }

        return Math.round(score);
    }

    /**
     * Filtra servidores por nível de urgência
     * @param {Array<Object>} servidores - Lista de servidores
     * @param {string} nivel - Nível de urgência (URGENTE, MEDIO, BAIXO, SEM_LICENCA)
     * @returns {Array<Object>} Servidores filtrados
     */
    filtrarPorNivel(servidores, nivel) {
        return servidores.filter(servidor => {
            const analise = this.analisarUrgencia(servidor);
            return analise.nivel === nivel;
        });
    }

    /**
     * Obtém estatísticas de urgência
     * @param {Array<Object>} servidores - Lista de servidores
     * @returns {Object} Estatísticas
     */
    obterEstatisticas(servidores) {
        const analise = this.analisarMultiplos(servidores);
        return analise.estatisticas;
    }

    /**
     * Verifica se servidor precisa de atenção urgente
     * @param {Object} servidor - Dados do servidor
     * @returns {boolean} True se precisa de atenção
     */
    precisaAtencao(servidor) {
        const analise = this.analisarUrgencia(servidor);
        return analise.nivel === 'URGENTE' || analise.licencasNaoUsadas;
    }

    /**
     * Gera recomendações para um servidor
     * @param {Object} servidor - Dados do servidor
     * @returns {Array<string>} Lista de recomendações
     */
    gerarRecomendacoes(servidor) {
        const analise = this.analisarUrgencia(servidor);
        const recomendacoes = [];

        if (analise.nivel === 'SEM_LICENCA') {
            recomendacoes.push('Agendar licença prêmio o quanto antes');
            recomendacoes.push('Verificar disponibilidade de licenças não utilizadas');
        }

        if (analise.nivel === 'URGENTE') {
            recomendacoes.push('AÇÃO IMEDIATA: Rever cronograma de licenças');
            
            if (analise.anosEntreFimEAposentadoria < 0) {
                recomendacoes.push('CRÍTICO: Licença termina após aposentadoria - ajustar datas urgentemente');
            } else {
                recomendacoes.push('Avaliar possibilidade de antecipar períodos de licença');
            }
        }

        if (analise.nivel === 'MEDIO') {
            recomendacoes.push('Monitorar cronograma de licenças');
            recomendacoes.push('Planejar com antecedência para evitar problemas');
        }

        if (analise.licencasNaoUsadas && analise.mesesNaoUsados >= 3) {
            recomendacoes.push(`Há ${analise.mesesNaoUsados} meses de licença não agendados`);
            recomendacoes.push('Incluir todos os meses disponíveis no cronograma');
        }

        if (recomendacoes.length === 0) {
            recomendacoes.push('Cronograma adequado, manter acompanhamento regular');
        }

        return recomendacoes;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.UrgencyAnalyzer = UrgencyAnalyzer;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UrgencyAnalyzer;
}
