
import {
    WebGLRenderer,
    Scene, PerspectiveCamera,
    Mesh, MeshPhongMaterial, MeshNormalMaterial, BoxGeometry,
    AmbientLight, TextureLoader, SpriteMaterial, Sprite, OrthographicCamera,
    PlaneBufferGeometry, MeshBasicMaterial, Vector3, NearestFilter, NearestMipmapLinearFilter, WebGLRenderTarget, Color
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
let renderTarget;
let inputWidth;
let inputHeight;
let plane;
let background;

init();
animate();

function loadImage(insideWidth, insideHeight) {
    let map = new TextureLoader().load('img/test.png');
    // map.anisotropy = 16;
    // map.magFilter = NearestFilter;
    // map.minFilter = NearestMipmapLinearFilter;

    let planegeom = new PlaneBufferGeometry(insideWidth, insideHeight, 1);
    let planemat = new MeshBasicMaterial({color: 0xffffff, map});
    plane = new Mesh(planegeom, planemat);
    scene.add(plane);
}

function addSomeShit(color) {
    let planegeom = new PlaneBufferGeometry(inputWidth, inputHeight, 1);
    let planemat = new MeshBasicMaterial({ color });
    let background = new Mesh(planegeom, planemat);
    scene.add(background);
    let e = makeEllipse(1, 1, 1, 0.5, Math.PI / 8);
    scene.add(e);
    scene.remove(plane);
}

let firstBuffer;
function computeBackgroundColorOutput() {
    let bufferLength = renderTarget.width * renderTarget.height * 4;
    firstBuffer = new Uint8Array(bufferLength);
    renderer.readRenderTargetPixels(renderTarget, 0, 0, inputWidth, inputHeight, firstBuffer);
    console.log(firstBuffer);
    let r = 0; let g = 0; let b = 0; let tot = 0;
    for (let i = 0; i < bufferLength; i += 4) {
        r += firstBuffer[i];
        g += firstBuffer[i + 1];
        b += firstBuffer[i + 2];
        ++tot;
    }
    r /= tot;
    g /= tot;
    b /= tot;
    return new Color(r, g, b);
}

function init() {
    // size
    let container = document.getElementById('container');
    let inputElement = document.getElementById('input-image');
    inputWidth = inputElement.offsetWidth;
    inputHeight = inputElement.offsetHeight;
    ASPECT = inputWidth / inputHeight;

    // renderer
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); // renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(inputWidth, inputHeight);
    let rendererElement = renderer.domElement;
    rendererElement.setAttribute('id', 'canvas');
    container.appendChild(rendererElement);
    renderTarget = new WebGLRenderTarget(inputWidth, inputHeight);

    // scene
    scene = new Scene();

    // camera
    let insideHeight = inputHeight / 10;
    let insideWidth = inputWidth / 10;
    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(0, 0, (0.5 * insideHeight) / (Math.tan(Math.PI / 8)));

    // setup
    loadImage(insideWidth, insideHeight);

    addListeners();
}

function begin() {
    let color = computeBackgroundColorOutput();
    console.log(color);
    addSomeShit(color);
}

// ####################
// ####### UTIL #######
// ####################

function addListeners() {
    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 66: // B
                isRequestingCapture = true;
                break;
            case 221: // À
                isRequestingBegin = true;
                break;
            default: break;
        }
    });
}

let isRequestingCapture = false;
let isRequestingBegin = false;
function captureFrame() {
    isRequestingCapture = false;
    let canvas = document.getElementById('canvas');
    let outputImage = document.getElementById('output-image');
    let data = canvas.toDataURL('image/png', 1);
    outputImage.setAttribute('src', data);
    if (isRequestingBegin) {
        isRequestingBegin = false;
        begin();
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (isRequestingCapture || isRequestingBegin) {
        captureFrame();
    }
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}
