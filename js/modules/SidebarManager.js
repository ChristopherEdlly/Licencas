/**
 * SidebarManager
 * Gerencia a funcionalidade da sidebar integrando com o sistema de licenças
 */

class SidebarManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.promoCloseBtn = document.getElementById('sidebarPromoClose');
        this.promoBanner = document.getElementById('sidebarSharePointBanner');
        this.sharePointConnectBtn = document.getElementById('sidebarSharePointConnect');
        this.userLoginBtn = document.getElementById('sidebarUserLogin');
        this.userLogoutBtn = document.getElementById('sidebarUserLogout');
        this.userNameElement = document.getElementById('sidebarUserName');
        this.userAvatarElement = document.querySelector('.sidebar-user-avatar span');
        
        this.init();
    }

    init() {
        // Fechar banner promocional
        if (this.promoCloseBtn && this.promoBanner) {
            this.promoCloseBtn.addEventListener('click', () => {
                this.promoBanner.style.display = 'none';
                localStorage.setItem('sidebar-sharepoint-banner-closed', 'true');
            });

            // Verificar se o banner já foi fechado
            if (localStorage.getItem('sidebar-sharepoint-banner-closed') !== 'true') {
                // Mostrar banner apenas se não estiver autenticado no Microsoft
                this.checkSharePointBannerVisibility();
            }
        }

        // Botão de conectar SharePoint no banner
        if (this.sharePointConnectBtn) {
            this.sharePointConnectBtn.addEventListener('click', () => {
                // Navegar para a página de configurações e abrir a seção do SharePoint
                const settingsLink = document.querySelector('[data-page="settings"]');
                if (settingsLink) {
                    settingsLink.click();
                    // Focar no input do SharePoint após um pequeno delay
                    setTimeout(() => {
                        const sharepointInput = document.getElementById('sharepointLinkInput');
                        if (sharepointInput) {
                            sharepointInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            sharepointInput.focus();
                        }
                    }, 300);
                }
            });
        }

        // Botão de login na sidebar
        if (this.userLoginBtn) {
            this.userLoginBtn.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        // Botão de logout na sidebar
        if (this.userLogoutBtn) {
            this.userLogoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Observar mudanças na autenticação Microsoft
        this.observeAuthenticationChanges();
        
        // Atualizar nome do usuário se estiver autenticado
        this.updateUserInfo();
    }

    observeAuthenticationChanges() {
        // Observar mudanças no account chip do header
        const accountChip = document.getElementById('microsoftAccountChip');
        if (accountChip) {
            const observer = new MutationObserver(() => {
                this.updateUserInfo();
                this.checkSharePointBannerVisibility();
            });
            
            observer.observe(accountChip, {
                attributes: true,
                attributeFilter: ['style'],
                childList: true,
                subtree: true
            });
        }

        // Também observar mudanças no nome da conta
        const accountName = document.getElementById('microsoftAccountName');
        if (accountName) {
            const observer = new MutationObserver(() => {
                this.updateUserInfo();
            });
            
            observer.observe(accountName, {
                characterData: true,
                childList: true,
                subtree: true
            });
        }
    }

    updateUserInfo() {
        const accountChip = document.getElementById('microsoftAccountChip');
        const accountName = document.getElementById('microsoftAccountName');
        const isAuthenticated = accountChip && accountChip.style.display !== 'none';
        
        if (isAuthenticated && accountName) {
            const name = accountName.textContent.trim();
            if (name && name !== 'Usuário') {
                // Atualizar nome na sidebar
                if (this.userNameElement) {
                    this.userNameElement.textContent = name;
                }
                
                // Atualizar avatar com primeira letra do nome
                if (this.userAvatarElement) {
                    this.userAvatarElement.textContent = name.charAt(0).toUpperCase();
                }
                
                // Mostrar botão de logout, esconder botão de login
                if (this.userLoginBtn) {
                    this.userLoginBtn.style.display = 'none';
                }
                if (this.userLogoutBtn) {
                    this.userLogoutBtn.style.display = 'flex';
                }
            }
        } else {
            // Usuário não autenticado - resetar para padrão
            if (this.userNameElement) {
                this.userNameElement.textContent = 'Usuário';
            }
            if (this.userAvatarElement) {
                this.userAvatarElement.textContent = 'U';
            }
            
            // Mostrar botão de login, esconder botão de logout
            if (this.userLoginBtn) {
                this.userLoginBtn.style.display = 'flex';
            }
            if (this.userLogoutBtn) {
                this.userLogoutBtn.style.display = 'none';
            }
        }
    }

    handleLogin() {
        // Acionar o botão de login do Microsoft no header
        const microsoftLoginBtn = document.getElementById('microsoftLoginButton');
        if (microsoftLoginBtn) {
            microsoftLoginBtn.click();
        }
    }

    checkSharePointBannerVisibility() {
        const accountChip = document.getElementById('microsoftAccountChip');
        const isAuthenticated = accountChip && accountChip.style.display !== 'none';
        const bannerClosed = localStorage.getItem('sidebar-sharepoint-banner-closed') === 'true';
        
        if (this.promoBanner) {
            // Mostrar banner apenas se estiver autenticado e não tiver fechado
            if (isAuthenticated && !bannerClosed) {
                this.promoBanner.style.display = 'block';
            } else {
                this.promoBanner.style.display = 'none';
            }
        }
    }

    handleLogout() {
        // Acionar o logout do Microsoft
        const microsoftLogoutBtn = document.getElementById('microsoftLogoutButton');
        if (microsoftLogoutBtn) {
            microsoftLogoutBtn.click();
        }
        
        // Resetar informações da sidebar
        if (this.userNameElement) {
            this.userNameElement.textContent = 'Usuário';
        }
        if (this.userAvatarElement) {
            this.userAvatarElement.textContent = 'U';
        }
        
        // Mostrar botão de login, esconder botão de logout
        if (this.userLoginBtn) {
            this.userLoginBtn.style.display = 'flex';
        }
        if (this.userLogoutBtn) {
            this.userLogoutBtn.style.display = 'none';
        }
        
        // Esconder banner do SharePoint
        if (this.promoBanner) {
            this.promoBanner.style.display = 'none';
        }
    }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sidebarManager = new SidebarManager();
    });
} else {
    window.sidebarManager = new SidebarManager();
}
