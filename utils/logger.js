const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
const fs = require("fs");
const { type } = require("os");
const { error } = require("console");

class Logger {
    constructor(fileName) {
        // Create the log directory if it doesn't exist
        const logDir = "logs";
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        // Define the log format with the built-in 'printf' formatter
        const myFormat = printf(({ level, message, timestamp, stack }) => {

            if (stack) {
                message = `${message}\n${stack}`
            }
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        });

        // Create a Winston logger instance
        this.logger = createLogger({
            level: "silly",
            format: combine(timestamp(), myFormat),
            transports: [
                new transports.File({
                    filename: `${logDir}/${fileName}`,
                    maxsize: 1024 * 1024 * 10, // 10MB
                    maxFiles: 1,
                }),
                new transports.Console({
                    level: "silly", // or 'silly'
                }),
            ],
        });
    }

    log(message) {
        let level;
        let stack
        if (message instanceof Error) {
            level = "error";
            stack = message.stack
            message = message.message
        } else if (typeof message === "string") {
            level = "info";
        } else {
            level = "debug";
        }

        this.logger.log(level, message, { stack });
    }
}

module.exports = Logger;