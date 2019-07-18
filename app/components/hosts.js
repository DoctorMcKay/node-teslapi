const {exec} = require('./exec');

/**
 * Check if a given host is reachable.
 * @param {string} host
 * @returns {Promise<boolean>}
 */
exports.isHostReachable = async function(host) {
	let pingResponse = await exec(`ping -c 3 ${host}`);
	let match = pingResponse.match(/(\d+) received/);
	return !!(match && match[1] > 0);
};
