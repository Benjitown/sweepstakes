#!/usr/bin/env python3
"""Runs the test suites against the source modules and the built single file.

    python test/run.py                      everything (about 4 minutes)
    python test/run.py modules              only the ES-module source, served over http
    python test/run.py bundle --only layout one target, chosen suites (regression, tutorial, features, household, extras, mayhem, fruity, wildcards, nan, antics, jukebox, allotment, paper, layout)

Needs Playwright once:  pip install playwright  &&  python -m playwright install chromium
Screenshots land in test/screenshots/<target>/. Exits non-zero if anything fails.
"""
import asyncio, pathlib, subprocess, sys, threading

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path[:0] = [str(HERE), str(ROOT / 'tools')]

from playwright.async_api import async_playwright  # noqa: E402
from common import LAUNCH_ARGS  # noqa: E402
from serve import make_server  # noqa: E402
import allotment, antics, extras, features, fruity, household, jukebox, layout, mayhem, nan, paper, regression, tutorial, wildcards  # noqa: E402

SUITES = {'regression': regression, 'tutorial': tutorial, 'features': features, 'household': household, 'extras': extras, 'mayhem': mayhem,
          'fruity': fruity, 'wildcards': wildcards, 'nan': nan, 'antics': antics, 'jukebox': jukebox, 'allotment': allotment, 'paper': paper, 'layout': layout}


async def main(targets, suites):
    subprocess.run([sys.executable, str(ROOT / 'tools/build.py')], check=True)
    server = make_server(0)  # any free port
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_address[1]}'
    urls = {'modules': f'{base}/index.html?test', 'bundle': f'{base}/dist/sweepstakes.html?test'}
    failures, total = [], 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=LAUNCH_ARGS)
        for target in targets:
            shots = HERE / 'screenshots' / target
            shots.mkdir(parents=True, exist_ok=True)
            for name in suites:
                print(f'\n[{target}] {name}')
                res = await SUITES[name].run(browser, urls[target], shots)
                total += len(res.items)
                failures += [f'[{target}] {name}: {m}' for m in res.failed]
        await browser.close()
    server.shutdown()
    print(f'\n{total - len(failures)}/{total} checks passed')
    for f in failures:
        print('  FAILED', f)
    return 1 if failures else 0


if __name__ == '__main__':
    args = sys.argv[1:]
    suites = list(SUITES)
    if '--only' in args:
        i = args.index('--only'); suites = args[i + 1].split(','); del args[i:i + 2]
    targets = args or ['modules', 'bundle']
    bad = [t for t in targets if t not in ('modules', 'bundle')] + [s for s in suites if s not in SUITES]
    if bad:
        sys.exit(f'unknown: {bad}\n{__doc__}')
    sys.exit(asyncio.run(main(targets, suites)))
