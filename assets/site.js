(function () {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const prefersFinePointer = window.matchMedia("(pointer: fine)").matches;

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

  /* Custom cursor — desktop + fine pointer only */
  const cursor = document.getElementById("cursor");
  const ring = document.getElementById("cursorRing");
  const enableCursor =
    cursor &&
    ring &&
    prefersFinePointer &&
    window.matchMedia("(min-width: 56.25rem)").matches;

  if (enableCursor) {
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
    document.querySelectorAll("a, button").forEach((el) => {
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

  /* Navigation */
  const nav = document.getElementById("nav") || document.querySelector("nav");
  if (nav) {
    if (nav.classList.contains("nav-scroll")) {
      const onScroll = () =>
        nav.classList.toggle("scrolled", window.scrollY > 48);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const menuBtn = document.getElementById("navMenuBtn");
    const menuPanel = document.getElementById("navMenu");
    if (menuBtn && menuPanel) {
      const closeMenu = () => {
        nav.classList.remove("nav-open");
        document.body.classList.remove("nav-open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Open menu");
      };

      menuBtn.addEventListener("click", () => {
        const open = !nav.classList.contains("nav-open");
        nav.classList.toggle("nav-open", open);
        document.body.classList.toggle("nav-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });

      menuPanel.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
      });

      window.addEventListener(
        "resize",
        () => {
          if (window.matchMedia("(min-width: 56.25rem)").matches) closeMenu();
        },
        { passive: true },
      );
    }
  }

  /* Scroll reveal */
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => {
      el.classList.add("visible");
    });
  }

  /* Blog filters */
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
          card.hidden = !show;
        });
      });
    });
  }
})();
