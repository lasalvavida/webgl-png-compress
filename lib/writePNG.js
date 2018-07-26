import crc from 'crc'
import zlib from 'zlib'

export default function writePNG (pixelData, palette, width, height) {
    /*
     * Signature - 8 bytes
     * 
     * IHDR - length - 4 bytes
     *        chunk type - 4 bytes
     *        data:
     *            width - 4 bytes
     *            height - 4 bytes
     *            bit depth - 1 byte
     *            color type - 1 byte
     *            compression method - 1 byte
     *            filter method - 1 byte
     *            interlace method - 1 byte
     *        CRC32 - 4 bytes
     *        
     * PLTE - length - 4 bytes
     *        chunk type - 4 bytes
     *        data:
     *            n * rgb - n * 3 bytes
     *        CRC32 - 4 bytes
     * 
     * IDAT - length - 4 bytes
     *        chunk type - 4 bytes
     *        data:
     *            image data - width * height bytes
     *        CRC32 - 4 bytes
     *        
     * IEND - length - 4 bytes
     *        chunk type - 4 bytes
     *        CRC32 - 4 bytes
     */
    var index, i
    var offset = 0

    // Compress IDAT
    var idatLength = (width + 1) * height
    var idat = Buffer.alloc(idatLength)
    for (var y = height - 1; y >= 0; y--) {
        // Write filter-type byte at beginning of scanline
        idat.writeUInt8(0, offset++)
        for (var x = 0; x < width; x++) {
            index = (y * width + x) * 4
            var match = 0
            var closestDistance = Infinity
            let distR, distG, distB;
            for (i = 0; i < palette.length; i++) {
                distR = pixelData[index] - palette[i][0]
                distG = pixelData[index + 1] - palette[i][1]
                distB = pixelData[index + 2] - palette[i][2]
                var distance = distR * distR + distG * distG + distB * distB
                if (distance < closestDistance) {
                    closestDistance = distance
                    match = i
                }
            }
            // Push error out to neighbors
            // https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering
            distR = pixelData[index] - palette[match][0]
            distG = pixelData[index + 1] - palette[match][1]
            distB = pixelData[index + 2] - palette[match][2]

            // Pixel to the east
            if (x < width - 1) {
                const eastIndex = (y * width + x + 1) * 4
                pixelData[eastIndex] = Math.min(Math.max(pixelData[eastIndex] + distR * 7.0/16, 0), 255)
                pixelData[eastIndex + 1] = Math.min(Math.max(pixelData[eastIndex + 1] + distG * 7.0/16, 0), 255)
                pixelData[eastIndex + 2] = Math.min(Math.max(pixelData[eastIndex + 2] + distB * 7.0/16, 0), 255)
            }
            if (y > 0) {
                // Pixel to the southwest
                const southwestIndex = ((y - 1) * width + x - 1) * 4
                pixelData[southwestIndex] = Math.min(Math.max(pixelData[southwestIndex] + distR * 3.0/16, 0), 255)
                pixelData[southwestIndex + 1] = Math.min(Math.max(pixelData[southwestIndex + 1] + distG * 3.0/16, 0), 255)
                pixelData[southwestIndex + 2] = Math.min(Math.max(pixelData[southwestIndex + 2] + distB * 3.0/16, 0), 255)

                // Pixel to the south
                const southIndex = ((y - 1) * width + x) * 4
                pixelData[southIndex] = Math.min(Math.max(pixelData[southIndex] + distR * 5.0/16, 0), 255)
                pixelData[southIndex + 1] = Math.min(Math.max(pixelData[southIndex + 1] + distG * 5.0/16, 0), 255)
                pixelData[southIndex + 2] = Math.min(Math.max(pixelData[southIndex + 2] + distB * 5.0/16, 0), 255)

                // Pixel to the southeast
                if (x < width - 1) {
                    const southeastIndex = ((y - 1) * width + x + 1) * 4
                    pixelData[southeastIndex] = Math.min(Math.max(pixelData[southeastIndex] + distR * 1.0/16, 0), 255)
                    pixelData[southeastIndex + 1] = Math.min(Math.max(pixelData[southeastIndex + 1] + distG * 1.0/16, 0), 255)
                    pixelData[southeastIndex + 2] = Math.min(Math.max(pixelData[southeastIndex + 2] + distB * 1.0/16, 0), 255)
                }
            }
            idat.writeUInt8(match, offset++)
        }
    }
    idat = zlib.deflateSync(idat)

    var ihdrLength = 25
    var plteLength = 12 + palette.length * 3
    idatLength = 12 + idat.length
    var iendLength = 12;

    var totalLength = 8 + ihdrLength + plteLength + idatLength + iendLength
    var buffer = Buffer.alloc(totalLength)

    offset = 0
    // Signature
    buffer.writeUInt8(137, offset++)
    buffer.writeUInt8(80, offset++)
    buffer.writeUInt8(78, offset++)
    buffer.writeUInt8(71, offset++)
    buffer.writeUInt8(13, offset++)
    buffer.writeUInt8(10, offset++)
    buffer.writeUInt8(26, offset++)
    buffer.writeUInt8(10, offset++)

    // IHDR
    buffer.writeUInt32BE(ihdrLength - 12, offset)
    offset += 4
    var ihdrStart = offset;
    buffer.write("IHDR", offset)
    offset += 4
    buffer.writeUInt32BE(width, offset)
    offset += 4
    buffer.writeUInt32BE(height, offset)
    offset += 4
    buffer.writeUInt8(8, offset++)  // bit depth
    buffer.writeUInt8(3, offset++)  // color type - palette
    buffer.writeUInt8(0, offset++)  // compression method
    buffer.writeUInt8(0, offset++)  // filter method
    buffer.writeUInt8(0, offset++)  // interlace method
    buffer.writeUInt32BE(crc.crc32(buffer.slice(ihdrStart, offset)), offset)
    offset += 4

    // PLTE
    buffer.writeUInt32BE(plteLength - 12, offset)
    offset += 4
    var plteStart = offset;
    buffer.write("PLTE", offset)
    offset += 4
    for (i = 0; i < palette.length; i++) {
        buffer.writeUInt8(palette[i][0], offset++)
        buffer.writeUInt8(palette[i][1], offset++)
        buffer.writeUInt8(palette[i][2], offset++)
    }
    buffer.writeUInt32BE(crc.crc32(buffer.slice(plteStart, offset)), offset)
    offset += 4

    // IDAT
    buffer.writeUInt32BE(idatLength - 12, offset)
    offset += 4
    var idatStart = offset;
    buffer.write("IDAT", offset)
    offset += 4
    idat.copy(buffer, offset)
    offset += idat.length
    buffer.writeUInt32BE(crc.crc32(buffer.slice(idatStart, offset)), offset)
    offset += 4

    // IEND
    buffer.writeUInt32BE(iendLength - 12, offset)
    offset += 4
    var iendStart = offset;
    buffer.write("IEND", offset)
    offset += 4
    buffer.writeUInt32BE(crc.crc32(buffer.slice(iendStart, offset)), offset)
    offset += 4

    return buffer
}