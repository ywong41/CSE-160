// Shared buffers for triangle drawing
let TRI_POS_BUF = null;
let TRI_UV_BUF = null;

function _ensureTriBuffers() {
  if (!TRI_POS_BUF) TRI_POS_BUF = gl.createBuffer();
  if (!TRI_UV_BUF) TRI_UV_BUF = gl.createBuffer();
}

function drawTriangle3D(verts3) {
  _ensureTriBuffers();
  const n = verts3.length / 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_POS_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts3), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3DUV(verts3, uvs2) {
  _ensureTriBuffers();

  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_POS_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts3), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_UV_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs2), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

class Triangle3D {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.verts = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    this.uvs = [0, 0, 1, 0, 0, 1];
  }

  render() {
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    drawTriangle3DUV(this.verts, this.uvs);
  }
}