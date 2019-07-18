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

	// This isn't documented, but if archive_type is blank or omitted, then we won't configure the archive destination.
	// This is designed for cases where someone is reconfiguring a previously-configured TeslaPi instance but doesn't
	// want to change their archive destination.
	if (config.archive_type) {
		if (config.archive_type != 'cifs') {
			Logging.fatalSetupError(`Got unexpected archive_type "${config.archive_type}". "cifs" expected.`);
		}

		if (!config.archive_cifs_host || !config.archive_cifs_share) {
			Logging.fatalSetupError('Missing one of archive_cifs_host or archive_cifs_share');
		}

		Logging.setupInfo(`Configuring cifs archive destination //${config.archive_cifs_host}/${config.archive_cifs_share}`);
		await FS.writeFile('/root/.cifsArchiveCredentials', `username=${config.archive_cifs_username || ''}\npassword=${config.archive_cifs_password || ''}\n`);
		let fstab = '';
		(await FS.readFile('/etc/fstab')).toString('ascii').split('\n').forEach((line) => {
			line = line.trim();
			if (line.includes('/mnt/remote_archive')) {
				// Skip line with config of any old archive destination
			}

			fstab += line + '\n';
		});

		fstab += `//${config.archive_cifs_host}/${config.archive_cifs_share} /mnt/remote_archive cifs vers=${config.archive_cifs_version || '3.0'},credentials=/root/.cifsArchiveCredentials,iocharset=utf8,file_mode=0777,dir_mode=0777 0\n`;
		await FS.writeFile('/etc/fstab', fstab);
		Logging.setupInfo('Wrote CIFS mount info to /etc/fstab');
	}

	await FS.writeFile(LOCAL_CONFIG_FILE_PATH, JSON.stringify(config, undefined, '\t'));
	await FS.unlink(BOOT_PARTITION_CONFIG_FILE_PATH);

	System.reboot();
}
