/**
 * FileManager - Gerenciamento de upload, armazenamento e recuperação de arquivos
 * Responsável por: File System Access API, IndexedDB, LocalStorage, auto-load
 */

class FileManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.parser = dashboard.parser;
    }

    /**
     * Gerenciar upload de arquivo
     */
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        const statusElement = document.getElementById('uploadStatus');
        
        // Mostrar loading
        this.dashboard.uiManager.showLoading(`Carregando ${file.name}...`);
        
        if (statusElement) {
            statusElement.className = 'upload-status loading';
            statusElement.innerHTML = `
                <i class="bi bi-arrow-repeat"></i>
                <span class="file-info">Carregando ${file.name}...</span>
            `;
        }

        try {
            let csvData;
            
            if (fileExtension === 'csv') {
                csvData = await this.readFileAsText(file);
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                csvData = await this.readExcelFile(file);
            } else {
                throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
            }

            // Validar headers obrigatórios
            const lines = csvData.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            const requiredHeaders = ['SERVIDOR'];
            const missingHeaders = requiredHeaders.filter(header =>
                !headers.some(h => h.toUpperCase().includes(header))
            );

            if (missingHeaders.length > 0) {
                console.warn('Headers disponíveis:', headers);
                throw new Error(`Colunas obrigatórias não encontradas: ${missingHeaders.join(', ')}`);
            }

            this.dashboard.processData(csvData);
            this.dashboard.uiManager.updateLastUpdate();
            
            if (this.isFileSystemAccessSupported()) {
                const fileHandle = await this.getFileHandleForUpload(file);
                if (fileHandle) {
                    await this.saveFileHandleToStorage(fileHandle, file.name, csvData, fileExtension);
                }
            } else {
                this.saveFileToLocalStorage(file.name, csvData, fileExtension);
            }
            
            if (statusElement) {
                statusElement.className = 'upload-status success';
                statusElement.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    <span class="file-info">✓ ${file.name} (${this.dashboard.allServidores.length} servidores)</span>
                `;
            }
            
            await this.updateStoredFileIndicators();
            
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            if (statusElement) {
                statusElement.className = 'upload-status error';
                statusElement.innerHTML = `
                    <i class="bi bi-exclamation-circle"></i>
                    <span class="file-info">✗ ${error.message}</span>
                `;
            } else {
                alert('Erro ao processar arquivo: ' + error.message);
            }
            
            // Reset file input on error
            event.target.value = '';
            
        } finally {
            // Esconder loading
            this.dashboard.uiManager.hideLoading();
        }
    }

    /**
     * Verificar suporte ao File System Access API
     */
    isFileSystemAccessSupported() {
        return 'showOpenFilePicker' in window;
    }

    /**
     * Obter file handle do upload
     */
    async getFileHandleForUpload(file) {
        // File System Access API não suporta obter handle de input file
        // Retorna null para fallback para localStorage
        return null;
    }

    /**
     * Usar File System Access API
     */
    async handleFileSystemAccess() {
        if (!this.isFileSystemAccessSupported()) {
            alert('Seu navegador não suporta acesso direto ao sistema de arquivos. Use o upload tradicional.');
            return;
        }

        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Planilhas',
                    accept: {
                        'text/csv': ['.csv'],
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                        'application/vnd.ms-excel': ['.xls']
                    }
                }],
                multiple: false
            });

            const file = await fileHandle.getFile();
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            const statusElement = document.getElementById('fileStatus');
            if (statusElement) {
                statusElement.textContent = `Carregando ${file.name}...`;
                statusElement.className = 'file-status loading';
            }

            let csvData;
            if (fileExtension === 'csv') {
                csvData = await this.readFileAsText(file);
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                csvData = await this.readExcelFile(file);
            }

            this.dashboard.processData(csvData);
            
            await this.saveFileHandleToStorage(fileHandle, file.name, csvData, fileExtension);
            
            if (statusElement) {
                statusElement.textContent = `✓ ${file.name} carregado com sucesso`;
                statusElement.className = 'file-status success';
            }
            
            await this.updateStoredFileIndicators();
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Erro ao acessar arquivo:', error);
                alert(`Erro ao acessar arquivo: ${error.message}`);
            }
        }
    }

    /**
     * Salvar file handle no armazenamento
     */
    async saveFileHandleToStorage(fileHandle, fileName, fileData, fileType) {
        const fileInfo = {
            name: fileName,
            type: fileType,
            data: fileData,
            lastModified: new Date().toISOString(),
            source: 'filesystem'
        };

        try {
            await this.saveFileHandleToIndexedDB(fileHandle, fileName);
            localStorage.setItem('lastFileInfo', JSON.stringify(fileInfo));
        } catch (error) {
            console.warn('Erro ao salvar file handle, usando localStorage:', error);
            this.saveFileToLocalStorage(fileName, fileData, fileType);
        }
    }

    /**
     * Salvar file handle no IndexedDB
     */
    async saveFileHandleToIndexedDB(fileHandle, fileName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FileHandleDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['fileHandles'], 'readwrite');
                const store = transaction.objectStore('fileHandles');
                
                store.put({ id: 'lastFile', handle: fileHandle, name: fileName });
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Recuperar file handle do IndexedDB
     */
    async getFileHandleFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('FileHandleDB', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['fileHandles'], 'readonly');
                const store = transaction.objectStore('fileHandles');
                const getRequest = store.get('lastFile');
                
                getRequest.onsuccess = () => {
                    resolve(getRequest.result || null);
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Salvar arquivo no localStorage (fallback)
     */
    saveFileToLocalStorage(fileName, fileData, fileType) {
        const fileInfo = {
            name: fileName,
            type: fileType,
            data: fileData,
            lastModified: new Date().toISOString(),
            source: 'localstorage'
        };
        
        try {
            localStorage.setItem('lastFileInfo', JSON.stringify(fileInfo));
            localStorage.setItem('lastFileData', fileData);
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
            if (e.name === 'QuotaExceededError') {
                alert('Arquivo muito grande para armazenamento local. O auto-carregamento não estará disponível.');
            }
        }
    }

    /**
     * Recuperar último arquivo do armazenamento
     */
    async getLastFileFromStorage() {
        const fileInfoStr = localStorage.getItem('lastFileInfo');
        if (!fileInfoStr) return null;
        
        const fileInfo = JSON.parse(fileInfoStr);
        
        if (fileInfo.source === 'filesystem' && this.isFileSystemAccessSupported()) {
            try {
                const stored = await this.getFileHandleFromIndexedDB();
                if (stored && stored.handle) {
                    const permission = await stored.handle.queryPermission({ mode: 'read' });
                    if (permission === 'granted' || permission === 'prompt') {
                        const file = await stored.handle.getFile();
                        const csvData = await this.readExcelFileContent(file);
                        return { ...fileInfo, data: csvData };
                    }
                }
            } catch (error) {
                console.warn('Não foi possível acessar arquivo via File System API:', error);
            }
        }
        
        return this.getLastFileFromLocalStorage();
    }

    /**
     * Recuperar arquivo do localStorage
     */
    async getLastFileFromLocalStorage() {
        const fileData = localStorage.getItem('lastFileData');
        const fileInfoStr = localStorage.getItem('lastFileInfo');
        
        if (!fileData || !fileInfoStr) return null;
        
        const fileInfo = JSON.parse(fileInfoStr);
        return { ...fileInfo, data: fileData };
    }

    /**
     * Limpar arquivo armazenado
     */
    async clearStoredFile() {
        localStorage.removeItem('lastFileInfo');
        localStorage.removeItem('lastFileData');
        
        try {
            const request = indexedDB.open('FileHandleDB', 1);
            request.onsuccess = (event) => {
                const db = event.target.result;
                if (db.objectStoreNames.contains('fileHandles')) {
                    const transaction = db.transaction(['fileHandles'], 'readwrite');
                    const store = transaction.objectStore('fileHandles');
                    store.delete('lastFile');
                }
            };
        } catch (error) {
            console.warn('Erro ao limpar IndexedDB:', error);
        }
        
        await this.updateStoredFileIndicators();
    }

    /**
     * Atualizar indicadores de arquivo armazenado
     */
    async updateStoredFileIndicators() {
        const fileInfo = await this.getLastFileFromStorage();
        const indicator = document.getElementById('storedFileIndicator');
        const clearBtn = document.getElementById('clearStoredFile');
        
        if (indicator && clearBtn) {
            if (fileInfo) {
                const lastModified = new Date(fileInfo.lastModified);
                const now = new Date();
                const diffHours = Math.floor((now - lastModified) / (1000 * 60 * 60));
                
                let timeStr = diffHours < 1 ? 'agora' :
                             diffHours < 24 ? `${diffHours}h atrás` :
                             `${Math.floor(diffHours / 24)}d atrás`;
                
                indicator.innerHTML = `
                    <i class="bi bi-cloud-check"></i>
                    <span>${fileInfo.name}</span>
                    <span class="file-time">(${timeStr})</span>
                `;
                indicator.style.display = 'flex';
                clearBtn.style.display = 'inline-flex';
            } else {
                indicator.style.display = 'none';
                clearBtn.style.display = 'none';
            }
        }
    }

    /**
     * Tentar auto-carregar último arquivo
     */
    async tryAutoLoad() {
        const fileInfo = await this.getLastFileFromStorage();
        
        if (!fileInfo) return false;
        
        return new Promise((resolve) => {
            this.dashboard.showAutoLoadNotification(fileInfo, async (confirmed) => {
                if (confirmed) {
                    await this.performAutoLoad(fileInfo);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    /**
     * Executar auto-carregamento
     */
    async performAutoLoad(fileInfo) {
        const statusElement = document.getElementById('fileStatus');
        
        try {
            if (statusElement) {
                statusElement.textContent = `Carregando ${fileInfo.name}...`;
                statusElement.className = 'file-status loading';
            }
            
            this.dashboard.processData(fileInfo.data);
            
            if (statusElement) {
                statusElement.textContent = `✓ ${fileInfo.name} carregado automaticamente`;
                statusElement.className = 'file-status success';
            }
        } catch (error) {
            console.error('Erro no auto-carregamento:', error);
            if (statusElement) {
                statusElement.textContent = `✗ Erro ao carregar: ${error.message}`;
                statusElement.className = 'file-status error';
            }
        }
    }

    /**
     * Ler arquivo como texto
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Ler arquivo Excel
     */
    async readExcelFile(file) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_csv(firstSheet);
    }

    /**
     * Ler conteúdo de arquivo Excel (para File System API)
     */
    async readExcelFileContent(file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (fileExtension === 'csv') {
            return await this.readFileAsText(file);
        } else if (['xlsx', 'xls'].includes(fileExtension)) {
            return await this.readExcelFile(file);
        }
        
        throw new Error('Formato de arquivo não suportado');
    }

    /**
     * Adicionar indicador do File System Access
     */
    addFileSystemIndicator() {
        const uploadArea = document.querySelector('.upload-area');
        if (!uploadArea || !this.isFileSystemAccessSupported()) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'fs-access-badge';
        indicator.innerHTML = '<i class="bi bi-lightning-charge"></i> Acesso direto disponível';
        indicator.title = 'Seu navegador suporta acesso direto aos arquivos';
        uploadArea.appendChild(indicator);
    }
}
