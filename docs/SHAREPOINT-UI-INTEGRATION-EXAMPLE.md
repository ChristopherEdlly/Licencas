# Exemplo de Integração: SharePoint UI Loading

Este documento mostra como integrar o `SharePointLoadingUI` com os métodos existentes do `SharePointDataLoader` e `AuthenticationManager`.

## 1. Autenticação com Feedback Visual

### Antes (código original)
```javascript
// AuthenticationManager.js
async login() {
    try {
        const result = await this.msalInstance.loginPopup({
            scopes: this.scopes
        });
        // ... resto do código
    } catch (error) {
        console.error('Login failed:', error);
    }
}
```

### Depois (com SharePointLoadingUI)
```javascript
// AuthenticationManager.js
async login() {
    const loadingUI = window.sharePointLoadingUI;

    try {
        loadingUI.showGlobalLoading('Conectando à Microsoft...');

        const result = await this.msalInstance.loginPopup({
            scopes: this.scopes
        });

        loadingUI.hideGlobalLoading();
        loadingUI.showSuccess(`Bem-vindo, ${result.account.name}!`);

        // ... resto do código

    } catch (error) {
        loadingUI.hideGlobalLoading();

        if (error.errorCode === 'user_cancelled') {
            loadingUI.showToast('Login cancelado', 'info', 3000);
        } else {
            loadingUI.showError('Falha na autenticação. Tente novamente.');
        }

        throw error;
    }
}
```

## 2. Carregamento de Arquivo com Progress Bar

### Antes (código original)
```javascript
// SharePointDataLoader.js
async loadFromSharePoint(url) {
    const fileInfo = this.parseSharePointUrl(url);
    const file = await this.findFileInDrive(fileInfo.fileName);
    const content = await this.downloadFile(file.id);
    // Parse e retorna
}
```

### Depois (com SharePointLoadingUI)
```javascript
// SharePointDataLoader.js
async loadFromSharePoint(url) {
    const loadingUI = window.sharePointLoadingUI;

    try {
        // Mostra progress bar
        loadingUI.showProgressBar({
            title: 'Carregando do SharePoint...',
            initialProgress: 0
        });

        // Passo 1: Parse URL (10%)
        const fileInfo = this.parseSharePointUrl(url);
        loadingUI.updateProgress(10, 'Analisando URL...');

        // Passo 2: Buscar arquivo (30%)
        const file = await this.findFileInDrive(fileInfo.fileName);
        loadingUI.updateProgress(30, 'Arquivo encontrado!');

        // Passo 3: Download (70%)
        loadingUI.updateProgress(40, 'Baixando arquivo...');
        const content = await this.downloadFile(file.id);
        loadingUI.updateProgress(70, 'Download concluído');

        // Passo 4: Parse (100%)
        loadingUI.updateProgress(85, 'Processando dados...');
        const parsedData = this.parseExcelContent(content);
        loadingUI.updateProgress(100, 'Concluído!');

        // Esconde progress bar e mostra sucesso
        setTimeout(() => {
            loadingUI.hideProgressBar();
            loadingUI.showSuccess(`${parsedData.length} registros carregados!`);
        }, 500);

        return parsedData;

    } catch (error) {
        loadingUI.hideProgressBar();

        // Mensagens de erro específicas
        if (error.message.includes('not found')) {
            loadingUI.showError('Arquivo não encontrado no SharePoint');
        } else if (error.message.includes('permission')) {
            loadingUI.showError('Sem permissão para acessar o arquivo');
        } else {
            loadingUI.showError(`Erro ao carregar: ${error.message}`);
        }

        throw error;
    }
}
```

## 3. Integração Completa no Dashboard

### dashboard.js - Método handleSharePointLoad()

```javascript
async handleSharePointLoad() {
    const loadingUI = window.sharePointLoadingUI;
    const authManager = this.authenticationManager;
    const sharePointLoader = this.sharePointDataLoader;

    // 1. Pegar URL do input
    const urlInput = document.getElementById('sharepointLinkInput');
    const url = urlInput?.value?.trim();

    if (!url) {
        loadingUI.showToast('Cole o link do SharePoint primeiro', 'warning');
        urlInput?.focus();
        return;
    }

    try {
        // 2. Verificar autenticação
        if (!authManager.isAuthenticated()) {
            const authResult = await loadingUI.authenticateWorkflow(
                () => authManager.login()
            );

            if (!authResult.success) {
                return; // Usuário cancelou
            }
        }

        // 3. Carregar arquivo com feedback visual completo
        const data = await sharePointLoader.loadFromSharePoint(url);

        // 4. Atualizar dashboard
        this.allServidores = data;
        this.filteredServidores = data;
        this.renderData();

        // 5. Limpar input
        urlInput.value = '';

    } catch (error) {
        console.error('Erro ao carregar do SharePoint:', error);
        // Erros já foram tratados pelo loadFromSharePoint
    }
}
```

## 4. Exemplo com Skeleton Loading

### Para mostrar skeleton enquanto carrega

```javascript
async loadDataIntoTable() {
    const tableContainer = document.getElementById('servidoresTable');
    const loadingUI = window.sharePointLoadingUI;

    // Mostra skeleton
    loadingUI.showSkeletonLoading(tableContainer);

    try {
        const data = await this.sharePointDataLoader.loadFromSharePoint(url);

        // Remove skeleton e renderiza dados reais
        loadingUI.hideSkeletonLoading(tableContainer);
        this.renderTable(data);

    } catch (error) {
        loadingUI.hideSkeletonLoading(tableContainer);

        // Mostra estado de erro
        tableContainer.innerHTML = `
            <div class="error-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Erro ao carregar dados</p>
                <button onclick="dashboard.loadDataIntoTable()">Tentar novamente</button>
            </div>
        `;
    }
}
```

## 5. Workflow Completo com Retry

### Implementação com retry automático

```javascript
async loadWithRetry(url, maxRetries = 3) {
    const loadingUI = window.sharePointLoadingUI;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            attempt++;

            if (attempt > 1) {
                loadingUI.showToast(
                    `Tentativa ${attempt} de ${maxRetries}...`,
                    'info',
                    2000
                );
            }

            const data = await this.sharePointDataLoader.loadFromSharePoint(url);
            return data;

        } catch (error) {
            if (attempt >= maxRetries) {
                // Última tentativa falhou
                loadingUI.showError(
                    `Falha após ${maxRetries} tentativas. Verifique sua conexão.`
                );
                throw error;
            }

            // Aguarda antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}
```

## 6. Toast de Progresso em Tempo Real

### Para operações longas com múltiplas etapas

```javascript
async processLargeFile(file) {
    const loadingUI = window.sharePointLoadingUI;

    // Cria toast de progresso customizado
    const progressToast = document.createElement('div');
    progressToast.className = 'modern-toast modern-toast-info progress-toast';
    progressToast.innerHTML = `
        <div class="progress-content">
            <span class="progress-label">Processando...</span>
            <div class="mini-progress-bar">
                <div class="mini-progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-status">0%</span>
        </div>
    `;

    document.body.appendChild(progressToast);

    try {
        for (let i = 0; i <= 100; i += 10) {
            // Simula processamento
            await new Promise(resolve => setTimeout(resolve, 200));

            // Atualiza toast
            const fill = progressToast.querySelector('.mini-progress-fill');
            const status = progressToast.querySelector('.progress-status');
            fill.style.width = `${i}%`;
            status.textContent = `${i}%`;
        }

        // Remove toast e mostra sucesso
        progressToast.remove();
        loadingUI.showSuccess('Processamento concluído!');

    } catch (error) {
        progressToast.remove();
        loadingUI.showError('Erro no processamento');
    }
}
```

## 7. Event Listeners nos Botões

### Adicionar no dashboard.init()

```javascript
init() {
    // ... código existente ...

    // Botão de carregar do SharePoint (Settings)
    const loadSharePointBtn = document.getElementById('loadSharePointBtn');
    if (loadSharePointBtn) {
        loadSharePointBtn.addEventListener('click', () => {
            this.handleSharePointLoad();
        });
    }

    // Listener no input de URL (Enter para carregar)
    const sharePointInput = document.getElementById('sharepointLinkInput');
    if (sharePointInput) {
        sharePointInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSharePointLoad();
            }
        });
    }
}
```

## 8. Estados de UI Melhorados

### Atualizar badge de status em tempo real

```javascript
updateSharePointStatus() {
    const statusBadge = document.getElementById('azureIntegrationStatus');
    const loadingUI = window.sharePointLoadingUI;

    if (!statusBadge) return;

    if (this.authenticationManager.isAuthenticated()) {
        statusBadge.textContent = 'Microsoft conectado';
        statusBadge.classList.add('connected');

        // Animação de sucesso
        statusBadge.style.animation = 'pulse 0.5s ease';
        setTimeout(() => {
            statusBadge.style.animation = '';
        }, 500);
    } else {
        statusBadge.textContent = 'Microsoft não conectado';
        statusBadge.classList.remove('connected');
    }
}
```

## 9. Validação de URL com Feedback

### Antes de tentar carregar

```javascript
validateSharePointUrl(url) {
    const loadingUI = window.sharePointLoadingUI;

    if (!url || url.trim() === '') {
        loadingUI.showToast('Cole o link do SharePoint', 'warning');
        return false;
    }

    if (!url.includes('sharepoint.com') && !url.includes('onedrive')) {
        loadingUI.showToast('URL inválida. Use um link do SharePoint ou OneDrive.', 'warning');
        return false;
    }

    if (!url.includes('.xlsx') && !url.includes('.xls')) {
        loadingUI.showToast('O arquivo deve ser Excel (.xlsx ou .xls)', 'warning');
        return false;
    }

    return true;
}
```

## 10. Cleanup ao Deslogar

### Garantir que não há loading states órfãos

```javascript
async handleLogout() {
    const loadingUI = window.sharePointLoadingUI;

    try {
        // Limpa qualquer UI de loading ativa
        loadingUI.hideProgressBar();
        loadingUI.hideGlobalLoading();

        // Mostra loading durante logout
        loadingUI.showGlobalLoading('Desconectando...');

        await this.authenticationManager.logout();

        loadingUI.hideGlobalLoading();
        loadingUI.showSuccess('Desconectado com sucesso');

        // Limpa dados
        this.allServidores = [];
        this.filteredServidores = [];
        this.renderData();

        // Atualiza UI
        this.updateSharePointStatus();

    } catch (error) {
        loadingUI.hideGlobalLoading();
        loadingUI.showError('Erro ao desconectar');
    }
}
```

## Resumo

Com estas integrações, o usuário terá:

✅ **Feedback visual claro** em cada etapa
✅ **Mensagens de erro específicas** e acionáveis
✅ **Progress bars** para operações longas
✅ **Toast notifications** para eventos rápidos
✅ **Skeleton loaders** durante carregamento de dados
✅ **Retry logic** com feedback visual
✅ **Validações** com mensagens amigáveis

O código fica mais **profissional**, **user-friendly** e **fácil de debugar**.
