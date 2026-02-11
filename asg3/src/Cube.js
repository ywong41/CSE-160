class Cube{
    constructor(){
        this.type = 'cube';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
    }


    renderScene(){
        var rgba = this.color;
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);

        // FRONT (slightly brighter)
        gl.uniform4f(u_FragColor, color[0]*1.0, color[1]*1.0, color[2]*1.0, color[3]);
        drawTriangle3DUV([0,0,0, 1,1,0, 1,0,0], [1,0,0,1,1,1])
        drawTriangle3D([0,0,0, 1,1,0, 1,0,0]);
        drawTriangle3D([0,0,0, 0,1,0, 1,1,0]);

        // BACK (slightly darker)
        gl.uniform4f(u_FragColor, color[0]*0.8, color[1]*0.8, color[2]*0.8, color[3]);
        drawTriangle3D([0,0,1, 1,0,1, 1,1,1]);
        drawTriangle3D([0,0,1, 1,1,1, 0,1,1]);

        // LEFT (darker)
        gl.uniform4f(u_FragColor, color[0]*0.7, color[1]*0.7, color[2]*0.7, color[3]);
        drawTriangle3D([0,0,0, 0,0,1, 0,1,1]);
        drawTriangle3D([0,0,0, 0,1,1, 0,1,0]);

        // RIGHT (same as left)
        gl.uniform4f(u_FragColor, color[0]*0.7, color[1]*0.7, color[2]*0.7, color[3]);
        drawTriangle3D([1,0,0, 1,1,1, 1,0,1]);
        drawTriangle3D([1,0,0, 1,1,0, 1,1,1]);

        // TOP (slightly dark)
        gl.uniform4f(u_FragColor, color[0]*0.9, color[1]*0.9, color[2]*0.9, color[3]);
        drawTriangle3D([0,1,0, 0,1,1, 1,1,1]);
        drawTriangle3D([0,1,0, 1,1,1, 1,1,0]);

        // BOTTOM (darkest)
        gl.uniform4f(u_FragColor, color[0]*0.6, color[1]*0.6, color[2]*0.6, color[3]);
        drawTriangle3D([0,0,0, 1,0,1, 0,0,1]);
        drawTriangle3D([0,0,0, 1,0,0, 1,0,1]);
    }
}