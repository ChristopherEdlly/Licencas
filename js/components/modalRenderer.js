/**
 * Modal Renderer - Renderização inteligente de modais
 * Responsável por criar UIs limpas e elegantes para visualização de dados
 */

class ModalRenderer {
    constructor() {
        this.escapeHtml = this.escapeHtml.bind(this);
    }

    /**
     * Renderiza registros da planilha de forma inteligente
     * Mescla campos iguais e destaca diferenças lado a lado
     */
    renderRegistrosPlanilha(servidor) {
        if (!servidor.todosOsDadosOriginais || servidor.todosOsDadosOriginais.length === 0) {
            return '<div class="no-data">Nenhum registro encontrado</div>';
        }

        // Processar todas as linhas
        const linhas = servidor.todosOsDadosOriginais.map(dados => {
            const linha = {};
            Object.entries(dados).forEach(([key, value]) => {
                const keyUpper = key.toUpperCase();
                if (!keyUpper.includes('SERVIDOR') && 
                    !keyUpper.includes('NOME') &&
                    value && value !== '' && value !== 'undefined' && value !== 'null') {
                    linha[key] = value;
                }
            });
            return linha;
        }).filter(linha => Object.keys(linha).length > 0);

        if (linhas.length === 0) {
            return '<div class="no-data">Nenhum dado disponível</div>';
        }

        // Caso de apenas 1 registro - UI simplificada
        if (linhas.length === 1) {
            return this.renderSingleRecord(linhas[0]);
        }

        // Múltiplos registros - UI mesclada lado a lado
        return this.renderMergedRecords(linhas);
    }

    /**
     * Renderiza um único registro (formato tradicional)
     */
    renderSingleRecord(linha) {
        let html = '<div class="record-single">';
        
        Object.entries(linha).forEach(([key, value]) => {
            html += `
                <div class="record-row">
                    <span class="record-label">${this.escapeHtml(key)}</span>
                    <span class="record-value">${this.escapeHtml(String(value))}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Renderiza múltiplos registros lado a lado (SUPER UX)
     * Campos iguais: 1 linha só
     * Campos diferentes: lado a lado com indicador
     */
    renderMergedRecords(linhas) {
        const numRegistros = linhas.length;
        
        // Detectar campos únicos vs múltiplos
        const camposInfo = this.analyzeFields(linhas);
        
        let html = '<div class="records-merged">';
        
        // Renderizar cada campo
        camposInfo.forEach(info => {
            if (info.isUnique) {
                // Campo igual em todos - uma linha só
                html += this.renderUniqueField(info);
            } else {
                // Campo diferente - linha com múltiplos valores
                html += this.renderMultipleField(info, numRegistros);
            }
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Analisa quais campos são únicos e quais variam
     */
    analyzeFields(linhas) {
        const allKeys = new Set();
        linhas.forEach(linha => {
            Object.keys(linha).forEach(key => allKeys.add(key));
        });

        const camposInfo = [];
        
        allKeys.forEach(key => {
            const valores = linhas.map(l => l[key]).filter(v => v);
            const valoresUnicos = [...new Set(valores.map(v => String(v)))];
            
            camposInfo.push({
                key,
                isUnique: valoresUnicos.length === 1,
                valores: linhas.map(l => l[key] || '—'),
                valorUnico: valoresUnicos.length === 1 ? valores[0] : null
            });
        });

        // Ordenar: únicos primeiro, depois variáveis
        return camposInfo.sort((a, b) => {
            if (a.isUnique === b.isUnique) return 0;
            return a.isUnique ? -1 : 1;
        });
    }

    /**
     * Renderiza campo único (igual em todos os registros)
     */
    renderUniqueField(info) {
        return `
            <div class="record-row record-row-unique">
                <span class="record-label">${this.escapeHtml(info.key)}</span>
                <span class="record-value">${this.escapeHtml(String(info.valorUnico))}</span>
            </div>
        `;
    }

    /**
     * Renderiza campo múltiplo (diferente entre registros)
     * Layout lado a lado com indicadores
     */
    renderMultipleField(info, numRegistros) {
        const labelNormalizado = this.normalizeLabel(info.key);
        const icone = this.getFieldIcon(info.key);
        
        let html = `
            <div class="record-row record-row-multiple">
                <div class="record-label-multiple">
                    <span class="record-icon">${icone}</span>
                    <span>${this.escapeHtml(labelNormalizado)}</span>
                </div>
                <div class="record-values-grid" style="--num-registros: ${numRegistros}">
        `;
        
        info.valores.forEach((valor, idx) => {
            const isHighlight = this.shouldHighlight(info.key);
            html += `
                <div class="record-value-item ${isHighlight ? 'highlight' : ''}">
                    <span class="record-number">${idx + 1}</span>
                    <span class="record-value">${this.escapeHtml(String(valor))}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Normaliza labels de campos
     */
    normalizeLabel(key) {
        const normalizations = {
            'INICIO DE LICENÇA PREMIO': 'Início',
            'INICIO DE LICENCA PREMIO': 'Início',
            'INICIO': 'Início',
            'FINAL DE LICENÇA PREMIO': 'Final',
            'FINAL DE LICENCA PREMIO': 'Final',
            'FINAL': 'Final',
            'MESES': 'Meses',
            'QTD MESES': 'Meses',
            'QUANTIDADE': 'Quantidade'
        };
        
        return normalizations[key.toUpperCase()] || key;
    }

    /**
     * Retorna ícone apropriado para cada tipo de campo
     */
    getFieldIcon(key) {
        const keyUpper = key.toUpperCase();
        
        if (keyUpper.includes('INICIO')) return '🟢';
        if (keyUpper.includes('FINAL') || keyUpper.includes('FIM')) return '🔴';
        if (keyUpper.includes('MESES') || keyUpper.includes('QUANTIDADE')) return '📊';
        if (keyUpper.includes('LOTACAO') || keyUpper.includes('LOTAÇÃO')) return '🏢';
        if (keyUpper.includes('CARGO')) return '👤';
        
        return '📌';
    }

    /**
     * Determina se o campo deve ter destaque visual
     */
    shouldHighlight(key) {
        const keyUpper = key.toUpperCase();
        return keyUpper.includes('INICIO') || 
               keyUpper.includes('FINAL') || 
               keyUpper.includes('MESES');
    }

    /**
     * Escape HTML para prevenir XSS
     */
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Exportar instância global
window.ModalRenderer = ModalRenderer;
