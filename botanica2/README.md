# Botanica Sequencer

Version v0.3.

This version introduces the first real engine/UI split.

Cloudflare publish directory: `web`.

`engine/botanica-engine.js` contains the musical logic.
`web/app.js` contains browser UI, WebMIDI and timers.

The browser is now a test harness for the future Max for Live and Teensy targets.
