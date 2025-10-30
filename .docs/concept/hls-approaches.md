

## Overview

| Setup                | Works with hls.js?  | Secure?   | Notes                                |
| -------------------- | ------------------- | --------- | ------------------------------------ |
| Public R2 bucket     | ✅ Yes              | ❌ No    | Simplest setup for testing or demos  |
| Signed URLs (direct) | ✅ Yes              | ✅ Yes   | Embed pre-signed URLs in `.m3u8`     |
| API proxy            | ✅ Yes              | ✅ Yes   | Full control, but higher server load |

## How it works (conceptually)

### 1. Public R2 bucket

This is the simplest setup for testing or demos, no server resources are required.

```mermaid
 Browser (hls.js)
   │
   ▼
Cloudflare R2 (public bucket)
```

### 2. Signed URLs (direct)

This is the balanced setup between security and scalability (reduced server load).

```mermaid
 Browser (hls.js)
   │
   ▼
Your API (generates signed URLs)
   │
   ▼
Cloudflare R2 (private bucket)
```

### 3. API proxy

This is the most secure setup, but it requires a lot of server resources (proxy endpoint).

```mermaid
 Browser (hls.js)
     │
     ▼
Your API (proxy endpoint)
     │
     ▼
Cloudflare R2 (private object storage)
```