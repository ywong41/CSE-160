class Cube {
    constructor() {
        this.type = 'cube';
        this.color = [1, 1, 1, 1];
        this.matrix = new Matrix4();
        this.normalMatrix = new Matrix4();
        this.textureNum = -2; // -2 solid, -1 uv debug, 0-4 texture

        // 36 vertices (12 triangles)
        this.cubeVerts32 = new Float32Array([
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

        // cubeVerts matching vertex order above
        this.cubeVerts = new Float32Array([
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

        // add normal arrays
        this.cubeNormals = new Float32Array([
            // FRONT (z=0) -> normal (0,0,-1)
            0, 0, -1, 0, 0, -1, 0, 0, -1,
            0, 0, -1, 0, 0, -1, 0, 0, -1,

            // BACK (z=1) -> normal (0,0,1)
            0, 0, 1, 0, 0, 1, 0, 0, 1,
            0, 0, 1, 0, 0, 1, 0, 0, 1,

            // LEFT (x=0) -> normal (-1,0,0)
            -1, 0, 0, -1, 0, 0, -1, 0, 0,
            -1, 0, 0, -1, 0, 0, -1, 0, 0,

            // RIGHT (x=1) -> normal (1,0,0)
            1, 0, 0, 1, 0, 0, 1, 0, 0,
            1, 0, 0, 1, 0, 0, 1, 0, 0,

            // TOP (y=1) -> normal (0,1,0)
            0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0,

            // BOTTOM (y=0) -> normal (0,-1,0)
            0, -1, 0, 0, -1, 0, 0, -1, 0,
            0, -1, 0, 0, -1, 0, 0, -1, 0,
        ]);
    }

    static posBuffer = null;
    static uvBuffer = null;
    static normalBuffer = null;

    _initBuffersIfNeeded() {
        if (Cube.posBuffer && Cube.uvBuffer && Cube.normalBuffer) return;

        Cube.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts32, gl.STATIC_DRAW);

        Cube.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts, gl.STATIC_DRAW);

        Cube.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeNormals, gl.STATIC_DRAW);
    }

    renderFast() {
        this._initBuffersIfNeeded();

        // if normal debug is on, force shader into normal-visualization mode
        const texNum = g_normalOn ? -3 : this.textureNum;

        // texture bind if needed
        if (!g_normalOn) {
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

            if (this.textureNum === 2 && g_texture2) {
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, g_texture2);
                gl.uniform1i(u_Sampler2, 2);
            }
            if (this.textureNum === 3 && g_texture3) {
                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_2D, g_texture3);
                gl.uniform1i(u_Sampler3, 3);
            }
            if (this.textureNum === 4 && g_texture4) {
                gl.activeTexture(gl.TEXTURE4);
                gl.bindTexture(gl.TEXTURE_2D, g_texture4);
                gl.uniform1i(u_Sampler4, 4);
            }
        }
        gl.uniform1i(u_whichTexture, texNum);
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

        // normals
        gl.bindBuffer(gl.ARRAY_BUFFER, Cube.normalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        this.normalMatrix.setInverseOf(this.matrix);
        this.normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    render() { this.renderFast(); }
}
