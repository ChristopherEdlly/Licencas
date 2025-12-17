/**
 * Custom Date Picker Component
 * Inspirado em Material Design com suporte a temas
 */

class CustomDatePicker {
    constructor(inputId, options = {}) {
        this.inputId = inputId;
        this.input = document.getElementById(inputId);

        if (!this.input) {
            this.isValid = false;
            return;
        }

        this.isValid = true;
        this.type = options.type || 'month'; // 'month', 'year' ou 'date'
        this.onSelect = options.onSelect || (() => {});
        this.minDate = options.minDate || null; // Data mínima permitida (YYYY-MM-DD)
        this.maxDate = options.maxDate || null; // Data máxima permitida (YYYY-MM-DD)
        this.pickerElement = null;
        this.wrapper = null;
        this.triggerButton = null;
        this.hasValue = false;
        this.today = new Date();
        this.monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        this.monthNamesFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        this.weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        // Referência para listener global (permite remover ao destruir)
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        this.boundRepositionDropdown = this.positionDropdown.bind(this);

        // Ler valores iniciais do input se existirem
        const currentValue = this.input.value;

        if (this.type === 'month') {
            if (currentValue) {
                const [year, month] = currentValue.split('-').map(Number);
                this.currentYear = year;
                this.currentMonth = month - 1;
                this.selectedYear = year;
                this.selectedMonth = month - 1;
                this.hasValue = true;
            } else {
                this.currentYear = this.today.getFullYear();
                this.currentMonth = this.today.getMonth();
                this.selectedYear = this.currentYear;
                this.selectedMonth = this.currentMonth;
            }
        } else if (this.type === 'year') {
            if (currentValue) {
                const year = parseInt(currentValue, 10);
                this.currentYear = year;
                this.selectedYear = year;
                this.selectedMonth = 0;
                this.hasValue = true;
            } else {
                this.currentYear = this.today.getFullYear();
                this.selectedYear = this.currentYear;
                this.selectedMonth = 0;
            }
        } else if (this.type === 'date') {
            if (currentValue) {
                const date = new Date(currentValue + 'T00:00:00');
                this.currentYear = date.getFullYear();
                this.currentMonth = date.getMonth();
                this.selectedYear = date.getFullYear();
                this.selectedMonth = date.getMonth();
                this.selectedDay = date.getDate();
                this.hasValue = true;
            } else {
                this.currentYear = this.today.getFullYear();
                this.currentMonth = this.today.getMonth();
                this.selectedYear = null;
                this.selectedMonth = null;
                this.selectedDay = null;
            }
        }

        this.init();
    }

    init() {
        if (!this.isValid) {
            console.warn('[CustomDatePicker] Input inválido:', this.inputId);
            return;
        }

        console.log('[CustomDatePicker] Inicializando para:', this.inputId);

        // Converter input original em botão de trigger
        this.createTriggerButton();
        this.createPickerElement();

        // Aguardar um tick antes de anexar eventos para garantir que o DOM está pronto
        setTimeout(() => {
            this.attachEvents();
        }, 0);
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
        picker.dataset.pickerFor = this.inputId;

        if (this.type === 'month') {
            picker.innerHTML = this.getMonthPickerHTML();
        } else if (this.type === 'year') {
            picker.innerHTML = this.getYearPickerHTML();
        } else if (this.type === 'date') {
            picker.innerHTML = this.getDatePickerHTML();
        }

        document.body.appendChild(picker);
        this.pickerElement = picker;
    }

    getMonthPickerHTML() {
        const months = this.monthNamesShort;

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
                                class="datepicker-month ${this.isMonthSelected(index) ? 'selected' : ''}"
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

    getDatePickerHTML() {
        // Determinar o título baseado no ID do input
        let titleText = 'Selecione a Data';
        if (this.inputId.includes('Inicio') || this.inputId.includes('Start')) {
            titleText = 'Data Inicial';
        } else if (this.inputId.includes('Fim') || this.inputId.includes('End')) {
            titleText = 'Data Final';
        }

        const monthName = this.monthNamesFull[this.currentMonth];
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1).getDay();

        // Criar array com os dias
        let daysHTML = '';

        // Adicionar dias vazios no início (para alinhar com dia da semana)
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysHTML += '<div class="datepicker-day empty"></div>';
        }

        // Adicionar os dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = this.selectedYear === this.currentYear &&
                             this.selectedMonth === this.currentMonth &&
                             this.selectedDay === day;
            const isToday = this.today.getFullYear() === this.currentYear &&
                          this.today.getMonth() === this.currentMonth &&
                          this.today.getDate() === day;
            const isDisabled = this.isDayDisabled(this.currentYear, this.currentMonth, day);

            daysHTML += `
                <button type="button"
                        class="datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isDisabled ? 'disabled' : ''}"
                        data-day="${day}"
                        ${isDisabled ? 'disabled' : ''}>
                    ${day}
                </button>
            `;
        }

        return `
            <div class="datepicker-header">
                <button type="button" class="datepicker-nav" data-action="prev-month">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="datepicker-title" data-action="toggle-month">
                    <span class="datepicker-month-year">${monthName} ${this.currentYear}</span>
                </div>
                <button type="button" class="datepicker-nav" data-action="next-month">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
            <div class="datepicker-body">
                <div class="datepicker-weekdays">
                    ${this.weekdayNames.map(name => `<div class="datepicker-weekday">${name}</div>`).join('')}
                </div>
                <div class="datepicker-days">
                    ${daysHTML}
                </div>
            </div>
        `;
    }

    attachEvents() {
        if (!this.triggerButton) {
            return;
        }

        // Toggle dropdown
        this.triggerButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // Click fora fecha
        document.addEventListener('click', this.boundHandleDocumentClick);

        // Navegação e seleção
        this.pickerElement.addEventListener('click', (e) => {
            e.stopPropagation();

            const button = e.target.closest('button');
            if (!button) return;

            const action = button.dataset.action;
            const month = button.dataset.month;
            const year = button.dataset.year;
            const day = button.dataset.day;

            if (action === 'prev-year') {
                e.preventDefault();
                this.currentYear--;
                this.updatePicker();
            } else if (action === 'next-year') {
                e.preventDefault();
                this.currentYear++;
                this.updatePicker();
            } else if (action === 'prev-month') {
                e.preventDefault();
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
                this.updatePicker();
            } else if (action === 'next-month') {
                e.preventDefault();
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
                this.updatePicker();
            } else if (action === 'prev-decade') {
                e.preventDefault();
                this.currentYear -= 10;
                this.updatePicker();
            } else if (action === 'next-decade') {
                e.preventDefault();
                this.currentYear += 10;
                this.updatePicker();
            } else if (day !== undefined) {
                this.selectDay(parseInt(day));
            } else if (month !== undefined) {
                this.selectMonth(parseInt(month));
            } else if (year !== undefined) {
                this.selectYear(parseInt(year));
            }
        });
    }

    isMonthSelected(monthIndex) {
        if (this.type !== 'month') return false;
        return this.currentYear === this.selectedYear && this.selectedMonth === monthIndex;
    }

    isDayDisabled(year, month, day) {
        if (this.type !== 'date') return false;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const date = new Date(dateStr + 'T00:00:00');

        if (this.minDate) {
            const minDateObj = new Date(this.minDate + 'T00:00:00');
            if (date < minDateObj) return true;
        }

        if (this.maxDate) {
            const maxDateObj = new Date(this.maxDate + 'T00:00:00');
            if (date > maxDateObj) return true;
        }

        return false;
    }

    setMinDate(dateStr) {
        this.minDate = dateStr;
        if (this.pickerElement) {
            this.updatePicker();
        }
    }

    setMaxDate(dateStr) {
        this.maxDate = dateStr;
        if (this.pickerElement) {
            this.updatePicker();
        }
    }

    handleDocumentClick(event) {
        const clickedInsideWrapper = this.wrapper && this.wrapper.contains(event.target);
        const clickedInsidePicker = this.pickerElement && this.pickerElement.contains(event.target);

        if (clickedInsideWrapper || clickedInsidePicker) {
            return;
        }
        this.close();
    }

    selectMonth(month) {
        this.selectedMonth = month;
        this.selectedYear = this.currentYear;
        this.hasValue = true;

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
        this.hasValue = true;

        // Atualizar input original
        this.input.value = year;

        // Atualizar display
        this.updateTriggerButton();

        // Callback
        this.onSelect({ year: this.selectedYear, value: year });

        // Fechar
        this.close();
    }

    selectDay(day) {
        this.selectedDay = day;
        this.selectedMonth = this.currentMonth;
        this.selectedYear = this.currentYear;
        this.hasValue = true;

        // Atualizar input original (formato YYYY-MM-DD)
        const value = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        this.input.value = value;

        // Atualizar display
        this.updateTriggerButton();

        // Callback
        this.onSelect({
            year: this.selectedYear,
            month: this.selectedMonth,
            day: this.selectedDay,
            value
        });

        // Fechar
        this.close();
    }

    updatePicker() {
        if (!this.pickerElement) return;

        if (this.type === 'month') {
            this.pickerElement.innerHTML = this.getMonthPickerHTML();
        } else if (this.type === 'year') {
            this.pickerElement.innerHTML = this.getYearPickerHTML();
        } else if (this.type === 'date') {
            this.pickerElement.innerHTML = this.getDatePickerHTML();
        }
    }

    updateTriggerButton() {
        const valueSpan = this.triggerButton.querySelector('.datepicker-value');
        valueSpan.textContent = this.getDisplayValue();
    }

    getDisplayValue() {
        if (this.type === 'month') {
            return `${this.monthNamesShort[this.selectedMonth]} ${this.selectedYear}`;
        }

        if (this.type === 'year') {
            return this.selectedYear || 'Selecionar';
        }

        if (this.type === 'date') {
            if (this.selectedYear && this.selectedMonth !== null && this.selectedDay) {
                return `${String(this.selectedDay).padStart(2, '0')}/${String(this.selectedMonth + 1).padStart(2, '0')}/${this.selectedYear}`;
            }
            return 'Selecionar data';
        }

        return 'Selecionar';
    }

    toggle() {
        console.log('[CustomDatePicker] Toggle chamado. Display atual:', this.pickerElement.style.display);
        if (this.pickerElement.style.display === 'none' || this.pickerElement.style.display === '') {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        console.log('[CustomDatePicker] Abrindo dropdown para:', this.inputId);

        // Fechar outros pickers
        document.querySelectorAll('.custom-datepicker-wrapper.open').forEach(wrapper => {
            if (wrapper !== this.wrapper) {
                wrapper.classList.remove('open');
            }
        });

        document.querySelectorAll('.custom-datepicker-dropdown').forEach(el => {
            if (el !== this.pickerElement) {
                el.style.display = 'none';
                el.style.opacity = '0';
            }
        });

        this.wrapper.classList.add('open');
        this.pickerElement.style.display = 'block';
        this.updatePicker();
        this.positionDropdown();

        // Força um reflow antes de aplicar a opacidade para garantir que a transição funcione
        this.pickerElement.offsetHeight;
        this.pickerElement.style.opacity = '1';

        console.log('[CustomDatePicker] Dropdown aberto. Position:', this.pickerElement.style.top, this.pickerElement.style.left);

        window.addEventListener('resize', this.boundRepositionDropdown, true);
        window.addEventListener('scroll', this.boundRepositionDropdown, true);
    }

    close() {
        if (this.pickerElement) {
            this.pickerElement.style.opacity = '0';
            // Aguarda a transição antes de esconder
            setTimeout(() => {
                if (this.pickerElement) {
                    this.pickerElement.style.display = 'none';
                }
            }, 150);
        }
        if (this.wrapper) {
            this.wrapper.classList.remove('open');
        }
        window.removeEventListener('resize', this.boundRepositionDropdown, true);
        window.removeEventListener('scroll', this.boundRepositionDropdown, true);
    }

    destroy() {
        if (!this.isValid) {
            return;
        }

        document.removeEventListener('click', this.boundHandleDocumentClick);
        window.removeEventListener('resize', this.boundRepositionDropdown, true);
        window.removeEventListener('scroll', this.boundRepositionDropdown, true);

        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
            this.wrapper.remove();
            this.input.style.display = '';
        }

        if (this.pickerElement && this.pickerElement.parentNode) {
            this.pickerElement.parentNode.removeChild(this.pickerElement);
        }
    }

    positionDropdown() {
        if (!this.pickerElement || !this.triggerButton || this.pickerElement.style.display === 'none') {
            return;
        }

        const buttonRect = this.triggerButton.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const horizontalPadding = 16;
        const verticalSpacing = 8;

        const dropdownWidth = this.pickerElement.offsetWidth || 320;
        const dropdownHeight = this.pickerElement.offsetHeight || 380;

        let left = buttonRect.left;
        let top = buttonRect.bottom + verticalSpacing;

        if (left + dropdownWidth > viewportWidth - horizontalPadding) {
            left = Math.max(horizontalPadding, viewportWidth - dropdownWidth - horizontalPadding);
        }

        if (left < horizontalPadding) {
            left = horizontalPadding;
        }

        if (top + dropdownHeight > viewportHeight - verticalSpacing) {
            const spaceAbove = buttonRect.top - verticalSpacing;
            const newTop = spaceAbove - dropdownHeight;
            if (newTop >= verticalSpacing) {
                top = newTop;
            } else {
                top = Math.max(verticalSpacing, viewportHeight - dropdownHeight - verticalSpacing);
            }
        }

        if (top < verticalSpacing) {
            top = verticalSpacing;
        }

        this.pickerElement.style.position = 'fixed';
        this.pickerElement.style.left = `${left}px`;
        this.pickerElement.style.top = `${top}px`;
    }
}

// Garantir exportação global
if (typeof window !== 'undefined') {
    window.CustomDatePicker = CustomDatePicker;
}
