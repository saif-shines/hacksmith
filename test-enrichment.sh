#!/bin/bash

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Run hacksmith with enrichment
cd packages/hacksmith
echo "" | node dist/run.js preferences brief

# Show the generated mission brief
echo ""
echo "========================================="
echo "Generated Mission Brief:"
echo "========================================="
cat ~/.hacksmith/mission-brief.md
