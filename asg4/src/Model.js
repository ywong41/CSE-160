class Model {
    constructor(pos, uv, nor) {
        this.color = [1, 1, 1, 1];
        this.textureNum = -2; // solid color
        this.matrix = new Matrix4();
        this.normalMatrix = new Matrix4();

        this.pos = new Float32Array(pos);
        this.uv = new Float32Array(uv);
        this.nor = new Float32Array(nor);

        this.posBuf = null;
        this.uvBuf = null;
        this.norBuf = null;
        this.count = this.pos.length / 3;
    }

    static async load(url) {
        const txt = await (await fetch(url)).text();
        const { pos, uv, nor } = Model.parseOBJ(txt);
        return new Model(pos, uv, nor);
    }

    static parseOBJ(text) {
        const V = [[0, 0, 0]];
        const VT = [[0, 0]];
        const VN = [[0, 0, 1]];

        const pos = [];
        const uv = [];
        const nor = [];

        const lines = text.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("#")) continue;

            const parts = line.split(/\s+/);
            const tag = parts[0];

            if (tag === "v") {
                V.push([+parts[1], +parts[2], +parts[3]]);
            } else if (tag === "vt") {
                VT.push([+parts[1], +parts[2]]);
            } else if (tag === "vn") {
                VN.push([+parts[1], +parts[2], +parts[3]]);
            } else if (tag === "f") {
                // Assumes triangles (your Blender export uses Triangulated Mesh). :contentReference[oaicite:1]{index=1}
                for (let i = 1; i <= 3; i++) {
                    const idx = parts[i].split("/");
                    const vi = parseInt(idx[0], 10);
                    const ti = idx[1] ? parseInt(idx[1], 10) : 0;
                    const ni = idx[2] ? parseInt(idx[2], 10) : 0;

                    const v = V[vi]; pos.push(v[0], v[1], v[2]);
                    const t = VT[ti] || [0, 0]; uv.push(t[0], t[1]);
                    const n = VN[ni] || [0, 1, 0]; nor.push(n[0], n[1], n[2]);
                }
            }
        }
        return { pos, uv, nor };
    }

    _initBuffersIfNeeded() {
        if (this.posBuf) return;
        this.posBuf = gl.createBuffer();
        this.uvBuf = gl.createBuffer();
        this.norBuf = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.norBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this.nor, gl.STATIC_DRAW);
    }

    renderFast() {
        this._initBuffersIfNeeded();

        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        this.normalMatrix.setInverseOf(this.matrix);
        this.normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.norBuf);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }

    render() { this.renderFast(); }
}