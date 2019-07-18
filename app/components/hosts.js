const FS = require('fs').promises;

const {exec} = require('./exec');

/**
 * Check if a given host is reachable.
 * @param {string} host
 * @returns {Promise<boolean>}
 */
exports.isHostReachable = async function(host) {
	// Check if we have an override file
	try {
		let file = await FS.readFile('/mnt/mutable/override_host_reachable.txt');
		if (file) {
			return file.slice(0, 1).toString('ascii') == '1';
		}
	} catch (ex) {
		// file probably doesn't exist; that's fine
	}

	let pingResponse = await exec(`ping -c 3 ${host}`);
	let match = pingResponse.match(/(\d+) received/);
	return !!(match && match[1] > 0);
};
