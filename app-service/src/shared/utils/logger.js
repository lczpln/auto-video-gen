/**
 * Simplified logger utility for use in JS modules
 */

function createLogger(moduleName) {
  return {
    info: (message, ...args) => {
      console.log(
        `[${new Date().toISOString()}] [${moduleName}] [info]: ${message}`,
        ...args
      );
    },
    warn: (message, ...args) => {
      console.warn(
        `[${new Date().toISOString()}] [${moduleName}] [warn]: ${message}`,
        ...args
      );
    },
    error: (message, ...args) => {
      console.error(
        `[${new Date().toISOString()}] [${moduleName}] [error]: ${message}`,
        ...args
      );
    },
    debug: (message, ...args) => {
      console.debug(
        `[${new Date().toISOString()}] [${moduleName}] [debug]: ${message}`,
        ...args
      );
    },
  };
}

module.exports = {
  createLogger,
};
