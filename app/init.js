// This is the init script for teslapi.
// It will check which setup tasks still need to be run and run them, if needed.
// Then it will run the archive task.

const FS = require('fs');

const Logging = require('./components/logging');

if (process.env.USER != 'root') {
	Logging.fatalSetupError(`TeslaPi init script needs to be run as root; ran as ${process.env.USER}`); // exits
}

require('./setup/00-run');
