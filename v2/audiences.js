(() => {
  const root = document.getElementById("audiences");
  if (!root) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const text = {
    ui: ["UI story", [
      '<span class="aud-f">Delivery note number</span>: required; if already used for this supplier, the user sees "Already recorded for this supplier".',
      '<span class="aud-f">Receive now</span>: per line; above the open quantity shows "Can\'t receive more than the open quantity (4)".',
      '<span class="aud-f">After saving</span>: the user sees "Delivery GR000312 recorded".'
    ]],
    be: ["Backend story", [
      '<code>deliveryNoteNumber</code>: string(40), unique per supplier, else <code>422 DUPLICATE_DELIVERY_NOTE</code>.',
      '<code>quantity</code>: decimal(12,3), &gt; 0, ≤ open quantity, else <code>422 QUANTITY_EXCEEDS_OPEN</code>.',
      '<code>referenceNumber</code>: <code>GR</code> + 6 digits, unique, returned with <code>201</code>.'
    ]]
  };
  const list = root.querySelector("#aud-items");
  const kicker = root.querySelector("#aud-kicker");
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  let audience = "ui";
  let run = 0;
  let hover = null;

  const stage = () => root.querySelector("#aud-" + audience);

  function highlight() {
    list.querySelectorAll("li").forEach((item) => {
      item.classList.toggle("hl", item.dataset.n === hover);
    });
    stage().querySelectorAll("[data-aud-to]").forEach((target) => {
      target.classList.toggle("hl", target.dataset.audTo === hover);
    });
    stage().classList.toggle("hl-mode", Boolean(hover));
  }

  function render() {
    kicker.textContent = text[audience][0];
    list.innerHTML = text[audience][1].map((item, index) =>
      `<li data-n="${index + 1}" tabindex="0"><span class="aud-n" aria-hidden="true">${index + 1}</span><span>${item}</span></li>`
    ).join("");
    list.querySelectorAll("li").forEach((item) => {
      const on = () => { hover = item.dataset.n; highlight(); };
      const off = () => { hover = null; highlight(); };
      item.addEventListener("mouseenter", on);
      item.addEventListener("focus", on);
      item.addEventListener("mouseleave", off);
      item.addEventListener("blur", off);
      item.addEventListener("click", () => {
        hover = hover === item.dataset.n ? null : item.dataset.n;
        highlight();
      });
    });
  }

  function fly(from, to) {
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "aud-ghost";
    ghost.textContent = from.textContent;
    root.appendChild(ghost);
    const x0 = fromRect.left + fromRect.width / 2;
    const y0 = fromRect.top + fromRect.height / 2;
    const x1 = toRect.left + 24;
    const y1 = toRect.top + toRect.height / 2;
    return ghost.animate([
      { transform: `translate(${x0}px,${y0}px)` },
      { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 40}px)`, offset: .5 },
      { transform: `translate(${x1}px,${y1}px) scale(.6)`, opacity: .2 }
    ], { duration: 650, easing: "cubic-bezier(.45,0,.25,1)" }).finished
      .then(() => ghost.remove(), () => ghost.remove());
  }

  function show(next) {
    const id = ++run;
    audience = next;
    hover = null;
    tabs.forEach((tab) => {
      const selected = tab.dataset.audience === audience;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      root.querySelector("#" + tab.getAttribute("aria-controls")).hidden = !selected;
    });
    list.classList.add("swap");
    setTimeout(() => {
      if (id !== run) return;
      render();
      list.classList.remove("swap");
      const activeStage = stage();
      const targets = [...activeStage.querySelectorAll("[data-aud-to]")];
      targets.forEach((target) => target.classList.remove("aud-on"));
      if (reduce) {
        targets.forEach((target) => target.classList.add("aud-on"));
        return;
      }
      activeStage.classList.add("aud-armed");
      list.querySelectorAll("li").forEach((item, index) => {
        setTimeout(() => {
          targets.filter((target) => target.dataset.audTo === item.dataset.n).forEach((target, targetIndex) => {
            setTimeout(() => {
              if (id !== run) return;
              fly(item.querySelector(".aud-n"), target)
                .then(() => { if (id === run) target.classList.add("aud-on"); });
            }, targetIndex * 120);
          });
        }, 250 + index * 450);
      });
    }, reduce ? 0 : 200);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.audience !== audience) show(tab.dataset.audience);
    });
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : tabs.length - 1;
      const next = tabs[(index + offset) % tabs.length];
      next.focus();
      show(next.dataset.audience);
    });
  });

  render();
  stage().classList.add("aud-armed");
  if ("IntersectionObserver" in window && !reduce) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        show("ui");
      }
    }, { threshold: .4 });
    observer.observe(root.querySelector(".aud-card"));
  } else {
    show("ui");
  }
})();
