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
        // Data de emissão sempre é hoje
        const hoje = new Date();
        const anoHoje = hoje.getFullYear();
        const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
        const diaHoje = String(hoje.getDate()).padStart(2, '0');
        const dataEmissao = `${anoHoje}-${mesHoje}-${diaHoje}`;
        
        this.data = {
            nome: '',
            cpf: '',
            rg: '',
            cargo: '',
            lotacao: '',
            unidade: '',
            ref: '',
            numero: '',
            emissao: dataEmissao, // Sempre hoje
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
     * Sincroniza dados do Step 2 do DOM para this.data
     * IMPORTANTE: Só atualiza se o campo existir E tiver valor, para não sobrescrever dados já preenchidos
     */
    _syncDataFromDOM() {
        // Step 2 - Dados da licença
        const numero = document.getElementById('wizardNumero');
        const emissao = document.getElementById('wizardEmissao');
        const aPartir = document.getElementById('wizardAPartir');
        const gozoInput = document.getElementById('wizardGozo');
        const termino = document.getElementById('wizardTermino');
        const restando = document.getElementById('wizardRestando');

        if (numero?.value) this.data.numero = numero.value;
        if (emissao?.value) this.data.emissao = emissao.value;
        if (aPartir?.value) this.data.a_partir = aPartir.value;
        if (gozoInput?.value) this.data.gozo = gozoInput.value;
        if (termino?.value) this.data.termino = termino.value;
        if (restando?.value) this.data.restando = restando.value;

        // Período aquisitivo (apenas se personalizado E os campos existirem)
        if (this.isPeriodoPersonalizado) {
            const aquisitivoInicio = document.getElementById('wizardAquisitivoInicio');
            const aquisitivoFim = document.getElementById('wizardAquisitivoFim');

            if (aquisitivoInicio?.value) this.data.aquisitivo_inicio = aquisitivoInicio.value;
            if (aquisitivoFim?.value) this.data.aquisitivo_fim = aquisitivoFim.value;
        }
        // Se NÃO for personalizado, os valores já foram preenchidos ao selecionar da lista
        // e devem ser preservados (não precisam ser sincronizados do DOM)

        console.log('[WizardModal] _syncDataFromDOM concluído:', {
            numero: this.data.numero,
            emissao: this.data.emissao,
            aquisitivo_inicio: this.data.aquisitivo_inicio,
            aquisitivo_fim: this.data.aquisitivo_fim,
            isPeriodoPersonalizado: this.isPeriodoPersonalizado,
            selectedPeriodo: this.selectedPeriodo ? 'sim' : 'não'
        });
    }

    /**
     * Valida o step atual
     */
    _validateCurrentStep() {
        console.log('[WizardModal] Validando step:', this.currentStep);
        
        if (this.currentStep === 1) {
            return this._validateStep1();
        } else if (this.currentStep === 2) {
            return this._validateStep2();
        }
        return true;
    }

    /**
     * Verifica se um campo foi auto-preenchido (badge verde)
     * @param {string} fieldName - Nome do campo (nome, cpf, rg, etc)
     * @returns {boolean}
     */
    _isFieldAutofilled(fieldName) {
        // Só mostrar badge se:
        // 1. Servidor foi encontrado (this.servidorData existe)
        // 2. O campo tem valor preenchido
        // 3. O valor veio do servidor (não foi editado pelo usuário)
        if (!this.servidorData) return false;

        const value = this.data[fieldName];
        if (!value || value === '') return false;

        // Se o campo existe no servidorData original e não foi editado
        const originalValue = this.servidorData[fieldName];
        return originalValue !== undefined && originalValue !== null && originalValue !== '';
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
                    <div class="wizard-search-wrapper">
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
                        <div class="wizard-search-feedback" id="wizardSearchFeedback"></div>
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
                                ${this._isFieldAutofilled('nome') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardNome"
                                class="wizard-field-input ${this._isFieldAutofilled('nome') ? 'wizard-field-autofilled' : ''}"
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
                                ${this._isFieldAutofilled('cpf') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardCPF"
                                class="wizard-field-input ${this._isFieldAutofilled('cpf') ? 'wizard-field-autofilled' : ''}"
                                value="${this.data.cpf}"
                                ${readonlyAttr}
                                placeholder="000.000.000-00"
                                required
                            />
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                RG
                                ${this._isFieldAutofilled('rg') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardRG"
                                class="wizard-field-input ${this._isFieldAutofilled('rg') ? 'wizard-field-autofilled' : ''}"
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
                                ${this._isFieldAutofilled('cargo') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardCargo"
                                class="wizard-field-input ${this._isFieldAutofilled('cargo') ? 'wizard-field-autofilled' : ''}"
                                value="${this.data.cargo}"
                                required
                            />
                        </div>
                    </div>

                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Lotação *
                                ${this._isFieldAutofilled('lotacao') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardLotacao"
                                class="wizard-field-input ${this._isFieldAutofilled('lotacao') ? 'wizard-field-autofilled' : ''}"
                                value="${this.data.lotacao}"
                                required
                            />
                        </div>
                    </div>

                    <div class="wizard-field-group">
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Unidade
                                ${this._isFieldAutofilled('unidade') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardUnidade"
                                class="wizard-field-input ${this._isFieldAutofilled('unidade') ? 'wizard-field-autofilled' : ''}"
                                value="${this.data.unidade}"
                            />
                        </div>
                        <div class="wizard-field">
                            <label class="wizard-field-label">
                                Referência
                                ${this._isFieldAutofilled('ref') ? '<span class="wizard-field-auto-tag">(auto)</span>' : ''}
                            </label>
                            <input
                                type="text"
                                id="wizardRef"
                                class="wizard-field-input ${this._isFieldAutofilled('ref') ? 'wizard-field-autofilled' : ''}"
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
        const searchFeedback = document.getElementById('wizardSearchFeedback');

        if (searchInput) {
            // Real-time feedback while typing
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                const cpfClean = value.replace(/\D/g, '');

                if (!searchFeedback) return;

                // Limpar feedback anterior
                searchFeedback.className = 'wizard-search-feedback';
                searchFeedback.innerHTML = '';

                if (value.length === 0) {
                    // Sem texto
                    return;
                } else if (value.length < 3) {
                    // Muito curto
                    searchFeedback.className = 'wizard-search-feedback wizard-search-feedback-info';
                    searchFeedback.innerHTML = 'ℹ Digite pelo menos 3 caracteres para buscar';
                } else if (cpfClean.length >= 3 && cpfClean.length < 11) {
                    // CPF parcial
                    searchFeedback.className = 'wizard-search-feedback wizard-search-feedback-success';
                    searchFeedback.innerHTML = `✓ Buscar por CPF: ${cpfClean} • Pressione Enter`;
                } else if (cpfClean.length === 11) {
                    // CPF completo
                    searchFeedback.className = 'wizard-search-feedback wizard-search-feedback-success';
                    searchFeedback.innerHTML = '✓ CPF completo • Pressione Enter para buscar';
                } else {
                    // Busca por nome
                    searchFeedback.className = 'wizard-search-feedback wizard-search-feedback-success';
                    searchFeedback.innerHTML = `✓ Buscar por nome: "${value}" • Pressione Enter`;
                }
            });

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

                        // Validação em tempo real: CPF obrigatório
                        this._validateField(`wizard${field}`, field, (val) => {
                            const cpfClean = val.replace(/\D/g, '');
                            return cpfClean.length === 11;
                        }, 'CPF deve ter 11 dígitos');
                    }

                    // Auto-formatação de RG (3 formatos)
                    if (field === 'RG') {
                        value = value.replace(/\D/g, ''); // Remove não-numéricos

                        if (value.length === 6) {
                            // xxx.xxx
                            value = value.replace(/(\d{3})(\d{3})/, '$1.$2');
                        } else if (value.length === 7) {
                            // xxx.xxx-x
                            value = value.replace(/(\d{3})(\d{3})(\d{1})/, '$1.$2-$3');
                        } else if (value.length >= 8) {
                            // x.xxx.xxx-x (8 dígitos)
                            value = value.replace(/(\d{1})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
                        }

                        e.target.value = value;
                    }

                    // Validação em tempo real: Nome obrigatório
                    if (field === 'Nome') {
                        this._validateField(`wizard${field}`, field, (val) => val.trim() !== '', 'Nome é obrigatório');
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
        const searchBtn = document.getElementById('wizardSearchBtn');
        const query = searchInput.value.trim();

        if (!query) {
            console.warn('[WizardModal] Campo de busca vazio');
            this._showNotification('Digite um CPF ou Nome para buscar', 'warning', 3000);
            return;
        }

        console.log('[WizardModal] Buscando servidor:', query);

        // Mostrar loading no botão
        const originalBtnText = searchBtn.innerHTML;
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="wizard-spinner"></span> Buscando...';
        searchInput.disabled = true;
        
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
        
        let searchData = allServidores.length > 0 ? allServidores : this.app.dataStateManager.getFilteredServidores();
        console.log('[WizardModal] Buscando em', searchData.length, 'registros');

        // IMPORTANTE: Remover duplicados por CPF (problema comum em caches)
        const seen = new Set();
        searchData = searchData.filter(s => {
            const cpfRaw = s.cpf || s.CPF || '';
            const cpf = String(cpfRaw).replace(/\D/g, '');
            if (!cpf) return true; // Manter registros sem CPF
            if (seen.has(cpf)) {
                console.warn('[WizardModal] Duplicado removido:', s.nome || s.NOME, 'CPF:', cpf);
                return false;
            }
            seen.add(cpf);
            return true;
        });
        console.log('[WizardModal] Após remoção de duplicados:', searchData.length, 'registros');

        // Mostrar amostra dos dados para debug
        if (searchData.length > 0) {
            console.log('[WizardModal] Amostra do primeiro registro:', searchData[0]);
            console.log('[WizardModal] Chaves disponíveis:', Object.keys(searchData[0]));
        }

        // Normalizar query para busca por CPF
        const queryCPFClean = query.replace(/\D/g, '');
        console.log('[WizardModal] Query normalizada para CPF:', queryCPFClean);

        // Buscar por CPF ou nome - TODOS os resultados
        const foundResults = searchData.filter(s => {
            // Busca por CPF (remove todos caracteres não-numéricos)
            if (queryCPFClean.length >= 3) {
                const cpfValue = s.cpf || s.CPF || '';
                const cpfClean = String(cpfValue).replace(/\D/g, '');
                if (cpfClean && cpfClean.includes(queryCPFClean)) {
                    return true;
                }
            }

            // Busca por nome (case insensitive, partial match)
            const nome = (s.nome || s.NOME || '').toLowerCase().trim();
            const queryNome = query.toLowerCase().trim();
            if (queryNome.length >= 3) {
                if (nome && nome.includes(queryNome)) {
                    return true;
                }
            }

            return false;
        });

        console.log('[WizardModal] Resultados encontrados:', foundResults.length);

        // Simular delay para mostrar loading (em produção, isso seria uma chamada async)
        setTimeout(() => {
            if (foundResults.length === 0) {
                // Nenhum resultado
                console.log('[WizardModal] Nenhum servidor encontrado para:', query);
                this._showNotification('Nenhum servidor encontrado com esse CPF ou Nome', 'warning', 4000);

                // Restaurar botão e input
                searchBtn.disabled = false;
                searchBtn.innerHTML = originalBtnText;
                searchInput.disabled = false;
                searchInput.focus();
            } else if (foundResults.length === 1) {
                // Apenas 1 resultado - preencher automaticamente
                const found = foundResults[0];
                console.log('[WizardModal] Servidor encontrado:', found);
                this._fillServidorData(found);
                this._showStep(1);
                this._showNotification(`✓ Servidor encontrado: ${found.nome || found.NOME}`, 'success', 3000);
                console.log('[WizardModal] Campos atualizados com sucesso');
            } else {
                // Múltiplos resultados - mostrar lista para escolher
                console.log('[WizardModal] Múltiplos resultados encontrados:', foundResults.length);
                this._showMultipleResults(foundResults, originalBtnText);
            }
        }, 300); // Delay mínimo para mostrar loading
    }

    /**
     * Mostra lista de múltiplos resultados para o usuário escolher
     */
    _showMultipleResults(results, originalBtnText) {
        const searchBtn = document.getElementById('wizardSearchBtn');
        const searchInput = document.getElementById('wizardSearch');

        // Restaurar botão
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalBtnText;
        searchInput.disabled = false;

        // Criar lista de resultados
        const resultsList = results.map((servidor, index) => {
            const nome = servidor.nome || servidor.NOME || 'Sem nome';
            const cpf = servidor.cpf || servidor.CPF || '';
            const cargo = servidor.cargo || servidor.CARGO || '';
            const lotacao = servidor.lotacao || servidor.LOTACAO || servidor.lotação || servidor.LOTAÇÃO || '';

            return `
                <div class="wizard-search-result-item" data-index="${index}">
                    <div class="wizard-search-result-main">
                        <span class="wizard-search-result-name">${nome}</span>
                        ${cpf ? `<span class="wizard-search-result-cpf">CPF: ${cpf}</span>` : ''}
                    </div>
                    <div class="wizard-search-result-details">
                        ${cargo ? `<span class="wizard-search-result-detail">${cargo}</span>` : ''}
                        ${lotacao ? `<span class="wizard-search-result-detail">• ${lotacao}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Mostrar notificação com lista
        const notification = this.modal.querySelector('.wizard-notification');
        if (notification) notification.remove();

        const resultsBox = document.createElement('div');
        resultsBox.className = 'wizard-search-results';
        resultsBox.innerHTML = `
            <div class="wizard-search-results-header">
                <span class="wizard-search-results-icon">👥</span>
                <span class="wizard-search-results-title">Encontrados ${results.length} servidores</span>
                <button class="wizard-search-results-close" aria-label="Fechar">×</button>
            </div>
            <div class="wizard-search-results-subtitle">Clique em um para selecionar:</div>
            <div class="wizard-search-results-list">
                ${resultsList}
            </div>
        `;

        // Inserir no modal body (antes do divider)
        const divider = this.modal.querySelector('.wizard-divider');
        if (divider) {
            divider.parentElement.insertBefore(resultsBox, divider);
        } else {
            const modalBody = this.modal.querySelector('.wizard-body');
            modalBody.insertBefore(resultsBox, modalBody.firstChild.nextSibling);
        }

        // Animar entrada
        setTimeout(() => resultsBox.classList.add('wizard-search-results-show'), 10);

        // Event listeners
        const closeBtn = resultsBox.querySelector('.wizard-search-results-close');
        closeBtn.addEventListener('click', () => {
            resultsBox.classList.remove('wizard-search-results-show');
            setTimeout(() => resultsBox.remove(), 300);
        });

        // Click em cada resultado
        const items = resultsBox.querySelectorAll('.wizard-search-result-item');
        items.forEach((item, index) => {
            item.addEventListener('click', () => {
                const selected = results[index];
                console.log('[WizardModal] Servidor selecionado da lista:', selected);
                this._fillServidorData(selected);
                this._showStep(1);
                this._showNotification(`✓ Servidor selecionado: ${selected.nome || selected.NOME}`, 'success', 3000);

                // Remover lista
                resultsBox.classList.remove('wizard-search-results-show');
                setTimeout(() => resultsBox.remove(), 300);
            });
        });
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
        this.data.cpf = servidor.cpfFormatado || servidor.cpf || servidor.CPF || '';
        this.data.rg = servidor.rgFormatado || servidor.rg || servidor.RG || '';
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
        console.log('[WizardModal] Validando Step 1...');
        
        // Sincronizar APENAS dados do Step 1
        const nome = document.getElementById('wizardNome');
        const cpf = document.getElementById('wizardCPF');
        const rg = document.getElementById('wizardRG');
        const cargo = document.getElementById('wizardCargo');
        const lotacao = document.getElementById('wizardLotacao');
        const unidade = document.getElementById('wizardUnidade');
        const ref = document.getElementById('wizardRef');
        
        if (nome?.value) this.data.nome = nome.value;
        if (cpf?.value) this.data.cpf = cpf.value;
        if (rg?.value) this.data.rg = rg.value;
        if (cargo?.value) this.data.cargo = cargo.value;
        if (lotacao?.value) this.data.lotacao = lotacao.value;
        if (unidade?.value) this.data.unidade = unidade.value;
        if (ref?.value) this.data.ref = ref.value;
        
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
        console.log('[WizardModal] 🎨 _renderStep2() chamado - Estado ANTES de calcular períodos:', {
            'this.data.aquisitivo_inicio': this.data.aquisitivo_inicio,
            'this.data.aquisitivo_fim': this.data.aquisitivo_fim,
            'this.selectedPeriodo': this.selectedPeriodo ? 'sim' : 'não',
            'this.selectedPeriodoIndex': this.selectedPeriodoIndex
        });

        // Calcular períodos disponíveis
        this._calcularPeriodosAquisitivos();

        console.log('[WizardModal] 🎨 _renderStep2() - Estado DEPOIS de calcular períodos:', {
            'this.data.aquisitivo_inicio': this.data.aquisitivo_inicio,
            'this.data.aquisitivo_fim': this.data.aquisitivo_fim,
            'this.selectedPeriodo': this.selectedPeriodo ? 'sim' : 'não',
            'this.selectedPeriodoIndex': this.selectedPeriodoIndex
        });
        
        const periodosOptions = this.periodosDisponiveis.map((p, index) => {
            // Converter Date objects para strings ISO se necessário
            const inicioStr = p.inicio instanceof Date ? this._dateToISO(p.inicio) : p.inicio;
            const fimStr = p.fim instanceof Date ? this._dateToISO(p.fim) : p.fim;
            const disponivel = p.disponivel !== undefined ? p.disponivel : p.disponiveis || 0;
            const isSelected = this.selectedPeriodoIndex === index;

            // Formatar datas para exibição (DD/MM/YYYY)
            const inicioDate = p.inicio instanceof Date ? p.inicio : new Date(p.inicio + 'T00:00:00');
            const fimDate = p.fim instanceof Date ? p.fim : new Date(p.fim + 'T00:00:00');
            const inicioFormatted = this._formatDate(p.inicio instanceof Date ? this._dateToISO(p.inicio) : p.inicio);
            const fimFormatted = this._formatDate(p.fim instanceof Date ? this._dateToISO(p.fim) : p.fim);

            // Indicador visual de disponibilidade
            let statusIcon = '';
            if (disponivel >= 90) statusIcon = '✓✓✓'; // Muitos dias
            else if (disponivel >= 60) statusIcon = '✓✓'; // Bom
            else if (disponivel >= 30) statusIcon = '✓'; // Suficiente
            else if (disponivel > 0) statusIcon = '⚠'; // Poucos dias
            else statusIcon = '✕'; // Sem dias

            return `
                <option value="${index}" ${isSelected ? 'selected' : ''}>
                    ${statusIcon} ${inicioFormatted} a ${fimFormatted} • ${disponivel} dias disponíveis
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
                        <label class="wizard-field-label">
                            Data de Emissão
                            <span class="wizard-field-calc-tag">(hoje)</span>
                        </label>
                        <input 
                            type="date" 
                            id="wizardEmissao" 
                            class="wizard-field-input calculated" 
                            value="${this.data.emissao}"
                            readonly
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
                    <div class="wizard-period-preview">
                        <div class="wizard-period-preview-header">
                            <span class="wizard-period-preview-icon">📋</span>
                            <span class="wizard-period-preview-title">Período Selecionado</span>
                        </div>
                        <div class="wizard-period-preview-content">
                            <div class="wizard-period-preview-row">
                                <span class="wizard-period-preview-label">Período:</span>
                                <span class="wizard-period-preview-value">${this._formatDate(this.data.aquisitivo_inicio)} a ${this._formatDate(this.data.aquisitivo_fim)}</span>
                            </div>
                            <div class="wizard-period-preview-row">
                                <span class="wizard-period-preview-label">Dias Disponíveis:</span>
                                <span class="wizard-period-preview-value wizard-period-preview-highlight">${this.selectedPeriodo.disponivel || this.selectedPeriodo.disponiveis || 0} dias</span>
                            </div>
                            <div class="wizard-period-preview-row">
                                <span class="wizard-period-preview-label">Pode usar:</span>
                                <span class="wizard-period-preview-value">${Math.floor((this.selectedPeriodo.disponivel || this.selectedPeriodo.disponiveis || 0) / 30)} licença(s) de 30 dias</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="wizard-subsection">
                    <h4 class="wizard-subsection-title">Datas da Licença</h4>
                    <p class="wizard-help-text">⚙️ Preencha Início + Gozo (Término é calculado automaticamente)</p>
                    
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
                                <span class="wizard-field-calc-tag">(calculado)</span>
                            </label>
                            <input 
                                type="date" 
                                id="wizardTermino" 
                                class="wizard-field-input calculated" 
                                value="${this.data.termino}"
                                readonly
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
     * Valida um campo individual e aplica feedback visual
     */
    _validateField(fieldId, fieldName, validator, errorMessage = null) {
        const input = document.getElementById(fieldId);
        if (!input) return true;

        const isValid = validator(input.value);

        // Remover classes e mensagens anteriores
        input.classList.remove('valid', 'invalid');

        // Remover mensagem de erro anterior se existir
        const existingError = input.parentElement.querySelector('.wizard-field-error');
        if (existingError) {
            existingError.remove();
        }

        // Adicionar classe apropriada
        if (input.value.trim() !== '') {
            input.classList.add(isValid ? 'valid' : 'invalid');

            // Adicionar mensagem de erro se campo inválido
            if (!isValid && errorMessage) {
                const errorEl = document.createElement('div');
                errorEl.className = 'wizard-field-error';
                errorEl.textContent = errorMessage;
                input.parentElement.appendChild(errorEl);
            }
        }

        return isValid;
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
                // Validação em tempo real: campo obrigatório
                this._validateField('wizardNumero', 'Número do Processo', (val) => val.trim() !== '', 'Número do Processo é obrigatório');
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

                console.log('[WizardModal] 🔄 Evento change do select período disparado! Valor:', value, {
                    'this.data.aquisitivo_inicio (ANTES)': this.data.aquisitivo_inicio,
                    'this.data.aquisitivo_fim (ANTES)': this.data.aquisitivo_fim,
                    'this.selectedPeriodoIndex (ANTES)': this.selectedPeriodoIndex
                });

                // Validação em tempo real: campo obrigatório
                this._validateField('wizardPeriodo', 'Período Aquisitivo', (val) => val !== '');

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

                        console.log('[WizardModal] ✅ Período selecionado e dados preenchidos:', {
                            index,
                            periodo: this.selectedPeriodo,
                            'this.data.aquisitivo_inicio': this.data.aquisitivo_inicio,
                            'this.data.aquisitivo_fim': this.data.aquisitivo_fim,
                            'tipo inicio': typeof this.data.aquisitivo_inicio,
                            'tipo fim': typeof this.data.aquisitivo_fim
                        });

                        // Re-renderizar para mostrar info box
                        // IMPORTANTE: Não perdemos os dados ao re-renderizar porque eles estão em this.data
                        this._showStep(2);

                        console.log('[WizardModal] 🔍 Após re-renderizar Step 2, verificando this.data:', {
                            'this.data.aquisitivo_inicio': this.data.aquisitivo_inicio,
                            'this.data.aquisitivo_fim': this.data.aquisitivo_fim
                        });
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
                // Validação em tempo real: campo obrigatório quando personalizado
                this._validateField('wizardAquisitivoInicio', 'Início do Período', (val) => val !== '');
            });
        }

        if (aquisitivoFim) {
            aquisitivoFim.addEventListener('change', (e) => {
                this.data.aquisitivo_fim = e.target.value;
                this._calcularDisponiveisPeriodoPersonalizado();
                // Validação em tempo real: campo obrigatório quando personalizado
                this._validateField('wizardAquisitivoFim', 'Fim do Período', (val) => val !== '');
            });
        }

        if (aPartir) {
            aPartir.addEventListener('change', (e) => {
                console.log('[WizardModal] 📅 Campo "A Partir de" mudou:', e.target.value, {
                    'this.data.aquisitivo_inicio (ANTES)': this.data.aquisitivo_inicio,
                    'this.data.aquisitivo_fim (ANTES)': this.data.aquisitivo_fim
                });

                this.data.a_partir = e.target.value;

                // Validação em tempo real: campo obrigatório
                this._validateField('wizardAPartir', 'A Partir de', (val) => val !== '');

                // Se gozo está preenchido, calcular término
                if (gozo && gozo.value) {
                    this._calcularTermino();
                }

                this._calcularRestando();

                console.log('[WizardModal] 📅 Após processar "A Partir de":', {
                    'this.data.aquisitivo_inicio (DEPOIS)': this.data.aquisitivo_inicio,
                    'this.data.aquisitivo_fim (DEPOIS)': this.data.aquisitivo_fim
                });
            });
        }

        if (gozo) {
            gozo.addEventListener('change', (e) => {
                this.data.gozo = e.target.value;

                // Validação em tempo real: múltiplo de 30 e não exceder disponível
                const gozoValue = parseInt(e.target.value);
                const disponivel = this.selectedPeriodo ? (this.selectedPeriodo.disponivel || this.selectedPeriodo.disponiveis) : undefined;

                let errorMsg = null;
                const isValid = this._validateField('wizardGozo', 'Dias de Gozo', (val) => {
                    const value = parseInt(val);
                    if (isNaN(value)) {
                        errorMsg = 'Dias de Gozo é obrigatório';
                        return false;
                    }

                    // Deve ser múltiplo de 30
                    if (value % 30 !== 0) {
                        errorMsg = 'Dias de Gozo deve ser múltiplo de 30';
                        return false;
                    }

                    // Não exceder disponível (se tiver)
                    if (disponivel !== undefined && value > disponivel) {
                        errorMsg = `Dias de Gozo (${value}) excede disponível (${disponivel})`;
                        return false;
                    }

                    return true;
                }, errorMsg);

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
        console.log('[WizardModal] 🔄 _calcularPeriodosAquisitivos() chamado!');
        console.trace('[WizardModal] Stack trace:');
        console.log('[WizardModal] Estado antes de resetar periodosDisponiveis:', {
            'this.data.aquisitivo_inicio': this.data.aquisitivo_inicio,
            'this.data.aquisitivo_fim': this.data.aquisitivo_fim,
            'this.selectedPeriodo': this.selectedPeriodo ? 'sim' : 'não',
            'this.selectedPeriodoIndex': this.selectedPeriodoIndex
        });

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
        console.log('[WizardModal] Validando Step 2...');
        console.log('[WizardModal] Dados atuais (SEM sync):', {
            numero: this.data.numero,
            emissao: this.data.emissao,
            aquisitivo_inicio: this.data.aquisitivo_inicio,
            aquisitivo_fim: this.data.aquisitivo_fim,
            a_partir: this.data.a_partir,
            gozo: this.data.gozo,
            isPeriodoPersonalizado: this.isPeriodoPersonalizado
        });
        
        const errors = [];
        let isValid = true;
        
        // Campos obrigatórios![1767708915977](image/WizardModal/1767708915977.png)![1767708917158](image/WizardModal/1767708917158.png)![1767708924631](image/WizardModal/1767708924631.png)![1767708933649](image/WizardModal/1767708933649.png)![1767708935709](image/WizardModal/1767708935709.png)
        if (!this.data.numero) {
            errors.push('Número do Processo');
            isValid = false;
        }
        
        if (!this.data.emissao) {
            errors.push('Data de Emissão');
            isValid = false;
        }
        
        // Validar período aquisitivo (apenas verificar se tem datas preenchidas)
        const hasAquisitivoInicio = this.data.aquisitivo_inicio && this.data.aquisitivo_inicio.trim && this.data.aquisitivo_inicio.trim() !== '';
        const hasAquisitivoFim = this.data.aquisitivo_fim && this.data.aquisitivo_fim.trim && this.data.aquisitivo_fim.trim() !== '';
        
        console.log('[WizardModal] Validando período aquisitivo:', {
            aquisitivo_inicio: this.data.aquisitivo_inicio,
            aquisitivo_fim: this.data.aquisitivo_fim,
            hasAquisitivoInicio,
            hasAquisitivoFim,
            tipo_inicio: typeof this.data.aquisitivo_inicio,
            tipo_fim: typeof this.data.aquisitivo_fim
        });
        
        if (!hasAquisitivoInicio || !hasAquisitivoFim) {
            errors.push('Período Aquisitivo');
            isValid = false;
            console.error('[WizardModal] ❌ Período aquisitivo inválido!');
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
            this._showNotification(`❌ Erros no Step 2: ${errors.join(', ')}`, 'error');
            console.error('[WizardModal] Validação Step 2 falhou:', errors);
        }
        
        return isValid;
    }

    /**
     * Salva os dados
     */
    async _save() {
        // Prevenir execução dupla (bug de event listener duplicado)
        if (this._isSaving) {
            console.log('[WizardModal] ⚠️ _save() já está em execução, ignorando chamada duplicada');
            return;
        }
        this._isSaving = true;

        try {
            console.log('[WizardModal] 💾 Iniciando _save()...');
            console.log('[WizardModal] 🔍 ANTES do sync - this.data:', {
                aquisitivo_inicio: this.data.aquisitivo_inicio,
                aquisitivo_fim: this.data.aquisitivo_fim,
                isPeriodoPersonalizado: this.isPeriodoPersonalizado,
                selectedPeriodo: this.selectedPeriodo ? 'sim' : 'não',
                selectedPeriodoIndex: this.selectedPeriodoIndex
            });

            // Mostrar loading no botão Salvar
            const saveBtn = this.modal.querySelector('.wizard-button-save');
            const originalBtnText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="wizard-spinner"></span> Salvando...';

            // WORKAROUND: Se temos selectedPeriodo mas os valores estão vazios, restaurá-los
            if (this.selectedPeriodo && this.selectedPeriodoIndex !== null && !this.data.aquisitivo_inicio) {
                console.log('[WizardModal] 🔧 WORKAROUND: Restaurando valores do período selecionado');
                const inicio = this.selectedPeriodo.inicio;
                const fim = this.selectedPeriodo.fim;
                this.data.aquisitivo_inicio = inicio instanceof Date ? this._dateToISO(inicio) : inicio;
                this.data.aquisitivo_fim = fim instanceof Date ? this._dateToISO(fim) : fim;
                console.log('[WizardModal] ✅ Valores restaurados:', {
                    aquisitivo_inicio: this.data.aquisitivo_inicio,
                    aquisitivo_fim: this.data.aquisitivo_fim
                });
            }

            // IMPORTANTE: Sincronizar dados do DOM antes de validar
            this._syncDataFromDOM();

            console.log('[WizardModal] 🔍 DEPOIS do sync - this.data:', {
                aquisitivo_inicio: this.data.aquisitivo_inicio,
                aquisitivo_fim: this.data.aquisitivo_fim
            });

            // Validar step 2 novamente
            if (!this._validateStep2()) {
                this._isSaving = false;
                // Restaurar botão
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnText;
                return;
            }
        } catch (error) {
            this._isSaving = false;
            // Restaurar botão
            const saveBtn = this.modal.querySelector('.wizard-button-save');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnText;
            }
            throw error;
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
            this._isSaving = false;
        } finally {
            // Garantir que a flag seja resetada em qualquer caso
            this._isSaving = false;
        }
    }

    /**
     * Mostra notificação inline no modal
     * @param {string} message - Mensagem a exibir
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duração em ms (0 = permanente)
     */
    _showNotification(message, type = 'info', duration = 5000) {
        console.log(`[WizardModal] Notification [${type}]:`, message);

        // Remover notificações antigas
        const oldNotifications = this.modal.querySelectorAll('.wizard-notification');
        oldNotifications.forEach(n => n.remove());

        // Ícones por tipo
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `wizard-notification wizard-notification-${type}`;
        notification.innerHTML = `
            <span class="wizard-notification-icon">${icons[type] || 'ℹ'}</span>
            <span class="wizard-notification-message">${message}</span>
            <button class="wizard-notification-close" aria-label="Fechar">×</button>
        `;

        // Inserir no topo do modal body
        const modalBody = this.modal.querySelector('.wizard-body');
        modalBody.insertBefore(notification, modalBody.firstChild);

        // Animar entrada
        setTimeout(() => notification.classList.add('wizard-notification-show'), 10);

        // Botão fechar
        const closeBtn = notification.querySelector('.wizard-notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('wizard-notification-show');
            setTimeout(() => notification.remove(), 300);
        });

        // Auto-remover após duração (se não for 0)
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('wizard-notification-show');
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
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
