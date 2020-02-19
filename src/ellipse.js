import {
    CircleBufferGeometry, Mesh, MeshBasicMaterial
} from 'three';


function makeEllipse(
    centerX, centerY,
    radiusX, radiusY,
    rotation)
{
    let geometry = new CircleBufferGeometry(5, 32);
    let material = new MeshBasicMaterial({ color: 0xffff00 });
    let circle = new Mesh(geometry, material);
    circle.position.set(centerX, centerY, 10);
    circle.scale.set(radiusX, radiusY, 1);
    circle.rotation.set(0, 0, rotation);
    return circle;
}

export default makeEllipse;
