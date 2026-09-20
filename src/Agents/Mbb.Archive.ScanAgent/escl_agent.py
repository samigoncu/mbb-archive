"""Local eSCL bridge. No API credentials or archive data are persisted here."""
import hmac
import json
import os
import secrets
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler, HTTPServer

SCAN = "http://schemas.hp.com/imaging/escl/2011/05/03"
PWG = "http://www.pwg.org/schemas/2010/12/sm"
MAX_PAGE_BYTES = 32 * 1024 * 1024
MAX_BATCH_BYTES = 256 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Cihaz yönlendirmesi kabul edilmedi.")


class Scanner:
    def __init__(self, base_url):
        parsed = urllib.parse.urlsplit(base_url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.query or parsed.fragment:
            raise ValueError("Geçerli bir eSCL servis adresi gerekli.")
        self.base = base_url.rstrip("/")
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        self.job = None
        self.job_id = None
        self.started = 0
        self.pages = 0
        self.total = 0

    def request(self, path, method="GET", data=None):
        url = path if path.startswith(self.base + "/") else self.base + "/" + path
        return self.opener.open(urllib.request.Request(url, data=data, method=method,
            headers={"Content-Type": "text/xml"} if data else {}), timeout=90)

    def capabilities(self):
        with self.request("ScannerCapabilities") as response:
            raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024 or b"<!DOCTYPE" in raw or b"<!ENTITY" in raw:
            raise ValueError("Geçersiz cihaz yetenek yanıtı.")
        root = ET.fromstring(raw)
        def values(name):
            return [n.text for n in root.iter() if n.tag.split("}")[-1] == name and n.text]
        sources = []
        if any(n.tag.split("}")[-1] == "Platen" for n in root.iter()):
            sources.append("Platen")
        if any(n.tag.split("}")[-1] == "Adf" for n in root.iter()):
            sources.append("Feeder")
        return {"model": next(iter(values("MakeAndModel")), "eSCL cihazı"),
                "sources": sources,
                "formats": sorted(set(values("DocumentFormat") + values("DocumentFormatExt")))}

    def start(self, source):
        if self.job and time.monotonic() - self.started > 600:
            self.cancel()
        if self.job:
            raise ValueError("Önce devam eden taramayı bitirin veya iptal edin.")
        caps = self.capabilities()
        if source not in caps["sources"]:
            raise ValueError("Cihaz bu besleme kaynağını desteklemiyor.")
        mime = next((m for m in ("application/pdf", "image/jpeg", "image/png") if m in caps["formats"]), None)
        if not mime:
            raise ValueError("Cihaz PDF, JPEG veya PNG taramayı bildirmiyor.")
        root = ET.Element(f"{{{SCAN}}}ScanSettings")
        for ns, key, value in ((PWG, "Version", "2.0"), (SCAN, "Intent", "Document"),
            (PWG, "InputSource", source), (PWG, "DocumentFormat", mime)):
            ET.SubElement(root, f"{{{ns}}}{key}").text = value
        with self.request("ScanJobs", "POST", ET.tostring(root, encoding="utf-8", xml_declaration=True)) as response:
            if response.status != 201:
                raise ValueError("Cihaz tarama işi oluşturmadı.")
            location = response.headers.get("Location", "")
        location = urllib.parse.urljoin(self.base + "/", location)
        if not location.startswith(self.base + "/ScanJobs/") or urllib.parse.urlsplit(location).query:
            raise ValueError("Cihaz beklenmeyen iş adresi döndürdü.")
        self.job, self.job_id = location.rstrip("/"), secrets.token_hex(16)
        self.started, self.pages, self.total = time.monotonic(), 0, 0
        return {"id": self.job_id, "source": source}

    def next_page(self, job_id):
        if not self.job or not hmac.compare_digest(job_id, self.job_id):
            raise ValueError("Tarama işi bulunamadı.")
        if self.pages >= 100 or time.monotonic() - self.started > 600:
            self.cancel()
            raise ValueError("Tarama sınırına ulaşıldı; mevcut sayfaları kaydedip yeni bir tarama başlatın.")
        for attempt in range(20):
            try:
                response = self.request(self.job + "/NextDocument")
                break
            except urllib.error.HTTPError as error:
                if error.code == 404 and self.pages:
                    self.cancel()
                    return None
                if error.code == 503 and attempt < 19:
                    time.sleep(0.5)
                    continue
                raise
        mime = response.headers.get_content_type()
        if mime not in ("application/pdf", "image/jpeg", "image/png"):
            response.close()
            raise ValueError("Cihaz desteklenmeyen içerik döndürdü.")
        file = tempfile.TemporaryFile()
        size = 0
        try:
            with response:
                while chunk := response.read(64 * 1024):
                    size += len(chunk)
                    if size > MAX_PAGE_BYTES or self.total + size > MAX_BATCH_BYTES:
                        raise ValueError("Tarama aktarım boyutu sınırı aşıldı.")
                    file.write(chunk)
            if not size:
                raise ValueError("Cihaz boş sayfa döndürdü.")
            file.seek(0)
            self.pages += 1
            self.total += size
            return file, mime, size
        except Exception:
            file.close()
            raise

    def cancel(self):
        if self.job:
            try:
                with self.request(self.job, "DELETE"):
                    pass
            except (OSError, ValueError):
                pass
        self.job, self.job_id = None, None


class AgentHandler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # No document identifiers, tokens or device URLs in HTTP logs.

    def authorized(self):
        host = self.headers.get("Host", "")
        return (host == f"127.0.0.1:{self.server.server_port}"
                and self.headers.get("Origin") == self.server.allowed_origin
                and hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + self.server.token))

    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.headers_for_response("application/json", len(body))
        self.wfile.write(body)

    def headers_for_response(self, mime, size):
        if self.headers.get("Origin") == self.server.allowed_origin:
            self.send_header("Access-Control-Allow-Origin", self.server.allowed_origin)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(size))
        self.end_headers()

    def do_OPTIONS(self):
        if self.headers.get("Origin") != self.server.allowed_origin:
            self.respond(403, {"detail": "Origin reddedildi."})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.server.allowed_origin)
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_GET(self):
        self.handle_api()

    def do_POST(self):
        self.handle_api()

    def do_DELETE(self):
        self.handle_api()

    def handle_api(self):
        if not self.authorized():
            self.respond(403, {"detail": "Köprü anahtarı veya uygulama adresi geçersiz."})
            return
        scanner = self.server.scanner
        try:
            if self.command == "GET" and self.path == "/device":
                self.respond(200, scanner.capabilities())
            elif self.command == "POST" and self.path == "/jobs":
                length = int(self.headers.get("Content-Length", "0"))
                if length < 1 or length > 1024:
                    raise ValueError("Geçersiz tarama isteği.")
                data = json.loads(self.rfile.read(length))
                self.respond(201, scanner.start(data.get("source")))
            elif self.path.startswith("/jobs/"):
                job_id = self.path.removeprefix("/jobs/")
                if self.command == "DELETE":
                    if scanner.job_id and hmac.compare_digest(job_id, scanner.job_id):
                        scanner.cancel()
                    self.respond(200, {"cancelled": True})
                elif self.command == "POST":
                    page = scanner.next_page(job_id)
                    if page is None:
                        self.respond(204, {})
                    else:
                        file, mime, size = page
                        with file:
                            self.send_response(200)
                            self.headers_for_response(mime, size)
                            while chunk := file.read(64 * 1024):
                                self.wfile.write(chunk)
                else:
                    self.respond(405, {"detail": "İşlem desteklenmiyor."})
            else:
                self.respond(404, {"detail": "Uç bulunamadı."})
        except (ValueError, ET.ParseError):
            self.respond(400, {"detail": "Cihaz ayarları veya yanıtı geçersiz; kaynak ve eSCL desteğini kontrol edin."})
        except (OSError, urllib.error.URLError):
            self.respond(502, {"detail": "Cihaza erişilemedi veya cihaz taramayı reddetti. Kağıt, bağlantı ve cihaz durumunu kontrol edin."})


def main():
    device = os.environ.get("SCAN_DEVICE_URL", "")
    if not device:
        raise SystemExit("SCAN_DEVICE_URL ortam değişkenini cihazın eSCL adresine ayarlayın.")
    token = os.environ.get("SCAN_AGENT_TOKEN") or secrets.token_urlsafe(32)
    if len(token) < 32:
        raise SystemExit("SCAN_AGENT_TOKEN en az 32 karakter olmalı.")
    server = HTTPServer(("127.0.0.1", 17891), AgentHandler)
    server.scanner = Scanner(device)
    server.token = token
    server.allowed_origin = os.environ.get("SCAN_APP_ORIGIN", "http://localhost:3000")
    print("Tarama köprüsü: http://127.0.0.1:17891", flush=True)
    print("Bu oturumun köprü anahtarı (Tarama ekranına girin): " + token, flush=True)
    try:
        server.serve_forever()
    finally:
        server.scanner.cancel()
        server.server_close()


if __name__ == "__main__":
    main()
