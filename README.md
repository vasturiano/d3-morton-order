# d3-hilbert

D3 layout to visualize distance variables using a continuous Morton (Z-order) space-filling space. Here's an [example](http://bl.ocks.org/vasturiano/aee11f57aaa6b1ec96f1df386166a396).

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
