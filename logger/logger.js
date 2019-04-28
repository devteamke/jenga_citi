const winston = require('winston');
const path = require('path');
const moment = require('moment')
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
const myFormat = printf(info => {
  return `${info.level}: ${info.message}   ${info.timestamp}`;
});
// Set this to whatever, by default the path of the script.
var logPath = __dirname;

const tsFormat = () => (new Date().toISOString());

const errorLog = winston.createLogger({

  format: combine(
  
    timestamp({format:'h:mm:a,  Do MMMM  YYYY,'}),
    format.colorize(),
    myFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logPath, 'errors.log'),
      timestamp: tsFormat,
      level: 'error'})
  ]
});

const infoLog = winston.createLogger({
  format: combine(
   
    timestamp({format:'h:mm:a,  Do MMMM  YYYY,'}),
    format.colorize(),
    myFormat
  ),
  transports: [
       new winston.transports.Console(),
      new winston.transports.File({
      filename: path.join(logPath, 'info.log'),
      timestamp: tsFormat,
      level: 'info'})
  ]
});


    module.exports = {
        errorLog: errorLog,
        infoLog: infoLog
    };