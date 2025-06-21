# YouTube Transcriptor API

A Node.js API that uses Puppeteer with the Brave browser (running inside a virtual display) to extract transcript segments from YouTube videos.

---

## ✨ Features

- Accepts a YouTube video URL via HTTP POST
- Launches a real Brave browser with `headless: false` for full DOM rendering
- Simulates user interaction to reveal and extract transcript segments
- Returns the video title and transcript as JSON
- Runs in a Docker container using `Xvfb` for headless GUI support

---

## 🚀 API Usage

### POST `/transcribe`

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
}
```
**Response Body:**
```
{
  "title": "Video Title",
  "transcript": "Full transcript text from segments"
}
```
## 🐳 Installation via Docker

### 1\. Clone this repository

```bash
git clone https://github.com/your-username/youtube-transcriptor.git
cd youtube-transcriptor
```

### 2\. Build the Docker image

```bash
docker build -t youtube-transcriptor .
```

### 3\. Run the container

```bash
docker run -it --rm -p 3000:3000 youtube-transcriptor
```

Your API will now be available at:

```bash
http://localhost:3000/transcribe
```
