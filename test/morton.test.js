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
});