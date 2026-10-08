
(() => {
  const root = document.getElementById('lenses');
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const notes = {
    process: "Where the feature sits in the business flow.",
    ui: "What the buyer sees and does.",
    backend: "The contract and the data that make it true.",
    full: "One save, traced end to end."
  };
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const acItems = [...root.querySelectorAll(".ac li")];
  const note = root.querySelector(".lens-note");
  let current = "ui";
  let run = 0;
  let pinned = null;

  const panelOf = (lens) => document.getElementById("p-" + lens);
  const targetsFor = (panel, ac) => [...panel.querySelectorAll("[data-to]")].filter(el => el.dataset.to.split(" ").includes(String(ac)));

  function flyTo(fromEl, toEl, label) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = b.left + Math.min(b.width / 2, 60), y1 = b.top + b.height / 2;
    const ghost = document.createElement("div");
    ghost.className = "ghost";
    ghost.textContent = label;
    document.body.appendChild(ghost);
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 60;
    const anim = ghost.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(1)` },
      { transform: `translate(${mx}px, ${my}px) scale(1.15)`, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) scale(.6)`, opacity: 0.2 }
    ], { duration: 720, easing: "cubic-bezier(.45, 0, .25, 1)" });
    return anim.finished.then(() => ghost.remove(), () => ghost.remove());
  }

  function land(el) {
    el.classList.add("landed");
    if (!reduce) { el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
  }

  function showLens(lens, animate) {
    const id = ++run;
    current = lens;
    tabs.forEach(t => {
      const on = t.dataset.lens === lens;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      panelOf(t.dataset.lens).hidden = !on;
    });
    note.textContent = notes[lens];
    const panel = panelOf(lens);
    const all = [...panel.querySelectorAll("[data-to]")];
    all.forEach(el => el.classList.remove("landed", "pulse"));
    panel.classList.remove("live");
    void panel.offsetWidth;
    applyHighlight();

    if (reduce || !animate) {
      panel.classList.remove("armed");
      all.forEach(el => el.classList.add("landed"));
      panel.classList.add("live");
      return;
    }
    panel.classList.add("armed");
    requestAnimationFrame(() => panel.classList.add("live"));
    acItems.forEach((li, i) => {
      const ac = i + 1;
      targetsFor(panel, ac).forEach((el, k) => {
        setTimeout(() => {
          if (id !== run) return;
          flyTo(li.querySelector(".n"), el, ac).then(() => { if (id === run) land(el); });
        }, i * 200 + k * 90);
      });
    });
  }

  // tabs: click + arrow keys inside the tablist
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => { if (t.dataset.lens !== current) showLens(t.dataset.lens, true); });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      showLens(next.dataset.lens, true);
    });
  });

  // two-way tracing between criteria and targets
  let hover = null;
  function applyHighlight() {
    const ac = hover ?? pinned;
    acItems.forEach(li => li.classList.toggle("hl", li.dataset.ac === String(ac)));
    root.querySelectorAll("[data-to]").forEach(el => el.classList.toggle("hl", ac !== null && el.dataset.to.split(" ").includes(String(ac))));
    panelOf(current).classList.toggle("hl-mode", ac !== null);
  }
  acItems.forEach(li => {
    li.addEventListener("mouseenter", () => { hover = li.dataset.ac; applyHighlight(); });
    li.addEventListener("mouseleave", () => { hover = null; applyHighlight(); });
    li.addEventListener("focus", () => { hover = li.dataset.ac; applyHighlight(); });
    li.addEventListener("blur", () => { hover = null; applyHighlight(); });
    li.addEventListener("click", () => { pinned = pinned === li.dataset.ac ? null : li.dataset.ac; applyHighlight(); });
    li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); li.click(); } });
  });
  root.querySelectorAll("[data-to]").forEach(el => {
    el.addEventListener("mouseenter", () => { hover = el.dataset.to.split(" ")[0]; applyHighlight(); });
    el.addEventListener("mouseleave", () => { hover = null; applyHighlight(); });
  });

  // ---------- the working UI screen ----------
  const seed = () => ({
    lines: [
      { id: "L-1", item: "Office chair", ordered: 20, open: 0, now: "" },
      { id: "L-2", item: "Desk lamp", ordered: 12, open: 6, now: "6" },
      { id: "L-3", item: "Monitor arm", ordered: 8, open: 4, now: "5" }
    ],
    history: ["GR-305, 2 lines, A. Buyer, 14 Oct", "GR-298, 3 lines, A. Buyer, 9 Oct"],
    seq: 306
  });
  let state = seed();
  const tbody = document.getElementById("lines");
  const hist = document.getElementById("history");
  const status = document.getElementById("status");

  function buildRows() {
    tbody.replaceChildren();
    state.lines.forEach((l, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${l.id}</td><td>${l.item}</td><td class="num">${l.ordered}</td><td class="num" data-open>${l.open}</td><td class="qty"></td>`;
      const cell = tr.querySelector(".qty");
      cell.dataset.to = "1";
      if (l.open === 0) {
        cell.innerHTML = `<span class="c" aria-label="Fully received">Fully received</span>`;
      } else {
        const input = document.createElement("input");
        input.type = "text"; input.inputMode = "numeric"; input.value = l.now;
        input.setAttribute("aria-label", `Receive now, ${l.item}`);
        const err = document.createElement("span");
        err.className = "err"; err.id = "err-" + i; err.hidden = true;
        err.dataset.to = "2";
        input.setAttribute("aria-describedby", err.id);
        input.addEventListener("input", () => { l.now = input.value.trim(); validate(); });
        cell.append(input, err);
      }
      tbody.appendChild(tr);
    });
    hist.replaceChildren(...state.history.map(h => { const li = document.createElement("li"); li.textContent = h; return li; }));
    const done = state.lines.every(l => l.open === 0);
    status.textContent = done ? "Received" : "Partly received";
    status.classList.toggle("done", done);
    validate();
    bindNewTargets();
  }

  function validate() {
    let ok = true;
    state.lines.forEach((l, i) => {
      const err = document.getElementById("err-" + i);
      if (!err) return;
      const input = err.previousElementSibling;
      const v = l.now === "" ? 0 : Number(l.now);
      let msg = "";
      if (!Number.isInteger(v) || v < 0) msg = "Enter a whole number.";
      else if (v > l.open) msg = `Can't receive more than the open quantity (${l.open}).`;
      err.textContent = msg; err.hidden = !msg;
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg) ok = false;
    });
    return ok;
  }

  function bindNewTargets() {
    const panel = panelOf("ui");
    panel.querySelectorAll("[data-to]").forEach(el => {
      if (el.dataset.bound) return;
      el.dataset.bound = "1";
      if (!panel.classList.contains("armed") || current !== "ui") el.classList.add("landed");
      el.addEventListener("mouseenter", () => { hover = el.dataset.to.split(" ")[0]; applyHighlight(); });
      el.addEventListener("mouseleave", () => { hover = null; applyHighlight(); });
    });
    panel.querySelectorAll(".qty, .err").forEach(el => el.classList.add("landed"));
    applyHighlight();
  }

  document.getElementById("save").addEventListener("click", () => {
    if (!validate()) { const bad = tbody.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
    const received = state.lines.filter(l => l.open > 0 && Number(l.now) > 0);
    if (!received.length) return;
    received.forEach(l => { l.open -= Number(l.now); l.now = l.open ? "0" : ""; });
    state.history.unshift(`GR-${state.seq++}, ${received.length} line${received.length > 1 ? "s" : ""}, you, today`);
    buildRows();
    land(hist.closest("[data-to]"));
    land(status);
  });
  document.getElementById("reset").addEventListener("click", () => { state = seed(); buildRows(); });

  buildRows();

  // first run: animate the UI lens when the section scrolls into view
  const startPanel = panelOf("ui");
  startPanel.classList.add("armed");
  const start = () => showLens("ui", true);
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); start(); }
    }, { threshold: 0.35 });
    io.observe(root.querySelector(".grid"));
  } else {
    showLens("ui", false);
  }
})();
