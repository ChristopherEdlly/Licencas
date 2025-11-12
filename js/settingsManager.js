/**
 * SettingsManager.js
 * Gerencia configurações do sistema usando localStorage
 */

class SettingsManager {
    constructor() {
        this.storageKey = 'sutri_settings';
        this.defaults = {
            // Aposentadoria
            idadeCompulsoria: 75,
            pontosMinHomem: 102,
            pontosMinMulher: 92,
            idadeMinHomem: 63,
            idadeMinMulher: 58,
            
            // Urgência (escadinha - em meses) - NOVA LÓGICA SIMPLIFICADA
            urgenciaCritico: 24,      // ≤ 24 meses (≤ 2 anos)
            urgenciaAlto: 60,          // ≤ 60 meses (≤ 5 anos)
            urgenciaMod: 84,           // ≤ 84 meses (≤ 7 anos)
            // urgenciaBaixo é automático: > urgenciaMod
            
            // Interface
            tooltipsEnabled: true,
            animationsEnabled: true,
            highContrastEnabled: false
        };
        
        this.settings = this.loadSettings();
        this.applySettings(); // Aplicar configurações ao carregar
        this.setupEventListeners();
        this.observeDOM(); // Observar mudanças no DOM
    }

    /**
     * Carrega configurações do localStorage ou usa padrões
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge com defaults para garantir que novos campos existam
                return { ...this.defaults, ...parsed };
            }
        } catch (e) {
            console.warn('Erro ao carregar configurações:', e);
        }
        return { ...this.defaults };
    }

    /**
     * Salva configurações no localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            return true;
        } catch (e) {
            console.error('Erro ao salvar configurações:', e);
            return false;
        }
    }

    /**
     * Obtém uma configuração específica
     */
    get(key) {
        return this.settings[key] !== undefined ? this.settings[key] : this.defaults[key];
    }

    /**
     * Define uma configuração específica
     */
    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    /**
     * Restaura configurações padrão
     */
    resetToDefaults() {
        this.settings = { ...this.defaults };
        this.saveSettings();
        this.updateUI();
        return true;
    }

    /**
     * Atualiza interface com valores atuais
     */
    updateUI() {
        // Aposentadoria
        this.setInputValue('idadeCompulsoriaInput', this.get('idadeCompulsoria'));
        this.setInputValue('pontosMinHomemInput', this.get('pontosMinHomem'));
        this.setInputValue('pontosMinMulherInput', this.get('pontosMinMulher'));
        this.setInputValue('idadeMinHomemInput', this.get('idadeMinHomem'));
        this.setInputValue('idadeMinMulherInput', this.get('idadeMinMulher'));
        
        // Urgência (nova escadinha)
        this.setInputValue('urgenciaCriticoInput', this.get('urgenciaCritico'));
        this.setInputValue('urgenciaAltoInput', this.get('urgenciaAlto'));
        this.setInputValue('urgenciaModInput', this.get('urgenciaMod'));
        
        // Interface
        this.setCheckboxValue('tooltipsEnabledCheckbox', this.get('tooltipsEnabled'));
        this.setCheckboxValue('animationsEnabledCheckbox', this.get('animationsEnabled'));
        this.setCheckboxValue('highContrastCheckbox', this.get('highContrastEnabled'));
        
        // Atualizar visualizações
        this.updateUrgencyHints();
    }

    /**
     * Helper para definir valor de input
     */
    setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) {
            input.value = value;
        }
    }

    /**
     * Helper para definir valor de checkbox
     */
    setCheckboxValue(id, value) {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = value;
        }
    }

    /**
     * Lê valores da UI e salva
     */
    saveFromUI() {
        // Validação de inputs vazios
        const requiredInputs = [
            { id: 'idadeCompulsoriaInput', name: 'Idade Compulsória' },
            { id: 'pontosMinHomemInput', name: 'Pontos Mínimos (Homem)' },
            { id: 'pontosMinMulherInput', name: 'Pontos Mínimos (Mulher)' },
            { id: 'idadeMinHomemInput', name: 'Idade Mínima (Homem)' },
            { id: 'idadeMinMulherInput', name: 'Idade Mínima (Mulher)' },
            { id: 'urgenciaCriticoInput', name: 'Urgência Crítica' },
            { id: 'urgenciaAltoInput', name: 'Urgência Alta' },
            { id: 'urgenciaModInput', name: 'Urgência Moderada' }
        ];

        const emptyFields = [];
        for (const input of requiredInputs) {
            const element = document.getElementById(input.id);
            const value = element?.value?.trim();
            if (!value || value === '' || isNaN(parseInt(value))) {
                emptyFields.push(input.name);
            }
        }

        if (emptyFields.length > 0) {
            this.showNotification(`❌ Campos vazios ou inválidos: ${emptyFields.join(', ')}`, 'error');
            return false;
        }

        // Aposentadoria
        this.settings.idadeCompulsoria = parseInt(document.getElementById('idadeCompulsoriaInput')?.value || this.defaults.idadeCompulsoria);
        this.settings.pontosMinHomem = parseInt(document.getElementById('pontosMinHomemInput')?.value || this.defaults.pontosMinHomem);
        this.settings.pontosMinMulher = parseInt(document.getElementById('pontosMinMulherInput')?.value || this.defaults.pontosMinMulher);
        this.settings.idadeMinHomem = parseInt(document.getElementById('idadeMinHomemInput')?.value || this.defaults.idadeMinHomem);
        this.settings.idadeMinMulher = parseInt(document.getElementById('idadeMinMulherInput')?.value || this.defaults.idadeMinMulher);
        
        // Urgência (nova escadinha)
        this.settings.urgenciaCritico = parseInt(document.getElementById('urgenciaCriticoInput')?.value || this.defaults.urgenciaCritico);
        this.settings.urgenciaAlto = parseInt(document.getElementById('urgenciaAltoInput')?.value || this.defaults.urgenciaAlto);
        this.settings.urgenciaMod = parseInt(document.getElementById('urgenciaModInput')?.value || this.defaults.urgenciaMod);
        
        // Interface
        this.settings.tooltipsEnabled = document.getElementById('tooltipsEnabledCheckbox')?.checked ?? this.defaults.tooltipsEnabled;
        this.settings.animationsEnabled = document.getElementById('animationsEnabledCheckbox')?.checked ?? this.defaults.animationsEnabled;
        this.settings.highContrastEnabled = document.getElementById('highContrastCheckbox')?.checked ?? this.defaults.highContrastEnabled;
        
        this.saveSettings();
        
        // Aplicar mudanças imediatamente
        this.applySettings();
        
        return true;
    }

    /**
     * Aplica configurações ao sistema
     */
    applySettings() {
        // Atualizar UI com valores salvos
        this.updateUI();
        
        // Tooltips
        const tooltipsEnabled = this.get('tooltipsEnabled');
        
        if (tooltipsEnabled) {
            document.body.classList.remove('tooltips-disabled');
            // Restaurar todos os tooltips nativos
            this.restoreNativeTooltips();
        } else {
            document.body.classList.add('tooltips-disabled');
            // Desabilitar todos os tooltips nativos
            this.disableNativeTooltips();
        }
        
        // Aplicar também para custom tooltips se existirem E tiverem os métodos
        if (window.customTooltip && typeof window.customTooltip.enable === 'function') {
            if (tooltipsEnabled) {
                window.customTooltip.enable();
            } else {
                window.customTooltip.disable();
            }
        }
        
        // Animações
        if (this.get('animationsEnabled')) {
            document.documentElement.style.setProperty('--transition-speed', '0.2s');
        } else {
            document.documentElement.style.setProperty('--transition-speed', '0s');
        }
        
        // Recalcular urgências se dashboard estiver disponível
        if (window.dashboard && window.dashboard.allServidores) {
            // Recalcular nivelUrgencia para todos os servidores
            window.dashboard.allServidores.forEach(servidor => {
                if (window.dashboard.parser && typeof window.dashboard.parser.calcularNivelUrgencia === 'function') {
                    servidor.nivelUrgencia = window.dashboard.parser.calcularNivelUrgencia(servidor);
                }
            });
            
            // Reaplicar filtros para atualizar filteredServidores com novos níveis de urgência
            if (typeof window.dashboard.applyAllFilters === 'function') {
                window.dashboard.applyAllFilters();
            }
            
            // Atualizar UI (applyAllFilters já atualiza, mas garantir)
            if (typeof window.dashboard.updateUrgencyCards === 'function') {
                window.dashboard.updateUrgencyCards();
            }
        }
    }

    /**
     * Desabilita tooltips nativos (atributo title)
     */
    disableNativeTooltips() {
        // Encontrar todos os elementos com title
        const elementsWithTitle = document.querySelectorAll('[title]');
        
        elementsWithTitle.forEach(element => {
            // Salvar o title original em data-original-title
            if (!element.hasAttribute('data-original-title')) {
                element.setAttribute('data-original-title', element.getAttribute('title'));
            }
            // Remover o title para desabilitar o tooltip
            element.removeAttribute('title');
        });
    }

    /**
     * Restaura tooltips nativos (atributo title)
     */
    restoreNativeTooltips() {
        // Encontrar todos os elementos com data-original-title
        const elementsWithOriginalTitle = document.querySelectorAll('[data-original-title]');
        
        elementsWithOriginalTitle.forEach(element => {
            // Restaurar o title original
            const originalTitle = element.getAttribute('data-original-title');
            if (originalTitle) {
                element.setAttribute('title', originalTitle);
            }
        });
    }

    /**
     * Observa mudanças no DOM para aplicar configurações de tooltip em novos elementos
     */
    observeDOM() {
        // Criar observer para detectar novos elementos com title
        const observer = new MutationObserver((mutations) => {
            // Verificar se tooltips estão desabilitados
            if (!this.get('tooltipsEnabled')) {
                mutations.forEach((mutation) => {
                    // Verificar novos nós adicionados
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Verificar o próprio elemento
                            if (node.hasAttribute && node.hasAttribute('title')) {
                                if (!node.hasAttribute('data-original-title')) {
                                    node.setAttribute('data-original-title', node.getAttribute('title'));
                                }
                                node.removeAttribute('title');
                            }
                            // Verificar filhos do elemento
                            if (node.querySelectorAll) {
                                const childrenWithTitle = node.querySelectorAll('[title]');
                                childrenWithTitle.forEach(child => {
                                    if (!child.hasAttribute('data-original-title')) {
                                        child.setAttribute('data-original-title', child.getAttribute('title'));
                                    }
                                    child.removeAttribute('title');
                                });
                            }
                        }
                    });
                });
            }
        });

        // Configurar o observer
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Aguardar DOM carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    }

    /**
     * Bind de eventos
     */
    bindEvents() {
        // Botão salvar
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const saved = this.saveFromUI();
                if (saved) {
                    this.showNotification('✅ Configurações salvas com sucesso!', 'success');
                    this.updateSettingsStatus('saved');
                }
            });
        }
        
        // Botão restaurar
        const resetBtn = document.getElementById('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.showConfirmModal(
                    'Deseja realmente restaurar as configurações padrão? Esta ação não pode ser desfeita.',
                    () => {
                        this.resetToDefaults();
                        this.applySettings();
                        this.showNotification('🔄 Configurações restauradas ao padrão', 'info');
                        this.updateSettingsStatus('saved');
                    }
                );
            });
        }
        
        // Botão exportar
        const exportBtn = document.getElementById('exportSettingsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSettings();
            });
        }
        
        // Checkbox de tooltips - aplicar imediatamente
        const tooltipsCheckbox = document.getElementById('tooltipsEnabledCheckbox');
        if (tooltipsCheckbox) {
            tooltipsCheckbox.addEventListener('change', (e) => {
                this.settings.tooltipsEnabled = e.target.checked;
                this.saveSettings();
                this.applySettings();
                this.updateSettingsStatus('saved');
            });
        }
        
        // Checkbox de animações - aplicar imediatamente
        const animationsCheckbox = document.getElementById('animationsEnabledCheckbox');
        if (animationsCheckbox) {
            animationsCheckbox.addEventListener('change', (e) => {
                this.settings.animationsEnabled = e.target.checked;
                this.saveSettings();
                this.applySettings();
                this.updateSettingsStatus('saved');
            });
        }
        
        // Checkbox de alto contraste - aplicar imediatamente via HighContrastManager
        const highContrastCheckbox = document.getElementById('highContrastCheckbox');
        if (highContrastCheckbox) {
            highContrastCheckbox.addEventListener('change', (e) => {
                this.settings.highContrastEnabled = e.target.checked;
                this.saveSettings();
                this.updateSettingsStatus('saved');
                
                // Sincronizar com HighContrastManager se disponível
                if (window.dashboard && window.dashboard.highContrastManager) {
                    if (e.target.checked) {
                        window.dashboard.highContrastManager.enable();
                    } else {
                        window.dashboard.highContrastManager.disable();
                    }
                }
            });
        }
        
        // Atualizar preview ao mudar valores de urgência (nova escadinha)
        const urgencyInputs = [
            'urgenciaCriticoInput',
            'urgenciaAltoInput',
            'urgenciaModInput'
        ];
        
        urgencyInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateSettingsStatus('unsaved');
                    this.updateUrgencyHints();
                });
            }
        });
        
        // Atualizar status ao mudar valores de aposentadoria
        const aposentadoriaInputs = [
            'idadeCompulsoriaInput',
            'pontosMinHomemInput',
            'pontosMinMulherInput',
            'idadeMinHomemInput',
            'idadeMinMulherInput'
        ];
        
        aposentadoriaInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateSettingsStatus('unsaved');
                });
            }
        });
    }

    /**
     * Mostra notificação temporária
     */
    showNotification(message, type = 'info') {
        // Centraliza todas as notificações no NotificationManager
        if (window.dashboard && dashboard.notificationManager && typeof dashboard.notificationManager.showToast === 'function') {
            dashboard.notificationManager.showToast({
                title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Aviso',
                message,
                priority: type === 'success' ? 'low' : type === 'error' ? 'critical' : 'high',
                icon: type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-x-circle' : 'bi-exclamation-circle'
            });
        } else {
            // fallback usando customModal
            window.customModal?.alert({
                title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Aviso',
                message: message,
                type: type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'
            });
        }
    }

    /**
     * Mostra modal de confirmação customizado
     */
    showConfirmModal(message, onConfirm, onCancel = null) {
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal-overlay';
        
        // Criar modal
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
            <div class="confirm-modal-header">
                <i class="bi bi-exclamation-triangle"></i>
                <h3>Confirmação</h3>
            </div>
            <div class="confirm-modal-body">
                <p>${message}</p>
            </div>
            <div class="confirm-modal-footer">
                <button class="btn-cancel" id="confirmModalCancel">
                    <i class="bi bi-x-circle"></i>
                    Cancelar
                </button>
                <button class="btn-confirm" id="confirmModalConfirm">
                    <i class="bi bi-check-circle"></i>
                    Confirmar
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Animar / abrir: usar helper do dashboard se disponível para gerenciar foco/aria
        setTimeout(() => {
            if (window.dashboard && typeof window.dashboard._openModalElement === 'function') {
                try {
                    window.dashboard._openModalElement(overlay);
                } catch (e) {
                    overlay.classList.add('show');
                }
            } else {
                overlay.classList.add('show');
            }
        }, 10);
        
        // Função para fechar modal
        const closeModal = () => {
            // Fechar via helper se possível
            if (window.dashboard && typeof window.dashboard._closeModalElement === 'function') {
                try { window.dashboard._closeModalElement(overlay); } catch (e) {}
            } else {
                overlay.classList.remove('show');
            }
            setTimeout(() => overlay.remove(), 300);
        };
        
        // Botão confirmar
        document.getElementById('confirmModalConfirm').addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });
        
        // Botão cancelar
        document.getElementById('confirmModalCancel').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
        
        // Fechar ao clicar no overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
                if (onCancel) onCancel();
            }
        });
    }
    
    /**
     * Atualiza status de salvamento
     */
    updateSettingsStatus(status) {
        const statusEl = document.getElementById('settingsStatus');
        if (!statusEl) return;
        
        if (status === 'saved') {
            statusEl.classList.remove('unsaved');
            statusEl.innerHTML = '<i class="bi bi-cloud-check"></i><span>Salvo</span>';
        } else if (status === 'unsaved') {
            statusEl.classList.add('unsaved');
            statusEl.innerHTML = '<i class="bi bi-exclamation-circle"></i><span>Não salvo</span>';
        }
    }
    
    /**
     * Atualiza os hints de anos ao lado dos inputs
     */
    updateUrgencyHints() {
        // Crítico
        const criticoMeses = parseInt(document.getElementById('urgenciaCriticoInput')?.value || 24);
        const criticoAnos = Math.floor(criticoMeses / 12);
        const criticoBadge = document.querySelector('.urgency-critical .urgency-badge');
        if (criticoBadge) {
            criticoBadge.textContent = `≤ ${criticoAnos} ${criticoAnos === 1 ? 'ano' : 'anos'}`;
        }
        
        // Alto
        const altoMeses = parseInt(document.getElementById('urgenciaAltoInput')?.value || 60);
        const altoAnos = Math.floor(altoMeses / 12);
        const altoBadge = document.querySelector('.urgency-high .urgency-badge');
        if (altoBadge) {
            altoBadge.textContent = `≤ ${altoAnos} ${altoAnos === 1 ? 'ano' : 'anos'}`;
        }
        
        // Moderado
        const modMeses = parseInt(document.getElementById('urgenciaModInput')?.value || 84);
        const modAnos = Math.floor(modMeses / 12);
        const modBadge = document.querySelector('.urgency-moderate .urgency-badge');
        if (modBadge) {
            modBadge.textContent = `≤ ${modAnos} ${modAnos === 1 ? 'ano' : 'anos'}`;
        }
        
        // Baixo (automático - maior que Moderado)
        const baixoBadge = document.querySelector('.urgency-low .urgency-badge');
        const baixoDisplay = document.querySelector('.urgency-low .auto-value');
        if (baixoBadge) {
            baixoBadge.textContent = `> ${modAnos} ${modAnos === 1 ? 'ano' : 'anos'}`;
        }
        if (baixoDisplay) {
            baixoDisplay.textContent = modMeses;
        }
    }
    
    /**
     * Atualiza a legenda do diagrama
     */
    updateDiagramLegend() {
        const criticoMeses = parseInt(document.getElementById('urgenciaCriticoInput')?.value || 24);
        const altoMeses = parseInt(document.getElementById('urgenciaAltoInput')?.value || 60);
        const modMeses = parseInt(document.getElementById('urgenciaModInput')?.value || 84);
        
        // Converter para anos
        const criticoAnos = Math.floor(criticoMeses / 12);
        const altoAnos = Math.floor(altoMeses / 12);
        const modAnos = Math.floor(modMeses / 12);
        
        // Atualizar labels integrados
        const labelCritico = document.querySelector('.label-critical');
        const labelAlto = document.querySelector('.label-high');
        const labelMod = document.querySelector('.label-moderate');
        const labelBaixo = document.querySelector('.label-low');
        
        if (labelCritico) {
            labelCritico.textContent = `Crítico: ≤ ${criticoAnos} ${criticoAnos === 1 ? 'ano' : 'anos'}`;
        }
        
        if (labelAlto) {
            labelAlto.textContent = `Alto: ≤ ${altoAnos} ${altoAnos === 1 ? 'ano' : 'anos'}`;
        }
        
        if (labelMod) {
            labelMod.textContent = `Moderado: ≤ ${modAnos} ${modAnos === 1 ? 'ano' : 'anos'}`;
        }
        
        if (labelBaixo) {
            labelBaixo.textContent = `Baixo: > ${modAnos} ${modAnos === 1 ? 'ano' : 'anos'}`;
        }
    }
    
    /**
     * Exporta configurações como JSON
     */
    exportSettings() {
        const data = JSON.stringify(this.settings, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sutri-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('📥 Configurações exportadas com sucesso!', 'success');
    }
}

// Criar instância global
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
    // Inicializar automaticamente
    window.settingsManager = new SettingsManager();
    
    // Aplicar configurações quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.settingsManager.applySettings();
            window.settingsManager.updateUrgencyHints();
        });
    } else {
        // DOM já está pronto
        window.settingsManager.applySettings();
        window.settingsManager.updateUrgencyHints();
    }
}
