// This is the init script for teslapi.
// It will check which setup tasks still need to be run and run them, if needed.
// Then it will run the archive task.

const exec = require('child_process').execSync;

const Archive = require('./components/archive');
const {fork} = require('./components/exec');
const Hosts = require('./components/hosts');
const Logging = require('./components/logging');
const Parted = require('./components/parted');
const System = require('./components/system');
const Vdisk = require('./components/vdisk');

const MOUNTPOINT_VDISK_CAM = '/mnt/cam';
const MOUNTPOINT_REMOTE_ARCHIVE = '/mnt/remote_archive';

let currentUser = exec('whoami').toString('utf8').trim();
if (currentUser != 'root') {
	Logging.fatalSetupError(`TeslaPi init script needs to be run as root; ran as ${currentUser}`); // exits
}

let config = {};

main();
async function main() {
	await require('./setup/00-run').main();

	await fork('cleanup_runtime_log');

	config = require('./config.json');

	// Setup is complete. Time to run our task loop.
	taskLoop();
}

const State = {
	"Startup": 0,                                   // We've just started up. Nothing has happened except for setup.
	"MountedToCar": 1,                              // The vdisk is currently mounted to the car and clips are probably being written
	"ArchivingClips": 2,                            // The vdisk is unmounted from the car, and clips are being archived
	"WaitingForArchiveToBecomeUnreachable": 3,      // Archiving is complete. Vdisk is mounted to car, and we're waiting for network connectivity loss at which point we will flip to MountedToCar state
};

let g_CurrentState = State.Startup;
let g_CountArchiveFailures = 0;

async function taskLoop() {
	try {
		Logging.runtimeInfo(`Running task loop. Current state: ${g_CurrentState}`);
		let newState = null;

		switch (g_CurrentState) {
			case State.Startup:
				// We need to mount the vdisk to the car
				System.setLedSteadyBlink(50, 50);
				Logging.runtimeInfo('In Startup state. Connecting vdisk to car.');
				await Parted.unmountDisk(MOUNTPOINT_VDISK_CAM);
				await Parted.unmountDisk(MOUNTPOINT_REMOTE_ARCHIVE);
				await Vdisk.connectToHost();
				newState = State.MountedToCar;
				break;

			case State.MountedToCar:
				// See if the archive server is available and if it is, mount it
				Logging.runtimeInfo('In MountedToCar state. Checking if archive server is accessible.');
				if (config.archive_cifs_host && await Hosts.isHostReachable(config.archive_cifs_host)) {
					Logging.runtimeInfo(`Archive host ${config.archive_cifs_host} is reachable.`);
					await Vdisk.disconnectFromHost();
					await Parted.mountDisk(MOUNTPOINT_VDISK_CAM);
					await Parted.mountDisk(MOUNTPOINT_REMOTE_ARCHIVE);
					newState = State.ArchivingClips;
				}
				break;

			case State.ArchivingClips:
				// This is a special case in that it will perform work, then immediately transition to a new state.
				// But, if there's an error, then it won't transition. On the next go-round, we'll check if the archive
				// is still accessible and if not, then we'll transition.
				// Work can also take a long time, so the task loop might not run again for a while.
				Logging.runtimeInfo('In ArchivingClips state. Checking if archive server is accessible.');
				if (!await Hosts.isHostReachable(config.archive_cifs_host)) {
					Logging.runtimeInfo(`Archive host ${config.archive_cifs_host} is no longer reachable.`);
					await Parted.unmountDisk(MOUNTPOINT_VDISK_CAM);
					await Parted.unmountDisk(MOUNTPOINT_REMOTE_ARCHIVE);
					await Vdisk.connectToHost();
					newState = State.MountedToCar;
					break;
				}

				// Just make sure they're still mounted
				await Parted.mountDisk(MOUNTPOINT_VDISK_CAM);
				await Parted.mountDisk(MOUNTPOINT_REMOTE_ARCHIVE);

				// Run fsck to fix any corruption
				Logging.runtimeInfo('Running fsck on cam vdisk to fix any corruption');
				await Vdisk.fixErrors(MOUNTPOINT_VDISK_CAM);

				// Archive server is still reachable, so we should still be connected to it.
				try {
					await Archive.moveFiles(`${MOUNTPOINT_VDISK_CAM}/TeslaCam/SavedClips`, MOUNTPOINT_REMOTE_ARCHIVE);
				} catch (ex) {
					// we don't want to transition into a new state yet because we don't know if this was a transient
					// error, or if the archive host is really gone
					Logging.runtimeError(`Error occurred while archiving TeslaCam/SavedClips: ${ex.message}\n${ex.trace}`);
					if (++g_CountArchiveFailures >= 10) {
						Logging.runtimeError(`${g_CountArchiveFailures} archive failures. Assuming unrecoverable error.`, true);
					}

					break;
				}

				// Archiving succeeded. Unmount things and transition.
				g_CountArchiveFailures = 0;
				Logging.runtimeInfo(`Archiving to cifs destination //${config.archive_cifs_host}/${config.archive_cifs_share} succeeded. Unmounting disks and reattaching to host.`);
				await Parted.unmountDisk(MOUNTPOINT_VDISK_CAM);
				await Parted.unmountDisk(MOUNTPOINT_REMOTE_ARCHIVE);
				await Vdisk.connectToHost();
				newState = State.WaitingForArchiveToBecomeUnreachable;
				break;

			case State.WaitingForArchiveToBecomeUnreachable:
				let isArchiveReachable = await Hosts.isHostReachable(config.archive_cifs_host);
				Logging.runtimeInfo(`In WaitingForArchiveToBecomeUnreachable state. Is reachable: ${isArchiveReachable}`);
				if (!isArchiveReachable) {
					newState = State.MountedToCar;
				}
				break;

			default:
				Logging.runtimeError(`In unknown state: ${g_CurrentState}!!`);
		}

		if (newState) {
			Logging.runtimeInfo(`Transitioning from state ${g_CurrentState} to state ${newState}`);
			g_CurrentState = newState;

			switch (newState) {
				case State.MountedToCar:
					System.setLedSteadyBlink(100, 900);
					break;

				case State.ArchivingClips:
					System.setLedSteadyBlink(900, 100);
					break;

				case State.WaitingForArchiveToBecomeUnreachable:
					System.setLedHeartbeatBlink();
					break;
			}
		}
	} catch (ex) {
		Logging.runtimeError(`Error occurred in task loop: ${ex.message}\n${ex.stack}`);
	}

	setTimeout(taskLoop, 10000); // re-run task loop after 10 seconds
}
