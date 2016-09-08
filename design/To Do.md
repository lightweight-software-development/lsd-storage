#To Do

Bugs
----

- Do not delete unsaved update if storing in S3 fails
- Fails to get cognito identity when first sign in - may be when identity pool has changed
- Stop requests when get error

Improvements
------------

- Handle local user validation errors
- Handle remote update validation errors
- Only request updates with timestamp on or after the latest one you have got, but not ones you already have
- User IndexedDb
- Multiple update sources - user and shared
- Refactor startup and local storage out of controller
- Review when/how to apply actions to local state and merge with external updates
- Track all actions applied, not just local
- Updates must be applied in order
- If find an update older than one already applied, reapply all after it

- refactor waitFor
