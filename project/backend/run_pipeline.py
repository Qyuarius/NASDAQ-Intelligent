"""
run_pipeline.py - Orchestrator. Runs all sub-pipelines.
Usage:
  python run_pipeline.py               # Run everything
  python run_pipeline.py --steps stock  # Run stock+commodity only
  python run_pipeline.py --steps news   # Run news only
"""

import sys
import os
import subprocess
from datetime import datetime


def run_sub_pipeline(name, module_path):
    print(f"\n{'#' * 60}")
    print(f"  STARTING: {name}")
    print(f"{'#' * 60}\n")
    result = subprocess.run([sys.executable, module_path], cwd=os.path.dirname(module_path))
    if result.returncode != 0:
        print(f"\n  [ERROR] {name} failed with exit code {result.returncode}")
        sys.exit(result.returncode)
    print(f"\n  [DONE] {name}\n")


def main():
    args = sys.argv[1:]
    steps = []
    if not args:
        steps = ["stock", "news"]
    elif args[0] == "--steps":
        steps = [s.strip().lower() for s in args[1].split(",")]
    else:
        print(__doc__)
        sys.exit(1)

    backend = os.path.dirname(os.path.abspath(__file__))
    stock_script = os.path.join(backend, "run_stock_commodity_pipeline.py")
    news_script = os.path.join(backend, "run_news_pipeline.py")

    phase_map = {
        "stock": ("Stock + Commodity Pipeline", stock_script),
        "news": ("News Intelligence Pipeline", news_script),
    }

    for s in steps:
        if s not in phase_map:
            print(f"[ERROR] Unknown step: {s}. Valid: stock, news, pred")
            sys.exit(1)

    print("=" * 60)
    print("  NASDAQ INTEL — FULL PIPELINE ORCHESTRATOR")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Steps: {', '.join(steps)}")
    print("=" * 60)

    for s in steps:
        name, script = phase_map[s]
        run_sub_pipeline(name, script)

    print("=" * 60)
    print("  ALL PIPELINES COMPLETE")
    print(f"  Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print("\n  Start your React frontend:")
    print("  cd frontend && npm install && npm run dev")
    print("  Open: http://localhost:5173\n")


if __name__ == "__main__":
    main()
