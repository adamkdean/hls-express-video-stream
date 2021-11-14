# video-stream

This project uses express and hls-server, along with ffmpeg (installed locally) to accept hls (m3u8) video requests, and generate and serve them from mp4 videos. The generation uses ffmpeg which has to be available locally. If a video hasn't been processed, it will be split into 5 second segments and a playlist generated.

## License

```
Copyright 2021 Adam K Dean. Use of this source code is
governed by an MIT-style license that can be found at
https://opensource.org/licenses/MIT.
```
