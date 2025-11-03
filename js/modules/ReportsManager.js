/**
 * ReportsManager.js
 * 
 * Sistema de geração de relatórios profissionais
 * 
 * Funcionalidades:
 * - Página dedicada de relatórios
 * - Templates pré-configurados
 * - Pré-visualização antes de exportar
 * - Exportação para PDF, Excel e impressão
 * - Relatórios customizáveis
 * - Agendamento de relatórios periódicos
 * - Histórico de relatórios gerados
 * 
 * @author Dashboard Licenças Premium
 * @version 4.0.0
 */

class ReportsManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        
        // Templates de relatórios
        this.templates = {
            LICENCAS_MES: {
                id: 'licencas_mes',
                name: 'Licenças do Mês',
                description: 'Lista de servidores com licenças agendadas para o mês atual',
                icon: 'bi-calendar-month',
                category: 'Cronograma'
            },
            APOSENTADORIAS_PROXIMAS: {
                id: 'aposentadorias_proximas',
                name: 'Aposentadorias Próximas',
                description: 'Servidores próximos à aposentadoria compulsória (próximos 12 meses)',
                icon: 'bi-hourglass-split',
                category: 'Planejamento'
            },
            URGENCIAS_CRITICAS: {
                id: 'urgencias_criticas',
                name: 'Urgências Críticas',
                description: 'Servidores com urgência crítica ou alta que requerem atenção imediata',
                icon: 'bi-exclamation-triangle',
                category: 'Alertas'
            },
            LICENCAS_VENCIDAS: {
                id: 'licencas_vencidas',
                name: 'Licenças Vencidas',
                description: 'Relatório de licenças vencidas ou próximas ao vencimento',
                icon: 'bi-clock-history',
                category: 'Alertas'
            },
            CONSOLIDADO_GERAL: {
                id: 'consolidado_geral',
                name: 'Consolidado Geral',
                description: 'Visão geral completa com estatísticas, gráficos e tabelas',
                icon: 'bi-file-earmark-bar-graph',
                category: 'Completo'
            },
            POR_CARGO: {
                id: 'por_cargo',
                name: 'Relatório por Cargo',
                description: 'Análise agrupada por cargo com estatísticas detalhadas',
                icon: 'bi-briefcase',
                category: 'Análise'
            },
            POR_LOTACAO: {
                id: 'por_lotacao',
                name: 'Relatório por Lotação',
                description: 'Análise agrupada por lotação/departamento',
                icon: 'bi-building',
                category: 'Análise'
            },
            TIMELINE_ANUAL: {
                id: 'timeline_anual',
                name: 'Timeline Anual',
                description: 'Cronograma visual de licenças ao longo do ano',
                icon: 'bi-calendar3',
                category: 'Cronograma'
            },
            IMPACTO_OPERACIONAL: {
                id: 'impacto_operacional',
                name: 'Impacto Operacional',
                description: 'Análise de impacto das ausências na operação',
                icon: 'bi-graph-down',
                category: 'Análise'
            }
        };
        
        // Página de relatórios
        this.reportsPage = null;
        this.previewContainer = null;
        this.currentReport = null;
        
        // Histórico
        this.reportHistory = [];
        
        this.init();
    }

    /**
     * Inicializa o gerenciador de relatórios
     */
    async init() {
        console.log('📊 Inicializando ReportsManager...');
        
        try {
            // Cria página de relatórios
            this.createReportsPage();
            
            // Carrega histórico
            this.loadHistory();
            
            // Registra listeners
            this.registerListeners();
            
            console.log('✅ ReportsManager inicializado');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar ReportsManager:', error);
        }
    }
    
    /**
     * Cria página de relatórios
     * NOTA: A página de relatórios é gerenciada pelo Premium Builder
     */
    createReportsPage() {
        // Verifica se já existe no HTML (geralmente existe - criado pelo index.html)
        const existing = document.getElementById('reportsPage');
        if (existing) {
            console.log('📄 Página de relatórios já existe no HTML, usando existente');
            this.reportsPage = existing;
            this.setupExistingPageListeners();
            return;
        }

        // Fallback: criar div vazio se não existir no HTML
        // O Premium Builder irá popular esta página quando for aberto
        this.reportsPage = document.createElement('div');
        this.reportsPage.id = 'reportsPage';
        this.reportsPage.className = 'reports-page page-content';
        this.reportsPage.style.display = 'none';

        document.body.appendChild(this.reportsPage);

        console.log('📄 Página de relatórios criada (vazia - será populada pelo Premium Builder)');
    }
    
    /**
     * Configura listeners na página de relatórios existente do HTML
     */
    setupExistingPageListeners() {
        console.log('📄 Configurando listeners na página de relatórios existente');
        
        // Atualiza estatísticas
        this.updateReportStats();
        
        // Configura listeners dos botões de template
        document.querySelectorAll('[data-template]').forEach(card => {
            const selectBtn = card.querySelector('.btn-select-template');
            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    const templateId = card.getAttribute('data-template');
                    this.generateReportFromHTML(templateId);
                });
            }
        });
        
        // Listener para fechar modal (botão X)
        const closeModalBtn = document.getElementById('closeReportModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closePreview();
            });
        }
        
        // Listener para botão Cancelar no footer do modal
        const cancelModalBtn = document.getElementById('cancelReportModalBtn');
        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closePreview();
            });
        }
        
        // Fechar ao clicar no overlay (fora do modal)
        const modalOverlay = document.getElementById('reportConfigModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target.id === 'reportConfigModal') {
                    this.closePreview();
                }
            });
        }
        
        console.log('✅ Listeners configurados na página existente');
    }
    
    /**
     * Gera relatório a partir dos templates HTML
     */
    generateReportFromHTML(templateId) {
        console.log(`📊 Gerando relatório: ${templateId}`);
        
        // Mapeia template HTML para template interno (lowercase_underscore para o switch-case)
        const templateMap = {
            'executive': 'licencas_mes',
            'complete': 'consolidado_geral',
            'urgency': 'urgencias_criticas',
            'department': 'por_lotacao'
        };
        
        const mappedTemplate = templateMap[templateId] || templateId;
        
        // Verificar se template existe (usando UPPERCASE para this.templates)
        const templateKey = mappedTemplate.toUpperCase();
        if (this.templates[templateKey]) {
            this.generateReport(mappedTemplate);
        } else {
            console.warn(`Template não encontrado: ${templateId}`);
            if (this.dashboard.notificationManager && typeof this.dashboard.notificationManager.showToast === 'function') {
                this.dashboard.notificationManager.showToast({
                    title: 'Aviso',
                    message: 'Template não disponível no momento',
                    priority: 'high',
                    icon: 'bi-exclamation-circle'
                });
            } else {
                alert('Template não disponível no momento');
            }
        }
    }
    
    /**
     * Atualiza estatísticas da página de relatórios
     */
    updateReportStats() {
        const totalEl = document.getElementById('reportTotalServidores');
        const filteredEl = document.getElementById('reportFilteredServidores');
        
        if (totalEl && this.dashboard.allServidores) {
            totalEl.textContent = this.dashboard.allServidores.length;
        }
        
        if (filteredEl && this.dashboard.filteredServidores) {
            filteredEl.textContent = this.dashboard.filteredServidores.length;
        }
    }
    
    /**
     * Renderiza cards de templates
     */
    renderTemplateCards() {
        const categories = [...new Set(Object.values(this.templates).map(t => t.category))];
        
        let html = '';
        
        categories.forEach(category => {
            const templates = Object.values(this.templates).filter(t => t.category === category);
            
            html += `
                <div class="template-category">
                    <h4 class="category-title">${category}</h4>
                    <div class="template-cards">
                        ${templates.map(template => `
                            <div class="template-card" data-template-id="${template.id}">
                                <div class="template-icon">
                                    <i class="bi ${template.icon}"></i>
                                </div>
                                <div class="template-info">
                                    <h5>${template.name}</h5>
                                    <p>${template.description}</p>
                                </div>
                                <button class="btn btn-primary btn-generate" data-template-id="${template.id}">
                                    <i class="bi bi-play-fill me-1"></i>Gerar
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        return html;
    }
    
    /**
     * Setup listeners dos templates
     */
    setupTemplateListeners() {
        document.querySelectorAll('.btn-generate').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.target.closest('.btn-generate').dataset.templateId;
                this.generateReport(templateId);
            });
        });
    }
    
    /**
     * Gera relatório
     */
    async generateReport(templateId) {
        console.log(`📊 Gerando relatório: ${templateId}`);
        
        if (!this.dashboard.allServidores || this.dashboard.allServidores.length === 0) {
            alert('Nenhum dado carregado. Por favor, importe um arquivo primeiro.');
            return;
        }
        
        // Mostra loading
        this.showLoading('Gerando relatório...');
        
        try {
            // Aguarda processamento
            await new Promise(resolve => setTimeout(resolve, 500));
            
            let reportData;
            
            switch (templateId) {
                case 'licencas_mes':
                    reportData = this.generateLicencasMesReport();
                    break;
                case 'aposentadorias_proximas':
                    reportData = this.generateAposentadoriasProximasReport();
                    break;
                case 'urgencias_criticas':
                    reportData = this.generateUrgenciasCriticasReport();
                    break;
                case 'licencas_vencidas':
                    reportData = this.generateLicencasVencidasReport();
                    break;
                case 'consolidado_geral':
                    reportData = this.generateConsolidadoGeralReport();
                    break;
                case 'por_cargo':
                    reportData = this.generatePorCargoReport();
                    break;
                case 'por_lotacao':
                    reportData = this.generatePorLotacaoReport();
                    break;
                case 'timeline_anual':
                    reportData = this.generateTimelineAnualReport();
                    break;
                case 'impacto_operacional':
                    reportData = this.generateImpactoOperacionalReport();
                    break;
                default:
                    throw new Error(`Template desconhecido: ${templateId}`);
            }
            
            // Salva relatório atual
            this.currentReport = {
                id: this.generateId(),
                templateId: templateId,
                template: this.templates[templateId.toUpperCase()],
                data: reportData,
                generatedAt: Date.now()
            };
            
            // Adiciona ao histórico
            this.addToHistory(this.currentReport);
            
            // Mostra preview
            this.showPreview(this.currentReport);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            this.hideLoading();
            alert('Erro ao gerar relatório. Veja o console para detalhes.');
        }
    }
    
    /**
     * Gera relatório de licenças do mês
     */
    generateLicencasMesReport() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const servidoresComLicencaMes = this.dashboard.allServidores.filter(servidor => {
            if (!servidor.licencas || servidor.licencas.length === 0) return false;
            
            return servidor.licencas.some(licenca => {
                if (!licenca.dataInicio) return false;
                const dataInicio = new Date(licenca.dataInicio);
                return dataInicio.getMonth() === currentMonth && dataInicio.getFullYear() === currentYear;
            });
        });
        
        return {
            title: 'Licenças do Mês',
            subtitle: `${this.getMonthName(currentMonth)} de ${currentYear}`,
            summary: {
                total: servidoresComLicencaMes.length,
                dias: servidoresComLicencaMes.reduce((sum, s) => sum + (s.licencas[0]?.dias || 0), 0)
            },
            servidores: servidoresComLicencaMes.map(s => ({
                nome: s.nome,
                cargo: s.cargo,
                lotacao: s.lotacao,
                dataInicio: s.licencas[0]?.dataInicio,
                dias: s.licencas[0]?.dias,
                periodo: s.licencas[0]?.periodo
            }))
        };
    }
    
    /**
     * Gera relatório de aposentadorias próximas
     */
    generateAposentadoriasProximasReport() {
        const today = new Date();
        const umAnoDepois = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        
        const servidoresProximos = this.dashboard.allServidores
            .filter(s => s.aposentadoriaCompulsoria)
            .map(s => ({
                ...s,
                dataAposentadoria: new Date(s.aposentadoriaCompulsoria),
                diasRestantes: Math.floor((new Date(s.aposentadoriaCompulsoria) - today) / (1000 * 60 * 60 * 24))
            }))
            .filter(s => s.diasRestantes > 0 && s.dataAposentadoria <= umAnoDepois)
            .sort((a, b) => a.diasRestantes - b.diasRestantes);
        
        return {
            title: 'Aposentadorias Próximas',
            subtitle: 'Próximos 12 meses',
            summary: {
                total: servidoresProximos.length,
                proximos3Meses: servidoresProximos.filter(s => s.diasRestantes <= 90).length,
                proximos6Meses: servidoresProximos.filter(s => s.diasRestantes <= 180).length
            },
            servidores: servidoresProximos.map(s => ({
                nome: s.nome,
                cargo: s.cargo,
                lotacao: s.lotacao,
                idade: s.idade,
                dataAposentadoria: s.aposentadoriaCompulsoria,
                diasRestantes: s.diasRestantes
            }))
        };
    }
    
    /**
     * Gera relatório de urgências críticas
     */
    generateUrgenciasCriticasReport() {
        const urgentes = this.dashboard.allServidores.filter(s => 
            s.urgencia === 'Crítica' || s.urgencia === 'Alta'
        );
        
        return {
            title: 'Urgências Críticas e Altas',
            subtitle: 'Servidores que requerem atenção imediata',
            summary: {
                total: urgentes.length,
                criticas: urgentes.filter(s => s.urgencia === 'Crítica').length,
                altas: urgentes.filter(s => s.urgencia === 'Alta').length
            },
            servidores: urgentes.map(s => ({
                nome: s.nome,
                cargo: s.cargo,
                lotacao: s.lotacao,
                urgencia: s.urgencia,
                proximaLicenca: s.proximaLicencaData,
                motivo: this.getUrgencyReason(s)
            }))
        };
    }
    
    /**
     * Gera relatório de licenças vencidas
     */
    generateLicencasVencidasReport() {
        const today = new Date();
        
        const servidoresComVencidas = this.dashboard.allServidores
            .filter(s => s.licencas && s.licencas.length > 0)
            .map(s => {
                const licencasVencidas = s.licencas.filter(l => {
                    if (!l.dataLimite) return false;
                    return new Date(l.dataLimite) < today;
                });
                
                return {
                    servidor: s,
                    licencasVencidas: licencasVencidas
                };
            })
            .filter(item => item.licencasVencidas.length > 0);
        
        return {
            title: 'Licenças Vencidas',
            subtitle: 'Licenças que ultrapassaram o prazo limite',
            summary: {
                servidores: servidoresComVencidas.length,
                totalLicencas: servidoresComVencidas.reduce((sum, item) => sum + item.licencasVencidas.length, 0)
            },
            dados: servidoresComVencidas.map(item => ({
                nome: item.servidor.nome,
                cargo: item.servidor.cargo,
                lotacao: item.servidor.lotacao,
                licencas: item.licencasVencidas.map(l => ({
                    periodo: l.periodo,
                    dataLimite: l.dataLimite,
                    diasVencido: Math.floor((today - new Date(l.dataLimite)) / (1000 * 60 * 60 * 24))
                }))
            }))
        };
    }
    
    /**
     * Gera consolidado geral
     */
    generateConsolidadoGeralReport() {
        const stats = {
            totalServidores: this.dashboard.allServidores.length,
            comLicenca: this.dashboard.allServidores.filter(s => s.licencas && s.licencas.length > 0).length,
            semLicenca: this.dashboard.allServidores.filter(s => !s.licencas || s.licencas.length === 0).length,
            urgenciasCriticas: this.dashboard.allServidores.filter(s => s.urgencia === 'Crítica').length,
            proximasAposentadorias: this.dashboard.allServidores.filter(s => {
                if (!s.aposentadoriaCompulsoria) return false;
                const dias = Math.floor((new Date(s.aposentadoriaCompulsoria) - new Date()) / (1000 * 60 * 60 * 24));
                return dias > 0 && dias <= 365;
            }).length
        };
        
        // Distribuição por cargo
        const porCargo = {};
        this.dashboard.allServidores.forEach(s => {
            porCargo[s.cargo] = (porCargo[s.cargo] || 0) + 1;
        });
        
        return {
            title: 'Consolidado Geral',
            subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            stats: stats,
            distribuicao: {
                porCargo: Object.entries(porCargo)
                    .map(([cargo, count]) => ({ cargo, count }))
                    .sort((a, b) => b.count - a.count)
            }
        };
    }
    
    /**
     * Gera relatório por cargo
     */
    generatePorCargoReport() {
        const porCargo = {};
        
        this.dashboard.allServidores.forEach(servidor => {
            if (!porCargo[servidor.cargo]) {
                porCargo[servidor.cargo] = {
                    cargo: servidor.cargo,
                    total: 0,
                    comLicenca: 0,
                    semLicenca: 0,
                    urgenciasCriticas: 0,
                    servidores: []
                };
            }
            
            porCargo[servidor.cargo].total++;
            porCargo[servidor.cargo].servidores.push(servidor);
            
            if (servidor.licencas && servidor.licencas.length > 0) {
                porCargo[servidor.cargo].comLicenca++;
            } else {
                porCargo[servidor.cargo].semLicenca++;
            }
            
            if (servidor.urgencia === 'Crítica') {
                porCargo[servidor.cargo].urgenciasCriticas++;
            }
        });
        
        return {
            title: 'Relatório por Cargo',
            subtitle: 'Análise detalhada por cargo',
            cargos: Object.values(porCargo).sort((a, b) => b.total - a.total)
        };
    }
    
    /**
     * Gera relatório por lotação
     */
    generatePorLotacaoReport() {
        const porLotacao = {};
        
        this.dashboard.allServidores.forEach(servidor => {
            const lotacao = servidor.lotacao || 'Não Informada';
            
            if (!porLotacao[lotacao]) {
                porLotacao[lotacao] = {
                    lotacao: lotacao,
                    total: 0,
                    comLicenca: 0,
                    semLicenca: 0,
                    servidores: []
                };
            }
            
            porLotacao[lotacao].total++;
            porLotacao[lotacao].servidores.push(servidor);
            
            if (servidor.licencas && servidor.licencas.length > 0) {
                porLotacao[lotacao].comLicenca++;
            } else {
                porLotacao[lotacao].semLicenca++;
            }
        });
        
        return {
            title: 'Relatório por Lotação',
            subtitle: 'Análise detalhada por lotação/departamento',
            lotacoes: Object.values(porLotacao).sort((a, b) => b.total - a.total)
        };
    }
    
    /**
     * Gera timeline anual
     */
    generateTimelineAnualReport() {
        const currentYear = new Date().getFullYear();
        const meses = [];
        
        for (let mes = 0; mes < 12; mes++) {
            const licencasNoMes = this.dashboard.allServidores
                .filter(s => s.licencas && s.licencas.length > 0)
                .filter(s => {
                    return s.licencas.some(l => {
                        if (!l.dataInicio) return false;
                        const data = new Date(l.dataInicio);
                        return data.getMonth() === mes && data.getFullYear() === currentYear;
                    });
                });
            
            meses.push({
                mes: this.getMonthName(mes),
                total: licencasNoMes.length,
                servidores: licencasNoMes.map(s => s.nome)
            });
        }
        
        return {
            title: 'Timeline Anual de Licenças',
            subtitle: `Ano ${currentYear}`,
            meses: meses
        };
    }
    
    /**
     * Gera relatório de impacto operacional
     */
    generateImpactoOperacionalReport() {
        // Agrupa por mês e lotação
        const impactoPorMes = new Map();
        
        this.dashboard.allServidores.forEach(servidor => {
            if (!servidor.licencas || servidor.licencas.length === 0) return;
            
            servidor.licencas.forEach(licenca => {
                if (!licenca.dataInicio) return;
                
                const data = new Date(licenca.dataInicio);
                const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
                const lotacao = servidor.lotacao || 'Não Informada';
                
                if (!impactoPorMes.has(mesAno)) {
                    impactoPorMes.set(mesAno, new Map());
                }
                
                const mesData = impactoPorMes.get(mesAno);
                if (!mesData.has(lotacao)) {
                    mesData.set(lotacao, {
                        lotacao: lotacao,
                        ausencias: 0,
                        servidores: []
                    });
                }
                
                const lotacaoData = mesData.get(lotacao);
                lotacaoData.ausencias++;
                lotacaoData.servidores.push(servidor.nome);
            });
        });
        
        // Converte para array e ordena
        const impactoArray = [];
        impactoPorMes.forEach((lotacoes, mesAno) => {
            lotacoes.forEach((data, lotacao) => {
                impactoArray.push({
                    mesAno: mesAno,
                    ...data
                });
            });
        });
        
        return {
            title: 'Impacto Operacional',
            subtitle: 'Análise de ausências por período e lotação',
            dados: impactoArray.sort((a, b) => {
                if (a.mesAno !== b.mesAno) return a.mesAno.localeCompare(b.mesAno);
                return b.ausencias - a.ausencias;
            })
        };
    }
    
    /**
     * Mostra preview do relatório
     */
    showPreview(report) {
        // Usar modal correto do HTML (reportConfigModal)
        const modalOverlay = document.getElementById('reportConfigModal');
        const modalTitle = document.getElementById('modalTemplateTitle');
        const previewContent = document.getElementById('modalReportPreview');
        
        if (!modalOverlay || !previewContent) {
            console.error('Elementos de modal não encontrados');
            return;
        }
        
        // Atualiza título do modal
        if (modalTitle) {
            modalTitle.textContent = report.data.title;
        }
        
        // Renderiza conteúdo baseado no template
        const html = this.renderReportHTML(report);
        previewContent.innerHTML = html;
        
        // Mostra modal com classe active
        modalOverlay.classList.add('active');
        
        // Previne scroll do body
        document.body.style.overflow = 'hidden';
        
        console.log('✅ Preview exibido com sucesso');
    }
    
    /**
     * Renderiza HTML do relatório
     */
    renderReportHTML(report) {
        const { data } = report;
        
        let html = `
            <div class="report-document">
                <div class="report-header-doc">
                    <div class="report-logo">
                        <img src="img/logo.png" alt="SEFAZ" style="height: 60px;">
                    </div>
                    <div class="report-info-doc">
                        <h1>${data.title}</h1>
                        <h2>${data.subtitle || ''}</h2>
                        <p class="report-date">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                </div>
        `;
        
        // Sumário se houver
        if (data.summary) {
            html += `
                <div class="report-summary">
                    <h3>Resumo</h3>
                    <div class="summary-cards">
                        ${Object.entries(data.summary).map(([key, value]) => `
                            <div class="summary-card">
                                <div class="summary-value">${value}</div>
                                <div class="summary-label">${this.formatSummaryLabel(key)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Tabela de servidores se houver
        if (data.servidores && data.servidores.length > 0) {
            html += this.renderServidoresTable(data.servidores);
        }
        
        // Dados específicos por template
        if (data.dados) {
            html += this.renderCustomData(data.dados, report.templateId);
        }
        
        if (data.cargos) {
            html += this.renderCargosSummary(data.cargos);
        }
        
        if (data.lotacoes) {
            html += this.renderLotacoesSummary(data.lotacoes);
        }
        
        if (data.meses) {
            html += this.renderTimelineChart(data.meses);
        }
        
        if (data.stats) {
            html += this.renderStatsSection(data.stats, data.distribuicao);
        }
        
        html += `
                <div class="report-footer">
                    <p>Dashboard de Licenças Premium - SUTRI/SEFAZ</p>
                    <p>Página 1 de 1</p>
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Renderiza tabela de servidores
     */
    renderServidoresTable(servidores) {
        const headers = Object.keys(servidores[0]);
        
        return `
            <div class="report-section">
                <h3>Detalhamento</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            ${headers.map(h => `<th>${this.formatTableHeader(h)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${servidores.map(s => `
                            <tr>
                                ${headers.map(h => `<td>${this.formatTableCell(s[h], h)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * Renderiza sumário de cargos
     */
    renderCargosSummary(cargos) {
        return `
            <div class="report-section">
                <h3>Análise por Cargo</h3>
                ${cargos.map(cargo => `
                    <div class="cargo-summary">
                        <h4>${cargo.cargo}</h4>
                        <div class="cargo-stats">
                            <span><strong>Total:</strong> ${cargo.total}</span>
                            <span><strong>Com Licença:</strong> ${cargo.comLicenca}</span>
                            <span><strong>Sem Licença:</strong> ${cargo.semLicenca}</span>
                            <span><strong>Urgências Críticas:</strong> ${cargo.urgenciasCriticas}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Renderiza sumário de lotações
     */
    renderLotacoesSummary(lotacoes) {
        return `
            <div class="report-section">
                <h3>Análise por Lotação</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Lotação</th>
                            <th>Total</th>
                            <th>Com Licença</th>
                            <th>Sem Licença</th>
                            <th>% Com Licença</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lotacoes.map(lot => `
                            <tr>
                                <td>${lot.lotacao}</td>
                                <td>${lot.total}</td>
                                <td>${lot.comLicenca}</td>
                                <td>${lot.semLicenca}</td>
                                <td>${Math.round((lot.comLicenca / lot.total) * 100)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    /**
     * Renderiza gráfico de timeline
     */
    renderTimelineChart(meses) {
        const maxValue = Math.max(...meses.map(m => m.total));
        
        return `
            <div class="report-section">
                <h3>Timeline Anual</h3>
                <div class="timeline-chart">
                    ${meses.map(mes => `
                        <div class="timeline-bar">
                            <div class="bar-container">
                                <div class="bar-fill" style="height: ${(mes.total / maxValue) * 100}%">
                                    <span class="bar-value">${mes.total}</span>
                                </div>
                            </div>
                            <div class="bar-label">${mes.mes}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza seção de estatísticas
     */
    renderStatsSection(stats, distribuicao) {
        let html = `
            <div class="report-section">
                <h3>Estatísticas Gerais</h3>
                <div class="stats-grid">
                    ${Object.entries(stats).map(([key, value]) => `
                        <div class="stat-item">
                            <div class="stat-value">${value}</div>
                            <div class="stat-label">${this.formatSummaryLabel(key)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        if (distribuicao && distribuicao.porCargo) {
            html += `
                <div class="report-section">
                    <h3>Distribuição por Cargo</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Cargo</th>
                                <th>Quantidade</th>
                                <th>Percentual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${distribuicao.porCargo.map(item => `
                                <tr>
                                    <td>${item.cargo}</td>
                                    <td>${item.count}</td>
                                    <td>${Math.round((item.count / stats.totalServidores) * 100)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Renderiza dados customizados
     */
    renderCustomData(dados, templateId) {
        // Implementação específica por template
        return `<div class="report-section"><!-- Dados customizados --></div>`;
    }
    
    /**
     * Fecha preview
     */
    closePreview() {
        const modalOverlay = document.getElementById('reportConfigModal');
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
            
            // Restaura scroll do body
            document.body.style.overflow = '';
        }
        
        console.log('✅ Preview fechado');
    }
    
    /**
     * Exporta para PDF
     */
    exportToPDF() {
        window.print();
    }
    
    /**
     * Exporta para Excel
     */
    exportToExcel() {
        if (!this.currentReport) return;
        
        // Usa ExportManager se disponível
        if (this.dashboard.exportManager) {
            this.dashboard.exportManager.exportServidoresToExcel();
        }
    }
    
    /**
     * Imprime relatório
     */
    printReport() {
        window.print();
    }
    
    /**
     * Edita relatório
     */
    editReport() {
        alert('Funcionalidade de edição em desenvolvimento');
    }
    
    /**
     * Abre wizard de relatório personalizado
     * NOTA: Agora delegado ao Premium Builder
     */
    openCustomReportWizard() {
        console.log('📊 Abrindo Premium Builder...');
        // O Premium Builder será inicializado pela integração no dashboard.js
        if (this.dashboard && this.dashboard.navigateTo) {
            this.dashboard.navigateTo('reports');
        }
    }

    /**
     * Mostra modal de histórico
     */
    showHistoryModal() {
        alert(`Histórico: ${this.reportHistory.length} relatórios gerados`);
    }
    
    /**
     * Adiciona ao histórico
     */
    addToHistory(report) {
        this.reportHistory.unshift({
            id: report.id,
            template: report.template.name,
            generatedAt: report.generatedAt
        });
        
        // Limita histórico
        if (this.reportHistory.length > 50) {
            this.reportHistory = this.reportHistory.slice(0, 50);
        }
        
        this.saveHistory();
    }
    
    /**
     * Salva histórico
     */
    saveHistory() {
        try {
            localStorage.setItem('reportHistory', JSON.stringify(this.reportHistory));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar histórico:', error);
        }
    }
    
    /**
     * Carrega histórico
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('reportHistory');
            if (saved) {
                this.reportHistory = JSON.parse(saved);
                console.log(`📥 ${this.reportHistory.length} relatórios no histórico`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar histórico:', error);
        }
    }
    
    /**
     * Registra listeners
     */
    registerListeners() {
        // Integração com navegação do dashboard
        document.addEventListener('pageChanged', (e) => {
            if (e.detail && e.detail.page === 'reports') {
                this.showReportsPage();
            } else {
                this.hideReportsPage();
            }
        });
    }
    
    /**
     * Mostra página de relatórios
     * NOTA: Agora delega ao Premium Builder
     */
    async showReportsPage() {
        // Delegar ao Premium Builder se disponível
        if (this.dashboard && this.dashboard.reportBuilderPremium) {
            await this.dashboard.reportBuilderPremium.open();
        } else if (this.reportsPage) {
            // Fallback: mostrar página vazia
            this.reportsPage.style.display = 'block';
        }

        // Atualiza breadcrumb se disponível
        if (this.dashboard && this.dashboard.breadcrumbsManager) {
            this.dashboard.breadcrumbsManager.setPath(['dashboard', 'relatorios']);
        }
    }
    
    /**
     * Esconde página de relatórios
     * NOTA: Agora delega ao Premium Builder
     */
    hideReportsPage() {
        // Delegar ao Premium Builder se disponível
        if (this.dashboard && this.dashboard.reportBuilderPremium) {
            this.dashboard.reportBuilderPremium.close();
        } else if (this.reportsPage) {
            // Fallback
            this.reportsPage.style.display = 'none';
        }
    }
    
    /**
     * Utilitários de formatação
     */
    
    getMonthName(monthIndex) {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return months[monthIndex];
    }
    
    formatSummaryLabel(key) {
        const labels = {
            total: 'Total',
            dias: 'Total de Dias',
            proximos3Meses: 'Próximos 3 Meses',
            proximos6Meses: 'Próximos 6 Meses',
            criticas: 'Críticas',
            altas: 'Altas',
            servidores: 'Servidores',
            totalLicencas: 'Total de Licenças',
            totalServidores: 'Total de Servidores',
            comLicenca: 'Com Licença',
            semLicenca: 'Sem Licença',
            urgenciasCriticas: 'Urgências Críticas',
            proximasAposentadorias: 'Próximas Aposentadorias'
        };
        return labels[key] || key;
    }
    
    formatTableHeader(header) {
        const headers = {
            nome: 'Nome',
            cargo: 'Cargo',
            lotacao: 'Lotação',
            dataInicio: 'Data Início',
            dias: 'Dias',
            periodo: 'Período',
            idade: 'Idade',
            dataAposentadoria: 'Aposentadoria',
            diasRestantes: 'Dias Restantes',
            urgencia: 'Urgência',
            proximaLicenca: 'Próxima Licença',
            motivo: 'Motivo'
        };
        return headers[header] || header;
    }
    
    formatTableCell(value, header) {
        if (!value) return '-';
        
        if (header.includes('data') || header.includes('Data')) {
            return new Date(value).toLocaleDateString('pt-BR');
        }
        
        if (header === 'diasRestantes' || header === 'diasVencido') {
            return `${value} dias`;
        }
        
        return value;
    }
    
    getUrgencyReason(servidor) {
        if (!servidor.aposentadoriaCompulsoria) return '-';
        
        const dias = Math.floor((new Date(servidor.aposentadoriaCompulsoria) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (dias <= 90) return 'Aposentadoria em menos de 3 meses';
        if (dias <= 180) return 'Aposentadoria em menos de 6 meses';
        return 'Proximidade de aposentadoria';
    }
    
    showLoading(message = 'Carregando...') {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.querySelector('.loading-text').textContent = message;
            loading.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loadingOverlay');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    generateId() {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Limpa recursos
     */
    destroy() {
        if (this.reportsPage) {
            this.reportsPage.remove();
        }
        
        console.log('🗑️ ReportsManager destruído');
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
}
