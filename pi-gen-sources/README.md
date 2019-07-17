### Building a teslapi image

*Much of the image building code is borrowed from [marcone/teslausb](https://github.com/marcone/teslausb/tree/main-dev/pi-gen-sources).*

To build a ready to flash one-step setup image, all you need to do is download and run `build-image.sh`.

```shell
$ curl https://raw.githubusercontent.com/DoctorMcKay/node-teslapi/master/pi-gen-sources/build-image.sh | bash
```

`sudo` will be used to install necessary dependencies and to run the actual build. You will be prompted for your sudo
password, if your machine is configured to require one.

Assuming everything works, the built image will be in `pi-gen/deploy`.
