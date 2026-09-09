import http.server
import socketserver

PORT = 8000


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Force correct headers before sending
        self.extensions_map.update(
            {
                ".js": "text/javascript",
                ".jsx": "text/javascript",
            }
        )
        super().end_headers()


with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
