/**
 * Created by hijun on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W = 960;
var SLIDE_H = 700;
var CANVAS_W = 600;
var CANVAS_H = 438.5;
var numslides;
var curslidenum = 0;
var curslide;
var toolbox;
var inkstyle = null;
var SLIDE_URL = "slidedeck.html";
var DEFAULT_COLOR = '#000000';
var slidedeck;
var curitem = null;
var awindow;

window.onload = function () {
    var parser = new DOMParser();
    $.get(SLIDE_URL, function( data ) {
        var html = parser.parseFromString(data, 'text/html');
        slidedeck = new SlideDeck(html.getElementsByClassName('slides')[0]);
        setupSlideCanvas(slidedeck);
        setupPaperTools();
        numslides = slidedeck.n;
    });
    toolbox = document.getElementById("item-toolbox");
    popupAudienceView();
};

function popupAudienceView() {
    awindow = window.open('smartaudience.html', 'Audience View');
    /**
     * Connect to the audience view window through a postmessage handshake.
     * Using postmessage enables us to work in situations where the
     * origins differ, such as a presentation being opened from the
     * file system.
     */
    function connect() {
        // Keep trying to connect until we get a 'connected' message back
        var connectInterval = setInterval( function() {
            awindow.postMessage( JSON.stringify( {
                namespace: 'liveprez',
                type: 'connect',
                url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
                state: getSlideState()
            } ), '*' );
        }, 500 );

        window.addEventListener( 'message', function( event ) {
            var data = JSON.parse( event.data );
            if( data && data.namespace === 'audience' && data.type === 'connected' ) {
                clearInterval( connectInterval );
            }
        } );
    }

    connect();
};

function setupSlideCanvas(slidedeck) {
    sslide = document.getElementById('speaker-slide');
    scanvas = document.createElement('canvas');
    scanvas.setAttribute('id', sslide.id.replace('slide', 'canvas'));
    sslide.appendChild(scanvas);

    spaper = new paper.PaperScope();
    spaper.setup(scanvas);

    spaper.view.viewSize.width = CANVAS_W;
    spaper.view.viewSize.height = CANVAS_H;
    scanvas.width = CANVAS_W;
    scanvas.height = CANVAS_H;

    sslide.paper = spaper;
    sslide.canvas = scanvas;
    scanvas.paper = spaper;
    scanvas.slide = sslide;
    spaper.slide = sslide;
    spaper.canvas = scanvas;

    curslide = slidedeck.getSlide(curslidenum);
    loadSlide(curslide);
};

function setupPaperTools() {
    // Default tool
    var defaulttool = new spaper.Tool();
    spaper.defaulttool = defaulttool;

    // Ink tool
    var inktool = new spaper.Tool();
    inktool.onMouseDown = inkStart;
    inktool.onMouseDrag = inkContinue;
    inktool.onMouseUp = inkEnd;
    spaper.inktool = inktool;

};

function loadSlide(slide) {
    spaper.project.clear();
    spaper.view.viewSize.width = CANVAS_W;
    spaper.view.viewSize.height = CANVAS_H;
    scanvas.width = CANVAS_W;
    scanvas.height = CANVAS_H;

    for (var i = 0; i < slide.nitems; i++) {
        var item = slide.items[i];
        loadItem(item);
    }
    post(slideChangeMessage());
};

function loadItem(item){
    if (item.type == 'image' && item.src) {
        var layer = new paper.Layer();
        var wscale = parseFloat(CANVAS_W) / SLIDE_W;
        var hscale = parseFloat(CANVAS_H) / SLIDE_H;

        var ext = item.src.split('.').pop();
        if (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'bmp') {
            item.pitem = new paper.Raster(item.src);
            item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
            item.pborder.pivot = item.pborder.bounds.topLeft;
            item.pitem.pivot = item.pborder.bounds.topLeft;
            item.pborder.scale(wscale, hscale, item.pborder.pivot);
            item.pborder.item = item;
            item.pborder.strokeColor = 'black';
            item.pborder.strokeWidth = 3;
            item.pborder.dashArray = [3, 2];
            item.pborder.opacity = 0.5;

            item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
            item.pbbox.pivot = item.pbbox.bounds.topLeft;
            item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
            item.pbbox.item = item;
            item.pbbox.fillColor = 'red';
            item.pbbox.opacity = 0;

            var delta = new paper.Point(item.left * wscale, item.top * hscale);
            item.pborder.translate(delta);
            item.pbbox.translate(delta);
            item.pitem.scale(item.width / item.pitem.bounds.width * wscale, item.height / item.pitem.bounds.height * hscale);
            item.pitem.position = item.pbbox.bounds.center;
            item.pitem.opacity = 0.5;
            // item.inkstyles = getInkStyle(item.pitem);
            // item.activateMouseEvents();
            // showSpeakerOnlyItems(item.pitem);

        } else if (ext == 'svg') {
            layer.importSVG(item.src, {
                expandShapes: true,
                applyMatrix: true,
                onLoad: function(svgitem, data) {
                        item.pitem = svgitem;
                        svgitem.item = item;

                        item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
                        item.pborder.pivot = item.pborder.bounds.topLeft;
                        svgitem.pivot = item.pborder.bounds.topLeft;
                        item.pborder.scale(wscale, hscale, item.pborder.pivot);
                        item.pborder.item = item;
                        item.pborder.strokeColor = 'black';
                        item.pborder.strokeWidth = 3;
                        item.pborder.dashArray = [3, 2];
                        item.pborder.opacity = 0.5;

                        item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
                        item.pbbox.pivot = item.pbbox.bounds.topLeft;
                        item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
                        item.pbbox.item = item;
                        item.pbbox.fillColor = 'red';
                        item.pbbox.opacity = 0;

                        var delta = new paper.Point(item.left * wscale, item.top * hscale);
                        item.pborder.translate(delta);
                        item.pbbox.translate(delta);
                        svgitem.scale(item.width / svgitem.bounds.width * wscale, item.height / svgitem.bounds.height * hscale);
                        svgitem.translate(delta);
                        item.inkstyles = getInkStyle(item.pitem);
                        item.activateMouseEvents();
                        showSpeakerOnlyItems(item.pitem);
                }
            });
        }
    }
};

function showSpeakerOnlyItems(pitem) {
    if (!pitem.visible) {
        pitem.data.speakeronly = true;
        makeSemiTransparent(pitem);
    } else {
        pitem.data.speakeronly = false;
        if (pitem.children) {
            for (var i = 0; i < pitem.children.length; i++) {
                showSpeakerOnlyItems(pitem.children[i]);
            }
        }
    }
};

function makeSemiTransparent(pitem) {
    if (pitem.children) {
        for (var i = 0; i < pitem.children.length; i++) {
            pitem.children[i].visible = false;
            makeSemiTransparent(pitem.children[i]);
        }
    } else {
        if (pitem.fillColor)
            pitem.fillColor.alpha = 0.5;
        if (pitem.strokeColor)
            pitem.strokeColor.alpha = 0.5;
    }
    pitem.visible = true;
};

function getInkStyle(pitem, styles) {
    if (!styles)
        styles = new Array();
    if (pitem.children) {
        for (var i = 0; i < pitem.children.length; i++) {
            styles = getInkStyle(pitem.children[i], styles);
        }
    }
    else if (!pitem.clipMask ){
        // Add only if same style does not exist
        var inkstyle = new InkStyle(pitem);
        for (var i = 0; i < styles.length; i++) {
            if (styles[i].isEqualTo(inkstyle)) {
                return styles;
            }
        }
        styles.push(inkstyle);
    }
    return styles;
};

function deactivateItemMouseEvents() {
    for (var i = 0; i < curslide.nitems; i++) {
        var item = curslide.items[i];
        item.pbbox.onMouseEnter = null;
        item.pbbox.onMouseLeave = null;
        item.pbbox.onClick = null;
    }
};

function openItem(item) {
    curitem = item;
    item.pborder.strokeWidth = 3;
    item.pborder.opacity = 1.0;

    activateInkTool();
    // var tools = toolbox.getElementsByTagName("UL")[0];
    // tools.innerHTML = "";
    // for (var i = 0; i < item.inkstyles.length; i++) {
    //     var inkstyle = item.inkstyles[i];
    //     var li = inkstyle.listElement();
    //     tools.appendChild(li);
    // }
    //
    // var li = document.createElement("li");
    // li.setAttribute('id', 'close-item');
    // li.appendChild(document.createTextNode('Done'));
    // li.addEventListener('click', function() {closeTools(item);});
    // tools.appendChild(li);

};

function closeTools(item) {
    var tools = toolbox.getElementsByTagName("UL")[0];
    tools.innerHTML = "";
    for (var i = 0; i < curslide.nitems; i++) {
        curslide.items[i].activateMouseEvents();
    }
    item.close();
    spaper.defaulttool.activate();
};

/**
 * Show semi-opaque item only to speaker
 * @param item
 */
function hideItem(item) {
    if (item.className == 'Group') {
        for (var i = 0;i < item.children.length; i++) {
            hideItem(item.children[i]);
        }
    }
    else if (item.className == 'PointText') {
        item.fillColor.alpha = 0.3;
    } else {
        item.opacity = 0.3;
    }
    item.visible = true;
    item.data.isHidden = true;
};

function prevSlide() {
    if (curslidenum > 0)
        curslidenum--;
    curslide = slidedeck.getSlide(curslidenum);
    loadSlide(curslide);
};

function nextSlide() {
    if (curslidenum < numslides -1)
        curslidenum ++;
    curslide = slidedeck.getSlide(curslidenum);
    loadSlide(curslide);
};

function setInkStyle(event) {
    inkstyle = event.target.inkstyle;
    activateInkTool();
};

function activateInkTool() {
    spaper.inktool.activate();
};

var curstroke;
var curtargetrect;
var curtargetitems = [];
function inkStart(event){
    curstroke = new paper.Path();
    if (!inkstyle) {
        curstroke.strokeWidth = 1;
        curstroke.fillStroke = null;
        curstroke.strokeColor = 'black';
    } else {
        curstroke.strokeWidth = inkstyle.strokeWidth;
        curstroke.fillColor = inkstyle.fillColor;
        curstroke.strokeColor = inkstyle.strokeColor;
    }
    curstroke.add(event.point);
    post(inkMessage(curstroke, false));
};

function inkContinue(event) {
    if (curstroke) {
        curstroke.add(event.point);
        curstroke.smooth();
        post(inkMessage(curstroke, false));
    }
};

function inkEnd(event) {
    if (curstroke) {
        curstroke.add(event.point);
        var closest = findClosestPath(curstroke, curitem.pitem);
        var newstroke = interpolate(curstroke, closest[1], 1.0);
        newstroke.style = closest[1].style;
        if (newstroke.fillColor) {
            newstroke.fillColor.alpha = 1.0;
        }
        if (newstroke.strokeColor) {
            newstroke.strokeColor.alpha = 1.0;
        }
        curstroke.remove();
        closest[1].remove();
        post(inkMessage(newstroke, true));
    }
};

function slideChangeMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-change',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        state: getSlideState()
    } );
    return msg;

};

function getSlideState() {
    return JSON.stringify(curslide);
};

function inkMessage(inkstroke, end) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'ink',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(inkstroke),
        end: end
    } );
    return msg;
};

function post(msg) {
    if (awindow) {
        awindow.postMessage( msg, '*' );
    }
};
