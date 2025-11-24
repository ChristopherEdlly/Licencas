/**
 * Mock License Data - Dados simulados para testes do Toggle de Visualização
 *
 * Este arquivo contém dados fictícios que simulam a estrutura de dados
 * do sistema de licenças prêmio, incluindo servidores com licenças
 * dentro e fora do período de filtro.
 */

/**
 * Gera dados mock de servidores com licenças
 * @returns {Array} Array de objetos servidor
 */
function getMockLicenseData() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    return [
        // Servidor 1: Tem licenças DENTRO do período filtrado (2025)
        {
            servidor: 'Maria Silva Santos',
            cpf: '123.456.789-00',
            idade: 45,
            dataNascimento: new Date(1979, 5, 15),
            sexo: 'F',
            dataAdmissao: new Date(2005, 2, 10),
            cargo: 'Auditor Fiscal',
            lotacao: 'SUTRI',
            superintendencia: 'SUPER-I',
            subsecretaria: 'SUBSEC-A',
            licencas: [
                {
                    inicio: new Date(2025, 0, 15), // 15/01/2025 - DENTRO do filtro
                    fim: new Date(2025, 2, 14),    // 14/03/2025
                    tipo: 'prevista',
                    descricao: 'jan/2025 - mar/2025',
                    meses: 3
                },
                {
                    inicio: new Date(2026, 5, 1),  // 01/06/2026 - FORA do filtro
                    fim: new Date(2026, 7, 30),    // 30/08/2026
                    tipo: 'prevista',
                    descricao: 'jun/2026 - ago/2026',
                    meses: 3
                }
            ],
            proximaLicenca: new Date(2025, 0, 15),
            urgencia: 'moderada',
            mesesLicenca: 3
        },

        // Servidor 2: Tem licenças APENAS FORA do período filtrado
        {
            servidor: 'João Pedro Oliveira',
            cpf: '987.654.321-00',
            idade: 52,
            dataNascimento: new Date(1972, 8, 20),
            sexo: 'M',
            dataAdmissao: new Date(2000, 6, 1),
            cargo: 'Analista Tributário',
            lotacao: 'GERAT',
            superintendencia: 'SUPER-II',
            subsecretaria: 'SUBSEC-B',
            licencas: [
                {
                    inicio: new Date(2024, 2, 1),  // 01/03/2024 - FORA (antes)
                    fim: new Date(2024, 4, 30),    // 30/05/2024
                    tipo: 'concedida',
                    descricao: 'mar/2024 - mai/2024',
                    meses: 3
                },
                {
                    inicio: new Date(2027, 0, 1),  // 01/01/2027 - FORA (depois)
                    fim: new Date(2027, 2, 31),    // 31/03/2027
                    tipo: 'prevista',
                    descricao: 'jan/2027 - mar/2027',
                    meses: 3
                }
            ],
            proximaLicenca: new Date(2027, 0, 1),
            urgencia: 'baixa',
            mesesLicenca: 3
        },

        // Servidor 3: Múltiplas licenças, algumas DENTRO e outras FORA
        {
            servidor: 'Ana Carolina Ferreira',
            cpf: '456.789.123-00',
            idade: 38,
            dataNascimento: new Date(1986, 3, 10),
            sexo: 'F',
            dataAdmissao: new Date(2010, 0, 15),
            cargo: 'Auditor Fiscal',
            lotacao: 'DIPAT',
            superintendencia: 'SUPER-I',
            subsecretaria: 'SUBSEC-A',
            licencas: [
                {
                    inicio: new Date(2025, 1, 1),  // 01/02/2025 - DENTRO
                    fim: new Date(2025, 1, 28),    // 28/02/2025
                    tipo: 'prevista',
                    descricao: 'fev/2025',
                    meses: 1
                },
                {
                    inicio: new Date(2025, 6, 1),  // 01/07/2025 - DENTRO
                    fim: new Date(2025, 8, 30),    // 30/09/2025
                    tipo: 'prevista',
                    descricao: 'jul/2025 - set/2025',
                    meses: 3
                },
                {
                    inicio: new Date(2028, 0, 1),  // 01/01/2028 - FORA
                    fim: new Date(2028, 1, 29),    // 29/02/2028
                    tipo: 'prevista',
                    descricao: 'jan/2028 - fev/2028',
                    meses: 2
                }
            ],
            proximaLicenca: new Date(2025, 1, 1),
            urgencia: 'alta',
            mesesLicenca: 6
        },

        // Servidor 4: Licença que ATRAVESSA o período do filtro
        {
            servidor: 'Roberto Carlos Souza',
            cpf: '321.654.987-00',
            idade: 48,
            dataNascimento: new Date(1976, 10, 5),
            sexo: 'M',
            dataAdmissao: new Date(2003, 8, 20),
            cargo: 'Técnico Fazendário',
            lotacao: 'SUTRI',
            superintendencia: 'SUPER-III',
            subsecretaria: 'SUBSEC-C',
            licencas: [
                {
                    inicio: new Date(2024, 11, 1), // 01/12/2024 - Começa ANTES
                    fim: new Date(2025, 2, 31),    // 31/03/2025 - Termina DENTRO
                    tipo: 'prevista',
                    descricao: 'dez/2024 - mar/2025',
                    meses: 4
                }
            ],
            proximaLicenca: new Date(2024, 11, 1),
            urgencia: 'critica',
            mesesLicenca: 4
        },

        // Servidor 5: SEM licenças programadas
        {
            servidor: 'Fernanda Lima Costa',
            cpf: '159.753.486-00',
            idade: 41,
            dataNascimento: new Date(1983, 7, 25),
            sexo: 'F',
            dataAdmissao: new Date(2008, 4, 10),
            cargo: 'Analista Tributário',
            lotacao: 'GERAT',
            superintendencia: 'SUPER-II',
            subsecretaria: 'SUBSEC-D',
            licencas: [],
            proximaLicenca: null,
            urgencia: null,
            mesesLicenca: 0
        },

        // Servidor 6: Licença exatamente NO INÍCIO do período filtrado
        {
            servidor: 'Carlos Eduardo Martins',
            cpf: '753.159.486-00',
            idade: 55,
            dataNascimento: new Date(1969, 2, 18),
            sexo: 'M',
            dataAdmissao: new Date(1998, 1, 5),
            cargo: 'Auditor Fiscal',
            lotacao: 'DIPAT',
            superintendencia: 'SUPER-I',
            subsecretaria: 'SUBSEC-A',
            licencas: [
                {
                    inicio: new Date(2025, 0, 1),  // 01/01/2025 - EXATAMENTE no início
                    fim: new Date(2025, 1, 28),    // 28/02/2025
                    tipo: 'prevista',
                    descricao: 'jan/2025 - fev/2025',
                    meses: 2
                }
            ],
            proximaLicenca: new Date(2025, 0, 1),
            urgencia: 'moderada',
            mesesLicenca: 2
        },

        // Servidor 7: Licença exatamente NO FIM do período filtrado
        {
            servidor: 'Patricia Rodrigues Lima',
            cpf: '852.963.741-00',
            idade: 43,
            dataNascimento: new Date(1981, 11, 30),
            sexo: 'F',
            dataAdmissao: new Date(2006, 9, 15),
            cargo: 'Técnico Fazendário',
            lotacao: 'SUTRI',
            superintendencia: 'SUPER-III',
            subsecretaria: 'SUBSEC-B',
            licencas: [
                {
                    inicio: new Date(2025, 10, 1),  // 01/11/2025
                    fim: new Date(2025, 11, 31),    // 31/12/2025 - EXATAMENTE no fim
                    tipo: 'prevista',
                    descricao: 'nov/2025 - dez/2025',
                    meses: 2
                }
            ],
            proximaLicenca: new Date(2025, 10, 1),
            urgencia: 'baixa',
            mesesLicenca: 2
        }
    ];
}

/**
 * Configura filtro de período padrão para 2025 (ano completo)
 * @returns {Object} Filtro de período
 */
function getDefaultPeriodFilter() {
    return {
        dataInicio: '2025-01-01',
        dataFim: '2025-12-31'
    };
}

/**
 * Conta quantas licenças cada servidor tem dentro do período
 * @param {Array} servidores - Array de servidores
 * @param {Object} periodo - Filtro de período
 * @returns {Object} Objeto com contagens
 */
function countLicensesInPeriod(servidores, periodo) {
    const startDate = new Date(periodo.dataInicio);
    const endDate = new Date(periodo.dataFim);
    endDate.setHours(23, 59, 59, 999);

    const counts = {
        servidoresComLicencasDentro: 0,
        servidoresComLicencasFora: 0,
        totalLicencasDentro: 0,
        totalLicencasFora: 0
    };

    servidores.forEach(servidor => {
        let temDentro = false;
        let temFora = false;

        servidor.licencas.forEach(licenca => {
            const inicio = licenca.inicio;
            const fim = licenca.fim || licenca.inicio;

            // Verifica se a licença intersecta o período
            if (inicio <= endDate && fim >= startDate) {
                counts.totalLicencasDentro++;
                temDentro = true;
            } else {
                counts.totalLicencasFora++;
                temFora = true;
            }
        });

        if (temDentro) counts.servidoresComLicencasDentro++;
        if (temFora) counts.servidoresComLicencasFora++;
    });

    return counts;
}

// Exportar para uso em testes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMockLicenseData,
        getDefaultPeriodFilter,
        countLicensesInPeriod
    };
}

// Exportar para uso no browser (testes Playwright)
if (typeof window !== 'undefined') {
    window.mockLicenseData = {
        getMockLicenseData,
        getDefaultPeriodFilter,
        countLicensesInPeriod
    };
}
