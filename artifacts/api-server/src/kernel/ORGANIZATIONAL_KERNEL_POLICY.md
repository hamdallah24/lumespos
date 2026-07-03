# ECP-035 — Organizational Kernel

Status: FROZEN. Central nervous system of the AI Organization.

## Authority

Kernel is the sole coordinator. No Runtime may directly call another Runtime.
All communication: Kernel.emit() / Kernel.on().

## Architecture

Founder -> Kernel -> CEO -> Kernel -> Mission -> Kernel -> CTO -> Kernel -> Response

## Lifecycle

BOOT -> READY -> ACTIVE -> MAINTENANCE -> RECOVERY -> SHUTDOWN

## Recovery

Crash -> Kernel detects (heartbeat missed) -> Restore checkpoint -> Resume mission

## Policy

Heartbeat interval: 10s | Max misses: 3 | Checkpoint interval: on state change
Recovery: auto-recover on dead heartbeat | Max retries: 2
