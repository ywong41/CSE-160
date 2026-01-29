class Cylinder {
  constructor() {
    this.type = 'cylinder';
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0, 1];
    this.color = [1, 1, 1, 1];
    this.radius = 0.5;
    this.height = 1.0;  // along +Y in local space
    this.segments = 16;

    this.parentMatrix = null;
    this.scale = [1, 1, 1];
    this.matrix = new Matrix4();
  }

  render() {
    const c = this.color;

    this.matrix.setIdentity();
    if (this.parentMatrix) this.matrix.set(this.parentMatrix);

    this.matrix.translate(this.position[0], this.position[1], this.position[2]);
    this.matrix.rotate(this.rotation[0], this.rotation[1], this.rotation[2], this.rotation[3]);
    this.matrix.scale(this.scale[0], this.scale[1], this.scale[2]);

    gl.uniform4f(u_FragColor, c[0], c[1], c[2], c[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const r = this.radius;
    const h = this.height;
    const n = Math.max(3, this.segments);
    const step = (Math.PI * 2) / n;

    const centerBot = [0, 0, 0];
    const centerTop = [0, h, 0];

    for (let i = 0; i < n; i++) {
      const a0 = i * step;
      const a1 = (i + 1) * step;

      const x0 = r * Math.cos(a0), z0 = r * Math.sin(a0);
      const x1 = r * Math.cos(a1), z1 = r * Math.sin(a1);

      const b0 = [x0, 0, z0];
      const b1 = [x1, 0, z1];
      const t0 = [x0, h, z0];
      const t1 = [x1, h, z1];

      // Side quad -> 2 triangles
      drawTriangle3D([b0[0],b0[1],b0[2],  t0[0],t0[1],t0[2],  t1[0],t1[1],t1[2]]);
      drawTriangle3D([b0[0],b0[1],b0[2],  t1[0],t1[1],t1[2],  b1[0],b1[1],b1[2]]);

      // Top cap
      drawTriangle3D([centerTop[0],centerTop[1],centerTop[2],  t0[0],t0[1],t0[2],  t1[0],t1[1],t1[2]]);

      // Bottom cap (reverse winding)
      drawTriangle3D([centerBot[0],centerBot[1],centerBot[2],  b1[0],b1[1],b1[2],  b0[0],b0[1],b0[2]]);
    }
  }
}
