#!/bin/bash
# Wrapper script to launch CodeBuddy editor from WSL

# Get all arguments (file path and line number)
file_path="$1"
line_number="${2:-1}"

# Convert WSL path to Windows path
windows_path=$(wslpath -w "$file_path" 2>/dev/null || echo "$file_path")

# Launch CodeBuddy with the file path at specific line
"/mnt/k/CodeBuddy CN/CodeBuddy CN.exe" "$windows_path:$line_number" &

# Exit immediately to avoid Node.js trying to interpret the output
exit 0
