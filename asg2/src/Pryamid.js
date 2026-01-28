class Pyramid {
  constructor() {
    this.type = 'pyramid';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];

    this.size = 1.0;
    this.scale = [1.0, 1.0, 1.0];

    this.parentMatrix = null;
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;

    this.matrix.setIdentity();
    if (this.parentMatrix) this.matrix.set(this.parentMatrix);

    this.matrix.translate(this.position[0], this.position[1], this.position[2]);
    this.matrix.scale(
      this.size * this.scale[0],
      this.size * this.scale[1],
      this.size * this.scale[2]
    );

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const A = [0, 0, 0], B = [1, 0, 0], C = [1, 0, 1], D = [0, 0, 1], P = [0.5, 1.0, 0.5];

    gl.uniform4f(u_FragColor, 0.6*rgba[0], 0.6*rgba[1], 0.6*rgba[2], rgba[3]);
    drawTriangle3D([A[0],A[1],A[2],  B[0],B[1],B[2],  C[0],C[1],C[2]]);
    drawTriangle3D([A[0],A[1],A[2],  C[0],C[1],C[2],  D[0],D[1],D[2]]);

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3D([A[0],A[1],A[2],  B[0],B[1],B[2],  P[0],P[1],P[2]]);
    drawTriangle3D([B[0],B[1],B[2],  C[0],C[1],C[2],  P[0],P[1],P[2]]);
    drawTriangle3D([C[0],C[1],C[2],  D[0],D[1],D[2],  P[0],P[1],P[2]]);
    drawTriangle3D([D[0],D[1],D[2],  A[0],A[1],A[2],  P[0],P[1],P[2]]);
  }
}
