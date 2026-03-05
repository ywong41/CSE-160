import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function main() {
    const canvas = document.querySelector("#webgl");

    // renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        500
    );
    camera.position.set(0, 7, 12);

    // game
    const game = { total: 8, collected: 0, gems: [] };
    const taskBox = document.querySelector("#taskBox");
    taskBox.textContent = `Collected Diamonds: ${game.collected}/${game.total}`;

    function spawnGems() {
        const geo = new THREE.OctahedronGeometry(0.35);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x55ccff,
            emissive: 0x112233,
            roughness: 0.2,
            metalness: 0.0,
        });

        for (let i = 0; i < game.total; i++) {
            const gem = new THREE.Mesh(geo, mat);
            // around temple (temple centered near z=-12)
            gem.position.set((Math.random() - 0.5) * 10, 1.3, -12 + (Math.random() - 0.5) * 10);
            gem.userData.baseY = gem.position.y;
            gem.castShadow = true;
            gem.receiveShadow = true;
            scene.add(gem);
            game.gems.push(gem);
        }
    }
    spawnGems();

    // OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 5, -12);
    controls.update();

    // implement skybox with cubemap
    {
        const loader = new THREE.CubeTextureLoader();
        loader.setPath("../imgs/");
        const sky = loader.load([
            "xpos.png",
            "xneg.png",
            "ypos.png",
            "yneg.png",
            "zpos.png",
            "zneg.png",
        ]);
        sky.colorSpace = THREE.SRGBColorSpace;
        scene.background = sky;
        scene.environment = sky;
    }

    // ground
    const groundTex = new THREE.TextureLoader().load("../imgs/cobble.png");
    groundTex.colorSpace = THREE.SRGBColorSpace;
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(12, 12);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ======= primary shapes =======
    // test cube
    scene.add(new THREE.AxesHelper(2));
    const testCube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    testCube.position.set(0, 1, 0);
    testCube.castShadow = true;
    testCube.receiveShadow = true;
    scene.add(testCube);

    // test sphere
    const testSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 24, 16),
        new THREE.MeshStandardMaterial({ color: 0x66ccff })
    );
    testSphere.position.set(2, 1, 0);
    testSphere.castShadow = true;
    testSphere.receiveShadow = true;
    scene.add(testSphere);

    // test cylinder
    const testCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 1.4, 24),
        new THREE.MeshStandardMaterial({ color: 0xffaa66 })
    );
    testCylinder.position.set(-2, 0.7, 0);
    testCylinder.castShadow = true;
    testCylinder.receiveShadow = true;
    scene.add(testCylinder);

    const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.18, 16, 64), // param: ring size, thickness
        new THREE.MeshStandardMaterial({ color: 0x9b7cff, roughness: 0.4, metalness: 0.2 })
    );
    torus.position.set(0, 1.2, 2);   // in front of cube a bit
    torus.castShadow = true;
    torus.receiveShadow = true;
    scene.add(torus);

    // =======lights======
    // Ambient Light
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // Directional Light
    const moon = new THREE.DirectionalLight(0xffffff, 1.2);
    moon.position.set(10, 20, 10);
    moon.castShadow = true;
    moon.target.position.set(0, 5, -12);
    scene.add(moon.target);
    scene.add(moon);

    // PointLight
    const torch = new THREE.PointLight(0xffaa55, 3.0, 30);
    torch.position.set(0, 6, -10);
    torch.castShadow = true;
    scene.add(torch);



    // resize + animate
    function resizeIfNeeded() {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const need = canvas.width !== w || canvas.height !== h;
        if (need) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        resizeIfNeeded();

        // primary shape rotation
        testCube.rotation.y += 0.01;
        testSphere.rotation.z += 0.01;
        testCylinder.rotation.x -= 0.01;
        torus.rotation.x += 0.01;
        torus.rotation.y += 0.02;

        renderer.render(scene, camera);
    }
    animate();
}

main();