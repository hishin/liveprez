/**
 * Created by hijung on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W = 960;
var SLIDE_H = 720;
// var CANVAS_W = 960;
// var CANVAS_H = 720;
var aspectratio; // matches the slide aspect ratio
var scale;
var img_w;
var numslides;
var curslidenum = 0;
var curslide;
var toolbox;
var inkstyle = null;
var SLIDE_URL = "slidedeck.html";
// var DEFAULT_COLOR = '#000000';
var slidedeck;
var curitem = null;
var awindow;
var reveal = false;
var prevcolor = new paper.Color(0,0,0);
// var dollar = new DollarRecognizer();

function preloadImages(srcs) {
    if (!preloadImages.cache) {
        preloadImages.cache = [];
    }
    var img;
    for (var i = 0; i < srcs.length; i++) {
        img = new Image();
        img.src = srcs[i];
        // assume slide-deck has fixed aspect ratio
        img.onload = function(){
            if (!aspectratio) {
                aspectratio = this.height/this.width;
                // console.log(aspectratio);
                img_w = this.width;
                SLIDE_W = $(window).width() * 0.75;
                SLIDE_H = SLIDE_W * aspectratio;
                if (SLIDE_H > $(window).height()) {
                    SLIDE_H = $(window).height() * 0.75;
                    SLIDE_W = SLIDE_H/aspectratio;
                }
                scale = img_w/SLIDE_W;
            }
        };

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
    var buttons = document.getElementsByClassName('btn-tool');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", function(event) {
            selectButton(event);
        });
    }
};

function selectButton(event) {
    var btn = event.currentTarget;
    var btngroup = $(btn).closest('.btn-group');
    var btns = btngroup.children('.btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].style.background = '#ffffff';
    }
    btn.style.background = '#337ab7';
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

    resizeCanvas(SLIDE_W, SLIDE_H);

    sslide.paper = spaper;
    sslide.canvas = scanvas;
    scanvas.paper = spaper;
    scanvas.slide = sslide;
    spaper.slide = sslide;
    spaper.canvas = scanvas;

    post(setupSlidesMessage());

    loadSlide(slidedeck.getSlide(curslidenum));
};

function resizeCanvas(width, height) {
    sslide.style.width = width +'px';
    sslide.style.height = height +'px';
    scanvas.width = width;
    scanvas.height = height;
    spaper.view.viewSize.width = width;
    spaper.view.viewSize.height = height;
    scale = img_w/width;
    // console.log("scale: " + scale);
    post(resizeMessage());
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
    // spacetool.onMouseUp = makeSpaceEnd;
    spaper.spacetool = spacetool;

    // Mask tool
    var masktool = new spaper.Tool();
    masktool.onMouseDown = maskStart;
    masktool.onMouseDrag = maskContinue;
    masktool.onMouseUp = maskEnd;
    spaper.masktool = masktool;

    // Reveal tool
    var revealtool = new spaper.Tool();
    revealtool.onMouseDown = revealStart;
    revealtool.onMouseDrag = revealContinue;
    revealtool.onMouseUp = revealEnd;
    spaper.revealtool = revealtool;

    activateInkTool();
};

function loadSlide(slide) {
    // hide current slide
    if (curslide) {
        curslide.hide();
    }
    curslide = slide;
    // load or show new slide
    if (!slide.loaded) {
        slide.itemlayer = new paper.Layer();
        slide.lowermask = new paper.Layer();
        slide.lowermask.insertAbove(slide.itemlayer);
        slide.masklayer = new paper.Layer();
        slide.masklayer.insertAbove(slide.lowermask);
        slide.inklayer = new paper.Layer();
        slide.inklayer.insertAbove(slide.masklayer);
        for (var i = 0; i < slide.nitems; i++) {
            var item = slide.items[i];
            loadItem(item);
            slide.loaded = true;
        }
    } else {
        slide.show();
    }
    spaper.view.update();
    post(slideChangeMessage());
};

function setMask() {
    if (!curslide.masklayer) {
        curslide.masklayer = new paper.Layer();
        curslide.masklayer.insertAbove(curslide.itemlayer);
    }
    activateMaskTool();
};

function loadItem(item){
    curitem = item;
    if (item.type == 'image' && item.src) {
        if (!curslide.itemlayer) {
            var layer = new paper.Layer();
            curslide.itemlayer = layer;
        } else {
            curslide.itemlayer.activate();
        }
        // var wscale = parseFloat(CANVAS_W) / SLIDE_W;
        // var hscale = parseFloat(CANVAS_H) / SLIDE_H;

        var ext = item.src.split('.').pop();
        if (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'bmp') {
            item.setRaster(new paper.Raster(item.src));
            item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
            // item.pborder.pivot = item.pborder.bounds.topLeft;
            // item.praster.pivot = item.pborder.bounds.topLeft;
            // item.pborder.scale(wscale, hscale, item.pborder.pivot);
            item.pborder.item = item;
            item.pborder.strokeColor = 'black';
            item.pborder.strokeWidth = 3;
            item.pborder.dashArray = [3, 2];
            item.pborder.opacity = 0.5;

            item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
            // item.pbbox.pivot = item.pbbox.bounds.topLeft;
            // item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
            item.pbbox.item = item;
            item.pbbox.fillColor = 'red';
            item.pbbox.opacity = 0;

            // var delta = new paper.Point(item.left * wscale, item.top * hscale);
            item.pborder.fitBounds(paper.view.bounds, true);
            item.pbbox.fitBounds(paper.view.bounds, true);
            item.praster.fitBounds(paper.view.bounds, true);
            item.praster.opacity = 1.0;
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
        if (item.pbbox) {
            item.pbbox.onMouseEnter = null;
            item.pbbox.onMouseLeave = null;
            item.pbbox.onClick = null;
        }
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
    loadSlide(slidedeck.getSlide(curslidenum));
};

function nextSlide() {
    if (curslidenum < numslides -1)
        curslidenum ++;
    loadSlide(slidedeck.getSlide(curslidenum));
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
            item.praster.opacity = 1.0;
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
var curbound;
function inkStart(event){

    if (!curslide.inklayer) {
        var layer = new paper.Layer();
        curslide.inklayer = layer;
    } else {
        curslide.inklayer.activate();
    }

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
    curstroke.add(new paper.Point(event.point.x+0.1, event.point.y+0.1));
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
        // curstroke.simplify(0.5);
        // curstroke.smooth({type: 'continuous'});//(1.0);
        var newstroke;
        if (curitem.praster) {
            // newstroke = trace(curstroke, curitem.praster.getImageData(curitem.praster.bounds), 10);
            newstroke = curstroke;
            newstroke = traceColor(curitem.praster, newstroke);

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
        newstroke.strokeWidth = 1.0;
        curstroke.remove();

        post(inkMessage(newstroke, true));


        curslide.lowermask.activate();
        var maskstroke = new paper.Path(newstroke.pathData);
        maskstroke.strokeWidth = 10.0;
        maskstroke.strokeColor = curitem.praster.bgcolor;
        post(lowerMaskMessage(maskstroke));
    }
};

function activateMaskTool() {
    spaper.masktool.activate();
    deactivateItemMouseEvents();
};

function maskStart(event) {
    if (!curslide.inklayer) {
        var layer = new paper.Layer();
        curslide.inklayer = layer;
    } else {
        curslide.inklayer.activate();
    }
    selectItem(event.point);

    curstroke = new paper.Path();
    curstroke.add(event.point);
    curstroke.add(new paper.Point(event.point.x+0.1, event.point.y+0.1));
    curstroke.strokeWidth = 5;
    curstroke.strokeColor = 'black';

    curbound = new paper.Path.Rectangle(curstroke.strokeBounds);
    curbound.strokeWidth = 1;
    curbound.dashArray = [5,5];
    curbound.strokeColor = 'black';
};

function maskContinue(event) {
    if (curstroke) {
        curstroke.add(event.point);
    }
    if (curbound) {
        curbound.remove();
        curbound = new paper.Path.Rectangle(curstroke.strokeBounds);
        curbound.strokeWidth = 1;
        curbound.dashArray = [5,5];
        curbound.strokeColor = 'black';
    }
};

function maskEnd(event) {
    if (curstroke) {
        curslide.masklayer.activate();
        var maskbox = new paper.Path.Rectangle(curstroke.strokeBounds);
        maskbox.fillColor = 'grey';
        maskbox.fillColor.alpha = 0.5;
        post(addMaskMessage(maskbox, true));
        if (curslide.masklayer.getItems().length > 0) {
            var maskitem = curslide.masklayer.getItems()[0];
            maskitem.unite(maskbox);
            maskitem.remove();
            maskbox.remove();
        }
        curstroke.remove();
        curbound.remove();
    }
};


function activateRevealPen() {
    spaper.revealtool.activate();
    deactivateItemMouseEvents();
};

function revealStart(event) {
    maskStart(event);
    curstroke.strokeColor = 'yellow';
    curstroke.strokeColor.alpha = 0.8;
};

function revealContinue(event) {
    maskContinue(event);
};

function revealEnd(event) {
    if (curstroke) {
        var maskbox = new paper.Path.Rectangle(curstroke.strokeBounds);
        post(addMaskMessage(maskbox, false));

        if (curslide.masklayer.getItems().length > 0) {
            var maskitem = curslide.masklayer.getItems()[0];
            if (maskitem.className === 'Path' || maskitem.className === 'CompoundPath') {
                maskitem.subtract(maskbox);
            }
            maskitem.remove();
            maskbox.remove();
        }
        curstroke.remove();
        curbound.remove();
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

function lowerMaskMessage(maskstroke) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'lowermask',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(maskstroke),
    } );
    return msg;
};

function addMaskMessage(pathitem, add) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'mask',
        add: add,
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(pathitem),
        bgcolor: JSON.stringify(curitem.praster.bgcolor.toCSS(true))
    } );
    return msg;
};

function revealSlideMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-reveal',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search
    } );
    return msg;
};

function resizeMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-resize',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        width: SLIDE_W,
        height: SLIDE_H
    } );
    return msg;
};

function setupSlidesMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'slide-setup',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        num: slidedeck.slides.length
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
