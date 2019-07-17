const FS = require('fs');

const Logging = require('../components/logging');

exports.main = main;
async function main() {
	try {
		await require('./01-configure').main();
		await require('./02-mkfs').main();
		await require('./03-create-backingfiles').main();
		await require('./04-readonly-root-fs').main();
		Logging.setupInfo('Setup complete');
	} catch (ex) {
		Logging.fatalSetupError(ex.message); // exits
	}
}
