import fs from 'fs'
import {createCanvas, loadImage} from 'canvas'
import gl from 'gl'

import compress from '../lib/compress'
import condensePalette from '../lib/condensePalette'
import writePNG from '../lib/writePNG'

loadImage('test/images/Lenna.jpg').then((image) => {
	const width = image.width
	const height = image.height
	const n = 255

	const canvas2d = createCanvas(width, height)
	const context = canvas2d.getContext('2d')
	context.drawImage(image, 0, 0)
	const imageData = context.getImageData(0, 0, width, height)

	const glContext = gl(width, height, {
		preserveDrawingBuffer: true
	})
	console.log("Computing palette with " + n + " colors...")
	let palette = compress(imageData, width, height, glContext, n, 4)
	console.log("Done computing palette!")

	console.log("Condensing palette...")
	palette = condensePalette(palette)
	console.log("Condensed palette from " + n + " colors to " + palette.length + " colors.")

    console.log("Writing PNG...")
	var imageBuffer = writePNG(imageData, palette, width, height)
	console.log("Done writing PNG!")
    fs.writeFile('out.png', imageBuffer, (err) => {
        if (err) {
        	throw err;
        }
        console.log('The file has been saved!');
    });
})