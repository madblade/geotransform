
var Random = function(textSeed)
{
    function xmur3(str) {
        for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
            h = h << 13 | h >>> 19;
        }
        return function() {
            h = Math.imul(h ^ h >>> 16, 2246822507);
            h = Math.imul(h ^ h >>> 13, 3266489909);
            return (h ^= h >>> 16) >>> 0;
        };
    }

    function sfc32(a, b, c, d) {
        return function() {
            a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
            var t = (a + b) | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = (c << 21 | c >>> 11);
            d = d + 1 | 0;
            t = t + d | 0;
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        };
    }

    var seed1 = xmur3(textSeed + 'h2g2');
    var seed2 = xmur3(textSeed + 'DouglasAdams');
    var seed3 = xmur3(textSeed + '42');
    var rand1 = sfc32(seed1(), seed1(), seed1(), seed1());
    var rand2 = sfc32(seed2(), seed2(), seed2(), seed2());
    var rand3 = sfc32(seed3(), seed3(), seed3(), seed3());

    /**
     * Uniform distribution generator.
     * @returns uniform number in [0, 1]
     */
    this.uniform = function() {
        return rand1();
    };

    /**
     * Normal distribution generator.
     * @returns number number in [0, 1] (centered in 0.5)
     */
    this.normal = function()
    {
        let u = 0; let v = 0;
        while (u === 0) u = rand2();
        while (v === 0) v = rand3();
        let n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        n = n / 10.0 + 0.5;
        if (n > 1 || n < 0) return this.normal();
        return n;
    };

    this.clamp = function(n, min, max) {
        return Math.min(Math.max(n, min), max);
    };
};

// Random.prototype.constructor = Random;

export { Random };
