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
  - Update controller
  
- Remote updater 
  - Persistent store
    - Local store - memory only
    - Store controller
    - Permanent store
      - Incoming updates area - from all user stores and shared store
      - Outgoing updates area - to shared store
  - State Controller
    - State
  - User update promoter


## Events - Browser 

- Startup
  - Persistent store applies actions from all locally stored updates to state controller
  - Then Persistent store requests updates from remote store shared area (if available) and applies actions to state controller and deletes from local store
  - Then Persistent store applies actions from local store to state controller and notifies if any invalid
  - Then if valid outstanding actions, Persistent store sends update to remote store user area (if available) with all valid outstanding actions

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


## Events - Server
Component that gets incoming actions eg from the user areas is outside the persistent store - like the view in the browser

- Startup
  -  Persistent store requests updates from remote store shared area and applies actions to state controller
  
- New action arriving from any input mechanism (API, user store watcher)
  - State controller notifies new action to persistent store
  - Persistent store saves to local store (in memory only)
  - Then Persistent store requests updates from remote store shared area and applies actions to state controller
  - Then Persistent store applies actions from local store to state controller and notifies if any invalid
    - State controller updates state
  - Persistent store sends update to remote store shared area with valid new action

## User update promoter
- Does one at a time
- Driven by Lambda notification to start with
- As much as possible in a unit-testable class so Lambda fn just gets event and passes key to it
- Unit test actual Lambda function by passing dummy event and context to it
- use rollup to create the package - instead of needing a separate node_modules folder in the dir
- Needs to:
  - create a model, state controller and persistent store once only at startup
  - create an updater that calls the state controller update() method
  - updater is configured with bucket, has method that takes key, reads content, on promise parses it and calls state controller
  - export function that gets key out of event and calls promoter, then calls callback
- Need to check for updates before applying:
  - will do that anyway in current setup (may need to change to keep app responsive)

## Local/remote refactoring

- Split out the local store startup optimisation and the retry functionality
- Actions become updates from the start - may be >1 in a group
- Updates have id and timestamp
- Update id never changes, but timestamp does as it is moved around
- If keep timestamp and place, good for troubleshooting and performance checking
- Maybe only need one local store of updates, keyed by id - but how know which ones to retry? and which ones already received?
- Just overwrite any existing update with same id when get remote update
- Sort updates by timestamp (latest) when applying
- Update bundles are just containers of individual updates - request them first
- Should always save update before requesting updates - user may have done much work, and request could lock up browser

## State controller interaction - ideal
- When get update from client, apply to app
- If error, emit on error stream and leave state as is, forget update
- If ok, remember last good state, set app state, send action to store controller as update from app
- Store controller stores locally, keeps update in "pending updates" list, requests updates 
- When updates received, send them state controller, then send pending updates
- State controller applies all to last good state
- If error, emit on error stream and drop
- If error, emit on error stream, leave state as is, forget update


