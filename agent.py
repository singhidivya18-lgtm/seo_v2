"""Root agent for the SEO batch variant.

Pipeline: user gives a field of interest (e.g. "laptops") ->
TitleCurator curates >= 5 article titles -> BatchCoordinator produces
one .docx per title by running the original TrendingArticlePipeline
for each title.
"""

from google.adk.agents import SequentialAgent

from .sub_agents.title_curator import title_curator_agent
from .sub_agents.batch_coordinator import batch_coordinator_agent

root_agent = SequentialAgent(
    name="TrendingToDocsPipeline",
    sub_agents=[
        title_curator_agent,
        batch_coordinator_agent,
    ],
)