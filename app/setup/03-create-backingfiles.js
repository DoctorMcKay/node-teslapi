const FS = require('fs').promises;

const Logging = require('../components/logging');
const Parted = require('../components/parted');
const System = require('../components/system');
const Vdisk = require('../components/vdisk');

const CAM_DISK_FILE = '/mnt/backingfiles/cam_disk.bin';
const CAM_MOUNTPOINT = '/mnt/cam';
const MASS_STORAGE_CONF_FILE = '/etc/modprobe.d/g_mass_storage.conf';

exports.main = main;
async function main() {
	if (require('fs').existsSync(CAM_DISK_FILE)) {
		Logging.setupInfo(CAM_DISK_FILE + ' already exists; not creating a cam disk file');
		return;
	}

	System.setLedBlinkCount(3);

	let {partitions} = await Parted.listPartitions();
	let diskSize = partitions[3].sizeBytes * 0.9; // only use 90% of the disk, to give ourselves some breathing room just in case

	Logging.setupInfo('Allocating cam_disk.bin file');
	await Vdisk.allocate(Math.round(diskSize / 1000), CAM_DISK_FILE);

	let partitionOffset = await Vdisk.getFirstPartitionOffset(CAM_DISK_FILE);
	Logging.setupInfo(`Vdisk first partition offset = ${partitionOffset}`);

	Logging.setupInfo('Creating cam disk loop device');
	await Vdisk.setupLoopDevice(CAM_DISK_FILE, partitionOffset);

	Logging.setupInfo('Formatting cam disk as FAT32');
	await Vdisk.formatVfat('CAM');
	await Vdisk.destroyLoopDevice();

	// Update /etc/fstab
	let fstab = '';
	(await FS.readFile('/etc/fstab')).toString('ascii').split('\n').forEach((line) => {
		if (line.includes(CAM_DISK_FILE)) {
			// Skip this line because we don't want to add it twice
			return;
		}

		fstab += line + '\n';
	});

	fstab += `${CAM_DISK_FILE} ${CAM_MOUNTPOINT} vfat utf8,noauto,users,umask=000,offset=${partitionOffset} 0 0\n`;
	await FS.writeFile('/etc/fstab', fstab);

	Logging.setupInfo('Updated /etc/fstab for cam vdisk');

	await Parted.mountDisk(CAM_MOUNTPOINT);
	await FS.mkdir(`${CAM_MOUNTPOINT}/TeslaCam`);
	await Parted.unmountDisk(CAM_MOUNTPOINT);

	await FS.writeFile(MASS_STORAGE_CONF_FILE, `options g_mass_storage file=${CAM_DISK_FILE} removable=1 ro=0 stall=0 iSerialNumber=123456\n`);
	Logging.setupInfo('Vdisk created successfully');
}
