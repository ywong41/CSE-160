import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

    // ======= Camera controls =======
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 5, -12);
    controls.update();

    // add audio object 
    const gemSound = new Audio("../audio/gem.mp3");
    gemSound.volume = 0.5;

    const doorSound = new Audio("../audio/doorOpen.mp3");
    doorSound.volume = 0.6;

    const catSound = new Audio("../audio/cat.mp3");
    catSound.volume = 0.6;
    catSound.preload = "auto";

    let catSoundTimer = null;

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

    // path in front of temple
    const pathTex = new THREE.TextureLoader().load("../imgs/mossyGround.png"); // or stone/brick
    pathTex.colorSpace = THREE.SRGBColorSpace;
    pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;
    pathTex.repeat.set(3, 15);  // more repeats along length

    const path = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 28), // width, length
        new THREE.MeshStandardMaterial({ map: pathTex, roughness: 1.0 })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 15); // y above ground avoid z-fighting
    path.receiveShadow = true;
    scene.add(path);

    // braziers
    const braziers = [];

    // ======= Light Sources =======
    // Ambient Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    // Directional Light
    const moon = new THREE.DirectionalLight(0xffffff, 1.2);
    moon.position.set(10, 20, 10);  // light should come from the front, above the temple
    moon.castShadow = true;
    moon.target.position.set(0, 5, -12);
    scene.add(moon.target);
    scene.add(moon);

    // PointLight
    const torch = new THREE.PointLight(0xffaa55, 3.0, 30);
    torch.position.set(0, 6, -10);
    torch.castShadow = true;
    scene.add(torch);

    // ======== temple textures ========
    const texLoader = new THREE.TextureLoader();

    // box texture for cubes/boxes/walls/roof
    const boxTex = texLoader.load("../imgs/MayanStone.png");
    boxTex.colorSpace = THREE.SRGBColorSpace;
    boxTex.wrapS = boxTex.wrapT = THREE.RepeatWrapping;
    boxTex.repeat.set(4, 2); // tweak if stretched
    boxTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // cylinder pillars
    const cylTex = texLoader.load("../imgs/forest.png");
    cylTex.colorSpace = THREE.SRGBColorSpace;
    cylTex.wrapS = cylTex.wrapT = THREE.RepeatWrapping;
    cylTex.repeat.set(1, 4); // taller tiling for pillars
    cylTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // materials
    const wallMat = new THREE.MeshStandardMaterial({
        map: boxTex,
        roughness: 1.0,
        metalness: 0.0,
    });

    const pillarMat = new THREE.MeshStandardMaterial({
        map: cylTex,
        roughness: 1.0,
        metalness: 0.0,
    });

    function addTemple(scene) {
        const temple = new THREE.Group();
        temple.position.set(0, 0, -12);   // add temple into the scene
        scene.add(temple);

        // cube helper
        function addBox(w, h, d, x, y, z, mat) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = true;
            m.receiveShadow = true;
            temple.add(m);
            return m;
        }

        // cylinder helper
        function addColumn(r, h, x, y, z, mat) {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat);
            m.position.set(x, y, z);
            m.castShadow = true;
            m.receiveShadow = true;
            temple.add(m);
            return m;
        }

        // temple base
        addBox(16, 1.6, 16, 0, 0.8, 0, wallMat);   // base height 1
        addBox(12, 1.6, 12, 0, 2.4, 0, wallMat);   // base height 2
        addBox(9, 1.2, 9, 0, 3.8, 0, wallMat);   // base height 3

        // 7 stairs in front of temple
        for (let i = 0; i < 7; i++) {
            const stepW = 8 - i * 0.6;
            const stepH = 0.3;
            const stepD = 1.5;
            const stepY = 0.15 + i * stepH;
            const stepZ = 12.7 - i * 1.0;
            addBox(stepW, stepH, stepD, 0, stepY, stepZ, wallMat);
        }

        // ===== Braziers next to the stairs =====
        function addBrazier(x, z) {
            const g = new THREE.Group();
            g.position.set(x, 0, z); // temple-local

            // stone materials
            const stoneMat = wallMat;

            // base pillar
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.45, 1.2, 18),
                stoneMat
            );
            base.position.y = 0.6;
            base.castShadow = true;
            base.receiveShadow = true;
            g.add(base);

            // bowl (squashed sphere)
            const bowl = new THREE.Mesh(
                new THREE.SphereGeometry(0.55, 18, 12),
                stoneMat
            );
            bowl.scale.y = 0.55;
            bowl.position.y = 1.35;
            bowl.castShadow = true;
            bowl.receiveShadow = true;
            g.add(bowl);

            // rim (torus)
            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(0.52, 0.08, 12, 24),
                stoneMat
            );
            rim.rotation.x = Math.PI / 2;
            rim.position.y = 1.35;
            rim.castShadow = true;
            rim.receiveShadow = true;
            g.add(rim);

            // flame
            const flameMat = new THREE.MeshStandardMaterial({
                color: 0xffaa55,
                emissive: 0xff5500,
                emissiveIntensity: 1.8,
                roughness: 0.6,
                metalness: 0.0,
            });

            const flame = new THREE.Mesh(
                new THREE.SphereGeometry(0.18, 12, 10),
                flameMat
            );
            flame.position.y = 1.55;
            flame.castShadow = false;
            g.add(flame);

            // tiny point light
            const light = new THREE.PointLight(0xffaa55, 1.2, 12);
            light.position.set(0, 1.55, 0);
            light.castShadow = true;
            g.add(light);

            temple.add(g);

            braziers.push({
                flame,
                light,
                baseY: flame.position.y,
                baseI: light.intensity,
                phase: Math.random() * Math.PI * 2,
            });
        }

        addBrazier(-5.13, 11); // left of stairs
        addBrazier(5.13, 11); // right of stairs

        // ======= shrine door =======
        // doorway open to interior space
        const W = 6.5, H = 3.2, D = 6.5;
        const cx = 0, cy = 5.6, cz = 0;
        const tWall = 0.45; // thickness

        // left, right walls
        addBox(tWall, H, D, cx - (W / 2 - tWall / 2), cy, cz, wallMat);
        addBox(tWall, H, D, cx + (W / 2 - tWall / 2), cy, cz, wallMat);

        // back wall
        addBox(W, H, tWall, cx, cy, cz - (D / 2 - tWall / 2), wallMat);

        // roof and floor
        addBox(W, tWall, D, cx, cy + (H / 2 - tWall / 2), cz, wallMat);
        addBox(W, tWall, D, cx, cy - (H / 2 - tWall / 2), cz, wallMat);


        const doorTex = texLoader.load("../imgs/door.jpg");
        doorTex.colorSpace = THREE.SRGBColorSpace;
        doorTex.wrapS = doorTex.wrapT = THREE.ClampToEdgeWrapping;
        doorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const doorMat = new THREE.MeshStandardMaterial({
            map: doorTex,
            roughness: 0.9,
            metalness: 0.0,
        });
        // doorway position
        const doorZ = 3.25 + 0.26;
        //  solid door panel covers the opening
        const doorPanel = addBox(
            5.8,    // width 
            3.2,    // height
            0.5,    // thickness
            0.0,    // x
            5.2,    // y
            doorZ + 0.08, // slightly forward
            doorMat
        );
        doorPanel.userData.closedY = doorPanel.position.y;
        temple.userData.doorPanel = doorPanel;

        // aim at the doorway opening
        const doorAim = new THREE.Object3D();
        doorAim.position.set(0, 5.2, doorZ);
        temple.add(doorAim);
        temple.userData.doorAim = doorAim;

        //Roof tiers
        addBox(8.0, 0.9, 8.0, 0, 7.3, 0, wallMat);
        addBox(6.0, 0.85, 6.0, 0, 8.175, 0, wallMat);
        addBox(4.5, 0.8, 4.5, 0, 9.0, 0, wallMat);

        const colY = 5.2;
        const colH = 3.4;
        const r = 0.28;

        // 4 corner columns around shrine
        addColumn(r, colH, -3.2, colY, -3.2, pillarMat);
        addColumn(r, colH, 3.2, colY, -3.2, pillarMat);
        addColumn(r, colH, -3.2, colY, 3.2, pillarMat);
        addColumn(r, colH, 3.2, colY, 3.2, pillarMat);

        // ======= Treasure =======
        const chest = new THREE.Group();

        // goldish material for treasure chest
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd26a,
            roughness: 0.35,
            metalness: 0.85,
            emissive: 0x332200,
            emissiveIntensity: 0.2,
        });

        // chest base
        const baseW = 1.4, baseH = 0.6, baseD = 0.9;
        const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), goldMat);
        base.castShadow = true;
        base.receiveShadow = true;
        chest.add(base);

        // lid with hinge pivot at back-top edge
        const lidPivot = new THREE.Group();
        lidPivot.position.set(0, baseH / 2, -baseD / 2);
        chest.add(lidPivot);

        const lid = new THREE.Mesh(new THREE.BoxGeometry(baseW, 0.25, baseD), goldMat);
        lid.position.set(0, 0.125, baseD / 2); // move forward from hinge
        lid.castShadow = true;
        lid.receiveShadow = true;
        lidPivot.add(lid);

        // place chest inside shrine
        const floorTopY = cy - H / 2 + tWall; // top surface of floor slab
        chest.position.set(0, floorTopY + baseH / 2, 1.2);
        temple.add(chest);

        // glow light
        const treasureLight = new THREE.PointLight(0xffdd66, 0.0, 12);
        treasureLight.position.copy(chest.position).add(new THREE.Vector3(0, 1.0, 0));
        temple.add(treasureLight);

        // save refs for win animation
        temple.userData.treasure = { chest, lidPivot, light: treasureLight };

        return temple;
    }

    const temple = addTemple(scene);
    const doorPanel = temple.userData.doorPanel;
    const doorAim = temple.userData.doorAim;
    const treasure = temple.userData.treasure;
    const templeBox = new THREE.Box3().setFromObject(temple).expandByScalar(1.0);

    // Add custom 3D model
    const gltfLoader = new GLTFLoader();
    const floaters = []; // store models to animate

    let cat = null;
    let catShouldShow = false;

    // function to load glb object
    function loadGLB(url, pos, scale = 1, diamondsOnTop = 0, floating = true) {
        gltfLoader.load(url, (gltf) => {
            const model = gltf.scene;
            model.position.copy(pos);
            model.scale.setScalar(scale);

            model.traverse((obj) => {
                if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
            });

            scene.add(model);

            if (diamondsOnTop > 0) spawnDiamondsOnTopOfObject(model, diamondsOnTop);

            if (floating) {
                model.userData.baseY = pos.y;
                model.userData.bobSpeed = 1 + Math.random() * 0.6;
                model.userData.bobAmp = 0.2 + Math.random() * 0.25;
                floaters.push(model);
            }
        });
    }

    // load custom textured 3D model
    // x: left/right y: up/down z: front/back
    loadGLB("../models/mediumIsland.glb", new THREE.Vector3(-24, 6.0, -24), 4, 1, true);
    loadGLB("../models/largeIsland.glb", new THREE.Vector3(-12, 2.5, -12), 5, 1, true);
    loadGLB("../models/Trees.glb", new THREE.Vector3(-18, 0.0, 18), 13.0, 0, false);
    loadGLB("../models/Trees.glb", new THREE.Vector3(18, 0.0, 18), 13.0, 0, false);
    loadGLB("../models/Roses.glb", new THREE.Vector3(22, 3.0, -20), 2, 0, false);
    loadGLB("../models/Roses.glb", new THREE.Vector3(19, 3.0, -20), 2, 0, false);
    loadGLB("../models/Roses.glb", new THREE.Vector3(16, 3.0, -20), 2, 0, false);
    loadGLB("../models/Bench.glb", new THREE.Vector3(22, 3.0, -14), 10, 0, false);
    loadGLB("../models/Rock.glb", new THREE.Vector3(24, -0.4, -2), 20, 0, false);

    // ======= glb models: Dingus the cat =======
    gltfLoader.load("../models/dingus_the_cat.glb", (gltf) => {
        cat = gltf.scene;
        cat.visible = false;
        cat.scale.setScalar(0.35);
        cat.rotation.y = 0;


        cat.traverse((o) => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
        });

        if (treasure) {
            // cat position above chest
            cat.position.set(
                treasure.chest.position.x,
                treasure.chest.position.y + 0.5,
                treasure.chest.position.z
            );
        }

        cat.userData.baseY = cat.position.y;

        temple.add(cat);
        if (catShouldShow) cat.visible = true;
    }, undefined, (err) => console.error("Cat GLB load failed:", err));


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

    // ======= Diamond Hunt =======
    const TOTAL_DIAMONDS = 8;
    let collected = 0;

    const diamonds = [];
    const bursts = [];

    // ===== ember particles =====
    const embers = [];
    const emberGeo = new THREE.SphereGeometry(0.05, 6, 6);
    let emberSpawnTimer = 0;

    // ===== victory camera =====
    let victoryCam = false;
    const camGoal = new THREE.Vector3();
    const targetGoal = new THREE.Vector3();


    const taskBox = document.querySelector("#taskBox");
    function updateHUD() {
        if (taskBox) taskBox.textContent = `Collected Diamonds: ${collected}/${TOTAL_DIAMONDS}`;
    }
    updateHUD();

    // click picking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // diamond look
    const diamondGeo = new THREE.OctahedronGeometry(0.4);
    const diamondMat = new THREE.MeshStandardMaterial({
        color: 0x66e0ff,
        emissive: 0x1177aa,
        emissiveIntensity: 1.4,
        roughness: 0.25,
        metalness: 1,
        emissiveIntensity: 0.35
    });

    function makeDiamond(pos) {
        const d = new THREE.Mesh(diamondGeo, diamondMat.clone());
        d.position.copy(pos);
        d.castShadow = true;
        d.userData.isDiamond = true;
        d.userData.baseY = pos.y;
        d.userData.spin = 0.6 + Math.random();
        scene.add(d);
        diamonds.push(d);
    }

    // add particle burst to make it more game like
    function spawnBurst(worldPos) {
        const group = new THREE.Group();
        group.position.copy(worldPos);

        const particleGeo = new THREE.SphereGeometry(0.06, 8, 8);
        for (let i = 0; i < 20; i++) {
            const p = new THREE.Mesh(
                particleGeo,
                new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
            );

            const vel = new THREE.Vector3(
                (Math.random() - 0.5),
                Math.random() * 0.8 + 0.2,
                (Math.random() - 0.5)
            ).normalize().multiplyScalar(3 + Math.random() * 3);

            group.add(p);
            bursts.push({ mesh: p, vel, life: 0.6 });
        }

        scene.add(group);
        // store group on each particle so we can remove later
        for (const b of bursts) if (!b.group) b.group = group;
    }

    function spawnEmberFromBrazier(b) {
        const worldPos = new THREE.Vector3();
        b.flame.getWorldPosition(worldPos);

        const ember = new THREE.Mesh(
            emberGeo,
            new THREE.MeshBasicMaterial({
                color: 0xffaa33,
                transparent: true,
                opacity: 0.95
            })
        );

        ember.position.copy(worldPos);
        ember.position.x += (Math.random() - 0.5) * 0.25;
        ember.position.z += (Math.random() - 0.5) * 0.25;
        ember.position.y += Math.random() * 0.08;

        ember.userData.vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.015,
            0.03 + Math.random() * 0.03,
            (Math.random() - 0.5) * 0.015
        );

        ember.userData.life = 0.7 + Math.random() * 0.5;

        scene.add(ember);
        embers.push(ember);
    }

    // WIN spotlight
    let won = false;
    let doorOpenT = 0;

    // win light var
    let winLightT = 0;
    let winLights = null;

    function onWin() {
        if (won) return;
        won = true;

        doorSound.currentTime = 0;
        doorSound.play().catch(() => { });

        catShouldShow = true;
        if (cat) cat.visible = true;
        if (treasure) {
            treasure.light.intensity = 3.5; // glow ON
        }

        // make torch brighter
        torch.intensity = 5.0;

        // update HUD
        if (taskBox) taskBox.textContent = "Collected Diamonds: 8/8 | Temple Unlocked! Click on the cat to enjoy cat dance";

        // fireworks bursts above the temple
        for (let i = 0; i < 6; i++) {
            spawnBurst(new THREE.Vector3(
                (Math.random() - 0.5) * 6,
                10 + Math.random() * 4,
                -12 + (Math.random() - 0.5) * 6
            ));
        }

        // start door opening animation
        doorOpenT = 0;

        // ===== RGB transit to white spotlight =====
        if (!winLights) {
            const target = doorAim;

            function makeSpot(hex, pos) {
                const s = new THREE.SpotLight(hex, 0, 220, Math.PI / 6, 0.8, 2);
                s.position.copy(pos);
                s.castShadow = true;
                s.target = target;
                scene.add(s);
                return s;
            }

            const rgb = [
                makeSpot(0xff0000, new THREE.Vector3(-14, 18, 16)),
                makeSpot(0x00ff00, new THREE.Vector3(0, 22, 18)),
                makeSpot(0x0000ff, new THREE.Vector3(14, 18, 16)),
            ];

            const white = new THREE.SpotLight(0xffffff, 0, 260, Math.PI / 4, 1.0, 2);
            white.position.set(0, 26, 22);
            white.castShadow = true;
            white.target = target;
            scene.add(white);

            winLights = { rgb, white, target };
        }

        winLightT = 0;

        // ===== start victory camera move =====
        victoryCam = true;
        doorAim.getWorldPosition(targetGoal);
        camGoal.copy(targetGoal).add(new THREE.Vector3(0, 4.5, 14));

        // lock camera controls during cutscene
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableZoom = false;

        // unlock after 2.5 seconds
        setTimeout(() => {
            victoryCam = false;
            controls.enableRotate = true;
            controls.enablePan = true;
            controls.enableZoom = true;
        }, 2500);
    }

    // diamond spawn on ground
    function spawnDiamondOnGround(areaHalf = 25) {
        for (let tries = 0; tries < 200; tries++) {
            const x = (Math.random() * 2 - 1) * areaHalf; // left + right
            const z = Math.random() * areaHalf;           // only spawn diamond in the forest
            const pos = new THREE.Vector3(x, 1.2, z);

            if (templeBox.containsPoint(pos)) continue;

            makeDiamond(pos);
            return true;
        }
        return false;
    }

    // spawn diamonds on floating island
    function spawnDiamondsOnTopOfObject(obj, count = 1) {
        const box = new THREE.Box3().setFromObject(obj);

        for (let k = 0; k < count; k++) {
            for (let tries = 0; tries < 200; tries++) {
                const x = THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random());
                const z = THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random());
                const y = box.max.y + 0.8; // float above top
                const pos = new THREE.Vector3(x, y, z);

                if (templeBox.containsPoint(pos)) continue;

                makeDiamond(pos);
                break;
            }
        }
    }

    // spawn 6 diamond on ground
    for (let i = 0; i < 6; i++) spawnDiamondOnGround();

    function animate(time) {
        requestAnimationFrame(animate);
        resizeIfNeeded();

        const t = time * 0.001;

        // float animation
        for (const m of floaters) {
            m.position.y = m.userData.baseY + Math.sin(t * m.userData.bobSpeed) * m.userData.bobAmp;
            m.rotation.y += 0.003; // slow spin
        }

        // animate octahedron shapes, diamonds spin + bob
        for (const d of diamonds) {
            d.rotation.y += d.userData.spin * 0.02;
            d.position.y = d.userData.baseY + Math.sin(t * 3.0 + d.id) * 0.25;
        }

        // ===== brazier flicker =====
        for (const b of braziers) {
            const flick = 0.85 + 0.15 * Math.sin(t * 12 + b.phase);
            b.flame.scale.setScalar(flick);
            b.flame.position.y = b.baseY + 0.05 * Math.sin(t * 10 + b.phase);
            b.light.intensity = b.baseI + 0.4 * flick;
        }

        // ===== ember spawn =====
        emberSpawnTimer += 1 / 60;
        if (emberSpawnTimer > 0.06) {
            emberSpawnTimer = 0;
            for (const b of braziers) {
                spawnEmberFromBrazier(b);
            }
        }

        // ===== ember update =====
        for (let i = embers.length - 1; i >= 0; i--) {
            const e = embers[i];
            e.position.add(e.userData.vel);
            e.userData.life -= 1 / 60;
            e.material.opacity = Math.max(0, e.userData.life / 1.2);
            e.scale.multiplyScalar(0.995);

            if (e.userData.life <= 0) {
                scene.remove(e);
                e.material.dispose();
                embers.splice(i, 1);
            }
        }

        // particle bursts
        for (let i = bursts.length - 1; i >= 0; i--) {
            const b = bursts[i];
            b.life -= 1 / 60;
            b.mesh.position.addScaledVector(b.vel, 1 / 60);
            b.vel.y -= 6.0 * (1 / 60);
            b.mesh.material.opacity = Math.max(0, b.life / 0.6);

            if (b.life <= 0) {
                scene.remove(b.group);
                bursts.splice(i, 1);
            }
        }

        // win scene animation
        if (won && doorPanel) {
            doorOpenT = Math.min(1, doorOpenT + 0.015);
            const lift = doorOpenT * 5.0; // higher lift so it clears the opening
            doorPanel.position.y = doorPanel.userData.closedY + lift;
        }

        if (won && treasure) {
            // open chest lid as the door opens
            treasure.lidPivot.rotation.x = -doorOpenT * (Math.PI / 1.8);
        }

        if (won && cat) {
            cat.position.y = cat.userData.baseY + Math.sin(t * 2.5) * 0.13;
            cat.rotation.y += 0.25; // spins around Y

        }

        if (won && winLights) {
            winLightT = Math.min(1, winLightT + 0.005);

            const pulse = 0.5 + 0.5 * Math.sin(t * 4.0);
            const rgbStrength = 1 - winLightT;

            winLights.rgb[0].intensity = 9000 * rgbStrength * pulse;
            winLights.rgb[1].intensity = 9000 * rgbStrength * pulse;
            winLights.rgb[2].intensity = 9000 * rgbStrength * pulse;

            winLights.white.intensity = 50 * winLightT;
            winLights.white.angle = THREE.MathUtils.lerp(Math.PI / 4, Math.PI / 20, winLightT);
            winLights.white.penumbra = THREE.MathUtils.lerp(1.0, 0.2, winLightT);

            // dim normal scene lights so the effect stands out
            moon.intensity = THREE.MathUtils.lerp(1.2, 0.25, winLightT);
            ambient.intensity = THREE.MathUtils.lerp(0.2, 0.05, winLightT);
        }

        if (victoryCam) {
            camera.position.lerp(camGoal, 0.02);
            controls.target.lerp(targetGoal, 0.02);
            controls.update();
        }
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    function isInsideObject(obj, root) {
        while (obj) {
            if (obj === root) return true;
            obj = obj.parent;
        }
        return false;
    }

    function collectDiamond(d) {
        if (!d || d.userData.collected) return;
        d.userData.collected = true;

        gemSound.currentTime = 0;
        gemSound.play().catch(() => { });

        spawnBurst(d.position);

        scene.remove(d);
        const idx = diamonds.indexOf(d);
        if (idx >= 0) diamonds.splice(idx, 1);

        collected++;
        updateHUD();

        if (collected >= TOTAL_DIAMONDS && !won) onWin();
    }

    // click to collect diamond, and click cat GLB to play cat sound
    canvas.addEventListener("pointerdown", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        if (!hits.length) return;

        for (const hit of hits) {
            const obj = hit.object;

            // click diamond
            if (obj.userData.isDiamond) {
                collectDiamond(obj);
                return;
            }

            // click cat glb
            if (cat && cat.visible && isInsideObject(obj, cat)) {
                catSound.pause();
                catSound.currentTime = 0;
                catSound.play().catch(() => { });

                clearTimeout(catSoundTimer);
                catSoundTimer = setTimeout(() => {
                    catSound.pause();
                    catSound.currentTime = 0;
                }, 10000);

                return;
            }
        }
    });

}

main();