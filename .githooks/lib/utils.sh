#!/bin/bash

# Git Hooks Utilities
# Common functions for git hooks in geometa monorepo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

# Get repository root directory
get_repo_root() {
    git rev-parse --show-toplevel
}

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check runtime dependencies for an app
check_app_runtime() {
    local app="$1"
    case "$app" in
        "frontend"|"userscript")
            if ! command_exists "node"; then
                print_error "Node.js is required for $app but not found"
                return 1
            fi
            if ! command_exists "npm"; then
                print_error "npm is required for $app but not found"
                return 1
            fi
            ;;
        "api")
            if ! command_exists "bun"; then
                print_error "Bun is required for $app but not found"
                return 1
            fi
            ;;
        "discord-bot")
            if ! command_exists "cargo"; then
                print_error "Cargo (Rust) is required for $app but not found"
                return 1
            fi
            ;;
    esac
    return 0
}

# Run a command with timeout
run_with_timeout() {
    local timeout="$1"
    shift
    local command="$@"
    
    timeout "$timeout" bash -c "$command"
    local exit_code=$?
    
    if [ $exit_code -eq 124 ]; then
        print_error "Command timed out after ${timeout} seconds: $command"
        return 1
    fi
    
    return $exit_code
}

# Check if running in CI environment
is_ci() {
    [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] || [ -n "${GITLAB_CI:-}" ]
}

# Get list of staged files
get_staged_files() {
    git diff --cached --name-only --diff-filter=ACM
}

# Check if file matches any pattern in list
file_matches_patterns() {
    local file="$1"
    shift
    local patterns=("$@")
    
    for pattern in "${patterns[@]}"; do
        if [[ "$file" == $pattern ]]; then
            return 0
        fi
    done
    
    return 1
}

# Execute hook with proper error handling
execute_hook() {
    local hook_path="$1"
    local app_name="$2"
    
    if [ ! -f "$hook_path" ]; then
        print_warning "No hook found at $hook_path"
        return 0
    fi
    
    if [ ! -x "$hook_path" ]; then
        chmod +x "$hook_path"
    fi
    
    print_info "Running $app_name hooks..."
    
    # Execute the hook
    "$hook_path"
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        print_error "$app_name hooks failed with exit code $exit_code"
        return $exit_code
    fi
    
    print_success "$app_name hooks passed"
    return 0
}

# Measure execution time
measure_time() {
    local start_time=$(date +%s)
    "$@"
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $duration -gt 5 ]; then
        print_info "Execution took ${duration} seconds"
    fi
    
    return $exit_code
}

# Handle hook bypass
should_skip_hooks() {
    # Check for --no-verify flag
    if [ "${GIT_SKIP_HOOKS:-}" = "1" ]; then
        print_warning "Skipping hooks (GIT_SKIP_HOOKS=1)"
        return 0
    fi
    
    # Check if in CI and should skip
    if is_ci && [ "${SKIP_HOOKS_IN_CI:-}" = "1" ]; then
        print_warning "Skipping hooks in CI environment"
        return 0
    fi
    
    return 1
}

# Export functions for use in other scripts
export -f print_error
export -f print_success
export -f print_warning
export -f print_info
export -f print_step
export -f get_repo_root
export -f command_exists
export -f check_app_runtime
export -f run_with_timeout
export -f is_ci
export -f get_staged_files
export -f file_matches_patterns
export -f execute_hook
export -f measure_time
export -f should_skip_hooks