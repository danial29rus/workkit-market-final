#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo "Usage: ./scripts/restore.sh backups/file.dump"
  exit 1
fi
FILE=$1
[ -f "$FILE" ] || { echo "File not found: $FILE"; exit 1; }
cat "$FILE" | docker compose exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
echo "Restored $FILE"
