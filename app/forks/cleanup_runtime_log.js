// This script exists because the following task might be a bit memory-intensive, so spinning it off to its own process
// allows us to not worry about the memory getting garbage collected. The process will run and exist, and all its
// memory will be immediately freed.

require('../components/logging').cleanupRuntimeLog();
