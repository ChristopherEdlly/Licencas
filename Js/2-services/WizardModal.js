/**
 * WizardModal.js
 * 
 * Modal wizard em 2 etapas para adicionar/editar licenças.
 * Step 1: Busca e dados do servidor (pessoais + profissionais)
 * Step 2: Dados da licença com cálculo automático de períodos
 */

class WizardModal {
    constructor(app) {
        this.app = app;
        this.currentStep = 1;
        this.totalSteps = 2;
        this.mode = 'add'; // 'add' ou 'edit'
        this.data = {
            // Step 1
            nome: '',
            cpf: '',
            rg: '',
            cargo: '',
            lotacao: '',
            unidade: '',
            ref: '',
            // Step 2
            numero: '',
            emissao: '',
            aquisitivo_inicio: '',
            aquisitivo_fim: '',
            a_partir: '',
            gozo: '',
            termino: '',
            restando: ''
        };
        this.servidorData = null;
        this.periodosDisponiveis = [];
        this.selectedPeriodo = null;
        this.selectedPeriodoIndex = null; // Guardar index do período selecionado
        this.originalLicenseData = null;
        this.isPeriodoPersonalizado = false;
        
        this._createModal();
        this._attachEventListeners();
    }

    /**
     * Cria a estrutura HTML do modal
     */
    _createModal() {
        const modalHTML = `
            <div id="wizardModal" class="wizard-modal">
                <div class="wizard-content">
                    <div class="wizard-header">
                        <div class="wizard-title">
                            <span class="wizard-title-icon">📋</span>
                            <span class="wizard-title-text">Nova Licença</span>
                        </div>
                        <div class="wizard-header-right">
                            <span class="wizard-step-indicator">1/2</span>
                            <button class="wizard-close-button" aria-label="Fechar">×</button>
                        </div>
                    </div>
                    
                    <div class="wizard-body">
                        <!-- Steps serão renderizados dinamicamente aqui -->
                    </div>
                    
                    <div class="wizard-footer">
                        <div class="wizard-footer-left">
                            <button class="wizard-button wizard-button-back" style="display: none;">
                                ← Voltar
                            </button>
                        </div>
                        <div class="wizard-footer-right">
                            <button class="wizard-button wizard-button-cancel">Cancelar</button>
                            <button class="wizard-button wizard-button-next">Próximo: Licença →</button>
                            <button class="wizard-button wizard-button-save" style="display: none;">
                                💾 Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('wizardModal');
    }

    /**
     * Anexa event listeners aos elementos do modal
     */
    _attachEventListeners() {
        // Fechar modal
        this.modal.querySelector('.wizard-close-button').addEventListener('click', () => this.close());
        this.modal.querySelector('.wizard-button-cancel').addEventListener('click', () => this.close());
        
        // Navegação
        this.modal.querySelector('.wizard-button-back').addEventListener('click', () => this._previousStep());
        this.modal.querySelector('.wizard-button-next').addEventListener('click', () => this._nextStep());
        this.modal.querySelector('.wizard-button-save').addEventListener('click', () => this._save());
        
        // Fechar ao clicar fora
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    /**
     * Abre o modal
     * @param {string} mode - 'add' ou 'edit'
     * @param {Object} servidorData - Dados do servidor (se editar)
     * @param {Object} licenseData - Dados da licença (se editar)
     */
    open(mode = 'add', servidorData = null, licenseData = null) {
        console.log('[WizardModal] Abrindo modal:', { mode, servidorData, licenseData });
        
        this.mode = mode;
        this.currentStep = 1;
        this.servidorData = servidorData;
        this.originalLicenseData = licenseData;
        
        // Resetar dados
        this._resetData();
        
        // Se for edição, preencher dados
        if (mode === 'edit' && licenseData) {
            this._fillDataFromLicense(licenseData);
        }
        
        // Atualizar título
        const titleText = this.modal.querySelector('.wizard-title-text');
        titleText.textContent = mode === 'edit' ? 'Editar Licença' : 'Nova Licença';
        
        // Renderizar step 1
        this._showStep(1);
        
        // Mostrar modal
        this.modal.classList.add('active');
        
        // Focus no primeiro campo
        setTimeout(() => {
            const firstInput = this.modal.querySelector('.wizard-body input:not([disabled])');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    /**
     * Fecha o modal
     */
    close() {
        this.modal.classList.remove('active');
        this._resetData();
        console.log('[WizardModal] Modal fechado');
    }

    /**
     * Reseta os dados do formulário
     */
    _resetData() {
        this.data = {
            nome: '',
            cpf: '',
            rg: '',
            cargo: '',
            lotacao: '',
            unidade: '',
            ref: '',
            numero: '',
            emissao: '',
            aquisitivo_inicio: '',
            aquisitivo_fim: '',
            a_partir: '',
            gozo: '',
            termino: '',
            restando: ''
        };
        this.servidorData = null;
        this.periodosDisponiveis = [];
        this.selectedPeriodo = null;
        this.selectedPeriodoIndex = null;
    }

    /**
     * Preenche dados a partir de uma licença existente
     */
    _fillDataFromLicense(license) {
        // Dados do servidor
        this.data.nome = license.NOME || '';
        this.data.cpf = license.CPF || '';
        this.data.rg = license.RG || '';
        this.data.cargo = license.CARGO || '';
        this.data.lotacao = license.LOTACAO || '';
        this.data.unidade = license.UNIDADE || '';
        this.data.ref = license.REF || '';
        
        // Dados da licença
        this.data.numero = license.NUMERO || '';
        this.data.emissao = license.EMISSAO || '';
        this.data.aquisitivo_inicio = license.AQUISITIVO_INICIO || '';
        this.data.aquisitivo_fim = license.AQUISITIVO_FIM || '';
        this.data.a_partir = license.A_PARTIR || '';
        this.data.gozo = license.GOZO || '';
        this.data.termino = license.TERMINO || '';
        this.data.restando = license.RESTANDO || '';
    }

    /**
     * Mostra um step específico
     */
    _showStep(stepNumber) {
        this.currentStep = stepNumber;
        
        // Atualizar indicador
        const indicator = this.modal.querySelector('.wizard-step-indicator');
        indicator.textContent = `${stepNumber}/${this.totalSteps}`;
        
        // Atualizar botões
        const backBtn = this.modal.querySelector('.wizard-button-back');
        const nextBtn = this.modal.querySelector('.wizard-button-next');
        const saveBtn = this.modal.querySelector('.wizard-button-save');
        
        if (stepNumber === 1) {
            backBtn.style.display = 'none';
            nextBtn.style.display = 'block';
            saveBtn.style.display = 'none';
        } else if (stepNumber === 2) {
            backBtn.style.display = 'block';
            nextBtn.style.display = 'none';
            saveBtn.style.display = 'block';
        }
        
        // Renderizar step
        const body = this.modal.querySelector('.wizard-body');
        if (stepNumber === 1) {
            body.innerHTML = this._renderStep1();
            this._attachStep1Listeners();
        } else if (stepNumber === 2) {
            body.innerHTML = this._renderStep2();
            this._attachStep2Listeners();
        }
    }

    /**
     * Avança para o próximo step
     */
    _nextStep() {
        // Validar step atual
        if (!this._validateCurrentStep()) {
            return;
        }
        
        // Avançar
        if (this.currentStep < this.totalSteps) {
            this._showStep(this.currentStep + 1);
        }
    }

    /**
     * Volta para o step anterior
     */
    _previousStep() {
        if (this.currentStep > 1) {
            this._showStep(this.currentStep - 1);
        }
    }

    /**
     * Valida o step atual
     */
    _validateCurrentStep() {
        if (this.currentStep === 1) {
            return this._validateStep1();
        } else if (this.currentStep === 2) {
            return this._validateStep2();
        }
        return true;
    }

    /**
     * Renderiza Step 1: Dados do Servidor
     */
    _renderStep1() {
        const isEditMode = this.mode === 'edit';
        const readonlyAttr = isEditMode ? 'readonly' : '';
        
        console.log('[WizardModal] Renderizando Step 1 com dados:', {
            hasServidorData: !!this.servidorData,
            nome: this.data.nome,
            cpf: this.data.cpf,
            cargo: this.data.cargo
        });
        
        return `
            <div class="wizard-section">
                <h3 class="wizard-section-title">
                    <span class="wizard-section-icon">👤</span>
                    <span>Dados do Servidor</span>
                </h3>
                
                ${!isEditMode ? `
                    <div class="wizard-search-box">
                        <input 
                            type="text" 
                            id="wizardSearch" 
                            class="wizard-search-input" 
                            placeholder="Digite CPF ou Nome e pressione Enter..."
                            value="${this.data.cpf || this.data.nome}"
                        />
                        <button class="wizard-search-button" id="wizardSearchBtn">
                            🔍 Buscar
                        </button>
                    </div>
                    <div class="wizard-divider">
                        <span>ou preencha manualmente</span>
                    </div>
                ` : ''}
                
                <div class="wizard-subsection">
                    <h4 class="wizard-subsection-title">Dados Pessoais</h4>
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Nome Completo *
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardNome" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.nome}"
                                ${readonlyAttr}
                                required
                            />
                        </div>
                    </div>
                    
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                CPF *
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardCPF" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.cpf}"
                                ${readonlyAttr}
                                placeholder="000.000.000-00"
                                required
                            />
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                RG
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardRG" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.rg}"
                                ${readonlyAttr}
                            />
                        </div>
                    </div>
                </div>
                
                <div class="wizard-subsection">
                    <h4 class="wizard-subsection-title">Dados Profissionais</h4>
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Cargo *
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardCargo" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.cargo}"
                                required
                            />
                        </div>
                    </div>
                    
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Lotação *
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardLotacao" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.lotacao}"
                                required
                            />
                        </div>
                    </div>
                    
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Unidade
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardUnidade" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.unidade}"
                            />
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Referência
                                ${this.servidorData ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input 
                                type="text" 
                                id="wizardRef" 
                                class="wizard-field-input ${this.servidorData ? 'wizard-field-autofilled' : ''}" 
                                value="${this.data.ref}"
                            />
                        </div>
                    </div>
                </div>
                
                ${isEditMode ? `
                    <div class="wizard-alert wizard-alert-warning">
                        <span class="wizard-alert-icon">⚠️</span>
                        <span>Dados pessoais e profissionais afetarão todas as licenças deste servidor.</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Anexa event listeners do Step 1
     */
    _attachStep1Listeners() {
        // Busca
        const searchInput = document.getElementById('wizardSearch');
        const searchBtn = document.getElementById('wizardSearchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this._searchServidor();
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this._searchServidor());
        }
        
        // Atualizar data ao digitar
        const fields = ['Nome', 'CPF', 'RG', 'Cargo', 'Lotacao', 'Unidade', 'Ref'];
        fields.forEach(field => {
            const input = document.getElementById(`wizard${field}`);
            if (input) {
                input.addEventListener('input', (e) => {
                    let value = e.target.value;
                    
                    // Auto-formatação de CPF: 000.000.000-00
                    if (field === 'CPF') {
                        value = value.replace(/\D/g, ''); // Remove não-numéricos
                        if (value.length <= 11) {
                            value = value.replace(/(\d{3})(\d)/, '$1.$2');
                            value = value.replace(/(\d{3})(\d)/, '$1.$2');
                            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                            e.target.value = value;
                        }
                    }
                    
                    // Auto-formatação de RG: 00.000.000-0
                    if (field === 'RG') {
                        value = value.replace(/\D/g, ''); // Remove não-numéricos
                        if (value.length <= 9) {
                            value = value.replace(/(\d{2})(\d)/, '$1.$2');
                            value = value.replace(/(\d{3})(\d)/, '$1.$2');
                            value = value.replace(/(\d{3})(\d{1})$/, '$1-$2');
                            e.target.value = value;
                        }
                    }
                    
                    this.data[field.toLowerCase()] = e.target.value;
                });
            }
        });
    }

    /**
     * Busca servidor no cache
     */
    _searchServidor() {
        const searchInput = document.getElementById('wizardSearch');
        const query = searchInput.value.trim();
        
        if (!query) {
            console.warn('[WizardModal] Campo de busca vazio');
            return;
        }
        
        console.log('[WizardModal] Buscando servidor:', query);
        
        // Buscar no DataStateManager
        const allServidores = this.app.dataStateManager.getAllServidores();
        console.log('[WizardModal] Total de servidores no cache:', allServidores.length);
        
        // Se cache vazio, tentar filtrados
        if (!allServidores || allServidores.length === 0) {
            console.warn('[WizardModal] Cache de servidores vazio, tentando filtrados...');
            const filteredServidores = this.app.dataStateManager.getFilteredServidores();
            console.log('[WizardModal] Servidores filtrados:', filteredServidores.length);
            
            if (!filteredServidores || filteredServidores.length === 0) {
                console.error('[WizardModal] Nenhum servidor disponível para busca!');
                console.log('[WizardModal] Verifique se os dados foram carregados em DataStateManager');
                alert('Nenhum servidor carregado. Por favor, recarregue a página.');
                return;
            }
        }
        
        const searchData = allServidores.length > 0 ? allServidores : this.app.dataStateManager.getFilteredServidores();
        console.log('[WizardModal] Buscando em', searchData.length, 'registros');
        
        // Mostrar amostra dos dados para debug
        if (searchData.length > 0) {
            console.log('[WizardModal] Amostra do primeiro registro:', searchData[0]);
            console.log('[WizardModal] Chaves disponíveis:', Object.keys(searchData[0]));
        }
        
        // Normalizar query para busca por CPF
        const queryCPFClean = query.replace(/\D/g, '');
        console.log('[WizardModal] Query normalizada para CPF:', queryCPFClean);
        
        // Buscar por CPF ou nome
        const found = searchData.find(s => {
            // Busca por CPF (remove todos caracteres não-numéricos)
            if (queryCPFClean.length >= 3) {
                const cpfValue = s.cpf || s.CPF || '';
                const cpfClean = String(cpfValue).replace(/\D/g, '');
                console.log('[WizardModal] Comparando CPF:', { query: queryCPFClean, cpf: cpfClean, original: cpfValue });
                if (cpfClean && cpfClean.includes(queryCPFClean)) {
                    console.log('[WizardModal] ✓ Match por CPF!');
                    return true;
                }
            }
            
            // Busca por nome (case insensitive, partial match)
            const nome = (s.nome || s.NOME || '').toLowerCase().trim();
            const queryNome = query.toLowerCase().trim();
            if (queryNome.length >= 3) {
                console.log('[WizardModal] Comparando nome:', { query: queryNome, nome: nome, original: s.nome || s.NOME });
                if (nome && nome.includes(queryNome)) {
                    console.log('[WizardModal] ✓ Match por nome!');
                    return true;
                }
            }
            
            return false;
        });
        
        if (found) {
            console.log('[WizardModal] Servidor encontrado:', found);
            this._fillServidorData(found);
            // Re-renderizar step 1 para atualizar os campos com as badges (auto)
            this._showStep(1);
            console.log('[WizardModal] Campos atualizados com sucesso');
        } else {
            console.log('[WizardModal] Nenhum servidor encontrado para:', query);
            // NÃO mostrar alert - apenas log
        }
    }

    /**
     * Preenche dados do servidor encontrado
     */
    _fillServidorData(servidor) {
        console.log('[WizardModal] Preenchendo dados do servidor:', servidor);
        console.log('[WizardModal] Chaves disponíveis:', Object.keys(servidor));
        
        this.servidorData = servidor;
        
        // Preencher campos no objeto data (suporta maiúsculas, minúsculas e formatados)
        this.data.nome = servidor.nome || servidor.NOME || servidor.nomeFormatado || '';
        this.data.cpf = servidor.cpf || servidor.CPF || servidor.cpfFormatado || '';
        this.data.rg = servidor.rg || servidor.RG || servidor.rgFormatado || servidor['RG/Identidade'] || servidor.identidade || '';
        this.data.cargo = servidor.cargo || servidor.CARGO || '';
        this.data.lotacao = servidor.lotacao || servidor.LOTACAO || '';
        this.data.unidade = servidor.unidade || servidor.UNIDADE || '';
        this.data.ref = servidor.ref || servidor.REF || '';
        
        console.log('[WizardModal] Dados preenchidos:', this.data);
        console.log('[WizardModal] RG encontrado:', this.data.rg);

        // Recarregar períodos aquisitivos do cache com o CPF do servidor encontrado
        console.log('[WizardModal] Recarregando períodos aquisitivos após preencher servidor...');
        this._calcularPeriodosAquisitivos();
    }

    /**
     * Valida Step 1
     */
    _validateStep1() {
        const requiredFields = [
            { id: 'wizardNome', name: 'Nome' },
            { id: 'wizardCPF', name: 'CPF' },
            { id: 'wizardCargo', name: 'Cargo' },
            { id: 'wizardLotacao', name: 'Lotação' }
        ];
        
        let isValid = true;
        const errors = [];
        
        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            if (input && !input.value.trim()) {
                isValid = false;
                errors.push(field.name);
                input.classList.add('invalid');
            } else if (input) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            }
        });
        
        if (!isValid) {
            this._showNotification(`Preencha os campos obrigatórios: ${errors.join(', ')}`, 'error');
        }
        
        return isValid;
    }

    /**
     * Renderiza Step 2: Dados da Licença
     */
    _renderStep2() {
        // Calcular períodos disponíveis
        this._calcularPeriodosAquisitivos();
        
        const periodosOptions = this.periodosDisponiveis.map((p, index) => {
            // Converter Date objects para strings ISO se necessário
            const inicioStr = p.inicio instanceof Date ? this._dateToISO(p.inicio) : p.inicio;
            const fimStr = p.fim instanceof Date ? this._dateToISO(p.fim) : p.fim;
            const disponivel = p.disponivel !== undefined ? p.disponivel : p.disponiveis || 0;
            const isSelected = this.selectedPeriodoIndex === index;
            
            return `
                <option value="${index}" ${isSelected ? 'selected' : ''}>
                    ${p.label || inicioStr} - ${disponivel} dias disponíveis
                </option>
            `;
        }).join('');
        
        // Opções de gozo (30, 60, 90 dias)
        const gozoOptions = [30, 60, 90].map(dias => `
            <option value="${dias}" ${this.data.gozo == dias ? 'selected' : ''}>${dias} dias</option>
        `).join('');
        
        return `
            <div class="wizard-section">
                <h3 class="wizard-section-title">
                    <span class="wizard-section-icon">📅</span>
                    <span>Dados da Licença</span>
                </h3>
                
                <div class="wizard-field-group">
                    <div class="wizard-field">
                        <label class="wizard-field-label">Número do Processo *</label>
                        <input 
                            type="text" 
                            id="wizardNumero" 
                            class="wizard-field-input" 
                            value="${this.data.numero}"
                            required
                        />
                    </div>
                    <div class="wizard-field">
                        <label class="wizard-field-label">Data de Emissão *</label>
                        <input 
                            type="date" 
                            id="wizardEmissao" 
                            class="wizard-field-input" 
                            value="${this.data.emissao}"
                            required
                        />
                    </div>
                </div>
                
                <div class="wizard-field-group">
                    <div class="wizard-field wizard-field-full">
                        <label class="wizard-field-label">Período Aquisitivo *</label>
                        <select 
                            id="wizardPeriodo" 
                            class="wizard-field-input wizard-field-select"
                            required
                        >
                            <option value="">Selecione um período...</option>
                            ${periodosOptions}
                            <option value="personalizado">📝 Personalizado...</option>
                        </select>
                    </div>
                </div>
                
                ${this.isPeriodoPersonalizado ? `
                    <div class="wizard-field-group" id="periodoPersonalizadoGroup">
                        <div class="wizard-field">
                            <label class="wizard-field-label">Início do Período *</label>
                            <input 
                                type="date" 
                                id="wizardAquisitivoInicio" 
                                class="wizard-field-input" 
                                value="${this.data.aquisitivo_inicio}"
                                required
                            />
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">Fim do Período *</label>
                            <input 
                                type="date" 
                                id="wizardAquisitivoFim" 
                                class="wizard-field-input" 
                                value="${this.data.aquisitivo_fim}"
                                required
                            />
                        </div>
                    </div>
                ` : ''}
                
                ${this.selectedPeriodo && !this.isPeriodoPersonalizado ? `
                    <div class="wizard-info-box">
                        <span class="wizard-info-icon">ℹ️</span>
                        <span>Disponível neste período: <strong>${this.selectedPeriodo.disponivel || this.selectedPeriodo.disponiveis || 0} dias</strong></span>
                    </div>
                ` : ''}
                
                <div class="wizard-subsection">
                    <h4 class="wizard-subsection-title">Datas da Licença</h4>
                    <p class="wizard-help-text">💡 Preencha Início + Fim OU Início + Gozo (cálculo automático)</p>
                    
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">Início (A partir de) *</label>
                            <input 
                                type="date" 
                                id="wizardAPartir" 
                                class="wizard-field-input" 
                                value="${this.data.a_partir}"
                                required
                            />
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Término
                                <span class="wizard-field-calc-tag" id="terminoCalcTag" style="display:none">(calculado)</span>
                            </label>
                            <input 
                                type="date" 
                                id="wizardTermino" 
                                class="wizard-field-input" 
                                value="${this.data.termino}"
                            />
                        </div>
                    </div>
                    
                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Dias de Gozo *
                                <span class="wizard-field-calc-tag" id="gozoCalcTag" style="display:none">(calculado)</span>
                            </label>
                            <select 
                                id="wizardGozo" 
                                class="wizard-field-input wizard-field-select"
                                required
                            >
                                <option value="">Selecione...</option>
                                ${gozoOptions}
                            </select>
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Restando
                                <span class="wizard-field-calc-tag">(calculado)</span>
                            </label>
                            <input 
                                type="number" 
                                id="wizardRestando" 
                                class="wizard-field-input calculated" 
                                value="${this.data.restando}"
                                readonly
                            />
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Anexa event listeners do Step 2
     */
    _attachStep2Listeners() {
        // Atualizar data ao digitar
        const numero = document.getElementById('wizardNumero');
        const emissao = document.getElementById('wizardEmissao');
        const periodo = document.getElementById('wizardPeriodo');
        const aPartir = document.getElementById('wizardAPartir');
        const termino = document.getElementById('wizardTermino');
        const gozo = document.getElementById('wizardGozo');
        
        if (numero) {
            numero.addEventListener('input', (e) => {
                this.data.numero = e.target.value;
            });
        }
        
        if (emissao) {
            emissao.addEventListener('change', (e) => {
                this.data.emissao = e.target.value;
            });
        }
        
        if (periodo) {
            periodo.addEventListener('change', (e) => {
                const value = e.target.value;
                
                if (value === 'personalizado') {
                    // Modo personalizado
                    this.isPeriodoPersonalizado = true;
                    this.selectedPeriodo = null;
                    this.selectedPeriodoIndex = null;
                    this._showStep(2); // Re-renderizar
                } else {
                    // Período predefinido
                    this.isPeriodoPersonalizado = false;
                    const index = parseInt(value);
                    if (!isNaN(index) && this.periodosDisponiveis[index]) {
                        this.selectedPeriodo = this.periodosDisponiveis[index];
                        this.selectedPeriodoIndex = index; // Guardar index
                        
                        // Converter Date para ISO string se necessário
                        const inicio = this.selectedPeriodo.inicio;
                        const fim = this.selectedPeriodo.fim;
                        this.data.aquisitivo_inicio = inicio instanceof Date ? this._dateToISO(inicio) : inicio;
                        this.data.aquisitivo_fim = fim instanceof Date ? this._dateToISO(fim) : fim;
                        
                        console.log('[WizardModal] Período selecionado:', {
                            index,
                            periodo: this.selectedPeriodo,
                            aquisitivo_inicio: this.data.aquisitivo_inicio,
                            aquisitivo_fim: this.data.aquisitivo_fim
                        });
                        
                        // Re-renderizar para mostrar info box
                        this._showStep(2);
                    }
                }
            });
        }
        
        // Período personalizado - listeners
        const aquisitivoInicio = document.getElementById('wizardAquisitivoInicio');
        const aquisitivoFim = document.getElementById('wizardAquisitivoFim');
        
        if (aquisitivoInicio) {
            aquisitivoInicio.addEventListener('change', (e) => {
                this.data.aquisitivo_inicio = e.target.value;
                this._calcularDisponiveisPeriodoPersonalizado();
            });
        }
        
        if (aquisitivoFim) {
            aquisitivoFim.addEventListener('change', (e) => {
                this.data.aquisitivo_fim = e.target.value;
                this._calcularDisponiveisPeriodoPersonalizado();
            });
        }
        
        if (aPartir) {
            aPartir.addEventListener('change', (e) => {
                this.data.a_partir = e.target.value;
                
                // Se termino está preenchido, calcular gozo
                if (termino && termino.value) {
                    this._calcularGozoFromDates();
                } else if (gozo && gozo.value) {
                    // Se gozo está preenchido, calcular término
                    this._calcularTermino();
                }
                
                this._calcularRestando();
            });
        }
        
        if (termino) {
            termino.addEventListener('change', (e) => {
                this.data.termino = e.target.value;
                
                // Calcular gozo baseado em inicio e fim
                if (aPartir && aPartir.value) {
                    this._calcularGozoFromDates();
                    this._calcularRestando();
                }
            });
        }
        
        if (gozo) {
            gozo.addEventListener('change', (e) => {
                this.data.gozo = e.target.value;
                
                // Calcular término baseado em inicio e gozo
                if (aPartir && aPartir.value) {
                    this._calcularTermino();
                    this._calcularRestando();
                }
            });
        }
    }

    /**
     * Calcula períodos aquisitivos disponíveis
     */
    _calcularPeriodosAquisitivos() {
        console.log('[WizardModal] Carregando períodos aquisitivos do cache...');
        
        this.periodosDisponiveis = [];
        
        // Tentar buscar períodos pré-calculados do servidor
        let servidor = this.servidorData;
        
        // Se não temos servidorData, buscar no cache
        if (!servidor) {
            const allServidores = this.app.dataStateManager.getAllServidores();
            servidor = allServidores.find(s => 
                (s.cpf || s.CPF) === this.data.cpf || 
                (s.nome || s.NOME) === this.data.nome
            );
        }
        
        // Se o servidor tem períodos pré-calculados, usar eles!
        if (servidor && servidor.periodosAquisitivos && Array.isArray(servidor.periodosAquisitivos)) {
            console.log('[WizardModal] Usando períodos pré-calculados:', servidor.periodosAquisitivos.length);
            
            this.periodosDisponiveis = servidor.periodosAquisitivos.map(p => ({
                inicio: p.inicio,
                fim: p.fim,
                disponivel: p.disponivel,
                label: p.label
            }));
            
            console.log('[WizardModal] Períodos carregados:', this.periodosDisponiveis);
            return;
        }
        
        console.warn('[WizardModal] Períodos aquisitivos não encontrados no cache - usando fallback');
        
        // FALLBACK: calcular períodos na hora (se não estiver no cache)
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        
        for (let i = 0; i < 5; i++) {
            const anoInicio = anoAtual - (4 - i);
            const inicio = new Date(anoInicio, 0, 1);
            const fim = new Date(anoInicio, 11, 31);
            
            this.periodosDisponiveis.push({
                inicio: inicio,
                fim: fim,
                disponivel: 90, // Estimativa
                label: `${anoInicio}`
            });
        }
        
        console.log('[WizardModal] Períodos calculados (fallback):', this.periodosDisponiveis);
    }

    /**
     * Calcula data de término automaticamente
     */
    _calcularTermino() {
        if (!this.data.a_partir || !this.data.gozo) {
            return;
        }
        
        console.log('[WizardModal] Calculando término - Início:', this.data.a_partir, 'Gozo:', this.data.gozo);
        
        // Parse da data como local (não UTC) para evitar problema de timezone
        const [ano, mes, dia] = this.data.a_partir.split('-').map(Number);
        const inicio = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11
        
        console.log('[WizardModal] Data início parseada:', inicio);
        
        const gozo = parseInt(this.data.gozo);
        
        if (isNaN(gozo) || gozo <= 0) {
            return;
        }
        
        // Licença de 60 dias: dia 1 (10/01) até dia 60 (10/03)
        // Fórmula: término = início + (gozo - 1) dias
        // Exemplo: 10/01 + 59 dias = 10/03
        const termino = new Date(inicio);
        termino.setDate(termino.getDate() + gozo - 1);
        
        console.log('[WizardModal] Data término calculada:', termino);
        console.log('[WizardModal] Dias adicionados:', gozo - 1);
        
        this.data.termino = this._dateToISO(termino);
        
        console.log('[WizardModal] Término ISO:', this.data.termino);
        
        // Atualizar campo
        const terminoInput = document.getElementById('wizardTermino');
        if (terminoInput) {
            terminoInput.value = this.data.termino;
            terminoInput.classList.add('calculated');
        }
        
        // Mostrar tag de calculado
        const terminoTag = document.getElementById('terminoCalcTag');
        if (terminoTag) terminoTag.style.display = 'inline';
        
        // Esconder tag de calculado no gozo
        const gozoTag = document.getElementById('gozoCalcTag');
        if (gozoTag) gozoTag.style.display = 'none';
        
        console.log('[WizardModal] Término calculado:', this.data.termino, '(início + ' + gozo + ' dias)');
    }

    /**
     * Calcula gozo baseado em início e término
     */
    _calcularGozoFromDates() {
        if (!this.data.a_partir || !this.data.termino) {
            return;
        }
        
        // Parse datas como local (não UTC) para evitar problema de timezone
        const [anoIni, mesIni, diaIni] = this.data.a_partir.split('-').map(Number);
        const inicio = new Date(anoIni, mesIni - 1, diaIni);
        
        const [anoFim, mesFim, diaFim] = this.data.termino.split('-').map(Number);
        const fim = new Date(anoFim, mesFim - 1, diaFim);
        
        // Calcular diferença em dias (incluindo ambos os extremos)
        // De 10/01 a 10/03: (10/03 - 10/01) / msPerDay = 59, então + 1 = 60 dias
        const diffTime = fim - inicio;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays <= 0) {
            console.warn('[WizardModal] Data de término anterior ao início');
            return;
        }
        
        this.data.gozo = diffDays.toString();
        
        console.log('[WizardModal] Gozo calculado:', diffDays, 'dias (de', this.data.a_partir, 'a', this.data.termino, ')');
        
        // Atualizar campo
        const gozoInput = document.getElementById('wizardGozo');
        if (gozoInput) {
            // Se o valor calculado está nas opções, selecionar
            if ([30, 60, 90].includes(diffDays)) {
                gozoInput.value = diffDays;
            } else {
                // Valor não está nas opções padrão - adicionar opção temporária
                const existingOption = Array.from(gozoInput.options).find(opt => opt.value == diffDays);
                if (!existingOption) {
                    const newOption = document.createElement('option');
                    newOption.value = diffDays;
                    newOption.textContent = `${diffDays} dias`;
                    newOption.selected = true;
                    gozoInput.appendChild(newOption);
                }
            }
        }
        
        // Mostrar tag de calculado no gozo
        const gozoTag = document.getElementById('gozoCalcTag');
        if (gozoTag) gozoTag.style.display = 'inline';
        
        // Esconder tag de calculado no término
        const terminoTag = document.getElementById('terminoCalcTag');
        if (terminoTag) terminoTag.style.display = 'none';
        
        console.log('[WizardModal] Gozo calculado:', this.data.gozo);
    }

    /**
     * Calcula dias restantes automaticamente
     */
    _calcularRestando() {
        if (!this.data.gozo) {
            return;
        }
        
        const gozo = parseInt(this.data.gozo);
        if (isNaN(gozo)) {
            return;
        }
        
        // Se tem período selecionado, usar disponíveis dele
        if (this.selectedPeriodo) {
            const disponivel = this.selectedPeriodo.disponivel || this.selectedPeriodo.disponiveis || 90;
            this.data.restando = disponivel - gozo;
        } else if (this.isPeriodoPersonalizado && this.periodoDiasDisponiveis !== undefined) {
            // Período personalizado
            this.data.restando = this.periodoDiasDisponiveis - gozo;
        } else {
            // Assume 90 dias por padrão
            this.data.restando = 90 - gozo;
        }
        
        // Atualizar campo
        const restandoInput = document.getElementById('wizardRestando');
        if (restandoInput) {
            restandoInput.value = this.data.restando;
        }
        
        console.log('[WizardModal] Restando calculado:', this.data.restando);
    }

    /**
     * Calcula dias disponíveis no período personalizado
     */
    _calcularDisponiveisPeriodoPersonalizado() {
        if (!this.data.aquisitivo_inicio || !this.data.aquisitivo_fim) {
            return;
        }
        
        // Buscar licenças existentes neste período
        const allServidores = this.app.dataStateManager.getAllServidores();
        const servidor = allServidores.find(s => s.CPF === this.data.cpf);
        
        let diasUsados = 0;
        if (servidor && servidor.licencas) {
            diasUsados = servidor.licencas.filter(lic => 
                lic.AQUISITIVO_INICIO === this.data.aquisitivo_inicio &&
                lic.AQUISITIVO_FIM === this.data.aquisitivo_fim
            ).reduce((sum, lic) => sum + (parseInt(lic.GOZO) || 0), 0);
        }
        
        this.periodoDiasDisponiveis = 90 - diasUsados;
        
        console.log('[WizardModal] Período personalizado - dias disponíveis:', this.periodoDiasDisponiveis);
    }

    /**
     * Valida Step 2
     */
    _validateStep2() {
        const errors = [];
        let isValid = true;
        
        // Atualizar dados dos campos antes de validar
        const numero = document.getElementById('wizardNumero');
        const emissao = document.getElementById('wizardEmissao');
        const periodo = document.getElementById('wizardPeriodo');
        const aPartir = document.getElementById('wizardAPartir');
        const gozoInput = document.getElementById('wizardGozo');
        
        if (numero) this.data.numero = numero.value;
        if (emissao) this.data.emissao = emissao.value;
        if (aPartir) this.data.a_partir = aPartir.value;
        if (gozoInput) this.data.gozo = gozoInput.value;
        
        // Campos obrigatórios![1767708915977](image/WizardModal/1767708915977.png)![1767708917158](image/WizardModal/1767708917158.png)![1767708924631](image/WizardModal/1767708924631.png)![1767708933649](image/WizardModal/1767708933649.png)![1767708935709](image/WizardModal/1767708935709.png)
        if (!this.data.numero) {
            errors.push('Número do Processo');
            isValid = false;
        }
        
        if (!this.data.emissao) {
            errors.push('Data de Emissão');
            isValid = false;
        }
        
        // Validar período aquisitivo (ou selecionado ou personalizado com datas)
        console.log('[WizardModal] Validando período:', {
            selectedPeriodo: this.selectedPeriodo,
            isPeriodoPersonalizado: this.isPeriodoPersonalizado,
            aquisitivo_inicio: this.data.aquisitivo_inicio,
            aquisitivo_fim: this.data.aquisitivo_fim
        });
        
        if (!this.selectedPeriodo && !this.isPeriodoPersonalizado) {
            errors.push('Período Aquisitivo');
            isValid = false;
        }
        
        if (this.isPeriodoPersonalizado && (!this.data.aquisitivo_inicio || !this.data.aquisitivo_fim)) {
            errors.push('Período Aquisitivo Personalizado (início e fim)');
            isValid = false;
        }
        
        if (!this.data.a_partir) {
            errors.push('A Partir de');
            isValid = false;
        }
        
        if (!this.data.gozo) {
            errors.push('Dias de Gozo');
            isValid = false;
        }
        
        // Validar gozo múltiplo de 30
        const gozoValue = parseInt(this.data.gozo);
        if (!isNaN(gozoValue) && gozoValue % 30 !== 0) {
            errors.push('Dias de Gozo deve ser múltiplo de 30');
            isValid = false;
        }
        
        // Validar gozo não excede disponível
        const disponivel = this.selectedPeriodo ? (this.selectedPeriodo.disponivel || this.selectedPeriodo.disponiveis) : undefined;
        if (this.selectedPeriodo && !isNaN(gozoValue) && disponivel !== undefined && gozoValue > disponivel) {
            errors.push(`Dias de Gozo (${gozoValue}) excede disponível (${disponivel})`);
            isValid = false;
        }
        
        if (!isValid) {
            this._showNotification(`Erros: ${errors.join(', ')}`, 'error');
        }
        
        return isValid;
    }

    /**
     * Salva os dados
     */
    async _save() {
        console.log('[WizardModal] Salvando dados...', this.data);
        
        // Validar step 2 novamente
        if (!this._validateStep2()) {
            return;
        }
        
        try {
            // Preparar objeto de dados
            const licenseData = {
                NOME: this.data.nome,
                CPF: this.data.cpf,
                RG: this.data.rg,
                CARGO: this.data.cargo,
                LOTACAO: this.data.lotacao,
                UNIDADE: this.data.unidade,
                REF: this.data.ref,
                NUMERO: this.data.numero,
                EMISSAO: this.data.emissao,
                AQUISITIVO_INICIO: this.data.aquisitivo_inicio,
                AQUISITIVO_FIM: this.data.aquisitivo_fim,
                A_PARTIR: this.data.a_partir,
                GOZO: this.data.gozo,
                TERMINO: this.data.termino,
                RESTANDO: this.data.restando
            };
            
            // Chamar método apropriado do App
            if (this.mode === 'edit') {
                // TODO: Implementar edição
                await this.app.updateLicense(this.originalLicenseData, licenseData);
                this._showNotification('Licença atualizada com sucesso!', 'success');
            } else {
                // TODO: Implementar adição
                await this.app.addNewLicense(licenseData);
                this._showNotification('Licença adicionada com sucesso!', 'success');
            }
            
            // Fechar modal
            setTimeout(() => this.close(), 1500);
            
        } catch (error) {
            console.error('[WizardModal] Erro ao salvar:', error);
            this._showNotification('Erro ao salvar: ' + error.message, 'error');
        }
    }

    /**
     * Mostra notificação
     */
    _showNotification(message, type = 'info') {
        console.log(`[WizardModal] Notification [${type}]:`, message);
        // TODO: Implementar sistema de notificações visual
        if (type === 'error') {
            alert('❌ ' + message);
        } else if (type === 'success') {
            alert('✅ ' + message);
        } else if (type === 'warning') {
            alert('⚠️ ' + message);
        } else {
            alert('ℹ️ ' + message);
        }
    }

    /**
     * Formata data para exibição (DD/MM/YYYY)
     */
    _formatDate(isoDate) {
        if (!isoDate) return '';
        const date = new Date(isoDate + 'T00:00:00'); // Force local timezone
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Converte Date para ISO string (YYYY-MM-DD)
     */
    _dateToISO(date) {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.WizardModal = WizardModal;
}
