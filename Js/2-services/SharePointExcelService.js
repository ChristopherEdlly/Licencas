/**
 * SharePointExcelService - CRUD via Microsoft Graph Workbook Tables API
 *
 * Métodos principais:
 * - getTableInfo(fileId, tableName)
 * - getTableRows(fileId, tableName)
 * - addTableRow(fileId, tableName, rowValuesArray)
 * - updateTableRow(fileId, tableName, rowIndex, updates, etag)
 * - filterTableRows(fileId, tableName, filterObj)
 */

class SharePointExcelService {
    static GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
    static AuditService = (typeof window !== 'undefined' && window.AuditService) || (typeof require !== 'undefined' && require('./AuditService.js'));
    // Timestamp of last interactive/auth error logged to reduce console spam
    static lastAuthInteractiveErrorTs = 0;

    // ID do arquivo Excel atualmente carregado (usado pelo SharePointNFGenerator)
    static currentFileId = null;

    /**
     * Converte número serial do Excel para Date JavaScript
     * Excel conta dias desde 01/01/1900 (com bug: 1900 não é bissexto, mas Excel trata como se fosse)
     * @param {number} excelSerial - Número serial do Excel
     * @returns {Date|null} Data convertida ou null se inválido
     */
    static excelSerialToDate(excelSerial) {
        if (excelSerial == null || typeof excelSerial !== 'number' || excelSerial < 1) {
            return null;
        }

        // Excel epoch: 30/12/1899 ao meio-dia UTC
        // IMPORTANTE: A biblioteca XLSX com raw:true já corrige o bug do Excel (dia 60 = 29/02/1900 fictício)
        // Por isso NÃO fazemos ajuste de -1 aqui, usamos o serial direto
        const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30, 12, 0, 0));

        const milliseconds = excelSerial * 24 * 60 * 60 * 1000;
        const date = new Date(EXCEL_EPOCH.getTime() + milliseconds);

        return date;
    }

    /**
     * Detecta se valor parece ser um serial date do Excel
     * @param {*} value - Valor a verificar
     * @returns {boolean} true se parece ser um serial date
     */
    static looksLikeExcelDate(value) {
        if (typeof value !== 'number') return false;

        // Serial dates razoáveis: entre 1 (01/01/1900) e ~50000 (ano ~2036)
        // Valores típicos de datas: 40000-50000 (anos 2009-2036)
        return value >= 1 && value <= 100000 && Number.isInteger(value);
    }

    static async _graphFetch(path, options = {}, scopes = ['Files.Read']) {
        const token = await AuthenticationService.acquireToken(scopes);
        const headers = Object.assign({}, options.headers || {}, {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const response = await fetch(`${this.GRAPH_BASE}${path}`, Object.assign({}, options, { headers }));

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            const err = new Error(`Graph request failed: ${response.status} ${response.statusText} ${text}`);
            err.status = response.status;
            throw err;
        }

        // Some endpoints return no content
        if (response.status === 204) return null;

        return response.json();
    }

    /**
     * Obtém metadados da tabela (worksheet, range, colunas)
     */
    static async getTableInfo(fileId, tableName) {
        const path = `/me/drive/items/${fileId}/workbook/tables/${encodeURIComponent(tableName)}`;
        const result = await this._graphFetch(path, { method: 'GET' });
        
        if (!result.columns || result.columns.length === 0) {
            console.warn(`[SharePointExcelService] ⚠️ getTableInfo "${tableName}": Nenhuma coluna retornada pela API`);
        }
        
        return result;
    }

    /**
     * Lista todas as linhas da tabela (com conversão automática de datas serializadas do Excel)
     * @param {string} fileId - ID do arquivo
     * @param {string} tableName - Nome da tabela
     * @param {Object} [tableInfo] - Informações da tabela (opcional, se não fornecido será buscado)
     */
    static async getTableRows(fileId, tableName, tableInfo = null) {
        console.log(`[SharePointExcelService] 📋 getTableRows: "${tableName}"${tableInfo ? ' (com tableInfo)' : ' (SEM tableInfo - fará chamada extra!)'}`);
        const path = `/me/drive/items/${fileId}/workbook/tables/${encodeURIComponent(tableName)}/rows`;
        const json = await this._graphFetch(path, { method: 'GET' });
        const rows = json.value || [];

        // Obter nomes das colunas para identificar campos de data
        // Se tableInfo foi fornecido, usar ele; caso contrário, buscar
        if (!tableInfo) {
            console.warn('[SharePointExcelService] ⚠️ getTableRows: tableInfo não fornecido, fazendo chamada extra à API');
            tableInfo = await this.getTableInfo(fileId, tableName);
        }
        
        const dateColumns = this._identifyDateColumns(tableInfo);

        // Processar cada linha convertendo datas seriais do Excel
        return rows.map(row => {
            if (!row.values || !Array.isArray(row.values) || row.values.length === 0) {
                return row;
            }

            const processedValues = row.values.map((rowArray, rowIdx) => {
                if (!Array.isArray(rowArray)) return rowArray;

                return rowArray.map((cellValue, colIdx) => {
                    // Se é uma coluna de data, processar conversão
                    if (dateColumns.has(colIdx)) {
                        // Caso 1: É um número serial do Excel
                        if (this.looksLikeExcelDate(cellValue)) {
                            const date = this.excelSerialToDate(cellValue);
                            return date ? this._formatDateForDisplay(date) : cellValue;
                        } 
                        // Caso 2: É uma string ISO (YYYY-MM-DD) da API
                        else if (typeof cellValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cellValue)) {
                            try {
                                const date = new Date(cellValue + 'T00:00:00.000Z'); // Force UTC
                                return this._formatDateForDisplay(date);
                            } catch (e) {
                                console.warn(`[SharePointExcelService] Erro ao converter data ISO: ${cellValue}`);
                                return cellValue;
                            }
                        }
                        // Caso 3: É uma string de data brasileiro (DD/MM/YYYY) - já está formatado
                        else if (typeof cellValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(cellValue)) {
                            return cellValue;
                        }
                        // Caso 4: Valor nulo, vazio ou outros formatos
                        else {
                            return cellValue;
                        }
                    }
                    return cellValue;
                });
            });

            return { ...row, values: processedValues };
        });
    }

    /**
     * Processa e normaliza os dados retornados para facilitar acesso
     * @param {Array} rows - Linhas da tabela
     * @param {Object} tableInfo - Informações da tabela
     * @returns {Array} - Dados normalizados
     */
    static normalizeTableData(rows, tableInfo) {
        const columns = (tableInfo.columns || []).map(c => c.name);
        
        return rows.map((row, rowIndex) => {
            const rowData = {};
            const values = row.values && row.values[0] ? row.values[0] : [];
            
            columns.forEach((colName, colIdx) => {
                const value = values[colIdx];
                rowData[colName] = value;
                
                // Log apenas para ZILDA nas colunas de data
                if (String(values[0]).toUpperCase().includes('ZILDA')) {
                    const isDateColumn = colName && (
                        colName.toLowerCase().includes('data') ||
                        colName.toLowerCase().includes('inicio') ||
                        colName.toLowerCase().includes('fim') ||
                        colName.toLowerCase().includes('partir') ||
                        colName.toLowerCase().includes('termino') ||
                        colName.toLowerCase().includes('aquisitivo')
                    );
                    
                    if (isDateColumn) {
                        console.log(`[ZILDA-NORMALIZE] Coluna "${colName}":`, {
                            value,
                            type: typeof value
                        });
                    }
                }
            });
            
            return rowData;
        });
    }

    /**
     * Identifica quais colunas contêm datas baseado nos nomes
     * @private
     */
    static _identifyDateColumns(tableInfo) {
        const dateKeywords = [
            'data', 'date', 'inicio', 'fim', 'termino', 'partir',
            'aquisitivo', 'nascimento', 'admissao', 'DN', 'ADMISSÃO', 'emissao'
        ];

        const dateColumns = new Set();

        if (tableInfo && tableInfo.columns && Array.isArray(tableInfo.columns)) {
            tableInfo.columns.forEach((col, idx) => {
                const colName = (col.name || '').toLowerCase();
                const isDateColumn = dateKeywords.some(kw => colName.includes(kw.toLowerCase()));
                if (isDateColumn) {
                    dateColumns.add(idx);
                }
            });
        } else {
            console.warn('[SharePointExcelService] ⚠️ tableInfo.columns vazio - nenhuma coluna de data será identificada');
        }

        return dateColumns;
    }

    /**
     * Formata data para exibição (DD/MM/YYYY)
     * @private
     */
    static _formatDateForDisplay(date) {
        if (!(date instanceof Date) || isNaN(date)) return null;

        // Usar UTC para evitar problemas de timezone
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();

        return `${day}/${month}/${year}`;
    }

    /**
     * Converte objeto de licença para array de valores na ordem das colunas da tabela
     * @param {Object} licenseObject - Objeto com dados da licença
     * @param {Object} tableInfo - Informações da tabela com colunas
     * @returns {Array} - Array de valores na ordem das colunas
     */
    static convertLicenseObjectToArray(licenseObject, tableInfo) {
        if (!tableInfo || !tableInfo.columns || !Array.isArray(tableInfo.columns)) {
            throw new Error('tableInfo com colunas é obrigatório para converter objeto em array');
        }

        console.log('[SharePointExcelService] Convertendo objeto para array:', {
            licenseObject,
            columns: tableInfo.columns.map(c => c.name)
        });

        const valuesArray = tableInfo.columns.map(col => {
            const colName = col.name;
            let value = licenseObject[colName];

            // Se valor é undefined ou null, usar string vazia
            if (value === undefined || value === null) {
                return '';
            }

            // Converter números para número (não string)
            if (typeof value === 'number') {
                return value;
            }

            // Garantir que datas estão em formato string
            if (value instanceof Date) {
                return value.toISOString().split('T')[0]; // YYYY-MM-DD
            }

            return String(value);
        });

        console.log('[SharePointExcelService] Array de valores:', valuesArray);
        return valuesArray;
    }

    /**
     * Adiciona nova linha (valores como array na ordem das colunas)
     * rowValuesArray: ['val1','val2', ...]
     */
    static async addTableRow(fileId, tableName, rowValuesArray) {
        // Checar permissão de escrita (melhor esforço via Graph)
        try {
            const canWrite = await this.userHasWritePermission(fileId);
            if (!canWrite) {
                if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                    await this.AuditService.logAction('FORBIDDEN_CREATE', { fileId, tableName, values: rowValuesArray });
                }
                throw new Error('Usuário não possui permissão de escrita para este arquivo');
            }
        } catch (err) {
            // Se ocorrer erro na checagem, registrar e continuar para deixar Graph retornar o erro final
            console.warn('Permissão write check failed:', err && err.message);
        }

        const path = `/me/drive/items/${fileId}/workbook/tables/${encodeURIComponent(tableName)}/rows/add`;
        const body = { values: [rowValuesArray] };
        try {
            const res = await this._graphFetch(path, { method: 'POST', body: JSON.stringify(body) }, ['Files.ReadWrite']);
            if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                await this.AuditService.logAction('CREATE', { fileId, tableName, values: rowValuesArray });
            }
            return res;
        } catch (err) {
            // Tratar erro 403 especificamente
            if (err.status === 403) {
                if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                    await this.AuditService.logAction('FORBIDDEN_CREATE', { fileId, tableName, values: rowValuesArray, error: err.message });
                }
                
                // Mensagem específica para arquivo .xls
                const errorMsg = err.message || '';
                if (errorMsg.includes('Could not obtain a WAC access token') || errorMsg.includes('AccessDenied')) {
                    throw new Error('ERRO: O arquivo está no formato .XLS (antigo). A API do SharePoint só permite escrita em arquivos .XLSX (novo formato). Por favor, converta o arquivo para .XLSX no Excel e tente novamente.');
                }
            }
            
            // Tratar erro 404 especificamente - tabela não encontrada
            if (err.message && (err.message.includes('404') || err.message.includes('ItemNotFound'))) {
                console.error('[SharePointExcelService] Tabela não encontrada:', { fileId, tableName });
                throw new Error(`ERRO 404: A tabela '${tableName}' não foi encontrada no arquivo Excel.\n\nPossíveis causas:\n1. A tabela não foi criada (Selecione os dados → Inserir → Tabela)\n2. O nome da tabela está incorreto (Clique na tabela → Design → verifique o Nome da Tabela)\n3. O arquivo não foi salvo após criar a tabela\n4. O arquivo precisa ser fechado e reaberto no SharePoint\n\nVerifique e tente novamente.`);
            }
            
            throw err;
        }
    }

    /**
     * Atualiza uma linha existente identificada por índice (0-based).
     * updates pode ser um array completo com todos os valores na ordem das colunas,
     * ou um objeto { columnName: value, ... } que será mesclado com os valores atuais.
     * Se fornecer etag, será enviado header If-Match para controle otimista.
     */
    static async updateTableRow(fileId, tableName, rowIndex, updates, etag = null) {
        // Obter colunas e linha atual
        const tableInfo = await this.getTableInfo(fileId, tableName);
        const columns = (tableInfo.columns || []).map(c => c.name);

        const rows = await this.getTableRows(fileId, tableName, tableInfo);
        const row = rows[rowIndex];
        if (!row) throw new Error('Row not found at index ' + rowIndex);

        // obter valores atuais (pode ser array dentro de values)
        const currentValues = Array.isArray(row.values) && row.values.length > 0 ? row.values[0] : [];

        let newValues;
        if (Array.isArray(updates)) {
            newValues = updates.slice(0, columns.length);
        } else {
            // merge object updates into currentValues based on column names
            newValues = currentValues.slice();
            Object.keys(updates).forEach(key => {
                const idx = columns.indexOf(key);
                if (idx >= 0) newValues[idx] = updates[key];
            });
        }

        // Tentar usar PATCH no itemAt endpoint (se suportado) com If-Match opcional
        const patchPath = `/me/drive/items/${fileId}/workbook/tables/${encodeURIComponent(tableName)}/rows/itemAt(index=${rowIndex})`;

        const headers = {};
        if (etag) headers['If-Match'] = etag;

        // Alguns tenants não suportam patch direto; usar range update fallback
        try {
            // Checar permissão antes de atualizar
            try {
                const canWrite = await this.userHasWritePermission(fileId);
                if (!canWrite) {
                    if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                        await this.AuditService.logAction('FORBIDDEN_UPDATE', { fileId, tableName, rowIndex, updates });
                    }
                    throw new Error('Usuário não possui permissão de escrita para este arquivo');
                }
            } catch (permErr) {
                console.warn('Permissão write check failed:', permErr && permErr.message);
            }

            const res = await this._graphFetch(patchPath, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ values: [newValues] })
            }, ['Files.ReadWrite']);
            if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                await this.AuditService.logAction('UPDATE', { fileId, tableName, rowIndex, updates: newValues });
            }
            return res;
        } catch (err) {
            // Fallback: atualizar via worksheet range
            try {
                const address = tableInfo.address; // ex: "Sheet1!A2:D10"
                let sheetName = 'Sheet1';
                let startRow = 0;
                let startCol = 'A';
                if (address && address.indexOf('!') >= 0) {
                    const parts = address.split('!');
                    sheetName = parts[0].replace(/'/g, '');
                    const range = parts[1];
                    const startCell = range.split(':')[0];
                    // extrair número da linha
                    const match = startCell.match(/(\d+)$/);
                    startRow = match ? parseInt(match[1], 10) : 0;
                    // extrair coluna letra
                    const colMatch = startCell.match(/^[A-Z]+/i);
                    startCol = colMatch ? colMatch[0].toUpperCase() : 'A';
                }

                const targetRowNumber = startRow + rowIndex; // aproximação

                // calcula última coluna letra com base no número de colunas
                const endColLetter = this._colLetterFromIndex(columns.length - 1);
                const rangeAddress = `${startCol}${targetRowNumber}:${endColLetter}${targetRowNumber}`;

                const rangePath = `/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetName)}/range(address='${rangeAddress}')`;

                try {
                    const res2 = await this._graphFetch(rangePath, {
                        method: 'PATCH',
                        body: JSON.stringify({ values: [newValues] }),
                        headers
                    }, ['Files.ReadWrite']);
                    if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                        await this.AuditService.logAction('UPDATE', { fileId, tableName, rowIndex, updates: newValues, fallback: true });
                    }
                    return res2;
                } catch (errRange) {
                    if (errRange.status === 403) {
                        if (this.AuditService && typeof this.AuditService.logAction === 'function') {
                            await this.AuditService.logAction('FORBIDDEN_UPDATE', { fileId, tableName, rowIndex, updates: newValues, error: errRange.message });
                        }
                    }
                    throw errRange;
                }

            } catch (err2) {
                throw err; // rethrow original
            }
        }
    }

    /**
     * Verifica (melhor esforço) se o usuário atual possui permissão de escrita no arquivo
     * Retorna true se encontrar uma permissão direta ao usuário com role 'write' ou 'owner'
     */
    static async userHasWritePermission(fileId) {
        try {
            // obter perfil do usuário
            const me = await this._graphFetch('/me', { method: 'GET' }, ['User.Read']);

            // obter permissões do item
            const perms = await this._graphFetch(`/me/drive/items/${fileId}/permissions`, { method: 'GET' }, ['Files.Read']);
            const entries = perms.value || [];

            const userEmail = (me.userPrincipalName || me.mail || '').toLowerCase();
            const userId = me.id;

            for (const p of entries) {
                const roles = p.roles || [];
                const hasWriteRole = roles.some(r => r.toLowerCase() === 'write' || r.toLowerCase() === 'owner');
                if (!hasWriteRole) continue;

                if (p.grantedTo && p.grantedTo.user) {
                    const gu = p.grantedTo.user;
                    if ((gu.email && gu.email.toLowerCase() === userEmail) || (gu.id && gu.id === userId)) return true;
                }

                if (Array.isArray(p.grantedToIdentities)) {
                    for (const id of p.grantedToIdentities) {
                        if (id.user && ((id.user.email && id.user.email.toLowerCase() === userEmail) || (id.user.id && id.user.id === userId))) return true;
                        // groups and siteGroups are not fully resolved here (would require extra scopes)
                    }
                }
            }

            return false;
        } catch (error) {
            const msg = (error && (error.code || error.errorMessage || error.message)) || String(error);
            const now = Date.now();
            const isInteractiveErr = msg && (msg.indexOf('popup_blocked') >= 0 || msg.indexOf('interaction_in_progress') >= 0 || msg.indexOf('consent') >= 0 || msg.indexOf('InteractionRequired') >= 0);
            // Log apenas uma vez por minuto para mensagens interativas (popups/consent)
            if (isInteractiveErr) {
                if (now - (this.lastAuthInteractiveErrorTs || 0) > 60 * 1000) {
                    console.warn('userHasWritePermission interactive error (suppressed after first):', msg);
                    this.lastAuthInteractiveErrorTs = now;
                }
            } else {
                console.warn('userHasWritePermission error:', msg);
            }

            // Em caso de erro, retornar false para ser conservador
            return false;
        }
    }

    /**
     * Filtra linhas localmente por pares chave/valor
     */
    static async filterTableRows(fileId, tableName, filterObj) {
        const tableInfo = await this.getTableInfo(fileId, tableName);
        const rows = await this.getTableRows(fileId, tableName, tableInfo);
        const columns = (tableInfo.columns || []).map(c => c.name);

        return rows.filter(row => {
            const values = Array.isArray(row.values) && row.values.length > 0 ? row.values[0] : [];
            const obj = {};
            columns.forEach((col, i) => obj[col] = values[i]);

            return Object.keys(filterObj).every(k => {
                const expected = ('' + filterObj[k]).trim();
                const actual = ('' + (obj[k] ?? '')).trim();
                return actual === expected;
            });
        });
    }

    static _colLetterFromIndex(index) {
        // 0 -> A, 25 -> Z, 26 -> AA
        let s = '';
        let n = index + 1;
        while (n > 0) {
            const rem = (n - 1) % 26;
            s = String.fromCharCode(65 + rem) + s;
            n = Math.floor((n - 1) / 26);
        }
        return s;
    }

    /**
     * Fallback: faz download do arquivo e parse local via `XLSX` (xlsx.full.min.js)
     * Retorna { tableInfo, rows } compatíveis com os métodos getTableInfo/getTableRows
     */
    static async downloadAndParseWorkbook(fileId, sheetName) {
        if (typeof AuthenticationService === 'undefined') throw new Error('AuthenticationService não disponível');
        if (typeof XLSX === 'undefined') throw new Error('XLSX library não disponível');

        const token = await AuthenticationService.acquireToken(['Files.Read']);
        const resp = await fetch(`${this.GRAPH_BASE}/me/drive/items/${fileId}/content`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            const err = new Error(`Download failed: ${resp.status} ${resp.statusText} ${text}`);
            err.status = resp.status;
            throw err;
        }

        const arrayBuffer = await resp.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        let workbook;
        try {
            // IMPORTANTE: raw: true mantém valores brutos do Excel (números seriais para datas)
            // sem isso, XLSX converte datas automaticamente causando problemas de timezone
            workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: true });
        } catch (e) {
            throw new Error('Failed to parse workbook via XLSX: ' + (e && e.message));
        }

        const sheetNames = workbook.SheetNames || [];
        const targetSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : (sheetNames[0] || null);
        if (!targetSheetName) throw new Error('No sheets found in workbook');

        const sheet = workbook.Sheets[targetSheetName];
        // IMPORTANTE: raw: true mantém números seriais do Excel para datas
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, raw: true });

        if (!raw || raw.length === 0) {
            return { tableInfo: { columns: [] }, rows: [] };
        }

        const headers = raw[0].map(h => h == null ? '' : String(h));

        const tableInfo = {
            columns: headers.map(n => ({ name: n })),
            address: `${targetSheetName}!A1:${this._colLetterFromIndex(headers.length - 1)}${raw.length}`
        };

        // Identificar colunas de data
        const dateColumns = this._identifyDateColumns(tableInfo);

        // Processar linhas e converter datas seriais do Excel
        const rows = raw.slice(1).map(r => {
            const vals = headers.map((_, i) => {
                const cellValue = (r && r[i] !== undefined) ? r[i] : null;

                // Converter datas seriais do Excel
                if (dateColumns.has(i) && this.looksLikeExcelDate(cellValue)) {
                    const date = this.excelSerialToDate(cellValue);
                    return date ? this._formatDateForDisplay(date) : cellValue;
                }

                return cellValue;
            });
            return { values: [vals] };
        });

        return { tableInfo, rows };
    }

    /**
     * Obtém metadados básicos do arquivo (id, name, size, lastModified)
     * Não retorna urls públicos para evitar exposição
     */
    static async getFileMetadata(fileId) {
        try {
            const path = `/me/drive/items/${fileId}`;
            const json = await this._graphFetch(path, { method: 'GET' }, ['Files.Read']);
            return {
                id: json.id,
                name: json.name,
                size: json.size,
                lastModifiedDateTime: json.lastModifiedDateTime,
                createdDateTime: json.createdDateTime
            };
        } catch (error) {
            console.warn('getFileMetadata error:', error && error.message);
            throw error;
        }
    }

    /**
     * Resolve siteId/fileId/tableName from environment config (window.__ENV__)
     * Expected keys in window.__ENV__:
     *  - AZURE_SITE_HOSTNAME (e.g. contoso.sharepoint.com)
     *  - AZURE_SITE_PATH (e.g. /sites/HR or sites/HR)
     *  - AZURE_FILE_RELATIVE_PATH (e.g. Shared Documents/Apps/Licencas/licencas.xlsx)
     *  - AZURE_TABLE_NAME (optional)
     */
    static async resolveFileFromEnv() {
        if (typeof window === 'undefined' || !window.__ENV__) {
            throw new Error('Environment config not available for SharePoint resolution');
        }

        const cfg = window.__ENV__;
        const hostname = cfg.AZURE_SITE_HOSTNAME;
        let sitePath = cfg.AZURE_SITE_PATH;
        const relativePath = cfg.AZURE_FILE_RELATIVE_PATH;
        const tableName = cfg.AZURE_TABLE_NAME || cfg.DEFAULT_TABLE_NAME;

        if (!hostname || !sitePath || !relativePath) {
            throw new Error('Missing AZURE_SITE_HOSTNAME/AZURE_SITE_PATH/AZURE_FILE_RELATIVE_PATH in env');
        }

        // Normalize sitePath: remove leading slash if present
        if (sitePath.startsWith('/')) sitePath = sitePath.slice(1);

        // Try multiple resolution strategies because files can live in team sites, site collections or user's OneDrive
        const rel = relativePath.split('/').map(encodeURIComponent).join('/');

        // Strategy A: resolve as site path -> drive root
        try {
            const sitePathEncoded = encodeURIComponent(sitePath);
            const siteEndpoint = `/sites/${hostname}:/${sitePathEncoded}`;
            const siteJson = await this._graphFetch(siteEndpoint, { method: 'GET' }, ['Files.Read']);
            const siteId = siteJson && siteJson.id;
            if (siteId) {
                const itemEndpoint = `/sites/${siteId}/drive/root:/${rel}`;
                const itemJson = await this._graphFetch(itemEndpoint, { method: 'GET' }, ['Files.Read']);
                const fileId = itemJson && itemJson.id;
                if (fileId) return { siteId, fileId, tableName };
            }
        } catch (e) {
            // Estratégia A falhou, tentar próxima (debug apenas - não é erro)
            console.debug('📍 Strategy A (site path) - not found, trying next...');
        }

        // Strategy B: user's personal drive (OneDrive for Business) via /me/drive
        try {
            const itemEndpoint = `/me/drive/root:/${rel}`;
            const itemJson = await this._graphFetch(itemEndpoint, { method: 'GET' }, ['Files.Read']);
            const fileId = itemJson && itemJson.id;
            if (fileId) {
                console.log('✅ Arquivo encontrado via Strategy B (OneDrive pessoal)');
                return { siteId: null, fileId, tableName };
            }
        } catch (e) {
            console.debug('📍 Strategy B (user drive) - not found, trying next...');
        }

        // Strategy C: attempt to treat sitePath as a site-id directly
        try {
            const itemEndpoint = `/sites/${sitePath}/drive/root:/${rel}`;
            const itemJson = await this._graphFetch(itemEndpoint, { method: 'GET' }, ['Files.Read']);
            const fileId = itemJson && itemJson.id;
            if (fileId) {
                console.log('✅ Arquivo encontrado via Strategy C (site ID direto)');
                return { siteId: sitePath, fileId, tableName };
            }
        } catch (e) {
            console.debug('📍 Strategy C (direct site-id) - not found, trying next...');
        }

        // Strategy D: attempt search by file name in user's drive (useful for personal OneDrive or when path differs)
        try {
            const decodedName = decodeURIComponent(relativePath.split('/').pop());
            if (decodedName) {
                const searchPath = `/me/drive/root/search(q='${encodeURIComponent(decodedName)}')`;
                const searchJson = await this._graphFetch(searchPath, { method: 'GET' }, ['Files.Read']);
                const items = (searchJson && searchJson.value) || [];
                if (items.length > 0) {
                    // prefer exact name match
                    const exact = items.find(i => i.name && i.name.toLowerCase() === decodedName.toLowerCase());
                    const chosen = exact || items[0];
                    console.log('✅ Arquivo encontrado via Strategy D (busca por nome)');
                    return { siteId: null, fileId: chosen.id, tableName };
                }
            }
        } catch (e) {
            console.debug('📍 Strategy D (search) - not found');
        }

        // Strategy E: buscar na pasta "Licenca Premio" (novo local do arquivo)
        try {
            const decodedName = decodeURIComponent(relativePath.split('/').pop());
            const licencaPremioPath = `/me/drive/root:/Documents/Licenca Premio/${decodedName}`;
            const itemJson = await this._graphFetch(licencaPremioPath, { method: 'GET' }, ['Files.Read']);
            const fileId = itemJson && itemJson.id;
            if (fileId) {
                console.log('✅ Arquivo encontrado via Strategy E (pasta Licenca Premio)');
                return { siteId: null, fileId, tableName };
            }
        } catch (e) {
            console.debug('📍 Strategy E (Licenca Premio folder) - not found');
        }

        throw new Error('Could not resolve fileId from env config via any known strategy');
    }
}

if (typeof window !== 'undefined') window.SharePointExcelService = SharePointExcelService;

// Export para Node.js se disponível (evita ReferenceError no browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharePointExcelService;
}
