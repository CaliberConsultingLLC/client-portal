#!/usr/bin/env bash
###############################################################################
# Dept 360 — 20s / 1080x1080 LinkedIn video builder
#
# Pipeline:
#   1. (optional) fetch Montserrat fonts; falls back to Outfit in ./fonts
#   2. render overlay PNGs via render_overlays.py (Pillow)
#   3. build scene1 (hook), scene2 (your screen recording), scene3 (metrics),
#      scene4 (CTA) as individual 1080x1080 clips
#   4. synthesize audio: silence 0-3s, ambient bed in @3s, bell @17s, fade out
#   5. concat + mux -> dept360_linkedin_1080.mp4
#
# Requires: ffmpeg, ffprobe, python3 + Pillow
###############################################################################
set -euo pipefail
cd "$(dirname "$0")"

# ---- CONFIG -----------------------------------------------------------------
# Path to your screen recording (override on Windows/macOS as needed):
#   RECORDING="/path/to/recording.mp4" ./build_video.sh
RECORDING="${RECORDING:-/sessions/dreamy-tender-archimedes/mnt/northstar-platform/public/Recording 2026-06-24 081025.mp4}"

# Scene 2 timing. The hero "Sales 60.4" incoming map (with the Finance red
# ribbon) holds ~0-7s before the product switches views; we play that live
# segment then clone-freeze the last frame so the scene ends on the red ribbon.
TRIM_START="${TRIM_START:-0}"
SCENE2_SRC="${SCENE2_SRC:-7.0}"
SCENE2_DUR=11

OUT="dept360_linkedin_1080.mp4"
TMP="_tmp"; mkdir -p "$TMP"
FPS=30
SIZE=1080
DARK="0x1E2329"
X264="-c:v libx264 -preset medium -profile:v high -pix_fmt yuv420p -r $FPS"

echo "==> 1/5  fonts (Montserrat if reachable; otherwise Outfit already in ./fonts)"
mkdir -p fonts
RAW="https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf"
for f in Montserrat-Bold Montserrat-SemiBold Montserrat-Medium Montserrat-Regular Montserrat-Italic; do
  [ -f "fonts/$f.ttf" ] && continue
  command -v curl >/dev/null && curl -fsSL --max-time 15 "$RAW/$f.ttf" -o "fonts/$f.ttf" 2>/dev/null || true
  [ -s "fonts/$f.ttf" ] || rm -f "fonts/$f.ttf"
done

echo "==> 2/5  overlays"
python3 render_overlays.py

A=assets
echo "==> 3/5  scenes"

# --- SCENE 1 : hook (3s) -----------------------------------------------------
ffmpeg -y -f lavfi -i "color=c=$DARK:s=${SIZE}x${SIZE}:r=$FPS:d=3" \
  -loop 1 -i "$A/s1_line1.png" -loop 1 -i "$A/s1_line2.png" \
  -filter_complex "[1]format=rgba,fade=in:st=0.3:d=0.8:alpha=1[l1];[2]format=rgba,fade=in:st=1.7:d=0.22:alpha=1[l2];[0][l1]overlay=0:0[a];[a][l2]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t 3 $X264 -an "$TMP/scene1.mp4"

# --- SCENE 2 : product visual (11s) -----------------------------------------
FREEZE=$(python3 -c "print(round($SCENE2_DUR-$SCENE2_SRC,3))")
ffmpeg -y -ss "$TRIM_START" -t "$SCENE2_SRC" -i "$RECORDING" \
  -loop 1 -i "$A/s2_logo.png" \
  -filter_complex "[0:v]scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease,pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih)/2:color=$DARK,setsar=1,tpad=stop_mode=clone:stop_duration=${FREEZE}[base];[1]format=rgba,fade=in:st=0.4:d=0.6:alpha=1[lg];[base][lg]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t "$SCENE2_DUR" $X264 -an "$TMP/scene2.mp4"

# --- SCENE 3 : metrics (3s) --------------------------------------------------
ffmpeg -y -f lavfi -i "color=c=$DARK:s=${SIZE}x${SIZE}:r=$FPS:d=3" \
  -loop 1 -i "$A/s3_kicker.png" \
  -loop 1 -i "$A/s3_pill1.png" -loop 1 -i "$A/s3_pill2.png" \
  -loop 1 -i "$A/s3_pill3.png" -loop 1 -i "$A/s3_watchout.png" \
  -filter_complex "[1]format=rgba,fade=in:st=0.1:d=0.4:alpha=1[k];[2]format=rgba,fade=in:st=0.3:d=0.4:alpha=1[p1];[3]format=rgba,fade=in:st=0.55:d=0.4:alpha=1[p2];[4]format=rgba,fade=in:st=0.8:d=0.4:alpha=1[p3];[5]format=rgba,fade=in:st=1.5:d=0.5:alpha=1[w];[0][k]overlay=0:0[a];[a][p1]overlay=0:0[b];[b][p2]overlay=0:0[c];[c][p3]overlay=0:0[d];[d][w]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t 3 $X264 -an "$TMP/scene3.mp4"

# --- SCENE 4 : CTA (3s) ------------------------------------------------------
ffmpeg -y -loop 1 -i "$A/s4_bg.png" \
  -loop 1 -i "$A/s4_label.png" -loop 1 -i "$A/s4_line1.png" -loop 1 -i "$A/s4_line2.png" \
  -filter_complex "[0]format=rgba[bg];[1]format=rgba,fade=in:st=0.2:d=0.5:alpha=1[lb];[2]format=rgba,fade=in:st=0.5:d=0.5:alpha=1[c1];[3]format=rgba,fade=in:st=1.15:d=0.25:alpha=1[c2];[bg][lb]overlay=0:0[a];[a][c1]overlay=0:0[b];[b][c2]overlay=0:0,format=yuv420p[v]" \
  -map "[v]" -t 3 $X264 -an "$TMP/scene4.mp4"

# --- concat video (paths resolve relative to the list file in $TMP) ----------
printf "file '%s'\n" scene1.mp4 scene2.mp4 scene3.mp4 scene4.mp4 > "$TMP/list.txt"
ffmpeg -y -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/video_silent.mp4"

echo "==> 4/5  audio (silence 0-3s | bed @3s | bell @17s | fade @18.5s)"
AF="[0]volume=0.16[a0];[1]volume=0.12[a1];[2]volume=0.11[a2];[3]volume=0.09[a3];[a0][a1][a2][a3]amix=inputs=4:normalize=0,tremolo=f=0.25:d=0.35,lowpass=f=1100,aformat=channel_layouts=stereo,afade=t=in:st=3:d=3,afade=t=out:st=18.5:d=1.5,volume=1.0[bed];[4]volume=0.55[b0];[5]volume=0.30[b1];[6]volume=0.16[b2];[b0][b1][b2]amix=inputs=3:normalize=0,afade=t=out:st=0:d=2.6:curve=exp,adelay=17000|17000,aformat=channel_layouts=stereo[bell];[bed][bell]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]"
ffmpeg -y \
  -f lavfi -i "sine=frequency=110.00:duration=20" \
  -f lavfi -i "sine=frequency=164.81:duration=20" \
  -f lavfi -i "sine=frequency=220.00:duration=20" \
  -f lavfi -i "sine=frequency=261.63:duration=20" \
  -f lavfi -i "sine=frequency=880.00:duration=3" \
  -f lavfi -i "sine=frequency=1318.5:duration=3" \
  -f lavfi -i "sine=frequency=2640.0:duration=3" \
  -filter_complex "$AF" -map "[aout]" -t 20 -c:a aac -b:a 192k "$TMP/audio.m4a"

echo "==> 5/5  mux"
ffmpeg -y -i "$TMP/video_silent.mp4" -i "$TMP/audio.m4a" \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
  -movflags +faststart -t 20 "$OUT"

echo
echo "DONE -> $OUT"
ffprobe -v error -show_entries format=duration:stream=width,height \
  -of default=noprint_wrappers=1 "$OUT" || true
