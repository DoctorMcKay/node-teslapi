const Dotenv = require('dotenv');
const FS = require('fs').promises;

const {exec} = require('../components/exec');
const Logging = require('../components/logging');
const System = require('../components/system');

const BOOT_PARTITION_CONFIG_FILE_PATH = '/boot/teslapi_setup.conf';
const LOCAL_CONFIG_FILE_PATH = __dirname + '/../config.json';

exports.main = main;
async function main() {
	if (!require('fs').existsSync(BOOT_PARTITION_CONFIG_FILE_PATH)) {
		// No config file to use
		Logging.setupInfo(BOOT_PARTITION_CONFIG_FILE_PATH + ' does not exist, not reconfiguring');

		if (!require('fs').existsSync(LOCAL_CONFIG_FILE_PATH)) {
			// No local config and no config file on boot partition? panic!
			Logging.fatalSetupError(`No configuration file is present at ${BOOT_PARTITION_CONFIG_FILE_PATH}`);
		}

		return;
	}

	System.setLedBlinkCount(1);

	// We don't check if we're already configured, because we want users to be able to reconfigure without having to reflash

	// Are we read-only?
	try {
		await FS.writeFile('/root/.test', '');
		await FS.unlink('/root/.test');
	} catch (ex) {
		// read-only fs, make it rw
		await exec('/root/bin/remount_fs_rw.sh');
	}

	// Parse the config file in the boot partition
	Logging.setupInfo(`Parsing ${BOOT_PARTITION_CONFIG_FILE_PATH}`);
	let config = Dotenv.parse(await FS.readFile(BOOT_PARTITION_CONFIG_FILE_PATH));

	// Configure wpa_supplicant
	if (config.wifi_ssid && config.wifi_pass) {
		Logging.setupInfo('Configuring wpa_supplicant');
		let networkConfig = '';
		(await exec(`wpa_passphrase "${config.wifi_ssid}"`, {"input": config.wifi_pass})).split('\n').forEach((line) => {
			if (line.match(/^\s*#/) || line.trim().length == 0) {
				// this line is a comment (or blank). skip it
				return;
			}

			networkConfig += line + '\n';
		});

		let wpaSupplicant = 'ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n';
		wpaSupplicant += 'update_config=1\n';
		wpaSupplicant += `country=${config.wifi_country || 'US'}\n\n`;
		wpaSupplicant += networkConfig;

		Logging.setupInfo('Installing new /etc/wpa_supplicant/wpa_supplicant.conf');
		await FS.writeFile('/etc/wpa_supplicant/wpa_supplicant.conf', wpaSupplicant);
	}

	await FS.writeFile(LOCAL_CONFIG_FILE_PATH, JSON.stringify(config, undefined, '\t'));
	await FS.unlink(BOOT_PARTITION_CONFIG_FILE_PATH);

	System.reboot();
}
