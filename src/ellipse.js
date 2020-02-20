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
};

function makeEllipse(
    centerX, centerY, centerZ,
    radiusX, radiusY,
    rotation, color)
{
    let geometry = new CircleBufferGeometry(5, 32);
    let material = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5
    });
    let circle = new Mesh(geometry, material);
    circle.position.set(centerX, centerY, centerZ);
    circle.scale.set(radiusX, radiusY, 1);
    circle.rotation.set(0, 0, rotation);
    return circle;
}

export default makeEllipse;
