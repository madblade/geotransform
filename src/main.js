
import {
    WebGLRenderer,
    Scene, PerspectiveCamera,
    Mesh, MeshPhongMaterial, MeshNormalMaterial, BoxGeometry,
    AmbientLight
} from 'three';

// scene size
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

// camera
let VIEW_ANGLE = 45;
let ASPECT = WIDTH / HEIGHT;
let NEAR = 0.001;
let FAR = 500;

let camera;
let scene;
let renderer;
let cube;

init();
animate();

function init() {
    let container = document.getElementById('container');
    let inputWidth = document.getElementById('input').offsetWidth;
    let height = inputWidth / ASPECT;
    console.log(height);

    // renderer
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(inputWidth, height);
    container.appendChild(renderer.domElement);

    // scene
    scene = new Scene();
    let l = new AmbientLight();
    scene.add(l);

    // camera
    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(0, 0, 160);

    let cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
    cube = new Mesh(cubeGeo, new MeshPhongMaterial({ color: 0xff0000 }));
    cube = new Mesh(cubeGeo, new MeshNormalMaterial());
    scene.add(cube);

    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 32:
                cube.position.y += 1.2;
                break;
            case 16:
                cube.position.y -= 1.2;
                break;
            case 83:
                camera.position.z++;
                break;
            case 90:
                camera.position.z--;
                break;
            default: break;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.z += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}
