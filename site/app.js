"use strict";
// shouldipanic.ch landing page: panic meter, sorting, "Check all".
// Everything that comes back from a scanner is inserted with textContent only.
(function () {
  const tilesBox = document.querySelector(".tiles");
  const tiles = Array.from(document.querySelectorAll(".tile[data-scanner]"));
  if (!tiles.length) return;
  const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* private mode: no memory, page still works */ }
    return null;
  }

  // ---- panic meter: starts at "panic", calms down with every vulnerability you checked ----
  const KEY = "shouldipanic-checked";
  const needle = document.getElementById("needle");
  const meter = document.getElementById("meter");
  const caption = document.getElementById("meter-caption");

  function loadChecked() {
    try { return new Set(JSON.parse(store(KEY) || "[]")); } catch (e) { return new Set(); }
  }
  function markChecked(names) {
    const set = loadChecked();
    names.forEach((n) => set.add(n));
    store(KEY, JSON.stringify(Array.from(set)));
    updateMeter();
  }
  function updateMeter() {
    const checked = loadChecked();
    const names = tiles.map((t) => t.dataset.scanner);
    const done = names.filter((n) => checked.has(n)).length;
    const level = 1 - done / names.length;                 // 1 = panic, 0 = calm
    needle.style.transform = "rotate(" + (-70 + 140 * level) + "deg)";
    tiles.forEach((t) => t.classList.toggle("is-checked", checked.has(t.dataset.scanner)));
    let text, label;
    if (done === 0) {
      text = "Panic level: high. Check the tiles below.";
      label = "high";
    } else if (done < names.length) {
      text = "Panic level going down: " + done + " of " + names.length + " checked.";
      label = done + " of " + names.length + " checked";
    } else {
      text = "All checked. Breathe.";
      label = "calm";
    }
    caption.textContent = text;
    meter.setAttribute("aria-label", "Panic meter: " + label);
  }
  tiles.forEach((t) => {
    const link = t.querySelector(".check");
    if (link) link.addEventListener("click", () => markChecked([t.dataset.scanner]));
  });
  requestAnimationFrame(() => requestAnimationFrame(updateMeter));   // let the needle swing in
  window.addEventListener("pageshow", updateMeter);                  // back button
  window.addEventListener("storage", updateMeter);                   // other tabs

  // ---- sorting: newest first or most severe first, tiles slide to their new place ----
  const SORT_KEY = "shouldipanic-sort";
  const sortButtons = Array.from(document.querySelectorAll(".sort-btn"));
  const missing = document.querySelector(".tile-missing");
  const info = (t) => ({
    since: t.dataset.since || "",
    cvss: parseFloat(t.dataset.cvss || "0"),
    exploited: t.dataset.exploited === "1",
    pos: tiles.indexOf(t),                                            // page order breaks ties
  });
  const byDate = (a, b) => (a.since < b.since ? 1 : a.since > b.since ? -1 : 0);
  const bySeverity = (a, b) => (b.cvss - a.cvss) || ((b.exploited ? 1 : 0) - (a.exploited ? 1 : 0));

  function sortTiles(mode, animate) {
    const before = new Map(tiles.map((t) => [t, t.getBoundingClientRect()]));
    const order = tiles.slice().sort((x, y) => {
      const a = info(x), b = info(y);
      const r = mode === "severe" ? (bySeverity(a, b) || byDate(a, b)) : (byDate(a, b) || bySeverity(a, b));
      return r || a.pos - b.pos;
    });
    order.forEach((t) => tilesBox.insertBefore(t, missing));
    sortButtons.forEach((b) => b.setAttribute("aria-pressed", b.dataset.sort === mode ? "true" : "false"));
    if (!animate || reduceMotion()) return;
    order.forEach((t) => {                                            // FLIP: from old place to new
      const a = before.get(t), b = t.getBoundingClientRect();
      const dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) {
        t.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }],
                  { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
    });
  }
  sortButtons.forEach((b) => b.addEventListener("click", () => {
    store(SORT_KEY, b.dataset.sort);
    sortTiles(b.dataset.sort, true);
  }));
  if (store(SORT_KEY) === "severe") sortTiles("severe", false);

  // ---- check all: one address, every scanner at the same time ----
  const form = document.getElementById("all-form");
  if (!form) return;
  const hostInput = document.getElementById("all-host");
  const consent = document.getElementById("all-consent");
  const go = document.getElementById("all-go");
  const errorBox = document.getElementById("all-error");
  const box = document.getElementById("all-box");
  const results = document.getElementById("results");
  const rows = document.getElementById("rows");
  const sumNeedle = document.getElementById("sum-needle");
  const sumMeter = document.getElementById("sum-meter");
  const SVG = "http://www.w3.org/2000/svg";
  const RANK = { bad: 0, warn: 1, unknown: 2, good: 3, wait: 4 };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const c of children || []) if (c) node.append(c);
    return node;
  }
  function icon(level) {
    if (level === "wait") return el("span", { class: "spin", "aria-hidden": "true" });
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("aria-hidden", "true");
    const d = {
      bad: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", "M12 7v6M12 16.5v.01"],
      warn: ["M12 3 2 21h20L12 3Z", "M12 10v5M12 18v.01"],
      good: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", "m7.5 12.5 3 3 6-6.5"],
      unknown: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"],
    }[level] || [];
    for (const path of d) {
      const p = document.createElementNS(SVG, "path");
      p.setAttribute("d", path);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", "2");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      svg.append(p);
    }
    return svg;
  }
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  function makeRow(t) {
    const mark = t.querySelector(".tile-mark").cloneNode(true);
    const pill = el("p", { class: "pill wait" }, [icon("wait"), el("span", { text: "Checking…" })]);
    const text = el("p", { text: "" });
    const details = el("a", { class: "details", href: t.dataset.url, text: "Details" });
    const row = el("li", { class: "row", "data-scanner": t.dataset.scanner }, [
      el("div", {}, [mark, el("p", { class: "row-vuln", text: t.dataset.vuln })]),
      el("div", { class: "row-main" }, [pill, text]),
      details,
    ]);
    return { row, pill, text, details, level: "wait", tile: t };
  }

  function setRow(r, level, title, text) {
    r.level = level;
    r.pill.className = "pill " + level;
    r.pill.replaceChildren(icon(level), el("span", { text: title }));
    r.text.textContent = text || "";
  }

  async function runOne(r, host) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    try {
      const res = await fetch(r.tile.dataset.url.replace(/\/$/, "") + "/api/scan", {
        method: "POST", mode: "cors", credentials: "include", signal: ctrl.signal,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },      // simple request: no preflight
        body: JSON.stringify({ host: host, consent: true }),
      });
      let d = {};
      try { d = await res.json(); } catch (e) { /* not JSON */ }
      if (!res.ok) {
        r.error = d.error || "The check failed (error " + res.status + ").";
        setRow(r, "unknown", "Couldn't check", r.error);
        return;
      }
      const st = d.status || {};
      const level = ["bad", "warn", "good", "unknown"].includes(st.level) ? st.level : "unknown";
      setRow(r, level, st.title || "Done", st.text || "");
    } catch (e) {
      r.error = ctrl.signal.aborted ? "The check took too long." : "The scanner could not be reached.";
      setRow(r, "unknown", "Couldn't check", r.error);
    } finally {
      clearTimeout(timer);
    }
  }

  function summarize(list, host) {
    const n = (lv) => list.filter((r) => r.level === lv).length;
    const bad = n("bad"), warn = n("warn"), good = n("good"), unknown = n("unknown");
    const vuln = (k) => k + (k === 1 ? " vulnerability" : " vulnerabilities");
    const h = document.getElementById("sum-h");
    const lede = document.getElementById("sum-lede");
    const hostEl = el("span", { class: "host", text: host });
    let title, angle, rest;
    if (bad) {
      title = "Yes, a little panic.";
      angle = 55;
      rest = " is affected by " + vuln(bad) + (warn ? " and may be affected by " + warn + " more" : "") +
        ". Start with the red one.";
    } else if (warn) {
      title = "Maybe. Have a look.";
      angle = 15;
      rest = " may be affected by " + vuln(warn) + ". The exact version isn't visible from outside.";
    } else if (good) {
      title = unknown ? "Mostly calm." : "No panic.";
      angle = -55;
      rest = unknown ? " shows none of the vulnerabilities we could check. Some checks didn't work."
        : " shows none of these vulnerabilities from outside.";
    } else {
      title = "We couldn't check it.";
      angle = 0;
      rest = " didn't answer any of the scanners.";
    }
    h.textContent = title;
    lede.replaceChildren(hostEl, rest);
    sumNeedle.style.transform = "rotate(" + angle + "deg)";
    sumMeter.setAttribute("aria-label", "Panic meter: " + title);
  }

  function sortRows(list) {
    list.slice().sort((a, b) => RANK[a.level] - RANK[b.level]).forEach((r) => rows.append(r.row));
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errorBox.hidden = true;
    const host = hostInput.value.trim();
    if (!host) { showError("Enter the address of your website, for example www.example.ch."); hostInput.focus(); return; }
    if (!consent.checked) { showError("Confirm that you own the website or have the owner's permission."); consent.focus(); return; }

    go.disabled = true;
    go.textContent = "Checking…";
    const list = tiles.map(makeRow);
    rows.replaceChildren(...list.map((r) => r.row));
    list.forEach((r) => { r.details.href = r.tile.dataset.url.replace(/\/$/, "") + "/?host=" + encodeURIComponent(host); });
    document.getElementById("sum-kicker").textContent = "Checking " + list.length + " scanners…";
    document.getElementById("sum-h").textContent = "Checking…";
    document.getElementById("sum-lede").replaceChildren(el("span", { class: "host", text: host }));
    document.getElementById("results-note").textContent = "";
    sumNeedle.style.transform = "rotate(0deg)";
    box.hidden = true;
    results.hidden = false;
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });

    let finished = 0;
    await Promise.all(list.map((r) => runOne(r, host).then(() => {
      finished += 1;
      document.getElementById("sum-kicker").textContent =
        finished < list.length ? "Checking… " + finished + " of " + list.length + " done" : "All checks done · " + list.length + " of " + list.length;
    })));

    // the same input error from every scanner (e.g. "IP addresses are not supported"): back to the form
    const errors = list.map((r) => r.error || "");
    if (errors.every((e) => e && e === errors[0])) {
      results.hidden = true;
      box.hidden = false;
      showError(errors[0]);
      hostInput.focus();
    } else {
      summarize(list, host);
      sortRows(list);
      document.getElementById("results-note").textContent = "Checked " +
        new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) +
        ". “Details” opens the scanner's own page with the full result: what gave it away, fixed versions, what to do next.";
    }
    go.disabled = false;
    go.textContent = "Check all";
  });

  document.getElementById("again").addEventListener("click", () => {
    results.hidden = true;
    box.hidden = false;
    hostInput.focus();
    box.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  });
})();
