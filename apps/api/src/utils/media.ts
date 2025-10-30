export const getLimitedResolutionsByOriginalHeight = (originalHeight: number) => {
  const resolutions = [
    { name: '360p', height: 360, bitrate: '500k', maxrate: '550k', bufsize: '750k' },
    { name: '480p', height: 480, bitrate: '1000k', maxrate: '1100k', bufsize: '1500k' },
    { name: '720p', height: 720, bitrate: '2500k', maxrate: '2675k', bufsize: '3750k' },
    { name: '1080p', height: 1080, bitrate: '4000k', maxrate: '4300k', bufsize: '6000k' },
    // currently, we are not transcoding 2k and 4k videos because it's too slow, takes too much time, and server resources are limited
    // { name: '1440p', height: 1440, bitrate: '8000k', maxrate: '8600k', bufsize: '12000k' },
    // { name: '2160p', height: 2160, bitrate: '16000k', maxrate: '17200k', bufsize: '24000k' },
  ];

  return resolutions.filter(resolution => resolution.height <= originalHeight);
};
