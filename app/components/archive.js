const FS1 = require('fs');
const FS = require('fs').promises;
const Path = require('path');
const StdLib = require('@doctormckay/stdlib');

const Logging = require('./logging');

exports.moveFiles = async function(sourceDir, destinationDir) {
	return await doMoveFiles(sourceDir, sourceDir, destinationDir);
};

async function doMoveFiles(basePath, sourceDir, destinationDir) {
	let dirContents = await FS.readdir(sourceDir);
	for (let i = 0; i < dirContents; i++) {
		if (dirContents[i].indexOf('.') === 0) {
			continue; // skip dotfiles
		}

		let fullPath = Path.join(sourceDir, dirContents[i]);
		let stat = await FS.stat(fullPath);
		if (stat.isDirectory()) {
			// Recursively process directories
			await doMoveFiles(basePath, fullPath, destinationDir);
			// This directory should now be empty
			try {
				await FS.rmdir(fullPath);
			} catch (ex) {
				Logging.runtimeError(`Unable to remove directory ${fullPath}: ${ex.message}`);
			}
		} else {
			// It's a file
			let destinationPath = Path.join(destinationDir, fullPath.replace(basePath, ''));
			await FS.mkdir(Path.dirname(destinationPath), {"recursive": true});
			await new Promise((resolve) => {
				Logging.runtimeInfo(`Moving ${fullPath} -> ${destinationPath} (${StdLib.Units.humanReadableBytes(stat.size)})`);
				let startTime = Date.now();
				let writeStream = FS1.createWriteStream(destinationPath);
				let readStream = FS1.createReadStream(fullPath);
				readStream.pipe(writeStream);
				readStream.on('end', async () => {
					let elapsed = Date.now() - startTime;
					let bytesPerSecond = Math.round((stat.size / elapsed) / 1000);
					Logging.runtimeInfo(`Moving complete in ${elapsed} milliseconds (${StdLib.Units.humanReadableBytes(bytesPerSecond)}/sec). Deleting original.`);
					await FS.unlink(fullPath);
					resolve();
				});
			});
		}
	}
}
