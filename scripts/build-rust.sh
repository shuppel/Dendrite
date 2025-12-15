#!/bin/bash
set -e

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack could not be found. Please install it: https://rustwasm.github.io/wasm-pack/installer/"
    exit 1
fi

echo "Building Dendrite Engine..."
cd crates/dendrite_engine
wasm-pack build --target web --out-dir ../../src/vs/workbench/services/dendrite/common/pkg

echo "Build complete. WASM module is in src/vs/workbench/services/dendrite/common/pkg"
