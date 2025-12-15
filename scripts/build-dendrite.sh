#!/usr/bin/env bash
set -e

# ============================================
# Dendrite WASM Build Script
# ============================================
# Builds the dendrite_core Rust crate to WASM
# and copies artifacts to the VS Code contribution

echo "🌳 Building Dendrite Core (WASM)..."

# Navigate to crate directory
cd "$(dirname "$0")/../crates/dendrite_core"

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Install with: cargo install wasm-pack"
    exit 1
fi

# Build with wasm-pack
echo "📦 Running wasm-pack build..."
wasm-pack build --target web --out-dir pkg --release

# Verify build artifacts
if [ ! -f "pkg/dendrite_core_bg.wasm" ]; then
    echo "❌ WASM build failed - no .wasm file generated"
    exit 1
fi

if [ ! -f "pkg/dendrite_core.js" ]; then
    echo "❌ WASM build failed - no .js file generated"
    exit 1
fi

# Show build stats
echo "✅ WASM build successful!"
echo ""
echo "Build artifacts:"
ls -lh pkg/dendrite_core*
echo ""

# Calculate WASM size
WASM_SIZE=$(du -h pkg/dendrite_core_bg.wasm | cut -f1)
echo "WASM size: $WASM_SIZE"

# Create target directory for VS Code contribution (for era 2)
TARGET_DIR="../../src/vs/workbench/contrib/dendrite/browser/wasm"
mkdir -p "$TARGET_DIR"

# Copy artifacts
echo ""
echo "📋 Copying artifacts to $TARGET_DIR..."
cp pkg/dendrite_core_bg.wasm "$TARGET_DIR/"
cp pkg/dendrite_core.js "$TARGET_DIR/"
cp pkg/dendrite_core.d.ts "$TARGET_DIR/" 2>/dev/null || true

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  - WASM artifacts are in crates/dendrite_core/pkg/"
echo "  - Copied to $TARGET_DIR/"
echo "  - Ready for VS Code integration (Era 2)"
