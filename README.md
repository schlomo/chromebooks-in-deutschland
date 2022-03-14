# Chromebooks in Deutschland

Sources for the website https://chromebooks-in-deutschland.de/

Please freel free to submit pull requests for features and bugfixes, they will be greatly appreciated.

## Development

* **For Owners** [Setup credentials to run](https://firebase.google.com/docs/functions/local-emulator?authuser=0#set_up_admin_credentials_optional) `firebase functions:shell` (and remember to remove the credentials). Otherwise everything should work without credentials using the emulator.
* Use `yarn start` to start local development web server for frontend development with all Firebase emulators active. Can load full database dump from `backup.json` (create by downloading `/api/data` from production), will generate random prices otherwise.
* Device data is now static JSON, only dynamic data is in database
* [Integromat](https://www.integromat.com/) used for email notifications for Cloud Build results based on Push Subscription to web hook from `cloud-build` Pub/Sub topic.
* https://iconify.design/docs/icon-bundles/ explains about local icon bundles
* Lambda function can be tested locally via [SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-invoke.html), `pip install aws-sam-cli` in a `venv`
* Lambda deployment is via [terragrunt](https://terragrunt.gruntwork.io/) and needs [terraform](https://www.terraform.io/) and [sops](https://github.com/mozilla/sops

## Running the Agent

* Agents need keys in the database under `/keys`, emulator uses dummy key for local testing
* Optimum agent run interval seems to be 7 minutes

### Cronjob

Agent (download pecompiled binary from [Releases](../../releases/)) can be run with a script like this from a CRON job:

```sh
#!/bin/bash
cd "$(dirname "$(readlink -f "$0")")"

export CID_API_KEY=THE_SECRET_KEY
export CID_API_URL=https://DOMAIN_NAME/api

bins=( updateprice*linux* )
bin=${bins[-1]}

result="$(./$bin)"
if ! grep -q "OK: 1" <<<"$result" ; then
    echo "$result"
    exit 1
fi
```

(Make sure that the pattern matches the binaries that you use!)

Agent (from a source checkout checkout out to `./chromebooks-in-deutschland`) can be run with a script like this:

```sh
#!/bin/bash
cd "$(dirname "$(readlink -f "$0")")"

export CID_API_KEY=THE_SECRET_KEY
export CID_API_URL=https://DOMAIN_NAME/api

cd chromebooks-in-deutschland/functions

result="$(node updateprice.js)"
if ! grep -q "OK: 1" <<<"$result" ; then
    echo "$result"
    exit 1
fi
```

### Systemd Unit and Docker

The agent can be also run as a [Docker](https://github.com/schlomo/chromebooks-in-deutschland/pkgs/container/chromebooks-in-deutschland) container. On Debian/Ubuntu simply install the `chromebooks-in-deutschland-service` [Debian package](systemd/) from the [Releases](../../releases/). Make sure to create the configuration file `/etc/chromebooks-in-deutschland.env`. It has to set the API key like this:

```sh
CID_API_KEY=some-api-key-uuid
```

This works on ARM (32/64bit) and X86_64. If you have `curl` and `jq` installed then you can get the URL for the latest DEB package like this:

```sh
curl -s https://api.github.com/repos/schlomo/chromebooks-in-deutschland/releases | jq -r '.[0].assets | .[] | select(.content_type == "application/x-debian-package").browser_download_url'
```

#### Special Use Cases

* On Raspberry Pi 1 consider modifying the unit to have a longer timeout, e.g. 600 seconds, to accomodate longer startup and image pull times.
* On ODROID C1+ I had to use host networking to get Docker to work on the old 3.10 kernel.
* If running on SD cards and having enough RAM, consider mounting `/var/lib/docker` on `tmpfs` to reduce the load on the SD card.

## Adding Chromebooks

Chromebooks are described in JSON structures under [chromebooks](chromebooks/). We use one file per vendor and per release year. The files must be sorted alphabetically (use a JSON sort tool for that).

For datasheet we try to link to the vendors original documentation. Sources for that are:

* <https://psref.lenovo.com/>
* <https://pcb.inc.hp.com/webapp/>

Pull requests with more devices are most welcome!
