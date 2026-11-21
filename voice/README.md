# Voz neuronal pregrabada

Clips MP3 (mono, 24 kHz, 32 kbps) generados con [edge-tts](https://github.com/rany2/edge-tts) usando las voces
`es-PY-TaniaNeural`, `en-US-AvaNeural` y `pt-BR-FranciscaNeural`. Nombre de archivo = FNV-1a de `idioma|texto normalizado`
(ver `vnorm`/`vhash` en `pro2.js`). `manifest.json` lista los clips disponibles; lo que no está pregrabado usa la voz del teléfono.

Regenerar: `python3 tools/voice/harvest.py` (junta los textos desde la app) y luego `python3 tools/voice/gen.py`.

Nota de licencia: edge-tts usa el servicio en línea "Leer en voz alta" de Microsoft Edge (no es una API oficial);
aplican los términos de Microsoft. Uso personal de la app.
