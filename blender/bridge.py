# Bridge to the BlenderMCP addon socket (localhost:9876).
# Usage:
#   python blender/bridge.py code <script.py>   - run a python file inside Blender
#   python blender/bridge.py <command_type>     - run a bare command (e.g. get_scene_info)
import socket, json, sys

def send(cmd):
    s = socket.create_connection(("localhost", 9876), timeout=180)
    s.sendall(json.dumps(cmd).encode())
    chunks = []
    s.settimeout(180)
    while True:
        try:
            data = s.recv(65536)
            if not data:
                break
            chunks.append(data)
            try:
                json.loads(b"".join(chunks))
                break
            except json.JSONDecodeError:
                continue
        except socket.timeout:
            break
    s.close()
    return b"".join(chunks).decode()

if __name__ == "__main__":
    if sys.argv[1] == "code":
        code = open(sys.argv[2], encoding="utf-8-sig").read()
        out = send({"type": "execute_code", "params": {"code": code}})
    else:
        out = send({"type": sys.argv[1], "params": {}})
    print(out[:4000])
