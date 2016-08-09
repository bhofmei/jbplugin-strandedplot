require({cache:{
'JBrowse/Plugin':function(){
define("JBrowse/Plugin", [
           'dojo/_base/declare',
           'JBrowse/Component'
       ],
       function( declare, Component ) {
return declare( Component,
{
    constructor: function( args ) {
        this.name = args.name;
        this.cssLoaded = args.cssLoaded;
        this._finalizeConfig( args.config );
    },

    _defaultConfig: function() {
        return {
            baseUrl: '/plugins/'+this.name
        };
    }
});
});
}}});
define('StrandedPlotPlugin/main',[ 
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/Deferred',
    //'dojo/store/Memory',
    //'dgrid/OnDemandGrid',
    //'dgrid/extensions/DijitRegistry',
    //'JBrowse/Util',
    'JBrowse/Plugin',
    //'./View/Track/Wiggle/StrandedXYPlot',
    './Store/SeqFeature/StrandedBigWig'
    ],
    function(
       declare,
        array,
        lang,
        Deferred,
        //MemoryStore,
        //DGrid,
        //DGridDijitRegistry,
        //Util,
        JBrowsePlugin,
        //StrandedXYPlot,
        StrandedBigWig
       ){
//var Grid = declare([DGrid,DGridDijitRegistry]);
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        var baseUrl, thisB, browser;
        // create the hide/show button after genome view initialization
        baseUrl = this._defaultConfig().baseUrl;
        thisB = this;
        browser = this.browser;
        
        /*browser.afterMilestone( 'loadConfig', function() {
            if (typeof browser.config.classInterceptList === 'undefined') {
                browser.config.classInterceptList = {};
            }
            
            // override WiggleBase
            require(["dojo/_base/lang", "JBrowse/View/DetailsMixin"], function(lang, DetailsMixin){
                lang.extend(DetailsMixin, {
                    renderDetailValueGrid: thisB.renderDetailValueGrid
                });
            });
        }); */
    }/*,
    
    renderDetailValueGrid: function( parent, title, f, iterator, attrs ) {
        var thisB = this;
        var rows = [];
        var item;
        var descriptions  = attrs.descriptions || {};
        var cellRenderers = attrs.renderCell || {};
        while(( item = iterator() ))
            rows.push( item );

        if( ! rows.length )
            return document.createElement('span');

        function defaultRenderCell( field, value, node, options ) {
            thisB.renderDetailValue( node, '', value, f, '' );
        }

        var columns = [];
        for( var field in rows[0] ) {
            (function(field) {
                if(field.charAt(0)!="_"){
                 var column = {
                     label: { id: 'Name'}[field] || Util.ucFirst( field ),
                     field: field,
                     renderCell: cellRenderers[field] || defaultRenderCell,
                     renderHeaderCell: function( contentNode ) {
                         if( descriptions[field] )
                             contentNode.title = descriptions[field];
                         contentNode.appendChild( document.createTextNode( column.label || column.field));
                     }
                 };
                 columns.push( column );
                }
             })(field);
        }
        // create the grid
        parent.style.overflow = 'hidden';
        parent.style.width = '90%';
        var grid = new Grid({
            columns: columns,
            store: new MemoryStore({ data: rows })
        }, parent );

        return parent;
    },*/
});
});