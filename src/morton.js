export default function() {

    var zOrder = (function() {
        // http://bl.ocks.org/jaredwinick/5073432

        // http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
        function point2distance(x, y) {

            var B = [0x55555555, 0x33333333, 0x0F0F0F0F, 0x00FF00FF];
            var S = [1, 2, 4, 8];

            x = (x | (x << S[3])) & B[3];
            x = (x | (x << S[2])) & B[2];
            x = (x | (x << S[1])) & B[1];
            x = (x | (x << S[0])) & B[0];

            y = (y | (y << S[3])) & B[3];
            y = (y | (y << S[2])) & B[2];
            y = (y | (y << S[1])) & B[1];
            y = (y | (y << S[0])) & B[0];

            return x | (y << 1);
        }

        function distance2point(d) {

            return [
                deinterleave(d),
                deinterleave(d >> 1)
            ];

            //

            // http://stackoverflow.com/questions/4909263/how-to-efficiently-de-interleave-bits-inverse-morton
            function deinterleave(x) {
                x = x & 0x55555555;
                x = (x | (x >> 1)) & 0x33333333;
                x = (x | (x >> 2)) & 0x0F0F0F0F;
                x = (x | (x >> 4)) & 0x00FF00FF;
                x = (x | (x >> 8)) & 0x0000FFFF;
                return x;
            }
        }
    })();

    var mortonLayout = {},
        canvasWidth = 1,
        order = 4,
        simplifyCurves = true;

    mortonLayout.canvasWidth = function(_) {
        if (!arguments.length) return canvasWidth;
        canvasWidth = +_;
        return mortonLayout;
    };

    // Note: Maximum safe order is 26, due to JS numbers upper-boundary of 53 bits
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
    mortonLayout.order = function(_) {
        if (!arguments.length) return order;
        order = +_;
        return mortonLayout;
    };

    mortonLayout.simplifyCurves = function(_) {
        if (!arguments.length) return simplifyCurves;
        simplifyCurves = _;
        return mortonLayout;
    };

    mortonLayout.layout = function(range) {
        var d = getZOrderPath(range.start, range.length, order, canvasWidth, simplifyCurves);

        range.cellWidth = d.cellWidth;
        range.pathVertices = d.pathVertices;

        return mortonLayout;
    };

    mortonLayout.getValAtXY = function(x, y) {
        var n = Math.pow(2, order),
            xy = [x, y].map(function(coord) {
                return Math.floor(coord * n / canvasWidth);
            });
        return zOrder.point2Distance(xy[0], xy[1]);
    };

    return mortonLayout;

    //

    function getZOrderPath(start, length, order, sideSize, simplifyCurves) {

        if (simplifyCurves) {
            // Adjust resolution
            while (!Number.isInteger(start) || !Number.isInteger(length)) {
                start *= 4;
                length *= 4;
                order += 1;
            }

            // resolution simplification
            while (!(start % 4) && !(length % 4) && order > 0) {
                start /= 4;
                length /= 4;
                order -= 1;
            }
        }

        // prevent overflow
        var maxPos = Math.pow(4, order);
        start = Math.min(start, maxPos);
        length = Math.min(length, maxPos - start);

        // nSide is on a binary boundary 2^0, 2^1, 2^2, ...
        var nSide = Math.pow(2, order),
            cellWidth = sideSize / nSide;

        var vertices = [];

        for (var i=0; i < length; i++) {
            vertices.push(zOrder.distance2Point(start + i));
        }

        return {
            cellWidth: cellWidth,
            pathVertices: vertices
        };
    }
}
