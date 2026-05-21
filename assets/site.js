(function () {
  const root = document.documentElement;

  function getStoredTheme() {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    syncThemeToggle(theme);
  }

  function syncThemeToggle(theme) {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    if (icon) icon.textContent = nextTheme === "dark" ? "☾" : "☀";
    if (label) label.textContent = nextTheme === "dark" ? "Dark" : "Light";
  }

  applyTheme(getStoredTheme());

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  const cursor = document.getElementById("cursor");
  const ring = document.getElementById("cursorRing");
  if (cursor && ring) {
    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;
    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
    });
    (function anim() {
      cursor.style.left = mx + "px";
      cursor.style.top = my + "px";
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      requestAnimationFrame(anim);
    })();
    document.querySelectorAll("a,button").forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.style.width = "6px";
        cursor.style.height = "6px";
        ring.style.width = "44px";
        ring.style.height = "44px";
        ring.style.borderColor = "rgba(249,115,22,0.7)";
      });
      el.addEventListener("mouseleave", () => {
        cursor.style.width = "10px";
        cursor.style.height = "10px";
        ring.style.width = "32px";
        ring.style.height = "32px";
        ring.style.borderColor = "rgba(249, 115, 22, 0.4)";
      });
    });
  }

  const nav = document.getElementById("nav");
  if (nav && nav.classList.contains("nav-scroll")) {
    window.addEventListener("scroll", () =>
      nav.classList.toggle("scrolled", window.scrollY > 60),
    );
  }

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.1 },
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
  }

  const filterBar = document.querySelector(".filter-bar");
  if (filterBar) {
    const cards = document.querySelectorAll(
      ".articles-grid .article-card[data-filter]",
    );
    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter || "All";
        filterBar
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        cards.forEach((card) => {
          const tags = (card.dataset.filter || "").split(/\s+/);
          const show = filter === "All" || tags.includes(filter);
          card.style.display = show ? "" : "none";
        });
      });
    });
  }
})();
