# Browser-Based RandomX Mining – Toy Mode Topology

This document describes the **current** mining topology in **toy mode**, before multi-miner leasing or pool integration.

---

## Overview

The system consists of two main components:

1. **Coordinator Node** (`coordinator-node`) – A Node.js/TypeScript WebSocket server that:
   - Manages connected browser workers
   - Generates **fake jobs** with random seeds and nonce ranges
   - Tracks worker health, hashrate, and share statistics
   - Validates submitted shares with a **toy difficulty rule** (`hashHex` starts with N zeros)

2. **Browser Miner** (`miner-web`) – A Vite + TypeScript + React application that:
   - Presents a consent UI before mining starts
   - Connects to the coordinator over WebSocket
   - Iterates assigned nonces, **generating fake hashes**
   - Submits occasional “shares” to the coordinator
   - Displays live hashrate and accepted/rejected counts

---
