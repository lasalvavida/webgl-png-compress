# webgl-png-compress
ES6 module to use WebGL for fast PNG quantization

`npm install webgl-png-compress`

## How do I use it?
This module exposes three functions:

### Compress
```javascript
function compress (image, canvas2d, gl, n, iterations)
```

Use this generate a palette through iterative k-means.

The image is rendered onto the 2D canvas to extract the pixel data, so any format supported by your web browser will work.

`n` cluster centers are placed in the image at random and then the designated number of iterations of k-means are performed
to converge to an optimized palette.

Returns the generated palette.

### Condense Palette
```javascript
function condensePalette(palette, eps=0)
```

Use this to remove degenerate entries from the palette based the tolerence specified as `eps`.

Returns the reduced palette.

### Write PNG
```javascript
writePNG (pixelData, palette, width, height)
```

Creates a buffer containing a quantized PNG with a `PLTE` block from the original `pixelData` with
[Floyd-Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering) applied.

Returns the buffer.

## How does it use WebGL?

Each pixel is treated as a vertex with a shader. The shader is used to map the pixel to the closest cluster center.
Rather than iteratively comparing each pixel against the cluster centers, it happens in parallel for all pixels
on your GPU.