# webgl-png-compress
ES6 module for fast PNG quantization with WebGL

`npm install webgl-png-compress`

## How do I use it?
This module exposes three functions:

### Compress
```javascript
function compress (imageData, width, height, gl, n, iterations)
```

Use this generate a palette through iterative k-means.

`imageData` should be in raw format as extracted from a 2D canvas.

```javascript
const context = imageCanvas.getContext('2d')
context.drawImage(this.image, 0, 0)
const imageData = context.getImageData(0, 0, this.image.width, this.image.height)

```

`n` cluster centers are placed in the image at random and then the designated number of iterations of k-means are performed
to converge to an optimized palette.

Returns the generated palette.

### Condense Palette
```javascript
function condensePalette (palette, eps=0)
```

Use this to remove degenerate entries from the palette based the tolerence specified as `eps`.

Returns the reduced palette.

### Write PNG
```javascript
function writePNG (imageData, palette, width, height)
```

Creates a buffer containing a quantized PNG with a `PLTE` block from the original `imageData` with
[Floyd-Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering) applied.

Returns the buffer.

## How does it work?

PNGs are capable of displaying palettized images by declaring a `PLTE` chunk. See the [specification](http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html) for more details.

Once a palette chunk is declared, the image data can be made up of 8-bit indices that reference colors in the palette, as opposed to each pixel declared independently as a 24-bit color. Palette based compression will always reduced the image size by `~30%` when compared to uncompressed PNG images.

However, the real gain from this type of compression comes from the fact the PNG data chunk is compressed with [Deflate](https://www.w3.org/TR/PNG-Compression.html) (a LZ77 based compression).

Replacing colors with indices makes the data much more compressible, particularly in vector images that may have long linear stretches of repeated colors. 

This project uses k-means to generate an optimized palette from a source image, and that palette (or any other palette) can be used to write out a new, compressed image.

:warning: **WARNING** :warning:

`You can compress any image loadable in the browser (including JPG), but for certain types of images (particularly photographs), the PNG compression may not perform as well as the compression that has likely already been applied to the JPG.`

## How does it use WebGL?

Each pixel is treated as a vertex with a shader. The shader is used to map the pixel to the closest cluster center.
Rather than iteratively comparing each pixel against the cluster centers, it happens in parallel for all pixels
on your GPU.

It is recommended to downscale large images for palette generation to avoid running out of GPU memory.
