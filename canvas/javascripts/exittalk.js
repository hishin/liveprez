/**
 * Created by vshin on 8/16/16.
 */
var slideh;
var slidew;
var mypapers = [];
var menuBox = null;
var targetBox = null;
const pentool = 0;
const recttool = 1;
var alltargets = [];

window.onload = function () {
    slideh = document.querySelector('.slide').offsetHeight;
    slidew = document.querySelector('.slide').offsetWidth;

    // Setup canvas for each slide
    setupSlideCanvas();

    // Add menu to speaker targets
    activateTargetListener();
};

function activateTargetListener() {
    var speaker_targets = document.getElementById('speaker-view').querySelectorAll('.target');
    for (var i = 0; i < speaker_targets.length; i++) {
        speaker_targets[i].style.pointerEvents = "auto";
        speaker_targets[i].addEventListener("mouseover", targetMouseIn, true);
        speaker_targets[i].addEventListener("mouseout", targetMouseOut, true);
    }
};

function deactivateTargetListener() {
    var speaker_targets = document.getElementById('speaker-view').querySelectorAll('.target');
    for (var i = 0; i < speaker_targets.length; i++) {
        speaker_targets[i].style.pointerEvents = "none";
    }
};

function setupSlideCanvas() {
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        canvas = document.createElement('canvas');
        canvas.setAttribute('id', slides[i].id.replace('slide', 'canvas'));
        slides[i].appendChild(canvas);

        var mypaper = new paper.PaperScope();
        mypaper.setup(canvas);
        mypapers.push(mypaper);

        slides[i].paper = mypaper;
        slides[i].canvas = canvas;
        canvas.paper = mypaper;
        canvas.slide = slides[i];
        mypaper.slide = slides[i];
        mypaper.canvas = canvas;

        // Pen tool
        var drawingtool = new mypaper.Tool();
        drawingtool.onMouseDown = drawStart;
        drawingtool.onMouseDrag = drawContinue;
        drawingtool.onMouseUp = drawEnd;

        // Rectangle tool
        var recttool = new mypaper.Tool();
        recttool.onMouseDown = rectStart;
        recttool.onMouseDrag = rectContinue;
        recttool.onMouseUp = rectEnd;

        setupTargetLayers(slides[i]);
    }
    var mytargets = document.querySelectorAll('#speaker-view .target');
    for (var i = 0; i < mytargets.length; i++) {
        alltargets.push(mytargets[i]);
    }
};

function setupTargetLayers(slide) {
    // Setup layer for each target within slide
    var targets = slide.getElementsByClassName('target');
    for (var i = 0; i < targets.length; i++) {
        setupLayer(targets[i], slide);
    }
};

function setupLayer(target, slide) {
    var layer = new paper.Layer();
    var mypaper = slide.paper;
    mypaper.project.addLayer(layer);
    layer.target = target;
    target.layer = layer;
    target.paper = mypaper;
    target.slide = slide;
};


function targetMouseIn(event) {
    revealMenu(event);
};

function targetMouseOut(event) {
    if (hasSomeParentWithClass(event.relatedTarget, 'hover-menu')) {
        return;
    }
    hideMenu('content-menu');
};

function revealMenu(event) {
    console.log(event.currentTarget);
    var targetdiv = event.currentTarget;
    menuBox = targetdiv;
    var pos = getElementPos(targetdiv);
    var targetleft = pos.left;
    var targettop = pos.top;
    var menu = document.getElementById('content-menu');
    menu.style.position = 'absolute';
    menu.style.left = targetleft + 'px';
    menu.style.display = 'inline-block';
    menu.style.visibility = 'hidden';
    menu.style.top = targettop - menu.offsetHeight + 'px';
    menu.style.display = 'block';
    menu.style.visibility = 'visible';


};

function hideMenu(id) {
    var menu = document.getElementById(id);
    menu.style.display = 'none';
};

function getElementPos(elem) {
    var box = elem.getBoundingClientRect();
    var body = document.body;
    var docElem = document.documentElement;
    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
    var clientTop = docElem.clientTop || body.clientTop || 0;
    var clientLeft = docElem.clientLeft || body.clientLeft || 0;
    var top = box.top + scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;
    return {top: Math.round(top), left: Math.round(left)};

};

function hasSomeParentWithClass(element, classname) {
    if (element && element.className && element.className.split(' ').indexOf(classname) >= 0) {
        return true;
    }
    else if (element && element.parentNode) {
        return hasSomeParentWithClass(element.parentNode, classname);
    }
    else {
        return false;
    }
};

function revealTargetItem() {
    targetBox = menuBox;
    var items = $(targetBox).find('.speaker-only');
    if (targetBox.layer) {
        targetBox.layer.removeChildren();
    }
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('notvis');
        if (items[i].layer) {
            items[i].layer.removeChildren();
        }
    }
    // Reveal sibiling item in audience view
    var siblingBox = getSiblingTarget(targetBox);
    if (siblingBox.layer) {
        siblingBox.layer.removeChildren();
    }
    var items = $(siblingBox).find('.speaker-only');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('notvis');
        if (items[i].layer) {
            items[i].layer.removeChildren();
        }
    }

};

function hideTargetItem() {
    targetBox = menuBox;
    var items = $(targetBox).find('.speaker-only');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.add('notvis');
    }
    // Reveal sibiling item in audience view
    var siblingBox = getSiblingTarget(targetBox);
    var items = $(siblingBox).find('.speaker-only');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.add('notvis');
    }

};

function getSiblingTarget(target) {
    var sibling_id = target.id.replace('speaker', 'audience');
    var sibling = document.getElementById(sibling_id);
    return sibling;
};

function activateTargetLayer() {
    deactivateTargetListener();
    hideMenu('content-menu');

    targetBox = menuBox;
    targetBox.classList.add('isdrawing');
    targetBox.layer.activate();

    // Turn on drawing tool
    targetBox.paper.tools[pentool].activate();

    revealDeactivateMenu(targetBox.slide);
};


function fitStrokesToTarget(target) {
    var items = target.layer.getItems();
    paper = target.slide.paper;
    var group = new paper.Group(items);

    var tl = new paper.Point(target.offsetLeft, target.offsetTop);
    var br = new paper.Point(target.offsetLeft + target.offsetWidth, target.offsetTop + target.offsetHeight);
    // If object is larger scale and move
    var tbound = new paper.Rectangle(tl, br);
    var sbound = group.strokeBounds;
    var origl = group.strokeBounds.left;
    var origt = group.strokeBounds.top;
    var scale = 1.0;
    if (sbound.width > target.offsetWidth || sbound.height > target.offsetHeight) {
        scale = Math.min(target.offsetWidth/sbound.width, target.offsetHeight/sbound.height)
        group.scale(scale);
        group.translate(origl - group.strokeBounds.left, origt - group.strokeBounds.top);
        sbound = group.strokeBounds;
    }

    var delta;
    if (sbound.left < tbound.left) {
        delta = new paper.Point(tbound.left - sbound.left, 0);
        // console.log('moveleft:' + delta);
        group.translate(delta);
    }
    if (sbound.top < tbound.top) {
        delta = new paper.Point(0, tbound.top - sbound.top);
        // console.log('movetop:' + delta);
        group.translate(delta);
    }
    if (sbound.right > tbound.right) {
        delta = new paper.Point(tbound.right - sbound.right, 0);
        // console.log('moveright:' + delta);
        group.translate(delta);
    }
    if (sbound.bottom > tbound.bottom) {
        delta = new paper.Point(0, tbound.bottom - sbound.bottom);
        // console.log('movebottom:' + delta);
        group.translate(delta);
    }


    group.parent.insertChildren(group.index,  group.removeChildren());
    group.remove();
}

function deactivateLayer() {
    // Fit objects to canvas
    fitStrokesToTarget(targetBox);
    // Turn off drawing, activate target listeners
    targetBox.classList.remove('isdrawing');
    hideMenu('deactivate-menu');
    activateTargetListener();
};

var curstroke;
function drawStart(event) {
    curstroke = new paper.Path();
    curstroke.strokeColor = 'black';
};

function drawContinue(event) {
    curstroke.add(event.point);
};

function drawEnd(event) {
    curstroke.smooth();
    // Add to sibling layer
   cloneToSiblingLayer();
};

function cloneToSiblingLayer() {
    var sibling_id = targetBox.id.replace('speaker', 'audience');
    var s_target = document.getElementById(sibling_id);
    var items = targetBox.layer.getItems();
    var s_layer = s_target.layer;

    s_layer.removeChildren();
    for (var i = 0; i < items.length; i++) {
        s_layer.addChild(items[i].clone());
    }
    s_layer.activate();
    fitStrokesToTarget(s_target);
    targetBox.layer.activate();

};


function createNewTarget() {
    deactivateTargetListener();
    hideMenu('content-menu');

    // Activate slide canvas
    targetBox = menuBox;
    var slide = targetBox.slide;
    var slideTarget = $(slide).children('.target')[0];
    targetBox = slideTarget;
    slideTarget.classList.add('isdrawing');
    slideTarget.layer.activate();

    // Turn on rectangle tool
    targetBox.paper.tools[recttool].activate();
    revealDeactivateMenu(targetBox.slide);
};

var currect;
function rectStart(event) {
    var rectstart = event.point;
    var rectend = new paper.Point(rectstart.x + 0.1, rectstart.y + 0.1);
    var rectpath = new paper.Path.Rectangle(rectstart, rectend);
    rectpath.strokeColor = '#000000';
    rectpath.dashArray = [5, 3];
    currect = rectpath;
};

function rectContinue(event) {
    if (currect) {
        var tl = currect.strokeBounds.topLeft;
        var br = currect.strokeBounds.bottomRight;
        var new_br = event.point;
        var scalex = (new_br.x - tl.x) / (br.x - tl.x);
        var scaley = (new_br.y - tl.y) / (br.y - tl.y);
        currect.scale(scalex, scaley, tl);
    }
};

function rectEnd(event) {
    if (currect) {
        // Create target at rectangle location.
        currect.strokeColor = '#3366ff';
        currect.dashArray = [];
        menuBox = createTarget(currect);
        currect.remove();
        // Optimize layout
        optimizeLayout(targetBox);
        // Activate Target
        activateTargetLayer();


    }
};

function createTarget(rect) {
    // targetBox = slide-container > target: target for the entire slide
    var slide = $(targetBox).closest('.slide-container')[0];
    var slidediv = $(targetBox).find('.slide')[0];
    var targetdiv = document.createElement('div');
    targetdiv.classList.add('contentbox');
    targetdiv.classList.add('speaker-only');
    targetdiv.classList.add('target');
    targetdiv.style.position = 'absolute';
    targetdiv.style.left = rect.strokeBounds.left +'px';
    targetdiv.style.top = rect.strokeBounds.top +'px';
    targetdiv.style.width = rect.strokeBounds.width +'px';
    targetdiv.style.height = rect.strokeBounds.height +'px';
    targetdiv.id = 'speaker-target-box-'+alltargets.length;
    slidediv.appendChild(targetdiv);
    alltargets.push(targetdiv);
    setupLayer(targetdiv, slide);

    var s_slide = getSibling(slide);
    var s_slidediv = $(s_slide).find('.slide')[0];
    var s_targetdiv = targetdiv.cloneNode(true);
    s_targetdiv.id = s_targetdiv.id.replace('speaker', 'audience');
    s_slidediv.appendChild(s_targetdiv);
    setupLayer(s_targetdiv, s_slide);

    return targetdiv;
};

function getSibling(elem) {
    var sibling_id;
    if (elem.id.includes('speaker'))
        sibling_id = elem.id.replace('speaker', 'audience');
    else if (elem.id.includes('audience'))
        sibling_id = elem.id.replace('audience', 'speaker');
    else return null;
    return document.getElementById(sibling_id);
};

function revealDeactivateMenu(targetdiv) {
    var pos = getElementPos(targetdiv);
    var menu = document.getElementById('deactivate-menu');
    menu.style.display = 'inline-block';
    menu.style.visibility = 'hidden';
    var targetleft = pos.left + targetdiv.offsetWidth;
    var targettop = pos.top + targetdiv.offsetHeight - menu.offsetHeight;
    menu.style.position = 'absolute';
    menu.style.left = targetleft + 'px';
    menu.style.top = targettop + 'px';
    menu.style.display = 'block';
    menu.style.visibility = 'visible';
};

function optimizeLayout(slide) {
    // 1. Get all content boxes within slide
    var contentboxes = slide.querySelectorAll('.contentbox');
    var rects = [];
    var box, rect, tlx, tly, brx, bry;
    for (var i = 0; i < contentboxes.length; i++) {
        box = contentboxes[i];
        tlx = parseFloat(box.style.left);
        tly = parseFloat(box.style.top);
        brx = tlx + parseFloat(box.offsetWidth);
        bry = tly + parseFloat(box.offsetHeight);
        rect = new paper.Rectangle(new paper.Point(tlx, tly), new paper.Point(brx, bry));
        rects.push(rect);
    }

    // 2. Optimize the box layouts
    var newrects = cobylaSolve(rects);

    // 3. Move the boxes, and the layers
    var delta, origtlx, origtly, newx, newy, origw, neww;
    for (var i = 0; i < contentboxes.length; i++) {
        box = contentboxes[i];
        // adjust targetdiv
        origtlx = parseFloat(box.style.left);
        origtly = parseFloat(box.style.top);
        origw = parseFloat(box.style.width);
        box.style.left = Number(newrects[i].topLeft.x).toFixed(2) +'px';
        box.style.top = Number(newrects[i].topLeft.y).toFixed(2) + 'px';
        box.style.width = Number(newrects[i].width).toFixed(2) + 'px';
        box.style.height = Number(newrects[i].height).toFixed(2) +'px';
        newx = parseFloat(box.style.left);
        newy = parseFloat(box.style.top);
        neww = parseFloat(box.style.width);
        delta = new paper.Point(newx - origtlx, newy - origtly);
        if (box.layer) {
            box.layer.translate(delta);
            scale = neww / origw;
            box.layer.scale(scale, new paper.Point(newx, newy));
        }

        // 4. Move sibling boxes and layers
        s_box = getSibling(box);
        s_box.style.left = Number(newrects[i].topLeft.x).toFixed(2) +'px';
        s_box.style.top = Number(newrects[i].topLeft.y).toFixed(2) + 'px';
        s_box.style.width = Number(newrects[i].width).toFixed(2) + 'px';
        s_box.style.height = Number(newrects[i].height).toFixed(2) +'px';
        if (s_box.layer) {
            s_box.layer.translate(delta);
            scale = neww / origw;
            s_box.layer.scale(scale, new paper.Point(newx, newy));
        }
    }




};

