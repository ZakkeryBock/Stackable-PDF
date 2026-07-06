#!/usr/bin/env bash
# ===== Stackable PDF Tools - one-click launcher (macOS / Linux) =====
# On macOS you can double-click this file in Finder.

cd "$(dirname "$0")" || exit 1

echo
echo "  Stackable PDF Tools"
echo "  ==================="
echo

# --- Check that Node.js is installed ---
if ! command -v node >/dev/null 2>&1; then
  echo "  [!] Node.js is not installed."
  echo
  echo "  This app needs Node.js to run. It's free:"
  echo "      https://nodejs.org/  (download the LTS version, install, then run this again)"
  echo
  ( command -v open >/dev/null && open "https://nodejs.org/en/download" ) 2>/dev/null
  read -r -p "  Press Enter to close..."
  exit 1
fi

# --- Install dependencies the first time only ---
if [ ! -d "node_modules" ]; then
  echo "  First run - installing components (this takes a minute)..."
  echo
  npm install || { echo; echo "  [!] Install failed. Check your internet and try again."; read -r; exit 1; }
fi

echo
echo "  Starting... your browser will open automatically at http://localhost:5173"
echo "  Keep this window open while you use the app. Close it when you're done."
echo

npm run dev
