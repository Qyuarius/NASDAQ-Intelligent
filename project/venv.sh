#!/bin/bash
# venv.sh - Activate Python virtual environment and run command
# Usage: ./venv.sh [python_script.py]

cd "$(dirname "$0")/backend"

if [ ! -f "venv/bin/activate" ]; then
    echo "ERROR: Virtual environment not found!"
    echo "Please run: python -m venv venv"
    exit 1
fi

source venv/bin/activate

if [ $# -eq 0 ]; then
    echo "Virtual environment activated. Type 'deactivate' to exit."
    bash
else
    echo "Running: $@"
    python "$@"
fi
