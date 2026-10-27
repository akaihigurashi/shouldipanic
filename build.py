#!/usr/bin/env python3
"""Render site/index.html from template.html and scanners.json (standard library only).

    python3 build.py           # writes site/index.html
    python3 build.py --check   # exit 1 if site/index.html is out of date
"""
import datetime
import hashlib
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
esc = html.escape


def tile(s):
    c = s["colors"]
    style = (f"--top:{c['top']};--card:{c['card']};--border:{c['border']};--accent:{c['accent']};"
             f"--on-accent:{c['on_accent']};--ink:{c['ink']};--soft:{c['soft']}")
    cves = s["cves"]
    links = [f'<a href="https://nvd.nist.gov/vuln/detail/{esc(cves[0])}" rel="noopener">{esc(cves[0])}</a>']
    for cve in cves[1:]:   # CVE-2026-109619 -> "-109619" when the year matches
        short = "-" + cve.rsplit("-", 1)[1] if cve.rsplit("-", 1)[0] == cves[0].rsplit("-", 1)[0] else cve
        links.append(f'<a href="https://nvd.nist.gov/vuln/detail/{esc(cve)}" rel="noopener">{esc(short)}</a>')
    since = datetime.date.fromisoformat(s["since"]).strftime("%-d %b %Y")
    bars = "".join('<span class="on"></span>' if i < s["level"] else "<span></span>" for i in range(5))
    note = f' <span class="vuln-note">{esc(s["vuln_note"])}</span>' if s.get("vuln_note") else ""
    rest = s["name"][len(s["prefix"]) + 1:]
    return f'''      <article class="tile" style="{style}">
        <div class="tile-top">
          <p class="tile-mark"><span>{esc(s["prefix"])}</span><span class="wm-2">2</span><span class="wm-scan">{esc(rest)}</span></p>
          {s["art"]}
        </div>
        <div class="tile-body">
          <h3>{esc(s["vuln"])}{note}</h3>
          <p class="cves">{" and ".join(links)}</p>
          <p>{esc(s["summary"])}</p>
          <div class="severity">
            <span class="bars" role="img" aria-label="Panic level {s["level"]} of 5">{bars}</span>
            <strong>{esc(s["severity"])}</strong><span>since {since}</span>
          </div>
          <a class="check" href="{esc(s["url"])}">Check your site<span class="sr-only"> for {esc(s["vuln"])}</span></a>
        </div>
      </article>'''


def build():
    data = json.load(open(os.path.join(HERE, "scanners.json"), encoding="utf-8"))
    scanners = data["scanners"]
    css = open(os.path.join(HERE, "site", "style.css"), "rb").read()
    page = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    repo_links = "".join(f'<a href="{esc(s["github"])}" rel="noopener">{esc(s["name"])} on GitHub</a>'
                         for s in scanners)
    return (page.replace("{{TILES}}", "\n".join(tile(s) for s in scanners))
                .replace("{{REPO_LINKS}}", repo_links)
                .replace("{{FIRST}}", scanners[0]["name"])
                .replace("{{CSS_VERSION}}", hashlib.sha256(css).hexdigest()[:10]))


def main():
    out = build()
    path = os.path.join(HERE, "site", "index.html")
    if "--check" in sys.argv:
        current = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        if current != out:
            print("site/index.html is out of date: run python3 build.py", file=sys.stderr)
            sys.exit(1)
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
