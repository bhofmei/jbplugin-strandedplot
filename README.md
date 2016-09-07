# Stranded XYPlot Plugin
Allows positive and negative values, i.e. reads from the plus and minus strand, be displayed at the same coordinate.

In the traditional XYPlot with BigWig store, only one value can be displayed per coordinate, so for coverage tracks there are two options:
* combine positive and negative strand reads--typically what is done
* "Add" together the separate coverages which does not show the true coverage distribution--it only shows where there is strong strandedness
There are situations where having strand-specific coverage is useful, such as RNA-seq coverage.

This plugin was designed to overcome the limitations of traditional coverage tracks by allowing for strand-specific coverage.


##Install

For JBrowse 1.11.6+ in the _JBrowse/plugins_ folder, type:  
``git clone https://github.com/bhofmei/jbplugin-strandedplot.git StrandedPlotPlugin``

##Activate
Add this to jbrowse.conf:

    [ plugins.StrandedPlotPlugin ]
    location = plugins/StrandedPlotPlugin

If that doesn't work, add this to jbrowse_conf.json:

    "plugins" : {
        "StrandedPlotPlugin" : { "location" : "plugins/StrandedPlotPlugin" }
    }

##Using Stranded XY Tracks
###Data storage
There is a custom storage class, `StrandedBigWig` which must be used.

Coverage information needs to be stored in two BigWig files. BigWig file names must follow the format `urlTemplate.plus` and `urlTemplate.minus` for plus-strand coverage and minus-strand coverage.
Values in `urlTemplate.minus` should be negative.

When using this store class, the `urlTemplate` should not include the `.plus` and `.minus`. The BigWig files `urlTemplate.plus` and `urlTemplate.minus` will be loaded.

###StrandedXYPlot
Similar to specificing the traditional `XYPlot`, use `StrandedXYPlot` for tracks with `StrandedBigWig` storage.

**Note**: `StrandedXYPlot` *can* be used with `BigWig` storage (similar to normal `XYPlot`).  
`XYPlot` *cannot* be used with `StrandedBigWig` storage (Negative values will not be displayed).

###Example
    {  
        "key" : "Strand-Specific Coverage",
        "label" : "track_stranded_coverage",
        "storeClass" : "StrandedPlotPlugin/Store/SeqFeature/StrandedBigWig",
        "urlTemplate" : "path/to/bigwig_file.bw",
        "type" : "StrandedPlugin/View/Track/Wiggle/StrandedXYPlot"
    }
The files `path/to/bigwig_file.bw.plus` and `path/to/bigwig_file.bw.minus` must exist.

##Future Plans
- Have this plugin work more directly with "Alignments2" histograms so RNA-seq can have stranded coverage tracks with the read alignments