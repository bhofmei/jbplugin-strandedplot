[![Build Status](https://travis-ci.org/bhofmei/jbplugin-strandedplot.svg?branch=master)](https://travis-ci.org/bhofmei/jbplugin-strandedplot)

# Stranded XYPlot Plugin
Allows positive and negative values, i.e. reads from the plus and minus strand, be displayed at the same coordinate.

In the traditional XYPlot with BigWig store, only one value can be displayed per coordinate, so for coverage tracks there are two options:
* combine positive and negative strand reads--typically what is done
* "Add" together the separate coverages which does not show the true coverage distribution--it only shows where there is strong strandedness
There are situations where having strand-specific coverage is useful, such as RNA-seq coverage.

This plugin was designed to overcome the limitations of traditional coverage tracks by allowing for strand-specific coverage.


## Install

For JBrowse 1.11.6+ in the _JBrowse/plugins_ folder, type:  
``git clone https://github.com/bhofmei/jbplugin-strandedplot.git StrandedPlotPlugin``

**or**

downloaded the latest release version at [releases](https://github.com/bhofmei/jbplugin-strandedplot/releases).  
Unzip the downloaded folder, place in _JBrowse/plugins_, and rename the folder _StrandedPlotPlugin_

## Activate
Add this to _jbrowse.conf_ under `[GENERAL]`:

    [ plugins.StrandedPlotPlugin ]
    location = plugins/StrandedPlotPlugin

If that doesn't work, add this to _jbrowse_conf.json_:

    "plugins" : {
        "StrandedPlotPlugin" : { "location" : "plugins/StrandedPlotPlugin" }
    }

**DO NOT ADD THE PLUGIN TO BOTH!**

## Using Stranded XY Tracks
### Data storage
There is a custom storage class, `StrandedBigWig` which must be used.

Requirements:
1. Coverage information needs to be stored in two BigWig files.
2. BigWig file names must follow the format `urlTemplate.plus` and `urlTemplate.minus` for plus-strand coverage and minus-strand coverage.
3. Values in `urlTemplate.minus` should be negative. 

When using this store class, the `urlTemplate` in the track configuration should not include the `.plus` and `.minus`. The BigWig files `urlTemplate.plus` and `urlTemplate.minus` will be loaded.

See [file conversion](#file-conversion) for a script which will convert BAM and BED files to strand-specific BigWig files that work with this plugin. It is **not necessary** to use this script as long as above requirements are followed.

### StrandedXYPlot
Similar to specificing the traditional `XYPlot`, use `StrandedXYPlot` for tracks with `StrandedBigWig` storage.

**Note**: `StrandedXYPlot` *can* be used with `BigWig` storage (similar to normal `XYPlot`).  
`XYPlot` *cannot* be used with `StrandedBigWig` storage (Negative values will not be displayed).

### Example
    {  
        "key" : "Strand-Specific Coverage",
        "label" : "track_stranded_coverage",
        "storeClass" : "StrandedPlotPlugin/Store/SeqFeature/StrandedBigWig",
        "urlTemplate" : "path/to/bigwig_file.bw",
        "type" : "StrandedPlotPlugin/View/Track/Wiggle/StrandedXYPlot"
    }
The files `path/to/bigwig_file.bw.plus` and `path/to/bigwig_file.bw.minus` must exist.

## Stranded Histogram Tracks
Canvas feature based tracks, i.e. Alignments2 and smAlignments from [SmallRNAPlugin](https://github.com/bhofmei/jbplugin-smallrna), have a histogram view when zoomed past the max glyph density.
For alignments2 and smAlignments, the histograms are drawn based on a stored BigWig which has the read coverage (See the [JBrowse configuration guide](http://gmod.org/wiki/JBrowse_Configuration_Guide#alginments2) under configuration options -> histograms), which is strand independent by virtue of bigwig file storage.

### Example and Configuration
This plugin includes support to have the histograms be stranded when specified.
Note, the y-axis range cannot be changed at this time.

To have stranded histograms for an Alignments2 track,
```
{
  "key" : "Alignments",
  "label" : "track_alignments_stranded_coverage",
  ...,
  "histograms" : {
    "color" : "#d1d1d1",
    "storeClass" : "StrandedPlotPlugin/Store/SeqFeature/StrandedBigWig",
    "urlTemplate" : "path/to/coverage_file.bw",
    "description" : "coverage depth",
    "height" : 100
  },
  ...,
  "type" : "JBrowse/View/Track/Alignments2"
}
```

The important lines are `histograms.storeClass` and `histograms.urlTemplate`.
The files `path/to/coverage_file.bw.plus` and `path/to/coverage_file.bw.minus` must exist. See [Data storage](#data-storage).


### Additional plugin support
Stranded coverage plots will work for Small RNA Alignments from the [SmallRNAPlugin](https://github.com/bhofmei/jbplugin-smallrna).

```
{
  "key" : "Small RNA Alignments",
  "label" : "track_smalignments_stranded_coverage",
  ...,
  "histograms" : {
    "color" : "#d1d1d1",
    "storeClass" : "StrandedPlotPlugin/Store/SeqFeature/StrandedBigWig",
    "urlTemplate" : "path/to/smrna_coverage_file.bw",
    "description" : "coverage depth",
    "height" : 100
  },
  ...,
  "type" : "SmallRNAPlugin/View/Track/smAlignments"
}
```

The files `path/to/smrna_coverage_file.bw.plus` and `path/to/smrna_coverage_file.bw.minus` must exist.

## File conversion
### Required programs
_bedGraphToBigWig_ and _bedtools_ must be on the path or in the `bin` folder. _samtools_ must be on the path to use the `-index` option when indexing BAM files. _bedSort_ must be on the path to use the `-sort` option, which avoids errors when converting.

#### Getting bedGraphToBigWig and bedSort

**Option 1**: Download manually

Mac OSX 64-bit: <http://hgdownload.cse.ucsc.edu/admin/exe/macOSX.x86_64/>  
Linux 64-bit: <http://hgdownload.cse.ucsc.edu/admin/exe/linux.x86_64/>  
Older Linux/Linux server: <http://hgdownload.cse.ucsc.edu/admin/exe/linux.x86_64.v287/>

1. Choose the appropriate web page from above based on operating stystem. There will be a long list of programs. 
2. Scroll down to find _bedGraphToBigWig_ and _bedSort_
3. Save this program to computer
4. In terminal, navigate to the directory with the program
5. Type `chmod u+x bedGraphToBigWig bedSort`
6. Move the program to the same directory as _file_to_bigwig_pe.py_  
**or**   
add to path in _.bashrc_ or _.bash_profile_ (preferred)

**Option 2**: Create symbolic links

Versions of _bedGraphToBigWig_ and _bedSort_ are included in the _bin_ directory.

Based on the operating system, create symbolic links in the _bin_ directory

- MacOSX 64-bit: `ln -s bedGraphToBigWig_macOSX.x86_63 bedGraphToBigWig; ln -s bedSort_macOSX.x86_64 bedSort`
- Linux 64-bit: `ln -s bedGraphToBigWig_linux.x86_64 bedGraphToBigWig; ln -s bedSort_linux.x86_64 bedSort`
- Older Linux: `ln -s bedGraphToBigWig_linux.x86_64.v287 bedGraphToBigWig; ln -s bedSort_linux.x86_64.v287 bedSort`

For best results, add this directory to `PATH` in _.bashrc_ or _.bash_profile_.

#### Getting bedtools
Follow the installation instructions at [bedtools](http://bedtools.readthedocs.io/en/latest/content/installation.html).

For best results, add the installation directory for _bedtools_ to `PATH` in _.bashrc_ or _.bash_profile_.

#### Getting samtools
Follow the installation instructions at [samtools](http://www.htslib.org/download/).

For best results, add the installation directory for _samtools_ to `PATH` in _.bashrc_ or _.bash_profile_.


### Conversion script
- Requires python3
- Conversion script works for BAM files and BED files.
- If the BAM index file is not already indexed by samtools (i.e. .bai file doesn't exist), add the `-index` option.
- Output values can be scaled by
  1. Total library size (million mapped reads) using `-scale` option  
  or
  2. Mapped reads to a control chromosome. For control chromosome named `cntrl`, use `-scale=cntrl`
- Ouput can be strand specific. This creates two BigWig files, one with reads from the + strand (_file.bw.plus_) and one with reads from the - strand (_file.bw.minus_). Scaling factor is a strand-independent.
- If big wig conversion fails due to a sorting issue, include the `-sort` option (or always use the option to be safe--it's slower though)
- Script can be run on multiple files at once with multiple processors (each file is processed by one processor)

```
Usage:  python3 file_to_bigwig_pe.py [-q] [-h] [-keep] [-scale | -scale=chrm]
        [-strand] [-sort] [-p=num_proc] <chrm_file> <bam_file |
        bed_file> [bam_file | bed_file]*
        
Convert BED/BAM file to bigWig format for coverage view
Note: bedtools, bedGraphToBigWig, samtools, and bedSort programs must be in the path

Required:
chrm_file    tab-delimited file with chromosome names and lengths
             i.e. fasta index file
bam_file     bam file that already has been indexed, i.e. file.bam.bai
bed_file     BED formatted file

Optional:
-h           print this help message and exit
-q           quiet; do not print progress
-keep        keep intermediate files
-scale       scale the values by library size (million mapped reads)
-scale=chrm  scale the values by number of reads in control chrm specified
-strand      output reads from plus and minus strand to separate files
-sort        sort bedgraph; use when bigwig conversion fails
-index       create BAM index if it does not already exist
-p=num_proc  number of processors to use [default 1]
```

## Future Plans
- Handle "no fill" configuration option
