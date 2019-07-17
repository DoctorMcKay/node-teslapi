const FS = require('fs');

const SETUP_LOG_PATH = '/boot/teslapi-setup.log';

/**
 * @param {string} msg
 */
exports.fatalSetupError = function(msg) {
	console.error('[FATAL] ' + msg);
	FS.appendFileSync(SETUP_LOG_PATH, `[FATAL] ${msg}\n`);
	// TODO blink LED
	process.exit(1);
};

/**
 * @param {string} msg
 */
exports.setupInfo = function(msg) {
	console.log('[info] ' + msg);
	FS.appendFileSync(SETUP_LOG_PATH, `[info] ${msg}\n`);
};
