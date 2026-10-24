# Image workflow

This directory contains static presentation assets:

- [banner.png](../banner.png) is consumed by [README.md](../../../../README.md) as the header showcase banner.
- [banner.svg](../banner.svg) and [icon.svg](../icon.svg) serve as scalable vector sources for marketing and documentation.

```mermaid
flowchart LR
    VectorMaster["banner.svg / icon.svg"] --> RenderScript["scratch/build_brand_assets.py"]
    RenderScript --> BannerPNG["banner.png"]
    BannerPNG --> ReadmeDoc["README.md"]
```
