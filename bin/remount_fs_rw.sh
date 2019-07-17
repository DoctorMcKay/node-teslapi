#!/bin/sh

echo Remounting / as read/write
mount / -o remount,rw
echo Remounting /boot as read/write
mount /boot -o remount,rw

echo Filesystem is now writable. Reboot once all necessary changes have been made.
echo Filesystems / and /boot will mount as read-only at next boot.
