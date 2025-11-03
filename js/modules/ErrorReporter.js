/**
 * ErrorReporter.js
 * Renderiza modal melhorado de problemas com categorização e sugestões
 * Permite exportar linhas com erro
 */

class ErrorReporter {
    constructor(validationManager) {
        this.validationManager = validationManager;
        this.currentProblems = [];
        this.currentCategory = 'all';
    }

    /**
     * Mostra o modal de problemas com os erros categorizados
     * @param {Array} problems - Lista de problemas
     * @param {Array} servidores - Lista de servidores (para contexto)
     */
    showProblemsModal(problems, servidores = []) {
        this.currentProblems = problems;

        const modal = document.getElementById('problemsModal');
        if (!modal) {
            console.error('Modal de problemas não encontrado');
            return;
        }

        // Categorizar erros
        const categorized = this.validationManager.categorizeErrors(problems);

        // Renderizar modal
        this.renderModal(modal, categorized, problems);

        // Mostrar modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    /**
     * Renderiza o conteúdo do modal
     */
    renderModal(modal, categorized, allProblems) {
        const modalBody = modal.querySelector('#problemsModalBody');
        if (!modalBody) return;

        // Contar problemas por categoria
        const counts = {};
        let totalProblems = 0;
        Object.keys(categorized).forEach(cat => {
            counts[cat] = categorized[cat].length;
            totalProblems += categorized[cat].length;
        });

        // Renderizar abas e conteúdo
        modalBody.innerHTML = `
            <div class="problems-tabs">
                <button class="problem-tab ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
                    <i class="bi bi-list-ul"></i>
                    Todos (${totalProblems})
                </button>
                ${counts.INVALID_DATE > 0 ? `
                    <button class="problem-tab" data-category="INVALID_DATE">
                        <i class="bi bi-calendar-x"></i>
                        Datas Inválidas (${counts.INVALID_DATE})
                    </button>
                ` : ''}
                ${counts.DATE_CONFLICT > 0 ? `
                    <button class="problem-tab" data-category="DATE_CONFLICT">
                        <i class="bi bi-exclamation-triangle"></i>
                        Conflitos (${counts.DATE_CONFLICT})
                    </button>
                ` : ''}
                ${counts.UNRECOGNIZED_FORMAT > 0 ? `
                    <button class="problem-tab" data-category="UNRECOGNIZED_FORMAT">
                        <i class="bi bi-question-circle"></i>
                        Formato (${counts.UNRECOGNIZED_FORMAT})
                    </button>
                ` : ''}
                ${counts.MISSING_FIELD > 0 ? `
                    <button class="problem-tab" data-category="MISSING_FIELD">
                        <i class="bi bi-dash-circle"></i>
                        Campos Vazios (${counts.MISSING_FIELD})
                    </button>
                ` : ''}
                ${counts.INCOMPLETE_DATA > 0 ? `
                    <button class="problem-tab" data-category="INCOMPLETE_DATA">
                        <i class="bi bi-info-circle"></i>
                        Incompletos (${counts.INCOMPLETE_DATA})
                    </button>
                ` : ''}
            </div>

            <div class="problems-toolbar">
                <button class="btn-secondary btn-sm" id="copyProblemsBtn">
                    <i class="bi bi-clipboard"></i>
                    Copiar Lista
                </button>
                <button class="btn-secondary btn-sm" id="exportProblemsBtn">
                    <i class="bi bi-download"></i>
                    Exportar CSV
                </button>
            </div>

            <div class="problems-content-container" id="problemsContentContainer">
                ${this.renderProblemsContent(categorized, allProblems)}
            </div>
        `;

        // Event listeners para abas
        modalBody.querySelectorAll('.problem-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentCategory = tab.dataset.category;
                modalBody.querySelectorAll('.problem-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const container = document.getElementById('problemsContentContainer');
                if (container) {
                    container.innerHTML = this.renderProblemsContent(categorized, allProblems);
                }
            });
        });

        // Event listeners para botões
        const copyBtn = document.getElementById('copyProblemsBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyProblemsToClipboard());
        }

        const exportBtn = document.getElementById('exportProblemsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProblemsToCSV());
        }
    }

    /**
     * Renderiza o conteúdo dos problemas baseado na categoria selecionada
     */
    renderProblemsContent(categorized, allProblems) {
        const problemsToShow = this.currentCategory === 'all'
            ? allProblems
            : categorized[this.currentCategory] || [];

        if (problemsToShow.length === 0) {
            return `
                <div class="problems-empty">
                    <i class="bi bi-check-circle"></i>
                    <p>Nenhum problema encontrado nesta categoria</p>
                </div>
            `;
        }

        return problemsToShow.map((problem, index) => {
            const category = this.validationManager.detectErrorCategory(problem);
            const suggestion = this.validationManager.generateSuggestion({ ...problem, category });
            const severity = problem.severity || 'error';

            return `
                <div class="problem-item ${severity}">
                    <div class="problem-header">
                        <div class="problem-icon">
                            ${this.getIconForCategory(category)}
                        </div>
                        <div class="problem-info">
                            <div class="problem-title">
                                <strong>${problem.servidor || 'Linha ' + (index + 1)}</strong>
                                ${problem.contexto ? `<span class="problem-context">${problem.contexto}</span>` : ''}
                            </div>
                            <div class="problem-message">
                                ${problem.problema || problem.message}
                            </div>
                        </div>
                        <div class="problem-badge badge-${severity}">
                            ${severity === 'error' ? 'Erro' : 'Aviso'}
                        </div>
                    </div>
                    <div class="problem-suggestion">
                        <i class="bi bi-lightbulb"></i>
                        <span>${suggestion}</span>
                    </div>
                    ${problem.valor ? `
                        <div class="problem-value">
                            <strong>Valor:</strong> <code>${this.escapeHtml(problem.valor)}</code>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Retorna ícone apropriado para cada categoria
     */
    getIconForCategory(category) {
        const icons = {
            INVALID_DATE: '<i class="bi bi-calendar-x"></i>',
            DATE_CONFLICT: '<i class="bi bi-exclamation-triangle-fill"></i>',
            UNRECOGNIZED_FORMAT: '<i class="bi bi-question-circle-fill"></i>',
            MISSING_FIELD: '<i class="bi bi-dash-circle-fill"></i>',
            INCOMPLETE_DATA: '<i class="bi bi-info-circle-fill"></i>',
            PARSE_ERROR: '<i class="bi bi-x-octagon-fill"></i>',
            OTHER: '<i class="bi bi-exclamation-circle-fill"></i>'
        };
        return icons[category] || icons.OTHER;
    }

    /**
     * Copia problemas para clipboard
     */
    async copyProblemsToClipboard() {
        const text = this.currentProblems.map((p, i) => {
            return `${i + 1}. ${p.servidor || 'Linha ' + i}\n   ${p.problema || p.message}\n   ${p.contexto || ''}`;
        }).join('\n\n');

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Lista copiada para a área de transferência', 'success');
        } catch (error) {
            console.error('Erro ao copiar:', error);
            this.showToast('Erro ao copiar lista', 'error');
        }
    }

    /**
     * Exporta problemas para CSV
     */
    exportProblemsToCSV() {
        // Criar CSV
        const headers = ['#', 'Servidor', 'Problema', 'Contexto', 'Valor', 'Sugestão'];
        const rows = this.currentProblems.map((p, i) => {
            const category = this.validationManager.detectErrorCategory(p);
            const suggestion = this.validationManager.generateSuggestion({ ...p, category });

            return [
                i + 1,
                p.servidor || '',
                (p.problema || p.message || '').replace(/"/g, '""'),
                (p.contexto || '').replace(/"/g, '""'),
                (p.valor || '').replace(/"/g, '""'),
                suggestion.replace(/"/g, '""')
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `problemas-${new Date().getTime()}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    this.showToast('CSV exportado com sucesso', 'success');
    }

    /**
     * Fecha o modal de problemas
     */
    closeModal() {
        const modal = document.getElementById('problemsModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Mostra toast de notificação
     */
    showToast(message, type = 'info') {
        // Centraliza todas as notificações no NotificationManager
        if (window.dashboard && dashboard.notificationManager && typeof dashboard.notificationManager.showToast === 'function') {
            dashboard.notificationManager.showToast({
                title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Aviso',
                message,
                priority: type === 'success' ? 'low' : type === 'error' ? 'critical' : 'high',
                icon: type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-x-circle' : 'bi-exclamation-circle'
            });
        } else {
            // fallback mínimo
            alert(message);
        }
    }

    /**
     * Escapa HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ErrorReporter = ErrorReporter;
}
