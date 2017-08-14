require([
  'dojo/_base/declare',
  'dojo/_base/array',
  'JBrowse/Browser',
  'StrandedPlotPlugin/View/Track/Wiggle/StrandedXYPlot',
  'StrandedPlotPlugin/View/Track/Wiggle/StrandedSVGPlot',
  'StrandedPlotPlugin/Store/SeqFeature/StrandedBigWig'
], function (
  declare,
  array,
  Browser,
  StrandedPlot,
  StrandedSVGPlot,
  StrandedBigWig
) {

  describe('Initalize track', function () {
    var track = new StrandedPlot({
      browser: new Browser({
        unitTestMode: true
      }),
      config: {
        urlTemplate: "../data/test_e2fa_short.bw",
        label: "testtrack"
      }
    });
    it('track', function () {
      expect(track)
        .toBeTruthy();
    });
  });

  /*describe('Initalize SVG track', function () {
    var track = new StrandedSVGPlot({
      browser: new Browser({
        unitTestMode: true
      }),
      config: {
        urlTemplate: "../data/test_e2fa_short.bw",
        label: "testtrack_svg"
      }
    });
    it('track', function () {
      expect(track)
        .toBeTruthy();
    });
  });*/

  describe('functioning store', function () {
    var store = new StrandedBigWig({
      browser: new Browser({
        unitTestMode: true
      }),
      urlTemplate: '../data/test_e2fa_short.bw',
      config: {}
    });

    // before each test, get the features
    var features = [];
    beforeEach(function (done) {
      store.getFeatures({
        ref: 'Chr5',
        start: 1,
        end: 1000
      }, function (feature) {
        features.push(feature);
      }, function () {
        done();
      }, function (error) {
        console.error(error);
        done();
      });
    });
    // after each test, clear feature list
    afterEach(function () {
      features = [];
    });

    // initialize a store
    it('init store', function () {
      expect(store)
        .toBeTruthy();
    });

    it('expect 2 sub-stores', function () {
      expect(store.stores.length)
        .toBe(2);
    });

    // check that there are the correct number of features
    it('feature bigwig values', function () {
      var plusFeatures = array.filter(features, function (f) {
        return f.get('source') === "plus";
      });
      var minusFeatures = array.filter(features, function (f) {
        return f.get('source') === "minus";
      });
      expect(plusFeatures.length)
        .toEqual(3);
      expect(minusFeatures.length)
        .toEqual(3);
    });

  });

  describe('test for empty features', function () {
    var store = new StrandedBigWig({
      browser: new Browser({
        unitTestMode: true
      }),
      urlTemplate: '../data/test_e2fa_short.bw',
      config: {}
    });
    var emptyFeatures = [];
    beforeEach(function (done) {
      store.getFeatures({
        ref: 'Chr1',
        start: 1,
        end: 1000
      }, function (feature) {
        emptyFeatures.push(feature);
      }, function () {
        done();
      }, function (error) {
        console.error(error);
        done();
      });
    });
    it('empty features', function () {
      expect(emptyFeatures.length)
        .toEqual(0);
    });
  });

  describe('non-existant store', function () {
    var store = new StrandedBigWig({
      browser: new Browser({
        unitTestMode: true
      }),
      urlTemplate: '../data/nonexistant_data.bw'
    });
    // initialize a store
    var features = [];
    var catchError = false;
    beforeEach(function (done) {
      store.getFeatures({
        ref: 'Chr5',
        start: 1,
        end: 1000
      }, function (feature) {
        features.push(feature);
      }, function () {
        done();
      }, function () {
        catchError = true;
        done();
      });
    });
    afterEach(function () {
      features = [];
    });
    it('init store', function () {
      expect(catchError)
        .toEqual(true);
    });
  });

});
