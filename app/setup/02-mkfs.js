const FS = require('fs');

const Logging = require('../components/logging');
const Parted = require('../components/parted');

const MUTABLE_PARTITION_SIZE_BYTES = 104857600; // 100 MiB

let existingPartitions = Parted.listPartitions();
if (existingPartitions.partitions.length == 4 && existingPartitions.partitions[2].filesystem == 'ext4' && existingPartitions.partitions[3].filesystem == 'xfs') {
	Logging.setupInfo('Partitions are already created');
	if (!FS.existsSync('/mnt/mutable/.setup') || !FS.existsSync('/mnt/backingfiles/.setup')) {
		Logging.fatalSetupError('Partitions are created, but not mounted properly');
	}

	return;
} else if (existingPartitions.partitions.length != 2) {
	throw new Error(`Cannot proceed with setup as there are ${existingPartitions.partitions.length} existing partitions (expected 2)`);
}

let mutableStart = existingPartitions.partitions[1].endBytes + 1;
let mutableEnd = mutableStart + MUTABLE_PARTITION_SIZE_BYTES;
Logging.setupInfo(`Creating partition 3 for mutable partition (ext4 filesystem) from ${mutableStart} to ${mutableEnd}`);
Parted.createPartition('ext4', mutableStart, mutableEnd);

// This is necessary because optimal alignment mode doesn't exactly use the byte we request
// TODO: Maybe someday make the backingfiles partition also optimal
let {partitions} = Parted.listPartitions();
mutableEnd = partitions[2].endBytes;

Logging.setupInfo(`Creating partition 4 for backingfiles partition (xfs filesystem) from ${mutableEnd + 1} to end of disk`);
Parted.createPartition('xfs', mutableEnd + 1, '100%');

Logging.setupInfo('Formatting partition 3 as ext4');
Parted.formatExt4('mutable', 3);

Logging.setupInfo('Formatting partition 4 as xfs');
Parted.formatXfs('backingfiles', 4);

Logging.setupInfo('Partitioning complete');

// Create mount points
FS.mkdirSync('/mnt/mutable');
FS.mkdirSync('/mnt/backingfiles');
FS.mkdirSync('/mnt/cam');
FS.mkdirSync('/mnt/snapshot_cam');
FS.mkdirSync('/mnt/remote');

let diskIdentifier = Parted.getDiskIdentifier();
Logging.setupInfo(`New disk identifier: ${diskIdentifier}`);

let fstab = FS.readFileSync('/etc/fstab').toString('utf8');
fstab = fstab.replace(/PARTUUID=[0-9a-f]{8}/g, `PARTUUID=${diskIdentifier}`);
fstab += `PARTUUID=${diskIdentifier}-03 /mnt/mutable ext4 auto,rw 0 2\n`;
fstab += `PARTUUID=${diskIdentifier}-04 /mnt/backingfiles xfs auto,rw,noatime 0 2\n`;
FS.writeFileSync('/etc/fstab', fstab);
Logging.setupInfo('/etc/fstab updated');

let cmdline = FS.readFileSync('/boot/cmdline.txt').toString('utf8');
cmdline = cmdline.replace(/PARTUUID=[0-9a-f]{8}/g, `PARTUUID=${diskIdentifier}`);
FS.writeFileSync('/boot/cmdline.txt', cmdline);
Logging.setupInfo('/boot/cmdline.txt updated');

Parted.mountAllDisks();
FS.writeFileSync('/mnt/mutable/.setup', 'Don\'t delete or move this file or teslapi won\'t boot anymore.\n');
FS.writeFileSync('/mnt/backingfiles/.setup', 'Don\'t delete or move this file or teslapi won\'t boot anymore.\n');
