import {
    CircleBufferGeometry, Color,
    Mesh, MeshBasicMaterial
} from 'three';

let Ellipse = function(
    rng,
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

    this.mutate = function() {
        let a = this.alpha;
        this.alpha = rng.clamp(a + Math.floor(rng.uniform() * 21) - 10, 1, 255);
        let m = Math.floor(rng.uniform() * 3);
        switch (m) {
            case 0:
                this.cX = rng.clamp(this.cX + rng.normal() * 16, 0, 4); // TODO see where it goes
                this.cY = rng.clamp(this.cY + rng.normal() * 16, 0, 4);
                break;
            case 1:
                this.rX = rng.clamp(this.rX + rng.normal() * 16, 0, 2); // TODO see where it goes
                this.rY = rng.clamp(this.rY + rng.normal() * 16, 0, 2);
                break;
            case 2:
                this.theta = this.theta + rng.normal() * 32;
                break;
        }
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

export { Ellipse };
