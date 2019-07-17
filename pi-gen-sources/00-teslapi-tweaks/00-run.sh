#!/bin/bash -e
# install -m 755 files/rc.local		"${ROOTFS_DIR}/etc/"
install -m 666 files/teslapi_setup.json.sample    "${ROOTFS_DIR}/boot/"
install -m 755 files/node           "${ROOTFS_DIR}/bin/"

install -d "${ROOTFS_DIR}/root/app"
install -d "${ROOTFS_DIR}/root/app/components"
install -d "${ROOTFS_DIR}/root/app/setup"
install -d "${ROOTFS_DIR}/root/bin"

install -m 700 files/bin/* "${ROOTFS_DIR}/root/bin"
install -m 700 files/app/* "${ROOTFS_DIR}/root/app"
install -m 700 files/app/components/* "${ROOTFS_DIR}/root/app/components"
install -m 700 files/app/setup/* "${ROOTFS_DIR}/root/app/setup"

# Below here is the rest of the stage2 (builds the Stretch lite image)
# run script commented out just to give guidance on things that can be done.

# on_chroot << EOF
# systemctl disable hwclock.sh
# systemctl disable nfs-common
# systemctl disable rpcbind
# systemctl disable ssh
# systemctl enable regenerate_ssh_host_keys
# EOF

# if [ "${USE_QEMU}" = "1" ]; then
# 	echo "enter QEMU mode"
# 	install -m 644 files/90-qemu.rules "${ROOTFS_DIR}/etc/udev/rules.d/"
# 	on_chroot << EOF
# systemctl disable resize2fs_once
# EOF
# 	echo "leaving QEMU mode"
# else
# 	on_chroot << EOF
# systemctl enable resize2fs_once
# EOF
# fi

# on_chroot << \EOF
# for GRP in input spi i2c gpio; do
# 	groupadd -f -r "$GRP"
# done
# for GRP in adm dialout cdrom audio users sudo video games plugdev input gpio spi i2c netdev; do
#   adduser pi $GRP
# done
# EOF

# on_chroot << EOF
# setupcon --force --save-only -v
# EOF

# on_chroot << EOF
# usermod --pass='*' root
# EOF

# rm -f "${ROOTFS_DIR}/etc/ssh/"ssh_host_*_key*
