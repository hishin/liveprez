/**
 * Created by hijun on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W = 960;
var SLIDE_H = 700;
var CANVAS_W = 600;
var CANVAS_H = 438;
var numslides;
var curslidenum = 0;
var curslide;
var toolbox;
var inkstyle;
var SLIDE_URL = "slidedeck.html";
var DEFAULT_COLOR = '#000000';
var slidedeck;


function InkStyle(style){
    this.style = style;
    this.elem = function() {
        var li = document.createElement("li");
        var stroke_des = '';
        stroke_des += (this.style.strokeWidth +' ');
        if (this.style.fillColor) {
            stroke_des += this.style.fillColor;
        } else if (this.style.strokeColor) {
            stroke_des += (' ' + this.style.strokeColor);
        } else {
            stroke_des += (' ' + undefined);
        }
        li.appendChild(document.createTextNode(stroke_des));
        li.addEventListener('click', this, false);
        return li;
    }


};

InkStyle.prototype.handleEvent = function(e) {
    switch(e.type) {
        case "click": this.click(e);
    }
};

InkStyle.prototype.click = function(e) {
    inkstyle = this.style;
    activateInkTool();
};

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
    curslide = slidedeck.slides[slidenum];
    // load each item onto a separate layer
    for (var i = 0; i < curslide.nitems; i++) {
        var item = curslide.items[i];
        loadItem(item);
    }
};

function loadItem(item){
    if (item.type == 'image' && item.content) {
        console.log(item);
        var layer = new spaper.Layer();
        var wscale = parseFloat(CANVAS_W) / SLIDE_W;
        var hscale = parseFloat(CANVAS_H) / SLIDE_H;
        layer.importSVG(item.content.dataset.src, {
            expandShapes: true,
            applyMatrix: true,
            onLoad: function(svgitem, data) {
                svgitem.pivot = new paper.Point(svgitem.bounds.topLeft);
                svgitem.scale(wscale*item.width/svgitem.bounds.width, hscale*item.height/svgitem.bounds.height);
                svgitem.position = new paper.Point(item.left*wscale, item.top*hscale);
                item.pitem = svgitem;
                svgitem.item = item;

                item.pborder = new paper.Path.Rectangle(svgitem.bounds);
                item.pborder.item = item;
                item.pborder.strokeColor = 'black';
                item.pborder.strokeWidth = 3;
                item.pborder.dashArray = [3,2];
                item.pborder.opacity = 0.5;

                item.pbbox = new paper.Shape.Rectangle(svgitem.bounds);
                item.pbbox.item = item;
                item.pbbox.fillColor = 'red';
                item.pbbox.opacity = 0;

                item.inkstyles = getInkStyle(item.pitem);
                item.activateMouseEvents();

            }
        });
    }
};

function getInkStyle(pitem, styles) {
    if (!styles)
        styles = new Array();
    if (pitem.children) {
        for (var i = 0; i < pitem.children.length; i++) {
            styles = getInkStyle(pitem.children[i], styles);
        }
    }
    else {
        // Add only if same style does not exist
        var inkstyle = new InkStyle(pitem.style);
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



function openTools(item) {
    console.log(item.pitem);
    item.pborder.strokeWidth = 3;
    item.pborder.opacity = 1.0;

    var tools = toolbox.getElementsByTagName("UL")[0];
    tools.innerHTML = "";
    for (var i = 0; i < item.inkstyles.length; i++) {
        var inkstyle = item.inkstyles[i];
        var li = inkstyle.listElement();
        tools.appendChild(li);
    }

    var li = document.createElement("li");
    li.setAttribute('id', 'close-item');
    li.appendChild(document.createTextNode('Done'));
    li.addEventListener('click', function() {closeTools(item);});
    tools.appendChild(li);
};

function closeTools(item) {
    console.log(item);
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

function activateInkTool() {
    console.log("activate ink tool");
    spaper.inktool.activate();
};

var curstroke;
var curtargetrect;
var curtargetitems = [];
function inkStart(event){
    curstroke = new paper.Path();
    curstroke.strokeWidth = inkstyle.strokeWidth;
    if (inkstyle.fillColor) curstroke.strokeColor = inkstyle.fillColor;
    else if (inkstyle.strokeColor) curstroke.strokeColor = inkstyle.strokeColor;
    else curstroke.strokeColor = new paper.Color(0,0,0,1);
    curstroke.strokeColor.alpha = 1.0;
    console.log(curstorke);
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
        // curtargetitems.push(curstroke);
        // var fititem = fitItemsToRect(curtargetitems, curtargetrect); //cloned and fit items
        // var msg = drawMessage(fititem);
        // fititem.remove();
        // post(msg);
    }
};



