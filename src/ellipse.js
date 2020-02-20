import {
    CircleBufferGeometry, Color, Mesh, MeshBasicMaterial
} from 'three';


function makeEllipse(
    centerX, centerY, centerZ,
    radiusX, radiusY,
    rotation)
{
    let geometry = new CircleBufferGeometry(5, 32);
    let material = new MeshBasicMaterial({
        color: new Color(Math.random() * 0xffffff),
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
