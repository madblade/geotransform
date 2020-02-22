import {
    CircleBufferGeometry, Color,
    Mesh, MeshBasicMaterial, PlaneBufferGeometry
} from 'three';
import {Random, Sobol} from './random';

let Ellipse = function(
    alpha,
    cX, cY, rX, rY,
    theta, color
) {
    // Constructor
    this.alpha = alpha || 128;
    this.cX = cX || 100;
    this.cY = cY || 100;
    this.rX = rX || 1;
    this.rY = rY || 1;
    this.theta = theta || 0;
    this.color = color || new Color(0xffffff);

    this._meshes = [this.buildMesh(), this.buildMesh(), this.buildMesh()];
    this._saved = false;
    this._snp = [];
    this.energy = Number.POSITIVE_INFINITY;
};

Ellipse.prototype.updateModel = function(cx, cy, rx, ry, th, cl, a)
{
    this.cX = cx; this.cY = cy; this.rX = rx; this.rY = ry;
    this.alpha = a;
    this.color = cl;
    this.theta = th;
};

Ellipse.prototype.setColor = function(newColor) {
    this.color = newColor;
};

// Drawing
Ellipse.prototype.buildMesh = function() {
    let geometry;
    if (this.isRectangle)
        geometry = new PlaneBufferGeometry(10, 10, 1, 1);
    else
        geometry = new CircleBufferGeometry(5, 32);

    let material = new MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: this.alpha / 256
    });
    let c = new Mesh(geometry, material);
    c.position.set(this.cX, this.cY, 1);
    c.scale.set(this.rX, this.rY, 1);
    c.rotation.set(0, 0, this.theta);
    return c;
};

Ellipse.prototype.getMesh = function(i) {
    if (i >= this._meshes.length) return;
    return this._meshes[i];
};

Ellipse.prototype.updateMesh = function(i) {
    if (i >= this._meshes.length) return;
    let mi = this._meshes[i];
    mi.material.color = this.color;
    mi.material.opacity = this.alpha / 256;
    mi.position.set(this.cX, this.cY, 1);
    mi.scale.set(this.rX, this.rY, 1);
    mi.rotation.set(0, 0, this.theta);
};

Ellipse.prototype.updateMeshes = function() {
    if (this._meshes.length < 1) return;
    for (let i = 0; i < this._meshes.length; ++i) {
        this.updateMesh(i);
    }
};

// Annealing
Ellipse.prototype.snapshot = function() {
    this._snp = [this.alpha, this.cX, this.cY, this.rX, this.rY, this.theta, this.color];
    this._saved = true;
};

Ellipse.prototype.rollback = function() {
    if (!this._saved) return;
    this.alpha = this._snp[0];
    this.cX = this._snp[1];
    this.cY = this._snp[2];
    this.rX = this._snp[3];
    this.rY = this._snp[4];
    this.theta = this._snp[5];
    this.color = this._snp[6];
    // Until next time.
    this._snp = [];
    this._saved = false;
};

let EllipseGenerator = function(
    inputWidth, inputHeight, useAdaptiveSampling, rotated)
{
    this.rotated = rotated;
    this.SBL = new Sobol(this.rotated ? 5 : 4);
    this.rng = new Random('Ellipse');
    this.adaptive = useAdaptiveSampling;
    this.temp = 1;
    this.cxmax = inputWidth / 20;
    this.cxmin = -this.cxmax;
    this.cxrange = this.cxmax - this.cxmin;

    this.cymax = inputHeight / 20;
    this.cymin = -this.cymax;
    this.cyrange = this.cymax - this.cymin;

    this.rxmax = 2 * inputWidth / 256;
    this.rxmin = 0.01 * inputWidth / 256;
    this.rxrange = this.rxmax - this.rxmin;

    this.rymax = 2 * inputHeight / 256;
    this.rymin = this.rxmin;
    this.ryrange = this.rymax - this.rymin;

    this.anglemin = 0;
    this.anglemax = Math.PI;
    this.anglerange = this.anglemax - this.anglemin;
};

EllipseGenerator.prototype.generateCover = function(nbEllipse) {
    if (this.adaptive) this.temp = this.temp * 0.99;
    let sobol = this.SBL.generate(nbEllipse);
    let ellipseParameters = [];
    for (let i = 0; i < sobol.length; ++i) {
        let si = sobol[i];
        ellipseParameters.push([
            this.cxmin + si[0] * this.cxrange,
            this.cymin + si[1] * this.cyrange,
            this.rxmin + si[2] * this.rxrange * this.temp,
            this.rymin + si[3] * this.ryrange * this.temp,
            this.rotated ? this.anglemin + si[4] * this.anglerange : 0
        ]);
    }
    return ellipseParameters;
};

EllipseGenerator.prototype.mutate = function(ellipse) {
    let rng = this.rng;
    let a = ellipse.alpha;
    let m = Math.floor(rng.uniform() * (this.rotated ? 3 : 2));
    let cx = ellipse.cX; let rx = ellipse.rX;
    let cy = ellipse.cY; let ry = ellipse.rY;
    let t = ellipse.theta; let c = ellipse.color;
    let mf = 0.5;
    switch (m) {
        case 0:
            cx = rng.clamp(cx + rng.normal() * this.cxrange * mf, this.cxmin, this.cxmax);
            cy = rng.clamp(cy + rng.normal() * this.cyrange * mf, this.cymin, this.cymax);
            break;
        case 1:
            rx = rng.clamp(rx + rng.normal() * this.rxrange * mf, this.rxmin, this.rxmax);
            ry = rng.clamp(ry + rng.normal() * this.ryrange * mf, this.rymin, this.rymax);
            break;
        case 2:
            t = rng.clamp(t + rng.normal() * rng.normal() *
                this.anglerange, this.anglemin, this.anglemax);
            break;
    }
    ellipse.updateModel(cx, cy, rx, ry, t, c, a);
};

export { Ellipse, EllipseGenerator };
