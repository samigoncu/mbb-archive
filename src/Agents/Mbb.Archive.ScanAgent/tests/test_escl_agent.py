import importlib.util
import io
import json
from pathlib import Path
import threading
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("escl_agent", Path(__file__).parents[1] / "escl_agent.py")
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)


class DeviceHandler(BaseHTTPRequestHandler):
    pages = 0
    def log_message(self, *_args):
        pass
    def do_GET(self):
        if self.path.endswith("ScannerCapabilities"):
            body = b'<scan:ScannerCapabilities xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"><scan:MakeAndModel>Contract device</scan:MakeAndModel><scan:Adf/><scan:DocumentFormat>image/jpeg</scan:DocumentFormat></scan:ScannerCapabilities>'
        elif self.path.endswith("NextDocument"):
            if DeviceHandler.pages >= 2:
                self.send_response(404); self.end_headers(); return
            DeviceHandler.pages += 1
            body = b'\xff\xd8\xff' + bytes([DeviceHandler.pages]) * 30
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(200)
        self.send_header("Content-Type", "text/xml" if "Capabilities" in self.path else "image/jpeg")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        DeviceHandler.pages = 0
        self.send_response(201); self.send_header("Location", "/eSCL/ScanJobs/contract-job"); self.end_headers()
    def do_DELETE(self):
        self.send_response(200); self.end_headers()


class ScanContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.device = HTTPServer(("127.0.0.1", 0), DeviceHandler)
        threading.Thread(target=cls.device.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.device.server_port}/eSCL"
    @classmethod
    def tearDownClass(cls):
        cls.device.shutdown(); cls.device.server_close()
    def test_adf_transfers_all_pages_and_stops_on_end_of_job(self):
        scanner = agent.Scanner(self.url)
        self.assertEqual(scanner.capabilities()["sources"], ["Feeder"])
        job = scanner.start("Feeder")
        for index in range(2):
            file, mime, size = scanner.next_page(job["id"])
            with file:
                self.assertEqual(file.read(), b'\xff\xd8\xff' + bytes([index+1])*30)
            self.assertEqual(mime, "image/jpeg"); self.assertEqual(size,33)
        self.assertIsNone(scanner.next_page(job["id"]))
        self.assertIsNone(scanner.job)
    def test_unknown_source_and_job_are_rejected(self):
        scanner = agent.Scanner(self.url)
        with self.assertRaises(ValueError): scanner.start("Platen")
        with self.assertRaises(ValueError): scanner.next_page("unowned")
    def test_page_limit_rejects_oversized_content(self):
        scanner = agent.Scanner(self.url); job=scanner.start("Feeder")
        with patch.object(agent, "MAX_PAGE_BYTES", 10):
            with self.assertRaises(ValueError): scanner.next_page(job["id"])
        scanner.cancel()
    def test_origin_and_token_protect_the_local_bridge(self):
        server=HTTPServer(("127.0.0.1",0),agent.AgentHandler)
        server.scanner=agent.Scanner(self.url);server.token="contract-test-token-32-characters";server.allowed_origin="http://localhost:3000"
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            url=f"http://127.0.0.1:{server.server_port}/device"
            for headers in ({}, {"Origin":"https://untrusted.invalid","Authorization":"Bearer "+server.token}):
                with self.assertRaises(urllib.error.HTTPError) as failure: urllib.request.urlopen(urllib.request.Request(url,headers=headers))
                self.assertEqual(failure.exception.code,403)
            with urllib.request.urlopen(urllib.request.Request(url,headers={"Origin":server.allowed_origin,"Authorization":"Bearer "+server.token})) as response:
                self.assertEqual(json.load(response)["model"],"Contract device")
        finally: server.shutdown();server.server_close()
    def test_redirects_cannot_turn_the_bridge_into_an_arbitrary_proxy(self):
        with self.assertRaises(ValueError):
            agent.NoRedirect().redirect_request(None,None,302,"",{},"http://untrusted.invalid/")
        for url in ("file:///tmp/private", "http://user:secret@localhost/eSCL", "http://localhost/eSCL?token=secret"):
            with self.assertRaises(ValueError): agent.Scanner(url)

if __name__ == "__main__": unittest.main()
