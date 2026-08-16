# dsh-client-ui-voice

DSH voice chat plugin: mic capture -> local bridge STT -> `conversation.send`
(text injection), reply TTS playback, and the AI-companion animation window.

## Buildout

| Step | Status | What |
|---|---|---|
| T4 | in progress | Plugin skeleton: mic control in the composer tool row |
| T5 | pending | Capture worklet + silence endpoint -> bridge `/api/stt` -> `conversation.send` |
| T6 | pending | Session snapshot listener -> text blocks -> bridge `/api/tts` -> playback |
| T7 | pending | Voice toggle, companion toggle, states, interruption, multi-session |
| T8 | pending | Companion window (bg-images idle / task-videos speaking), drag, media mounts |

## Model experience

Voice input is a press-free auto-endpointed capture (1800 ms silence), the
recognized text enters the chat exactly like a typed message, and every
assistant reply is read aloud with the Xiaoya voice clone unless the voice
toggle is off. The companion window reproduces the original hf-realtime-voice
right-side animation: idle videos loop from `bg-images`, speaking videos play
from `task-videos` while TTS is playing.

## Runtime dependencies

The plugin talks to the local `voice-bridge` HTTP service
(`http://127.0.0.1:8765`): `/api/stt`, `/api/tts`, `/api/health`,
`/api/media/*` and `/media/*` static mounts. The bridge runs from
`D:\speech-to-speech` on the `venv-speech` interpreter (see the project's
`DSH-语音接入-设计方案.md`).
