# Alert sounds

Add high-quality audio files here and wire them in `client/constants/alertSounds.ts`:

- **plateau.mp3** — rewarding/achieved (focus complete)
- **breakComplete.mp3** — motivational/alerting (break complete, ready to climb)

In `alertSounds.ts`, set:

- `ALERT_SOUND_FOCUS_COMPLETE: require("@/assets/sounds/plateau.mp3")`
- `ALERT_SOUND_BREAK_COMPLETE: require("@/assets/sounds/breakComplete.mp3")`
