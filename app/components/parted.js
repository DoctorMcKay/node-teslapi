const {exec} = require('./exec');

const DISK_PATH = '/dev/mmcblk0';

exports.listPartitions = async function() {
	let response = {"partitions": []};
	(await exec(`parted -m ${DISK_PATH} unit B print`)).split('\n').forEach((line) => {
		let parts = line.trim().split(':');
		if (parts[0] == DISK_PATH) {
			// Disk metadata
			response.diskSizeBytes = bytesToNumber(parts[1]);
		} else if (parts[0].match(/\d+/)) {
			response.partitions.push({
				"partitionNumber": parseInt(parts[0], 10),
				"startBytes": bytesToNumber(parts[1]),
				"endBytes": bytesToNumber(parts[2]),
				"sizeBytes": bytesToNumber(parts[3]),
				"filesystem": parts[4]
			});
		}
	});

	return response;
};

exports.createPartition = async function(filesystem, startByte, endByteOrPercent) {
	await exec(`parted -a optimal -m ${DISK_PATH} unit B mkpart primary ${filesystem} ${startByte} ${endByteOrPercent}`);
};

exports.formatXfs = async function(label, partitionNumber) {
	await exec(`mkfs.xfs -f -m reflink=1 -L ${label} ${DISK_PATH}p${partitionNumber}`);
};

exports.formatExt4 = async function(label, partitionNumber) {
	await exec(`mkfs.ext4 -F -L ${label} ${DISK_PATH}p${partitionNumber}`);
};

exports.getDiskIdentifier = async function() {
	return (await exec(`fdisk -l ${DISK_PATH}`)).match(/Disk identifier: 0x([0-9a-f]{8})/)[1];
};

exports.getMountedDisks = async function() {
	let disks = {};
	(await exec('mount')).split('\n').forEach((line) => {
		// This will not find disks that are mounted at a mountpoint containing a space, but only a wacko would do that anyway
		let match = line.match(/(\/[^ ]+) on (\/[^ ]+) type ([^ ]+)/);
		if (match) {
			disks[match[2]] = {
				"mountpoint": match[2],
				"disk": match[1],
				"filesystem": match[3]
			};
		}
	});

	return disks;
};

exports.mountDisk = async function(mountpoint) {
	let mountedDisks = await exports.getMountedDisks();
	if (!mountedDisks[mountpoint]) {
		await exec(`mount ${mountpoint}`);
	}
};

exports.unmountDisk = async function(mountpoint) {
	let mountedDisks = await exports.getMountedDisks();
	if (mountedDisks[mountpoint]) {
		await exec(`umount ${mountpoint}`);
	}
};

function bytesToNumber(value) {
	return parseInt(value.replace('B', ''), 10);
}
