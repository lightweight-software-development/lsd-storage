#LSD Storage

A component for persistently storing updates to an application and synchronising them with other instances of the application.

Updates from the current device are stored in browser storage if offline, and in a remote store (currently AWS S3) when next online.
Updates made on other devices by the same user, and optionally by other users, are detected when online, 
applied to the application and cached in browser storage so they will be available offline.
