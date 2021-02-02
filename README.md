# Chromebooks in Deutschland

Sources for the website https://chromebooks-in-deutschland.de/

Please freel free to submit pull requests for features and bugfixes, they will be greatly appreciated.

## Development

* **For Owners** [Setup credentials to run](https://firebase.google.com/docs/functions/local-emulator?authuser=0#set_up_admin_credentials_optional) `firebase functions:shell` (and remember to remove the credentials). Otherwise everything should work without credentials using the emulator.
* Use `yarn start` to start local development web server for frontend development with all Firebase emulators active. Can load full database dump from `backup.json` (create by downloading `/api/data` from production), will generate random prices otherwise.
* Device data is now static JSON, only dynamic data is in database
* [Integromat](https://www.integromat.com/) used for email notifications for Cloud Build results based on Push Subscription to web hook from `cloud-build` Pub/Sub topic.
* https://iconify.design/docs/icon-bundles/ explains about local icon bundles
* Agents need keys in the database under `/keys`, emulator creates dummy key for local testing
* Agent can be run like this with a binary:

    ```sh
    #!/bin/bash
    cd "$(dirname "$(readlink -f "$0")")"

    export CID_API_KEY=THE_SECRET_KEY
    export CID_API_URL=https://DOMAIN_NAME/api

    bins=( updateprice*linux )
    bin=${bins[-1]}

    result="$(./$bin)"
    if ! grep -q "OK: 1" <<<"$result" ; then
        echo "$result"
        exit 1
    fi
    ```
    Or like this from source:
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