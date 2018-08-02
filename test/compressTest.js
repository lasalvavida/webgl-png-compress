import {createCanvas, loadImage} from 'canvas'
import gl from 'gl'

import compress from '../lib/compress'
import condensePalette from '../lib/condensePalette'

describe('compress', () => {
    it('compresses png', () => {
        return loadImage('./test/images/Lenna.jpg').then((image) => {
            var width = image.width
            var height = image.height

            var canvas2d = createCanvas(width, height)
            const context = canvas2d.getContext('2d')
            context.drawImage(image, 0, 0)
            const imageData = context.getImageData(0, 0, width, height)

            var glContext = gl(width, height, {
                preserveDrawingBuffer: true
            })
            let palette = compress(imageData, width, height, glContext, 256, 4)
            palette = condensePalette(palette)
        })
    })
})