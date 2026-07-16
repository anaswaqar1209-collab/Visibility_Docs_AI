import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [new winston.transports.Console()],
});

export function logError(message: string, detail?: unknown) {
    logger.error(`${message} ${detail ? String(detail) : ''}`);
}

export default logger;
