#!/bin/bash

# File Pattern Detection for Git Hooks
# Determines which apps have changes based on file patterns

# Source utilities if not already sourced
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! type print_info &> /dev/null; then
    source "$SCRIPT_DIR/utils.sh"
fi

# Define file patterns for each app
declare -A APP_PATTERNS

# Frontend patterns
FRONTEND_PATTERNS=(
    "apps/frontend/*.ts"
    "apps/frontend/*.js"
    "apps/frontend/*.svelte"
    "apps/frontend/*.json"
    "apps/frontend/*.css"
    "apps/frontend/*.html"
    "apps/frontend/src/*"
    "apps/frontend/static/*"
    "apps/frontend/tests/*"
    "apps/frontend/eslint.config.js"
    "apps/frontend/svelte.config.js"
    "apps/frontend/vite.config.ts"
    "apps/frontend/tsconfig.json"
    "apps/frontend/tailwind.config.js"
    "apps/frontend/postcss.config.js"
)

# API patterns
API_PATTERNS=(
    "apps/api/*.ts"
    "apps/api/*.js"
    "apps/api/*.json"
    "apps/api/src/*"
    "apps/api/migrations/*"
    "apps/api/tests/*"
    "apps/api/biome.json"
    "apps/api/drizzle.config.ts"
    "apps/api/tsconfig.json"
)

# Discord bot patterns
DISCORD_PATTERNS=(
    "apps/discord-bot/*.rs"
    "apps/discord-bot/*.toml"
    "apps/discord-bot/*.lock"
    "apps/discord-bot/src/*"
    "apps/discord-bot/tests/*"
    "apps/discord-bot/Cargo.toml"
    "apps/discord-bot/Cargo.lock"
)

# Userscript patterns
USERSCRIPT_PATTERNS=(
    "userscript/*.ts"
    "userscript/*.js"
    "userscript/*.svelte"
    "userscript/*.json"
    "userscript/src/*"
    "userscript/static/*"
    "userscript/tsconfig.json"
    "userscript/svelte.config.js"
    "userscript/vite.config.ts"
)

# Detect which apps have changes
detect_changed_apps() {
    local staged_files="$1"
    local changed_apps=""
    
    # Validate input
    if [ -z "$staged_files" ]; then
        echo ""
        return
    fi
    
    # Check frontend
    if has_app_changes "$staged_files" "${FRONTEND_PATTERNS[@]}"; then
        changed_apps="${changed_apps}frontend "
    fi
    
    # Check API
    if has_app_changes "$staged_files" "${API_PATTERNS[@]}"; then
        changed_apps="${changed_apps}api "
    fi
    
    # Check Discord bot
    if has_app_changes "$staged_files" "${DISCORD_PATTERNS[@]}"; then
        changed_apps="${changed_apps}discord-bot "
    fi
    
    # Check Userscript
    if has_app_changes "$staged_files" "${USERSCRIPT_PATTERNS[@]}"; then
        changed_apps="${changed_apps}userscript "
    fi
    
    # Trim trailing space
    changed_apps="${changed_apps% }"
    
    echo "$changed_apps"
}

# Check if any staged files match app patterns
has_app_changes() {
    local staged_files="$1"
    shift
    local patterns=("$@")
    
    while IFS= read -r file; do
        # Skip empty lines
        [ -z "$file" ] && continue
        
        for pattern in "${patterns[@]}"; do
            # Escape special characters in the pattern for safe matching
            # But preserve wildcards (* and ?)
            local safe_pattern="${pattern//\[/\\[}"
            safe_pattern="${safe_pattern//\]/\\]}"
            
            # Use case statement for more controlled pattern matching
            case "$file" in
                $safe_pattern)
                    return 0
                    ;;
            esac
            
            # Check if file is under a directory pattern
            # Remove trailing /* or /* patterns to get the directory
            local dir_pattern="${pattern%/*}"
            if [ "$dir_pattern" != "$pattern" ]; then
                case "$file" in
                    "$dir_pattern"/*)
                        return 0
                        ;;
                esac
            fi
        done
    done <<< "$staged_files"
    
    return 1
}

# Get detailed change information for an app
get_app_changes() {
    local app="$1"
    local staged_files="$2"
    local count=0
    local files=""
    
    case "$app" in
        "frontend")
            local patterns=("${FRONTEND_PATTERNS[@]}")
            ;;
        "api")
            local patterns=("${API_PATTERNS[@]}")
            ;;
        "discord-bot")
            local patterns=("${DISCORD_PATTERNS[@]}")
            ;;
        "userscript")
            local patterns=("${USERSCRIPT_PATTERNS[@]}")
            ;;
        *)
            echo "0"
            return
            ;;
    esac
    
    while IFS= read -r file; do
        for pattern in "${patterns[@]}"; do
            if [[ "$file" == $pattern ]] || [[ "$file" == "${pattern%/*}"/* ]]; then
                ((count++))
                files="${files}  - $file\n"
                break
            fi
        done
    done <<< "$staged_files"
    
    if [ $count -gt 0 ]; then
        echo -e "$count files changed in $app:"
        echo -e "$files"
    fi
}

# Validate that required tools exist for changed apps
validate_app_tools() {
    local changed_apps="$1"
    local all_valid=true
    
    for app in $changed_apps; do
        case "$app" in
            "frontend"|"userscript")
                if ! command_exists "node" || ! command_exists "npm"; then
                    print_error "Node.js and npm are required for $app"
                    all_valid=false
                fi
                ;;
            "api")
                if ! command_exists "bun"; then
                    print_error "Bun is required for $app"
                    all_valid=false
                fi
                ;;
            "discord-bot")
                if ! command_exists "cargo"; then
                    print_error "Cargo (Rust) is required for $app"
                    all_valid=false
                fi
                ;;
        esac
    done
    
    if [ "$all_valid" = false ]; then
        return 1
    fi
    return 0
}

# Export functions
export -f detect_changed_apps
export -f has_app_changes
export -f get_app_changes
export -f validate_app_tools