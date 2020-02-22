import {
    CircleBufferGeometry, Color, DoubleSide, Face3, Geometry,
    Mesh, MeshBasicMaterial, PlaneBufferGeometry, Triangle, Vector3
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
    this._g = 0;

    this._meshes = [this.buildMesh(), this.buildMesh(), this.buildMesh()];
    this._saved = false;
    this._snp = [];
    this.energy = Number.POSITIVE_INFINITY;
};

Ellipse.prototype.updateModel = function(cx, cy, rx, ry, th, cl, a, ls)
{
    this.cX = cx; this.cY = cy; this.rX = rx; this.rY = ry;
    this.alpha = a;
    this.color = cl;
    this.theta = th;
    this._g = ls;
};

Ellipse.prototype.setColor = function(newColor) {
    this.color = newColor;
};

Ellipse.prototype.createTriangleGeometry = function(height) {
    let g = new Geometry();
    let off = 0;
    let v1 = new Vector3(off, off, 1);
    let v2 = new Vector3(off + height, off, 1);
    let v3 = new Vector3(off + height, off + height, 1);
    let triangle = new Triangle(v1, v2, v3);
    let normal = new Vector3();
    triangle.getNormal(normal);
    g.vertices.push(triangle.a);
    g.vertices.push(triangle.b);
    g.vertices.push(triangle.c);
    g.faces.push(new Face3(0, 1, 2, normal));
    g.verticesNeedUpdate = true;
    return g;
};

// Drawing
Ellipse.prototype.buildMesh = function() {
    let geometry;
    if (this.isRectangle)
        geometry = new PlaneBufferGeometry(10, 10, 1, 1);
    else if (this.isTriangle)
        geometry = this.createTriangleGeometry(10);
    else
        geometry = new CircleBufferGeometry(5, 32);

    let material = new MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: this.alpha / 256,
        side: DoubleSide
    });
    let c = new Mesh(geometry, material);
    if (!this.isTriangle) {
        c.position.set(this.cX, this.cY, 1);
        c.scale.set(this.rX, this.rY, 1);
        c.rotation.set(0, 0, this.theta);
    } else { c.position.set(0, 0, -1000); }
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
    if (this.isTriangle) {
        mi.geometry.vertices[0].x = this.cX;
        mi.geometry.vertices[0].y = this.cY;
        mi.geometry.vertices[1].x = this.rX;
        mi.geometry.vertices[1].y = this.rY;
        mi.geometry.vertices[2].x = this.theta;
        mi.geometry.vertices[2].y = this._g;
        mi.geometry.verticesNeedUpdate = true;
        mi.position.set(0, 0, 1);
    } else {
        mi.position.set(this.cX, this.cY, 1);
        mi.scale.set(this.rX, this.rY, 1);
        mi.rotation.set(0, 0, this.theta);
    }
    // console.log(mi);
};

Ellipse.prototype.updateMeshes = function() {
    if (this._meshes.length < 1) return;
    for (let i = 0; i < this._meshes.length; ++i) {
        this.updateMesh(i);
    }
};

// Annealing
Ellipse.prototype.snapshot = function() {
    this._snp = [this.alpha, this.cX, this.cY, this.rX, this.rY, this.theta, this.color, this._g];
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
    this._g = this._snp[7];
    // Until next time.
    this._snp = [];
    this._saved = false;
};

let EllipseGenerator = function(
    inputWidth, inputHeight, useAdaptiveSampling, rotated)
{
    this.rotated = rotated;
    let sobolDimension = this.isTriangleGenerator ?
        6 : this.rotated ? 5 : 4;
    this.SBL = new Sobol(sobolDimension);
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
    if (this.adaptive) this.temp = this.temp * 0.999;
    let sobol = this.SBL.generate(nbEllipse);
    let ellipseParameters = [];
    for (let i = 0; i < sobol.length; ++i) {
        let si = sobol[i];
        if (this.isTriangleGenerator) {
            let one = this.cxmin + si[0] * this.cxrange;
            let two = this.cymin + si[1] * this.cyrange;
            let thr = this.cxmin + si[2] * this.cxrange;
            let fou = this.cymin + si[3] * this.cyrange;
            let fiv = this.cxmin + si[4] * this.cxrange;
            let six = this.cymin + si[5] * this.cyrange;
            let mx = one;
            let my = two;
            let tmp = this.temp;
            let omt = 1 - this.temp;
            ellipseParameters.push([
                one,
                two,
                (tmp * thr + omt * mx) / 2,
                (tmp * fou + omt * my) / 2,
                (tmp * fiv + omt * mx) / 2,
                (tmp * six + omt * my) / 2
            ]);
        } else {
            ellipseParameters.push([
                this.cxmin + si[0] * this.cxrange,
                this.cymin + si[1] * this.cyrange,
                this.rxmin + si[2] * this.rxrange * this.temp,
                this.rymin + si[3] * this.ryrange * this.temp,
                this.rotated ? this.anglemin + si[4] * this.anglerange : 0
            ]);
        }
    }
    return ellipseParameters;
};

EllipseGenerator.prototype.mutate = function(ellipse) {
    let rng = this.rng;
    let a = ellipse.alpha;
    let nbCases = this.rotated || this.isTriangleGenerator ? 3 : 2;
    let m = Math.floor(rng.uniform() * nbCases);
    let cx = ellipse.cX; let rx = ellipse.rX;
    let cy = ellipse.cY; let ry = ellipse.rY;
    let t = ellipse.theta; let c = ellipse.color;
    let l = ellipse._g;
    let mf = 0.5;

    if (this.isTriangleGenerator)
        switch (m) {
            case 0:
                cx = rng.clamp(cx + rng.normal() * this.cxrange * mf, this.cxmin, this.cxmax);
                cy = rng.clamp(cy + rng.normal() * this.cyrange * mf, this.cymin, this.cymax);
                break;
            case 1:
                rx = rng.clamp(rx + rng.normal() * this.cxrange * mf, this.cxmin, this.cxmax);
                ry = rng.clamp(ry + rng.normal() * this.cyrange * mf, this.cymin, this.cymax);
                break;
            case 2:
                t = rng.clamp(t + rng.normal() * this.cxrange * mf, this.cxmin, this.cxmax);
                l = rng.clamp(l + rng.normal() * this.cyrange * mf, this.cymin, this.cymax);
                break;
            default: break;
        }
    else
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
            default: break;
        }

    ellipse.updateModel(cx, cy, rx, ry, t, c, a, l);
};

export { Ellipse, EllipseGenerator };
