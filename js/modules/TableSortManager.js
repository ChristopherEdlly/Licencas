/**
 * TableSortManager.js
 * Gerencia ordenação de tabelas com suporte a múltiplos tipos de dados
 * Salva preferências no localStorage e renderiza indicadores visuais
 */

class TableSortManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentColumn = null;
        this.currentDirection = 'asc';
        this.storageKey = 'tableSortPreference';

        // Mapeamento de colunas para chaves de dados
        this.columnMapping = {
            'nome': 'nome',
            'idade': 'idade',
            'lotacao': 'lotacao',
            'proximaLicenca': 'proximaLicencaInicio',
            'urgencia': 'urgencia'
        };

        // Ordem de prioridade para urgências
        this.urgencyOrder = {
            'critical': 1,
            'high': 2,
            'moderate': 3,
            'low': 4,
            'none': 5
        };

        this.loadPreferences();
    }

    /**
     * Carrega preferências de ordenação do localStorage
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const pref = JSON.parse(saved);
                this.currentColumn = pref.column;
                this.currentDirection = pref.direction;
            }
        } catch (e) {
            console.warn('Erro ao carregar preferências de ordenação:', e);
        }
    }

    /**
     * Salva preferências de ordenação no localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                column: this.currentColumn,
                direction: this.currentDirection
            }));
        } catch (e) {
            console.warn('Erro ao salvar preferências de ordenação:', e);
        }
    }

    /**
     * Aplica ordenação aos dados
     * @param {Array} data - Array de servidores
     * @returns {Array} - Array ordenado
     */
    sortData(data) {
        if (!this.currentColumn || !data || data.length === 0) {
            return data;
        }

        const column = this.columnMapping[this.currentColumn];
        if (!column) return data;

        const sorted = [...data].sort((a, b) => {
            return this.compareValues(a, b, column);
        });

        return this.currentDirection === 'desc' ? sorted.reverse() : sorted;
    }

    /**
     * Compara dois valores baseado no tipo de coluna
     * @param {Object} a - Primeiro servidor
     * @param {Object} b - Segundo servidor
     * @param {string} column - Nome da coluna
     * @returns {number} - Resultado da comparação (-1, 0, 1)
     */
    compareValues(a, b, column) {
        let aVal = a[column];
        let bVal = b[column];

        // Tratamento especial para datas
        if (column === 'proximaLicencaInicio') {
            aVal = aVal ? new Date(aVal) : new Date(9999, 11, 31);
            bVal = bVal ? new Date(bVal) : new Date(9999, 11, 31);
            return aVal - bVal;
        }

        // Tratamento especial para urgência
        if (column === 'urgencia') {
            const aOrder = this.urgencyOrder[aVal] || 999;
            const bOrder = this.urgencyOrder[bVal] || 999;
            return aOrder - bOrder;
        }

        // Tratamento especial para idade
        if (column === 'idade') {
            const aNum = parseFloat(aVal) || 0;
            const bNum = parseFloat(bVal) || 0;
            return aNum - bNum;
        }

        // Tratamento para strings (com ordenação natural)
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return this.naturalCompare(aVal, bVal);
        }

        // Valores nulos/undefined vão para o final
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Comparação padrão
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
    }

    /**
     * Comparação natural de strings (trata números corretamente)
     * Ex: "João 2" vem antes de "João 10"
     */
    naturalCompare(a, b) {
        const ax = [];
        const bx = [];

        a.replace(/(\d+)|(\D+)/g, (_, num, str) => {
            ax.push([num || Infinity, str || '']);
        });
        b.replace(/(\d+)|(\D+)/g, (_, num, str) => {
            bx.push([num || Infinity, str || '']);
        });

        while (ax.length && bx.length) {
            const an = ax.shift();
            const bn = bx.shift();
            const nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
            if (nn) return nn;
        }

        return ax.length - bx.length;
    }

    /**
     * Alterna ordenação de uma coluna
     * @param {string} column - Nome da coluna
     */
    toggleSort(column) {
        if (this.currentColumn === column) {
            // Mesma coluna: alterna direção
            this.currentDirection = this.currentDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Nova coluna: começa com ascendente
            this.currentColumn = column;
            this.currentDirection = 'asc';
        }

        this.savePreferences();
        this.updateSortIcons();

        // Aplica ordenação aos dados filtrados e atualiza tabela
        this.dashboard.filteredServidores = this.sortData(this.dashboard.filteredServidores);
        this.dashboard.updateTable();
    }

    /**
     * Atualiza os ícones visuais de ordenação nos headers
     */
    updateSortIcons() {
        // Remove todos os indicadores existentes
        document.querySelectorAll('.table-header-sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc', 'sort-active');
        });

        // Adiciona indicador na coluna ativa
        if (this.currentColumn) {
            const th = document.querySelector(`[data-sort-column="${this.currentColumn}"]`);
            if (th) {
                th.classList.add('sort-active');
                th.classList.add(`sort-${this.currentDirection}`);
                
                // Atualizar ícone baseado na direção
                const icon = th.querySelector('.sort-icon i');
                if (icon) {
                    icon.className = this.currentDirection === 'asc' 
                        ? 'bi bi-sort-alpha-down' 
                        : 'bi bi-sort-alpha-up';
                }
            }
        }
    }

    /**
     * Inicializa event listeners nos headers da tabela
     */
    initializeTableHeaders() {
        const table = document.getElementById('servidoresTable');
        if (!table) return;

        const thead = table.querySelector('thead tr');
        if (!thead) return;

        // Detectar tipo de tabela baseado nos headers
        const headers = Array.from(thead.children).map(th => th.textContent.trim().toLowerCase());
        const isLicencaPremio = headers.includes('saldo');

        // Configuração das colunas ordenáveis baseada no tipo de tabela
        let sortableColumns;
        
        if (isLicencaPremio) {
            // Formato licença prêmio: Nome, Cargo, Lotação, Próxima Licença, Saldo, Ações
            sortableColumns = [
                { index: 0, key: 'nome', label: 'Nome' },
                { index: 3, key: 'proximaLicenca', label: 'Próxima Licença' }
                // Cargo, Lotação, Saldo e Ações não são ordenáveis
            ];
        } else {
            // Formato original (índices podem variar com colunas opcionais)
            sortableColumns = [
                { index: 0, key: 'nome', label: 'Nome' }
            ];
            
            // Adicionar outras colunas baseado nos headers existentes
            headers.forEach((h, idx) => {
                if (h.includes('idade')) sortableColumns.push({ index: idx, key: 'idade', label: 'Idade' });
                if (h.includes('lotação')) sortableColumns.push({ index: idx, key: 'lotacao', label: 'Lotação' });
                if (h.includes('próxima licença')) sortableColumns.push({ index: idx, key: 'proximaLicenca', label: 'Próxima Licença' });
                if (h.includes('urgência')) sortableColumns.push({ index: idx, key: 'urgencia', label: 'Urgência' });
            });
        }

        sortableColumns.forEach(col => {
            const th = thead.children[col.index];
            if (th) {
                // Adiciona classe e atributo
                th.classList.add('table-header-sortable');
                th.setAttribute('data-sort-column', col.key);
                th.style.cursor = 'pointer';
                th.setAttribute('title', `Ordenar por ${col.label}`);

                // Adiciona ícone de ordenação
                if (!th.querySelector('.sort-icon')) {
                    const icon = document.createElement('span');
                    icon.className = 'sort-icon';
                    icon.innerHTML = '<i class="bi bi-arrow-down-up"></i>';
                    th.appendChild(icon);
                }

                // Event listener
                th.addEventListener('click', () => {
                    this.toggleSort(col.key);
                });
            }
        });

        // Aplica ícones iniciais se houver preferência salva
        this.updateSortIcons();
    }

    /**
     * Reseta ordenação para padrão
     */
    reset() {
        this.currentColumn = null;
        this.currentDirection = 'asc';
        this.savePreferences();
        this.updateSortIcons();
    }

    /**
     * Aplica ordenação salva aos dados atuais
     */
    applySavedSort() {
        if (this.currentColumn) {
            this.dashboard.filteredServidores = this.sortData(this.dashboard.filteredServidores);
            this.updateSortIcons();
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TableSortManager = TableSortManager;
}
