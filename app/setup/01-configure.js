const Dotenv = require('dotenv');
const exec = require('child_process').execSync;
const FS = require('fs');

const Logging = require('../components/logging');
const System = require('../components/system');

const BOOT_PARTITION_CONFIG_FILE_PATH = '/boot/teslapi_setup.conf';
const LOCAL_CONFIG_FILE_PATH = __dirname + '/../config.json';

if (!FS.existsSync(BOOT_PARTITION_CONFIG_FILE_PATH)) {
	// No config file to use
	Logging.setupInfo(BOOT_PARTITION_CONFIG_FILE_PATH + ' does not exist, not reconfiguring');

	if (!FS.existsSync(LOCAL_CONFIG_FILE_PATH)) {
		// No local config and no config file on boot partition? panic!
		Logging.fatalSetupError(`No configuration file is present at ${BOOT_PARTITION_CONFIG_FILE_PATH}`);
	}

	return;
}

// We don't check if we're already configured, because we want users to be able to reconfigure without having to reflash

// Are we read-only?
try {
	FS.writeFileSync('/root/.test', '');
	FS.unlinkSync('/root/.test');
} catch (ex) {
	// read-only fs, make it rw
	exec('/root/bin/remount_fs_rw.sh');
}

// Parse the config file in the boot partition
let config = Dotenv.parse(FS.readFileSync(BOOT_PARTITION_CONFIG_FILE_PATH));
// TODO

System.reboot();
