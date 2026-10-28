(function () {
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ── Theme toggle ── */
  var themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function currentTheme() {
      return (
        document.documentElement.getAttribute("data-theme") ||
        (darkQuery.matches ? "dark" : "light")
      );
    }

    function syncThemeToggle() {
      var theme = currentTheme();
      var next = theme === "dark" ? "light" : "dark";
      themeToggle.setAttribute("aria-label", "Switch to " + next + " mode");
      themeToggle.setAttribute("title", "Switch to " + next + " mode");

      var themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) {
        themeColor.setAttribute(
          "content",
          theme === "dark" ? "#0b0d10" : "#f6f4f0",
        );
      }
    }

    themeToggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* storage may be unavailable */
      }
      syncThemeToggle();
    });

    if (darkQuery.addEventListener) {
      darkQuery.addEventListener("change", syncThemeToggle);
    } else if (darkQuery.addListener) {
      darkQuery.addListener(syncThemeToggle);
    }

    syncThemeToggle();
  }

  /* ── Reveal on scroll (.rv → .on, .reveal → .visible) ── */
  var revealables = document.querySelectorAll(".rv, .reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("on");
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" },
    );
    revealables.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("on");
      el.classList.add("visible");
    });
  }

  /* ── Blog filters ── */
  var filterBar = document.querySelector(".filter-bar");
  if (filterBar) {
    var cards = document.querySelectorAll(
      ".articles-grid .article-card[data-filter]",
    );
    filterBar.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var filter = btn.dataset.filter || "All";
        filterBar.querySelectorAll(".filter-btn").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        cards.forEach(function (card) {
          var tags = (card.dataset.filter || "").split(/\s+/);
          card.hidden = !(filter === "All" || tags.indexOf(filter) !== -1);
        });
      });
    });
  }

  /* ── Homepage terminal ── */
  var terminal = document.getElementById("t");
  if (terminal) {
    var lines = [
      ["$ whoami", "p"],
      ["francis · sre · accra", "g"],
      ["$ kubectl get slo --burn-rate", "p"],
      ["api-service     ok   0.4x", "m"],
      ["frontend        ok   0.7x", "m"],
      ["background-job  ok   0.3x", "m"],
      ["$ alerts --noise", "p"],
      ["↓ 20% after SLO rework", "w"],
      ["$ ", "p"],
    ];

    var index = 0;
    var output = "";

    function escape(s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    }

    function render() {
      terminal.innerHTML = output + '<span class="cur"></span>';
    }

    function nextLine() {
      if (index >= lines.length) {
        render();
        return;
      }
      var line = lines[index];
      var text = line[0];
      var cls = line[1];
      var pos = 0;

      (function type() {
        if (pos <= text.length) {
          terminal.innerHTML =
            output +
            '<span class="' +
            cls +
            '">' +
            escape(text.slice(0, pos)) +
            '</span><span class="cur"></span>';
          pos++;
          setTimeout(type, cls === "p" ? 45 : 8);
        } else {
          output +=
            '<span class="' +
            cls +
            '">' +
            escape(text) +
            "</span>" +
            (index < lines.length - 1 ? "\n" : "");
          index++;
          setTimeout(nextLine, cls === "p" ? 260 : 90);
        }
      })();
    }

    if (prefersReducedMotion) {
      lines.forEach(function (line, i) {
        output +=
          '<span class="' +
          line[1] +
          '">' +
          escape(line[0]) +
          "</span>" +
          (i < lines.length - 1 ? "\n" : "");
      });
      render();
    } else {
      nextLine();
    }
  }

  /* ── Homepage service architecture ── */
  var qc = document.querySelector("[data-qc]");
  if (qc) {
    var qcDomains = {
      consumer: {
        title: "API services",
        services: [
          { n: ".NET Core backend API", k: "API", d: "JWT validation, routing" },
          { n: "Backend API", k: "API", d: "PostgreSQL via Npgsql" },
          { n: "Internal API", k: "API", d: "PostgreSQL-backed" },
          { n: "API gateway", k: "API", d: "Service-to-service routing" },
        ],
      },
      riders: {
        title: "Frontend services",
        services: [
          { n: "Frontend application", k: "Web app", d: "Browser client" },
          { n: "Operations frontend", k: "Web app", d: "Internal client" },
          { n: "Admin frontend", k: "Web app", d: "Back-office client" },
          { n: "API client", k: "Service", d: "Own release pipeline" },
          { n: "Kafka producer", k: "Producer", d: "Publishes domain events" },
        ],
      },
      retailers: {
        title: "Kafka services",
        services: [
          { n: "Kafka producer", k: "Producer", d: "Publishes change events" },
          { n: "Kafka consumer", k: "Consumer", d: "Consumes topics asynchronously" },
          { n: "Kafka consumer group", k: "Consumer", d: "Scalable event processing" },
          { n: "Debezium CDC connector", k: "Service", d: "Database change capture" },
          { n: "Temporal workflow worker", k: "Service", d: "Durable workflows" },
          { n: ".NET background job", k: "Job", d: "Scheduled and async work" },
        ],
      },
      shared: {
        title: "Platform services",
        services: [
          { n: ".NET Core backend API", k: "API", d: "Internal load balancer DNS" },
          { n: ".NET background job", k: "Job", d: "Scheduled and async work" },
          { n: "Temporal", k: "Service", d: "Workflow orchestration" },
          { n: "Debezium CDC", k: "Service", d: "Database change events" },
        ],
      },
    };

    var qcIcons = {
      API: "assets/icons/APIGateway.png",
      "Web app": "assets/icons/GenericApplication.png",
      Service: "assets/icons/EC2.png",
      Producer: "assets/icons/kafka.svg",
      Consumer: "assets/icons/kafka.svg",
      Job: "assets/icons/Lambda.png",
    };

    var qcPanel = qc.querySelector("#qc-panel");
    var qcButtons = qc.querySelectorAll("[data-qc-domain]");

    function qcPlate(src, extraClass) {
      var plate = document.createElement("span");
      plate.className = "qc-ico " + extraClass;
      var img = document.createElement("img");
      img.src = src;
      img.width = 20;
      img.height = 20;
      img.alt = "";
      img.loading = "eager";
      img.decoding = "async";
      plate.appendChild(img);
      return plate;
    }

    function qcRender(id) {
      var domain = qcDomains[id];
      if (!domain || !qcPanel) return;

      var head = document.createElement("div");
      head.className = "qc-ph";
      var title = document.createElement("b");
      title.textContent = domain.title;
      var count = document.createElement("span");
      count.textContent = domain.services.length + " services";
      head.appendChild(title);
      head.appendChild(count);

      var list = document.createElement("div");
      list.className = "qc-svcs";

      domain.services.forEach(function (service) {
        var tile = document.createElement("div");
        tile.className = "qc-svc" + (service.u ? " qc-svc--tbc" : "");
        tile.appendChild(
          qcPlate(qcIcons[service.k] || qcIcons.API, "qc-ico--sm"),
        );

        var body = document.createElement("span");
        body.className = "qc-svc-t";

        var tag = document.createElement("small");
        tag.className = "qc-tag";
        tag.textContent = service.k;

        var name = document.createElement("b");
        name.textContent = service.n;

        var desc = document.createElement("span");
        desc.className = "qc-desc";
        desc.textContent = service.d;

        body.appendChild(tag);
        body.appendChild(name);
        body.appendChild(desc);
        tile.appendChild(body);
        list.appendChild(tile);
      });

      qcPanel.textContent = "";
      qcPanel.appendChild(head);
      qcPanel.appendChild(list);
    }

    function qcSelect(id) {
      qcButtons.forEach(function (btn) {
        var on = btn.dataset.qcDomain === id;
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      qcRender(id);
    }

    qcButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        qcSelect(btn.dataset.qcDomain);
      });
    });

    qcSelect("retailers");
  }
})();
