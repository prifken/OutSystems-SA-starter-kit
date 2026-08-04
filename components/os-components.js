/* ============================================================
   RIFKEN METHOD TOOLKIT — COMPONENT LIBRARY
   ============================================================
   Real custom elements (customElements.define), rendered into
   LIGHT DOM (no Shadow DOM). This is deliberate: it lets a page
   override --color-primary etc. from a <style> block and have
   every component pick up the change, the same way SAs already
   rebrand OutSystems UI HTML prototypes for a client.

   Every class in the HTML these components render comes from
   ../components/tokens.css. There is no CSS in this file.

   How to use any component: set attributes for simple config,
   set a JS property (e.g. `el.rows = [...]`) for list/array data.
   Components with structured children (os-tabs, os-wizard-stepper,
   os-card, os-modal, os-form-field) read their light-DOM children
   once and rebuild around them — write the children like plain
   HTML, the component does the rest.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     ICON SET
     Inline SVG strings (no fetch — works under file:// with zero
     network requests). 24x24 viewBox, 2px stroke, currentColor.
     Add new icons here and they're available to every component.
     ---------------------------------------------------------- */
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
    ticket: '<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"></path><path d="M9 9v6" stroke-dasharray="1 2"></path>',
    "bar-chart": '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
    search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
    "chevron-down": '<polyline points="6 9 12 15 18 9"></polyline>',
    "chevron-left": '<polyline points="15 18 9 12 15 6"></polyline>',
    "chevron-right": '<polyline points="9 18 15 12 9 6"></polyline>',
    "trend-up": '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
    "trend-down": '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline>',
    x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
    check: '<polyline points="20 6 9 17 4 12"></polyline>',
    "alert-triangle": '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    "alert-circle": '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
    clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line>',
    "arrow-up-circle": '<circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line>',
    paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
    sparkles: '<path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"></path><path d="M16 12v2a4 4 0 0 1-8 0v-2"></path><circle cx="12" cy="20" r="2"></circle><line x1="12" y1="18" x2="12" y2="16"></line>',
    send: '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>',
    "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
    inbox: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
    "sprinkler-head": '<circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>'
  };

  function icon(name, size) {
    const s = size || 16;
    const body = ICONS[name] || ICONS.inbox;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg>";
  }

  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ============================================================
     os-sidebar-nav
     Attributes: active (matches a child <a data-nav="...">), logo
                 (customer logo image path), brand (alt text, and the
                 visible label only if show-brand-label="true"),
                 show-brand-label, logo-chip, powered-by-logo (defaults
                 to "../../components/os_logo.png")

     DEFAULT BEHAVIOR: the logo renders directly on the dark sidebar —
     no white background, no added text. Most real logos (a wordmark,
     or a self-contained badge like a blue oval with the company name
     scripted into it) already read fine on a dark background and
     already say what the company is. Don't add visual weight they
     don't need.

     Before using a new logo, look at the actual image and decide:

     1. Does the artwork already contain the company's name as legible
        text (a wordmark, or a badge/oval/crest with the name inside
        it)? If yes — default behavior is correct, do nothing more.
        If the image is a bare icon or symbol with no legible name in
        it, set show-brand-label="true" so the `brand` text renders
        next to it — a symbol alone doesn't tell anyone what it is.

     2. Does the logo have its own opaque background (a badge/oval/
        crest shape with a fill), or is it a verified reversed/white
        variant made for dark backgrounds? If yes — default behavior
        is correct. If it's a transparent PNG with dark or unknown-
        color ink and NO opaque background of its own, direct
        placement will make it unreadable — that is the one real case
        for set logo-chip="true" (wraps it in a white background).
        Check for a reversed/white variant from the brand first; only
        reach for the chip if one doesn't exist.

     3. Always confirm with an actual rendered screenshot before
        calling a build done — this is a judgment call about a specific
        image, not something a CSS default can get right for every
        logo. See the kit's test checklist.

     The "Powered by OutSystems" footer badge is a separate, narrower
     case: it's OutSystems' own known dark-ink asset, so instead of a
     chip `filter: brightness(0) invert(1)` (tokens.css .powered-by img)
     recolors it on the fly rather than needing a decision each time.

     Usage:
       <os-sidebar-nav active="dashboard" logo="../../components/client-logo.png" brand="Acme Corp">
         <a href="dashboard.html" data-nav="dashboard" data-icon="grid">Dashboard</a>
         <a href="tickets.html"   data-nav="tickets"   data-icon="ticket">Tickets</a>
       </os-sidebar-nav>

     Nav items that don't lead anywhere yet (a screen you haven't built
     for this prototype) should be grayed out, not left as live dead
     links — set data-disabled="true" on that <a>. It renders inert
     (no click, no hover, 40% opacity) with a "Not available in this
     prototype" tooltip, so a viewer can see the full intended nav
     structure without clicking into nothing:
         <a href="#" data-nav="reports" data-icon="bar-chart" data-disabled="true">Reports</a>
     ============================================================ */
  class OsSidebarNav extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

      const active = this.getAttribute("active") || "";
      const logo = this.getAttribute("logo") || "os_logo.png";
      const brand = this.getAttribute("brand") || "OutSystems";
      const homeHref = this.getAttribute("home-href") || "dashboard.html";
      // See the decision process in the comment above. Both default to
      // false: no added text, no chip — direct placement is correct for
      // most real logos.
      const showBrandLabel = this.getAttribute("show-brand-label") === "true";
      const logoChip = this.getAttribute("logo-chip") === "true";
      const poweredByLogo = this.getAttribute("powered-by-logo") || "../../components/os_logo.png";

      // Capture nav links before we overwrite innerHTML.
      const links = Array.from(this.children).filter((el) => el.tagName === "A");
      const navHtml = links
        .map((a) => {
          const key = a.getAttribute("data-nav") || "";
          const iconName = a.getAttribute("data-icon") || "inbox";
          const badge = a.getAttribute("data-badge");
          const isActive = key === active;
          const isDisabled = a.getAttribute("data-disabled") === "true";
          const href = isDisabled ? "#" : esc(a.getAttribute("href") || "#");
          const classes = "nav-item" + (isActive ? " active" : "") + (isDisabled ? " disabled" : "");
          const extraAttrs = isDisabled ? ' aria-disabled="true" title="Not available in this prototype"' : "";
          return (
            '<a href="' + href + '" class="' + classes + '" data-nav="' + esc(key) + '"' + extraAttrs + ">" +
            icon(iconName, 20) +
            "<span>" + esc(a.textContent.trim()) + "</span>" +
            (badge ? '<span class="nav-badge">' + esc(badge) + "</span>" : "") +
            "</a>"
          );
        })
        .join("");

      this.classList.add("sidebar");
      const logoClass = logoChip ? "sidebar-logo-chip" : (showBrandLabel ? "sidebar-logo-on-dark-labeled" : "sidebar-logo-on-dark");
      this.innerHTML =
        '<div class="sidebar-header">' +
        '<a href="' + esc(homeHref) + '" class="' + logoClass + '">' +
        '<img src="' + esc(logo) + '" alt="' + esc(brand) + '">' +
        (showBrandLabel ? "<span>" + esc(brand) + "</span>" : "") +
        "</a>" +
        "</div>" +
        '<nav class="sidebar-nav">' + navHtml + "</nav>" +
        '<div class="sidebar-footer">' +
        '<div class="powered-by">' +
        '<div class="powered-by-label">Powered by</div>' +
        '<img src="' + esc(poweredByLogo) + '" alt="OutSystems">' +
        "</div>" +
        "</div>";
    }
  }

  /* ============================================================
     os-kpi-card
     Attributes: label, value, variant (primary|success|warning|error),
                 sub (subtext), trend (up|down), trend-value
     ============================================================ */
  class OsKpiCard extends HTMLElement {
    connectedCallback() {
      this.render();
    }
    static get observedAttributes() { return ["label", "value", "variant", "sub", "trend", "trend-value"]; }
    attributeChangedCallback() { if (this._rendered) this.render(); }
    render() {
      this._rendered = true;
      const variant = this.getAttribute("variant") || "primary";
      const label = this.getAttribute("label") || "";
      const value = this.getAttribute("value") || "";
      const sub = this.getAttribute("sub") || "";
      const trend = this.getAttribute("trend");
      const trendValue = this.getAttribute("trend-value") || "";

      this.classList.add("kpi-card");
      this.setAttribute("data-variant", variant);

      let trendHtml = "";
      if (trend) {
        trendHtml =
          '<span class="kpi-trend ' + (trend === "up" ? "up" : "down") + '">' +
          icon(trend === "up" ? "trend-up" : "trend-down", 12) +
          esc(trendValue) +
          "</span>";
      }

      this.innerHTML =
        '<div class="kpi-label">' + esc(label) + "</div>" +
        '<div class="kpi-value">' + esc(value) + "</div>" +
        (sub || trend ? '<div class="kpi-sub">' + esc(sub) + trendHtml + "</div>" : "");
    }
  }

  /* ============================================================
     os-status-badge
     Attributes: variant (primary|success|warning|error|info|neutral), label
     If no `label` attribute, uses the element's text content.
     ============================================================ */
  class OsStatusBadge extends HTMLElement {
    connectedCallback() { this.render(); }
    static get observedAttributes() { return ["variant", "label"]; }
    attributeChangedCallback() { if (this._rendered) this.render(); }
    render() {
      this._rendered = true;
      const variant = this.getAttribute("variant") || "neutral";
      const label = this.getAttribute("label") || this.textContent.trim();
      this.className = "badge badge-" + variant;
      this.textContent = label;
    }
  }

  /* ============================================================
     os-card
     Attributes: heading, action-label, action-href
     Light-DOM children become the card body.
     ============================================================ */
  class OsCard extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;
      const heading = this.getAttribute("heading");
      const actionLabel = this.getAttribute("action-label");
      const actionHref = this.getAttribute("action-href") || "#";
      const bodyContent = this.innerHTML;

      this.classList.add("card");
      this.innerHTML =
        (heading
          ? '<div class="card-header"><span class="card-title">' + esc(heading) + "</span>" +
            (actionLabel ? '<a href="' + esc(actionHref) + '" class="card-action">' + esc(actionLabel) + "</a>" : "") +
            "</div>"
          : "") +
        '<div class="card-body">' + bodyContent + "</div>";
    }
  }

  /* ============================================================
     os-data-table
     Properties: columns [{key,label,type}], rows [{...}]
       type: 'text' (default) | 'status' (expects row[key+'Variant']) | 'user' (expects row[key] = {name, initials, color})
     Attributes: row-href-template ("ticket-detail.html?id={id}"), clickable, empty-text
     ============================================================ */
  class OsDataTable extends HTMLElement {
    connectedCallback() {
      if (!this._columns) this._columns = [];
      if (!this._rows) this._rows = [];
      this.render();
    }
    set columns(val) { this._columns = val || []; this.render(); }
    get columns() { return this._columns || []; }
    set rows(val) { this._rows = val || []; this.render(); }
    get rows() { return this._rows || []; }

    render() {
      const cols = this._columns || [];
      const rows = this._rows || [];
      const template = this.getAttribute("row-href-template");
      const clickable = this.hasAttribute("clickable") && !!template;
      const emptyText = this.getAttribute("empty-text") || "No records to show.";

      if (!cols.length) { this.innerHTML = ""; return; }

      const thead = "<tr>" + cols.map((c) => "<th>" + esc(c.label) + "</th>").join("") + "</tr>";

      let tbody;
      if (!rows.length) {
        tbody = '<tr><td colspan="' + cols.length + '" class="table-empty">' + esc(emptyText) + "</td></tr>";
      } else {
        tbody = rows
          .map((row) => {
            const href = template ? template.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(row[k])) : null;
            const cells = cols
              .map((c) => {
                const v = row[c.key];
                if (c.type === "status") {
                  const variant = row[c.key + "Variant"] || "neutral";
                  return '<td><span class="badge badge-' + esc(variant) + '">' + esc(v) + "</span></td>";
                }
                if (c.type === "user") {
                  const u = v || {};
                  return (
                    "<td><div class=\"user-cell\"><div class=\"avatar avatar-sm\" style=\"background:" + esc(u.color || "var(--color-primary)") + '">' +
                    esc(u.initials || "") + "</div><span>" + esc(u.name || "") + "</span></div></td>"
                  );
                }
                return "<td>" + esc(v) + "</td>";
              })
              .join("");
            const rowAttrs = clickable ? ' class="clickable" data-href="' + esc(href) + '"' : "";
            return "<tr" + rowAttrs + ">" + cells + "</tr>";
          })
          .join("");
      }

      this.innerHTML = '<table class="table"><thead>' + thead + "</thead><tbody>" + tbody + "</tbody></table>";

      if (clickable) {
        this.querySelectorAll("tr.clickable").forEach((tr) => {
          tr.addEventListener("click", () => {
            const href = tr.getAttribute("data-href");
            if (href) window.location.href = href;
          });
        });
      }
    }
  }

  /* ============================================================
     os-tabs
     Each direct child is one panel:
       <div data-tab="details" data-tab-label="Details" data-tab-badge="3">...</div>
     Attribute: active (data-tab key of the panel to show first)
     ============================================================ */
  class OsTabs extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

      const panels = Array.from(this.children);
      const activeKey = this.getAttribute("active") || (panels[0] && panels[0].getAttribute("data-tab"));

      const tabsBar = document.createElement("div");
      tabsBar.className = "tabs-container";
      const tabsInner = document.createElement("div");
      tabsInner.className = "tabs";
      tabsBar.appendChild(tabsInner);

      panels.forEach((panel) => {
        const key = panel.getAttribute("data-tab");
        const label = panel.getAttribute("data-tab-label") || key;
        const badge = panel.getAttribute("data-tab-badge");
        const isActive = key === activeKey;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tab" + (isActive ? " active" : "");
        btn.setAttribute("data-tab-target", key);
        btn.innerHTML = esc(label) + (badge ? '<span class="tab-badge">' + esc(badge) + "</span>" : "");
        btn.addEventListener("click", () => this.activate(key));
        tabsInner.appendChild(btn);

        panel.classList.add("tab-panel");
        panel.classList.toggle("active", isActive);
      });

      this.prepend(tabsBar);
    }

    activate(key) {
      this.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab-target") === key));
      this.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.getAttribute("data-tab") === key));
      this.dispatchEvent(new CustomEvent("os-tab-change", { detail: { tab: key }, bubbles: true }));
    }
  }

  /* ============================================================
     os-status-timeline
     Property: items [{title, user, date, state, initials, color, note}]
       state: complete | current | pending (default) | warning | error
       Use 'error' for a failed/negative event (e.g. a failed audit) and
       'warning' for a conditional/partial one — do NOT reuse 'complete'
       (green check) just because the event happened in the past.
       'complete' means the step succeeded, not merely that it occurred.
     ============================================================ */
  class OsStatusTimeline extends HTMLElement {
    connectedCallback() { if (!this._items) this._items = []; this.render(); }
    set items(val) { this._items = val || []; this.render(); }
    get items() { return this._items || []; }
    render() {
      const items = this._items || [];
      this.classList.add("timeline");
      this.innerHTML = items
        .map((item, i) => {
          const state = item.state || "pending";
          const iconHtml =
            state === "complete" ? icon("check", 14) :
            state === "error" ? icon("x", 14) :
            state === "warning" ? icon("alert-triangle", 14) :
            state === "current" ? String(i + 1) : String(i + 1);
          return (
            '<div class="timeline-item">' +
            '<div class="timeline-icon ' + state + '">' + iconHtml + "</div>" +
            '<div class="timeline-content">' +
            '<div class="timeline-title">' + esc(item.title) + "</div>" +
            (item.user
              ? '<div class="timeline-user"><div class="avatar avatar-sm" style="background:' + esc(item.color || "var(--color-primary)") + '">' +
                esc(item.initials || "") + '</div><span class="timeline-user-name">' + esc(item.user) + "</span></div>"
              : "") +
            '<div class="timeline-date">' + esc(item.date) + "</div>" +
            (item.note ? '<div class="timeline-note">' + esc(item.note) + "</div>" : "") +
            "</div></div>"
          );
        })
        .join("");
    }
  }

  /* ============================================================
     os-ai-sidebar
     Attributes: heading (default "AI Assistant") — note: not `title`,
                 which would collide with the native HTML tooltip attribute.
     Properties: insight (string), recommendations [{title, description}], activityLog [{text, time}]
     Methods: open(), close(), toggle()
     ============================================================ */
  class OsAiSidebar extends HTMLElement {
    connectedCallback() {
      if (!this._recommendations) this._recommendations = [];
      if (!this._activityLog) this._activityLog = [];
      this.render();
    }
    set insight(val) { this._insight = val; this.render(); }
    get insight() { return this._insight || ""; }
    set recommendations(val) { this._recommendations = val || []; this.render(); }
    get recommendations() { return this._recommendations || []; }
    set activityLog(val) { this._activityLog = val || []; this.render(); }
    get activityLog() { return this._activityLog || []; }

    render() {
      const heading = this.getAttribute("heading") || "AI Assistant";
      const recs = this._recommendations || [];
      const activity = this._activityLog || [];

      this.classList.add("ai-sidebar");
      this.innerHTML =
        '<div class="ai-sidebar-header">' +
        '<div class="ai-sidebar-title">' + icon("sparkles", 20) + "<span>" + esc(heading) + "</span></div>" +
        '<button class="ai-close-btn" data-action="close">' + icon("x", 16) + "</button>" +
        "</div>" +
        '<div class="ai-sidebar-body">' +
        '<div class="ai-status"><span class="ai-status-dot"></span><span>Online &middot; Analyzing context</span></div>' +
        (this._insight
          ? '<div class="ai-insight"><div class="ai-insight-header">' + icon("alert-circle", 16) + "<span>AI Recommendation</span></div>" +
            '<div class="ai-insight-text">' + esc(this._insight) + "</div></div>"
          : "") +
        (recs.length
          ? '<div class="ai-recommendations"><div class="ai-recommendations-title">Suggested Actions</div>' +
            recs
              .map(
                (r) =>
                  '<div class="ai-recommendation"><div class="ai-recommendation-title">' + esc(r.title) + "</div>" +
                  '<div class="ai-recommendation-desc">' + esc(r.description) + "</div></div>"
              )
              .join("") +
            "</div>"
          : "") +
        (activity.length
          ? '<div class="ai-activity"><div class="ai-activity-title">Agent Activity</div>' +
            activity
              .map(
                (a) =>
                  '<div class="ai-activity-item"><div class="ai-activity-check">' + icon("check", 12) + "</div><div>" +
                  '<div class="ai-activity-text">' + esc(a.text) + "</div>" +
                  '<div class="ai-activity-time">' + esc(a.time) + "</div>" +
                  "</div></div>"
              )
              .join("") +
            "</div>"
          : "") +
        "</div>" +
        '<div class="ai-sidebar-footer"><div class="ai-input-wrapper">' +
        '<input type="text" class="ai-input" placeholder="Ask a question...">' +
        '<button class="ai-send-btn" data-action="send">' + icon("send", 18) + "</button>" +
        "</div></div>";

      this.querySelector('[data-action="close"]').addEventListener("click", () => this.close());
      this.querySelector('[data-action="send"]').addEventListener("click", () => this._demoSend());
      this.querySelector(".ai-input").addEventListener("keydown", (e) => { if (e.key === "Enter") this._demoSend(); });
    }

    _demoSend() {
      // Demo-only: this kit has no live AI backend wired up. Wire this to
      // a real endpoint in your POC if the client wants a working chat.
      const input = this.querySelector(".ai-input");
      if (!input.value.trim()) return;
      const list = this._activityLog || [];
      list.push({ text: 'Noted: "' + input.value.trim() + '"', time: "Just now" });
      this._activityLog = list;
      input.value = "";
      this.render();
    }

    open() { this.classList.add("open"); }
    close() { this.classList.remove("open"); }
    toggle() { this.classList.toggle("open"); }
  }

  /* ============================================================
     os-modal
     Attributes: modal-title, confirm-label, cancel-label, variant (default|error)
     Light-DOM children (captured at connect) become the modal body.
     Methods: open(), close()
     Events: os-modal-confirm, os-modal-cancel (fired on the element)
     ============================================================ */
  class OsModal extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;

      const title = this.getAttribute("modal-title") || "Confirm";
      const confirmLabel = this.getAttribute("confirm-label") || "Confirm";
      const cancelLabel = this.getAttribute("cancel-label") || "Cancel";
      const variant = this.getAttribute("variant") || "default";
      const bodyContent = this.innerHTML;

      this.classList.add("modal-overlay");
      this.innerHTML =
        '<div class="modal">' +
        '<div class="modal-header"><span class="modal-title">' + esc(title) + '</span>' +
        '<button class="modal-close" data-action="close">' + icon("x", 16) + "</button></div>" +
        '<div class="modal-body">' + bodyContent + "</div>" +
        '<div class="modal-footer">' +
        '<button class="btn btn-secondary" data-action="cancel">' + esc(cancelLabel) + "</button>" +
        '<button class="btn ' + (variant === "error" ? "btn-error" : "btn-primary") + '" data-action="confirm">' + esc(confirmLabel) + "</button>" +
        "</div></div>";

      this.querySelector('[data-action="close"]').addEventListener("click", () => this.close());
      this.querySelector('[data-action="cancel"]').addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("os-modal-cancel"));
        this.close();
      });
      this.querySelector('[data-action="confirm"]').addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("os-modal-confirm"));
        this.close();
      });
      this.addEventListener("click", (e) => { if (e.target === this) this.close(); });
    }
    open() { this.classList.add("active"); }
    close() { this.classList.remove("active"); }
  }

  /* ============================================================
     os-wizard-stepper
     Each direct child is one step's content:
       <div data-step-label="Category">...fields...</div>
     Attribute: submit-label (button label on the final step, default "Submit")
     Property: demoData (array of step objects, e.g. [{fieldId1: "value1", fieldId2: "value2"}, ...])
               If set, shows a "Demo Data" button on each step that auto-fills inputs for quick demos.
     Methods: next(), prev(), goTo(i)
     Events: os-wizard-change {index}, os-wizard-submit
     ============================================================ */
  class OsWizardStepper extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;
      this._steps = Array.from(this.children);
      this._current = 0;
      this._submitLabel = this.getAttribute("submit-label") || "Submit";
      this._demoData = null; // Optional: array of step data objects
      this._buildShell();
      this._renderStep();
    }

    _buildShell() {
      const stepsRow = document.createElement("div");
      stepsRow.className = "wizard-steps";
      this._stepsRow = stepsRow;

      const content = document.createElement("div");
      content.className = "wizard-content";
      this._steps.forEach((s) => content.appendChild(s));
      this._contentEl = content;

      const actions = document.createElement("div");
      actions.className = "wizard-actions";
      actions.innerHTML =
        '<button type="button" class="btn btn-secondary" data-action="prev">' + icon("chevron-left", 16) + "Previous</button>" +
        '<div style="display: flex; gap: 8px; margin-left: auto;">' +
        '<button type="button" class="btn btn-secondary" data-action="demo" style="display:none;">Demo Data</button>' +
        '<button type="button" class="btn btn-primary" data-action="next">Next Step' + icon("chevron-right", 16) + "</button>" +
        "</div>";
      this._actionsEl = actions;

      this.innerHTML = "";
      this.appendChild(stepsRow);
      this.appendChild(content);
      this.appendChild(actions);

      actions.querySelector('[data-action="prev"]').addEventListener("click", () => this.prev());
      actions.querySelector('[data-action="next"]').addEventListener("click", () => this._onNext());
      const demoBtn = actions.querySelector('[data-action="demo"]');
      if (demoBtn) demoBtn.addEventListener("click", () => this._loadDemoData());
    }

    _renderStep() {
      const total = this._steps.length;
      this._stepsRow.innerHTML = this._steps
        .map((s, i) => {
          const state = i < this._current ? "complete" : i === this._current ? "current" : "upcoming";
          const circle = state === "complete" ? icon("check", 16) : String(i + 1);
          return (
            '<div class="wizard-step ' + state + '">' +
            '<div class="wizard-step-circle">' + circle + "</div>" +
            '<div class="wizard-step-label">' + esc(s.getAttribute("data-step-label")) + "</div>" +
            "</div>"
          );
        })
        .join("");

      this._steps.forEach((s, i) => { s.style.display = i === this._current ? "block" : "none"; });

      const prevBtn = this._actionsEl.querySelector('[data-action="prev"]');
      const nextBtn = this._actionsEl.querySelector('[data-action="next"]');
      const demoBtn = this._actionsEl.querySelector('[data-action="demo"]');
      prevBtn.disabled = this._current === 0;
      const isLast = this._current === total - 1;
      nextBtn.innerHTML = isLast ? esc(this._submitLabel) + icon("check", 16) : "Next Step" + icon("chevron-right", 16);
      // Demo button is always visible if demoData is configured; disabled if no data for this step
      if (demoBtn) {
        demoBtn.disabled = !this._demoData || !this._demoData[this._current];
      }

      this.dispatchEvent(new CustomEvent("os-wizard-change", { detail: { index: this._current } }));
    }

    _onNext() {
      // Optional validation gate: set `wizardEl.beforeNext = (stepIndex) => boolean`
      // from the page. Return false to block advancing (e.g. required-field
      // validation) — the wizard stays on the current step.
      if (typeof this.beforeNext === "function" && this.beforeNext(this._current) === false) return;

      if (this._current === this._steps.length - 1) {
        this.dispatchEvent(new CustomEvent("os-wizard-submit"));
        return;
      }
      this.next();
    }

    next() { if (this._current < this._steps.length - 1) { this._current++; this._renderStep(); } }
    prev() { if (this._current > 0) { this._current--; this._renderStep(); } }
    goTo(i) { if (i >= 0 && i < this._steps.length) { this._current = i; this._renderStep(); } }
    get currentIndex() { return this._current; }

    _loadDemoData() {
      if (!this._demoData || !this._demoData[this._current]) {
        console.warn("No demo data for step", this._current);
        return;
      }
      const stepData = this._demoData[this._current];
      const currentStepEl = this._steps[this._current];
      console.log("Loading demo data for step", this._current, stepData);
      // Fill inputs: { "fieldId": "value" }
      // For checkboxes, value is boolean
      Object.keys(stepData).forEach((key) => {
        const el = currentStepEl.querySelector("#" + key);
        if (el) {
          if (el.type === "checkbox") {
            el.checked = stepData[key];
            console.log("  Set checkbox", key, "to", stepData[key]);
          } else {
            el.value = stepData[key];
            console.log("  Set field", key, "to", stepData[key]);
          }
        } else {
          console.warn("  Field not found:", key);
        }
      });
    }

    // Public API for loading demo data from outside the component
    loadDemo() {
      this._loadDemoData();
    }
  }

  /* ============================================================
     os-form-field
     Attributes: label, required, hint, error, success
     Wraps a single light-DOM input/select/textarea child.
     Re-render-safe: the control node is captured once and reused.
     ============================================================ */
  class OsFormField extends HTMLElement {
    connectedCallback() {
      if (!this._control) {
        this._control = this.querySelector("input, select, textarea");
      }
      this.render();
    }
    static get observedAttributes() { return ["label", "required", "hint", "error", "success"]; }
    attributeChangedCallback() { if (this._control) this.render(); }

    render() {
      const label = this.getAttribute("label");
      const required = this.hasAttribute("required");
      const hint = this.getAttribute("hint");
      const error = this.getAttribute("error");
      const success = this.getAttribute("success");
      const control = this._control;

      if (control) {
        control.classList.remove("error", "success");
        if (error) control.classList.add("error");
        else if (success) control.classList.add("success");
        if (!control.classList.contains("form-control")) control.classList.add("form-control");
      }

      this.classList.add("form-group");
      this.innerHTML =
        (label ? '<label class="form-label">' + esc(label) + (required ? '<span class="required">*</span>' : "") + "</label>" : "") +
        '<div class="os-form-field-control"></div>' +
        (error
          ? '<span class="form-error">' + icon("alert-circle", 12) + esc(error) + "</span>"
          : success
          ? '<span class="form-success">' + icon("check", 12) + esc(success) + "</span>"
          : hint
          ? '<span class="form-hint">' + esc(hint) + "</span>"
          : "");

      if (control) this.querySelector(".os-form-field-control").appendChild(control);
    }
  }

  /* ============================================================
     os-search-filter-bar
     Attributes: placeholder
     Any light-DOM children (e.g. a <select>) render alongside the search box.
     Event: os-search {value} fired on input.
     ============================================================ */
  class OsSearchFilterBar extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;
      const placeholder = this.getAttribute("placeholder") || "Search...";
      const extraContent = this.innerHTML;

      this.classList.add("filter-bar");
      this.innerHTML =
        '<div class="search-input"><span class="search-icon">' + icon("search", 18) + "</span>" +
        '<input type="text" class="form-control" placeholder="' + esc(placeholder) + '"></div>' +
        (extraContent ? '<div class="filter-bar-extra">' + extraContent + "</div>" : "");

      this.querySelector("input").addEventListener("input", (e) => {
        this.dispatchEvent(new CustomEvent("os-search", { detail: { value: e.target.value }, bubbles: true }));
      });
    }
  }

  /* ============================================================
     os-empty-state
     Attributes: icon, heading, text, action-label, action-href
     ============================================================ */
  class OsEmptyState extends HTMLElement {
    connectedCallback() {
      if (this._rendered) return;
      this._rendered = true;
      const iconName = this.getAttribute("icon") || "inbox";
      const heading = this.getAttribute("heading") || "Nothing here yet";
      const text = this.getAttribute("text") || "";
      const actionLabel = this.getAttribute("action-label");
      const actionHref = this.getAttribute("action-href") || "#";

      this.classList.add("empty-state");
      this.innerHTML =
        '<div class="empty-state-icon">' + icon(iconName, 36) + "</div>" +
        '<div class="empty-state-title">' + esc(heading) + "</div>" +
        (text ? '<div class="empty-state-text">' + esc(text) + "</div>" : "") +
        (actionLabel ? '<a href="' + esc(actionHref) + '" class="btn btn-primary">' + esc(actionLabel) + "</a>" : "");
    }
  }

  /* ============================================================
     os-chart-donut
     Property: data [{label, value, color}]
     Attributes: center-label, center-sub, size (default 160)

     Renders via Highcharts (components/highcharts.js, vendored locally —
     see HIGHCHARTS_LICENSE.txt) as a pie chart with an innerSize hole,
     not hand-rolled SVG. Requires <script src=".../highcharts.js"> to be
     loaded BEFORE os-components.js — same script-placement rule as
     everything else in this file, see CLAUDE.md "Script Placement".
     Public API (attrs/props) and the surrounding tokens.css classes
     (.chart-donut-wrapper, .chart-donut-legend, etc.) are unchanged from
     the previous SVG implementation, so existing usage doesn't change.

     Licensing: this vendors Highcharts' library file directly. Confirm
     your organization's actual Highcharts license (commercial vs. the
     non-commercial EULA — see HIGHCHARTS_LICENSE.txt) covers this use
     before shipping a client-facing build; don't assume it's covered.
     credits are left ON by default for the same reason. Set the
     `hide-credits` attribute to opt a specific chart instance out once
     you've actually confirmed your license permits it — this is a
     per-build decision, not something to flip for every consumer of
     this shared component by changing the default.

     Hiding credits across every chart in one POC: set
     `data-hide-chart-credits="true"` once on <body> instead of adding
     `hide-credits` to every os-chart-donut/os-chart-bar tag — both
     components check for it as a fallback. Still opt-in per build,
     still requires a confirmed license; this only removes the need to
     repeat the attribute on every chart instance.
     ============================================================ */
  let chartDonutInstanceCounter = 0;

  class OsChartDonut extends HTMLElement {
    connectedCallback() { if (!this._data) this._data = []; this.render(); }
    set data(val) { this._data = val || []; this.render(); }
    get data() { return this._data || []; }

    render() {
      const data = this._data || [];
      const size = parseInt(this.getAttribute("size") || "160", 10);
      const centerLabel = this.getAttribute("center-label") || "";
      const centerSub = this.getAttribute("center-sub") || "";
      const containerId = "os-chart-donut-" + (chartDonutInstanceCounter += 1);

      this.innerHTML =
        '<div class="chart-donut-wrapper">' +
        '<div style="position:relative;width:' + size + "px;height:" + size + 'px;">' +
        '<div id="' + containerId + '" style="width:' + size + "px;height:" + size + 'px;"></div>' +
        (centerLabel
          ? '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;">' +
            '<span class="chart-donut-center-label">' + esc(centerLabel) + "</span>" +
            (centerSub ? '<span class="chart-donut-center-sub">' + esc(centerSub) + "</span>" : "") +
            "</div>"
          : "") +
        "</div>" +
        '<div class="chart-donut-legend">' +
        data
          .map(
            (d) =>
              '<div class="chart-donut-legend-item"><span class="chart-donut-legend-dot" style="background:' + esc(d.color) + '"></span>' +
              esc(d.label) + " &middot; " + esc(d.value) +
              "</div>"
          )
          .join("") +
        "</div>" +
        "</div>";

      if (!window.Highcharts) {
        document.getElementById(containerId).innerHTML =
          '<div class="text-error" style="font-size:var(--font-size-xs);padding:var(--space-s);">' +
          "Highcharts not loaded — add &lt;script src=\".../components/highcharts.js\"&gt; before os-components.js.</div>";
        return;
      }

      window.Highcharts.chart(containerId, {
        // animation: false is deliberate, not an aesthetic choice — Highcharts'
        // default ~1s entrance animation means any screenshot-based check
        // (verify-poc.js, or just a screenshot taken shortly after load)
        // captures the pie mid-draw and looks broken (a tiny sliver, not a
        // full ring). Disabling it makes the chart render at final size
        // immediately, which this kit's whole screenshot-based regression
        // testing depends on.
        chart: { type: "pie", width: size, height: size, backgroundColor: "transparent", margin: [0, 0, 0, 0], spacing: [0, 0, 0, 0], animation: false },
        title: { text: null },
        credits: { enabled: !(this.hasAttribute("hide-credits") || document.body.hasAttribute("data-hide-chart-credits")) },
        legend: { enabled: false },
        tooltip: { pointFormat: "{point.name}: <b>{point.y}</b>" },
        plotOptions: {
          series: { animation: false },
          pie: {
            innerSize: "70%",
            borderWidth: 2,
            borderColor: getComputedStyle(document.body).getPropertyValue("--color-neutral-0") || "#fff",
            dataLabels: { enabled: false }
          }
        },
        series: [
          {
            name: this.getAttribute("series-name") || "Value",
            data: data.map((d) => ({ name: d.label, y: d.value, color: d.color }))
          }
        ]
      });
    }
  }

  /* ============================================================
     os-chart-bar
     Property: data [{label, value, color}]
     Attributes: height (default 220), horizontal ("true" for a
     horizontal bar chart, default is a vertical column chart),
     series-name, x-axis-label, y-axis-label, hide-credits (see the
     licensing note on os-chart-donut above — same rule applies here,
     including the data-hide-chart-credits body-level fallback)

     Renders via Highcharts, same as os-chart-donut — see the rule in
     CLAUDE.md "Charting: Highcharts, Not Hand-Rolled". For comparing a
     value across categories (workload per rep, volume per region), not
     for a whole-broken-into-parts breakdown — use os-chart-donut for
     that. See CLAUDE.md "Rule: Dashboards Need a Chart, Not Just KPIs"
     for when to reach for which.
     ============================================================ */
  let chartBarInstanceCounter = 0;

  class OsChartBar extends HTMLElement {
    connectedCallback() { if (!this._data) this._data = []; this.render(); }
    set data(val) { this._data = val || []; this.render(); }
    get data() { return this._data || []; }

    render() {
      const data = this._data || [];
      const height = parseInt(this.getAttribute("height") || "220", 10);
      const horizontal = this.getAttribute("horizontal") === "true";
      const containerId = "os-chart-bar-" + (chartBarInstanceCounter += 1);

      this.innerHTML = '<div id="' + containerId + '" style="width:100%;height:' + height + 'px;"></div>';

      if (!window.Highcharts) {
        document.getElementById(containerId).innerHTML =
          '<div class="text-error" style="font-size:var(--font-size-xs);padding:var(--space-s);">' +
          "Highcharts not loaded — add &lt;script src=\".../components/highcharts.js\"&gt; before os-components.js.</div>";
        return;
      }

      window.Highcharts.chart(containerId, {
        chart: { type: horizontal ? "bar" : "column", height: height, backgroundColor: "transparent", animation: false },
        title: { text: null },
        credits: { enabled: !(this.hasAttribute("hide-credits") || document.body.hasAttribute("data-hide-chart-credits")) },
        legend: { enabled: false },
        xAxis: {
          categories: data.map((d) => d.label),
          title: { text: this.getAttribute("x-axis-label") || null },
          labels: { style: { fontSize: "12px" } },
          lineColor: getComputedStyle(document.body).getPropertyValue("--color-neutral-4") || "#dee2e6"
        },
        yAxis: {
          title: { text: this.getAttribute("y-axis-label") || null },
          gridLineColor: getComputedStyle(document.body).getPropertyValue("--color-neutral-3") || "#e9ecef"
        },
        tooltip: { pointFormat: "<b>{point.y}</b>" },
        plotOptions: {
          series: { animation: false, borderRadius: 3 },
          column: { pointPadding: 0.1, groupPadding: 0.1 },
          bar: { pointPadding: 0.1, groupPadding: 0.1 }
        },
        series: [
          {
            name: this.getAttribute("series-name") || "Value",
            data: data.map((d) => ({ y: d.value, color: d.color })),
            colorByPoint: !data.some((d) => d.color)
          }
        ]
      });
    }
  }

  /* ============================================================
     os-floorplan-viewer
     A floor plan image with room bounding boxes and sprinkler-head
     pins overlaid, plus a synced room list. Built for any workflow
     where an AI proposes spatial placements on an image and a human
     reviews/approves them room by room (not fire-sprinkler-specific).

     Property: rooms [{id, label, status, x, y, w, h, sprinklers}]
       x/y/w/h: room bounding box as PERCENTAGES of image width/height
         (0-100) — resolution-independent, so any floor plan image
         size works without recalculating pixel coordinates.
       sprinklers: [{x, y}] pin coordinates, also percentages.
       status: 'pending' (not yet reviewed, default) | 'current'
         (active room being reviewed) | 'approved' | 'flagged'
         (AI/human conflict or needs manual placement)
     Attribute: image (src path to the floor plan image)
     Method: selectRoom(id)
     Event: os-room-select {roomId, room} (bubbles)
     ============================================================ */
  const FLOORPLAN_STATUS = {
    pending: { variant: "neutral", label: "Pending Review" },
    current: { variant: "info", label: "In Review" },
    approved: { variant: "success", label: "Approved" },
    flagged: { variant: "error", label: "Flagged" }
  };

  class OsFloorplanViewer extends HTMLElement {
    connectedCallback() { if (!this._rooms) this._rooms = []; this.render(); }
    set rooms(val) {
      this._rooms = val || [];
      if (!this._activeRoomId && this._rooms.length) this._activeRoomId = this._rooms[0].id;
      this.render();
    }
    get rooms() { return this._rooms || []; }

    render() {
      const rooms = this._rooms || [];
      const image = this.getAttribute("image") || "";
      const activeId = this._activeRoomId;

      const boxes = rooms
        .filter((r) => r.x != null)
        .map(
          (r) =>
            '<div class="floorplan-room-box' + (r.id === activeId ? " active" : "") + '" data-room="' + esc(r.id) +
            '" style="left:' + r.x + "%;top:" + r.y + "%;width:" + r.w + "%;height:" + r.h + '%"></div>'
        )
        .join("");

      const pins = rooms
        .flatMap((r) =>
          (r.sprinklers || []).map(
            (p, i) =>
              '<button type="button" class="floorplan-pin pin-' + esc(r.status || "pending") + (r.id === activeId ? " active" : "") +
              '" style="left:' + p.x + "%;top:" + p.y + '%" data-room="' + esc(r.id) + '" title="' +
              esc(r.label) + " — sprinkler " + (i + 1) + '">' + icon("sprinkler-head", 14) + "</button>"
          )
        )
        .join("");

      const legend =
        '<div class="floorplan-legend">' +
        Object.keys(FLOORPLAN_STATUS)
          .map((k) => '<span class="floorplan-legend-item"><span class="floorplan-legend-dot pin-' + k + '"></span>' + esc(FLOORPLAN_STATUS[k].label) + "</span>")
          .join("") +
        "</div>";

      const listItems = rooms
        .map((r) => {
          const meta = FLOORPLAN_STATUS[r.status] || FLOORPLAN_STATUS.pending;
          return (
            '<button type="button" class="floorplan-room-item' + (r.id === activeId ? " active" : "") + '" data-room="' + esc(r.id) + '">' +
            '<span class="floorplan-room-name">' + esc(r.label) + "</span>" +
            '<span class="badge badge-' + meta.variant + '">' + esc(meta.label) + "</span>" +
            "</button>"
          );
        })
        .join("");

      this.innerHTML =
        '<div class="floorplan-viewer">' +
        '<div class="floorplan-stage">' +
        (image ? '<img class="floorplan-image" src="' + esc(image) + '" alt="Floor plan">' : '<div class="floorplan-empty">No floor plan uploaded</div>') +
        '<div class="floorplan-overlay">' + boxes + pins + "</div>" +
        "</div>" +
        legend +
        '<div class="floorplan-room-list"><div class="floorplan-room-list-title">Rooms</div>' + listItems + "</div>" +
        "</div>";

      this.querySelectorAll("[data-room]").forEach((el) => {
        el.addEventListener("click", () => this.selectRoom(el.getAttribute("data-room")));
      });
    }

    selectRoom(id) {
      this._activeRoomId = id;
      this.render();
      const room = (this._rooms || []).find((r) => r.id === id);
      this.dispatchEvent(new CustomEvent("os-room-select", { detail: { roomId: id, room }, bubbles: true }));
    }
  }

  /* ---------------------------------------------------------- */
  customElements.define("os-sidebar-nav", OsSidebarNav);
  customElements.define("os-kpi-card", OsKpiCard);
  customElements.define("os-status-badge", OsStatusBadge);
  customElements.define("os-card", OsCard);
  customElements.define("os-data-table", OsDataTable);
  customElements.define("os-tabs", OsTabs);
  customElements.define("os-status-timeline", OsStatusTimeline);
  customElements.define("os-ai-sidebar", OsAiSidebar);
  customElements.define("os-modal", OsModal);
  customElements.define("os-wizard-stepper", OsWizardStepper);
  customElements.define("os-form-field", OsFormField);
  customElements.define("os-search-filter-bar", OsSearchFilterBar);
  customElements.define("os-empty-state", OsEmptyState);
  customElements.define("os-chart-donut", OsChartDonut);
  customElements.define("os-chart-bar", OsChartBar);
  customElements.define("os-floorplan-viewer", OsFloorplanViewer);

  // Expose the icon helper so page-level scripts can reuse the same set
  // (e.g. for a header button icon) without duplicating SVG markup.
  window.osIcon = icon;
})();
