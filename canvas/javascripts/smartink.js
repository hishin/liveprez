/**
 * Created by hijun on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W = 960;
var SLIDE_H = 720;
var CANVAS_W = 960;
var CANVAS_H = 720;
var numslides;
var curslidenum = 0;
var curslide;
var toolbox;
var inkstyle = null;
var SLIDE_URL = "slidedeck.html";
var DEFAULT_COLOR = '#000000';
var slidedeck;
var curitem = null;
var awindow;
var reveal = false;
var prevcolor = new paper.Color(0,0,0);
var dollar = new DollarRecognizer();

function preloadImages(srcs) {
    if (!preloadImages.cache) {
        preloadImages.cache = [];
    }
    var img;
    for (var i = 0; i < srcs.length; i++) {
        img = new Image();
        img.src = srcs[i];
        preloadImages.cache.push(img);
    }
};

window.onload = function () {
    var parser = new DOMParser();
    popupAudienceView();
    $.get(SLIDE_URL, function( data ) {
        var html = parser.parseFromString(data, 'text/html');

        // Preload images to cache
        var img_srcs = [];
        var images = html.getElementsByTagName('img');
        for (var i = 0; i < images.length; i++) {
            img_srcs.push(images[i].dataset.src);
        }
        preloadImages(img_srcs);
        slidedeck = new SlideDeck(html.getElementsByClassName('slides')[0]);
        numslides = slidedeck.n;
        setTimeout(function () {
            setupSlideCanvas(slidedeck);
            setupPaperTools();
        }, 1000);

    });
    document.addEventListener("keyup", function(event) {
        handleKeyboardEvents(event);
    });
    toolbox = document.getElementById("item-toolbox");
};

function handleKeyboardEvents(event) {
    switch(event.key) {
        case "ArrowLeft":
            prevSlide();
            break;
        case "ArrowRight":
            nextSlide();
            break;
    }
};

function popupAudienceView() {
    awindow = window.open('smartaudience.html', 'Audience View');
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
                url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search            } ), '*' );
        }, 500 );

        window.addEventListener( 'message', function( event ) {
            var data = JSON.parse( event.data );
            if( data && data.namespace === 'audience' && data.type === 'connected' ) {
                clearInterval( connectInterval );
            }
        } );
    }

    connect();
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

    curslide = slidedeck.getSlide(curslidenum);
    loadSlide(curslide);
};

function setupPaperTools() {
    // Default tool
    var defaulttool = new spaper.Tool();
    spaper.defaulttool = defaulttool;

    // Ink tool
    var inktool = new spaper.Tool();
    inktool.onMouseDown = inkStart;
    inktool.onMouseDrag = inkContinue;
    inktool.onMouseUp = inkEnd;
    spaper.inktool = inktool;

    // Space tool
    var spacetool = new spaper.Tool();
    spacetool.onMouseDown = makeSpaceStart;
    spacetool.onMouseDrag = makeSpaceContinue;
    spaper.spacetool = spacetool;

    activateInkTool();
};

function loadSlide(slide) {
    spaper.project.clear();
    spaper.view.viewSize.width = CANVAS_W;
    spaper.view.viewSize.height = CANVAS_H;
    scanvas.width = CANVAS_W;
    scanvas.height = CANVAS_H;

    for (var i = 0; i < slide.nitems; i++) {
        var item = slide.items[i];
        loadItem(item);
    }
    spaper.view.update();
    post(slideChangeMessage());
};

function loadItem(item){
    if (item.type == 'image' && item.src) {
        var layer = new paper.Layer();
        var wscale = parseFloat(CANVAS_W) / SLIDE_W;
        var hscale = parseFloat(CANVAS_H) / SLIDE_H;

        var ext = item.src.split('.').pop();
        if (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'bmp') {
            item.setRaster(new paper.Raster(item.src));
            item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
            item.pborder.pivot = item.pborder.bounds.topLeft;
            // item.praster.pivot = item.pborder.bounds.topLeft;
            item.pborder.scale(wscale, hscale, item.pborder.pivot);
            item.pborder.item = item;
            item.pborder.strokeColor = 'black';
            item.pborder.strokeWidth = 3;
            item.pborder.dashArray = [3, 2];
            item.pborder.opacity = 0.5;

            item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
            item.pbbox.pivot = item.pbbox.bounds.topLeft;
            item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
            item.pbbox.item = item;
            item.pbbox.fillColor = 'red';
            item.pbbox.opacity = 0;

            var delta = new paper.Point(item.left * wscale, item.top * hscale);
            item.pborder.translate(delta);
            item.pbbox.translate(delta);
            item.praster.fitBounds(paper.view.bounds, true);
            item.praster.opacity = 0.5;
            item.activateMouseEvents();

        } else if (ext == 'svg') {
            layer.importSVG(item.src, {
                expandShapes: true,
                applyMatrix: true,
                onLoad: function(svgitem, data) {
                        item.psvg = svgitem;
                        svgitem.item = item;

                        item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
                        item.pborder.pivot = item.pborder.bounds.topLeft;
                        svgitem.pivot = item.pborder.bounds.topLeft;
                        item.pborder.scale(wscale, hscale, item.pborder.pivot);
                        item.pborder.item = item;
                        item.pborder.strokeColor = 'black';
                        item.pborder.strokeWidth = 3;
                        item.pborder.dashArray = [3, 2];
                        item.pborder.opacity = 0.5;

                        item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
                        item.pbbox.pivot = item.pbbox.bounds.topLeft;
                        item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
                        item.pbbox.item = item;
                        item.pbbox.fillColor = 'red';
                        item.pbbox.opacity = 0;

                        var delta = new paper.Point(item.left * wscale, item.top * hscale);
                        item.pborder.translate(delta);
                        item.pbbox.translate(delta);
                        svgitem.scale(item.width / svgitem.bounds.width * wscale, item.height / svgitem.bounds.height * hscale);
                        svgitem.translate(delta);
                        item.inkstyles = getInkStyle(item.psvg);
                        item.activateMouseEvents();
                        hideSpeakerOnlyItems(item.psvg);
                }
            });
        }
    }
};

function hideSpeakerOnlyItems(pitem) {
    if (!pitem.visible) {
        pitem.data.speakeronly = true;
        makeSemiTransparent(pitem);
    } else {
        pitem.data.speakeronly = false;
        if (pitem.children) {
            for (var i = 0; i < pitem.children.length; i++) {
                hideSpeakerOnlyItems(pitem.children[i]);
            }
        }
    }
};

function makeSemiTransparent(pitem) {
    if (pitem.children) {
        for (var i = 0; i < pitem.children.length; i++) {
            // pitem.children[i].visible = false;
            makeSemiTransparent(pitem.children[i]);
        }
    } else {
        if (pitem.fillColor)
            pitem.fillColor.alpha = 0.5;
        if (pitem.strokeColor)
            pitem.strokeColor.alpha = 0.5;
    }
    pitem.visible = true;
};

function revealItem(pitem) {
    if (pitem.children) {
        for (var i = 0; i < pitem.children.length; i++) {
            pitem.children[i].visible = true;
            revealItem(pitem.children[i]);
        }
    } else {
        if (pitem.fillColor)
            pitem.fillColor.alpha = 1.0;
        if (pitem.strokeColor)
            pitem.strokeColor.alpha = 1.0;
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
    else if (!pitem.clipMask ){
        // Add only if same style does not exist
        var inkstyle = new InkStyle(pitem);
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

function openItem(item) {
    curitem = item;
    item.pborder.strokeWidth = 3;
    item.pborder.opacity = 1.0;
    // activateInkTool();
    // var tools = toolbox.getElementsByTagName("UL")[0];
    // tools.innerHTML = "";
    // for (var i = 0; i < item.inkstyles.length; i++) {
    //     var inkstyle = item.inkstyles[i];
    //     var li = inkstyle.listElement();
    //     tools.appendChild(li);
    // }
    //
    // var li = document.createElement("li");
    // li.setAttribute('id', 'close-item');
    // li.appendChild(document.createTextNode('Done'));
    // li.addEventListener('click', function() {closeTools(item);});
    // tools.appendChild(li);

};

function closeTools(item) {
    var tools = toolbox.getElementsByTagName("UL")[0];
    tools.innerHTML = "";
    for (var i = 0; i < curslide.nitems; i++) {
        curslide.items[i].activateMouseEvents();
    }
    item.close();
    spaper.defaulttool.activate();
};

function prevSlide() {
    if (curslidenum > 0) {
        curslidenum--;
    }
    curslide = slidedeck.getSlide(curslidenum);
    loadSlide(curslide);
};

function nextSlide() {
    if (curslidenum < numslides -1)
        curslidenum ++;
    curslide = slidedeck.getSlide(curslidenum);
    loadSlide(curslide);
};

function revealSlide() {
    if (!reveal) {
        var item;
        for (var i = 0; i < curslide.nitems; i++) {
            item = curslide.items[i];
            if (item.psvg) {
                revealItem(item.psvg);
            } else if (item.praster) {
                item.praster.opacity = 1.0;
            }
        }
        reveal = true;
    } else {
        hideSlide();
    }
    post(revealSlideMessage());
};

function hideSlide() {
    var item;
    for (var i = 0; i < curslide.nitems; i++) {
        item = curslide.items[i];
        if (item.psvg) {
            hideSpeakerOnlyItems(item.psvg);
        } else if (item.praster) {
            item.praster.opacity = 0.5;
        }
    }
    reveal = false;
};

function setInkStyle(event) {
    inkstyle = event.target.inkstyle;
    activateInkTool();
};

function activateInkTool() {
    spaper.inktool.activate();
    deactivateItemMouseEvents();
};

var curstroke;
var curtargetrect;
var curtargetitems = [];
function inkStart(event){
    // if cursor is inside item, select as curitem
    selectItem(event.point);

    curstroke = new paper.Path();
    if (!inkstyle) {
        curstroke.strokeWidth = 1;
        curstroke.fillStroke = null;
        curstroke.strokeColor = 'black';
    } else {
        curstroke.strokeWidth = inkstyle.strokeWidth;
        curstroke.fillColor = inkstyle.fillColor;
        curstroke.strokeColor = inkstyle.strokeColor;
    }
    curstroke.add(event.point);
    post(inkMessage(curstroke, false));
};

function selectItem(point) {
    for (var i = 0; i < curslide.nitems; i++) {
        var item = curslide.items[i];
        if (item.pbbox.contains(point)) {
            curitem = item;
            return;
        }
    }
    curitem = null;
};

function inkContinue(event) {
    if (curstroke) {
        curstroke.add(event.point);
        curstroke.smooth();
        post(inkMessage(curstroke, false));
    }
};

function inkEnd(event) {
    if (curstroke) {
        curstroke.add(event.point);
        // var samples = resample(curstroke);
        // var points = new Array();
        // for (var i = 0; i < curstroke.length; i++) {
        //     points.push(new Point(curstroke.getPointAt(i).x, curstroke.getPointAt(i).y));
        // }
        // console.log(points.length);
        // var score = dollar.Recognize(points, false);
        // console.log(score);
        var newstroke;
        if (curitem.praster) {
            // newstroke = trace(curstroke, curitem.praster.getImageData(curitem.praster.bounds), 10);
            newstroke = curstroke;
            newstroke = traceColor(curitem.praster, newstroke);
            var bgrect = new paper.Shape.Rectangle(newstroke.strokeBounds);
            bgrect.fillColor = curitem.praster.bgcolor;
            bgrect.moveAbove(curitem.praster);
        } else if (curitem.psvg) {
            var closest = findClosestPath(curstroke, curitem.psvg);
            newstroke = interpolate(curstroke, closest[1], 1.0);
            newstroke.style = closest[1].style;
            if (newstroke.fillColor) {
                newstroke.fillColor.alpha = 1.0;
            }
            if (newstroke.strokeColor) {
                newstroke.strokeColor.alpha = 1.0;
            }
        } else {
            newstroke = new paper.Path(curstroke.pathData);
        }
        prevcolor = newstroke.strokeColor;
        newstroke.strokeWidth = 3;
        curstroke.remove();
        post(inkMessage(newstroke, true));

    }
};

function slideChangeMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-change',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        state: getSlideState()
    } );
    return msg;

};

function getSlideState() {
    return JSON.stringify(curslide);
};

function inkMessage(inkstroke, end) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'ink',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(inkstroke),
        end: end
    } );
    return msg;
};

function revealSlideMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-reveal',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
    } );
    return msg;
};

function post(msg) {
    if (awindow) {
        awindow.postMessage( msg, '*' );
    }
};


function activateSpaceTool() {
    deactivateItemMouseEvents();
    spaper.spacetool.activate();
};

var horizontal = false;
var line_start;
var line_end;
var spaceline;
var spacerect;
var expand = false;
var timeout;
function makeSpaceStart(event) {
    line_start = event.point;
};
function makeSpaceContinue(event) {
    line_end = event.point;
    if (!expand) { //
        var dx = Math.abs(line_end.x - line_start.x);
        var dy = Math.abs(line_end.y - line_start.y);
        if (dx > dy) {
            line_end.y = line_start.y;
            horizontal = true;
        }
        else {
            line_end.x = line_start.x;
            horizontal = false;
        }
        if (spaceline)
            spaceline.remove();
        spaceline = new paper.Path.Line(line_start, line_end);
        spaceline.strokeColor = '#ff0000';
        spaceline.dashArray = [5,5];
        spaceline.strokeWidth = 2;
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(function() {
            expand = true;
            spaceline.dashArray = [];
        }, 300);
    } else {
        clearTimeout(timeout);
        if (!spacerect) {
            var rect_start = spaceline.strokeBounds.topLeft;
            var rect_end = spaceline.strokeBounds.bottomRight;
            spaceline.remove();
            spacerect = new paper.Path.Rectangle(rect_start, rect_end);
            spacerect.strokeColor = '#ff0000';
            spacerect.strokeWidth = 2;
        } else {
            if (horizontal) {
                if (event.point.y > (line_start.y + spacerect.strokeWidth/2.0)) { // expand below
                    spacerect.bounds.bottom = event.point.y;
                    spacerect.bounds.top = line_start.y + spacerect.strokeWidth/2.0;
                } else if (event.point.y < (line_start.y - spacerect.strokeWidth/2.0)) { // expand above
                    spacerect.bounds.top = event.point.y;
                    spacerect.bounds.bottom = line_start.y + spacerect.strokeWidth/2.0;
                }
            } else { // vertical
                if (event.point.x > (line_start.x + spacerect.strokeWidth/2.0)) { // expand right
                    spacerect.bounds.right = event.point.x;
                    spacerect.bounds.left = line_start.x + spacerect.strokeWidth/2.0;
                } else if (event.point.x < (line_start.x - spacerect.strokeWidth/2.0)) { // expand left
                    spacerect.bounds.left = event.point.x;
                    spacerect.bounds.right = line_start.x - spacerect.strokeWidth/2.0;
                }
            }
        }
    }
};
