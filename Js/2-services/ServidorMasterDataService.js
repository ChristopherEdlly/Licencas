/**
 * ServidorMasterDataService - Carrega dados de servidores da planilha externa
 *
 * Responsabilidades:
 * - Carregar tabela TblServidores do SharePoint (site SUGEP)
 * - Criar mapa de CPFLimpo -> dados do servidor
 * - Enriquecer servidores com dados atuais (cargo, lotacao, hierarquia)
 * - Marcar servidores como "ativo" ou "historico" baseado no match
 */

class ServidorMasterDataService {
    // Configuracao da planilha externa
    static CONFIG = {
        SITE_HOSTNAME: 'sefazsegovbr.sharepoint.com',
        SITE_PATH: '/sites/SUGEP',
        FILE_PATH: 'Documentos Compartilhados/LOTAÇÃO GERAL SERVIDORES.xlsx',
        SHEET_NAME: 'Censo Enrriquecido',
        TABLE_NAME: 'TblServidores',
        // ID extraido do link de compartilhamento
        ITEM_ID: 'wc615b699da6644feb7d76f4671f4183c'
    };

    // Mapeamento de colunas da planilha externa para campos do sistema
    static COLUMN_MAP = {
        'CPFLimpo': 'cpfLimpo',
        'SERVIDOR': 'nome',
        'CPF': 'cpfOriginal',
        'CARGO': 'cargo',
        'FUNÇÃO': 'funcao',
        'DN': 'dataNascimento',
        'IDADE': 'idade',
        'ADMISSÃO': 'dataAdmissao',
        'T.SERVIÇO': 'tempoServico',
        'SEXO': 'sexo',
        'Após. Comp.': 'aposentadoriaCompulsoria',
        'Subsecretaria/Gabinete': 'subsecretaria',
        'Superintendência': 'superintendencia',
        'Gerência/CEAC': 'gerencia',
        'Coordenadoria/Posto Fiscal': 'coordenadoria',
        'Telefone': 'telefone',
        'E-mail': 'email'
    };

    constructor() {
        // Mapa de CPFLimpo -> dados do servidor
        this.servidoresMap = new Map();

        // Estado
        this.isLoaded = false;
        this.isLoading = false;
        this.loadError = null;
        this.fileId = null;

        // Estatisticas
        this.stats = {
            totalExterno: 0,
            matchExato: 0,
            semMatch: 0
        };
    }

    /**
     * Normaliza CPF removendo formatacao (pontos, tracos, espacos)
     * @param {string} cpf - CPF em qualquer formato
     * @returns {string} - CPF com apenas digitos (11 caracteres)
     */
    static normalizeCPF(cpf) {
        if (!cpf) return '';
        return String(cpf).replace(/\D/g, '').padStart(11, '0');
    }

    /**
     * Carrega dados da planilha externa do SharePoint
     * @returns {Promise<boolean>} - true se carregou com sucesso
     */
    async loadMasterData() {
        if (this.isLoading) {
            console.log('[ServidorMasterDataService] Carregamento ja em andamento...');
            return false;
        }

        if (this.isLoaded) {
            console.log('[ServidorMasterDataService] Dados ja carregados');
            return true;
        }

        this.isLoading = true;
        this.loadError = null;

        try {
            console.log('[ServidorMasterDataService] Iniciando carregamento da planilha externa...');

            // Resolver fileId do arquivo
            const fileId = await this._resolveFileId();
            if (!fileId) {
                throw new Error('Nao foi possivel encontrar o arquivo da planilha externa');
            }
            this.fileId = fileId;

            // Carregar dados da tabela
            const { tableInfo, rows } = await this._loadTableData(fileId);

            // Processar e indexar dados
            this._processAndIndexData(rows, tableInfo);

            this.isLoaded = true;
            console.log(`✅ [ServidorMasterDataService] Carregamento concluido: ${this.servidoresMap.size} servidores indexados`);
            
            // Verificar se ABILIO está na planilha externa
            const abilioData = this.servidoresMap.get('85446629868');
            if (abilioData) {
                console.log('📋 [ServidorMasterDataService] ABILIO encontrado na planilha externa:');
                console.log('  - Nome:', abilioData.nome);
                console.log('  - Cargo:', abilioData.cargo);
                console.log('  - Gerência:', abilioData.gerencia);
            } else {
                console.log('⚠️ [ServidorMasterDataService] ABILIO NÃO foi encontrado na planilha externa');
            }

            return true;

        } catch (error) {
            this.loadError = error;
            console.error('[ServidorMasterDataService] Erro ao carregar planilha externa:', error);
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Resolve o fileId do arquivo da planilha externa
     * @private
     */
    /**
     * Resolve o fileId do arquivo da planilha externa
     * @private
     */
    async _resolveFileId() {
        const cfg = ServidorMasterDataService.CONFIG;
        const fileName = cfg.FILE_PATH.split('/').pop();

        console.log('[ServidorMasterDataService] 🔍 Buscando arquivo:', fileName);

        // Estrategia 0 (PRIORITÁRIA): Usar Item ID do link de compartilhamento
        if (cfg.ITEM_ID) {
            try {
                console.log('[ServidorMasterDataService] Estrategia 0: Usando Item ID do link...');
                console.log('[ServidorMasterDataService] Item ID:', cfg.ITEM_ID);
                
                // Tentar acessar diretamente via sharing link
                const shareEndpoint = `/shares/u!${btoa('https://sefazsegovbr.sharepoint.com/:x:/r/sites/SUGEP/Documentos%20Compartilhados/LOTA%C3%87%C3%83O%20GERAL%20SERVIDORES.xlsx?d=' + cfg.ITEM_ID).replace(/=+$/, '')}/driveItem`;
                console.log('[ServidorMasterDataService] Share endpoint:', shareEndpoint);
                
                const shareJson = await SharePointExcelService._graphFetch(shareEndpoint, { method: 'GET' }, ['Files.Read']);

                if (shareJson && shareJson.id) {
                    console.log('[ServidorMasterDataService] ✅ Arquivo encontrado via sharing link!');
                    console.log('[ServidorMasterDataService] File ID:', shareJson.id);
                    return shareJson.id;
                }
            } catch (e) {
                console.error('[ServidorMasterDataService] Estrategia 0 (item ID) falhou:', e.message);
            }
        }

        // Estrategia 1: Buscar via "Shared with me" (arquivos compartilhados comigo)
        try {
            console.log('[ServidorMasterDataService] Estrategia 1: Buscando em arquivos compartilhados...');
            const sharedEndpoint = '/me/drive/sharedWithMe';
            const sharedJson = await SharePointExcelService._graphFetch(sharedEndpoint, { method: 'GET' }, ['Files.Read']);

            const items = (sharedJson && sharedJson.value) || [];
            console.log('[ServidorMasterDataService] 📂 Total de arquivos compartilhados:', items.length);
            
            // Log TODOS os arquivos compartilhados para debug
            if (items.length > 0) {
                console.log('[ServidorMasterDataService] 📋 Arquivos compartilhados:');
                items.forEach((item, idx) => {
                    console.log(`  ${idx + 1}. ${item.name} ${item.remoteItem ? '(tem remoteItem)' : '(SEM remoteItem)'}`);
                });
            }
            
            const exactMatch = items.find(i => 
                i.name && i.name.toLowerCase() === fileName.toLowerCase() &&
                i.remoteItem && i.remoteItem.id
            );

            if (exactMatch) {
                console.log('[ServidorMasterDataService] ✅ Arquivo encontrado em "Shared with me":', exactMatch.name);
                console.log('[ServidorMasterDataService] 🔑 Remote Item ID:', exactMatch.remoteItem.id);
                // Para arquivos compartilhados, usamos o remoteItem.id
                return exactMatch.remoteItem.id;
            }
            
            // Se não encontrou, vamos ver se o arquivo está lá mas sem remoteItem
            const anyMatch = items.find(i => i.name && i.name.toLowerCase() === fileName.toLowerCase());
            if (anyMatch) {
                console.log('[ServidorMasterDataService] ⚠️ Arquivo encontrado mas SEM remoteItem:', anyMatch);
                if (anyMatch.id) {
                    console.log('[ServidorMasterDataService] Tentando usar .id diretamente:', anyMatch.id);
                    return anyMatch.id;
                }
            }
            
            console.log('[ServidorMasterDataService] ❌ Arquivo não encontrado em compartilhados');
        } catch (e) {
            console.error('[ServidorMasterDataService] Estrategia 1 (shared with me) falhou:', e.message);
        }

        // Estrategia 2: Busca global no OneDrive do usuario
        try {
            const searchPath = `/me/drive/root/search(q='${encodeURIComponent(fileName)}')`;
            console.log('[ServidorMasterDataService] Estrategia 2: Busca global no OneDrive...');
            const searchJson = await SharePointExcelService._graphFetch(searchPath, { method: 'GET' }, ['Files.Read']);

            const items = (searchJson && searchJson.value) || [];
            console.log('[ServidorMasterDataService] Resultados da busca:', items.length, 'arquivos encontrados');
            
            if (items.length > 0) {
                console.log('[ServidorMasterDataService] Arquivos encontrados:', items.map(i => i.name));
            }

            const exactMatch = items.find(i => i.name && i.name.toLowerCase() === fileName.toLowerCase());

            if (exactMatch) {
                console.log('[ServidorMasterDataService] ✅ Arquivo encontrado via busca:', exactMatch.webUrl);
                return exactMatch.id;
            }
            
            console.log('[ServidorMasterDataService] ❌ Nenhum match exato na busca');
        } catch (e) {
            console.error('[ServidorMasterDataService] Estrategia 2 (busca) falhou:', e.message);
        }

        // Estrategia 3: Tentar via sites API (requer Files.Read.All, mas vale tentar)
        try {
            const sitePath = `/sites/${cfg.SITE_HOSTNAME}:${cfg.SITE_PATH}:/drive/root:/${cfg.FILE_PATH}`;
            console.log('[ServidorMasterDataService] Estrategia 3: Tentando via sites API...');
            console.log('[ServidorMasterDataService] Path:', sitePath);
            
            const siteJson = await SharePointExcelService._graphFetch(sitePath, { method: 'GET' }, ['Files.Read.All', 'Files.Read']);

            if (siteJson && siteJson.id) {
                console.log('[ServidorMasterDataService] ✅ Arquivo encontrado via sites API');
                return siteJson.id;
            }
        } catch (e) {
            console.error('[ServidorMasterDataService] Estrategia 3 (sites API) falhou:', e.message);
        }

        throw new Error(`❌ Nao foi possivel encontrar o arquivo: ${fileName}\n\n` +
            `Solucoes possiveis:\n` +
            `1. Abra o arquivo no SharePoint e clique em "Adicionar atalho ao OneDrive"\n` +
            `2. Ou adicione Files.Read.All nas permissoes do app (permite ler arquivos que voce tem acesso)\n` +
            `3. Ou verifique se o arquivo foi compartilhado diretamente com voce`);
    }

    /**
     * Carrega dados da tabela Excel
     * @private
     */
    async _loadTableData(fileId) {
        const cfg = ServidorMasterDataService.CONFIG;

        try {
            // Tentar via Graph Workbook Tables API
            const tableInfo = await SharePointExcelService.getTableInfo(fileId, cfg.TABLE_NAME);
            const rows = await SharePointExcelService.getTableRows(fileId, cfg.TABLE_NAME, tableInfo);

            return { tableInfo, rows };
        } catch (e) {
            console.warn('[ServidorMasterDataService] Fallback para download e parse local');

            // Fallback: download e parse via XLSX
            const result = await SharePointExcelService.downloadAndParseWorkbook(fileId, cfg.SHEET_NAME);
            return result;
        }
    }

    /**
     * Processa linhas e cria indice por CPFLimpo
     * @private
     */
    _processAndIndexData(rows, tableInfo) {
        const columns = (tableInfo.columns || []).map(c => c.name);
        const columnMap = ServidorMasterDataService.COLUMN_MAP;

        this.servidoresMap.clear();
        
        console.log('📊 [_processAndIndexData] Processando planilha externa:');
        console.log('  - Total de linhas:', rows.length);
        console.log('  - Colunas:', columns.join(', '));

        for (const row of rows) {
            const values = row.values && row.values[0] ? row.values[0] : [];
            const rowData = {};

            // Mapear valores para campos
            columns.forEach((colName, idx) => {
                const fieldName = columnMap[colName] || colName;
                rowData[fieldName] = values[idx];
            });

            // Obter CPFLimpo como chave
            const cpfLimpo = rowData.cpfLimpo || ServidorMasterDataService.normalizeCPF(rowData.cpfOriginal);

            if (cpfLimpo && cpfLimpo.length === 11) {
                this.servidoresMap.set(cpfLimpo, {
                    ...rowData,
                    cpfLimpo: cpfLimpo
                });
                
                // Log específico para ABILIO
                if (cpfLimpo === '85446629868') {
                    console.log('🎯 [_processAndIndexData] ABILIO encontrado na linha:');
                    console.log('  - CPF Limpo:', cpfLimpo);
                    console.log('  - Nome:', rowData.nome);
                    console.log('  - Cargo:', rowData.cargo);
                    console.log('  - Gerência:', rowData.gerencia);
                    console.log('  - Dados completos:', rowData);
                }
            }
        }

        this.stats.totalExterno = this.servidoresMap.size;
        console.log(`✅ [_processAndIndexData] Indexados: ${this.stats.totalExterno} servidores`);
    }

    /**
     * Busca servidor por CPF
     * @param {string} cpf - CPF em qualquer formato
     * @returns {Object|null} - Dados do servidor ou null se nao encontrado
     */
    findByCPF(cpf) {
        if (!this.isLoaded) return null;

        const cpfNormalizado = ServidorMasterDataService.normalizeCPF(cpf);
        const resultado = this.servidoresMap.get(cpfNormalizado) || null;
        
        // Log para ABILIO
        if (cpfNormalizado === '85446629868') {
            console.log('🔎 [findByCPF] Buscando ABILIO:');
            console.log('  - CPF normalizado:', cpfNormalizado);
            console.log('  - Encontrado:', !!resultado);
            if (resultado) {
                console.log('  - Nome externo:', resultado.nome);
                console.log('  - Cargo externo:', resultado.cargo);
            }
        }
        
        return resultado;
    }

    /**
     * Enriquece um servidor com dados da planilha externa
     * @param {Object} servidor - Objeto servidor da planilha de licencas
     * @returns {Object} - Servidor enriquecido com dados atuais
     */
    enrichServidor(servidor) {
        if (!this.isLoaded || !servidor) return servidor;

        const cpf = servidor.cpf || servidor.CPF;
        const cpfNormalizado = ServidorMasterDataService.normalizeCPF(cpf);
        const nomeServidor = servidor.nome || servidor.NOME;
        
        // Log detalhado para o servidor ABILIO
        if (cpfNormalizado === '85446629868' || (nomeServidor && nomeServidor.includes('ABILIO'))) {
            console.log('🔍 [ServidorMasterData] Enriquecendo ABILIO:');
            console.log('  - CPF original:', cpf);
            console.log('  - CPF normalizado:', cpfNormalizado);
            console.log('  - Nome:', nomeServidor);
            console.log('  - Cargo antes:', servidor.cargo);
            console.log('  - Lotação antes:', servidor.lotacao);
        }
        
        const dadosExternos = this.findByCPF(cpf);

        if (dadosExternos) {
            // Match encontrado - enriquecer com dados externos
            this.stats.matchExato++;
            
            // Log detalhado para o servidor ABILIO
            if (cpfNormalizado === '85446629868' || (nomeServidor && nomeServidor.includes('ABILIO'))) {
                console.log('  ✅ Match encontrado na planilha externa!');
                console.log('  - Cargo externo:', dadosExternos.cargo);
                console.log('  - Gerência externa:', dadosExternos.gerencia);
                console.log('  - Superintendência:', dadosExternos.superintendencia);
                console.log('  - Subsecretaria:', dadosExternos.subsecretaria);
            }

            return {
                ...servidor,
                // Dados atuais da planilha externa
                cargo: dadosExternos.cargo || servidor.cargo,
                lotacao: dadosExternos.gerencia || servidor.lotacao,
                superintendencia: dadosExternos.superintendencia,
                subsecretaria: dadosExternos.subsecretaria,
                gerencia: dadosExternos.gerencia,
                coordenadoria: dadosExternos.coordenadoria,
                funcao: dadosExternos.funcao,
                telefone: dadosExternos.telefone,
                email: dadosExternos.email,
                // Dados calculados
                dataNascimento: dadosExternos.dataNascimento || servidor.dataNascimento,
                dataAdmissao: dadosExternos.dataAdmissao || servidor.dataAdmissao,
                sexo: dadosExternos.sexo || servidor.sexo,
                aposentadoriaCompulsoria: dadosExternos.aposentadoriaCompulsoria,
                // Flags de status
                _status: 'ativo',
                _fonteExterna: true,
                _dadosExternos: dadosExternos
            };
        } else {
            // Sem match - servidor historico
            this.stats.semMatch++;
            
            // Log detalhado para o servidor ABILIO
            if (cpfNormalizado === '85446629868' || (nomeServidor && nomeServidor.includes('ABILIO'))) {
                console.log('  ❌ Nenhum match encontrado na planilha externa');
                console.log('  - Servidor será marcado como HISTÓRICO');
            }

            return {
                ...servidor,
                _status: 'historico',
                _fonteExterna: false,
                _motivoSemMatch: 'CPF nao encontrado na planilha de servidores ativos'
            };
        }
    }

    /**
     * Enriquece array de servidores
     * @param {Array} servidores - Array de servidores
     * @returns {Array} - Servidores enriquecidos
     */
    enrichServidores(servidores) {
        if (!Array.isArray(servidores)) return servidores;

        // Reset stats
        this.stats.matchExato = 0;
        this.stats.semMatch = 0;

        return servidores.map(s => this.enrichServidor(s));
    }

    /**
     * Retorna estatisticas de matching
     */
    getStats() {
        return {
            ...this.stats,
            isLoaded: this.isLoaded,
            isLoading: this.isLoading,
            hasError: !!this.loadError
        };
    }

    /**
     * Retorna lista de servidores sem match (historicos)
     * @param {Array} servidores - Array de servidores enriquecidos
     * @returns {Array} - Servidores com _status === 'historico'
     */
    getServidoresHistoricos(servidores) {
        if (!Array.isArray(servidores)) return [];
        return servidores.filter(s => s._status === 'historico');
    }

    /**
     * Retorna lista de servidores ativos
     * @param {Array} servidores - Array de servidores enriquecidos
     * @returns {Array} - Servidores com _status === 'ativo'
     */
    getServidoresAtivos(servidores) {
        if (!Array.isArray(servidores)) return [];
        return servidores.filter(s => s._status === 'ativo');
    }

    /**
     * Limpa cache e forca recarregamento
     */
    reset() {
        this.servidoresMap.clear();
        this.isLoaded = false;
        this.isLoading = false;
        this.loadError = null;
        this.fileId = null;
        this.stats = {
            totalExterno: 0,
            matchExato: 0,
            semMatch: 0
        };
    }
}

// Singleton global
if (typeof window !== 'undefined') {
    window.ServidorMasterDataService = ServidorMasterDataService;
    window.servidorMasterDataService = new ServidorMasterDataService();
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServidorMasterDataService;
}
