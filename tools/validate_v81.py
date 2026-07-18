from __future__ import annotations

from collections import Counter
from pathlib import Path
import html.parser
import http.server
import json
import os
import re
import socketserver
import subprocess
import threading
import urllib.request

WORK = Path(__file__).resolve().parents[1]
REPORT = WORK / "V8_1_VALIDATION_REPORT.txt"
results: list[tuple[bool, str, str]] = []


def check(condition: bool, label: str, detail: str = "") -> None:
    results.append((bool(condition), label, detail))


# JSON integrity.
json_files = list(WORK.glob("*.json")) + list((WORK / "functions").glob("*.json"))
for path in json_files:
    try:
        json.loads(path.read_text(encoding="utf-8"))
        check(True, f"JSON parses: {path.relative_to(WORK)}")
    except Exception as exc:  # pragma: no cover - validation script
        check(False, f"JSON parses: {path.relative_to(WORK)}", str(exc))

words = json.loads((WORK / "words.json").read_text(encoding="utf-8"))
ids = [int(item["id"]) for item in words]
base = [item for item in words if int(item["id"]) <= 1000]
context = [item for item in words if int(item["id"]) > 1000]
check(len(words) == 2000, "English bank contains 2000 cards", str(len(words)))
check(len(set(ids)) == 2000 and set(ids) == set(range(1, 2001)), "Card IDs are unique and cover 1–2000")
check(len({item["english"].strip().lower() for item in words}) == 2000, "English card titles are unique")
check(len(base) == 1000, "Base word-card count", str(len(base)))
check(len(context) == 1000, "Original context-card count", str(len(context)))
check(all(1 <= int(item.get("base_id", 0)) <= 1000 for item in context), "Every context card links to a valid base card")

required = [
    "english", "meaning", "pronunciation", "synonyms", "opposite", "example",
    "translation", "content_origin", "license", "review_status", "commercial_safe",
    "content_hash", "card_type",
]
for field in required:
    missing = [item["id"] for item in words if field not in item or item[field] in (None, "")]
    check(not missing, f"All 2000 cards contain {field}", f"missing={missing[:10]}")
check(all(item.get("commercial_safe") is True for item in words), "All cards are marked commercial-safe")
check(len({item["content_hash"] for item in words}) == 2000, "Content hashes are unique")


def relation_ids(value: object) -> list[int]:
    return [int(match) for match in re.findall(r"\(#(\d+)\)", str(value or ""))]


id_map = {int(item["id"]): item for item in words}
synonym_cards = [item for item in base if relation_ids(item.get("synonyms"))]
antonym_cards = [item for item in base if relation_ids(item.get("opposite"))]
bad_relations: list[tuple[int, str, int]] = []
for item in base:
    for field in ("synonyms", "opposite"):
        for target in relation_ids(item.get(field)):
            if target not in id_map:
                bad_relations.append((int(item["id"]), field, target))
check(len(synonym_cards) == 194, "Working synonym quiz links", str(len(synonym_cards)))
check(len(antonym_cards) == 131, "Working antonym quiz links", str(len(antonym_cards)))
check(not bad_relations, "All synonym/antonym target IDs resolve", str(bad_relations[:10]))

function_words = json.loads((WORK / "functions/data/words.json").read_text(encoding="utf-8"))
check(function_words == words, "Root and Cloud Functions word banks match")

manifest = json.loads((WORK / "content_manifest_v711.json").read_text(encoding="utf-8"))
check(manifest.get("version") == "8.1.0-tester-beta", "Content manifest version is v8.1")
check(manifest.get("english_learning_bank", {}).get("total") == 2000, "Content manifest reports 2000 English cards")


class IndexParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(str(values["id"]))
        for attr in ("src", "href"):
            ref = values.get(attr) or ""
            if ref and not re.match(r"^(https?:|mailto:|tel:|#|data:|blob:|javascript:)", ref):
                self.refs.append(ref.split("?", 1)[0].split("#", 1)[0])


index_text = (WORK / "index.html").read_text(encoding="utf-8")
parser = IndexParser()
parser.feed(index_text)
duplicates = [key for key, count in Counter(parser.ids).items() if count > 1]
check(not duplicates, "No duplicate IDs in index.html", str(duplicates))
missing_refs = sorted({ref for ref in parser.refs if ref and not (WORK / ref).exists()})
check(not missing_refs, "All local index.html references exist", str(missing_refs))

sw_text = (WORK / "sw.js").read_text(encoding="utf-8")
sw_refs = re.findall(r"['\"](\.?/?[^'\"]+\.(?:js|css|html|json|png|svg)(?:\?[^'\"]*)?)['\"]", sw_text)
missing_sw = []
for ref in sw_refs:
    clean = ref.split("?", 1)[0].lstrip("./")
    if clean and not (WORK / clean).exists():
        missing_sw.append(clean)
check(not missing_sw, "All service-worker cache references exist", str(sorted(set(missing_sw))))
check("wordpilot-v8.1.0" in sw_text and "modules/v81.js" in sw_text, "Service worker uses the v8.1 cache and module")

# Removed copyrighted/legacy links and stale visible version labels.
deploy_extensions = {".html", ".js", ".css", ".json", ".svg"}
forbidden = re.compile(
    r"drive\.google\.com|1MkPk|Powered by English Master|"
    r"5488 kayıt|Conversation Coach 3\.0|v8\.0\.0 · Tester Beta|İlk 5000 Kelime|5001-6000 Kalıplar",
    re.IGNORECASE,
)
forbidden_hits: list[tuple[str, str]] = []
for path in WORK.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in deploy_extensions:
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    for match in forbidden.finditer(text):
        forbidden_hits.append((str(path.relative_to(WORK)), match.group(0)))
check(not forbidden_hits, "No removed Drive links, legacy counts or stale visible v8.0 labels", str(forbidden_hits[:20]))

v81 = (WORK / "modules/v81.js").read_text(encoding="utf-8")
learning = (WORK / "modules/learning-engine.js").read_text(encoding="utf-8")
features = {
    "v8.1 runtime module is loaded": "modules/v81.js?v=8.1.0" in index_text,
    "English actualCount is 2000": "COURSES.en.actualCount=2000" in v81,
    "Turkish flag uses local SVG": "assets/flag-tr.svg" in index_text and (WORK / "assets/flag-tr.svg").exists(),
    "Base/context collection filters exist": "base1000" in v81 and "context1000" in v81,
    "Synonym and antonym modes are re-enabled": "syn.disabled=false" in v81 and "ant.disabled=false" in v81,
    "Mastered-session offer exists": "data-wp81-memorize-session" in v81,
    "Mastered cards are excluded from normal pools": "statusOf(w.id)!=='memorized'" in learning,
    "Difficult and unmarked cards are prioritised": "statusOf(w.id)==='hard'?0" in v81,
    "Pilot Points migration exists": "WP81_SCORE_SCHEMA=3" in v81 and "/10" in v81,
    "Gentler response-time scoring exists": "8-elapsed/18" in v81,
    "Hint and matching penalties are reduced": "adjustPoints(-1)" in learning and "adjustPoints(-2)" in learning,
    "Female-first TTS voice list exists": "Jenny" in v81 and "Samantha" in v81,
    "Coach thinking-time default is 10 seconds": "WP81_PAUSE_DEFAULT=10000" in v81,
    "Coach mascot Mira exists": "Mira seninle konuşmak istiyor" in v81,
    "Coach evaluation compression exists": "const soften=" in v81,
    "Email/password registration exists": "createUserWithEmailAndPassword" in v81,
    "Email/password login exists": "signInWithEmailAndPassword" in v81,
    "Microsoft/Hotmail login exists": "OAuthProvider('microsoft.com')" in v81,
    "Password reset exists": "sendPasswordResetEmail" in v81,
    "Minimum UI password length is 8": "minlength=\"8\"" in v81 and "password.length<8" in v81,
    "Account and cloud deletion exists": "wp81DeleteAccount" in v81,
    "Email-free local guest wording exists": "E-postasız misafir devam et" in index_text,
    "Suggestion and bug-report buttons exist": "data-wp81-feedback" in v81,
    "Legal page is linked": "legal.html" in index_text,
}
for label, condition in features.items():
    check(condition, label)

firebase = json.loads((WORK / "firebase.json").read_text(encoding="utf-8"))
headers = firebase["hosting"]["headers"][0]["headers"]
csp = next(item["value"] for item in headers if item["key"] == "Content-Security-Policy")
check("login.microsoftonline.com" in csp, "CSP permits the Microsoft sign-in endpoint")
check("**/*.py" in firebase["hosting"]["ignore"], "Maintenance Python tools are excluded from Hosting")

# Ensure no literal production secret is embedded. Secret Manager declarations are allowed.
secret_pattern = re.compile(r"sk-[A-Za-z0-9_-]{20,}")
secret_hits = []
for path in WORK.rglob("*"):
    if path.is_file() and "node_modules" not in path.parts:
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if secret_pattern.search(text):
            secret_hits.append(str(path.relative_to(WORK)))
check(not secret_hits, "No literal OpenAI secret is embedded", str(secret_hits))

# JavaScript syntax.
js_failures: list[str] = []
for path in WORK.rglob("*.js"):
    if "node_modules" in path.parts:
        continue
    proc = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
    if proc.returncode:
        js_failures.append(f"{path.relative_to(WORK)}: {proc.stderr.strip()}")
check(not js_failures, "All JavaScript files pass node --check", "\n".join(js_failures[:5]))

# Local HTTP smoke test.
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        return


old_cwd = os.getcwd()
os.chdir(WORK)
server = socketserver.TCPServer(("127.0.0.1", 0), QuietHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    port = server.server_address[1]
    failures = []
    for resource in ["index.html", "words.json", "modules/v81.js", "legal.html", "assets/flag-tr.svg", "sw.js"]:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/{resource}", timeout=5) as response:
                body = response.read()
                if response.status != 200 or not body:
                    failures.append(f"{resource}: status={response.status}, bytes={len(body)}")
        except Exception as exc:  # pragma: no cover - validation script
            failures.append(f"{resource}: {exc}")
    check(not failures, "Local HTTP smoke test returns six core files", "; ".join(failures))
finally:
    server.shutdown()
    server.server_close()
    os.chdir(old_cwd)

passed = sum(1 for status, _, _ in results if status)
failed = len(results) - passed
lines = ["WORDPILOT v8.1.0 VALIDATION REPORT", "18 Temmuz 2026", ""]
for status, label, detail in results:
    line = f"{'PASS' if status else 'FAIL'} — {label}"
    if detail:
        line += f": {detail}"
    lines.append(line)
lines.extend(["", f"SUMMARY — {passed} passed, {failed} failed"])
REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(REPORT.read_text(encoding="utf-8"))
raise SystemExit(1 if failed else 0)
