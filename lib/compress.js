const fragmentShaderSource = `
precision highp float;\n
varying vec3 vCluster;\n
void main() {\n
  gl_FragColor = vec4(vCluster, 1.0);\n
}\n
`

function buildVertexShader (n) {
  var i
  var vsSource = 'precision highp float;\n'
  vsSource += 'attribute vec2 aPosition;\n'
  vsSource += 'attribute vec4 aColor;\n'
  vsSource += 'varying vec3 vCluster;\n'
  for (i = 0; i < n; i++) {
    vsSource += 'uniform vec3 uCluster_' + i + ';\n'
  }
  vsSource += 'void main() {\n'
  vsSource += '  vec3 diff = uCluster_0 - aColor.xyz;\n'
  vsSource += '  float closestDistance = diff.x * diff.x + diff.y * diff.y + diff.z * diff.z;\n'
  vsSource += '  vCluster = uCluster_0;\n'
  vsSource += '  float distance;\n'
  for (i = 1; i < n; i++) {
    vsSource += '  diff = uCluster_' + i + ' - aColor.xyz;\n'
    vsSource += '  distance = diff.x * diff.x + diff.y * diff.y + diff.z * diff.z;\n'
    vsSource += '  if (distance < closestDistance) {\n'
    vsSource += '    vCluster = uCluster_' + i + ';\n'
    vsSource += '    closestDistance = distance;\n'
    vsSource += '  }\n'
  }
  vsSource += '  gl_Position = vec4(aPosition, 0, 1);\n'
  vsSource += '}\n'
  return vsSource
}

function loadShader (gl, type, source) {
  var shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    throw new Error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
  }
  return shader
}
    
function createShaderProgram (gl, vertexShaderSource, fragmentShaderSource) {
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
  var shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram))
  }
  return shaderProgram
}

function createInitialClusterCenters (n, imageData, width, height) {
  var clusterCenters = []
  for (var i = 0; i < n; i++) {
    var x = Math.floor(Math.random() * width)
    var y = Math.floor(Math.random() * height)
    var center = [
      imageData.data[y * width * 4 + x * 4] / 255.0,
      imageData.data[y * width * 4 + x * 4 + 1] / 255.0,
      imageData.data[y * width * 4 + x * 4 + 2] / 255.0
    ]
    clusterCenters.push(center)
  }
  return clusterCenters
}

function componentToHex (c) {
  var hex = c.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}

function rgbToHex (r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

export default function compress (imageData, width, height, gl, n, iterations) {
  var x, y, i, clusterId, clusterLocation

  gl.clearColor(0.0, 0.0, 0.0, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  var vertexShaderSource = buildVertexShader(n)
  var shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource)
  gl.useProgram(shaderProgram)

  var positionBuffer = gl.createBuffer()
  var positionLocation = gl.getAttribLocation(shaderProgram, 'aPosition')
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  var positions = new Float32Array(width * height * 2)
  for (x = 0; x < width; x++) {
    for (y = 0; y < height; y++) {
      positions[y * width * 2 + x * 2] = (x / width - 0.5) * 2
      positions[y * width * 2 + x * 2 + 1] = -(y / height - 0.5) * 2
    }
  }
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(positionLocation)

  var colorBuffer = gl.createBuffer()
  var colorLocation = gl.getAttribLocation(shaderProgram, 'aColor')
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  var colors = new Float32Array(imageData.data)
  for (i = 0; i < colors.length; i++) {
    colors[i] /= 255.0
  }

  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
  gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, true, 0, 0)
  gl.enableVertexAttribArray(colorLocation)

  var clusterCenters = createInitialClusterCenters(n, imageData, width, height)
  var pixelData = new Uint8Array(width * height * 4)

  for (var iteration = 0; iteration < iterations; iteration++) {
    var clusterCounts = {}
    var recomputeClusterCenters = {}
    var clusterIndices = {}
    for (i = 0; i < n; i++) {
      clusterLocation = gl.getUniformLocation(shaderProgram, 'uCluster_' + i)
      var clusterCenter = clusterCenters[i]
      clusterId = rgbToHex(Math.floor(clusterCenter[0] * 255),
        Math.floor(clusterCenter[1] * 255),
        Math.floor(clusterCenter[2] * 255))
      clusterCounts[clusterId] = 0
      recomputeClusterCenters[clusterId] = [0, 0, 0]
      clusterIndices[clusterId] = i
      gl.uniform3fv(clusterLocation, clusterCenter)
    }
    gl.drawArrays(gl.POINT, 0, width * height)
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData)

    for (x = 0; x < width - 1; x++) {
      for (y = 0; y < height - 1; y++) {
        var index = y * width * 4 + x * 4
        var mirrorIndex = (height - y - 1) * width * 4 + x * 4
        clusterId = rgbToHex(pixelData[mirrorIndex],
          pixelData[mirrorIndex + 1],
          pixelData[mirrorIndex + 2])
        if (clusterCounts.hasOwnProperty(clusterId)) {
          clusterCounts[clusterId]++
          recomputeClusterCenters[clusterId][0] += imageData.data[index] / 255.0
          recomputeClusterCenters[clusterId][1] += imageData.data[index + 1] / 255.0
          recomputeClusterCenters[clusterId][2] += imageData.data[index + 2] / 255.0
        }
      }
    }

    for (clusterId in clusterCounts) {
      if (clusterIndices.hasOwnProperty(clusterId)) {
        var clusterCount = clusterCounts[clusterId]
        if (clusterCount > 0) {
          recomputeClusterCenters[clusterId][0] /= clusterCount
          recomputeClusterCenters[clusterId][1] /= clusterCount
          recomputeClusterCenters[clusterId][2] /= clusterCount

          var clusterIndex = clusterIndices[clusterId]
          clusterCenters[clusterIndex] = recomputeClusterCenters[clusterId]
          clusterLocation = gl.getUniformLocation(shaderProgram, 'uCluster_' + clusterIndex)
          gl.uniform3fv(clusterLocation, clusterCenters[clusterIndex])
        }
      }
    }
  }

  for (i = 0; i < clusterCenters.length; i++) {
    clusterCenters[i][0] *= 255
    clusterCenters[i][1] *= 255
    clusterCenters[i][2] *= 255
  }
  return clusterCenters
}