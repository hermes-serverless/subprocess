#!/bin/bash
set -euo pipefail

SECONDS=0

yarn test
while [ "$?" == "0" ]; do
  yarn test
  printf "====== SECONDS: %s =======\n\n" "$SECONDS"
  if [ $SECONDS -gt 7200 ]; then
    exit 0
  fi
done

echo "DONE STRESS"