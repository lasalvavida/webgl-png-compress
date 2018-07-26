import fs from 'fs'
import {createCanvas, loadImage} from 'canvas'
import gl from 'gl'

import compress from '../lib/compress'
import condensePalette from '../lib/condensePalette'
import writePNG from '../lib/writePNG'

loadImage('test/images/Lenna.jpg').then((image) => {
	var width = image.width
	var height = image.height
	const n = 255

	var canvas2d = createCanvas(width, height)
	var glContext = gl(width, height, {
		preserveDrawingBuffer: true
	})
	console.log("Computing palette with " + n + " colors...")
	var data = compress(image, canvas2d, glContext, n, 4)
	console.log("Done computing palette!")

	console.log("Condensing palette...")
	var palette = condensePalette(data.palette)
	console.log("Condensed palette from " + n + " colors to " + palette.length + " colors.")

    console.log("Writing PNG...")
	var imageBuffer = writePNG(data.pixelData, palette, width, height)
	console.log("Done writing PNG!")
    fs.writeFile('out.png', imageBuffer, (err) => {
        if (err) {
        	throw err;
        }
        console.log('The file has been saved!');
    });
})