#LSD Storage

A component for persistently storing updates to an application and synchronising them with other instances of the application.

It currently replays all the updates ever made into the application to recreate the current state.  Future developments
may include a way to create snapshots and load them into the application, followed by only the most recent updates.

LSD Storage is designed for use with the [Lightweight Software Development (LSD)](https://github.com/lightweight-software-development/lsd-overview) 
approach, and works well with the other LSD components,  but it could also be used on its own.

*Note: This component is working in demonstration applications, but it is not yet suitable for production use.*

###In a browser
Updates from the current device are stored in browser storage if offline, and in a remote store (currently AWS S3) when next online.
Updates made on other devices by the same user, and by other users for data that is shared, are detected when online, 
applied to the application and cached in browser storage so they will be available offline.

If the application is loaded in a new browser, all updates are downloaded from the remote store, applied to the application, and cached.

###In a server
LSD storage can also be used in a server-side application, but in this case the local storage is not used as it expects to be online all the time.
When the application starts up, all the updates are retrieved from the remote store and applied to the application to load the current state.

## How it works in a browser app

![LSD Storage diagram](design/diagrams/LSD_Storage_Overview.png "LSD in a browser")

### Updates from the current user
- The Application state is the business model for the whole application.  It can be a mutable object, 
but in LSD the state is normally an immutable object that returns a new instance when an update is applied to it.
- The State Controller holds the latest application state instance and notifies the View when it changes
- The View sends updates to the State Controller, which applies them to the Application State and sends them to the Persistent Store
- The Persistent Store stores the new update locally, and also in the remote store if the browser is online and logged in
- If the Persistent Store cannot save updates to the remote store immediately, it does so when the browser is next online

### Updates from elsewhere
- When online, the Persistent Store get external updates from the remote store.  These come from either the same user on another device, or from other users
  if the application has shared data
- The Persistent Store sends the external updates to the State Controller, which applies them to the Application State and notifies the View of the changed state
- The Persistent Store also stores the external updates in the local browser storage so they do not need to be downloaded again
  
### Startup
- When the application is started, the Persistent Store loads the cached updates from the local store to recreate the Application State
- If it is online, the Persistent Store also looks for new external updates immediately

### Validation
- If the Application State rejects an update from the user, it is not stored
- External updates are validated when they are shared, and applied before local user updates, so there should not normally be any errors when they are applied.
  However this cannot be guaranteed due to the nature of synchronising independent updates from different places, so the application needs a way of dealing with it.  
  
  
  
## How it works in a server app

![LSD Storage diagram](design/diagrams/LSD_Storage_Server.png "LSD in a server")

### Updates from client interface
- The Application state is the business model for the whole application.  It can be a mutable object, 
but in LSD the state is normally an immutable object that returns a new instance when an update is applied to it.
- The State Controller holds the latest application state instance and notifies the View when it changes
- The Client Interface sends updates to the State Controller, which applies them to the Application State and sends them to the Persistent Store
- The Persistent Store stores the new update in the remote store

### Updates from elsewhere
- The Persistent Store get external updates from the remote store.  
- The Persistent Store sends the external updates to the State Controller, which applies them to the Application State and notifies the Client interface of the changed state
  
### Startup
- When the application is started, the Persistent Store loads all the updates so far from the remote store to recreate the Application State

### Validation
- If the Application State rejects an update from the Client Interface, it is not stored.
  

  
## How updates are shared between users  

Some applications may not share data between users - for example a personal reminder system.  Other applications, such as a team calendar, 
may need everyone in a team to see all the data.  There may also be applications that share some data, but where users also have private data,
even if it is just application preferences.

To allow for this, the remote store has a separate area for each user to read and write, and a one shared that the users can only read from.
The browser application Persistent Store writes to its own user area, and gets updates from the shared area and also the user area (to get updates made on other devices).
For sharing, the updates of types that are shared need to be *promoted* from each user area to the shared area.  
They also need to be validated, otherwise a malicious user could forge updates. 

Data is promoted by running a server process with the same Application State as a normal application and a Promoter as its client logic.  
LSD Storage includes a Promoter that has code to assist in creating a Lambda function that can be notified by S3 when a new update is added


![LSD Storage data sharing diagram](design/diagrams/LSD_Storage_Shared.png "LSD Promoter")

##Data sets
A *data set* argument is required when creating a Persistent Store.  This is usually `main` but it can be changed to any other name
to access a different set of data updates in the same application instance, maybe for demo or experimentation.


## Authentication
Browser and server applications need to be allowed access to AWS resources.  This can happen in three ways:
- **Cognito Identity** - used in the browser to allow the Persistent Store to write directly to S3
- **Built-in** - applications running in AWS Lambda get the permissions configured for the the Lambda function
- **Access key** - tests running in Node and other applications can use Access Key/Secret Key authentication


## Using it in an application
Future development should make this simpler, but for now you need to create instances of several objects and wire them together.
Here is an example from a demo application:
```javascript
   function startApp(instanceConfig) {
       const appName = "lsdbooks"
       const dataSetParam = location.search.match(/dataSet=(\w+)/)
       const dataSetOverride = dataSetParam && dataSetParam[1]
       const dataSet = dataSetOverride || "main"
   
       const dataBucketName = `${appName}-${instanceConfig.instanceName}-data` 
   
       const appStore = new StateController(new Books())
   
       const localStore = new LocalStorageUpdateStore(appName, dataSet)
       const googleSigninTracker = new GoogleSignin.Tracker()
       const cognitoCredentialsSource = new CognitoCredentialsSource(instanceConfig.identityPoolId)
       googleSigninTracker.signIn.sendTo(cognitoCredentialsSource.signIn)
       const remoteStore = new S3UpdateStore(dataBucketName,
           Apps.defaultUserAreaPrefix, Apps.defaultSharedAreaPrefix,
           appName, dataSet, cognitoCredentialsSource)
   
       const persistentStore = new PersistentStore(localStore, remoteStore)
   
       persistentStore.externalUpdate.sendTo(appStore.applyUpdate)
       appStore.newUpdate.sendTo( persistentStore.dispatchUpdate )
   
       persistentStore.init()

       const updater = new UpdateScheduler(5, 20)
       updater.updateRequired.sendTo(persistentStore.checkForUpdates)
   }
```

## Development
The tests can be run with `npm run test`, but only if a bucket for the test data and an access key/secret key pair have been
set up in your AWS account.  Copy the file `.testConfig.template.json` to `testConfig.json` and edit the details.