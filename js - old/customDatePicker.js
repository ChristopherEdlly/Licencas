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
        this.pickerElement = null;
        this.wrapper = null;
        this.triggerButton = null;
        this.hasValue = false;
        this.today = new Date();
        this.monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
                const [year, month, day] = currentValue.split('-').map(Number);
                this.currentYear = year;
                this.currentMonth = month - 1;
                this.selectedYear = year;
                this.selectedMonth = month - 1;
                this.selectedDay = day;
                this.hasValue = true;
            } else {
                this.currentYear = this.today.getFullYear();
                this.currentMonth = this.today.getMonth();
                this.selectedYear = this.currentYear;
                this.selectedMonth = this.currentMonth;
                this.selectedDay = this.today.getDate();
            }
        }

        this.init();
    }

    init() {
        if (!this.isValid) {
            return;
        }
        
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
        } else {
            picker.innerHTML = this.getDatePickerHTML();
        }
        
        document.body.appendChild(picker);
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
        const monthName = this.monthNamesFull[this.currentMonth];
        const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
        const firstWeekDay = firstDayOfMonth.getDay(); // 0 (Domingo) - 6 (Sábado)
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

        const daysCells = [];
        const totalCells = 42; // 6 semanas

        for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
            const dayNumber = cellIndex - firstWeekDay + 1;

            if (dayNumber < 1) {
                const prevDay = daysInPrevMonth + dayNumber;
                daysCells.push(`<span class="datepicker-day muted">${String(prevDay).padStart(2, '0')}</span>`);
            } else if (dayNumber > daysInMonth) {
                const nextDay = dayNumber - daysInMonth;
                daysCells.push(`<span class="datepicker-day muted">${String(nextDay).padStart(2, '0')}</span>`);
            } else {
                const isSelected = this.hasValue && this.selectedYear === this.currentYear &&
                    this.selectedMonth === this.currentMonth && this.selectedDay === dayNumber;
                const isToday = this.isToday(dayNumber);
                const classes = ['datepicker-day'];
                if (isSelected) classes.push('selected');
                if (isToday) classes.push('today');

                daysCells.push(`
                    <button type="button" 
                            class="${classes.join(' ')}"
                            data-day="${dayNumber}">
                        ${String(dayNumber).padStart(2, '0')}
                    </button>
                `);
            }
        }

        return `
            <div class="datepicker-header">
                <button type="button" class="datepicker-nav" data-action="prev-month">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <div class="datepicker-title">
                    <span class="datepicker-year">${monthName} ${this.currentYear}</span>
                </div>
                <button type="button" class="datepicker-nav" data-action="next-month">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
            <div class="datepicker-body">
                <div class="datepicker-weekdays">
                    ${this.weekdayNames.map(day => `<span class="datepicker-weekday">${day}</span>`).join('')}
                </div>
                <div class="datepicker-days">
                    ${daysCells.join('')}
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
            e.stopPropagation(); // Prevenir que cliques internos fechem o picker
            
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
            } else if (action === 'prev-decade') {
                e.preventDefault();
                this.currentYear -= 10;
                this.updatePicker();
            } else if (action === 'next-decade') {
                e.preventDefault();
                this.currentYear += 10;
                this.updatePicker();
            } else if (action === 'prev-month') {
                e.preventDefault();
                if (this.currentMonth === 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                } else {
                    this.currentMonth--;
                }
                this.updatePicker();
            } else if (action === 'next-month') {
                e.preventDefault();
                if (this.currentMonth === 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                } else {
                    this.currentMonth++;
                }
                this.updatePicker();
            } else if (month !== undefined) {
                this.selectMonth(parseInt(month));
            } else if (year !== undefined) {
                this.selectYear(parseInt(year));
            } else if (day !== undefined) {
                this.selectDate(parseInt(day, 10));
            }
        });
    }

    isMonthSelected(monthIndex) {
        if (this.type !== 'month') return false;
        return this.currentYear === this.selectedYear && this.selectedMonth === monthIndex;
    }

    isToday(day) {
        return this.today.getFullYear() === this.currentYear &&
            this.today.getMonth() === this.currentMonth &&
            this.today.getDate() === day;
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

    selectDate(day) {
        this.selectedDay = day;
        this.selectedMonth = this.currentMonth;
        this.selectedYear = this.currentYear;
        this.hasValue = true;

        const value = `${this.selectedYear}-${String(this.selectedMonth + 1).padStart(2, '0')}-${String(this.selectedDay).padStart(2, '0')}`;
        this.input.value = value;

        this.updateTriggerButton();
        this.onSelect({ year: this.selectedYear, month: this.selectedMonth, day: this.selectedDay, value });
        this.close();
    }

    updatePicker() {
        if (!this.pickerElement) return;

        if (this.type === 'month') {
            this.pickerElement.innerHTML = this.getMonthPickerHTML();
        } else if (this.type === 'year') {
            this.pickerElement.innerHTML = this.getYearPickerHTML();
        } else {
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

        if (!this.hasValue) {
            return 'Selecionar';
        }

        return `${String(this.selectedDay).padStart(2, '0')}/${String(this.selectedMonth + 1).padStart(2, '0')}/${this.selectedYear}`;
    }

    setValue(value) {
        if (!this.input) return;

        if (!value) {
            this.input.value = '';
            this.hasValue = false;
            this.updateTriggerButton();
            this.updatePicker();
            return;
        }

        if (this.type === 'month') {
            const [year, month] = value.split('-').map(Number);
            if (!year || !month) return;
            this.currentYear = year;
            this.currentMonth = month - 1;
            this.selectedYear = year;
            this.selectedMonth = month - 1;
            this.hasValue = true;
        } else if (this.type === 'year') {
            const year = parseInt(value, 10);
            if (!year) return;
            this.currentYear = year;
            this.selectedYear = year;
            this.hasValue = true;
        } else if (this.type === 'date') {
            const [year, month, day] = value.split('-').map(Number);
            if (!year || !month || !day) return;
            this.currentYear = year;
            this.currentMonth = month - 1;
            this.selectedYear = year;
            this.selectedMonth = month - 1;
            this.selectedDay = day;
            this.hasValue = true;
        }

        this.input.value = value;
        this.updateTriggerButton();
        this.updatePicker();
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
        document.querySelectorAll('.custom-datepicker-wrapper.open').forEach(wrapper => {
            if (wrapper !== this.wrapper) {
                wrapper.classList.remove('open');
            }
        });

        document.querySelectorAll('.custom-datepicker-dropdown').forEach(el => {
            if (el !== this.pickerElement) {
                el.style.display = 'none';
            }
        });

        this.wrapper.classList.add('open');
        
        // Primeiro, atualizar o conteúdo com display:block mas invisível
        this.pickerElement.style.display = 'block';
        this.pickerElement.style.visibility = 'hidden';
        this.pickerElement.style.opacity = '0';
        this.updatePicker();
        
        // Aguardar o browser calcular o layout antes de posicionar
        // Usando múltiplos RAF para garantir que o layout esteja completo
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Forçar reflow
                void this.pickerElement.offsetHeight;
                
                // Posicionar e então tornar visível
                this.positionDropdown();
                
                requestAnimationFrame(() => {
                    this.pickerElement.style.visibility = 'visible';
                    this.pickerElement.style.opacity = '1';
                });
            });
        });
        
        window.addEventListener('resize', this.boundRepositionDropdown, true);
        window.addEventListener('scroll', this.boundRepositionDropdown, true);
    }

    close() {
        if (this.pickerElement) {
            this.pickerElement.style.display = 'none';
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

        // Forçar reflow para garantir que as dimensões estejam corretas
        void this.pickerElement.offsetHeight;

        const buttonRect = this.triggerButton.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        const horizontalPadding = 16;
        const verticalSpacing = 8;

        // Garantir que o conteúdo atualizado tenha dimensões corretas
        let dropdownWidth = this.pickerElement.offsetWidth;
        let dropdownHeight = this.pickerElement.offsetHeight;
        
        // Se as dimensões ainda forem 0, usar valores padrão e tentar novamente depois
        if (dropdownWidth === 0 || dropdownHeight === 0) {
            dropdownWidth = 320;
            dropdownHeight = 380;
            // Reagendar posicionamento após o layout ser calculado
            setTimeout(() => this.positionDropdown(), 10);
        }

        // Check se está dentro de um modal
        const parentModal = this.triggerButton.closest('.modal, .filter-config-popup');
        
        if (parentModal) {
            // Posicionamento relativo ao modal
            const modalRect = parentModal.getBoundingClientRect();
            const scrollTop = parentModal.scrollTop || 0;
            const scrollLeft = parentModal.scrollLeft || 0;
            
            // Posição do botão relativa ao modal
            const relativeTop = buttonRect.top - modalRect.top + scrollTop;
            const relativeLeft = buttonRect.left - modalRect.left + scrollLeft;
            
            // Posicionar abaixo do botão dentro do modal
            let top = relativeTop + buttonRect.height + verticalSpacing;
            let left = relativeLeft;
            
            // Ajustar se sair dos limites do modal
            const modalWidth = parentModal.clientWidth;
            const modalHeight = parentModal.clientHeight;
            
            if (left + dropdownWidth > modalWidth - horizontalPadding) {
                left = Math.max(horizontalPadding, modalWidth - dropdownWidth - horizontalPadding);
            }
            
            if (left < horizontalPadding) {
                left = horizontalPadding;
            }
            
            if (top + dropdownHeight > modalHeight - verticalSpacing) {
                // Mostrar acima do botão
                top = relativeTop - dropdownHeight - verticalSpacing;
                if (top < verticalSpacing) {
                    // Se não couber acima, centralizar no modal
                    top = Math.max(verticalSpacing, (modalHeight - dropdownHeight) / 2);
                }
            }
            
            this.pickerElement.style.position = 'absolute';
            this.pickerElement.style.top = `${top}px`;
            this.pickerElement.style.left = `${left}px`;
        } else {
            // Posicionamento fixo na viewport (comportamento original)
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
}

// Garantir exportação global
if (typeof window !== 'undefined') {
    window.CustomDatePicker = CustomDatePicker;
}
