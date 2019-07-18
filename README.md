# TeslaPi

This is a project based on [teslausb](https://github.com/marcone/teslausb). It is an image meant to be flashed to a
Raspberry Pi Zero W which allows the Pi to interface with a Tesla vehicle via USB.

**This is a work-in-progress and is not yet usable.**

## Features

- Exposes a FAT32 USB storage device to the car for dashcam storage
- Allows for archiving dashcam clips to a CIFS (SMB) share when connected to Wi-Fi
- More to come in the future

## Installation

Prepare a Pi Zero W and a micro SD card (at least 64 GB is recommended, but 32 GB should also work well enough).
Using a high endurance SD card wouldn't be a bad idea.

Download the latest [image](https://github.com/DoctorMcKay/node-teslapi/releases) and flash it to the card using
a tool like Etcher.

**Installing TeslaPi on a pre-flashed OS is not supported at this time. Please use the provided TeslaPi images.**

Mount the boot partition of the newly-flashed SD card and rename `teslapi_setup.conf.sample` to `teslapi_setup.conf`,
then open it in a text editor. Configure at least everything marked as "REQUIRED". Save the configuration file, dismount
the card, insert it into the Pi, and plug the Pi into power.

**Make sure that you're within range of your Wi-Fi network when you first plug the Pi into power. A Wi-Fi connection
with Internet access is required to finish setup.**

TeslaPi will automatically configure itself using the settings you entered in the configuration file. The LED on the Pi
will indicate status during setup:

1. On semi-steadily with occasional pulses: booting up
2. One flash: Writing config files
3. Steady slow flashes: Waiting for Internet connectivity
4. Two flashes: Creating and formatting partitions on the SD card
5. Three flashes: Allocating space for the virtual disk
6. Four flashes: Converting root filesystem to read-only
7. Steady fast flashes: There was a fatal error. Please mount the SD card's boot partition on a computer and examine `teslapi-setup.log` for details.

While TeslaPi is configuring itself, you can SSH into it using USB ethernet. Plug it into your PC via the Pi's USB data
port (not its power port) and an ethernet adapter will appear on your PC. USB ethernet is disabled once setup is complete.

The Pi will reboot a couple times automatically during the setup procedure.

### Building From Source

You can build your own image from the latest source, if you wish. Follow the instructions in the
[pi-gen-sources](https://github.com/DoctorMcKay/node-teslapi/tree/master/pi-gen-sources) readme.
