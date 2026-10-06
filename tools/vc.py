#!/usr/bin/env python3
"""vc: a tiny version control system for this project. Python 3.8+, standard library only.

    python tools/vc.py save "message" [--tag v4.1]   snapshot every file (except .vcignore matches)
    python tools/vc.py status                        what changed since the last save
    python tools/vc.py log                           every save, newest first
    python tools/vc.py show 3                        one save: message, tag and the files it changed
    python tools/vc.py diff [A [B]] [-- path]        line diff: last save vs your files, A vs your files, or A vs B
    python tools/vc.py restore 3 [path ...]          put files back as they were in save 3 (a backup save is made first)
    python tools/vc.py tag 3 v4.0                    name a save; tags work anywhere a number does
    python tools/vc.py export 3 out.zip              write save 3 out as a zip (or a folder) without touching your files

Saves are numbered 1, 2, 3... Each file's content is stored once, compressed and named by its SHA-1 hash,
in .vc/objects; each save is a small JSON file in .vc/saves listing path -> hash. Nothing is ever deleted,
so you can always go back. Run it from anywhere inside the project; it looks upwards for the .vc folder.
"""
import difflib, fnmatch, hashlib, io, json, os, pathlib, sys, time, zipfile, zlib

DEFAULT_IGNORE = """# files vc never saves (one pattern per line; a trailing / means a folder)
.vc/
.git/
dist/
test/screenshots/
__pycache__/
*.pyc
node_modules/
.gradle/
build/
bin/
obj/
*.class
*.jar
*.exe
.DS_Store
Thumbs.db
"""


# restoring an old save never removes or rolls back the tool you need to come back with
PROTECTED = {'tools/vc.py', '.vcignore'}


def find_root(start=None):
    p = pathlib.Path(start or os.getcwd()).resolve()
    for d in [p, *p.parents]:
        if (d / '.vc').is_dir():
            return d
    return None


class Repo:
    def __init__(self, root):
        self.root = pathlib.Path(root)
        self.dir = self.root / '.vc'

    # ---------- storage ----------
    @classmethod
    def init(cls, root):
        r = cls(root)
        (r.dir / 'objects').mkdir(parents=True, exist_ok=True)
        (r.dir / 'saves').mkdir(exist_ok=True)
        if not (r.root / '.vcignore').exists():
            (r.root / '.vcignore').write_text(DEFAULT_IGNORE, encoding='utf-8')
        return r

    def put(self, data):
        h = hashlib.sha1(data).hexdigest()
        p = self.dir / 'objects' / h[:2] / h[2:]
        if not p.exists():
            p.parent.mkdir(exist_ok=True)
            p.write_bytes(zlib.compress(data, 9))
        return h

    def get(self, h):
        return zlib.decompress((self.dir / 'objects' / h[:2] / h[2:]).read_bytes())

    def saves(self):
        out = []
        for p in (self.dir / 'saves').glob('*.json'):
            out.append(json.loads(p.read_text(encoding='utf-8')))
        return sorted(out, key=lambda s: s['id'])

    def head(self):
        s = self.saves()
        return s[-1] if s else None

    def resolve(self, ref):
        saves = self.saves()
        for s in saves:
            if str(s['id']) == str(ref) or s.get('tag') == ref:
                return s
        sys.exit(f'vc: no save called "{ref}" (try: python tools/vc.py log)')

    def write_save(self, s):
        (self.dir / 'saves' / f"{s['id']:05d}.json").write_text(json.dumps(s, indent=1), encoding='utf-8')

    # ---------- working tree ----------
    def ignored_patterns(self):
        f = self.root / '.vcignore'
        text = f.read_text(encoding='utf-8') if f.exists() else DEFAULT_IGNORE
        return [l.strip() for l in text.splitlines() if l.strip() and not l.startswith('#')] + ['.vc/']

    def is_ignored(self, rel, pats):
        parts = rel.split('/')
        for p in pats:
            if p.endswith('/'):
                name = p.rstrip('/')
                if '/' in name:
                    if rel.startswith(name + '/'):
                        return True
                elif any(fnmatch.fnmatch(d, name) for d in parts[:-1]):
                    return True
            elif fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(parts[-1], p):
                return True
        return False

    def tree(self):
        """path -> bytes for every file vc tracks."""
        pats, out = self.ignored_patterns(), {}
        for dirpath, dirnames, filenames in os.walk(self.root):
            relbase = pathlib.Path(dirpath).relative_to(self.root).as_posix()
            relbase = '' if relbase == '.' else relbase + '/'
            dirnames[:] = sorted(d for d in dirnames if not self.is_ignored(relbase + d + '/x', pats))
            for f in sorted(filenames):
                rel = relbase + f
                if not self.is_ignored(rel, pats):
                    out[rel] = (self.root / rel).read_bytes()
        return out

    def changes(self, old, new):
        """old/new: path -> hash. Returns (added, changed, deleted) path lists."""
        added = sorted(p for p in new if p not in old)
        deleted = sorted(p for p in old if p not in new)
        changed = sorted(p for p in new if p in old and new[p] != old[p])
        return added, changed, deleted

    def current_hashes(self):
        return {p: hashlib.sha1(d).hexdigest() for p, d in self.tree().items()}


# ---------- commands ----------
def summary(a, c, d):
    return f'+{len(a)} added, ~{len(c)} changed, -{len(d)} deleted'


def cmd_save(repo, args):
    tag = None
    if '--tag' in args:
        i = args.index('--tag'); tag = args[i + 1]; del args[i:i + 2]
    msg = ' '.join(args).strip() or 'save'
    head = repo.head()
    if tag and any(s.get('tag') == tag for s in repo.saves()):
        sys.exit(f'vc: tag {tag} is already used')
    files = {p: repo.put(d) for p, d in repo.tree().items()}
    a, c, d = repo.changes(head['files'] if head else {}, files)
    if head and not (a or c or d):
        print('vc: nothing changed since save', head['id'])
        return
    s = {'id': (head['id'] + 1) if head else 1, 'parent': head['id'] if head else None, 'tag': tag,
         'time': time.strftime('%Y-%m-%d %H:%M'), 'message': msg, 'files': files}
    repo.write_save(s)
    print(f"saved #{s['id']}{' (' + tag + ')' if tag else ''}: {msg}  [{summary(a, c, d)}]")


def cmd_status(repo, args):
    head = repo.head()
    if not head:
        print('vc: no saves yet. Make one with: python tools/vc.py save "first save"')
        return
    a, c, d = repo.changes(head['files'], repo.current_hashes())
    if not (a or c or d):
        print(f"clean: your files match save #{head['id']}")
        return
    print(f"since save #{head['id']}: {summary(a, c, d)}")
    for mark, lst in (('+', a), ('~', c), ('-', d)):
        for p in lst:
            print(f'  {mark} {p}')


def cmd_log(repo, args):
    saves = repo.saves()
    if not saves:
        print('vc: no saves yet')
    for s in reversed(saves):
        prev = repo.resolve(s['parent'])['files'] if s['parent'] else {}
        a, c, d = repo.changes(prev, s['files'])
        tag = f" [{s['tag']}]" if s.get('tag') else ''
        print(f"#{s['id']:<3} {s['time']}{tag}  {s['message']}\n      {len(s['files'])} files, {summary(a, c, d)}")


def cmd_show(repo, args):
    s = repo.resolve(args[0]) if args else repo.head()
    prev = repo.resolve(s['parent'])['files'] if s['parent'] else {}
    a, c, d = repo.changes(prev, s['files'])
    print(f"save #{s['id']}{' [' + s['tag'] + ']' if s.get('tag') else ''}  {s['time']}\n  {s['message']}\n  {summary(a, c, d)}")
    for mark, lst in (('+', a), ('~', c), ('-', d)):
        for p in lst:
            print(f'  {mark} {p}')


def text_of(data):
    if b'\0' in data[:8000]:
        return None
    return data.decode('utf-8', errors='replace').splitlines(keepends=True)


def cmd_diff(repo, args):
    paths = []
    if '--' in args:
        i = args.index('--'); paths = args[i + 1:]; args = args[:i]
    if len(args) > 2:
        sys.exit(__doc__)
    if not repo.head():
        sys.exit('vc: no saves yet')
    a = repo.resolve(args[0]) if args else repo.head()
    left = {p: (lambda h=h: repo.get(h)) for p, h in a['files'].items()}
    if len(args) == 2:
        b = repo.resolve(args[1])
        right = {p: (lambda h=h: repo.get(h)) for p, h in b['files'].items()}
        rname, rh = f"#{b['id']}", b['files']
    else:
        tree = repo.tree()
        right = {p: (lambda d=d: d) for p, d in tree.items()}
        rname, rh = 'working', {p: hashlib.sha1(d).hexdigest() for p, d in tree.items()}
    for p in sorted(set(left) | set(right)):
        if paths and not any(p == q or p.startswith(q.rstrip('/') + '/') for q in paths):
            continue
        if p in left and p in right and a['files'][p] == rh[p]:
            continue
        old = text_of(left[p]()) if p in left else []
        new = text_of(right[p]()) if p in right else []
        if old is None or new is None:
            print(f'Binary file {p} differs')
            continue
        sys.stdout.writelines(difflib.unified_diff(old, new, f"#{a['id']}/{p}", f'{rname}/{p}'))


def cmd_restore(repo, args):
    if not args:
        sys.exit(__doc__)
    s, paths = repo.resolve(args[0]), args[1:]
    cur = repo.current_hashes()
    head = repo.head()
    a, c, d = repo.changes(head['files'], cur) if head else ([], [], [])
    if a or c or d:  # never lose work: save what's there first
        cmd_save(repo, [f"backup before restoring #{s['id']}"])
    wanted = {p: h for p, h in s['files'].items() if p not in PROTECTED and
              (not paths or any(p == q or p.startswith(q.rstrip('/') + '/') for q in paths))}
    for p, h in wanted.items():
        f = repo.root / p
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(repo.get(h))
    removed = 0
    if not paths:  # whole-project restore: files that save didn't have are removed (but never vc itself)
        for p in cur:
            if p not in s['files'] and p not in PROTECTED:
                (repo.root / p).unlink(); removed += 1
    print(f"restored {len(wanted)} file(s) from save #{s['id']}" + (f', removed {removed} that it did not have' if removed else '')
          + '. Save again to make this the latest.')


def cmd_tag(repo, args):
    if len(args) != 2:
        sys.exit(__doc__)
    s = repo.resolve(args[0])
    if any(x.get('tag') == args[1] for x in repo.saves()):
        sys.exit(f'vc: tag {args[1]} is already used')
    s['tag'] = args[1]
    repo.write_save(s)
    print(f"save #{s['id']} is now {args[1]}")


def cmd_export(repo, args):
    if len(args) != 2:
        sys.exit(__doc__)
    s, out = repo.resolve(args[0]), pathlib.Path(args[1])
    if out.suffix == '.zip':
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for p, h in s['files'].items():
                z.writestr(p, repo.get(h))
    else:
        for p, h in s['files'].items():
            f = out / p
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_bytes(repo.get(h))
    print(f"exported save #{s['id']} ({len(s['files'])} files) to {out}")


COMMANDS = {'save': cmd_save, 'status': cmd_status, 'log': cmd_log, 'show': cmd_show, 'diff': cmd_diff,
            'restore': cmd_restore, 'tag': cmd_tag, 'export': cmd_export}


def main(argv):
    if not argv or argv[0] not in COMMANDS:
        print(__doc__)
        return
    root = find_root()
    if root is None:
        if argv[0] != 'save':
            sys.exit('vc: no .vc folder here or above. Run "python tools/vc.py save \\"first save\\"" in the project folder.')
        repo = Repo.init(os.getcwd())
        print(f'vc: started version control in {repo.root}')
    else:
        repo = Repo(root)
    COMMANDS[argv[0]](repo, list(argv[1:]))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(errors='replace')
    main(sys.argv[1:])
