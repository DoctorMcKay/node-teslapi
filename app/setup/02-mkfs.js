const FS = require('fs').promises;

const Logging = require('../components/logging');
const Parted = require('../components/parted');
const System = require('../components/system');

const MUTABLE_PARTITION_SIZE_BYTES = 104857600; // 100 MiB

exports.main = main;
async function main() {
	// Wait for Internet connection
	Logging.setupInfo('Waiting for Internet connection...');
	System.setLedSteadyBlink(500, 500);
	let connected = false;
	for (let i = 0; i < 60; i++) {
		connected = await System.checkInternetConnectivity();
		if (connected) {
			break;
		}

		// not connected yet
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	if (!connected) {
		// 60 seconds and not connected
		Logging.fatalSetupError('No internet connection detected in 60 seconds');
	}

	// Okay, we're connected to the internet now
	Logging.setupInfo('Internet connection successfully established');

	let existingPartitions = await Parted.listPartitions();
	if (existingPartitions.partitions.length == 4 && existingPartitions.partitions[2].filesystem == 'ext4' && existingPartitions.partitions[3].filesystem == 'xfs') {
		Logging.setupInfo('Partitions are already created');
		if (!require('fs').existsSync('/mnt/mutable/.setup') || !require('fs').existsSync('/mnt/backingfiles/.setup')) {
			Logging.fatalSetupError('Partitions are created, but not mounted properly');
		}

		return;
	} else if (existingPartitions.partitions.length != 2) {
		Logging.fatalSetupError(`Cannot proceed with setup as there are ${existingPartitions.partitions.length} existing partitions (expected 2)`);
	}

	System.setLedBlinkCount(2);

	let mutableStart = existingPartitions.partitions[1].endBytes + 1;
	let mutableEnd = mutableStart + MUTABLE_PARTITION_SIZE_BYTES;
	Logging.setupInfo(`Creating partition 3 for mutable partition (ext4 filesystem) from ${mutableStart} to ${mutableEnd}`);
	await Parted.createPartition('ext4', mutableStart, mutableEnd);

	// This is necessary because optimal alignment mode doesn't exactly use the byte we request
	// TODO: Maybe someday make the backingfiles partition also optimal
	let {partitions} = await Parted.listPartitions();
	mutableEnd = partitions[2].endBytes;

	Logging.setupInfo(`Creating partition 4 for backingfiles partition (xfs filesystem) from ${mutableEnd + 1} to end of disk`);
	await Parted.createPartition('xfs', mutableEnd + 1, '100%');

	Logging.setupInfo('Formatting partition 3 as ext4');
	await Parted.formatExt4('mutable', 3);

	Logging.setupInfo('Formatting partition 4 as xfs');
	await Parted.formatXfs('backingfiles', 4);

	Logging.setupInfo('Partitioning complete');

	// Create mount points
	await FS.mkdir('/mnt/mutable');
	await FS.mkdir('/mnt/backingfiles');
	await FS.mkdir('/mnt/cam');
	await FS.mkdir('/mnt/snapshot_cam');
	//await FS.mkdir('/mnt/remote_archive'); // This is created in the 01-configure setup script

	let diskIdentifier = await Parted.getDiskIdentifier();
	Logging.setupInfo(`New disk identifier: ${diskIdentifier}`);

	let fstab = (await FS.readFile('/etc/fstab')).toString('ascii');
	fstab = fstab.replace(/PARTUUID=[0-9a-f]{8}/g, `PARTUUID=${diskIdentifier}`);
	fstab += `PARTUUID=${diskIdentifier}-03 /mnt/mutable ext4 auto,rw 0 2\n`;
	fstab += `PARTUUID=${diskIdentifier}-04 /mnt/backingfiles xfs auto,rw,noatime 0 2\n`;
	await FS.writeFile('/etc/fstab', fstab);
	Logging.setupInfo('/etc/fstab updated');

	let cmdline = (await FS.readFile('/boot/cmdline.txt')).toString('ascii');
	cmdline = cmdline.replace(/PARTUUID=[0-9a-f]{8}/g, `PARTUUID=${diskIdentifier}`);
	await FS.writeFile('/boot/cmdline.txt', cmdline);
	Logging.setupInfo('/boot/cmdline.txt updated');

	await Parted.mountDisk('/mnt/mutable');
	await Parted.mountDisk('/mnt/backingfiles');
	await FS.writeFile('/mnt/mutable/.setup', 'Don\'t delete or move this file or teslapi won\'t boot anymore.\n');
	await FS.writeFile('/mnt/backingfiles/.setup', 'Don\'t delete or move this file or teslapi won\'t boot anymore.\n');
}
