"use strict";
// Panic meter: starts at "panic" and calms down with every vulnerability you checked
// (clicked "Check your site"). Remembered in this browser only (localStorage).
(function () {
  const KEY = "shouldipanic-checked";
  const tiles = Array.from(document.querySelectorAll(".tile[data-scanner]"));
  const needle = document.getElementById("needle");
  const meter = document.getElementById("meter");
  const caption = document.getElementById("meter-caption");
  if (!tiles.length || !needle) return;

  function load() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) { return new Set(); }
  }
  function save(set) {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch (e) { /* private mode */ }
  }

  function update() {
    const checked = load();
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
    if (!link) return;
    link.addEventListener("click", () => {
      const set = load();
      set.add(t.dataset.scanner);
      save(set);
      update();
    });
  });

  requestAnimationFrame(() => requestAnimationFrame(update));   // let the needle swing in
  window.addEventListener("pageshow", update);                   // back button
  window.addEventListener("storage", update);                    // other tabs
})();
