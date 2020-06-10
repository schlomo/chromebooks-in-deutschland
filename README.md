# Chromebooks in Deutschland

Sources for the website https://chromebooks-in-deutschland.de/

Please freel free to submit pull requests for features and bugfixes, they will be greatly appreciated.

## Development

* **For Owners** [Setup credentials to run](https://firebase.google.com/docs/functions/local-emulator?authuser=0#set_up_admin_credentials_optional) `firebase functions:shell` (and remember to remove the credentials).
* Use `npm run dev` to start local development web server for frontend development.
* [Integromat](https://www.integromat.com/) used for email notifications for Cloud Build results based on Push Subscription to web hook from `cloud-build` Pub/Sub topic.