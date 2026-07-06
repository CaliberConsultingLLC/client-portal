#!/usr/bin/env bash
###############################################################################
# Helper: dump 1-frame-per-second thumbnails of the screen recording so you can
# eyeball exactly when the Sankey ribbons draw in and when the Finance (36.0)
# red ribbon appears. Use that to set TRIM_START in build_video.sh.
#
#   ./find_clip.sh
#   -> writes _frames/t0000.jpg, t0001.jpg, ... (one per second, labeled)
###############################################################################
set -euo pipefail
cd "$(dirname "$0")"

RECORDING="${RECORDING:-/sessions/dreamy-tender-archimedes/mnt/Recordings/20260623-1858-51.3649337.mp4}"
mkdir -p _frames

echo "Recording info:"
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,avg_frame_rate,duration \
  -show_entries format=duration -of default=noprint_wrappers=1 "$RECORDING"

# one labeled thumbnail per second
ffmpeg -y -i "$RECORDING" \
  -vf "fps=1,scale=480:-1,drawtext=text='t=%{n}s':x=10:y=10:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6" \
  "_frames/t%04d.jpg"

echo
echo "Thumbnails in _frames/ (one per second, t=Ns labeled)."
echo "Find the second where the map starts drawing nicely and where the"
echo "Finance red ribbon lands, then set TRIM_START so the red reveal sits"
echo "near the END of the 11s window, e.g.:"
echo "   TRIM_START=4 ./build_video.sh"
