/**
 * ValidationManager.js
 * Gerencia validações de dados e categorização de erros
 * Calcula score de qualidade dos dados importados
 */

class ValidationManager {
    constructor() {
        // Categorias de erros
        this.errorCategories = {
            MISSING_FIELD: 'Campo obrigatório faltando',
            INVALID_DATE: 'Data inválida',
            DATE_CONFLICT: 'Conflito de datas',
            UNRECOGNIZED_FORMAT: 'Formato não reconhecido',
            PARSE_ERROR: 'Erro de interpretação',
            INCOMPLETE_DATA: 'Dados incompletos'
        };

        // Peso de cada categoria para o score (0-1)
        this.categoryWeights = {
            MISSING_FIELD: 0.8,
            INVALID_DATE: 0.7,
            DATE_CONFLICT: 0.9,
            UNRECOGNIZED_FORMAT: 0.6,
            PARSE_ERROR: 0.8,
            INCOMPLETE_DATA: 0.5
        };
    }

    /**
     * Valida dados de um servidor
     * @param {Object} servidor - Objeto servidor
     * @returns {Array} - Lista de erros encontrados
     */
    validateServidorData(servidor) {
        const errors = [];

        // Validar campo obrigatório: nome
        if (!servidor.nome || servidor.nome.trim() === '') {
            errors.push({
                category: 'MISSING_FIELD',
                field: 'nome',
                message: 'Nome do servidor está vazio',
                severity: 'error'
            });
        }

        // Validar datas se presentes
        if (servidor.licencas && servidor.licencas.length > 0) {
            servidor.licencas.forEach((licenca, index) => {
                // Validar data de início
                if (licenca.inicio && !(licenca.inicio instanceof Date) || isNaN(licenca.inicio)) {
                    errors.push({
                        category: 'INVALID_DATE',
                        field: `licencas[${index}].inicio`,
                        message: 'Data de início inválida',
                        severity: 'error',
                        value: licenca.inicio
                    });
                }

                // Validar data de fim
                if (licenca.fim && (!(licenca.fim instanceof Date) || isNaN(licenca.fim))) {
                    errors.push({
                        category: 'INVALID_DATE',
                        field: `licencas[${index}].fim`,
                        message: 'Data de fim inválida',
                        severity: 'error',
                        value: licenca.fim
                    });
                }

                // Validar conflito de datas (início > fim)
                if (licenca.inicio && licenca.fim && licenca.inicio > licenca.fim) {
                    errors.push({
                        category: 'DATE_CONFLICT',
                        field: `licencas[${index}]`,
                        message: 'Data de início é posterior à data de fim',
                        severity: 'error',
                        value: `${licenca.inicio.toLocaleDateString()} > ${licenca.fim.toLocaleDateString()}`
                    });
                }
            });
        }

        // Validar campos importantes para cálculo de aposentadoria
        if (!servidor.idade && !servidor.dataNascimento) {
            errors.push({
                category: 'INCOMPLETE_DATA',
                field: 'idade/dataNascimento',
                message: 'Idade ou data de nascimento não informada - não será possível calcular aposentadoria',
                severity: 'warning'
            });
        }

        if (!servidor.dataAdmissao) {
            errors.push({
                category: 'INCOMPLETE_DATA',
                field: 'dataAdmissao',
                message: 'Data de admissão não informada - cálculo de aposentadoria pode ser impreciso',
                severity: 'warning'
            });
        }

        return errors;
    }

    /**
     * Categoriza lista de problemas de carregamento
     * @param {Array} loadingProblems - Lista de problemas do parser
     * @returns {Object} - Problemas agrupados por categoria
     */
    categorizeErrors(loadingProblems) {
        const categorized = {
            MISSING_FIELD: [],
            INVALID_DATE: [],
            DATE_CONFLICT: [],
            UNRECOGNIZED_FORMAT: [],
            PARSE_ERROR: [],
            INCOMPLETE_DATA: [],
            OTHER: []
        };

        loadingProblems.forEach(problem => {
            const category = this.detectErrorCategory(problem);
            if (categorized[category]) {
                categorized[category].push(problem);
            } else {
                categorized.OTHER.push(problem);
            }
        });

        return categorized;
    }

    /**
     * Detecta categoria de um erro baseado na mensagem
     * @param {Object} problem - Objeto de problema
     * @returns {string} - Categoria detectada
     */
    detectErrorCategory(problem) {
        const message = (problem.problema || problem.message || '').toLowerCase();

        if (message.includes('não encontrado') || message.includes('vazio') || message.includes('obrigatório')) {
            return 'MISSING_FIELD';
        }

        if (message.includes('data') && (message.includes('inválida') || message.includes('não reconhecida'))) {
            return 'INVALID_DATE';
        }

        if (message.includes('conflito') || message.includes('posterior') || message.includes('anterior')) {
            return 'DATE_CONFLICT';
        }

        if (message.includes('formato') || message.includes('não reconhecido') || message.includes('ambíguo')) {
            return 'UNRECOGNIZED_FORMAT';
        }

        if (message.includes('erro') || message.includes('falha') || message.includes('problema')) {
            return 'PARSE_ERROR';
        }

        if (message.includes('incompleto') || message.includes('faltando')) {
            return 'INCOMPLETE_DATA';
        }

        return 'OTHER';
    }

    /**
     * Gera sugestões de correção para um erro
     * @param {Object} error - Objeto de erro
     * @returns {string} - Sugestão de correção
     */
    generateSuggestion(error) {
        const category = error.category || this.detectErrorCategory(error);

        switch (category) {
            case 'MISSING_FIELD':
                return 'Verifique se todas as colunas obrigatórias estão preenchidas na planilha.';

            case 'INVALID_DATE':
                return 'Use formatos de data válidos: DD/MM/YYYY, MM/YYYY, ou "jan/2025". Sempre inclua o ano.';

            case 'DATE_CONFLICT':
                return 'Corrija as datas na planilha: a data de início deve ser anterior à data de fim.';

            case 'UNRECOGNIZED_FORMAT':
                const value = error.valor || error.value || '';
                if (value.match(/\d{4}\/\d{1,2}/)) {
                    return `Formato "${value}" não reconhecido. Tente invertido: "MM/YYYY" (ex: "01/2025").`;
                }
                if (value.match(/^\d{1,2}$/)) {
                    return `Formato "${value}" ambíguo. Adicione o ano: "MM/YYYY" (ex: "${value}/2025").`;
                }
                return 'Use formatos padrão: "DD/MM/YYYY", "MM/YYYY", "jan/2025", ou "janeiro/2025".';

            case 'PARSE_ERROR':
                return 'Verifique se o arquivo está corrompido. Tente exportar novamente do Excel como .xlsx.';

            case 'INCOMPLETE_DATA':
                return 'Preencha os campos faltantes para cálculos mais precisos de aposentadoria e urgência.';

            default:
                return 'Revise os dados na planilha e tente importar novamente.';
        }
    }

    /**
     * Calcula score de qualidade dos dados (0-100)
     * @param {Array} servidores - Lista de servidores processados
     * @param {Array} loadingProblems - Lista de problemas encontrados
     * @returns {Object} - Score e breakdown detalhado
     */
    calculateDataQualityScore(servidores, loadingProblems = []) {
        if (!servidores || servidores.length === 0) {
            return {
                score: 0,
                breakdown: {
                    completeness: 0,
                    validity: 0,
                    consistency: 0
                },
                details: {
                    totalServers: 0,
                    serversWithProblems: 0,
                    problemsByCategory: {}
                }
            };
        }

        const totalServers = servidores.length;
        let completenessScore = 0;
        let validityScore = 0;
        let consistencyScore = 0;

        // 1. Completude (40% do score): campos importantes preenchidos
        let totalFields = 0;
        let filledFields = 0;

        servidores.forEach(servidor => {
            const fields = [
                servidor.nome,
                servidor.idade || servidor.dataNascimento,
                servidor.cargo,
                servidor.lotacao,
                servidor.dataAdmissao,
                servidor.sexo
            ];

            fields.forEach(field => {
                totalFields++;
                if (field && field !== '' && field !== '--') {
                    filledFields++;
                }
            });
        });

        completenessScore = totalFields > 0 ? (filledFields / totalFields) * 40 : 0;

        // 2. Validade (40% do score): dados sem erros
        const categorized = this.categorizeErrors(loadingProblems);
        const criticalErrors = categorized.INVALID_DATE.length + categorized.DATE_CONFLICT.length;
        const minorErrors = categorized.UNRECOGNIZED_FORMAT.length + categorized.INCOMPLETE_DATA.length;

        // Penalizar erros críticos mais que erros menores
        const errorPenalty = (criticalErrors * 2 + minorErrors) / totalServers;
        validityScore = Math.max(0, 40 - (errorPenalty * 10));

        // 3. Consistência (20% do score): dados fazem sentido
        let serversWithLicencas = 0;
        let serversWithValidLicencas = 0;

        servidores.forEach(servidor => {
            if (servidor.licencas && servidor.licencas.length > 0) {
                serversWithLicencas++;

                const hasValidLicencas = servidor.licencas.some(lic =>
                    lic.inicio instanceof Date && !isNaN(lic.inicio) &&
                    lic.fim instanceof Date && !isNaN(lic.fim)
                );

                if (hasValidLicencas) {
                    serversWithValidLicencas++;
                }
            }
        });

        consistencyScore = serversWithLicencas > 0
            ? (serversWithValidLicencas / serversWithLicencas) * 20
            : 10; // Score parcial se não há licenças

        // Score final
        const finalScore = Math.round(completenessScore + validityScore + consistencyScore);

        return {
            score: Math.min(100, Math.max(0, finalScore)),
            breakdown: {
                completeness: Math.round(completenessScore),
                validity: Math.round(validityScore),
                consistency: Math.round(consistencyScore)
            },
            details: {
                totalServers: totalServers,
                serversWithProblems: loadingProblems.length,
                serversWithLicencas: serversWithLicencas,
                problemsByCategory: {
                    critical: criticalErrors,
                    minor: minorErrors,
                    total: loadingProblems.length
                }
            }
        };
    }

    /**
     * Retorna cor baseada no score (para badges)
     * @param {number} score - Score de 0-100
     * @returns {string} - Nome da classe de cor
     */
    getScoreColor(score) {
        if (score >= 90) return 'success';
        if (score >= 75) return 'info';
        if (score >= 50) return 'warning';
        return 'error';
    }

    /**
     * Retorna descrição baseada no score
     * @param {number} score - Score de 0-100
     * @returns {string} - Descrição textual
     */
    getScoreDescription(score) {
        if (score >= 90) return 'Excelente';
        if (score >= 75) return 'Bom';
        if (score >= 50) return 'Aceitável';
        if (score >= 25) return 'Ruim';
        return 'Crítico';
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ValidationManager = ValidationManager;
}
