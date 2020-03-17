/**
 * Created by lerocchi on 17/05/17.
 */

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import {getCenter} from 'ol/extent.js';
import ImageLayer from 'ol/layer/Image.js';
import Projection from 'ol/proj/Projection.js';
import Static from 'ol/source/ImageStatic.js';


//Global variables
var draw;
var map;
var source4Interaction;
var extractedImage;  //keeps extracted image
var interaction;  //keeps activated interaction
var polygonText; //keeps WKT Polygon created by user
var polygonTextBase;
var basePoly;    //keeps the default polygon
var imgtype;     //keeps image type
var year;
var month;
var day;
var doy;
var baseurl;     //keeps base url
var boxExtent;   //box extent used for re-create extent for loaded images
var actualMode;
var identifyMode; //manage identify mode
var imgLoaded;
var time2wait;
var totaltime2wait;
var areaofPolygon;
var poygonIsDrawed;
var freeMode;
var defaultMode;
var identifyMode;


//  coefficient for filter applying
var kernels = {
    none: [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0
    ],
    sharpen: [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ],
    sharpenless: [
        0, -1, 0,
        -1, 10, -1,
        0, -1, 0
    ],
    blur: [
        1, 1, 1,
        1, 1, 1,
        1, 1, 1
    ],
    shadow: [
        1, 2, 1,
        0, 1, 0,
        -1, -2, -1
    ],
    emboss: [
        -2, 1, 0,
        -1, 1, 1,
        0, 1, 2
    ],
    edge: [
        0, 1, 0,
        1, -4, 1,
        0, 1, 0
    ]
};



function getPixelCoords(event) {

    var selectedcoord = map.getCoordinateFromPixel(event.pixel);

    var coord_x = selectedcoord[0].toFixed(3);
    var coord_y = selectedcoord[1].toFixed(3);

    getDataFromPoint(baseurl + '/api/fusioncharts/line_w_thrend/' + imgtype +  '/'+imgtype+' - ('+coord_x+' '+coord_y+')'+'/y/x/polygon/POINT(' + coord_x + ' '+ coord_y + ')/srid_from/4326', updateChart);

}

/**
 * Functions for progress bar
 */
function start() {



    if (areaofPolygon < 10.0 ){
        time2wait = 50;
        totaltime2wait = 500;
    }else if(areaofPolygon < 60.0){
        time2wait = 100;
        totaltime2wait = 1000;
    }else if(areaofPolygon < 100.0){
        time2wait = 300;
        totaltime2wait = 3000;
    }else if(areaofPolygon < 152.0){
        time2wait = 400;
        totaltime2wait = 4000;
    }else if(areaofPolygon < 150.0){
        time2wait = 500;
        totaltime2wait = 5000;
    }else if(areaofPolygon < 300.0){
        time2wait = 600;
        totaltime2wait = 6000;
    }else if(areaofPolygon < 500.0){
        time2wait = 700;
        totaltime2wait = 7000;
    }else{
        time2wait = 1000;
        totaltime2wait = 10000;
    }

    console.log('area: '+areaofPolygon);
    console.log('time2wait: '+time2wait);
    console.log('totaltime: '+totaltime2wait);


    window['progress'] = setInterval(function() {
        var pbClient = PF('pbClient'),
            oldValue = pbClient.getValue(),
            newValue = oldValue + 10;

        pbClient.setValue(pbClient.getValue() + 10);

        if(newValue === time2wait) {
            clearInterval(window['progress']);
        }


    }, totaltime2wait);
}

function cancel() {
    clearInterval(window['progress']);
    PF('pbClient').setValue(0);

}



/////

/**
 * Methods for GUI management
 */
function activateModalWidget(){
    PF('statusDialog').show();
    start();
}

function hideModalWidget(){
    PF('statusDialog').hide();
    cancel();
}
/**
 * Methods for interaction management
 */

//Activate pan
function activatePan(){

    //remove previous interaction
    map.removeInteraction(interaction);
    interaction = new ol.interaction.DragPan();
    map.addInteraction(interaction);

}


//Set parameters for client side GIS functions
//This method is called by java bean
function changeParamsJS(imgt,yeart,montht,dayt,doyt){

    imgtype = imgt;
    year = yeart;
    month = montht;
    day = dayt;
    doy = doyt;


}

/**
 * The measure tooltip element.
 * @type {Element}
 */
var measureTooltipElement;




/**
 * Format area output.
 * @param {module:ol/geom/Polygon~Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
function calcArea(polygon) {
    var area = ol.sphere.getArea(polygon);
    var output;
    if (area > 10000) {
        output = (Math.round(area / 1000000 * 100) / 100);
    } else {
        output = (Math.round(area * 100) / 100);
    }
    return output;
};

/**
 * Creates a new measure tooltip

function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';
    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
}
*/

/***
 * async http request management for get data chart
 *
 * @param url
 * @param callback
 */
function getDataFromPoint(url, callback){
    var xhr  = new XMLHttpRequest();

    xhr.callback = callback;
    xhr.arguments = Array.prototype.slice.call(arguments,  2);
    xhr.onload = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback.apply(xhr, this.arguments);
            } else {
                console.error(xhr.statusText);
            }
        }
    };


    xhr.open("GET", url, true);
    xhr.setRequestHeader("Content-type", "text/plain");
    xhr.send(null);
}


/***
 * async http request management
 *
 * @param url
 * @param callback
 */
function updateFreeImagePolygon(url, callback){
    var xhr  = new XMLHttpRequest();

    xhr.callback = callback;
    xhr.arguments = Array.prototype.slice.call(arguments,  2);
    xhr.onload = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                callback.apply(xhr, this.arguments);
            } else {
                console.error(xhr.statusText);
            }
        }
    };


    xhr.open("GET", url, true);
    xhr.setRequestHeader("Content-type", "text/plain");
    xhr.send(null);
}

//Callback for loading new image
function updateExtent(){
    var resp= this.responseText;
    var format = new ol.format.WKT();
    // var feature = format.readFeature(resp, {
    //     dataProjection: 'EPSG:4326',
    //     featureProjection: 'EPSG:3857'
    // });
    var feature = format.readFeature(resp);
    //, {

    var geom = feature.getGeometry();


    //calculate area of polygon
    areaofPolygon = calcArea(geom);



    boxExtent = geom.getExtent();

    map.removeLayer(extractedImage);

    var sourceImg = new ol.source.ImageStatic({
        attributions: [],
        url: '' + baseurl + '/api/download/j_get_whole_png/' + imgtype + '/' + year + '/' + doy + '/polygon/' + polygonText + '/srid_from/4326',
        //       projection: projection,
        imageExtent: boxExtent
    });

    extractedImage = new ol.layer.Image({
        source: sourceImg,
        opacity: 0.6
    });



    var lyrSource = extractedImage.getSource();

    lyrSource.on('precompose', function(evt) {
        evt.context.imageSmoothingEnabled = false;
        evt.context.webkitImageSmoothingEnabled = false;
        evt.context.mozImageSmoothingEnabled = false;
        evt.context.msImageSmoothingEnabled = false;

    });
    lyrSource.on('postcompose', function(evt) {
        evt.context.imageSmoothingEnabled = true;
        evt.context.webkitImageSmoothingEnabled = true;
        evt.context.mozImageSmoothingEnabled = true;
        evt.context.msImageSmoothingEnabled = true;
    });

    lyrSource.on('imageloadstart', function(event) {
        console.log('imageloadstart event fired');
        activateModalWidget();
    });

    lyrSource.on('imageloadend', function(event) {
        console.log('imageloadend event fired');
        hideModalWidget();

    });
    lyrSource.on('imageloaderror', function(event) {
        console.log('imageloaderror event fired');
        hideModalWidget();
    });

    //extractedImage.set('image-rendering','-moz-crisp-edges');
    map.addLayer(extractedImage);

    imgLoaded = true;

}

//update boxExtent and polygon
function changePolygon(){
    polygonText = encodeURIComponent(polygonTextBase.trim());
    map.removeInteraction(interaction);

    source4Interaction.clear();

    var format = new ol.format.WKT();
    var feature = format.readFeature(polygonTextBase);
    //, {
    //      dataProjection: 'EPSG:3857',
    //      featureProjection: 'EPSG:3857'
    //});

    source4Interaction.addFeature(feature)

    var geom = feature.getGeometry();

    //calculate area of polygon
    areaofPolygon = calcArea(geom);

    boxExtent = geom.getExtent();


    if(imgLoaded){
        map.removeLayer(extractedImage);
        //create new imageStatic
        var sourceImg = new ol.source.ImageStatic({
            attributions: [],
            url: '' + baseurl + '/api/download/j_get_whole_png/' + imgtype + '/' + year + '/' + doy + '/polygon/' + polygonText + '/srid_from/4326',
            //       projection: projection,
            imageExtent: boxExtent
        });

        extractedImage = new ol.layer.Image({
            source: sourceImg,
            opacity: 0.6
        });



        var lyrSource = extractedImage.getSource();

        lyrSource.on('precompose', function(evt) {
            evt.context.imageSmoothingEnabled = false;
            evt.context.webkitImageSmoothingEnabled = false;
            evt.context.mozImageSmoothingEnabled = false;
            evt.context.msImageSmoothingEnabled = false;

        });
        lyrSource.on('postcompose', function(evt) {
            evt.context.imageSmoothingEnabled = true;
            evt.context.webkitImageSmoothingEnabled = true;
            evt.context.mozImageSmoothingEnabled = true;
            evt.context.msImageSmoothingEnabled = true;
        });

        lyrSource.on('imageloadstart', function(event) {
            console.log('imageloadstart event fired');
            activateModalWidget();
        });

        lyrSource.on('imageloadend', function(event) {
            console.log('imageloadend event fired');
            hideModalWidget();

        });
        lyrSource.on('imageloaderror', function(event) {
            console.log('imageloaderror event fired');
            hideModalWidget();
        });

        map.addLayer(extractedImage);

    }else{
        imgLoaded = true;
    }

    //TODO: togliere
    //  var pTxt = document.getElementById('polyTxtHidden');
    //  pTxt.value.innerHTML = polygonText;

    //   PF('polyTxtHidden2').setValue = polygonText;
}

//function to inizialize general consts
function initJS(baseurlt, polygonTextt){  //}), basePolyt){


    polygonTextBase = polygonTextt;
    baseurl = baseurlt;

    polygonText = encodeURIComponent(polygonTextBase.trim());

    init();

    changePolygon();

    //TODO: togliere
    //  var pTxt = document.getElementById('polyTxtHidden');
    //  pTxt.value.innerHTML = polygonText;

    //   PF('polyTxtHidden2').setValue = polygonText;

}

function changeDefault(){

    if(identifyMode){
        map.un('click',getPixelCoords);
    }
    defaultMode = true;
    identifyMode = false;
    freeMode = false;
    changePolygon();
}

function changeFree(){

    if(identifyMode){
        map.un('click',getPixelCoords);
    }
    defaultMode = false;
    identifyMode = false;
    freeMode = true;
    activatePolygon();
}

function changeIdentify(){
    map.removeInteraction(interaction);

    map.on('click',getPixelCoords);

    defaultMode = false;
    identifyMode = true;
    freeMode = false;


}

/*
function changeMode(){
    if(actualMode){
        actualMode=false;
        if(identifyMode){
        	map.on('click',getPixelCoords);
        }
        changePolygon();
    }else{
        actualMode=true;
        if(identifyMode){
        	map.un('click',getPixelCoords);
        }

        activatePolygon();
    }
}
*/


//remove raster layer from the map
function deleteRaster(){
    map.removeLayer(extractedImage);
}

//change loaded image with another one by selecting new reference date or type

function changeImageJS(){

    if(imgLoaded){
        map.removeLayer(extractedImage);


        var sourceImg = new ol.source.ImageStatic({
            attributions: [],
            url: '' + baseurl + '/api/download/j_get_whole_png/' + imgtype + '/' + year + '/' + doy + '/polygon/' + polygonText + '/srid_from/4326',
            //       projection: projection,
            imageExtent: boxExtent
        });

        extractedImage = new ol.layer.Image({
            source: sourceImg,
            opacity: 0.6
        });



        var lyrSource = extractedImage.getSource();

        lyrSource.on('precompose', function(evt) {
            evt.context.imageSmoothingEnabled = false;
            evt.context.webkitImageSmoothingEnabled = false;
            evt.context.mozImageSmoothingEnabled = false;
            evt.context.msImageSmoothingEnabled = false;

        });
        lyrSource.on('postcompose', function(evt) {
            evt.context.imageSmoothingEnabled = true;
            evt.context.webkitImageSmoothingEnabled = true;
            evt.context.mozImageSmoothingEnabled = true;
            evt.context.msImageSmoothingEnabled = true;
        });

        lyrSource.on('imageloadstart', function(event) {
            console.log('imageloadstart event fired');
            activateModalWidget();
        });

        lyrSource.on('imageloadend', function(event) {
            console.log('imageloadend event fired');
            hideModalWidget();

        });
        lyrSource.on('imageloaderror', function(event) {
            console.log('imageloaderror event fired');
            hideModalWidget();
        });

        //  extractedImage.set('image-rendering','-moz-crisp-edges');

        map.addLayer(extractedImage);
    }

}



function change_image(url_image, extin){
    // console.log(url_image);
    map.removeLayer(extractedImage);
    //var extent = evt.feature.getGeometry().getExtent();
    var extent = extin; //evt.feature.getGeometry().getExtent();
    var projection = new ol.proj.Projection({
        code: 'xkcd-image',
        units: 'pixels',
        extent: extent
    });
    extractedImage = new ol.layer.Image({
        source: new ol.source.ImageStatic({
            attributions: [],
            url: url_image,
            projection: projection,
            imageExtent: extent
        }),
        opacity: 0.6
    });
    extractedImage.on('precompose', function(evt) {
        evt.context.imageSmoothingEnabled = false;
        evt.context.webkitImageSmoothingEnabled = false;
        evt.context.mozImageSmoothingEnabled = false;
        evt.context.msImageSmoothingEnabled = false;

    });
    extractedImage.on('postcompose', function(evt) {
        evt.context.imageSmoothingEnabled = true;
        evt.context.webkitImageSmoothingEnabled = true;
        evt.context.mozImageSmoothingEnabled = true;
        evt.context.msImageSmoothingEnabled = true;
    });
    //  extractedImage.set('image-rendering','-moz-crisp-edges');
    map.addLayer(extractedImage);
};


//activate draw polygon function
function activatePolygon(){

    //remove previous interaction
    map.removeInteraction(interaction);
    interaction = new ol.interaction.Draw({
        type: /** @type {ol.geom.GeometryType} */ ('Polygon')


    });
   // createMeasureTooltip();

    //clean previous vector and raster when dragbox started
    interaction.on('drawstart',function(evt){
        //Clean previous vector feature and extracted image

        source4Interaction.clear();
        map.removeLayer(extractedImage);



    });


    interaction.on('drawend',function(evt){



        var feat = evt.feature;
        var geom = feat.getGeometry();
        var coords = " " +  geom.getCoordinates()[0];


        var coordsArr = coords.replace("["," ");
        coordsArr = coordsArr.replace("]"," ");
        coordsArr = coordsArr.split(",");

        var featIn = new ol.Feature({
            geometry: geom
        });



        //calculate area of polygon
        areaofPolygon = calcArea(geom);


        source4Interaction.addFeature(featIn);   //Add new feature to vector source

        //build WKT Polygon
        polygonText = "POLYGON((";

        for (var i =  0; i < coordsArr.length; i=i+2){


            polygonText = polygonText + coordsArr[i] + " " + coordsArr[i+1] + ",";
        }


        polygonText = polygonText + coordsArr[0] + " " + coordsArr[1] + "))";

        boxExtent = geom.getExtent();
        polygonText = encodeURIComponent(polygonText.trim());
        updateFreeImagePolygon(baseurl + '/api/download/j_get_extent/' + imgtype + '/' + year + '/' + doy + '/polygon/' + polygonText + '/srid_from/4326', updateExtent);

    });

    map.addInteraction(interaction);


    //TODO: Togliere
    //var pTxt = document.getElementById('polyTxtHidden');
    //pTxt.value.innerHTML = polygonText;


    //PF('polyTxtHidden2').setValue = polygonText;

}




/**
 * Initialization of Map object
 *
 new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'https://ahocevar.com/geoserver/wms',
                    params: {
                        'LAYERS': 'ne:NE1_HR_LC_SR_W_DR',
                        'TILED': true
                    }
                })
            }),
 */
function init(){
    //document.removeEventListener('DOMContentLoaded', init);

    actualMode = false;
    imgLoaded = false;
    //Define sources for boxes and images
    source4Interaction = new ol.source.Vector();


    map = new Map({
        target: 'map',
        layers: [



            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            new ol.layer.Vector({
                source: source4Interaction   //manage designed boxes
            })



        ],

        controls: ol.control.defaults().extend([
            new ol.control.FullScreen(),
            new ol.control.ScaleLine({
                units: 'degrees'
            })

        ]),
        view: new ol.View({
            projection: 'EPSG:4326',
            center: [12.00, 42.75],

            zoom: 5
        }),


    });
    map.addControl(new ol.control.ZoomSlider());
    map.addControl(new ol.control.MousePosition({
        coordinateFormat: function (coordinates) {
            var coord_x = coordinates[0].toFixed(3);
            var coord_y = coordinates[1].toFixed(3);
            return coord_x + ', ' + coord_y;
        },
        target: 'coordinates'
    }));
    map.on('precompose', function(evt) {
        evt.context.imageSmoothingEnabled = false;
        evt.context.webkitImageSmoothingEnabled = false;
        evt.context.mozImageSmoothingEnabled = false;
        evt.context.msImageSmoothingEnabled = false;

    });
    map.on('postcompose', function(evt) {
        evt.context.imageSmoothingEnabled = true;
        evt.context.webkitImageSmoothingEnabled = true;
        evt.context.mozImageSmoothingEnabled = true;
        evt.context.msImageSmoothingEnabled = true;
    });


}


/**
 * function for downloading selected image
 */
function downloadImg(){

    if(imgLoaded){
        window.open(baseurl + '/api/download/j_get_whole_png/' +
            imgtype + '/' + year + '/' + doy + '/polygon/' +
            polygonText + '/srid_from/4326/filename/imgtype_'+year+'_'+doy+'', "_blank");
    }else{
        Alert('Select an image!');
    }


}

/**
 * function for viewing overall statistical data of active dataset
 */
function openSeries(){

    PF('dlg2').show();

}
function launchStatSeries(){

    document.getElementById('formId:polyTxt2Pass').value = polygonText;


    //alert("ecco "+document.getElementById('formId:polyTxt2Pass').value );
    //jQuery('#rc').click();
    //alert("eeee");

}

//Callback for loading chart
function updateChart(){
    var resp= this.responseText;

    initChart(resp)
    alert(resp);

    PF('graphDlg').show();

}

