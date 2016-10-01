/**
 * Created by hijungshin on 9/20/16.
 */

var scene;
var mypaper;
var slide;
var maxy = 1000;

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

    // Expand Vertical tool
    var expandverttool = new mypaper.Tool();
    expandverttool.onMouseDrag = expandRectangleVert;
    mypaper.expandverttool = expandverttool;

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

function loadImage(contentbox, mypaper) {
    var img, img_src, img_type;
    var images = contentbox.getElementsByTagName('img');
    contentbox.images = [];

    for (var i = 0; i < images.length; i++) {
        img = images[i];
        img_src = img.getAttribute('src');
        img_type = img.src.split('.').pop();
        if (img_type  == 'svg') {
            mypaper.project.importSVG(img_src, {expandShapes:true,
            onLoad: function(svgitem, data) {
                var wscale = parseFloat(contentbox.style.width)/svgitem.bounds.width;
                var hscale = parseFloat(contentbox.style.height)/svgitem.bounds.height;
                // svgitem.scale(3.0, 3.0);
                svgitem.scale(wscale, hscale);
                var delta = new paper.Point(parseFloat(contentbox.style.left) - svgitem.bounds.left,
                    parseFloat(contentbox.style.top) - svgitem.bounds.top);
                svgitem.translate(delta);
                contentbox.images.push(svgitem);
                console.log("image " + img_src);
                console.log(svgitem);
            }});

        }
        else {
            var raster = new paper.Raster(img.id);
            // scale and fit into target
            var wscale = parseFloat(contentbox.style.width)/raster.width;
            var hscale = parseFloat(contentbox.style.height)/raster.height;
            raster.scale(wscale, hscale);
            var delta = new paper.Point(parseFloat(contentbox.style.left) - raster.bounds.left,
                parseFloat(contentbox.style.top) - raster.bounds.top);
            raster.translate(delta);
            contentbox.images.push(raster);
            // raster.selected = true;
        }
    }
};

function setupExpansionBars() {
    var targets = document.querySelectorAll('.target');
    for (var i = 0; i < targets.length; i++) {
        targets[i].addEventListener("mouseover", showTargetExpansionBar, true);
        targets[i].addEventListener("click", expandTarget, true);
    }
};

function expandTarget(event) {
    var target = event.currentTarget;
    expandBottom(target, 10);
};

function showTargetExpansionBar(event) {
    var target = event.currentTarget;
    var hb = document.getElementById('horizontal-bar');
    hb.style.width = target.offsetWidth + 'px';
    hb.style.position = 'absolute';
    hb.style.left = target.style.left;
    hb.style.top = target.style.top;
    hb.style.display = 'inline-block';

    var hba = document.getElementById('hb-arrow');
    hba.style.position = 'absolute';
    hba.style.left = hb.style.left;
    hba.style.top = parseFloat(hb.style.top) - hba.offsetHeight/2.0 + 1.0 + 'px';
    hba.style.display = 'inline-block';

    var hb2 = document.getElementById('horizontal-bar-bottom');
    hb2.style.width = target.offsetWidth + 'px';
    hb2.style.position = 'absolute';
    hb2.style.left = target.style.left;
    hb2.style.top = parseFloat(target.style.top) + target.offsetHeight + 'px';
    hb2.style.display = 'inline-block';

    var hba2 = document.getElementById('hb-arrow-bottom');
    hba2.style.position = 'absolute';
    hba2.style.left = hb2.style.left;
    hba2.style.top = parseFloat(hb2.style.top) - hba2.offsetHeight/2.0 + 'px';
    hba2.style.display = 'inline-block';
};

function expandBottom(target, pixels) {
    if (!target.scenebox) 
        return;

    var parentbox = target.scenebox.parent;
    if (!parentbox)
        return;

    var siblingboxes = parentbox.children;

    var sbox;
    for (var i = 0; i < siblingboxes.length; i++) {
        sbox = siblingboxes[i];

        if (isBelow(target, sbox.target)) {
            moveDown(sbox.target, pixels);
        }
    }

    expandBottom(parentbox.target, pixels);
    parentbox.target.style.height = parentbox.target.offsetHeight + pixels + 'px';

};

function moveDown(target, pixels) {
    target.style.top = parseFloat(target.style.top) + pixels + 'px';
    var children = target.scenebox.children;

    var cbox;
    for (var i = 0; i < children.length; i++) {
        cbox = children[i];
        moveDown(cbox.target, pixels);
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

function SceneBox(target) {
    target.scenebox = this;
    this.target = target;
    this.tlx = target.offsetLeft;
    this.tly = target.offsetTop;
    this.width = target.offsetWidth;
    this.height = target.offsetHeight;
    this.brx = this.tlx + this.width;
    this.bry = this.tly + this.height;
    this.parent = null;
    this.children = [];

    this.insertBox = function(other_box) {
        for (var i = 0; i < this.children.length; i++) {
            var childbox = this.children[i];
            if (childbox.contains(other_box)) {
                childbox.insertBox(other_box);
                return;
            }
            if (other_box.contains(childbox)) {
                other_box.parent = childbox.parent;
                childbox.parent = other_box;
                this.children[i] = other_box;
                return;
            }
        }
        other_box.parent = this;
        this.children.push(other_box);
    };

    this.contains = function(other_box) {
        if (this.tlx <= other_box.tlx && this.tly <= other_box.tly &&
            this.brx >= other_box.brx && this.bry >= other_box.bry)
            return true;
        else
            return false;
    };
};

function setupSlideSceneGraph() {
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        var sceneroot = createSceneGraph(slides[i]);
        scenes.push(sceneroot);
        slides[i].scene = sceneroot;
    }
};

function createSceneGraph(slide) {
    var rootBox = new SceneBox(slide);
    rootBox.tlx = 0;
    rootBox.tly = 0;
    rootBox.brx = slide.offsetWidth;
    rootBox.bry = slide.offsetHeight;
    rootBox.width = slide.offsetWidth;
    rootBox.height = slide.offsetHeight;
    var contentboxes = slide.querySelectorAll('.contentbox');
    for (var i = 0; i < contentboxes.length; i++) {
        rootBox.insertBox(new SceneBox(contentboxes[i]));
    }
    return rootBox;
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

function vertLineStart(event) {
    // get the target slide
    var canvas = event.event.target;
    curslide = canvas.slide;
    var start = event.point;
    var end = new paper.Point(start.x+0.1, start.y);
    var linepath = new paper.Path.Line(start, end);
    linepath.strokeColor = '#000000';
    linepath.dashArray = [5, 3];
    curline = linepath;
    startp = event.point;
};

function vertLineContinue(event) {
    if (curline) {
        var end = new paper.Point(event.point.x, startp.y);
        var linepath = new paper.Path.Line(startp, end);
        linepath.strokeColor = '#000000';
        linepath.dashArray = [5, 3];
        curline.remove();
        curline = linepath;
    }
};

function getItemsBelow(rect) {
    var tl = rect.strokeBounds.topLeft;
    var br = rect.strokeBounds.bottomRight;
    var areaBelow = new paper.Path.Rectangle(tl, new paper.Point(br.x, maxy));
    var items = scene.children;
    var itemsbelow  = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (areaBelow.bounds.intersects(item.bounds) && rect.bounds.top < item.bounds.top) {
            itemsbelow.push(item);
        }
    }
    itemsbelow.sort(compareTop);
    return itemsbelow;
};

function vertLineEnd(event) {
    if (curline) {
        // make thin rectangle
        var rectstart = curline.strokeBounds.topLeft;
        var rectend = new paper.Point(curline.strokeBounds.bottomRight.x, curline.strokeBounds.bottomRight.y + 5.0);
        var rect = new paper.Path.Rectangle(rectstart, rectend);
        rect.strokeColor = '#3366ff';
        rect.strokeWidth = 5;
        rect.dashArray = [];

        // onmouseover: change to "expand" cursor
        currect = rect;
        rect.onMouseEnter  = function(event) {
            document.body.style.cursor = 's-resize';
            activateExpandVertTool();
        };
        rect.onMouseDown = function(event) {
        };
        rect.onMouseLeave = function(event) {
            document.body.style.cursor = 'auto';
        };

    }
    curline.remove();
    activateDefaultTool();
};

function expandRectangleVert(event) {
    if (currect) {
        var br = currect.strokeBounds.bottomRight;
        var tl = currect.strokeBounds.topLeft;
        var scaley = (event.point.y - tl.y) / (br.y - tl.y);
        if (scaley > 1.0) {
            currect.scale(1.0, scaley, currect.bounds.topLeft);
        }
        var itemsbelow = getItemsBelow(currect);
        for (var i = 0; i < itemsbelow.length; i++) {
            pushItemDown(itemsbelow[i], currect);
        }
    }
};

function pushItemDown(item, rect) {
    var deltay = rect.strokeBounds.bottom - item.bounds.top;
    if (deltay > 0) {
        item.translate(new paper.Point(0, deltay));
        var itemsbelow = getItemsBelow(item);
        for (var i = 0; i < itemsbelow.length; i++) {
            pushItemDown(itemsbelow[i], item);
        }
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
    linepath.strokeColor = '#000000';
    linepath.dashArray = [5, 3];
    curline = linepath;
    startp = event.point;
};

function horiLineContinue(event) {
    if (curline) {
        var end = new paper.Point(startp.x, event.point.y);
        var linepath = new paper.Path.Line(startp, end);
        linepath.strokeColor = '#000000';
        linepath.dashArray = [5, 3];
        curline.remove();
        curline = linepath;
    }
};

function horiLineEnd(event) {
    if (curline) {
        curline.strokeColor = '#3366ff';
        curline.dashArray = [];
    }
    // Translate items left of the vertical line by 100 pixels
    curline.remove();

    expandHorizontal(curslide, curline, 10);

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

function expandVertical(slide, line, pixels) {
    // get all the paths below the line
    var mypaper = slide.paper;
    var items = mypaper.project.activeLayer.children;
    var delta = new paper.Point(0, pixels);
    var item;
    var depth = 0;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        translateIfBelow(line, item, delta, depth);
    }
};

function expandHorizontal(slide, line, pixels) {
    // get all the paths below the line
    var mypaper = slide.paper;
    var items = mypaper.project.activeLayer.children;
    var delta = new paper.Point(pixels, 0);
    var item;
    var depth = 0;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        translateIfRight(line, item, delta, depth);
    }
};

function translateIfBelow(line, item, delta, depth) {

    if (belowLine(item, line)) {
        item.translate(delta);
        // item.selected = true;
    }
    else if (item.hasChildren()) {
        for (var j = 0; j < item.children.length; j++) {
            translateIfBelow(line, item.children[j], delta, depth+1);
        }
    }
};

function translateIfRight(line, item, delta, depth) {

    if (rightOfLine(item, line)) {
        item.translate(delta);
    }
    else if (item.hasChildren()) {
        for (var j = 0; j < item.children.length; j++) {
            translateIfRight(line, item.children[j], delta, depth+1);
        }
    }
};


function belowLine(item, line) {
    if (item.strokeBounds.top <= line.strokeBounds.bottom) {
        return false;
    }

    var lr = line.strokeBounds.right;
    var ll = line.strokeBounds.left;
    var ir = item.strokeBounds.right;
    var il = item.strokeBounds.left;

    var overlap = Math.min(lr, ir) - Math.max(ll, il);
    if (overlap >= 0.3 * item.strokeBounds.width) {
        return true;
    }
    return false;

};


function rightOfLine(item, line) {
    if (item.strokeBounds.left <= line.strokeBounds.right) {
        return false;
    }

    var lt = line.strokeBounds.top;
    var lb = line.strokeBounds.bottom;
    var it = item.strokeBounds.top;
    var ib = item.strokeBounds.bottom;

    var overlap = Math.min(lb, ib) - Math.max(lt, it);
    if (overlap >= 0.3 * item.strokeBounds.width) {
        return true;
    }
    return false;

};

