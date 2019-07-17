const exec = require('child_process').execSync;
const FS = require('fs');

const Logging = require('../components/logging');
const System = require('../components/system');

const INHERIT_STDIO = {"stdio": "inherit"};

try {
	FS.writeFileSync('/root/.test', '');
	// If we got this far, then the file system isn't read-only already
	FS.unlinkSync('/root/.test');
} catch (ex) {
	// File system is already read-only
	Logging.setupInfo('Root filesystem is already read-only');
	return;
}

Logging.setupInfo('Making root filesystem read-only');
Logging.setupInfo('Removing unwanted packages');

exec('apt-get remove -y --force-yes --purge triggerhappy logrotate dphys-swapfile', INHERIT_STDIO);
exec('apt-get -y --force-yes autoremove --purge', INHERIT_STDIO);
exec('apt-get -y --force-yes install ntp busybox-syslogd', INHERIT_STDIO);
exec('dpkg --purge rsyslog', INHERIT_STDIO);

Logging.setupInfo('Configuring /boot/cmdline.txt');
let cmdline = FS.readFileSync('/boot/cmdline.txt').toString('utf8').split('\n')[0].trim();
if (!cmdline.includes('noswap ro')) {
	cmdline += ' fastboot noswap ro';
	FS.writeFileSync('/boot/cmdline.txt', cmdline + '\n');
}

// Move fake-hwclock.data to the mutable partition
FS.mkdirSync('/mnt/mutable/etc');
exec('mv /etc/fake-hwclock.data /mnt/mutable/etc/fake-hwclock.data');
FS.symlinkSync('/mnt/mutable/etc/fake-hwclock.data', '/etc/fake-hwclock.data');

FS.mkdirSync('/mnt/mutable/configs');

// Move /var/spool to /tmp
exec('rm -rf /var/spool');
FS.symlinkSync('/tmp', '/var/spool');

let varconf = '';
FS.readFileSync('/usr/lib/tmpfiles.d/var.conf').toString('utf8').split('\n').forEach((line) => {
	if (line.includes('/var/spool')) {
		line = line.replace('0755', '1777');
	}

	varconf += line + '\n';
});
FS.writeFileSync('/usr/lib/tmpfiles.d/var.conf', varconf);

// Move dhcpd.resolv.conf to tmpfs
exec('mv /etc/resolv.conf /tmp/dhcpcd.resolv.conf');
FS.symlinkSync('/tmp/dhcpcd.resolv.conf', '/etc/resolv.conf');

let fstab = '';
FS.readFileSync('/etc/fstab').toString('utf8').split('\n').forEach((line) => {
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

FS.writeFileSync('/etc/fstab', fstab);
//System.reboot();
