const FS = require('fs');

const SETUP_LOG_PATH = '/boot/teslapi-setup.log';

/**
 * @param {string} msg
 */
exports.fatalSetupError = function(msg) {
	console.error('[FATAL] ' + msg);
	FS.appendFileSync(SETUP_LOG_PATH, timestamp() + ` [FATAL] ${msg}\n`);
	// TODO blink LED
	process.exit(1);
};

/**
 * @param {string} msg
 */
exports.setupInfo = function(msg) {
	console.log('[info] ' + msg);
	FS.appendFileSync(SETUP_LOG_PATH, timestamp() + ` [info] ${msg}\n`);
};

function timestamp() {
	let d = new Date();
	return d.getFullYear() + '-' +
		(d.getMonth() + 1).toString().padStart(2, '0') + '-' +
		d.getDate().toString().padStart(2, '0') + ' ' +
		d.getHours().toString().padStart(2, '0') + ':' +
		d.getMinutes().toString().padStart(2, '0') + ':' +
		d.getSeconds().toString().padStart(2, '0');
}
