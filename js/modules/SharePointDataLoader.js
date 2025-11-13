/**
 * SharePointDataLoader - Carrega dados de planilhas Excel do SharePoint
 * Usa Microsoft Graph API para acessar arquivos do OneDrive/SharePoint
 */

class SharePointDataLoader {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.authManager = dashboard.authManager;
        this.settingsManager = dashboard.settingsManager;
        
        // Graph API endpoints
        this.graphBaseUrl = 'https://graph.microsoft.com/v1.0';
        
        // Cache de dados
        this.cachedData = null;
        this.lastFetchTime = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Extrai informações da URL do SharePoint
     * Formato: https://[tenant].sharepoint.com/:x:/r/personal/[user]/Documents/[filename].xlsx
     */
    parseSharePointUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('URL do SharePoint inválida');
        }

        try {
            // Extrai o file ID se estiver no formato /Documents/...
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;

            // Tenta extrair informações da URL
            let driveId = null;
            let itemId = null;
            let fileName = null;

            // Formato: /personal/[user]/Documents/[filename]
            const personalMatch = pathname.match(/\/personal\/([^\/]+)\/Documents\/(.+)/);
            if (personalMatch) {
                const userEmail = personalMatch[1].replace(/_/g, '@');
                fileName = decodeURIComponent(personalMatch[2]);
                
                return {
                    userEmail,
                    fileName,
                    originalUrl: url
                };
            }

            // Formato com drive item ID
            const itemMatch = pathname.match(/\/drives\/([^\/]+)\/items\/([^\/]+)/);
            if (itemMatch) {
                driveId = itemMatch[1];
                itemId = itemMatch[2];
                
                return {
                    driveId,
                    itemId,
                    originalUrl: url
                };
            }

            // Se não conseguiu extrair, retorna URL original para tentar buscar por nome
            return {
                fileName: url.split('/').pop(),
                originalUrl: url
            };

        } catch (error) {
            console.error('Erro ao fazer parse da URL do SharePoint:', error);
            throw new Error('Formato de URL do SharePoint não reconhecido');
        }
    }

    /**
     * Busca o arquivo no OneDrive do usuário autenticado
     */
    async findFileInDrive(fileName) {
        const token = await this.authManager.acquireToken(['Files.Read', 'Sites.Read.All']);
        
        // Busca no drive pessoal do usuário
        const searchUrl = `${this.graphBaseUrl}/me/drive/root/search(q='${encodeURIComponent(fileName)}')`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar arquivo: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.value || data.value.length === 0) {
            throw new Error(`Arquivo "${fileName}" não encontrado no OneDrive`);
        }

        // Retorna o primeiro resultado (mais relevante)
        const file = data.value[0];
        
        return {
            driveId: file.parentReference.driveId,
            itemId: file.id,
            name: file.name,
            webUrl: file.webUrl
        };
    }

    /**
     * Busca dados da planilha usando Microsoft Graph API
     */
    async fetchWorkbookData(driveId, itemId) {
        const token = await this.authManager.acquireToken(['Files.Read', 'Sites.Read.All']);
        
        // Endpoint para sessão de workbook
        const sessionUrl = `${this.graphBaseUrl}/drives/${driveId}/items/${itemId}/workbook/createSession`;
        
        // Criar sessão persistente
        const sessionResponse = await fetch(sessionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                persistChanges: false
            })
        });

        if (!sessionResponse.ok) {
            throw new Error(`Erro ao criar sessão do workbook: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        const sessionId = sessionData.id;

        try {
            // Busca todas as planilhas (sheets) do workbook
            const sheetsUrl = `${this.graphBaseUrl}/drives/${driveId}/items/${itemId}/workbook/worksheets`;
            
            const sheetsResponse = await fetch(sheetsUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'workbook-session-id': sessionId
                }
            });

            if (!sheetsResponse.ok) {
                throw new Error(`Erro ao buscar planilhas: ${sheetsResponse.status}`);
            }

            const sheetsData = await sheetsResponse.json();
            
            if (!sheetsData.value || sheetsData.value.length === 0) {
                throw new Error('Nenhuma planilha encontrada no arquivo');
            }

            // Pega a primeira planilha (ou a que estiver visível)
            const sheet = sheetsData.value[0];
            
            // Busca o range usado (área com dados)
            const rangeUrl = `${this.graphBaseUrl}/drives/${driveId}/items/${itemId}/workbook/worksheets/${sheet.id}/usedRange`;
            
            const rangeResponse = await fetch(rangeUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'workbook-session-id': sessionId
                }
            });

            if (!rangeResponse.ok) {
                throw new Error(`Erro ao buscar dados: ${rangeResponse.status}`);
            }

            const rangeData = await rangeResponse.json();
            
            return {
                sheetName: sheet.name,
                values: rangeData.values,
                rowCount: rangeData.rowCount,
                columnCount: rangeData.columnCount
            };

        } finally {
            // Fecha a sessão
            const closeUrl = `${this.graphBaseUrl}/drives/${driveId}/items/${itemId}/workbook/closeSession`;
            
            await fetch(closeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'workbook-session-id': sessionId
                }
            }).catch(error => {
                console.warn('Erro ao fechar sessão do workbook:', error);
            });
        }
    }

    /**
     * Converte dados da planilha para o formato esperado pelo dashboard
     */
    parseWorkbookData(workbookData) {
        if (!workbookData || !workbookData.values || workbookData.values.length === 0) {
            throw new Error('Dados da planilha estão vazios');
        }

        const values = workbookData.values;
        
        // Primeira linha é o cabeçalho
        const headers = values[0].map(h => String(h).trim());
        
        // Restante são os dados
        const rows = values.slice(1);
        
        // Converte para array de objetos
        const data = rows.map((row, index) => {
            const obj = {};
            headers.forEach((header, colIndex) => {
                const value = row[colIndex];
                obj[header] = value !== null && value !== undefined ? value : '';
            });
            return obj;
        }).filter(obj => {
            // Remove linhas completamente vazias
            return Object.values(obj).some(val => val !== '');
        });

        console.log(`✅ Planilha parseada: ${data.length} registros de ${headers.length} colunas`);
        console.log('Colunas encontradas:', headers);

        return data;
    }

    /**
     * Carrega dados da planilha do SharePoint
     */
    async loadData(forceRefresh = false) {
        // Verifica cache
        if (!forceRefresh && this.cachedData && this.lastFetchTime) {
            const elapsed = Date.now() - this.lastFetchTime;
            if (elapsed < this.cacheExpiry) {
                console.log('📦 Usando dados em cache do SharePoint');
                return this.cachedData;
            }
        }

        // Verifica autenticação
        if (!this.authManager.activeAccount) {
            throw new Error('Usuário não autenticado. Faça login com sua conta Microsoft.');
        }

        // Pega URL da configuração
        const sharepointUrl = this.settingsManager.get('sharepointWorkbookUrl');
        
        if (!sharepointUrl) {
            throw new Error('URL do SharePoint não configurada. Configure em Configurações.');
        }

        try {
            console.log('📥 Carregando dados do SharePoint...');
            
            // Parse da URL
            const urlInfo = this.parseSharePointUrl(sharepointUrl);
            
            // Busca o arquivo
            let driveId = urlInfo.driveId;
            let itemId = urlInfo.itemId;
            
            if (!driveId || !itemId) {
                console.log('🔍 Buscando arquivo por nome:', urlInfo.fileName);
                const fileInfo = await this.findFileInDrive(urlInfo.fileName);
                driveId = fileInfo.driveId;
                itemId = fileInfo.itemId;
                console.log('✅ Arquivo encontrado:', fileInfo.name);
            }
            
            // Busca dados da planilha
            const workbookData = await this.fetchWorkbookData(driveId, itemId);
            
            // Parse dos dados
            const parsedData = this.parseWorkbookData(workbookData);
            
            // Atualiza cache
            this.cachedData = parsedData;
            this.lastFetchTime = Date.now();
            
            console.log('✅ Dados carregados do SharePoint:', parsedData.length, 'registros');
            
            return parsedData;
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados do SharePoint:', error);
            throw error;
        }
    }

    /**
     * Limpa o cache de dados
     */
    clearCache() {
        this.cachedData = null;
        this.lastFetchTime = null;
        console.log('🗑️ Cache do SharePoint limpo');
    }

    /**
     * Verifica se há dados em cache válidos
     */
    hasCachedData() {
        if (!this.cachedData || !this.lastFetchTime) {
            return false;
        }
        
        const elapsed = Date.now() - this.lastFetchTime;
        return elapsed < this.cacheExpiry;
    }
}

window.SharePointDataLoader = SharePointDataLoader;
