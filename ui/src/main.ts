import {LitElement, html, css} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {provide} from '@lit/context';
import * as v0_9 from '@a2ui/web_core/v0_9';
import {basicCatalog, Context} from '@a2ui/lit/v0_9';
import {renderMarkdown} from '@a2ui/markdown-it';

@customElement('seo-app')
export class SeoApp extends LitElement {
  @provide({context: Context.markdown})
  markdownRenderer = (value: string, options?: any) => renderMarkdown(value, options);

  private _processor = new v0_9.MessageProcessor(
    [basicCatalog],
    async (action: v0_9.A2uiClientAction) => {
      console.debug('A2UI action', action);
      await fetch('/api/action', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          userAction: {
            name: action.name,
            surfaceId: action.surfaceId,
            sourceComponentId: action.sourceComponentId,
            timestamp: new Date().toISOString(),
            context: action.context ?? {},
          },
        }),
      });
    },
  );

  @state()
  private _surface: any;

  connectedCallback() {
    super.connectedCallback();
    this._processor.onSurfaceCreated((s) => {
      if (s.id === 'seo_dashboard') {
        this._surface = s;
      }
    });

    let initialized = false;
    const refresh = async () => {
      try {
        const resp = await fetch('/api/state_a2ui');
        if (!resp.ok) return;
        const {messages} = await resp.json();
        if (!Array.isArray(messages) || messages.length === 0) return;
        if (!initialized) {
          // First poll: build the surface once.
          this._processor.processMessages(messages);
          initialized = true;
        } else {
          // Subsequent polls: only apply data-model updates (status/results),
          // keeping the user's typed input in the fields intact.
          const dataMessages = messages.filter((m: any) => m && m.updateDataModel);
          if (dataMessages.length > 0) {
            this._processor.processMessages(dataMessages);
          }
        }
      } catch (err) {
        console.error('state poll error', err);
      }
    };

    refresh();
    this._poll = window.setInterval(refresh, 3000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._poll !== undefined) {
      window.clearInterval(this._poll);
      this._poll = undefined;
    }
  }

  private _poll: number | undefined;

  render() {
    return html`
      <div class="shell">
        <header class="topbar">
          <div class="brand">
            <span class="brand-dot"></span>
            <span class="brand-name">seo_v2</span>
          </div>
          <span class="badge">A2UI · batch pipeline</span>
        </header>
        <main>
          ${this._surface
            ? html`<a2ui-surface .surface=${this._surface}></a2ui-surface>`
            : html`<div class="loading">Connecting to agent…</div>`}
        </main>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      font-family:
        'Circular',
        'Inter',
        system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
      /* Supabase dark tokens */
      --a2ui-color-primary: #3ecf8e;
      --a2ui-color-primary-hover: #57d9a0;
      --a2ui-color-on-primary: #0f0f0f;
      --a2ui-color-secondary: #0f0f0f;
      --a2ui-color-on-secondary: #fafafa;
      --a2ui-color-secondary-hover: #2e2e2e;
      --a2ui-color-surface: #0f0f0f;
      --a2ui-color-on-surface: #fafafa;
      --a2ui-color-border: #2e2e2e;
      --a2ui-color-input: #171717;
      --a2ui-color-on-input: #fafafa;
      --a2ui-border-radius: 6px;
      --a2ui-button-border-radius: 9999px;
      --a2ui-button-padding: 8px 20px;
      --a2ui-button-font-weight: 500;
      --a2ui-button-background: #0f0f0f;
      --a2ui-button-box-shadow: none;
      --a2ui-textfield-border: 1px solid #363636;
      --a2ui-textfield-border-radius: 8px;
      --a2ui-textfield-padding: 10px 14px;
      --a2ui-textfield-color-border-focus: #3ecf8e;
      --a2ui-textfield-color-error: #e5484d;
      --a2ui-textfield-label-font-weight: 500;
      --a2ui-card-background: #171717;
      --a2ui-card-border-radius: 8px;
      --a2ui-card-padding: 16px;
      --a2ui-card-box-shadow: none;
      --a2ui-text-caption-color: #898989;
      --a2ui-divider-spacing: 24px;
      --a2ui-font-size-s: 14px;
      --a2ui-font-size-m: 16px;
      --a2ui-font-size-l: 18px;
      --a2ui-font-size-xl: 22px;
      --a2ui-font-size-2xl: 28px;
      --a2ui-line-height-body: 1.5;
      --a2ui-line-height-headings: 1.25;
      --a2ui-spacing-xs: 4px;
      --a2ui-spacing-s: 6px;
      --a2ui-spacing-m: 12px;
      --a2ui-spacing-l: 16px;
    }

    .shell {
      min-height: 100vh;
      background: #171717;
      color: #fafafa;
      max-width: 760px;
      margin: 0 auto;
      padding: 0 24px 48px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 0;
      border-bottom: 1px solid #242424;
      margin-bottom: 28px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: #3ecf8e;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: -0.01em;
    }

    .badge {
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #898989;
      font-family: 'Source Code Pro', 'SFMono-Regular', Consolas, monospace;
      border: 1px solid #2e2e2e;
      border-radius: 9999px;
      padding: 4px 12px;
    }

    .loading {
      padding: 64px 0;
      text-align: center;
      color: #898989;
      font-size: 15px;
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

const style = document.createElement('style');
style.textContent = 'body{margin:0;background:#171717;color:#fafafa;-webkit-font-smoothing:antialiased;}';
document.head.appendChild(style);
