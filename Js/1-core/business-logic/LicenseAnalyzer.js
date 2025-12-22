/**
 * LicenseAnalyzer - Análise de Licenças Prêmio
 *
 * Módulo de lógica de negócio para análise e classificação de licenças.
 * Fornece funções para calcular métricas e estatísticas sobre licenças dos servidores.
 *
 * @module LicenseAnalyzer
 */

const LicenseAnalyzer = {

    /**
     * Conta licenças que iniciam nos próximos X dias
     * Agrupa em três categorias: 0-30, 31-60, 61-90 dias
     *
     * @param {Array<Object>} servidores - Array de objetos servidor
     * @param {Date} referenceDate - Data de referência (default: hoje)
     * @returns {Object} Objeto com contagens { dias30, dias60, dias90 }
     *
     * @example
     * const result = LicenseAnalyzer.contarProximasLicencas(servidores);
     * // { dias30: 15, dias60: 8, dias90: 5 }
     */
    contarProximasLicencas(servidores, referenceDate = new Date()) {
        const result = {
            dias30: 0,
            dias60: 0,
            dias90: 0
        };

        // Validação de entrada
        if (!Array.isArray(servidores)) {
            console.warn('⚠️ LicenseAnalyzer: servidores não é um array');
            return result;
        }

        // Normalizar data de referência (zerar horas para comparação de dias)
        const refDate = new Date(referenceDate);
        refDate.setHours(0, 0, 0, 0);

        servidores.forEach(servidor => {
            const licencas = servidor.licencas || [];

            licencas.forEach(licenca => {
                // Validar se inicio é uma data válida
                if (!licenca.inicio || !(licenca.inicio instanceof Date) || isNaN(licenca.inicio)) {
                    return; // Skip licenças com datas inválidas
                }

                // Normalizar data de início
                const dataInicio = new Date(licenca.inicio);
                dataInicio.setHours(0, 0, 0, 0);

                // Calcular diferença em dias
                const diffMs = dataInicio - refDate;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                // Classificar apenas licenças futuras
                if (diffDays >= 0 && diffDays <= 30) {
                    result.dias30++;
                } else if (diffDays > 30 && diffDays <= 60) {
                    result.dias60++;
                } else if (diffDays > 60 && diffDays <= 90) {
                    result.dias90++;
                }
            });
        });

        return result;
    },

    /**
     * Classifica status de todas as licenças
     * Um servidor pode estar em apenas um status (prioridade: emAndamento > agendadas > concluidas)
     *
     * @param {Array<Object>} servidores - Array de objetos servidor
     * @param {Date} referenceDate - Data de referência (default: hoje)
     * @returns {Object} Objeto com contagens { agendadas, emAndamento, concluidas, naoAgendadas }
     *
     * @example
     * const result = LicenseAnalyzer.contarStatusLicencas(servidores);
     * // { agendadas: 45, emAndamento: 3, concluidas: 12, naoAgendadas: 8 }
     */
    contarStatusLicencas(servidores, referenceDate = new Date()) {
        const result = {
            agendadas: 0,      // Futuras (inicio > hoje)
            emAndamento: 0,    // Correntes (hoje entre inicio e fim)
            concluidas: 0,     // Passadas (fim < hoje)
            naoAgendadas: 0    // Sem licenças
        };

        // Validação de entrada
        if (!Array.isArray(servidores)) {
            console.warn('⚠️ LicenseAnalyzer: servidores não é um array');
            return result;
        }

        console.log(`[DEBUG contarStatusLicencas] Processando ${servidores.length} servidores`);

        // Normalizar data de referência
        const refDate = new Date(referenceDate);
        refDate.setHours(0, 0, 0, 0);

        servidores.forEach(servidor => {
            const licencas = servidor.licencas || [];

            // Servidor sem licenças cadastradas
            if (licencas.length === 0) {
                result.naoAgendadas++;
                return;
            }

            // Classificar cada licença do servidor
            let hasEmAndamento = false;
            let hasAgendada = false;
            let hasConcluida = false;

            licencas.forEach(licenca => {
                // Validar se inicio é uma data válida
                if (!licenca.inicio) {
                    return; // Skip licenças sem data de início
                }

                // Converter para Date se necessário e normalizar
                let dataInicio = licenca.inicio instanceof Date
                    ? new Date(licenca.inicio)
                    : new Date(licenca.inicio);

                // Validar se é uma data válida
                if (isNaN(dataInicio)) {
                    return; // Skip datas inválidas
                }

                // Normalizar (zerar horas)
                dataInicio.setHours(0, 0, 0, 0);

                // Tentar obter data fim
                let dataFim = null;
                if (licenca.fim) {
                    dataFim = licenca.fim instanceof Date
                        ? new Date(licenca.fim)
                        : new Date(licenca.fim);

                    if (!isNaN(dataFim)) {
                        dataFim.setHours(0, 0, 0, 0);
                    } else {
                        dataFim = null;
                    }
                }

                // Se não tem fim, calcular baseado em meses (se disponível)
                if (!dataFim && licenca.meses) {
                    dataFim = new Date(dataInicio);
                    dataFim.setDate(dataFim.getDate() + (licenca.meses * 30));
                }

                // Se ainda não tem data fim válida, skip esta licença
                if (!dataFim) {
                    return;
                }

                // Classificar status da licença
                if (refDate >= dataInicio && refDate <= dataFim) {
                    // Licença em andamento (hoje está entre início e fim, inclusive)
                    hasEmAndamento = true;
                } else if (refDate < dataInicio) {
                    // Licença futura (ainda não começou)
                    hasAgendada = true;
                } else if (refDate > dataFim) {
                    // Licença passada (já terminou)
                    hasConcluida = true;
                }
            });

            // Aplicar prioridade: Em Andamento > Agendadas > Concluídas
            // (Um servidor conta apenas uma vez, no status de maior prioridade)
            if (hasEmAndamento) {
                result.emAndamento++;
            } else if (hasAgendada) {
                result.agendadas++;
            } else if (hasConcluida) {
                result.concluidas++;
            } else {
                // Todas as licenças eram inválidas
                result.naoAgendadas++;
            }
        });

        console.log('[DEBUG contarStatusLicencas] Resultado:', result);

        return result;
    },

    /**
     * Obtém lista detalhada de licenças nos próximos X dias
     * Útil para exibir detalhes de licenças próximas em outras partes do sistema
     *
     * @param {Array<Object>} servidores - Array de objetos servidor
     * @param {number} days - Número de dias à frente (default: 30)
     * @param {Date} referenceDate - Data de referência (default: hoje)
     * @returns {Array<Object>} Array de objetos com informações de servidor e licença
     *
     * @example
     * const proximas = LicenseAnalyzer.obterLicencasProximas(servidores, 30);
     * // [{ servidor: "João", cpf: "123...", licenca: {...}, diasAteInicio: 5 }, ...]
     */
    obterLicencasProximas(servidores, days = 30, referenceDate = new Date()) {
        const result = [];

        // Validação de entrada
        if (!Array.isArray(servidores)) {
            console.warn('⚠️ LicenseAnalyzer: servidores não é um array');
            return result;
        }

        // Normalizar data de referência
        const refDate = new Date(referenceDate);
        refDate.setHours(0, 0, 0, 0);

        servidores.forEach(servidor => {
            const licencas = servidor.licencas || [];

            licencas.forEach(licenca => {
                // Validar se inicio é uma data válida
                if (!licenca.inicio || !(licenca.inicio instanceof Date) || isNaN(licenca.inicio)) {
                    return;
                }

                // Normalizar data de início
                const dataInicio = new Date(licenca.inicio);
                dataInicio.setHours(0, 0, 0, 0);

                // Calcular diferença em dias
                const diffMs = dataInicio - refDate;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                // Incluir apenas licenças futuras dentro do período
                if (diffDays >= 0 && diffDays <= days) {
                    result.push({
                        servidor: servidor.servidor || servidor.nome || 'Sem nome',
                        cpf: servidor.cpf || null,
                        cargo: servidor.cargo || null,
                        lotacao: servidor.lotacao || null,
                        superintendencia: servidor.superintendencia || null,
                        licenca: licenca,
                        diasAteInicio: diffDays
                    });
                }
            });
        });

        // Ordenar por dias até início (mais próximas primeiro)
        result.sort((a, b) => a.diasAteInicio - b.diasAteInicio);

        return result;
    },

    /**
     * Calcula total de licenças (contagem absoluta de períodos de licença)
     *
     * @param {Array<Object>} servidores - Array de objetos servidor
     * @returns {number} Total de licenças cadastradas
     */
    contarTotalLicencas(servidores) {
        if (!Array.isArray(servidores)) {
            return 0;
        }

        return servidores.reduce((total, servidor) => {
            const licencas = servidor.licencas || [];
            return total + licencas.length;
        }, 0);
    },

    /**
     * Determina o status de um único servidor
     * Garante consistência entre gráfico e filtro
     *
     * @param {Object} servidor - Objeto servidor
     * @param {Date} referenceDate - Data de referência (default: hoje)
     * @returns {string} Status do servidor: 'agendadas' | 'emAndamento' | 'concluidas' | 'naoAgendadas'
     *
     * @example
     * const status = LicenseAnalyzer.getServidorStatus(servidor);
     * // "emAndamento"
     */
    getServidorStatus(servidor, referenceDate = new Date()) {
        const licencas = servidor.licencas || [];

        // Normalizar data de referência
        const refDate = new Date(referenceDate);
        refDate.setHours(0, 0, 0, 0);

        // Sem licenças cadastradas
        if (licencas.length === 0) {
            return 'naoAgendadas';
        }

        let hasEmAndamento = false;
        let hasAgendada = false;
        let hasConcluida = false;
        let hasValidLicense = false;
        let debugInfo = { total: licencas.length, skipped: 0, valid: 0 };

        licencas.forEach(licenca => {
            // Validar se inicio é uma data válida
            if (!licenca.inicio) {
                debugInfo.skipped++;
                return;
            }

            // Converter para Date se necessário e normalizar
            let dataInicio = licenca.inicio instanceof Date
                ? new Date(licenca.inicio)
                : new Date(licenca.inicio);

            // Validar se é uma data válida
            if (isNaN(dataInicio)) {
                debugInfo.skipped++;
                return;
            }

            // Normalizar (zerar horas)
            dataInicio.setHours(0, 0, 0, 0);

            // Tentar obter data fim
            let dataFim = null;
            if (licenca.fim) {
                dataFim = licenca.fim instanceof Date
                    ? new Date(licenca.fim)
                    : new Date(licenca.fim);

                if (!isNaN(dataFim)) {
                    dataFim.setHours(0, 0, 0, 0);
                } else {
                    dataFim = null;
                }
            }

            // Se não tem fim, calcular baseado em meses (se disponível)
            if (!dataFim && licenca.meses) {
                dataFim = new Date(dataInicio);
                dataFim.setDate(dataFim.getDate() + (licenca.meses * 30));
            }

            // Se ainda não tem data fim válida, skip esta licença
            if (!dataFim) {
                debugInfo.skipped++;
                return;
            }

            hasValidLicense = true;
            debugInfo.valid++;

            // Classificar status da licença
            if (refDate >= dataInicio && refDate <= dataFim) {
                // Licença em andamento (hoje está entre início e fim, inclusive)
                hasEmAndamento = true;
            } else if (refDate < dataInicio) {
                // Licença futura (ainda não começou)
                hasAgendada = true;
            } else if (refDate > dataFim) {
                // Licença passada (já terminou)
                hasConcluida = true;
            }
        });

        // Debug logging (primeiros 10 servidores, mostrando datas)
        if (this._debugCount === undefined) this._debugCount = 0;
        if (this._debugCount < 10) {
            const licencasDebug = licencas.slice(0, 3).map(lic => ({
                inicio: lic.inicio instanceof Date ? lic.inicio.toISOString().split('T')[0] : 'invalid',
                fim: lic.fim instanceof Date ? lic.fim.toISOString().split('T')[0] : 'invalid',
                meses: lic.meses
            }));

            console.log(`[DEBUG] Servidor: ${servidor.servidor || servidor.nome}`, {
                hoje: refDate.toISOString().split('T')[0],
                licencas: debugInfo,
                primeirasLicencas: licencasDebug,
                hasEmAndamento,
                hasAgendada,
                hasConcluida,
                hasValidLicense
            });
            this._debugCount++;
        }

        // Se não tem licenças válidas, é "não agendadas"
        if (!hasValidLicense) {
            return 'naoAgendadas';
        }

        // Aplicar prioridade: Em Andamento > Agendadas > Concluídas
        if (hasEmAndamento) return 'emAndamento';
        if (hasAgendada) return 'agendadas';
        if (hasConcluida) return 'concluidas';
        return 'naoAgendadas';
    },

    /**
     * Determina o status de saldo de um único servidor
     *
     * @param {Object} servidor - Objeto servidor
     * @returns {string} Status de saldo: 'comSaldo' | 'semSaldo' | 'saldoIndefinido'
     *
     * @example
     * const saldoStatus = LicenseAnalyzer.getServidorSaldoStatus(servidor);
     * // "comSaldo"
     */
    getServidorSaldoStatus(servidor) {
        // Buscar campos de saldo (case-insensitive)
        const licencaAConceder = this._getField(servidor, [
            'licencaPremioAConceder',
            'licenca_premio_a_conceder',
            'Licença premio a conceder',
            'aConceder',
            'a_conceder'
        ]);

        const saldo = this._getField(servidor, [
            'saldo',
            'Saldo',
            'SALDO',
            'totalSaldo',
            'total_saldo',
            'TotalSaldo',
            'TOTALSALDO'
        ]);

        // Debug logging (apenas primeiros 5 servidores)
        if (this._debugSaldoCount === undefined) this._debugSaldoCount = 0;
        if (this._debugSaldoCount < 5) {
            console.log(`[DEBUG SALDO] Servidor: ${servidor.servidor || servidor.nome}`, {
                licencaAConceder,
                saldo,
                campos: Object.keys(servidor).filter(k => k.toLowerCase().includes('saldo') || k.toLowerCase().includes('conceder'))
            });
            this._debugSaldoCount++;
        }

        // Se tem informação de saldo
        if (licencaAConceder !== undefined && licencaAConceder !== null) {
            const saldoNum = parseFloat(licencaAConceder);
            if (!isNaN(saldoNum)) {
                return saldoNum > 0 ? 'comSaldo' : 'semSaldo';
            }
        }

        if (saldo !== undefined && saldo !== null) {
            const saldoNum = parseFloat(saldo);
            if (!isNaN(saldoNum)) {
                return saldoNum > 0 ? 'comSaldo' : 'semSaldo';
            }
        }

        return 'saldoIndefinido';
    },

    /**
     * Helper para buscar campo case-insensitive
     * @private
     */
    _getField(obj, fieldNames) {
        for (const name of fieldNames) {
            const found = Object.keys(obj).find(k =>
                k.toLowerCase() === name.toLowerCase()
            );
            if (found !== undefined) {
                return obj[found];
            }
        }
        return undefined;
    },

    /**
     * Método de debug para testar status no console
     * @param {Object} servidor - Servidor para testar
     */
    debugServidor(servidor) {
        const status = this.getServidorStatus(servidor);
        const saldoStatus = this.getServidorSaldoStatus(servidor);
        const licencas = servidor.licencas || [];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        console.group(`🔍 Debug Servidor: ${servidor.servidor || servidor.nome}`);
        console.log('Status período:', status);
        console.log('Status saldo:', saldoStatus);
        console.log('Total licenças:', licencas.length);
        console.log('Hoje:', hoje.toISOString().split('T')[0]);

        licencas.forEach((lic, i) => {
            const inicio = lic.inicio instanceof Date ? lic.inicio.toISOString().split('T')[0] : 'invalid';
            const fim = lic.fim instanceof Date ? lic.fim.toISOString().split('T')[0] : 'invalid';
            const tipo = lic.inicio > hoje ? 'FUTURA' : (lic.fim && lic.fim < hoje ? 'PASSADA' : 'ATUAL');
            console.log(`  Licença ${i+1}: ${inicio} → ${fim} (${lic.meses} meses) [${tipo}]`);
        });

        console.log('\nCampos de saldo disponíveis:',
            Object.keys(servidor).filter(k =>
                k.toLowerCase().includes('saldo') ||
                k.toLowerCase().includes('conceder')
            )
        );
        console.log('totalSaldo:', servidor.totalSaldo);
        console.groupEnd();
    }
};

// Export para uso em diferentes ambientes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicenseAnalyzer;
}

// Export para browser (window object)
if (typeof window !== 'undefined') {
    window.LicenseAnalyzer = LicenseAnalyzer;
}
