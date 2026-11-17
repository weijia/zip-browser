import base64
import json
import subprocess
import sys
from pathlib import Path

repo = "weijia/zip-browser"
root = Path(r"C:\codes\nodejs\zip-browser")
files = ["server/manifest-scan.js", "tests/smoke.test.mjs", "web/manifest-builder.js", "scripts/push_zb.py"]
message = "fix(zb): tree API reports hasChildren so empty dirs have no arrow"


def gh(args, payload=None, method=None):
    cmd = ["gh", "api"]
    if method:
        cmd += ["--method", method]
    cmd += args
    if payload is not None:
        cmd += ["--input", "-"]
    p = subprocess.run(
        cmd,
        input=None if payload is None else json.dumps(payload, ensure_ascii=False),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if p.returncode != 0:
        print("FAILED:", " ".join(cmd))
        print(p.stdout)
        print(p.stderr)
        sys.exit(1)
    return json.loads(p.stdout) if p.stdout.strip() else {}


ref = gh([f"repos/{repo}/git/refs/heads/main"])
remote_head = ref["object"]["sha"]
commit = gh([f"repos/{repo}/git/commits/{remote_head}"])
remote_tree = commit["tree"]["sha"]
print("remote head", remote_head)

tree_entries = []
for rel in files:
    data = (root / rel).read_bytes()
    blob = gh(
        [f"repos/{repo}/git/blobs"],
        {"content": base64.b64encode(data).decode("ascii"), "encoding": "base64"},
        method="POST",
    )
    print(rel, len(data), blob["sha"])
    tree_entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})

new_tree = gh(
    [f"repos/{repo}/git/trees"],
    {"base_tree": remote_tree, "tree": tree_entries},
    method="POST",
)
new_commit = gh(
    [f"repos/{repo}/git/commits"],
    {"message": message, "tree": new_tree["sha"], "parents": [remote_head]},
    method="POST",
)
gh(
    [f"repos/{repo}/git/refs/heads/main"],
    {"sha": new_commit["sha"], "force": False},
    method="PATCH",
)
print("new head", new_commit["sha"])
