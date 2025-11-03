/**
 * FilterManager - Gerenciamento de filtros e pesquisa
 * Responsável por: Filtros de idade, urgência, cargo, pesquisa, período
 */

class FilterManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentFilters = {
            age: { min: 18, max: 70 },
            period: { type: 'yearly', start: 2025, end: 2028 },
            search: '',
            urgency: '',
            cargo: '',
            selectedData: null
        };
    }

    /**
     * Aplicar filtro de idade
     */
    applyAgeFilter() {
        const minAge = parseInt(document.getElementById('minAge').value);
        const maxAge = parseInt(document.getElementById('maxAge').value);
        
        this.currentFilters.age = { min: minAge, max: maxAge };
        this.applyAllFilters();
        this.updateActiveFilters();
    }

    /**
     * Gerenciar pesquisa
     */
    handleSearch(searchTerm) {
        this.currentFilters.search = searchTerm.toLowerCase();
        this.applyAllFilters();
        this.dashboard.uiManager.toggleClearSearchButton();
        this.updateActiveFilters();
    }

    /**
     * Limpar pesquisa
     */
    clearSearch() {
        document.getElementById('searchInput').value = '';
        this.currentFilters.search = '';
        this.applyAllFilters();
    }

    /**
     * Limpar todos os filtros
     */
    clearAllFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('minAge').value = 18;
        document.getElementById('maxAge').value = 70;
        document.getElementById('urgencyFilter').value = '';
        document.getElementById('cargoFilter').value = '';
        
        this.currentFilters = {
            age: { min: 18, max: 70 },
            period: this.currentFilters.period,
            search: '',
            urgency: '',
            cargo: '',
            selectedData: null
        };
        
        this.applyAllFilters();
        this.dashboard.uiManager.toggleClearSearchButton();
        this.updateActiveFilters();
    }

    /**
     * Aplicar filtros (modo geral)
     */
    applyFilters() {
        const urgencyFilter = document.getElementById('urgencyFilter').value;
        const cargoFilter = document.getElementById('cargoFilter').value;
        
        this.currentFilters.urgency = urgencyFilter;
        this.currentFilters.cargo = cargoFilter;
        
        this.applyAllFilters();
    }

    /**
     * Aplicar filtros de licença (modo licença-prêmio)
     */
    applyLicencaFilters() {
        const monthFilter = document.getElementById('monthFilter').value;
        const periodFilter = document.getElementById('periodFilter').value;
        
        this.currentFilters.month = monthFilter;
        this.currentFilters.periodType = periodFilter;
        
        this.applyAllFilters();
    }

    /**
     * Verificar se servidor corresponde ao mês
     */
    matchesMonth(servidor, targetMonth) {
        if (!servidor.licencas || servidor.licencas.length === 0) return false;
        
        const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const targetMonthIndex = monthNames.indexOf(targetMonth.toLowerCase());
        
        if (targetMonthIndex === -1) return false;
        
        return servidor.licencas.some(licenca => {
            const inicio = new Date(licenca.inicio);
            const fim = licenca.fim ? new Date(licenca.fim) : inicio;
            
            for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() === targetMonthIndex) {
                    return true;
                }
            }
            return false;
        });
    }

    /**
     * Verificar se servidor corresponde à pesquisa
     */
    matchesSearch(servidor, searchTerm) {
        if (!searchTerm) return true;
        
        const searchableFields = [
            servidor.nome,
            servidor.cpf,
            servidor.cargo,
            servidor.matricula
        ].filter(Boolean);
        
        return searchableFields.some(field => 
            field.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Aplicar todos os filtros
     */
    applyAllFilters() {
        const { age, search, urgency, cargo, month, periodType } = this.currentFilters;
        
        this.dashboard.filteredServidores = this.dashboard.allServidores.filter(servidor => {
            // Filtro de idade
            if (servidor.idade < age.min || servidor.idade > age.max) {
                return false;
            }
            
            // Filtro de pesquisa
            if (!this.matchesSearch(servidor, search)) {
                return false;
            }
            
            // Filtro de urgência
            if (urgency && servidor.nivelUrgencia !== urgency) {
                return false;
            }
            
            // Filtro de cargo
            if (cargo && servidor.cargo !== cargo) {
                return false;
            }
            
            // Filtro de mês (licença-prêmio)
            if (month && !this.matchesMonth(servidor, month)) {
                return false;
            }
            
            // Filtro de período (licença-prêmio)
            if (periodType) {
                const now = new Date();
                const hasMatchingPeriod = servidor.licencas && servidor.licencas.some(licenca => {
                    const inicio = new Date(licenca.inicio);
                    
                    if (periodType === 'past') {
                        return inicio < now;
                    } else if (periodType === 'current') {
                        const fim = licenca.fim ? new Date(licenca.fim) : inicio;
                        return inicio <= now && fim >= now;
                    } else if (periodType === 'future') {
                        return inicio > now;
                    }
                    return true;
                });
                
                if (!hasMatchingPeriod) return false;
            }
            
            return true;
        });
        
        this.dashboard.updateTable();
        this.dashboard.updateStats();
        this.dashboard.updateUrgencyChart();
        this.dashboard.updateChartHighlight();
    }

    /**
     * Filtrar por urgência (click no gráfico)
     */
    filterTableByUrgency(urgencyLevel, chartIndex) {
        if (this.currentFilters.urgency === urgencyLevel && this.dashboard.chartManager.selectedChartIndex === chartIndex) {
            this.clearUrgencyFilter();
        } else {
            this.currentFilters.urgency = urgencyLevel;
            this.dashboard.chartManager.selectedChartIndex = chartIndex;
            
            const urgencyFilter = document.getElementById('urgencyFilter');
            if (urgencyFilter) {
                urgencyFilter.value = urgencyLevel;
            }
            
            this.applyAllFilters();
            this.updateActiveFilters();
            this.dashboard.chartManager.highlightUrgency(urgencyLevel);
        }
    }

    /**
     * Limpar filtro de urgência
     */
    clearUrgencyFilter() {
        this.currentFilters.urgency = '';
        this.dashboard.chartManager.selectedChartIndex = -1;
        
        const urgencyFilter = document.getElementById('urgencyFilter');
        if (urgencyFilter) {
            urgencyFilter.value = '';
        }
        
        this.applyAllFilters();
        
        if (this.dashboard.chartManager.charts.urgency) {
            this.dashboard.chartManager.charts.urgency.setActiveElements([]);
            this.dashboard.chartManager.charts.urgency.update();
        }
    }

    /**
     * Filtrar por cargo (click no gráfico)
     */
    filterTableByCargo(cargo, chartIndex) {
        if (this.currentFilters.cargo === cargo && this.dashboard.chartManager.selectedChartIndex === chartIndex) {
            this.clearCargoFilter();
        } else {
            this.currentFilters.cargo = cargo;
            this.dashboard.chartManager.selectedChartIndex = chartIndex;
            
            const cargoFilter = document.getElementById('cargoFilter');
            if (cargoFilter) {
                cargoFilter.value = cargo;
            }
            
            this.applyAllFilters();
            this.updateActiveFilters();
            this.dashboard.chartManager.highlightCargo(cargo);
        }
    }

    /**
     * Limpar filtro de cargo
     */
    clearCargoFilter() {
        this.currentFilters.cargo = '';
        this.dashboard.chartManager.selectedChartIndex = -1;
        
        const cargoFilter = document.getElementById('cargoFilter');
        if (cargoFilter) {
            cargoFilter.value = '';
        }
        
        this.applyAllFilters();
        
        if (this.dashboard.chartManager.charts.cargo) {
            this.dashboard.chartManager.charts.cargo.setActiveElements([]);
            this.dashboard.chartManager.charts.cargo.update();
        }
    }

    /**
     * Filtrar por período (click na timeline)
     */
    filterByPeriod(period, label) {
        this.currentFilters.selectedData = { period, label };
        this.dashboard.showServidoresInPeriod(period, label);
    }

    /**
     * Adaptar filtros para tipo de tabela
     */
    adaptFiltersForTableType(isLicencaPremio) {
        const licencaFilters = document.querySelectorAll('.licenca-filters');
        const generalFilters = document.querySelectorAll('.general-filters');
        
        licencaFilters.forEach(el => {
            el.style.display = isLicencaPremio ? 'block' : 'none';
        });
        
        generalFilters.forEach(el => {
            el.style.display = isLicencaPremio ? 'none' : 'block';
        });
    }
    
    /**
     * Atualizar filtros ativos (chips de filtros aplicados)
     */
    updateActiveFilters() {
        const activeFiltersContainer = document.getElementById('activeFilters');
        if (!activeFiltersContainer) return;

        activeFiltersContainer.innerHTML = '';
        const filters = [];

        // Filtro de Pesquisa
        if (this.dashboard.currentFilters.search) {
            filters.push({
                type: 'search',
                label: `Busca: "${this.dashboard.currentFilters.search}"`,
                remove: () => this.clearSearch()
            });
        }

        // Filtro de Idade
        const minAge = parseInt(document.getElementById('minAge')?.value) || 18;
        const maxAge = parseInt(document.getElementById('maxAge')?.value) || 70;
        if (minAge !== 18 || maxAge !== 70) {
            filters.push({
                type: 'age',
                label: `Idade: ${minAge}-${maxAge}`,
                remove: () => {
                    if (document.getElementById('minAge')) document.getElementById('minAge').value = 18;
                    if (document.getElementById('maxAge')) document.getElementById('maxAge').value = 70;
                    this.applyAgeFilter();
                }
            });
        }

        // Filtro de Urgência
        if (this.dashboard.currentFilters.urgency) {
            filters.push({
                type: 'urgency',
                label: `Urgência: ${this.dashboard.currentFilters.urgency}`,
                remove: () => this.clearUrgencyFilter()
            });
        }

        // Filtro de Cargo
        if (this.dashboard.currentFilters.cargo) {
            filters.push({
                type: 'cargo',
                label: `Cargo: ${this.dashboard.currentFilters.cargo}`,
                remove: () => this.clearCargoFilter()
            });
        }

        // Criar elementos para cada filtro
        filters.forEach(filter => {
            const filterElement = document.createElement('span');
            filterElement.className = 'active-filter';
            filterElement.innerHTML = `
                ${filter.label}
                <span class="remove">×</span>
            `;

            filterElement.querySelector('.remove').addEventListener('click', (e) => {
                e.stopPropagation();
                filter.remove();
            });

            activeFiltersContainer.appendChild(filterElement);
        });
    }
}
