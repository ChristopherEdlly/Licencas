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
     * Gera PDF da Notificação de Férias
     * @param {string} fileId - ID do arquivo Excel no SharePoint
     * @param {Object} licenseData - Dados da licença
     * @returns {Promise<Blob>} PDF gerado
     */
    async generateNFPDF(fileId, licenseData) {
        try {
            console.log('[NFGenerator] 📄 Gerando NF para:', licenseData);
            console.log('[NFGenerator] 🔍 Campos disponíveis:', Object.keys(licenseData));
            
            // Buscar número do processo em várias variações de campo
            const numeroProcesso = licenseData.NUMERO || 
                                   licenseData.numero || 
                                   licenseData.Numero ||
                                   licenseData.PROCESSO ||
                                   licenseData.processo ||
                                   licenseData.Processo ||
                                   licenseData.numero_processo ||
                                   licenseData.NUMERO_PROCESSO;
            
            console.log('[NFGenerator] 📋 Número do processo encontrado:', numeroProcesso);
            
            if (!numeroProcesso) {
                console.error('[NFGenerator] ❌ Número não encontrado. Campos disponíveis:', licenseData);
                throw new Error('Número do processo não encontrado. Verifique se a coluna NUMERO existe nos dados.');
            }
            
            // 1. Descobrir nome da aba de NF
            const nfSheetName = await this._findNFSheet(fileId);
            console.log('[NFGenerator] 📋 Usando aba:', nfSheetName);
            
            // 2. Inserir número do processo na célula E9
            console.log('[NFGenerator] ✍️ Inserindo número do processo na E9:', numeroProcesso);
            await this._updateCell(fileId, nfSheetName, 'E9', numeroProcesso);
            
            // 3. Aguardar fórmulas calcularem (3 segundos)
            console.log('[NFGenerator] ⏳ Aguardando fórmulas calcularem...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 4. Exportar como PDF
            console.log('[NFGenerator] 📥 Exportando para PDF...');
            const pdfBlob = await this._exportSheetAsPDF(fileId, nfSheetName);
            
            console.log('[NFGenerator] ✅ PDF gerado com sucesso');
            return pdfBlob;
            
        } catch (error) {
            console.error('[NFGenerator] ❌ Erro ao gerar NF:', error);
            throw error;
        }
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
        
        console.log('[NFGenerator] Abas disponíveis:', worksheets.map(w => w.name));
        
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
     * Exporta aba como PDF
     * @private
     */
    async _exportSheetAsPDF(fileId, sheetName) {
        const token = await this.authService.acquireToken(['Files.ReadWrite']);
        
        console.log('[NFGenerator] 📥 Tentando exportar para PDF...');
        
        // Tentar método 1: Download com formato PDF
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
                console.log('[NFGenerator] ✅ PDF gerado com sucesso via content?format=pdf');
                return await response.blob();
            }
            
            console.warn('[NFGenerator] Método 1 falhou:', response.status, await response.text());
        } catch (err) {
            console.warn('[NFGenerator] Método 1 erro:', err.message);
        }
        
        // Método 2: Tentar via driveItem/content direto
        try {
            console.log('[NFGenerator] Tentando método 2: download direto + conversão client-side');
            
            const downloadResponse = await fetch(
                `${this.graphBase}/me/drive/items/${fileId}/content`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (!downloadResponse.ok) {
                throw new Error(`Falha no download: ${downloadResponse.status}`);
            }
            
            const xlsxBlob = await downloadResponse.blob();
            
            // Por enquanto, retornar erro informativo
            throw new Error(
                `A Microsoft Graph API não conseguiu converter este arquivo para PDF (erro 406). ` +
                `Possíveis causas: formatações complexas no Excel, referências externas, ou limitações do serviço. ` +
                `O número ${sheetName} foi inserido com sucesso na célula E9. ` +
                `Por favor, abra o arquivo manualmente e use Arquivo → Exportar → PDF.`
            );
            
        } catch (err) {
            console.error('[NFGenerator] Todos os métodos falharam:', err);
            throw err;
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
        
        console.log('[NFGenerator] 💾 Download iniciado:', fileName);
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
