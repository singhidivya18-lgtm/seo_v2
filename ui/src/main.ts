import {LitElement, css, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

type Category = {
  id: string;
  label: string;
  short: string;
  field: string;
  description: string;
  color: string;
  titles: string[];
};

type JobResult = {
  title: string;
  status: string;
};

type JobState = {
  state: string;
  field: string;
  titles: string[];
  message: string;
  results: JobResult[];
};

const CATEGORIES: Category[] = [
  {
    id: 'technology',
    label: 'Technology',
    short: '01',
    field: 'technology',
    description: 'AI, software, devices, and the signals shaping what is next.',
    color: '#8ee5c2',
    titles: [
      'How AI Search Is Changing SEO Strategies in 2026',
      'The Practical Guide to Building Trustworthy AI Workflows',
      'What Small Teams Need to Know About the Next Wave of Search',
      'A Clear Guide to Choosing an AI Model for Content Operations',
      'Why Structured Data Still Matters in an Answer-First Web',
    ],
  },
  {
    id: 'business',
    label: 'Business',
    short: '02',
    field: 'business and marketing',
    description: 'Strategy, growth, operations, and ideas people can act on.',
    color: '#f2b36f',
    titles: [
      'The Lean Content System That Helps Small Teams Grow Organically',
      'How Marketing Teams Can Turn Customer Questions Into Search Traffic',
      'A Modern Framework for Measuring Content That Actually Converts',
      'What Brand Leaders Should Know About Search Visibility in 2026',
      'How to Build a Repeatable Editorial Workflow Without More Meetings',
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness',
    short: '03',
    field: 'health and wellness',
    description: 'Evidence-led habits, sustainable routines, and better living.',
    color: '#d8b4f8',
    titles: [
      'The Evidence-Led Morning Routine That Is Easier to Maintain',
      'How to Build a Sustainable Wellness Plan Around Real Life',
      'What Sleep Tracking Can and Cannot Tell You About Recovery',
      'A Beginner Guide to Making Health Research Easier to Understand',
      'The Difference Between a Wellness Trend and a Useful Habit',
    ],
  },
  {
    id: 'travel',
    label: 'Travel',
    short: '04',
    field: 'travel and destinations',
    description: 'Useful planning guides, intelligent itineraries, and local detail.',
    color: '#91c9f5',
    titles: [
      'How to Plan a More Flexible City Break Without Overspending',
      'The Best Way to Build a Useful Two-Day Travel Itinerary',
      'What Travelers Should Check Before Booking a Remote Work Trip',
      'A Practical Guide to Finding Less Crowded Destinations This Season',
      'How Local Search Is Changing the Way People Plan Their Trips',
    ],
  },
  {
    id: 'finance',
    label: 'Money',
    short: '05',
    field: 'personal finance',
    description: 'Clear explainers for decisions that deserve context and care.',
    color: '#f3d27b',
    titles: [
      'A Simple Framework for Comparing Monthly Subscriptions',
      'How to Read a Personal Finance Product Comparison Before Choosing',
      'The Practical Difference Between Saving More and Spending Better',
      'What New Investors Should Understand About Fees and Risk',
      'How to Build a Financial Content Plan People Can Trust',
    ],
  },
  {
    id: 'culture',
    label: 'Culture',
    short: '06',
    field: 'culture and lifestyle',
    description: 'The products, habits, and communities influencing everyday life.',
    color: '#f09bb4',
    titles: [
      'Why Intentional Digital Spaces Are Becoming a Lifestyle Priority',
      'The New Rules of Building Community Around a Shared Interest',
      'How Independent Creators Are Rethinking the Meaning of Sustainable Work',
      'What Makes a Lifestyle Guide Useful Instead of Merely Trendy',
      'How to Turn a Cultural Shift Into a Thoughtful Editorial Series',
    ],
  },
];

const EMPTY_JOB: JobState = {
  state: 'idle',
  field: '',
  titles: [],
  message: 'Choose a category or enter a field to begin.',
  results: [],
};

const DOCUMENT_LINK = /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/;

@customElement('seo-app')
export class SeoApp extends LitElement {
  @state()
  private _categoryId = CATEGORIES[0].id;

  @state()
  private _field = CATEGORIES[0].field;

  @state()
  private _titles = '';

  @state()
  private _job: JobState = {...EMPTY_JOB};

  @state()
  private _loading = true;

  @state()
  private _requestError = '';

  private _poll: number | undefined;

  private _curationPending = false;

  connectedCallback() {
    super.connectedCallback();
    void this._refresh();
    this._poll = window.setInterval(() => void this._refresh(), 3000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._poll !== undefined) {
      window.clearInterval(this._poll);
      this._poll = undefined;
    }
  }

  private get _category(): Category {
    return CATEGORIES.find((category) => category.id === this._categoryId) ?? CATEGORIES[0];
  }

  private get _busy(): boolean {
    return this._job.state === 'curating' || this._job.state === 'running';
  }

  private get _titleList(): string[] {
    return this._titles
      .split(/\r?\n/)
      .map((title) => title.trim())
      .filter(Boolean);
  }

  private async _refresh() {
    try {
      const response = await fetch('/api/state', {cache: 'no-store'});
      if (!response.ok) throw new Error('The content service is unavailable.');
      const data = (await response.json()) as Partial<JobState>;
      const titles = Array.isArray(data.titles) ? data.titles : this._job.titles;
      this._job = {
        ...this._job,
        ...data,
        titles,
        results: Array.isArray(data.results) ? data.results : this._job.results,
      };
      if (this._curationPending && this._job.state === 'ready' && titles.length > 0) {
        this._titles = titles.join('\n');
        this._curationPending = false;
      } else if (this._job.state === 'error') {
        this._curationPending = false;
      }
      this._loading = false;
    } catch (error) {
      this._loading = false;
      if (!this._job.message || this._job.state === 'idle') {
        this._requestError = error instanceof Error ? error.message : 'Unable to reach the service.';
      }
    }
  }

  private _selectCategory(category: Category) {
    this._categoryId = category.id;
    this._field = category.field;
    this._requestError = '';
  }

  private _useIdea(title: string) {
    const typedTitles = this._titleList;
    const titles = typedTitles.length > 0 ? typedTitles : this._job.state === 'ready' ? this._job.titles : [];
    if (!titles.includes(title)) {
      this._titles = [...titles, title].join('\n');
    }
  }

  private _useAllIdeas() {
    this._titles = this._category.titles.join('\n');
  }

  private async _sendAction(name: 'curate_titles' | 'run_batch') {
    this._requestError = '';
    const field = this._field.trim();
    const typedTitles = this._titleList;
    const titles = typedTitles.length > 0 ? typedTitles : this._job.state === 'ready' ? this._job.titles : [];

    if (!field) {
      this._requestError = 'Add a field of interest before continuing.';
      return;
    }
    if (name === 'run_batch' && titles.length === 0) {
      this._requestError = 'Add at least one article title or use a sample idea.';
      return;
    }
    if (name === 'curate_titles') {
      this._curationPending = true;
    }

    const context = name === 'curate_titles'
      ? {field}
      : {field, titlesRaw: titles.slice(0, 10).join('\n')};

    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userAction: {name, context}}),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'The request could not be started.');
      }
      await this._refresh();
    } catch (error) {
      if (name === 'curate_titles') {
        this._curationPending = false;
      }
      this._requestError = error instanceof Error ? error.message : 'The request could not be started.';
    }
  }

  private async _cancelJob() {
    try {
      await fetch('/api/cancel', {method: 'POST'});
      await this._refresh();
    } catch {
      // ignore
    }
  }

  private _statusClass(): string {
    if (this._job.state === 'error') return 'status-error';
    if (this._job.state === 'complete') return 'status-success';
    if (this._busy) return 'status-busy';
    return 'status-idle';
  }

  private _renderResultStatus(status: string) {
    const match = DOCUMENT_LINK.exec(status || '');
    if (match) {
      return html`
        <a class="download-link" href=${match[2]} target="_blank" rel="noopener">
          <span>${match[1]}</span>
          <span class="download-arrow">Download</span>
        </a>
      `;
    }
    return html`<span class="result-error">${(status || 'No result').replace(/^x\s*/, '')}</span>`;
  }

  private _renderCategories() {
    return html`
      <div class="category-grid" role="list" aria-label="Content categories">
        ${CATEGORIES.map(
          (category) => html`
            <button
              class=${"category-card " + (category.id === this._categoryId ? 'selected' : '')}
              style=${"--category-accent: " + category.color}
              aria-pressed=${category.id === this._categoryId}
              @click=${() => this._selectCategory(category)}
            >
              <span class="category-index">${category.short}</span>
              <span class="category-label">${category.label}</span>
              <span class="category-description">${category.description}</span>
              <span class="category-caret">↗</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  private _renderIdeas() {
    return html`
      <div class="ideas-heading">
        <div>
          <span class="mini-label">STARTING POINTS</span>
          <h3>Title ideas for ${this._category.label}</h3>
        </div>
        <button class="text-button" @click=${this._useAllIdeas}>Use all</button>
      </div>
      <p class="ideas-intro">Tap an idea to add it to your queue. You can edit every title before running the batch.</p>
      <div class="ideas-list">
        ${this._category.titles.map(
          (title, index) => html`
            <button class="idea-row" @click=${() => this._useIdea(title)}>
              <span class="idea-number">0${index + 1}</span>
              <span class="idea-title">${title}</span>
              <span class="idea-plus">+</span>
            </button>
          `,
        )}
      </div>
    `;
  }

  private _renderResults() {
    if (this._job.results.length === 0) {
      return html`
        <div class="empty-results">
          <div class="empty-orbit"><span></span><span></span><span></span></div>
          <div>
            <strong>Your documents will land here.</strong>
            <p>Curate a set of titles, run the batch, and download each finished content kit from this queue.</p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="result-list">
        ${this._job.results.map(
          (result, index) => html`
            <article class="result-row">
              <span class="result-number">${String(index + 1).padStart(2, '0')}</span>
              <div class="result-main">
                <strong>${result.title}</strong>
                <div class="result-status">${this._renderResultStatus(result.status)}</div>
                ${result.linkedin_post ? html`
                  <details class="social-details">
                    <summary>LinkedIn Post</summary>
                    <div class="social-content">${result.linkedin_post}</div>
                  </details>
                ` : nothing}
                ${result.twitter_thread ? html`
                  <details class="social-details">
                    <summary>Twitter/X Thread</summary>
                    <div class="social-content">${result.twitter_thread}</div>
                  </details>
                ` : nothing}
                ${result.image_url ? html`
                  <div class="social-image">
                    <a href=${result.image_url} target="_blank" rel="noopener">
                      <span class="button-icon">🖼</span> View Image
                    </a>
                  </div>
                ` : nothing}
              </div>
            </article>
          `,
        )}
      </div>
    `;
  }

  render() {
    const count = this._titleList.length;
    const statusLabel = this._loading ? 'Connecting' : this._busy ? 'Working' : this._job.state === 'complete' ? 'Complete' : 'Ready';

    return html`
      <div class="page">
        <div class="glow glow-one"></div>
        <div class="glow glow-two"></div>

        <header class="topbar">
          <a class="brand" href="/" aria-label="SEO Studio home">
            <span class="brand-mark"><span></span><span></span><span></span></span>
            <span class="brand-copy">
              <strong>SEO Studio</strong>
              <small>content operations</small>
            </span>
          </a>
          <div class="topbar-right">
            <span class="engine-pill"><span class="engine-dot"></span>AI Router engine</span>
            <a class="github-link" href="https://github.com/singhidivya18-lgtm/seo_v2" target="_blank" rel="noopener">View source <span>↗</span></a>
          </div>
        </header>

        <main class="content">
          <section class="hero">
            <div class="eyebrow"><span></span> research, write, publish</div>
            <h1>From a blank page to a <em>search-ready</em> story.</h1>
            <p class="hero-copy">A focused workspace for turning a field of interest into researched titles, polished articles, social copy, imagery, and downloadable reports.</p>
            <div class="hero-notes">
              <span><b>01</b> choose a lane</span>
              <span><b>02</b> shape the brief</span>
              <span><b>03</b> export the kit</span>
            </div>
          </section>

          <section class="workflow-section">
            <div class="section-heading">
              <span class="section-number">01</span>
              <div>
                <span class="mini-label">EDITORIAL LANE</span>
                <h2>What are you writing about?</h2>
              </div>
              <p>Start with a category to load useful angles, or use it as a creative filter for your own brief.</p>
            </div>
            ${this._renderCategories()}
          </section>

          <section class="studio-grid">
            <div class="panel composer-panel">
              <div class="panel-topline">
                <div>
                  <span class="mini-label">YOUR BRIEF</span>
                  <h2>Shape the next batch</h2>
                </div>
                <span class="step-badge">02 / 03</span>
              </div>

              <label class="field-label" for="field-input">Field of interest <span>required</span></label>
              <div class="input-shell">
                <span class="input-prefix">/</span>
                <input
                  id="field-input"
                  .value=${this._field}
                  placeholder="e.g. sustainable fashion"
                  @input=${(event: Event) => {
                    this._field = (event.target as HTMLInputElement).value;
                  }}
                />
              </div>

              <div class="title-label-row">
                <label class="field-label" for="titles-input">Article titles <span>one per line</span></label>
                <span class=${"title-count " + (count > 10 ? "over-limit" : "")}>${count} / 10</span>
              </div>
              <textarea
                id="titles-input"
                rows="7"
                .value=${this._titles}
                placeholder="Paste your own titles, or add ideas from the panel..."
                @input=${(event: Event) => {
                  this._titles = (event.target as HTMLTextAreaElement).value;
                }}
              ></textarea>

              <div class="composer-bottom">
                <div class="composer-hint"><span class="hint-icon">i</span> Up to 10 titles per batch</div>
                <div class="action-row">
                  <button class="button button-secondary" ?disabled=${this._busy} @click=${() => void this._sendAction('curate_titles')}>
                    <span class="button-icon">+</span> Find title ideas
                  </button>
                  <button class="button button-primary" ?disabled=${this._busy} @click=${() => void this._sendAction('run_batch')}>
                    ${this._busy ? html`<span class="spinner"></span>` : html`<span class="button-icon">→</span>`}
                    ${this._busy ? 'Working...' : 'Generate content kit'}
                  </button>
                  ${this._busy ? html`
                    <button class="button button-cancel" @click=${() => void this._cancelJob()}>
                      <span class="button-icon">✕</span> Cancel
                    </button>
                  ` : nothing}
                </div>
              </div>

              ${this._requestError
                ? html`<div class="inline-error" role="alert">${this._requestError}</div>`
                : nothing}
            </div>

            <aside class="panel ideas-panel">
              ${this._renderIdeas()}
            </aside>
          </section>

          <section class="results-section">
            <div class="results-header">
              <div class="results-title">
                <span class="section-number">03</span>
                <div>
                  <span class="mini-label">OUTPUT QUEUE</span>
                  <h2>Content kits</h2>
                </div>
              </div>
              <div class="results-meta">
                <span class=${"live-status " + this._statusClass()}><span></span>${statusLabel}</span>
                <span class="result-count">${this._job.results.length} documents</span>
              </div>
            </div>
            <div class="status-strip" aria-live="polite" aria-busy=${this._busy}>
              <span class=${"status-pulse " + this._statusClass()}></span>
              <span>${this._job.message}</span>
              ${this._job.field ? html`<span class="status-field">${this._job.field}</span>` : nothing}
            </div>
            ${this._renderResults()}
          </section>
        </main>

        <footer class="footer">
          <span>SEO Studio <i>·</i> built for deliberate publishing</span>
          <span>AI Router Switzerland <i>·</i> human review recommended <i>·</i> v1.1</span>
        </footer>
      </div>
    `;
  }

  static styles = css`
    :host {
      --ink: #f5f2eb;
      --muted: #9aa1b2;
      --faint: #697184;
      --line: rgba(229, 235, 244, 0.12);
      --panel: rgba(25, 31, 46, 0.82);
      --panel-light: rgba(31, 38, 55, 0.72);
      --accent: #8ee5c2;
      display: block;
      min-height: 100vh;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    button, input, textarea {
      font: inherit;
    }

    button, a {
      -webkit-tap-highlight-color: transparent;
    }

    .page {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
      background:
        linear-gradient(145deg, rgba(20, 26, 40, 0.96), rgba(13, 17, 28, 0.98)),
        #0d111c;
    }

    .page::before {
      position: absolute;
      inset: 0;
      pointer-events: none;
      content: "";
      opacity: 0.22;
      background-image: linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
      background-size: 72px 72px;
      mask-image: linear-gradient(to bottom, black, transparent 70%);
    }

    .glow {
      position: absolute;
      width: 420px;
      height: 420px;
      pointer-events: none;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.11;
    }

    .glow-one {
      top: -220px;
      right: 4%;
      background: #6cd8b0;
    }

    .glow-two {
      top: 640px;
      left: -280px;
      background: #b589e9;
      opacity: 0.08;
    }

    .topbar, .content, .footer {
      position: relative;
      z-index: 1;
      width: min(1180px, calc(100% - 48px));
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 86px;
      border-bottom: 1px solid var(--line);
    }

    .brand, .github-link {
      color: inherit;
      text-decoration: none;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .brand-mark {
      display: inline-flex;
      align-items: flex-end;
      gap: 3px;
      width: 27px;
      height: 27px;
      padding: 5px;
      border: 1px solid rgba(142, 229, 194, 0.5);
      border-radius: 8px;
      background: rgba(142, 229, 194, 0.08);
    }

    .brand-mark span {
      display: block;
      width: 4px;
      border-radius: 3px;
      background: var(--accent);
    }

    .brand-mark span:nth-child(1) { height: 8px; opacity: 0.55; }
    .brand-mark span:nth-child(2) { height: 13px; opacity: 0.78; }
    .brand-mark span:nth-child(3) { height: 17px; }

    .brand-copy {
      display: grid;
      gap: 2px;
    }

    .brand-copy strong {
      font-size: 14px;
      font-weight: 650;
      letter-spacing: 0.01em;
    }

    .brand-copy small, .github-link, .engine-pill {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 25px;
    }

    .engine-pill, .github-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .engine-dot, .live-status span, .status-pulse {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 4px rgba(142, 229, 194, 0.09);
    }

    .github-link {
      transition: color 160ms ease;
    }

    .github-link:hover {
      color: var(--ink);
    }

    .github-link span, .category-caret {
      color: var(--accent);
      font-size: 16px;
    }

    .content {
      padding: 75px 0 90px;
    }

    .hero {
      max-width: 850px;
      padding-bottom: 75px;
    }

    .eyebrow, .mini-label {
      color: var(--accent);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 24px;
    }

    .eyebrow span {
      width: 25px;
      height: 1px;
      background: var(--accent);
    }

    h1, h2, h3, p {
      margin: 0;
    }

    h1 {
      max-width: 860px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(45px, 7vw, 84px);
      font-weight: 400;
      letter-spacing: -0.055em;
      line-height: 0.99;
    }

    h1 em {
      color: var(--accent);
      font-style: italic;
    }

    .hero-copy {
      max-width: 570px;
      margin-top: 29px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.7;
    }

    .hero-notes {
      display: flex;
      flex-wrap: wrap;
      gap: 25px;
      margin-top: 34px;
      color: var(--faint);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .hero-notes span {
      display: inline-flex;
      align-items: center;
      gap: 9px;
    }

    .hero-notes b {
      color: var(--ink);
      font-size: 10px;
      font-weight: 600;
    }

    .workflow-section {
      padding: 34px 0 49px;
      border-top: 1px solid var(--line);
    }

    .section-heading {
      display: grid;
      grid-template-columns: 40px minmax(240px, 1fr) minmax(260px, 390px);
      gap: 18px;
      align-items: start;
      margin-bottom: 27px;
    }

    .section-number {
      color: var(--accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      letter-spacing: 0.08em;
    }

    h2 {
      margin-top: 6px;
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      font-weight: 400;
      letter-spacing: -0.025em;
    }

    .section-heading p {
      padding-top: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 9px;
    }

    .category-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 160px;
      padding: 17px 15px 14px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 12px;
      color: var(--ink);
      text-align: left;
      background: rgba(27, 34, 49, 0.55);
      cursor: pointer;
      transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
    }

    .category-card::before {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 2px;
      content: "";
      opacity: 0;
      background: var(--category-accent);
      transition: opacity 180ms ease;
    }

    .category-card:hover, .category-card.selected {
      border-color: color-mix(in srgb, var(--category-accent) 47%, transparent);
      background: rgba(35, 44, 63, 0.86);
      transform: translateY(-2px);
    }

    .category-card.selected::before {
      opacity: 1;
    }

    .category-index {
      color: var(--category-accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .category-label {
      margin-top: 27px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 19px;
    }

    .category-description {
      display: block;
      margin-top: 9px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }

    .category-caret {
      position: absolute;
      right: 13px;
      bottom: 12px;
      opacity: 0.45;
    }

    .studio-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(350px, 0.85fr);
      gap: 14px;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 15px;
      background: var(--panel);
      box-shadow: 0 18px 55px rgba(0, 0, 0, 0.16);
    }

    .composer-panel {
      padding: 29px;
    }

    .panel-topline, .title-label-row, .composer-bottom, .ideas-heading, .results-header, .results-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .panel-topline {
      margin-bottom: 30px;
    }

    .step-badge {
      padding: 6px 9px;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .field-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 9px;
      color: #d8dce5;
      font-size: 12px;
      font-weight: 600;
    }

    .field-label span {
      color: var(--faint);
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.03em;
    }

    .input-shell {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      border: 1px solid rgba(229, 235, 244, 0.15);
      border-radius: 9px;
      background: rgba(10, 14, 24, 0.45);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .input-shell:focus-within, textarea:focus {
      border-color: rgba(142, 229, 194, 0.7);
      box-shadow: 0 0 0 3px rgba(142, 229, 194, 0.08);
      outline: none;
    }

    .input-prefix {
      padding-left: 14px;
      color: var(--accent);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 17px;
    }

    input, textarea {
      width: 100%;
      border: 0;
      color: var(--ink);
      background: transparent;
      outline: none;
    }

    input {
      height: 47px;
      padding: 0 14px 0 9px;
      font-size: 14px;
    }

    textarea {
      display: block;
      min-height: 169px;
      padding: 14px;
      resize: vertical;
      border: 1px solid rgba(229, 235, 244, 0.15);
      border-radius: 9px;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.7;
      background: rgba(10, 14, 24, 0.45);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    input::placeholder, textarea::placeholder {
      color: #626b7d;
    }

    .title-label-row {
      align-items: baseline;
    }

    .title-count {
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .title-count.over-limit {
      color: #ef9ba8;
    }

    .composer-bottom {
      flex-wrap: wrap;
      gap: 17px;
      margin-top: 20px;
    }

    .composer-hint {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--faint);
      font-size: 11px;
    }

    .hint-icon {
      display: inline-grid;
      width: 16px;
      height: 16px;
      place-items: center;
      border: 1px solid var(--faint);
      border-radius: 50%;
      font-family: Georgia, serif;
      font-size: 11px;
    }

    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .button, .text-button {
      border: 0;
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 39px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 650;
    }

    .button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .button:disabled {
      cursor: wait;
      opacity: 0.52;
    }

    .button-secondary {
      border: 1px solid var(--line);
      color: #d7dce8;
      background: transparent;
    }

    .button-secondary:hover:not(:disabled) {
      border-color: rgba(142, 229, 194, 0.4);
      background: rgba(142, 229, 194, 0.06);
    }

    .button-primary {
      color: #111923;
      background: var(--accent);
    }

    .button-primary:hover:not(:disabled) {
      background: #b2f1d7;
    }

    .button-cancel {
      color: #f0b0bb;
      border: 1px solid rgba(239, 155, 168, 0.28);
      background: rgba(131, 49, 69, 0.12);
    }

    .button-cancel:hover {
      background: rgba(131, 49, 69, 0.28);
      border-color: rgba(239, 155, 168, 0.5);
    }

    .button-icon {
      font-size: 16px;
      font-weight: 400;
      line-height: 1;
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(17, 25, 35, 0.3);
      border-top-color: #111923;
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .inline-error {
      margin-top: 16px;
      padding: 10px 12px;
      border: 1px solid rgba(239, 155, 168, 0.28);
      border-radius: 7px;
      color: #f0b0bb;
      font-size: 11px;
      line-height: 1.5;
      background: rgba(131, 49, 69, 0.12);
    }

    .ideas-panel {
      min-height: 100%;
      padding: 26px 24px 19px;
      background: var(--panel-light);
    }

    .ideas-heading {
      align-items: flex-start;
      gap: 15px;
    }

    h3 {
      margin-top: 7px;
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px;
      font-weight: 400;
      letter-spacing: -0.02em;
    }

    .text-button {
      padding: 0;
      color: var(--accent);
      font-size: 11px;
      background: transparent;
    }

    .text-button:hover {
      color: #c2f5df;
    }

    .ideas-intro {
      max-width: 330px;
      margin: 12px 0 20px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
    }

    .ideas-list {
      border-top: 1px solid var(--line);
    }

    .idea-row {
      display: grid;
      grid-template-columns: 27px 1fr 18px;
      gap: 8px;
      align-items: start;
      width: 100%;
      padding: 13px 0;
      border: 0;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      text-align: left;
      background: transparent;
      cursor: pointer;
      transition: color 160ms ease, padding 160ms ease;
    }

    .idea-row:hover {
      padding-right: 4px;
      padding-left: 4px;
      color: var(--ink);
    }

    .idea-number {
      padding-top: 2px;
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .idea-title {
      font-size: 12px;
      line-height: 1.48;
    }

    .idea-plus {
      padding-top: 1px;
      color: var(--accent);
      font-size: 17px;
      font-weight: 300;
      text-align: right;
    }

    .results-section {
      margin-top: 14px;
      padding: 30px;
      border: 1px solid var(--line);
      border-radius: 15px;
      background: rgba(18, 24, 37, 0.72);
    }

    .results-title {
      display: flex;
      align-items: flex-start;
      gap: 18px;
    }

    .results-meta {
      gap: 18px;
    }

    .live-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 11px;
    }

    .live-status.status-error span, .status-pulse.status-error {
      background: #ef9ba8;
      box-shadow: 0 0 0 4px rgba(239, 155, 168, 0.09);
    }

    .live-status.status-success span, .status-pulse.status-success {
      background: #8ee5c2;
    }

    .live-status.status-busy span, .status-pulse.status-busy {
      animation: breathe 1.2s ease-in-out infinite;
    }

    @keyframes breathe {
      0%, 100% { opacity: 0.4; transform: scale(0.82); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    .result-count {
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
    }

    .status-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 42px;
      margin-top: 25px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--muted);
      font-size: 11px;
      background: rgba(9, 13, 22, 0.28);
    }

    .status-pulse {
      flex: 0 0 auto;
      width: 6px;
      height: 6px;
    }

    .status-field {
      margin-left: auto;
      overflow: hidden;
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-results {
      display: flex;
      align-items: center;
      gap: 19px;
      min-height: 151px;
      color: var(--muted);
    }

    .empty-results strong {
      display: block;
      margin-bottom: 5px;
      color: #d9dce4;
      font-size: 13px;
      font-weight: 600;
    }

    .empty-results p {
      max-width: 500px;
      font-size: 12px;
      line-height: 1.55;
    }

    .empty-orbit {
      position: relative;
      display: grid;
      width: 49px;
      height: 49px;
      place-items: center;
      border: 1px solid rgba(142, 229, 194, 0.35);
      border-radius: 50%;
    }

    .empty-orbit::before {
      position: absolute;
      inset: 7px;
      border: 1px dashed rgba(142, 229, 194, 0.35);
      border-radius: 50%;
      content: "";
    }

    .empty-orbit span {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--accent);
    }

    .empty-orbit span:nth-child(1) { top: 3px; }
    .empty-orbit span:nth-child(2) { right: 4px; bottom: 11px; opacity: 0.6; }
    .empty-orbit span:nth-child(3) { bottom: 7px; left: 8px; opacity: 0.4; }

    .result-list {
      margin-top: 17px;
      border-top: 1px solid var(--line);
    }

    .result-row {
      display: grid;
      grid-template-columns: 39px 1fr;
      gap: 12px;
      align-items: start;
      padding: 17px 0;
      border-bottom: 1px solid var(--line);
    }

    .result-number {
      color: var(--faint);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
    }

    .result-main strong {
      display: block;
      color: #e4e7ed;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.45;
    }

    .result-status {
      margin-top: 7px;
      font-size: 11px;
    }

    .download-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--accent);
      text-decoration: none;
    }

    .download-link:hover {
      color: #c2f5df;
    }

    .download-arrow {
      color: var(--faint);
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .social-details {
      margin-top: 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
    }

    .social-details summary {
      padding: 8px 10px;
      cursor: pointer;
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(142, 229, 194, 0.04);
      transition: background 160ms ease;
    }

    .social-details summary:hover {
      background: rgba(142, 229, 194, 0.08);
    }

    .social-content {
      padding: 10px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      max-height: 200px;
      overflow-y: auto;
      border-top: 1px solid var(--line);
    }

    .social-image {
      margin-top: 8px;
    }

    .social-image a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--accent);
      font-size: 11px;
      text-decoration: none;
    }

    .social-image a:hover {
      color: #b2f1d7;
    }

    .result-error {
      color: #eaa5b1;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      padding: 22px 0 29px;
      border-top: 1px solid var(--line);
      color: var(--faint);
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .footer i {
      padding: 0 5px;
      color: var(--accent);
      font-style: normal;
    }

    @media (max-width: 980px) {
      .category-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .studio-grid {
        grid-template-columns: 1fr;
      }

      .ideas-panel {
        min-height: auto;
      }
    }

    @media (max-width: 680px) {
      .topbar, .content, .footer {
        width: min(100% - 30px, 560px);
      }

      .topbar {
        min-height: 70px;
      }

      .topbar-right {
        gap: 0;
      }

      .github-link {
        display: none;
      }

      .engine-pill {
        font-size: 9px;
      }

      .content {
        padding-top: 52px;
        padding-bottom: 55px;
      }

      .hero {
        padding-bottom: 53px;
      }

      h1 {
        font-size: clamp(43px, 13vw, 66px);
      }

      .hero-copy {
        font-size: 14px;
      }

      .hero-notes {
        gap: 13px;
        line-height: 1.4;
      }

      .section-heading {
        grid-template-columns: 31px 1fr;
      }

      .section-heading p {
        grid-column: 2;
        padding-top: 0;
      }

      .category-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .category-card {
        min-height: 145px;
      }

      .category-description {
        font-size: 10px;
      }

      .composer-panel, .results-section {
        padding: 21px 17px;
      }

      .panel-topline {
        margin-bottom: 24px;
      }

      .composer-bottom {
        align-items: flex-start;
        flex-direction: column;
      }

      .action-row, .button {
        width: 100%;
      }

      .button {
        min-height: 43px;
      }

      .results-header {
        align-items: flex-start;
        gap: 12px;
      }

      .results-meta {
        align-items: flex-end;
        flex-direction: column;
        gap: 6px;
      }

      .status-field {
        max-width: 48%;
      }

      .empty-results {
        align-items: flex-start;
        flex-direction: column;
        justify-content: center;
        gap: 12px;
      }

      .footer {
        align-items: flex-start;
        flex-direction: column;
        gap: 9px;
        line-height: 1.5;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'seo-app': SeoApp;
  }
}

const mount = document.querySelector('#app');
if (mount) {
  mount.appendChild(document.createElement('seo-app'));
} else {
  document.body.appendChild(document.createElement('seo-app'));
}
