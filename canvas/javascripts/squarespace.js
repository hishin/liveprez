/**
 * Created by hijungshin on 9/20/16.
 */

var scene;
var scenegraph;
var mypaper;
var slide;
var maxy = 5000;
var maxx = 5000;

window.onload = function () {
    // setup paper canvas
    setupSlideCanvas();
};

function setupSlideCanvas() {
    slide = document.getElementById('slide');
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', slide.id.replace('slide', 'canvas'));
    slide.appendChild(canvas);

    mypaper = new paper.PaperScope();
    mypaper.setup(canvas);

    slide.paper = mypaper;
    slide.canvas = canvas;
    canvas.paper = mypaper;
    canvas.slide = slide;
    mypaper.slide = slide;
    mypaper.canvas = canvas;

    // Default tool
    var defaulttool = new mypaper.Tool();
    mypaper.defaulttool = defaulttool;

    // Vertical Space tool
    var verttool = new mypaper.Tool();
    verttool.onMouseDown = vertLineStart;
    verttool.onMouseDrag = vertLineContinue;
    verttool.onMouseUp = vertLineEnd;
    mypaper.verttool = verttool;

    // Horizontal Space tool
    var horitool = new mypaper.Tool();
    horitool.onMouseDown = horiLineStart;
    horitool.onMouseDrag = horiLineContinue;
    horitool.onMouseUp = horiLineEnd;
    mypaper.horitool = horitool;

    // Load Slide Image
   loadSlide();
};

function loadSlide() {
    mypaper.project.clear();
    var img_src = document.getElementById('slide-src').value;
    var img_type = img_src.split('.').pop();
    if (img_type  == 'svg') {
        mypaper.project.importSVG(img_src, {expandShapes:true,
            onLoad: function(svgitem, data) {
                var wscale = parseFloat( mypaper.canvas.offsetWidth)/svgitem.bounds.width;
                var hscale = parseFloat( mypaper.canvas.offsetHeight)/svgitem.bounds.height;
                svgitem.scale(wscale, hscale);
                var delta = new paper.Point(parseFloat(mypaper.canvas.offsetLeft) - svgitem.bounds.left,
                    parseFloat(mypaper.canvas.offsetTop) - svgitem.bounds.top);
                svgitem.translate(delta);
                scene = svgitem;
                console.log(svgitem);
        }});
    }
    else {
        var raster = new paper.Raster(img_src);
        // scale and fit into target
        var wscale = parseFloat(slide.offsetWidth)/raster.width;
        var hscale = parseFloat(slide.offsetHeight)/raster.height;
        raster.scale(wscale, hscale);
        var delta = new paper.Point(parseFloat(contentbox.style.left) - raster.bounds.left,
            parseFloat(contentbox.style.top) - raster.bounds.top);
        raster.translate(delta);
    }
};

function isBelow(target, query) {
    // should be below target
    if (query.offsetTop <= target.offsetTop + target.offsetHeight) {
        return false;
    }
    // width should overlap at least 30%
    var tright = target.offsetLeft + target.offsetWidth;
    var qright = query.offsetLeft + query.offsetWidth;
    var overlap = Math.min(tright, qright) - Math.max(target.offsetLeft, query.offsetLeft);
    if (overlap >= 0.3 * query.offsetWidth)
        return true;
    return false;
};

function SceneBox(item) {
    item.scenebox = this;
    this.item = item;
    this.parent = null;
    this.children = [];

    this.insertBox = function(otherItem) {
        var otherbox = new SceneBox(otherItem);
        for (var i = 0; i < this.children.length; i++) {
            var childbox = this.children[i];
            console.log("childbox: " + childbox);
            if (childbox.contains(otherbox)) {
                childbox.insertBox(otherbox);
                return;
            }
            console.log("otherbox:" + otherbox);
            if (otherbox.contains(childbox)) {
                otherbox.parent = childbox.parent;
                childbox.parent = otherbox;
                this.children[i] = otherbox;
                return;
            }
        }
        otherbox.parent = this;
        this.children.push(otherbox);
        if (otherItem.children) {
            for (var i = 0; i < otherItem.children.length; i++) {
                otherbox.insertBox(otherItem.children[i]);
            }
        }
    };

    this.contains = function(otherbox) {
        return (this.item.bounds.contains(otherbox.item.bounds));
    };
};

function makeVerticalSpace() {
    deactivateTargetListener();
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        slides[i].paper.verttool.activate();
    }
};

function makeHorizontalSpace() {
    deactivateTargetListener();
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        slides[i].paper.horitool.activate();
    }
};

function activateDefaultTool() {
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        slides[i].paper.defaulttool.activate();
    }
};

function activateExpandVertTool() {
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        slides[i].paper.expandverttool.activate();
    }
};


var curline;
var startp;
var curslide;
var currect;
var timeout;
var startexpand = false;

function vertLineStart(event) {
    // get the target slide
    var canvas = event.event.target;
    curslide = canvas.slide;
    var start = event.point;
    var end = new paper.Point(start.x+0.1, start.y);
    var linepath = new paper.Path.Line(start, end);
    linepath.strokeColor = '#3366ff';
    linepath.dashArray = [5, 3];
    linepath.strokeWidth = 2;
    curline = linepath;
    startp = event.point;
};

function vertLineContinue(event) {
    if (curline && !startexpand) {
        var end = new paper.Point(event.point.x, startp.y);
        var linepath = new paper.Path.Line(startp, end);
        linepath.strokeColor = '#3366ff';
        linepath.dashArray = [5, 3];
        linepath.strokeWidth = 2;
        curline.remove();
        curline = linepath;
        clearTimeout(timeout);
        timeout = setTimeout(function(){startexpand = true; linepath.dashArray=[];}, 300);
    } else if (curline && startexpand) {
        // make thin rectangle
        clearTimeout(timeout);
        if (!currect) {
            var rectstart = curline.strokeBounds.topLeft;
            var rectend = new paper.Point(curline.strokeBounds.bottomRight.x, curline.strokeBounds.bottomRight.y + 1.0);
            curline.remove();
            var rect = new paper.Path.Rectangle(rectstart, rectend);
            rect.strokeColor = '#3366ff';
            rect.strokeWidth = 2;
            rect.dashArray = [];
            currect = rect;
        } else {
            var br = currect.strokeBounds.bottomRight;
            var tl = currect.strokeBounds.topLeft;
            var itemsbelow = getItemsBelow(currect, scene);
            var scaley = (event.point.y - tl.y) / (br.y - tl.y);
            if (scaley > 1.0) {
                currect.scale(1.0, scaley, currect.bounds.topLeft);
            }
            for (var i = 0; i < itemsbelow.length; i++) {
                pushItemDown(itemsbelow[i], currect);
            }
        }
    }
};

function vertLineEnd(event) {
    startexpand = false;
    currect = null;
    activateDefaultTool();
};

/** Get descendant items of parent that is strictly below rectangle**/
function getItemsBelow(rect, parent) {
    var tl = rect.strokeBounds.topLeft;
    var br = rect.strokeBounds.bottomRight;
    var areaBelow = new paper.Path.Rectangle(new paper.Point(tl.x, br.y), new paper.Point(br.x, maxy));
    if (!parent.children) return [];
    var items = parent.children;
    var itemsbelow  = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (areaBelow.bounds.intersects(item.bounds)) {
            if (rect.bounds.top < item.bounds.top) {
                itemsbelow.push(item);
            } else {
                itemsbelow.push.apply(itemsbelow, getItemsBelow(rect, item));
            }
        }
    }
    areaBelow.remove();
    itemsbelow.sort(compareTop);
    return itemsbelow;
};

function pushItemDown(item, rect) {
    var deltay = rect.strokeBounds.bottom - item.bounds.top;
    if (deltay > 0) {
        expandContainers(item, 0, deltay);

        item.translate(new paper.Point(0, deltay));
        var itemsbelow = getItemsBelow(item, scene);
        for (var i = 0; i < itemsbelow.length; i++) {
            pushItemDown(itemsbelow[i], item);
        }
    }
};

/**
 * Check if sibling items contain item
 * Expand sibling item to preserve containment relationship
 **/
function expandContainers(item, deltax, deltay) {
    if (item.parent) {
        var siblings = item.parent.children;
        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] == item) continue;
            if (siblings[i].bounds.contains(item.bounds) && !siblings[i].children) {
                siblings[i].bounds.bottom = Math.max(siblings[i].bounds.bottom, item.bounds.bottom + deltay + 2.0);
                siblings[i].bounds.right = Math.max(siblings[i].bounds.right, item.bounds.right + deltax + 2.0);
            }
        }
        expandContainers(item.parent, deltax, deltay);
    }
};

function compareTop(item1, item2) {
    return item1.bounds.top - item2.bounds.top;
};

function horiLineStart(event) {
    // get the target slide
    var canvas = event.event.target;
    curslide = canvas.slide;
    var start = event.point;
    var end = new paper.Point(start.x, start.y+0.1);
    var linepath = new paper.Path.Line(start, end);
    linepath.strokeColor = '#3366ff';
    linepath.dashArray = [5, 3];
    linepath.strokeWidth = 2;
    curline = linepath;
    startp = event.point;
};

function horiLineContinue(event) {
    if (curline && !startexpand) {
        var end = new paper.Point(startp.x, event.point.y);
        var linepath = new paper.Path.Line(startp, end);
        linepath.strokeColor = '#3366ff';
        linepath.dashArray = [5, 3];
        linepath.strokeWidth = 2;
        curline.remove();
        curline = linepath;
        clearTimeout(timeout);
        timeout = setTimeout(function() {startexpand = true; linepath.dashArray = [];}, 300);
    } else if (curline && startexpand) {
        // make thin rectangle
        clearTimeout(timeout);
        if (!currect) {
            var rectstart = curline.strokeBounds.topLeft;
            var rectend = new paper.Point(curline.strokeBounds.bottomRight.x + 1.0, curline.strokeBounds.bottomRight.y);
            curline.remove();
            var rect = new paper.Path.Rectangle(rectstart, rectend);
            rect.strokeColor = '#3366ff';
            rect.strokeWidth = 2;
            rect.dashArray = [];
            currect = rect;
        } else {
            var br = currect.strokeBounds.bottomRight;
            var tl = currect.strokeBounds.topLeft;
            var itemsright = getItemsRight(currect, scene);
            var scalex = (event.point.x - tl.x) / (br.x - tl.x);
            if (scalex > 1.0) {
                currect.scale(scalex, 1.0, currect.bounds.topLeft);
            }
            for (var i = 0; i < itemsright.length; i++) {
                pushItemRight(itemsright[i], currect);
            }
        }
    }
};

function horiLineEnd(event) {
    startexpand = false;
    currect = null;
    activateDefaultTool();
};

function getItemsRight(rect, parent) {
    var tl = rect.strokeBounds.topLeft;
    var br = rect.strokeBounds.bottomRight;
    var areaRight = new paper.Path.Rectangle(new paper.Point(br.x, tl.y), new paper.Point(maxx, br.y));
    if (!parent.children) return [];
    var items = parent.children;
    var itemsright = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (areaRight.bounds.intersects(item.bounds)) {
            if (rect.bounds.left < item.bounds.left) {
                itemsright.push(item);
            } else {
                itemsright.push.apply(itemsright, getItemsRight(rect, item));
            }
        }
    }
    areaRight.remove();
    itemsright.sort(compareLeft);
    return itemsright;
};

function pushItemRight(item, rect) {
    var deltax = rect.strokeBounds.right - item.bounds.left;
    if (deltax > 0) {
        expandContainers(item, deltax, 0);
        
        item.translate(new paper.Point(deltax, 0));
        var itemsright = getItemsRight(item, scene);
        for (var i = 0; i < itemsright.length; i++) {
            pushItemRight(itemsright[i], item);
        }
    }
};

function compareLeft(item1, item2) {
    return item1.bounds.left - item2.bounds.left;
};

function deactivateTargetListener() {
    var speaker_targets = document.querySelectorAll('.target');
    for (var i = 0; i < speaker_targets.length; i++) {
        speaker_targets[i].style.pointerEvents = "none";
    }
};

function activateTargetListener() {
    var speaker_targets = document.querySelectorAll('.target');
    for (var i = 0; i < speaker_targets.length; i++) {
        speaker_targets[i].style.pointerEvents = "auto";
    }
};
