define('StrandedPlotPlugin/Store/SeqFeature/StrandedBigWig',[
    'dojo/_base/declare',
    'dojo/_base/lang',
    'JBrowse/Util',
    'JBrowse/Store/SeqFeature/BigWig',
    'JBrowse/Store/SeqFeature'
    ],
    function(
        declare,
        lang,
        Util,
        BigWigStore,
        SeqFeatureStore
    ){
return declare([BigWigStore,SeqFeatureStore],{
    
    ADJUST_EXP: 5,

    _defaultConfig: function() {
        return Util.deepUpdate(
        dojo.clone( this.inherited(arguments) ),
        {
            chunkSizeLimit: 30000000 // 30mb
        });
    },

    _getGlobalStats: function( successCallback, errorCallback ) {
        console.log('print get stats');
        var s = this._globalStats || {};
        // put scoreSum and scoreSumSquare in hidden variables
        //console.log(s.scoreSum,s.scoreSumSquares,s.scoreMax);
        // save correct scores in those variables
        if(('scoreSum' in s)){
            s._oldScoreSum = s.scoreSum;
            s.scoreSum = 0;
        }
        console.log('moved score sum');
        if(('scoreSumSquares' in s)){
            s._oldScoreSumSquared = s.scoreSumSquares;
            s.scoresumSquares = 0;
        }
        console.log('moved sum squares')
        if(('scoreMax' in s)){
            s._oldScoreMax = s.scoreMax;
            s.scoreMax = this._calculateAdjustedMax(s._oldScoreMax);
        }
        console.log('new max')
        if(('scoreMin')in s){
            s._oldScoreMin = s.scoreMin;
            s.scoreMin = -1 * s.scoreMax;
        }
        console.log('new min')
        // calculate mean and std dev from hidden variables
        if( !( 'scoreMean' in s ))
        var tmpMean = this._calculateAdjustedMean(s._oldScoreSum, s.basesCovered);
        s.scoreMean = (tmpMean[0] + tmpMean[1])/2;
        console.log('new mean',tmpMean);
        if( !( 'scoreStdDev' in s ))
        s.scoreStdDev = this._calculateAdjustedStDev(s._oldScoreSum, s._oldScoreSumSquared, s.basesCovered );
        console.log(s.scoreMean,s.scoreStdDev,s.scoreMax);
        successCallback( s );
    },
    
    _calculateAdjustedMean: function(sum, n){
        if(n==0) return 0;
        var f, z, x, y;
        f = Math.pow(10,this.ADJUST_EXP);
        // overall mean
        z = n ? sum / n : 0;
        // mean for positive portion
        x = Math.round( z / f ) / f; 
        // mean for negative portion
        //y = -1 * ( z % f);
        y = ( z % f);
        //console.log('x-y', x,y);
        return [x,y,z];
    },
    
    _calculateAdjustedStDev: function(sum, sumSq, n){
        var f, g, v, xv, yv, vm;
        f = Math.pow(10,this.ADJUST_EXP);
        g = Math.pow(10,2*this.ADJUST_EXP);
        if (n==0)
            return 0;
        // variance overall
        v = sumSq - sum*sum/n;
        if (n > 1) v /= n-1;
        // variance positive portion
        xv = Math.round(v / g ) / g;
        // variance negative
        yv = v % f;
        vm = Math.max(xv,yv);
        return vm < 0 ? 0 : Math.sqrt(vm);
    },
    
    _calculateAdjustedMax: function(curMax){ 
        var f = Math.pow(10,this.ADJUST_EXP);
        return Math.round(curMax/f)/f;
    }
    
});
});