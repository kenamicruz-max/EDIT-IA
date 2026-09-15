from http.server import BaseHTTPRequestHandler, HTTPServer
import json, os
from core.orchestrator.pipeline import run

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/health'):
            self.send_response(200); self.end_headers(); self.wfile.write(b'{"ok":true}')
        else: self.send_response(404); self.end_headers()
    def do_POST(self):
        if self.path!='/jobs': self.send_response(404); self.end_headers(); return
        n=int(self.headers.get('content-length','0')); data=json.loads(self.rfile.read(n)); jid=data.get('id'); out=os.path.join('runtime-jobs',jid,'output.mp4'); os.makedirs(os.path.dirname(out),exist_ok=True)
        try:
            result=run(data['reference'],data['source'],out); body={'id':jid,'status':'completed','output':out,'qc':result['qc']}
        except Exception as e: body={'id':jid,'status':'failed','error':str(e)}
        self.send_response(200); self.send_header('content-type','application/json'); self.end_headers(); self.wfile.write(json.dumps(body).encode())

if __name__=='__main__': HTTPServer(('0.0.0.0',8000),Handler).serve_forever()