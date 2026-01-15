class Calculator {
    constructor() {
        this.display = document.getElementById('display');
        this.historyDisplay = document.getElementById('history-display');
        this.buttons = document.querySelectorAll('.btn');
        this.historyList = document.getElementById('history-list');
        this.historyPanel = document.getElementById('history-panel');
        this.historyToggle = document.getElementById('history-toggle');
        this.clearHistoryBtn = document.getElementById('clear-history');
        this.themeToggle = document.getElementById('theme-toggle');
        this.notification = document.getElementById('notification');
        
        this.output = '';
        this.history = JSON.parse(localStorage.getItem('calcHistory')) || [];
        this.currentTheme = localStorage.getItem('calcTheme') || 'light';
        
        this.init();
    }
    
    init() {
        this.applyTheme();
        this.loadHistory();
        this.setupEventListeners();
        this.setupKeyboardSupport();
        
        // Add initial animation to buttons
        setTimeout(() => {
            this.buttons.forEach((btn, index) => {
                btn.style.animationDelay = `${index * 0.05}s`;
                btn.classList.add('animated');
            });
        }, 300);
    }
    
    setupEventListeners() {
        // Button click events
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const btnValue = e.currentTarget.dataset.value;
                this.handleButtonClick(btnValue);
                this.animateButton(e.currentTarget);
            });
        });
        
        // History toggle
        this.historyToggle.addEventListener('click', () => {
            this.toggleHistoryPanel();
        });
        
        // Clear history
        this.clearHistoryBtn.addEventListener('click', () => {
            this.clearHistory();
        });
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Close history panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.historyPanel.contains(e.target) && 
                !this.historyToggle.contains(e.target) &&
                this.historyPanel.classList.contains('active')) {
                this.toggleHistoryPanel();
            }
        });
    }
    
    setupKeyboardSupport() {
        document.addEventListener('keydown', (e) => {
            const key = e.key;
            
            // Handle number keys
            if (key >= '0' && key <= '9') {
                this.handleButtonClick(key);
                this.animateButton(this.getButtonByValue(key));
            }
            
            // Handle operators
            else if (['+', '-', '*', '/', '%', '.'].includes(key)) {
                this.handleButtonClick(key);
                this.animateButton(this.getButtonByValue(key));
            }
            
            // Handle Enter key
            else if (key === 'Enter') {
                e.preventDefault();
                this.handleButtonClick('=');
                this.animateButton(this.getButtonByValue('='));
            }
            
            // Handle Escape key
            else if (key === 'Escape') {
                this.handleButtonClick('AC');
                this.animateButton(this.getButtonByValue('AC'));
            }
            
            // Handle Backspace key
            else if (key === 'Backspace') {
                this.handleButtonClick('DEL');
                this.animateButton(this.getButtonByValue('DEL'));
            }
        });
    }
    
    getButtonByValue(value) {
        return Array.from(this.buttons).find(btn => btn.dataset.value === value);
    }
    
    handleButtonClick(btnValue) {
        const lastChar = this.output.slice(-1);
        const operators = ['+', '-', '*', '/', '%'];
        
        // Feature 1: Smart input validation
        if (operators.includes(btnValue) && operators.includes(lastChar)) {
            this.showNotification('Cannot enter multiple operators in sequence');
            return;
        }
        
        // Feature 2: Limit decimal points per number
        if (btnValue === '.') {
            const parts = this.output.split(/[\+\-\*\/\%]/);
            const currentNumber = parts[parts.length - 1];
            if (currentNumber.includes('.')) {
                this.showNotification('Number already has a decimal point');
                return;
            }
        }
        
        switch(btnValue) {
            case '=':
                this.calculateResult();
                break;
            case 'AC':
                this.clearDisplay();
                break;
            case 'DEL':
                this.deleteLast();
                break;
            default:
                this.addToDisplay(btnValue);
        }
    }
    
    addToDisplay(value) {
        // Feature 3: Limit display length
        if (this.output.length >= 30) {
            this.showNotification('Maximum input length reached');
            return;
        }
        
        this.output += value;
        this.updateDisplay();
    }
    
    calculateResult() {
        if (!this.output) return;
        
        try {
            let expression = this.output;
            
            // Replace display symbols with calculation symbols
            expression = expression
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/−/g, '-')
                .replace(/%/g, '/100');
            
            // Validate expression
            if (/([\+\-\*\/]){2,}/.test(expression)) {
                throw new Error('Invalid expression');
            }
            
            // Use Function constructor for safer eval
            const result = new Function('return ' + expression)();
            
            // Check if result is finite
            if (!isFinite(result)) {
                throw new Error('Invalid calculation');
            }
            
            // Format result
            const formattedResult = this.formatResult(result);
            
            // Save to history
            this.saveToHistory(this.output, formattedResult);
            
            // Update display
            this.output = formattedResult;
            this.updateDisplay();
            
            // Update history display
            this.historyDisplay.textContent = `${this.output} = ${formattedResult}`;
            
        } catch (error) {
            this.output = 'Error';
            this.updateDisplay();
            this.showNotification('Calculation error');
        }
    }
    
    formatResult(result) {
        // Round to 10 decimal places to avoid floating point errors
        const rounded = Math.round(result * 10000000000) / 10000000000;
        
        // If it's a whole number, remove decimal
        if (rounded % 1 === 0) {
            return rounded.toString();
        }
        
        // Otherwise, limit to 8 decimal places
        return rounded.toFixed(8).replace(/\.?0+$/, '');
    }
    
    saveToHistory(expression, result) {
        const historyItem = {
            expression,
            result,
            timestamp: new Date().toLocaleTimeString()
        };
        
        this.history.unshift(historyItem);
        
        // Keep only last 10 calculations
        if (this.history.length > 10) {
            this.history.pop();
        }
        
        this.saveHistory();
        this.addHistoryItem(historyItem);
    }
    
    addHistoryItem(item) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-expression">${item.expression}</div>
            <div class="history-result">= ${item.result}</div>
            <div class="history-time">${item.timestamp}</div>
        `;
        
        historyItem.addEventListener('click', () => {
            this.output = item.expression;
            this.updateDisplay();
            this.showNotification('Expression loaded from history');
        });
        
        this.historyList.prepend(historyItem);
    }
    
    loadHistory() {
        this.historyList.innerHTML = '';
        this.history.forEach(item => this.addHistoryItem(item));
    }
    
    saveHistory() {
        localStorage.setItem('calcHistory', JSON.stringify(this.history));
    }
    
    clearHistory() {
        this.history = [];
        this.historyList.innerHTML = '';
        this.saveHistory();
        this.showNotification('History cleared');
    }
    
    clearDisplay() {
        this.output = '';
        this.updateDisplay();
        this.historyDisplay.textContent = '';
    }
    
    deleteLast() {
        this.output = this.output.slice(0, -1);
        this.updateDisplay();
    }
    
    updateDisplay() {
        // Replace calculation symbols with display symbols
        const displayValue = this.output
            .replace(/\//g, '÷')
            .replace(/\*/g, '×')
            .replace(/\-/g, '−');
        
        this.display.value = displayValue || '0';
    }
    
    toggleHistoryPanel() {
        this.historyPanel.classList.toggle('active');
        const icon = this.historyToggle.querySelector('i');
        
        if (this.historyPanel.classList.contains('active')) {
            icon.className = 'fas fa-times';
        } else {
            icon.className = 'fas fa-history';
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('calcTheme', this.currentTheme);
        
        const icon = this.themeToggle.querySelector('i');
        icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        
        this.showNotification(`${this.currentTheme === 'light' ? 'Light' : 'Dark'} mode activated`);
    }
    
    applyTheme() {
        document.body.setAttribute('data-theme', this.currentTheme);
    }
    
    animateButton(button) {
        if (!button) return;
        
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    showNotification(message) {
        this.notification.textContent = message;
        this.notification.classList.add('show');
        
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Calculator();
});