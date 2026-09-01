# SEO — Trending Article Generator Pipeline

A multi-agent SEO content pipeline built with **Google ADK** that researches trending topics and produces ready-to-publish content: a full article, LinkedIn & Twitter versions, a real stock image, and a downloadable `.docx` report.

## Features

- **Trend research** — detects what's trending via Google Trends (pytrends) and web search (Tavily)
- **Keyword curation** — extracts SEO keywords and intent
- **Content extraction** — pulls and summarizes top-ranking sources
- **Fact-checking** — validates claims against search results before writing
- **Write → Edit → Approve loop** — drafts the article, polishes it, and approves/rejects it with retries
- **Social media adapter** — generates LinkedIn post + Twitter thread from the approved article
- **Real images** — fetches real stock photos from **Pexels** (primary) with **Openverse/Flickr** fallback, matched to the article title
- **`.docx` output** — one formatted document containing the article, social versions, and embedded image

## Architecture

```
TrendingArticlePipeline (SequentialAgent)
├── TrendResearcher          → trending topics for the day/geo
├── KeywordCurator           → SEO keywords & search intent
├── ContentExtractor         → extracts insights from top sources
├── FactChecker              → verifies claims against search results
├── WritingQualityLoop (LoopAgent, max 2 iterations)
│   ├── ArticleWriter        → drafts the article
│   ├── Editor               → rewrites/improves
│   └── Approver             → approves or requests another iteration
└── SocialMediaAdapter       → LinkedIn post, Twitter thread, image, .docx
```

## Prerequisites

- Python 3.11+
- A Google ADK environment (see [google/adk-python](https://github.com/google/adk-python))

## Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure keys** — copy the template and fill in real values:
   ```bash
   cp .env.example .env
   ```
   Required:
   | Key | Purpose | Get it at |
   |-----|---------|-----------|
   | `AIROUTER_API_KEY` | LLM provider (AI Router Switzerland) | https://airouter.ch/dashboard.html |
   | `TAVILY_API_KEY` | Web search for research & fact-checking | https://tavily.com/ |
   | `PEXELS_API_KEY` | Real stock images | https://www.pexels.com/api/ |

   AI Router defaults to `https://api.airouter.ch/v1` and the faster `Qwen3.8` model with reasoning disabled for reliable content output. Override them with `AIROUTER_BASE_URL`, `AIROUTER_MODEL`, and `AIROUTER_REASONING_EFFORT` if needed. Optional: `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` for Google Custom Search, `DEFAULT_GEO` for trends region.

## Run

Start the interactive ADK web server:

```bash
cd trending_article_agent
python -m google.adk.cli web
```

Open **http://127.0.0.1:8000**, choose the `TrendingArticlePipeline` agent, and ask for an article (e.g. *"Write an article about large language models"*).

The agent's output includes:

- ✅ **LinkedIn Post** — hook, body, hashtags, image suggestion
- 🖼️ **Generated Image** — a real stock photo file (download link)
- 📱 **Twitter Thread** — numbered, ≤280 chars per tweet
- 📄 **Downloadable Document** — article + social versions + embedded image as `.docx`

Generated files download from:
```
http://127.0.0.1:8000/dev/apps/trending_article_agent/files/<filename>
```

Each title first runs through the full research and editorial pipeline. If that
pipeline exceeds its 120-second limit or an enrichment step fails, the service
automatically generates a direct article document for the exact title instead
of dropping the result.

## Render deployment

The repository includes `render.yaml` for a machine-independent Docker
deployment. Create a new Blueprint in Render from this repository, enter
`AIROUTER_API_KEY` in the secret prompt, and deploy. Render will provide the
shareable HTTPS URL and redeploy automatically from the default branch.

## Project Layout

```
agent.py                 → root SequentialAgent definition
sub_agents/              → 8 pipeline agents (research → social)
tools/                   → search, extraction, fact-check, social, image, docx tools
.env.example             → environment template (no real secrets committed)
requirements.txt         → Python dependencies
```

## Security

- `.env` (real keys) is **never committed** — see `.gitignore`
- Only `.env.example` with placeholders is tracked in the repo
- Generated images and `.docx` files are gitignored

## Disclaimer

Generated articles are AI-drafted and should be reviewed by a human before publishing. Verify facts, check image licenses, and align content with your own SEO guidelines.
