const exec = require('child_process').execSync;
const FS = require('fs');

const Logging = require('../components/logging');
const System = require('../components/system');

const BOOT_PARTITION_CONFIG_FILE_PATH = '/boot/teslapi_setup.json';
const LOCAL_CONFIG_FILE_PATH = __dirname + '/../config.json';

if (!FS.existsSync(BOOT_PARTITION_CONFIG_FILE_PATH)) {
	// No config file to use
	Logging.setupInfo(BOOT_PARTITION_CONFIG_FILE_PATH + ' does not exist, not reconfiguring');
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

try {
	FS.unlinkSync(LOCAL_CONFIG_FILE_PATH);
} catch (ex) {
	// don't care if it doesn't already exist
}

exec(`mv ${BOOT_PARTITION_CONFIG_FILE_PATH} ${LOCAL_CONFIG_FILE_PATH}`);

// TODO

System.reboot();
