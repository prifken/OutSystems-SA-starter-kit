/* wsfp-proposal-wizard — self-contained port of
 * pocs/wsfp-fire-sprinkler-designer/new-proposal.html's entire 3-step
 * wizard (Floor Plan & AHJ / Project Details / Review), including the
 * dropzone, the AHJ lookup control, and the review summary. Tier:
 * Domain-shaped (bakes in WSFP's specific fields) — unlike
 * os-wizard-stepper.js (Universal, content-agnostic via slots), this
 * component owns ALL of its content directly in Shadow DOM.
 *
 * Why this exists as a second, more opinionated component instead of
 * just using os-wizard-stepper + slotted native OutSystems widgets: the
 * slotted approach depends on the OutSystems widget tree to supply
 * every field's exact markup/CSS, and in practice that reproduction
 * drifted from the prototype (wrong control types, missing dropzone,
 * default placeholder text bleeding through) because OutSystems' own
 * native widgets don't render with this kit's classes. Baking the exact
 * markup + the exact CSS rules (copied verbatim from tokens.css, not
 * re-derived) directly into this component's Shadow DOM makes the
 * ODC-side wiring trivial — one Script asset + one AdvancedHtml widget,
 * nothing nested — and guarantees the render matches the prototype
 * pixel-for-pixel regardless of the host app's own theme, since every
 * design token this component needs is redeclared on :host rather than
 * inherited from the page.
 *
 * Attributes: none required — this component is self-contained. An
 * optional `initial-step` attribute (0/1/2) sets the starting step,
 * default 0.
 *
 * Events:
 *   wsfp-wizard-submit (bubbles, composed) — fired when "Start AI
 *     Processing" is clicked on the Review step. detail: { address,
 *     ahj, sprinklerType, ceilingType, exposedBeams, notes, fileName }
 *     — the full collected form state, for a screen-level action to
 *     persist or act on.
 *   wsfp-wizard-processing-complete (bubbles, composed) — fired after
 *     the self-contained processing-overlay animation finishes (same
 *     4-step/700ms cycle as the HTML prototype). No detail. A screen
 *     wires this to navigate once a real next screen exists — this
 *     component does NOT hardcode a redirect, unlike the prototype's
 *     own demo-stub `window.location.href`.
 *
 * ODC porting note: because this component takes no structured JSON
 * attribute, none of the usual JSON-on-Extended-Property gotchas apply
 * — just a Script asset (Public=false) + RequiredScripts + a single
 * AdvancedHtml widget with Tag="wsfp-proposal-wizard". See
 * ../README.md.
 */
class WsfpProposalWizard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      step: 0,
      address: '',
      ahj: '',
      ahjReadonly: true,
      ahjResult: null, // { title, text } once looked up
      fileName: '',
      sprinklerType: '',
      ceilingType: '',
      exposedBeams: 'No',
      notes: '',
      addressError: ''
    };
  }

  connectedCallback() {
    const initial = parseInt(this.getAttribute('initial-step') || '0', 10);
    if (initial >= 0 && initial <= 2) this.state.step = initial;
    this.render();
  }

  simulateUpload() {
    this.state.fileName = 'floorplan-' + (this.state.address ? this.state.address.split(',')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') : '214-meadowlark-dr') + '.pdf';
    this.render();
  }

  lookupAhj() {
    this.state.ahjReadonly = false;
    if (!this.state.address.trim()) {
      this.state.ahj = '';
      this.state.ahjResult = { title: 'AHJ Database match found', text: 'No site address entered yet — enter the AHJ manually below, or add an address and look up again.' };
    } else {
      this.state.ahj = 'Roseville Fire Dept.';
      this.state.ahjResult = { title: 'AHJ Database match found', text: 'Matched via AHJ Database: NFPA 13D residential sprinkler ordinance, City of Roseville Amendment 4.2 (min. 0.05 gpm/sq ft design density).' };
    }
    this.render();
  }

  goToStep(step) {
    if (step === 1 && this.state.step === 0) {
      if (!this.state.address.trim()) {
        this.state.addressError = 'Please enter a site address.';
        this.render();
        return;
      }
      this.state.addressError = '';
    }
    this.state.step = step;
    this.render();
  }

  submit() {
    const detail = {
      address: this.state.address,
      ahj: this.state.ahj,
      sprinklerType: this.state.sprinklerType,
      ceilingType: this.state.ceilingType,
      exposedBeams: this.state.exposedBeams,
      notes: this.state.notes,
      fileName: this.state.fileName
    };
    this.dispatchEvent(new CustomEvent('wsfp-wizard-submit', { detail, bubbles: true, composed: true }));
    this.showProcessingOverlay();
  }

  showProcessingOverlay() {
    const steps = [
      'Cleaning floor plan…',
      'Extracting room geometry…',
      'Determining fire code per room (APiChat + Python decision tree)…',
      'Calculating sprinkler placement…'
    ];
    const overlay = document.createElement('div');
    overlay.setAttribute('style', 'position:fixed;inset:0;background:rgba(16,18,19,0.9);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;');
    overlay.innerHTML = `
      <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#cc2643;border-radius:50%;animation:wsfp-spin 0.8s linear infinite;"></div>
      <div style="font-size:20px;font-weight:600;">AI Fire Sprinkler Designer is processing your floor plan</div>
      <div style="font-size:14px;color:#ced4da;">${steps[0]}</div>
      <style>@keyframes wsfp-spin { to { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(overlay);
    const stepEl = overlay.querySelector('div:nth-child(3)');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < steps.length) { stepEl.textContent = steps[i]; return; }
      clearInterval(interval);
      overlay.remove();
      this.dispatchEvent(new CustomEvent('wsfp-wizard-processing-complete', { bubbles: true, composed: true }));
    }, 700);
  }

  render() {
    const s = this.state;
    const stepLabels = ['Floor Plan & AHJ', 'Project Details', 'Review'];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --color-primary: #cc2643;
          --color-primary-hover: #a81e37;
          --color-primary-light: rgba(204, 38, 67, 0.1);
          --color-success: #29823b; --color-success-light: #eaf3eb;
          --color-error: #dc2020; --color-error-light: #fceaea;
          --color-info: #0077b6; --color-info-light: #e3f2fd;
          --color-neutral-0: #ffffff; --color-neutral-1: #f8f9fa; --color-neutral-2: #f1f3f5;
          --color-neutral-3: #e9ecef; --color-neutral-4: #dee2e6; --color-neutral-5: #ced4da;
          --color-neutral-6: #adb5bd; --color-neutral-7: #6a7178; --color-neutral-8: #4f575e; --color-neutral-9: #272b30;
          --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          --font-size-base: 16px; --font-size-s: 14px; --font-size-xs: 12px;
          --space-xs: 4px; --space-s: 8px; --space-base: 16px; --space-m: 24px;
          --border-radius-soft: 4px;
          font-family: var(--font-family);
          color: var(--color-neutral-9);
        }
        * { box-sizing: border-box; }
        h3 { font-size: 20px; font-weight: 600; margin: 0 0 var(--space-base) 0; }
        .mb-base { margin-bottom: var(--space-base); }
        .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-base); }
        .form-group { display: flex; flex-direction: column; margin-bottom: var(--space-base); }
        .form-group:last-child { margin-bottom: 0; }
        .form-label { display: block; font-size: var(--font-size-s); font-weight: 500; color: var(--color-neutral-8); margin-bottom: var(--space-xs); }
        .form-label .required { color: var(--color-error); margin-left: 2px; }
        .form-value { font-size: var(--font-size-s); color: var(--color-neutral-9); }
        .form-value.emphasis { font-weight: 600; font-size: var(--font-size-base); }
        .form-hint { font-size: var(--font-size-xs); color: var(--color-neutral-6); margin-top: var(--space-xs); }
        .form-error { font-size: var(--font-size-xs); color: var(--color-error); margin-top: var(--space-xs); }
        .form-control {
          width: 100%; height: 40px; padding: 0 var(--space-base);
          border: 1px solid var(--color-neutral-5); border-radius: var(--border-radius-soft);
          font-size: var(--font-size-s); font-family: var(--font-family);
          color: var(--color-neutral-9); background: var(--color-neutral-0);
          transition: all 0.15s;
        }
        .form-control::placeholder { color: var(--color-neutral-6); }
        .form-control:hover { border-color: var(--color-neutral-6); }
        .form-control:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
        .form-control[readonly] { background: var(--color-neutral-1); color: var(--color-neutral-6); cursor: not-allowed; }
        .form-control.error { border-color: var(--color-error); }
        textarea.form-control { height: auto; min-height: 100px; padding: var(--space-s) var(--space-base); resize: vertical; }
        select.form-control {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236a7178' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; cursor: pointer;
        }
        .flex { display: flex; }
        .gap-s { gap: var(--space-s); }
        .file-upload { border: 2px dashed var(--color-neutral-4); border-radius: var(--border-radius-soft); padding: var(--space-m); text-align: center; cursor: pointer; transition: all 0.15s; }
        .file-upload:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
        .file-upload-icon { width: 48px; height: 48px; margin: 0 auto var(--space-s); background: var(--color-neutral-2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--color-neutral-6); }
        .file-upload-text { font-size: var(--font-size-s); color: var(--color-neutral-7); }
        .file-upload-text strong { color: var(--color-primary); }
        .file-upload-hint { font-size: var(--font-size-xs); color: var(--color-neutral-6); margin-top: var(--space-xs); }
        .uploaded-hint { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--color-neutral-6); margin-top: var(--space-xs); }
        .alert { border-radius: var(--border-radius-soft); padding: var(--space-base); display: flex; align-items: flex-start; gap: var(--space-base); border: 1px solid; margin-top: var(--space-base); }
        .alert-info { background: var(--color-info-light); border-color: var(--color-info); }
        .alert-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; background: var(--color-info); }
        .alert-content { flex: 1; }
        .alert-title { font-weight: 600; margin-bottom: 2px; }
        .alert-text { font-size: var(--font-size-s); color: var(--color-neutral-8); }
        .rail { display: flex; align-items: center; margin-bottom: var(--space-m); }
        .step-rail-item { display: flex; align-items: center; gap: 10px; }
        .circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; background: var(--color-neutral-4); color: var(--color-neutral-7); }
        .step-rail-item.complete .circle { background: var(--color-success); color: #fff; }
        .step-rail-item.active .circle { background: var(--color-primary); color: #fff; }
        .rail-label { font-size: 13px; color: var(--color-neutral-7); white-space: nowrap; }
        .step-rail-item.active .rail-label, .step-rail-item.complete .rail-label { color: var(--color-neutral-9); font-weight: 500; }
        .line { flex: 1; height: 2px; background: var(--color-neutral-4); margin: 0 12px; min-width: 24px; }
        .line.complete { background: var(--color-success); }
        .actions { display: flex; justify-content: space-between; margin-top: var(--space-m); padding-top: var(--space-m); border-top: 1px solid var(--color-neutral-3); }
        button.nav-btn {
          font-family: inherit; font-size: var(--font-size-s); font-weight: 600;
          height: 40px; padding: 0 var(--space-base); border-radius: var(--border-radius-soft);
          cursor: pointer; border: 1px solid transparent;
        }
        button.nav-btn:disabled { opacity: .5; cursor: not-allowed; }
        .btn-prev { background: var(--color-neutral-0); border-color: var(--color-neutral-5); color: var(--color-neutral-8); }
        .btn-next { background: var(--color-primary); color: #fff; }
        .btn-lookup { background: var(--color-neutral-0); border: 1px solid var(--color-neutral-5); color: var(--color-neutral-8); border-radius: var(--border-radius-soft); padding: 0 var(--space-base); height: 40px; font-size: var(--font-size-s); font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit; }
        .btn-lookup:hover { background: var(--color-neutral-1); }
        .file-upload-icon svg, .alert-icon svg { width: 24px; height: 24px; }
        .nav-btn svg { width: 16px; height: 16px; }
      </style>

      <div class="rail">
        ${stepLabels.map((label, i) => {
          const state = i < s.step ? 'complete' : i === s.step ? 'active' : '';
          const circleContent = i < s.step ? '&#10003;' : String(i + 1);
          return `<div class="step-rail-item ${state}"><div class="circle">${circleContent}</div><div class="rail-label">${label}</div></div>${i < stepLabels.length - 1 ? `<div class="line ${i < s.step ? 'complete' : ''}"></div>` : ''}`;
        }).join('')}
      </div>

      ${s.step === 0 ? `
        <h3>Upload the floor plan</h3>
        <div class="form-group mb-base">
          <span class="form-label">Floor Plan File</span>
          <div class="file-upload" id="dropzone">
            <div class="file-upload-icon">${this.icon('upload')}</div>
            <div class="file-upload-text"><strong>Click to upload</strong> or drag and drop</div>
            <div class="file-upload-hint">PDF (Phase 1) &middot; CAD/DWG support arrives in Phase 2 &middot; up to 25MB</div>
          </div>
          ${s.fileName ? `<p class="uploaded-hint">${this.icon('file-text', 14)} ${s.fileName} &middot; 2.1 MB</p>` : ''}
        </div>

        <h3>Site &amp; AHJ</h3>
        <div class="form-row">
          <div class="form-group">
            <span class="form-label">Site Address<span class="required">*</span></span>
            <input type="text" id="addressInput" class="form-control ${s.addressError ? 'error' : ''}" placeholder="e.g. 214 Meadowlark Dr, Roseville, CA" value="${this.esc(s.address)}">
            ${s.addressError ? `<span class="form-error">${s.addressError}</span>` : ''}
          </div>
          <div class="form-group">
            <span class="form-label">Authority Having Jurisdiction</span>
            <div class="flex gap-s">
              <input type="text" id="ahjInput" class="form-control" placeholder="Look up or enter manually" value="${this.esc(s.ahj)}" ${s.ahjReadonly ? 'readonly' : ''}>
              <button type="button" class="btn-lookup" id="lookupBtn">Look Up AHJ</button>
            </div>
            <span class="form-hint">Auto-detected from the AHJ Database when available.</span>
          </div>
        </div>
        ${s.ahjResult ? `
          <div class="alert alert-info">
            <div class="alert-icon">${this.icon('check', 20)}</div>
            <div class="alert-content">
              <div class="alert-title">${s.ahjResult.title}</div>
              <div class="alert-text">${s.ahjResult.text}</div>
            </div>
          </div>
        ` : ''}
      ` : ''}

      ${s.step === 1 ? `
        <h3>Additional project information</h3>
        <p class="form-hint mb-base">Per FDD requirement #2 — sprinkler type, ceiling details, and exposed beams feed the AI's placement logic directly.</p>
        <div class="form-row">
          <div class="form-group">
            <span class="form-label">Sprinkler Type<span class="required">*</span></span>
            <select id="sprinklerTypeSelect" class="form-control">
              <option value="" ${!s.sprinklerType ? 'selected' : ''}>Select a type...</option>
              <option value="Pendant" ${s.sprinklerType === 'Pendant' ? 'selected' : ''}>Pendant</option>
              <option value="Concealed" ${s.sprinklerType === 'Concealed' ? 'selected' : ''}>Concealed</option>
              <option value="Sidewall" ${s.sprinklerType === 'Sidewall' ? 'selected' : ''}>Sidewall</option>
            </select>
          </div>
          <div class="form-group">
            <span class="form-label">Predominant Ceiling Type<span class="required">*</span></span>
            <select id="ceilingTypeSelect" class="form-control">
              <option value="" ${!s.ceilingType ? 'selected' : ''}>Select a type...</option>
              <option value="Flat" ${s.ceilingType === 'Flat' ? 'selected' : ''}>Flat</option>
              <option value="Vaulted" ${s.ceilingType === 'Vaulted' ? 'selected' : ''}>Vaulted</option>
              <option value="Sloped" ${s.ceilingType === 'Sloped' ? 'selected' : ''}>Sloped</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <span class="form-label">Exposed Beams</span>
            <select id="beamsSelect" class="form-control">
              <option value="No" ${s.exposedBeams === 'No' ? 'selected' : ''}>No</option>
              <option value="Yes" ${s.exposedBeams === 'Yes' ? 'selected' : ''}>Yes &mdash; living room, per plan</option>
            </select>
          </div>
          <div class="form-group">
            <span class="form-label">Notes for the designer</span>
            <textarea id="notesInput" class="form-control" placeholder="e.g. Client requested concealed heads throughout">${this.esc(s.notes)}</textarea>
            <span class="form-hint">Optional &mdash; obstructions, unusual layout, client requests, etc.</span>
          </div>
        </div>
      ` : ''}

      ${s.step === 2 ? `
        <h3>Review before starting AI processing</h3>
        <div class="form-row">
          <div class="form-group">
            <span class="form-label">Site Address</span>
            <span class="form-value emphasis">${s.address || '&mdash;'}</span>
          </div>
          <div class="form-group">
            <span class="form-label">AHJ</span>
            <span class="form-value emphasis">${s.ahj || '&mdash;'}</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <span class="form-label">Sprinkler Type</span>
            <span class="form-value">${s.sprinklerType || '&mdash;'}</span>
          </div>
          <div class="form-group">
            <span class="form-label">Ceiling Type</span>
            <span class="form-value">${s.ceilingType || '&mdash;'}</span>
          </div>
        </div>
        <div class="alert alert-info">
          <div class="alert-icon">${this.icon('sparkles', 20)}</div>
          <div class="alert-content">
            <div class="alert-title">What happens next</div>
            <div class="alert-text">The AI model will clean the floor plan, extract room geometry, and determine applicable NFPA/AHJ code per room. You'll review and approve the proposed sprinkler placement room by room.</div>
          </div>
        </div>
      ` : ''}

      <div class="actions">
        <button class="nav-btn btn-prev" id="prevBtn" style="display:inline-flex;align-items:center;gap:8px;" ${s.step === 0 ? 'disabled' : ''}>${this.icon('chevron-left', 16)}Previous</button>
        <button class="nav-btn btn-next" id="nextBtn" style="display:inline-flex;align-items:center;gap:8px;">${s.step === 2 ? 'Start AI Processing' : `Next Step${this.icon('chevron-right', 16)}`}</button>
      </div>
    `;

    this.shadowRoot.getElementById('prevBtn').addEventListener('click', () => this.goToStep(s.step - 1));
    this.shadowRoot.getElementById('nextBtn').addEventListener('click', () => {
      if (s.step === 2) { this.submit(); return; }
      this.goToStep(s.step + 1);
    });

    if (s.step === 0) {
      this.shadowRoot.getElementById('dropzone').addEventListener('click', () => this.simulateUpload());
      this.shadowRoot.getElementById('addressInput').addEventListener('input', (e) => { s.address = e.target.value; });
      this.shadowRoot.getElementById('ahjInput').addEventListener('input', (e) => { s.ahj = e.target.value; });
      this.shadowRoot.getElementById('lookupBtn').addEventListener('click', () => this.lookupAhj());
    }
    if (s.step === 1) {
      this.shadowRoot.getElementById('sprinklerTypeSelect').addEventListener('change', (e) => { s.sprinklerType = e.target.value; });
      this.shadowRoot.getElementById('ceilingTypeSelect').addEventListener('change', (e) => { s.ceilingType = e.target.value; });
      this.shadowRoot.getElementById('beamsSelect').addEventListener('change', (e) => { s.exposedBeams = e.target.value; });
      this.shadowRoot.getElementById('notesInput').addEventListener('input', (e) => { s.notes = e.target.value; });
    }
  }

  esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  icon(name, size) {
    const s = size || 24;
    const bodies = {
      upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
      check: '<polyline points="20 6 9 17 4 12"></polyline>',
      sparkles: '<path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"></path><path d="M16 12v2a4 4 0 0 1-8 0v-2"></path><circle cx="12" cy="20" r="2"></circle><line x1="12" y1="18" x2="12" y2="16"></line>',
      'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
      'chevron-left': '<polyline points="15 18 9 12 15 6"></polyline>',
      'chevron-right': '<polyline points="9 18 15 12 9 6"></polyline>'
    };
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${bodies[name] || ''}</svg>`;
  }
}

if (!customElements.get('wsfp-proposal-wizard')) {
  customElements.define('wsfp-proposal-wizard', WsfpProposalWizard);
}
