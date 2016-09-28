Update bundling
===============

Aims
----
- Improve performance by reducing number of requests to S3 for updates

Requirements
------------
- Updates are stored in S3 in bundles
- When storing single updates from client, store in a bundle of one
- When storing multiple updates from client, store in one bundle
- Allow for future story to consolidate multiple bundles
- Each bundle has a single timestamp associated with it

Technical
---------
