#!/usr/bin/env bash
# ADR-009: Dead Code Detection Script
# Usage: bash scripts/check-dead-code.sh
# CI: Run before merge. Warnings → manual review. Errors → block merge.
# Stage 1: @deprecated → CI WARNING
# Stage 2: After 1 release → CI ERROR
# Stage 3: After confirmed unused → DELETE

echo "=== ADR-009 Dead Code Check ==="

# Check TypeScript for unused locals/parameters
UNUSED=$(npx tsc --noUnusedLocals --noUnusedParameters 2>&1 | grep "is declared but" || true)

if [ -n "$UNUSED" ]; then
  echo "WARNING: Unused declarations found:"
  echo "$UNUSED"
  echo ""
fi

# Check for @deprecated imports
DEPRECATED_IMPORTS=$(grep -rn "@deprecated" artifacts/api-server/src/ --include="*.ts" -l 2>/dev/null || true)

if [ -n "$DEPRECATED_IMPORTS" ]; then
  echo "WARNING: @deprecated files found:"
  echo "$DEPRECATED_IMPORTS"
  echo "Stage 1: CI Warning. Stage 2 (next release): CI Error. Stage 3: DELETE."
fi

# Check for orphaned exports (heuristic — files with export but 0 imports)
# More thorough check requires AST analysis; this is a basic grep-based scan
echo ""
echo "NOTE: For thorough dead export analysis, use: npx ts-prune"
echo "=== Done ==="

exit 0  # Warning only for now. Change to exit 1 in Stage 2.
