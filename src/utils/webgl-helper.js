var random = Math.random;
function randomColor() {
  return {
    r: random() * 255,
    g: random() * 255,
    b: random() * 255,
    a: random() * 1,
  };
}

function $$(str) {
  if (!str) return null;
  if (str.startsWith("#")) {
    return document.querySelector(str);
  }
  let result = document.querySelectorAll(str);
  if (result.length == 1) {
    return result[0];
  }
  return result;
}

/**
 *
 */
function createShaderFromScript(gl, scriptId, opt_shaderType) {
  let sourceScript = $$("#" + scriptId);
  if (!sourceScript) {
    return null;
  }
  return createShader(gl, opt_shaderType, sourceScript.innerHTML);
}

function createShader(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}
function createSimpleProgram(gl, vertexShader, fragmentShader) {
  if (!vertexShader || !fragmentShader) {
    console.warn("着色器不能为空");
    return;
  }
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createProgram(gl, vertexShader, fragmentShader) {
  let program = gl.createProgram();
  vertexShader && gl.attachShader(program, vertexShader);
  fragmentShader && gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let result = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (result) {
    console.log("着色器程序创建成功");
    let uniformSetters = createUniformSetters(gl, program);
    let attributeSetters = createAttributeSetters(gl, program);
    return {
      program: program,
      uniformSetters: uniformSetters,
      attributeSetters: attributeSetters,
    };
  }
  let errorLog = gl.getProgramInfoLog(program);
  gl.deleteProgram(program);
  throw errorLog;
}
function getVariableCounts(gl, program, type) {
  return gl.getProgramParameter(program, type);
}

function createUniformSetters(gl, program) {
  let uniformSetters = {};
  let uniformsCount = getVariableCounts(gl, program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformsCount; i++) {
    let uniformInfo = gl.getActiveUniform(program, i);
    if (!uniformInfo) {
      break;
    }
    let name = uniformInfo.name;
    if (name.substr(-3) === "[0]") {
      name = name.substr(0, name.length - 3);
    }
    let setter = createUniformSetter(gl, program, uniformInfo);
    uniformSetters[name] = setter;
  }
  return uniformSetters;
}
function createAttributeSetter(gl, attributeIndex) {
  return function (bufferInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.buffer);
    gl.enableVertexAttribArray(attributeIndex);
    gl.vertexAttribPointer(
      attributeIndex,
      bufferInfo.numsPerElement || bufferInfo.size,
      bufferInfo.type || gl.FLOAT,
      bufferInfo.normalize || false,
      bufferInfo.stride || 0,
      bufferInfo.offset || 0
    );
  };
}
function createAttributeSetters(gl, program) {
  let attributesCount = getVariableCounts(gl, program, gl.ACTIVE_ATTRIBUTES);
  let attributeSetter = {};
  for (let i = 0; i < attributesCount; i++) {
    let attributeInfo = gl.getActiveAttrib(program, i);
    let attributeIndex = gl.getAttribLocation(program, attributeInfo.name);
    attributeSetter[attributeInfo.name] = createAttributeSetter(
      gl,
      attributeIndex
    );
  }
  return attributeSetter;
}

function createBuffer(gl, attribute, vertexAttribPointer) {
  let { size, type, normalize, stride, offset } = vertexAttribPointer;
  gl.enableVertexAttribArray(attribute);
  let buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(
    attribute,
    size,
    type || gl.FLOAT,
    normalize || false,
    stride || 0,
    offset || 0
  );
  return buffer;
}

function loadTexture(gl, src, attribute, callback) {
  let img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.uniform1i(attribute, 0);
    callback && callback();
  };
  img.src = src;
}
