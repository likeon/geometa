#!/bin/bash

# Git Hooks Setup Script
# Installs and configures git hooks for the geometa monorepo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print header
print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║     Git Hooks Setup for Geometa Monorepo    ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print step
print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

# Print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get repository root
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    print_error "Not in a git repository"
    exit 1
}

GITHOOKS_DIR="$REPO_ROOT/.githooks"

# Version checking functions
check_node_version() {
    local min_version="18"
    if command -v node &> /dev/null; then
        local version=$(node --version | sed 's/v//')
        local major=$(echo "$version" | cut -d. -f1)
        if [ "$major" -lt "$min_version" ]; then
            print_warning "Node.js v$version detected. Minimum v$min_version recommended for optimal compatibility."
            return 1
        fi
        return 0
    fi
    return 2  # Not installed
}

check_npm_version() {
    local min_version="8"
    if command -v npm &> /dev/null; then
        local version=$(npm --version)
        local major=$(echo "$version" | cut -d. -f1)
        if [ "$major" -lt "$min_version" ]; then
            print_warning "npm v$version detected. Minimum v$min_version recommended."
            return 1
        fi
        return 0
    fi
    return 2  # Not installed
}

check_bun_version() {
    local min_version="1.0"
    if command -v bun &> /dev/null; then
        local version=$(bun --version)
        local major=$(echo "$version" | cut -d. -f1)
        local minor=$(echo "$version" | cut -d. -f2)
        if [ "$major" -lt "1" ]; then
            print_warning "Bun v$version detected. Minimum v$min_version recommended."
            return 1
        fi
        return 0
    fi
    return 2  # Not installed
}

check_cargo_version() {
    # Cargo version format is more complex, just check if reasonably recent
    if command -v cargo &> /dev/null; then
        local version=$(cargo --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        local major=$(echo "$version" | cut -d. -f1)
        local minor=$(echo "$version" | cut -d. -f2)
        # Rust 1.70+ recommended (2023)
        if [ "$major" -eq "1" ] && [ "$minor" -lt "70" ]; then
            print_warning "Cargo v$version detected. Version 1.70+ recommended for latest features."
            return 1
        fi
        return 0
    fi
    return 2  # Not installed
}

# Verify we're in the right repository
verify_repository() {
    print_step "Verifying repository..."
    
    if [ ! -f "$REPO_ROOT/justfile" ] || [ ! -d "$REPO_ROOT/apps" ]; then
        print_error "This doesn't appear to be the geometa repository"
        exit 1
    fi
    
    print_success "Repository verified"
}

# Check runtime dependencies
check_dependencies() {
    print_step "Checking runtime dependencies..."
    
    local missing_deps=""
    
    # Check Node.js
    check_node_version
    local node_status=$?
    if [ $node_status -eq 2 ]; then
        missing_deps="${missing_deps}  - Node.js (required for frontend and userscript)\n"
    elif [ $node_status -eq 0 ]; then
        echo "  ✓ Node.js $(node --version)"
    else
        echo "  ⚠ Node.js $(node --version) (version warning above)"
    fi
    
    # Check npm
    check_npm_version
    local npm_status=$?
    if [ $npm_status -eq 2 ]; then
        missing_deps="${missing_deps}  - npm (required for frontend and userscript)\n"
    elif [ $npm_status -eq 0 ]; then
        echo "  ✓ npm $(npm --version)"
    else
        echo "  ⚠ npm $(npm --version) (version warning above)"
    fi
    
    # Check Bun
    check_bun_version
    local bun_status=$?
    if [ $bun_status -eq 2 ]; then
        missing_deps="${missing_deps}  - Bun (required for API)\n"
    elif [ $bun_status -eq 0 ]; then
        echo "  ✓ Bun $(bun --version)"
    else
        echo "  ⚠ Bun $(bun --version) (version warning above)"
    fi
    
    # Check Rust/Cargo
    check_cargo_version
    local cargo_status=$?
    if [ $cargo_status -eq 2 ]; then
        missing_deps="${missing_deps}  - Cargo/Rust (required for discord-bot)\n"
    elif [ $cargo_status -eq 0 ]; then
        echo "  ✓ Cargo $(cargo --version | head -1)"
    else
        echo "  ⚠ Cargo $(cargo --version | head -1) (version warning above)"
    fi
    
    if [ -n "$missing_deps" ]; then
        print_warning "Missing dependencies:"
        echo -e "$missing_deps"
        echo ""
        echo "The following tools are missing but may be needed:"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - Bun: https://bun.sh/"
        echo "  - Rust: https://rustup.rs/"
        echo ""
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "All dependencies found"
    fi
}

# Clean up old husky configuration
cleanup_old_hooks() {
    print_step "Cleaning up old hook configurations..."
    
    # Remove .husky directories if they exist
    if [ -d "$REPO_ROOT/.husky" ]; then
        rm -rf "$REPO_ROOT/.husky"
        echo "  → Removed root .husky directory"
    fi
    
    if [ -d "$REPO_ROOT/apps/frontend/.husky" ]; then
        rm -rf "$REPO_ROOT/apps/frontend/.husky"
        echo "  → Removed frontend .husky directory"
    fi
    
    print_success "Cleanup completed"
}

# Make scripts executable
make_scripts_executable() {
    print_step "Making scripts executable..."
    
    # Make library scripts executable
    chmod +x "$GITHOOKS_DIR/lib/"*.sh 2>/dev/null || true
    
    # Make hook templates executable
    chmod +x "$GITHOOKS_DIR/hooks/"* 2>/dev/null || true
    
    # Make app hooks executable
    chmod +x "$REPO_ROOT/apps/frontend/.githooks/"* 2>/dev/null || true
    chmod +x "$REPO_ROOT/apps/api/.githooks/"* 2>/dev/null || true
    chmod +x "$REPO_ROOT/apps/discord-bot/.githooks/"* 2>/dev/null || true
    chmod +x "$REPO_ROOT/userscript/.githooks/"* 2>/dev/null || true
    
    print_success "Scripts are now executable"
}

# Install git hooks
install_git_hooks() {
    print_step "Installing git hooks..."
    
    # Create .git/hooks directory if it doesn't exist
    mkdir -p "$REPO_ROOT/.git/hooks"
    
    # Install pre-commit hook
    if [ -f "$GITHOOKS_DIR/hooks/pre-commit" ]; then
        cp "$GITHOOKS_DIR/hooks/pre-commit" "$REPO_ROOT/.git/hooks/pre-commit"
        chmod +x "$REPO_ROOT/.git/hooks/pre-commit"
        echo "  → Installed pre-commit hook"
    else
        print_error "pre-commit hook template not found"
        exit 1
    fi
    
    # Optional: Install pre-push hook if it exists
    if [ -f "$GITHOOKS_DIR/hooks/pre-push" ]; then
        cp "$GITHOOKS_DIR/hooks/pre-push" "$REPO_ROOT/.git/hooks/pre-push"
        chmod +x "$REPO_ROOT/.git/hooks/pre-push"
        echo "  → Installed pre-push hook"
    fi
    
    print_success "Git hooks installed"
}

# Verify installation
verify_installation() {
    print_step "Verifying installation..."
    
    local errors=0
    
    # Check if main hook is installed
    if [ ! -x "$REPO_ROOT/.git/hooks/pre-commit" ]; then
        print_error "pre-commit hook not installed properly"
        ((errors++))
    else
        echo "  ✓ pre-commit hook installed"
    fi
    
    # Check if app hooks exist
    local apps=("apps/frontend" "apps/api" "apps/discord-bot" "userscript")
    for app in "${apps[@]}"; do
        if [ -f "$REPO_ROOT/$app/.githooks/pre-commit" ]; then
            echo "  ✓ $app hooks configured"
        else
            print_warning "$app hooks not found (will be skipped)"
        fi
    done
    
    if [ $errors -gt 0 ]; then
        print_error "Installation verification failed"
        exit 1
    fi
    
    print_success "Installation verified"
}

# Test hooks (optional)
test_hooks() {
    read -p "Would you like to test the hooks with a dummy commit? (y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Testing hooks..."
        
        # Create a temporary test file
        local test_file="$REPO_ROOT/.githooks/test-hook-$$"
        echo "test" > "$test_file"
        
        # Try to stage and commit
        git add "$test_file"
        
        if git commit -m "test: testing git hooks setup" --dry-run; then
            print_success "Hooks are working!"
        else
            print_warning "Hook test had issues (this might be expected if there are linting errors)"
        fi
        
        # Clean up
        git reset HEAD "$test_file" 2>/dev/null || true
        rm -f "$test_file"
    fi
}

# Print usage instructions
print_usage() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Git hooks setup completed successfully!${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📝 Usage Instructions:"
    echo ""
    echo "  The hooks will automatically run when you commit changes."
    echo "  Each app's hooks will only run if files in that app are staged."
    echo ""
    echo "  Affected apps and their checks:"
    echo "    • Frontend:    ESLint, Prettier, Type checking"
    echo "    • API:         Biome linting and formatting"
    echo "    • Discord-bot: Cargo fmt, Cargo clippy"
    echo "    • Userscript:  Prettier, svelte-check"
    echo ""
    echo "📌 Useful Commands:"
    echo ""
    echo "  • Skip hooks once:     git commit --no-verify"
    echo "  • Verbose output:      VERBOSE=true git commit"
    echo "  • Sequential mode:     PARALLEL_EXECUTION=false git commit"
    echo "  • Re-run setup:        ./.githooks/setup.sh"
    echo ""
    echo "📚 Documentation:"
    echo ""
    echo "  See .githooks/README.md for more details"
    echo ""
}

# Main execution
main() {
    print_header
    
    cd "$REPO_ROOT"
    
    verify_repository
    check_dependencies
    cleanup_old_hooks
    make_scripts_executable
    install_git_hooks
    verify_installation
    test_hooks
    print_usage
}

# Handle errors
error_handler() {
    print_error "Setup failed on line $1"
    exit 1
}

trap 'error_handler ${LINENO}' ERR

# Run main function
main "$@"