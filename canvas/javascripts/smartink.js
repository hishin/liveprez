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
var slidedeck;
var curitem = null;
var awindow;
var reveal = false;
var prevcolor = new paper.Color(0.5,0,1);
var slide_files;
var hammertime;

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
    $('#pen-tool').change(function(event) {
        if (!spaper) return;
        if (event.target.checked) {
            spaper.tool = null;
        } else {
            activateMaskTool(0);
        }
    });

    document.oncontextmenu = function(event) {
        event.preventDefault();
    };
    var parser = new DOMParser();
    popupAudienceView();
    document.getElementById('files').addEventListener('change', handleFileSelect, false);
    document.addEventListener("keyup", function(event) {
        handleKeyboardEvents(event);
    });

    document.addEventListener("pointerdown", function(event) {
        handlePointerEvents(event);
    });

    // // toolbox = document.getElementById("item-toolbox");
    // var buttons = document.getElementsByClassName('btn-tool');
    // for (var i = 0; i < buttons.length; i++) {
    //     buttons[i].addEventListener("click", function(event) {
    //         selectButton(event);
    //     });
    // }
};

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    // files is a FileList of File objects. Filter image files.
    slide_files = [];

    // var thumbdiv = document.getElementById('slide-thumbnails');
    for (var i = 0, f; f = files[i]; i++) {
        // var div = document.createElement('div');
        // var img = document.createElement('img');
        // img.setAttribute('id', 'thumb-'+i);
        // img.className += 'thumb';
        // div.appendChild(img);
        // thumbdiv.appendChild(div);
        if (!f.type.match('image.*')) {
            continue;
        }
        slide_files.push(f);
        // sort by name
        var reader = new FileReader();
        // reader.onload = function(theFile) {
        //     return function(e) {
        //         slide_files.push({name: theFile.name, url: e.target.result});
        //     };
        // }(f);
        //
        // // Read in the image file as a data URL.
        reader.readAsDataURL(f);
    }
    slide_files.sort(compareFileName);
    slidedeck = new SlideDeck(slide_files);
    numslides = slidedeck.n;
    setTimeout(function () {
        setupSlideCanvas(slidedeck);
        setupPaperTools();
    }, 1000);
};

function compareFileName(a,b) {
    var anum = parseInt(a.name.match(/\d+/)[0]);
    var bnum = parseInt(b.name.match(/\d+/)[0]);

    if (anum < bnum)
        return -1;
    if (anum > bnum)
        return 1;
    return 0;
};

function selectButton(event) {
    var btn = event.currentTarget;
    var btngroup = $(btn).closest('.btn-group');
    var btns = btngroup.children('.btn');
    for (var i = 0; i < btns.length; i++) {
        $(btns[i]).removeClass('selected');//.background = '#ffffff';
    }
    $(btn).addClass('selected');//.background = '#337ab7';
};

function handleKeyboardEvents(event) {
    switch(event.key) {
        case "ArrowLeft":
            prevSlide();
            break;
        case "ArrowRight":
            nextSlide();
            break;
        case "c":
            rotateStrokeColor(curstroke);
            break;
        default:
    }
};

function handlePointerEvents(event) {
    if(spaper && spaper.tool && spaper.tool.name == 'mask') {
        return;
    }
    if (event.pointerType == 'pen' || event.pointerType == 'mouse') {
        if (event.buttons == 2) {
            activateRevealPen();
        } else {
            activateInkTool();
        }
    } else if (spaper) {
        spaper.tool = null;
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
    if (!scanvas) {
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


        hammertime = new Hammer(document.getElementById('speaker-view'));
        hammertime.on('swipeleft', function(ev) {
            if (ev.pointerType == 'touch') {
                nextSlide();
            }
            return;
        });
        hammertime.on('swiperight', function(ev) {
           if (ev.pointerType == 'touch') {
               prevSlide();
           }
        });

        post(setupSlidesMessage());

    }
    else {
        curslidenum = 0;
    }

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
    inktool.name = 'ink';
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
    masktool.name = 'mask';
    masktool.onMouseDown = maskStart;
    masktool.onMouseDrag = maskContinue;
    masktool.onMouseUp = maskEnd;
    spaper.masktool = masktool;

    // Reveal tool
    var revealtool = new spaper.Tool();
    revealtool.name = 'reveal';
    revealtool.onMouseDown = revealStart;
    revealtool.onMouseDrag = revealContinue;
    revealtool.onMouseUp = revealEnd;
    spaper.revealtool = revealtool;

    console.log($('#pen-tool'));
    if (!document.getElementById('pen-tool').checked) {
        activateMaskTool();
    } else {
        activateInkTool();
    }
};

function loadSlide(slide) {
    // hide current slide
    if (curslide) {
        curslide.hide();
    }
    curslide = slide;
    // load or show new slide
    if (!slide.loaded) {
        if (!slide.itemlayer)
            slide.itemlayer = new paper.Layer();
        if (!slide.lowermask) {
            slide.lowermask = new paper.Layer();
        }
        slide.lowermask.insertAbove(slide.itemlayer);
        if (!slide.masklayer) {
            slide.masklayer = new paper.Layer();
        } else {
            slide.masklayer.visible = true;
        }
        slide.masklayer.insertAbove(slide.lowermask);
        if (!slide.inklayer) {
            slide.inklayer = new paper.Layer();
        }
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

function loadItem(item) {
    curitem = item;
    // if (item.type == 'image' && item.src) {
    if (!curslide.itemlayer) {
        var layer = new paper.Layer();
        curslide.itemlayer = layer;
    } else {
        curslide.itemlayer.activate();
    }
    // var wscale = parseFloat(CANVAS_W) / SLIDE_W;
    // var hscale = parseFloat(CANVAS_H) / SLIDE_H;

    var ext = item.src.split('.').pop();
    // if (ext == 'png' || ext == 'jpg' || ext == 'jpeg' || ext == 'bmp' || ext == 'PNG') {
    item.setRaster(new paper.Raster(item.src));
    item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
    // item.pborder.pivot = item.pborder.bounds.topLeft;
    // item.praster.pivot = item.pborder.bounds.topLeft;
    // item.pborder.scale(wscale, hscale, item.pborder.pivot);
    item.pborder.item = item;
    // item.pborder.strokeColor = 'black';
    // item.pborder.strokeWidth = 3;
    // item.pborder.dashArray = [3, 2];
    // item.pborder.opacity = 0.5;

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
    // item.activateMouseEvents();

    // } else if (ext == 'svg') {
    //     layer.importSVG(item.src, {
    //         expandShapes: true,
    //         applyMatrix: true,
    //         onLoad: function(svgitem, data) {
    //                 item.psvg = svgitem;
    //                 svgitem.item = item;
    //
    //                 item.pborder = new paper.Path.Rectangle(0, 0, item.width, item.height);
    //                 item.pborder.pivot = item.pborder.bounds.topLeft;
    //                 svgitem.pivot = item.pborder.bounds.topLeft;
    //                 item.pborder.scale(wscale, hscale, item.pborder.pivot);
    //                 item.pborder.item = item;
    //                 item.pborder.strokeColor = 'black';
    //                 item.pborder.strokeWidth = 3;
    //                 item.pborder.dashArray = [3, 2];
    //                 item.pborder.opacity = 0.5;
    //
    //                 item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
    //                 item.pbbox.pivot = item.pbbox.bounds.topLeft;
    //                 item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
    //                 item.pbbox.item = item;
    //                 item.pbbox.fillColor = 'red';
    //                 item.pbbox.opacity = 0;
    //
    //                 var delta = new paper.Point(item.left * wscale, item.top * hscale);
    //                 item.pborder.translate(delta);
    //                 item.pbbox.translate(delta);
    //                 svgitem.scale(item.width / svgitem.bounds.width * wscale, item.height / svgitem.bounds.height * hscale);
    //                 svgitem.translate(delta);
    //                 item.inkstyles = getInkStyle(item.psvg);
    //                 item.activateMouseEvents();
    //                 hideSpeakerOnlyItems(item.psvg);
    //         }
    //     });
    // }
    // }
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

function activateInkTool() {
    if (!spaper) return;
    spaper.inktool.activate();
    // deactivateItemMouseEvents();
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

    selectItem(event.point);
    curstroke = new paper.Path();
    if (!inkstyle) {
        curstroke.strokeWidth = 1;
        curstroke.fillStroke = null;
        curstroke.strokeColor = curitem.praster.annocolor;
    } else {
        curstroke.strokeWidth = inkstyle.strokeWidth;
        curstroke.fillColor = inkstyle.fillColor;
        curstroke.strokeColor = inkstyle.strokeColor;
    }
    curstroke.add(event.point);
    // curstroke.add(new paper.Point(event.point.x+0.1, event.point.y+0.1));
    post(inkMessage(curstroke, false));
};

function selectItem(point) {
    curitem = curslide.items[0];
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

        // get stroke color
        traceColor(curitem.praster, curstroke);
        // get stroke fillcolor
        if (isClosed(curstroke)) {
            closePath(curstroke);
            curstroke.fillColor = curitem.praster.getAverageColor(curstroke);
            curstroke.data.fillalpha = curstroke.fillColor.alpha;
            curstroke.fillColor.alpha = 0.5;
        }

        // get stroke width
        curstroke.strokeWidth = 2.0;
        post(inkMessage(curstroke, true));
        curstroke = null;

    }
};


function rotateStrokeColor(path) {
    if (!path) return;
    if (path.data.cn < path.data.colors.length - 1) {
        path.data.cn++;
        path.strokeColor = path.data.colors[path.data.cn].maxcolor;
    } else {
        path.strokeColor = prevcolor;
        path.data.free = true;
    }
    post(colorChangeMessage(path.strokeColor, path.data.free));

};

function activateMaskTool() {
    if (!spaper) return;
    spaper.masktool.activate();
    // deactivateItemMouseEvents();
};

function maskStart(event) {
    // Right mouse click: show context menu
    if (event.event.type.includes('touch')) {
        return;
    }
    if (event.event.button == 2) {
        revealMenu(document.getElementById('mask-context-menu'), event);
        return;
    }
    if (!curslide.inklayer) {
        var layer = new paper.Layer();
        curslide.inklayer = layer;
    } else {
        curslide.inklayer.activate();
    }
    selectItem(event.point);

    curstroke = new paper.Path();
    curstroke.add(event.point);
    // curstroke.add(new paper.Point(event.point.x+0.1, event.point.y+0.1));
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

function maskPropagate() {
    hideMenu(document.getElementById('mask-context-menu'));
    var slide;
    for (var i = curslidenum+1; i < slidedeck.n; i++) {
        slide = slidedeck.getSlide(i);
        if (slide.masklayer)
            slide.masklayer.remove();
        slide.masklayer = new paper.Layer();
        slide.masklayer.activate();
        var mitems = curslide.masklayer.getItems();
        for (var j = 0; j < mitems.length; j++) {
            var maskitem = new paper.Path(mitems[j].pathData);
            maskitem.fillColor = mitems[j].fillColor;
            maskitem.fillColor.alpha = 0.5;
        }
        slide.masklayer.visible = false;
        if (slide.lowermask)
            slide.masklayer.insertAbove(slide.lowermask);
        if (slide.inklayer)
            slide.masklayer.insertBelow(slide.inklayer);
    }
};

function activateRevealPen() {
    if (!spaper) return;
    spaper.revealtool.activate();
    // deactivateItemMouseEvents();
};

function revealStart(event) {
    if (!curslide.inklayer) {
        var layer = new paper.Layer();
        curslide.inklayer = layer;
    } else {
        curslide.inklayer.activate();
    }
    selectItem(event.point);

    curstroke = new paper.Path();
    curstroke.add(event.point);
    curstroke.strokeColor = 'yellow';
    curstroke.strokeColor.alpha = 0.8;
};

function revealContinue(event) {
    if (curstroke) {
        curstroke.add(event.point);
    }
    if (curbound) {
        curbound.remove();
    }
    curbound = new paper.Path.Line(curstroke.getPointAt(0), event.point);
    curbound.strokeWidth = 1;
    curbound.dashArray = [5,5];
    curbound.strokeColor = 'black';

};

function revealEnd(event) {
    if (curstroke) {
        curstroke.closePath();
        curstroke.fillColor = 'white';
        curstroke.fillColor.alpha = 1.0;
        curbound.remove();

        post(addMaskMessage(curstroke, false));
        if (curslide.masklayer.getItems().length > 0) {
            var maskitem = curslide.masklayer.getItems()[0];
            if (maskitem.className === 'Path' || maskitem.className === 'CompoundPath') {
                maskitem.subtract(curstroke);
            }
            maskitem.remove();

            // get inkstrokes inside this region
            var inkitems = curslide.inklayer.getItems({inside: curstroke.bounds});
            for (var i = 0; i < inkitems.length; i++) {
                if (!inkitems[i].data.free && isInside(curstroke, inkitems[i])) {
                    inkitems[i].onFrame = function() {
                        if (this.strokeColor.alpha <= 0) this.remove();
                        this.strokeColor.alpha -= 0.02;
                    };

                }
            }

        }
        var maskstroke = curstroke;
        maskstroke.onFrame = function() {
            if (this.fillColor.alpha <= 0) this.remove();
            this.fillColor.alpha -= 0.05;
        };
        // curstroke.remove();
    }
};



function isInside(apath, cpath) {
    var points = resample(cpath);
    var incount = 0;
    for (var i = 0; i < points.length; i++) {
        if (apath.contains(points[i])) incount++;
    }
    if (incount/points.length > 0.75) return true;
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
        free: inkstroke.data.free,
        fillalpha: inkstroke.data.fillalpha,
        end: end
    } );
    return msg;
};

function colorChangeMessage(color, free) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'color-change',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: color,
        free: free,
    } );
    return msg;
};

function lowerMaskMessage(maskstroke) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'lowermask',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(maskstroke)
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
        bgcolor: curitem.praster.bgcolor.toCSS(true)
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
    // deactivateItemMouseEvents();
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


function revealMenu(elem, event) {
    // console.log(event.event);
    elem.style.position = 'absolute';
    elem.style.left = event.event.x + 'px';
    elem.style.top = event.event.y + 'px';
    elem.style.display = 'block';
};

function hideMenu(elem) {
    elem.style.display = 'none';
};