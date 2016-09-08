#LSD Storage

A component for persistently storing updates to an application and synchronising them with other instances of the application.

It currently replays all the updates ever made into the application to recreate the current state.  Future developments
may include a way to create snapshots and load them into the application, followed by only the most recent updates.

###In a browser
Updates from the current device are stored in browser storage if offline, and in a remote store (currently AWS S3) when next online.
Updates made on other devices by the same user, and by other users for data that is shared, are detected when online, 
applied to the application and cached in browser storage so they will be available offline.

If the application is loaded in a new browser, all updates are downloaded from the remote store, applied to the application, and cached.

###In a server
LSD storage can also be used in a server-side application, but in this case the local storage is not used as it expects to be online all the time.
When the application starts up, all the updates are retrieved from the remote store and applied to the application to load the current state.

## How it works

!(design/diagrams/Lsd_Storage_Overview.png "LSD in a browser")

## Using it in an application

## Development