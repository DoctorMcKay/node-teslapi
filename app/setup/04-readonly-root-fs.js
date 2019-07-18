const {exec} = require('../components/exec');
const FS = require('fs').promises;

const Logging = require('../components/logging');
const System = require('../components/system');

const INHERIT_STDIO = {"stdio": "inherit"};

exports.main = main;
async function main() {
	let cmdline = (await FS.readFile('/boot/cmdline.txt')).toString('utf8').split('\n')[0].trim();
	if (cmdline.includes('noswap ro')) {
		// File system is already read-only
		Logging.setupInfo('Root filesystem is already read-only');
		return;
	}

	System.setLedBlinkCount(4);

	Logging.setupInfo('Making root filesystem read-only');
	Logging.setupInfo('Removing unwanted packages');

	await exec('apt-get remove -y --force-yes --purge triggerhappy logrotate dphys-swapfile', INHERIT_STDIO);
	await exec('apt-get -y --force-yes autoremove --purge', INHERIT_STDIO);
	await exec('apt-get -y --force-yes install ntp busybox-syslogd', INHERIT_STDIO);
	await exec('dpkg --purge rsyslog', INHERIT_STDIO);

	Logging.setupInfo('Configuring /boot/cmdline.txt');

	cmdline += ' fastboot noswap ro';
	cmdline = cmdline.replace('dwc2,g_ether', 'dwc2'); // once we reach this stage, USB ethernet is no longer needed
	await FS.writeFile('/boot/cmdline.txt', cmdline + '\n');

	// Move fake-hwclock.data to the mutable partition
	await FS.mkdir('/mnt/mutable/etc');
	await exec('mv /etc/fake-hwclock.data /mnt/mutable/etc/fake-hwclock.data');
	await FS.symlink('/mnt/mutable/etc/fake-hwclock.data', '/etc/fake-hwclock.data');

	await FS.mkdir('/mnt/mutable/configs');

	// Move /var/spool to /tmp
	await exec('rm -rf /var/spool');
	await FS.symlink('/tmp', '/var/spool');

	let varconf = '';
	(await FS.readFile('/usr/lib/tmpfiles.d/var.conf')).toString('utf8').split('\n').forEach((line) => {
		if (line.includes('/var/spool')) {
			line = line.replace('0755', '1777');
		}

		varconf += line + '\n';
	});
	await FS.writeFile('/usr/lib/tmpfiles.d/var.conf', varconf);

	// Move dhcpd.resolv.conf to tmpfs
	await exec('mv /etc/resolv.conf /tmp/dhcpcd.resolv.conf');
	await FS.symlink('/tmp/dhcpcd.resolv.conf', '/etc/resolv.conf');

	let fstab = '';
	(await FS.readFile('/etc/fstab')).toString('utf8').split('\n').forEach((line) => {
		line = line.trim();
		if (line.length == 0) {
			return;
		}

		let match = line.match(/\/boot\s+vfat\s+(\S+)/);
		if (match) {
			// boot partition
			line = line.replace(match[1], match[1] + ',ro');
		}

		match = line.match(/\/\s+ext4\s+(\S+)/);
		if (match) {
			// root partition
			line = line.replace(match[1], match[1] + ',ro');
		}

		fstab += line + '\n';
	});

	if (!fstab.includes('tmpfs /var/log')) {
		fstab += 'tmpfs /var/log tmpfs nodev,nosuid 0 0\n';
	}
	if (!fstab.includes('tmpfs /var/tmp')) {
		fstab += 'tmpfs /var/tmp tmpfs nodev,nosuid 0 0\n';
	}
	if (!fstab.includes('tmpfs /tmp')) {
		fstab += 'tmpfs /tmp tmpfs nodev,nosuid 0 0\n';
	}

	await FS.writeFile('/etc/fstab', fstab);
	System.reboot();
}
