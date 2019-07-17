const FS = require('fs');

const Logging = require('../components/logging');

try {
	require('./01-configure');
	require('./02-mkfs');
	require('./03-create-backingfiles');
	require('./04-readonly-root-fs');
	Logging.setupInfo('Setup complete');
} catch (ex) {
	Logging.fatalSetupError(ex.message); // exits
}
