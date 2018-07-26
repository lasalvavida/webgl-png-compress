export default function condensePalette(palette, eps=0) {
	const finalPalette = []
	while (palette.length > 0) {
		const item0 = palette.shift()
		const mergeItems = []
		for (let i = 0; i < palette.length; i++) {
			const item1 = palette[i]

			const rDiff = item0[0] - item1[0]
			const gDiff = item0[1] - item1[1]
			const bDiff = item0[2] - item1[2]

			const distance = rDiff * rDiff +
				gDiff * gDiff +
				bDiff * bDiff

			if (distance <= eps) {
				mergeItems.push(i)
			}
		}
		for (let i = 0; i < mergeItems.length; i++) {
			palette.splice(mergeItems[i] - i, 1)
		}
		finalPalette.push(item0)
	}
	for (let i = 0; i < finalPalette.length; i++) {
		palette.push(finalPalette[i])
	}
	return palette
}