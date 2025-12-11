/**
 * DataTransformer - Transformação e Enriquecimento de Dados
 *
 * Responsável por:
 * - Enriquecer registros com dados calculados
 * - Adicionar status e urgências
 * - Calcular saldos e projeções
 * - Normalizar e padronizar dados
 *
 * Dependências globais: DateUtils, FormatUtils
 * (Carregue os scripts de utilitários antes deste arquivo)
 */

const DataTransformer = (function () {
    'use strict';

    // ============================================================
    // ENRIQUECIMENTO DE LICENÇAS
    // ============================================================

    /**
     * Enriquece um registro de licença com dados calculados
     * @param {Object} licenca - Registro de licença básico
     * @returns {Object} Licença enriquecida
     */
    function enrichLicenca(licenca) {
        if (!licenca || typeof licenca !== 'object') {
            return null;
        }

        const enriched = { ...licenca };

        // Parse das datas do período
        if (enriched.periodo) {
            const dates = parsePeriodoDates(enriched.periodo);
            if (dates) {
                enriched.dataInicio = dates.dataInicio;
                enriched.dataFim = dates.dataFim;
            }
        }

        // Calcula dias restantes até o início
        if (enriched.dataInicio) {
            const hoje = new Date();
            enriched.diasAteInicio = DateUtils.diffInDays(hoje, enriched.dataInicio);
        }

        // Calcula dias restantes até o fim
        if (enriched.dataFim) {
            const hoje = new Date();
            enriched.diasAteFim = DateUtils.diffInDays(hoje, enriched.dataFim);
        }

        // Calcula urgência
        enriched.urgencia = calculateUrgencia(enriched);

        // Calcula status
        enriched.status = calculateStatus(enriched);

        // Calcula percentual de gozo
        if (enriched.dias > 0) {
            const gozados = enriched.diasGozados || 0;
            enriched.percentualGozado = (gozados / enriched.dias) * 100;
        }

        // Formata textos para exibição
        enriched.periodoFormatado = FormatUtils.capitalize(enriched.periodo || '');
        enriched.diasFormatado = FormatUtils.formatDays(enriched.dias);
        enriched.saldoFormatado = FormatUtils.formatDays(enriched.saldo || 0);

        return enriched;
    }

    /**
     * Parse período "jan/2025 a dez/2025" para datas
     * @param {string} periodo - Período no formato brasileiro
     * @returns {Object|null} { dataInicio, dataFim }
     */
    function parsePeriodoDates(periodo) {
        if (!periodo) return null;

        const match = periodo.match(/^(\w+)\/(\d{4})(?:\s+a\s+(\w+)\/(\d{4}))?$/i);
        if (!match) return null;

        const mesInicio = match[1];
        const anoInicio = match[2];
        const mesFim = match[3] || mesInicio;
        const anoFim = match[4] || anoInicio;

        const dataInicio = DateUtils.parseBrazilianDate(`${mesInicio}/${anoInicio}`);
        const dataFim = DateUtils.parseBrazilianDate(`${mesFim}/${anoFim}`);

        if (!dataInicio || !dataFim) return null;

        // Ajusta data fim para último dia do mês
        dataFim.setMonth(dataFim.getMonth() + 1);
        dataFim.setDate(0);

        return { dataInicio, dataFim };
    }

    /**
     * Calcula urgência baseada em dias até o início
     * @param {Object} licenca - Registro de licença
     * @returns {string} 'critica'|'alta'|'media'|'baixa'|'expirada'
     */
    function calculateUrgencia(licenca) {
        if (!licenca.diasAteInicio && licenca.diasAteInicio !== 0) {
            return 'indefinida';
        }

        const dias = licenca.diasAteInicio;

        // Já passou
        if (dias < 0) {
            // Verifica se ainda está no período
            if (licenca.diasAteFim && licenca.diasAteFim >= 0) {
                return 'em-gozo';
            }
            return 'expirada';
        }

        // Urgências baseadas em dias restantes
        if (dias <= 30) return 'critica';
        if (dias <= 60) return 'alta';
        if (dias <= 90) return 'moderada';
        return 'baixa';
    }

    /**
     * Calcula status da licença
     * @param {Object} licenca - Registro de licença
     * @returns {string} Status calculado
     */
    function calculateStatus(licenca) {
        const hoje = new Date();

        // Verifica se tem datas
        if (!licenca.dataInicio || !licenca.dataFim) {
            return 'pendente';
        }

        const inicio = new Date(licenca.dataInicio);
        const fim = new Date(licenca.dataFim);

        hoje.setHours(0, 0, 0, 0);
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(0, 0, 0, 0);

        // Expirada
        if (hoje > fim) {
            const saldo = licenca.saldo || 0;
            if (saldo > 0) {
                return 'expirada-com-saldo';
            }
            return 'expirada';
        }

        // Em gozo
        if (hoje >= inicio && hoje <= fim) {
            return 'em-gozo';
        }

        // Agendada
        if (hoje < inicio) {
            return 'agendada';
        }

        return 'ativa';
    }

    // ============================================================
    // ENRIQUECIMENTO DE SERVIDORES
    // ============================================================

    /**
     * Enriquece um registro de servidor com dados calculados
     * @param {Object} servidor - Registro de servidor básico
     * @returns {Object} Servidor enriquecido
     */
    function enrichServidor(servidor) {
        if (!servidor || typeof servidor !== 'object') {
            return null;
        }

        const enriched = { ...servidor };

        // Formata CPF
        if (enriched.cpf) {
            enriched.cpfFormatado = FormatUtils.formatCPF(enriched.cpf);
        }

        // Formata nome
        if (enriched.nome) {
            enriched.nomeFormatado = FormatUtils.formatProperName(enriched.nome);
        }

        // Formata telefone
        if (enriched.telefone) {
            enriched.telefoneFormatado = FormatUtils.formatPhone(enriched.telefone);
        }

        // Tentar parsear licenças se houver string de licenças prêmio
        if ((!enriched.licencas || !Array.isArray(enriched.licencas) || enriched.licencas.length === 0) && enriched.licencasPremio) {
            if (typeof DataParser !== 'undefined' && typeof DataParser.parseLicencasPremio === 'function') {
                const parsed = DataParser.parseLicencasPremio(enriched.licencasPremio);
                if (parsed && parsed.length > 0) {
                    enriched.licencas = parsed.map(p => ({
                        dataInicio: p.inicio,
                        dataFim: p.fim,
                        periodo: p.raw,
                        dias: DateUtils.diffInDays(p.inicio, p.fim) + 1
                    }));

                    // Enriquecer cada licença gerada
                    enriched.licencas = enriched.licencas.map(l => enrichLicenca(l));
                }
            }
        }

        // Calcula estatísticas de licenças (se disponível)
        if (enriched.licencas && Array.isArray(enriched.licencas)) {
            enriched.totalLicencas = enriched.licencas.length;
            enriched.totalDias = enriched.licencas.reduce((sum, lic) => sum + (lic.dias || 0), 0);
            enriched.totalGozados = enriched.licencas.reduce((sum, lic) => sum + (lic.diasGozados || 0), 0);
            enriched.totalSaldo = enriched.licencas.reduce((sum, lic) => sum + (lic.saldo || 0), 0);

            enriched.totalDiasFormatado = FormatUtils.formatDays(enriched.totalDias);
            enriched.totalSaldoFormatado = FormatUtils.formatDays(enriched.totalSaldo);
        }

        // Identifica licenças urgentes
        if (enriched.licencas && Array.isArray(enriched.licencas)) {
            enriched.temLicencaUrgente = enriched.licencas.some(
                lic => lic.urgencia === 'critica' || lic.urgencia === 'alta'
            );

            // Determinar próxima licença para exibição (a primeira cronologicamente)
            const licencasComData = enriched.licencas.filter(l => l.dataInicio);
            if (licencasComData.length > 0) {
                // Ordenar por data
                licencasComData.sort((a, b) => {
                    const dateA = a.dataInicio instanceof Date ? a.dataInicio : new Date(a.dataInicio);
                    const dateB = b.dataInicio instanceof Date ? b.dataInicio : new Date(b.dataInicio);
                    return dateA - dateB;
                });

                enriched.proximaLicenca = licencasComData[0].dataInicio;
            }

            // Agregar urgência do servidor (pior caso)
            const urgencies = enriched.licencas.map(l => l.urgencia);
            if (urgencies.includes('critica')) enriched.urgencia = 'critica';
            else if (urgencies.includes('alta')) enriched.urgencia = 'alta';
            else if (urgencies.includes('moderada')) enriched.urgencia = 'moderada';
            else if (urgencies.includes('baixa')) enriched.urgencia = 'baixa';
            else if (urgencies.includes('em-gozo')) enriched.urgencia = 'baixa'; // Em gozo = baixa prioridade para alerta
            else enriched.urgencia = 'baixa';
        }

        return enriched;
    }

    // ============================================================
    // AGREGAÇÃO DE DADOS
    // ============================================================

    /**
     * Agrupa licenças de um servidor
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Object} Licenças agrupadas por servidor
     */
    function groupLicencasByServidor(licencas) {
        if (!Array.isArray(licencas)) return {};

        const grouped = {};

        for (const licenca of licencas) {
            const cpf = licenca.cpf;
            if (!cpf) continue;

            if (!grouped[cpf]) {
                grouped[cpf] = {
                    cpf: cpf,
                    nome: licenca.nome,
                    matricula: licenca.matricula,
                    cargo: licenca.cargo,
                    lotacao: licenca.lotacao,
                    licencas: []
                };
            }

            grouped[cpf].licencas.push(licenca);
        }

        return grouped;
    }

    /**
     * Enriquece um array de licenças com servidores agrupados
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Array<Object>} Array de servidores enriquecidos
     */
    function enrichServidoresWithLicencas(licencas) {
        if (!Array.isArray(licencas)) return [];

        // Primeiro enriquece cada licença individualmente
        const enrichedLicencas = licencas.map(lic => enrichLicenca(lic)).filter(Boolean);

        // Agrupa por servidor
        const grouped = groupLicencasByServidor(enrichedLicencas);

        // Enriquece cada servidor
        const servidores = Object.values(grouped).map(srv => enrichServidor(srv));

        return servidores;
    }

    // ============================================================
    // NORMALIZAÇÃO DE DADOS
    // ============================================================

    /**
     * Normaliza valores numéricos (converte strings para números)
     * @param {Object} obj - Objeto para normalizar
     * @param {Array<string>} numericFields - Campos que devem ser numéricos
     * @returns {Object} Objeto normalizado
     */
    function normalizeNumericFields(obj, numericFields) {
        if (!obj || typeof obj !== 'object') return obj;

        const normalized = { ...obj };

        for (const field of numericFields) {
            if (normalized[field] !== undefined && normalized[field] !== null) {
                const value = normalized[field];
                if (typeof value === 'string') {
                    const num = parseFloat(value.replace(',', '.'));
                    if (!isNaN(num)) {
                        normalized[field] = num;
                    }
                }
            }
        }

        return normalized;
    }

    /**
     * Normaliza um registro de licença
     * @param {Object} licenca - Licença para normalizar
     * @returns {Object} Licença normalizada
     */
    function normalizeLicenca(licenca) {
        const numericFields = ['dias', 'diasGozados', 'saldo'];
        return normalizeNumericFields(licenca, numericFields);
    }

    /**
     * Remove campos desnecessários de um objeto
     * @param {Object} obj - Objeto original
     * @param {Array<string>} fieldsToKeep - Campos para manter
     * @returns {Object} Objeto apenas com campos especificados
     */
    function pickFields(obj, fieldsToKeep) {
        if (!obj || typeof obj !== 'object') return obj;

        const picked = {};

        for (const field of fieldsToKeep) {
            if (obj.hasOwnProperty(field)) {
                picked[field] = obj[field];
            }
        }

        return picked;
    }

    /**
     * Remove campos específicos de um objeto
     * @param {Object} obj - Objeto original
     * @param {Array<string>} fieldsToRemove - Campos para remover
     * @returns {Object} Objeto sem os campos especificados
     */
    function omitFields(obj, fieldsToRemove) {
        if (!obj || typeof obj !== 'object') return obj;

        const omitted = { ...obj };

        for (const field of fieldsToRemove) {
            delete omitted[field];
        }

        return omitted;
    }

    // ============================================================
    // TRANSFORMAÇÕES EM LOTE
    // ============================================================

    /**
     * Aplica transformação em array de objetos
     * @param {Array<Object>} items - Array de itens
     * @param {Function} transformer - Função de transformação
     * @returns {Array<Object>} Array transformado
     */
    function transformBatch(items, transformer) {
        if (!Array.isArray(items)) return [];
        if (typeof transformer !== 'function') return items;

        return items.map(transformer).filter(Boolean);
    }

    /**
     * Enriquece um array de licenças
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Array<Object>} Array de licenças enriquecidas
     */
    function enrichLicencasBatch(licencas) {
        return transformBatch(licencas, enrichLicenca);
    }

    /**
     * Enriquece um array de servidores
     * @param {Array<Object>} servidores - Array de servidores
     * @returns {Array<Object>} Array de servidores enriquecidos
     */
    function enrichServidoresBatch(servidores) {
        return transformBatch(servidores, enrichServidor);
    }

    // ============================================================
    // ORDENAÇÃO
    // ============================================================

    /**
     * Cria função comparadora para ordenação
     * @param {string} field - Campo para ordenar
     * @param {string} order - 'asc' ou 'desc'
     * @returns {Function} Função comparadora
     */
    function createSorter(field, order = 'asc') {
        return (a, b) => {
            const valueA = a[field];
            const valueB = b[field];

            if (valueA === valueB) return 0;

            let comparison = 0;
            if (valueA > valueB) {
                comparison = 1;
            } else if (valueA < valueB) {
                comparison = -1;
            }

            return order === 'desc' ? -comparison : comparison;
        };
    }

    /**
     * Ordena licenças por urgência
     * @param {Array<Object>} licencas - Array de licenças
     * @returns {Array<Object>} Array ordenado
     */
    function sortByUrgencia(licencas) {
        if (!Array.isArray(licencas)) return [];

        const urgenciaOrder = {
            'critica': 1,
            'alta': 2,
            'moderada': 3,
            'baixa': 4,
            'em-gozo': 5,
            'expirada': 6,
            'indefinida': 7
        };

        return [...licencas].sort((a, b) => {
            const orderA = urgenciaOrder[a.urgencia] || 999;
            const orderB = urgenciaOrder[b.urgencia] || 999;
            return orderA - orderB;
        });
    }

    // ============================================================
    // EXPORTAÇÃO
    // ============================================================

    return {
        // Enriquecimento
        enrichLicenca,
        enrichServidor,
        enrichServidoresWithLicencas,

        // Parsing
        parsePeriodoDates,

        // Cálculos
        calculateUrgencia,
        calculateStatus,

        // Agregação
        groupLicencasByServidor,

        // Normalização
        normalizeNumericFields,
        normalizeLicenca,
        pickFields,
        omitFields,

        // Transformações em lote
        transformBatch,
        enrichLicencasBatch,
        enrichServidoresBatch,

        // Ordenação
        createSorter,
        sortByUrgencia
    };
})();

// Exportação para Node.js e Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataTransformer;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.DataTransformer = DataTransformer;
}
