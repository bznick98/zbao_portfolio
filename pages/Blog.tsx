import { ArrowLeft, ArrowRight } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { posts, type BlogPost } from '../data/posts';

const articles = import.meta.glob<string>('../content/posts/*.md', { eager: true, query: '?raw', import: 'default' });
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Byline({ post }: { post: BlogPost }) {
  return <p className="post-category">{post.category} <span aria-hidden="true">·</span> <time dateTime={post.published}>{dateFormat.format(new Date(post.published))}</time></p>;
}

export function Blog({ post }: { post?: BlogPost }) {
  if (post) return (
    <article className="writing-page post-page">
      <a className="back-link" href="#blog"><ArrowLeft size={18} /> All posts</a>
      <header>
        <Byline post={post} />
        <h1>{post.title}</h1>
        <p className="post-summary">{post.summary}</p>
        {post.reviewers && <p className="reviewers">Reviewed by {post.reviewers}.</p>}
      </header>
      <div className="post-body">
        <Markdown remarkPlugins={[remarkGfm]} components={{
          table: ({ children }) => <div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable comparison table"><table>{children}</table></div>,
          img: ({ src, alt }) => src === '/blog/focus/fly.gif'
            ? <picture><source media="(prefers-reduced-motion: reduce)" srcSet="/blog/focus-input.webp" /><img src={src} alt={alt} loading="lazy" /></picture>
            : <img src={src} alt={alt} loading="lazy" decoding="async" />,
        }}>{articles[`../content/posts/${post.slug}.md`]}</Markdown>
        <nav className="post-links" aria-label="Project resources">
          {post.links.map(link => <a key={link.href} href={link.href}>{link.label} <ArrowRight size={16} /></a>)}
        </nav>
      </div>
    </article>
  );

  return (
    <div className="writing-page blog-index">
      <h1 className="portfolio-title">Blog</h1>
      <ul className="post-grid">
        {posts.map(entry => (
          <li key={entry.slug}>
            <a className="post-card" href={`#blog/${entry.slug}`}>
              <img src={entry.cover.src} alt={entry.cover.alt} width="730" height="482" />
              <Byline post={entry} />
              <h2>{entry.title}</h2>
              <p className="post-summary">{entry.summary}</p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
