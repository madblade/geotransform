
import {
    WebGLRenderer,
    Scene, PerspectiveCamera,
    Mesh, MeshPhongMaterial, MeshNormalMaterial, BoxGeometry,
    AmbientLight, TextureLoader, SpriteMaterial, Sprite, OrthographicCamera,
    PlaneBufferGeometry, MeshBasicMaterial, Vector3, NearestFilter, NearestMipmapLinearFilter
} from 'three';
import makeEllipse from './ellipse';

// camera
let VIEW_ANGLE = 45;
let ASPECT = 1;
let NEAR = 0.001;
let FAR = 5000;

let camera;
let scene;
let renderer;
let cube;

init();
animate();

function init() {
    let container = document.getElementById('container');
    let inputElement = document.getElementById('input-image');
    let inputWidth = inputElement.offsetWidth;
    let inputHeight = inputElement.offsetHeight;
    ASPECT = inputWidth / inputHeight;

    // renderer
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    // renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(inputWidth, inputHeight);
    let rendererElement = renderer.domElement;
    rendererElement.setAttribute('id', 'canvas');
    container.appendChild(rendererElement);

    // scene
    scene = new Scene();
    // let light = new AmbientLight();
    // scene.add(light);
    let e = makeEllipse(1, 1, 1, 0.5, Math.PI / 8);
    scene.add(e);

    // camera
    let insideHeight = inputHeight / 10;
    let insideWidth = inputWidth / 10;
    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(0, 0, (0.5 * insideHeight) / (Math.tan(Math.PI / 8)));

    let cubeGeo = new BoxGeometry(12.5, 12.5, 12.5);
    cube = new Mesh(cubeGeo, new MeshNormalMaterial());
    cube.position.z = 10;

    let map = new TextureLoader().load('img/test.png');
    // map.anisotropy = 16;
    // map.magFilter = NearestFilter;
    // map.minFilter = NearestMipmapLinearFilter;

    let planegeom = new PlaneBufferGeometry(insideWidth, insideWidth, 1);
    let planemat = new MeshBasicMaterial({color: 0xffffff, map});
    let plane = new Mesh(planegeom, planemat);
    scene.add(plane);

    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 66: // B
                isRequestingCapture = true;
                break;
            case 221: // À
                isRequestingCapture = true;
                captureFrame();
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
