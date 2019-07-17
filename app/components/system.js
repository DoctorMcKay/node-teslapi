const exec = require('child_process').execSync;
const FS = require('fs');
const HTTPS = require('https');

let g_DeviceLedBlinkCount = 0;
let g_DeviceLedShotFd = null;

exports.setLedSteadyBlink = function(msOn, msOff) {
	if (g_DeviceLedShotFd) {
		FS.closeSync(g_DeviceLedShotFd);
		g_DeviceLedShotFd = null;
		g_DeviceLedBlinkCount = 0;
	}

	FS.writeFileSync('/sys/class/leds/led0/trigger', 'timer');
	FS.writeFileSync('/sys/class/leds/led0/delay_on', msOn.toString());
	FS.writeFileSync('/sys/class/leds/led0/delay_off', msOff.toString());
};

exports.setLedBlinkCount = function(blinkCount) {
	if (!g_DeviceLedShotFd) {
		FS.writeFileSync('/sys/class/leds/led0/trigger', 'oneshot');
		FS.writeFileSync('/sys/class/leds/led0/invert', '1');
		FS.writeFileSync('/sys/class/leds/led0/delay_on', '1');
		FS.writeFileSync('/sys/class/leds/led0/delay_off', '100'); // blink for 100ms on each shot
		g_DeviceLedShotFd = FS.openSync('/sys/class/leds/led0/shot', 'a');
	}

	g_DeviceLedBlinkCount = blinkCount;
};

exports.checkInternetConnectivity = function() {
	return new Promise((resolve, reject) => {
		let req = HTTPS.get('https://www.google.com', (res) => {
			res.on('error', (err) => {
				resolve(false); // not connected
			});

			let hasData = false;
			res.on('data', () => {
				hasData = true;
			});

			res.on('end', () => {
				resolve(hasData);
			});
		});

		req.on('error', (err) => {
			resolve(false); // not connected
		});
	});
};

exports.reboot = function() {
	exec('reboot');
};

doLedBlink();
async function doLedBlink() {
	for (let i = 0; i < g_DeviceLedBlinkCount; i++) {
		blinkLed();
		await sleep(400);
	}

	setTimeout(doLedBlink, 2000);
}

function blinkLed() {
	FS.writeSync(g_DeviceLedShotFd, '1', 0);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
