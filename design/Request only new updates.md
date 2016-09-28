Request only new updates
========================

Aims
----
- Improve performance by reducing number of requests to S3 for updates

Requirements
------------
- Only request list of updates from each read area which are "new"
- "New" means timestamp is greater than timestamp of latest received from that area minus 60 seconds
- On reload of page, only request updates which are "new" wrt latest update previously retrieved
- Exclude any updates already stored locally from the list of thise available


Technical
---------
- Responsibility of S3UpdateStore to do this
- Could get timestamp from S3 key
- On startup, need to init latest timestamp from locally stored data
- Issue: whether S3UpdateStore knows timestamp of latest, or is told when requesting updates
  - View 1: best to pass it in, as controller may have other factors and it knows about the local updates
  - View 2: separate concerns - store should just get latest updates by whatever means
- Decision: keep timestamps inside S3UpdateStore
- LocalUpdateStore can store the latest timestamps