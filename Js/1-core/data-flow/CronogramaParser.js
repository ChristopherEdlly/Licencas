/**
 * CronogramaParser - Parser de Cronogramas de Licenças (Datas Brasileiras)
 *
 * Responsabilidade: Parse de cronogramas de licenças com suporte a múltiplos
 * formatos de data brasileiros (jan/2025, fev-25, 06/2025, 15/01/2025, etc.)
 *
 * Dependências: DateUtils (para parsing auxiliar)
 *
 * @module 1-core/data-flow/CronogramaParser
 */


class CronogramaParser {
    constructor() {
        // Mapeamentos de meses
        this.mesesAbrev = {
            'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'mai': 5, 'jun': 6,
            'jul': 7, 'ago': 8, 'set': 9, 'out': 10, 'nov': 11, 'dez': 12
        };

        this.mesesCompletos = {
            'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
            'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        };

        // Flag de debug
        this.debug = false;

        console.log('✅ CronogramaParser criado');
    }

    /**
     * Habilitar/Desabilitar debug de logs do parser
     * @param {boolean} flag - true para habilitar logs
     */
    setDebug(flag) {
        this.debug = !!flag;
    }

    // ==================== NORMALIZAÇÃO ====================

    /**
     * Normaliza um nome de mês (remove acentos, pontuação e espaços extras)
     * @param {string} raw - Texto bruto
     * @returns {string} - Texto normalizado
     */
    normalizeMonthKey(raw) {
        if (!raw) return '';
        return raw.toString().toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z]/g, '')
            .trim();
    }

    /**
     * Normaliza chaves/headers para comparação (remove acentos, uppercase, trim)
     * @param {string} key - Chave a normalizar
     * @returns {string} - Chave normalizada
     */
    normalizeKey(key) {
        if (!key) return '';
        return key.toString()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toUpperCase()
            .trim();
    }

    // ==================== EXTRAÇÃO DE CAMPOS ====================

    /**
     * Localiza um campo no objeto `dados` ignorando maiúsculas e acentos
     * Aceita um nome único ou um array de alternativas
     * @param {Object} dados - Objeto com dados do servidor
     * @param {string|Array<string>} names - Nome(s) do campo
     * @returns {string} - Valor do campo ou string vazia
     */
    getField(dados, names) {
        if (!dados || !names) return '';

        const keys = Object.keys(dados || {});
        const normalizedMap = new Map();
        keys.forEach(k => normalizedMap.set(this.normalizeKey(k), k));

        const tryNames = Array.isArray(names) ? names : [names];

        // Tentar match exato primeiro
        for (const name of tryNames) {
            const nk = this.normalizeKey(name);
            if (normalizedMap.has(nk)) {
                const originalKey = normalizedMap.get(nk);
                return dados[originalKey] || '';
            }
        }

        // Tentar match aproximado (contém)
        for (const name of tryNames) {
            const nk = this.normalizeKey(name);
            for (const [normKey, origKey] of normalizedMap.entries()) {
                if (normKey.includes(nk) || nk.includes(normKey)) {
                    return dados[origKey] || '';
                }
            }
        }

        return '';
    }

    /**
     * Extrai nome do servidor
     * @param {Object} dados - Dados do servidor
     * @returns {string} - Nome do servidor
     */
    static extractNome(dados) {
        const parser = new CronogramaParser();
        return parser.getField(dados, ['SERVIDOR', 'NOME'])?.trim() || '';
    }

    /**
     * Extrai lotação do servidor
     * @param {Object} dados - Dados do servidor
     * @returns {string} - Lotação
     */
    static extractLotacao(dados) {
        const parser = new CronogramaParser();
        return parser.getField(dados, ['LOTACAO', 'LOTAÇÃO'])?.trim() || '';
    }

    /**
     * Extrai cargo do servidor
     * @param {Object} dados - Dados do servidor
     * @returns {string} - Cargo
     */
    static extractCargo(dados) {
        const parser = new CronogramaParser();
        return parser.getField(dados, ['CARGO'])?.trim() || '';
    }

    /**
     * Extrai período de licença (inicio/fim)
     * @param {Object} dados - Dados do servidor
     * @returns {Object} - { inicio, fim }
     */
    static extractPeriodo(dados) {
        const parser = new CronogramaParser();

        // Tenta várias formas: coluna única, dupla, incremental
        const inicio = parser.getField(dados, [
            'INICIO', 'INÍCIO', 'INICIO DE LICENCA PREMIO', 'INICIO DE LICENÇA PREMIO',
            'A_PARTIR', 'APARTIR'
        ])?.trim() || '';

        const fim = parser.getField(dados, [
            'FINAL', 'FIM', 'FINAL DE LICENCA PREMIO', 'FINAL DE LICENÇA PREMIO',
            'TERMINO', 'TÉRMINO'
        ])?.trim() || '';

        // Se ambos presentes, retorna objeto
        if (inicio && fim) return { inicio, fim };
        if (inicio) return { inicio, fim: '' };
        if (fim) return { inicio: '', fim };

        // Tenta cronograma textual
        const cronograma = parser.getField(dados, ['CRONOGRAMA', 'CRONOGRAMA DE LICENCA'])?.trim() || '';
        if (cronograma) return { inicio: cronograma, fim: '' };

        return { inicio: '', fim: '' };
    }

    // ==================== PARSING DE DATAS ====================

    /**
     * Parse de mês em texto (jan, fev, janeiro, fevereiro)
     * @param {string} mesTexto - Texto do mês
     * @returns {number|null} - Número do mês (1-12) ou null
     */
    parseMesTexto(mesTexto) {
        if (!mesTexto) return null;

        const normalizado = this.normalizeMonthKey(mesTexto);

        // Tentar abreviação
        if (this.mesesAbrev[normalizado]) {
            return this.mesesAbrev[normalizado];
        }

        // Tentar nome completo (normalizado)
        const mesesCompletosNormalizados = {
            'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6,
            'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        };

        if (mesesCompletosNormalizados[normalizado]) {
            return mesesCompletosNormalizados[normalizado];
        }

        return null;
    }

    /**
     * Parse de data brasileira (múltiplos formatos)
     * Formatos suportados:
     * - DD/MM/YYYY (ex: 15/01/2025)
     * - MM/YYYY (ex: 01/2025 -> dia 1)
     * - jan/2025, fev/2026 (mês/ano -> dia 1)
     * - jan-25, fev-25 (mês-ano -> dia 1)
     * - 06/2025 (mês numerico/ano -> dia 1)
     *
     * @param {string} dateStr - String com data
     * @returns {Date|null} - Data parseada ou null
     */
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;

        const cleaned = dateStr.trim();
        if (!cleaned) return null;

        // Validação de partes de data
        const isValidDateParts = (y, m, d) => {
            if (y < 1900 || y > 2100) return false;
            if (m < 1 || m > 12) return false;
            const daysInMonth = new Date(y, m, 0).getDate();
            if (d < 1 || d > daysInMonth) return false;
            return true;
        };

        // 1. DD/MM/YYYY (formato brasileiro completo)
        const brMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (brMatch) {
            const dia = parseInt(brMatch[1], 10);
            const mes = parseInt(brMatch[2], 10);
            const ano = parseInt(brMatch[3], 10);
            if (!isValidDateParts(ano, mes, dia)) return null;
            return new Date(ano, mes - 1, dia);
        }

        // 2. jan/2025, fev/2026 (mês texto/ano)
        const mesTextoAnoMatch = cleaned.match(/^([a-zA-Zç]+)\/(\d{4})$/);
        if (mesTextoAnoMatch) {
            const mesNome = mesTextoAnoMatch[1];
            const ano = parseInt(mesTextoAnoMatch[2], 10);
            const mes = this.parseMesTexto(mesNome);
            if (mes && isValidDateParts(ano, mes, 1)) {
                return new Date(ano, mes - 1, 1); // Dia 1
            }
        }

        // 3. jan-25, fev-25 (mês-ano abreviado)
        const mesAnoAbrevMatch = cleaned.match(/^([a-zA-Zç]+)-(\d{2})$/);
        if (mesAnoAbrevMatch) {
            const mesNome = mesAnoAbrevMatch[1];
            const anoAbrev = parseInt(mesAnoAbrevMatch[2], 10);
            const ano = anoAbrev >= 0 && anoAbrev <= 99 ? 2000 + anoAbrev : null;
            const mes = this.parseMesTexto(mesNome);
            if (mes && ano && isValidDateParts(ano, mes, 1)) {
                return new Date(ano, mes - 1, 1);
            }
        }

        // 4. MM/YYYY (mês numérico/ano)
        const mesAnoMatch = cleaned.match(/^(\d{1,2})\/(\d{4})$/);
        if (mesAnoMatch) {
            const mes = parseInt(mesAnoMatch[1], 10);
            const ano = parseInt(mesAnoMatch[2], 10);
            if (isValidDateParts(ano, mes, 1)) {
                return new Date(ano, mes - 1, 1); // Dia 1
            }
        }

        // 5. ISO YYYY-MM-DD
        const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            const ano = parseInt(isoMatch[1], 10);
            const mes = parseInt(isoMatch[2], 10);
            const dia = parseInt(isoMatch[3], 10);
            if (!isValidDateParts(ano, mes, dia)) return null;
            return new Date(ano, mes - 1, dia);
        }

        // 6. Tentar parse genérico e validar
        const parsed = new Date(cleaned);
        if (isNaN(parsed.getTime())) return null;

        const pY = parsed.getFullYear();
        const pM = parsed.getMonth() + 1;
        const pD = parsed.getDate();
        if (!isValidDateParts(pY, pM, pD)) return null;

        return parsed;
    }

    /**
     * Formata data no formato brasileiro DD/MM/YYYY
     * @param {Date} date - Data a formatar
     * @returns {string} - Data formatada
     */
    formatDateBR(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '';
        }

        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();

        return `${dia}/${mes}/${ano}`;
    }

    /**
     * Adiciona meses a uma data (30 dias por mês)
     * @param {Date} date - Data inicial
     * @param {number} meses - Quantidade de meses
     * @returns {Date} - Nova data
     */
    adicionarMeses(date, meses) {
        if (!date || !(date instanceof Date)) return null;

        const novaData = new Date(date);
        // 1 mês = 30 dias (conforme regra de negócio)
        novaData.setDate(novaData.getDate() + (meses * 30));

        return novaData;
    }

    // ==================== PARSING DE CRONOGRAMA ====================

    /**
     * Parse de cronograma de licença (texto livre)
     * Exemplos:
     * - "jan/2025 - mar/2025"
     * - "15/01/2025 - 14/02/2025"
     * - "3 meses a partir de jan/2025"
     *
     * @param {string} cronograma - Texto do cronograma
     * @param {number} mesesPadrao - Meses de licença (padrão: 3)
     * @returns {Array<Object>} - Array de períodos { inicio, fim, tipo, meses }
     */
    parseCronograma(cronograma, mesesPadrao = 3) {
        if (!cronograma) return [];

        const licencas = [];
        const texto = cronograma.toLowerCase().trim();

        // Padrão 1: "DD/MM/YYYY - DD/MM/YYYY" ou "jan/2025 - mar/2025"
        const padraoPeriodo = /([^\s-]+)\s*-\s*([^\s-]+)/;
        const matchPeriodo = texto.match(padraoPeriodo);

        if (matchPeriodo) {
            const inicio = this.parseDate(matchPeriodo[1]);
            const fim = this.parseDate(matchPeriodo[2]);

            if (inicio && fim) {
                const diasDiff = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
                const meses = Math.ceil(diasDiff / 30);

                licencas.push({
                    inicio: inicio,
                    fim: fim,
                    tipo: 'periodo-explicito',
                    meses: meses,
                    descricao: `${this.formatDateBR(inicio)} a ${this.formatDateBR(fim)}`
                });

                if (this.debug) {
                    console.log(`✅ Parse período: ${cronograma} -> ${licencas[0].descricao}`);
                }

                return licencas;
            }
        }

        // Padrão 2: Data única "jan/2025" ou "15/01/2025" (inferir fim)
        const dataUnica = this.parseDate(texto);
        if (dataUnica) {
            const fim = this.adicionarMeses(dataUnica, mesesPadrao);
            fim.setDate(fim.getDate() - 1); // Último dia do período

            licencas.push({
                inicio: dataUnica,
                fim: fim,
                tipo: 'data-unica',
                meses: mesesPadrao,
                descricao: `${this.formatDateBR(dataUnica)} a ${this.formatDateBR(fim)} (inferido ${mesesPadrao} meses)`
            });

            if (this.debug) {
                console.log(`✅ Parse data única: ${cronograma} -> ${licencas[0].descricao}`);
            }

            return licencas;
        }

        // Padrão 3: "3 meses a partir de jan/2025"
        const padraoMesesAPartir = /(\d+)\s*m[eê]s(?:es)?\s*(?:a\s*partir\s*de|em)\s*([^\s,]+)/i;
        const matchMeses = texto.match(padraoMesesAPartir);

        if (matchMeses) {
            const qtdMeses = parseInt(matchMeses[1]);
            const dataInicio = this.parseDate(matchMeses[2]);

            if (dataInicio && qtdMeses > 0) {
                const fim = this.adicionarMeses(dataInicio, qtdMeses);
                fim.setDate(fim.getDate() - 1);

                licencas.push({
                    inicio: dataInicio,
                    fim: fim,
                    tipo: 'meses-explícitos',
                    meses: qtdMeses,
                    descricao: `${this.formatDateBR(dataInicio)} a ${this.formatDateBR(fim)} (${qtdMeses} meses)`
                });

                if (this.debug) {
                    console.log(`✅ Parse meses explícitos: ${cronograma} -> ${licencas[0].descricao}`);
                }

                return licencas;
            }
        }

        // Se não conseguiu parsear, retorna array vazio
        if (this.debug && licencas.length === 0) {
            console.warn(`⚠️ Não foi possível parsear cronograma: "${cronograma}"`);
        }

        return licencas;
    }

    // ==================== PARSE DE LINHA CSV ====================

    /**
     * Parse de linha CSV (suporta vírgulas dentro de aspas)
     * @param {string} linha - Linha do CSV
     * @param {Array<string>} headers - Headers do CSV
     * @returns {Object} - Objeto com dados parseados
     */
    parseLinha(linha, headers) {
        const valores = [];
        let valorAtual = '';
        let dentroAspas = false;

        for (let i = 0; i < linha.length; i++) {
            const char = linha[i];

            if (char === '"') {
                dentroAspas = !dentroAspas;
            } else if (char === ',' && !dentroAspas) {
                valores.push(valorAtual.trim());
                valorAtual = '';
            } else {
                valorAtual += char;
            }
        }

        valores.push(valorAtual.trim());

        const dados = {};
        headers.forEach((header, index) => {
            if (header && header.trim() !== '' && index < valores.length) {
                dados[header] = valores[index] || '';
            }
        });

        return dados;
    }
}

// Exports para browser e Node.js
if (typeof window !== 'undefined') {
    window.CronogramaParser = CronogramaParser;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CronogramaParser;
}
