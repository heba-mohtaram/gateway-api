const {createLogger, format, transports} = require('winston'),
    path = require('path');

/*
   This module is written for formatting logs throughout the code. Example:
    - logger.info('Hello world!');
    - logger.debug('Debugging info!');
    - logger.warn("This is a warning!");
    - logger.verbose("Verbose!");
    - logger.error("Error message!");
 */
const logger = createLogger({
    level: 'debug', //debug displays all logs, info displays only info logs
    format: format.combine(
        format.label({label: path.basename(process.mainModule.filename)}),
        format.colorize(),
        format.timestamp(),
        format.printf(info => `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`)
    ),
    transports: [new transports.Console()]
});

module.exports = logger;