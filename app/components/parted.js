const exec = require('child_process').execSync;

const DISK_PATH = '/dev/mmcblk0';

exports.listPartitions = function() {
	let response = {"partitions": []};
	exec(`parted -m ${DISK_PATH} unit B print`).toString('ascii').split('\n').forEach((line) => {
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

exports.createPartition = function(filesystem, startByte, endByteOrPercent) {
	exec(`parted -a optimal -m ${DISK_PATH} unit B mkpart primary ${filesystem} ${startByte} ${endByteOrPercent}`);
};

exports.formatXfs = function(label, partitionNumber) {
	exec(`mkfs.xfs -f -m reflink=1 -L ${label} ${DISK_PATH}p${partitionNumber}`);
};

exports.formatExt4 = function(label, partitionNumber) {
	exec(`mkfs.ext4 -F -L ${label} ${DISK_PATH}p${partitionNumber}`);
};

exports.getDiskIdentifier = function() {
	return exec(`fdisk -l ${DISK_PATH}`).toString('utf8').match(/Disk identifier: 0x([0-9a-f]{8})/)[1];
};

exports.mountAllDisks = function() {
	exec('mount -a');
};

exports.mountDisk = function(mountpoint) {
	exec(`mount ${mountpoint}`);
};

exports.unmountDisk = function(mountpoint) {
	exec(`umount ${mountpoint}`);
};

function bytesToNumber(value) {
	return parseInt(value.replace('B', ''), 10);
}
