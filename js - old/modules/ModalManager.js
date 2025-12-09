class ModalManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    showModal(title, content, modalClass = '') {
        const modalTitle = document.querySelector('#detailsModal .modal-header h3');
        const modalBody = document.getElementById('modalBody');
        const modal = document.getElementById('detailsModal');

        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) {
            if (!content.includes('modal-sections')) {
                modalBody.innerHTML = content;
            } else {
                modalBody.innerHTML = content;
            }
        }

        if (modal) {
            if (this.dashboard && typeof this.dashboard._openModalElement === 'function') {
                try { this.dashboard._openModalElement(modal); } catch (e) { modal.classList.add('show'); }
            } else {
                modal.classList.add('show');
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('modal') || document.getElementById('detailsModal');
        if (modal) {
            if (this.dashboard && typeof this.dashboard._closeModalElement === 'function') {
                try { this.dashboard._closeModalElement(modal); } catch (e) { modal.classList.remove('show'); }
            } else {
                modal.classList.remove('show');
            }
        }
    }

    showServidorDetails(nomeServidor) {
        const servidoresComMesmoNome = this.dashboard.allServidores.filter(s => s.nome === nomeServidor);
        if (!servidoresComMesmoNome || servidoresComMesmoNome.length === 0) return;

        const servidor = { ...servidoresComMesmoNome[0] };
        servidor.licencas = [];
        const licencasUnicas = new Set();
        const todosOsDadosOriginais = [];
        const licencasBrutas = [];

        servidoresComMesmoNome.forEach(s => {
            if (s.dadosOriginais) todosOsDadosOriginais.push(s.dadosOriginais);
            if (s.licencas && s.licencas.length > 0) {
                s.licencas.forEach(l => {
                    licencasBrutas.push(Object.assign({}, l));
                    const chave = `${l.inicio.getTime()}-${l.fim.getTime()}-${l.tipo}`;
                    if (!licencasUnicas.has(chave)) {
                        licencasUnicas.add(chave);
                        servidor.licencas.push(l);
                    }
                });
            }
        });

        servidor.todosOsDadosOriginais = todosOsDadosOriginais;
        servidor.licencasBrutas = licencasBrutas;
        servidor.licencas.sort((a, b) => a.inicio - b.inicio);

        const periodosAgrupados = this.agruparLicencasPorPeriodos(servidor.licencas);
        servidor.licencasAgendadas = servidor.licencas.length;

        const isLicencaPremio = servidor.tipoTabela === 'licenca-premio';

        let content = `<div class="modal-sections">`;
        
        // Seção 1: Dados da planilha
        content += `<div class="modal-section"><h4>📋 Registros da Planilha</h4>`;
        if (servidor.todosOsDadosOriginais && servidor.todosOsDadosOriginais.length > 0) {
            const dadosConsolidados = new Map();
            servidor.todosOsDadosOriginais.forEach((dados) => {
                Object.entries(dados).forEach(([key, value]) => {
                    const keyUpper = key.toUpperCase();
                    if (!keyUpper.includes('SERVIDOR') && !keyUpper.includes('NOME') && 
                        value && value !== '' && value !== 'undefined' && value !== 'null') {
                        dadosConsolidados.set(key, value);
                    }
                });
            });
            
            content += `<div class="data-grid">`;
            dadosConsolidados.forEach((value, key) => {
                content += `<div class="data-item"><strong>${key}:</strong> ${value}</div>`;
            });
            content += `</div>`;
        }
        content += `</div>`;

        // Seção 2: Períodos agrupados
        content += `<div class="modal-section"><h4>📅 Períodos de Licença</h4>`;
        if (periodosAgrupados.length > 0) {
            content += `<div class="periodos-list">`;
            periodosAgrupados.forEach((periodo, index) => {
                const inicio = this.formatDate(periodo.inicio);
                const fim = this.formatDate(periodo.fim);
                const dias = Math.ceil((periodo.fim - periodo.inicio) / (1000 * 60 * 60 * 24)) + 1;
                content += `
                    <div class="periodo-item">
                        <span class="periodo-number">${index + 1}</span>
                        <div class="periodo-info">
                            <div class="periodo-dates">${inicio} - ${fim}</div>
                            <div class="periodo-duration">${dias} dias corridos</div>
                        </div>
                    </div>
                `;
            });
            content += `</div>`;
        }
        content += `</div>`;

        // Seção 3: Estatísticas
        const hoje = new Date();
        const proximaLicenca = servidor.licencas.find(l => l.inicio > hoje);
        content += `<div class="modal-section"><h4>📊 Estatísticas</h4>`;
        content += `<div class="stats-grid">`;
        content += `<div class="stat-item"><strong>Licenças Agendadas:</strong> ${servidor.licencasAgendadas}</div>`;
        if (proximaLicenca) {
            const diasRestantes = Math.ceil((proximaLicenca.inicio - hoje) / (1000 * 60 * 60 * 24));
            content += `<div class="stat-item"><strong>Próxima Licença:</strong> ${this.formatDate(proximaLicenca.inicio)} (em ${diasRestantes} dias)</div>`;
        }
        content += `</div></div>`;

        content += `</div>`;
        this.showModal(servidor.nome, content, 'servidor-modal');
    }

    agruparLicencasPorPeriodos(licencas) {
        if (!licencas || licencas.length === 0) return [];

        const licencasOrdenadas = [...licencas].sort((a, b) => a.inicio - b.inicio);
        const periodos = [];
        let periodoAtual = null;

        for (let i = 0; i < licencasOrdenadas.length; i++) {
            const licenca = licencasOrdenadas[i];

            if (!periodoAtual) {
                periodoAtual = {
                    inicio: licenca.inicio,
                    fim: licenca.fim,
                    licencas: [licenca],
                    tipo: licenca.tipo
                };
                periodos.push(periodoAtual);
            } else {
                const ultimaLicenca = periodoAtual.licencas[periodoAtual.licencas.length - 1];
                const ultimaFim = new Date(ultimaLicenca.fim);
                const licencaInicio = new Date(licenca.inicio);

                const licencaInicioMonthStart = new Date(licencaInicio.getFullYear(), licencaInicio.getMonth(), 1);
                const ultimaFimMonthStart = new Date(ultimaFim.getFullYear(), ultimaFim.getMonth(), 1);
                const proximoMesStart = new Date(ultimaFimMonthStart);
                proximoMesStart.setMonth(proximoMesStart.getMonth() + 1);

                const overlaps = licencaInicio <= ultimaFim;
                const isContiguous = licencaInicioMonthStart.getTime() === proximoMesStart.getTime();

                if (overlaps || isContiguous) {
                    periodoAtual.fim = new Date(Math.max(periodoAtual.fim.getTime(), licenca.fim.getTime()));
                    periodoAtual.licencas.push(licenca);
                } else {
                    periodoAtual = {
                        inicio: licenca.inicio,
                        fim: licenca.fim,
                        licencas: [licenca],
                        tipo: licenca.tipo
                    };
                    periodos.push(periodoAtual);
                }
            }
        }

        return periodos;
    }

    showProblemsModal() {
        const problems = this.dashboard.loadingProblems;
        if (!problems || problems.length === 0) {
            this.showModal('Problemas', '<p>Nenhum problema encontrado.</p>');
            return;
        }

        let content = `<div class="problems-list">`;
        content += `<p>Total de problemas encontrados: <strong>${problems.length}</strong></p>`;
        content += `<div class="problem-items">`;
        
        problems.forEach((problem, index) => {
            content += `
                <div class="problem-item">
                    <div class="problem-header">
                        <span class="problem-number">${index + 1}</span>
                        <span class="problem-type">${problem.tipo}</span>
                    </div>
                    <div class="problem-details">
                        <div><strong>Servidor:</strong> ${problem.servidor || 'N/A'}</div>
                        <div><strong>Linha:</strong> ${problem.linha || 'N/A'}</div>
                        <div><strong>Mensagem:</strong> ${problem.mensagem}</div>
                    </div>
                </div>
            `;
        });
        
        content += `</div></div>`;
        this.showModal('⚠️ Problemas no Carregamento', content, 'problems-modal');
    }

    showTimelineModal(label, servidores, period) {
        if (!servidores || servidores.length === 0) {
            this.showModal('Timeline', '<p>Nenhum servidor encontrado para este período.</p>');
            return;
        }

        const sortField = this.dashboard.currentSort || 'nome';
        const sortDirection = this.dashboard.currentSortDirection || 'asc';
        
        const sorted = [...servidores].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            
            if (sortField === 'diasRestantes') {
                valA = this.dashboard.calcularDiasRestantes(a);
                valB = this.dashboard.calcularDiasRestantes(b);
            }
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        let content = `
            <div class="timeline-modal-content">
                <div class="modal-header-info">
                    <h4>${label}</h4>
                    <p>${servidores.length} servidor(es)</p>
                </div>
                <div class="sort-controls">
                    <button onclick="dashboard.modalManager.sortTimelineModal('nome', 'asc', '${label}', ${JSON.stringify(servidores).replace(/"/g, '&quot;')}, '${period}')">Nome ↑</button>
                    <button onclick="dashboard.modalManager.sortTimelineModal('nome', 'desc', '${label}', ${JSON.stringify(servidores).replace(/"/g, '&quot;')}, '${period}')">Nome ↓</button>
                    <button onclick="dashboard.modalManager.sortTimelineModal('cargo', 'asc', '${label}', ${JSON.stringify(servidores).replace(/"/g, '&quot;')}, '${period}')">Cargo ↑</button>
                    <button onclick="dashboard.modalManager.sortTimelineModal('cargo', 'desc', '${label}', ${JSON.stringify(servidores).replace(/"/g, '&quot;')}, '${period}')">Cargo ↓</button>
                </div>
                <div class="servidores-list">
        `;

        sorted.forEach(servidor => {
            const urgencia = this.dashboard.calcularUrgencia(servidor);
            const diasRestantes = this.dashboard.calcularDiasRestantes(servidor);
            content += `
                <div class="servidor-card" onclick="dashboard.modalManager.showServidorDetails('${this.escapeHtml(servidor.nome)}')">
                    <div class="servidor-info">
                        <div class="servidor-nome">${servidor.nome}</div>
                        <div class="servidor-cargo">${servidor.cargo || 'N/A'}</div>
                    </div>
                    <div class="servidor-urgencia urgency-${urgencia.toLowerCase()}">${urgencia}</div>
                    <div class="servidor-dias">${diasRestantes} dias</div>
                </div>
            `;
        });

        content += `</div></div>`;
        this.showModal('Timeline - ' + label, content, 'timeline-modal');
    }

    sortTimelineModal(field, direction, label, servidores, period) {
        this.dashboard.currentSort = field;
        this.dashboard.currentSortDirection = direction;
        this.showTimelineModal(label, servidores, period);
    }

    showPeriodStatsModal(periodLabel, servidores, periodFilter) {
        if (!servidores || servidores.length === 0) {
            this.showModal('Estatísticas do Período', '<p>Nenhum servidor encontrado.</p>');
            return;
        }

        let content = `
            <div class="period-stats-content">
                <div class="stats-header">
                    <h4>${periodLabel}</h4>
                    <p>${servidores.length} servidor(es)</p>
                </div>
                <div class="urgency-breakdown">
                    <h5>Por Urgência:</h5>
        `;

        const urgencyCounts = { 'CRÍTICA': 0, 'ALTA': 0, 'MODERADA': 0 };
        servidores.forEach(s => {
            const urg = this.dashboard.calcularUrgencia(s);
            urgencyCounts[urg]++;
        });

        Object.entries(urgencyCounts).forEach(([urg, count]) => {
            content += `<div class="urgency-stat urgency-${urg.toLowerCase()}">${urg}: ${count}</div>`;
        });

        content += `</div><div class="servidores-list">`;

        servidores.forEach(servidor => {
            const urgencia = this.dashboard.calcularUrgencia(servidor);
            const diasRestantes = this.dashboard.calcularDiasRestantes(servidor);
            content += `
                <div class="servidor-card" onclick="dashboard.modalManager.showServidorDetails('${this.escapeHtml(servidor.nome)}')">
                    <div class="servidor-info">
                        <div class="servidor-nome">${servidor.nome}</div>
                        <div class="servidor-cargo">${servidor.cargo || 'N/A'}</div>
                    </div>
                    <div class="servidor-urgencia urgency-${urgencia.toLowerCase()}">${urgencia}</div>
                    <div class="servidor-dias">${diasRestantes} dias</div>
                </div>
            `;
        });

        content += `</div></div>`;
        this.showModal('Estatísticas - ' + periodLabel, content, 'period-stats-modal');
    }

    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
