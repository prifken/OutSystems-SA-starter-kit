/* os-wizard-stepper (ODC port) — multi-step form wizard: a step rail
 * (numbered circles + labels, Past/Active/Next states) plus
 * Previous/Next/Submit buttons.
 *
 * This is the SAME component conceptually as
 * components/os-components.js's <os-wizard-stepper> (Light DOM, used by
 * every HTML prototype in this kit) — rebuilt in Shadow DOM specifically
 * because that's what the proven ODC-porting recipe requires (see
 * ../README.md). The kit's own CLAUDE.md explains why the HTML-prototype
 * version deliberately uses Light DOM (so a page's <style> override
 * cascades into every component for one-file rebrands) — that reasoning
 * doesn't carry over here, since an ODC screen re-themes via the
 * platform's own Theme/CSS variable system, not by overriding a
 * prototype page's inline <style>. Shadow DOM + CSS custom properties
 * (var(--os-wizard-*, fallback)) is the correct choice for THIS context,
 * not a reversal of the kit's stated Light DOM principle — it's a
 * different rendering target with different constraints.
 *
 * Behavioral parity with the Light-DOM original: same step-rail visual
 * language, same Previous/Next/Submit-label behavior. One deliberate
 * difference — no `beforeNext` validation hook. The original's hook
 * assumes direct DOM access to sibling input elements (fine in a
 * hand-authored HTML file); an ODC screen's validation lives in the
 * platform's own screen actions, not in a JS callback threaded through a
 * custom element. Add validation at the screen level (an OutSystems
 * "On Click" action that inspects Extended Property values before
 * calling this component's `.next()`) — don't bake app-specific
 * validation rules into this shared component.
 *
 * Attributes:
 *   steps        - JSON array, e.g. [{"id":"details","label":"Details"}].
 *                  First step is active by default.
 *   active       - optional initial active step id (defaults to steps[0].id)
 *   submit-label - label for the final step's advance button (default "Submit")
 *
 * Slots: one named slot per step, `slot="step-<id>"` on the light-DOM
 * child holding that step's content — same mechanism as this port's
 * sibling `<os-tabs>` ODC port would use for `slot="panel-<id>"` (see
 * the proven `sa-tabs` pattern in builder-toolkit this recipe is drawn
 * from). The component never owns step content; any native OutSystems
 * widget (Input, Dropdown, TextArea, a Container of widgets) can go
 * inside via the AdvancedHtml + nested-widget-with-slot-attribute
 * mechanism — see ../README.md.
 *
 * Events:
 *   os-wizard-change (bubbles, composed) — detail: { id, index }, fired
 *     whenever the active step changes (Previous, Next, or a direct
 *     .goTo(id) call)
 *   os-wizard-submit (bubbles, composed) — fired instead of advancing
 *     when Next/Submit is clicked on the LAST step
 *
 * Methods: .next(), .prev(), .goTo(id)
 *
 * ODC porting note: set `steps` as a static "[]" on the Extended
 * Property and inject the real JSON via an OnReady JavaScript node
 * calling document.querySelector('os-wizard-stepper').setAttribute(
 * 'steps', json) — a literal JSON value on an Extended Property fails
 * OutSystems' expression parser. Keep the OnReady node small — a 3-4
 * step JSON array is well under the size that trips a build-time error
 * on large inline JavaScript nodes. Full gotcha list: ../README.md.
 */
class OsWizardStepper extends HTMLElement {
  static get observedAttributes() { return ['steps', 'active', 'submit-label']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  getSteps() {
    try {
      const parsed = JSON.parse(this.getAttribute('steps') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  getActiveIndex() {
    const steps = this.getSteps();
    const activeId = this.getAttribute('active') || (steps[0] && steps[0].id) || '';
    const idx = steps.findIndex((s) => s.id === activeId);
    return idx === -1 ? 0 : idx;
  }

  goTo(id) {
    this.setAttribute('active', id);
    const steps = this.getSteps();
    const index = steps.findIndex((s) => s.id === id);
    this.dispatchEvent(new CustomEvent('os-wizard-change', { detail: { id, index }, bubbles: true, composed: true }));
  }

  next() {
    const steps = this.getSteps();
    const idx = this.getActiveIndex();
    if (idx >= steps.length - 1) {
      this.dispatchEvent(new CustomEvent('os-wizard-submit', { bubbles: true, composed: true }));
      return;
    }
    this.goTo(steps[idx + 1].id);
  }

  prev() {
    const steps = this.getSteps();
    const idx = this.getActiveIndex();
    if (idx <= 0) return;
    this.goTo(steps[idx - 1].id);
  }

  render() {
    const steps = this.getSteps();
    const activeIndex = this.getActiveIndex();
    const submitLabel = this.getAttribute('submit-label') || 'Submit';
    const isLast = activeIndex === steps.length - 1;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--os-wizard-font, system-ui, sans-serif); }
        .rail { display: flex; align-items: center; margin-bottom: var(--os-wizard-rail-gap, 24px); }
        .step-rail-item { display: flex; align-items: center; gap: 10px; }
        .circle {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600; flex-shrink: 0;
          background: var(--os-wizard-upcoming-bg, #e9ecef);
          color: var(--os-wizard-upcoming-color, #6a7178);
        }
        .step-rail-item.complete .circle { background: var(--os-wizard-complete-bg, #29823b); color: #fff; }
        .step-rail-item.active .circle { background: var(--os-wizard-active-bg, #1068eb); color: #fff; }
        .label { font-size: 13px; color: var(--os-wizard-upcoming-color, #6a7178); white-space: nowrap; }
        .step-rail-item.active .label, .step-rail-item.complete .label { color: var(--os-wizard-label-color, #272b30); font-weight: 500; }
        .line { flex: 1; height: 2px; background: var(--os-wizard-upcoming-bg, #e9ecef); margin: 0 12px; min-width: 24px; }
        .line.complete { background: var(--os-wizard-complete-bg, #29823b); }
        .actions { display: flex; justify-content: space-between; margin-top: var(--os-wizard-actions-gap, 24px); padding-top: var(--os-wizard-actions-gap, 24px); border-top: 1px solid var(--os-wizard-border, #e2e5ea); }
        button {
          font-family: inherit; font-size: 14px; font-weight: 500;
          padding: 8px 20px; border-radius: var(--os-wizard-btn-radius, 4px);
          cursor: pointer; border: 1px solid transparent;
        }
        button:disabled { opacity: .4; cursor: not-allowed; }
        .btn-prev { background: #fff; border-color: var(--os-wizard-border, #e2e5ea); color: var(--os-wizard-label-color, #272b30); }
        .btn-next { background: var(--os-wizard-active-bg, #1068eb); color: #fff; }
      </style>
      <div class="rail" part="rail">
        ${steps.map((s, i) => {
          const state = i < activeIndex ? 'complete' : i === activeIndex ? 'active' : '';
          const circleContent = i < activeIndex ? '&#10003;' : String(i + 1);
          return `
            <div class="step-rail-item ${state}">
              <div class="circle">${circleContent}</div>
              <div class="label">${s.label || ''}</div>
            </div>
            ${i < steps.length - 1 ? `<div class="line ${i < activeIndex ? 'complete' : ''}"></div>` : ''}
          `;
        }).join('')}
      </div>
      ${steps.map((s, i) => `<slot name="step-${s.id}" style="display:${i === activeIndex ? 'block' : 'none'} !important;"></slot>`).join('')}
      <div class="actions" part="actions">
        <button class="btn-prev" ${activeIndex === 0 ? 'disabled' : ''}>Previous</button>
        <button class="btn-next">${isLast ? submitLabel : 'Next Step'}</button>
      </div>
    `;

    this.shadowRoot.querySelector('.btn-prev').addEventListener('click', () => this.prev());
    this.shadowRoot.querySelector('.btn-next').addEventListener('click', () => this.next());
  }
}

if (!customElements.get('os-wizard-stepper')) {
  customElements.define('os-wizard-stepper', OsWizardStepper);
}
