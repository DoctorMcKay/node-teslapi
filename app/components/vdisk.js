const {exec} = require('./exec');
const Logging = require('./logging');

exports.allocate = async function(sizeInKb, filename) {
	await exec(`fallocate -l ${sizeInKb}K "${filename}"`);
	await exec(`sfdisk ${filename}`, {"input": "type=c"});
};

exports.getFirstPartitionOffset = async function(filename) {
	let sizeInBytes = getSecondLineNumber(await exec(`sfdisk -l -o Size -q --bytes "${filename}"`));
	let sizeInSectors = getSecondLineNumber(await exec(`sfdisk -l -o Sectors -q "${filename}"`));
	let sectorSize = sizeInBytes / sizeInSectors;
	let partitionStartSector = getSecondLineNumber(await exec(`sfdisk -l -o Start -q "${filename}"`));
	return partitionStartSector * sectorSize;
};

exports.setupLoopDevice = async function(filename, offset) {
	await exec(`losetup -o ${offset} loop0 "${filename}"`);
};

exports.formatVfat = async function(label) {
	await exec(`mkfs.vfat /dev/loop0 -F 32 -n "${label}"`);
};

exports.destroyLoopDevice = async function() {
	await exec(`losetup -d /dev/loop0`);
};

exports.connectToHost = async function() {
	await exec('modprobe g_mass_storage');
};

exports.disconnectFromHost = async function() {
	await exec('modprobe -r g_mass_storage');
};

exports.fixErrors = async function(mountpoint) {
	// Find the backing file location
	let backingFile = null;
	(await exec('mount')).split('\n').forEach((line) => {
		if (line.includes(mountpoint)) {
			backingFile = line.split(' ')[0];
		}
	});

	if (!backingFile) {
		return 'Could not find backing file in mount output';
	}

	// Find the loopback device it's mounted with
	let loopbackDevice = null;
	(await exec('losetup -l')).split('\n').forEach((line) => {
		if (line.includes(backingFile)) {
			loopbackDevice = line.split(' ')[0];
		}
	});

	if (!loopbackDevice) {
		return 'Could not find loopback device in losetup output';
	}

	try {
		await exec(`fsck "${loopbackDevice}" -- -a`, {"stdio": "inherit"});
	} catch (ex) {
		// fsck returns non-zero only if it found errors
		Logging.runtimeInfo(`fsck found (and hopefully corrected) errors on ${mountpoint}`);
	}
};

function getSecondLineNumber(str) {
	return parseInt(str.split('\n')[1].trim(), 10);
}
