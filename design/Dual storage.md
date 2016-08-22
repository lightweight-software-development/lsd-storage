# Dual storage

- List of parts involved
- Diagram of parts
- List of events and what happens
- List of responsibilities for each part
- Unit test cases for each part
- Integration test cases with real S3, dummy local storage


## Parts involved
- Browser client
  - Persistent Store
    - Local store
    - Store controller
    - Permanent store
      - Outgoing updates area - user store
      - Incoming updates area - shared store
  - State Controller
    - State
  
- Remote updater 
  - Persistent store
    - Local store - memory only
    - Store controller
    - Permanent store
      - Incoming updates area - from all user stores and shared store
      - Outgoing updates area - to shared store
  - State Controller
    - State


## Events - Browser client

- Startup
  - Persistent store applies actions from all locally stored updates to state controller
  - Then Persistent store requests updates from remote store shared area (if available) and applies actions to state controller and deletes from local store
  - Then Persistent store applies actions from local store to state controller and notifies if any invalid
  - Then Persistent store sends update to remote store user area with all valid outstanding actions

- New action from view
  - State controller notifies new action to persistent store
  - Persistent store saves to local store
  - Then Persistent store requests updates from remote store shared area (if available) and applies actions to state controller and deletes from local store
  - Then Persistent store applies actions from local store to state controller and notifies if any invalid
    - State controller updates state
  - Persistent store sends update to remote store user area (if available) with valid new action 
  
- Remote store becomes available
  - Persistent store requests updates from remote store shared area and applies actions to state controller and deletes from local store
  - Then Persistent store applies actions from local store to state controller and notifies if any invalid
  - Persistent store sends update to remote store user area with all outstanding actions
  
- Time to check for updates
  - Persistent store requests updates from remote store shared area (if available) and applies actions to state controller and deletes from local store


## Events - Remote Updater

- Startup
  -  Persistent store requests updates from remote store shared area and applies actions to state controller
  
- New action in any remote store user area
  - State controller notifies new action to persistent store
  - Persistent store saves to local store (in memory only)
  - Then Persistent store requests updates from remote store shared area and applies actions to state controller
  - Then Persistent store applies actions from local store to state controller and notifies if any invalid
    - State controller updates state
  - Persistent store sends update to remote store user area with valid new action

