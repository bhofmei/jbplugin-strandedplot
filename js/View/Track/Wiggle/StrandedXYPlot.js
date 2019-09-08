define( 'StrandedPlotPlugin/View/Track/Wiggle/StrandedXYPlot', [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Color',
            'dojo/on',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/View/Track/Wiggle/XYPlot',
            'JBrowse/View/Track/_YScaleMixin',
            'JBrowse/Util',
            'JBrowse/View/Track/Wiggle/_Scale'
        ],
        function( declare, array, Color, on, WiggleBase, XYPlot, YScaleMixin, Util, Scale ) {

var StrandedXYPlot = declare( [XYPlot],

/**
 *
 * @lends JBrowse.View.Track.Wiggle.XYPlot
 * @extends JBrowse.View.Track.Wiggle.XYPlot
 */
{
    constructor: function(args){

    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                style: {
                    pos_color: 'blue',
                    neg_color: 'red',
                    origin_color: 'black',
                    variance_band_color: 'rgba(0,0,0,0.3)'
                },
                showPlus: true,
                showMinus: true,
                autoscale: 'local'
            }
        );
    },

    _draw: function(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale, pixels, spans) {
        var thisB = this;
        this._preDraw( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );

        thisB._drawFeatures( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );

        if ( spans ) {
            this._maskBySpans( scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans );
        }
        this._postDraw( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
    },

    /**
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
        var thisB = this;
        var config = this.config;
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;

        var ratio = Util.getResolution( context, this.browser.config.highResolutionMode );
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize(val) ) / ratio;
        });
        var originY = toY( dataScale.origin );
        var disableClipMarkers = config.disable_clip_markers;

        var fFeatures = [];
        // get all of the features
        dojo.forEach( features, function(f,i) {
            fFeatures.push({ feature: f, featureRect: featureRects[i] });
        });
        dojo.forEach( fFeatures, function(pair,i) {
          //console.log(pair.feature.get('source'),pair.feature.get('start'));
            var f = pair.feature;
            var fRect = pair.featureRect;
            var score = f.get('score');

            fRect.t = toY( score );

            if( fRect.t <= canvasHeight ) { // if the rectangle is visible at all
                if (fRect.t <= originY && config.showPlus){ // bar goes upward - plus strand
                    context.fillStyle = config.style.pos_color;
                    //context.fillRect( fRect.l, fRect.t, fRect.w, originY-fRect.t+1);
                    thisB._fillRectMod( context, fRect.l, fRect.t, fRect.w, originY-fRect.t+1);
                    // handle clip markers if necessary
                    if(!disableClipMarkers && fRect.t < 0){
                        context.fillStyle = config.style.clip_marker_color || config.style.neg_color;
                        thisB._fillRectMod( context, fRect.l, 0, fRect.w, 3);
                    }
                }
                else if(fRect.t > originY && config.showMinus){ // downward - minus
                    context.fillStyle = config.style.neg_color;
                    //context.fillRect( fRect.l, originY, fRect.w, fRect.t-originY+1 );
                    thisB._fillRectMod( context, fRect.l, originY, fRect.w, fRect.t-originY+1);
                    // handle clip markers if necessary
                    if(!disableClipMarkers && fRect.t >= canvasHeight ){
                        context.fillStyle = config.style.clip_marker_color || config.style.pos_color;
                        thisB._fillRectMod( context, fRect.l, canvasHeight-3, fRect.w, 3);
                    }
                }
            }
        }, this );
    },

    _calculatePixelScores: function( canvasWidth, features, featureRects ) {
        var scoreType = this.config.scoreType;
        var pixelValues = new Array( canvasWidth );
        if(scoreType=="avgScore") {
            // make an array of the average score at each pixel on the canvas
            dojo.forEach( features, function( f, i ) {
                var store = f.source;
                var fRect = featureRects[i];
                var jEnd = fRect.r;
                var score = f.get('score');
                for( var j = Math.round(fRect.l); j < jEnd; j++ ) {
                    // bin scores according to store
                    if ( pixelValues[j] && store in pixelValues[j]['scores'] ) {
                        pixelValues[j]['scores'][store].push(score);
                    }
                    else if ( pixelValues[j] ) {
                        pixelValues[j]['scores'][store] = [score];
                    }
                    else {
                        pixelValues[j] = { scores: {}, feat: f };
                        pixelValues[j]['scores'][store] = [score];
                    }
                }
            },this);
            // when done looping through features, average the scores in the same store then add them all together as the final score
            for (var i=0; i<pixelValues.length; i++) {
                if ( pixelValues[i] ) {
                    pixelValues[i]['score'] = 0;
                    for ( var store in pixelValues[i]['scores']) {
                        var j, sum = 0, len = pixelValues[i]['scores'][store].length;
                        for (j = 0; j < len; j++) {
                            sum += pixelValues[i]['scores'][store][j];
                        }
                        pixelValues[i]['score'] += sum / len;
                    }
                    delete pixelValues[i]['scores'];
                }
            }
        }
        else {
          // make an array of the max score at each pixel on the canvas
            dojo.forEach( features, function( f, i ) {
                var store = f.data.source;
                var fRect = featureRects[i];
                var jEnd = fRect.r;
                var score = scoreType ? f.get(scoreType) : f.get('score');
                for( var j = Math.round(fRect.l); j < jEnd; j++ ) {
                    // positive values
                    if ( pixelValues[j] && store === 'plus' ) {
                       pixelValues[j]['scorex'][store] = (pixelValues[j]['scorex'][store] === undefined ? score : Math.max(pixelValues[j]['scorex'][store], score));
                    }
                    // negative values
                    else if(pixelValues[j] && store === 'minus'){
                        pixelValues[j]['scorex'][store] = (pixelValues[j]['scorex'][store] === undefined ? score : Math.min(pixelValues[j]['scorex'][store], score));
                    }
                    else {
                        pixelValues[j] = { scorex:{}, feat: f, score:'' };
                        pixelValues[j]['scorex'][store] = score;
                    }
                }
            },this);
            // when done looping through features, format into string
            for (var i=0; i<pixelValues.length; i++) {
                if ( pixelValues[i] ) {
                    var tmp = '';
                    if (pixelValues[i]['scorex']['plus'])
                        tmp = tmp + '<div style="float:right;"> ' + pixelValues[i]['scorex']['plus'].toPrecision(6).toString() + '</div>';
                    if (pixelValues[i]['scorex']['minus'])
                        tmp = tmp + '<div>' + pixelValues[i]['scorex']['minus'].toPrecision(6).toString() + '</div>';
                    if( tmp === '')
                        tmp = '<div style="float:right">0</div>';
                    pixelValues[i]['score'] = tmp;
                    delete pixelValues[i]['scorex'];
                }
            }
        }
        //console.log(pixelValues);
        return pixelValues;
    },

    _showPixelValue: function( scoreDisplay, score ) {
        var scoreType = typeof score;
        if( scoreType == 'number' ) {
            // display the score with only 6
            // significant digits, avoiding
            // most confusion about the
            // approximative properties of
            // IEEE floating point numbers
            // parsed out of BigWig files
            scoreDisplay.innerHTML = parseFloat( score.toPrecision(6) );
            return true;
        }
        else if( scoreType == 'string' ) {
            scoreDisplay.innerHTML = score;
            return true;
        }
        else if( score && typeof score['score'] == 'number' ) {
            // "score" may be an object.
            scoreDisplay.innerHTML = parseFloat( score['score'].toPrecision(6) );
            return true;
        }
        else if( score && typeof score['score'] == 'string' ) {
            // "score" may be an object.
            scoreDisplay.innerHTML =score['score'];
            return true;
        }
        else {
            return false;
        }
    },

    _trackMenuOptions: function() {
        var options = this.inherited(arguments);
        var track = this;
        //console.log(track);
        options.push.apply(
            options,
            [
                { type: 'dijit/MenuSeparator' },
                {
                    label: 'Show variance band',
                    type: 'dijit/CheckedMenuItem',
                    checked: track.config.variance_band,
                    onClick: function(event) {
                        track.config.variance_band = this.checked;
                        track.changed();
                    }
                },
                {
                    label: 'Show plus strand coverage',
                    type: 'dijit/CheckedMenuItem',
                    checked: track.config.showPlus,
                    onClick: function(event) {
                        track.config.showPlus = this.checked;
                        track.changed();
                    }
                },
                {
                    label: 'Show minus strand coverage',
                    type: 'dijit/CheckedMenuItem',
                    checked: track.config.showMinus,
                    onClick: function(event) {
                        track.config.showMinus = this.checked;
                        track.changed();
                    }
                }
            ]);
        return options;
    }

});

return StrandedXYPlot;
});
