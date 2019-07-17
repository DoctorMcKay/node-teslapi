const exec = require('child_process').execSync;

exports.allocate = function(sizeInKb, filename) {
	exec(`fallocate -l ${sizeInKb}K "${filename}"`);
	exec(`sfdisk ${filename}`, {"input": "type=c"});
};

exports.getFirstPartitionOffset = function(filename) {
	let sizeInBytes = getSecondLineNumber(exec(`sfdisk -l -o Size -q --bytes "${filename}"`));
	let sizeInSectors = getSecondLineNumber(exec(`sfdisk -l -o Sectors -q "${filename}"`));
	let sectorSize = sizeInBytes / sizeInSectors;
	let partitionStartSector = getSecondLineNumber(exec(`sfdisk -l -o Start -q "${filename}"`));
	return partitionStartSector * sectorSize;
};

exports.setupLoopDevice = function(filename, offset) {
	exec(`losetup -o ${offset} loop0 "${filename}"`);
};

exports.formatVfat = function(label) {
	exec(`mkfs.vfat /dev/loop0 -F 32 -n "${label}"`);
};

exports.destroyLoopDevice = function() {
	exec(`losetup -d /dev/loop0`);
};

exports.connectToHost = function() {
	exec('modprobe g_mass_storage');
};

exports.disconnectFromHost = function() {
	exec('modprobe -r g_mass_storage');
};

exports.fixErrors = function(mountpoint) {
	// Find the backing file location
	let backingFile = null;
	exec('mount').toString('utf8').split('\n').forEach((line) => {
		if (line.includes(mountpoint)) {
			backingFile = line.split(' ')[0];
		}
	});

	if (!backingFile) {
		return 'Could not find backing file in mount output';
	}

	// Find the loopback device it's mounted with
	let loopbackDevice = null;
	exec('losetup -l').toString('utf8').split('\n').forEach((line) => {
		if (line.includes(backingFile)) {
			loopbackDevice = line.split(' ')[0];
		}
	});

	if (!loopbackDevice) {
		return 'Could not find loopback device in losetup output';
	}

	return exec(`fsck "${loopbackDevice}" -- -a`);
};

function getSecondLineNumber(str) {
	return parseInt(str.toString('ascii').split('\n')[1].trim(), 10);
}