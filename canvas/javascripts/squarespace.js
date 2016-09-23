/**
 * Created by hijungshin on 9/20/16.
 */

var scenes = [];

window.onload = function () {

    // setup paper canvas
    setupSlideCanvas();

    // setupt scene graph
    setupSlideSceneGraph();

    // setup hover reaction
    // setupExpansionBars();
};

function setupSlideCanvas() {
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        var canvas = document.createElement('canvas');
        canvas.setAttribute('id', slides[i].id.replace('slide', 'canvas'));
        slides[i].appendChild(canvas);

        var mypaper = new paper.PaperScope();
        mypaper.setup(canvas);

        slides[i].paper = mypaper;
        slides[i].canvas = canvas;
        canvas.paper = mypaper;
        canvas.slide = slides[i];
        mypaper.slide = slides[i];
        mypaper.canvas = canvas;

        // VerticalSpace tool
        var verttool = new mypaper.Tool();
        verttool.onMouseDown = vertLineStart;
        verttool.onMouseDrag = vertLineContinue;
        verttool.onMouseUp = vertLineEnd;
        mypaper.verttool = verttool;

        // load images onto canvas
        var contents = slides[i].getElementsByClassName('contentbox');
        for (var c = 0; c < contents.length; c++) {
            loadImage(contents[c], mypaper);
        }
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
                // svgitem.scale(3.0);
                // svgitem.scale(wscale, hscale);
                // var delta = new paper.Point(parseFloat(contentbox.style.left) - svgitem.bounds.left,
                //     parseFloat(contentbox.style.top) - svgitem.bounds.top);
                svgitem.translate(delta);
                contentbox.images.push(svgitem);
                // svgitem.selected = true;
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
    var slide = slides[0];
    var mypaper = slide.paper;
    mypaper.verttool.activate();
};

var curline;
var startp;

function vertLineStart(event) {
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

function vertLineEnd(event) {
    if (curline) {
        curline.strokeColor = '#3366ff';
        curline.dashArray = [];
    }
    // Translate items left of the vertical line by 100 pixels
    expandVertical(curline, 10);

    curline.remove();
};


function deactivateTargetListener() {
    var speaker_targets = document.querySelectorAll('.target');
    for (var i = 0; i < speaker_targets.length; i++) {
        speaker_targets[i].style.pointerEvents = "none";
    }
};

function expandVertical(line, pixels) {
    // get all the paths below the line
    var slides = document.querySelectorAll('.slide-container');
    var slide = slides[0];
    var mypaper = slide.paper;
    var items = mypaper.project.activeLayer.children;
    var delta = new paper.Point(0, pixels);
    var item;
    for (var i = 0; i < items.length; i++) {
        item = items[i];
        if (belowLine(item, line)) {
            item.translate(delta);
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
