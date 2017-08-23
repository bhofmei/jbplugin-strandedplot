define('StrandedPlotPlugin/View/Track/Wiggle/StrandedSVGPlot', [
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/Color',
    'dojo/colors',
    'dojo/on',
    'dojo/dom-construct',
    'dojox/gfx',
    'JBrowse/View/Track/WiggleBase',
    'JBrowse/View/Track/Wiggle/XYPlot',
    'JBrowse/View/Track/_YScaleMixin',
    'JBrowse/Util',
    'JBrowse/View/Track/Wiggle/_Scale'
  ],
  function (
    declare,
    lang,
    array,
    Color,
    dojoColor,
    on,
    domConstruct,
    gfx,
    WiggleBase,
    XYPlot,
    YScaleMixin,
    Util,
    Scale
  ) {

    var StrandedSVGPlot = declare([XYPlot],

      /**
       *
       * @lends JBrowse.View.Track.Wiggle.XYPlot
       * @extends JBrowse.View.Track.Wiggle.XYPlot
       */
      {
        constructor: function (args) {

        },

        _defaultConfig: function () {
          return Util.deepUpdate(
            lang.clone(this.inherited(arguments)), {
              style: {
                pos_color: 'blue',
                neg_color: 'red',
                origin_color: 'black',
                variance_band_color: 'rgba(0,0,0,0.3)'
              },
              showPlus: true,
              showMinus: true,
              autoscale: 'clipped_global'
            }
          );
        },

        renderBlock: function (args) {
          var block = args.block;

          // don't render this block again if we have already rendered
          // it with this scaling scheme
          if (!this.scaling.compare(block.scaling) || !block.pixelScores)
            return;



          block.scaling = this.scaling;

          domConstruct.empty(block.domNode);

          var features = block.features;
          var featureRects = block.featureRects;
          var dataScale = this.scaling;
          var canvasHeight = this._canvasHeight();
          var canvasWidth = this._canvasWidth(block);

          var c = gfx.createSurface(block.domNode, canvasWidth, canvasHeight);

          c.startBase = block.startBase;
          c.height = canvasHeight;
          block.canvas = c;


          //Calculate the score for each pixel in the block
          var pixels = this._calculatePixelScores(canvasWidth, features, featureRects);


          this._draw(block.scale, block.startBase,
            block.endBase, block,
            c, features,
            featureRects, dataScale,
            pixels, block.maskingSpans); // note: spans may be undefined.

          this.heightUpdate(c.height, args.blockIndex);
          if (!(c.rawNode.parentNode && c.rawNode.parentNode.parentNode)) {
            var blockWidth = block.endBase - block.startBase;

            c.rawNode.style.position = "absolute";
            c.rawNode.style.left = (100 * ((c.startBase - block.startBase) / blockWidth)) + "%";
            switch (this.config.align) {
              case "top":
                c.rawNode.style.top = "0px";
                break;
              case "bottom":
                /* fall through */
              default:
                c.rawNode.style.bottom = this.trackPadding + "px";
                break;
            }
          }

        },

        _draw: function (scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale, pixels, spans) {
          var thisB = this;
          this._preDraw(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale);

          thisB._drawFeatures(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale);

          /*if (spans) {
            this._maskBySpans(scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans);
          }*/
          this._postDraw(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale);
        },

        /**
         * Draw a set of features on the canvas.
         * @private
         */
        _drawFeatures: function (scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale) {
          var thisB = this;
          var config = this.config;
          var canvasHeight = canvas.getDimensions()
            .height;
          var canvasWidth = canvas.getDimensions()
            .width;
          var toY = dojo.hitch(this, function (val) {
            return canvasHeight * (1 - dataScale.normalize(val));
          });
          var originY = toY(dataScale.origin);
          var disableClipMarkers = config.disable_clip_markers;

          var fFeatures = [];
          var plusFeatures = []
          var minusFeatures = [];
          block.clipRects = [];
          // get all of the features
          array.forEach(features, function (f, i) {
            // check that feature has positive width
            if (featureRects[i].w > 0) {
              if (f.get('source') === 'minus') {
                minusFeatures.push({
                  feature: f,
                  featureRect: featureRects[i]
                });
              } else if (f.get('source') === "plus") {
                plusFeatures.push({
                  feature: f,
                  featureRect: featureRects[i]
                });
              }
            }
          });
          // sort by left
          var sortByPos = lang.hitch(this, function (a, b) {
            return a.featureRect.l - b.featureRect.l;
          });
          minusFeatures.sort(sortByPos);
          plusFeatures.sort(sortByPos);
          //console.log(plusFeatures);
          // loop through plus
          if (config.showPlus) {
            if (!config.noFill) {
              var posList = [{
                x: 0,
                y: originY
              }];
            }
            var lastY = originY;
            array.forEach(plusFeatures, function (pair, i) {
              var f = pair.feature;
              var fRect = pair.featureRect;
              var score = f.get('score');
              fRect.t = toY(score);
              var top = Math.max(fRect.t, 0);
              if (lastY != top) {
                posList.push({
                  x: fRect.l,
                  y: lastY
                });
                posList.push({
                  x: fRect.l,
                  y: top
                });
                lastY = top;
              }
              // add rect to clip markers if necessary
              if (!disableClipMarkers && fRect.t < 0) {
                block.clipRects.push({
                  x: fRect.l,
                  y: 0,
                  width: fRect.w,
                  height: 3,
                  fill: config.style.clip_marker_color || config.style.neg_color
                });
              }
            }, this);
            posList.push({
              x: canvasWidth,
              y: lastY
            });
            if (lastY != originY && !config.noFill) {
              posList.push({
                x: canvasWidth,
                y: originY
              });
            }
            if (posList.length > 2) {
              var plusLine = canvas.createPolyline()
                .setShape(posList)
                .setStroke(config.style.pos_color);
              if (!config.noFill) {
                plusLine.setFill(config.style.pos_color)
              }
            }
          } // end show plus
          // loop through minus
          if (config.showMinus) {
            if (!config.noFill) {
              var minusList = [{
                x: 0,
                y: originY
              }];
            }
            var lastY = originY;
            array.forEach(minusFeatures, function (pair, i) {
              var f = pair.feature;
              var fRect = pair.featureRect;
              var score = f.get('score');
              fRect.t = toY(score);
              var top = Math.min(fRect.t, canvasHeight);
              if (lastY != top) {
                minusList.push({
                  x: fRect.l,
                  y: lastY
                });
                minusList.push({
                  x: fRect.l,
                  y: top
                });
                lastY = top;
              }
              // add rect to clip markers if necessary
              if (!disableClipMarkers && fRect.t > canvasHeight) {
                block.clipRects.push({
                  x: fRect.l,
                  y: canvasHeight - 3,
                  width: fRect.w,
                  height: 3,
                  fill: config.style.clip_marker_color || config.style.pos_color
                });
              }
            }, this);
            minusList.push({
              x: canvasWidth,
              y: lastY
            });
            if (lastY != originY && !config.noFill) {
              minusList.push({
                x: canvasWidth,
                y: originY
              });
            }
            if (minusList.length > 2) {
              var minusLine = canvas.createPolyline()
                .setShape(minusList)
                .setStroke(config.style.neg_color);
              if (!config.noFill) {
                minusLine.setFill(config.style.neg_color)
              }
            }
          } // end show minus
          // done

        },
        _postDraw: function (scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale) {

          var canvasHeight = canvas.getDimensions()
            .height;
          var toY = dojo.hitch(this, function (val) {
            return canvasHeight * (1 - dataScale.normalize(val));
          });
          var thisB = this;

          // draw clip markers
          if (!thisB.config.disable_clip_markers && block.hasOwnProperty('clipRects') && block.clipRects.length > 0) {
            array.forEach(block.clipRects, function (rect) {
              canvas.createRect({
                  x: rect.x,
                  y: rect.y,
                  height: rect.height,
                  width: rect.width
                })
                .setFill(rect.fill);
            });
            block.clipRects = [];
          }

          // draw the origin line if it is not disabled
          var originColor = this.config.style.origin_color;
          if (typeof originColor == 'string' && !{
              'none': 1,
              'off': 1,
              'no': 1,
              'zero': 1
            }[originColor]) {
            var originY = toY(dataScale.origin);
            canvas.createLine({
                x1: 0,
                x2: canvas.getDimensions()
                  .width,
                y1: originY,
                y2: originY
              })
              .setStroke(originColor);
          }

        },

        _calculatePixelScores: function (canvasWidth, features, featureRects) {
          var scoreType = this.config.scoreType;
          var pixelValues = new Array(canvasWidth);
          if (scoreType == "avgScore") {
            // make an array of the average score at each pixel on the canvas
            array.forEach(features, function (f, i) {
              var store = f.source;
              var fRect = featureRects[i];
              var jEnd = fRect.r;
              var score = f.get('score');
              for (var j = Math.round(fRect.l); j < jEnd; j++) {
                // bin scores according to store
                if (pixelValues[j] && store in pixelValues[j]['scores']) {
                  pixelValues[j]['scores'][store].push(score);
                } else if (pixelValues[j]) {
                  pixelValues[j]['scores'][store] = [score];
                } else {
                  pixelValues[j] = {
                    scores: {},
                    feat: f
                  };
                  pixelValues[j]['scores'][store] = [score];
                }
              }
            }, this);
            // when done looping through features, average the scores in the same store then add them all together as the final score
            for (var i = 0; i < pixelValues.length; i++) {
              if (pixelValues[i]) {
                pixelValues[i]['score'] = 0;
                for (var store in pixelValues[i]['scores']) {
                  var j, sum = 0,
                    len = pixelValues[i]['scores'][store].length;
                  for (j = 0; j < len; j++) {
                    sum += pixelValues[i]['scores'][store][j];
                  }
                  pixelValues[i]['score'] += sum / len;
                }
                delete pixelValues[i]['scores'];
              }
            }
          } else {
            // make an array of the max score at each pixel on the canvas
            array.forEach(features, function (f, i) {
              var store = f.data.source;
              var fRect = featureRects[i];
              var jEnd = fRect.r;
              var score = f.get(scoreType) || f.get('score');
              for (var j = Math.round(fRect.l); j < jEnd; j++) {
                // positive values
                if (pixelValues[j] && store === 'plus') {
                  pixelValues[j]['scorex'][store] = (pixelValues[j]['scorex'][store] === undefined ? score : Math.max(pixelValues[j]['scorex'][store], score));
                }
                // negative values
                else if (pixelValues[j] && store === 'minus') {
                  pixelValues[j]['scorex'][store] = (pixelValues[j]['scorex'][store] === undefined ? score : Math.min(pixelValues[j]['scorex'][store], score));
                } else {
                  pixelValues[j] = {
                    scorex: {},
                    feat: f,
                    score: ''
                  };
                  pixelValues[j]['scorex'][store] = score;
                }
              }
            }, this);
            // when done looping through features, format into string
            for (var i = 0; i < pixelValues.length; i++) {
              if (pixelValues[i]) {
                var tmp = '';
                if (pixelValues[i]['scorex']['plus'])
                  tmp = tmp + '<div style="float:right;"> ' + pixelValues[i]['scorex']['plus'].toPrecision(6)
                  .toString() + '</div>';
                if (pixelValues[i]['scorex']['minus'])
                  tmp = tmp + '<div>' + pixelValues[i]['scorex']['minus'].toPrecision(6)
                  .toString() + '</div>';
                if (tmp === '')
                  tmp = '<div style="float:right">0</div>';
                pixelValues[i]['score'] = tmp;
                delete pixelValues[i]['scorex'];
              }
            }
          }
          //console.log(pixelValues);
          return pixelValues;
        },

        mouseover: function (bpX, evt) {
          // if( this._scoreDisplayHideTimeout )
          //     window.clearTimeout( this._scoreDisplayHideTimeout );
          if (bpX === undefined) {
            var thisB = this;
            //this._scoreDisplayHideTimeout = window.setTimeout( function() {
            thisB.scoreDisplay.flag.style.display = 'none';
            thisB.scoreDisplay.pole.style.display = 'none';
            //}, 1000 );
          } else {
            var block;
            array.some(this.blocks, function (b) {
              if (b && b.startBase <= bpX && b.endBase >= bpX) {
                block = b;
                return true;
              }
              return false;
            });

            if (!(block && block.canvas && block.pixelScores && evt))
              return;

            var pixelValues = block.pixelScores;
            var canvas = block.canvas.rawNode;
            var cPos = dojo.position(canvas);
            var x = evt.pageX;
            var cx = evt.pageX - cPos.x;

            if (this._showPixelValue(this.scoreDisplay.flag, pixelValues[Math.round(cx)])) {
              this.scoreDisplay.flag.style.display = 'block';
              this.scoreDisplay.pole.style.display = 'block';

              this.scoreDisplay.flag.style.left = evt.clientX + 'px';
              this.scoreDisplay.flag.style.top = cPos.y + 'px';
              this.scoreDisplay.pole.style.left = evt.clientX + 'px';
              this.scoreDisplay.pole.style.height = cPos.h + 'px';
            }
          }
        },

        _showPixelValue: function (scoreDisplay, score) {
          var scoreType = typeof score;
          if (scoreType == 'number') {
            // display the score with only 6
            // significant digits, avoiding
            // most confusion about the
            // approximative properties of
            // IEEE floating point numbers
            // parsed out of BigWig files
            scoreDisplay.innerHTML = parseFloat(score.toPrecision(6));
            return true;
          } else if (scoreType == 'string') {
            scoreDisplay.innerHTML = score;
            return true;
          } else if (score && typeof score['score'] == 'number') {
            // "score" may be an object.
            scoreDisplay.innerHTML = parseFloat(score['score'].toPrecision(6));
            return true;
          } else if (score && typeof score['score'] == 'string') {
            // "score" may be an object.
            scoreDisplay.innerHTML = score['score'];
            return true;
          } else {
            return false;
          }
        },

        _trackMenuOptions: function () {
          var options = this.inherited(arguments);
          var track = this;
          //console.log(track);
          options.push.apply(
            options, [{
                type: 'dijit/MenuSeparator'
              },
              {
                label: 'Show variance band',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.variance_band || false,
                onClick: function (event) {
                  track.config.variance_band = this.checked;
                  track.changed();
                }
                },
              {
                label: 'Show plus strand coverage',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.showPlus,
                onClick: function (event) {
                  track.config.showPlus = this.checked;
                  track.changed();
                }
              },
              {
                label: 'Show minus strand coverage',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.showMinus,
                onClick: function (event) {
                  track.config.showMinus = this.checked;
                  track.changed();
                }
              }
            ]);
          return options;
        }

      });

    return StrandedSVGPlot;
  });
