class Triangle3D {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
    this.textureNum = -2;
    this.verts = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    this.uvs = [0, 0, 1, 0, 0, 1];
    this.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
  }

  render() {
    const texNum = g_normalOn ? -3 : this.textureNum;
    gl.uniform1i(u_whichTexture, texNum);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    drawTriangle3DUVNormal(this.verts, this.uvs, this.normals);
  }
}

// reuse shared buffers for triangle drawing
let TRI_POS_BUF = null;
let TRI_UV_BUF = null;
let TRI_NORMAL_BUF = null;

function _ensureTriBuffers() {
  if (!TRI_POS_BUF) TRI_POS_BUF = gl.createBuffer();
  if (!TRI_UV_BUF) TRI_UV_BUF = gl.createBuffer();
  if (!TRI_NORMAL_BUF) TRI_NORMAL_BUF = gl.createBuffer();
}

function drawTriangle3D(verts3) {
  _ensureTriBuffers();
  const n = verts3.length / 3;

  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_POS_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts3), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // fallback UV + normal
  gl.disableVertexAttribArray(a_UV);
  gl.vertexAttrib2f(a_UV, 0.0, 0.0);

  // fallback NORMAL
  const [nx, ny, nz] = faceNormalFromVerts3(verts3);
gl.disableVertexAttribArray(a_Normal);
gl.vertexAttrib3f(a_Normal, nx, ny, nz);

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

  // fallback NORMAL
  gl.disableVertexAttribArray(a_Normal);
  gl.vertexAttrib3f(a_Normal, 0.0, 1.0, 0.0);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// position + UV + normal
function drawTriangle3DUVNormal(verts3, uvs2, normals3) {
  _ensureTriBuffers();
  const nPos = verts3.length / 3;
  const nUV = uvs2.length / 2;
  const nNor = normals3.length / 3;

  if (nPos !== nUV || nPos !== nNor) {
    console.error("drawTriangle3DUVNormal size mismatch:", { nPos, nUV, nNor });
    return;
  }
  const n = nPos;

  // positions
  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_POS_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts3), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // uvs
  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_UV_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs2), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  // normals
  gl.bindBuffer(gl.ARRAY_BUFFER, TRI_NORMAL_BUF);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals3), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

// compute a real face normal from the three vertices
function faceNormalFromVerts3(verts3) {
  const ax = verts3[0], ay = verts3[1], az = verts3[2];
  const bx = verts3[3], by = verts3[4], bz = verts3[5];
  const cx = verts3[6], cy = verts3[7], cz = verts3[8];

  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;

  // cross(ab, ac)
  let nx = aby * acz - abz * acy;
  let ny = abz * acx - abx * acz;
  let nz = abx * acy - aby * acx;

  const len = Math.hypot(nx, ny, nz) || 1.0;
  nx /= len; ny /= len; nz /= len;
  return [nx, ny, nz];
}

