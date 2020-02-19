
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
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(inputWidth, height);
    renderer.domElement.setAttribute('id', 'canvas');
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
            case 66: // B
                console.log('B hit');
                isRequestingCapture = true;
                break;
            default: break;
        }
    });
}

let isRequestingCapture = false;
function captureFrame() {
    isRequestingCapture = false;
    let canvas = document.getElementById('canvas');
    let outputImage = document.getElementById('output-image');
    let data = canvas.toDataURL('image/png', 1);
    outputImage.setAttribute('src', data);
}

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.z += 0.01;
    cube.rotation.y += 0.01;
    if (isRequestingCapture) {
        captureFrame();
    }
    renderer.render(scene, camera);
}
