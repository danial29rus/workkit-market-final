#!/bin/sh
set -eu
docker compose logs -f --tail=200 "$@"
