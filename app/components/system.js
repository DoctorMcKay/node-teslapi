const exec = require('child_process').execSync;

exports.reboot = function() {
	exec('reboot');
};
