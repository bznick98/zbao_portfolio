import React, { useId, useRef } from 'react';
import { posts, type BlogPost } from '../data/posts';
import { CalendarDate } from '../components/CalendarDate';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';

gsap.registerPlugin(useGSAP);

function AboutSection({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid grid-cols-12 gap-x-4 gap-y-8 md:gap-x-8">
      <div className="col-span-12 md:col-span-3 profile-anim">
        <h2 id={headingId} className="text-sm uppercase tracking-widest border-t border-black pt-4">{title}</h2>
      </div>
      <div className="col-span-12 min-w-0 md:col-span-9 profile-anim">{children}</div>
    </section>
  );
}

const appleStartDate = '2026-09-29';
const updates: { title: string; date: string; post?: BlogPost }[] = [
  { title: 'I joined Apple as a Hardware and Software Modeling Engineer.', date: appleStartDate },
  ...posts.slice(0, 2).map(post => ({ title: post.title, date: post.published, post })),
];
updates.sort((a, b) => b.date.localeCompare(a.date));

export const About: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.profile-anim', { y: 10, opacity: 0, duration: 0.32, stagger: 0.03, clearProps: 'transform,opacity' });
    });
    return () => media.revert();
  }, { scope: containerRef });

  const experiences = [
    {
        company: 'Apple',
        link: 'https://www.apple.com/',
        role: 'Hardware and Software Modeling Engineer',
        duration: <><CalendarDate date={appleStartDate} /> – Present</>,
        description: 'I build performance models for Apple silicon, including A-series and M-series SoCs. I use them to understand where workloads spend time and to compare hardware and software design choices.'
    },
    {
        company: 'Qualcomm',
        link: 'https://www.qualcomm.com/home',
        role: 'Camera System Architect',
        duration: '2 years & 2 months',
        description: 'I worked on the architecture of the Spectra image signal processor across multiple Snapdragon generations. I developed simulation tools to trace how camera data moved through the ISP and to evaluate the performance and efficiency of proposed pipeline designs.',
        platforms: (
            <ul className="experience-platforms" aria-label="Snapdragon platforms">
                <li><a href="https://www.qualcomm.com/smartphones/products/8-series/snapdragon-8-elite-mobile-platform">Snapdragon 8 Elite (SM8750)</a></li>
                <li><a href="https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-8-Elite-Gen-5-product-brief.pdf">Snapdragon 8 Elite Gen 5 (SM8850)</a></li>
                <li>
                    Snapdragon 8 Elite Extreme Gen 6 · <span className="whitespace-nowrap">
                        <a href="https://www.qualcomm.com/smartphones/products/8-series/snapdragon-8-elite-extreme-gen-6-mobile-platform">SM8975</a>{' '}
                        (<a href="https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-8-Elite-Gen-6-Product-Brief.pdf">SM8950</a>)
                    </span>
                </li>
                <li>+1</li>
            </ul>
        ),
    },
    {
        company: 'Dolby Laboratories',
        link: 'https://www.dolby.com/',
        role: 'Image Engineering Intern',
        duration: '6 Months',
        description: 'I used particle swarm optimization to recover Dolby Vision metadata from paired HDR and SDR images. I also implemented and evaluated published deep learning methods for HDR photo enhancement.'
    },
    {
        company: 'YITU Technology',
        link: 'https://www.yitutech.com/en',
        role: 'Computer Vision Research Intern',
        duration: '3 Months',
        description: 'I trained and evaluated object detectors, including the Single Shot MultiBox Detector (SSD), for urban scenes.'
    }
  ];

  const education = [
    {
        school: 'University of California, Los Angeles',
        link: 'https://www.cs.ucla.edu/',
        degree: 'Master of Science in Computer Science',
        period: '09/2021 - 06/2023',
        courses: [
            { name: 'Large-Scale Data Mining', url: 'https://www.bruinwalk.com/classes/ec-engr-219/' },
            { name: 'Parallel Computer Architecture', url: 'https://www.bruinwalk.com/classes/com-sci-251b/' },
            { name: 'Advanced Computer Architecture', url: 'https://www.bruinwalk.com/classes/com-sci-251a/' },
            { name: 'Automated Reasoning', url: 'https://www.bruinwalk.com/classes/com-sci-264a/' },
            { name: 'Parallel & Distributed Computing', url: 'https://www.bruinwalk.com/classes/com-sci-133/' },
            { name: 'Artificial Life for Graphics/Vision', url: 'https://www.coursicle.com/ucla/courses/COMSCI/275/' },
            { name: 'Deep Learning', url: 'https://bruinlearn.ucla.edu/courses/108940' },
            { name: 'Software Engineering', url: 'https://bruinlearn.ucla.edu/courses/109762' },
            { name: 'Computer Networks', url: 'https://bruinlearn.ucla.edu/courses/109760' },
            { name: 'Optimization', url: 'https://ccle.ucla.edu/course/view/21F-MATH273A-1' }
        ]
    },
    {
        school: 'University of Illinois at Urbana-Champaign',
        link: 'https://ece.illinois.edu/',
        degree: 'Bachelor of Science in Computer Engineering',
        period: '08/2017 - 05/2021',
        courses: [
            { name: 'Computer Organization & Design', url: 'https://courses.grainger.illinois.edu/ece411/fa2021/course.html' },
            { name: 'Machine Learning', url: 'https://relate.cs.illinois.edu/course/CS446-fa20/' },
            { name: 'Computational Photography', url: 'https://courses.engr.illinois.edu/cs445/fa2020/' },
            { name: 'Algorithms', url: 'https://courses.engr.illinois.edu/cs374/fa2020/' },
            { name: 'Multimedia Signal Processing', url: 'https://courses.engr.illinois.edu/ece417/fa2020/' },
            { name: 'Robotics', url: 'https://publish.illinois.edu/ece470-intro-robotics/syllabus/' },
            { name: 'Database Systems', url: 'https://cs.illinois.edu/academics/courses/CS411' },
            { name: 'Safe Autonomy', url: 'https://publish.illinois.edu/safe-autonomy/' },
            { name: 'Artificial Intelligence', url: 'https://ece.illinois.edu/academics/courses/profile/ECE448' },
            { name: 'Operating Systems', url: 'https://ece.illinois.edu/academics/courses/profile/ECE391' },
            { name: 'Digital System Lab', url: 'https://ece.illinois.edu/academics/courses/profile/ECE385' }
        ]
    }
  ];

  return (
    <div ref={containerRef} className="w-full px-6 md:px-12 pt-32 pb-24 min-h-screen bg-[#faf9f6]">
      <div className="max-w-[1800px] mx-auto">
        
        <header className="about-intro">
          <h1 className="portfolio-title">About</h1>
          <p>I’m Zongnan Bao (<span lang="zh-Hans" className="chinese-name">鲍宗南</span>). I work on performance modeling and hardware/software co-design
            for Apple silicon, including A-series and M-series SoCs. Previously, I worked on image signal
            processor architecture for Qualcomm Snapdragon.</p>
          <p>I’m interested in machine learning systems, especially how compute, memory, and software
            shape the performance of large language models and diffusion models.</p>
        </header>

        <div className="mt-12 md:mt-16 flex flex-col gap-8 md:gap-20 font-rubik">
          <AboutSection title="Recent updates">
            <ol className="updates-section">
              {updates.map(({ title, post }) => (
                <li key={post?.slug ?? title} className="border-b border-black/10 last:border-0 py-4 first:pt-0 last:pb-0">
                  <span className="block mb-1 text-xs uppercase tracking-widest opacity-60">{post ? 'On the blog' : 'At work'}</span>
                  {post ? (
                    <a className="group flex items-center justify-between gap-4" href={`#blog/${post.slug}`}>
                      <span className="text-lg font-medium group-hover:underline">{title}</span>
                      <img className="w-16 h-auto shrink-0" src={post.cover.src} alt="" width={post.cover.width} height={post.cover.height} loading="lazy" />
                    </a>
                  ) : <p className="text-lg font-medium">{title}</p>}
                </li>
              ))}
            </ol>
          </AboutSection>
          <AboutSection title="Experience">
            <div className="flex flex-col gap-12">
                {experiences.map((exp, i) => (
                    <div key={i} className="group border-b border-black/10 pb-12 last:border-0">
                        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-2">
                            <a href={exp.link} target="_blank" rel="noreferrer" className="text-xl md:text-2xl font-bold flex items-center gap-2 transition-all duration-300 hover:text-black/60 text-black">
                                {exp.company} <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <span className="text-xs uppercase tracking-widest opacity-50 mt-1 md:mt-0 text-black">{exp.duration}</span>
                        </div>
                        <div className="text-lg font-medium mb-4 text-black">{exp.role}</div>
                        <p className="opacity-80 max-w-3xl leading-relaxed text-black text-base">{exp.description}</p>
                        {exp.platforms}
                    </div>
                ))}
            </div>
          </AboutSection>
          <AboutSection title="Education">
            <div className="flex flex-col gap-16">
                {education.map((edu, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-baseline justify-between">
                             <a href={edu.link} target="_blank" rel="noreferrer" className="text-xl md:text-2xl font-bold transition-all duration-300 hover:text-black/60 max-w-2xl text-black">
                                {edu.school}
                             </a>
                             <span className="text-xs uppercase tracking-widest opacity-50 mt-1 md:mt-0 shrink-0 text-black">{edu.period}</span>
                        </div>
                        <div className="text-lg font-medium text-black">{edu.degree}</div>
                        
                        <div className="mt-2">
                            <span className="text-xs uppercase tracking-widest opacity-50 block mb-2 text-black">Relevant Coursework</span>
                            <div className="flex flex-wrap gap-2">
                                {edu.courses.map((c, idx) => (
                                    c.url ? (
                                        <a 
                                            key={idx} 
                                            href={c.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="border border-black/10 px-3 py-1 rounded-full text-xs uppercase tracking-wide bg-white hover:bg-[#111] hover:text-[#faf9f6] transition-colors cursor-pointer text-black"
                                        >
                                            {c.name}
                                        </a>
                                    ) : (
                                        <span 
                                            key={idx} 
                                            className="border border-black/10 px-3 py-1 rounded-full text-xs uppercase tracking-wide bg-white hover:bg-[#111] hover:text-[#faf9f6] transition-colors cursor-default text-black"
                                        >
                                            {c.name}
                                        </span>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </AboutSection>
          <AboutSection title="Patents">
            <a
              href="https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024107472"
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <h3 className="text-lg md:text-xl font-medium mb-2 text-black transition-colors duration-300 group-hover:text-black/60">
                Estimating Metadata for Images Having Absent Metadata or Unusable Form of Metadata
              </h3>
              <p className="text-sm uppercase tracking-widest opacity-50 text-black">Dolby Laboratories, Inc.</p>
            </a>
          </AboutSection>
        </div>
      </div>
    </div>
  );
};
