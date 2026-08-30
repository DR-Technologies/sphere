type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'config' | 'ingestion' | 'analytics' | 'auth' | 'maps' | 'render' | 'release' | 'story';

interface LogOptions {
    once?: boolean;
    error?: unknown;
    meta?: Record<string, unknown>;
}

const emittedMessages = new Set<string>();

function getKey(category: LogCategory, code: string) {
    return `${category}:${code}`;
}

function getConsoleMethod(level: LogLevel) {
    if (level === 'debug') return console.debug;
    if (level === 'info') return console.info;
    if (level === 'warn') return console.warn;
    return console.error;
}

function toErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return '';
}

function log(level: LogLevel, category: LogCategory, code: string, message: string, options: LogOptions = {}) {
    if (level === 'debug' && process.env.NODE_ENV === 'production') {
        return;
    }

    const key = getKey(category, code);
    if (options.once && emittedMessages.has(key)) {
        return;
    }

    if (options.once) {
        emittedMessages.add(key);
    }

    const consoleMethod = getConsoleMethod(level);
    const prefix = `[sphere/${category}/${code}]`;
    const payload: Record<string, unknown> = {};

    if (options.meta) {
        payload.meta = options.meta;
    }

    const errorMessage = toErrorMessage(options.error);
    if (errorMessage) {
        payload.error = errorMessage;
    }

    if (Object.keys(payload).length > 0) {
        consoleMethod(`${prefix} ${message}`, payload);
        return;
    }

    consoleMethod(`${prefix} ${message}`);
}

export const appLogger = {
    debug(category: LogCategory, code: string, message: string, options?: LogOptions) {
        log('debug', category, code, message, options);
    },
    info(category: LogCategory, code: string, message: string, options?: LogOptions) {
        log('info', category, code, message, options);
    },
    warn(category: LogCategory, code: string, message: string, options?: LogOptions) {
        log('warn', category, code, message, options);
    },
    error(category: LogCategory, code: string, message: string, options?: LogOptions) {
        log('error', category, code, message, options);
    }
};

export function getErrorMessage(error: unknown, fallback = 'Unknown error') {
    return toErrorMessage(error) || fallback;
}
