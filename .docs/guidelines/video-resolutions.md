# Video Resolutions Guidelines

## 🎬 Detailed Review by Resolution

| Resolution     | Typical Bitrate Range (H.264) | Pick        | Verdict                          |
| -------------- | ----------------------------- | ----------- | -------------------------------- |
| **360p**       | 400–800 kbps                  | 500 kbps    | ✅ Good for low-bandwidth/mobile |
| **480p**       | 800–1,200 kbps                | 1,000 kbps  | ✅ Good balance                  |
| **720p**       | 1,500–3,000 kbps              | 2,500 kbps  | ✅ Perfect mid-tier              |
| **1080p**      | 3,000–6,000 kbps              | 4,000 kbps  | ✅ Good — crisp for most users   |
| **1440p**      | 6,000–10,000 kbps             | 8,000 kbps  | ✅ Excellent for high-quality HD |
| **2160p (4K)** | 12,000–20,000 kbps            | 16,000 kbps | ✅ Very good; not overkill       |

## 📝 Key Considerations

- **maxrate** (≈10–15% above target bitrate) is a good buffer margin
- **bufsize** (≈1.5× bitrate) ensures stable bitrate control.

These parameters work well with ffmpeg’s -b:v, -maxrate, -bufsize, -preset, and -profile:v options for HLS/DASH encoding.

## 💡 Suggestions for Even Better Streaming

1. **Add an Audio Track Target**

- e.g. `128k` for 720p+, `96k` for 480p, `64k` for 360p.
- This helps players manage total bitrate more precisely.

2. **Consider Using CRF + Maxrate**

- Instead of strict `-b:v`, you can use:
  ```bash
  -c:v libx264 -crf 22 -maxrate 4000k -bufsize 6000k
  ```
  That maintains quality dynamically while capping peaks.

3. **If using HEVC (H.265) or AV1**

- You can reduce bitrates by **~40–50%** with similar visual quality.
- Example: 1080p at 2,500 kbps HEVC looks similar to 4,000 kbps H.264.

4. **Add a 240p or 144p tier**

- Optional, but improves accessibility for extremely low bandwidth users.
