/**
 * Created by vshin on 8/16/16.
 */
var slideh = document.querySelector('.slide').offsetHeight;
var slidew = document.querySelector('.slide').offsetWidth;

function setupTargetCanvas(target) {
    var containerdiv = document.createElement('div');
    containerdiv.classList.add('canvas-wrapper');
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', target.id +'-canvas');
    containerdiv.appendChild(canvas);
    target.appendChild(containerdiv);
    target.canvascontainer = containerdiv;

    var fabric_canvas = new fabric.Canvas(canvas.id);
    fabric_canvas.setWidth(target.offsetWidth);
    fabric_canvas.setHeight(target.offsetHeight);
    fabric_canvas.isDrawingMode = false;
    canvas.fabric = fabric_canvas;
    target.fabric = fabric_canvas;

    canvas.fabric.on('path:created', handleTargetStrokes);
};


var targets = document.querySelectorAll('.target');
for (var i = 0; i < targets.length; i++) {
    setupTargetCanvas(targets[i]);
}

// Add to speaker targets.
var speaker_targets = document.getElementById('speaker-view').querySelectorAll('.target');
for (var i = 0; i < speaker_targets.length; i++) {
    speaker_targets[i].addEventListener("mouseover", targetMouseIn, true);
    speaker_targets[i].addEventListener("mouseout", targetMouseOut, true);
}

var targetBox = null;
var menuBox = null;
var canvasactive = false;
function targetMouseIn(event) {
    if (canvasactive) return;
    revealMenu(event);
};

function targetMouseOut(event) {
    if (hasSomeParentWithClass(event.relatedTarget, 'hover-menu')) {
        return;
    }
    hideMenu('content-menu');
};

function activateTargetCanvas() {
    targetBox = menuBox;
    var canvasid = targetBox.id+'-canvas';
    var canvas = targetBox.querySelector('#'+canvasid);

    // Turn off other canvas' drawingMode
    var allcanvas = document.querySelectorAll('canvas');
    for (var i = 0; i < allcanvas.length; i++) {
        if (allcanvas[i].fabric) {
            allcanvas[i].fabric.isDrawingMode = false;
        }
    }
    var alltarget = document.querySelectorAll('.target');
    for (var i = 0; i < alltarget.length; i++) {
        alltarget[i].drawing = false;
        alltarget[i].classList.remove('isdrawing');
    }

    // Adjust layout to fill slide
    canvas.fabric.setWidth(slidew);
    canvas.fabric.setHeight(slideh);

    canvas.style.left = '-' + targetBox.style.left;
    canvas.style.top = '-' + targetBox.style.top;
    canvas.nextElementSibling.style.left = canvas.style.left;
    canvas.nextElementSibling.style.top = canvas.style.top;

    // Adjust existing objects
    var prev_objects = canvas.fabric.getObjects();
    var movex = parseFloat(targetBox.style.left);
    var movey = parseFloat(targetBox.style.top);
    for (var i = 0; i < prev_objects.length; i++) {
        var o = prev_objects[i];
        o.setLeft(o.getLeft() + movex);
        o.setTop(o.getTop() + movey);
    }
    canvas.fabric.renderAll();


    // Turn on drawing mode
    targetBox.drawing = true;
    targetBox.classList.add('isdrawing');
    canvas.fabric.isDrawingMode = true;
    canvasactive = true;

    hideMenu('content-menu');
    revealDeactivateMenu(targetBox);
}

function addGroupObjsToCanvas(fcanvas, groupobj) {
    var groupobjs = groupobj.getObjects();
    for (var i = 0; i < groupobjs.length; i++) {
        var obj = groupobjs[i];
        var group = obj.group;
        obj.setLeft(group.getLeft() + obj.getLeft() + group.getWidth()/2.0);
        obj.setTop(group.getTop() + obj.getTop() + group.getHeight()/2.0);
        obj.setScaleX(obj.getScaleX()*group.getScaleX());
        obj.setScaleY(obj.getScaleY()*group.getScaleY());


        fcanvas.add(obj);

    }
};

function deactivateCanvas() {
    var canvasid = targetBox.id+'-canvas';
    var canvas = targetBox.querySelector('#'+canvasid);

    // Return layout to fit target
    canvas.fabric.setWidth(targetBox.offsetWidth);
    canvas.fabric.setHeight(targetBox.offsetHeight);

    canvas.style.left = 0;
    canvas.style.top = 0;how
    canvas.nextElementSibling.style.left = canvas.style.left;
    canvas.nextElementSibling.style.top = canvas.style.top;

    // Fit objects to canvas
    // console.log('before fitting box:');
    var before_box = getBoundingRect(canvas.fabric.getObjects());
    // console.log(before_box);
    //
    var sibling_id = targetBox.id.replace('speaker', 'audience');
    var audience_target = document.getElementById(sibling_id);
    var sibling_canvas = audience_target.fabric;

    // console.log('sibling box:');
    var sibling_box = getBoundingRect(sibling_canvas.getObjects());
    // console.log(sibling_box);

    var fitobj = getObjectsFitToTarget(canvas.fabric.getObjects(), targetBox);
    canvas.fabric.clear();
    // addGroupObjsToCanvas(canvas.fabric, fitobj);
    canvas.fabric.add(fitobj);
    canvas.fabric.renderAll();

    console.log('after fitting box:');
    var after_box = getBoundingRect(canvas.fabric.getObjects());
    // console.log(after_box);

    // Turn off drawing mode
    targetBox.drawing = false;
    targetBox.classList.remove('isdrawing');
    canvas.fabric.isDrawingMode = false;

    canvasactive = false;
    hideMenu('deactivate-menu');
};

function handleTargetStrokes(event) {
    var targetcanvas = event.path.canvas;
    var sibling_id = targetBox.id.replace('speaker', 'audience');
    var audience_target = document.getElementById(sibling_id);
    var sibling_canvas = audience_target.fabric;

    var fitobj = getObjectsFitToTarget(targetcanvas.getObjects(), targetBox);

    sibling_canvas.clear();
    sibling_canvas.add(fitobj);
    // addGroupObjsToCanvas(sibling_canvas, fitobj);
    sibling_canvas.renderAll();
}

function getObjectsFitToTarget(objs, target) {
    // TODO: There is an error when re-targeting a canvas. Objects scale, even when it fits!

    // clone and group objects
    var group = new fabric.Group();
    for (var i = 0; i < objs.length; i++) {
        console.log('obj.originX ' + objs[i].originX);
        console.log('obj.left' + objs[i].getLeft());

        objs[i].clone(function (o) {
            group.addWithUpdate(o);
        });
    }

    if (target == null) {
        return group;
    }

    // Get scaling factor
    var bbox = getBoundingRect(objs);
    var strokew = bbox.width;
    var strokeh = bbox.height;
    var scale = 1.0;
    if (strokew / target.clientWidth >= strokeh / target.clientHeight && strokew / target.clientWidth > 1) {
        scale = target.clientWidth / strokew;
    }
    else if (strokeh / target.clientHeight > strokew / target.clientWidth && strokeh / target.clientHeight > 1) {
        scale = target.clientHeight / strokeh;
    }
    console.log('scaling factor: ' + scale);
    // Scale as a group
    group.scale(scale);


    // Move to match original left and top
    var movex = bbox.left - group.getLeft();
    var movey = bbox.top - group.getTop();
    group.setLeft(group.getLeft() + movex - target.offsetLeft);
    group.setTop(group.getTop() + movey - target.offsetTop);


    // Move to fit in box
    movex = 0;
    movey = 0;
    if (group.left < 0) {
        movex = - group.left;
    }
    else if (group.left + group.getWidth() > target.clientWidth) {
        movex = (target.clientWidth) - (group.left + group.getWidth());
    }
    if (group.top < 0) {
        movey = - group.top;
    }
    else if (group.top + group.getHeight() > target.clientHeight) {
        movey = (target.clientHeight) - (group.top+ group.getHeight());
    }

    group.setLeft(group.getLeft() + movex);
    group.setTop(group.getTop() + movey);

    return group;
}

function getBoundingRect(objs) {
    var left = Infinity;
    var top = Infinity;
    var right = -Infinity;
    var bottom = -Infinity;
    for (var i = 0; i < objs.length; i++) {
        console.log('getleft = ' + objs[i].getLeft());

        if (objs[i].getLeft() - objs[i].getWidth()/2.0 < left) {
            left = objs[i].getLeft()- objs[i].getWidth()/2.0;
        }
        if (objs[i].getTop() - objs[i].getHeight()/2.0 < top) {
            top = objs[i].getTop() - objs[i].getHeight()/2.0;
        }
        if (objs[i].getLeft() + objs[i].getWidth()/2.0 > right) {
            right = objs[i].getLeft() + objs[i].getWidth()/2.0;
        }
        if (objs[i].getTop() + objs[i].getHeight()/2.0 > bottom) {
            bottom = objs[i].getTop() + objs[i].getHeight()/2.0;
        }

    }
    return {left:left, top:top, width:right-left, height:bottom-top};

}


function revealMenu(event) {
    var targetdiv = event.currentTarget;
    menuBox = targetdiv;
    var pos = getElementPos(targetdiv);
    var targetleft = pos.left;
    var targettop = pos.top;
    var menu = document.getElementById( 'content-menu');
    menu.style.position = 'absolute';
    menu.style.left = targetleft + 'px';
    menu.style.top = targettop + 'px';
    menu.style.display = 'block';
};

function revealDeactivateMenu(targetdiv) {
    var pos = getElementPos(targetdiv);
    var menu = document.getElementById( 'deactivate-menu');

    // TODO: Reveal at the bottom-right of slide
    menu.style.display = 'inline-block';
    menu.style.visibility = 'hidden';
    console.log(menu.offsetWidth);
    var targetleft = pos.left + targetdiv.offsetWidth;
    var targettop = pos.top + targetdiv.offsetHeight - menu.offsetHeight;
    menu.style.position = 'absolute';
    menu.style.left = targetleft + 'px';
    menu.style.top = targettop + 'px';
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
    var top  = box.top +  scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;
    return { top: Math.round(top), left: Math.round(left) };

}

function hasSomeParentWithClass(element, classname) {
    if (element && element.className && element.className.split(' ').indexOf(classname)>=0) {
        return true;
    }
    else if (element && element.parentNode) {
        return hasSomeParentWithClass(element.parentNode, classname);
    }
    else {
        return false;
    }
}

