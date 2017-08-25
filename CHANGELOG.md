# Change Log
## [Unreleased]

## [v1.2.0] - 2017-08-25
- ADDED stranded histogram views for CanvasFeature (or anything that inherits it)
 tracks
- Looks for configuration histogram storage class to be "StrandedBigWig"
- Uses mean =/- 3 * stdDev to determine y-scale min/max

## [v1.1.3] - 2017-08-23
- fixed issue with stranded SVG duplicating points on line causing weird curves

## [v1.1.2] - 2017-08-14
- FIXED issue with diagonal lines on SVG polyline

## [v1.1.1] - 2017-08-11
- ADDED CSS3 color support for stranded svg tracks

## [v1.1.0] - 2017-08-10
- ADDED SVG type track which will be useful for screenshots
- Note: SVG tracks cannot handle masks at the moment

## [v1.0.0] - 2016-07-07
- stranded xyplot where reads from positive strand have positive values and reads from negative strand have negative values
- displays both positive and negative values for a given bp (unlike traditional XYPlot)
- requires specialized storage (for two separate bigwig files)