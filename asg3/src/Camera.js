(function () {
    function ensure(name, fn) {
        if (!Vector3.prototype[name]) Vector3.prototype[name] = fn;
    }

    ensure("set", function (v) {
        this.elements[0] = v.elements[0];
        this.elements[1] = v.elements[1];
        this.elements[2] = v.elements[2];
        return this;
    });

    ensure("add", function (v) {
        this.elements[0] += v.elements[0];
        this.elements[1] += v.elements[1];
        this.elements[2] += v.elements[2];
        return this;
    });

    ensure("sub", function (v) {
        this.elements[0] -= v.elements[0];
        this.elements[1] -= v.elements[1];
        this.elements[2] -= v.elements[2];
        return this;
    });

    ensure("mul", function (s) {
        this.elements[0] *= s;
        this.elements[1] *= s;
        this.elements[2] *= s;
        return this;
    });

    ensure("normalize", function () {
        const x = this.elements[0], y = this.elements[1], z = this.elements[2];
        const len = Math.hypot(x, y, z) || 1.0;
        this.elements[0] = x / len;
        this.elements[1] = y / len;
        this.elements[2] = z / len;
        return this;
    });
})();

// cross product helper (spec needs up x f / f x up)
function v3Cross(a, b) {
    return new Vector3([
        a.elements[1] * b.elements[2] - a.elements[2] * b.elements[1],
        a.elements[2] * b.elements[0] - a.elements[0] * b.elements[2],
        a.elements[0] * b.elements[1] - a.elements[1] * b.elements[0],
    ]);
}

class Camera {
    constructor(canvas) {
        this.fov = 60;

        this.eye = new Vector3([0, 0, 0]);
        this.at = new Vector3([0, 0, -1]);
        this.up = new Vector3([0, 1, 0]);

        this.pitch = 0;      // current pitch angle
        this.maxPitch = 89;  // don't flip upside down


        this.viewMatrix = new Matrix4();
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );

        this.projectionMatrix = new Matrix4();
        this.projectionMatrix.setPerspective(
            this.fov, canvas.width / canvas.height, 0.1, 1000
        );

        this.speed = 0.20;
        this.alpha = 5; // Q/E turns 5 degrees

    }

    // keep viewMatrix in sync
    updateViewMatrix() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
    }

    moveForward() {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        // XZ-only walk to prevents digging into ground
        f.elements[1] = 0;
        f.normalize();
        f.mul(this.speed);

        this.tryMove(f.elements[0], f.elements[2]);
    }

    moveBackwards() {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        f.elements[1] = 0;
        f.normalize();
        f.mul(this.speed);

        this.tryMove(-f.elements[0], -f.elements[2]);
    }

    moveLeft() {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        f.elements[1] = 0;

        let s = v3Cross(this.up, f); // left
        s.normalize();
        s.mul(this.speed);

        this.tryMove(s.elements[0], s.elements[2]);
    }

    moveRight() {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);
        f.elements[1] = 0;

        let s = v3Cross(f, this.up); // right
        s.normalize();
        s.mul(this.speed);

        this.tryMove(s.elements[0], s.elements[2]);
    }


    // panLeft / panRight
    panLeft() { this._yaw(+this.alpha); }
    panRight() { this._yaw(-this.alpha); }

    _yaw(alphaDeg) {
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        let rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(
            alphaDeg,
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );

        let f_prime = rotationMatrix.multiplyVector3(f);

        // at = eye + f_prime
        this.at.set(this.eye);
        this.at.add(f_prime);

        this.updateViewMatrix();
    }

    _pitch(deg) {
        // clamp pitch to avoid flipping
        const newPitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch + deg));
        const delta = newPitch - this.pitch;
        this.pitch = newPitch;
        if (Math.abs(delta) < 1e-6) return;

        // forward f = at - eye
        let f = new Vector3();
        f.set(this.at);
        f.sub(this.eye);

        // right axis = (forward x up)
        let right = v3Cross(f, this.up);
        right.normalize();

        // rotate forward around right axis
        let rot = new Matrix4();
        rot.setRotate(delta, right.elements[0], right.elements[1], right.elements[2]);
        let f2 = rot.multiplyVector3(f);

        // at = eye + f2
        this.at.set(this.eye);
        this.at.add(f2);

        this.updateViewMatrix();
    }


    mouseLook(dxPixels, dyPixels) {
        const SENS = 0.023; // degrees per pixel (tune)
        this._yaw(-dxPixels * SENS);     // left/right
        this._pitch(-dyPixels * SENS);   // up/down
    }

    tryMove(dx, dz) {
        // keep eye height fixed so you don't "dig"
        this.eye.elements[1] = PLAYER_EYE_Y;

        const ex = this.eye.elements[0];
        const ez = this.eye.elements[2];

        const nx = ex + dx;
        const nz = ez + dz;

        // free move
        if (canStandAt(nx, nz)) {
            this.eye.elements[0] = nx;
            this.eye.elements[2] = nz;
            this.at.elements[0] += dx;
            this.at.elements[2] += dz;
            this.updateViewMatrix();
            return;
        }

        // sliding along walls
        if (canStandAt(nx, ez)) {
            this.eye.elements[0] = nx;
            this.at.elements[0] += dx;
        }
        if (canStandAt(ex, nz)) {
            this.eye.elements[2] = nz;
            this.at.elements[2] += dz;
        }
        this.updateViewMatrix();
    }
}
