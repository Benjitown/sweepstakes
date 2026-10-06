"""Shared bits for the test suites: pass/fail bookkeeping and a page that records console errors."""
import sys

# Headless Chromium on a GPU-less Linux box needs SwiftShader for WebGL; Windows and macOS don't.
LAUNCH_ARGS = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] \
    if sys.platform.startswith('linux') else []


class Results:
    def __init__(self, suite):
        self.suite, self.items = suite, []

    def ok(self, cond, msg):
        self.items.append((bool(cond), msg))
        print(('  PASS ' if cond else '  FAIL ') + msg)

    @property
    def failed(self):
        return [m for c, m in self.items if not c]


async def open_page(browser, url, width=1366, height=900, mobile=False, wait=1100):
    """New isolated context (fresh save) at the given size. Returns (context, page, errors)."""
    ctx = await browser.new_context(viewport={'width': width, 'height': height}, is_mobile=mobile, has_touch=mobile,
                                    device_scale_factor=2 if mobile else 1)
    page, errors = await ctx.new_page(), []
    page.on('console', lambda m: errors.append(f'console: {m.text}')
            if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    await page.goto(url)
    await page.wait_for_timeout(wait)
    return ctx, page, errors
