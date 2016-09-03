#To Do

Bugs
----
- Do not delete unsaved update if storing in S3 fails
- Fails to get cognito identity when first sign in

Improvements
------------

- Multiple update sources - user and shared
- Only request updates with timestamp on or after the latest one you have got, but not ones you already have
- Review when/how to apply actions to local state and merge with external updates
- Track all actions applied, not just local
- Updates must be applied in order
- If find an update older than one already applied, reapply all after it

- refactor waitFor
