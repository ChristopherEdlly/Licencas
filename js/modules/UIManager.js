/**
 * UIManager - Gerenciamento de interface do usuário
 * Responsável por: Modals, notificações, navegação, sidebar, tema
 */

class UIManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentPage = 'home';
    }

    /**
     * Configurar event listeners da UI
     */
    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');

        if (sidebarToggle && sidebar && mainContent) {
            this.setupSidebarToggle(sidebarToggle, sidebar, mainContent);
        }

        // Upload de arquivo - conectar botão ao input file
        const uploadButton = document.getElementById('uploadButton');
        const fileInput = document.getElementById('fileInput');
        if (uploadButton && fileInput) {
            uploadButton.addEventListener('click', () => {
                fileInput.click();
            });
            fileInput.addEventListener('change', (e) => this.dashboard.fileManager.handleFileUpload(e));
        }

        // Pesquisa
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.dashboard.filterManager.handleSearch(e.target.value);
            });
        }

        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                this.dashboard.filterManager.clearSearch();
            });
        }

        // Filtros
        const minAge = document.getElementById('minAge');
        const maxAge = document.getElementById('maxAge');
        if (minAge && maxAge) {
            [minAge, maxAge].forEach(input => {
                input.addEventListener('input', () => {
                    this.dashboard.filterManager.applyAgeFilter();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.dashboard.filterManager.applyAgeFilter();
                    }
                });
            });
        }

        const urgencyFilter = document.getElementById('urgencyFilter');
        const cargoFilter = document.getElementById('cargoFilter');
        if (urgencyFilter && cargoFilter) {
            urgencyFilter.addEventListener('change', () => this.dashboard.filterManager.applyFilters());
            cargoFilter.addEventListener('change', () => this.dashboard.filterManager.applyFilters());
        }

        // Period filter (month selector)
        const periodFilter = document.getElementById('mesFilter');
        if (periodFilter) {
            periodFilter.addEventListener('change', () => {
                const isLicencaPremio = this.dashboard.allServidores.length > 0 && 
                                       this.dashboard.allServidores[0].tipoTabela === 'licenca-premio';
                if (isLicencaPremio) {
                    this.dashboard.applyLicencaFilters();
                }
            });
        }

        // Timeline view change
        const timelineView = document.getElementById('timelineView');
        if (timelineView) {
            timelineView.addEventListener('change', () => {
                this.dashboard.chartManager.toggleControlsVisibility();
                this.dashboard.chartManager.updateTimelineChart();
            });
        }

        // Timeline year change
        const timelineYear = document.getElementById('timelineYear');
        if (timelineYear) {
            timelineYear.addEventListener('change', () => {
                this.dashboard.chartManager.updateTimelineChart();
            });
        }

        // Timeline month change
        const timelineMonth = document.getElementById('timelineMonth');
        if (timelineMonth) {
            timelineMonth.addEventListener('change', () => {
                this.dashboard.chartManager.updateTimelineChart();
            });
        }

        // Calendar year change
        const calendarYear = document.getElementById('calendarYearFilter');
        if (calendarYear) {
            calendarYear.addEventListener('change', () => {
                const year = parseInt(calendarYear.value);
                this.dashboard.calendarManager.updateYearlyHeatmap(year);
            });
        }

        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.dashboard.filterManager.clearAllFilters();
            });
        }

        // Limpar arquivo armazenado
        const clearStoredFile = document.getElementById('clearStoredFile');
        if (clearStoredFile) {
            clearStoredFile.addEventListener('click', async () => {
                if (confirm('Deseja remover o arquivo armazenado? Você precisará fazer upload novamente.')) {
                    await this.dashboard.fileManager.clearStoredFile();
                }
            });
        }

        // File System Access
        const fsAccessBtn = document.getElementById('fsAccessBtn');
        if (fsAccessBtn) {
            fsAccessBtn.addEventListener('click', () => {
                this.dashboard.fileManager.handleFileSystemAccess();
            });
        }

        // Calendar navigation
        const prevYear = document.getElementById('prevYear');
        const nextYear = document.getElementById('nextYear');
        if (prevYear) {
            prevYear.addEventListener('click', () => {
                this.dashboard.calendarManager.changeCalendarYear(-1);
            });
        }
        if (nextYear) {
            nextYear.addEventListener('click', () => {
                this.dashboard.calendarManager.changeCalendarYear(1);
            });
        }

        // Modal close
        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.dashboard.modalManager.closeModal();
                }
            });
        }
        const closeModal = document.getElementById('closeModal') || document.getElementById('modalCloseBtn');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.dashboard.modalManager.closeModal();
            });
        }

        // Error card click
        const errorCard = document.querySelector('.stat-card.critical');
        if (errorCard) {
            errorCard.addEventListener('click', () => {
                this.dashboard.modalManager.showProblemsModal();
            });
        }

        // Table button clicks (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-icon[data-servidor-nome]')) {
                const btn = e.target.closest('.btn-icon[data-servidor-nome]');
                const nomeServidor = btn.getAttribute('data-servidor-nome');
                if (nomeServidor) {
                    this.dashboard.modalManager.showServidorDetails(nomeServidor);
                }
            }
        });
    }

    /**
     * Configurar toggle da sidebar
     */
    setupSidebarToggle(toggle, sidebar, mainContent) {
        const swapSidebarLogo = (useCompact) => {
            try {
                const logoImg = document.querySelector('.brand img.brand-text');
                if (!logoImg) return;
                const compact = logoImg.getAttribute('data-compact-src');
                const original = logoImg.getAttribute('data-original-src') || logoImg.src;
                if (!logoImg.getAttribute('data-original-src')) {
                    logoImg.setAttribute('data-original-src', logoImg.src);
                }
                const newSrc = useCompact ? compact : original;
                if (newSrc && logoImg.src !== newSrc) {
                    logoImg.style.opacity = '0';
                    setTimeout(() => {
                        logoImg.src = newSrc;
                        setTimeout(() => {logoImg.style.opacity = '1';}, 50);
                    }, 150);
                }
            } catch (e) {
                console.error('Erro ao trocar logo:', e);
            }
        };

        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            swapSidebarLogo(true);
        }

        toggle.addEventListener('click', () => {
            const isCollapsed = sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            setTimeout(() => swapSidebarLogo(isCollapsed), 150);
            
            // Atualizar gráficos após animação
            setTimeout(() => {
                Object.values(this.dashboard.chartManager.charts).forEach(chart => {
                    if (chart) chart.resize();
                });
            }, 300);
        });
    }

    /**
     * Inicializar navegação entre páginas
     */
    initNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const pageId = e.currentTarget.getAttribute('data-page');
                if (pageId) {
                    e.preventDefault();
                    this.switchPage(pageId);
                }
            });
        });
    }

    /**
     * Trocar de página
     */
    switchPage(pageId) {
        console.log(`🔄 Mudando para página: ${pageId}`);
        
        // Ocultar todas as páginas
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Ativar página selecionada - mapear IDs
        const pageMap = {
            'home': 'homePage',
            'calendar': 'calendarPage',
            'timeline': 'timelinePage'
        };
        
        const targetPageId = pageMap[pageId] || pageId;
        const targetPage = document.getElementById(targetPageId);
        
        if (targetPage) {
            targetPage.classList.add('active');
            console.log(`✅ Página ${targetPageId} ativada`);
        } else {
            console.error(`❌ Página ${targetPageId} não encontrada`);
        }

        // Atualizar navegação
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageId) {
                link.classList.add('active');
            }
        });

        this.currentPage = pageId;
        this.switchFilters(pageId);
        
        // Atualizar calendar quando entrar na página
        if (pageId === 'calendar' && this.dashboard.calendarManager) {
            setTimeout(() => {
                this.dashboard.calendarManager.updateYearlyHeatmap();
            }, 100);
        }
        
        // Atualizar gráficos se necessário
        if (pageId === 'home' && this.dashboard.allServidores.length > 0) {
            setTimeout(() => {
                Object.values(this.dashboard.chartManager.charts).forEach(chart => {
                    if (chart) chart.resize();
                });
            }, 100);
        }
    }

    /**
     * Alternar filtros baseado na página
     */
    switchFilters(pageId) {
        const filterSection = document.querySelector('.filter-section');
        if (!filterSection) return;

        if (pageId === 'home') {
            filterSection.style.display = 'block';
        } else {
            filterSection.style.display = 'none';
        }
    }

    /**
     * Mostrar estado vazio
     */
    showEmptyState() {
        this.dashboard.filteredServidores = [];
        this.dashboard.updateTable();
        this.dashboard.updateStats();
    }

    /**
     * Mostrar notificação de auto-carregamento
     */
    showAutoLoadNotification(fileInfo, onConfirm) {
        const notification = document.createElement('div');
        notification.className = 'auto-load-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="bi bi-cloud-arrow-down"></i>
                <div class="notification-text">
                    <strong>Arquivo encontrado</strong>
                    <span>${fileInfo.name}</span>
                </div>
                <div class="notification-actions">
                    <button class="btn-confirm">Carregar</button>
                    <button class="btn-dismiss">Ignorar</button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        notification.querySelector('.btn-confirm').addEventListener('click', () => {
            onConfirm(true);
            this.removeNotification(notification);
        });

        notification.querySelector('.btn-dismiss').addEventListener('click', () => {
            onConfirm(false);
            this.removeNotification(notification);
        });

        setTimeout(() => notification.classList.add('show'), 100);
    }

    /**
     * Remover notificação
     */
    removeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }

    /**
     * Mostrar detalhes do servidor em modal
     */
    showServidorDetails(nomeServidor) {
        const servidor = this.dashboard.allServidores.find(s => s.nome === nomeServidor);
        if (!servidor) return;

        const modal = document.getElementById('servidorModal');
        if (!modal) return;

        // O código completo do modal seria muito extenso
        // Mantemos a implementação atual
        modal.classList.add('active');
    }

    /**
     * Inicializar tabs de período
     */
    initPeriodTabs() {
        document.querySelectorAll('.period-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const period = tab.getAttribute('data-period');
                // Lógica de atualização de período
            });
        });
    }

    /**
     * Atualizar contagem de problemas
     */
    updateProblemsCount() {
        const count = this.dashboard.loadingProblems.length;
        const badge = document.querySelector('.problems-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    /**
     * Atualizar última atualização
     */
    updateLastUpdate() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            const now = new Date();
            element.textContent = now.toLocaleString('pt-BR');
        }
    }

    /**
     * Integração com tema
     */
    setupThemeIntegration() {
        window.addEventListener('themeChanged', (e) => {
            this.onThemeChanged(e.detail.theme);
        });
    }

    /**
     * Callback de mudança de tema
     */
    onThemeChanged(theme) {
        // Atualizar cores dos gráficos se necessário
        Object.values(this.dashboard.chartManager.charts).forEach(chart => {
            if (chart) chart.update();
        });
    }
    
    /**
     * Mostrar loading overlay
     */
    showLoading(message = 'Carregando...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = loadingOverlay?.querySelector('.loading-text');

        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }

        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Esconder loading overlay
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }
    
    /**
     * Atualizar status no header
     */
    updateHeaderStatus() {
        // Atualizar contagem total
        const totalElement = document.getElementById('totalServidores');
        if (totalElement) {
            totalElement.textContent = this.dashboard.allServidores.length;
        }

        // Atualizar contagem filtrada
        const filteredElement = document.getElementById('filteredCount');
        if (filteredElement) {
            filteredElement.textContent = this.dashboard.filteredServidores.length;
        }
    }
    
    /**
     * Alternar visibilidade do botão limpar busca
     */
    toggleClearSearchButton() {
        const searchInput = document.getElementById('searchInput');
        const clearButton = document.getElementById('clearSearch');
        if (clearButton && searchInput) {
            clearButton.style.display = searchInput.value ? 'block' : 'none';
        }
    }
}
