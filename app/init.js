// This is the init script for teslapi.
// It will check which setup tasks still need to be run and run them, if needed.
// Then it will run the archive task.

const exec = require('child_process').execSync;
const FS = require('fs');

const Logging = require('./components/logging');

let currentUser = exec('whoami').toString('utf8').trim();
if (currentUser != 'root') {
	Logging.fatalSetupError(`TeslaPi init script needs to be run as root; ran as ${currentUser}`); // exits
}

main();
async function main() {
	await require('./setup/00-run').main();
}
