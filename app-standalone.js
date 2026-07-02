/**
 * Countdown Application - Standalone Version
 * OOP + SOLID + OWASP - Funciona sem servidor HTTP
 * 
 * Esta versão mantém toda a arquitetura, mas em um único arquivo
 * para funcionar diretamente no navegador sem precisar de servidor.
 */

// ============================================
// CONFIGURATION
// ============================================
const AppConfig = Object.freeze({
    APP_NAME: 'Countdown Timer',
    VERSION: '2.1.0',
    UPDATE_INTERVAL: 1000,

    TARGET_DATE: {
        month: 11,
        day: 31,
        hour: 23,
        minute: 59,
        second: 59
    },

    THEME: {
        DEFAULT: 'dark',
        STORAGE_KEY: 'countdown-theme-preference',
        ATTRIBUTE: 'data-theme',
        VALUES: {
            DARK: 'dark',
            LIGHT: 'light'
        }
    },

    LGPD: {
        CONSENT_KEY: 'lgpd-consent',
        VALUES: {
            ACCEPTED: 'accepted',
            REJECTED: 'rejected',
            UNDECIDED: null
        }
    },

    SELECTORS: {
        THEME_TOGGLE: '#theme-toggle',
        THEME_ICON: '.theme-icon',
        LGPD_BANNER: '#lgpd-banner',
        LGPD_ACCEPT: '#lgpd-accept',
        LGPD_REJECT: '#lgpd-reject',
        ELEMENTS: {
            MONTHS: '#months',
            DAYS: '#days',
            HOURS: '#hours',
            MINUTES: '#minutes',
            SECONDS: '#seconds'
        }
    },

    ICONS: {
        DARK_MODE: '🌙',
        LIGHT_MODE: '☀️'
    },

    TIME_UNITS: {
        SECONDS_IN_MINUTE: 60,
        SECONDS_IN_HOUR: 3600,
        SECONDS_IN_DAY: 86400,
        DAYS_IN_MONTH: 30.44
    }
});

// ============================================
// UTILITIES
// ============================================
class TimeUtils {
    static isSafeNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }

    static padNumber(num, length = 2) {
        if (!this.isSafeNumber(num)) return '00';
        return String(Math.floor(num)).padStart(length, '0');
    }

    static getTimeDifferenceInSeconds(targetDate, currentDate = new Date()) {
        try {
            const diff = targetDate - currentDate;
            const seconds = diff / 1000;
            return this.isSafeNumber(seconds) ? Math.max(0, seconds) : 0;
        } catch (error) {
            console.error('Error calculating time difference:', error);
            return 0;
        }
    }

    static secondsToTimeUnits(totalSeconds) {
        if (!this.isSafeNumber(totalSeconds) || totalSeconds < 0) {
            return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const { TIME_UNITS } = AppConfig;
        const totalDays = totalSeconds / TIME_UNITS.SECONDS_IN_DAY;
        const months = Math.floor(totalDays / TIME_UNITS.DAYS_IN_MONTH);

        const remainingAfterMonths = totalSeconds - (months * TIME_UNITS.DAYS_IN_MONTH * TIME_UNITS.SECONDS_IN_DAY);
        const days = Math.floor(remainingAfterMonths / TIME_UNITS.SECONDS_IN_DAY);

        const remainingAfterDays = remainingAfterMonths % TIME_UNITS.SECONDS_IN_DAY;
        const hours = Math.floor(remainingAfterDays / TIME_UNITS.SECONDS_IN_HOUR);

        const remainingAfterHours = remainingAfterDays % TIME_UNITS.SECONDS_IN_HOUR;
        const minutes = Math.floor(remainingAfterHours / TIME_UNITS.SECONDS_IN_MINUTE);

        const seconds = Math.floor(remainingAfterHours % TIME_UNITS.SECONDS_IN_MINUTE);

        return { months, days, hours, minutes, seconds };
    }

    static createTargetDate(year, config = AppConfig.TARGET_DATE) {
        try {
            return new Date(year, config.month, config.day, config.hour, config.minute, config.second);
        } catch (error) {
            console.error('Error creating target date:', error);
            return new Date();
        }
    }

    static getEndOfYear() {
        const now = new Date();
        const currentYear = now.getFullYear();
        return this.createTargetDate(currentYear);
    }

    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }
}

// ============================================
// SERVICES
// ============================================

/**
 * LGPD Consent Service
 * Gerencia o consentimento do usuario antes de qualquer armazenamento local.
 * LGPD (Lei 13.709/2018) - Art. 7, I: consentimento do titular.
 */
class ConsentService {
    constructor(storageService) {
        this.storage = storageService;
        this.config = AppConfig.LGPD;
        this._consent = this._loadConsent();
    }

    _loadConsent() {
        // Tenta carregar sem afetar o storage (leitura apenas)
        try {
            const value = window.localStorage.getItem(this.config.CONSENT_KEY);
            if (value === this.config.VALUES.ACCEPTED) return this.config.VALUES.ACCEPTED;
            if (value === this.config.VALUES.REJECTED) return this.config.VALUES.REJECTED;
        } catch (e) {
            // localStorage nao disponivel
        }
        return this.config.VALUES.UNDECIDED;
    }

    getStatus() {
        return this._consent;
    }

    hasConsent() {
        return this._consent === this.config.VALUES.ACCEPTED;
    }

    isUndecided() {
        return this._consent === this.config.VALUES.UNDECIDED;
    }

    accept() {
        this._consent = this.config.VALUES.ACCEPTED;
        this.storage.setItem(this.config.CONSENT_KEY, this.config.VALUES.ACCEPTED);
        return true;
    }

    reject() {
        this._consent = this.config.VALUES.REJECTED;
        // Salva a rejeicao para nao mostrar o banner de novo
        this.storage.setItem(this.config.CONSENT_KEY, this.config.VALUES.REJECTED);
        return true;
    }
}

class StorageService {
    constructor(consentService) {
        this.storage = window.localStorage;
        this.isAvailable = this._checkAvailability();
        this.consent = consentService;
    }

    _checkAvailability() {
        try {
            const test = '__storage_test__';
            this.storage.setItem(test, test);
            this.storage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('Storage is not available:', e);
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        if (!this.isAvailable) return defaultValue;
        try {
            const item = this.storage.getItem(key);
            return item !== null ? item : defaultValue;
        } catch (error) {
            console.error(`Error getting item "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * So salva no localStorage se o usuario consentiu.
     * LGPD Art. 7, I: tratamento mediante consentimento.
     */
    setItem(key, value) {
        // Chave de consentimento sempre pode ser salva (necessario para lembrar a escolha)
        if (key === AppConfig.LGPD.CONSENT_KEY) {
            return this._rawSet(key, value);
        }
        // Demais chaves so com consentimento
        if (!this.consent.hasConsent()) {
            return false;
        }
        return this._rawSet(key, value);
    }

    _rawSet(key, value) {
        if (!this.isAvailable) return false;
        try {
            this.storage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Error setting item "${key}":`, error);
            return false;
        }
    }
}

class DOMService {
    getElement(selector) {
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error(`Error selecting element "${selector}":`, error);
            return null;
        }
    }

    setTextContent(element, text) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        try {
            el.textContent = String(text);
            return true;
        } catch (error) {
            console.error('Error setting text content:', error);
            return false;
        }
    }

    addEventListener(element, event, handler) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        try {
            el.addEventListener(event, handler);
            return true;
        } catch (error) {
            console.error('Error adding event listener:', error);
            return false;
        }
    }

    setAttribute(element, attribute, value) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        try {
            el.setAttribute(attribute, value);
            return true;
        } catch (error) {
            console.error('Error setting attribute:', error);
            return false;
        }
    }

    removeAttribute(element, attribute) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return false;
        try {
            el.removeAttribute(attribute);
            return true;
        } catch (error) {
            console.error('Error removing attribute:', error);
            return false;
        }
    }
}

class ThemeService {
    constructor(storageService, domService, consentService) {
        this.storage = storageService;
        this.dom = domService;
        this.consent = consentService;
        this.config = AppConfig.THEME;
        // Tenta carregar tema salvo. Se nao houver consentimento, usa o padrao.
        this.currentTheme = this._loadTheme();
    }

    _loadTheme() {
        // So le o tema salvo se houver consentimento
        if (this.consent.hasConsent()) {
            return this.storage.getItem(this.config.STORAGE_KEY, this.config.DEFAULT);
        }
        return this.config.DEFAULT;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === this.config.VALUES.DARK;
    }

    _applyTheme(theme) {
        const body = this.dom.getElement('body');
        if (theme === this.config.VALUES.LIGHT) {
            body.setAttribute(this.config.ATTRIBUTE, 'light');
        } else {
            body.removeAttribute(this.config.ATTRIBUTE);
        }
    }

    _updateIcon(theme) {
        const icon = this.dom.getElement(AppConfig.SELECTORS.THEME_ICON);
        if (!icon) return;
        const iconText = theme === this.config.VALUES.LIGHT ? AppConfig.ICONS.LIGHT_MODE : AppConfig.ICONS.DARK_MODE;
        icon.textContent = iconText;
    }

    setTheme(theme) {
        if (!Object.values(this.config.VALUES).includes(theme)) {
            console.error(`Invalid theme: ${theme}`);
            return false;
        }
        this.currentTheme = theme;
        this._applyTheme(theme);
        this._updateIcon(theme);
        // Tenta salvar — StorageService so persiste se houver consentimento
        this.storage.setItem(this.config.STORAGE_KEY, theme);
        return true;
    }

    toggleTheme() {
        const newTheme = this.isDarkMode() ? this.config.VALUES.LIGHT : this.config.VALUES.DARK;
        this.setTheme(newTheme);
        return newTheme;
    }

    initialize() {
        this._applyTheme(this.currentTheme);
        this._updateIcon(this.currentTheme);
    }
}

class CountdownService {
    constructor(domService) {
        this.dom = domService;
        this.targetDate = null;
        this.intervalId = null;
        this.isRunning = false;
        this.elements = this._cacheElements();
    }

    _cacheElements() {
        const selectors = AppConfig.SELECTORS.ELEMENTS;
        return {
            months: this.dom.getElement(selectors.MONTHS),
            days: this.dom.getElement(selectors.DAYS),
            hours: this.dom.getElement(selectors.HOURS),
            minutes: this.dom.getElement(selectors.MINUTES),
            seconds: this.dom.getElement(selectors.SECONDS)
        };
    }

    _calculateRemainingTime() {
        if (!this.targetDate || !TimeUtils.isValidDate(this.targetDate)) {
            return null;
        }
        const totalSeconds = TimeUtils.getTimeDifferenceInSeconds(this.targetDate);
        if (totalSeconds <= 0) {
            this.stop();
            return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
        return TimeUtils.secondsToTimeUnits(totalSeconds);
    }

    _updateDisplay(timeUnits) {
        if (!timeUnits) return;
        this.dom.setTextContent(this.elements.months, TimeUtils.padNumber(timeUnits.months));
        this.dom.setTextContent(this.elements.days, TimeUtils.padNumber(timeUnits.days));
        this.dom.setTextContent(this.elements.hours, TimeUtils.padNumber(timeUnits.hours));
        this.dom.setTextContent(this.elements.minutes, TimeUtils.padNumber(timeUnits.minutes));
        this.dom.setTextContent(this.elements.seconds, TimeUtils.padNumber(timeUnits.seconds));
    }

    _update() {
        const timeUnits = this._calculateRemainingTime();
        this._updateDisplay(timeUnits);
    }

    start() {
        if (this.isRunning) return false;
        if (!this.targetDate) {
            this.targetDate = TimeUtils.getEndOfYear();
        }
        this._update();
        this.intervalId = setInterval(() => this._update(), AppConfig.UPDATE_INTERVAL);
        this.isRunning = true;
        return true;
    }

    stop() {
        if (!this.isRunning) return false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        return true;
    }
}

// ============================================
// CONTROLLERS
// ============================================
class ConsentController {
    constructor(consentService, domService, themeService) {
        this.consent = consentService;
        this.dom = domService;
        this.themeService = themeService;
        this.banner = null;
        this._boundHandleAccept = this._handleAccept.bind(this);
        this._boundHandleReject = this._handleReject.bind(this);
    }

    _handleAccept() {
        this.consent.accept();
        this._hideBanner();
        // Agora que tem consentimento, salva o tema atual
        this.themeService.setTheme(this.themeService.getCurrentTheme());
        console.log('✅ LGPD: Consentimento aceito. Preferencia de tema salva.');
    }

    _handleReject() {
        this.consent.reject();
        this._hideBanner();
        console.log('ℹ️ LGPD: Consentimento recusado. Nada salvo no navegador.');
    }

    _showBanner() {
        if (this.banner) {
            // Pequeno delay para animacao de entrada
            // Mostra na hora
            
                this.banner.classList.add("active");

        }
    }

    _hideBanner() {
        if (this.banner) {
            this.banner.classList.remove('active');
        }
    }

    initialize() {
        this.banner = this.dom.getElement(AppConfig.SELECTORS.LGPD_BANNER);
        if (!this.banner) {
            console.warn('LGPD banner element not found');
            return false;
        }

        // Se ja foi decidido, nao mostra o banner
        if (!this.consent.isUndecided()) {
            return false;
        }

        // Mostra o banner
        this._showBanner();

        // Adiciona eventos
        const acceptBtn = this.dom.getElement(AppConfig.SELECTORS.LGPD_ACCEPT);
        const rejectBtn = this.dom.getElement(AppConfig.SELECTORS.LGPD_REJECT);

        if (acceptBtn) {
            this.dom.addEventListener(acceptBtn, 'click', this._boundHandleAccept);
        }
        if (rejectBtn) {
            this.dom.addEventListener(rejectBtn, 'click', this._boundHandleReject);
        }

        return true;
    }
}

class ThemeController {
    constructor(themeService, domService) {
        this.themeService = themeService;
        this.dom = domService;
        this.toggleButton = null;
        this._boundHandleToggle = this._handleToggle.bind(this);
    }

    _handleToggle(event) {
        event.preventDefault();
        try {
            const newTheme = this.themeService.toggleTheme();
            console.log(`Theme changed to: ${newTheme}`);
        } catch (error) {
            console.error('Error toggling theme:', error);
        }
    }

    initialize() {
        this.toggleButton = this.dom.getElement(AppConfig.SELECTORS.THEME_TOGGLE);
        if (!this.toggleButton) {
            console.warn('Theme toggle button not found');
            return false;
        }
        this.themeService.initialize();
        this.dom.addEventListener(this.toggleButton, 'click', this._boundHandleToggle);
        return true;
    }
}

class CountdownController {
    constructor(countdownService) {
        this.countdownService = countdownService;
    }

    initialize() {
        try {
            const started = this.countdownService.start();
            if (started) {
                console.log('Countdown started successfully');
                return true;
            } else {
                console.error('Failed to start countdown');
                return false;
            }
        } catch (error) {
            console.error('Error initializing countdown:', error);
            return false;
        }
    }
}

// ============================================
// APPLICATION
// ============================================
class CountdownApp {
    constructor() {
        this.services = {};
        this.controllers = {};
        this.isInitialized = false;
    }

    _initializeServices() {
        try {
            // ConsentService primeiro (nao precisa de storage ainda)
            this.services.consent = new ConsentService(null); // temporario
            // StorageService com consent
            this.services.storage = new StorageService(this.services.consent);
            // Reconstroi ConsentService com storage real
            this.services.consent = new ConsentService(this.services.storage);
            // Atualiza StorageService com o consent real
            this.services.storage.consent = this.services.consent;

            this.services.dom = new DOMService();
            this.services.theme = new ThemeService(this.services.storage, this.services.dom, this.services.consent);
            this.services.countdown = new CountdownService(this.services.dom);
            console.log('✓ Services initialized');
            return true;
        } catch (error) {
            console.error('✗ Error initializing services:', error);
            return false;
        }
    }

    _initializeControllers() {
        try {
            this.controllers.consent = new ConsentController(
                this.services.consent, this.services.dom, this.services.theme
            );
            this.controllers.theme = new ThemeController(this.services.theme, this.services.dom);
            this.controllers.countdown = new CountdownController(this.services.countdown);
            console.log('✓ Controllers initialized');
            return true;
        } catch (error) {
            console.error('✗ Error initializing controllers:', error);
            return false;
        }
    }

    _startControllers() {
        try {
            this.controllers.consent.initialize();
            this.controllers.theme.initialize();
            this.controllers.countdown.initialize();
            console.log('✓ Controllers started');
            return true;
        } catch (error) {
            console.error('✗ Error starting controllers:', error);
            return false;
        }
    }

    initialize() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return false;
        }

        console.log('🚀 Initializing Countdown Application...');

        if (!this._initializeServices()) return false;
        if (!this._initializeControllers()) return false;
        if (!this._startControllers()) return false;

        this.isInitialized = true;
        console.log('✅ Application initialized successfully');
        return true;
    }
}

// ============================================
// BOOTSTRAP
// ============================================
function bootstrap() {
    const app = new CountdownApp();
    const initialized = app.initialize();

    if (!initialized) {
        console.error('Failed to initialize application');
        return;
    }

    window.__COUNTDOWN_APP__ = app;
    console.log('💡 App instance available at window.__COUNTDOWN_APP__');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
