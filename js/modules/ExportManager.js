/**
 * ExportManager.js
 * Gerencia todas as exportações do sistema: Excel, CSV, e preparação para PDF
 * Suporta exportação de servidores, notificações e relatórios completos
 */

class ExportManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.isExporting = false;
        
        // Configurações de exportação
        this.config = {
            includeFilters: true,
            includeStats: true,
            includeTimestamp: true,
            dateFormat: 'DD/MM/YYYY'
        };
    }

    /**
     * Exportar dados de servidores para Excel
     * @param {Array} servidores - Array de servidores a exportar (usa filteredServidores se não fornecido)
     * @param {Object} options - Opções de exportação
     */
    async exportServidoresToExcel(servidores = null, options = {}) {
        if (this.isExporting) return;
        
        try {
            this.isExporting = true;
            this.showExportingToast('Preparando exportação...');

            const data = servidores || this.dashboard.filteredServidores;
            
            if (!data || data.length === 0) {
                this.showErrorToast('Não há dados para exportar');
                return;
            }

            // Detectar tipo de tabela
            const isLicencaPremio = data[0]?.tipoTabela === 'licenca-premio';

            // Criar workbook
            const wb = XLSX.utils.book_new();

            // Preparar dados principais
            const mainData = this.prepareServidoresData(data, isLicencaPremio);
            const mainSheet = XLSX.utils.aoa_to_sheet(mainData);
            
            // Aplicar estilos e larguras de coluna
            this.applySheetFormatting(mainSheet, isLicencaPremio, false, data);
            
            XLSX.utils.book_append_sheet(wb, mainSheet, 'Servidores');

            // Adicionar aba de estatísticas se solicitado
            if (this.config.includeStats && options.includeStats !== false) {
                const statsSheet = this.createStatsSheet(data, isLicencaPremio);
                XLSX.utils.book_append_sheet(wb, statsSheet, 'Estatísticas');
            }

            // Adicionar aba de filtros aplicados
            if (this.config.includeFilters && options.includeFilters !== false) {
                const filtersSheet = this.createFiltersSheet();
                XLSX.utils.book_append_sheet(wb, filtersSheet, 'Filtros Aplicados');
            }

            // Gerar nome do arquivo
            const fileName = this.generateFileName('servidores', 'xlsx');

            // Download
            XLSX.writeFile(wb, fileName);

            this.showSuccessToast(`Arquivo exportado: ${fileName}`);
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            this.showErrorToast('Erro ao exportar arquivo');
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Exportar dados de servidores para CSV
     * @param {Array} servidores - Array de servidores a exportar
     */
    async exportServidoresToCSV(servidores = null) {
        if (this.isExporting) return;
        
        try {
            this.isExporting = true;
            this.showExportingToast('Preparando CSV...');

            const data = servidores || this.dashboard.filteredServidores;
            
            if (!data || data.length === 0) {
                this.showErrorToast('Não há dados para exportar');
                return;
            }

            const isLicencaPremio = data[0]?.tipoTabela === 'licenca-premio';
            const csvContent = this.generateCSVContent(data, isLicencaPremio);
            
            // Criar blob e download
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateFileName('servidores', 'csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showSuccessToast('CSV exportado com sucesso');
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            this.showErrorToast('Erro ao exportar CSV');
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Exportar notificações para Excel
     */
    async exportNotificacoesToExcel() {
        if (this.isExporting) return;
        
        try {
            this.isExporting = true;
            this.showExportingToast('Exportando notificações...');

            const data = this.dashboard.filteredNotificacoes;
            
            if (!data || data.length === 0) {
                this.showErrorToast('Não há notificações para exportar');
                return;
            }

            const wb = XLSX.utils.book_new();

            // Preparar dados de notificações
            const notifData = this.prepareNotificacoesData(data);
            const notifSheet = XLSX.utils.aoa_to_sheet(notifData);
            
            this.applySheetFormatting(notifSheet, false, true);
            
            XLSX.utils.book_append_sheet(wb, notifSheet, 'Notificações');

            // Adicionar estatísticas de notificações
            const statsSheet = this.createNotificacoesStatsSheet(data);
            XLSX.utils.book_append_sheet(wb, statsSheet, 'Resumo');

            const fileName = this.generateFileName('notificacoes', 'xlsx');
            XLSX.writeFile(wb, fileName);

            this.showSuccessToast(`Notificações exportadas: ${fileName}`);
        } catch (error) {
            console.error('Erro ao exportar notificações:', error);
            this.showErrorToast('Erro ao exportar notificações');
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Preparar dados de servidores para exportação
     */
    prepareServidoresData(servidores, isLicencaPremio) {
        const data = [];

        // Detectar colunas com dados disponíveis
        const hasIdade = servidores.some(s => s.idade && s.idade !== '--' && s.idade !== '' && s.idade !== null && s.idade !== undefined);
        const hasUrgencia = servidores.some(s => s.nivelUrgencia && s.nivelUrgencia !== '--' && s.nivelUrgencia !== '' && s.nivelUrgencia !== null);
        const hasAposentadoria = servidores.some(s => s.dataAposentadoriaCompulsoria);

        // Cabeçalho
        if (isLicencaPremio) {
            data.push([
                'Nome',
                'Cargo',
                'Período de Licença',
                'Data Início',
                'Data Fim',
                'Dias de Licença'
            ]);
        } else {
            // Construir cabeçalho dinamicamente
            const headers = ['Nome'];
            if (hasIdade) headers.push('Idade');
            headers.push('Lotação', 'Cargo', 'Período de Licença', 'Data Início', 'Data Fim', 'Dias de Licença');
            if (hasUrgencia) headers.push('Nível de Urgência');
            if (hasAposentadoria) headers.push('Aposentadoria Prevista');
            data.push(headers);
        }

        // Dados
        servidores.forEach(servidor => {
            const dataInicio = servidor.proximaLicencaInicio ? 
                new Date(servidor.proximaLicencaInicio).toLocaleDateString('pt-BR') : '--';
            const dataFim = servidor.proximaLicencaFim ? 
                new Date(servidor.proximaLicencaFim).toLocaleDateString('pt-BR') : '--';
            
            const periodoLicenca = (dataInicio !== '--' && dataFim !== '--') ? 
                `${dataInicio} - ${dataFim}` : '--';

            const diasLicenca = servidor.diasLicenca || '--';

            if (isLicencaPremio) {
                data.push([
                    servidor.nome,
                    servidor.cargo || '--',
                    periodoLicenca,
                    dataInicio,
                    dataFim,
                    diasLicenca
                ]);
            } else {
                // Construir linha dinamicamente
                const row = [servidor.nome];
                if (hasIdade) row.push(servidor.idade || '--');
                row.push(
                    servidor.lotacao || '--',
                    servidor.cargo || '--',
                    periodoLicenca,
                    dataInicio,
                    dataFim,
                    diasLicenca
                );
                if (hasUrgencia) row.push(servidor.nivelUrgencia || '--');
                if (hasAposentadoria) {
                    const aposentadoria = servidor.dataAposentadoriaCompulsoria ? 
                        new Date(servidor.dataAposentadoriaCompulsoria).toLocaleDateString('pt-BR') : '--';
                    row.push(aposentadoria);
                }
                data.push(row);
            }
        });

        return data;
    }

    /**
     * Preparar dados de notificações para exportação
     */
    prepareNotificacoesData(notificacoes) {
        const data = [];

        // Cabeçalho
        data.push([
            'Nome',
            'Matrícula',
            'Cargo',
            'Lotação',
            'Data Notificação',
            'Período Disponível',
            'Status Resposta',
            'Data Resposta',
            'Observações'
        ]);

        // Dados
        notificacoes.forEach(notif => {
            data.push([
                notif.servidor || '--',
                notif.matricula || '--',
                notif.cargo || '--',
                notif.lotacao || '--',
                notif.dataNotificacao ? new Date(notif.dataNotificacao).toLocaleDateString('pt-BR') : '--',
                notif.periodoDisponivel || '--',
                notif.respondeu ? 'Respondeu' : 'Pendente',
                notif.dataResposta ? new Date(notif.dataResposta).toLocaleDateString('pt-BR') : '--',
                notif.observacoes || '--'
            ]);
        });

        return data;
    }

    /**
     * Criar aba de estatísticas
     */
    createStatsSheet(servidores, isLicencaPremio) {
        const stats = [];

        stats.push(['📊 ESTATÍSTICAS GERAIS']);
        stats.push([]);
        stats.push(['Total de Servidores', servidores.length]);
        
        if (!isLicencaPremio) {
            // Estatísticas de urgência
            const urgencias = {
                critical: servidores.filter(s => s.nivelUrgencia === 'critical').length,
                high: servidores.filter(s => s.nivelUrgencia === 'high').length,
                moderate: servidores.filter(s => s.nivelUrgencia === 'moderate').length,
                low: servidores.filter(s => s.nivelUrgencia === 'low').length
            };

            stats.push([]);
            stats.push(['📈 DISTRIBUIÇÃO POR URGÊNCIA']);
            stats.push(['Crítica', urgencias.critical]);
            stats.push(['Alta', urgencias.high]);
            stats.push(['Moderada', urgencias.moderate]);
            stats.push(['Baixa', urgencias.low]);

            // Estatísticas de idade
            const idades = servidores.map(s => s.idade).filter(i => i);
            if (idades.length > 0) {
                const idadeMedia = (idades.reduce((a, b) => a + b, 0) / idades.length).toFixed(1);
                const idadeMin = Math.min(...idades);
                const idadeMax = Math.max(...idades);

                stats.push([]);
                stats.push(['👥 ESTATÍSTICAS DE IDADE']);
                stats.push(['Idade Média', idadeMedia]);
                stats.push(['Idade Mínima', idadeMin]);
                stats.push(['Idade Máxima', idadeMax]);
            }
        }

        // Estatísticas de cargo
        const cargos = {};
        servidores.forEach(s => {
            if (s.cargo) {
                cargos[s.cargo] = (cargos[s.cargo] || 0) + 1;
            }
        });

        if (Object.keys(cargos).length > 0) {
            stats.push([]);
            stats.push(['💼 DISTRIBUIÇÃO POR CARGO']);
            Object.entries(cargos)
                .sort((a, b) => b[1] - a[1])
                .forEach(([cargo, count]) => {
                    stats.push([cargo, count]);
                });
        }

        // Metadados
        stats.push([]);
        stats.push(['📅 INFORMAÇÕES DA EXPORTAÇÃO']);
        stats.push(['Data/Hora', new Date().toLocaleString('pt-BR')]);
        stats.push(['Filtros Aplicados', this.getAppliedFiltersDescription()]);

        return XLSX.utils.aoa_to_sheet(stats);
    }

    /**
     * Criar aba de estatísticas de notificações
     */
    createNotificacoesStatsSheet(notificacoes) {
        const stats = [];

        const respondidos = notificacoes.filter(n => n.respondeu).length;
        const pendentes = notificacoes.length - respondidos;
        const percentualResposta = ((respondidos / notificacoes.length) * 100).toFixed(1);

        stats.push(['📊 RESUMO DE NOTIFICAÇÕES']);
        stats.push([]);
        stats.push(['Total Notificados', notificacoes.length]);
        stats.push(['Responderam', respondidos]);
        stats.push(['Pendentes', pendentes]);
        stats.push(['Percentual de Resposta', `${percentualResposta}%`]);
        stats.push([]);
        stats.push(['Data da Exportação', new Date().toLocaleString('pt-BR')]);

        return XLSX.utils.aoa_to_sheet(stats);
    }

    /**
     * Criar aba de filtros aplicados
     */
    createFiltersSheet() {
        const filters = [];
        const currentFilters = this.dashboard.currentFilters;

        filters.push(['🔍 FILTROS APLICADOS']);
        filters.push([]);

        // Busca
        if (currentFilters.search) {
            filters.push(['Busca', currentFilters.search]);
        }

        // Idade
        if (currentFilters.age) {
            filters.push(['Idade (Min - Max)', `${currentFilters.age.min} - ${currentFilters.age.max}`]);
        }

        // Urgência
        if (currentFilters.urgency) {
            const urgencyLabels = {
                critical: 'Crítica',
                high: 'Alta',
                moderate: 'Moderada',
                low: 'Baixa'
            };
            filters.push(['Urgência', urgencyLabels[currentFilters.urgency] || currentFilters.urgency]);
        }

        // Cargo
        if (currentFilters.cargo) {
            filters.push(['Cargo', currentFilters.cargo]);
        }

        // Período
        if (currentFilters.period) {
            filters.push(['Período', `${currentFilters.period.start} - ${currentFilters.period.end}`]);
        }

        if (filters.length === 2) {
            filters.push(['Nenhum filtro aplicado', '']);
        }

        filters.push([]);
        filters.push(['Total de resultados', this.dashboard.filteredServidores.length]);

        return XLSX.utils.aoa_to_sheet(filters);
    }

    /**
     * Gerar conteúdo CSV
     */
    generateCSVContent(servidores, isLicencaPremio) {
        const data = this.prepareServidoresData(servidores, isLicencaPremio);
        
        return data.map(row => 
            row.map(cell => {
                // Escapar aspas e envolver campos com vírgula em aspas
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');
    }

    /**
     * Aplicar formatação ao sheet
     */
    applySheetFormatting(sheet, isLicencaPremio, isNotificacoes = false, servidores = null) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        
        // Definir larguras de coluna
        const colWidths = [];
        
        if (isNotificacoes) {
            colWidths.push(
                { wch: 30 }, // Nome
                { wch: 12 }, // Matrícula
                { wch: 20 }, // Cargo
                { wch: 25 }, // Lotação
                { wch: 15 }, // Data Notificação
                { wch: 20 }, // Período
                { wch: 12 }, // Status
                { wch: 15 }, // Data Resposta
                { wch: 30 }  // Observações
            );
        } else if (isLicencaPremio) {
            colWidths.push(
                { wch: 35 }, // Nome
                { wch: 20 }, // Cargo
                { wch: 25 }, // Período
                { wch: 12 }, // Data Início
                { wch: 12 }, // Data Fim
                { wch: 10 }  // Dias
            );
        } else {
            // Detectar colunas disponíveis
            const hasIdade = servidores?.some(s => s.idade && s.idade !== '--' && s.idade !== '' && s.idade !== null && s.idade !== undefined);
            const hasUrgencia = servidores?.some(s => s.nivelUrgencia && s.nivelUrgencia !== '--' && s.nivelUrgencia !== '' && s.nivelUrgencia !== null);
            const hasAposentadoria = servidores?.some(s => s.dataAposentadoriaCompulsoria);
            
            colWidths.push({ wch: 35 }); // Nome
            if (hasIdade) colWidths.push({ wch: 8 }); // Idade
            colWidths.push(
                { wch: 25 }, // Lotação
                { wch: 20 }, // Cargo
                { wch: 25 }, // Período
                { wch: 12 }, // Data Início
                { wch: 12 }, // Data Fim
                { wch: 10 }  // Dias
            );
            if (hasUrgencia) colWidths.push({ wch: 15 }); // Urgência
            if (hasAposentadoria) colWidths.push({ wch: 15 }); // Aposentadoria
        }

        sheet['!cols'] = colWidths;

        // Aplicar estilo ao cabeçalho (primeira linha)
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (sheet[cellAddress]) {
                sheet[cellAddress].s = {
                    font: { bold: true, sz: 12 },
                    fill: { fgColor: { rgb: "4F81BD" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
        }
    }

    /**
     * Gerar nome de arquivo com timestamp
     */
    generateFileName(type, extension) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR').replace(/\//g, '-');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, 'h');
        
        return `${type}_${dateStr}_${timeStr}.${extension}`;
    }

    /**
     * Obter descrição dos filtros aplicados
     */
    getAppliedFiltersDescription() {
        const filters = [];
        const cf = this.dashboard.currentFilters;

        if (cf.search) filters.push(`Busca: "${cf.search}"`);
        if (cf.urgency) filters.push(`Urgência: ${cf.urgency}`);
        if (cf.cargo) filters.push(`Cargo: ${cf.cargo}`);
        if (cf.age) filters.push(`Idade: ${cf.age.min}-${cf.age.max}`);

        return filters.length > 0 ? filters.join(' | ') : 'Nenhum filtro aplicado';
    }

    /**
     * Mostrar modal de opções de exportação
     */
    showExportModal(type = 'servidores') {
        const modal = document.createElement('div');
        modal.className = 'export-modal-overlay';
        modal.innerHTML = `
            <div class="export-modal">
                <div class="export-modal-header">
                    <h3>
                        <i class="bi bi-download"></i>
                        Exportar ${type === 'servidores' ? 'Servidores' : 'Notificações'}
                    </h3>
                    <button class="btn-close-modal" aria-label="Fechar">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="export-modal-body">
                    <p class="export-description">
                        Escolha o formato para exportar 
                        <strong>${type === 'servidores' ? this.dashboard.filteredServidores.length : this.dashboard.filteredNotificacoes.length} registros</strong>
                        ${this.getAppliedFiltersDescription() !== 'Nenhum filtro aplicado' ? '(com filtros aplicados)' : ''}
                    </p>

                    <div class="export-options">
                        <button class="export-option-btn" data-format="excel">
                            <div class="export-icon excel">
                                <i class="bi bi-file-earmark-excel"></i>
                            </div>
                            <div class="export-info">
                                <h4>Excel (XLSX)</h4>
                                <p>Formato completo com múltiplas abas e estatísticas</p>
                            </div>
                        </button>

                        <button class="export-option-btn" data-format="csv">
                            <div class="export-icon csv">
                                <i class="bi bi-file-earmark-text"></i>
                            </div>
                            <div class="export-info">
                                <h4>CSV</h4>
                                <p>Formato simples compatível com qualquer editor</p>
                            </div>
                        </button>
                    </div>

                    <div class="export-settings">
                        <label class="export-checkbox">
                            <input type="checkbox" id="includeStatsCheck" checked>
                            <span>Incluir aba de estatísticas</span>
                        </label>
                        <label class="export-checkbox">
                            <input type="checkbox" id="includeFiltersCheck" checked>
                            <span>Incluir filtros aplicados</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        const closeModal = () => {
            // aplicar animação de saída
            modal.classList.add('fade-out');
            // utilizar helper do dashboard se disponível para gerenciar foco/aria
            if (this.dashboard && typeof this.dashboard._closeModalElement === 'function') {
                try {
                    this.dashboard._closeModalElement(modal);
                } catch (e) {
                    // fallback para remoção direta
                }
            }
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('.btn-close-modal').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Botões de exportação
        modal.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                const includeStats = document.getElementById('includeStatsCheck').checked;
                const includeFilters = document.getElementById('includeFiltersCheck').checked;

                closeModal();

                if (type === 'servidores') {
                    if (format === 'excel') {
                        this.exportServidoresToExcel(null, { includeStats, includeFilters });
                    } else {
                        this.exportServidoresToCSV();
                    }
                } else {
                    if (format === 'excel') {
                        this.exportNotificacoesToExcel();
                    }
                }
            });
        });

        // Animação/abertura: usar helper do dashboard se disponível para gerenciar foco/aria
        requestAnimationFrame(() => {
            if (this.dashboard && typeof this.dashboard._openModalElement === 'function') {
                try {
                    this.dashboard._openModalElement(modal);
                } catch (e) {
                    modal.classList.add('show');
                }
            } else {
                modal.classList.add('show');
            }
        });
    }

    /**
     * Toast notifications
     */
    showExportingToast(message) {
        this.showToast(message, 'info', 0); // 0 = não fecha automaticamente
    }

    showSuccessToast(message) {
        this.closeAllToasts(); // Fechar toast de "exportando"
        this.showToast(message, 'success', 3000);
    }

    showErrorToast(message) {
        this.closeAllToasts();
        this.showToast(message, 'error', 4000);
    }

    showToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `export-toast export-toast-${type}`;
        
        const icons = {
            info: 'hourglass-split',
            success: 'check-circle-fill',
            error: 'exclamation-circle-fill'
        };

        toast.innerHTML = `
            <i class="bi bi-${icons[type]}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        if (duration > 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    }

    closeAllToasts() {
        document.querySelectorAll('.export-toast').forEach(toast => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }
}
