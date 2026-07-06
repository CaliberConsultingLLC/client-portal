# Dept 360 — LinkedIn Video Build Kit

A self-contained pipeline that produces the exact 20-second, 1080×1080 MP4 from
your live screen recording. Built this way (instead of rendered directly) because
my video workspace was down — but the kit is reusable: change the copy, numbers,
or recording and re-run.

## What it makes
`dept360_linkedin_1080.mp4` — 20.0s, 1080×1080, H.264, AAC audio, faststart.

| Scene | Time | Content |
|-------|------|---------|
| 1 Hook | 0–3s | Dark. *"We collaborate well."* (italic, muted) → **"Not according to your data."** (gold punch). Silent. |
| 2 Product | 3–14s | **Your screen recording** of the Sankey, fit full-width in the square with dark letterbox + persistent `DEPT 360` lockup top-left. |
| 3 Metrics | 14–17s | Three pills — Incoming CDRs **60.4**, Perception Gap **24.4** (amber), Collaboration Index **58.2** — then the red Finance ↔ Sales watchout card. |
| 4 CTA | 17–20s | `CALIBER CONSULTING LLC` → **"Map every silo."** → gold **"Request your Dept 360. →"** with a bell hit. |

Audio: silence 0–3s, ambient pad fades in at 3s, bell chime at 17s, fade out over
the last 1.5s. (Synthesized + royalty-free — safe to post.)

## Requirements
- `ffmpeg` + `ffprobe`
- `python3` with **Pillow** → `pip install pillow`
- `curl` (only to auto-download Montserrat; otherwise drop the .ttf files in `fonts/`)

## Run it
```bash
cd dept360_video_kit
chmod +x build_video.sh find_clip.sh

# 1) (recommended) pick the best 11s window so the Finance red ribbon lands late
RECORDING="/path/to/20260623-1858-51.3649337.mp4" ./find_clip.sh
#    -> inspect _frames/tNNNN.jpg, note the second the red ribbon draws in

# 2) build, pointing TRIM_START at the start of that window
RECORDING="/path/to/20260623-1858-51.3649337.mp4" TRIM_START=4 ./build_video.sh
```
Inside the Cowork Linux workspace the recording default path already points at the
connected folder, so you can just run `TRIM_START=4 ./build_video.sh`.

### Windows
Run under **WSL** or **Git Bash**. Set the recording path Windows-style, e.g.:
```bash
RECORDING="/mnt/c/Users/dusti/AppData/Local/Packages/Microsoft.ScreenSketch_8wekyb3d8bbwe/TempState/Recordings/20260623-1858-51.3649337.mp4" TRIM_START=4 ./build_video.sh
```

## The one thing to tune: `TRIM_START`
I couldn't inspect the recording (workspace was down), so I can't know the exact
second the ribbons animate. `find_clip.sh` gives you labeled 1-fps thumbnails.
Pick `TRIM_START` so the **Finance 36.0 red ribbon draws in near the end** of the
11-second Scene 2 — that's the gut-punch the video is built around.

## Easy edits
- **Copy / numbers / colors** → `render_overlays.py` (top of file has the palette;
  each scene is its own function). Re-run `build_video.sh` after editing.
- **Scene lengths** → change `-t` values in `build_video.sh` (keep the four scenes
  summing to 20; audio bell is timed to 17s).
- **Music feel** → the `4/5 audio` block; raise/lower the `volume=` on the four
  pad oscillators, or swap in your own track:
  `ffmpeg ... -i yourtrack.mp3` and replace the `[bed]` chain.

## Files
```
dept360_video_kit/
├─ build_video.sh       # main runner (ffmpeg pipeline)
├─ render_overlays.py   # generates all text/card PNG layers (Pillow)
├─ find_clip.sh         # thumbnail helper to choose TRIM_START
├─ README.md            # this file
├─ fonts/               # Montserrat .ttf (auto-downloaded)
└─ assets/              # generated PNG overlays
```
