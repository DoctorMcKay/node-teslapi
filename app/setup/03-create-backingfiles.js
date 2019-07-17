const FS = require('fs');

const Logging = require('../components/logging');
const Parted = require('../components/parted');
const Vdisk = require('../components/vdisk');

const CAM_DISK_FILE = '/mnt/backingfiles/cam_disk.bin';
const CAM_MOUNTPOINT = '/mnt/cam';
const MASS_STORAGE_CONF_FILE = '/etc/modprobe.d/g_mass_storage.conf';

if (FS.existsSync(CAM_DISK_FILE)) {
	Logging.setupInfo(CAM_DISK_FILE + ' already exists; not creating a cam disk file');
	return;
}

let {partitions} = Parted.listPartitions();
let diskSize = partitions[3].sizeBytes * 0.9; // only use 90% of the disk, to give ourselves some breathing room just in case

Logging.setupInfo('Allocating cam_disk.bin file');
Vdisk.allocate(Math.round(diskSize / 1000), CAM_DISK_FILE);

let partitionOffset = Vdisk.getFirstPartitionOffset(CAM_DISK_FILE);
Logging.setupInfo(`Vdisk first partition offset = ${partitionOffset}`);

Logging.setupInfo('Creating cam disk loop device');
Vdisk.setupLoopDevice(CAM_DISK_FILE, partitionOffset);

Logging.setupInfo('Formatting cam disk as FAT32');
Vdisk.formatVfat('CAM');
Vdisk.destroyLoopDevice();

// Update /etc/fstab
let fstab = '';
FS.readFileSync('/etc/fstab').toString('utf8').split('\n').forEach((line) => {
	if (line.includes(CAM_DISK_FILE)) {
		// Skip this line because we don't want to add it twice
		return;
	}

	fstab += line + '\n';
});

fstab += `${CAM_DISK_FILE} ${CAM_MOUNTPOINT} vfat utf8,noauto,users,umask=000,offset=${partitionOffset} 0 0\n`;
FS.writeFileSync('/etc/fstab', fstab);

Logging.setupInfo('Updated /etc/fstab for cam vdisk');

Parted.mountDisk(CAM_MOUNTPOINT);
FS.mkdirSync(`${CAM_MOUNTPOINT}/TeslaCam`);
Parted.unmountDisk(CAM_MOUNTPOINT);

FS.writeFileSync(MASS_STORAGE_CONF_FILE, `options g_mass_storage file=${CAM_DISK_FILE} removable=1 ro=0 stall=0 iSerialNumber=123456\n`);
Logging.setupInfo('Vdisk created successfully');
