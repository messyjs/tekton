---
name: youtube-content
description: "Fetch YouTube transcripts, create summaries, and extract key information."
version: 1.0.0
metadata:
  tekton:
    tags: ["youtube", "transcript", "summary", "video"]
    category: media
    confidence: 0.6
---

# YouTube Content

## When to Use
- Extracting video transcripts
- Summarizing YouTube videos
- Creating notes from video content

## Procedure
1. Get video ID from URL
2. Fetch transcript: youtube-transcript-api or yt-dlp
3. Clean transcript text
4. Summarize key points
5. Extract timestamps for important sections

## Pitfalls
- Not all videos have transcripts
- Auto-generated captions may be inaccurate
- Rate limits on YouTube API

## Verification
- Transcript matches video content
- Summary captures main points
- Timestamps are accurate
