import assert from "node:assert/strict";
import { describe, it } from "mocha";
import morton from "../src/morton.js";

function encodeMorton(x, y, order) {
  let value = 0;

  for (let bit = 0; bit < order; bit++) {
    value += (Math.floor(x / (2 ** bit)) % 2) * (2 ** (2 * bit));
    value += (Math.floor(y / (2 ** bit)) % 2) * (2 ** (2 * bit + 1));
  }

  return value;
}

function decodeMorton(value, order) {
  let x = 0;
  let y = 0;

  for (let bit = 0; bit < order; bit++) {
    x += (Math.floor(value / (2 ** (2 * bit))) % 2) * (2 ** bit);
    y += (Math.floor(value / (2 ** (2 * bit + 1))) % 2) * (2 ** bit);
  }

  return [x, y];
}

function encodeMortonBigInt(x, y, order) {
  let value = 0n;

  for (let bit = 0; bit < order; bit++) {
    const position = BigInt(bit);
    value |= ((x >> position) & 1n) << (position * 2n);
    value |= ((y >> position) & 1n) << (position * 2n + 1n);
  }

  return value;
}

function decodeMortonBigInt(value, order) {
  let x = 0n;
  let y = 0n;

  for (let bit = 0; bit < order; bit++) {
    const position = BigInt(bit);
    x |= ((value >> (position * 2n)) & 1n) << position;
    y |= ((value >> (position * 2n + 1n)) & 1n) << position;
  }

  return [x, y];
}

describe("Morton layout API", function() {
  it("exposes defaults and chainable, coercing setters", function() {
    const layout = morton();

    assert.equal(layout.canvasWidth(), 1);
    assert.equal(layout.order(), 4);
    assert.equal(layout.simplifyCurves(), true);
    assert.equal(layout.canvasWidth("8"), layout);
    assert.equal(layout.order("3"), layout);
    assert.equal(layout.simplifyCurves(false), layout);
    assert.equal(layout.canvasWidth(), 8);
    assert.equal(layout.order(), 3);
    assert.equal(layout.simplifyCurves(), false);
  });

  it("keeps configuration independent between instances", function() {
    const configured = morton().canvasWidth(12).order(2).simplifyCurves(false);
    const defaults = morton();

    assert.equal(configured.canvasWidth(), 12);
    assert.equal(configured.order(), 2);
    assert.equal(configured.simplifyCurves(), false);
    assert.equal(defaults.canvasWidth(), 1);
    assert.equal(defaults.order(), 4);
    assert.equal(defaults.simplifyCurves(), true);
  });

  it("maps fractional coordinates to their containing grid cell", function() {
    const layout = morton().canvasWidth(4).order(2);

    assert.equal(layout.getValAtXY(1.99, 2.1), encodeMorton(1, 2, 2));
  });
});

describe("Morton layout ranges", function() {
  it("adds a path to the range, preserves its other fields, and returns the layout", function() {
    const layout = morton().canvasWidth(4).order(2).simplifyCurves(false);
    const range = { start: 5, length: 3, label: "retained" };

    assert.equal(layout.layout(range), layout);
    assert.equal(range.label, "retained");
    assert.equal(range.cellWidth, 1);
    assert.deepEqual(range.pathVertices, [5, 6, 7].map(value => decodeMorton(value, 2)));
  });

  it("simplifies the default range to an aligned coarse path", function() {
    const range = { start: 0, length: 12 };

    morton().layout(range);

    assert.equal(range.cellWidth, 0.125);
    assert.deepEqual(range.pathVertices, [[0, 0], [1, 0], [0, 1]]);
  });

  it("repeatedly simplifies ranges aligned to multiple two-bit boundaries", function() {
    const range = { start: 128, length: 64 };

    morton().order(4).canvasWidth(1).layout(range);

    assert.equal(range.cellWidth, 0.5);
    assert.deepEqual(range.pathVertices, [[0, 1]]);
  });

  it("does not simplify when either range boundary is not aligned", function() {
    const range = { start: 4, length: 3 };

    morton().order(2).simplifyCurves(true).layout(range);

    assert.equal(range.pathVertices.length, 3);
    assert.deepEqual(range.pathVertices, [4, 5, 6].map(value => decodeMorton(value, 2)));
  });

  it("does not simplify below order zero and clips a range to the domain", function() {
    const range = { start: 0, length: 2 };

    morton().canvasWidth(4).order(0).layout(range);

    assert.equal(range.cellWidth, 4);
    assert.deepEqual(range.pathVertices, [[0, 0]]);
  });

  it("clips the range length at the upper boundary", function() {
    const range = { start: 14, length: 5 };

    morton().order(2).simplifyCurves(false).layout(range);

    assert.deepEqual(range.pathVertices, [14, 15].map(value => decodeMorton(value, 2)));
  });

  it("returns no vertices for ranges starting at or beyond the domain end", function() {
    const layout = morton().order(2).simplifyCurves(false);
    const atEnd = { start: 16, length: 2 };
    const beyondEnd = { start: 17, length: 2 };

    layout.layout(atEnd).layout(beyondEnd);

    assert.deepEqual(atEnd.pathVertices, []);
    assert.deepEqual(beyondEnd.pathVertices, []);
  });

  it("raises resolution until fractional start and length become integral", function() {
    const range = { start: 0.25, length: 0.5 };

    morton().canvasWidth(4).order(2).layout(range);

    assert.equal(range.cellWidth, 0.5);
    assert.deepEqual(range.pathVertices, [[1, 0], [0, 1]]);
  });

  it("raises resolution when only the length is fractional", function() {
    const range = { start: 1, length: 0.25 };

    morton().canvasWidth(4).order(2).layout(range);

    assert.equal(range.cellWidth, 0.5);
    assert.deepEqual(range.pathVertices, [[2, 0]]);
  });
});

describe("Morton coordinate mapping", function() {
  it("matches an arithmetic Morton reference for small grids and round-trips every cell", function() {
    for (let order = 1; order <= 4; order++) {
      const side = 2 ** order;
      const layout = morton().canvasWidth(side).order(order).simplifyCurves(false);
      const range = { start: 0, length: side * side };

      layout.layout(range);

      assert.equal(range.cellWidth, 1);
      assert.equal(range.pathVertices.length, side * side);

      for (let value = 0; value < side * side; value++) {
        assert.deepEqual(range.pathVertices[value], decodeMorton(value, order));
      }

      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          assert.equal(layout.getValAtXY(x + 0.5, y + 0.5), encodeMorton(x, y, order));
        }
      }
    }
  });

  it("handles selected high coordinate bits without generating a large path", function() {
    const coordinate = 0x7fff;
    const value = encodeMorton(coordinate, coordinate, 16);
    const layout = morton().canvasWidth(0x10000).order(16).simplifyCurves(false);
    const range = { start: value, length: 1 };

    layout.layout(range);

    assert.equal(value, 0x3fffffff);
    assert.equal(range.cellWidth, 1);
    assert.deepEqual(range.pathVertices, [[coordinate, coordinate]]);
    assert.equal(layout.getValAtXY(coordinate + 0.5, coordinate + 0.5), value);
  });

  it("retains numeric distances and vertices at order 26", function() {
    const layout = morton().canvasWidth(2 ** 26).order(26).simplifyCurves(false);
    const range = { start: 0, length: 1 };

    layout.layout(range);

    assert.equal(typeof layout.getValAtXY(0.5, 0.5), "number");
    assert.deepEqual(range.pathVertices, [[0, 0]]);
  });

  it("uses exact BigInt distances and numeric vertices above order 26", function() {
    const order = 27;
    const x = 0x1234567n;
    const y = 0x6543210n;
    const value = encodeMortonBigInt(x, y, order);
    const layout = morton().canvasWidth(2 ** order).order(order).simplifyCurves(false);
    const range = { start: value, length: 1n };

    layout.layout(range);

    assert.equal(value > BigInt(Number.MAX_SAFE_INTEGER), true);
    assert.equal(layout.getValAtXY(Number(x) + 0.5, Number(y) + 0.5), value);
    assert.deepEqual(range.pathVertices, [[Number(x), Number(y)]]);

    const safeNumberRange = { start: Number.MAX_SAFE_INTEGER, length: 1 };
    layout.layout(safeNumberRange);
    assert.deepEqual(safeNumberRange.pathVertices, [
      decodeMortonBigInt(BigInt(Number.MAX_SAFE_INTEGER), order).map(Number)
    ]);
  });

  it("clips high-order BigInt ranges at the domain boundary", function() {
    const order = 27;
    const domainLength = 4n ** BigInt(order);
    const range = { start: domainLength - 2n, length: 5n };

    morton().order(order).simplifyCurves(false).layout(range);

    assert.deepEqual(range.pathVertices, [
      decodeMortonBigInt(domainLength - 2n, order),
      decodeMortonBigInt(domainLength - 1n, order)
    ].map(([x, y]) => [Number(x), Number(y)]));
  });

  it("simplifies aligned high-order BigInt ranges", function() {
    const order = 27;
    const start = 3n * (4n ** 25n);
    const length = 4n ** 25n;
    const range = { start, length };

    morton().canvasWidth(8).order(order).layout(range);

    assert.equal(range.cellWidth, 2);
    assert.deepEqual(range.pathVertices, [[1, 1]]);
  });

  it("raises high-order resolution for fractional numeric ranges", function() {
    const range = { start: 0.25, length: 0.5 };

    morton().order(27).layout(range);

    assert.equal(range.cellWidth, 2 ** -28);
    assert.deepEqual(range.pathVertices, [[1, 0], [0, 1]]);
  });

  it("preserves safe integer precision while scaling a fractional range", function() {
    const start = Number.MAX_SAFE_INTEGER;
    const range = { start, length: 0.25 };

    morton().order(27).layout(range);

    assert.deepEqual(range.pathVertices, [
      decodeMortonBigInt(BigInt(start) * 4n, 28).map(Number)
    ]);
  });

  it("scales a BigInt range value alongside a fractional value", function() {
    const range = { start: 0.25, length: 1n };

    morton().order(27).layout(range);

    assert.deepEqual(range.pathVertices, [[1, 0], [0, 1], [1, 1], [2, 0]]);
  });

  it("returns BigInt vertices above order 53 and maps high coordinates exactly", function() {
    const order = 54;
    const x = 1n << 53n;
    const value = encodeMortonBigInt(x, 0n, order);
    const layout = morton().canvasWidth(2 ** order).order(order).simplifyCurves(false);
    const range = { start: value, length: 1n };

    layout.layout(range);

    assert.deepEqual(range.pathVertices, [[x, 0n]]);
    assert.equal(layout.getValAtXY(Number(x), 0), value);
  });

  it("rejects unsafe numeric values and invalid high orders", function() {
    const layout = morton().order(27);

    assert.throws(() => layout.layout({ start: Number.MAX_SAFE_INTEGER + 1, length: 1 }), RangeError);
    assert.throws(() => layout.layout({ start: Infinity, length: 1 }), RangeError);
    assert.throws(() => morton().order(27.5).layout({ start: 0, length: 1 }), RangeError);
  });

  it("returns no vertices for BigInt ranges beyond the high-order domain", function() {
    const domainLength = 4n ** 27n;
    const range = { start: domainLength + 1n, length: 1n };

    morton().order(27).simplifyCurves(false).layout(range);

    assert.deepEqual(range.pathVertices, []);
  });
});