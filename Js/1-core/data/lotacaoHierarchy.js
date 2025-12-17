/**
 * Estrutura hierárquica de lotação da SEFAZ
 * Organização: Secretaria > Subsecretaria > Superintendência > Gerência
 */

const LOTACAO_HIERARCHY = {
    "SEFAZ - secretaria de estado da fazenda": {
        // --- Subsecretaria de Tesouro (STE) ---
        "STE - Subsecretaria de Tesouro": {
            "SUFIP - Superintendência-Geral de Finanças Públicas": [
                "GEMAC - Gerência de Monitoramento e Atendimento Contábil",
                "GEDIF - Gerência da Dívida Pública e Informações Fiscais",
                "GENOC - Gerência de Normas e Procedimentos Contábeis",
                "GEDEPE - Gerência da Despesa com Pessoal",
                "GESFE - Gerência de Sistemas e Modernização das Finanças Estaduais",
                "GEADP - Gerência de Análise da Despesa Pública",
                "GETES - Gerência da Tesouraria Estadual",
                "CGE - Contadoria Geral do Estado"
            ],
            "SUPFI - Superintendência de Política Fiscal": [
                "GEDOM - Gerência de Diretrizes Orçamentárias e Metas Fiscais",
                "GEFIS - Gerência de Controle Fiscal"
            ],
            // Entidade de Lotação Temporária / Auxiliar (Gabinete)
            "GABINETE": []
        },

        // --- Subsecretaria da Receita Estadual (SURE) ---
        "SURE - Subsecretaria da Receita Estadual": {
            "ASSPAF - Assessoria de Pesquisa e Análise Fiscal": [
                "ASSPAF - ASSESSORIA DE PESQUISA E ANÁLISE FISCAL"
            ],
            "SUCOF - Superintendência de Recuperação de Crédito e Contencioso Fiscal": [
                "GECAP - Gerência de Suporte, Controle e Acompanhamento de Processos",
                "GEDAT - Gerência da Dívida Ativa",
                "GECRET - Gerência de Recuperação de Crédito Tributário e Contencioso Fiscal",
                "CENTRAL DE COMANDO ESPECIAL",
                "COMISSÃO EM 1ª INSTÂNCIA"
            ],
            "SUFI - Superintendência de Fiscalização e Atendimento ao Contribuinte": [
                "CEAC PROPRIÁ",
                "POSTO FISCAL PROPRIA FRONTEIRA",
                "POSTO 59",
                "POSTO FISCAL CRISTINAPÓLIS",
                "CEAC RIO MAR",
                "CENTRAL DE COMANDO ESPECIAL",
                "COAGRE - GERAF - COORDENADORIA DE AUDITORIA DE GRANDES EMPRESAS",
                "GERAT - Gerência de Fiscalização do Trânsito de Mercadorias",
                "ASGERAF - ASSESSORIA DA GERÊNCIA EXECUTIVA DE AUDITORIA FISCAL",
                "CEAC ITABAIANA",
                "GIPVA - Gerência de Auditoria do IPVA",
                "COAPRAVS - GERAF - COORDENADORIA DE AUDITORIA DOS SEGMENTOS DE PRODUTOR RURAL, RESTAURANTES, ATACADISTAS, VAREJISTAS E SERVIÇOS DE TRANSPORTE E OUTROS",
                "COASUTRI - GERAF - COORDENADORIA DE AUDITORIA DA SUBSTITUIÇÃO TRIBUTÁRIA",
                "CEAC/SEFAZ - Centro de Atendimento ao Atendimento ao Contribuinte",
                "POSTO FISCAL DE CARIRA",
                "GITCMD - Gerência de Auditoria do ITCMD",
                "À DISPOSIÇÃO SINDAT",
                "CEAC LAGARTO",
                "CEAC GLÓRIA",
                "GEINF - Gerência de Informações Fiscais",
                "GERAF - Gerência de Auditoria Fiscal do ICMS",
                "DIFERENCIAL DE ALIQUOTA - DIFAL",
                "POSTO FISCAL CORREIOS",
                "COMANDO FISCAL ITABAIANA",
                "CEAC ESTÂNCIA",
                "CEAC TOBIAS BARRETO",
                "ASSGEST - ASSESSORIA DE ESTRATÉGIA DE GESTÃO TRIBUTÁRIA",
                "POSTO FISCAL GOV. CELSO CARVALHO"
            ],
            "SUPLAF - Superintendência de Planejamento Fiscal, Arrecadação e Informações Fiscais": [
                "GERPLAF - Gerência de Planejamento Fiscal",
                "GERAR - Gerência de Arrecadação",
                "GEINF - Gerência de Informações Fiscais",
                "GERAT - Gerência de Fiscalização do Trânsito de Mercadorias",
                "POSTO FISCAL CORREIOS",
                "GEFIN - Gerência de Finanças",
                "GECRET - Gerência de Recuperação de Crédito Tributário e Contencioso Fiscal",
                "ASSESSORIA GERAL DE GESTÃO TRIBUTÁRIA",
                "GITCMD - Gerência de Auditoria do ITCMD",
                "GECAP - Gerência de Suporte, Controle e Acompanhamento de Processos"
            ],
            "SUTRI - Superintendência de Tributação Estadual": [
                "GEROT - Gerência de Orientação Tributária",
                "GELEG - Gerência de Legislação Tributária"
            ]
        },

        // --- Subsecretaria de Governança e Transformação Digital (SUGT) ---
        "SUGT - Subsecretaria de Governança e Transformação Digital": {
            "SUCEF - Superintendência de Contratos e Execução Financeira": [
                "GERAC - Gerência de Aquisições e Contratos",
                "GEFIN - Gerência de Finanças",
                "GABINETE"
            ],
            "SUGEP - Superintendência de Gestão de Pessoas": [
                "GEDIC - Gerência de Desenvolvimento Institucional e Capacitação",
                "GERP - Gerência de Pessoal"
            ],
            "SUPAG - Superintendência de Administração Geral": [
                "GETRANS - Gerência de Transportes",
                "GEINFRA - Gerência de Serviços de Infraestrutura",
                "GEMAP - GERENCIA DE MATERIAL E PATRIMÔNIO",
                "SUBGERENCIA DE ADMINISTRAÇÃO GERAL SUBSAD/SUPAG/SUGT",
                "SUBSADE - SUBGERENCIA GERAL DE SERVIÇOS ADMINISTRATIVOS",
                "SUBSINF - SUBGERENCIA GERAL DE INFRAESTRUTURA"
            ],
            "SUPLAN - Superintendência de Planejamento, Projetos e Modernização Institucional": [],
            "SUTEC - Superintendência da Tecnologia da Informação": [
                "GPTI - Gerência de Gestão e Políticas de Tecnologia da Informação",
                "GEDIA - Gerência de Dados e Inteligência Artificial",
                "GIPVA - Gerência de Auditoria do IPVA"
            ]
        },

        // --- Subsecretaria de Integridade Pública e Riscos Institucionais (SUIR) ---
        "SUIR - Subsecretaria de Integridade Pública e Riscos Institucionais": {
            "ASINT - Assessoria Institucional": [
                "SUBSECRETARIA DE INTEGRIDADE E RISCOS - SUIR"
            ],
            "SUINT - Superintendência de Integridade Pública": [],
            "SURIS - Superintendência de Riscos Institucionais": []
        },

        // --- Gabinete e Assessorias da Secretaria ---
        "Secretaria de Estado da Fazenda": {
            "ASCOM - Assessoria de Comunicação": [
                "ASSESSORIA DE COMUNICAÇÃO - ASCOM",
                "NÚCLEO DE EDUCAÇÃO FISCAL - NEDFI",
                "GEDIC - Gerência de Desenvolvimento Institucional e Capacitação"
            ],
            "ASFAZ - Assessoria Fazendária": [
                "ASSESSORIA FAZENDÁRIA - ASFAZ"
            ],
            "GABSEC - Gabinete da Secretária de Estado da Fazenda": [
                "GABINETE SECRETÁRIO - GABSEC",
                "CONSELHO DE REESTRUTURAÇÃO E AJUSTE FISCAL - CRAFI"
            ],
            "SE - Secretaria Executiva": [
                "SECRETARIA EXECUTIVA - SE"
            ]
        },

        // --- Lotações Específicas / Residuais ---
        "Sindicato": {
            "Sindicato": [
                "PESSOAL À DISPOSIÇÃO"
            ]
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LOTACAO_HIERARCHY = LOTACAO_HIERARCHY;
}
