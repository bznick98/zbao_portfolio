export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  summary: string;
  figures: { src: string; alt: string; caption: string }[];
  sections: { heading: string; paragraphs: string[] }[];
  reviewers?: string;
  links: { label: string; href: string }[];
}

export const posts: BlogPost[] = [
  {
    slug: 'bilateral-neural-operators',
    title: 'Learning sequential image enhancement in bilateral space',
    category: 'UCLA capstone',
    summary: 'A photo editor that learns a sequence of adjustments on a small preview, then applies them to the full-resolution photograph.',
    figures: [
      { src: '/blog/bilateral-input.webp', alt: 'A dark street scene with a person carrying an umbrella', caption: 'Input photograph' },
      { src: '/blog/bilateral-output.webp', alt: 'The same scene after enhancement, with the sky, coat and buildings visible', caption: 'Bilateral operator output' },
    ],
    reviewers: 'Achuta Kadambi, Bolei Zhou and Aditya Grover',
    sections: [
      { heading: 'What can a preview tell us?', paragraphs: [
        'When I edit a photograph, I can inspect it after each adjustment. I wanted to keep that intermediate view in a learned editor. The difficulty is scale. Running a neural network over every pixel for every adjustment gets expensive as the photo grows.',
      ] },
      { heading: 'Predict small, apply at full resolution', paragraphs: [
        'Each stage of the model starts with a 256 × 256 copy of the image. From that copy it predicts a bilateral grid. A cell holds twelve coefficients, enough to mix three input color channels and add an offset for each output channel.',
        'A guide map at the original resolution tells each pixel where to sample the grid. Two nearby pixels on opposite sides of an edge can therefore receive different corrections. Each stage has a learned strength, and its output becomes the next stage’s input.',
      ] },
      { heading: 'Where the savings showed up', paragraphs: [
        'On a Tesla T4, the 1200 × 900 test took 32.86 ms and used 266 MB. The NeuralOps comparison took 44.41 ms and used 1.61 GB. At 4000 × 3000 my model completed the image in 350.22 ms, while the comparison ran out of memory.',
        'On MIT–Adobe FiveK, the model scored 24.22 dB PSNR. That falls between my NeuralOps reproduction (24.04 dB) and the published baseline (24.32 dB). For this project, the clearest gain was the size of image I could process while retaining comparable quality.',
      ] },
    ],
    links: [
      { label: 'Read the paper (PDF)', href: '/blog/capstone-zongnan-bao.pdf' },
      { label: 'Project on GitHub', href: 'https://github.com/bznick98/bilateral-image-enhance' },
    ],
  },
  {
    slug: 'focus-stacking',
    title: 'Focus stacking with Laplacian pyramids',
    category: 'Computational photography',
    summary: 'How I combined the sharp parts of several macro photographs into a single image with more depth of field.',
    figures: [
      { src: '/blog/focus-input.webp', alt: 'One frame of a fly with fine facial details out of focus', caption: 'One frame from the stack' },
      { src: '/blog/focus-output.webp', alt: 'The combined frame resolves hairs and facets across the fly’s face', caption: 'Fused result' },
    ],
    sections: [
      { heading: 'One subject, several focus distances', paragraphs: [
        'Look at the hairs between the fly’s eyes. In one frame they blur together. Move the focus and they come into view, but another part of the face softens. A stationary subject gives us a way around that tradeoff. Keep the composition fixed and photograph it at several focus distances.',
      ] },
      { heading: 'Finding the sharp parts', paragraphs: [
        'I compared a maximum Laplacian-of-Gaussian response with a pyramid method inspired by Wang and Chang. The pyramid breaks each photograph into bands of detail. At each level, subtracting an expanded, coarser image leaves the detail lost at that scale.',
        'Focus changes those bands. An eyelash gives a stronger local response in the frame where it is sharp. The algorithm uses local detail to combine the bands across frames, then reconstructs the photograph from coarse to fine. My Python implementation accepts multiple color frames. It expects the frames to be aligned.',
      ] },
      { heading: 'Reading the result', paragraphs: [
        'In the first example from my original write-up, the mean gradient magnitude rose from 24.71 across the source frames to 26.93 in the fused image. That measures a change in local contrast. I also inspect edges at full size, where a slight shift between frames can turn one fine hair into two.',
        'To try the example stack from the project directory, run python run.py assets/test_images/test6/. The repository includes the images, setup instructions and a debug view of the pyramid levels.',
      ] },
    ],
    links: [
      { label: 'Project on GitHub', href: 'https://github.com/bznick98/Focus_Stacking' },
      { label: 'Original write-up and examples', href: 'https://github.com/bznick98/bznick98.github.io/blob/master/_projects/2023-02-06-Focus-Stacking.md' },
    ],
  },
];
