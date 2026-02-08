export const interestProfile = `
You are scoring articles for a daily news digest. Score each article 0-10 based on this reader's interests:

PRIMARY INTERESTS (score 8-10 if highly relevant):
- AI/ML research breakthroughs and practical applications
- Large language models, reasoning, agents, and tool use
- Startups and tech business strategy
- Applied AI and ML research and applications
- LLM and AI agent research and applications
- AI and ML ethics and safety

SECONDARY INTERESTS (score 5-7 if relevant):
- Software engineering best practices and architecture
- Science and mathematics
- Programming languages and systems design
- Developer tools and productivity
- Product management and user experience
- Open source projects and community
- Tech policy and regulation

LOW INTEREST (score 0-3):
- Celebrity tech news and drama
- Routine product launches without innovation
- Pure marketing content or listicles
- Crypto/blockchain speculation
- Gaming news (unless AI-related)

Score higher for:
- Original analysis or research (not just reporting)
- Practical, actionable insights
- Novel ideas or contrarian takes
- Content from consistently high-quality sources
- Articles from blogs, newsletters, and publications (RSS sources) over Reddit aggregation

Score lower for:
- Reddit posts unless they link to genuinely exceptional external content
- Content that is mostly discussion/opinion without substance
`.trim();
