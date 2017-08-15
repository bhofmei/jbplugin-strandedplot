define([
    'dojo/_base/declare',
    'JBrowse/Plugin'
  ],
  function (
    declare,
    JBrowsePlugin
  ) {
    return declare(JBrowsePlugin, {
      constructor: function (args) {
        var browser = args.browser;

        // do anything you need to initialize your plugin here
        console.log('StrandedPlotPlugin starting');
        this.config.version = "1.1.2";
        browser.registerTrackType({
          label: 'StrandedSVGPlot',
          type: 'StrandedPlotPlugin/View/Track/Wiggle/StrandedSVGPlot'
        });
        browser.registerTrackType({
          label: 'StrandedXYPlot',
          type: 'StrandedPlotPlugin/View/Track/Wiggle/StrandedXYPlot'
        });
      }
    });
  });
