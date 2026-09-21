#!/bin/sh
set -eu
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/workkit-${STAMP}.dump"
echo "Saved backups/workkit-${STAMP}.dump"
