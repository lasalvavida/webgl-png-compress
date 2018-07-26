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
            var glContext = gl(width, height, {
                preserveDrawingBuffer: true
            })
            var palette = compress(image, canvas2d, glContext, 64, 8)
            condensePalette(palette)
        })
    })
})