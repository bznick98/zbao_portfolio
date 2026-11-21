import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { posts, type BlogPost } from '../data/posts';

export function Blog({ post }: { post?: BlogPost }) {
  if (post) return (
    <article className="writing-page post-page">
      <a className="back-link" href="#blog"><ArrowLeft size={18} /> All posts</a>
      <header>
        <p className="post-category">{post.category}</p>
        <h1>{post.title}</h1>
        <p className="post-summary">{post.summary}</p>
        {post.reviewers && <p className="reviewers">Reviewed by {post.reviewers}.</p>}
      </header>
      <div className="figure-pair">
        {post.figures.map(figure => (
          <figure key={figure.src}>
            <img src={figure.src} alt={figure.alt} />
            <figcaption>{figure.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="post-body">
        {post.sections.map(section => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <nav className="post-links" aria-label="Project resources">
          {post.links.map(link => <a key={link.href} href={link.href}>{link.label} <ArrowRight size={16} /></a>)}
        </nav>
      </div>
    </article>
  );

  return (
    <div className="writing-page blog-index">
      <h1 className="portfolio-title">Blog</h1>
      <ul>
        {posts.map(entry => (
          <li key={entry.slug}>
            <a className="post-row" href={`#blog/${entry.slug}`}>
              <img src={entry.figures[1].src} alt="" />
              <div>
                <p className="post-category">{entry.category}</p>
                <h2>{entry.title}</h2>
                <p className="post-summary">{entry.summary}</p>
              </div>
              <ArrowRight className="row-arrow" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
