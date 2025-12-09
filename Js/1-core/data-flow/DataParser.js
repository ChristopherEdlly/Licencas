/**
 * DataParser - Parser de dados CSV
 * Responsabilidade: Converter CSV string → Array de objetos estruturados
 * Dependências: DateUtils (para parsing de datas)
 */

// Import condicional para Node.js
const DateUtils = typeof require !== 'undefined' 
    ? require('../utilities/DateUtils.js')
    : window.DateUtils;

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

        // Primeira linha = headers
        const headers = this._parseCSVLine(lines[0]);
        console.log(`[DataParser] Headers encontrados: ${headers.length}`);
        console.log(`[DataParser] Colunas: ${headers.join(', ')}`);

        // Parse das linhas de dados
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this._parseCSVLine(lines[i]);
            
            // Pular linhas vazias
            if (values.length === 0 || values.every(v => !v)) {
                continue;
            }

            // Criar objeto com headers como chaves
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            data.push(row);
        }

        console.log(`[DataParser] ✓ Parseadas ${data.length} linhas de dados`);
        return data;
    }

    /**
     * Parse de uma linha CSV (suporta vírgulas dentro de aspas)
     * @param {string} line - Linha do CSV
     * @returns {Array<string>} - Array de valores
     */
    static _parseCSVLine(line) {
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
            } else if (char === ',' && !inQuotes) {
                // Vírgula fora de aspas = separador
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
            nome: ['nome', 'nome servidor', 'servidor', 'nome_servidor'],
            
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
            licencasPremio: ['licencas premio', 'licenças prêmio', 'licenca premio', 'licença prêmio', 'lp']
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
        console.log('[DataParser] Normalizando dados...');
        
        return data.map(row => {
            const normalized = {};
            
            for (const [originalHeader, value] of Object.entries(row)) {
                const normalizedKey = headerMap[originalHeader] || originalHeader;
                normalized[normalizedKey] = value;
            }

            return normalized;
        });
    }

    /**
     * Pipeline completo: CSV → Dados normalizados
     * @param {string} csvString - String CSV completa
     * @returns {Array<Object>} - Dados parseados e normalizados
     */
    static parse(csvString) {
        console.log('\n' + '='.repeat(60));
        console.log('[DataParser] 📊 Iniciando pipeline de parsing');
        console.log('='.repeat(60));
        
        // 1. Parse básico do CSV
        const rawData = this.parseCSV(csvString);
        
        if (rawData.length === 0) {
            console.error('[DataParser] ❌ Falha no parse - dados vazios');
            return [];
        }

        // 2. Mapear headers
        const headers = Object.keys(rawData[0]);
        const headerMap = this.mapHeaders(headers);

        // 3. Normalizar dados
        const normalizedData = this.normalizeData(rawData, headerMap);

        console.log(`[DataParser] ✓ Pipeline completo: ${normalizedData.length} registros`);
        console.log('='.repeat(60) + '\n');

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
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataParser;
}

// Export para browser (global)
if (typeof window !== 'undefined') {
    window.DataParser = DataParser;
}
