SHELL=bash
BUILDDIR=../build/debian-build
VERSION=$(shell sed -e 's/v//' ../VERSION)
OUTDIR=../dist

.PHONY: info build repo deb install clean

info: deb
	dpkg-deb -I ${OUTDIR}/*.deb
	dpkg-deb -c ${OUTDIR}/*.deb

build:	clean
	mkdir -p ${OUTDIR} ${BUILDDIR}
	cp -r src/* DEBIAN ${BUILDDIR}/
	sed -i -e "/Version/s/Version.*/Version: ${VERSION}/" ${BUILDDIR}/DEBIAN/control
	chmod -R g-w+rX,o+rX ${BUILDDIR}

deb: build
	fakeroot dpkg -b ${BUILDDIR} ${OUTDIR}
	rm -Rf ${BUILDDIR}
	lintian --suppress-tags dir-in-usr-local,file-in-usr-local,dir-or-file-in-opt,changelog-file-missing-in-native-package,diversion-for-unknown-file,binary-without-manpage,no-copyright-file,file-in-etc-not-marked-as-conffile,privacy-breach-facebook,debian-changelog-file-missing -i ${OUTDIR}/*.deb

repo: deb
	../../putinrepo.sh ${OUTDIR}/*.deb

clean:
	rm -fr ${OUTDIR}/*.deb ${BUILDDIR}
