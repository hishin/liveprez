/**
 * Created by hijun on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var aslide;
var acanvas;
var apaper;
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

window.onload = function () {
    var parser = new DOMParser();
    $.get(SLIDE_URL, function( data ) {
        var html = parser.parseFromString(data, 'text/html');
        slidedeck = new SlideDeck(html.getElementsByClassName('slides')[0]);
        setupSlideCanvas(slidedeck);
        setupTools();
        numslides = slidedeck.n;
    });
    toolbox = document.getElementById("item-toolbox");
};

function setupSlideCanvas(slidedeck) {
    sslide = document.getElementById('speaker-slide');
    aslide = document.getElementById('audience-slide');
    scanvas = document.createElement('canvas');
    acanvas = document.createElement('canvas');
    scanvas.setAttribute('id', sslide.id.replace('slide', 'canvas'));
    acanvas.setAttribute('id', aslide.id.replace('slide', 'canvas'));
    sslide.appendChild(scanvas);
    aslide.appendChild(acanvas);

    spaper = new paper.PaperScope();
    spaper.setup(scanvas);
    apaper = new paper.PaperScope();
    apaper.setup(acanvas);

    spaper.view.viewSize.width = CANVAS_W;
    spaper.view.viewSize.height = CANVAS_H;
    apaper.view.viewSize.width = CANVAS_W;
    apaper.view.viewSize.height = CANVAS_H;
    scanvas.width = CANVAS_W;
    acanvas.width = CANVAS_W;
    scanvas.height = CANVAS_H;
    acanvas.height = CANVAS_H;
    sslide.paper = spaper;
    aslide.paper = apaper;
    sslide.canvas = scanvas;
    aslide.canvas = acanvas;
    scanvas.paper = spaper;
    acanvas.paper = apaper;
    scanvas.slide = sslide;
    acanvas.slide = aslide;
    spaper.slide = sslide;
    apaper.slide = aslide;
    spaper.canvas = scanvas;
    apaper.canvas = acanvas;

    loadSlide(slidedeck, curslidenum);
};

function setupTools() {
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

function loadSlide(slidedeck, slidenum) {
    spaper.project.clear();
    spaper.view.viewSize.width = CANVAS_W;
    spaper.view.viewSize.height = CANVAS_H;
    scanvas.width = CANVAS_W;
    scanvas.height = CANVAS_H;

    apaper.project.clear();
    apaper.view.viewSize.width = CANVAS_W;
    apaper.view.viewSize.height = CANVAS_H;
    acanvas.width = CANVAS_W;
    acanvas.height = CANVAS_H;    // load each item onto a separate layer

    curslide = slidedeck.slides[slidenum];
    for (var i = 0; i < curslide.nitems; i++) {
        var item = curslide.items[i];
        loadItem(item);
    }
};

function loadItem(item, speaker){
    if (item.type == 'image' && item.content) {
        var layer = new spaper.Layer();
        var wscale = parseFloat(CANVAS_W) / SLIDE_W;
        var hscale = parseFloat(CANVAS_H) / SLIDE_H;
        layer.importSVG(item.content.dataset.src, {
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
                item.pborder.dashArray = [3,2];
                item.pborder.opacity = 0.5;

                item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
                item.pbbox.pivot = item.pbbox.bounds.topLeft;
                item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
                item.pbbox.item = item;
                item.pbbox.fillColor = 'red';
                item.pbbox.opacity = 0;

                var delta = new paper.Point(item.left*wscale, item.top*hscale);
                item.pborder.translate(delta);
                item.pbbox.translate(delta);
                svgitem.scale(item.width/svgitem.bounds.width*wscale, item.height/svgitem.bounds.height*hscale);
                svgitem.translate(delta);
                item.inkstyles = getInkStyle(item.pitem);
                item.activateMouseEvents();

                showSpeakerOnlyItems(item.pitem);
            }
        });
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
    loadSlide(slidedeck, curslidenum);
};

function nextSlide() {
    if (curslidenum < numslides -1)
        curslidenum ++;
    loadSlide(slidedeck, curslidenum);
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
};

function inkContinue(event) {
    if (curstroke) {
        curstroke.add(event.point);
        curstroke.smooth();
    }
};

function inkEnd(event) {
    if (curstroke) {
        curstroke.add(event.point);
        var closest = findClosestPath(curstroke, curitem.pitem);
        var newstroke = interpolate(curstroke, closest[1], 1.0);

        newstroke.style = closest[1].style;
        // var newstroke = closest[1];
        if (newstroke.fillColor) {
            newstroke.fillColor.alpha = 1.0;
        }
        if (newstroke.strokeColor) {
            newstroke.strokeColor.alpha = 1.0;
        }
        curstroke.remove();
        // closest[1].remove();
        // closest[1].selected = true;
        // var newpoints = resample(curstroke);
        // var newstroke = pathFromPoints(newpoints);
        // newstroke.style = curstroke.style;
        //
        // if (inkstyle.closed) {
        //     for (var i = 0; i < 200; i++) {
        //         newstroke = chaikinSmooth(newstroke);
        //     }
        //     newstroke.closePath();
        //
        // } else {
        //     newstroke = makeLine(newstroke);
        // }
        //
        // curstroke.remove();
    }
};



