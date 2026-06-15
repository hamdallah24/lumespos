# Fix Tutup Shift Submit

## What & Why
Cashiers cannot submit "Tutup Shift". The submit handler hard-requires a webcam photo (`if (!photoBlob) return`), but the live webcam (`getUserMedia`) is blocked inside the Replit preview iframe because the embedded preview is not granted camera permission. With no way to capture a photo, the photo check returns early and the `POST /shift-audits` request is never sent — confirmed by server logs showing repeated `GET /shift-audits/expected` but zero POSTs. The backend already treats the proof photo as optional (`photoProofUrl` is nullable; only `branchId` + `actualStock` are required), so the block is purely client-side.

## Done looks like
- A cashier can complete and submit Tutup Shift even when the live webcam is unavailable (e.g. inside the Replit preview).
- The proof photo can be provided either by the webcam (primary) or by choosing/taking a photo via a file picker fallback (`<input type="file" accept="image/*" capture="environment">`).
- After submit, a success toast appears and the audit shows up in the owner's Audit Shift list.
- If photo capture genuinely fails, the user gets a clear message rather than a silent no-op.

## Out of scope
- Changing the shift-audit data model or backend reconciliation logic.
- Making the proof photo fully optional (a photo is still expected; we only add a non-webcam way to provide it).

## Steps
1. **Add a file-upload fallback for the proof photo** — Alongside the existing webcam capture UI, add a "Pilih/Unggah Foto" control backed by a hidden file input (`accept="image/*"`, `capture="environment"`) that sets the same `photoBlob`/`photoUrl` state used by the rest of the flow, so the upload + submit path is unchanged.
2. **Keep webcam as primary, fail gracefully** — When the webcam cannot be opened, surface the existing error toast and guide the user to the upload fallback instead of leaving the button inert.
3. **Verify end-to-end** — Confirm that providing a photo via the file picker, entering counts, and pressing "Kirim Tutup Shift" produces a `POST /shift-audits` (201) and the new audit is visible to the owner.

## Relevant files
- `artifacts/pos-app/src/pages/shift.tsx`
- `artifacts/api-server/src/routes/shiftAudits.ts`
- `artifacts/api-server/src/routes/storage.ts`
