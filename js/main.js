define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'JBrowse/Util',
    'JBrowse/Plugin'
  ],
  function (
    declare,
    lang,
    domConstruct,
    Util,
    JBrowsePlugin
  ) {
    return declare(JBrowsePlugin, {
      constructor: function (args) {
        var browser = args.browser;
        var thisB = this;

        // do anything you need to initialize your plugin here
        this.config.version = "1.2.1";
        console.log('StrandedPlotPlugin starting - v'+this.config.version);

        browser.registerTrackType({
          label: 'StrandedSVGPlot',
          type: 'StrandedPlotPlugin/View/Track/Wiggle/StrandedSVGPlot'
        });
        browser.registerTrackType({
          label: 'StrandedXYPlot',
          type: 'StrandedPlotPlugin/View/Track/Wiggle/StrandedXYPlot'
        });

        browser.afterMilestone('loadConfig', function () {
          if (typeof browser.config.classInterceptList === 'undefined') {
            browser.config.classInterceptList = {};
          }

          // override WiggleBase
          require(["dojo/_base/lang", "JBrowse/View/Track/CanvasFeatures"], function (lang, CanvasFeatures) {
            lang.extend(CanvasFeatures, {
              _drawHistograms: thisB._drawHistograms

            });
          });
        });
      },

      _drawHistograms: function (viewArgs, histData) {
        var thisB = this;
        var maxScore = (this.config.histograms && this.config.histograms.max ) ? this.config.histograms.max : (histData.stats && histData.stats.max ? histData.stats.max : undefined );
        var minScore = (this.config.histograms && this.config.histograms.min ) ? this.config.histograms.min : (histData.stats && histData.stats.min ? histData.stats.min : 0 )

        // don't do anything if we don't know the score max
        if (maxScore === undefined) {
          console.warn('no stats.max in hist data, not drawing histogram for block ' + viewArgs.blockIndex);
          return;
        }

        // don't do anything if we have no hist features
        var features;
        if (!((features = histData.features) ||
            histData.bins && (features = this._histBinsToFeatures(viewArgs, histData))
          ))
          return;

        var block = viewArgs.block;
        var height = this.config.histograms.height;
        var scale = viewArgs.scale;
        var leftBase = viewArgs.leftBase;
        var minVal = this.config.histograms.min;

        domConstruct.empty(block.domNode);
        var c = block.featureCanvas =
          domConstruct.create(
            'canvas', {
              height: height,
              width: block.domNode.offsetWidth + 1,
              style: {
                cursor: 'default',
                height: height + 'px',
                position: 'absolute'
              },
              innerHTML: 'Your web browser cannot display this type of track.',
              className: 'canvas-track canvas-track-histograms'
            },
            block.domNode
          );
        this.heightUpdate(height, viewArgs.blockIndex);
        var ctx = c.getContext('2d');

        // finally query the various pixel ratios
        var ratio = Util.getResolution(ctx, this.browser.config.highResolutionMode);
        // upscale canvas if the two ratios don't match
        if (this.browser.config.highResolutionMode != 'disabled' && ratio >= 1) {
          var oldWidth = c.width;
          var oldHeight = c.height;

          c.width = oldWidth * ratio;
          c.height = oldHeight * ratio;

          c.style.width = oldWidth + 'px';
          c.style.height = oldHeight + 'px';

          // now scale the context to counter
          // the fact that we've manually scaled
          // our canvas element
          ctx.scale(ratio, ratio);
        }

        ctx.fillStyle = this.config.histograms.color;
        // determine if to draw stranded or unstranded
        if (/StrandedBigWig/.test(this.config.histograms.storeClass)) {
          // check for mean and std
          var mean;
          var stdDev;
          if (this.histogramStats === undefined || this.histogramStats.mean === undefined || this.histogramStats.stdDev == undefined) {
            this.browser.getStore(
              this.config.histograms.store,
              function (tmpStore) {
                tmpStore.getGlobalStats(
                  function (stats) {
                    mean = stats.scoreMean;
                    stdDev = stats.scoreStdDev;
                  },
                  function () {
                    console.warn('Error with histogram store class');
                  });
              });
            this.histogramStats = {
              mean: mean,
              stdDev: stdDev
            };
          } else {
            mean = this.histogramStats.mean;
            stdDev = this.histogramStats.stdDev;
          }
          // if we have values
          if (mean !== undefined && stdDev !== undefined) {
            minVal = mean - 3 * stdDev;
            maxScore = mean + 3 * stdDev;
            var toY = lang.hitch(this, function (val) {
              return height * (1 - ((val + mean - minVal) / (stdDev * 6))) / ratio;
            });
            var originY = toY(mean);
            for (var i = 0; i < features.length; i++) {
              var feature = features[i];
              var top = toY(feature.get('score'));
              var barWidth = Math.ceil((feature.get('end') - feature.get('start')) * scale);
              var barLeft = Math.round((feature.get('start') - leftBase) * scale);
              // positive
              if(top <= originY){
                ctx.fillRect(barLeft, Math.max(0, top), barWidth, originY-top+1);
                if(top < 0){
                  ctx.fillStyle = this.config.histograms.clip_marker_color;
                 ctx.fillRect(barLeft, 0, barWidth, 3);
                  ctx.fillStyle = this.config.histograms.color;
                }
              } // end positive
              // negative
              else {
                ctx.fillRect(barLeft, originY, barWidth, Math.min(top-originY+1, height-originY));
                if(top >= height){
                  ctx.fillStyle = this.config.histograms.clip_marker_color;
                ctx.fillRect(barLeft, height-3, barWidth, 3);
                ctx.fillStyle = this.config.histograms.color;
                }
              }
            }
            // draw origin
            ctx.fillStyle = this.config.style.origin_color || 'black';
            ctx.fillRect(0, originY, ctx.canvas.width, 1);
          }
        } else {
          for (var i = 0; i < features.length; i++) {
            var feature = features[i];
            var barHeight = feature.get('score') / maxScore * height;
            var barWidth = Math.ceil((feature.get('end') - feature.get('start')) * scale);
            var barLeft = Math.round((feature.get('start') - leftBase) * scale);
            ctx.fillRect(
              barLeft,
              height - barHeight,
              barWidth,
              barHeight
            );
            if (barHeight > height) {
              ctx.fillStyle = this.config.histograms.clip_marker_color;
              ctx.fillRect(barLeft, 0, barWidth, 3);
              ctx.fillStyle = this.config.histograms.color;
            }
          }
        }

        // make the y-axis scale for our histograms
        this.makeHistogramYScale(height, minVal, maxScore);
      }
    });
  });
