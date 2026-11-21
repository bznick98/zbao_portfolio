## The problem

In the first photograph below, the umbrella is almost a silhouette. An editor can lift the exposure, inspect the buildings and the sky, then adjust the color. I wanted a learned editor with that same sequence of inspectable steps. The challenge was making it practical for high-resolution photographs.

| Input photograph | Bilateral operator output |
| --- | --- |
| ![Underexposed street scene with a person carrying an umbrella.](/blog/bilateral-input.webp) | ![The same rainy street with detail visible in the sky, buildings and coat.](/blog/bilateral-output.webp) |
| ![Second underexposed input photograph.](/blog/bilateral/demo-2-in.webp) | ![Second photograph after the sequence of learned exposure and color adjustments.](/blog/bilateral/demo-2-out.webp) |

Image enhancement covers exposure correction, white balance, and other changes that make a raw or poorly exposed image easier to view. Those changes can also affect what a downstream system, such as an object detector, can distinguish. Here I evaluate against photographs edited by a human expert.

## Choosing a model

I considered four approaches to learned image enhancement.

- **Bilateral grids.** HDRNet predicts a grid of local color transformations from a downsampled preview. At full resolution, a guide value for each pixel determines which coefficients to sample. Nearby pixels on opposite sides of an edge can therefore receive different corrections. [Deep Bilateral Learning](https://groups.csail.mit.edu/graphics/hdrnet/)
- **Conditional image generation.** Pix2Pix learns a mapping between paired images. For photographic retouching, the cost of running a generator and the risk of introducing visible artifacts made this approach less attractive for my use case. [Pix2Pix](https://phillipi.github.io/pix2pix/)
- **3D lookup tables.** Image-adaptive LUTs learn a compact mapping from input color to output color. They can produce smooth results quickly. The learned mapping offers less visibility into which photographic adjustment was responsible for a change. [Image-adaptive 3D LUTs](https://arxiv.org/abs/2009.14468) and [AdaInt](https://arxiv.org/abs/2204.13983)
- **Sequential retouching.** Neural Color Operators predicts an ordered sequence of adjustments with a strength for each one. The intermediate outputs are useful to a photographer, although the original operators process the full-resolution image at every stage. Other multi-stage approaches include HINet and MAXIM. [Neural Color Operators](https://arxiv.org/abs/2207.08080)

![Architecture of the original Neural Color Operators model, with sequential operators and strength prediction.](/blog/bilateral/neural_ops_arch.webp)

## A bilateral operator for each edit

I kept the sequential design and replaced each full-resolution operator with a lightweight bilateral network. The four stages in this experiment were black clipping, exposure, white balance, and vibrance. After each stage there is a full-resolution image to inspect or pass to the next operator.

![Architecture of the bilateral model showing the preview branch, predicted grid and full-resolution guide.](/blog/bilateral/bilateral_ops_arch.webp)

1. **Predict the grid.** Resize the input to a 256 × 256 RGB preview and predict an 8 × 64 × 64 bilateral grid. Each cell stores twelve coefficients for a local affine RGB transform, with three weights and an offset for each output channel.
2. **Apply it at full resolution.** Predict a single-channel guide map at the original image size. For each pixel, its position and guide value locate the coefficients to interpolate from the grid. Apply those coefficients to its original RGB value. This operation, called slicing, preserves variation within the full-resolution image. [Bilateral grid slicing](https://doi.org/10.1145/1276377.1276506)
3. **Control the strength.** A predictor with two convolutional layers, global pooling, and fully connected layers produces a scalar strength for each operator. This lets the model learn how far to move each adjustment for a particular image.

## Data and training

I used FiveK-Dark, the processing of MIT–Adobe FiveK used by CSRNet and the Neural Operators comparison. The source dataset pairs 5,000 raw photographs with professional edits. FiveK-Dark uses Expert C’s edits, cropped to 500 × 300 or 300 × 500 depending on orientation. The split was 4,500 images for training and 500 for testing. [MIT–Adobe FiveK](https://data.csail.mit.edu/graphics/fivek/) and [CSRNet](https://github.com/hejingwenhejingwen/CSRNet)

The original operator initialization data was only partially available. For each operation, I generated 500 scenes with 20 Lightroom edits per scene at strengths ranging from 0% to 100%. I used the same initialization data to reproduce the Neural Operators baseline. Paired low-light datasets such as LOL and VE-LOL were candidates for future evaluation. [LOL](https://daooshee.github.io/BMVC2018website/) and [VE-LOL](https://flyywh.github.io/IJCV2021LowLight_VELOL/)

I implemented the model in PyTorch and stored experiment settings in YAML. Training had two phases. First, each bilateral operator learned separately from an image, an adjustment strength, and the corresponding Lightroom result. I then attached the encoder and strength predictors and trained the stages jointly.

| Training setting | Value |
| --- | --- |
| Optimizer | Adam, β₁ = 0.9, β₂ = 0.99 |
| Weight decay | 10⁻⁸ |
| Batch size | 1 |
| Individual operator training | 400 epochs |
| Joint training | 134 epochs |

### What the losses captured

I tried L1 and L2 pixel losses, a combined structural-similarity and L1 loss, and a differentiable histogram-matching loss. SSIM–L1 helped preserve intensity structure. Histogram matching improved color consistency compared with L1 alone. The difference matters when an image has the right visible detail but a noticeably different cast from the target edit.

## Image quality on FiveK-Dark

Higher PSNR and SSIM are better. Lower ΔE and LPIPS are better. The published Neural Operators result and my reproduction are listed separately because their initialization data differed. The other baselines are as reported in the Neural Operators paper. A dash marks a metric that was not reported.

| Model | PSNR (dB) | SSIM | ΔE | LPIPS | Parameters |
| --- | ---: | ---: | ---: | ---: | ---: |
| White-Box | 18.59 | 0.797 | 17.42 | — | 8,561,762 |
| Distort & Recover | 19.54 | 0.800 | 15.44 | — | 259,263,320 |
| HDRNet | 22.65 | 0.880 | 11.83 | — | 482,080 |
| DUPE | 20.22 | 0.829 | 16.63 | — | 998,816 |
| MIRNet | 19.37 | 0.806 | 16.51 | — | 31,787,419 |
| Pix2Pix | 21.41 | 0.749 | 13.26 | — | 11,383,427 |
| 3D-LUT | 23.12 | 0.874 | 11.26 | — | 593,516 |
| CSRNet | 23.86 | 0.897 | 10.57 | — | 36,489 |
| Neural Operators, published | 24.32 | 0.907 | 9.795 | 0.045 | 28,108 |
| Neural Operators, reproduced | 24.04 | 0.898 | 10.333 | 0.048 | 28,108 |
| **Bilateral Operators** | **24.22** | **0.906** | **9.830** | **0.043** | **69,012** |

The bilateral model used more parameters than Neural Operators and fell between the reproduced and published baselines on PSNR. Its strongest practical advantage appeared as the image resolution increased.

## Runtime and memory

I measured single-image inference on an NVIDIA Tesla T4 with 16 GB of GPU memory, an eight-core Intel Xeon 8259CL at 2.50 GHz, and 32 GB of system RAM. Each cell lists elapsed time, approximate frames per second, and memory consumption.

| Resolution | Neural Operators | Bilateral Operators |
| --- | --- | --- |
| 500 × 300 | 8.26 ms · 121 fps · 262 MB | 6.78 ms · 147 fps · 55 MB |
| 1200 × 900 | 44.41 ms · 22 fps · 1.61 GB | 32.86 ms · 30 fps · 266 MB |
| 2500 × 1200 | 121.14 ms · 8 fps · 4.43 GB | 87.05 ms · 11 fps · 702 MB |
| 4000 × 3000 | Out of memory | 350.22 ms · 2 fps · 2.70 GB |

The preview keeps most intermediate activations small. Memory still grows with the guide, slicing operation, and output image. At 12 megapixels, the bilateral model finished the edit while the original operator ran out of memory on the same hardware.

## Looking at the outputs

Read each strip from left to right as the input, prediction, target edit, and L2 difference between the prediction and target. In each pair the bilateral model appears first and the original Neural Operators model follows. The difference images expose color shifts that are easy to overlook in a single SSIM score.

### Scene 1

![Scene one, bilateral model input, prediction, target and difference.](/blog/bilateral/color-5.webp)

![Scene one, original Neural Operators comparison.](/blog/bilateral/neurop-5.webp)

### Scene 2

![Scene two, bilateral model input, prediction, target and difference.](/blog/bilateral/color-6.webp)

![Scene two, original Neural Operators comparison.](/blog/bilateral/neurop-6.webp)

### Scene 3

![Scene three, bilateral model input, prediction, target and difference.](/blog/bilateral/color-9.webp)

![Scene three, original Neural Operators comparison.](/blog/bilateral/neurop-9.webp)

## What I would change next

Predicting the transforms on a preview retained the intermediate editing steps and made larger photographs practical. Color fidelity was the clearest remaining problem. I would supervise each operator’s intermediate output during joint training and compare it directly with the corresponding Lightroom edit. That would help pinpoint which adjustment introduces a color shift before it propagates through the rest of the sequence.

## References

1. Wang et al. [Neural Color Operators for Sequential Image Retouching](https://arxiv.org/abs/2207.08080). ECCV, 2022.
2. Gharbi et al. [Deep Bilateral Learning for Real-Time Image Enhancement](https://groups.csail.mit.edu/graphics/hdrnet/). SIGGRAPH, 2017.
3. Bychkovsky et al. [Learning Photographic Global Tonal Adjustment with a Database of Input/Output Image Pairs](https://data.csail.mit.edu/graphics/fivek/). CVPR, 2011.
4. Zhao et al. [Loss Functions for Image Restoration with Neural Networks](https://doi.org/10.1109/TCI.2016.2644865). IEEE Transactions on Computational Imaging, 2017.
5. Zeng et al. [Learning Image-Adaptive 3D Lookup Tables for High Performance Photo Enhancement in Real-Time](https://arxiv.org/abs/2009.14468). IEEE TPAMI.
6. Yang et al. [AdaInt: Learning Adaptive Intervals for 3D Lookup Tables on Real-Time Image Enhancement](https://arxiv.org/abs/2204.13983). CVPR, 2022.
7. Chen, Paris, and Durand. [Real-Time Edge-Aware Image Processing with the Bilateral Grid](https://doi.org/10.1145/1276377.1276506). SIGGRAPH, 2007.
8. Isola et al. [Image-to-Image Translation with Conditional Adversarial Networks](https://phillipi.github.io/pix2pix/). CVPR, 2017.
9. Chen et al. [HINet: Half Instance Normalization Network for Image Restoration](https://openaccess.thecvf.com/content/CVPR2021W/NTIRE/papers/Chen_HINet_Half_Instance_Normalization_Network_for_Image_Restoration_CVPRW_2021_paper.pdf). CVPR Workshops, 2021.
10. Tu et al. [MAXIM: Multi-Axis MLP for Image Processing](https://openaccess.thecvf.com/content/CVPR2022/papers/Tu_MAXIM_Multi-Axis_MLP_for_Image_Processing_CVPR_2022_paper.pdf). CVPR, 2022.
11. Liu et al. [Benchmarking Low-Light Image Enhancement and Beyond](https://flyywh.github.io/IJCV2021LowLight_VELOL/). International Journal of Computer Vision, 2021.
12. He et al. [Conditional Sequential Modulation for Efficient Global Image Retouching](https://github.com/hejingwenhejingwen/CSRNet). ECCV, 2020.
13. Avi-Aharon, Arbelle, and Raviv. [DeepHist: Differentiable Joint and Color Histogram Layers for Image-to-Image Translation](https://arxiv.org/abs/2005.03995), 2020.
14. Kingma and Ba. [Adam: A Method for Stochastic Optimization](https://arxiv.org/abs/1412.6980), 2014.
