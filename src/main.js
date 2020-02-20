
import {
    WebGLRenderer,
    Scene, PerspectiveCamera,
    Mesh, TextureLoader,
    PlaneBufferGeometry, MeshBasicMaterial,
    WebGLRenderTarget, Color,
    LinearFilter, ClampToEdgeWrapping, DataTexture, RGBAFormat,
    // ShaderPass, EffectComposer, RenderPass
} from 'three';
import makeEllipse from './ellipse';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';

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

let renderTargetTarget; let composerTarget;
let renderTargetCurrent; let composerCurrent;
let renderTargetTest; let composerTest;
let renderTargetPrimitive; let composerPrimitive;

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
    rendererElement.setAttribute('id', `canvas-${elementId}`);
    parentElement.appendChild(rendererElement);
    return renderer;
}

function newComposer(renderer, scene, camera, renderTarget) {
    let effectFXAA = new ShaderPass(FXAAShader);
    effectFXAA.uniforms['resolution'].value.set(1 / inputWidth, 1 / inputHeight);
    // effectFXAA.renderToScreen = true;
    let composer = new EffectComposer(renderer, renderTarget);
    let scenePass = new RenderPass(scene, camera);
    composer.addPass(scenePass);
    composer.addPass(effectFXAA);
    return composer;
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

    // FXAA
    composerTarget = newComposer(rendererTarget, sceneTarget, mainCamera, renderTargetTarget);
    composerCurrent = newComposer(rendererCurrent, sceneCurrent, mainCamera, renderTargetCurrent);
    composerTest = newComposer(rendererTest, sceneTest, mainCamera, renderTargetTest);
    composerPrimitive = newComposer(rendererPrimitive, scenePrimitive, mainCamera, renderTargetPrimitive);

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

function fillBuffer(renderer, renderTarget, buffer) {
    renderer.readRenderTargetPixels(renderTarget, 0, 0, inputWidth, inputHeight, buffer);
}

function preCopyTestBufferToCurrentBuffer() {
    rendererTest.readRenderTargetPixels(renderTargetTest, 0, 0, inputWidth, inputHeight, bufferCurrent);
    let currentTexture = new DataTexture(bufferCurrent, inputWidth, inputHeight, RGBAFormat);
    sceneCurrent.remove(planeCurrent);
    let planegeom = new PlaneBufferGeometry(inputWidth / 10, inputHeight / 10, 1);
    let planemat = new MeshBasicMaterial({map: currentTexture});
    // planemat.generateMipmaps = false;
    // planemat.wrapS = planemat.wrapT = ClampToEdgeWrapping
    // planemat.minFilter = LinearFilter;à
    planeCurrent = new Mesh(planegeom, planemat);
    sceneCurrent.add(planeCurrent);
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

function computeNewPrimitiveColor() {
    // Scan / intestect and compute optimal color
    let alpha = 128;
    let a = 0x101 * 255 / alpha;
    let rsum = 0; let gsum = 0; let bsum = 0;
    let nbOut = 0; let nbIn = 0;
    for (let i = 0; i < bufferTestLength; i += 4) {
        if (bufferPrimitive[i] + bufferPrimitive[i + 1] + bufferPrimitive[i + 2] === 0) {
            nbOut++;
            continue;
        }
        const tr = bufferTarget[i];
        const tg = bufferTarget[i + 1];
        const tb = bufferTarget[i + 2];
        const cr = bufferTest[i];
        const cg = bufferTest[i + 1];
        const cb = bufferTest[i + 2];
        rsum += (tr - cr) * a + cr * 0x101;
        gsum += (tg - cg) * a + cg * 0x101;
        bsum += (tb - cb) * a + cb * 0x101;
        nbIn++;
    }
    let c = new Color(
        clamp((rsum / nbIn) >> 8, 0, 255),
        clamp((gsum / nbIn) >> 8, 0, 255),
        clamp((bsum / nbIn) >> 8, 0, 255),
    );
    console.log(nbOut);
    console.log(nbIn);
    console.log(c);
    return c;
}

function computeBufferDistance(buffer1, buffer2) {
    let total = 0; // TODO initialize to the background difference
    let nbIn = 0;
    for (let i = 0; i < bufferPrimitiveLength; i += 4) {
        const tr = buffer1[i];
        const tg = buffer1[i + 1];
        const tb = buffer1[i + 2];
        // const ta = buffer1[i + 3];
        const ar = buffer2[i];
        const ag = buffer2[i + 1];
        const ab = buffer2[i + 2];
        // const aa = buffer2[i + 3];
        const dr = tr - ar; const dg = tg - ag; const db = tb - ab; // const da = ta - aa;
        total += dr * dr + dg * dg + db * db; // + da * da;
        nbIn++;
    }
    const distance = Math.sqrt(total / (inputWidth * inputHeight * 4)) / 255;
    console.log(nbIn);
    console.log(total);
    console.log(distance);
    return distance;
}

// Primitives
function makeBackground(color) {
    let planegeom = new PlaneBufferGeometry(inputWidth, inputHeight, 1);
    let planemat = new MeshBasicMaterial({ color });
    background = new Mesh(planegeom, planemat);
    return background;
    // sceneTarget.remove(planeTarget);
}

function makeNewPrimitive(color) {
    let e = makeEllipse(
        2, 4, 1,
        1, 0.5,
        Math.PI / 8,
        color
    );
    return e;
}

// Main algorithm
let currentPrimitive;
let currentPrimitiveTest;
let step = 0;
function step0() {
    initBuffers();

    // Get rendered picture into TargetBuffer
    fillBuffer(rendererTarget, renderTargetTarget, bufferTarget);

    // Init CurrentScene with background
    let color = computeBackgroundColorOutput();

    planeCurrent = makeBackground(color);
    sceneCurrent.add(planeCurrent);

    // Init TestScene with background
    planeTest = makeBackground(color);
    sceneTest.add(planeTest);

    // Init PrimitiveScene with ellipse
    // let randColor = new Color(Math.random() * 0xffffff);
    let randColor = new Color(0xffffff);
    currentPrimitive = makeNewPrimitive(randColor);
    scenePrimitive.add(currentPrimitive);

    // Next.
    step++;
}
function step1() {
    // Get rasters
    fillBuffer(rendererPrimitive, renderTargetPrimitive, bufferPrimitive);
    fillBuffer(rendererTest, renderTargetTest, bufferTest);

    // Get new color
    let color = computeNewPrimitiveColor();
    currentPrimitiveTest = makeNewPrimitive(color);
    sceneTest.add(currentPrimitiveTest);

    // Next.
    step++;
}
function step2() {
    // Update rasters
    fillBuffer(rendererCurrent, renderTargetCurrent, bufferCurrent);
    fillBuffer(rendererTest, renderTargetTest, bufferTest);

    // Compute Energy
    let dCurrent = computeBufferDistance(bufferTarget, bufferCurrent);
    let dTest = computeBufferDistance(bufferTarget, bufferTest);

    // Next.
    step++;
}
function step3() {
    step++;
    preCopyTestBufferToCurrentBuffer();
}
function step4() {
    step++;
}

// ####################
// ####### UTIL #######
// ####################

function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}

function addListeners() {
    document.addEventListener('keydown', event => {
        switch (event.keyCode) {
            case 66: // B
                isRequestingCapture = true;
                break;
            case 221: // À
                isRequestingStep = true;
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
let isRequestingStep = false;
function captureFrame() {
    isRequestingCapture = false;
    let canvas = document.getElementById('canvas-buffer-current');
    let outputImage = document.getElementById('output-image');
    let data = canvas.toDataURL('image/png', 1);
    outputImage.setAttribute('src', data);
    if (isRequestingStep) {
        isRequestingStep = false;
        switch (step) {
            case 0: step0(); break;
            case 1: step1(); break;
            case 2: step2(); break;
            case 3: step3(); break;
            case 4: step4(); break;
        }
    }
}

function renderPass(composer, renderer, scene, camera) {
    renderer.render(scene, camera);
    composer.render();
}

function animate() {
    requestAnimationFrame(animate);
    if (isRequestingCapture || isRequestingStep) {
        captureFrame();
    }
    renderPass(composerTarget, rendererTarget, sceneTarget, mainCamera);
    renderPass(composerCurrent, rendererCurrent, sceneCurrent, mainCamera);
    renderPass(composerTest, rendererTest, sceneTest, mainCamera);
    renderPass(composerPrimitive, rendererPrimitive, scenePrimitive, mainCamera);
}
