#!/bin/bash

# Hook Execution Engine
# Runs app-specific hooks with parallel execution and error handling

# Source utilities if not already sourced
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! type print_info &> /dev/null; then
    source "$SCRIPT_DIR/utils.sh"
fi

# Configuration
HOOK_TIMEOUT="${HOOK_TIMEOUT:-120}" # Default 2 minutes per hook
PARALLEL_EXECUTION="${PARALLEL_EXECUTION:-true}" # Run hooks in parallel by default

# Run hooks for all changed apps
run_app_hooks() {
    local changed_apps="$@"
    local repo_root=$(get_repo_root)
    local hook_type="${HOOK_TYPE:-pre-commit}"
    
    if [ -z "$changed_apps" ]; then
        print_warning "No apps specified for hook execution"
        return 0
    fi
    
    print_info "Running $hook_type hooks for: $changed_apps"
    
    # Validate tools before running hooks
    if ! validate_app_tools "$changed_apps"; then
        print_error "Missing required tools. Please install them and try again."
        return 1
    fi
    
    if [ "$PARALLEL_EXECUTION" = "true" ] && [ $(echo "$changed_apps" | wc -w) -gt 1 ]; then
        run_hooks_parallel $changed_apps
    else
        run_hooks_sequential $changed_apps
    fi
}

# Run hooks sequentially
run_hooks_sequential() {
    local apps="$@"
    local repo_root=$(get_repo_root)
    local hook_type="${HOOK_TYPE:-pre-commit}"
    local failed_apps=""
    local total_start_time=$(date +%s)
    
    for app in $apps; do
        local app_hook_dir=""
        case "$app" in
            "frontend")
                app_hook_dir="$repo_root/apps/frontend/.githooks"
                ;;
            "api")
                app_hook_dir="$repo_root/apps/api/.githooks"
                ;;
            "discord-bot")
                app_hook_dir="$repo_root/apps/discord-bot/.githooks"
                ;;
            "userscript")
                app_hook_dir="$repo_root/userscript/.githooks"
                ;;
            *)
                print_warning "Unknown app: $app"
                continue
                ;;
        esac
        
        local hook_script="$app_hook_dir/$hook_type"
        
        if [ ! -f "$hook_script" ]; then
            print_warning "No $hook_type hook found for $app"
            continue
        fi
        
        print_info "Running $app $hook_type hook..."
        
        local start_time=$(date +%s)
        
        # Make hook executable
        chmod +x "$hook_script"
        
        # Run hook with timeout
        if run_with_timeout "$HOOK_TIMEOUT" "$hook_script"; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            print_success "$app hook completed (${duration}s)"
        else
            local exit_code=$?
            failed_apps="${failed_apps}$app "
            print_error "$app hook failed with exit code $exit_code"
            
            # Fail fast - stop on first failure
            if [ "${FAIL_FAST:-true}" = "true" ]; then
                print_error "Stopping due to hook failure (set FAIL_FAST=false to continue)"
                return 1
            fi
        fi
    done
    
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - total_start_time))
    
    if [ -n "$failed_apps" ]; then
        print_error "Failed hooks: $failed_apps"
        print_info "Total execution time: ${total_duration}s"
        return 1
    fi
    
    print_success "All hooks completed successfully in ${total_duration}s"
    return 0
}

# Run hooks in parallel
run_hooks_parallel() {
    local apps="$@"
    local repo_root=$(get_repo_root)
    local hook_type="${HOOK_TYPE:-pre-commit}"
    local pids=""
    local failed_apps=""
    local total_start_time=$(date +%s)
    
    # Create unique temp directory for this run
    local temp_dir="/tmp/githooks_$$_$(date +%s)_${RANDOM}"
    mkdir -p "$temp_dir"
    trap "rm -rf '$temp_dir'" EXIT
    
    print_info "Running hooks in parallel..."
    
    # Export temp directory for child processes
    export GITHOOK_TEMP_DIR="$temp_dir"
    
    # Start all hooks in background
    for app in $apps; do
        run_single_app_hook "$app" &
        local pid=$!
        pids="$pids $pid"
        print_step "Started $app hook (PID: $pid)"
    done
    
    # Wait for all hooks to complete
    local any_failed=false
    for pid in $pids; do
        wait $pid
        local exit_code=$?
        if [ $exit_code -ne 0 ]; then
            any_failed=true
            # Find which app failed
            for app in $apps; do
                if [ -f "$temp_dir/githook_${app}_${pid}.failed" ]; then
                    failed_apps="${failed_apps}$app "
                fi
            done
        fi
    done
    
    # Clean up temp directory
    rm -rf "$temp_dir"
    
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - total_start_time))
    
    if [ "$any_failed" = true ]; then
        print_error "Failed hooks: ${failed_apps:-unknown}"
        print_info "Total execution time: ${total_duration}s"
        return 1
    fi
    
    print_success "All hooks completed successfully in ${total_duration}s (parallel execution)"
    return 0
}

# Run a single app hook (for parallel execution)
run_single_app_hook() {
    local app="$1"
    local repo_root=$(get_repo_root)
    local hook_type="${HOOK_TYPE:-pre-commit}"
    local pid=$$
    
    local app_hook_dir=""
    case "$app" in
        "frontend")
            app_hook_dir="$repo_root/apps/frontend/.githooks"
            ;;
        "api")
            app_hook_dir="$repo_root/apps/api/.githooks"
            ;;
        "discord-bot")
            app_hook_dir="$repo_root/apps/discord-bot/.githooks"
            ;;
        "userscript")
            app_hook_dir="$repo_root/userscript/.githooks"
            ;;
        *)
            print_warning "Unknown app: $app"
            return 0
            ;;
    esac
    
    local hook_script="$app_hook_dir/$hook_type"
    
    if [ ! -f "$hook_script" ]; then
        print_warning "No $hook_type hook found for $app"
        return 0
    fi
    
    # Make hook executable
    chmod +x "$hook_script"
    
    # Run hook with timeout
    if ! run_with_timeout "$HOOK_TIMEOUT" "$hook_script"; then
        # Mark this app as failed for the parent process
        # Use the temp directory from environment if available
        local temp_marker="${GITHOOK_TEMP_DIR:-/tmp}/githook_${app}_${PPID}.failed"
        touch "$temp_marker"
        return 1
    fi
    
    return 0
}

# Get hook status for an app
get_hook_status() {
    local app="$1"
    local repo_root=$(get_repo_root)
    local hook_type="${HOOK_TYPE:-pre-commit}"
    
    local app_hook_dir=""
    case "$app" in
        "frontend")
            app_hook_dir="$repo_root/apps/frontend/.githooks"
            ;;
        "api")
            app_hook_dir="$repo_root/apps/api/.githooks"
            ;;
        "discord-bot")
            app_hook_dir="$repo_root/apps/discord-bot/.githooks"
            ;;
        "userscript")
            app_hook_dir="$repo_root/userscript/.githooks"
            ;;
        *)
            echo "unknown"
            return
            ;;
    esac
    
    local hook_script="$app_hook_dir/$hook_type"
    
    if [ ! -f "$hook_script" ]; then
        echo "not-configured"
    elif [ ! -x "$hook_script" ]; then
        echo "not-executable"
    else
        echo "ready"
    fi
}

# Clean up temporary files
cleanup_temp_files() {
    # Clean up any leftover temp directories from previous runs
    find /tmp -maxdepth 1 -name 'githooks_*' -type d -mtime +1 -exec rm -rf {} + 2>/dev/null || true
}

# Export functions
export -f run_app_hooks
export -f run_hooks_sequential
export -f run_hooks_parallel
export -f run_single_app_hook
export -f get_hook_status
export -f cleanup_temp_files