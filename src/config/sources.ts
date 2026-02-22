import { Source } from '../types';

export const sources: Source[] = [
  // Tech blogs
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', type: 'rss' },
  { name: 'Transformer News', url: 'https://www.transformernews.ai/feed', type: 'rss' },
  { name: 'Daring Fireball', url: 'https://daringfireball.net/feeds/main', type: 'rss' },
  { name: 'Ben Thompson (Stratechery)', url: 'https://stratechery.com/feed/', type: 'rss' },
  { name: 'Hacker News (Best)', url: 'https://hnrss.org/best', type: 'rss' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss' },
  { name: 'Karpathy Blog', url: 'https://karpathy.bearblog.dev/feed/', type: 'rss' },
  { name: 'Ben Evans', url: 'http://ben-evans.com/benedictevans/?format=rss', type: 'rss' },

  // AI / ML
  { name: 'Anthropic News', url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml', type: 'rss' },
  { name: 'Anthropic Engineering', url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml', type: 'rss' },
  { name: 'Anthropic Research', url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_research.xml', type: 'rss' },
  { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', type: 'rss' },
  //{ name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/feed/', type: 'rss' },
  { name: 'Google AI Blog', url: 'https://blog.google/innovation-and-ai/technology/ai/rss/', type: 'rss' },

  // Substacks
  { name: 'Lenny\'s Newsletter', url: 'https://www.lennysnewsletter.com/feed', type: 'rss' },
  { name: 'The Pragmatic Engineer', url: 'https://newsletter.pragmaticengineer.com/feed', type: 'rss' },
  { name: 'Sean Goedecke', url: 'https://www.seangoedecke.com/rss.xml', type: 'rss' },

  // Science / General
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', type: 'rss' },
  { name: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/', type: 'rss' },

  // Reddit (native RSS — append .rss to any subreddit URL)
  { name: 'r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/top/.rss?t=day', type: 'reddit' },
  { name: 'r/LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day', type: 'reddit' },
  { name: 'r/ClaudeAI', url: 'https://www.reddit.com/r/ClaudeAI/top/.rss?t=day', type: 'reddit' },
  { name: 'r/ChatGPT', url: 'https://www.reddit.com/r/ChatGPT/top/.rss?t=day', type: 'reddit' },
  { name: 'r/GeminiAI', url: 'https://www.reddit.com/r/GeminiAI/top/.rss?t=day', type: 'reddit' },
  { name: 'r/ArtificialInteligence', url: 'https://www.reddit.com/r/ArtificialInteligence/top/.rss?t=day', type: 'reddit' },
  { name: 'r/ClaudeCode', url: 'https://www.reddit.com/r/ClaudeCode/top/.rss?t=day', type: 'reddit' },
];
