# d3-morton

D3 layout to visualize distance variables using a continuous Morton (Z-order) space-filling space. Here's an [example](http://bl.ocks.org/vasturiano/db5e9e9cfe77d8c468136dc781ba0cc8).

## API reference

```
d3.zOrder()
    .canvasWidth(<px>)
    .order(<order>)
    .simplifyCurves(<boolean:true>)
    .layout({
        start: <num>
        length: <num>
    })
    .getValAtXY(<x>, <y>)
```
