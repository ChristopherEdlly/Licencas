/**
 * HighContrastManager.js
 * 
 * Gerencia modo de alto contraste para acessibilidade WCAG AAA
 * 
 * Funcionalidades:
 * - Modo de alto contraste ativável via UI ou atalho
 * - Contraste mínimo 7:1 para texto normal
 * - Contraste mínimo 4.5:1 para texto grande
 * - Indicadores visuais claros para estados interativos
 * - Detecção automática de preferência do sistema
 * - Persistência de preferência do usuário
 * 
 * @author Dashboard Licenças Premium
 * @version 3.0.0
 */

class HighContrastManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.isHighContrast = false;
        this.systemPreference = null;
        
        // Referências DOM
        this.toggleButton = null;
        this.statusIndicator = null;
        
        // Esquemas de cores com CONTRASTE EXTREMO para máxima legibilidade
        this.contrastSchemes = {
            light: {
                background: '#FFFFFF',
                surface: '#F8F8F8',
                text: '#000000',
                textSecondary: '#000000',
                primary: '#0000EE',        // Azul mais forte
                primaryHover: '#0000CC',
                success: '#008000',        // Verde puro
                warning: '#FF8C00',        // Laranja escuro
                danger: '#DC143C',         // Vermelho crimson
                info: '#0066CC',           // Azul info forte
                border: '#000000',
                borderLight: '#000000',    // Todas as bordas pretas
                focus: '#FF00FF',          // Magenta para foco
                disabled: '#808080',
                disabledBg: '#D3D3D3',
                shadow: 'rgba(0, 0, 0, 0.5)'
            },
            dark: {
                background: '#000000',
                surface: '#0A0A0A',
                text: '#FFFFFF',
                textSecondary: '#FFFFFF',
                primary: '#00FFFF',        // Ciano brilhante
                primaryHover: '#00DDDD',
                success: '#00FF00',        // Verde neon
                warning: '#FFFF00',        // Amarelo puro
                danger: '#FF0000',         // Vermelho puro
                info: '#00BFFF',           // Azul céu profundo
                border: '#FFFFFF',
                borderLight: '#FFFFFF',    // Todas as bordas brancas
                focus: '#FFFF00',          // Amarelo para foco
                disabled: '#808080',
                disabledBg: '#1A1A1A',
                shadow: 'rgba(255, 255, 255, 0.5)'
            }
        };
        
        // Estado de animações (pode ser desabilitado)
        this.animationsEnabled = true;
        
        this.init();
    }
    
    /**
     * Inicializa o gerenciador de alto contraste
     */
    async init() {
        
        try {
            // Detecta preferência do sistema
            this.detectSystemPreference();
            
            // Carrega preferência salva
            this.loadPreference();
            
            // Cria UI de controle
            this.createToggleButton();
            
            // Registra listeners
            this.registerListeners();
            
            // Aplica modo se necessário
            if (this.isHighContrast) {
                this.applyHighContrast();
            }
            
            
        } catch (error) {
            console.error('❌ Erro ao inicializar HighContrastManager:', error);
        }
    }
    
    /**
     * Detecta preferência de contraste do sistema operacional
     */
    detectSystemPreference() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-contrast: more)');
            this.systemPreference = mediaQuery.matches;
            
            
            // Listen for changes
            mediaQuery.addEventListener('change', (e) => {
                this.systemPreference = e.matches;
                console.log(`🔄 Preferência do sistema alterada: ${this.systemPreference ? 'Alto' : 'Normal'}`);
                
                // Se usuário não tem preferência salva, segue o sistema
                const savedPreference = localStorage.getItem('highContrastMode');
                if (!savedPreference && this.systemPreference !== this.isHighContrast) {
                    this.toggle();
                }
            });
        }
    }
    
    /**
     * Carrega preferência salva do usuário
     */
    loadPreference() {
        const savedPreference = localStorage.getItem('highContrastMode');
        
        if (savedPreference !== null) {
            this.isHighContrast = savedPreference === 'true';
        } else if (this.systemPreference !== null) {
            // Se não tem preferência salva, usa a do sistema
            this.isHighContrast = this.systemPreference;
        }
    }
    
    /**
     * Salva preferência do usuário
     */
    savePreference() {
        localStorage.setItem('highContrastMode', this.isHighContrast.toString());
    }
    
    /**
     * Cria botão de toggle na UI
     * DESABILITADO - Controle apenas em configurações
     */
    createToggleButton() {
        // Não cria mais o botão na tela
        return;
    }
    
    /**
     * Atualiza estado visual do botão
     */
    updateButtonState() {
        if (!this.toggleButton) return;
        
        if (this.isHighContrast) {
            this.toggleButton.classList.add('active');
            this.toggleButton.innerHTML = `
                <i class="bi bi-circle-fill me-2"></i>
                <span class="toggle-text">Alto Contraste: ON</span>
            `;
        } else {
            this.toggleButton.classList.remove('active');
            this.toggleButton.innerHTML = `
                <i class="bi bi-circle-half me-2"></i>
                <span class="toggle-text">Alto Contraste: OFF</span>
            `;
        }
        
        this.toggleButton.setAttribute('aria-pressed', this.isHighContrast.toString());
    }
    
    /**
     * Registra event listeners
     */
    registerListeners() {
        // Click no botão
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggle());
        }
        
        // Atalho de teclado Ctrl+Shift+C
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.toggle();
            }
        });
        
    }
    
    /**
     * Alterna modo de alto contraste
     */
    toggle() {
        this.isHighContrast = !this.isHighContrast;
        
        if (this.isHighContrast) {
            this.applyHighContrast();
        } else {
            this.removeHighContrast();
        }
        
        this.updateButtonState();
        this.savePreference();
        this.syncWithSettings();
        this.showNotification();
        
    }
    
    /**
     * Ativa modo de alto contraste
     */
    enable() {
        if (!this.isHighContrast) {
            this.isHighContrast = true;
            this.applyHighContrast();
            this.updateButtonState();
            this.savePreference();
            this.syncWithSettings();
            this.showNotification();
        }
    }
    
    /**
     * Desativa modo de alto contraste
     */
    disable() {
        if (this.isHighContrast) {
            this.isHighContrast = false;
            this.removeHighContrast();
            this.updateButtonState();
            this.savePreference();
            this.syncWithSettings();
            this.showNotification();
        }
    }
    
    /**
     * Sincroniza com checkbox de configurações
     */
    syncWithSettings() {
        const checkbox = document.getElementById('highContrastCheckbox');
        if (checkbox && checkbox.checked !== this.isHighContrast) {
            checkbox.checked = this.isHighContrast;
            
            // Atualiza settings manager se disponível
            if (window.settingsManager) {
                window.settingsManager.settings.highContrastEnabled = this.isHighContrast;
                window.settingsManager.saveSettings();
            }
        }
    }
    
    /**
     * Aplica modo de alto contraste
     */
    applyHighContrast() {
        // Determina esquema baseado no tema atual
        const isDarkTheme = document.documentElement.classList.contains('dark-theme');
        const scheme = isDarkTheme ? this.contrastSchemes.dark : this.contrastSchemes.light;
        
        // Adiciona classe ao HTML
        document.documentElement.classList.add('high-contrast-mode');
        
        // Define variáveis CSS
        const root = document.documentElement;
        Object.entries(scheme).forEach(([key, value]) => {
            root.style.setProperty(`--hc-${key}`, value);
        });
        
        // Aplica estilos adicionais
        this.applyAccessibilityStyles();
        
        // Dispara evento personalizado
        window.dispatchEvent(new CustomEvent('highContrastChanged', {
            detail: { enabled: true }
        }));
        
    }
    
    /**
     * Remove modo de alto contraste
     */
    removeHighContrast() {
        // Remove classe
        document.documentElement.classList.remove('high-contrast-mode');
        
        // Remove variáveis CSS
        const root = document.documentElement;
        const scheme = this.contrastSchemes.light;
        Object.keys(scheme).forEach(key => {
            root.style.removeProperty(`--hc-${key}`);
        });
        
        // Dispara evento personalizado
        window.dispatchEvent(new CustomEvent('highContrastChanged', {
            detail: { enabled: false }
        }));
        
        console.log('❌ Alto contraste removido');
    }
    
    /**
     * Aplica estilos de acessibilidade adicionais
     */
    applyAccessibilityStyles() {
        // Aumenta espessura de bordas
        document.documentElement.style.setProperty('--border-width', '2px');
        
        // Aumenta tamanho de elementos interativos
        document.documentElement.style.setProperty('--touch-target-min', '44px');
        
        // Aumenta espaçamento para legibilidade
        document.documentElement.style.setProperty('--spacing-multiplier', '1.25');
        
        // Define outline mais visível para foco
        document.documentElement.style.setProperty('--focus-outline-width', '3px');
        document.documentElement.style.setProperty('--focus-outline-offset', '2px');
    }
    
    /**
     * Mostra notificação de mudança de estado
     */
    showNotification() {
        if (!this.statusIndicator) return;
        
        const message = this.isHighContrast 
            ? '✅ Alto contraste ativado' 
            : '❌ Alto contraste desativado';
        
        this.statusIndicator.textContent = message;
        this.statusIndicator.style.opacity = '1';
        
        // Fade out após 3 segundos
        setTimeout(() => {
            if (this.statusIndicator) {
                this.statusIndicator.style.opacity = '0';
            }
        }, 3000);
        
        // Anuncia para leitores de tela
        this.announceToScreenReader(message);
    }
    
    /**
     * Anuncia mensagem para leitores de tela
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove após 1 segundo
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
    
    /**
     * Verifica nível de contraste entre duas cores
     * @param {string} color1 - Cor 1 em hex
     * @param {string} color2 - Cor 2 em hex
     * @returns {number} Razão de contraste
     */
    checkContrast(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }
    
    /**
     * Calcula luminância relativa de uma cor
     * @param {string} hex - Cor em hex
     * @returns {number} Luminância
     */
    getLuminance(hex) {
        // Remove # se presente
        hex = hex.replace('#', '');
        
        // Converte para RGB
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        
        // Aplica transformação gamma
        const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
        const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
        const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
        
        // Calcula luminância
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    /**
     * Valida se esquema de cores atende WCAG AAA
     * @returns {Object} Resultado da validação
     */
    validateColorScheme() {
        const results = {
            passed: true,
            tests: []
        };
        
        const scheme = this.contrastSchemes.light;
        
        // Testa texto normal (mínimo 7:1)
        const textContrast = this.checkContrast(scheme.text, scheme.background);
        results.tests.push({
            test: 'Texto normal',
            contrast: textContrast.toFixed(2),
            passed: textContrast >= 7,
            required: 7
        });
        
        // Testa texto grande (mínimo 4.5:1)
        const textSecondaryContrast = this.checkContrast(scheme.textSecondary, scheme.background);
        results.tests.push({
            test: 'Texto secundário',
            contrast: textSecondaryContrast.toFixed(2),
            passed: textSecondaryContrast >= 4.5,
            required: 4.5
        });
        
        // Testa botão primário
        const primaryContrast = this.checkContrast(scheme.primary, scheme.background);
        results.tests.push({
            test: 'Botão primário',
            contrast: primaryContrast.toFixed(2),
            passed: primaryContrast >= 3,
            required: 3
        });
        
        results.passed = results.tests.every(test => test.passed);
        
        return results;
    }
    
    /**
     * Exporta configurações de alto contraste
     * @returns {Object} Configurações
     */
    exportSettings() {
        return {
            enabled: this.isHighContrast,
            systemPreference: this.systemPreference,
            animationsEnabled: this.animationsEnabled,
            scheme: document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light'
        };
    }
    
    /**
     * Importa configurações de alto contraste
     * @param {Object} settings - Configurações
     */
    importSettings(settings) {
        if (settings.enabled !== undefined) {
            this.isHighContrast = settings.enabled;
            
            if (this.isHighContrast) {
                this.applyHighContrast();
            } else {
                this.removeHighContrast();
            }
            
            this.updateButtonState();
            this.savePreference();
        }
        
        if (settings.animationsEnabled !== undefined) {
            this.animationsEnabled = settings.animationsEnabled;
        }
        
    }
    
    /**
     * Limpa recursos
     */
    destroy() {
        this.removeHighContrast();
        
        if (this.toggleButton) {
            this.toggleButton.remove();
        }
        
        if (this.statusIndicator) {
            this.statusIndicator.remove();
        }
        
        console.log('🗑️ HighContrastManager destruído');
    }
}

// Exporta para uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HighContrastManager;
}
