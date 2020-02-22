
// Webpack assets
import joc from './img/j.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style/style.css';

import {
    WebGLRenderer,
    Scene, PerspectiveCamera,
    Mesh, TextureLoader,
    PlaneBufferGeometry, MeshBasicMaterial,
    WebGLRenderTarget, Color,
    LinearFilter, ClampToEdgeWrapping, DataTexture, RGBAFormat, Texture,
} from 'three';
import {Ellipse, EllipseGenerator} from './lib/ellipse';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {Random} from './lib/random';
import {GIFEncoder} from './lib/GIFEncoder';
import {Rectangle, RectangleGenerator} from './lib/rectangle';

// camera
let VIEW_ANGLE = 45;
let ASPECT = 1;
let NEAR = 0.001;
let FAR = 5000;

let mainCamera;
let inputWidth;
let inputHeight;
let rendererTarget;
let rendererTest;
let rendererPrimitive;

let sceneTarget;
let sceneTest;
let scenePrimitive;

let renderTargetTarget; let composerTarget;
let renderTargetTest; let composerTest;
let renderTargetPrimitive; let composerPrimitive;

let planeTarget;
let planeTest;
let background;

// Algorithm settings
let useAdaptiveSampling = false;
let configAlpha = 128;
let nbSobol = 64;
let maxIter = 25;
let maxShapes = 200;
let ELLIPSE = 0; let RECTANGLE = 1; let TRIANGLE = 2;
let RELLIPSE = 3; let RRECTANGLE = 4;
let primitiveType = ELLIPSE;

// Capture settings
let captureToGIF = false;

// Internals
let inputImage = joc;
let encoder;
let isEncoderStarted = false;
let isRequestingCapture = false;
let isRequestingStep = false;

init(inputImage);
addListeners();
animate();

function newRenderer(elementId) {
    let parentElement = document.getElementById(elementId);
    parentElement.textContent = '';
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

function init(imagePath) {
    // size
    let inputId = 'input-image';
    let inputElement = document.getElementById(inputId);
    inputWidth = inputElement.offsetWidth;
    inputHeight = inputElement.offsetHeight;
    ASPECT = inputWidth / inputHeight;

    // renderer
    rendererTarget = newRenderer('buffer-target');
    rendererTest = newRenderer('buffer-test');
    rendererPrimitive = newRenderer('buffer-primitive');

    renderTargetTarget = new WebGLRenderTarget(inputWidth, inputHeight);
    renderTargetTest = new WebGLRenderTarget(inputWidth, inputHeight);
    renderTargetPrimitive = new WebGLRenderTarget(inputWidth, inputHeight);

    // scene
    sceneTarget = new Scene();
    sceneTest = new Scene();
    scenePrimitive = new Scene();

    // camera
    let insideHeight = inputHeight / 10;
    let insideWidth = inputWidth / 10;
    mainCamera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    mainCamera.position.set(0, 0, (0.5 * insideHeight) / (Math.tan(Math.PI / 8)));

    // FXAA
    composerTarget = newComposer(rendererTarget, sceneTarget, mainCamera, renderTargetTarget);
    composerTest = newComposer(rendererTest, sceneTest, mainCamera, renderTargetTest);
    composerPrimitive = newComposer(rendererPrimitive, scenePrimitive, mainCamera, renderTargetPrimitive);

    // setup
    loadImage(insideWidth, insideHeight, imagePath);

    if (captureToGIF) {
        encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setSize(inputWidth, inputHeight);
        encoder.start();
        isEncoderStarted = true;
    }
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

function dumpRenderTargetToTexture() {
    rendererTest.readRenderTargetPixels(renderTargetTest, 0, 0, inputWidth, inputHeight, bufferCurrent);
    let currentTexture = new DataTexture(bufferCurrent, inputWidth, inputHeight, RGBAFormat);
    sceneTest.remove(planeTest);
    let planegeom = new PlaneBufferGeometry(
        inputWidth / 10, inputHeight / 10, 1
    );
    let planemat = new MeshBasicMaterial({map: currentTexture});
    planeTest = new Mesh(planegeom, planemat);
    sceneTest.add(planeTest);
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
    return new Color(r / 256, g / 256, b / 256);
}

function computeNewPrimitiveColor(alpha) {
    // Scan / intestect and compute optimal color
    let a = 0x101 * 255 / alpha;
    let rsum = 0; let gsum = 0; let bsum = 0;
    let nbIn = 0;
    for (let i = 0; i < bufferTestLength; i += 4) {
        if (bufferPrimitive[i] + bufferPrimitive[i + 1] + bufferPrimitive[i + 2] === 0) {
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
        clamp((rsum / nbIn) >> 8, 0, 255) / 256,
        clamp((gsum / nbIn) >> 8, 0, 255) / 256,
        clamp((bsum / nbIn) >> 8, 0, 255) / 256,
    );
    return c;
}

function computeBufferDistance(buffer1, buffer2) {
    let total = 0;
    for (let i = 0; i < bufferPrimitiveLength; i += 4) {
        const tr = buffer1[i];
        const tg = buffer1[i + 1];
        const tb = buffer1[i + 2];
        const ar = buffer2[i];
        const ag = buffer2[i + 1];
        const ab = buffer2[i + 2];
        const dr = tr - ar; const dg = tg - ag; const db = tb - ab;
        total += dr * dr + dg * dg + db * db;
    }
    return Math.sqrt(total / (inputWidth * inputHeight * 4)) / 255;
}

// Primitives
function makeBackground(color) {
    let planegeom = new PlaneBufferGeometry(
        inputWidth / 10, inputHeight / 10, 1
    );
    let planemat;
    let outputImage = document.getElementById('output-image');
    if (isResuming && outputImage.src && outputImage.src.length > 0) {
        let planemap = new Texture(outputImage);
        planemap.needsUpdate = true;
        planemat = new MeshBasicMaterial({ color: 0xffffff, map: planemap });
        isResuming = false;
    } else {
        planemat = new MeshBasicMaterial({ color });
    }
    background = new Mesh(planegeom, planemat);
    return background;
}

function makeNewGenerator(w, h, adapt) {
    switch (primitiveType) {
        case ELLIPSE: return new EllipseGenerator(w, h, adapt, false);
        case RECTANGLE: return new RectangleGenerator(w, h, adapt, false);
        case TRIANGLE:
        case RELLIPSE: return new EllipseGenerator(w, h, adapt, true);
        case RRECTANGLE: return new RectangleGenerator(w, h, adapt, true);
        default: break;
    }
}

function makeNewPrimitive(alpha) {
    switch (primitiveType) {
        case RELLIPSE:
        case ELLIPSE: return new Ellipse(alpha);
        case RRECTANGLE:
        case RECTANGLE: return new Rectangle(alpha);
        case TRIANGLE:
        default: return;
    }
}

// Algorithm internals
let currentPrimitive;
let generator;
let sobol;
let debo = false;
let rng = new Random('Alpha');
let currentIter = 0;
let nbShapes = 0;
const STEP0 = 0;
const STEP1A = 1; const STEP1B = 2; const STEP1C = 3;
const STEP2A = 4; const STEP2B = 5; const STEP2C = 6;
const STEP3 = 7; const STEP4 = 8; const IDLE = 9;
let step = STEP0;

function step0() {
    if (debo) console.log('Starting...');
    updateGUI(true);
    initBuffers();

    // Get rendered picture into TargetBuffer
    fillBuffer(rendererTarget, renderTargetTarget, bufferTarget);

    // Compute background color
    let color = computeBackgroundColorOutput();

    // Init TestScene with background
    planeTest = makeBackground(color);
    sceneTest.add(planeTest);

    // Pre-sampling.
    generator = makeNewGenerator(inputWidth, inputHeight, useAdaptiveSampling);
    sobol = generator.generateCover(nbSobol);
    currentPrimitive = makeNewPrimitive(configAlpha);
    scenePrimitive.add(currentPrimitive.getMesh(0));

    // Next.
    step = STEP1A;
    step1a();
}

function step1a() {
    if (debo) console.log(`Sobol iteration ${nbSobol - sobol.length}`);

    let nextPrimitive = sobol.shift();
    let a = configAlpha === 0 ?
        rng.clamp(configAlpha + Math.floor(rng.uniform() * 21) - 10, 1, 255) :
        configAlpha;

    currentPrimitive.updateModel(
        nextPrimitive[0], nextPrimitive[1],
        nextPrimitive[2], nextPrimitive[3],
        nextPrimitive[4],
        new Color(0xffffff),
        a
    );
    currentPrimitive.updateMesh(0);
    sceneTest.remove(currentPrimitive.getMesh(1));

    // Wait for render.
    step = STEP1B;
}

function _computeColor() {
    // Get rasters
    fillBuffer(rendererPrimitive, renderTargetPrimitive, bufferPrimitive);
    fillBuffer(rendererTest, renderTargetTest, bufferTest);

    // Get new color
    let color = computeNewPrimitiveColor(currentPrimitive.alpha);
    currentPrimitive.setColor(color);
    currentPrimitive.updateMesh(1);
    sceneTest.add(currentPrimitive.getMesh(1));
}

function step1b() {
    _computeColor();
    step = STEP1C;
}

function _computeEnergy() {
    // Update rasters
    fillBuffer(rendererTest, renderTargetTest, bufferTest);

    // Compute Energy
    return computeBufferDistance(bufferTarget, bufferTest);
}

function step1c() {
    let newEnergy = _computeEnergy();

    if (newEnergy < currentPrimitive.energy) {
        currentPrimitive.updateMesh(2);
        currentPrimitive.snapshot();
        if (debo) console.log(`New energy: ${newEnergy}`);
        currentPrimitive.energy = newEnergy;
    }

    if (sobol.length > 0) {
        step = STEP1A;
    } else {
        if (currentPrimitive._saved)
            currentPrimitive.rollback();

        if (debo) console.log('==== SOBOL done ====');
        currentPrimitive.snapshot();
        step = STEP2A;
        currentIter = 0;
    }
}

function step2a() {
    if (debo) console.log(`HillClimb iteration ${currentIter}`);

    generator.mutate(currentPrimitive);
    currentPrimitive.updateMesh(0);
    sceneTest.remove(currentPrimitive.getMesh(1));

    step = STEP2B;
}

function step2b() {
    _computeColor();
    step = STEP2C;
}

function step2c() {
    let newEnergy = _computeEnergy();

    if (newEnergy < currentPrimitive.energy) {
        currentPrimitive.updateMesh(2);
        currentPrimitive.snapshot();
        if (debo) console.log(`HillClimb found a new start! New energy: ${newEnergy}`);
        currentPrimitive.energy = newEnergy;
    } else {
        if (currentPrimitive._saved) {
            currentPrimitive.rollback();
            currentPrimitive.snapshot();
        }
    }

    if (currentIter < maxIter) {
        currentIter++;
        step = STEP2A;
    } else {
        if (currentPrimitive._saved) {
            currentPrimitive.rollback();
            currentPrimitive.updateMesh(0);
            currentPrimitive.updateMesh(1);
        }

        if (debo) console.log('==== HILLCLIMB done ====');
        step++;
        currentIter = 0;
    }
}

function step3() {
    if (debo) console.log('New GeoTransform iteration!');
    dumpRenderTargetToTexture();
    nbShapes++;
    isRequestingCapture = true;

    if (nbShapes < maxShapes) {
        sobol = generator.generateCover(nbSobol);
        let a = configAlpha;
        scenePrimitive.remove(currentPrimitive.getMesh(0));
        sceneTest.remove(currentPrimitive.getMesh(1));
        currentPrimitive = makeNewPrimitive(a);
        scenePrimitive.add(currentPrimitive.getMesh(0));
        sceneTest.add(currentPrimitive.getMesh(1));
        step = STEP1A;
    } else {
        step = STEP4;
    }
}

function step4() {
    if (debo) console.log('Done!');
    isRequestingCapture = true;
    if (captureToGIF) {
        isEncoderStarted = false;
        encoder.finish();
        encoder.download('anim.gif');
    }
    stop();
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
                if (tScenePasses > tScenePassesNecessary - 1) {
                    isRequestingStep = true;
                }
                break;
            default: break;
        }
    });

    document.getElementById('button-start').addEventListener('click',
        () => requestRestart());
    document.getElementById('button-stop').addEventListener('click',
        () => requestStop());
    document.getElementById('button-restart').addEventListener('click',
        () => requestRestart());
    document.getElementById('button-resume').addEventListener('click',
        () => requestResume());
    document.getElementById('button-apply-settings').addEventListener('click',
        () => applyGUISettings());
}

function loadImage(insideWidth, insideHeight, path) {
    let map = new TextureLoader().load(path);
    map.generateMipmaps = false;
    map.wrapS = map.wrapT = ClampToEdgeWrapping;
    map.minFilter = LinearFilter;
    let planegeom = new PlaneBufferGeometry(insideWidth, insideHeight, 1);
    let planemat = new MeshBasicMaterial({color: 0xffffff, map});
    planeTarget = new Mesh(planegeom, planemat);
    sceneTarget.add(planeTarget);
}

function captureFrame() {
    isRequestingCapture = false;
    let canvas = document.getElementById('canvas-buffer-test');
    let outputImage = document.getElementById('output-image');
    let data = canvas.toDataURL('image/png', 1);
    outputImage.setAttribute('src', data);

    let c = new Uint8ClampedArray(bufferTestLength);
    let k = 0;
    for (let i = inputHeight - 1; i >= 0; --i) {
        for (let j = 0; j < inputWidth * 4; j += 4) {
            c[i * inputWidth * 4 + j] = bufferTest[k++];
            c[i * inputWidth * 4 + j + 1] = bufferTest[k++];
            c[i * inputWidth * 4 + j + 2] = bufferTest[k++];
            c[i * inputWidth * 4 + j + 3] = bufferTest[k++];
        }
    }
    if (isEncoderStarted) {
        if (maxShapes < 100 || nbShapes % Math.floor(maxShapes / nbShapes) === 0)
            encoder.addFrame(c, true);
    }
}

function stepAlgorithm() {
    switch (step) {
        case STEP0: step0(); break;
        case STEP1A: step1a(); break;
        case STEP1B: step1b(); break;
        case STEP1C: step1c(); break;
        case STEP2A: step2a(); break;
        case STEP2B: step2b(); break;
        case STEP2C: step2c(); break;
        case STEP3: step3(); break;
        case STEP4: step4(); break;
        case IDLE: isRequestingStep = false; break;
    }
}

function renderPassOffscreen(composer) {
    composer.render();
    composer.render();
}
function renderPass(composer, renderer, scene, camera) {
    renderer.render(scene, camera);
    // Compose twice into renderTarget
    composer.render();
    composer.render();
}

function renderTargetScene() {
    renderPass(composerTarget, rendererTarget, sceneTarget, mainCamera);
}

let tScenePasses = 0;
let tScenePassesNecessary = 10;
let isRequestedSTOP = false;
let isRequestedRestart = false;
let isRequestedResume = false;
let isResuming = false;
function animate() {
    requestAnimationFrame(animate);

    if (tScenePasses <= tScenePassesNecessary) {
        renderTargetScene();
        tScenePasses++;
        return;
    }
    if (isRequestedSTOP)
        stop();
    if (isRequestingStep)
        stepAlgorithm();

    renderPassOffscreen(composerTest);
    renderPass(composerPrimitive, rendererPrimitive, scenePrimitive, mainCamera);

    if (isRequestingCapture)
        captureFrame();
    if (isRequestedResume)
        resume();
    if (isRequestedRestart)
        restart();
}

function requestStop() {
    isRequestedSTOP = true;
}

function reinitEverything(fromOutput) {
    // internals
    isEncoderStarted = false;
    isRequestingCapture = false;
    isRequestingStep = false;
    isRequestedRestart = false;
    isRequestedSTOP = false;
    isRequestedResume = false;
    isResuming = false;

    rng = new Random('Alpha');
    currentIter = 0;
    nbShapes = 0;
    tScenePasses = 0;

    init(inputImage, fromOutput);
    step = STEP0;
}

function requestRestart() {
    isRequestedRestart = true;
}
function requestResume() {
    isRequestedResume = true;
}

function stop() {
    step = IDLE;
    isRequestedSTOP = false;
    if (captureToGIF && isEncoderStarted) {
        isEncoderStarted = false;
        encoder.finish();
    }
    updateGUI(false);
}

function restart() {
    stop();
    reinitEverything(false);
    isRequestingStep = true;
}

function resume() {
    stop();
    reinitEverything(true);
    isResuming = true;
    isRequestingStep = true;
}

function updateGUI(isRunning) {
    let startBtn = document.getElementById('button-start');
    let stopBtn = document.getElementById('button-stop');
    let restartBtn = document.getElementById('button-restart');
    let resumeBtn = document.getElementById('button-resume');
    let saveSettingsBtn = document.getElementById('button-apply-settings');

    let adaptive = document.getElementById('check-adaptive-sobol');
    let gif = document.getElementById('check-capture-gif');

    let nbShapesInput = document.getElementById('number-input-shapes');
    let sobolSamples = document.getElementById('number-input-sobol');
    let hillIterations = document.getElementById('number-input-hillclimb');

    let shape = document.getElementById('dropdown-shape');
    let imageSrc = document.getElementById('text-input-image-source');

    let disabledRun = [startBtn, restartBtn, resumeBtn, saveSettingsBtn,
        adaptive, gif, nbShapesInput, sobolSamples, hillIterations, shape, imageSrc];

    if (isRunning)
    {
        stopBtn.removeAttribute('disabled');
        for (let i = 0; i < disabledRun.length; ++i) {
            let el = disabledRun[i];
            if (el)
                el.setAttribute('disabled', '');
        }
    }
    else
    {
        stopBtn.setAttribute('disabled', '');
        for (let i = 0; i < disabledRun.length; ++i) {
            let el = disabledRun[i];
            if (el)
                el.removeAttribute('disabled');
        }
    }
}

function applyGUISettings() {
    let adaptive = document.getElementById('check-adaptive-sobol').checked;
    let gif = document.getElementById('check-capture-gif').checked;
    let nbShapesInput = document.getElementById('number-input-shapes').value;
    let sobolSamples = document.getElementById('number-input-sobol').value;
    let hillIterations = document.getElementById('number-input-hillclimb').value;
    let shape = document.getElementById('dropdown-shape').value;
    let imageSrc = document.getElementById('text-input-image-source').value;

    useAdaptiveSampling = adaptive;
    captureToGIF = gif;
    let n = parseInt(nbShapesInput, 10);
    if (n > 0 && n < 2000000 && typeof n === 'number')
        maxShapes = n;
    let ss = parseInt(sobolSamples, 10);
    if (ss > 0 && ss < 1000 && typeof ss === 'number')
        nbSobol = ss;
    let hi = parseInt(hillIterations, 10);
    if (hi > 0 && hi < 1000 && typeof hi === 'number')
        maxIter = hi;
    switch (shape) {
        case 'Ellipse': primitiveType = ELLIPSE; break;
        case 'Rectangle': primitiveType = RECTANGLE; break;
        case 'Triangle': primitiveType = TRIANGLE; break;
        case 'Rotated ellipse': primitiveType = RELLIPSE; break;
        case 'Rotated rectangle': primitiveType = RRECTANGLE; break;
        default: break;
    }

    if (imageSrc && imageSrc.length > 1 && inputImage !== imageSrc) {
        inputImage = imageSrc;
        document.getElementById('input-image').src = imageSrc;
        tScenePasses = 0;
    }
}
