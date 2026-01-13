/**
 * SharePointNFGenerator - Gerador de NF usando planilha MODELO do Excel no SharePoint
 *
 * Fluxo simplificado:
 * 1. Usa o arquivo Excel que já está sendo carregado no sistema
 * 2. Atualiza apenas a célula E9 (número do processo) na planilha "MODELO"
 * 3. As fórmulas da planilha atualizam automaticamente os demais campos
 * 4. Converte a planilha "MODELO" para PDF
 * 5. Retorna PDF para download
 */
class SharePointNFGenerator {
    constructor(authManager) {
        this.authManager = authManager;
        this.graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';

        // Nome da planilha/worksheet do modelo
        this.modeloWorksheetName = 'MODELO';
    }

    /**
     * Gera NF a partir da planilha MODELO no arquivo Excel do SharePoint
     * @param {Object} data - Dados do registro de licença
     * @param {string} fileId - ID do arquivo Excel no SharePoint (opcional)
     * @returns {Promise<Object>} - Objeto com tipo e URL ou blob
     */
    async generatePDF(data, fileId = null) {
        try {
            console.log('[SharePointNFGenerator] Iniciando geração de NF...', data);

            // 1. Obter token de acesso
            console.log('[SharePointNFGenerator] 1/4 - Obtendo token de acesso...');
            const token = await this._getAccessToken();
            console.log('[SharePointNFGenerator] ✅ Token obtido com sucesso');

            // 2. Se não tiver fileId, buscar o arquivo atual
            if (!fileId) {
                console.log('[SharePointNFGenerator] 2/4 - Buscando fileId atual...');
                fileId = await this._getCurrentFileId(token);
                console.log('[SharePointNFGenerator] ✅ FileId:', fileId);
            }

            // 3. Atualizar célula E9 com o número do processo
            console.log('[SharePointNFGenerator] 3/4 - Atualizando célula E9...');
            await this._updateProcessNumber(token, fileId, data.NUMERO);
            console.log('[SharePointNFGenerator] ✅ Célula E9 atualizada');

            // 4. Aguardar recalculo das fórmulas (pequeno delay)
            console.log('[SharePointNFGenerator] 4/4 - Aguardando recálculo de fórmulas...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 5. Retornar opções de download
            const downloadOptions = await this._getDownloadOptions(token, fileId);

            console.log('[SharePointNFGenerator] ✅ Opções de download geradas!');
            return downloadOptions;

        } catch (error) {
            console.error('[SharePointNFGenerator] ❌ Erro ao gerar NF:', error);
            console.error('[SharePointNFGenerator] ❌ Stack trace:', error.stack);
            throw new Error(`Falha ao gerar NF: ${error.message}`);
        }
    }

    /**
     * Converte arquivo Excel para PDF usando Microsoft Graph API
     * Baseado em: https://gist.github.com/mbohun/20fbd428cea8550ecd7ab4a5e8d07c72
     */
    async _convertToPDF(token, fileId) {
        console.log('[SharePointNFGenerator] Convertendo Excel para PDF via Graph API...');

        // Endpoint de conversão: GET /me/drive/items/{item-id}/content?format=pdf
        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}/content?format=pdf`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SharePointNFGenerator] Erro na conversão PDF:', errorText);
            throw new Error(`Falha ao converter para PDF: ${response.status} ${response.statusText}`);
        }

        // Retornar PDF como blob
        const pdfBlob = await response.blob();
        console.log('[SharePointNFGenerator] ✅ PDF gerado com sucesso! Tamanho:', pdfBlob.size, 'bytes');

        return pdfBlob;
    }

    /**
     * Gera opções de download para o usuário
     */
    async _getDownloadOptions(token, fileId) {
        try {
            // Tentar converter diretamente para PDF usando Graph API
            const pdfBlob = await this._convertToPDF(token, fileId);

            // Se funcionou, retornar o blob diretamente
            return {
                type: 'pdf-blob',
                blob: pdfBlob
            };

        } catch (pdfError) {
            console.warn('[SharePointNFGenerator] ⚠️ Conversão PDF falhou, oferecendo opções alternativas:', pdfError.message);

            // Fallback: oferecer opções de Excel Online ou download
            const fileMetadata = await this._getFileMetadata(token, fileId);
            const excelOnlineUrl = fileMetadata.webUrl;
            const modeloSheetUrl = `${excelOnlineUrl}?web=1&activeCell='MODELO'!A1`;

            return {
                type: 'sharepoint-options',
                options: {
                    // Opção 1: Abrir no Excel Online (na planilha MODELO)
                    openInExcel: {
                        url: modeloSheetUrl,
                        label: 'Abrir no Excel Online e Exportar PDF'
                    },
                    // Opção 2: Download direto do Excel
                    downloadExcel: {
                        url: `${this.graphApiBaseUrl}/me/drive/items/${fileId}/content`,
                        label: 'Baixar Excel (.xlsx)',
                        fileName: fileMetadata.name,
                        token: token
                    }
                }
            };
        }
    }

    /**
     * Obtém metadados do arquivo
     */
    async _getFileMetadata(token, fileId) {
        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao obter metadados do arquivo');
        }

        return await response.json();
    }

    /**
     * Obtém token de acesso via AuthenticationService
     */
    async _getAccessToken() {
        if (!this.authManager) {
            throw new Error('AuthenticationService não disponível');
        }

        // Usar APENAS Files.ReadWrite (sem Sites.ReadWrite.All)
        const scopes = ['Files.ReadWrite'];

        // AuthenticationService é uma classe estática, então chamamos diretamente
        const accessToken = await this.authManager.acquireToken(scopes);

        return accessToken;
    }

    /**
     * Busca o ID do arquivo Excel atual (último carregado)
     */
    async _getCurrentFileId(token) {
        // Buscar do SharePointExcelService (salvo pelo DataLoader)
        if (typeof SharePointExcelService !== 'undefined' && SharePointExcelService.currentFileId) {
            return SharePointExcelService.currentFileId;
        }

        throw new Error('ID do arquivo não disponível. Por favor, carregue o arquivo do SharePoint primeiro.');
    }

    /**
     * Atualiza a célula E9 da planilha MODELO com o número do processo
     * @param {string} token - Access token
     * @param {string} fileId - ID do arquivo Excel
     * @param {string} numeroProcesso - Número do processo (ex: "041/2026")
     */
    async _updateProcessNumber(token, fileId, numeroProcesso) {
        const cellAddress = 'E9';

        console.log(`[SharePointNFGenerator] Atualizando ${cellAddress} com: ${numeroProcesso}`);

        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}/workbook/worksheets('${this.modeloWorksheetName}')/range(address='${cellAddress}')`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[numeroProcesso || '']]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SharePointNFGenerator] Erro ao atualizar célula:', errorText);
            throw new Error(`Falha ao atualizar célula ${cellAddress}: ${errorText}`);
        }

        console.log('[SharePointNFGenerator] ✅ Célula atualizada com sucesso');
    }

    /**
     * Converte a planilha MODELO para PDF
     * Abordagem: Cria sessão de workbook, lê valores calculados, renderiza para PDF
     *
     * @param {string} token - Access token
     * @param {string} fileId - ID do arquivo Excel
     * @returns {Promise<Blob>} - PDF como blob
     */
    async _convertWorksheetToPDF(token, fileId) {
        console.log('[SharePointNFGenerator] Convertendo para PDF...');

        // 1. Criar sessão persistente do workbook para garantir valores atualizados
        console.log('[SharePointNFGenerator] Criando sessão de workbook...');
        const sessionId = await this._createWorkbookSession(token, fileId);

        try {
            // 2. Ler valores da planilha MODELO (com fórmulas calculadas)
            console.log('[SharePointNFGenerator] Lendo valores calculados da planilha MODELO...');
            const worksheetData = await this._getWorksheetValues(token, fileId, sessionId);

            // 3. Renderizar valores como PDF usando layout similar ao Excel
            console.log('[SharePointNFGenerator] Renderizando PDF a partir dos valores...');
            const pdfBlob = await this._renderWorksheetDataToPDF(worksheetData);

            console.log('[SharePointNFGenerator] ✅ PDF gerado com sucesso!');
            return pdfBlob;

        } finally {
            // 4. Fechar sessão do workbook
            await this._closeWorkbookSession(token, fileId, sessionId);
        }
    }

    /**
     * Cria uma sessão persistente do workbook
     */
    async _createWorkbookSession(token, fileId) {
        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}/workbook/createSession`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                persistChanges: false  // Não persistir mudanças (read-only)
            })
        });

        if (!response.ok) {
            throw new Error('Falha ao criar sessão do workbook');
        }

        const data = await response.json();
        return data.id;
    }

    /**
     * Fecha a sessão do workbook
     */
    async _closeWorkbookSession(token, fileId, sessionId) {
        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}/workbook/closeSession`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'workbook-session-id': sessionId
                }
            });
            console.log('[SharePointNFGenerator] Sessão do workbook fechada');
        } catch (error) {
            console.warn('[SharePointNFGenerator] Erro ao fechar sessão:', error);
        }
    }

    /**
     * Lê os valores da planilha MODELO (incluindo valores calculados de fórmulas)
     */
    async _getWorksheetValues(token, fileId, sessionId) {
        // Ler range usado da planilha MODELO
        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}/workbook/worksheets('${this.modeloWorksheetName}')/usedRange`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'workbook-session-id': sessionId
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao ler valores da planilha MODELO');
        }

        const data = await response.json();
        return {
            values: data.values,
            formulas: data.formulas,
            text: data.text,
            address: data.address,
            rowCount: data.rowCount,
            columnCount: data.columnCount
        };
    }

    /**
     * Renderiza os dados da planilha como PDF
     * Aplica layout específico da NF baseado na estrutura conhecida da planilha MODELO
     */
    async _renderWorksheetDataToPDF(worksheetData) {
        console.log('[SharePointNFGenerator] Valores lidos:', worksheetData.rowCount, 'linhas x', worksheetData.columnCount, 'colunas');

        // Extrair valores de células específicas da planilha MODELO
        const getValue = (row, col) => {
            if (row >= 0 && row < worksheetData.rowCount && col >= 0 && col < worksheetData.columnCount) {
                return worksheetData.values[row][col] || '';
            }
            return '';
        };

        // Estrutura conhecida da planilha MODELO (baseada em NF-MODELO.csv)
        const nfData = {
            // Linha 5 (índice 4): GOVERNO DE SERGIPE
            // Linha 6 (índice 5): SECRETARIA DE ESTADO DA FAZENDA
            // Linha 9 (índice 8): Número do processo (coluna E = índice 4)
            numero: getValue(8, 4),

            // Linha 14 (índice 13): EMISSÃO
            emissao: getValue(13, 1),

            // Linha 16 (índice 15): UNIDADE e LOTAÇÃO
            unidade: getValue(15, 0),
            lotacao: getValue(15, 3),

            // Linha 18 (índice 17): NOME DO SERVIDOR
            nome: getValue(17, 1),

            // Linha 20 (índice 19): CARGO e REF
            cargo: getValue(19, 1),
            ref: getValue(19, 3),

            // Linha 22 (índice 21): CPF e RG
            cpf: getValue(21, 1),
            rg: getValue(21, 3),

            // Linha 32 (índice 31): DIAS DE GOZO
            gozoDias: getValue(31, 4),

            // Linha 34 (índice 33): PERÍODO AQUISITIVO
            aquisitivoInicio: getValue(33, 2),
            aquisitivoFim: getValue(33, 4),

            // Linha 36 (índice 35): A PARTIR DE
            aPartir: getValue(35, 1),

            // Linha 38 (índice 37): TÉRMINO e RESTANDO
            termino: getValue(37, 0),
            restando: getValue(37, 3)
        };

        console.log('[SharePointNFGenerator] Dados extraídos:', nfData);

        // Criar HTML formatado com o layout da NF
        const htmlContent = `
            <div style="width: 210mm; background: white; padding: 40px; font-family: 'Times New Roman', Arial, serif; font-size: 14px; line-height: 1.6;">
                <!-- CABEÇALHO -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-weight: bold; font-size: 16px;">GOVERNO DE SERGIPE</div>
                    <div style="font-weight: bold; font-size: 14px;">SECRETARIA DE ESTADO DA FAZENDA</div>
                </div>

                <!-- NÚMERO (canto superior direito) -->
                <div style="text-align: right; font-weight: bold; font-size: 18px; margin-bottom: 30px;">
                    ${nfData.numero}
                </div>

                <!-- INFORMAÇÕES DO SERVIDOR -->
                <div style="margin-bottom: 25px;">
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold;">EMISSÃO:</span> ${nfData.emissao}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold;">${nfData.unidade}</span>
                        <span style="margin-left: 40px; font-weight: bold;">LOTAÇÃO:</span> ${nfData.lotacao}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold;">NOME DO/A SERVIDOR/A:</span> ${nfData.nome}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold;">CARGO:</span> ${nfData.cargo}
                        <span style="margin-left: 80px; font-weight: bold;">REF:</span> ${nfData.ref}
                    </div>
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: bold;">CPF:</span> ${nfData.cpf}
                        <span style="margin-left: 80px; font-weight: bold;">RG:</span> ${nfData.rg}
                    </div>
                </div>

                <!-- CORPO DO TEXTO -->
                <div style="text-align: justify; margin-top: 30px; line-height: 2;">
                    <p style="margin-bottom: 12px;">
                        NA CONFORMIDADE DO § 3º DO ART.96 DA LEI COMPLEMENTAR Nº 16/94, INFORMAMOS QUE
                    </p>
                    <p style="margin-bottom: 12px;">
                        VOSSA SENHORIA ENTRARÁ EM GOZO DE LICENÇA PRÊMIO POR
                        <span style="font-weight: bold;">${nfData.gozoDias}</span> DIAS
                    </p>
                    <p style="margin-bottom: 12px;">
                        REFERENTE AO PERÍODO AQUISITIVO DE
                        <span style="font-weight: bold;">${nfData.aquisitivoInicio}</span> A
                        <span style="font-weight: bold;">${nfData.aquisitivoFim}</span>
                    </p>
                    <p style="margin-bottom: 12px;">
                        A PARTIR DE <span style="font-weight: bold;">${nfData.aPartir}</span>,
                        RETORNANDO NO PRIMEIRO DIA ÚTIL APÓS
                    </p>
                    <p style="margin-bottom: 12px;">
                        <span style="font-weight: bold;">${nfData.termino}</span>
                        RESTANDO PARA GOZO POSTERIOR
                        <span style="font-weight: bold;">${nfData.restando}</span> DO
                    </p>
                    <p>QUINQUÊNIO ACIMA.</p>
                </div>
            </div>
        `;

        // Criar elemento temporário invisível
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.innerHTML = htmlContent;
        document.body.appendChild(tempContainer);

        try {
            // Renderizar como imagem usando html2canvas
            const canvas = await html2canvas(tempContainer, {
                scale: 2,  // Alta qualidade
                backgroundColor: '#ffffff',
                logging: false,
                width: 794,  // 210mm em pixels (96 DPI)
                windowWidth: 794
            });

            // Converter para data URL
            const imageDataUrl = canvas.toDataURL('image/png');

            // Converter imagem para PDF
            const pdfBlob = await this._convertImageToPDF(imageDataUrl);

            return pdfBlob;

        } finally {
            // Cleanup: remover elemento temporário
            document.body.removeChild(tempContainer);
        }
    }

    /**
     * Baixa o arquivo Excel do SharePoint
     */
    async _downloadExcelFile(token, fileId) {
        const url = `${this.graphApiBaseUrl}/me/drive/items/${fileId}/content`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao baixar arquivo Excel');
        }

        return await response.blob();
    }

    /**
     * Lê arquivo Excel usando SheetJS (XLSX)
     */
    async _readExcelWorkbook(excelBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellStyles: true,  // Preservar estilos
                        cellDates: true    // Preservar datas
                    });
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Falha ao ler arquivo Excel'));
            reader.readAsArrayBuffer(excelBlob);
        });
    }

    /**
     * Renderiza worksheet como imagem usando canvas (invisível)
     */
    async _renderWorksheetAsImage(workbook, sheetName) {
        // Verificar se worksheet existe
        if (!workbook.Sheets[sheetName]) {
            throw new Error(`Worksheet "${sheetName}" não encontrada`);
        }

        const worksheet = workbook.Sheets[sheetName];

        // Converter worksheet para HTML table
        const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
            id: 'nf-temp-table',
            editable: false
        });

        // Criar elemento temporário invisível
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = '210mm';  // A4 width
        tempContainer.style.backgroundColor = 'white';
        tempContainer.innerHTML = htmlTable;
        document.body.appendChild(tempContainer);

        try {
            // Renderizar como imagem usando html2canvas
            const canvas = await html2canvas(tempContainer, {
                scale: 2,  // Alta qualidade
                backgroundColor: '#ffffff',
                logging: false
            });

            // Converter para data URL
            const imageDataUrl = canvas.toDataURL('image/png');

            return imageDataUrl;

        } finally {
            // Cleanup: remover elemento temporário
            document.body.removeChild(tempContainer);
        }
    }

    /**
     * Converte imagem para PDF usando jsPDF
     */
    async _convertImageToPDF(imageDataUrl) {
        const { jsPDF } = window.jspdf;

        // A4: 210mm x 297mm
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Criar imagem para obter dimensões
        const img = new Image();
        img.src = imageDataUrl;

        await new Promise(resolve => {
            img.onload = resolve;
        });

        // Calcular dimensões para caber na página A4
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const imgWidth = pageWidth - 20;  // Margens
        const imgHeight = (img.height * imgWidth) / img.width;

        // Adicionar imagem ao PDF
        doc.addImage(imageDataUrl, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));

        return doc.output('blob');
    }

    /**
     * Gera nome do arquivo PDF
     */
    generateFileName(data) {
        const nomeServidor = (data.NOME || 'servidor')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_');
        const numero = (data.NUMERO || '').replace(/\//g, '-');
        return `NF-${nomeServidor}-${numero}.pdf`;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SharePointNFGenerator = SharePointNFGenerator;
}
