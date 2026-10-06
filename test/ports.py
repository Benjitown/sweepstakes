#!/usr/bin/env python3
"""Checks the terminal versions:  python test/ports.py

For each port it can build here, it runs:
  1. --selftest: the Daily Challenge must match the web game exactly (boards, moves, multipliers)
  2. a scripted game (how to play, a board, the daily, the shop, a coin flip, double or nothing) with no crashes
Then the save file is passed Python -> Kotlin -> C# to check they all read each other's saves.
It also checks the generated rules are up to date with the web game (needs Node).

Toolchains it looks for: python (always), kotlinc + java (or set KOTLINC to a kotlinc command),
dotnet (or mcs + mono for C#). Missing ones are skipped, not failed.
"""
import os, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORTS = ROOT / 'ports'
SCRIPT = '6\n1\n\n\nC3\nB2\nc\n2\nE5\nc\n3\n1\n\n5\n\nh\n4\nYES\nYES\nq\n'
results = []


def ok(cond, msg):
    results.append(bool(cond))
    print(('  PASS ' if cond else '  FAIL ') + msg)


def run(cmd, cwd, inp=None, timeout=300):
    p = subprocess.run(cmd, cwd=cwd, input=inp, capture_output=True, text=True, encoding='utf-8', timeout=timeout,
                       shell=isinstance(cmd, str), env={**os.environ, 'NO_COLOR': '1'})
    return p.returncode, p.stdout + p.stderr


def check_port(name, cmd, cwd, save):
    print(f'\n[{name}]')
    code, out = run(cmd + ['--selftest'], cwd)
    ok(code == 0 and 'all good' in out, f'{name} plays the exact same daily as the web game' + ('' if code == 0 else '\n' + out[-800:]))
    code, out = run(cmd + ['--seed', '4', '--save', str(save)], cwd, SCRIPT)
    crashed = any(w in out for w in ('Traceback', 'Exception in thread', 'Unhandled exception', 'error:'))
    ok(code == 0 and not crashed and 'DAILY #' in out and 'SHOP' in out and 'See you tomorrow' in out,
       f'{name} survives a scripted game' + ('' if code == 0 and not crashed else '\n' + out[-1500:]))
    return out


def main():
    tmp = pathlib.Path(tempfile.mkdtemp())
    save = tmp / 'save.txt'
    if shutil.which('node'):
        code, out = run(['node', 'tools/export_rules.mjs', '--check'], ROOT)
        ok(code == 0, out.strip())

    ports = [('python', [sys.executable, 'sweepstakes.py'], PORTS / 'python')]
    kotlinc = os.environ.get('KOTLINC') or shutil.which('kotlinc')
    if kotlinc and shutil.which('java'):
        jar = tmp / 'sweepstakes.jar'
        code, out = run(f'"{kotlinc}" src -include-runtime -d "{jar}"', PORTS / 'kotlin', timeout=600)
        ok(code == 0 and jar.exists(), 'Kotlin builds' + ('' if code == 0 else '\n' + out[-1500:]))
        if jar.exists():
            ports.append(('kotlin', ['java', '-jar', str(jar)], PORTS / 'kotlin'))
    else:
        print('\n[kotlin] skipped: no kotlinc on PATH (or set KOTLINC)')
    if shutil.which('dotnet'):
        code, out = run(['dotnet', 'build', '-c', 'Release', '-o', str(tmp / 'cs')], PORTS / 'csharp', timeout=600)
        ok(code == 0, 'C# builds (dotnet)' + ('' if code == 0 else '\n' + out[-1500:]))
        if code == 0:
            dll = tmp / 'cs' / 'sweepstakes.dll'
            ports.append(('csharp', ['dotnet', str(dll)], PORTS / 'csharp'))
    elif shutil.which('mcs') and shutil.which('mono'):
        exe = tmp / 'sweepstakes.exe'
        files = sorted(str(p.name) for p in (PORTS / 'csharp').glob('*.cs'))
        code, out = run(['mcs', '-codepage:utf8', '-langversion:7', f'-out:{exe}'] + files, PORTS / 'csharp')
        ok(code == 0 and exe.exists(), 'C# builds (mono)' + ('' if code == 0 else '\n' + out[-1500:]))
        if exe.exists():
            ports.append(('csharp', ['mono', str(exe)], PORTS / 'csharp'))
    else:
        print('\n[csharp] skipped: no dotnet (or mcs + mono) on PATH')

    for name, cmd, cwd in ports:
        check_port(name, cmd, cwd, save)

    # one save, three languages: each version flips a coin and the next one must see the result
    print('\n[shared save]')
    lines = [l for l in save.read_text(encoding='utf-8').splitlines() if not l.startswith('coins=')]
    save.write_text('\n'.join(lines + ['coins=4321']) + '\n', encoding='utf-8')
    for k, (name, cmd, cwd) in enumerate(ports):
        coins = int(next(l.split('=')[1] for l in save.read_text(encoding='utf-8').splitlines() if l.startswith('coins=')))
        code, out = run(cmd + ['--seed', str(k + 1), '--save', str(save)], cwd, '5\n100\nh\nq\n')
        ok(f'Coins {coins:,}' in out, f'{name} reads the save the previous version wrote (coins {coins:,})')

    shutil.rmtree(tmp, ignore_errors=True)
    print(f'\n{sum(results)}/{len(results)} checks passed')
    return 0 if all(results) else 1


if __name__ == '__main__':
    sys.exit(main())
