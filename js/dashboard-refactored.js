/**
 * Dashboard Multi-Páginas SUTRI - Versão Modular
 * 
 * Estrutura modular:
 * - FileManager: Gerenciamento de arquivos e armazenamento
 * - ChartManager: Gerenciamento de gráficos
 * - FilterManager: Gerenciamento de filtros
 * - UIManager: Gerenciamento de interface
 * - TableManager: Gerenciamento de tabelas (a criar)
 * - StatsManager: Gerenciamento de estatísticas (a criar)
 * - ModalManager: Gerenciamento de modais (a criar)
 */

class DashboardMultiPage {
    constructor() {
        if (typeof CronogramaParser === 'undefined') {
            console.error('❌ CronogramaParser não encontrado!');
            return;
        }
        if (typeof FileManager === 'undefined') {
            console.error('❌ FileManager não encontrado!');
            return;
        }
        if (typeof ChartManager === 'undefined') {
            console.error('❌ ChartManager não encontrado!');
            return;
        }
        if (typeof FilterManager === 'undefined') {
            console.error('❌ FilterManager não encontrado!');
            return;
        }
        if (typeof UIManager === 'undefined') {
            console.error('❌ UIManager não encontrado!');
            return;
        }
        if (typeof ModalManager === 'undefined') {
            console.error('❌ ModalManager não encontrado!');
            return;
        }
        if (typeof CalendarManager === 'undefined') {
            console.error('❌ CalendarManager não encontrado!');
            return;
        }
        
        this.parser = new CronogramaParser();
        
        this.allServidores = [];
        this.filteredServidores = [];
        this.loadingProblems = [];
        
        this.currentSort = 'nome';
        this.currentSortDirection = 'asc';
        
        this.currentFilters = {
            age: { min: 18, max: 70 },
            period: { type: 'yearly', start: 2025, end: 2028 },
            search: '',
            urgency: '',
            cargo: '',
            selectedData: null
        };
        this.selectedChartIndex = -1;
        this.currentPage = 'home';
        
        this.fileManager = new FileManager(this);
        this.chartManager = new ChartManager(this);
        this.filterManager = new FilterManager(this);
        this.uiManager = new UIManager(this);
        this.modalManager = new ModalManager(this);
        this.calendarManager = new CalendarManager(this);
        
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.init();
    }

    /**
     * Inicialização
     */
    init() {
        this.uiManager.setupEventListeners();
        this.uiManager.initNavigation();
        this.uiManager.initPeriodTabs();
        this.uiManager.updateProblemsCount();
        this.uiManager.updateLastUpdate();
        this.uiManager.setupThemeIntegration();

        const currentYear = new Date().getFullYear();
        const currentYearElement = document.getElementById('currentCalendarYear');
        if (currentYearElement) {
            currentYearElement.textContent = currentYear;
        }

        setTimeout(async () => {
            await this.fileManager.updateStoredFileIndicators();
            if (!await this.fileManager.tryAutoLoad()) {
                this.showEmptyState();
            }
        }, 250);
        
        this.fileManager.addFileSystemIndicator();
    }

    /**
     * Processar dados do arquivo
     */
    processData(csvData) {
        try {
            const servidores = this.parser.processarDadosCSV(csvData);
            
            this.allServidores = servidores;
            this.filteredServidores = [...this.allServidores];
            this.loadingProblems = [];

            const isLicencaPremio = this.allServidores.length > 0 && 
                                    this.allServidores[0].tipoTabela === 'licenca-premio';

            this.adaptUIForTableType(isLicencaPremio);
            this.filterManager.adaptFiltersForTableType(isLicencaPremio);

            this.updateTable();
            this.updateStats();
            this.uiManager.updateHeaderStatus();
            
            this.chartManager.createUrgencyChart();
            this.chartManager.createTimelineChart();
            
            this.uiManager.updateProblemsCount();
            this.verificarErrosCronograma();

        } catch (error) {
            console.error('❌ Erro ao processar dados:', error);
            alert(`Erro ao processar arquivo: ${error.message}`);
        }
    }

    /**
     * Adaptar UI para tipo de tabela
     */
    adaptUIForTableType(isLicencaPremio) {
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = isLicencaPremio ? 
                'Dashboard - Licenças Prêmio' : 
                'Dashboard - Cronograma de Licenças';
        }

        const ageFilterSection = document.getElementById('ageFilterSection');
        const periodFilterSection = document.getElementById('periodFilterSection');

        if (isLicencaPremio) {
            if (ageFilterSection) ageFilterSection.style.display = 'none';
            if (periodFilterSection) periodFilterSection.style.display = 'block';
        } else {
            if (ageFilterSection) ageFilterSection.style.display = 'block';
            if (periodFilterSection) periodFilterSection.style.display = 'none';
        }
    }

    /**
     * Verificar erros no cronograma
     */
    verificarErrosCronograma() {
        const problemsList = document.getElementById('problemsList');
        if (!problemsList) return;

        problemsList.innerHTML = '';

        if (this.loadingProblems.length === 0) {
            problemsList.innerHTML = '<div class="no-problems"><i class="bi bi-check-circle"></i> Nenhum problema detectado</div>';
            return;
        }

        this.loadingProblems.forEach(problema => {
            const item = document.createElement('div');
            item.className = `problem-item ${problema.tipo}`;
            item.innerHTML = `
                <div class="problem-icon">
                    <i class="bi bi-${problema.tipo === 'erro' ? 'x-circle' : 'exclamation-triangle'}"></i>
                </div>
                <div class="problem-content">
                    <div class="problem-title">${problema.servidor || 'Geral'}</div>
                    <div class="problem-message">${problema.mensagem}</div>
                    ${problema.campo ? `<div class="problem-field">Campo: ${problema.campo}</div>` : ''}
                </div>
            `;
            problemsList.appendChild(item);
        });
    }

    /**
     * Mostrar estado vazio
     */
    showEmptyState() {
        this.uiManager.showEmptyState();
    }

    /**
     * Mostrar notificação de auto-load
     */
    showAutoLoadNotification(fileInfo, callback) {
        this.uiManager.showAutoLoadNotification(fileInfo, callback);
    }

    /**
     * Atualizar tabela
     */
    updateTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Verificar se não há dados carregados
        if (!this.allServidores || this.allServidores.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.5;"></i>
                        <div>
                            <h4 style="margin: 0; color: var(--text-secondary);">Nenhum dado carregado</h4>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">Faça upload de um arquivo CSV ou Excel para começar</p>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(emptyRow);

            const resultCount = document.getElementById('resultCount');
            if (resultCount) {
                resultCount.textContent = '0 resultados';
            }
            return;
        }

        if (this.filteredServidores.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="6" style="text-align: center; color: #666;">Nenhum servidor encontrado</td>';
            tbody.appendChild(emptyRow);
            return;
        }

        // Detectar tipo de tabela
        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        // Adaptar filtros para o tipo de tabela
        this.adaptFiltersForTableType(isLicencaPremio);

        // Atualizar headers da tabela se necessário
        this.updateTableHeaders(isLicencaPremio);

        // Aplicar ordenação
        let sortedServidores = [...this.filteredServidores];
        if (this.sortColumn) {
            sortedServidores.sort((a, b) => {
                let aVal = a[this.sortColumn];
                let bVal = b[this.sortColumn];

                if (this.sortColumn === 'proximaLicencaInicio' || this.sortColumn === 'proximaLicencaFim') {
                    aVal = aVal ? aVal.getTime() : 0;
                    bVal = bVal ? bVal.getTime() : 0;
                }

                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        sortedServidores.forEach(servidor => {
            const row = document.createElement('tr');
            row.className = 'fade-in';

            const nomeEscapado = servidor.nome.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const lotacaoEscapada = (servidor.lotacao || '--').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const cargoEscapado = (servidor.cargo || '--').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

            const formatarPeriodoLicenca = (servidor) => {
                if (servidor.proximaLicencaInicio && servidor.proximaLicencaFim) {
                    const inicio = new Date(servidor.proximaLicencaInicio);
                    const fim = new Date(servidor.proximaLicencaFim);

                    if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
                        const mesesAbrev = [
                            'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                            'jul', 'ago', 'set', 'out', 'nov', 'dez'
                        ];

                        const diaInicio = inicio.getDate();
                        const mesInicio = mesesAbrev[inicio.getMonth()];
                        const anoInicio = inicio.getFullYear();

                        const diaFim = fim.getDate();
                        const mesFim = mesesAbrev[fim.getMonth()];
                        const anoFim = fim.getFullYear();

                        if (anoInicio === anoFim) {
                            return `${diaInicio}/${mesInicio} - ${diaFim}/${mesFim}/${anoInicio}`;
                        }

                        return `${diaInicio}/${mesInicio}/${anoInicio} - ${diaFim}/${mesFim}/${anoFim}`;
                    }
                }

                if (servidor.licencas && servidor.licencas.length > 0) {
                    const primeiraLicenca = servidor.licencas[0];
                    const ultimaLicenca = servidor.licencas[servidor.licencas.length - 1];

                    if (primeiraLicenca.inicio && ultimaLicenca.fim) {
                        const inicio = new Date(primeiraLicenca.inicio);
                        const fim = new Date(ultimaLicenca.fim);

                        if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
                            const mesesAbrev = [
                                'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                                'jul', 'ago', 'set', 'out', 'nov', 'dez'
                            ];

                            const diaInicio = inicio.getDate();
                            const mesInicio = mesesAbrev[inicio.getMonth()];
                            const anoInicio = inicio.getFullYear();

                            const diaFim = fim.getDate();
                            const mesFim = mesesAbrev[fim.getMonth()];
                            const anoFim = fim.getFullYear();

                            if (anoInicio === anoFim) {
                                return `${diaInicio}/${mesInicio} - ${diaFim}/${mesFim}/${anoInicio}`;
                            }

                            return `${diaInicio}/${mesInicio}/${anoInicio} - ${diaFim}/${mesFim}/${anoFim}`;
                        }
                    }
                }

                return '--';
            };

            const periodoLicencaCompleto = formatarPeriodoLicenca(servidor);

            if (isLicencaPremio) {
                row.innerHTML = `
                    <td><strong>${nomeEscapado}</strong></td>
                    <td><span class="cargo-badge">${cargoEscapado}</span></td>
                    <td>${periodoLicencaCompleto}</td>
                    <td class="actions">
                        <button class="btn-icon" data-servidor-nome="${nomeEscapado}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
            } else {
                row.innerHTML = `
                    <td><strong>${nomeEscapado}</strong></td>
                    <td>${servidor.idade}</td>
                    <td><span class="lotacao-badge">${lotacaoEscapada}</span></td>
                    <td>${periodoLicencaCompleto}</td>
                    <td><span class="urgency-badge urgency-${servidor.nivelUrgencia.toLowerCase()}">${servidor.nivelUrgencia}</span></td>
                    <td class="actions">
                        <button class="btn-icon" data-servidor-nome="${nomeEscapado}" title="Ver detalhes">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
            }

            tbody.appendChild(row);
        });

        // Deduplicação visual
        try {
            const allRows = Array.from(tbody.querySelectorAll('tr'));
            const nameMap = new Map();

            allRows.forEach(r => {
                const btn = r.querySelector('.btn-icon[data-servidor-nome]');
                if (!btn) return;
                const name = btn.getAttribute('data-servidor-nome');
                const info = nameMap.get(name) || { firstRow: null, count: 0, rows: [] };
                info.count++;
                info.rows.push(r);
                if (!info.firstRow) info.firstRow = r;
                nameMap.set(name, info);
            });

            nameMap.forEach(info => {
                if (info.count > 1) {
                    const firstRow = info.firstRow;
                    const strong = firstRow.querySelector('td strong');
                    if (strong && !strong.querySelector('.duplicate-inline')) {
                        const span = document.createElement('span');
                        span.className = 'duplicate-inline';
                        span.textContent = ` (${info.count})`;
                        span.style.cssText = 'font-size:0.8rem;color:var(--text-tertiary);padding-left:0.25rem;font-weight:600';
                        strong.appendChild(span);
                    }

                    info.rows.forEach((r, idx) => {
                        if (idx === 0) return;
                        r.style.display = 'none';
                        r.classList.add('duplicate-hidden');
                    });
                }
            });
        } catch (e) {
            console.error('Erro ao aplicar deduplicação visual:', e);
        }

        const resultCountElement = document.getElementById('resultCount');
        if (resultCountElement) {
            resultCountElement.textContent = `${this.filteredServidores.length} resultados`;
        }
    }

    updateTableHeaders(isLicencaPremio) {
        const tableHead = document.querySelector('#servidoresTable thead tr');
        if (!tableHead) return;

        if (isLicencaPremio) {
            tableHead.innerHTML = `
                <th>Nome</th>
                <th>Cargo</th>
                <th>Período de Licença</th>
                <th>Ações</th>
            `;
        } else {
            tableHead.innerHTML = `
                <th>Nome</th>
                <th>Idade</th>
                <th>Lotação</th>
                <th>Próxima Licença</th>
                <th>Urgência</th>
                <th>Ações</th>
            `;
        }
    }

    adaptFiltersForTableType(isLicencaPremio) {
        const originalFilters = document.querySelectorAll('.original-filters');
        const licencaFilters = document.querySelectorAll('.licenca-filters');

        if (isLicencaPremio) {
            originalFilters.forEach(filter => filter.style.display = 'none');
            licencaFilters.forEach(filter => filter.style.display = 'block');
        } else {
            originalFilters.forEach(filter => filter.style.display = 'block');
            licencaFilters.forEach(filter => filter.style.display = 'none');
        }
    }

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        document.querySelectorAll('.sortable i').forEach(i => {
            i.className = 'bi bi-arrow-up-down';
        });

        const currentTh = document.querySelector(`[data-column="${column}"] i`);
        if (currentTh) {
            if (this.sortDirection === 'asc') {
                currentTh.className = 'bi bi-arrow-up';
            } else {
                currentTh.className = 'bi bi-arrow-down';
            }
        }

        this.updateTable();
    }

    /**
     * Atualizar estatísticas
     */
    updateStats() {
        if (!this.allServidores || this.allServidores.length === 0) {
            document.getElementById('totalServidores').textContent = '0';
            const totalLicencasFuturasElement = document.getElementById('totalLicencasFuturas');
            if (totalLicencasFuturasElement) {
                totalLicencasFuturasElement.textContent = '0';
            }

            const criticalCard = document.getElementById('criticalCount');
            const highCard = document.getElementById('highCount');
            const moderateCard = document.getElementById('moderateCount');
            const errorCard = document.getElementById('errorCount');

            if (criticalCard) criticalCard.textContent = '0';
            if (highCard) highCard.textContent = '0';
            if (moderateCard) moderateCard.textContent = '0';
            if (errorCard) errorCard.textContent = '0';

            return;
        }

        const isLicencaPremio = this.allServidores.length > 0 && this.allServidores[0].tipoTabela === 'licenca-premio';

        document.getElementById('totalServidores').textContent = this.allServidores.length;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const licencasFuturas = this.allServidores.reduce((total, servidor) => {
            const licencasFuturasServidor = servidor.licencas.filter(licenca => {
                const licenseStart = licenca.inicio;
                return licenseStart >= hoje;
            }).length;

            return total + licencasFuturasServidor;
        }, 0);

        const totalLicencasFuturasElement = document.getElementById('totalLicencasFuturas');
        if (totalLicencasFuturasElement) {
            totalLicencasFuturasElement.textContent = licencasFuturas;
        }

        const statLabel = totalLicencasFuturasElement?.parentElement.querySelector('.stat-label');
        if (statLabel) {
            statLabel.textContent = isLicencaPremio ? 'Licenças Prêmio' : 'Licenças Futuras';
        }

        this.updateUrgencyCards();
    }

    updateUrgencyCards() {
        const urgencyCounts = {
            'Crítico': 0,
            'Alto': 0,
            'Moderado': 0,
            'Baixo': 0
        };
        
        this.filteredServidores.forEach(servidor => {
            if (servidor.nivelUrgencia) {
                const nivel = servidor.nivelUrgencia.toLowerCase();
                if (nivel.includes('crítico') || nivel.includes('critico')) urgencyCounts['Crítico']++;
                else if (nivel.includes('alto') || nivel.includes('alta')) urgencyCounts['Alto']++;
                else if (nivel.includes('moderado') || nivel.includes('moderada')) urgencyCounts['Moderado']++;
                else urgencyCounts['Baixo']++;
            } else {
                const ultimaLicenca = servidor.licencas && servidor.licencas.length > 0 
                    ? servidor.licencas[servidor.licencas.length - 1].fim 
                    : null;
                    
                if (!ultimaLicenca) {
                    urgencyCounts['Baixo']++;
                } else {
                    const idadeAposentadoria = (servidor.sexo === 'M' || servidor.sexo === 'MASC') ? 65 : 62;
                    const anoNascimento = new Date().getFullYear() - Math.floor(servidor.idade || 0);
                    const anoAposentadoria = anoNascimento + idadeAposentadoria;
                    const dataAposentadoria = new Date(anoAposentadoria, 0, 1);
                    
                    const anosEntreLicencaEAposentadoria = (dataAposentadoria - ultimaLicenca) / (365 * 24 * 60 * 60 * 1000);
                    
                    if (anosEntreLicencaEAposentadoria <= 2) urgencyCounts['Crítico']++;
                    else if (anosEntreLicencaEAposentadoria <= 5) urgencyCounts['Alto']++;
                    else urgencyCounts['Moderado']++;
                }
            }
        });

        const criticalCard = document.getElementById('criticalCount');
        const highCard = document.getElementById('highCount');
        const moderateCard = document.getElementById('moderateCount');

        if (criticalCard) criticalCard.textContent = urgencyCounts['Crítico'];
        if (highCard) highCard.textContent = urgencyCounts['Alto'];
        if (moderateCard) moderateCard.textContent = urgencyCounts['Moderado'];

        this.updateProblemsCount();
    }

    /**
     * Atualizar contagem de problemas
     */
    updateProblemsCount() {
        const problemsCount = this.loadingProblems.length;
        const errorCountEl = document.getElementById('errorCount');
        if (errorCountEl) {
            errorCountEl.textContent = problemsCount;
        }
        
        const errorCard = document.querySelector('.stat-card.critical');
        if (errorCard) {
            if (problemsCount > 0) {
                errorCard.classList.add('has-errors');
                errorCard.style.cursor = 'pointer';
            } else {
                errorCard.classList.remove('has-errors');
                errorCard.style.cursor = 'default';
            }
        }
    }

    /**
     * Adicionar problema de carregamento
     */
    addLoadingProblem(name, error, details) {
        try {
            const key = `${name}::${error}::${(details || '')}`;
            const exists = this.loadingProblems.some(p => `${p.name}::${p.error}::${(p.details || '')}` === key);
            if (!exists) {
                this.loadingProblems.push({ name, error, details: details || '' });
                this.updateProblemsCount();
            }
        } catch (e) {
            this.loadingProblems.push({ name, error, details: details || '' });
            this.updateProblemsCount();
        }
    }

    /**
     * Limpar problemas de carregamento
     */
    clearLoadingProblems() {
        this.loadingProblems = [];
        this.updateProblemsCount();
    }

    /**
     * Atualizar cards de urgência
     */
    updateUrgencyCards() {
        const urgencyCounts = {
            'Crítica': 0,
            'Alta': 0,
            'Média': 0,
            'Moderada': 0,
            'Baixa': 0
        };

        this.filteredServidores.forEach(s => {
            const urgency = s.nivelUrgencia || 'Baixa';
            urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;
        });

        // Mapear para os IDs corretos do HTML
        const criticalEl = document.getElementById('criticalCount');
        const highEl = document.getElementById('highCount');
        const moderateEl = document.getElementById('moderateCount');
        
        if (criticalEl) criticalEl.textContent = urgencyCounts['Crítica'] || 0;
        if (highEl) highEl.textContent = urgencyCounts['Alta'] || 0;
        if (moderateEl) moderateEl.textContent = (urgencyCounts['Média'] || 0) + (urgencyCounts['Moderada'] || 0);
    }

    /**
     * Obter dados para gráfico de urgência
     */
    getUrgencyData() {
        const urgencyCounts = {};
        
        this.filteredServidores.forEach(servidor => {
            const urgency = servidor.nivelUrgencia || 'Indefinida';
            urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;
        });

        const labels = Object.keys(urgencyCounts);
        const data = Object.values(urgencyCounts);
        const colors = this.chartManager.getFixedColorsForLabels(labels);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        };
    }

    /**
     * Obter dados para gráfico de cargos
     */
    getCargoData() {
        const cargoCounts = {};
        
        this.filteredServidores.forEach(servidor => {
            const cargo = servidor.cargo || 'Não informado';
            cargoCounts[cargo] = (cargoCounts[cargo] || 0) + 1;
        });

        const sortedCargos = Object.entries(cargoCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            labels: sortedCargos.map(c => c[0]),
            datasets: [{
                data: sortedCargos.map(c => c[1]),
                backgroundColor: sortedCargos.map((_, i) => {
                    const CARGO_COLORS = this.chartManager.constructor.CARGO_COLORS || [
                        '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#84cc16',
                        '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'
                    ];
                    return CARGO_COLORS[i % CARGO_COLORS.length];
                }),
                borderWidth: 0
            }]
        };
    }

    applyLicencaFilters() {
        const rawMes = document.getElementById('mesFilter')?.value?.trim() || '';
        const mesFilter = (rawMes && rawMes.toLowerCase() === 'all') ? '' : rawMes;
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase().trim() || '';

        if (!mesFilter && !searchTerm && !this.currentFilters.cargo) {
            this.filteredServidores = [...this.allServidores];
        } else {
            this.filteredServidores = this.allServidores.filter(servidor => {
                if (searchTerm && !this.matchesSearch(servidor, searchTerm)) {
                    return false;
                }

                if (this.currentFilters.cargo && servidor.cargo !== this.currentFilters.cargo) {
                    return false;
                }

                if (mesFilter && !this.matchesMonth(servidor, mesFilter)) {
                    return false;
                }

                return true;
            });
        }

        this.updateTable();
        this.updateStats();
        this.chartManager.updateTimelineChart();
    }

    applyAllFilters() {
        if (!this.allServidores || this.allServidores.length === 0) {
            this.filteredServidores = [];
            this.updateStats();
            return;
        }

        const filters = this.currentFilters;

        this.filteredServidores = this.allServidores.filter(servidor => {
            if (servidor.idade < filters.age.min || servidor.idade > filters.age.max) {
                return false;
            }

            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const serverName = servidor.nome.toLowerCase();
                const serverLotacao = servidor.lotacao?.toLowerCase() || '';
                const serverCargo = servidor.cargo?.toLowerCase() || '';

                if (!serverName.includes(searchTerm) &&
                    !serverLotacao.includes(searchTerm) &&
                    !serverCargo.includes(searchTerm)) {
                    return false;
                }
            }

            if (filters.urgency && servidor.nivelUrgencia && servidor.nivelUrgencia.toLowerCase() !== filters.urgency) {
                return false;
            }

            if (servidor.licencas && servidor.licencas.length > 0) {
                if (filters.period.type === 'yearly' && (filters.period.start || filters.period.end)) {
                    const hasLicenseInPeriod = servidor.licencas.some(licenca => {
                        if (!licenca.inicio) return false;
                        const year = licenca.inicio.getFullYear();
                        return year >= filters.period.start && year <= filters.period.end;
                    });
                    if (!hasLicenseInPeriod) return false;

                } else if (filters.period.type === 'monthly' && filters.period.year) {
                    const hasLicenseInPeriod = servidor.licencas.some(licenca => {
                        if (!licenca.inicio) return false;
                        const year = licenca.inicio.getFullYear();
                        const month = licenca.inicio.getMonth();
                        return year === filters.period.year &&
                            month >= filters.period.monthStart &&
                            month <= filters.period.monthEnd;
                    });
                    if (!hasLicenseInPeriod) return false;

                } else if (filters.period.type === 'daily' && filters.period.year !== undefined && filters.period.month !== undefined) {
                    const hasLicenseInPeriod = servidor.licencas.some(licenca => {
                        if (!licenca.inicio) return false;
                        const year = licenca.inicio.getFullYear();
                        const month = licenca.inicio.getMonth();
                        return year === filters.period.year && month === filters.period.month;
                    });
                    if (!hasLicenseInPeriod) return false;
                }
            }

            return true;
        });

        this.updateStats();

        if (this.uiManager && this.uiManager.currentPage === 'home') {
            this.chartManager.updateUrgencyChart();
            this.updateTable();
        } else if (this.uiManager && this.uiManager.currentPage === 'calendar') {
            this.calendarManager.updateYearlyHeatmap();
        } else if (this.uiManager && this.uiManager.currentPage === 'timeline') {
            this.chartManager.updateTimelineChart();
        }
    }

    matchesMonth(servidor, targetMonth) {
        if (!servidor.proximaLicencaInicio || !servidor.proximaLicencaFim) {
            return false;
        }

        const months = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        const targetMonthIndex = months.indexOf(targetMonth.toLowerCase());
        if (targetMonthIndex === -1) return false;

        const inicio = servidor.proximaLicencaInicio;
        const fim = servidor.proximaLicencaFim;

        const currentDate = new Date(inicio);
        const endDate = new Date(fim);

        while (currentDate <= endDate) {
            if (currentDate.getMonth() === targetMonthIndex) {
                return true;
            }

            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1);
        }

        return false;
    }

    matchesSearch(servidor, searchTerm) {
        const searchableFields = [
            servidor.nome,
            servidor.cargo,
            servidor.lotacao,
            servidor.urgencia || servidor.nivelUrgencia,
            servidor.subsecretaria,
            servidor.superintendencia
        ];

        if (servidor.dadosOriginais) {
            const extras = Object.values(servidor.dadosOriginais).map(v => v && v.toString()).filter(Boolean);
            searchableFields.push(...extras);
        }

        return searchableFields.filter(f => f).some(field =>
            field.toString().toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Obter dados para timeline
     */
    getTimelineData() {
        const viewType = document.getElementById('timelineView') ?
            document.getElementById('timelineView').value : 'monthly';
        const selectedYear = parseInt(document.getElementById('timelineYear')?.value) || new Date().getFullYear();
        const selectedMonth = parseInt(document.getElementById('timelineMonth')?.value) || new Date().getMonth();
        const data = {};

        const isLicencaPremio = this.filteredServidores.length > 0 && this.filteredServidores[0].tipoTabela === 'licenca-premio';
        
        let totalLicenses = 0;
        let filteredLicenses = 0;

        // Criar esqueleto completo dos períodos com valor 0
        if (viewType === 'monthly') {
            for (let month = 0; month < 12; month++) {
                const key = `${selectedYear}-${month.toString().padStart(2, '0')}`;
                data[key] = {
                    count: 0,
                    period: { type: 'month', year: selectedYear, month },
                    servidores: new Set()
                };
            }
        } else if (viewType === 'daily') {
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const key = day.toString();
                data[key] = {
                    count: 0,
                    period: { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear },
                    servidores: new Set()
                };
            }
        }

        this.filteredServidores.forEach(servidor => {
            servidor.licencas.forEach(licenca => {
                totalLicenses++;
                let key, period;

                if (viewType === 'yearly') {
                    const year = licenca.inicio.getFullYear();
                    key = year.toString();
                    period = { type: 'year', value: year };
                    filteredLicenses++;

                    if (!data[key]) data[key] = { count: 0, period, servidores: new Set() };
                    data[key].servidores.add(servidor.nome);
                } else if (viewType === 'daily') {
                    const licStart = new Date(licenca.inicio);
                    const licEnd = licenca.fim ? new Date(licenca.fim) : new Date(licenca.inicio);

                    licStart.setHours(0, 0, 0, 0);
                    licEnd.setHours(0, 0, 0, 0);

                    const monthStart = new Date(selectedYear, selectedMonth, 1);
                    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

                    const includeStart = licStart > monthStart ? licStart : monthStart;
                    const includeEnd = licEnd < monthEnd ? licEnd : monthEnd;

                    if (includeStart > includeEnd) return;

                    filteredLicenses++;

                    const currentDay = new Date(includeStart);
                    while (currentDay <= includeEnd) {
                        const day = currentDay.getDate();
                        const dayKey = day.toString();
                        const dayPeriod = { type: 'day', date: new Date(selectedYear, selectedMonth, day), day, month: selectedMonth, year: selectedYear };

                        if (!data[dayKey]) data[dayKey] = { count: 0, period: dayPeriod, servidores: new Set() };
                        data[dayKey].servidores.add(servidor.nome);

                        currentDay.setDate(currentDay.getDate() + 1);
                    }
                } else { // monthly
                    const licStart = new Date(licenca.inicio);
                    const licEnd = licenca.fim ? new Date(licenca.fim) : new Date(licenca.inicio);
                    
                    licStart.setHours(0, 0, 0, 0);
                    licEnd.setHours(0, 0, 0, 0);

                    const currentMonth = new Date(licStart);
                    let addedToAnyMonth = false;
                    
                    while (currentMonth <= licEnd) {
                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();
                        
                        if (year === selectedYear) {
                            const monthStart = new Date(year, month, 1);
                            const monthEnd = new Date(year, month + 1, 0);
                            
                            if (licStart <= monthEnd && licEnd >= monthStart) {
                                key = `${year}-${month.toString().padStart(2, '0')}`;
                                period = { type: 'month', year, month };
                                
                                if (!data[key]) data[key] = { count: 0, period, servidores: new Set() };
                                data[key].servidores.add(servidor.nome);
                                addedToAnyMonth = true;
                            }
                        }
                        
                        currentMonth.setMonth(currentMonth.getMonth() + 1);
                        currentMonth.setDate(1);
                    }
                    
                    if (addedToAnyMonth) {
                        filteredLicenses++;
                    }
                }
            });
        });

        const sortedKeys = Object.keys(data).sort((a, b) => {
            if (viewType === 'daily') {
                return parseInt(a) - parseInt(b);
            } else if (viewType === 'yearly') {
                return parseInt(a) - parseInt(b);
            } else if (viewType === 'monthly') {
                return a.localeCompare(b);
            }
            return a.localeCompare(b);
        });

        const labels = sortedKeys.map(key => {
            const item = data[key];
            if (item.period.type === 'year') {
                return item.period.value.toString();
            } else if (item.period.type === 'day') {
                return item.period.day.toString();
            } else if (item.period.type === 'month') {
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                return `${monthNames[item.period.month]}/${item.period.year}`;
            }
            return key;
        });

        return {
            labels,
            data: sortedKeys.map(key => data[key].servidores.size),
            periods: sortedKeys.map(key => data[key].period),
            servidoresData: sortedKeys.map(key => Array.from(data[key].servidores))
        };
    }

    /**
     * Atualizar gráfico de urgência
     */
    updateUrgencyChart() {
        this.chartManager.updateUrgencyChart();
    }

    /**
     * Atualizar destaque nos gráficos
     */
    updateChartHighlight() {
        this.chartManager.updateChartHighlight();
    }

    /**
     * Filtrar tabela por urgência
     */
    filterTableByUrgency(urgencyLevel, chartIndex) {
        this.currentFilters.urgency = urgencyLevel.toLowerCase();
        this.selectedChartIndex = chartIndex;
        this.applyAllFilters();
        this.updateChartHighlight();
    }

    /**
     * Filtrar tabela por cargo
     */
    filterTableByCargo(cargo, chartIndex) {
        this.currentFilters.cargo = cargo;
        this.selectedChartIndex = chartIndex;
        
        const isLicencaPremio = this.allServidores.length > 0 && 
                               this.allServidores[0].tipoTabela === 'licenca-premio';
        
        if (isLicencaPremio) {
            this.applyLicencaFilters();
        } else {
            this.applyAllFilters();
        }
        
        this.updateChartHighlight();
    }

    clearCargoFilter() {
        this.currentFilters.cargo = '';
        this.selectedChartIndex = -1;
        
        const isLicencaPremio = this.allServidores.length > 0 && 
                               this.allServidores[0].tipoTabela === 'licenca-premio';
        
        if (isLicencaPremio) {
            this.applyLicencaFilters();
        } else {
            this.applyAllFilters();
        }
        
        this.updateChartHighlight();
    }

    updateChartHighlight() {
        if (!this.chartManager.charts.urgency) return;

        const chart = this.chartManager.charts.urgency;
        const colors = this.chartManager.originalChartColors || 
                      chart.data.datasets[0].backgroundColor.map(c => c);

        if (this.selectedChartIndex >= 0) {
            chart.data.datasets[0].backgroundColor = colors.map((color, i) => 
                i === this.selectedChartIndex ? color : color.replace('1)', '0.3)')
            );
        } else {
            chart.data.datasets[0].backgroundColor = colors.slice();
        }

        chart.update();
    }

    /**
     * Atualizar estatísticas da timeline
     */
    updateTimelineStats(timelineData) {
        const totalLicenses = timelineData.data.reduce((sum, val) => sum + val, 0);
        const activeServers = new Set();

        this.filteredServidores.forEach(servidor => {
            if (servidor.licencas.length > 0) {
                activeServers.add(servidor.nome);
            }
        });

        const maxValue = Math.max(...timelineData.data);
        const peakIndex = timelineData.data.indexOf(maxValue);
        const peakPeriod = timelineData.labels[peakIndex] || '-';
        const averageLicenses = totalLicenses / timelineData.data.length || 0;

        const selectedView = document.getElementById('timelineView')?.value || 'monthly';
        let periodLabel = 'Média por Período';
        switch (selectedView) {
            case 'daily':
                periodLabel = 'Média por Dia';
                break;
            case 'monthly':
                periodLabel = 'Média por Mês';
                break;
            case 'yearly':
                periodLabel = 'Média por Ano';
                break;
            default:
                periodLabel = 'Média por Período';
        }

        this.currentTimelineStats = {
            totalLicenses,
            activeServersCount: activeServers.size,
            peakPeriod,
            averageLicenses: averageLicenses.toFixed(1),
            periodLabel
        };
    }

    /**
     * Atualizar legenda de urgência
     */
    updateUrgencyLegend(urgencyData) {
        // Atualizar elementos da legenda se existirem
        const urgencyKeys = ['critical', 'high', 'moderate', 'low'];
        const urgencyLabels = ['Crítica', 'Alta', 'Moderada', 'Baixa'];

        urgencyKeys.forEach((key, index) => {
            const legendCountElement = document.getElementById(`legend${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (legendCountElement && urgencyData.counts) {
                legendCountElement.textContent = urgencyData.counts[urgencyLabels[index]] || 0;
            }
        });
    }

    /**
     * Filtrar por período (chamado ao clicar no gráfico de timeline)
     */
    filterByPeriod(period, label) {
        this.filterManager.filterByPeriod(period, label);
    }
    
    /**
     * Ordenar tabela por coluna
     */
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.updateTable();
    }
    
    /**
     * Obter nome do mês
     */
    getMonthName(monthIndex) {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return months[monthIndex];
    }
    
    /**
     * Formatar data
     */
    formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    }

    /**
     * Mostrar detalhes do servidor
     */
    showServidorDetails(nomeServidor) {
        this.uiManager.showServidorDetails(nomeServidor);
    }

    /**
     * Obter classe de urgência
     */
    getUrgencyClass(urgencia) {
        if (!urgencia) return 'urgency-low';
        return `urgency-${urgencia.toLowerCase()}`;
    }

    setAgePreset(min, max) {
        document.getElementById('minAge').value = min;
        document.getElementById('maxAge').value = max;
        this.currentFilters.age = { min, max };
        this.applyAllFilters();
    }

    /**
     * Escapar HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Formatar data brasileira
     */
    formatDateBR(data) {
        if (!data) return '-';
        const d = new Date(data);
        return d.toLocaleDateString('pt-BR');
    }

    /**
     * Calcular urgência do servidor
     */
    calcularUrgencia(servidor) {
        if (!servidor || !servidor.licencas || servidor.licencas.length === 0) {
            return 'MODERADA';
        }

        const hoje = new Date();
        const proximaLicenca = servidor.licencas.find(l => l.inicio > hoje);
        
        if (!proximaLicenca) return 'MODERADA';

        const diasRestantes = Math.ceil((proximaLicenca.inicio - hoje) / (1000 * 60 * 60 * 24));

        if (diasRestantes <= 30) return 'CRÍTICA';
        if (diasRestantes <= 90) return 'ALTA';
        return 'MODERADA';
    }

    /**
     * Calcular dias restantes até próxima licença
     */
    calcularDiasRestantes(servidor) {
        if (!servidor || !servidor.licencas || servidor.licencas.length === 0) {
            return 9999;
        }

        const hoje = new Date();
        const proximaLicenca = servidor.licencas.find(l => l.inicio > hoje);
        
        if (!proximaLicenca) return 9999;

        return Math.ceil((proximaLicenca.inicio - hoje) / (1000 * 60 * 60 * 24));
    }

    /**
     * Atualizar estatísticas da timeline
     */
    updateTimelineStats(timelineData) {
    }

    /**
     * Atualizar legenda de urgência
     */
    updateUrgencyLegend(urgencyData) {
        const criticalEl = document.getElementById('criticalCount');
        const highEl = document.getElementById('highCount');
        const moderateEl = document.getElementById('moderateCount');
        
        if (criticalEl && urgencyData.counts) criticalEl.textContent = urgencyData.counts['Crítica'] || 0;
        if (highEl && urgencyData.counts) highEl.textContent = urgencyData.counts['Alta'] || 0;
        if (moderateEl && urgencyData.counts) moderateEl.textContent = urgencyData.counts['Moderada'] || 0;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dashboard = new DashboardMultiPage();
    } catch (error) {
        console.error('❌ Erro ao criar dashboard:', error);
    }
});
