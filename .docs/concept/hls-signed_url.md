# Signed URL Approach for HLS Streaming

## 🧭 What we’re building

Goal:
Let the browser (via `hls.js`) **stream HLS video directly from Cloudflare R2**,
but with **temporary, secure signed URLs** instead of public links.

---

## 🧩 The Architecture

```
Browser (hls.js)
   │
   ▼
 Your API (generates signed URLs)
   │
   ▼
 Cloudflare R2 (private bucket)
```

* Your API creates short-lived, signed URLs for `.m3u8` and segment files.
* hls.js uses those signed URLs to fetch data directly from R2.
* When the URLs expire, access is automatically revoked — no need for manual cleanup.

---

## ⚙️ Step 1: Prepare your R2 bucket

* Keep the bucket **private** (no public access).
* Your backend will use **API keys** (R2’s S3-compatible credentials) to sign URLs.

Each HLS asset might look like this inside R2:

```
my-video/
 ├── master.m3u8
 ├── index_0.m3u8
 ├── index_1.m3u8
 ├── segment_000.ts
 ├── segment_001.ts
 └── segment_002.ts
```

---

## ⚙️ Step 2: Set up S3 client in your API

Use the AWS SDK (v3) with R2’s endpoint.

```js
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://<your-account-id>.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
```

---

## ⚙️ Step 3: Generate signed URLs

For each object (e.g., `.m3u8`, `.ts`, `.m4s`), generate a short-lived signed URL:

```js
async function generateSignedUrl(bucket, key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3, command, { expiresIn }); // expiresIn = seconds
}
```

Example usage:

```js
const url = await generateSignedUrl('my-bucket', 'my-video/master.m3u8', 600);
console.log(url);
```

You’ll get something like:

```
https://<accountid>.r2.cloudflarestorage.com/my-bucket/my-video/master.m3u8?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...
```

That URL works **for 10 minutes**, then becomes invalid.

---

## ⚙️ Step 4: Rewrite the `.m3u8` playlist to use signed URLs

Your HLS playlist (e.g., `master.m3u8` or `index_0.m3u8`) references segments like:

```
#EXTINF:4.000,
segment_000.ts
#EXTINF:4.000,
segment_001.ts
```

You need to **replace** those with full signed URLs:

```
#EXTINF:4.000,
https://<accountid>.r2.cloudflarestorage.com/my-bucket/my-video/segment_000.ts?X-Amz-...
#EXTINF:4.000,
https://<accountid>.r2.cloudflarestorage.com/my-bucket/my-video/segment_001.ts?X-Amz-...
```

That way, hls.js fetches each segment directly from R2, using its own valid signed URL.

---

## ⚙️ Step 5: Serve the rewritten `.m3u8` from your API

Here’s a minimal Express.js endpoint:

```js
import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

const app = express();
const bucket = 'my-bucket';
const videoPrefix = 'my-video';
const r2Endpoint = 'https://<your-account-id>.r2.cloudflarestorage.com';

const s3 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

async function getSignedUrlForKey(key, expiresIn = 600) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

app.get('/stream/:videoId/master.m3u8', async (req, res) => {
  try {
    // Fetch original playlist from R2
    const key = `${req.params.videoId}/master.m3u8`;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const data = await s3.send(command);
    const playlist = await streamToString(data.Body);

    // Replace segment references with signed URLs
    const signedPlaylist = await rewritePlaylistWithSignedUrls(playlist, req.params.videoId);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(signedPlaylist);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading playlist');
  }
});

async function rewritePlaylistWithSignedUrls(playlist, videoId) {
  const lines = playlist.split('\n');
  const output = [];

  for (const line of lines) {
    if (line.endsWith('.ts') || line.endsWith('.m4s') || line.endsWith('.m3u8')) {
      const signedUrl = await getSignedUrlForKey(`${videoId}/${line.trim()}`);
      output.push(signedUrl);
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

app.listen(3000, () => console.log('Server running on port 3000'));
```

Now, the browser loads:

```
https://api.example.com/stream/my-video/master.m3u8
```

…and your server dynamically injects **valid signed URLs** into the playlist.

✅ hls.js downloads the segments directly from R2
✅ Your R2 bucket stays private
✅ URLs expire automatically for security

---

## ⚠️ Important details

| Topic             | Why it matters                                                      |
| ----------------- | ------------------------------------------------------------------- |
| **CORS**          | Enable it in R2 (or Cloudflare settings) so hls.js can fetch files. |
| **Expiration**    | Keep URLs short-lived (e.g., 5–10 minutes).                         |
| **Cache control** | Don’t cache playlists with expired URLs.                            |
| **HLS variants**  | For multi-bitrate HLS, apply signing to each `.m3u8` and segment.   |

---

## 🧱 Summary

| Step | Description                                                     |
| ---- | --------------------------------------------------------------- |
| 1️⃣  | Store HLS files in a **private R2 bucket**                      |
| 2️⃣  | Your API uses R2’s S3 API to **generate signed URLs**           |
| 3️⃣  | **Rewrite** the `.m3u8` playlist to include signed segment URLs |
| 4️⃣  | hls.js plays the rewritten playlist — fetching directly from R2 |
| 5️⃣  | URLs expire after a few minutes, keeping media secure           |
