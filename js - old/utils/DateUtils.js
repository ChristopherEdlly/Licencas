/**
 * DateUtils.js
 * Módulo de utilitários para manipulação e parsing de datas
 * Suporta múltiplos formatos de entrada de data
 */

class DateUtils {
    constructor() {
        // Mapeamento de meses em português
        this.mesesPT = {
            // Abreviações
            'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
            'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12,
            // Nomes completos
            'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
            'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        };

        // Mapeamento de meses em inglês (para formatos mistos)
        this.mesesEN = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
        };

        // Nomes dos meses para exibição
        this.nomeMeses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
    }

    /**
     * Normaliza uma string removendo acentos, espaços extras e convertendo para lowercase
     * @param {string} str - String para normalizar
     * @returns {string} String normalizada
     */
    normalize(str) {
        if (!str) return '';
        return str.toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\/\-]/g, '')
            .trim();
    }

    /**
     * Converte nome de mês para número (1-12)
     * @param {string} mesTexto - Nome do mês (pt ou en)
     * @returns {number|null} Número do mês ou null se inválido
     */
    mesTextoParaNumero(mesTexto) {
        if (!mesTexto) return null;
        const normalizado = this.normalize(mesTexto);
        
        // Tentar português primeiro
        if (this.mesesPT[normalizado]) {
            return this.mesesPT[normalizado];
        }
        
        // Tentar inglês
        if (this.mesesEN[normalizado]) {
            return this.mesesEN[normalizado];
        }
        
        // Tentar apenas os primeiros 3 caracteres
        const abrev = normalizado.substring(0, 3);
        return this.mesesPT[abrev] || this.mesesEN[abrev] || null;
    }

    /**
     * Converte número de mês para nome
     * @param {number} mes - Número do mês (1-12)
     * @returns {string} Nome do mês
     */
    numeroParaMesTexto(mes) {
        if (mes < 1 || mes > 12) return '';
        return this.nomeMeses[mes - 1];
    }

    /**
     * Ajusta ano de 2 dígitos para 4 dígitos
     * @param {number} ano - Ano em 2 ou 4 dígitos
     * @returns {number} Ano em 4 dígitos
     */
    ajustarAno(ano) {
        if (ano < 100) {
            // Anos 00-49 = 2000-2049, 50-99 = 1950-1999
            return ano < 50 ? 2000 + ano : 1900 + ano;
        }
        return ano;
    }

    /**
     * Parse de data em múltiplos formatos
     * Formatos suportados:
     * - DD/MM/YYYY ou DD/MM/YY
     * - MM/YYYY ou MM/YY
     * - jan/2025, Jan-25, janeiro/2025
     * - 06/2025 (mês numérico)
     * - 15/01/2025 (com dia específico)
     * - DD/MM/YYYY - DD/MM/YYYY (período)
     * 
     * @param {string} dataStr - String da data
     * @returns {Object|null} { inicio: Date, fim: Date, tipo: string } ou null se inválido
     */
    parseData(dataStr) {
        if (!dataStr || dataStr.toString().trim() === '') {
            return null;
        }

        const str = dataStr.toString().trim();

        // 1. Verificar se é um período (contém "-" ou "a" entre datas)
        const periodoPadrao = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-a]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/;
        const periodoMatch = str.match(periodoPadrao);
        
        if (periodoMatch) {
            const inicio = this.parseSingleDate(periodoMatch[1]);
            const fim = this.parseSingleDate(periodoMatch[2]);
            
            if (inicio && fim) {
                return {
                    inicio: inicio,
                    fim: fim,
                    tipo: 'periodo_customizado'
                };
            }
        }

        // 2. Data única - tentar parse
        const dataInicio = this.parseSingleDate(str);
        
        if (dataInicio) {
            return {
                inicio: dataInicio,
                fim: null, // Será calculado depois com base em MESES
                tipo: 'data_inicio'
            };
        }

        return null;
    }

    /**
     * Parse de uma única data em diversos formatos
     * @param {string} dataStr - String da data
     * @returns {Date|null} Objeto Date ou null se inválido
     */
    parseSingleDate(dataStr) {
        if (!dataStr) return null;

        const str = dataStr.toString().trim().replace(/['"]/g, '');

        // 1. DD/MM/YYYY ou DD/MM/YY
        const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (ddmmyyyyMatch) {
            const dia = parseInt(ddmmyyyyMatch[1]);
            const mes = parseInt(ddmmyyyyMatch[2]);
            const ano = this.ajustarAno(parseInt(ddmmyyyyMatch[3]));
            
            if (this.isValidDate(dia, mes, ano)) {
                return new Date(ano, mes - 1, dia);
            }
        }

        // 2. MM/YYYY ou MM/YY (sem dia, assume dia 1)
        const mmyyyyMatch = str.match(/^(\d{1,2})\/(\d{2,4})$/);
        if (mmyyyyMatch) {
            const mes = parseInt(mmyyyyMatch[1]);
            const ano = this.ajustarAno(parseInt(mmyyyyMatch[2]));
            
            if (mes >= 1 && mes <= 12) {
                return new Date(ano, mes - 1, 1);
            }
        }

        // 3. Mês textual/ano: "jan/2025", "Jan-25", "janeiro/2025", "jan/26"
        const mesTextoMatch = str.match(/^([a-zçãéíóú]+)[\/-](\d{2,4})$/i);
        if (mesTextoMatch) {
            const mesNum = this.mesTextoParaNumero(mesTextoMatch[1]);
            let ano = parseInt(mesTextoMatch[2]);
            
            // Ajustar ano de 2 dígitos (26 → 2026, 25 → 2025)
            if (ano < 100) {
                ano = ano < 50 ? 2000 + ano : 1900 + ano;
            }
            
            if (mesNum && ano >= 1900 && ano <= 2100) {
                return new Date(ano, mesNum - 1, 1);
            }
        }

        // 4. Tentar ISO: YYYY-MM-DD
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            const ano = parseInt(isoMatch[1]);
            const mes = parseInt(isoMatch[2]);
            const dia = parseInt(isoMatch[3]);
            
            if (this.isValidDate(dia, mes, ano)) {
                return new Date(ano, mes - 1, dia);
            }
        }

        return null;
    }

    /**
     * Valida se dia, mês e ano formam uma data válida
     * @param {number} dia - Dia (1-31)
     * @param {number} mes - Mês (1-12)
     * @param {number} ano - Ano (ex: 2025)
     * @returns {boolean} True se válido
     */
    isValidDate(dia, mes, ano) {
        if (mes < 1 || mes > 12) return false;
        if (dia < 1 || dia > 31) return false;
        if (ano < 1900 || ano > 2100) return false;
        
        // Verificar dia válido para o mês
        const date = new Date(ano, mes - 1, dia);
        return date.getFullYear() === ano && 
               date.getMonth() === mes - 1 && 
               date.getDate() === dia;
    }

    /**
     * Adiciona N dias a uma data
     * IMPORTANTE: Sempre adiciona exatamente N dias (não usa meses do calendário)
     * @param {Date} data - Data inicial
     * @param {number} dias - Quantidade de dias
     * @returns {Date} Nova data
     */
    adicionarDias(data, dias) {
        const nova = new Date(data);
        nova.setDate(nova.getDate() + dias);
        return nova;
    }

    /**
     * Calcula diferença em dias entre duas datas (incluindo ambas)
     * @param {Date} dataInicio - Data inicial
     * @param {Date} dataFim - Data final
     * @returns {number} Número de dias
     */
    diferencaDias(dataInicio, dataFim) {
        const diffTime = Math.abs(dataFim - dataInicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // +1 porque inclui ambos os dias
    }

    /**
     * Calcula diferença em meses entre duas datas
     * @param {Date} dataInicio - Data inicial
     * @param {Date} dataFim - Data final
     * @returns {number} Número de meses
     */
    diferencaMeses(dataInicio, dataFim) {
        const meses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + 
                      (dataFim.getMonth() - dataInicio.getMonth());
        return Math.abs(meses);
    }

    /**
     * Formata data para exibição em PT-BR
     * @param {Date} data - Data para formatar
     * @param {string} formato - 'curto' (DD/MM/YYYY) ou 'longo' (DD de Mês de YYYY)
     * @returns {string} Data formatada
     */
    formatarData(data, formato = 'curto') {
        if (!data || !(data instanceof Date)) return '';
        
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        
        if (formato === 'longo') {
            return `${dia} de ${this.numeroParaMesTexto(mes)} de ${ano}`;
        }
        
        return `${dia}/${String(mes).padStart(2, '0')}/${ano}`;
    }

    /**
     * Formata período de datas
     * @param {Date} inicio - Data de início
     * @param {Date} fim - Data de fim
     * @returns {string} Período formatado
     */
    formatarPeriodo(inicio, fim) {
        if (!inicio) return '';
        if (!fim) return this.formatarData(inicio);
        
        return `${this.formatarData(inicio)} a ${this.formatarData(fim)}`;
    }

    /**
     * Verifica se uma data está dentro de um período
     * @param {Date} data - Data para verificar
     * @param {Date} inicio - Início do período
     * @param {Date} fim - Fim do período
     * @returns {boolean} True se está dentro
     */
    estaEntrePeriodo(data, inicio, fim) {
        return data >= inicio && data <= fim;
    }

    /**
     * Calcula a idade com base na data de nascimento
     * @param {Date} dataNascimento - Data de nascimento
     * @param {Date} dataReferencia - Data de referência (padrão: hoje)
     * @returns {number} Idade em anos
     */
    calcularIdade(dataNascimento, dataReferencia = new Date()) {
        if (!dataNascimento) return 0;
        
        let idade = dataReferencia.getFullYear() - dataNascimento.getFullYear();
        const mesAniversario = dataReferencia.getMonth() - dataNascimento.getMonth();
        
        if (mesAniversario < 0 || (mesAniversario === 0 && dataReferencia.getDate() < dataNascimento.getDate())) {
            idade--;
        }
        
        return idade;
    }

    /**
     * Calcula tempo de serviço em anos
     * @param {Date} dataAdmissao - Data de admissão
     * @param {Date} dataReferencia - Data de referência (padrão: hoje)
     * @returns {number} Tempo de serviço em anos
     */
    calcularTempoServico(dataAdmissao, dataReferencia = new Date()) {
        if (!dataAdmissao) return 0;
        
        return this.calcularIdade(dataAdmissao, dataReferencia);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DateUtils = DateUtils;
}

// Exportar para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateUtils;
}
