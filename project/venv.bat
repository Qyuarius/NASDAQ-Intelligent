@echo off
REM venv.bat - Activate Python virtual environment and run command
REM Usage: venv.bat [python_script.py]

cd /d "%~dp0\..\backend"

if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

if "%~1"=="" (
    echo Virtual environment activated. Type 'deactivate' to exit.
    cmd /k
) else (
    echo Running: %~1
    python %*
)
