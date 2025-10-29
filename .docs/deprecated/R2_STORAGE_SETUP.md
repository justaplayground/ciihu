# Cloudflare R2 Storage Setup Guide

This guide explains how to set up Cloudflare R2 object storage for the video platform.

## Overview

The application uses Cloudflare R2 for:
- **Original video uploads** - User-uploaded video files
- **Processed videos** - Transcoded HLS video streams (multiple resolutions)
- **Thumbnails** - Video thumbnail images

All video processing (transcoding to HLS format) is done by the API service using FFmpeg, and files are uploaded directly to R2.

## Prerequisites

1. A Cloudflare account
2. R2 subscription (Cloudflare offers 10GB free storage)

## Setup Steps

### 1. Create an R2 Bucket

1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Choose a unique bucket name (e.g., `ciihu-videos`)
5. Click **Create bucket**

### 2. Configure Public Access

You have two options for public access:

#### Option A: Public Bucket (Recommended for Development)

1. In your bucket settings, click **Settings**
2. Under **Public access**, click **Allow Access**
3. Note the public bucket URL (e.g., `https://your-bucket.r2.dev`)

#### Option B: Custom Domain (Recommended for Production)

1. Go to your bucket settings
2. Click **Connect Domain**
3. Enter your custom domain (e.g., `cdn.yourdomain.com`)
4. Follow the DNS configuration instructions
5. Wait for SSL certificate provisioning

### 3. Configure CORS

R2 buckets need CORS rules to allow browser access:

1. In your bucket, go to **Settings** > **CORS Policy**
2. Add the following CORS configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Production Note**: Replace `"*"` in `AllowedOrigins` with your actual domain(s):
```json
"AllowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"]
```

### 4. Create API Tokens

1. In your Cloudflare dashboard, navigate to **R2** > **Overview**
2. Click **Manage R2 API Tokens**
3. Click **Create API Token**
4. Configure the token:
   - **Token Name**: `ciihu-api-token`
   - **Permissions**: Object Read & Write
   - **Bucket**: Select your bucket or choose "All buckets"
   - **TTL**: Choose appropriate expiration (or no expiration for development)
5. Click **Create API Token**
6. **IMPORTANT**: Copy and save the following credentials:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (found in the R2 overview page)

### 5. Configure Environment Variables

Add the following to your `.env` file in `apps/api/`:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Example:**
```env
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0
R2_ACCESS_KEY_ID=1234567890abcdef1234567890abcdef
R2_SECRET_ACCESS_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd
R2_BUCKET_NAME=ciihu-videos
R2_PUBLIC_URL=https://ciihu-videos.r2.dev
```

### 6. Update Docker Compose (Optional)

If using Docker, also add the R2 configuration to `docker-compose.yml`:

```yaml
api:
  # ... other config
  environment:
    # ... other env vars
    R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
    R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
    R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
    R2_BUCKET_NAME: ${R2_BUCKET_NAME}
    R2_PUBLIC_URL: ${R2_PUBLIC_URL}
```

## Storage Structure

The application organizes files in R2 with the following structure:

```
your-bucket/
├── uploads/
│   └── {userId}/
│       └── {timestamp}-{filename}
└── processed/
    └── {userId}/
        └── {videoId}/
            ├── master.m3u8                    # Master playlist
            ├── thumbnail.jpg                  # Video thumbnail
            ├── 360p/
            │   ├── playlist.m3u8
            │   └── segment_*.ts
            ├── 480p/
            │   ├── playlist.m3u8
            │   └── segment_*.ts
            ├── 720p/
            │   ├── playlist.m3u8
            │   └── segment_*.ts
            └── 1080p/                        # If original is 1080p+
                ├── playlist.m3u8
                └── segment_*.ts
```

## Security Best Practices

### For Production:

1. **Use Custom Domain with HTTPS**
   - Don't use the default `.r2.dev` URL in production
   - Configure a custom domain with SSL

2. **Restrict CORS Origins**
   - Update CORS policy to only allow your domain(s)
   - Remove wildcard (`*`) origins

3. **API Token Security**
   - Use separate tokens for different environments
   - Set appropriate token expiration
   - Rotate tokens regularly
   - Never commit tokens to version control

4. **Bucket Permissions**
   - Create API tokens with minimum required permissions
   - Consider separate buckets for uploads and processed videos

5. **Content Moderation**
   - Implement upload limits
   - Scan uploaded content
   - Monitor storage usage

## Monitoring and Management

### Check Storage Usage

1. Go to R2 dashboard
2. View **Storage** and **Operations** metrics
3. Set up usage alerts if needed

### Cost Estimation

Cloudflare R2 pricing (as of 2024):
- **Storage**: $0.015 per GB/month (first 10GB free)
- **Class A operations** (PUT, POST, etc.): $4.50 per million requests
- **Class B operations** (GET, HEAD, etc.): $0.36 per million requests
- **Egress**: Free (no bandwidth charges)

### Typical Usage for 1000 Videos:

- Average video: 100MB original + 80MB processed = 180MB
- Storage: ~180GB = ~$2.55/month
- 100K views/month: ~$0.036/month for operations
- **Total**: ~$2.60/month (excluding first 10GB free tier)

## Troubleshooting

### Error: "Access Denied"

**Cause**: Invalid credentials or insufficient permissions

**Solution**:
1. Verify R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
2. Check API token permissions
3. Ensure bucket name is correct

### Error: "Bucket not found"

**Cause**: Incorrect bucket name or account ID

**Solution**:
1. Verify R2_BUCKET_NAME matches exactly
2. Check R2_ACCOUNT_ID is correct
3. Ensure bucket exists in the correct account

### Videos not playing

**Cause**: CORS not configured or public access disabled

**Solution**:
1. Enable public access on the bucket
2. Configure CORS policy as shown above
3. Verify R2_PUBLIC_URL is correct

### Upload fails

**Cause**: Token permissions or rate limits

**Solution**:
1. Check API token has write permissions
2. Verify file size is within limits (default 500MB)
3. Check Cloudflare dashboard for rate limit issues

## Migration from Local Storage

If you previously used local storage:

1. The old Docker volumes have been removed
2. All media now goes directly to R2
3. Existing local files can be uploaded to R2 using AWS CLI:

```bash
# Install AWS CLI
# Configure for R2
aws configure --profile r2

# Upload existing files
aws s3 sync ./old-media/ s3://your-bucket/ --profile r2 --endpoint-url https://your-account-id.r2.cloudflarestorage.com
```

## Support

For issues with:
- **R2 Service**: [Cloudflare Support](https://support.cloudflare.com/)
- **Application Integration**: Check application logs and GitHub issues

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/s3/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)

