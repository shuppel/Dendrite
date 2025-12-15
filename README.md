# Dendrite

A privacy-first, learning-centric IDE built on VS Code.

## Vision

Dendrite transforms your repository into an active proof of learning — tracking your progress, surfacing concepts, and building a living portfolio as you code.

## Features

- **Privacy-first**: No telemetry, no marketplace, no external dependencies
- **Learning Engine**: Rust/WASM powered session tracking and concept extraction
- **Journey Dashboard**: Visualize your progress and skill development
- **Portfolio Export**: Generate shareable proof-of-learning artifacts

## Architecture

```
+-------------------------------------------------------------+
|                        Dendrite IDE                         |
+-------------------------------------------------------------+
|  UI Layer          | TypeScript Services | Rust/WASM Engine |
|  - Editor          | - Dendrite Service  | - Session Tracker|
|  - Journey Panel   | - WASM Bridge       | - Concept Extract|
|  - Terminal        | - Portfolio Service | - Proof Generator|
+-------------------------------------------------------------+
```

## Development

### Prerequisites

- Node.js 18+
- Rust + wasm-pack
- yarn

### Setup

```bash
# Install dependencies
yarn

# Build WASM modules
./scripts/build-rust.sh

# Compile TypeScript
yarn compile
```

### Run

```bash
./scripts/code.sh
```

### Build WASM Engine

```bash
# Requires wasm-pack: https://rustwasm.github.io/wasm-pack/installer/
./scripts/build-rust.sh
```

## Project Structure

```
dendrite/
├── crates/
│   └── dendrite_engine/      # Rust/WASM core engine
├── docs/
│   └── build-book.md         # Product & technical specification
├── src/vs/workbench/
│   ├── contrib/dendrite/     # Journey UI components
│   └── services/dendrite/    # TypeScript services (planned)
└── scripts/
    └── build-rust.sh         # WASM build script
```

## Documentation

See [docs/build-book.md](docs/build-book.md) for the full product specification and technical architecture.

## License

MIT — See [LICENSE.txt](LICENSE.txt)
