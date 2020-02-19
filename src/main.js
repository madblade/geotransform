
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
let renderer;
let inputWidth;
let inputHeight;

let sceneTarget;
let sceneCurrent;
let sceneTest;
let scenePrimitive;

let renderTargetTarget;
let renderTargetCurrent;
let renderTargetTest;
let renderTargetPrimitive;

let planeTarget;
let background;

init();
animate();

function loadImage(insideWidth, insideHeight) {
    let map = new TextureLoader().load('img/test.png');
    let planegeom = new PlaneBufferGeometry(insideWidth, insideHeight, 1);
    let planemat = new MeshBasicMaterial({color: 0xffffff, map});
    planeTarget = new Mesh(planegeom, planemat);
    sceneTarget.add(planeTarget);
}

function addBackground(color) {
    let planegeom = new PlaneBufferGeometry(inputWidth, inputHeight, 1);
    let planemat = new MeshBasicMaterial({ color });
    background = new Mesh(planegeom, planemat);
    sceneTarget.add(background);
    sceneTarget.remove(planeTarget);
}

function addSomeShit() {
    let e = makeEllipse(1, 1, 1, 0.5, Math.PI / 8);
    sceneTarget.add(e);
}

let bufferTarget; let bufferTargetLength = 0;
function fillBuffers() {
    bufferTargetLength = renderTargetTarget.width * renderTargetTarget.height * 4;
    bufferTarget = new Uint8Array(bufferTargetLength);
    bufferCurrentLength = bufferTargetLength;
    bufferCurrent = new Uint8Array(bufferCurrentLength);
    bufferPrimitiveLength = bufferTargetLength;
    bufferPrimitive = new Uint8Array(bufferPrimitiveLength);
    bufferTestLength = bufferTargetLength;
    bufferTest = new Uint8Array(bufferTestLength);
    // read image into the target buffer
    renderer.readRenderTargetPixels(renderTargetTarget, 0, 0, inputWidth, inputHeight, bufferTarget);
    console.log(bufferTarget);
}
function computeBackgroundColorOutput() {
    let r = 0; let g = 0; let b = 0; let tot = 0;
    for (let i = 0; i < bufferTargetLength; i += 4) {
        r += bufferTarget[i];
        g += bufferTarget[i + 1];
        b += bufferTarget[i + 2];
        ++tot;
    }
    r /= tot;
    g /= tot;
    b /= tot;
    return new Color(r, g, b);
}

let bufferCurrent; let bufferCurrentLength = 0;
let bufferTest; let bufferTestLength = 0;
let bufferPrimitive; let bufferPrimitiveLength = 0;

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
    renderTargetTarget = new WebGLRenderTarget(inputWidth, inputHeight);

    // scene
    sceneTarget = new Scene();

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
    fillBuffers(); // target buffer

    let color = computeBackgroundColorOutput();
    addBackground(color);

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
    renderer.setRenderTarget(renderTargetTarget);
    renderer.render(sceneTarget, camera);
    renderer.setRenderTarget(null);
    renderer.render(sceneTarget, camera);
}
