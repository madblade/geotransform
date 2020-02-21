import {
    CircleBufferGeometry,
    Mesh, MeshBasicMaterial
} from 'three';
import {Random, Sobol} from './random';

let Ellipse = function(
    cX, cY, rX, rY,
    theta, color
) {
    // Constructor
    this.alpha = 128;
    this.cX = cX;
    this.cY = cY;
    this.rX = rX;
    this.rY = rY;
    this.theta = theta;
    this.color = color;

    this.updateModel = function(cx, cy, rx, ry, th, cl, alpha)
    {
        this.cX = cx; this.cY = cy; this.rX = rx; this.rY = ry;
        this.alpha = alpha;
        this.color = cl;
        this.theta = th;
    };

    this.setColor = function(newColor) {
        this.color = newColor;
    };

    // Drawing
    this.buildMesh = function() {
        let geometry = new CircleBufferGeometry(5, 32);
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
    this._meshes = [this.buildMesh(), this.buildMesh()];

    this.getMesh = function(i) {
        if (i >= this._meshes.length) return;
        return this._meshes[i];
    };
    this.updateMesh = function(i) {
        if (i >= this._meshes.length) return;
        let mi = this._meshes[i];
        mi.material.color = this.color;
        mi.material.opacity = this.alpha / 256;
        mi.position.set(this.cX, this.cY, 1);
        mi.scale.set(this.rX, this.rY, 1);
        mi.rotation.set(0, 0, this.theta);
    };

    this.updateMeshes = function() {
        if (this._meshes.length < 2) return;
        for (let i = 0; i < this._meshes.length; ++i) {
            this.updateMesh(i);
        }
    };

    // Annealing
    this._saved = false;
    this._snp = [];
    this.snapshot = function() {
        this._snp = [this.alpha, this.cX, this.cY, this.rX, this.rY, this.theta, this.color];
        this._saved = true;
    };
    this.rollback = function() {
        if (!this._saved) return;
        this.alpha = this._snp[0];
        this.cX = this._snp[1];
        this.cY = this._snp[2];
        this.cX = this._snp[3];
        this.cY = this._snp[4];
        this.theta = this._snp[5];
        this.color = this._snp[6];
    };
};

let EllipseGenerator = function(inputHeight, inputWidth)
{
    this.SBL = new Sobol(6);
    this.rng = new Random('Ellipse');
    this.cxmax = inputWidth / 20;
    this.cxmin = -this.cxmax;
    this.cxrange = this.cxmax - this.cxmin;

    this.cymax = inputHeight / 20;
    this.cymin = -this.cymax;
    this.cyrange = this.cymax - this.cymin;

    this.rxmax = 2;
    this.rxmin = 0.1;
    this.rxrange = this.rxmax - this.rxmin;

    this.rymax = this.rxmax;
    this.rymin = this.rxmin;
    this.ryrange = this.rymax - this.rymin;

    this.alphamin = 0.05;
    this.alphamax = 1;
    this.alpharange = this.alphamax - this.alphamin;

    this.anglemin = 0;
    this.anglemax = Math.PI;
    this.anglerange = this.anglemax - this.anglemin;

    this.generateCover = function(nbEllipse) {
        let sobol = this.SBL.generate(nbEllipse);
        let ellipseParameters = [];
        for (let i = 0; i < sobol.length; ++i) {
            let si = sobol[i];
            ellipseParameters.push(
                this.cxmin + si[0] * this.cxrange,
                this.cymin + si[1] * this.cyrange,
                this.rxmin + si[2] * this.rxrange,
                this.rymin + si[3] * this.ryrange,
                this.alphamin + si[4] * this.alpharange,
                this.anglemin + si[5] * this.anglerange,
            );
        }
        return ellipseParameters;
    };

    this.mutate = function(ellipse) {
        let rng = this.rng;
        let a = ellipse.alpha;
        a = rng.clamp(a + Math.floor(rng.uniform() * 21) - 10, 1, 255);
        let m = Math.floor(rng.uniform() * 3);
        let cx = ellipse.cX; let rx = ellipse.rX;
        let cy = ellipse.cY; let ry = ellipse.rY;
        let t = ellipse.theta; let c = ellipse.color;
        switch (m) {
            case 0:
                cx = rng.clamp(cx + rng.normal() * 16, this.cxmin, this.cxmax);
                cy = rng.clamp(cy + rng.normal() * 16, this.cymin, this.cymax);
                break;
            case 1:
                rx = rng.clamp(rx + rng.normal() * 16, this.rxmin, this.rxmax);
                ry = rng.clamp(ry + rng.normal() * 16, this.rymin, this.rymax);
                break;
            case 2:
                t = rng.clamp(t + rng.normal() * 32, this.anglemin, this.anglemax);
                break;
        }
        ellipse.updateModel(cx, cy, rx, ry, t, c, a);
    };
};

export { Ellipse, EllipseGenerator };
