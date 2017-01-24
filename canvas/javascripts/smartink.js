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
    var slide = slidedeck.slides[slidenum];
    // load each item onto a separate layer
    for (var i = 0; i < slide.nitems; i++) {
        var item = slide.items[i];
        loadItem(item);
    }
};

function loadItem(item){
    if (item.type == 'image' && item.content) {
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
                item.pborder.strokeWidth = 4;
                item.pborder.dashArray = [3,2];
                item.pborder.opacity = 0.5;

                item.pbbox = new paper.Shape.Rectangle(svgitem.bounds);
                item.pbbox.item = item;
                item.pbbox.fillColor = 'red';
                item.pbbox.opacity = 0.5;

                activateItemMouseEvents(item);
            }
        });
    }
};

function initSlide(svgslide) {
    var item;
    // Special case:: children[0] is always the slide background
    for (var i = 1; i < svgslide.children.length; i++) {
        item = svgslide.children[i];
        if (!item.border) {
            item.border = new paper.Path.Rectangle(item.bounds);
            item.border.item = item;
            item.border.strokeColor = 'black';
            item.border.strokeWidth = 3;
            item.border.dashArray = [3,2];
            item.border.opacity = 0.5;
        }
         if (!item.bbox) {
             item.bbox = new paper.Shape.Rectangle(item.bounds);
             item.bbox.item = item;
             item.bbox.fillColor = '#000000';
             item.bbox.opacity = 0;
        }
        activateItemMouseEvents(item);
        initItemStyles(item);
        if (!item.visible) {
            hideItem(item);
        } else {
            item.data.isHidden = false;
        }
    }
};

function initItemStyles(item) {
    item.styles = [];
    addItemStyle(item.styles, item);
};

function addItemStyle(styles, item) {
    if (item.className != 'Group' && item.style)
        styles.push(item.style);
    if (item.children) {
        for (var i = 0; i < item.children.length; i++) {
            addItemStyle(styles, item.children[i]);
        }
    }
};

function activateItemMouseEvents(item) {
    item.pbbox.onMouseEnter = function(event) {
        this.item.pborder.dashArray = [];
    };
    item.pbbox.onMouseLeave = function(event) {
        this.item.pborder.dashArray = [3,2];
    };
    item.pbbox.onClick = function(event) {
        openItem(this.item);
    };
};

function deactivateItemMouseEvents(item) {
    item.bbox.onMouseEnter = null;
    item.bbox.onMouseLeave = null;
    item.bbox.onClick = null;
};

function openItem(item) {
    for (var i = 1; i < curslide.children.length; i++) {
        deactivateItemMouseEvents(curslide.children[i]);
    }
    item.border.strokeWidth = 3;
    item.border.opacity = 1.0;

    var tools = toolbox.getElementsByTagName("UL")[0];
    tools.innerHTML = "";
    for (var i = 0; i < item.styles.length; i++) {
        var inkstyle = new InkStyle(item.styles[i]._values);
        var li = inkstyle.elem();
        tools.appendChild(li);
    }
    var li = document.createElement("li");
    li.setAttribute('id', 'close-item');
    li.appendChild(document.createTextNode('Done'));
    li.addEventListener('click', function() {closeItem(item);});
    tools.appendChild(li);
};

function closeItem(item) {
    var tools = toolbox.getElementsByTagName("UL")[0];
    tools.innerHTML = "";

    for (var i = 1; i < curslide.children.length; i++) {
        activateItemMouseEvents(curslide.children[i]);
    }
    item.border.strokeWidth = 2;
    item.border.dashArray = [3,2];
    item.border.opacity = 0.5;
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
    if ( document.getElementById('slide-deck').selectedIndex > 0) {
        document.getElementById("slide-deck").selectedIndex--;
        loadSlide();
    }
};

function nextSlide() {
    if (document.getElementById('slide-deck').selectedIndex < numslides - 1) {
        document.getElementById("slide-deck").selectedIndex++;
        loadSlide();
    }
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



