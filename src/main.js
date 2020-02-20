
import {
    WebGLRenderer,
    Scene, PerspectiveCamera,
    Mesh, MeshPhongMaterial, MeshNormalMaterial, BoxGeometry,
    AmbientLight, TextureLoader, SpriteMaterial, Sprite, OrthographicCamera,
    PlaneBufferGeometry, MeshBasicMaterial, Vector3, NearestFilter, NearestMipmapLinearFilter,
    WebGLRenderTarget, Color,
    LinearFilter, ClampToEdgeWrapping
} from 'three';
import makeEllipse from './ellipse';

// camera
let VIEW_ANGLE = 45;
let ASPECT = 1;
let NEAR = 0.001;
let FAR = 5000;

let mainCamera;
let inputWidth;
let inputHeight;
let rendererTarget;
let rendererCurrent;
let rendererTest;
let rendererPrimitive;

let sceneTarget;
let sceneCurrent;
let sceneTest;
let scenePrimitive;

let renderTargetTarget;
let renderTargetCurrent;
let renderTargetTest;
let renderTargetPrimitive;

let planeTarget;
let planeCurrent;
let planeTest;
let background;

init();
animate();

function newRenderer(elementId) {
    let parentElement = document.getElementById(elementId);
    let renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); // renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(inputWidth, inputHeight);
    let rendererElement = renderer.domElement;
    rendererElement.setAttribute('id', 'canvas-' + elementId);
    parentElement.appendChild(rendererElement);
    return renderer;
}

function init() {
    // size
    let inputElement = document.getElementById('input-image');
    inputWidth = inputElement.offsetWidth;
    inputHeight = inputElement.offsetHeight;
    ASPECT = inputWidth / inputHeight;

    // renderer
    rendererTarget = newRenderer('buffer-target');
    rendererCurrent = newRenderer('buffer-current');
    rendererTest = newRenderer('buffer-test');
    rendererPrimitive = newRenderer('buffer-primitive');

    renderTargetTarget = new WebGLRenderTarget(inputWidth, inputHeight);
    renderTargetCurrent = new WebGLRenderTarget(inputWidth, inputHeight);
    renderTargetTest = new WebGLRenderTarget(inputWidth, inputHeight);
    renderTargetPrimitive = new WebGLRenderTarget(inputWidth, inputHeight);

    // scene
    sceneTarget = new Scene();
    sceneCurrent = new Scene();
    sceneTest = new Scene();
    scenePrimitive = new Scene();

    // camera
    let insideHeight = inputHeight / 10;
    let insideWidth = inputWidth / 10;
    mainCamera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    mainCamera.position.set(0, 0, (0.5 * insideHeight) / (Math.tan(Math.PI / 8)));

    // setup
    loadImage(insideWidth, insideHeight);

    addListeners();
}


// Buffers
let bufferTarget; let bufferTargetLength = 0;
let bufferCurrent; let bufferCurrentLength = 0;
let bufferTest; let bufferTestLength = 0;
let bufferPrimitive; let bufferPrimitiveLength = 0;
function initBuffers() {
    bufferTargetLength = renderTargetTarget.width * renderTargetTarget.height * 4;
    bufferTarget = new Uint8Array(bufferTargetLength);
    bufferCurrentLength = bufferTargetLength;
    bufferCurrent = new Uint8Array(bufferCurrentLength);
    bufferPrimitiveLength = bufferTargetLength;
    bufferPrimitive = new Uint8Array(bufferPrimitiveLength);
    bufferTestLength = bufferTargetLength;
    bufferTest = new Uint8Array(bufferTestLength);
}

function fillTargetBuffer() {
    // read image into the target buffer
    rendererTarget.readRenderTargetPixels(renderTargetTarget, 0, 0, inputWidth, inputHeight, bufferTarget);
    console.log(bufferTarget);
}

// Colors
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

// Primitives
function addBackground(color, whichScene) {
    let planegeom = new PlaneBufferGeometry(inputWidth, inputHeight, 1);
    let planemat = new MeshBasicMaterial({ color });
    background = new Mesh(planegeom, planemat);
    whichScene.add(background);
    // sceneTarget.remove(planeTarget);
}

function addSomeShit(whichScene) {
    let e = makeEllipse(1, 1, 1, 0.5, Math.PI / 8);
    whichScene.add(e);
}

function begin() {
    initBuffers();

    // Get rendered picture into TargetBuffer
    fillTargetBuffer();

    // Init CurrentScene with background
    let color = computeBackgroundColorOutput();

    addBackground(color, sceneCurrent);

    // Init TestScene with background
    addBackground(color, sceneTest);

    // Init PrimitiveScene with ellipse
    addSomeShit(scenePrimitive);
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

function loadImage(insideWidth, insideHeight) {
    let map = new TextureLoader().load('img/test.png');
    map.generateMipmaps = false;
    map.wrapS = map.wrapT = ClampToEdgeWrapping;
    map.minFilter = LinearFilter;
    let planegeom = new PlaneBufferGeometry(insideWidth, insideHeight, 1);
    let planemat = new MeshBasicMaterial({color: 0xffffff, map});
    planeTarget = new Mesh(planegeom, planemat);
    sceneTarget.add(planeTarget);
}

let isRequestingCapture = false;
let isRequestingBegin = false;
function captureFrame() {
    isRequestingCapture = false;
    let canvas = document.getElementById('canvas-buffer-current');
    let outputImage = document.getElementById('output-image');
    let data = canvas.toDataURL('image/png', 1);
    outputImage.setAttribute('src', data);
    if (isRequestingBegin) {
        isRequestingBegin = false;
        begin();
    }
}

function renderPass(renderer, renderTarget, scene, camera) {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame(animate);
    if (isRequestingCapture || isRequestingBegin) {
        captureFrame();
    }
    renderPass(rendererTarget, renderTargetTarget, sceneTarget, mainCamera);
    renderPass(rendererCurrent, renderTargetCurrent, sceneCurrent, mainCamera);
    renderPass(rendererTest, renderTargetTest, sceneTest, mainCamera);
    renderPass(rendererPrimitive, renderTargetPrimitive, scenePrimitive, mainCamera);
}
