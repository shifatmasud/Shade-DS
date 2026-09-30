#!/usr/bin/env python3
"""
Authentication Bridge for Google Workspace CLI (`gws`)
Location: /framer/test/authBridge.py
"""

import sys
import os
import json
import subprocess
import urllib.parse
import urllib.request
import re
import time

CLIENT_SECRET_FILE = os.path.expanduser("~/.config/gws/client_secret.json")

def get_auth_url_and_port():
    env = os.environ.copy()
    env["GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND"] = "file"
    
    proc = subprocess.Popen(
        ["gws", "auth", "login"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        env=env
    )
    
    url = None
    port = None
    
    for line in proc.stdout:
        match = re.search(r'(https://accounts\.google\.com/o/oauth2/auth[^\s]+)', line)
        if match:
            url = match.group(1)
            port_match = re.search(r'redirect_uri=http%3A%2F%2Flocalhost%3A(\d+)', url) or re.search(r'redirect_uri=http://localhost:(\d+)', url)
            if port_match:
                port = int(port_match.group(1))
            break
            
    return proc, url, port

def exchange_code_directly(code: str, redirect_uri: str):
    with open(CLIENT_SECRET_FILE, "r") as f:
        data = json.load(f)["installed"]
        
    client_id = data["client_id"]
    client_secret = data["client_secret"]
    
    token_url = "https://oauth2.googleapis.com/token"
    payload = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }).encode("utf-8")
    
    req = urllib.request.Request(token_url, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req) as resp:
            tokens = json.loads(resp.read().decode("utf-8"))
            return tokens
    except Exception as e:
        print(f"[Error exchanging code]: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "exchange":
        # Direct code exchange mode
        code_input = sys.argv[2]
        redirect_uri = sys.argv[3] if len(sys.argv) > 3 else "http://localhost"
        if "code=" in code_input:
            parsed = urllib.parse.urlparse(code_input)
            qs = urllib.parse.parse_qs(parsed.query)
            code = qs.get("code", [code_input])[0]
        else:
            code = code_input
        tokens = exchange_code_directly(code, redirect_uri)
        if tokens:
            print(json.dumps(tokens, indent=2))
        else:
            sys.exit(1)
    else:
        proc, url, port = get_auth_url_and_port()
        print(f"PORT:{port}")
        print(f"URL:{url}")
        # Keep process running in background for callback
        proc.wait()
