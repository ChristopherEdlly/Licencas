/**
 * Custom Date Picker Component
 * Inspirado em Material Design com suporte a temas
 */

class CustomDatePicker {
    constructor(inputId, options = {}) {
        this.inputId = inputId;
        this.input = document.getElementById(inputId);
        if (!this.input) {
            console.error(`Input ${inputId} não encontrado`);
            return;
        }

        this.type = options.type || 'month'; // 'month' ou 'year'
        this.onSelect = options.onSelect || (() => {});
        this.pickerElement = null;
        
        // Ler valores iniciais do input se existirem
        const currentValue = this.input.value;
        if (this.type === 'month' && currentValue) {
            const [year, month] = currentValue.split('-').map(Number);
            this.currentYear = year;
            this.currentMonth = month - 1;
            this.selectedYear = year;
            this.selectedMonth = month - 1;
        } else if (this.type === 'year' && currentValue) {
            const year = parseInt(currentValue);
            this.currentYear = year;
            this.selectedYear = year;
            this.selectedMonth = 0;
        } else {
            this.currentYear = new Date().getFullYear();
            this.currentMonth = new Date().getMonth();
            this.selectedYear = this.currentYear;
            this.selectedMonth = this.currentMonth;
        }
        
        this.init();
    }

    init() {
        // Converter input original em botão de trigger
        this.createTriggerButton();
        this.createPickerElement();
        this.attachEvents();
    }

    createTriggerButton() {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-datepicker-wrapper';
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'custom-datepicker-trigger';
        button.innerHTML = `
            <i class="bi bi-calendar3"></i>
            <span class="datepicker-value">${this.getDisplayValue()}</span>
            <i class="bi bi-chevron-down"></i>
        `;
        
        this.input.style.display = 'none';
        this.input.parentNode.insertBefore(wrapper, this.input);
        wrapper.appendChild(this.input);
        wrapper.appendChild(button);
        
        this.triggerButton = button;
        this.wrapper = wrapper;
    }

    createPickerElement() {
        const picker = document.createElement('div');
        picker.className = 'custom-datepicker-dropdown';
        picker.style.display = 'none';
        
        if (this.type === 'month') {
            picker.innerHTML = this.getMonthPickerHTML();
        } else {
            picker.innerHTML = this.getYearPickerHTML();
        }
        
        this.wrapper.appendChild(picker);
        this.pickerElement = picker;
    }

    getMonthPickerHTML() {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        // Determinar o título baseado no ID do input
        let titleText = 'Período';
        if (this.inputId.includes('Start')) {
            titleText = 'De';
        } else if (this.inputId.includes('End')) {
            titleText = 'Até';
        }
        
        return `
            <div class="datepicker-header">
                <button type="button" class="datepicker-nav" data-action="prev-year">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="datepicker-title" data-action="toggle-year">
                    <span class="datepicker-year">${titleText} ${this.currentYear}</span>
                </div>
                <button type="button" class="datepicker-nav" data-action="next-year">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
            <div class="datepicker-body">
                <div class="datepicker-months">
                    ${months.map((month, index) => `
                        <button type="button" 
                                class="datepicker-month ${index === this.selectedMonth && this.currentYear === this.selectedYear ? 'selected' : ''}"
                                data-month="${index}">
                            ${month}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getYearPickerHTML() {
        const startYear = Math.floor(this.currentYear / 10) * 10;
        const years = [];
        for (let i = startYear - 1; i < startYear + 11; i++) {
            years.push(i);
        }
        
        // Determinar o título baseado no ID do input
        let titleText = 'Período';
        if (this.inputId.includes('Start')) {
            titleText = 'De';
        } else if (this.inputId.includes('End')) {
            titleText = 'Até';
        }
        
        return `
            <div class="datepicker-header">
                <button type="button" class="datepicker-nav" data-action="prev-decade">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="datepicker-title">
                    <span class="datepicker-year-range">${titleText}: ${startYear} - ${startYear + 9}</span>
                </div>
                <button type="button" class="datepicker-nav" data-action="next-decade">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
            <div class="datepicker-body">
                <div class="datepicker-years">
                    ${years.map(year => `
                        <button type="button" 
                                class="datepicker-year-item ${year === this.selectedYear ? 'selected' : ''} ${year < startYear || year > startYear + 9 ? 'out-of-range' : ''}"
                                data-year="${year}">
                            ${year}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    attachEvents() {
        // Toggle dropdown
        this.triggerButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Click fora fecha
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });

        // Navegação e seleção
        this.pickerElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevenir que cliques internos fechem o picker
            
            const button = e.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            const month = button.dataset.month;
            const year = button.dataset.year;

            if (action === 'prev-year') {
                e.preventDefault();
                this.currentYear--;
                this.updatePicker();
            } else if (action === 'next-year') {
                e.preventDefault();
                this.currentYear++;
                this.updatePicker();
            } else if (action === 'prev-decade') {
                e.preventDefault();
                this.currentYear -= 10;
                this.updatePicker();
            } else if (action === 'next-decade') {
                e.preventDefault();
                this.currentYear += 10;
                this.updatePicker();
            } else if (month !== undefined) {
                this.selectMonth(parseInt(month));
            } else if (year !== undefined) {
                this.selectYear(parseInt(year));
            }
        });
    }

    selectMonth(month) {
        this.selectedMonth = month;
        this.selectedYear = this.currentYear;
        
        // Atualizar input original
        const value = `${this.selectedYear}-${String(month + 1).padStart(2, '0')}`;
        this.input.value = value;
        
        // Atualizar display
        this.updateTriggerButton();
        
        // Callback
        this.onSelect({ year: this.selectedYear, month: this.selectedMonth, value });
        
        // Fechar
        this.close();
    }

    selectYear(year) {
        this.selectedYear = year;
        
        // Atualizar input original
        this.input.value = year;
        
        // Atualizar display
        this.updateTriggerButton();
        
        // Callback
        this.onSelect({ year: this.selectedYear, value: year });
        
        // Fechar
        this.close();
    }

    updatePicker() {
        if (this.type === 'month') {
            this.pickerElement.innerHTML = this.getMonthPickerHTML();
        } else {
            this.pickerElement.innerHTML = this.getYearPickerHTML();
        }
    }

    updateTriggerButton() {
        const valueSpan = this.triggerButton.querySelector('.datepicker-value');
        valueSpan.textContent = this.getDisplayValue();
    }

    getDisplayValue() {
        if (this.type === 'month') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[this.selectedMonth]} ${this.selectedYear}`;
        } else {
            return this.selectedYear;
        }
    }

    toggle() {
        if (this.pickerElement.style.display === 'none') {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        // Fechar outros pickers
        document.querySelectorAll('.custom-datepicker-dropdown').forEach(el => {
            if (el !== this.pickerElement) el.style.display = 'none';
        });
        
        this.pickerElement.style.display = 'block';
        this.updatePicker();
    }

    close() {
        this.pickerElement.style.display = 'none';
    }

    destroy() {
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
            this.wrapper.remove();
            this.input.style.display = '';
        }
    }
}
