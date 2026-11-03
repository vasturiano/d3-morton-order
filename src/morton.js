export default function() {

  const zOrder = (function() {
    // http://bl.ocks.org/jaredwinick/5073432

    // http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
    function point2Distance(x, y) {

      const B = [0x55555555, 0x33333333, 0x0F0F0F0F, 0x00FF00FF];
      const S = [1, 2, 4, 8];

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

    function distance2Point(d) {

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

    function point2DistanceBigInt(x, y, order) {
      let distance = 0n;

      for (let bit = 0; bit < order; bit++) {
        const sourceBit = BigInt(bit);
        distance |= ((x >> sourceBit) & 1n) << (sourceBit * 2n);
        distance |= ((y >> sourceBit) & 1n) << (sourceBit * 2n + 1n);
      }

      return distance;
    }

    function distance2PointBigInt(distance, order) {
      let x = 0n;
      let y = 0n;

      for (let bit = 0; bit < order; bit++) {
        const sourceBit = BigInt(bit);
        x |= ((distance >> (sourceBit * 2n)) & 1n) << sourceBit;
        y |= ((distance >> (sourceBit * 2n + 1n)) & 1n) << sourceBit;
      }

      if (order <= 53) {
        return [Number(x), Number(y)];
      }

      return [x, y];
    }

    return {
      point2Distance: point2Distance,
      distance2Point: distance2Point,
      point2DistanceBigInt: point2DistanceBigInt,
      distance2PointBigInt: distance2PointBigInt
    };
  })();

  const mortonLayout = {};
  let canvasWidth = 1;
  let order = 4;
  let simplifyCurves = true;

  mortonLayout.canvasWidth = function(_) {
    if (!arguments.length) return canvasWidth;
    canvasWidth = +_;
    return mortonLayout;
  };

  // Orders above 26 use BigInt to preserve distance precision.
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
    const d = getZOrderPath(range.start, range.length, order, canvasWidth, simplifyCurves);

    range.cellWidth = d.cellWidth;
    range.pathVertices = d.pathVertices;

    return mortonLayout;
  };

  mortonLayout.getValAtXY = function(x, y) {
    if (order > 26) {
      const n = 2 ** order;
      const xy = [x, y].map(function(coord) {
        return BigInt(Math.floor(coord * n / canvasWidth));
      });
      return zOrder.point2DistanceBigInt(xy[0], xy[1], order);
    }

    const n = Math.pow(2, order);
    const xy = [x, y].map(function(coord) {
      return Math.floor(coord * n / canvasWidth);
    });
    return zOrder.point2Distance(xy[0], xy[1]);
  };

  return mortonLayout;

  //

  function getZOrderPath(start, length, order, sideSize, simplifyCurves) {

    if (order > 26 || typeof start === "bigint" || typeof length === "bigint") {
      return getBigIntZOrderPath(start, length, order, sideSize, simplifyCurves);
    }

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
    const maxPos = Math.pow(4, order);
    start = Math.min(start, maxPos);
    length = Math.min(length, maxPos - start);

    // nSide is on a binary boundary 2^0, 2^1, 2^2, ...
    const nSide = Math.pow(2, order);
    const cellWidth = sideSize / nSide;

    const vertices = [];

    for (let i = 0; i < length; i++) {
      vertices.push(zOrder.distance2Point(start + i));
    }

    return {
      cellWidth: cellWidth,
      pathVertices: vertices
    };
  }

  function getBigIntZOrderPath(start, length, order, sideSize, simplifyCurves) {
    if (!Number.isInteger(order) || order < 0) {
      throw new RangeError("Morton order must be a non-negative integer");
    }

    if (typeof start === "number" && !Number.isFinite(start) ||
        typeof length === "number" && !Number.isFinite(length)) {
      throw new RangeError("Morton range values must be finite");
    }

    if (typeof start === "number" && Number.isInteger(start)) {
      start = toBigInt(start);
    }
    if (typeof length === "number" && Number.isInteger(length)) {
      length = toBigInt(length);
    }

    if (simplifyCurves) {
      while (!isInteger(start) || !isInteger(length)) {
        start = multiplyByFour(start);
        length = multiplyByFour(length);
        order += 1;
      }

      start = toBigInt(start);
      length = toBigInt(length);

      while (!(start % 4n) && !(length % 4n) && order > 0) {
        start /= 4n;
        length /= 4n;
        order -= 1;
      }
    } else {
      start = toBigInt(start);
      length = toBigInt(length);
    }

    const maxPos = 4n ** BigInt(order);
    start = start < maxPos ? start : maxPos;
    length = length < maxPos - start ? length : maxPos - start;

    const nSide = 2 ** order;
    const cellWidth = sideSize / nSide;
    const vertices = [];

    for (let i = 0n; i < length; i++) {
      vertices.push(zOrder.distance2PointBigInt(start + i, order));
    }

    return {
      cellWidth: cellWidth,
      pathVertices: vertices
    };
  }

  function isInteger(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }

  function multiplyByFour(value) {
    return typeof value === "bigint" ? value * 4n : value * 4;
  }

  function toBigInt(value) {
    if (typeof value === "bigint") {
      return value;
    }

    if (!Number.isSafeInteger(value)) {
      throw new RangeError("Morton range numbers must be safe integers; use BigInt for larger values");
    }

    return BigInt(value);
  }
}
