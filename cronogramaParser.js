/**
 * cronogramaParser.js
 * Conversão da lógica Power Query para JavaScript
 * Parser inteligente de cronogramas de texto livre para datas estruturadas
 */

class CronogramaParser {
    constructor() {
        this.monthNameToNum = {
            'janeiro': 1, 'jan': 1,
            'fevereiro': 2, 'fev': 2,
            'março': 3, 'marco': 3, 'mar': 3,
            'abril': 4, 'abr': 4,
            'maio': 5, 'mai': 5,
            'junho': 6, 'jun': 6,
            'julho': 7, 'jul': 7,
            'agosto': 8, 'ago': 8,
            'setembro': 9, 'set': 9,
            'outubro': 10, 'out': 10,
            'novembro': 11, 'nov': 11,
            'dezembro': 12, 'dez': 12
        };

        this.numWordToInt = {
            'uma': 1, 'um': 1, '1': 1,
            'duas': 2, 'dois': 2, '2': 2,
            'tres': 3, 'três': 3, '3': 3,
            'quatro': 4, '4': 4,
            'cinco': 5, '5': 5,
            'seis': 6, '6': 6,
            'sete': 7, '7': 7,
            'oito': 8, '8': 8,
            'nove': 9, '9': 9,
            'dez': 10, '10': 10,
            'onze': 11, '11': 11,
            'doze': 12, '12': 12
        };
    }

    // ================== UTILIDADES SEGURAS ==================
    safeText(v) {
        if (v === null || v === undefined) return "";
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return v.toString();
        if (v instanceof Date) return this.formatDate(v);
        return String(v);
    }

    textSafeContains(source, fragment) {
        const s = this.safeText(source);
        if (!fragment || fragment === "") return false;
        return s.includes(fragment);
    }

    textSafeAfter(source, delimiter, occurrence = null) {
        const s = this.safeText(source);
        if (!delimiter || delimiter === "" || !s.includes(delimiter)) return null;
        
        try {
            if (occurrence === null) {
                const index = s.indexOf(delimiter);
                return s.substring(index + delimiter.length);
            } else {
                // Para múltiplas ocorrências, usar a especificada
                let currentIndex = -1;
                for (let i = 0; i <= occurrence; i++) {
                    currentIndex = s.indexOf(delimiter, currentIndex + 1);
                    if (currentIndex === -1) return null;
                }
                return s.substring(currentIndex + delimiter.length);
            }
        } catch {
            return null;
        }
    }

    textSafeBefore(source, delimiter, occurrence = null) {
        const s = this.safeText(source);
        if (!delimiter || delimiter === "" || !s.includes(delimiter)) return null;
        
        try {
            if (occurrence === null) {
                const index = s.indexOf(delimiter);
                return s.substring(0, index);
            } else {
                let currentIndex = -1;
                for (let i = 0; i <= occurrence; i++) {
                    currentIndex = s.indexOf(delimiter, currentIndex + 1);
                    if (currentIndex === -1) return null;
                }
                return s.substring(0, currentIndex);
            }
        } catch {
            return null;
        }
    }

    // ================== HELPERS ==================
    removeDiacritics(s) {
        const st = this.safeText(s);
        const map = {
            'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
            'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
            'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
            'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
            'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
            'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
            'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
            'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
            'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
            'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
            'ç': 'c', 'Ç': 'C'
        };

        return st.split('').map(char => map[char] || char).join('');
    }

    normalizeText(s) {
        let t0 = this.safeText(s);
        let t1 = t0.toLowerCase();
        let t2 = t1.trim();
        let t3 = t2.replace(/–/g, '-').replace(/—/g, '-');
        let t4 = this.removeDiacritics(t3);
        let t5 = t4.replace(/\u00A0/g, ' '); // Non-breaking space
        let parts = t5.split(' ').filter(part => part !== '');
        return parts.join(' ');
    }

    toYear(y) {
        return y < 100 ? 2000 + y : y;
    }

    getMonthNameToNum(name) {
        if (!name) return null;
        const n1 = this.normalizeText(name.replace(/\./g, ''));
        return this.monthNameToNum[n1] || null;
    }

    getNumWordToInt(w) {
        const w0 = this.normalizeText((w || '').replace(/\./g, ''));
        return this.numWordToInt[w0] || 1;
    }

    formatDate(d) {
        if (!(d instanceof Date)) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isDigits(t) {
        const txt = this.safeText(t);
        return txt.length > 0 && /^\d+$/.test(txt);
    }

    extractNumbers(t) {
        const txt = this.safeText(t);
        const tokens = txt.split(/[ \-.,;()\[\]/]/);
        return tokens.map(token => {
            const num = parseFloat(token);
            return isNaN(num) ? null : num;
        }).filter(n => n !== null);
    }

    tryParseDayMonthYear(txt) {
        const s = this.safeText(txt).trim();
        const p = s.split('/');
        
        if (p.length === 3 && this.isDigits(p[0]) && this.isDigits(p[1]) && this.isDigits(p[2])) {
            try {
                const d = parseInt(p[0]);
                const m = parseInt(p[1]);
                const y = this.toYear(parseInt(p[2]));
                const dt = new Date(y, m - 1, d);
                // Verificar se a data é válida
                if (dt.getDate() === d && dt.getMonth() === m - 1 && dt.getFullYear() === y) {
                    return dt;
                }
            } catch {
                return null;
            }
        }
        return null;
    }

    tryParseMonthYear(txt) {
        const t = this.normalizeText(this.safeText(txt));
        
        if (t.includes('/')) {
            const sp = t.split('/');
            if (sp.length === 2) {
                const a = sp[0];
                const b = sp[1];
                
                if (this.isDigits(a) && this.isDigits(b)) {
                    try {
                        const m = parseInt(a);
                        const y = this.toYear(parseInt(b));
                        return new Date(y, m - 1, 1);
                    } catch {
                        return null;
                    }
                } else if (!this.isDigits(a) && this.isDigits(b)) {
                    const m = this.getMonthNameToNum(a);
                    if (m) {
                        try {
                            const y = this.toYear(parseInt(b));
                            return new Date(y, m - 1, 1);
                        } catch {
                            return null;
                        }
                    }
                }
            }
        } else if (t.includes(' de ')) {
            const sp = t.split(' de ');
            const m = this.getMonthNameToNum(sp[0]);
            const y = parseInt(sp[1]);
            if (m && !isNaN(y)) {
                try {
                    return new Date(this.toYear(y), m - 1, 1);
                } catch {
                    return null;
                }
            }
        }
        return null;
    }

    monthSpan(start, finish, limit) {
        const months = [];
        let current = new Date(start);
        let i = 0;
        
        while (current <= finish && i < limit * 2) {
            months.push(new Date(current));
            current.setMonth(current.getMonth() + 1);
            i++;
        }
        
        return months;
    }

    addDate(lst, d) {
        if (!d) return lst;
        const t = this.formatDate(d);
        return lst.includes(t) ? lst : [...lst, t];
    }

    // ================== PARSER PRINCIPAL ==================
    parseCronograma(cronograma, mesesLimit = 60) {
        const raw = this.safeText(cronograma);
        const rawNull = raw.trim() === "" ? null : raw;
        const rawSafe = rawNull || "";
        const s0 = rawNull ? this.normalizeText(rawNull) : null;
        const s1 = s0 ? ` ${s0} `.replace(/ ate /g, ' - ') : "";
        const ambiguous = s1.includes("um mes (") && s1.includes(") a cada ano");

        let result = [];

        // Datas dd/mm/yy explícitas para fallback de "de cada ano"
        const tokensEarly = s1.split(/[ ,.;:]/);
        const ddList = tokensEarly.map(token => this.tryParseDayMonthYear(token)).filter(d => d);
        const earliestExplicit = ddList.length > 0 ? ddList.reduce((min, d) => d < min ? d : min) : null;

        if (rawNull === null || ambiguous) return [];

        // ---------- A partir de ----------
        result = this.handleAPartir(result, s1, mesesLimit);

        // ---------- Listas / intervalos explícitos ----------
        result = this.handleLists(result, rawSafe, mesesLimit);

        // ---------- "de cada ano" ----------
        result = this.handleCadaAno(result, s1, mesesLimit, earliestExplicit);

        // ---------- "uma por ano" / "a cada ano" genérico ----------
        result = this.handleUmaPorAno(result, s1, mesesLimit);

        // ---------- "Inicio em ..." (sequência mensal) ----------
        result = this.handleInicioEm(result, s1, mesesLimit);

        // Datas explícitas dd/mm/aaaa dispersas
        const tokensAll = s1.split(/[ ,.;:]/);
        for (const tok of tokensAll) {
            const d = this.tryParseDayMonthYear(tok);
            result = this.addDate(result, d);
        }

        // Ordenar e remover duplicatas
        const ordered = [...new Set(result)].sort();

        // Limitar resultado
        const explicitCount = this.countExplicitMonthYear(rawSafe);
        const takeN = explicitCount > mesesLimit ? explicitCount : mesesLimit;
        const final = ordered.length > takeN ? ordered.slice(0, takeN) : ordered;

        return final;
    }

    handleAPartir(lst, s1, mesesLimit) {
        const hasA = this.textSafeContains(s1, "a partir de");
        if (!hasA) return lst;

        const after = this.textSafeAfter(s1, "a partir de ");
        const yearly = this.textSafeContains(s1, "a cada ano") ||
                      this.textSafeContains(s1, "por ano") ||
                      this.textSafeContains(s1, "uma por ano") ||
                      this.textSafeContains(s1, "1 mes a cada ano");

        // dd/mm/yyyy
        let ddmmyyyy = null;
        if (after && after.includes('/')) {
            const firstTok = after.split(' ')[0];
            ddmmyyyy = this.tryParseDayMonthYear(firstTok);
        }

        if (ddmmyyyy) {
            const base = ddmmyyyy;
            for (let i = 0; i < mesesLimit; i++) {
                const nextDate = yearly ? 
                    new Date(base.getFullYear() + i, base.getMonth(), base.getDate()) :
                    new Date(base.getFullYear(), base.getMonth() + i, base.getDate());
                lst = this.addDate(lst, nextDate);
            }
            return lst;
        }

        // mm/yyyy
        let mmyyyyT = null;
        if (after && after.includes('/')) {
            mmyyyyT = this.tryParseMonthYear(after.split(' ')[0]);
        }

        if (mmyyyyT) {
            const base = mmyyyyT;
            for (let i = 0; i < mesesLimit; i++) {
                const nextDate = yearly ?
                    new Date(base.getFullYear() + i, base.getMonth(), 1) :
                    new Date(base.getFullYear(), base.getMonth() + i, 1);
                lst = this.addDate(lst, nextDate);
            }
            return lst;
        }

        // mês de ano
        if (after) {
            const seg = after.split(',')[0];
            const monDe = this.tryParseMonthYear(seg);
            if (monDe) {
                const base = monDe;
                for (let i = 0; i < mesesLimit; i++) {
                    const nextDate = yearly ?
                        new Date(base.getFullYear() + i, base.getMonth(), 1) :
                        new Date(base.getFullYear(), base.getMonth() + i, 1);
                    lst = this.addDate(lst, nextDate);
                }
            }
        }

        return lst;
    }

    handleLists(lst, rawSafe, mesesLimit) {
        const normalized = rawSafe.replace(/\n/g, ';').replace(/ e /g, ';');
        const parts = normalized.split(';').map(p => p.trim()).filter(p => p);

        for (const p of parts) {
            const pn = this.normalizeText(p);
            const pn2 = ` ${pn} `.replace(/ ate /g, ' - ').trim();
            const hasParen = pn2.includes('(') && pn2.includes(')');
            
            let count = 1;
            let basePart = pn2;
            
            if (hasParen) {
                const parenContent = pn2.match(/\(([^)]*)\)/);
                if (parenContent) {
                    count = this.getNumWordToInt(parenContent[1]);
                    basePart = pn2.replace(/\([^)]*\)/, '').trim();
                }
            }

            // Intervalos com " - "
            if (basePart.includes(' - ')) {
                const parts = basePart.split(' - ');
                const a = parts[0].trim();
                const b = parts[1].trim();
                const sa = this.tryParseMonthYear(a);
                const sb = this.tryParseMonthYear(b);
                
                if (sa && sb) {
                    const seq = this.monthSpan(sa, sb, mesesLimit);
                    for (const d of seq) {
                        lst = this.addDate(lst, d);
                    }
                }
            } else {
                // Datas individuais
                const tokens = basePart.split(/[ ,.:]/).filter(t => t);
                for (const tok of tokens) {
                    const d = this.tryParseDayMonthYear(tok);
                    lst = this.addDate(lst, d);
                    if (tok.includes('/')) {
                        const md = this.tryParseMonthYear(tok);
                        lst = this.addDate(lst, md);
                    }
                }

                // Mês/ano do basePart completo
                const md = this.tryParseMonthYear(basePart);
                if (md) {
                    lst = this.addDate(lst, md);
                }

                // Sequência com parênteses
                if (hasParen && md) {
                    for (let i = 0; i < count; i++) {
                        const next = new Date(md.getFullYear(), md.getMonth() + i, md.getDate());
                        lst = this.addDate(lst, next);
                    }
                }
            }
        }

        return lst;
    }

    handleCadaAno(lst, s1, mesesLimit, earliestExplicit) {
        const hasCada = this.textSafeContains(s1, " de cada ano");
        if (!hasCada) return lst;

        const before = this.textSafeBefore(s1, " de cada ano");
        if (!before) return lst;

        const words = before.split(' ');
        const monName = words[words.length - 1];
        const mnum = this.getMonthNameToNum(monName);

        if (!mnum) return lst;

        let baseYear = null;
        if (this.textSafeContains(s1, "a partir de ")) {
            const aft = this.textSafeAfter(s1, "a partir de ");
            if (aft) {
                const nums = this.extractNumbers(aft);
                baseYear = nums.length > 0 ? nums[0] : null;
            }
        }

        const earliestPlus1 = earliestExplicit ? earliestExplicit.getFullYear() + 1 : null;
        const startY = baseYear || earliestPlus1;

        if (startY) {
            for (let i = 0; i < mesesLimit; i++) {
                const date = new Date(startY + i, mnum - 1, 1);
                lst = this.addDate(lst, date);
            }
        }

        return lst;
    }

    handleUmaPorAno(lst, s1, mesesLimit) {
        const cond = (this.textSafeContains(s1, "uma por ano") || this.textSafeContains(s1, "a cada ano")) 
                     && s1.includes('/');
        if (!cond) return lst;

        const tokens = s1.split(/[ ,.;:]/);
        const cand = tokens.filter(t => t.includes('/'));
        if (cand.length === 0) return lst;

        const pick = cand[0];
        const base = this.tryParseMonthYear(pick);
        if (!base) return lst;

        for (let i = 0; i < mesesLimit; i++) {
            const nextDate = new Date(base.getFullYear() + i, base.getMonth(), base.getDate());
            lst = this.addDate(lst, nextDate);
        }

        return lst;
    }

    handleInicioEm(lst, s1, mesesLimit) {
        const hasInicio = this.textSafeContains(s1, "inicio em ");
        if (!hasInicio) return lst;

        const after = this.textSafeAfter(s1, "inicio em ");
        if (!after) return lst;

        const tokensAfter = after.split(/[ ,.;:()]/);
        const firstToken = tokensAfter.find(t => t.includes('/'));
        if (!firstToken) return lst;

        const baseDMY = this.tryParseDayMonthYear(firstToken);
        const baseMY = baseDMY ? null : this.tryParseMonthYear(firstToken);
        const baseDate = baseDMY ? new Date(baseDMY.getFullYear(), baseDMY.getMonth(), 1) : baseMY;

        if (!baseDate) return lst;

        // Verificar quantos meses consecutivos
        const insideParen = after.match(/\(([^)]*)\)/);
        let qtdExplicit = null;
        if (insideParen) {
            const nums = this.extractNumbers(insideParen[1]);
            qtdExplicit = nums.length > 0 ? nums[0] : null;
        }

        const hasConsecutiv = after.includes("consecutiv");
        const totalSeq = qtdExplicit || (hasConsecutiv ? mesesLimit : null);
        const totalFinal = totalSeq ? Math.min(totalSeq, mesesLimit) : null;

        if (totalFinal) {
            for (let i = 0; i < totalFinal; i++) {
                const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
                lst = this.addDate(lst, nextDate);
            }
        } else {
            lst = this.addDate(lst, baseDate);
        }

        return lst;
    }

    countExplicitMonthYear(rawSafe) {
        const explicitNormalized = rawSafe.replace(/\n/g, ';').replace(/ e /g, ';');
        const explicitParts = explicitNormalized.split(';').map(p => p.trim()).filter(p => p);
        
        const explicitMYDates = [];
        for (const pp of explicitParts) {
            const pn = this.normalizeText(pp);
            const toks = pn.split(/[ ,.:]/).filter(t => t);
            
            for (const tok of toks) {
                if (tok.includes('/')) {
                    const md = this.tryParseMonthYear(tok);
                    if (md) explicitMYDates.push(md);
                }
            }
            
            const phraseDate = this.tryParseMonthYear(pn);
            if (phraseDate) explicitMYDates.push(phraseDate);
        }

        const explicitMYDistinct = [...new Set(explicitMYDates.map(d => this.formatDate(d)))];
        return explicitMYDistinct.length;
    }

    // ================== API PÚBLICA ==================
    parse(cronograma, mesesLimit = 60) {
        return this.parseCronograma(cronograma, mesesLimit);
    }

    parseToText(cronograma, mesesLimit = 60, delimiter = '; ') {
        const lst = this.parseCronograma(cronograma, mesesLimit);
        return lst.join(delimiter);
    }
}

// Instância global para uso na aplicação
window.cronogramaParser = new CronogramaParser();