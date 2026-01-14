/**
 * SettingsPage - Controller da página de configurações
 *
 * Responsabilidades:
 * - Gerenciar inputs de regras de aposentadoria
 * - Gerenciar inputs de thresholds de urgência
 * - Controlar toggles de acessibilidade (alto contraste, tooltips, animações)
 * - Gerenciar integração Microsoft (login/logout SharePoint)
 * - Salvar/carregar configurações via SettingsManager
 * - Exportar e resetar configurações
 *
 * @class SettingsPage
 */
class SettingsPage {
    /**
     * @param {Object} app - Referência ao App principal
     */
    constructor(app) {
        this.app = app;

        // Estado da página
        this.isActive = false;
        this.isInitialized = false;
        this.hasUnsavedChanges = false;

        // Referências aos managers (serão inicializados no init)
        this.settingsManager = null;
        this.authenticationManager = null;
        this.themeManager = null;
        this.highContrastManager = null;
        this.tooltipManager = null;

        // Elementos do DOM (lazy loading)
        this.elements = {
            page: null,

            // Aposentadoria
            idadeCompulsoriaInput: null,
            pontosMinHomemInput: null,
            idadeMinHomemInput: null,
            pontosMinMulherInput: null,
            idadeMinMulherInput: null,

            // Urgências
            urgenciaModInput: null,
            urgenciaAltoInput: null,
            urgenciaCriticoInput: null,

            // Interface & Acessibilidade
            highContrastCheckbox: null,
            tooltipsEnabledCheckbox: null,
            animationsEnabledCheckbox: null,

            // Integração Microsoft
            azureIntegrationStatus: null,
            microsoftLoginButton: null,
            microsoftLogoutButton: null,
            sharepointLinkInput: null,

            // Footer
            settingsStatus: null,
            resetSettingsBtn: null,
            exportSettingsBtn: null,
            saveSettingsBtn: null,

            // Termos
            viewTermsButton: null
        };

        // Event listeners registrados (para cleanup)
        this.eventListeners = [];

        console.log('✅ SettingsPage instanciado');
    }

    /**
     * Inicializa a página e seus managers
     * Deve ser chamado apenas uma vez
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ SettingsPage já foi inicializado');
            return;
        }

        console.log('🔧 Inicializando SettingsPage...');

        // 1. Cache de elementos do DOM
        this._cacheElements();

        // 2. Obter referências aos managers do App
        this._initManagers();

        // 3. Carregar configurações salvas
        this._loadSettings();

        // 4. Setup de event listeners
        this._setupEventListeners();

        // 5. Atualizar status de integração Microsoft
        this._updateAzureIntegrationStatus();

        this.isInitialized = true;
        console.log('✅ SettingsPage inicializado');
    }

    /**
     * Faz cache dos elementos do DOM
     * @private
     */
    _cacheElements() {
        this.elements.page = document.getElementById('settingsPage');

        // Aposentadoria
        this.elements.idadeCompulsoriaInput = document.getElementById('idadeCompulsoriaInput');
        this.elements.pontosMinHomemInput = document.getElementById('pontosMinHomemInput');
        this.elements.idadeMinHomemInput = document.getElementById('idadeMinHomemInput');
        this.elements.pontosMinMulherInput = document.getElementById('pontosMinMulherInput');
        this.elements.idadeMinMulherInput = document.getElementById('idadeMinMulherInput');

        // Urgências
        this.elements.urgenciaModInput = document.getElementById('urgenciaModInput');
        this.elements.urgenciaAltoInput = document.getElementById('urgenciaAltoInput');
        this.elements.urgenciaCriticoInput = document.getElementById('urgenciaCriticoInput');

        // Interface & Acessibilidade
        this.elements.highContrastCheckbox = document.getElementById('highContrastCheckbox');
        this.elements.tooltipsEnabledCheckbox = document.getElementById('tooltipsEnabledCheckbox');
        this.elements.animationsEnabledCheckbox = document.getElementById('animationsEnabledCheckbox');

        // Integração Microsoft
        this.elements.azureIntegrationStatus = document.getElementById('azureIntegrationStatus');
        this.elements.microsoftLoginButton = document.getElementById('microsoftLoginButtonSettings');
        this.elements.microsoftLogoutButton = document.getElementById('microsoftLogoutButtonSettings');
        this.elements.sharepointLinkInput = document.getElementById('sharepointLinkInput');

        // Footer
        this.elements.settingsStatus = document.getElementById('settingsStatus');
        this.elements.resetSettingsBtn = document.getElementById('resetSettingsBtn');
        this.elements.exportSettingsBtn = document.getElementById('exportSettingsBtn');
        this.elements.saveSettingsBtn = document.getElementById('saveSettingsBtn');

        // Termos
        this.elements.viewTermsButton = document.getElementById('viewTermsButton');

        // Validar elementos críticos
        if (!this.elements.page) {
            console.error('❌ Elemento #settingsPage não encontrado no DOM');
        }
    }

    /**
     * Inicializa referências aos managers do App
     * @private
     */
    _initManagers() {
        // Managers de estado
        this.settingsManager = this.app.settingsManager || window.settingsManager;

        // Managers de autenticação
        this.authenticationManager = this.app.authenticationManager || window.authenticationManager || this.app.authenticationService || window.AuthenticationService || window.authenticationService;

        // Managers de UI
        this.themeManager = this.app.themeManager || window.themeManager;
        this.highContrastManager = this.app.highContrastManager;
        this.tooltipManager = this.app.tooltipManager || this.app.improvedTooltipManager;

        // Validar managers críticos
        if (!this.settingsManager) {
            console.error('❌ SettingsManager não disponível');
        }
    }

    /**
     * Carrega configurações salvas
     * @private
     */
    _loadSettings() {
        if (!this.settingsManager) {
            console.warn('⚠️ SettingsManager não disponível para carregar configurações');
            return;
        }

        const settings = this.settingsManager.getSettings();

        // Aposentadoria
        if (this.elements.idadeCompulsoriaInput) {
            this.elements.idadeCompulsoriaInput.value = settings.idadeCompulsoria || 75;
        }
        if (this.elements.pontosMinHomemInput) {
            this.elements.pontosMinHomemInput.value = settings.pontosMinHomem || 102;
        }
        if (this.elements.idadeMinHomemInput) {
            this.elements.idadeMinHomemInput.value = settings.idadeMinHomem || 63;
        }
        if (this.elements.pontosMinMulherInput) {
            this.elements.pontosMinMulherInput.value = settings.pontosMinMulher || 92;
        }
        if (this.elements.idadeMinMulherInput) {
            this.elements.idadeMinMulherInput.value = settings.idadeMinMulher || 58;
        }

        // Urgências
        if (this.elements.urgenciaModInput) {
            this.elements.urgenciaModInput.value = settings.urgenciaThresholds?.moderada || 84;
        }
        if (this.elements.urgenciaAltoInput) {
            this.elements.urgenciaAltoInput.value = settings.urgenciaThresholds?.alta || 60;
        }
        if (this.elements.urgenciaCriticoInput) {
            this.elements.urgenciaCriticoInput.value = settings.urgenciaThresholds?.critica || 24;
        }

        // Interface & Acessibilidade
        if (this.elements.tooltipsEnabledCheckbox) {
            this.elements.tooltipsEnabledCheckbox.checked = settings.tooltipsEnabled !== false;
        }
        if (this.elements.animationsEnabledCheckbox) {
            this.elements.animationsEnabledCheckbox.checked = settings.animationsEnabled !== false;
        }

        // Alto contraste (carregar do localStorage direto)
        if (this.elements.highContrastCheckbox) {
            const highContrastEnabled = localStorage.getItem('highContrastMode') === 'true';
            this.elements.highContrastCheckbox.checked = highContrastEnabled;
        }

        console.log('✅ Configurações carregadas');
    }

    /**
     * Setup de event listeners
     * @private
     */
    _setupEventListeners() {
        // Marcar como alterado quando qualquer input muda
        const inputChangeHandler = () => {
            this._markAsChanged();
        };

        // Aposentadoria
        const aposentadoriaInputs = [
            this.elements.idadeCompulsoriaInput,
            this.elements.pontosMinHomemInput,
            this.elements.idadeMinHomemInput,
            this.elements.pontosMinMulherInput,
            this.elements.idadeMinMulherInput
        ];

        aposentadoriaInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', inputChangeHandler);
                this.eventListeners.push({
                    element: input,
                    event: 'input',
                    handler: inputChangeHandler
                });
            }
        });

        // Urgências
        const urgenciaInputs = [
            this.elements.urgenciaModInput,
            this.elements.urgenciaAltoInput,
            this.elements.urgenciaCriticoInput
        ];

        urgenciaInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', inputChangeHandler);
                this.eventListeners.push({
                    element: input,
                    event: 'input',
                    handler: inputChangeHandler
                });
            }
        });

        // Alto Contraste (aplicar imediatamente)
        if (this.elements.highContrastCheckbox) {
            const highContrastHandler = (e) => {
                const enabled = e.target.checked;

                if (this.highContrastManager) {
                    if (enabled) {
                        this.highContrastManager.enable();
                    } else {
                        this.highContrastManager.disable();
                    }
                } else {
                    // Fallback: toggle diretamente
                    localStorage.setItem('highContrastMode', enabled);
                    document.body.classList.toggle('high-contrast', enabled);
                }

                this._markAsChanged();
            };

            this.elements.highContrastCheckbox.addEventListener('change', highContrastHandler);

            this.eventListeners.push({
                element: this.elements.highContrastCheckbox,
                event: 'change',
                handler: highContrastHandler
            });
        }

        // Tooltips (aplicar imediatamente)
        if (this.elements.tooltipsEnabledCheckbox) {
            const tooltipsHandler = (e) => {
                const enabled = e.target.checked;

                if (this.tooltipManager) {
                    if (enabled) {
                        this.tooltipManager.enable();
                    } else {
                        this.tooltipManager.disable();
                    }
                }

                this._markAsChanged();
            };

            this.elements.tooltipsEnabledCheckbox.addEventListener('change', tooltipsHandler);

            this.eventListeners.push({
                element: this.elements.tooltipsEnabledCheckbox,
                event: 'change',
                handler: tooltipsHandler
            });
        }

        // Animações (aplicar imediatamente)
        if (this.elements.animationsEnabledCheckbox) {
            const animationsHandler = (e) => {
                const enabled = e.target.checked;

                // Aplicar classe no body
                document.body.classList.toggle('animations-disabled', !enabled);

                this._markAsChanged();
            };

            this.elements.animationsEnabledCheckbox.addEventListener('change', animationsHandler);

            this.eventListeners.push({
                element: this.elements.animationsEnabledCheckbox,
                event: 'change',
                handler: animationsHandler
            });
        }

        // Salvar configurações
        if (this.elements.saveSettingsBtn) {
            const saveHandler = () => {
                this._saveSettings();
            };

            this.elements.saveSettingsBtn.addEventListener('click', saveHandler);

            this.eventListeners.push({
                element: this.elements.saveSettingsBtn,
                event: 'click',
                handler: saveHandler
            });
        }

        // Resetar configurações
        if (this.elements.resetSettingsBtn) {
            const resetHandler = () => {
                this._resetSettings();
            };

            this.elements.resetSettingsBtn.addEventListener('click', resetHandler);

            this.eventListeners.push({
                element: this.elements.resetSettingsBtn,
                event: 'click',
                handler: resetHandler
            });
        }

        // Exportar configurações
        if (this.elements.exportSettingsBtn) {
            const exportHandler = () => {
                this._exportSettings();
            };

            this.elements.exportSettingsBtn.addEventListener('click', exportHandler);

            this.eventListeners.push({
                element: this.elements.exportSettingsBtn,
                event: 'click',
                handler: exportHandler
            });
        }

        // Análise de Lotações
        const analyzeLotacoesBtn = document.getElementById('analyzeLotacoesBtn');
        if (analyzeLotacoesBtn) {
            const analyzeHandler = () => {
                this._analyzeLotacoes();
            };

            analyzeLotacoesBtn.addEventListener('click', analyzeHandler);

            this.eventListeners.push({
                element: analyzeLotacoesBtn,
                event: 'click',
                handler: analyzeHandler
            });
        }

        // Microsoft Login
        if (this.elements.microsoftLoginButton) {
            const loginHandler = () => {
                this._handleMicrosoftLogin();
            };

            this.elements.microsoftLoginButton.addEventListener('click', loginHandler);

            this.eventListeners.push({
                element: this.elements.microsoftLoginButton,
                event: 'click',
                handler: loginHandler
            });
        }

        // Microsoft Logout
        if (this.elements.microsoftLogoutButton) {
            const logoutHandler = () => {
                this._handleMicrosoftLogout();
            };

            this.elements.microsoftLogoutButton.addEventListener('click', logoutHandler);

            this.eventListeners.push({
                element: this.elements.microsoftLogoutButton,
                event: 'click',
                handler: logoutHandler
            });
        }

        // Ver Termos
        if (this.elements.viewTermsButton) {
            const termsHandler = () => {
                this._openTermsModal();
            };

            this.elements.viewTermsButton.addEventListener('click', termsHandler);

            this.eventListeners.push({
                element: this.elements.viewTermsButton,
                event: 'click',
                handler: termsHandler
            });
        }

        console.log('✅ Event listeners configurados');
    }

    /**
     * Marca configurações como alteradas (não salvas)
     * @private
     */
    _markAsChanged() {
        this.hasUnsavedChanges = true;
        this._updateSaveStatus('unsaved');
    }

    /**
     * Atualiza status visual de salvamento
     * @private
     * @param {string} status - 'saved', 'unsaved', 'saving'
     */
    _updateSaveStatus(status) {
        if (!this.elements.settingsStatus) return;

        const icon = this.elements.settingsStatus.querySelector('i');
        const text = this.elements.settingsStatus.querySelector('span');

        switch (status) {
            case 'saved':
                if (icon) icon.className = 'bi bi-cloud-check';
                if (text) text.textContent = 'Salvo';
                this.elements.settingsStatus.style.color = 'var(--success-color, #28a745)';
                break;
            case 'unsaved':
                if (icon) icon.className = 'bi bi-exclamation-circle';
                if (text) text.textContent = 'Não salvo';
                this.elements.settingsStatus.style.color = 'var(--warning-color, #ffc107)';
                break;
            case 'saving':
                if (icon) icon.className = 'bi bi-arrow-clockwise';
                if (text) text.textContent = 'Salvando...';
                this.elements.settingsStatus.style.color = 'var(--info-color, #17a2b8)';
                break;
        }
    }

    /**
     * Salva configurações
     * @private
     */
    _saveSettings() {
        if (!this.settingsManager) {
            console.error('❌ SettingsManager não disponível');
            this._showNotification('Erro ao salvar configurações', 'error');
            return;
        }

        console.log('💾 Salvando configurações...');
        this._updateSaveStatus('saving');

        // Coletar valores dos inputs
        const settings = {
            // Aposentadoria
            idadeCompulsoria: parseInt(this.elements.idadeCompulsoriaInput?.value) || 75,
            pontosMinHomem: parseInt(this.elements.pontosMinHomemInput?.value) || 102,
            idadeMinHomem: parseInt(this.elements.idadeMinHomemInput?.value) || 63,
            pontosMinMulher: parseInt(this.elements.pontosMinMulherInput?.value) || 92,
            idadeMinMulher: parseInt(this.elements.idadeMinMulherInput?.value) || 58,

            // Urgências
            urgenciaThresholds: {
                critica: parseInt(this.elements.urgenciaCriticoInput?.value) || 24,
                alta: parseInt(this.elements.urgenciaAltoInput?.value) || 60,
                moderada: parseInt(this.elements.urgenciaModInput?.value) || 84
            },

            // Interface
            tooltipsEnabled: this.elements.tooltipsEnabledCheckbox?.checked !== false,
            animationsEnabled: this.elements.animationsEnabledCheckbox?.checked !== false,

            // Alto contraste (já salvo no handler)
            highContrastMode: this.elements.highContrastCheckbox?.checked || false
        };

        // Salvar via SettingsManager
        this.settingsManager.saveSettings(settings);

        // Atualizar estado
        this.hasUnsavedChanges = false;
        this._updateSaveStatus('saved');

        // Notificar usuário
        this._showNotification('Configurações salvas com sucesso', 'success');

        // Disparar evento para outros componentes reagirem
        this._dispatchSettingsChangedEvent();

        console.log('✅ Configurações salvas');
    }

    /**
     * Reseta configurações para padrão
     * @private
     */
    _resetSettings() {
        if (!this.settingsManager) {
            console.error('❌ SettingsManager não disponível');
            return;
        }

        // Confirmar com usuário
        const confirmed = confirm('Tem certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita.');

        if (!confirmed) {
            return;
        }

        console.log('🔄 Resetando configurações para padrão...');

        // Resetar via SettingsManager
        this.settingsManager.resetToDefaults();

        // Recarregar valores nos inputs
        this._loadSettings();

        // Marcar como salvo
        this.hasUnsavedChanges = false;
        this._updateSaveStatus('saved');

        // Notificar usuário
        this._showNotification('Configurações restauradas para os valores padrão', 'success');

        // Disparar evento
        this._dispatchSettingsChangedEvent();

        console.log('✅ Configurações resetadas');
    }

    /**
     * Exporta configurações como arquivo JSON
     * @private
     */
    _exportSettings() {
        if (!this.settingsManager) {
            console.error('❌ SettingsManager não disponível');
            return;
        }

        console.log('📥 Exportando configurações...');

        const settings = this.settingsManager.getSettings();

        // Criar blob JSON
        const json = JSON.stringify(settings, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        // Criar link de download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'licencas-configuracoes.json';
        a.click();

        // Limpar URL
        URL.revokeObjectURL(url);

        this._showNotification('Configurações exportadas com sucesso', 'success');

        console.log('✅ Configurações exportadas');
    }

    /**
     * Dispara evento de mudança de configurações
     * @private
     */
    _dispatchSettingsChangedEvent() {
        const event = new CustomEvent('settingsChanged', {
            detail: {
                settings: this.settingsManager.getSettings()
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Atualiza status de integração Microsoft
     * @private
     */
    _updateAzureIntegrationStatus() {
        if (!this.authenticationManager) {
            console.warn('⚠️ AuthenticationManager não disponível');
            return;
        }

        const isAuthenticated = (typeof this.authenticationManager?.isAuthenticated === 'function')
            ? this.authenticationManager.isAuthenticated()
            : Boolean(this.authenticationManager && (this.authenticationManager.currentAccount || this.authenticationManager.currentUser));

        if (this.elements.azureIntegrationStatus) {
            if (isAuthenticated) {
                let account = null;
                try {
                        if (typeof this.authenticationManager?.getAccount === 'function') account = this.authenticationManager.getAccount();
                        else if (typeof this.authenticationManager?.getCurrentUser === 'function') account = this.authenticationManager.getCurrentUser();
                        else if (this.authenticationManager?.currentAccount) account = this.authenticationManager.currentAccount;
                        else if (this.authenticationManager?.currentUser) account = this.authenticationManager.currentUser;
                } catch (e) {
                    account = null;
                }

                const name = account?.name || account?.username || 'Usuário';
                this.elements.azureIntegrationStatus.textContent = `Conectado como ${name}`;
                this.elements.azureIntegrationStatus.classList.add('status-connected');
            } else {
                this.elements.azureIntegrationStatus.textContent = 'Microsoft não conectado';
                this.elements.azureIntegrationStatus.classList.remove('status-connected');
            }
        }

        // Mostrar/esconder botões
        if (this.elements.microsoftLoginButton) {
            this.elements.microsoftLoginButton.style.display = isAuthenticated ? 'none' : 'inline-flex';
        }

        if (this.elements.microsoftLogoutButton) {
            this.elements.microsoftLogoutButton.style.display = isAuthenticated ? 'inline-flex' : 'none';
        }

        // Habilitar/desabilitar input de SharePoint
        if (this.elements.sharepointLinkInput) {
            const env = (typeof window !== 'undefined' && window.__ENV__) ? window.__ENV__ : {};
            const envConfigured = env.AZURE_SITE_HOSTNAME && env.AZURE_SITE_PATH && env.AZURE_FILE_RELATIVE_PATH;

            if (envConfigured) {
                // Central configuration exists: do not allow manual link entry
                this.elements.sharepointLinkInput.disabled = true;
                this.elements.sharepointLinkInput.placeholder = 'Planilha configurada centralmente (somente admin)';
                this.elements.sharepointLinkInput.value = '';
            } else {
                this.elements.sharepointLinkInput.disabled = !isAuthenticated;
                this.elements.sharepointLinkInput.placeholder = isAuthenticated
                    ? 'Cole o link da planilha do SharePoint'
                    : 'Conecte-se para usar SharePoint';
            }
        }
    }

    /**
     * Manipula login Microsoft
     * @private
     */
    async _handleMicrosoftLogin() {
        if (!this.authenticationManager) {
            console.error('❌ AuthenticationManager não disponível');
            this._showNotification('Erro: Serviço de autenticação não disponível', 'error');
            return;
        }

        try {
            console.log('🔐 Iniciando login Microsoft...');

            await this.authenticationManager.login();

            this._updateAzureIntegrationStatus();
            this._showNotification('Login realizado com sucesso', 'success');

            console.log('✅ Login Microsoft realizado');
        } catch (error) {
            console.error('❌ Erro no login Microsoft:', error);
            this._showNotification('Erro ao fazer login: ' + error.message, 'error');
        }
    }

    /**
     * Manipula logout Microsoft
     * @private
     */
    async _handleMicrosoftLogout() {
        if (!this.authenticationManager) {
            console.error('❌ AuthenticationManager não disponível');
            return;
        }

        try {
            console.log('🔓 Fazendo logout Microsoft...');

            await this.authenticationManager.logout();

            this._updateAzureIntegrationStatus();
            this._showNotification('Logout realizado com sucesso', 'success');

            console.log('✅ Logout Microsoft realizado');
        } catch (error) {
            console.error('❌ Erro no logout Microsoft:', error);
            this._showNotification('Erro ao fazer logout: ' + error.message, 'error');
        }
    }

    /**
     * Abre modal de termos de serviço
     * @private
     */
    _openTermsModal() {
        // Delegar para ModalManager se disponível
        if (this.app.modalManager) {
            const termsModal = document.getElementById('termsModal');
            if (termsModal) {
                this.app.modalManager.open(termsModal);
            } else {
                console.warn('⚠️ Modal de termos não encontrado');
                // Fallback: abrir em nova aba
                window.open('terms.html', '_blank');
            }
        } else {
            // Fallback: abrir em nova aba
            window.open('terms.html', '_blank');
        }
    }

    /**
     * Mostra notificação para o usuário
     * @private
     * @param {string} message - Mensagem
     * @param {string} type - Tipo (success, warning, error, info)
     */
    _showNotification(message, type = 'info') {
        // Usar NotificationService do app se disponível
        if (this.app.notificationService && typeof this.app.notificationService.show === 'function') {
            this.app.notificationService.show(message, type);
        } else if (this.app.notificationManager && typeof this.app.notificationManager.show === 'function') {
            this.app.notificationManager.show(message, type);
        } else {
            // Fallback: console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Renderiza a página com os dados atuais
     * Chamado quando a página é ativada
     */
    render() {
        if (!this.isInitialized) {
            console.warn('⚠️ SettingsPage não foi inicializado. Chamando init()...');
            this.init();
        }

        console.log('🎨 Renderizando SettingsPage...');

        // Atualizar status de integração Microsoft
        this._updateAzureIntegrationStatus();

        console.log('✅ SettingsPage renderizado');
    }

    /**
     * Ativa a página (torna visível)
     * Chamado pelo Router quando usuário navega para Settings
     */
    show() {
        if (!this.isInitialized) {
            this.init();
        }

        console.log('👁️ Mostrando SettingsPage');

        // Tornar página visível
        if (this.elements.page) {
            this.elements.page.classList.add('active');
        }

        this.isActive = true;

        // Renderizar com dados atuais
        this.render();
    }

    /**
     * Desativa a página (esconde)
     * Chamado pelo Router quando usuário navega para outra página
     */
    hide() {
        console.log('🙈 Escondendo SettingsPage');

        // Avisar se há mudanças não salvas
        if (this.hasUnsavedChanges) {
            const shouldSave = confirm('Você tem alterações não salvas. Deseja salvá-las antes de sair?');

            if (shouldSave) {
                this._saveSettings();
            }
        }

        // Esconder página
        if (this.elements.page) {
            this.elements.page.classList.remove('active');
        }

        this.isActive = false;
    }

    /**
     * Obtém configurações atuais
     * @returns {Object} Objeto com configurações
     */
    getSettings() {
        if (!this.settingsManager) {
            return {};
        }

        return this.settingsManager.getSettings();
    }

    /**
     * Analisa duplicatas de lotações
     * @private
     */
    _analyzeLotacoes() {
        const servidores = this.app?.dataStateManager?.getAllServidores() || [];

        if (servidores.length === 0) {
            alert('Nenhum dado carregado. Carregue um arquivo primeiro.');
            return;
        }

        if (!window.lotacaoNormalizer) {
            alert('Serviço de normalização não disponível.');
            return;
        }

        // Obter estatísticas
        const stats = window.lotacaoNormalizer.getStats(servidores);

        // Exibir estatísticas
        const statsEl = document.getElementById('lotacaoStats');
        const statsTextEl = document.getElementById('lotacaoStatsText');

        if (statsEl && statsTextEl) {
            statsTextEl.innerHTML = `
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div><strong>${stats.total}</strong> lotações originais</div>
                    <div><strong>${stats.unique}</strong> únicas após normalização</div>
                    <div><strong>${stats.duplicates}</strong> duplicatas removidas (${stats.savingsPercent}%)</div>
                </div>
            `;
            statsEl.style.display = 'block';
        }

        // Analisar duplicatas
        const duplicates = window.lotacaoNormalizer.analyzeDuplicates(servidores);
        const duplicatesContainer = document.getElementById('lotacaoDuplicatesContainer');

        if (!duplicatesContainer) return;

        // Se não houver duplicatas
        if (Object.keys(duplicates).length === 0) {
            duplicatesContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #28a745;">
                    <i class="bi bi-check-circle" style="font-size: 24px;"></i>
                    <p style="margin: 10px 0 0 0;">Nenhuma duplicata encontrada!</p>
                </div>
            `;
            duplicatesContainer.style.display = 'block';
            return;
        }

        // Renderizar duplicatas
        let html = '<div style="font-size: 14px;">';
        html += `<p style="margin-bottom: 10px;"><strong>${Object.keys(duplicates).length}</strong> grupos de duplicatas encontrados:</p>`;

        Object.entries(duplicates).forEach(([normalized, originals]) => {
            html += `
                <div style="margin-bottom: 15px; padding: 10px; background: white; border-left: 3px solid #007bff; border-radius: 4px;">
                    <div style="font-weight: 600; color: #007bff; margin-bottom: 5px;">
                        ✓ ${normalized}
                    </div>
                    <div style="font-size: 13px; color: #666; margin-left: 15px;">
                        ${originals.map(orig => `<div>→ ${orig}</div>`).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        duplicatesContainer.innerHTML = html;
        duplicatesContainer.style.display = 'block';
    }

    /**
     * Cleanup - Remove event listeners
     * Chamado quando a página é destruída (se necessário)
     */
    destroy() {
        console.log('🧹 Destruindo SettingsPage...');

        // Remover todos os event listeners registrados
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        this.eventListeners = [];
        this.isInitialized = false;
        this.isActive = false;

        console.log('✅ SettingsPage destruído');
    }
}

// Exportar para uso no App
if (typeof window !== 'undefined') {
    window.SettingsPage = SettingsPage;
}

// Exportar para Node.js (testes)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsPage;
}
