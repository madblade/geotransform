import {Ellipse, EllipseGenerator} from './ellipse';

let Triangle = function(alpha,
    cX, cY, rX, rY,
    theta, color)
{
    this.isTriangle = true;
    Ellipse.call(this, alpha,
        cX, cY, rX, rY,
        theta, color);
};
Triangle.prototype = Object.create(Ellipse.prototype);
Triangle.prototype.constructor = Triangle;

let TriangleGenerator = function(
    inputWidth, inputHeight, useAdaptiveSampling, rotated)
{
    this.isTriangleGenerator = true;
    EllipseGenerator.call(this,
        inputWidth, inputHeight, useAdaptiveSampling, rotated);
};
TriangleGenerator.prototype = Object.create(EllipseGenerator.prototype);
TriangleGenerator.prototype.constructor = TriangleGenerator;

export {Triangle, TriangleGenerator};
