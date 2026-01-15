/**
 * SharePointNFGenerator - Gerador de Notificação de Férias em PDF
 * 
 * Este serviço:
 * 1. Insere o número do processo na célula E9 da aba de NF
 * 2. As fórmulas da planilha preenchem automaticamente os outros dados
 * 3. Exporta a aba como PDF usando Microsoft Graph API
 */

class SharePointNFGenerator {
    constructor(authService) {
        this.authService = authService;
        this.graphBase = 'https://graph.microsoft.com/v1.0';
    }

    /**
     * Prepara a NF (atualiza TODAS as células necessárias diretamente) - ETAPA 1
     * @param {string} dataFileId - ID do arquivo Excel de dados (não usado, mantido por compatibilidade)
     * @param {Object} licenseData - Dados da licença
     * @returns {Promise<Object>} Dados preparados { nfFileId, nfSheetName, nomeServidor }
     */
    async prepareNF(dataFileId, licenseData) {
        try {
            // 1. Buscar arquivo NF - Modelo.xlsx
            const nfFileId = await this._findNFFile();

            // 2. Descobrir nome da aba de NF (deve ser MODELO)
            const nfSheetName = await this._findNFSheet(nfFileId);

            // 3. Atualizar TODAS as células necessárias de uma vez (batch update)
            await this._updateAllCells(nfFileId, nfSheetName, licenseData);

            // Retornar dados preparados para uso posterior
            const nomeServidor = licenseData.NOME || licenseData.nome || 'SERVIDOR';
            return {
                nfFileId,
                nfSheetName,
                nomeServidor,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('[NFGenerator] Erro ao preparar NF:', error.message);
            throw error;
        }
    }

    /**
     * Atualiza todas as células necessárias do MODELO de uma vez
     * @private
     */
    async _updateAllCells(fileId, sheetName, data) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);

        // Mapear dados para células (normalizar nomes de campos)
        const getValue = (field) => {
            const value = data[field] || data[field.toLowerCase()] || data[field.toUpperCase()] || '';
            return value;
        };

        // Preparar updates individuais para cada célula
        const updates = [
            { address: 'E9', value: getValue('NUMERO') },
            { address: 'E16', value: getValue('LOTACAO') || getValue('lotacao') },
            { address: 'C18', value: getValue('NOME') || getValue('nome') },
            { address: 'C20', value: getValue('CARGO') || getValue('cargo') },
            { address: 'C22', value: getValue('CPF') || getValue('cpf') },
            { address: 'E20', value: getValue('REF') || getValue('ref') },
            { address: 'E22', value: getValue('RG') || getValue('rg') },
            { address: 'E32', value: getValue('GOZO') || getValue('gozo') },
            { address: 'D34', value: getValue('AQUISITIVO_INICIO') || getValue('aquisitivo_inicio') },
            { address: 'F34', value: getValue('AQUISITIVO_FIM') || getValue('aquisitivo_fim') },
            { address: 'C36', value: getValue('INICIO_LICENCA') || getValue('inicio_licenca') || getValue('A_PARTIR') || getValue('a_partir') },
            { address: 'B38', value: getValue('TERMINO') || getValue('termino') || getValue('FIM_LICENCA') || getValue('fim_licenca') || getValue('ATE') || getValue('ate') },
            { address: 'E38', value: getValue('RESTANDO') || getValue('restando') }
        ];

        // Criar sessão de workbook para batch update
        const sessionResponse = await fetch(
            `${this.graphBase}/me/drive/items/${fileId}/workbook/createSession`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ persistChanges: true })
            }
        );

        if (!sessionResponse.ok) {
            throw new Error('Erro ao criar sessão de workbook');
        }

        const session = await sessionResponse.json();
        const sessionId = session.id;

        try {
            // Atualizar cada célula
            for (const update of updates) {
                if (!update.value && update.value !== 0) continue;

                await fetch(
                    `${this.graphBase}/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetName)}/range(address='${update.address}')`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'workbook-session-id': sessionId
                        },
                        body: JSON.stringify({
                            values: [[update.value]]
                        })
                    }
                );
            }

        } finally {
            // Fechar sessão
            await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/workbook/closeSession`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'workbook-session-id': sessionId
                    }
                }
            );
        }
    }

    /**
     * Exporta a NF preparada como PDF - ETAPA 2 (rápida!)
     * @param {Object} preparedData - Dados da preparação { nfFileId, nfSheetName, nomeServidor }
     * @returns {Promise<Object>} { pdfBlob, nomeServidor }
     */
    async exportPreparedNF(preparedData) {
        try {
            const { nfFileId, nomeServidor } = preparedData;
            const pdfBlob = await this._exportSheetAsPDF(nfFileId);
            return { pdfBlob, nomeServidor };
        } catch (error) {
            console.error('[NFGenerator] Erro ao exportar NF:', error.message);
            throw error;
        }
    }

    /**
     * Gera PDF da Notificação de Férias (método completo - compatibilidade)
     * @param {string} dataFileId - ID do arquivo Excel de dados (não usado, mantido por compatibilidade)
     * @param {Object} licenseData - Dados da licença
     * @returns {Promise<Blob>} PDF gerado
     */
    async generateNFPDF(dataFileId, licenseData) {
        try {
            NotificationService.show('Gerando NF...', 'info', { duration: 3000 });

            const preparedData = await this.prepareNF(dataFileId, licenseData);
            const result = await this.exportPreparedNF(preparedData);

            NotificationService.show('PDF gerado com sucesso!', 'success', { duration: 3000 });
            return result;

        } catch (error) {
            console.error('[NFGenerator] Erro:', error.message);
            NotificationService.show(`Erro ao gerar NF: ${error.message}`, 'error', { duration: 5000 });
            throw error;
        }
    }

    /**
     * Busca o arquivo "NF - Modelo.xlsx" no OneDrive/SharePoint
     * @private
     * @returns {Promise<string>} ID do arquivo
     */
    async _findNFFile() {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        
        const response = await fetch(
            `${this.graphBase}/me/drive/root/search(q='NF - Modelo')`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao buscar arquivo NF - Modelo: ${response.status}`);
        }
        
        const data = await response.json();
        const files = data.value || [];
        
        if (files.length === 0) {
            throw new Error('Arquivo "NF - Modelo.xlsx" não encontrado no OneDrive/SharePoint');
        }
        
        // Pegar o primeiro resultado (mais relevante)
        return files[0].id;
    }

    /**
     * Encontra a aba de NF na planilha
     * @private
     */
    async _findNFSheet(fileId) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);

        const response = await fetch(
            `${this.graphBase}/me/drive/items/${fileId}/workbook/worksheets`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Erro ao buscar abas: ${response.status}`);
        }

        const data = await response.json();
        const worksheets = data.value || [];

        // Procurar aba que contenha "NF" ou "MODELO" no nome
        const nfSheet = worksheets.find(ws =>
            ws.name.toLowerCase().includes('nf') ||
            ws.name.toLowerCase().includes('notificação') ||
            ws.name.toLowerCase().includes('notificacao') ||
            ws.name.toLowerCase().includes('modelo')
        );

        if (!nfSheet) {
            throw new Error('Aba de NF não encontrada. Crie uma aba com nome contendo "NF" ou "MODELO"');
        }

        return nfSheet.name;
    }

    /**
     * Atualiza uma célula específica
     * @private
     */
    async _updateCell(fileId, sheetName, cellAddress, value) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        
        const response = await fetch(
            `${this.graphBase}/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetName)}/range(address='${cellAddress}')`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[value]]
                })
            }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao atualizar célula ${cellAddress}: ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * Lê valor de uma célula específica
     * @private
     */
    async _readCell(fileId, sheetName, cellAddress) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        
        const response = await fetch(
            `${this.graphBase}/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetName)}/range(address='${cellAddress}')`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao ler célula ${cellAddress}: ${response.status}`);
        }
        
        const data = await response.json();
        return data.values?.[0]?.[0] || null;
    }

    /**
     * Força recálculo de todas as fórmulas da planilha
     * @private
     */
    async _forceRecalculate(fileId) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        
        try {
            // Criar uma sessão de workbook para garantir que as mudanças sejam aplicadas
            const sessionResponse = await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/workbook/createSession`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        persistChanges: true
                    })
                }
            );

            if (!sessionResponse.ok) {
                console.warn('[NFGenerator] ⚠️ Não foi possível criar sessão para recálculo');
                return;
            }

            const session = await sessionResponse.json();
            const sessionId = session.id;

            // Forçar recálculo via application/calculate
            const calcResponse = await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/workbook/application/calculate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'workbook-session-id': sessionId
                    },
                    body: JSON.stringify({
                        calculationType: 'Full'
                    })
                }
            );

            // Fechar sessão
            await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/workbook/closeSession`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'workbook-session-id': sessionId
                    }
                }
            );

            if (calcResponse.ok) {
                console.log('[NFGenerator] ✅ Recálculo forçado com sucesso');
            } else {
                console.warn('[NFGenerator] ⚠️ Recálculo pode não ter funcionado');
            }

        } catch (error) {
            console.warn('[NFGenerator] ⚠️ Erro ao forçar recálculo:', error);
            // Não lançar erro - o recálculo é best effort
        }
    }

    /**
     * Aguarda e verifica se as fórmulas foram atualizadas corretamente
     * @private
     * @returns {Promise<boolean>} true se verificado com sucesso
     */
    async _waitAndVerifyFormulas(fileId, sheetName, licenseData) {
        const maxRetries = 4; // Reduzido para 4 tentativas
        const delays = [500, 1500, 3000, 5000]; // Delays progressivos: 0.5s, 1.5s, 3s, 5s
        
        // Preparar valores esperados (normalizar para comparação)
        const nomeEsperado = (licenseData.NOME || licenseData.nome || '').trim().toUpperCase();
        const aquisitivoInicioEsperado = this._normalizeDate(licenseData.AQUISITIVO_INICIO || licenseData.aquisitivo_inicio);
        const inicioLicencaEsperado = this._normalizeDate(licenseData.A_PARTIR || licenseData.a_partir);
        
        // Também converter para serial do Excel para comparação
        const aquisitivoSerial = this._dateToExcelSerial(licenseData.AQUISITIVO_INICIO || licenseData.aquisitivo_inicio);
        const inicioSerial = this._dateToExcelSerial(licenseData.A_PARTIR || licenseData.a_partir);
        
        console.log('[NFGenerator] 🔍 Valores esperados:');
        console.log('  - Nome (C18):', nomeEsperado);
        console.log('  - Aquisitivo Início (D34):', aquisitivoInicioEsperado, `(serial: ${aquisitivoSerial})`);
        console.log('  - Início Licença (B38):', inicioLicencaEsperado, `(serial: ${inicioSerial})`);
        
        // Criar sessão de workbook para leituras consistentes
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        let sessionId = null;
        
        try {
            const sessionResponse = await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/workbook/createSession`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ persistChanges: false })
                }
            );
            
            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                sessionId = session.id;
                console.log('[NFGenerator] ✅ Sessão de leitura criada:', sessionId);
            }
        } catch (e) {
            console.warn('[NFGenerator] ⚠️ Não foi possível criar sessão');
        }
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                // Aguardar antes de verificar (delay progressivo)
                await new Promise(resolve => setTimeout(resolve, delays[i]));
                
                console.log(`[NFGenerator] 🔄 Tentativa ${i + 1}/${maxRetries}...`);
                
                // Ler células com sessão (se disponível)
                const nomeCell = await this._readCellWithSession(fileId, sheetName, 'C18', sessionId);
                const aquisitivoInicioCell = await this._readCellWithSession(fileId, sheetName, 'D34', sessionId);
                const inicioLicencaCell = await this._readCellWithSession(fileId, sheetName, 'B38', sessionId);
                
                console.log('[NFGenerator] 📖 Valores lidos:');
                console.log('  - Nome (C18):', nomeCell);
                console.log('  - Aquisitivo Início (D34):', aquisitivoInicioCell);
                console.log('  - Início Licença (B38):', inicioLicencaCell);
                
                // Ignorar #N/A - ainda está calculando
                if (nomeCell === '#N/A' || aquisitivoInicioCell === '#N/A' || inicioLicencaCell === '#N/A') {
                    console.log('[NFGenerator] ⏳ Células ainda com #N/A, aguardando...');
                    continue;
                }
                
                // Normalizar valores lidos
                const nomeLido = (nomeCell || '').toString().trim().toUpperCase();
                const aquisitivoInicioLido = this._normalizeDate(aquisitivoInicioCell);
                const inicioLicencaLido = this._normalizeDate(inicioLicencaCell);
                
                // Verificar se bateu
                const nomeMatch = nomeLido.includes(nomeEsperado) || nomeEsperado.includes(nomeLido);
                
                // Para datas: aceitar tanto formato DD/MM/YYYY quanto serial do Excel
                const aquisitivoMatch = aquisitivoInicioLido === aquisitivoInicioEsperado || 
                                       (typeof aquisitivoInicioCell === 'number' && Math.abs(aquisitivoInicioCell - aquisitivoSerial) <= 1);
                
                const inicioMatch = inicioLicencaLido === inicioLicencaEsperado || 
                                   (typeof inicioLicencaCell === 'number' && Math.abs(inicioLicencaCell - inicioSerial) <= 1);
                
                const matchCount = [nomeMatch, aquisitivoMatch, inicioMatch].filter(Boolean).length;
                
                console.log('[NFGenerator] ✓ Verificações:');
                console.log(`  - Nome: ${nomeMatch ? '✅' : '❌'}`);
                console.log(`  - Aquisitivo Início: ${aquisitivoMatch ? '✅' : '❌'}`);
                console.log(`  - Início Licença: ${inicioMatch ? '✅' : '❌'}`);
                console.log(`  - Total: ${matchCount}/3`);
                
                if (matchCount >= 2) {
                    console.log('[NFGenerator] ✅ Verificação bem-sucedida!');
                    
                    // Fechar sessão
                    if (sessionId) {
                        try {
                            await fetch(
                                `${this.graphBase}/me/drive/items/${fileId}/workbook/closeSession`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'workbook-session-id': sessionId
                                    }
                                }
                            );
                        } catch (e) {}
                    }
                    
                    return true;
                }
                
                console.log(`[NFGenerator] ⏳ Aguardando mais ${delays[i+1] ? delays[i+1]/1000 : 0}s...`);
                
            } catch (error) {
                console.warn(`[NFGenerator] ⚠️ Erro na tentativa ${i + 1}:`, error);
            }
        }
        
        // Fechar sessão em caso de timeout
        if (sessionId) {
            try {
                await fetch(
                    `${this.graphBase}/me/drive/items/${fileId}/workbook/closeSession`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'workbook-session-id': sessionId
                        }
                    }
                );
            } catch (e) {}
        }
        
        console.error('[NFGenerator] ❌ Timeout: Fórmulas não atualizaram após todas as tentativas');
        return false;
    }

    /**
     * Lê célula com sessão de workbook (para dados frescos)
     * @private
     */
    async _readCellWithSession(fileId, sheetName, cellAddress, sessionId) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        if (sessionId) {
            headers['workbook-session-id'] = sessionId;
        }
        
        const response = await fetch(
            `${this.graphBase}/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetName)}/range(address='${cellAddress}')`,
            { headers }
        );
        
        if (!response.ok) {
            throw new Error(`Erro ao ler célula ${cellAddress}: ${response.status}`);
        }
        
        const data = await response.json();
        return data.values?.[0]?.[0] || null;
    }

    /**
     * Converte data para serial do Excel
     * @private
     */
    _dateToExcelSerial(value) {
        if (!value) return 0;
        
        let date;
        
        // Se for string ISO
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            date = new Date(value);
        }
        // Se for string DD/MM/YYYY
        else if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            const [day, month, year] = value.split('/');
            date = new Date(year, month - 1, day);
        }
        // Se já for Date
        else if (value instanceof Date) {
            date = value;
        }
        else {
            return 0;
        }
        
        // Excel epoch: 30/12/1899
        const excelEpoch = new Date(1899, 11, 30);
        const daysDiff = Math.floor((date - excelEpoch) / (24 * 60 * 60 * 1000));
        return daysDiff;
    }

    /**
     * Normaliza data para formato DD/MM/YYYY (para comparação)
     * @private
     */
    _normalizeDate(value) {
        if (!value) return '';
        
        // Se já for string no formato DD/MM/YYYY
        if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            return value;
        }
        
        // Se for string ISO (YYYY-MM-DD)
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const [year, month, day] = value.split('T')[0].split('-');
            return `${day}/${month}/${year}`;
        }
        
        // Se for número (serial do Excel)
        if (typeof value === 'number') {
            const date = new Date((value - 25569) * 86400 * 1000);
            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        }
        
        // Se for Date object
        if (value instanceof Date) {
            const day = String(value.getDate()).padStart(2, '0');
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const year = value.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        return String(value);
    }

    /**
     * Exporta aba como PDF
     * @private
     */
    async _exportSheetAsPDF(fileId) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);

        // Tentar conversão para PDF via Graph API
        try {
            const response = await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/content?format=pdf`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/pdf'
                    }
                }
            );

            if (response.ok) {
                return await response.blob();
            }

            throw new Error(`Falha na conversão PDF: ${response.status}`);

        } catch (err) {
            throw new Error(
                `Não foi possível converter para PDF. ` +
                `Os dados foram atualizados com sucesso. ` +
                `Por favor, abra o arquivo e use Arquivo → Exportar → PDF.`
            );
        }
    }

    /**
     * Inicia download do PDF no navegador
     * @param {Blob} pdfBlob - Blob do PDF
     * @param {string} fileName - Nome do arquivo
     */
    static downloadPDF(pdfBlob, fileName) {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'NF.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SharePointNFGenerator = SharePointNFGenerator;
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SharePointNFGenerator = SharePointNFGenerator;
}
