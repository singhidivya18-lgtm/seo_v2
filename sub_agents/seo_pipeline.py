"""The original Trending Article SEO pipeline, extracted for reuse by the batch coordinator."""

from google.adk.agents import SequentialAgent, LoopAgent

from .trend_researcher import trend_researcher_agent
from .keyword_curator import keyword_curator_agent
from .content_extractor import content_extractor_agent
from .fact_checker import fact_checker_agent
from .article_writer import article_writer_agent
from .editor import editor_agent
from .approver import approver_agent
from .social_adapter import social_adapter_agent

writing_loop = LoopAgent(
    name="WritingQualityLoop",
    sub_agents=[article_writer_agent, editor_agent, approver_agent],
    max_iterations=2,
)

seo_pipeline_agent = SequentialAgent(
    name="TrendingArticlePipeline",
    sub_agents=[
        trend_researcher_agent,
        keyword_curator_agent,
        content_extractor_agent,
        fact_checker_agent,
        writing_loop,
        social_adapter_agent,
    ],
)