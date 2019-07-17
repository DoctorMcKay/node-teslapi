const ChildProcess = require('child_process');

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
