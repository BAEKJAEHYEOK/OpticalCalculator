# 개발용 서버.
#   python scripts/dev_server.py
#
# 기본 http.server 로도 열리기는 하지만 두 가지가 걸린다.
#   1. 브라우저가 ES 모듈을 캐시해 파일을 고쳐도 새로고침으로 반영되지 않는다
#   2. localhost 는 보안 컨텍스트라 서비스 워커가 등록되고, 그 캐시가 또 발목을 잡는다
# 여기서는 캐시를 끄고, 파일이 바뀌면 브라우저가 알아서 새로고침하게 한다.

import http.server
import os
import socket
import socketserver
import sys
import threading
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123

# 윈도우 콘솔 기본 코드페이지(cp949)가 못 찍는 문자로 죽지 않게 한다.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, OSError):
        pass

WATCH_EXT = {'.html', '.css', '.js', '.json', '.svg'}
SKIP_DIRS = {'node_modules', 'android', 'www', 'dist', '.git', '__pycache__'}


def latest_mtime() -> str:
    newest = 0.0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if Path(name).suffix in WATCH_EXT:
                try:
                    newest = max(newest, os.path.getmtime(Path(dirpath) / name))
                except OSError:
                    pass
    return f'{newest:.3f}'


# 서비스 워커 해제가 먼저다. 남아 있으면 캐시가 먼저 응답해 수정이 반영되지 않는다.
LIVE_RELOAD = """
<script>
(() => {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  }
  let last = null;
  setInterval(async () => {
    try {
      const res = await fetch('/__mtime', { cache: 'no-store' });
      const now = await res.text();
      if (last !== null && now !== last) location.reload();
      last = now;
    } catch {}
  }, 700);
})();
</script>
"""


# 예전에 같은 주소로 접속해 서비스 워커가 등록돼 있으면, 그 워커가 캐시에서
# index.html 을 먼저 내주기 때문에 위의 해제 스크립트가 실행될 기회조차 없다.
# 브라우저는 페이지를 열 때 sw.js 를 바이트 비교하므로, 여기서 "자기를 지우는"
# 워커를 내려주면 그게 설치되면서 캐시를 비우고 스스로 등록을 해제한다.
SW_KILL = """// 개발 서버 전용. 배포본 sw.js 를 대체해 기존 캐시를 걷어낸다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach((c) => c.navigate(c.url));
  })());
});
"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        path = self.path.split('?')[0]

        if path == '/__mtime':
            return self._send(latest_mtime().encode(), 'text/plain; charset=utf-8')

        if path == '/sw.js':
            return self._send(SW_KILL.encode('utf-8'), 'application/javascript; charset=utf-8')

        target = self.translate_path(self.path)
        if os.path.isdir(target):
            target = os.path.join(target, 'index.html')

        if target.endswith('.html') and os.path.isfile(target):
            html = Path(target).read_text(encoding='utf-8')
            marker = '</body>'
            html = (html.replace(marker, LIVE_RELOAD + marker)
                    if marker in html else html + LIVE_RELOAD)
            return self._send(html.encode('utf-8'), 'text/html; charset=utf-8')

        return super().do_GET()

    def _send(self, body: bytes, content_type: str):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # 폴링 요청까지 찍으면 콘솔이 무의미해진다.
        if '__mtime' not in (args[0] if args else ''):
            super().log_message(fmt, *args)


def lan_addresses():
    found = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith('127.') and ip not in found:
                found.append(ip)
    except OSError:
        pass
    return found


class Server(socketserver.ThreadingTCPServer):
    # 윈도우에서 allow_reuse_address 는 이미 다른 프로세스가 쓰는 포트에도 바인드를
    # 허용한다. 그러면 새 서버가 뜬 것처럼 보이지만 요청은 옛 서버로 가고,
    # 고친 내용이 반영되지 않는 채로 원인을 찾기 어려워진다. 반드시 꺼 둔다.
    allow_reuse_address = False
    daemon_threads = True


def port_in_use(port: int) -> bool:
    with socket.socket() as probe:
        probe.settimeout(0.4)
        return probe.connect_ex(('127.0.0.1', port)) == 0


# 포트를 쓰고 있는 것이 이 개발 서버인지, 관계없는 다른 프로세스인지 가른다.
# __mtime 은 이 서버만 응답하므로 그것으로 구별한다.
def is_our_server(port: int) -> bool:
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/__mtime', timeout=0.8) as res:
            return res.status == 200
    except Exception:
        return False


if __name__ == '__main__':
    if port_in_use(PORT):
        url = f'http://127.0.0.1:{PORT}/index.html'
        # 이미 이 개발 서버가 떠 있는 경우가 대부분이다. 그럴 땐 막을 이유가 없다.
        if is_our_server(PORT):
            print('개발 서버가 이미 실행 중입니다. 브라우저만 엽니다.')
            print()
            print(f'  {url}')
            print()
            print('  파일을 고치면 그 창이 알아서 새로고침합니다.')
            print('  서버를 끄려면 먼저 띄워 둔 창을 닫으세요.')
            webbrowser.open(url)
            sys.exit(0)

        print(f'포트 {PORT} 를 이 프로그램이 아닌 다른 것이 쓰고 있습니다.')
        print('그대로 두면 그쪽이 응답해서 고친 내용이 반영되지 않습니다.')
        print()
        print('아래 중 하나를 하세요.')
        print(f'  1) 다른 포트로 띄우기 :  run.bat {PORT + 1}')
        print('  2) 남은 파이썬 정리   :  powershell -Command "Get-Process python | Stop-Process -Force"')
        sys.exit(1)

    print('Optical Calculator - 개발 서버')
    print('-' * 52)
    print(f'  PC     http://127.0.0.1:{PORT}/index.html')
    print(f'  검증   http://127.0.0.1:{PORT}/verify.html')
    for ip in lan_addresses():
        print(f'  폰     http://{ip}:{PORT}/index.html')
    print('-' * 52)
    print('  파일을 고치면 브라우저가 알아서 새로고침합니다.')
    print('  중지하려면 Ctrl+C 또는 이 창을 닫으세요.')
    print()

    threading.Timer(1.0, lambda: webbrowser.open(f'http://127.0.0.1:{PORT}/index.html')).start()

    try:
        with Server(('', PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n서버를 중지했습니다.')
    except OSError as err:
        print(f'\n서버를 시작하지 못했습니다: {err}')
        print(f'포트 {PORT} 를 이미 쓰고 있다면 다른 포트를 지정하세요:')
        print(f'  python scripts/dev_server.py 8124')
        sys.exit(1)
