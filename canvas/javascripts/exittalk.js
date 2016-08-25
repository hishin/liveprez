/**
 * Created by vshin on 8/16/16.
 */
var slideh = document.querySelector('.slide').offsetHeight;
var slidew = document.querySelector('.slide').offsetWidth;
var mypapers = [];
var canvasactive = false;
var menuBox = null;
var targetBox = null;

window.onload = function () {
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

        var drawingtool = new mypaper.Tool();
        drawingtool.onMouseDown = drawStart;
        drawingtool.onMouseDrag = drawContinue;
        drawingtool.onMouseUp = drawEnd;

        setupTargetLayers(slides[i]);
    }
};

function setupTargetLayers(slide) {
    // Setup layer for each target within slide
    var targets = slide.getElementsByClassName('target');
    var mypaper = slide.paper;
    for (var i = 0; i < targets.length; i++) {
        var layer = new paper.Layer();
        mypaper.project.addLayer(layer);
        layer.target = targets[i];
        targets[i].layer = layer;
        targets[i].paper = mypaper;
        targets[i].slide = slide;
    }
}

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
    var targetdiv = event.currentTarget;
    menuBox = targetdiv;
    var pos = getElementPos(targetdiv);
    var targetleft = pos.left;
    var targettop = pos.top;
    var menu = document.getElementById('content-menu');
    menu.style.position = 'absolute';
    menu.style.left = targetleft + 'px';
    menu.style.top = targettop + 'px';
    menu.style.display = 'block';
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
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('notvis');
    }
    // Reveal sibiling item in audience view
    var siblingBox = getSiblingTarget(targetBox);
    var items = $(siblingBox).find('.speaker-only');
    for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('notvis');
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
    targetBox.paper.tools[0].activate();

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
    if (group.strokeBounds.width > target.offsetWidth || group.strokeBounds.height > target.offsetHeight) {
        group.fitBounds(tbound);
    } else { // only move
        var delta;
        if (sbound.left < tbound.left) {
            delta = new paper.Point(tbound.left - sbound.left, 0);
            console.log('moveleft:' + delta);
            group.translate(delta);
        }
        if (sbound.top < tbound.top) {
            delta = new paper.Point(0, tbound.top - sbound.top);
            console.log('movetop:' + delta);

            group.translate(delta);
        }
        if (sbound.right > tbound.right) {
            delta = new paper.Point(tbound.right - sbound.right, 0);
            console.log('moveright:' + delta);

            group.translate(delta);
        }
        if (sbound.bottom > tbound.bottom) {
            delta = new paper.Point(0, tbound.bottom - sbound.bottom);
            console.log('movebottom:' + delta);
            group.translate(delta);
        }
    }

    group.parent.insertChildren(group.index,  group.removeChildren());
    group.remove();
}

function deactivateLayer() {
    // Fit objects to canvas
    fitStrokesToTarget(targetBox);
    console.log('targetbox items');
    console.log(targetBox.layer.getItems());
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

// function addGroupObjsToCanvas(fcanvas, groupobj) {
//     var groupobjs = groupobj.getObjects();
//     for (var i = 0; i < groupobjs.length; i++) {
//         var obj = groupobjs[i];
//         var group = obj.group;
//         obj.setLeft(group.getLeft() + obj.getLeft() + group.getWidth()/2.0);
//         obj.setTop(group.getTop() + obj.getTop() + group.getHeight()/2.0);
//         obj.setScaleX(obj.getScaleX()*group.getScaleX());
//         obj.setScaleY(obj.getScaleY()*group.getScaleY());
//
//
//         fcanvas.add(obj);
//
//     }
// };
//

//
// function getObjectsFitToTarget(objs, target) {
//     // TODO: There is an error when re-targeting a canvas. Objects scale, even when it fits!
//
//     // clone and group objects
//     var group = new fabric.Group();
//     for (var i = 0; i < objs.length; i++) {
//         console.log('obj.originX ' + objs[i].originX);
//         console.log('obj.left' + objs[i].getLeft());
//
//         objs[i].clone(function (o) {
//             group.addWithUpdate(o);
//         });
//     }
//
//     if (target == null) {
//         return group;
//     }
//
//     // Get scaling factor
//     var bbox = getBoundingRect(objs);
//     var strokew = bbox.width;
//     var strokeh = bbox.height;
//     var scale = 1.0;
//     if (strokew / target.clientWidth >= strokeh / target.clientHeight && strokew / target.clientWidth > 1) {
//         scale = target.clientWidth / strokew;
//     }
//     else if (strokeh / target.clientHeight > strokew / target.clientWidth && strokeh / target.clientHeight > 1) {
//         scale = target.clientHeight / strokeh;
//     }
//     console.log('scaling factor: ' + scale);
//     // Scale as a group
//     group.scale(scale);
//
//
//     // Move to match original left and top
//     var movex = bbox.left - group.getLeft();
//     var movey = bbox.top - group.getTop();
//     group.setLeft(group.getLeft() + movex - target.offsetLeft);
//     group.setTop(group.getTop() + movey - target.offsetTop);
//
//
//     // Move to fit in box
//     movex = 0;
//     movey = 0;
//     if (group.left < 0) {
//         movex = - group.left;
//     }
//     else if (group.left + group.getWidth() > target.clientWidth) {
//         movex = (target.clientWidth) - (group.left + group.getWidth());
//     }
//     if (group.top < 0) {
//         movey = - group.top;
//     }
//     else if (group.top + group.getHeight() > target.clientHeight) {
//         movey = (target.clientHeight) - (group.top+ group.getHeight());
//     }
//
//     group.setLeft(group.getLeft() + movex);
//     group.setTop(group.getTop() + movey);
//
//     return group;
// }
//
// function getBoundingRect(objs) {
//     var left = Infinity;
//     var top = Infinity;
//     var right = -Infinity;
//     var bottom = -Infinity;
//     for (var i = 0; i < objs.length; i++) {
//         console.log('getleft = ' + objs[i].getLeft());
//
//         if (objs[i].getLeft() - objs[i].getWidth()/2.0 < left) {
//             left = objs[i].getLeft()- objs[i].getWidth()/2.0;
//         }
//         if (objs[i].getTop() - objs[i].getHeight()/2.0 < top) {
//             top = objs[i].getTop() - objs[i].getHeight()/2.0;
//         }
//         if (objs[i].getLeft() + objs[i].getWidth()/2.0 > right) {
//             right = objs[i].getLeft() + objs[i].getWidth()/2.0;
//         }
//         if (objs[i].getTop() + objs[i].getHeight()/2.0 > bottom) {
//             bottom = objs[i].getTop() + objs[i].getHeight()/2.0;
//         }
//
//     }
//     return {left:left, top:top, width:right-left, height:bottom-top};
//
// }
//
//

//
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


