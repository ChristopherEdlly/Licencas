/**
 * TableManager - Gerenciamento de tabelas
 *
 * Responsabilidades:
 * - Renderizar tabela de servidores
 * - Ordenação de colunas
 * - Paginação
 * - Seleção de linhas
 * - Ações em lote
 * - Adaptação dinâmica de colunas baseada no tipo de dados (Legacy)
 *
 * @module 3-managers/ui/TableManager
 */

class TableManager {
    constructor(app) {
        this.app = app;
        this.tableElement = null;
        this.tableBody = null;
        this.tableHead = null; // Reference to thead
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.selectedRows = new Set();
        this.currentPage = 1;
        this.rowsPerPage = 50;
        this.totalPages = 1;
        this.isLicencaPremio = false;

        // Colunas e Visibilidade (match legacy defaults)
        this.visibleColumns = {
            'nome': true,
            'cargo': true,
            'lotacao': true,
            'urgencia': true,
            'proximaLicenca': true,
            'idade': true,
            'saldo': false
        };

        console.log('✅ TableManager inicializado');
    }

    init(tableId = 'servidoresTable') {
        this.tableElement = document.getElementById(tableId);
        if (!this.tableElement) {
            console.warn(`Tabela ${tableId} não encontrada`);
            return;
        }
        this.tableBody = this.tableElement.querySelector('tbody');
        if (!this.tableBody) {
            this.tableBody = document.createElement('tbody');
            this.tableBody.id = 'tableBody';
            this.tableElement.appendChild(this.tableBody);
        }
        this.tableHead = this.tableElement.querySelector('thead');
        this._setupEventListeners();
    }

    async render(data) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        if (!data || !Array.isArray(data) || data.length === 0) {
            this._renderEmptyState();
            return;
        }

        // Detecta tipo de tabela (Legacy Logic)
        this._detectTableType(data);

        // Atualiza headers conforme o tipo
        this._updateTableHeaders();

        // Ordenação
        const sortedData = this._sortData(data);

        // Paginação
        this.totalPages = Math.ceil(sortedData.length / this.rowsPerPage);
        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const pageData = sortedData.slice(startIndex, endIndex);

        // OTIMIZAÇÃO: Verificar permissões UMA ÚNICA VEZ antes de renderizar todas as linhas
        await this._checkEditPermissions();

        // Renderizar linhas
        pageData.forEach((servidor, index) => {
            const row = this._createRow(servidor, startIndex + index);
            this.tableBody.appendChild(row);
        });

        // Aplicar botões de edição DEPOIS de renderizar todas as linhas
        this._applyEditButtonsState();

        // ⚠️ Deduplicação Visual DESABILITADA - dados já vêm agrupados por servidor do DataParser
        // this._applyVisualDeduplication();

        this._updatePaginationControls(data.length);

        // Atualizar contador de resultados no DOM se existir
        const resultCount = document.getElementById('resultCount');
        if (resultCount) resultCount.textContent = `${data.length} resultados`;
    }

    /**
     * Helper para obter valor de objeto ignorando case das chaves
     * @param {Object} obj - Objeto para busca
     * @param {string} key - Chave desejada
     * @returns {*} Valor encontrado ou undefined
     */
    _getKeyCaseInsensitive(obj, key) {
        if (!obj) return undefined;
        // Tenta direto
        if (obj[key] !== undefined) return obj[key];

        // Tenta lowercase
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);

        return foundKey ? obj[foundKey] : undefined;
    }

    _detectTableType(data) {
        // Lógica do legado: verifica se há licenças premio ou modalidade explicita
        if (!data || data.length === 0) return;

        const firstItem = data[0];

        // Helper inline para checar existência de sub-chaves
        const hasKey = (obj, keyPart) => {
            if (!obj) return false;
            return Object.keys(obj).some(k => k.toLowerCase().includes(keyPart.toLowerCase()));
        };

        // Extração tolerante a case e variações
        const tipoTabela = this._getKeyCaseInsensitive(firstItem, 'tipoTabela');
        const modalidade = this._getKeyCaseInsensitive(firstItem, 'modalidade');
        const licencasPremio = this._getKeyCaseInsensitive(firstItem, 'licencasPremio');

        this.isLicencaPremio = (
            tipoTabela === 'licenca-premio' ||
            modalidade === 'licenca-premio' ||
            (licencasPremio !== undefined) ||
            hasKey(firstItem, 'premio') ||
            hasKey(firstItem, 'saldo') || // Fallback comum: tabelas de LP tem saldo
            hasKey(firstItem, 'restando')
        );
    }

    _updateTableHeaders() {
        if (!this.tableHead) return;

        const tr = this.tableHead.querySelector('tr');
        if (!tr) return;

        if (this.isLicencaPremio) {
            // Headers para Licença Prêmio
            tr.innerHTML = `
                <th data-sortable="true" data-column="nome">Nome</th>
                <th data-sortable="true" data-column="cargo">Cargo</th>
                <th data-sortable="true" data-column="lotacao">Lotação</th>
                <th data-sortable="true" data-column="proximaLicenca">Próxima Licença</th>
                <th data-sortable="true" data-column="saldo">Saldo Dias</th>
                <th>Ações</th>
            `;
        } else {
            // Headers Padrão (Cronograma View)
            // Lógica do legado verifica colunas opcionais (idade, urgencia)
            // Aqui vamos incluir as comuns por padrão
            let headersHtml = `
                <th data-sortable="true" data-column="nome">Nome</th>
                <th data-sortable="true" data-column="cargo">Cargo</th>
            `;

            if (this.visibleColumns.idade) {
                headersHtml += `<th data-sortable="true" data-column="idade">Idade</th>`;
            }

            headersHtml += `<th data-sortable="true" data-column="lotacao">Lotação</th>
                            <th>Período</th>`; // Período da licença (não ordenável facilmente pois é texto/lista)

            if (this.visibleColumns.urgencia) {
                headersHtml += `<th data-sortable="true" data-column="urgencia">Urgência</th>`;
            }

            headersHtml += `<th>Ações</th>`;

            tr.innerHTML = headersHtml;
        }

        // Re-attach sort listeners logic needs to be mindful of new elements
        // This is handled by _setupEventListeners calling delegate or finding elements.
        // But _setupEventListeners is called ONCE at init.
        // We need to re-bind listeners or use event delegation on tableElement.
        // The init() method uses querySelectorAll which won't work for replaced elements.
        // BETTER: Change _setupEventListeners to use DELEGATION on the table head row.
        // I will do that in _setupEventListeners adjustment later, assumes listeners attached to static parent or re-attached.
        // Current implementation attaches to TH elements, so we need to RE-ATTACH.
        this._reattachSortListeners();
    }

    _reattachSortListeners() {
        if (!this.tableHead) return;
        this.tableHead.querySelectorAll('th[data-sortable]').forEach(th => {
            th.addEventListener('click', () => {
                this.sortColumn = th.dataset.column;
                this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                const data = this.app?.dataStateManager?.getFilteredServidores();
                if (data) this.render(data);
            });
        });
    }

    _createRow(servidor, index) {
        const row = document.createElement('tr');
        row.className = 'fade-in';
        row.dataset.index = index;

        // Adicionar classe se servidor for inativo
        if (servidor._status === 'historico') {
            row.classList.add('servidor-inactive');
        }

        // Sanitização
        const escapeHtml = (str) => (str || '').toString().replace(/\"/g, '&quot;').replace(/\'/g, '&#39;');

        // Extração de dados segura (Case Insensitive)
        const nomeRaw = this._getKeyCaseInsensitive(servidor, 'nome') || this._getKeyCaseInsensitive(servidor, 'servidor') || '';
        const cargoRaw = this._getKeyCaseInsensitive(servidor, 'cargo');
        let lotacaoRaw = this._getKeyCaseInsensitive(servidor, 'lotacao') || this._getKeyCaseInsensitive(servidor, 'unidade');

        // Fallback: se valor vazio ou apenas espaços, tentar buscar nos registros completos
        if ((!lotacaoRaw || String(lotacaoRaw).trim() === '') && this.app && this.app.dataStateManager && typeof this.app.dataStateManager.getAllServidores === 'function') {
            try {
                const all = this.app.dataStateManager.getAllServidores() || [];
                const nome = (nomeRaw || '').toString().trim().toLowerCase();
                if (nome) {
                    for (const s of all) {
                        const sNome = (s.nome || s.NOME || s.servidor || '').toString().trim().toLowerCase();
                        if (sNome === nome) {
                            const candidate = this._getKeyCaseInsensitive(s, 'lotacao') || this._getKeyCaseInsensitive(s, 'unidade');
                            if (candidate && String(candidate).trim() !== '') {
                                lotacaoRaw = candidate;
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                // ignore lookup errors
            }
        }
        const idadeRaw = this._getKeyCaseInsensitive(servidor, 'idade');
        const urgenciaRaw = this._getKeyCaseInsensitive(servidor, 'nivelUrgencia') || this._getKeyCaseInsensitive(servidor, 'urgencia');

        const nomeEscapado = escapeHtml(nomeRaw);
        const cargoEscapado = escapeHtml(cargoRaw || '--');
        const lotacaoEscapada = escapeHtml(lotacaoRaw || '--');

        // 📊 Contador de períodos/licenças
        const numLicencas = (servidor.licencas && Array.isArray(servidor.licencas)) ? servidor.licencas.length : 0;
        const contadorBadge = numLicencas > 0 
            ? `<span style="font-size:0.8rem;color:var(--text-tertiary);padding-left:0.25rem;font-weight:600;"> (${numLicencas})</span>` 
            : '';

        // 🏷️ Badge de servidor inativo
        const inactiveBadge = servidor._status === 'historico' 
            ? `<span class="servidor-status-tag inactive" style="margin-left:0.5rem;"><i class="bi bi-archive"></i> Inativo</span>` 
            : '';

        if (this.isLicencaPremio) {
            // ================== LAYOUT LICENÇA PRÊMIO ==================
            // Formatar Próxima Licença
            const proximaLicencaHtml = this._formatarProximaLicenca(servidor);

            // Saldo: preferir valores calculados no core (`DataTransformer`) sobre re-calcular localmente
            let saldoDias = 0;

            // Tenta pegar totalSaldo direto do objeto servidor (normalizado pelo core)
            const coreSaldo = this._getKeyCaseInsensitive(servidor, 'totalSaldo') || this._getKeyCaseInsensitive(servidor, 'saldo');
            if (coreSaldo !== undefined && coreSaldo !== null) {
                saldoDias = Number(coreSaldo) || 0;
            } else if (this.app && this.app.dataStateManager) {
                // Fallback: se por algum motivo o objeto servidor não contém totals, usar registros no DataStateManager
                const allServidores = this.app.dataStateManager.getAllServidores() || [];
                if (allServidores.length > 0) {
                    // Preferir comparar por campo normalizado `_nomeNormalizado` quando disponível
                    const nomeNorm = (this._getKeyCaseInsensitive(servidor, '_nomeNormalizado') || (nomeRaw || '').toString().toLowerCase()).toString().trim();
                    const siblingRecords = allServidores.filter(s => {
                        const sNomeNorm = (this._getKeyCaseInsensitive(s, '_nomeNormalizado') || (this._getKeyCaseInsensitive(s, 'nome') || '').toString().toLowerCase()).toString().trim();
                        return sNomeNorm === nomeNorm;
                    });
                    const saldoInfo = this._calculateLegacyBalance(siblingRecords);
                    saldoDias = saldoInfo.dias;
                }
            }

            const saldoClass = saldoDias > 0 ? 'saldo-positivo' : 'saldo-zerado';
            const saldoTexto = saldoDias > 0 ? `${saldoDias} dias` : '0';

            row.innerHTML = `
                <td><strong class="servidor-nome-cell" data-nome="${nomeEscapado}">${nomeEscapado}${contadorBadge}${inactiveBadge}</strong></td>
                <td><span class="cargo-badge">${cargoEscapado}</span></td>
                <td><span class="lotacao-badge">${lotacaoEscapada}</span></td>
                <td>${proximaLicencaHtml}</td>
                <td><span class="saldo-badge ${saldoClass}">${saldoTexto}</span></td>
                <td class="actions">
                    <button class="btn-icon" data-action="view" data-row-index="${servidor.__rowIndex || index}" title="Ver detalhes">
                        <i class="bi bi-eye"></i>
                    </button>

                </td>
            `;
        } else {
            // ================== LAYOUT PADRÃO ==================
            const nivelUrgencia = urgenciaRaw || '';
            const periodoLicencaCompleto = this._formatarPeriodoLicencaCompleto(servidor);

            let rowHtml = `<td><strong class="servidor-nome-cell" data-nome="${nomeEscapado}">${nomeEscapado}${contadorBadge}${inactiveBadge}</strong></td>`;
            rowHtml += `<td><span class="cargo-badge">${cargoEscapado}</span></td>`;

            if (this.visibleColumns.idade) {
                rowHtml += `<td>${servidor.idade || '--'}</td>`;
            }

            rowHtml += `<td><span class="lotacao-badge">${lotacaoEscapada}</span></td>`;
            rowHtml += `<td>${periodoLicencaCompleto}</td>`;

            if (this.visibleColumns.urgencia) {
                const badgeClass = nivelUrgencia ? `urgency-${nivelUrgencia.toLowerCase()}` : '';
                const badgeLabel = nivelUrgencia || '--';
                rowHtml += `<td><span class="urgency-badge ${badgeClass}">${badgeLabel}</span></td>`;
            }

            rowHtml += `
                <td class="actions">
                    <button class="btn-icon" data-action="view" title="Ver detalhes">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;

            row.innerHTML = rowHtml;
        }

        return row;
    }

    /**
     * Calcula saldo de licenças usando TODOS os registros de um servidor (Lógica Legada)
     * Regra: Agrupa por período aquisitivo e pega o 'RESTANDO' do último período.
     */
    _calculateLegacyBalance(registros) {
        if (!registros || registros.length === 0) {
            return { dias: 0, diasGanhos: 0, diasUsados: 0, periodosTotal: 0 };
        }

        // Agrupar por período aquisitivo (cada período = 5 anos = 90 dias de direito)
        const periodosAquisitivosMap = new Map();

        registros.forEach(registro => {
            // Coletar dados APENAS das licenças ou dados originais
            const fontesTodas = [];

            // 1. Processar licenças do registro (prioridade)
            if (registro.licencas && Array.isArray(registro.licencas)) {
                registro.licencas.forEach(lic => {
                    if (lic.dadosOriginais) {
                        fontesTodas.push(lic.dadosOriginais);
                    } else {
                        fontesTodas.push(lic);
                    }
                });
            }

            // 2. Se não encontrou licenças, usar dadosOriginais do registro
            if (fontesTodas.length === 0 && registro.dadosOriginais) {
                fontesTodas.push(registro.dadosOriginais);
            }

            // 3. Fallback: usar o próprio registro
            if (fontesTodas.length === 0) {
                fontesTodas.push(registro);
            }

            // Processar cada fonte de dados
            fontesTodas.forEach(dados => {
                // Tenta chaves maiúsculas (CSV raw), camelCase ou snake_case (parseado)
                const aquisitivoInicio = dados.AQUISITIVO_INICIO || dados.aquisitivoInicio || dados.aquisitivo_inicio;
                const aquisitivoFim = dados.AQUISITIVO_FIM || dados.aquisitivoFim || dados.aquisitivo_fim;
                // GOZO may come in several shapes depending on parsing stage:
                // - raw CSV: GOZO / gozo
                // - normalized license object: dias
                // - older variations: diasGozo
                // Prefer explicit diasGozados produced by DataTransformer, then fallbacks
                const gozo = this._parseNumero(
                    (dados.diasGozados !== undefined && dados.diasGozados !== null) ? dados.diasGozados :
                    (dados.GOZO || dados.gozo || dados.dias || dados.diasGozo || 0)
                );

                // RESTANDO é mapeado para 'saldo' no DataParser, mas verificamos originais também
                const restando = this._parseRestando(dados.RESTANDO || dados.restando || dados.saldo || '0');

                // Determinar chave do período aquisitivo.
                // Preferir AQUISITIVO_INICIO/FIM, mas aceitar alternativas quando ausentes
                let chavePeriodo = null;

                const isInvalid1899 = v => {
                    if (!v) return true;
                    const s = String(v).toLowerCase();
                    return s.includes('1899') || s.includes('29/12/1899') || s.includes('1899-12-29');
                };

                if (aquisitivoInicio && !isInvalid1899(aquisitivoInicio)) {
                    const start = aquisitivoInicio;
                    const end = aquisitivoFim || '';
                    chavePeriodo = `${start}-${end}`;
                } else {
                    // Fallback: tentar A_PARTIR / TERMINO / inicio / periodo
                    const partir = dados.A_PARTIR || dados.a_partir || dados.A_PARTIR || dados.aPartir || dados.inicio || dados.dataInicio || dados.periodo;
                    const termino = dados.TERMINO || dados.termino || dados.fim || dados.dataFim;

                    if (partir && !isInvalid1899(partir)) {
                        chavePeriodo = `${partir}-${termino || ''}`;
                    } else {
                        // Sem informações de período válidas, usar um identificador genérico (nome + idx)
                        chavePeriodo = `sem-aquisitivo-${Math.random().toString(36).slice(2,8)}`;
                    }
                }

                if (!periodosAquisitivosMap.has(chavePeriodo)) {
                    periodosAquisitivosMap.set(chavePeriodo, {
                        diasUsados: 0,
                        restando: 0,
                        ultimoRestando: restando // Rastrear o último RESTANDO deste período
                    });
                }

                const periodo = periodosAquisitivosMap.get(chavePeriodo);
                periodo.diasUsados += gozo;
                periodo.ultimoRestando = restando; // Atualizar com o último RESTANDO encontrado
            });
        });

        // Converter map para array
        const periodos = Array.from(periodosAquisitivosMap.values());

        // O saldo disponível é o RESTANDO do ÚLTIMO período aquisitivo encontrado
        const ultimoPeriodo = periodos.length > 0 ? periodos[periodos.length - 1] : null;

        return {
            dias: ultimoPeriodo ? ultimoPeriodo.ultimoRestando : 0,
            diasGanhos: periodos.length * 90,
            diasUsados: periodos.reduce((sum, p) => sum + p.diasUsados, 0),
            periodosTotal: periodos.length
        };
    }

    _parseNumero(valor) {
        if (!valor) return 0;
        const num = parseInt(String(valor).replace(/\D/g, ''), 10);
        return isNaN(num) ? 0 : num;
    }

    _parseRestando(valor) {
        if (!valor) return 0;
        const str = String(valor).trim();
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    // Helper para o período completo (Legacy: mostra todas as licenças ou resumo)
    _formatarPeriodoLicencaCompleto(servidor) {
        if (!servidor.licencas || !Array.isArray(servidor.licencas) || servidor.licencas.length === 0) {
            return '<span class="text-muted">--</span>';
        }

        // Se houver cronograma explícito ou descrição
        if (servidor.cronograma) return servidor.cronograma;

        // Caso contrário, pega a primeira licença válida ou formata a lista
        // Legacy: mostrava o texto do cronograma parseado
        const lic = servidor.licencas[0];
        if (lic.descricao) return lic.descricao;
        if (lic.periodo) return lic.periodo;
        if (lic.periodoFormatado) return lic.periodoFormatado;

        // Fallback: construir datas
        if (lic.dataInicio && lic.dataFim) {
            const dI = new Date(lic.dataInicio).toLocaleDateString('pt-BR');
            const dF = new Date(lic.dataFim).toLocaleDateString('pt-BR');
            return `${dI} a ${dF}`;
        }

        return '--';
    }

    /**
     * Reimplementação exata da lógica "formatarProximaLicenca" do legado.
     */
    _formatarProximaLicenca(servidor) {
        if (!servidor.licencas || !Array.isArray(servidor.licencas)) {
            if (servidor.proximaLicenca) return this._formatDate(servidor.proximaLicenca);
            return 'Não agendada';
        }

        const agora = new Date();
        agora.setHours(0, 0, 0, 0);

        // Filtrar futuras e ordenar
        const licenciamentosFuturos = servidor.licencas.filter(lic => {
            try {
                const inicio = new Date(lic.inicio || lic.dataInicio);
                inicio.setHours(0, 0, 0, 0);
                return inicio >= agora;
            } catch { return false; }
        }).sort((a, b) => {
            const dA = new Date(a.inicio || a.dataInicio);
            const dB = new Date(b.inicio || b.dataInicio);
            return dA - dB;
        });

        if (licenciamentosFuturos.length > 0) {
            const proxima = licenciamentosFuturos[0];
            const inicio = new Date(proxima.inicio || proxima.dataInicio);
            const fim = proxima.fim || proxima.dataFim ? new Date(proxima.fim || proxima.dataFim) : null;

            const dataFormatada = inicio.toLocaleDateString('pt-BR');
            let duracao = '';

            if (fim) {
                const diffDias = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1;
                const meses = Math.round(diffDias / 30);
                duracao = meses > 0 ? ` (${meses}m)` : ` (${diffDias}d)`;
            } else if (proxima.meses) {
                duracao = ` (${proxima.meses}m)`;
            } else if (proxima.diasGozo) {
                const m = Math.round(proxima.diasGozo / 30);
                duracao = m > 0 ? ` (${m}m)` : ` (${proxima.diasGozo}d)`;
            }

            return `${dataFormatada}<small style="color:var(--text-tertiary)">${duracao}</small>`;
        }

        return '<span style="color:var(--text-muted)">Não agendada</span>';
    }

    _applyVisualDeduplication() {
        if (!this.tableBody) return;

        try {
            const rows = Array.from(this.tableBody.querySelectorAll('tr'));
            const nameMap = new Map();

            rows.forEach(r => {
                const strong = r.querySelector('strong.servidor-nome-cell');
                if (!strong) return;
                const name = this._getKeyCaseInsensitive(strong.dataset, 'nome') || strong.dataset.nome;

                // Validação crítica: ignorar nomes vazios para evitar colapso incorreto
                if (!name || name === 'undefined' || name === 'null' || name.trim() === '') {
                    return;
                }

                if (!nameMap.has(name)) {
                    nameMap.set(name, { count: 0, firstRow: r, rows: [] });
                }
                const info = nameMap.get(name);
                info.count++;
                info.rows.push(r);
            });

            nameMap.forEach(info => {
                if (info.count > 1) {
                    const strong = info.firstRow.querySelector('strong.servidor-nome-cell');
                    if (strong && !strong.querySelector('.duplicate-counter')) {
                        const span = document.createElement('span');
                        span.className = 'duplicate-counter';
                        span.textContent = ` (${info.count})`;
                        span.style.cssText = 'font-size:0.8rem;color:var(--text-tertiary);padding-left:0.25rem;font-weight:600';
                        strong.appendChild(span);
                    }

                    info.rows.forEach((r, idx) => {
                        if (idx > 0) {
                            r.style.display = 'none';
                            r.classList.add('duplicate-hidden');
                        }
                    });
                }
            });
        } catch (e) {
            console.error('Erro na deduplicação visual:', e);
        }
    }

    _renderEmptyState() {
        this.tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="10" style="text-align:center; padding: 2rem;">
                    <div style="display:flex; flex-direction:column; align-items:center; gap:1rem;">
                        <i class="bi bi-inbox" style="font-size:2rem; color:var(--text-muted)"></i>
                        <p style="color:var(--text-secondary)">Nenhum servidor encontrado</p>
                    </div>
                </td>
            </tr>
        `;
    }

    _formatDate(date) {
        if (!date) return '--';
        try {
            return new Date(date).toLocaleDateString('pt-BR');
        } catch { return date; }
    }

    _sortData(data) {
        if (!this.sortColumn) return data;
        return [...data].sort((a, b) => {
            const valA = a[this.sortColumn];
            const valB = b[this.sortColumn];
            if (valA == null) return 1;
            if (valB == null) return -1;
            if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    _setupEventListeners() {
        if (!this.tableElement) return;

        // View Actions
        this.tableElement.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('[data-action="view"]');
            if (viewBtn) {
                const rowIndex = parseInt(viewBtn.dataset.rowIndex);
                this._handleAction('view', rowIndex);
            }
            // REMOVIDO: Botão de editar da tabela
            // Agora edição é feita através do modal de detalhes do servidor
        });

        // Initial attach for static headers
        this._reattachSortListeners();
    }

    _handleAction(action, rowIndex) {
        const allData = this.app?.dataStateManager?.getAllServidores() || [];
        
        // DEBUG: Verificar estrutura dos dados
        if (allData.length > 0) {
            console.log('[TableManager] DEBUG - Primeiro servidor:', {
                temRowIndex: '__rowIndex' in allData[0],
                rowIndex: allData[0].__rowIndex,
                keys: Object.keys(allData[0]).filter(k => k.startsWith('_'))
            });
        }
        
        const servidor = allData.find(s => s.__rowIndex === rowIndex);  // ✅ BUSCA PELO __rowIndex

        if (!servidor) {
            console.error('Servidor não encontrado com __rowIndex:', rowIndex);
            console.error('Total de servidores:', allData.length);
            console.error('Amostra de __rowIndex disponíveis:', allData.slice(0, 5).map(s => s.__rowIndex));
            return;
        }

        console.log('[TableManager] DEBUG - Servidor clicado:', {
            action,
            rowIndex,
            servidor: servidor ? servidor.nome || servidor.NOME || servidor.SERVIDOR : null
        });

        // View action: open details modal
        if (action === 'view' && servidor && this.app && this.app.showServidorDetails) {
            this.app.showServidorDetails(servidor);
        }

        // Edit action: open edit modal only
        if (action === 'edit' && servidor) {
            try {
                // Preferir WizardModal se disponível
                if (this.app && this.app.wizardModal && typeof this.app.wizardModal.open === 'function') {
                    console.log('[TableManager] Abrindo WizardModal para editar');
                    this.app.wizardModal.open('edit', servidor, servidor);
                } else if (this.app && this.app.licenseEditModal && typeof this.app.licenseEditModal.open === 'function') {
                    console.log('[TableManager] Fallback: abrindo LicenseEditModal');
                    this.app.licenseEditModal.open({
                        mode: 'edit',
                        row: servidor,
                        rowIndex: servidor.__rowIndex  // ✅ PASSA O __rowIndex CORRETO
                    });
                } else if (typeof window.WizardModal !== 'undefined') {
                    console.log('[TableManager] Criando instância de WizardModal');
                    const m = new window.WizardModal(this.app);
                    m.open('edit', servidor, servidor);
                } else if (typeof window.LicenseEditModal !== 'undefined') {
                    console.log('[TableManager] Fallback: criando instância de LicenseEditModal');
                    // Fallback: global modal
                    const m = new window.LicenseEditModal(this.app);
                    if (m && typeof m.open === 'function') {
                        m.open({
                            mode: 'edit',
                            row: servidor,
                            rowIndex: servidor.__rowIndex  // ✅ PASSA O __rowIndex CORRETO
                        });
                    }
                } else {
                    console.warn('Nenhum modal de edição disponível (WizardModal ou LicenseEditModal)');
                }
            } catch (e) {
                console.error('Erro ao abrir edit modal:', e);
            }
        }
    }

    // Auxiliary methods for compatibility
    updatePaginationControls(total) { this._updatePaginationControls(total); }
    _updatePaginationControls(total) {
        const paginationContainer = document.getElementById('paginationControls');
        if (!paginationContainer) return;

        // Limpar controles existentes
        paginationContainer.innerHTML = '';

        if (this.totalPages <= 1) return;

        // Criar botão Anterior
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-pagination';
        prevBtn.innerText = '‹';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                const data = this.app?.dataStateManager?.getFilteredServidores();
                if (data) this.render(data);
            }
        };
        paginationContainer.appendChild(prevBtn);

        // Criar indicador de página
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.innerText = `Página ${this.currentPage} de ${this.totalPages}`;
        paginationContainer.appendChild(pageInfo);

        // Criar botão Próximo
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-pagination';
        nextBtn.innerText = '›';
        nextBtn.disabled = this.currentPage === this.totalPages;
        nextBtn.onclick = () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                const data = this.app?.dataStateManager?.getFilteredServidores();
                if (data) this.render(data);
            }
        };
        paginationContainer.appendChild(nextBtn);
    }

    /**
     * Verifica permissões de edição UMA ÚNICA VEZ (evita loop de autenticação)
     * @private
     */
    async _checkEditPermissions() {
        // Inicializa cache de permissões se não existir
        if (!this._editPermissionsCache) {
            this._editPermissionsCache = {
                canEdit: false,
                checked: false,
                timestamp: 0
            };
        }

        // Se já verificou nos últimos 5 minutos, reutiliza resultado
        const FIVE_MINUTES = 5 * 60 * 1000;
        if (this._editPermissionsCache.checked &&
            (Date.now() - this._editPermissionsCache.timestamp) < FIVE_MINUTES) {
            return;
        }

        try {
            const meta = this.app && this.app.dataStateManager &&
                typeof this.app.dataStateManager.getSourceMetadata === 'function'
                ? this.app.dataStateManager.getSourceMetadata()
                : null;

            if (!meta || !meta.fileId) {
                this._editPermissionsCache = {
                    canEdit: false,
                    checked: true,
                    timestamp: Date.now()
                };
                return;
            }

            // Verificar permissões (UMA ÚNICA chamada para toda a tabela)
            let canEdit = false;
            if (typeof window.PermissionsService !== 'undefined' &&
                typeof window.PermissionsService.canEdit === 'function') {
                canEdit = await window.PermissionsService.canEdit(meta.fileId);
            } else if (typeof window.SharePointExcelService !== 'undefined' &&
                       typeof window.SharePointExcelService.userHasWritePermission === 'function') {
                canEdit = await window.SharePointExcelService.userHasWritePermission(meta.fileId);
            }

            this._editPermissionsCache = {
                canEdit,
                checked: true,
                timestamp: Date.now()
            };

        } catch (e) {
            console.warn('Erro ao verificar permissões de edição:', e && e.message);
            this._editPermissionsCache = {
                canEdit: false,
                checked: true,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Aplica estado dos botões de edição baseado no cache de permissões
     * @private
     */
    _applyEditButtonsState() {
        if (!this.tableBody || !this._editPermissionsCache || !this._editPermissionsCache.checked) {
            return;
        }

        const canEdit = this._editPermissionsCache.canEdit;
        const editButtons = this.tableBody.querySelectorAll('[data-action="edit"]');

        editButtons.forEach(btn => {
            btn.disabled = !canEdit;
        });
    }
}

// Global Export
if (typeof window !== 'undefined') window.TableManager = TableManager;
if (typeof module !== 'undefined' && module.exports) module.exports = TableManager;
