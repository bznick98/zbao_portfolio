| Changing the focus distance | Fused photograph |
| --- | --- |
| ![A sequence of macro photographs, with different parts of the fly coming into focus.](/blog/focus/fly.gif) | ![The stack resolves detail across the fly’s eyes, antennae, and mouthparts.](/blog/focus-output.webp) |

## One subject, several focus distances

Look at the bristles between the fly’s eyes. When those are sharp, parts of the eyes fall outside the lens’s shallow depth of field. Changing the focus distance brings the eyes into focus and lets the bristles blur. If the camera and subject stay still, each frame records detail that another frame misses.

Focus stacking combines those frames into a photograph with greater apparent depth of field. The inputs need to be aligned so that a feature occupies the same position in each frame. [A photographer’s guide to focus stacking](https://phlearn.com/magazine/focus-stacking-master-best-kept-secret-sharp-photos/)

## Finding the sharp detail

I compared two approaches. One finds the maximum response to a Laplacian-of-Gaussian filter, which responds strongly to local intensity changes. The other compares detail at several spatial scales using a Laplacian pyramid. The pyramid method gave the best results in my examples.

Start by repeatedly smoothing and downsampling each frame to build a Gaussian pyramid. Expand each coarser image back to the size of the level above it, then subtract it from that finer level. What remains is a band of detail lost in smoothing. Keep these bands and the coarsest image, and you can reconstruct the original by repeatedly expanding and adding. [Laplacian pyramid decomposition](https://sepwww.stanford.edu/data/media/public/sep/morgan/texturematch/paper_html/node3.html)

![Diagram of a Laplacian pyramid, showing images and detail bands at successively smaller scales.](/blog/focus/lpd.webp)

Wang and Chang use the detail in these pyramids to estimate local focus. At a given position, a fine edge generally produces a stronger response in the frame where it is sharp. That evidence guides which detail to take from each frame. Reconstructing the fused pyramid yields one photograph. My Python implementation extends this idea to stacks of multiple color images. [Wang and Chang, *A Multi-focus Image Fusion Method Based on Laplacian Pyramid*](https://www.jcomputers.us/vol6/jcp0612-07.pdf)

## Running the implementation

Install the project dependencies with Pipenv, then run the stacker on the included example directory.

```sh
git clone https://github.com/bznick98/Focus_Stacking.git
cd Focus_Stacking
pipenv install
pipenv run python run.py assets/test_images/test6/
```

You can also supply individual image files. Use the help command to see output and debugging options.

```sh
pipenv run python run.py frame01.jpg frame02.jpg frame03.jpg
pipenv run python run.py -h
```

## Measuring the result

I measured the average gradient magnitude of each image. Larger changes between adjacent pixel values raise this score, so it gives a rough indication of sharpness. For each stack, I compared the mean of the source-frame scores with the score for the fused image.

| Example | Source frames, mean | Fused image |
| --- | ---: | ---: |
| 1 | 24.71 | **26.93** |
| 2 | 10.32 | **12.75** |
| 3 | 5.47 | **10.61** |
| 4 | 9.24 | **11.73** |

### Example 1

![First test stack and the result of combining the in-focus regions.](/blog/focus/demo.webp)

### Example 2

For the remaining three examples, I captured individual frames from the Helicon Focus gallery and ran my own fusion method on them. The outputs were visually similar to the gallery results. [Helicon Focus example photographs](https://www.heliconsoft.com/helicon-focus-gallery/)

![Second test stack, showing the source frames alongside the fused macro photograph.](/blog/focus/macro-plot.webp)

### Example 3

![Fly photographs at successive focus positions and the reconstructed image.](/blog/focus/fly-plot.webp)

### Example 4

![Fourth test stack and the fused result, showing detail along the length of the subject.](/blog/focus/gun-plot.webp)

All four fused images scored above their source-frame averages. A sharpness score alone can miss a doubled edge or a noisy patch, so I also inspect the result at full size. A broader test set and a measure sensitive to alignment and fusion artifacts would make the comparison more informative.
