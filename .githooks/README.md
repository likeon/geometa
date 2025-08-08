# Git Hooks for Geometa Monorepo

A shell-based git hooks system that provides app-specific linting and formatting for the geometa monorepo.

## Features

- 🚀 **Monorepo Support**: Each app has its own hooks that run only when relevant files change
- ⚡ **Parallel Execution**: Multiple app hooks run concurrently for faster commits
- 🔧 **Language Agnostic**: Pure shell scripts work with any runtime (Node.js, Bun, Rust)
- 🎯 **Smart Detection**: Only runs hooks for apps with staged changes
- 🛡️ **Fail Fast**: Stops on first error to save time
- 📊 **Clear Feedback**: Colored output shows exactly what's running and what failed

## Quick Start

```bash
# Install git hooks
./.githooks/setup.sh

# That's it! Hooks will run automatically on commit
```

## Architecture

```
.githooks/
├── setup.sh                 # One-command installation
├── lib/
│   ├── utils.sh            # Common utilities
│   ├── detect-changes.sh   # File pattern detection
│   └── run-app-hooks.sh    # Hook execution engine
└── hooks/
    └── pre-commit          # Main dispatcher

apps/frontend/.githooks/     # Frontend-specific hooks
apps/api/.githooks/          # API-specific hooks
apps/discord-bot/.githooks/  # Discord bot hooks
userscript/.githooks/        # Userscript hooks
```

## How It Works

1. When you run `git commit`, the pre-commit hook is triggered
2. The dispatcher detects which files are staged using `git diff --cached`
3. It determines which apps are affected based on file patterns
4. App-specific hooks are executed (in parallel by default)
5. If all hooks pass, the commit proceeds; otherwise, it's blocked

## App-Specific Checks

### Frontend (SvelteKit)
- **Type Checking**: `npm run check`
- **Linting**: `npm run lint` (ESLint + Prettier check)
- **Formatting**: `npm run format` (Prettier fix)

### API (Elysia.js/Bun)
- **Linting**: `bun run lint` (Biome check)
- **Formatting**: `bun run format` (Biome fix)

### Discord Bot (Rust)
- **Formatting**: `cargo fmt`
- **Linting**: `cargo clippy`
- **Compilation**: `cargo check`

### Userscript
- **Formatting**: `npm run format` (Prettier)
- **Type Checking**: `npm run check` (svelte-check)

## Configuration

### Environment Variables

```bash
# Skip hooks for one commit
git commit --no-verify

# Enable verbose output
VERBOSE=true git commit

# Run hooks sequentially instead of parallel
PARALLEL_EXECUTION=false git commit

# Set custom timeout (seconds)
HOOK_TIMEOUT=300 git commit

# Skip hooks in CI
CI=true git commit
# or
GIT_SKIP_HOOKS=1 git commit
```

### Adding a New App

1. Create the hooks directory:
   ```bash
   mkdir apps/new-app/.githooks
   ```

2. Create a pre-commit hook:
   ```bash
   cat > apps/new-app/.githooks/pre-commit << 'EOF'
   #!/bin/bash
   set -e
   
   APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
   cd "$APP_DIR"
   
   echo "Running new-app checks..."
   # Add your linting/formatting commands here
   
   # Re-stage formatted files
   git add -u apps/new-app/
   EOF
   
   chmod +x apps/new-app/.githooks/pre-commit
   ```

3. Update file patterns in `.githooks/lib/detect-changes.sh`:
   ```bash
   NEW_APP_PATTERNS=(
       "apps/new-app/*.js"
       "apps/new-app/src/*"
   )
   ```

4. Add detection logic in the same file:
   ```bash
   if has_app_changes "$staged_files" "${NEW_APP_PATTERNS[@]}"; then
       changed_apps="${changed_apps}new-app "
   fi
   ```

## Troubleshooting

### Hooks Not Running

```bash
# Verify installation
ls -la .git/hooks/pre-commit

# Re-run setup
./.githooks/setup.sh

# Check for errors
VERBOSE=true git commit
```

### Hooks Running Too Slowly

```bash
# Use sequential execution to debug
PARALLEL_EXECUTION=false VERBOSE=true git commit

# Increase timeout if needed
HOOK_TIMEOUT=300 git commit
```

### Missing Dependencies

The setup script will warn about missing tools. Install as needed:

- **Node.js**: https://nodejs.org/
- **Bun**: https://bun.sh/
- **Rust**: https://rustup.rs/

### Bypassing Hooks

In emergencies, you can skip hooks:

```bash
git commit --no-verify -m "emergency: bypassing hooks"
```

⚠️ **Use with caution!** This bypasses all quality checks.

## File Patterns

The system detects changes based on file patterns. Current patterns:

### Frontend
- `apps/frontend/**/*.{ts,js,svelte,json,css,html}`
- `apps/frontend/{src,static,tests}/**/*`
- Config files: `eslint.config.js`, `svelte.config.js`, `vite.config.ts`, etc.

### API
- `apps/api/**/*.{ts,js,json}`
- `apps/api/{src,migrations,tests}/**/*`
- Config files: `biome.json`, `drizzle.config.ts`, `tsconfig.json`

### Discord Bot
- `apps/discord-bot/**/*.rs`
- `apps/discord-bot/{src,tests}/**/*`
- `Cargo.toml`, `Cargo.lock`

### Userscript
- `userscript/**/*.{ts,js,svelte,json}`
- `userscript/{src,static}/**/*`
- Config files: `tsconfig.json`, `svelte.config.js`, `vite.config.ts`

## Performance

The hooks system is optimized for speed:

- **Parallel Execution**: Multiple apps checked simultaneously
- **Smart Detection**: Only runs relevant hooks
- **Early Exit**: Fails fast on first error
- **Timeout Protection**: Prevents hanging on long operations

Typical execution times:
- Single app: 2-5 seconds
- Multiple apps: 5-10 seconds (parallel)
- Full monorepo: 10-15 seconds

## Development Tips

### Testing Hooks Locally

```bash
# Create a test file
echo "test" > apps/frontend/test.js
git add apps/frontend/test.js

# Test with dry run
git commit --dry-run -m "test"

# Clean up
git reset HEAD apps/frontend/test.js
rm apps/frontend/test.js
```

### Debugging Hook Failures

```bash
# Run with verbose output
VERBOSE=true git commit

# Run hooks directly
./.git/hooks/pre-commit

# Test specific app hook
./apps/frontend/.githooks/pre-commit
```

### Customizing for Your Workflow

You can modify the hooks to suit your needs:

1. **Skip formatting**: Remove `npm run format` lines
2. **Add tests**: Add `npm test` or `cargo test`
3. **Custom checks**: Add any command that returns 0 on success

## Contributing

To improve the git hooks system:

1. Test your changes thoroughly
2. Update this README if needed
3. Ensure backward compatibility
4. Add tests for new features

## License

Part of the geometa project. See repository LICENSE for details.