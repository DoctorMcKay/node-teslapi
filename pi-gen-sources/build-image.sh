#!/bin/sh

sudo apt-get install coreutils quilt parted qemu-user-static debootstrap zerofree zip dosfstools bsdtar libcap2-bin grep rsync xz-utils file git curl

rm -rf pi-gen
git clone https://github.com/RPi-Distro/pi-gen
cd pi-gen

echo IMG_NAME=teslapi > config
echo ENABLE_SSH=1 >> config
rm -rf stage2/EXPORT_NOOBS stage3 stage4 stage5
mkdir stage7
touch stage7/EXPORT_IMAGE
cp stage2/prerun.sh stage7/prerun.sh

mkdir temp
cd temp
curl -L https://github.com/DoctorMcKay/node-teslapi/archive/master.zip > master.zip
unzip master.zip
cp -R node-teslapi-master/pi-gen-sources/00-teslapi-tweaks ../stage7
cp -R node-teslapi-master/app ../stage7/00-teslapi-tweaks/files
cp -R node-teslapi-master/bin ../stage7/00-teslapi-tweaks/files
curl -L https://nodejs.org/dist/v10.16.0/node-v10.16.0-linux-armv6l.tar.xz > node-v10.16.0-linux-armv6l.tar.xz
tar -xf node-v10.16.0-linux-armv6l.tar.xz
mv node-v10.16.0-linux-armv6l/bin/node ../stage7/00-teslapi-tweaks/files/node
cd ..
rm -rf temp
chmod +x stage7/00-teslapi-tweaks/00-run.sh

sudo ./build.sh
