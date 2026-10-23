"""
start.py — single runner: Flask API backend + Vite frontend (development mode).

Usage:
  python start.py           # starts both servers
  python start.py --build   # builds frontend (production) + runs API only
  python start.py --api     # API only (for production with pre-built frontend)
"""

import sys, os, subprocess, signal, time, platform

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")

# Detect virtual environment automatically
VENV_PYTHON = os.path.join(BACKEND, "venv", "Scripts", "python.exe") if platform.system() == "Windows" else os.path.join(BACKEND, "venv", "bin", "python")
if os.path.exists(VENV_PYTHON):
    PYTHON = VENV_PYTHON
    print(f"[INFO] Using virtual environment: {VENV_PYTHON}")
else:
    PYTHON = sys.executable
    print(f"[WARN] Virtual environment not found. Using system Python: {sys.executable}")
    print(f"[INFO] To create venv: cd backend && python -m venv venv")
NPM = "npm.cmd" if platform.system() == "Windows" else "npm"
NODE = "node.cmd" if platform.system() == "Windows" else "node"

processes = []


def run(cmd, cwd, label):
    proc = subprocess.Popen(
        cmd,
        cwd=cwd,
        shell=platform.system() == "Windows",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    processes.append(proc)

    def reader():
        for line in iter(proc.stdout.readline, b""):
            print(f"[{label}] {line.decode('utf-8', errors='replace').strip()}")

    import threading
    t = threading.Thread(target=reader, daemon=True)
    t.start()
    return proc


def main():
    args = set(sys.argv[1:])
    build_mode = "--build" in args
    api_only = "--api" in args or build_mode

    # ── Start Flask API ───────────────────────────────────────────────────
    api_script = os.path.join(BACKEND, "api_server.py")
    api_proc = run([PYTHON, api_script], BACKEND, "API")
    time.sleep(2)

    # ── Start Vite dev server (or just serve built) ───────────────────────
    if not api_only:
        run([NPM, "run", "dev"], FRONTEND, "VITE")

    print("\n" + "=" * 60)
    print("  Servers started:")
    print(f"    API    : http://localhost:5000")
    if not api_only:
        print(f"    Vite   : http://localhost:5173")
    print("  Press Ctrl+C to stop all")
    print("=" * 60 + "\n")

    try:
        while True:
            time.sleep(1)
            if any(p.poll() is not None for p in processes):
                break
    except KeyboardInterrupt:
        pass
    finally:
        for p in processes:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()


if __name__ == "__main__":
    main()
