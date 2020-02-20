import {
    CircleBufferGeometry, Color, Mesh, MeshBasicMaterial
} from 'three';

var Ellipse = function(
    rng,
    cX, cY, rX, rY,
    theta, color
) {
    this.alpha = 128;
    this.cX = cX;
    this.cY = cY;
    this.rX = rX;
    this.rY = rY;
    this.theta = theta;
    this.color = color;

    this._meshes = [];

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
        if (this._meshes.length < 1) return;
        for (let i = 0; i < this._meshes.length; ++i) {
            this._meshes[i].material.color = newColor;
        }
    };

    // Drawing
    this.getMesh = function(which) {
        switch (which) {
            case 0:
                if (this._meshes.length > 0) return this._meshes[0];
                break;
            case 1:
                if (this._meshes.length > 1) return this._meshes[1];
                if (this._meshes.length < 1) return null;
                break;
            default: return;
        }

        let geometry = new CircleBufferGeometry(5, 32);
        let material = new MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5
        });
        let circle = new Mesh(geometry, material);
        circle.position.set(this.cX, this.cY, 1);
        circle.scale.set(this.rX, this.rY, 1);
        circle.rotation.set(0, 0, this.theta);

        this._meshes.push(circle);
        return circle;
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
