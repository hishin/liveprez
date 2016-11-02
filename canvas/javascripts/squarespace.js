/**
 * Created by hijungshin on 9/20/16.
 */

var scene;
var scenegraph;
var mypaper;
var slide;
var maxy = 5000;
var maxx = 5000;
var awindow;

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

    // Drawing tool
    var drawtool = new mypaper.Tool();
    drawtool.onMouseDown = drawStart;
    drawtool.onMouseDrag = drawContinue;
    drawtool.onMouseUp = drawEnd;
    mypaper.drawtool = drawtool;

    // Load Slide Image
   loadSlide();
};

function loadSlide() {
    mypaper.project.clear();
    var img_src = document.getElementById('slide-src').value;
    var img_type = img_src.split('.').pop();
    if (img_type  == 'svg') {
        mypaper.project.activeLayer.importSVG(img_src, {
            expandShapes: true,
            onLoad: function (svgitem, data) {
                var wscale = parseFloat(mypaper.canvas.offsetWidth) / svgitem.bounds.width;
                var hscale = parseFloat(mypaper.canvas.offsetHeight) / svgitem.bounds.height;
                svgitem.scale(wscale, hscale);
                var delta = new paper.Point(-svgitem.bounds.left, -svgitem.bounds.top);
                svgitem.translate(delta);
                scene =svgitem;
                console.log(scene);
                assignDataIDs(svgitem);
                showHiddenItems(svgitem);

                var msg = slideChangeMessage();;
                post(msg);
            }
        });
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

var curid;
function assignDataIDs(item, id) {
    if (!id) {
        id = 0;
        curid = 0;
    }
    item.data.id = id;
    id += 1;
    if (item.children) {
        for (var i = 0; i < item.children.length; i++) {
            id = assignDataIDs(item.children[i], id);
        }
    }
    curid++;
    return id;
};

function showHiddenItems(item) {
    if (!item.visible) {
        if (item.className == 'PointText') {
            item.fillColor.alpha = 0.3;
            item.visible = true;
        } else {
            item.opacity = 0.3;
            item.visible = true;
        }
        item.data.isHidden = true;


    }
    else {
        item.data.isHidden = false;
    }
    if (item.children) {
        for (var i = 0; i < item.children.length; i++) {
            showHiddenItems(item.children[i]);
        }
    }
};

var timer;
function inkOver(event) {
    // console.log(event.modifiers.control);
    if (event.modifiers.control) {
        toggleReveal(this);
    } else {
        // highlight a rectangle over the boundary of this item
        // assign target rect and activate draw tool
        currect = new paper.Path.Rectangle(this.bounds);
        currect.strokeColor = '#3366ff';
        currect.dashArray = [5, 3];
        currect.strokeWidth = 2;
        curtargetrect = this.bounds;
        activateDrawTool();
    }
};

function toggleReveal(event) {
    var item = this;
    if (item.data && item.data.isHidden) {
        item.data.isHidden = false;
        if (item.className == 'PointText') {
            item.fillColor.alpha = 1.0;
        }
        else {
            item.opacity = 1.0;
        }
    } else if (item.data && !item.data.isHidden){
        item.data.isHidden = true;
        if (item.className == 'PointText') {
            item.fillColor.alpha = 0.3;        }
        else {
            item.opacity = 0.3;
        }
    }
    else {
        console.log(item);
        return;
    }

    var msg = revealMessage(item);
    post(msg);
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
            if (childbox.contains(otherbox)) {
                childbox.insertBox(otherbox);
                return;
            }
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
    mypaper.verttool.activate();
};

function makeHorizontalSpace() {
    deactivateTargetListener();
    mypaper.horitool.activate();
};



function activateDefaultTool() {
    deactivateTargetListener();
    mypaper.defaulttool.activate();
};

function activateDrawTool() {
    mypaper.drawtool.activate();
};

function doneDrawing() {
  // erase target rect from canvas if present
    if (currect) {
        currect.remove();
        currect = null;
    }
    if (curtargetrect) {
        var fititem = fitItemsToRect(curtargetitems, curtargetrect);
        for (var i = 0; i < curtargetitems.length; i++) {
            curtargetitems[i].remove();
        }
        curtargetitems = [];
        scene.addChild(fititem);
        assignDataIDs(fititem, curid);
        var msg = drawMessage(fititem);
        post(msg);

    }
    // clear curtargetstrokes in audience view
    var msg = releaseTargetMessage();
    post(msg);
    activateDefaultTool();
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
    if (currect)
        curtargetrect = currect.bounds;
    activateDrawTool();
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
        var msg = moveMessage(item);
        post(msg);
        var itemsbelow = getItemsBelow(item, scene);
        for (var i = 0; i < itemsbelow.length; i++) {
            pushItemDown(itemsbelow[i], item);
        }
        paper.view.viewSize.width = Math.max(paper.view.viewSize.width, item.strokeBounds.right);
        paper.view.viewSize.height = Math.max(paper.view.viewSize.height, item.strokeBounds.height);
        msg = updateViewSize(paper.view);
        post(msg);
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

                var msg = moveMessage(siblings[i]);
                post(msg);
                paper.view.viewSize.width = Math.max(paper.view.viewSize.width, siblings[i].strokeBounds.right);
                paper.view.viewSize.height = Math.max(paper.view.viewSize.height, siblings[i].strokeBounds.bottom);
                msg = updateViewSize(paper.view);
                post(msg);
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
    if (currect) {
        curtargetrect = currect.bounds;
    }
    activateDrawTool();
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
        var msg = moveMessage(item);
        post(msg);
        var itemsright = getItemsRight(item, scene);
        for (var i = 0; i < itemsright.length; i++) {
            pushItemRight(itemsright[i], item);
        }
        paper.view.viewSize.width = Math.max(paper.view.viewSize.width, item.strokeBounds.right);
        paper.view.viewSize.height = Math.max(paper.view.viewSize.height, item.strokeBounds.height);
        msg = updateViewSize(paper.view);
        post(msg);
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

function popupAudienceView() {
    awindow = window.open('audienceview.html', 'Audience View');
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
                state: getState()
            } ), '*' );
        }, 500 );

        window.addEventListener( 'message', function( event ) {
            var data = JSON.parse( event.data );
            if( data && data.namespace === 'audience' && data.type === 'connected' ) {
                clearInterval( connectInterval );
                onConnected();
            }
        } );
    }

    function onConnected() {
        console.log("connected");
    }

    connect();
};

function getState() {
    return JSON.stringify(scene);
};

function post(msg) {
    if (awindow)
        awindow.postMessage( msg, '*' );
};

function releaseTargetMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'release-target',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search
    } );
    return msg;
};

function slideChangeMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-change',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        state: getState()
    } );
    return msg;

};

function revealMessage(item) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'toggle-reveal',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        item: item.data.id
    } );
    return msg;
};

function moveMessage(item) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'move-item',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        item: item.data.id,
        top: item.bounds.top,
        left: item.bounds.left,
        bottom: item.bounds.bottom,
        right: item.bounds.right
    } );
    return msg;
};

function updateViewSize(view) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'update-view',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        width: view.viewSize.width,
        height: view.viewSize.height
    } );
    return msg;
};

function drawMessage(item) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'draw',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(item)
    } );
    return msg;
};

var curstroke;
var curtargetrect;
var curtargetitems = [];
function drawStart(event) {
    curstroke = new paper.Path();
    curstroke.add(event.point);
    curstroke.strokeWidth = 2;
    curstroke.strokeColor = '#45a4fc';
};

function drawContinue(event) {
    curstroke.add(event.point);
    curstroke.smooth();
};

function drawEnd(event) {
    curstroke.add(event.point);
    curtargetitems.push(curstroke);
    var fititem = fitItemsToRect(curtargetitems, curtargetrect); //cloned and fit items
    var msg = drawMessage(fititem);
    fititem.remove();
    post(msg);
};

function fitItemsToRect(items, rect) {
    var group = new paper.Group();
    for (var i = 0; i < items.length; i++) {
        group.addChild(items[i].clone());
    }

    // scale items to fit rect
    var scale = 1.0;
    var origtop = group.bounds.top;
    var origleft = group.bounds.left;
    if (group.bounds.width > rect.width || group.bounds.height > rect.height) {
        scale = Math.min(rect.width/group.bounds.width, rect.height/group.bounds.height);
        group.scale(scale);
        // scale back to original top-left corner of group
        group.translate(origleft - group.bounds.left, origtop - group.bounds.top);
    }

    // move item if necessary
    var delta;
    if (group.bounds.left < rect.left) {
        delta = new paper.Point(rect.left - group.bounds.left, 0);
        group.translate(delta);
    }

    if (group.bounds.top < rect.top) {
        delta = new paper.Point(0, rect.top - group.bounds.top);
        group.translate(delta);
    }

    if (group.bounds.right > rect.right) {
        delta = new paper.Point(rect.right - group.bounds.right, 0);
        group.translate(delta);
    }

    if (group.bounds.bottom > rect.bottom) {
        delta = new paper.Point(0, rect.bottom - group.bounds.bottom);
        group.translate(delta);
    }
    return group;
};
