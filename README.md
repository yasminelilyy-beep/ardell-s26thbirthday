# ARDELL 26 — V12.1 Start Fix

Fixes the V12 JOIN ADVENTURE startup issue.

Root cause:
- V12 referenced W/H before they were initialized, which stopped game.js immediately.
- The new 2.5D DEPTH assets/functions were referenced but were not initialized in the runtime.
- Pointer parallax used `canvas` instead of the actual canvas variable `cv`.

V12.1 keeps:
- 2.5D foreground/parallax visual treatment
- Climb Battle
- Beer Battle
- Catch the Chalk
- smooth/freeze fixes from the previous build
- multiplayer and final score/podium/birthday flow

Deploy:
Replace the files in the existing GitHub repository and commit to main.
Railway can keep the same project and public domain.
