import {Ellipse, EllipseGenerator} from './ellipse';

let Rectangle = function(alpha,
    cX, cY, rX, rY,
    theta, color)
{
    this.isRectangle = true;
    Ellipse.call(this, alpha,
        cX, cY, rX, rY,
        theta, color);
};
Rectangle.prototype = Object.create(Ellipse.prototype);
Rectangle.prototype.constructor = Rectangle;

let RectangleGenerator = function(
    inputWidth, inputHeight, useAdaptiveSampling, rotated)
{
    EllipseGenerator.call(this,
        inputWidth, inputHeight, useAdaptiveSampling, rotated);
};
RectangleGenerator.prototype = Object.create(EllipseGenerator.prototype);
RectangleGenerator.prototype.constructor = RectangleGenerator;

export { Rectangle, RectangleGenerator };
