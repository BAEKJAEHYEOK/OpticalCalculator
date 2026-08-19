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


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/__mtime':
            return self._send(latest_mtime().encode(), 'text/plain; charset=utf-8')

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
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
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
