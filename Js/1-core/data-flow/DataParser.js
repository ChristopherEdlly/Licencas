/**
 * DataParser - Parser de dados CSV
 * Responsabilidade: Converter CSV string → Array de objetos estruturados
 * Dependências: DateUtils (para parsing de datas)
 */

// Helper para obter DateUtils (Node.js ou Browser)
function getDateUtils() {
    if (typeof require !== 'undefined') {
        return require('../utilities/DateUtils.js');
    }
    if (typeof window !== 'undefined' && window.DateUtils) {
        return window.DateUtils;
    }
    throw new Error('DateUtils não disponível');
}

class DataParser {
    /**
     * Parse CSV string para array de objetos
     * @param {string} csvString - String CSV completa
     * @returns {Array<Object>} - Array de objetos com dados parseados
     */
    static parseCSV(csvString) {
        console.log('[DataParser] Iniciando parse do CSV...');

        if (!csvString || typeof csvString !== 'string') {
            console.error('[DataParser] CSV inválido');
            return [];
        }

        // Split por linhas (suporta \n e \r\n)
        const lines = csvString.split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) {
            console.error('[DataParser] CSV vazio');
            return [];
        }

        // Detectar delimitador (vírgula ou ponto-e-vírgula)
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ','; // Preferência por msg_count se empate

        console.log(`[DataParser] Delimitador detectado: "${delimiter}"`);

        // Primeira linha = headers
        const headers = this._parseCSVLine(firstLine, delimiter);
        console.log(`[DataParser] Headers encontrados: ${headers.length}`);
        console.log(`[DataParser] Colunas: ${headers.join(', ')}`);

        // Parse das linhas de dados
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this._parseCSVLine(lines[i], delimiter);

            // Pular linhas vazias
            if (values.length === 0 || values.every(v => !v)) {
                continue;
            }

            // Criar objeto com headers como chaves
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] !== undefined ? values[index] : '';
            });

            data.push(row);
        }

        console.log(`[DataParser] ✓ Parseadas ${data.length} linhas de dados`);
        return data;
    }

    /**
     * Parse de uma linha CSV (suporta delimitador customizado e aspas)
     * @param {string} line - Linha do CSV
     * @param {string} delimiter - Delimitador (padrão: ',')
     * @returns {Array<string>} - Array de valores
     */
    static _parseCSVLine(line, delimiter = ',') {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                // Aspas duplas escapadas ("")
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip próxima aspa
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                // Delimitador fora de aspas = separador
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        // Adicionar último valor
        result.push(current.trim());
        return result;
    }

    /**
     * Mapeia headers flexíveis para nomes padronizados
     * Exemplo: "NOME SERVIDOR" ou "Nome" → "nome"
     * @param {Array<string>} headers - Headers originais
     * @returns {Object} - Mapa de headers (original → padronizado)
     */
    static mapHeaders(headers) {
        console.log('[DataParser] Mapeando headers...');

        const headerMap = {};
        const mappings = {
            // Nome do servidor
            nome: ['nome', 'nome servidor', 'servidor', 'nome_servidor', 'funcionario', 'funcionário', 'colaborador', 'empregado', 'nome completo'],

            // Matrícula
            matricula: ['matricula', 'matrícula', 'mat', 'matricula siape', 'siape'],

            // Cargo
            cargo: ['cargo', 'cargo efetivo', 'cargo_efetivo'],

            // Lotação
            lotacao: ['lotacao', 'lotação', 'unidade', 'setor', 'orgao', 'órgão'],

            // Data de nascimento
            dataNascimento: ['data nascimento', 'data_nascimento', 'nascimento', 'dt_nascimento', 'data nasc'],

            // Data de admissão
            dataAdmissao: ['data admissao', 'data admissão', 'data_admissao', 'admissao', 'admissão', 'dt_admissao'],

            // Sexo
            sexo: ['sexo', 'genero', 'gênero'],

            // Licenças prêmio
            licencasPremio: ['licencas premio', 'licenças prêmio', 'licenca premio', 'licença prêmio', 'lp'],

            // Saldo
            saldo: ['saldo', 'restando', 'dias restantes', 'dias_restando']
        };

        headers.forEach((header, index) => {
            const normalized = header.toLowerCase().trim();

            // Tentar encontrar mapeamento
            for (const [key, variations] of Object.entries(mappings)) {
                if (variations.includes(normalized)) {
                    headerMap[header] = key;
                    console.log(`[DataParser]   "${header}" → "${key}"`);
                    return;
                }
            }

            // Se não encontrou mapeamento, usar original normalizado
            headerMap[header] = normalized.replace(/\s+/g, '_');
        });

        return headerMap;
    }

    /**
     * Normaliza dados parseados usando mapeamento de headers
     * @param {Array<Object>} data - Dados com headers originais
     * @param {Object} headerMap - Mapa de headers
     * @returns {Array<Object>} - Dados com headers normalizados
     */
    static normalizeData(data, headerMap) {
        const normalizedData = data.map(row => {
            const normalized = {};

            for (const [originalHeader, value] of Object.entries(row)) {
                const normalizedKey = headerMap[originalHeader] || originalHeader;
                normalized[normalizedKey] = value;
            }

            return normalized;
        });

        return normalizedData;
    }

    /**
     * Pipeline completo: CSV → Dados normalizados
     * @param {string} csvString - String CSV completa
     * @returns {Array<Object>} - Dados parseados e normalizados
     */
    static parse(csvString) {
        // 1. Parse básico do CSV
        const rawData = this.parseCSV(csvString);

        if (rawData.length === 0) {
            console.error('[DataParser] ❌ Falha no parse - dados vazios');
            return [];
        }

        // Detectar se o CSV contém colunas de período/gozo (uma linha por licença)
        // Se sim, agrupar linhas por servidor e retornar servidores com array `licencas`
        try {
            const firstRow = rawData[0] || {};
            const headersStr = Object.keys(firstRow).join(',').toLowerCase();
            const looksLikeLicenca = headersStr.includes('a_parte') || headersStr.includes('a_partir') || headersStr.includes('a partir') || headersStr.includes('inicio') || headersStr.includes('termino') || headersStr.includes('gozo') || headersStr.includes('aquisitivo');

            if (looksLikeLicenca && typeof this.groupByServidor === 'function') {
                console.log('[DataParser] CSV identificado como licenças (linhas por licença) — agrupando por servidor');
                return this.groupByServidor(rawData);
            }
        } catch (e) {
            // Falhar silenciosamente e continuar com o fluxo normal
            console.warn('[DataParser] Falha ao detectar tipo de CSV para agrupamento:', e && e.message);
        }

        // 2. Mapear headers
        const headers = Object.keys(rawData[0]);
        const headerMap = this.mapHeaders(headers);

        // 3. Normalizar dados
        const normalizedData = this.normalizeData(rawData, headerMap);

        return normalizedData;
    }

    /**
     * Parse de campo de licenças prêmio (formato: "jan/2025 a dez/2025")
     * @param {string} licencasStr - String com períodos de licenças
     * @returns {Array<Object>} - Array de períodos parseados
     */
    static parseLicencasPremio(licencasStr) {
        if (!licencasStr || typeof licencasStr !== 'string') {
            return [];
        }

        console.log(`[DataParser] Parsing licenças: "${licencasStr}"`);

        // Split por vírgula ou ponto-e-vírgula
        const periodos = licencasStr.split(/[,;]/).map(p => p.trim()).filter(p => p);

        const result = [];

        periodos.forEach(periodo => {
            // Formato: "jan/2025 a dez/2025" ou "01/2025 - 12/2025"
            // Usar .+ (greedy) ao invés de .+? (non-greedy) para capturar a data completa
            const match = periodo.match(/(.+)\s+(?:a|até)\s+(.+)|(.+)\s*-\s*(.+)/);

            if (match) {
                // match[1] e match[2] para "a/até", match[3] e match[4] para "-"
                const inicioStr = (match[1] || match[3]).trim();
                const fimStr = (match[2] || match[4]).trim();

                const DateUtils = getDateUtils();
                const inicio = DateUtils.parseBrazilianDate(inicioStr);
                const fim = DateUtils.parseBrazilianDate(fimStr);

                if (inicio && fim) {
                    result.push({
                        inicio,
                        fim,
                        inicioStr: DateUtils.formatBrazilianDate(inicio, 'short'),
                        fimStr: DateUtils.formatBrazilianDate(fim, 'short'),
                        raw: periodo
                    });
                    console.log(`[DataParser]   ✓ ${inicioStr} → ${fimStr}`);
                }
            }
        });

        return result;
    }

    /**
     * Agrupa linhas do CSV por servidor (quando cada linha é uma licença)
     * @param {Array<Object>} rows - Array de objetos parseados do CSV
     * @returns {Array<Object>} - Array de servidores com licencas agregadas
     */
    static groupByServidor(rows) {
        console.log('[DataParser] Agrupando linhas por servidor...');

        if (!Array.isArray(rows) || rows.length === 0) {
            console.warn('[DataParser] Nenhuma linha para agrupar');
            return [];
        }

        const servidoresMap = new Map();

        rows.forEach((row, index) => {
            // Identificar servidor (usar CPF se disponível, senão NOME)
            const cpf = row.CPF || row.cpf;
            const nome = row.NOME || row.nome || row.SERVIDOR || row.servidor;

            if (!nome) {
                console.warn(`[DataParser] Linha ${index}: sem nome, pulando`);
                return;
            }

            // Chave única: CPF (se tiver) ou NOME normalizado
            const chave = cpf || nome.trim().toUpperCase();

            // Se servidor ainda não existe no map, criar
            if (!servidoresMap.has(chave)) {
                servidoresMap.set(chave, {
                    nome: nome.trim(),
                    cpf: cpf || '',
                    cargo: row.CARGO || row.cargo || '',
                    lotacao: row.LOTACAO || row.LOTAÇÃO || row.lotacao || '',
                    unidade: row.UNIDADE || row.unidade || '',
                    licencas: []
                });
            }

            const servidor = servidoresMap.get(chave);

            // Extrair dados da licença desta linha
            const inicioRaw = row.A_PARTIR || row['A_PARTIR'] || row.INICIO || row['INÍCIO'];
            const fimRaw = row.TERMINO || row.FINAL || row.FIM;
            const gozoRaw = row.GOZO || row.gozo || '';
            const restante = row.RESTANDO || row.restando || '';

            // Parse de dias (formato: "30", "60", "90")
            let dias = 0;
            if (typeof gozoRaw === 'number') {
                dias = gozoRaw;
            } else if (typeof gozoRaw === 'string') {
                const match = gozoRaw.match(/\d+/);
                if (match) dias = parseInt(match[0], 10);
            }

            // Ignorar linhas com data "1899-12-30" (marca de "sem licença")
            if (inicioRaw && !inicioRaw.toString().includes('1899')) {
                // Adicionar licença ao array
                servidor.licencas.push({
                    inicio: inicioRaw,  // String ainda, será convertida no Transformer
                    fim: fimRaw,
                    dias: dias,
                    restando: restante,
                    aquisitivoInicio: row.AQUISITIVO_INICIO || row.aquisitivoInicio,
                    aquisitivoFim: row.AQUISITIVO_FIM || row.aquisitivoFim,
                    tipo: 'periodo-gozo'
                });
            }

            // Atualizar lotação se mudou (usar a mais recente)
            // Aceitar várias formas de chave (maiúsculas/minúsculas e 'unidade')
            const possibleLotKeys = [
                'LOTACAO', 'LOTAÇÃO', 'lotacao', 'lotação', 'UNIDADE', 'unidade'
            ];
            for (const k of possibleLotKeys) {
                if (row[k]) {
                    servidor.lotacao = row[k];
                    break;
                }
            }
        });

        // Converter Map para Array
        const servidoresArray = Array.from(servidoresMap.values());

        console.log(`[DataParser] ✓ Agrupadas ${rows.length} linhas em ${servidoresArray.length} servidores`);
        console.log(`[DataParser] Exemplo: ${servidoresArray[0]?.nome} tem ${servidoresArray[0]?.licencas.length} licenças`);

        return servidoresArray;
    }
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataParser;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.DataParser = DataParser;
}
