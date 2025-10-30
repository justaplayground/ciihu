#!/bin/sh

# Video processing script for HLS transcoding
# Usage: ./process-video.sh input_file output_dir

set -e

INPUT_FILE="$1"
OUTPUT_DIR="$2"
BASE_NAME=$(basename "$INPUT_FILE" | cut -d. -f1)

if [ -z "$INPUT_FILE" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <input_file> <output_dir>"
    exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file does not exist: $INPUT_FILE"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Processing video: $INPUT_FILE"
echo "Output directory: $OUTPUT_DIR"

# Create multiple resolution variants
# 720p
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 -c:a aac \
    -b:v 2500k -maxrate 2675k -bufsize 3750k \
    -vf "scale=-2:720" \
    -preset medium -profile:v main -level 3.1 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/${BASE_NAME}_720p_%03d.ts" \
    "$OUTPUT_DIR/${BASE_NAME}_720p.m3u8" &

# 480p
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 -c:a aac \
    -b:v 1000k -maxrate 1100k -bufsize 1500k \
    -vf "scale=-2:480" \
    -preset medium -profile:v main -level 3.0 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/${BASE_NAME}_480p_%03d.ts" \
    "$OUTPUT_DIR/${BASE_NAME}_480p.m3u8" &

# 360p
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 -c:a aac \
    -b:v 500k -maxrate 550k -bufsize 750k \
    -vf "scale=-2:360" \
    -preset medium -profile:v baseline -level 3.0 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/${BASE_NAME}_360p_%03d.ts" \
    "$OUTPUT_DIR/${BASE_NAME}_360p.m3u8" &

# Wait for all transcoding jobs to complete
wait

# Create master playlist
cat > "$OUTPUT_DIR/${BASE_NAME}_master.m3u8" << EOF
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=2675000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
${BASE_NAME}_720p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1100000,RESOLUTION=854x480,CODECS="avc1.4d401e,mp4a.40.2"
${BASE_NAME}_480p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=550000,RESOLUTION=640x360,CODECS="avc1.42e01e,mp4a.40.2"
${BASE_NAME}_360p.m3u8
EOF

# Generate thumbnail
ffmpeg -i "$INPUT_FILE" \
    -vf "select=eq(n\,0)" -q:v 3 \
    -frames:v 1 \
    "$OUTPUT_DIR/${BASE_NAME}_thumbnail.jpg"

# Get video metadata
ffprobe -v quiet -print_format json -show_format -show_streams "$INPUT_FILE" > "$OUTPUT_DIR/${BASE_NAME}_metadata.json"

echo "Video processing completed successfully!"
echo "Master playlist: $OUTPUT_DIR/${BASE_NAME}_master.m3u8"
echo "Thumbnail: $OUTPUT_DIR/${BASE_NAME}_thumbnail.jpg"
echo "Metadata: $OUTPUT_DIR/${BASE_NAME}_metadata.json"
