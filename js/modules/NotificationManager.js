/**
 * NotificationManager.js
 * 
 * Sistema inteligente de notificações para o dashboard
 * 
 * Funcionalidades:
 * - Notificações de proximidade de aposentadoria
 * - Alertas de conflitos de datas de licenças
 * - Avisos de licenças vencidas ou próximas ao vencimento
 * - Centro de notificações com histórico
 * - Priorização automática (crítica, alta, média, baixa)
 * - Toast notifications elegantes
 * - Persistência em localStorage
 * - Filtros e busca no centro de notificações
 * - Marcação como lida/não lida
 * - Agrupamento por tipo e data
 * 
 * @author Dashboard Licenças Premium
 * @version 4.0.0
 */

class NotificationManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        
        // Estado das notificações
        this.notifications = [];
        this.unreadCount = 0;
        this.maxNotifications = 100;
        
        // Tipos de notificação
        this.notificationTypes = {
            APOSENTADORIA_PROXIMA: {
                icon: 'bi-hourglass-split',
                color: '#ffc107',
                priority: 'high',
                label: 'Aposentadoria Próxima'
            },
            LICENCA_VENCIDA: {
                icon: 'bi-exclamation-triangle',
                color: '#dc3545',
                priority: 'critical',
                label: 'Licença Vencida'
            },
            LICENCA_PROXIMA_VENCIMENTO: {
                icon: 'bi-clock-history',
                color: '#fd7e14',
                priority: 'high',
                label: 'Licença Próxima ao Vencimento'
            },
            CONFLITO_DATAS: {
                icon: 'bi-calendar-x',
                color: '#dc3545',
                priority: 'critical',
                label: 'Conflito de Datas'
            },
            SERVIDOR_SEM_LICENCA: {
                icon: 'bi-calendar-plus',
                color: '#0dcaf0',
                priority: 'medium',
                label: 'Servidor Sem Licença Agendada'
            },
            URGENCIA_CRITICA: {
                icon: 'bi-lightning',
                color: '#dc3545',
                priority: 'critical',
                label: 'Urgência Crítica'
            },
            DADOS_INCOMPLETOS: {
                icon: 'bi-file-earmark-excel',
                color: '#6c757d',
                priority: 'low',
                label: 'Dados Incompletos'
            },
            INFO: {
                icon: 'bi-info-circle',
                color: '#0d6efd',
                priority: 'low',
                label: 'Informação'
            }
        };
        
        // Configurações
        this.config = {
            autoShowToast: true,
            toastDuration: 5000,
            soundEnabled: false,
            desktopNotifications: false,
            aposentadoriaThreshold: 365, // dias para considerar "próxima"
            licencaVencimentoThreshold: 30, // dias para alertar vencimento
        };
        
        // UI Elements
        this.notificationBell = null;
        this.notificationCenter = null;
        this.toastContainer = null;
        
        this.init();
    }
    
    /**
     * Inicializa o gerenciador de notificações
     */
    async init() {
        
        try {
            // Carrega notificações salvas
            this.loadNotifications();
            
            // Cria UI
            this.createNotificationBell();
            this.createNotificationCenter();
            this.createToastContainer();
            
            // Registra listeners
            this.registerListeners();
            
            // Carrega configurações
            this.loadConfig();
            
            // Solicita permissão para notificações desktop
            if (this.config.desktopNotifications && 'Notification' in window) {
                Notification.requestPermission();
            }
            
            
        } catch (error) {
            console.error('❌ Erro ao inicializar NotificationManager:', error);
        }
    }
    
    /**
     * Analisa dados e gera notificações automaticamente
     */
    analyzeAndNotify(servidores) {
        if (!servidores || servidores.length === 0) return;
        
        console.log('🔍 Analisando dados para notificações...');
        
        let newNotifications = 0;
        const today = new Date();
        
        servidores.forEach(servidor => {
            // 1. Aposentadoria próxima
            if (servidor.aposentadoriaCompulsoria) {
                const aposentadoriaDate = new Date(servidor.aposentadoriaCompulsoria);
                const diasRestantes = Math.floor((aposentadoriaDate - today) / (1000 * 60 * 60 * 24));
                
                if (diasRestantes > 0 && diasRestantes <= this.config.aposentadoriaThreshold) {
                    this.addNotification({
                        type: 'APOSENTADORIA_PROXIMA',
                        title: `Aposentadoria em ${diasRestantes} dias`,
                        message: `${servidor.nome} se aposentará em ${aposentadoriaDate.toLocaleDateString('pt-BR')}`,
                        data: { servidor, diasRestantes },
                        autoShow: diasRestantes <= 90
                    });
                    newNotifications++;
                }
            }
            
            // 2. Licenças vencidas
            if (servidor.licencas && Array.isArray(servidor.licencas)) {
                servidor.licencas.forEach(licenca => {
                    if (licenca.dataLimite) {
                        const dataLimite = new Date(licenca.dataLimite);
                        const diasAteVencimento = Math.floor((dataLimite - today) / (1000 * 60 * 60 * 24));
                        
                        // Vencida
                        if (diasAteVencimento < 0) {
                            this.addNotification({
                                type: 'LICENCA_VENCIDA',
                                title: 'Licença Vencida!',
                                message: `${servidor.nome} tem licença vencida há ${Math.abs(diasAteVencimento)} dias`,
                                data: { servidor, licenca, diasVencido: Math.abs(diasAteVencimento) },
                                autoShow: Math.abs(diasAteVencimento) <= 7
                            });
                            newNotifications++;
                        }
                        // Próxima ao vencimento
                        else if (diasAteVencimento <= this.config.licencaVencimentoThreshold) {
                            this.addNotification({
                                type: 'LICENCA_PROXIMA_VENCIMENTO',
                                title: `Licença vence em ${diasAteVencimento} dias`,
                                message: `${servidor.nome} - Período: ${licenca.periodo || 'N/A'}`,
                                data: { servidor, licenca, diasAteVencimento },
                                autoShow: diasAteVencimento <= 7
                            });
                            newNotifications++;
                        }
                    }
                });
            }
            
            // 3. Servidor sem licença agendada
            if (!servidor.licencas || servidor.licencas.length === 0) {
                this.addNotification({
                    type: 'SERVIDOR_SEM_LICENCA',
                    title: 'Sem Licença Agendada',
                    message: `${servidor.nome} não possui licenças agendadas`,
                    data: { servidor },
                    autoShow: false
                });
            }
            
            // 4. Urgência crítica
            if (servidor.urgencia === 'Crítica') {
                this.addNotification({
                    type: 'URGENCIA_CRITICA',
                    title: 'Urgência Crítica!',
                    message: `${servidor.nome} requer atenção imediata`,
                    data: { servidor },
                    autoShow: true
                });
                newNotifications++;
            }
            
            // 5. Dados incompletos
            if (!servidor.nome || !servidor.cargo || !servidor.idade) {
                this.addNotification({
                    type: 'DADOS_INCOMPLETOS',
                    title: 'Dados Incompletos',
                    message: `Registro com informações faltando (ID: ${servidor.id || 'N/A'})`,
                    data: { servidor },
                    autoShow: false
                });
            }
        });
        
        // Detecta conflitos de datas
        this.detectDateConflicts(servidores);
        
        
        // Atualiza UI
        this.updateBellBadge();
        
        // Mostra resumo se houver muitas notificações novas
        if (newNotifications > 10) {
            this.showToast({
                type: 'INFO',
                title: 'Análise Completa',
                message: `${newNotifications} notificações importantes encontradas`,
                duration: 4000
            });
        }
    }
    
    /**
     * Detecta conflitos de datas de licenças
     */
    detectDateConflicts(servidores) {
        const licencasPorData = new Map();
        
        servidores.forEach(servidor => {
            if (servidor.licencas && Array.isArray(servidor.licencas)) {
                servidor.licencas.forEach(licenca => {
                    if (licenca.dataInicio) {
                        const key = licenca.dataInicio;
                        
                        if (!licencasPorData.has(key)) {
                            licencasPorData.set(key, []);
                        }
                        
                        licencasPorData.get(key).push({ servidor, licenca });
                    }
                });
            }
        });
        
        // Verifica conflitos
        licencasPorData.forEach((licencas, data) => {
            if (licencas.length > 3) { // Mais de 3 servidores na mesma data
                this.addNotification({
                    type: 'CONFLITO_DATAS',
                    title: `Conflito: ${licencas.length} licenças em ${data}`,
                    message: `Possível sobrecarga de ausências no setor`,
                    data: { data, licencas },
                    autoShow: licencas.length >= 5
                });
            }
        });
    }
    
    /**
     * Adiciona nova notificação
     */
    addNotification(config) {
        const notification = {
            id: this.generateId(),
            type: config.type,
            title: config.title,
            message: config.message,
            data: config.data || {},
            timestamp: Date.now(),
            read: false,
            priority: this.notificationTypes[config.type]?.priority || 'low',
            icon: this.notificationTypes[config.type]?.icon || 'bi-bell',
            color: this.notificationTypes[config.type]?.color || '#6c757d'
        };
        
        // Verifica duplicatas (mesma mensagem nas últimas 24h)
        const isDuplicate = this.notifications.some(n => 
            n.message === notification.message && 
            (Date.now() - n.timestamp) < 24 * 60 * 60 * 1000
        );
        
        if (isDuplicate) {
            return null;
        }
        
        // Adiciona ao array
        this.notifications.unshift(notification);
        this.unreadCount++;
        
        // Limita tamanho
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }
        
        // Salva
        this.saveNotifications();
        
        // Mostra toast se configurado
        if (config.autoShow && this.config.autoShowToast) {
            this.showToast(notification);
        }
        
        // Notificação desktop
        if (this.config.desktopNotifications && document.hidden) {
            this.showDesktopNotification(notification);
        }
        
        return notification;
    }
    
    /**
     * Mostra toast notification
     */
    showToast(notification, duration = null) {
        if (!this.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${notification.priority || 'low'}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="bi ${notification.icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" aria-label="Fechar">
                <i class="bi bi-x"></i>
            </button>
        `;
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        });
        
        // Click para abrir centro de notificações
        toast.addEventListener('click', (e) => {
            if (e.target !== closeBtn && !closeBtn.contains(e.target)) {
                this.openNotificationCenter(notification.id);
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }
        });
        
        // Adiciona ao container
        this.toastContainer.appendChild(toast);
        
        // Anima entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto-remove
        const autoRemoveDuration = duration || this.config.toastDuration;
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('hiding');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, autoRemoveDuration);
    }
    
    /**
     * Mostra notificação desktop (browser)
     */
    showDesktopNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
        const desktopNotif = new Notification(notification.title, {
            body: notification.message,
            icon: '/img/logo.png',
            tag: notification.id,
            requireInteraction: notification.priority === 'critical'
        });
        
        desktopNotif.onclick = () => {
            window.focus();
            this.openNotificationCenter(notification.id);
            desktopNotif.close();
        };
    }
    
    /**
     * Conecta ao sino de notificações existente no header
     */
    createNotificationBell() {
        // Usa o botão existente no HTML em vez de criar um novo
        this.notificationBell = document.getElementById('notificationsBtn');

        if (!this.notificationBell) {
            console.error('❌ Botão de notificações não encontrado no HTML');
            return;
        }

        // Configura título e acessibilidade
        this.notificationBell.title = 'Notificações (Alt+N)';
        this.notificationBell.setAttribute('aria-label', 'Abrir centro de notificações');

        // Adiciona event listener
        this.notificationBell.addEventListener('click', () => {
            this.toggleNotificationCenter();
        });

    }
    
    /**
     * Atualiza badge do sino
     */
    updateBellBadge() {
        if (!this.notificationBell) return;

        const badge = this.notificationBell.querySelector('.notification-badge');
        if (!badge) return;

        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = '';
            this.notificationBell.classList.add('has-notifications');
        } else {
            badge.style.display = 'none';
            this.notificationBell.classList.remove('has-notifications');
        }
    }
    
    /**
     * Cria centro de notificações
     */
    createNotificationCenter() {
        // Remove existente se houver
        const existing = document.getElementById('notificationCenter');
        if (existing) {
            existing.remove();
        }
        
    this.notificationCenter = document.createElement('div');
    this.notificationCenter.id = 'notificationCenter';
    this.notificationCenter.className = 'notification-center';
    this.notificationCenter.setAttribute('role', 'dialog');
    this.notificationCenter.setAttribute('aria-modal', 'true');
    this.notificationCenter.setAttribute('aria-hidden', 'true');
    this.notificationCenter.setAttribute('aria-label', 'Centro de notificações');
        this.notificationCenter.innerHTML = `
            <div class="notification-center-header">
                <h3>Notificações</h3>
                <div class="notification-center-actions">
                    <button class="btn-icon" id="markAllReadBtn" title="Marcar todas como lidas">
                        <i class="bi bi-check2-all"></i>
                    </button>
                    <button class="btn-icon" id="clearAllNotificationsBtn" title="Limpar todas">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn-icon" id="closeNotificationCenterBtn" title="Fechar">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
            
            <div class="notification-center-filters">
                <input type="text" id="notificationSearchInput" placeholder="Buscar notificações..." class="notification-search">
                <select id="notificationFilterType" class="notification-filter">
                    <option value="all">Todos os tipos</option>
                    <option value="critical">Críticas</option>
                    <option value="high">Alta Prioridade</option>
                    <option value="medium">Média Prioridade</option>
                    <option value="low">Baixa Prioridade</option>
                    <option value="unread">Não Lidas</option>
                </select>
            </div>
            
            <div class="notification-center-list" id="notificationsList">
                <!-- Notificações serão inseridas aqui -->
            </div>
        `;
        
    document.body.appendChild(this.notificationCenter);
        
        // Event listeners
        document.getElementById('closeNotificationCenterBtn').addEventListener('click', () => {
            this.closeNotificationCenter();
        });
        
        document.getElementById('markAllReadBtn').addEventListener('click', () => {
            this.markAllAsRead();
        });
        
        document.getElementById('clearAllNotificationsBtn').addEventListener('click', () => {
            this.clearAllNotifications();
        });
        
        document.getElementById('notificationSearchInput').addEventListener('input', (e) => {
            this.filterNotifications();
        });
        
        document.getElementById('notificationFilterType').addEventListener('change', () => {
            this.filterNotifications();
        });
        
        console.log('📋 Centro de notificações criado');
    }
    
    /**
     * Renderiza lista de notificações
     */
    renderNotifications() {
        const list = document.getElementById('notificationsList');
        if (!list) return;
        
        const searchTerm = document.getElementById('notificationSearchInput')?.value.toLowerCase() || '';
        const filterType = document.getElementById('notificationFilterType')?.value || 'all';
        
        // Filtra notificações
        let filtered = this.notifications;
        
        if (searchTerm) {
            filtered = filtered.filter(n => 
                n.title.toLowerCase().includes(searchTerm) ||
                n.message.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filterType !== 'all') {
            if (filterType === 'unread') {
                filtered = filtered.filter(n => !n.read);
            } else {
                filtered = filtered.filter(n => n.priority === filterType);
            }
        }
        
        // Limpa lista
        list.innerHTML = '';
        
        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="notification-empty" style="display:flex; flex-direction:column; align-items:center; gap:1.2rem; padding:2.5rem 0; opacity:0.85;">
                    <img src=\"img/empty-state-table.svg\" alt=\"Nenhuma notificação\" style=\"max-width:90px; margin-bottom:0.5rem; opacity:0.7;\" onerror=\"this.style.display='none'\">
                    <div>
                        <h4 style=\"margin:0; color:var(--text-secondary); font-weight:600;\">Nenhuma notificação encontrada</h4>
                        <p style=\"margin:0.5rem 0 0 0; font-size:0.95rem; color:var(--text-secondary);\">Você ainda não possui notificações ou nenhum resultado para o filtro atual.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Renderiza notificações
        filtered.forEach(notification => {
            const item = this.createNotificationItem(notification);
            list.appendChild(item);
        });
    }
    
    /**
     * Cria elemento de notificação
     */
    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = `notification-item notification-${notification.priority}`;
        if (!notification.read) {
            item.classList.add('unread');
        }
        
        const timeAgo = this.getTimeAgo(notification.timestamp);
        
        item.innerHTML = `
            <div class="notification-icon" style="background-color: ${notification.color}20; color: ${notification.color};">
                <i class="bi ${notification.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <span class="notification-time">${timeAgo}</span>
                </div>
                <div class="notification-message">${notification.message}</div>
            </div>
            <div class="notification-actions">
                <button class="btn-icon" data-action="toggle-read" title="${notification.read ? 'Marcar como não lida' : 'Marcar como lida'}">
                    <i class="bi ${notification.read ? 'bi-envelope' : 'bi-envelope-open'}"></i>
                </button>
                <button class="btn-icon" data-action="delete" title="Remover">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        // Event listeners
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-actions')) {
                this.markAsRead(notification.id);
                // Aqui poderia navegar para detalhes se necessário
            }
        });
        
        item.querySelector('[data-action="toggle-read"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleRead(notification.id);
        });
        
        item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNotification(notification.id);
        });
        
        return item;
    }
    
    /**
     * Cria container de toasts
     */
    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toastContainer';
        this.toastContainer.className = 'toast-container';
        // Acessibilidade: permitir que leitores de tela saibam sobre novos toasts
        this.toastContainer.setAttribute('role', 'status');
        this.toastContainer.setAttribute('aria-live', 'polite');
        this.toastContainer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(this.toastContainer);
    }
    
    /**
     * Toggle centro de notificações
     */
    toggleNotificationCenter() {
        if (this.notificationCenter.classList.contains('open')) {
            this.closeNotificationCenter();
        } else {
            this.openNotificationCenter();
        }
    }
    
    /**
     * Abre centro de notificações
     */
    openNotificationCenter(highlightId = null) {
        if (!this.notificationCenter) return;
        // salvar foco anterior
        try { this._lastFocusBeforeNotifications = document.activeElement; } catch (e) { this._lastFocusBeforeNotifications = null; }
        this.notificationCenter.classList.add('open');
        this.notificationCenter.setAttribute('aria-hidden', 'false');
        this.renderNotifications();

        // focar campo de busca para navegação por teclado
        setTimeout(() => {
            const search = this.notificationCenter.querySelector('#notificationSearchInput');
            if (search) search.focus();
        }, 150);
        
        if (highlightId) {
            setTimeout(() => {
                const item = this.notificationCenter.querySelector(`[data-id="${highlightId}"]`);
                if (item) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    item.classList.add('highlighted');
                    setTimeout(() => item.classList.remove('highlighted'), 2000);
                }
            }, 300);
        }
    }
    
    /**
     * Fecha centro de notificações
     */
    closeNotificationCenter() {
        if (!this.notificationCenter) return;
        this.notificationCenter.classList.remove('open');
        this.notificationCenter.setAttribute('aria-hidden', 'true');
        // restaurar foco
        try {
            if (this._lastFocusBeforeNotifications && typeof this._lastFocusBeforeNotifications.focus === 'function') {
                this._lastFocusBeforeNotifications.focus();
                this._lastFocusBeforeNotifications = null;
            }
        } catch (e) {}
    }
    
    /**
     * Marca notificação como lida
     */
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount--;
            this.saveNotifications();
            this.updateBellBadge();
            this.renderNotifications();
        }
    }
    
    /**
     * Toggle read status
     */
    toggleRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = !notification.read;
            this.unreadCount += notification.read ? -1 : 1;
            this.saveNotifications();
            this.updateBellBadge();
            this.renderNotifications();
        }
    }
    
    /**
     * Marca todas como lidas
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.saveNotifications();
        this.updateBellBadge();
        this.renderNotifications();
        
        this.showToast({
            type: 'INFO',
            title: 'Notificações marcadas',
            message: 'Todas as notificações foram marcadas como lidas',
            icon: 'bi-check2-all',
            priority: 'low'
        }, 3000);
    }
    
    /**
     * Remove notificação
     */
    deleteNotification(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            const notification = this.notifications[index];
            if (!notification.read) {
                this.unreadCount--;
            }
            this.notifications.splice(index, 1);
            this.saveNotifications();
            this.updateBellBadge();
            this.renderNotifications();
        }
    }
    
    /**
     * Limpa todas as notificações
     */
    async clearAllNotifications() {
        const confirmed = await window.customModal?.confirm({
            title: 'Limpar Notificações',
            message: 'Tem certeza que deseja limpar todas as notificações?',
            type: 'warning',
            confirmText: 'Sim, limpar',
            cancelText: 'Cancelar'
        });
        
        if (confirmed) {
            this.notifications = [];
            this.unreadCount = 0;
            this.saveNotifications();
            this.updateBellBadge();
            this.renderNotifications();
            
            this.showToast({
                type: 'INFO',
                title: 'Notificações limpas',
                message: 'Todas as notificações foram removidas',
                icon: 'bi-trash',
                priority: 'low'
            }, 3000);
        }
    }
    
    /**
     * Filtra notificações
     */
    filterNotifications() {
        this.renderNotifications();
    }
    
    /**
     * Registra event listeners
     */
    registerListeners() {
        // Atalho Alt+N para abrir notificações
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                this.toggleNotificationCenter();
            }
        });
        
        // Fecha com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.notificationCenter.classList.contains('open')) {
                this.closeNotificationCenter();
            }
        });
        
    }
    
    /**
     * Salva notificações no localStorage
     */
    saveNotifications() {
        try {
            localStorage.setItem('notifications', JSON.stringify({
                notifications: this.notifications,
                unreadCount: this.unreadCount,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar notificações:', error);
        }
    }
    
    /**
     * Carrega notificações do localStorage
     */
    loadNotifications() {
        try {
            const saved = localStorage.getItem('notifications');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Remove notificações antigas (mais de 30 dias)
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                this.notifications = data.notifications.filter(n => n.timestamp > thirtyDaysAgo);
                
                // Recalcula unread count
                this.unreadCount = this.notifications.filter(n => !n.read).length;
                
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar notificações:', error);
            this.notifications = [];
            this.unreadCount = 0;
        }
    }
    
    /**
     * Salva configurações
     */
    saveConfig() {
        try {
            localStorage.setItem('notificationConfig', JSON.stringify(this.config));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar configurações:', error);
        }
    }
    
    /**
     * Carrega configurações
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('notificationConfig');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
                console.log('⚙️ Configurações de notificações carregadas');
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações:', error);
        }
    }
    
    /**
     * Atualiza configuração
     */
    updateConfig(key, value) {
        this.config[key] = value;
        this.saveConfig();
        console.log(`⚙️ Configuração atualizada: ${key} = ${value}`);
    }
    
    /**
     * Gera ID único
     */
    generateId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Formata tempo relativo
     */
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Agora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d atrás`;
        return new Date(timestamp).toLocaleDateString('pt-BR');
    }
    
    /**
     * Obtém estatísticas
     */
    getStats() {
        return {
            total: this.notifications.length,
            unread: this.unreadCount,
            byPriority: {
                critical: this.notifications.filter(n => n.priority === 'critical').length,
                high: this.notifications.filter(n => n.priority === 'high').length,
                medium: this.notifications.filter(n => n.priority === 'medium').length,
                low: this.notifications.filter(n => n.priority === 'low').length
            },
            byType: Object.keys(this.notificationTypes).reduce((acc, type) => {
                acc[type] = this.notifications.filter(n => n.type === type).length;
                return acc;
            }, {})
        };
    }
    
    /**
     * Limpa recursos
     */
    destroy() {
        if (this.notificationCenter) {
            this.notificationCenter.remove();
        }
        
        if (this.notificationBell) {
            this.notificationBell.remove();
        }
        
        if (this.toastContainer) {
            this.toastContainer.remove();
        }
        
        console.log('🗑️ NotificationManager destruído');
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
