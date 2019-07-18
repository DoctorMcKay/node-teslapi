const FS = require('fs');

const System = require('./system');

const SETUP_LOG_PATH = '/boot/teslapi-setup.log';
const RUNTIME_LOG_PATH = '/mnt/mutable/teslapi-runtime.log';

/**
 * @param {string} msg
 */
exports.fatalSetupError = function(msg) {
	console.error('setup: [FATAL] ' + msg);
	writeToLog(SETUP_LOG_PATH, `[FATAL] ${msg}`);
	System.setLedSteadyBlink(50, 50);
	process.exit(1);
};

/**
 * @param {string} msg
 */
exports.setupInfo = function(msg) {
	console.log('setup: [info] ' + msg);
	writeToLog(SETUP_LOG_PATH, `[info] ${msg}`);
};

/**
 * @param {string} msg
 */
exports.runtimeInfo = function(msg) {
	console.log('[info] ' + msg);
	writeToLog(RUNTIME_LOG_PATH, `[info] ${msg}`);
};

/**
 * @param {string} msg
 * @param {boolean} [fatal=false]
 */
exports.runtimeError = function(msg, fatal) {
	console.log(`[${fatal ? 'FATAL' : 'error'}] ${msg}`);
	writeToLog(RUNTIME_LOG_PATH, `[${fatal ? 'FATAL' : 'error'}] ${msg}`);
	if (fatal) {
		System.setLedSteadyBlink(50, 50);
		process.exit(1);
	}
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
