class Sphere {
    constructor() {
        this.type = 'sphere';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.normalMatrix = new Matrix4();
        this.textureNum = -2;
        this.verts32 = new Float32Array([]);
    }

    render() {
        var rgba = this.color;

        // Pass the texture number
        gl.uniform1i(u_whichTexture, this.textureNum);

        // Pass the color of a point to u_FragColor uniform variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        // Pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        this.normalMatrix.setInverseOf(this.matrix);
        this.normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);

        var d = Math.PI / 25;
        var dd = Math.PI / 25;

        for (var t = 0; t < Math.PI; t += d) {
            for (var r = 0; r < (2 * Math.PI); r += d) {
                var p1 = [sin(t) * cos(r), sin(t) * sin(r), cos(t)];
                var p2 = [sin(t + dd) * cos(r), sin(t + dd) * sin(r), cos(t + dd)];
                var p3 = [sin(t) * cos(r + dd), sin(t) * sin(r + dd), cos(t)];
                var p4 = [sin(t + dd) * cos(r + dd), sin(t + dd) * sin(r + dd), cos(t + dd)];

                var uv1 = [t / Math.PI, r / (2 * Math.PI)];
                var uv2 = [(t + dd) / Math.PI, r / (2 * Math.PI)];
                var uv3 = [t / Math.PI, (r + dd) / (2 * Math.PI)];
                var uv4 = [(t + dd) / Math.PI, (r + dd) / (2 * Math.PI)];
                // Triangle 1
                var v = [];
                var uv = [];
                v = v.concat(p1); uv = uv.concat(uv1);
                v = v.concat(p2); uv = uv.concat(uv2);
                v = v.concat(p4); uv = uv.concat(uv4);
                drawTriangle3DUVNormal(v, uv, v);

                // Triangle 2
                v = []; uv = [];
                v = v.concat(p1); uv = uv.concat(uv1);
                v = v.concat(p4); uv = uv.concat(uv4);
                v = v.concat(p3); uv = uv.concat(uv3);
                gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);
                drawTriangle3DUVNormal(v, uv, v);
            }
        }
    }
}

function sin(x) {
    return Math.sin(x);
}
function cos(x) {
    return Math.cos(x);
} 
