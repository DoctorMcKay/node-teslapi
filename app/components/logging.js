const exec = require('child_process').execSync;
const FS = require('fs');

const SETUP_LOG_PATH = '/boot/teslapi-setup.log';

/**
 * @param {string} msg
 */
exports.fatalSetupError = function(msg) {
	console.error('[FATAL] ' + msg);
	writeToLog(SETUP_LOG_PATH, `[FATAL] ${msg}`);
	exec('halt');
	process.exit(1);
};

/**
 * @param {string} msg
 */
exports.setupInfo = function(msg) {
	console.log('[info] ' + msg);
	writeToLog(SETUP_LOG_PATH, `[info] ${msg}`);
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

function writeToLog(logFile, msg) {
	try {
		FS.appendFileSync(logFile, timestamp() + ' ' + msg + '\n');
	} catch (ex) {
		// whatever, fs is probably read-only
	}
}
