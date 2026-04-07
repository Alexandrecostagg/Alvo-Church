#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
BIN_DIR="$APP_DIR/.cloudflare-bin"

mkdir -p "$BIN_DIR"

cat > "$BIN_DIR/pnpm" <<'EOF'
#!/bin/sh
exec corepack pnpm "$@"
EOF

chmod +x "$BIN_DIR/pnpm"

PATH="$BIN_DIR:$PATH" "$@"
