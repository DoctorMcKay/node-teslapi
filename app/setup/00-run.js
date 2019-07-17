const FS = require('fs');

const Logging = require('../components/logging');

try {
	require('./01-mkfs');
	require('./02-create-backingfiles');
} catch (ex) {
	Logging.fatalSetupError(ex.message); // exits
}
