import { Source } from '../types';

export const sources: Source[] = [
  // Tech blogs
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', type: 'rss' },
  { name: 'Daring Fireball', url: 'https://daringfireball.net/feeds/main', type: 'rss' },
  { name: 'Ben Thompson (Stratechery)', url: 'https://stratechery.com/feed/', type: 'rss' },
  { name: 'Hacker News (Best)', url: 'https://hnrss.org/best', type: 'rss' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss' },

  // AI / ML
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/feed', type: 'rss' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', type: 'rss' },

  // Substacks
  { name: 'Lenny\'s Newsletter', url: 'https://www.lennysnewsletter.com/feed', type: 'rss' },
  { name: 'The Pragmatic Engineer', url: 'https://newsletter.pragmaticengineer.com/feed', type: 'rss' },

  // Science / General
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', type: 'rss' },
  { name: 'Quanta Magazine', url: 'https://api.quantamagazine.org/feed/', type: 'rss' },

  // Twitter / X accounts (via RSS Bridge)
  // { name: '@karpathy', url: 'karpathy', type: 'twitter' },
  // { name: '@ylecun', url: 'ylecun', type: 'twitter' },
];
