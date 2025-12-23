/**
 * AuditService - registra ações do usuário localmente e envia para App Insights se disponível
 */

class AuditService {
    static STORAGE_KEY = 'licencas_audit_logs';

    static _nowIso() {
        return new Date().toISOString();
    }

    static async logAction(action, details = {}) {
        try {
            const user = (typeof AuthenticationService !== 'undefined' && AuthenticationService.getCurrentUser && AuthenticationService.getCurrentUser()) || { username: 'anonymous' };

            const entry = {
                timestamp: this._nowIso(),
                user: user.username || user.email || 'unknown',
                action,
                details,
                userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || null
            };

            // salvar localmente
            try {
                const raw = localStorage.getItem(this.STORAGE_KEY) || '[]';
                const arr = JSON.parse(raw);
                arr.push(entry);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(arr));
            } catch (e) {
                console.warn('AuditService: falha ao salvar no localStorage', e);
            }

            // enviar para Application Insights se presente
            if (typeof window !== 'undefined' && window.appInsights && typeof window.appInsights.trackEvent === 'function') {
                try {
                    window.appInsights.trackEvent({ name: 'Licencas.UserAction', properties: entry });
                } catch (aiErr) {
                    console.warn('AuditService: falha ao enviar para AppInsights', aiErr);
                }
            }

            console.log('Audit log:', entry);
            return entry;

        } catch (error) {
            console.error('AuditService.logAction error', error);
            throw error;
        }
    }

    static getLogs() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY) || '[]';
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    }

    static clearLogs() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            return false;
        }
    }
}

if (typeof window !== 'undefined') window.AuditService = AuditService;

module.exports = AuditService;
