/**
 * SharePointService - Integração com SharePoint/OneDrive
 *
 * Responsabilidades:
 * - Integração com Microsoft Graph API
 * - Busca e download de arquivos do SharePoint/OneDrive
 * - Parse de URLs do SharePoint
 * - Gerenciamento de permissões
 *
 * @module 2-services/SharePointService
 * @requires AuthenticationService
 */

class SharePointService {
    /**
     * Configurações da API
     */
    static CONFIG = {
        GRAPH_API_BASE: 'https://graph.microsoft.com/v1.0',
        SCOPES: ['Files.Read', 'Files.Read.All', 'Sites.Read.All'],
        MAX_SEARCH_RESULTS: 25
    };

    /**
     * Parse URL do SharePoint/OneDrive
     * @param {string} url - URL do SharePoint
     * @returns {{type: string, fileName: string, siteId: string|null, driveId: string|null}}
     */
    static parseSharePointUrl(url) {
        try {
            const urlObj = new URL(url);

            // OneDrive personal link
            if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
                return {
                    type: 'onedrive-personal',
                    fileName: this._extractFileNameFromUrl(url),
                    siteId: null,
                    driveId: null,
                    isShareLink: true
                };
            }

            // SharePoint/OneDrive for Business
            if (url.includes('sharepoint.com')) {
                const fileName = this._extractFileNameFromUrl(url);
                const pathParts = urlObj.pathname.split('/');

                // Tentar extrair site e drive IDs
                const siteIndex = pathParts.indexOf('sites');
                const siteId = siteIndex >= 0 ? pathParts[siteIndex + 1] : null;

                return {
                    type: 'sharepoint',
                    fileName,
                    siteId,
                    driveId: null,
                    isShareLink: url.includes('/:x:/') || url.includes('/:w:/'),
                    domain: urlObj.hostname
                };
            }

            throw new Error('URL não é do SharePoint ou OneDrive');

        } catch (error) {
            throw new Error(`URL inválida: ${error.message}`);
        }
    }

    /**
     * Busca arquivo no OneDrive do usuário
     * @param {string} fileName - Nome do arquivo
     * @param {string} accessToken - Token de acesso
     * @returns {Promise<Object|null>} - Informações do arquivo
     */
    static async searchFileInDrive(fileName, accessToken) {
        try {
            // Buscar arquivo
            const searchUrl = `${this.CONFIG.GRAPH_API_BASE}/me/drive/root/search(q='${encodeURIComponent(fileName)}')`;

            const response = await fetch(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro na busca: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.value || data.value.length === 0) {
                return null;
            }

            // Retornar primeiro resultado que corresponda exatamente
            const exactMatch = data.value.find(item =>
                item.name.toLowerCase() === fileName.toLowerCase()
            );

            return exactMatch || data.value[0];

        } catch (error) {
            console.error('Erro ao buscar arquivo:', error);
            throw new Error(`Falha na busca: ${error.message}`);
        }
    }

    /**
     * Faz download do conteúdo do arquivo
     * @param {string} fileId - ID do arquivo
     * @param {string} accessToken - Token de acesso
     * @returns {Promise<ArrayBuffer>} - Conteúdo do arquivo
     */
    static async downloadFileContent(fileId, accessToken) {
        try {
            const downloadUrl = `${this.CONFIG.GRAPH_API_BASE}/me/drive/items/${fileId}/content`;

            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erro no download: ${response.status} ${response.statusText}`);
            }

            return await response.arrayBuffer();

        } catch (error) {
            console.error('Erro ao fazer download:', error);
            throw new Error(`Falha no download: ${error.message}`);
        }
    }

    /**
     * Carrega arquivo do SharePoint
     * @param {string} url - URL do SharePoint
     * @returns {Promise<{content: ArrayBuffer, metadata: Object}>}
     */
    static async loadFromSharePoint(url) {
        // Verificar se AuthenticationService está disponível
        if (typeof AuthenticationService === 'undefined') {
            throw new Error('AuthenticationService não carregado');
        }

        // Verificar autenticação
        if (!AuthenticationService.isAuthenticated()) {
            throw new Error('Usuário não autenticado. Faça login primeiro.');
        }

        // Parse URL
        const urlInfo = this.parseSharePointUrl(url);

        // Obter token de acesso
        const accessToken = await AuthenticationService.acquireToken(this.CONFIG.SCOPES);

        if (!accessToken) {
            throw new Error('Falha ao obter token de acesso');
        }

        // Buscar arquivo
        const fileInfo = await this.searchFileInDrive(urlInfo.fileName, accessToken);

        if (!fileInfo) {
            throw new Error(`Arquivo "${urlInfo.fileName}" não encontrado`);
        }

        // Download do conteúdo
        const content = await this.downloadFileContent(fileInfo.id, accessToken);

        return {
            content,
            metadata: {
                id: fileInfo.id,
                name: fileInfo.name,
                size: fileInfo.size,
                lastModified: fileInfo.lastModifiedDateTime,
                webUrl: fileInfo.webUrl,
                source: 'sharepoint'
            }
        };
    }

    /**
     * Lista arquivos Excel/CSV no drive do usuário
     * @param {string} accessToken - Token de acesso
     * @param {number} top - Número máximo de resultados
     * @returns {Promise<Array<Object>>} - Lista de arquivos
     */
    static async listExcelFiles(accessToken, top = 25) {
        try {
            const listUrl = `${this.CONFIG.GRAPH_API_BASE}/me/drive/root/children?$top=${top}&$filter=` +
                `endswith(name,'.xlsx') or endswith(name,'.xls') or endswith(name,'.csv')`;

            const response = await fetch(listUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao listar arquivos: ${response.status}`);
            }

            const data = await response.json();

            return data.value || [];

        } catch (error) {
            console.error('Erro ao listar arquivos:', error);
            throw new Error(`Falha ao listar: ${error.message}`);
        }
    }

    /**
     * Verifica permissões do usuário no arquivo
     * @param {string} fileId - ID do arquivo
     * @param {string} accessToken - Token de acesso
     * @returns {Promise<Object>} - Informações de permissão
     */
    static async checkPermissions(fileId, accessToken) {
        try {
            const permissionsUrl = `${this.CONFIG.GRAPH_API_BASE}/me/drive/items/${fileId}/permissions`;

            const response = await fetch(permissionsUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                return { canRead: false, canWrite: false };
            }

            const data = await response.json();

            const userPermissions = data.value || [];
            const hasReadPermission = userPermissions.some(p =>
                p.roles && p.roles.includes('read')
            );

            const hasWritePermission = userPermissions.some(p =>
                p.roles && p.roles.includes('write')
            );

            return {
                canRead: hasReadPermission,
                canWrite: hasWritePermission,
                permissions: userPermissions
            };

        } catch (error) {
            console.warn('Erro ao verificar permissões:', error);
            return { canRead: false, canWrite: false };
        }
    }

    /**
     * Extrai nome do arquivo da URL
     * @private
     * @param {string} url - URL do SharePoint
     * @returns {string} - Nome do arquivo
     */
    static _extractFileNameFromUrl(url) {
        try {
            // Tentar extrair de query params (links compartilhados)
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            // Alguns links têm o nome no sourcedoc
            const sourceDoc = params.get('sourcedoc');
            if (sourceDoc) {
                // sourcedoc pode ter formato {guid}/filename.xlsx
                const parts = sourceDoc.split('/');
                if (parts.length > 1) {
                    return decodeURIComponent(parts[parts.length - 1]);
                }
            }

            // Tentar extrair do path
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];

            // Verificar se tem extensão válida
            if (lastPart.match(/\.(xlsx|xls|csv)$/i)) {
                return decodeURIComponent(lastPart);
            }

            // Buscar no path por arquivo com extensão
            for (let i = pathParts.length - 1; i >= 0; i--) {
                if (pathParts[i].match(/\.(xlsx|xls|csv)$/i)) {
                    return decodeURIComponent(pathParts[i]);
                }
            }

            throw new Error('Nome do arquivo não encontrado na URL');

        } catch (error) {
            throw new Error(`Não foi possível extrair nome do arquivo: ${error.message}`);
        }
    }
}

// Expor globalmente
if (typeof window !== 'undefined') {
    window.SharePointService = SharePointService;
}
