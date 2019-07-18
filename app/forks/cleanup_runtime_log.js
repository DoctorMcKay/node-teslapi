// This script exists because the following task might be a bit memory-intensive, so spinning it off to its own process
// allows us to not worry about the memory getting garbage collected. The process will run and exist, and all its
// memory will be immediately freed.

try {
	require('../components/logging').cleanupRuntimeLog();
} catch (ex) {
	// don't care; log file probably doesn't exist
}
