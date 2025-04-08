const chalk = require('chalk');

function logInfo(msg) {
  console.log(chalk.blue('ℹ️  INFO:'), msg);
}

function logSuccess(msg) {
  console.log(chalk.green('✅ SUCCESS:'), msg);
}

function logWarning(msg) {
  console.warn(chalk.yellow('⚠️  WARNING:'), msg);
}

function logError(msg) {
  console.error(chalk.red('❌ ERROR:'), msg);
}

module.exports = {
  logInfo,
  logSuccess,
  logWarning,
  logError,
};
