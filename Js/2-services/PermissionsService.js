/**
 * PermissionsService - Centraliza checagens de permissão (com cache)
 */
class PermissionsService {
    constructor() {
        this.cache = new Map(); // fileId -> { canEdit, canView, ts }
        this.TTL = 5 * 60 * 1000; // 5 minutes
    }

    _isFresh(entry) {
        if (!entry) return false;
        return (Date.now() - entry.ts) < this.TTL;
    }

    async canEdit(fileId) {
        if (!fileId) return false;
        const cached = this.cache.get(fileId);
        if (this._isFresh(cached) && typeof cached.canEdit === 'boolean') return cached.canEdit;

        try {
            if (typeof SharePointExcelService !== 'undefined' && typeof SharePointExcelService.userHasWritePermission === 'function') {
                const result = await SharePointExcelService.userHasWritePermission(fileId);
                this.cache.set(fileId, { canEdit: !!result, canView: !!result || true, ts: Date.now() });
                return !!result;
            }
        } catch (e) {
            console.warn('PermissionsService.canEdit error:', e && e.message);
        }

        // Conservador: assume false
        this.cache.set(fileId, { canEdit: false, canView: false, ts: Date.now() });
        return false;
    }

    async canView(fileId) {
        if (!fileId) return false;
        const cached = this.cache.get(fileId);
        if (this._isFresh(cached) && typeof cached.canView === 'boolean') return cached.canView;

        try {
            if (typeof SharePointExcelService !== 'undefined' && typeof SharePointExcelService.getFileMetadata === 'function') {
                await SharePointExcelService.getFileMetadata(fileId);
                this.cache.set(fileId, { canEdit: cached?.canEdit || false, canView: true, ts: Date.now() });
                return true;
            }
        } catch (e) {
            console.warn('PermissionsService.canView error:', e && e.message);
        }

        this.cache.set(fileId, { canEdit: false, canView: false, ts: Date.now() });
        return false;
    }

    invalidate(fileId) {
        this.cache.delete(fileId);
    }
}

if (typeof window !== 'undefined') window.PermissionsService = new PermissionsService();
if (typeof module !== 'undefined' && module.exports) module.exports = PermissionsService;
