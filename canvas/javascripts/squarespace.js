/**
 * Created by hijungshin on 9/20/16.
 */

var scene;
var scenegraph;
var mypaper;
var slide;
var maxy = 5000;
var maxx = 5000;
var TOOL_MIN_DIST = 10;
var awindow;
var canvas;
var curslide;
var drawing = false;
var mindistx = 10;
var mindisty = 10;
var curcolor;
var curitem;


window.onload = function () {
    // setup paper canvas
    setupSlideCanvas();

    // enable drag and drop
    enableInsert();
};

function setupSlideCanvas() {
    slide = document.getElementById('slide');
    canvas = document.createElement('canvas');
    canvas.setAttribute('id', slide.id.replace('slide', 'canvas'));
    slide.appendChild(canvas);

    mypaper = new paper.PaperScope();
    mypaper.setup(canvas);

    mypaper.view.viewSize.width = 720;
    mypaper.view.viewSize.height = 540;
    canvas.height = 540;
    canvas.width = 720;
    slide.paper = mypaper;
    slide.canvas = canvas;
    canvas.paper = mypaper;
    canvas.slide = slide;
    mypaper.slide = slide;
    mypaper.canvas = canvas;

    // Default tool
    var defaulttool = new mypaper.Tool();
    mypaper.defaulttool = defaulttool;

    // Space tool
    var spacetool = new mypaper.Tool();
    spacetool.onMouseDown = makeSpaceStart;
    spacetool.onMouseDrag = makeSpaceContinue;
    spacetool.onMouseUp = makeSpaceEnd;
    spacetool.distanceThreshold = TOOL_MIN_DIST;

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

    var inserttool = new mypaper.Tool();
    inserttool.onMouseDown = insertStart;
    inserttool.onMouseDrag = insertContinue;
    inserttool.onMouseUp = insertEnd;
    mypaper.inserttool = inserttool;

    var revealpen = new mypaper.Tool();
    revealpen.onMouseDown = revealStart;
    revealpen.onMouseDrag = revealContinue;
    revealpen.onMouseUp = revealEnd;
    mypaper.revealpen = revealpen;

    // Load Slide Image
    loadSlide();
};

function prevSlide() {
    if (curslidenum > 0) {
        document.getElementById("slide-src").selectedIndex--;
        document.getElementById("slide-src").onchange();
    }
};

function nextSlide() {
    var maxpage = document.getElementById("slide-src").length;
    if (curslidenum < maxpage - 1) {
        document.getElementById("slide-src").selectedIndex++;
        document.getElementById("slide-src").onchange();
    }
};

function loadSlide() {
    spaper.project.clear();
    spaper.view.viewSize.width = SLIDE_W;
    spaper.view.viewSize.height = SLIDE_H;
    scanvas.width = SLIDE_W;
    scanvas.height = SLIDE_H;
    var slide_src = document.getElementById('slide-src').value;
    // SLIDE src has to be svg
    spaper.project.activeLayer.importSVG(slide_src, {
            expandShapes: true,
            applyMatrix: true,
            onLoad: function (svgitem, data) {
                var wscale = parseFloat(mypaper.canvas.width) / svgitem.bounds.width;
                var hscale = parseFloat(mypaper.canvas.height) / svgitem.bounds.height;
                svgitem.scale(wscale, hscale);
                var delta = new paper.Point(-svgitem.bounds.left, -svgitem.bounds.top);
                svgitem.translate(delta);
                scene =svgitem;
                assignDataIDs(svgitem);
                showHiddenItems(svgitem);
                var msg = slideChangeMessage();
                post(msg);
            }
        });

    curslidenum = document.getElementById("slide-src").selectedIndex;
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
        hideItem(item);
        if (!item.bbox) {
            item.bbox = new paper.Shape.Rectangle(item.bounds);
            item.bbox.item = item;
            item.bbox.fillColor = '#000000';
            item.bbox.opacity = 0;
        }
        item.bbox.onDoubleClick = toggleReveal;

        item.bbox.onMouseDown = function() {
            item.mousedownTime = setTimeout(function(){inkOver(item);}, 750);
        };
        item.bbox.onMouseUp = function() {
            clearTimeout(item.mousedownTime);
        };
    }
    else {
        item.data.isHidden = false;
        if (item.children) {
            for (var i = 0; i < item.children.length; i++) {
                showHiddenItems(item.children[i]);
            }
        }
    }
};

function activateAllItems() {
    for (var i = 0; i < scene.children.length; i++) {
        activateItem(scene.children[i]);
    }
};

function deactivateAllItems() {
    for (var i = 0; i < scene.children.length; i++) {
        deactivateItem(scene.children[i]);
    }
};

function activateItem(item) {
    if (!item.bbox) {
        item.bbox = new paper.Shape.Rectangle(item.bounds);
        item.bbox.item = item;
        item.bbox.fillColor = '#000000';
        item.bbox.opacity = 0;
    }
    item.bbox.onDoubleClick = toggleReveal;
    item.bbox.onMouseDown = function() {
        item.mousedownTime = setTimeout(function(){inkOver(item);}, 750);
    };
    item.bbox.onMouseUp = function() {
        clearTimeout(item.mousedownTime);
    };
};

function deactivateItem(item) {
    if (item.bbox) {
        item.bbox.onDoubleClick = null;
        item.bbox.onMouseDown = null;
        item.bbox.onMouseUp = null;
    }
};

var timer;
function inkOver(item) {
    item.bbox.onMouseDown = null;
    item.bbox.onDoubleClick = null;
    curitem = item;
    clearTimeout(item.mousedownTime);
    // highlight a rectangle over the boundary of this item
    // assign target rect and activate draw tool
    if (drawing) {
        doneDrawing();
    }
    currect = new paper.Path.Rectangle(item.bounds);
    currect.visible = true;
    currect.strokeColor = '#0000ff';
    currect.dashArray = [5, 3];
    currect.strokeWidth = 2;
    curtargetrect = item.bounds;
    curcolor = item.fillColor;
    activateDrawTool();
};

function hideItem(item) {
    if (item.className == 'Group') {
        for (var i = 0;i < item.children.length; i++) {
            item.children[i].visible = false;
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

function revealItem(item) {
    if (item.className == 'Group') {
        for (var i = 0; i < item.children.length; i++) {
            revealItem(item.children[i]);
        }
    }
    if (item.className == 'PointText') {
        item.fillColor.alpha = 1.0;
    }
    else {
        item.opacity = 1.0;
    }
    item.data.isHidden = false;
};

function toggleReveal(event) {
    var item = this.item;
    if (item.data && item.data.isHidden) {
        revealItem(item);
    } else if (item.data && !item.data.isHidden){ // Hide the item
        hideItem(item);
    }
    else {
        console.log("Item data.isHidden missing: " + item);
        return;
    }
    var msg = revealMessage(item);
    console.log(msg);
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

function makeSpace() {
    // deactivateTargetListener();
    if (drawing) doneDrawing();
    if (currect) {
        currect.remove();
        currect = null;
    }
    curcolor = null;
    mypaper.spaceTool.activate();
};

function makeVerticalSpace() {
    // deactivateTargetListener();
    if (drawing) doneDrawing();
    if (currect) {
        currect.remove();
        currect = null;
    }
    deactivateAllItems();
    mypaper.verttool.activate();

};

function makeHorizontalSpace() {
    // deactivateTargetListener();
    if (drawing) doneDrawing();
    if (currect) {
        currect.remove();
        currect = null;
    }
    mypaper.horitool.activate();

};

var selimg;
function activateInsertTool(event) {
    // deactivateTargetListener();
    if (drawing) doneDrawing();
    if (currect) {
        currect.remove();
        currect = null;
    }
    mypaper.inserttool.activate();
    selimg = event.currentTarget.getElementsByTagName('img')[0];
};

function activateDefaultTool() {
    // deactivateTargetListener();
    mypaper.defaulttool.activate();
};

function activateDrawTool() {
    mypaper.drawtool.activate();
    drawing = true;
};

function activateRevealPen() {
    mypaper.revealpen.activate();
};


function doneDrawing() {
  // erase target rect from canvas if present
    if (currect) {
        currect.remove();
        currect = null;
    }
    if (curitem) {
        console.log("curitem:" + curitem);
        if (curitem.bbox) curitem.bbox.remove();
        curitem.remove();
        curitem = null;
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
    curstroke = null;
    post(msg);
    drawing = false;
    activateDefaultTool();
};

var curline;
var startp;
var curslide;
var currect;
var timeout;
var itemsbelow;
var arr_itemsbelow;
var startexpand = false;

function makeSpaceStart(){};
function makeSpaceContinue(){};
function makeSpaceEnd(){};


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
        timeout = setTimeout(function(){
            startexpand = true;
            linepath.dashArray=[];
        }, 300);
    } else if (curline && startexpand) {
        // make thin rectangle
        clearTimeout(timeout);
        if (!currect) {
            var rectstart = curline.strokeBounds.topLeft;
            var rectend = new paper.Point(curline.strokeBounds.bottomRight.x, curline.strokeBounds.bottomRight.y + 0.1);
            curline.remove();
            currect = new paper.Path.Rectangle(rectstart, rectend);
            currect.strokeColor = '#3366ff';
            currect.strokeWidth = 2;
            currect.dashArray = [];

            // Get items that should move
            itemsbelow = new Set();
            getItemsBelow(currect, scene, itemsbelow);
            arr_itemsbelow = Array.from(itemsbelow);
            arr_itemsbelow.sort(compareTop);
        } else {
            var br = currect.strokeBounds.bottomRight;
            var tl = currect.strokeBounds.topLeft;
            var scaley = (event.point.y - tl.y) / (br.y - tl.y);
            if (scaley > 1.0) {
                console.log("Scaling");
                currect.scale(1.0, scaley, currect.bounds.topLeft);
            }
            if (arr_itemsbelow.length > 0) {
                deltay = currect.strokeBounds.bottom - arr_itemsbelow[0].bounds.top;
            }
            if (deltay > -mindisty) {
                for (var i = 0; i < arr_itemsbelow.length; i++) {
                    arr_itemsbelow[i].selected = true;
                    console.log("moving");
                    arr_itemsbelow[i].translate(new paper.Point(0, deltay + mindisty));
                    // item.boundary.translate(new paper.Point(0, deltay + mindisty));
                    if (arr_itemsbelow[i].bbox)
                        arr_itemsbelow[i].bbox.translate(new paper.Point(0, deltay+mindisty));

                }
            }
        }
    }
};

function vertLineEnd(event) {
    startexpand = false;
    if (currect)
        curtargetrect = currect.bounds;
    mypaper.project.deselectAll();
    activateDrawTool();
};

/** Get items below rect**/
function getItemsBelow(rect, parent, itemsbelow) {
    var tl = rect.strokeBounds.topLeft;
    var br = rect.strokeBounds.bottomRight;
    var areaBelow = new paper.Path.Rectangle(new paper.Point(tl.x, br.y), new paper.Point(br.x, maxy));
    if (!parent.children) return; // if there are no items to consider
    // console.log(itemsbelow);
    var items = parent.children;
    // var itemsbelow  = new Set();
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (areaBelow.bounds.intersects(item.bounds)) {
            if (rect.bounds.top <= item.bounds.top) {
                if (!itemsbelow.has(item)) {
                    itemsbelow.add(item);
                    getItemsBelow(item, parent, itemsbelow);
                }
            } else {
                getItemsBelow(rect, item, itemsbelow);
            }
        }
    }
    areaBelow.remove();
    // itemsbelow.sort(compareTop);
    return itemsbelow;
};

function pushItemDown(item, rect) {
    // var deltay = rect.strokeBounds.bottom - item.bounds.top;
    if (!item.boundary) {
        item.boundary = new paper.Path.Rectangle(item.bounds);
    }
    // item.boundary.selected = true;
    if (deltay > -mindisty) {
        // expandContainers(item, 0, deltay + mindisty);
        item.translate(new paper.Point(0, deltay+ mindisty));
        item.boundary.translate(new paper.Point(0, deltay + mindisty));
        if (item.bbox)
            item.bbox.translate(new paper.Point(0, deltay+mindisty));
        var msg = moveMessage(item);
        post(msg);
        // var itemsbelow = getItemsBelow(item, scene);
        // for (var i = 0; i < itemsbelow.length; i++) {
        //     pushItemDown(itemsbelow[i], item);
        // }
        paper.view.viewSize.width = Math.max(paper.view.viewSize.width, item.strokeBounds.right);
        paper.view.viewSize.height = Math.max(paper.view.viewSize.height, item.strokeBounds.height);
        // Also change canvas size
        // canvas.width = Math.max(canvas.width, paper.view.viewSize.width);
        // canvas.height = Math.max(canvas.height, paper.view.viewSize.height);
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
                console.log(paper.view.viewSize.height);
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
    mypaper.project.deselectAll();
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
    if (!item.boundary) {
        item.boundary = new paper.Path.Rectangle(item.bounds);
    }
    item.boundary.selected = true;
    if (deltax > -mindistx) {
        // expandContainers(item, deltax + mindistx, 0);
        item.translate(new paper.Point(deltax + mindistx, 0));
        item.boundary.translate(new paper.Point(deltax + mindistx, 0));
        if (item.bbox)
            item.bbox.translate(new paper.Point(deltax + mindistx, 0));
        var msg = moveMessage(item);
        post(msg);
        var itemsright = getItemsRight(item, scene);
        for (var i = 0; i < itemsright.length; i++) {
            pushItemRight(itemsright[i], item);
        }
        paper.view.viewSize.width = Math.max(paper.view.viewSize.width, item.strokeBounds.right);
        paper.view.viewSize.height = Math.max(paper.view.viewSize.height, item.strokeBounds.height);
        // Also change canvas size
        // canvas.width = Math.max(canvas.width, paper.view.viewSize.width);
        // canvas.height = Math.max(canvas.height, paper.view.viewSize.height);
        msg = updateViewSize(paper.view);
        post(msg);
    }
};

function compareLeft(item1, item2) {
    return item1.bounds.left - item2.bounds.left;
};

// function deactivateTargetListener() {
//     var speaker_targets = document.querySelectorAll('.target');
//     for (var i = 0; i < speaker_targets.length; i++) {
//         speaker_targets[i].style.pointerEvents = "none";
//     }
// };
//
// function activateTargetListener() {
//     var speaker_targets = document.querySelectorAll('.target');
//     for (var i = 0; i < speaker_targets.length; i++) {
//         speaker_targets[i].style.pointerEvents = "auto";
//     }
// };

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
            awindow.postMessage( slideChangeMessage(), '*' );
        }, 500 );
        // var connectInterval = setInterval( function() {
        //     awindow.postMessage( JSON.stringify( {
        //         namespace: 'liveprez',
        //         type: 'connect',
        //         url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        //         state: getState()
        //     } ), '*' );
        // }, 500 );

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
    if (awindow) {
        awindow.postMessage( msg, '*' );
    }
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
function drawStart(event){
    curstroke = new paper.Path();
    curstroke.add(event.point);
    curstroke.strokeWidth = 2;
    if (!curcolor) {
        curstroke.strokeColor = '#000000';
    } else {
        curstroke.strokeColor = curcolor;
        curstroke.strokeColor.alpha = 1.0;
    }
};

function drawContinue(event) {
    // console.log("draw continue");
    if (curstroke) {
        curstroke.add(event.point);
        curstroke.smooth();
    }
};

function drawEnd(event) {
    if (curstroke) {
        curstroke.add(event.point);
        curtargetitems.push(curstroke);
        var fititem = fitItemsToRect(curtargetitems, curtargetrect); //cloned and fit items
        var msg = drawMessage(fititem);
        fititem.remove();
        post(msg);
    }
};

var revealpath;
function revealStart(event) {
    if (!revealpath)
        revealpath = new paper.CompoundPath();
    revealpath.addChild(new paper.Path.Circle({
        center: event.point,
        radius: 10
    }));
    var group = new paper.Group(revealpath, scene);
    group.clipped = true;

};

function revealContinue(event) {
    revealpath.addChild(new paper.Path.Circle({
        center: event.point,
        radius: 10
    }));
};

function revealEnd(event) {

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

function enableInsert() {
    var images = document.getElementsByClassName('img-box');
    for (var i = 0; i < images.length; i++) {
        images[i].addEventListener('click', activateInsertTool, true);
    }
};

function insertStart(event) {
    startp = event.point;
};

var hori = false;
function insertContinue(event) {
    var endp = event.point;
    if (!curline) {
        // check if this is a horizontal line or a vertical line
        var dx = Math.abs(endp.x - startp.x);
        var dy = Math.abs(endp.y - startp.y);
        if (dx > dy) { // its a horizontal line
            endp = new paper.Point(endp.x, startp.y);
            curline = new paper.Path.Line(startp, endp);
            curline.strokeColor = '#3366ff';
            curline.dashArray = [5, 3];
            curline.strokeWidth = 2;
            hori = true;
        } else if (dx < dy) { // its a vertical line
            endp = new paper.Point(startp.x, endp.y);
            curline = new paper.Path.Line(startp, endp);
            curline.strokeColor = '#3366ff';
            curline.dashArray = [5, 3];
            curline.strokeWidth = 2;
            hori = false;
        }
    } else if (curline){
        var imgw, imgh, rectstart, rectend;
        if (hori) {
            endp = new paper.Point(event.point.x, startp.y);
            imgw = Math.abs(startp.x - endp.x);
            imgh = imgw * (selimg.naturalHeight/selimg.naturalWidth);
            rectstart = new paper.Point(Math.min(startp.x, endp.x), startp.y);
            rectend = new paper.Point(Math.max(startp.x, endp.x), startp.y + imgh);
            // imgposx = Math.min(startp.x, endp.x);
            // imgposy = startp.y;
        } else {
            endp = new paper.Point(startp.x, event.point.y);
            imgh = Math.abs(startp.y - endp.y);
            imgw = imgh * (selimg.naturalWidth/selimg.naturalHeight);
            rectstart = new paper.Point(startp.x, Math.min(startp.y, endp.y));
            rectend = new paper.Point(startp.x + imgw, Math.max(startp.y, endp.y));
             // imgposx = stratp.x
            // imgposy = Math.min(startp.y, endp.y);
        }
        if (currect)
            currect.remove();
        currect = new paper.Path.Rectangle(rectstart, rectend);
        currect.strokeColor = '#3366ff';
        currect.dashArray = [5,3];
        currect.strokeWidth = 2;
        curline.remove();
        var itemsbelow = getItemsBelow(currect, scene);
        for (var i = 0; i < itemsbelow.length ;i++) {
            // pushItemDown(itemsbelow[i], currect);
        }
        var itemsright = getItemsRight(currect, scene);
        for (var i = 0; i < itemsright.length; i++) {
            pushItemRight(itemsright[i], currect);
        }
    }
};

function insertEnd(event) {
    // insert the iamge at the currect position
    var img_src = selimg.src;
    var img_type = img_src.split('.').pop();
    if (img_type  == 'svg') {
        mypaper.project.activeLayer.importSVG(img_src, {
            expandShapes: true,
            applyMatrix: true,
            onLoad: function (insertitem, data) {
                var wscale = parseFloat(currect.bounds.width/insertitem.bounds.width);
                var hscale = parseFloat(currect.bounds.height/insertitem.bounds.height);
                insertitem.scale(wscale, hscale);
                var delta = new paper.Point(parseFloat(currect.bounds.left - insertitem.bounds.left),
                    parseFloat(currect.bounds.top - insertitem.bounds.top));
                insertitem.translate(delta);
                scene.addChild(insertitem);
                assignDataIDs(scene);
                // showHiddenItems(scene);
                var msg = slideChangeMessage();
                post(msg);
                curline = null;
                currect.remove();
                currect = null;
            }
        });
    }
    mypaper.project.deselectAll();
    activateDefaultTool();
};


