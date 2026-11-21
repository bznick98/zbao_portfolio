import React from 'react';
import { Github, Linkedin, Mail } from 'lucide-react';

const links = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/zongnanbao/', Icon: Linkedin },
  { label: 'GitHub', href: 'https://github.com/bznick98', Icon: Github },
  { label: 'Unsplash', href: 'https://unsplash.com/@nick19981122', Icon: Unsplash },
  { label: 'Email', href: 'mailto:zongnan.bao@gmail.com', Icon: Mail },
];

function Unsplash() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 2h8v6H8zM2 11h6v5h8v-5h6v11H2z" /></svg>;
}

export function SocialLinks() {
  return <nav className="portfolio-social" aria-label="Social links">
    {links.map(({ label, href, Icon }) => (
      <a key={label} aria-label={label} title={label} href={href}><Icon aria-hidden="true" /></a>
    ))}
  </nav>;
}
