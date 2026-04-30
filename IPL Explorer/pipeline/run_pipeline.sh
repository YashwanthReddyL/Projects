#!/usr/bin/env bash
# run_pipeline.sh
# ===============
# One-command pipeline: YAML → CSV → indexes → validation → (optional) ML training
#
# Usage:
#   ./pipeline/run_pipeline.sh                  # full pipeline + train ML model
#   ./pipeline/run_pipeline.sh --skip-ml        # skip ML training (faster)
#   ./pipeline/run_pipeline.sh --raw /path/to/yamls

set -e

RAW="data/raw"
OUT="data/processed"
SKIP_ML=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --raw)     RAW="$2"; shift ;;
        --out)     OUT="$2"; shift ;;
        --skip-ml) SKIP_ML=true ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
    shift
done

echo "========================================"
echo "  IPL Explorer — Data Pipeline"
echo "  Raw YAMLs : $RAW"
echo "  Output    : $OUT"
echo "========================================"

mkdir -p "$OUT"

echo ""
echo "Step 1/4 — Converting YAML → CSV..."
python pipeline/ipl_yaml_to_csv.py --input "$RAW" --output "$OUT"

echo ""
echo "Step 2/4 — Building indexes..."
python pipeline/build_indexes.py --processed "$OUT" --raw "$RAW"

echo ""
echo "Step 3/4 — Validating..."
python pipeline/validate.py --processed "$OUT"

if [ "$SKIP_ML" = false ]; then
    echo ""
    echo "Step 4/4 — Training win probability model..."
    python pipeline/train_win_model.py
else
    echo ""
    echo "Step 4/4 — Skipping ML training (--skip-ml)"
fi

echo ""
echo "========================================"
echo "  Pipeline complete!"
echo ""
echo "  Start the backend:"
echo "  cd backend && uvicorn main:app --reload --port 8000"
echo "========================================"
