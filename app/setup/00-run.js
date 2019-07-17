const FS = require('fs');

const Logging = require('../components/logging');

try {
	require('./01-mkfs');
} catch (ex) {
	Logging.fatalSetupError(ex.message); // exits
}
