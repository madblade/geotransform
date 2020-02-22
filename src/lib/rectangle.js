import {Ellipse, EllipseGenerator} from './ellipse';

let Rectangle = function(parameters)
{
    Ellipse.call(this, parameters);
    this.isRectangle = true;
};
Rectangle.prototype = Object.create(Ellipse.prototype);
Rectangle.prototype.constructor = Rectangle;

let RectangleGenerator = function(parameters)
{
    EllipseGenerator.call(this, parameters);
    this.isRectangle = true;
};
RectangleGenerator.prototype = Object.create(EllipseGenerator.prototype);
RectangleGenerator.prototype.constructor = RectangleGenerator;

export { Rectangle, RectangleGenerator };
