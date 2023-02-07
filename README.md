d3-morton
==============

[![NPM package][npm-img]][npm-url]
[![Build Size][build-size-img]][build-size-url]
[![NPM Downloads][npm-downloads-img]][npm-downloads-url]

D3 layout to visualize distance variables using a continuous Morton (Z-order) space-filling curve. Here's an [example](http://bl.ocks.org/vasturiano/db5e9e9cfe77d8c468136dc781ba0cc8).

See also [d3-hilbert](https://github.com/vasturiano/d3-hilbert).

## Quick start

```js
import d3ZOrder from 'd3-morton';
```
or using a *script* tag
```html
<script src="//unpkg.com/d3-morton"></script>
```
then
```js
const myRange = { start: 4, length: 9 };
d3.zOrder()
    .order(2)
    .layout(myRange)
```

## API reference

| Method | Description | Default |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------- |
| **canvasWidth**([*number*]) | Getter/setter for the length of each side of the square canvas which covers the full domain of the Z-order curve. | 1 |
| **order**([*int*]) | Getter/setter for the extent of the Z-Order curve domain, determined by `4^order`. **The maximum safe order is *26***, due to the JS numbers upper-boundary of 53 bits. | 4 |
| **simplifyCurves**([*boolean*]) | Getter/setter for whether to simplify the resolution of the curve to the most canonical 2-bit boundary that fits the range integral. For example, in a 2nd order curve (16 values), a range from *8* to *15* can be simplified from 8 vertices to 2 (each filling a square with 4 values), on the lower quadrants. This simplification greatly reduces the number of vertices in the curve and improves the calculation and rendering performance, specially for high-order ranges which tend to fall on 2-bit boundaries. | true |
| **layout**(*rangeObject*) | Extends the input rangeObject (syntax: `{start:<int>, length:<int>}`) with 2 additional properties defining the Z-Order curve: **.cellWidth** (*number* defining the side length of each square cell and essentially the thickness of the line, according to the canvasWidth) and **.pathVertices** (*Array* of [*num*,*num*], the sequential x,y coordinates of all the vertex points in the curve). | |
| **getValAtXY**(*num*, *num*) | Returns the reverse translated value on the curve domain found at coordinates *x*,*y*, relative to the canvasWidth. | |


[npm-img]: https://img.shields.io/npm/v/d3-morton
[npm-url]: https://npmjs.org/package/d3-morton
[build-size-img]: https://img.shields.io/bundlephobia/minzip/d3-morton
[build-size-url]: https://bundlephobia.com/result?p=d3-morton
[npm-downloads-img]: https://img.shields.io/npm/dt/d3-morton
[npm-downloads-url]: https://www.npmtrends.com/d3-morton
