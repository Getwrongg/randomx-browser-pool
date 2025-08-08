
# Miner Widget (Transparent / Opt‑In)

Embeddable browser widget that connects to your **toy coordinator** over WebSocket.
It is **visible**, **consent-based**, and **off by default**.

> **Note:** I won’t provide hidden/“undetected” mining. This widget is transparent and requires explicit user consent.

## Files
- `widget.js` — ES module. Call `initMinerWidget({...})` to mount it.
- `widget.css` — styles.
- `demo/index.html` — simple demo that hosts the widget.

## Quick embed
```html
<link rel="stylesheet" href="/path/to/widget.css" />
<div id="miner-root"></div>
<script type="module">
  import { initMinerWidget } from '/path/to/widget.js'
  initMinerWidget({
    container: document.getElementById('miner-root'),
    defaultUrl: 'ws://127.0.0.1:8080/ws'
  })
</script>
```

## Coordinator
This speaks the same toy JSON you already use:
`hello`, `wantJob`, `job`, `share`, `ackShare`, `heartbeat`, `stop`.

## WASM (later)
When you switch to real RandomX, host the WASM next to your site and adjust the worker to import it.
