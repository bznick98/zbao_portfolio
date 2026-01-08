import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowUpRight } from 'lucide-react';

export const Profile: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
        gsap.fromTo('.profile-anim', 
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out' }
        );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const experiences = [
    {
        company: 'Apple',
        link: 'https://www.apple.com/',
        role: 'Hardware and Software Modeling Engineer',
        duration: 'Present',
        description: 'Working on performance modeling and analysis for Apple Silicons.'
    },
    {
        company: 'Qualcomm',
        link: 'https://www.qualcomm.com/home',
        role: 'Camera System Architect',
        duration: '2 years & 2 months',
        description: 'Worked on the Spectra ISP as a Camera System Architecture Engineer, focusing on modeling and analyzing next-generation imaging pipelines. Developed frameworks to simulate camera dataflows and evaluate new architectural ideas, guiding design decisions to improve efficiency, performance, and user experience.'
    },
    {
        company: 'Dolby Laboratories',
        link: 'https://www.dolby.com/',
        role: 'Image Engineering Intern',
        duration: '6 Months',
        description: 'Focused on restoring image metadata from HDR/SDR pairs using Particle Swarm Optimization (PSO) for Dolby Vision. Conducted research and implemented deep learning papers to enhance HDR photos.'
    },
    {
        company: 'YITU Technology',
        link: 'https://www.yitutech.com/en',
        role: 'Computer Vision Research Intern',
        duration: '3 Months',
        description: 'Trained, evaluated, and improved object detection algorithms like SSD to help make cities smarter through computer vision.'
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
        
        {/* Title - Kept consistent (Rubik Spray Paint) */}
        <div className="mb-24 profile-anim">
            <h1 className="text-[10vw] md:text-[12vw] leading-none font-bold tracking-normal uppercase text-[#111]">Profile</h1>
        </div>

        {/* Content - Switched to Rubik for readability */}
        <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 gap-y-24 font-rubik">

            {/* BIO SECTION */}
            <div className="col-span-12 md:col-span-3 profile-anim">
                <span className="text-sm uppercase tracking-widest opacity-50 border-t border-black pt-4 inline-block w-full">About</span>
            </div>
            <div className="col-span-12 md:col-span-9 flex flex-col gap-8 profile-anim">
                <p className="text-lg md:text-xl leading-relaxed text-[#111]">
                    Hello, I'm <span className="font-bold">Zongnan Bao (鲍宗南)</span>.
                </p>
                <div className="text-base md:text-lg opacity-80 max-w-2xl text-[#111]">
                    <p className="mb-4">
                        Outside of work and academics, I love photography and enjoy sharing my work. I'm honored to be a top 1,000 contributor on <a href="https://unsplash.com/@nick19981122" target="_blank" rel="noreferrer" className="underline hover:text-black/60 transition-colors">Unsplash</a>, with over 200M views and over 1M downloads.
                    </p>
                    <p>
                        I also have a passion for music, starting with classical guitar and later exploring fingerstyle.
                    </p>
                </div>
            </div>

            {/* EXPERIENCE SECTION */}
            <div className="col-span-12 md:col-span-3 profile-anim">
                <span className="text-sm uppercase tracking-widest opacity-50 border-t border-black pt-4 inline-block w-full">Experience</span>
            </div>
            <div className="col-span-12 md:col-span-9 flex flex-col gap-12 profile-anim">
                {experiences.map((exp, i) => (
                    <div key={i} className="group border-b border-black/10 pb-12 last:border-0">
                        <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-2">
                            <a href={exp.link} target="_blank" rel="noreferrer" className="text-xl md:text-2xl font-bold flex items-center gap-2 transition-all duration-300 hover:text-black/60 text-[#111]">
                                {exp.company} <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <span className="text-xs uppercase tracking-widest opacity-50 mt-1 md:mt-0 text-[#111]">{exp.duration}</span>
                        </div>
                        <div className="text-lg font-medium mb-4 text-[#111]">{exp.role}</div>
                        <p className="opacity-80 max-w-3xl leading-relaxed text-[#111] text-base">{exp.description}</p>
                    </div>
                ))}
            </div>

            {/* EDUCATION SECTION */}
            <div className="col-span-12 md:col-span-3 profile-anim">
                <span className="text-sm uppercase tracking-widest opacity-50 border-t border-black pt-4 inline-block w-full">Education</span>
            </div>
            <div className="col-span-12 md:col-span-9 flex flex-col gap-16 profile-anim">
                {education.map((edu, i) => (
                    <div key={i} className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-baseline justify-between">
                             <a href={edu.link} target="_blank" rel="noreferrer" className="text-xl md:text-2xl font-bold transition-all duration-300 hover:text-black/60 max-w-2xl text-[#111]">
                                {edu.school}
                             </a>
                             <span className="text-xs uppercase tracking-widest opacity-50 mt-1 md:mt-0 shrink-0 text-[#111]">{edu.period}</span>
                        </div>
                        <div className="text-lg font-medium text-[#111]">{edu.degree}</div>
                        
                        <div className="mt-2">
                            <span className="text-xs uppercase tracking-widest opacity-50 block mb-2">Relevant Coursework</span>
                            <div className="flex flex-wrap gap-2">
                                {edu.courses.map((c, idx) => (
                                    c.url ? (
                                        <a 
                                            key={idx} 
                                            href={c.url} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="border border-black/10 px-3 py-1 rounded-full text-xs uppercase tracking-wide bg-white hover:bg-[#111] hover:text-[#faf9f6] transition-colors cursor-pointer text-[#111]"
                                        >
                                            {c.name}
                                        </a>
                                    ) : (
                                        <span 
                                            key={idx} 
                                            className="border border-black/10 px-3 py-1 rounded-full text-xs uppercase tracking-wide bg-white hover:bg-[#111] hover:text-[#faf9f6] transition-colors cursor-default text-[#111]"
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

            {/* PATENT SECTION */}
            <div className="col-span-12 md:col-span-3 profile-anim">
                <span className="text-sm uppercase tracking-widest opacity-50 border-t border-black pt-4 inline-block w-full">Patents</span>
            </div>
            <div className="col-span-12 md:col-span-9 profile-anim">
                 <a 
                    href="https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024107472" 
                    target="_blank" 
                    rel="noreferrer"
                    className="group block"
                 >
                    <h3 className="text-lg md:text-xl font-medium mb-2 text-[#111] transition-colors duration-300 group-hover:text-black/60">
                        Estimating Metadata for Images Having Absent Metadata or Unusable Form of Metadata
                    </h3>
                    <p className="text-sm uppercase tracking-widest opacity-50 text-[#111]">Dolby Laboratories, Inc.</p>
                 </a>
            </div>

        </div>
      </div>
    </div>
  );
};