const ChildProcess = require('child_process');
const Path = require('path');

/**
 * @param {string} command
 * @param {object} [options]
 */
exports.exec = function(command, options) {
	return new Promise((resolve, reject) => {
		options = options || {};

		let proc = ChildProcess.exec(command, options, (err, stdout) => {
			if (err) {
				return reject(err);
			}

			resolve(stdout);
		});

		proc.stdin.end(options.input);
	});
};

/**
 * @param {string} moduleName - The filename of the module you want to execute. Must reside in forks directory.
 * @param {array} [args]
 * @param {object} [options]
 * @returns {Promise<int>} - Resolves to exit code
 */
exports.fork = function(moduleName, args, options) {
	return new Promise((resolve) => {
		let proc = ChildProcess.fork(Path.join(__dirname, '..', 'forks', moduleName), args, options);
		proc.on('exit', (code) => {
			resolve(code);
		});
	});
};
