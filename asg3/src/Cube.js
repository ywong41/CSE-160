class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1, 1, 1, 1];
        this.matrix = new Matrix4();
        this.textureNum = -2; // -2 solid, 0 texture0, -1 uv debug

        // 36 vertices (12 triangles)
        this.verts = new Float32Array([
            // FRONT (z=0)
            0, 0, 0, 1, 1, 0, 1, 0, 0,
            0, 0, 0, 0, 1, 0, 1, 1, 0,
            // BACK (z=1)
            0, 0, 1, 1, 0, 1, 1, 1, 1,
            0, 0, 1, 1, 1, 1, 0, 1, 1,
            // LEFT (x=0)
            0, 0, 0, 0, 0, 1, 0, 1, 1,
            0, 0, 0, 0, 1, 1, 0, 1, 0,
            // RIGHT (x=1)
            1, 0, 0, 1, 1, 1, 1, 0, 1,
            1, 0, 0, 1, 1, 0, 1, 1, 1,
            // TOP (y=1)
            0, 1, 0, 0, 1, 1, 1, 1, 1,
            0, 1, 0, 1, 1, 1, 1, 1, 0,
            // BOTTOM (y=0)
            0, 0, 0, 1, 0, 1, 0, 0, 1,
            0, 0, 0, 1, 0, 0, 1, 0, 1,
        ]);

        // UVs matching vertex order above
        this.uvs = new Float32Array([
            // FRONT
            0, 0, 1, 1, 1, 0,
            0, 0, 0, 1, 1, 1,
            // BACK
            0, 0, 1, 0, 1, 1,
            0, 0, 1, 1, 0, 1,
            // LEFT
            0, 0, 1, 0, 1, 1,
            0, 0, 1, 1, 0, 1,
            // RIGHT
            0, 0, 1, 1, 1, 0,
            0, 0, 0, 1, 1, 1,
            // TOP
            0, 0, 0, 1, 1, 1,
            0, 0, 1, 1, 1, 0,
            // BOTTOM
            0, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1,
        ]);
    }

    static posBuffer = null;
    static uvBuffer = null;

    _initBuffersIfNeeded() {
        if (Cube.posBuffer && Cube.uvBuffer) return;

        Cube.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.verts, gl.STATIC_DRAW);

        Cube.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
    }

    renderFast() {
        this._initBuffersIfNeeded();

        // texture bind if needed
        if (this.textureNum === 0 && g_texture0) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, g_texture0);
            gl.uniform1i(u_Sampler0, 0);
        }

        if (this.textureNum === 1 && g_texture1) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, g_texture1);
            gl.uniform1i(u_Sampler1, 1);
        }


        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // positions
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.posBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // uvs
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    render() { this.renderFast(); }
}
