/**
 * Created by hijung on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W;
var SLIDE_H;
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
var bgitem = null;
var awindow;
var reveal = false;
var prevcolor = new paper.Color(0.5,0,1);
var slide_files;
var viewhammer;
var canvashammer;
var pinchcenter;
var oldzoom;
var oldcenter;
var prevpinchscale;
var autostyle = true;
var default_palette = ['rgb(0,0,0)', 'rgb(255,255,255)', 'rgb(255,0,0)', 'rgb(0,255,0)', 'rgb(0,0,255)'];
var DIST2FG_THRES_A = 0.02;
var DIST2FG_THRES_B = 5.0;
var COLOR_THRES_A = 1/15;
var pen = 0; // eraser = 1, space = 2
var strokeid = 0;
var RIGHT = 0;
var LEFT = 1;
var BOTTOM = 2;
var TOP = 3;

function preloadImages(srcs) {
    if (!preloadImages.cache) {
        preloadImages.cache = [];
    }
    var img;
    var MENU_H = 32;
    for (var i = 0; i < srcs.length; i++) {
        img = new Image();
        img.src = srcs[i];
        // assume slide-deck has fixed aspect ratio
        img.onload = function(){
            if (!aspectratio) {
                aspectratio = this.height/this.width;
                img_w = this.width;
                SLIDE_H = $(window).height() - MENU_H;
                SLIDE_W = SLIDE_H/apsectratio;
                if (SLIDE_W > $(window).width()) {
                    SLIDE_W = $(window).width();
                    SLIDE_H = SLIDE_W*aspectratio;
                }
                // scale = img_w/SLIDE_W;
            }
        };

        preloadImages.cache.push(img);
    }
};

window.onload = function () {
    document.getElementById('speaker-view').addEventListener('touchstart', function(event){
        if (event.target.tagName == 'DIV') {
            event.preventDefault();
        }
    }, {passive:false});

    document.oncontextmenu = function(event) {
        event.preventDefault();
    };
    popupAudienceView();

    document.getElementById('download_link').addEventListener('click', saveCanvasImage, false);
    document.getElementById('files').addEventListener('change', handleFileSelect, false);
    document.addEventListener("keyup", function(event) {
        handleKeyboardEvents(event);
    });

    document.addEventListener("pointerdown", function(event) {
       handlePointerEvents(event);
    });

    // $('#strokec').on('move.spectrum', function (e, color) {
    //     if (autostyle && curstroke) {
    //         curstroke.strokeColor = color.toHexString();
    //         post(colorChangeMessage(curstroke.strokeColor, curstroke.data.free));
    //     }
    // });
    //
    // $('#auto-style').change(function(event) {
    //     autostyle = event.target.checked;
    //     if (autostyle) {
    //         $('#strokec').spectrum("set", '');
    //     }
    // });

    // setColorPalette([]);

    // $('.slider').slider(
    //     {
    //         tooltip_position:'bottom',
    //         formatter: function(value) {
    //             return 'Current value: ' + value;
    //         }
    //     }
    // );
};

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    // files is a FileList of File objects. Filter image files.
    slide_files = [];

    // var thumbdiv = document.getElementById('slide-thumbnails');
    for (var i = 0, f; f = files[i]; i++) {

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
    var anum = parseFloat(a.name.match(/\d+(\.\d+)?/)[0]);
    var bnum = parseFloat(b.name.match(/\d+(\.\d+)?/)[0]);

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
        case "s":
            printStrokeStyles();
            showMenu(document.getElementById('download_link'));
            break;
        default:
    }
};

function handlePointerEvents(event) {

    if (event.pointerType == 'pen' || event.pointerType == 'mouse' || event.pointerType == 'ink') {
        if (pen == 0) {
            activateInkTool();
        }
        else if (pen == 1) {
            activateEraserTool();
        }


    } else if (spaper){
        spaper.tool = null;
    }
};

function selectPen() {
    $('#pen').addClass('checked');
    $('#eraser').removeClass('checked');
    pen = 0;
};

function selectEraser() {
    $('#eraser').addClass('checked');
    $('#pen').removeClass('checked');
    pen = 1;
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
        scanvas.setAttribute('keepalive', true);
        scanvas.setAttribute('data-paper-keepalive', true);
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

        // viewhammer = new Hammer(document.getElementById('speaker-view'));
        // viewhammer.get('swipe').set({velocity: 0.5});
        // viewhammer.on('swipeleft', function(ev) {
        //     ev.preventDefault();
        //     if (ev.pointerType == 'touch') {
        //         nextSlide();
        //     }
        //     return;
        // });
        // viewhammer.on('swiperight', function(ev) {
        //     ev.preventDefault();
        //    if (ev.pointerType == 'touch') {
        //        prevSlide();
        //    }
        // });

        canvashammer = new Hammer(document.getElementById('speaker-slide'));
        canvashammer.get('pinch').set({enable:true});

        canvashammer.on('pinchstart', function(ev){
            ev.preventDefault();
            oldzoom = spaper.view.zoom;
            pinchcenter = new paper.Point(ev.center.x - $(scanvas).offset().left, ev.center.y - $(scanvas).offset().top);
            prevpinchscale = 1.0;
        });
        canvashammer.on('pinchout', function(ev) {
            ev.preventDefault();
            var zoomresult = stableZoom(oldzoom, pinchcenter, spaper.view.center, prevpinchscale, ev.scale);
            spaper.view.zoom = zoomresult[0];
            spaper.view.center = spaper.view.center.subtract(zoomresult[1]);
            prevpinchscale = ev.scale;
        });
        canvashammer.on('pinchin', function(ev){
            ev.preventDefault();
            var zoomresult = stableZoom(oldzoom, pinchcenter, spaper.view.center, prevpinchscale, ev.scale);
            spaper.view.zoom = zoomresult[0];
            spaper.view.center = spaper.view.center.subtract(zoomresult[1]);
            prevpinchscale = ev.scale;
        });

        canvashammer.get('pan').set({threshold: 0});
        canvashammer.on('panstart', function (ev) {
            ev.preventDefault();
            if (ev.pointerType == 'touch') {
                oldcenter = spaper.view.center;
            }
        });
        canvashammer.on('panmove', function(ev){
            ev.preventDefault();
            if (ev.pointerType == 'touch') {
                var newcenter = new paper.Point(oldcenter.x - ev.deltaX, oldcenter.y - ev.deltaY);
                spaper.view.center = newcenter;
            }
        });
    }
    else {
        curslidenum = 0;
    }
    post(setupSlidesMessage());
    loadSlide(slidedeck.getSlide(curslidenum));
};

function stableZoom(prevzoom, p, c, prevs, sfactor) {
    var newzoom = prevzoom * sfactor;
    // a=p−Z(p)=p−β⋅(p−c)−c
    var pc = p.subtract(c);
    var beta = sfactor/prevs;
    var delta = p.subtract(pc.multiply(beta)).subtract(c);

    return [newzoom, delta];
};

function resizeCanvas(width, height) {
    sslide.style.width = width +'px';
    sslide.style.height = height +'px';
    scanvas.width = width;
    scanvas.height = height;
    spaper.view.viewSize.width = width;
    spaper.view.viewSize.height = height;
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

    var eraser = new spaper.Tool();
    eraser.name = 'eraser';
    eraser.onMouseDown = erase;
    eraser.onMouseDrag = erase;
    spaper.eraser = eraser;

    spaper.tool = null;
};

function loadSlide(slide) {
    // hide current slide
    if (curslide) {
        curslide.hide();
    }
    curslide = slide;
    // load or show new slide
    if (!slide.loaded) {
        slide.itemlayer = [];
        for (var i = 0; i < slide.nitems; i++) {
            var item = slide.items[i];
            loadItem(slide, item, i);
        }
        if (!slide.lowermask) {
            slide.lowermask = new paper.Layer();
        }
        slide.lowermask.insertAbove(slide.itemlayer[slide.itemlayer.length-1]);
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

        slide.loaded = true;

    } else {
        slide.show();
    }
    spaper.view.update();
    post(slideChangeMessage());
};

function setMask() {
    if (!curslide.masklayer) {
        curslide.masklayer = new paper.Layer();
        curslide.masklayer.insertAbove(curslide.itemlayer[curslide.itemlayer.length-1]);
    }
    activateMaskTool();
};

function loadItem(slide, item, i) {
    if (i == 0) {
        loadBackgroundItem(slide, item);
    } else if (i == 1) {
        loadForegroundItem(slide, item);
    } else {
        loadBackgroundItem(slide, item);
    }
};

function loadBackgroundItem(slide, item, i) {
    var layer = new paper.Layer();
    slide.itemlayer.push(layer);
    layer.activate();

    var raster = new paper.Raster(item.src);
    item.setRaster(raster, false);
    item.praster.fitBounds(paper.view.bounds);
    item.praster.scale = Math.max(item.praster.width/paper.view.bounds.width, item.praster.height/paper.view.bounds.height);
    item.praster.wslack = (paper.view.bounds.width - item.praster.width/item.praster.scale)/2.0;
    item.praster.hslack = (paper.view.bounds.height - item.praster.height/item.praster.scale)/2.0;
    item.praster.opacity = 1.0;
};

function loadForegroundItem(slide, item) {
    var layer = new paper.Layer();
    slide.itemlayer.push(layer);
    slide.fglayer = layer;
    if (slide.itemlayer.length > 1) {
        layer.insertAbove(slide.itemlayer[slide.itemlayer.length-2]);
    }

    layer.activate();
    var raster = new paper.Raster(item.src);
    item.setRaster(raster, true);
    item.praster.fitBounds(paper.view.bounds);
    item.praster.scale = Math.max(item.praster.width/paper.view.bounds.width, item.praster.height/paper.view.bounds.height);
    item.praster.wslack = (paper.view.bounds.width - item.praster.width/item.praster.scale)/2.0;
    item.praster.hslack = (paper.view.bounds.height - item.praster.height/item.praster.scale)/2.0;
    // makeSemiTransparent(item.praster);
    // item.praster.opacity = 0.5;
    // item.pclip = new paper.Path.Rectangle([0,0],[0,0]);
    // item.pclip.fillColor = 'black';
    // item.pgroup = new paper.Group(item.pclip, item.praster);
    // item.pgroup.clipped = true;
    // item.pgroup.insertAbove(item.fadedraster);
    // var traster = new paper.Raster();
    // traster.width = raster.width;
    // traster.height = raster.height;
    // traster.fitBounds(paper.view.bounds);
    // item.traster = traster;
    // item.traster.insertAbove(item.praster);
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
        loadSlide(slidedeck.getSlide(curslidenum));
    }
};

function nextSlide() {
    if (curslidenum < numslides -1) {
        curslidenum++;
        loadSlide(slidedeck.getSlide(curslidenum));
    }
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

function activateEraserTool() {
    if (!spaper) return;
    spaper.eraser.activate();
};

function selectItem() {
    // Select the Foreground Item
    curitem = curslide.items[1];
    bgitem = curslide.items[0];
};

var curstroke;
var curbound;
var movedist;
var dist2fg;
var prevtime;
var pcount;
var bgpcolors;

var timeout;
var line_end;
var expand = false;
var subs = null;
var line;
var prev_p;
function inkStart(event){
    if (!curslide.inklayer) {
        var layer = new paper.Layer();
        curslide.inklayer = layer;
    } else {
        curslide.inklayer.activate();
    }
    selectItem();
    curstroke = new paper.Path();
    curstroke.strokeWidth = 2;
    curstroke.add(event.point);
    curstroke.strokeCap = 'round';
    movedist = 0.0;
    prevtime = event.timeStamp;
    var p = getPixelPoint(event.point, curitem.praster);

    dist2fg = curitem.praster.dtfg[p.x + p.y* curitem.praster.width];
    pcount = 1;
    bgpcolors = [0,0,0,0];
    var pcolor = bgitem.praster.getPixel(p.x, p.y);
    bgpcolors[0] += pcolor.red;
    bgpcolors[1] += pcolor.green;
    bgpcolors[2] += pcolor.blue;
    bgpcolors[3] += pcolor.alpha;

    //set stroke color to closest fg color
    var cx = curitem.praster.dti[p.x+p.y*curitem.praster.width];
    var cy = curitem.praster.dtj[p.x+p.y*curitem.praster.width];
    curstroke.strokeColor = curitem.praster.getPixel(cx, cy);
    curstroke.strokeColor.alpha = 1.0;
    curstroke.data.free = false;

    post(inkMessage(curstroke, [], false));
};

function inkContinue(event) {
    if (!expand) {
        curstroke.add(event.point);
        movedist += Math.sqrt((event.delta.x * event.delta.x + event.delta.y * event.delta.y));
        var p = getPixelPoint(event.point, curitem.praster);
        dist2fg += curitem.praster.dtfg[p.x + p.y* curitem.praster.width];
        pcount++;
        var pcolor = bgitem.praster.getPixel(p.x, p.y);
        bgpcolors[0] += pcolor.red;
        bgpcolors[1] += pcolor.green;
        bgpcolors[2] += pcolor.blue;
        bgpcolors[3] += pcolor.alpha;
        line_end = event.point;
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(function() {
            expand = true;
            line = curstroke;
            line.dashArray = [5,5];
            line.strokeColor = 'red';
            post(spaceStartMessage());
        }, 300);
        post(inkMessage(curstroke, [], false));
    } else {
        makeSpaceContinue(event);
    }
};

function inkEnd(event) {
    if (timeout)
        clearTimeout(timeout);
    if (expand) {
        makeSpaceEnd(event);
        return;
    }
    if (curstroke) {
        curstroke.add(event.point);
        movedist += Math.sqrt((event.delta.x * event.delta.x + event.delta.y * event.delta.y));
        var p = getPixelPoint(event.point, curitem.praster);
        dist2fg += curitem.praster.dtfg[p.x + p.y * curitem.praster.width];
        pcount++;
        var pcolor = bgitem.praster.getPixel(p.x, p.y);
        bgpcolors[0] += pcolor.red;
        bgpcolors[1] += pcolor.green;
        bgpcolors[2] += pcolor.blue;
        bgpcolors[3] += pcolor.alpha;

        var result;
        var avg_dist2fg = dist2fg / pcount;
        var velocity = movedist / (event.timeStamp - prevtime) * 1000;
        var tracedpx = [];
        // IF STROKE IS FAR FROM UNDERLYING PIXELS
        if (avg_dist2fg > DIST2FG_THRES_A * velocity + DIST2FG_THRES_B) {
            var avgbgcolor = new paper.Color(bgpcolors[0] / pcount, bgpcolors[1] / pcount, bgpcolors[2] / pcount, bgpcolors[3] / pcount);
            var annocolor;
            // if (avgbgcolor.hue <= 0.1) annocolor = '#66ff33';
            // else
            annocolor = invertColor(avgbgcolor);
            // annocolor = '#0033ff';
            // trace color so that it stands out from the background
            curstroke.strokeColor = annocolor;
            curstroke.data.free = true;
        } else {
            result = traceClosestPixels(curitem.praster, curstroke, velocity);
            var tracedpx = result[0];
            var avgcolor = result[1];
            // TRACING UNDERLYING CONTENT
            if (tracedpx.length / pcount > 0.10 || avg_dist2fg < 5) {
                setTimeout( function() {
                    tracePixels(curitem.praster, tracedpx);
                }, 0);
                curstroke.remove();
            } else {
                // ANNOTATING ON TOP OF UNDERLYING CONTENT
                var avgbgcolor = new paper.Color(avgcolor[0], avgcolor[1], avgcolor[2], avgcolor[3]);
                // if (avgbgcolor.hue <= 0.1) annocolor = '#66ff33';
                // else
                annocolor = invertColor(avgbgcolor);
                curstroke.strokeColor = annocolor;
                curstroke.data.free = true;
            }
        }

        curstroke.data.id = strokeid++;
        post(inkMessage(curstroke, tracedpx, true));
    }
};

function erase(event) {
    selectItem();
    var raster = curitem.praster;
    // var p = getPixelPoint(event.point, raster);

    var hitoptions = {
        segments: true,
        stroke: true,
        fill: true,
        curves: true,
        class: spaper.Path,
        tolerance: 5
    };

    var strokes = null;
    if (curslide.inklayer && curslide.inklayer.children.length > 0) {
        strokes = curslide.inklayer.hitTestAll(event.point, hitoptions);
        if (strokes.length > 0) {
            strokes[0].item.remove();
            post(inkDeleteMessage(strokes[0].item));
        }
    }
};

function setColorPalette(colors) {
    for (var i = 0; i < default_palette.length; i++) {
        if (colors.indexOf(default_palette[i]) < 0)
            colors.push(default_palette[i]);
    }
    $('#strokec').spectrum({
        allowEmpty: true,
        showPaletteOnly: true,
        showPalette:true,
        hideAfterPaletteSelect: true,
        flat: true,
        palette: [
            colors
        ]
    });
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

function printStrokeStyles() {
    if (curslide && curslide.inklayer) {
        var strokes = curslide.inklayer.getItems();
        var styles = [];
        var counts = [];
        for (var i = 0; i < strokes.length; i++) {
            var stroke = strokes[i];
            var string = stroke.strokeColor + " " + stroke.fillColor + " " + stroke.strokeWidth;
            var id = styles.indexOf(string);
            if (id < 0) {
                styles.push(string);
                counts.push(1);
            } else {
                counts[id]++;
            }
        }
        console.log("num styles: " + styles.length);
        console.log("num strokes: " + strokes.length);
        console.log(styles);
        console.log(counts);
    }
};



function activateMaskTool() {
    if (!spaper) return;
    spaper.masktool.activate();
    // deactivateItemMouseEvents();
};

function maskStart(event) {
    if (event.event.type.includes('touch')) {
        hideMenu(document.getElementById('mask-context-menu'));
        return;
    }
    if (event.event.button == 2) {
        revealMenu(document.getElementById('mask-context-menu'), event);
        return;
    }
    hideMenu(document.getElementById('mask-context-menu'));
    revealStart(event);
};

function maskContinue(event) {
    revealContinue(event);
};

function maskEnd(event) {
    changeMask(event, false);
};

function maskPropagate() {
    hideMenu(document.getElementById('mask-context-menu'));
    var slide;
    for (var i = curslidenum+1; i < slidedeck.n; i++) {
        slide = slidedeck.getSlide(i);
        if (slide.masklayer)
            slide.masklayer.removeChildren();
        else {
            slide.masklayer = new paper.Layer();
            if (slide.lowermask)
                slide.masklayer.insertAbove(slide.lowermask);
            if (slide.inklayer)
                slide.masklayer.insertBelow(slide.inklayer);
        }
        slide.masklayer.activate();
        var mitems = curslide.masklayer.getItems();
        for (var j = 0; j < mitems.length; j++) {
            var maskitem = new paper.Path(mitems[j].pathData);
            maskitem.fillColor = mitems[j].fillColor;
            maskitem.fillColor.alpha = 0.5;
        }
        slide.masklayer.visible = false;

    }
    post(propagateMaskMessage(curslide.masklayer, curslidenum));
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
    selectItem();

    curstroke = new paper.Path();
    curstroke.add(event.point);
    curstroke.strokeWidth = 2;
    curstroke.strokeColor = '#2F4F4F';
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
    curbound.dashArray = [3,3];
    curbound.strokeColor = 'black';
};

function revealEnd(event) {
    changeMask(event, true);
        // // get inkstrokes inside this region
        // var inkitems = curslide.inklayer.getItems({inside: curstroke.bounds});
        // for (var i = 0; i < inkitems.length; i++) {
        //     if (!inkitems[i].data.free && isInside(curstroke, inkitems[i])) {
        //         inkitems[i].onFrame = function () {
        //             if (this.strokeColor.alpha <= 0) this.remove();
        //             this.strokeColor.alpha -= 0.05;
        //         };
        //
        //     }
        // }

};

function changeMask(event, add) {
    if (curstroke) {
        curstroke.closePath();
        if (curbound)
            curbound.remove();

        curslide.masklayer.activate();
        if (curslide.masklayer.getItems().length == 0 && !add) {
            curstroke.remove();
            return;
        }
        var maskbox = new paper.Path(curstroke.pathData);
        maskbox.strokeColor = '#2F4F4F';
        maskbox.fillColor = 'black';
        maskbox.fillColor.alpha = 1.0;
        post(addMaskMessage(curstroke, add));
        var result;
        var maskitem = curslide.masklayer.getItems()[0];
        if (add)
            result = maskitem.unite(maskbox);
        else
            result = maskitem.subtract(maskbox);

        result.strokeColor = '#2F4F4F';
        maskitem.remove();
        maskbox.remove();


        // Activate foreground item layer
        curslide.itemlayer[curslide.itemlayer.length - 1].activate();
        var mymask;
        if (result.className == 'Path') {
            mymask = new paper.Path(result.pathData);
        }
        else {
            mymask = new paper.CompoundPath(result.pathData);
        }
        curitem.pgroup.children[0].replaceWith(mymask);
        curitem.pgroup.clipped = true;
        curstroke.remove();
        curslide.masklayer.visible = false;
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

function spaceStartMessage() {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'space-start',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search
    } );
    return msg;
};

function spaceContinueMessage(expanddir, delta) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'space-continue',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        dir: expanddir,
        delta: JSON.stringify(delta)
    } );
    return msg;
};

function spaceEndMessage(raster) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'space-end',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        newraster: JSON.stringify(raster),
        top: raster.bounds.top,
        left: raster.bounds.left
    } );
    return msg;
};

function inkMessage(inkstroke, tracedpx, end) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'ink',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        content: JSON.stringify(inkstroke),
        free: inkstroke.data.free,
        fillalpha: inkstroke.data.fillalpha,
        tracedpx: JSON.stringify(tracedpx),
        strokeid: inkstroke.data.id,
        end: end
    } );
    return msg;
};

function inkDeleteMessage(inkstroke) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'inkdel',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        strokeid: inkstroke.data.id
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

function propagateMaskMessage(masklayer, slidenum) {
    var msg = JSON.stringify( {
        namespace: 'liveprez',
        type: 'propagate-mask',
        url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
        mask: JSON.stringify(masklayer),
        slidenum: slidenum
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
        num: slidedeck.slides.length,
        deck: JSON.stringify(slidedeck),
        aspectratio: SLIDE_H/SLIDE_W
    } );
    return msg;
};

function post(msg) {
    if (awindow) {
        awindow.postMessage( msg, '*' );
    }
};

function makeSpaceEnd(event) {
    expand = false;
    subs = null;
    prev_p = null;
    expanddir = -1;
    curslide.fglayer.activate();
    var newraster = curslide.fglayer.rasterize(72);
    curslide.fglayer.removeChildren();
    curslide.fglayer.addChild(newraster);
    // set newraster as the praster
    curitem.praster = null; // freeing memory;
    curitem.praster = newraster;
    curitem.praster.scale = Math.max(curitem.praster.width/curitem.praster.bounds.width, curitem.praster.height/curitem.praster.bounds.height);
    curitem.praster.wslack = newraster.bounds.left;//(paper.view.bounds.width - curitem.praster.width/curitem.praster.scale)/2.0;
    curitem.praster.hslack = newraster.bounds.top;//(paper.view.bounds.height - curitem.praster.height/curitem.praster.scale)/2.0;
    newraster.imdata = newraster.getImageData(new paper.Rectangle(0, 0, newraster.width, newraster.height));
    newraster.fg = booleanImageFromForeground(newraster.imdata);
    // console.log("Compute Edge Information");
    newraster.sobel = computeSobel(newraster);
    newraster.sobelbool = booleanImageFromSobel(newraster.sobel, 10);
    // console.log("Compute Distance Transformation");
    newraster.dtresult1 = distanceTransform(newraster.sobelbool, newraster.width, newraster.height, "EDT");
    newraster.dtedge = newraster.dtresult1[0];
    newraster.dtresult2 = distanceTransform(newraster.fg, newraster.width, newraster.height, "EDT");
    newraster.dtfg = newraster.dtresult2[0];
    newraster.dti = newraster.dtresult2[1];
    newraster.dtj = newraster.dtresult2[2];
    newraster.revealed = isRevealed(newraster.imdata);
    // console.log("Generate Stroke Width Image");
    newraster.swidth = strokeWidthImage(newraster.dtedge, newraster.fg, 0, 10);
    newraster.cclabel = BlobExtraction(newraster.fg, newraster.width, newraster.height);

    console.log('top: ' + curitem.praster.bounds.top);
    console.log('left: ' + curitem.praster.bounds.left);
    if (line)
        line.remove();

    post(spaceEndMessage(newraster));

};

var expanddir = -1;
function makeSpaceContinue(event) {
    clearTimeout(timeout);
    // determine the direction of expansion:
    if (expanddir < 0) {
        var dist = event.point.getDistance(line_end);
        if (dist > 5) {
            var dx = event.point.x - line_end.x;
            var dy = event.point.y - line_end.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) expanddir = RIGHT;
                else if (dx < 0) expanddir = LEFT;
            } else {
                if (dy > 0) expanddir = BOTTOM;
                else if (dy < 0) expanddir = TOP;
            }
        }
    } else {
        var delta;
        switch(expanddir) {
            case RIGHT:
                delta = expandSpaceRight(event);
                break;
            case LEFT:
                delta = expandSpaceLeft(event);
                break;
            case BOTTOM:
                delta = expandSpaceBottom(event);
                break;
            case TOP:
                delta = expandSpaceTop(event);
                break;
        }
        post(spaceContinueMessage(expanddir, delta));
    }
};

function expandSpaceBottom(event) {
    var delta = new paper.Point(0,0);
    if (subs) {
        var dy;
        if (prev_p) {
            dy = event.point.y - prev_p.y;
        } else {
            dy = event.point.y - line_end.y;
        }
        delta = new paper.Point(0,dy);
        for (var i = 0; i < subs.length; i++) {
            subs[i].translate(delta);
        }
        prev_p = event.point;
    }
    else {
        console.log("sort point in x direction");
        subs = [];
        var ctx = curitem.praster.getContext(true);
        curitem.praster.layer.activate();
        for (var x = 0; x <= line.length-1; x +=1) {
            var p = line.getPointAt(x);
            var pnext = line.getPointAt(x+1);
            var px = getPixelPoint(p, curitem.praster);
            var pxnext = getPixelPoint(pnext, curitem.praster);
            var rect = new paper.Shape.Rectangle(px.x, px.y, (pxnext.x - px.x), curitem.praster.height - px.y);
            var subraster = curitem.praster.getSubRaster(rect.bounds);
            ctx.clearRect(px.x, px.y, (pxnext.x - px.x), curitem.praster.height - px.y);
            subs.push(subraster);
        }
    }
    return delta;
};

function expandSpaceTop(event) {
    var delta = new paper.Point(0,0);
    if (subs) {
        var dy;
        if (prev_p) {
            dy = event.point.y - prev_p.y;
        } else {
            dy = event.point.y - line_end.y;
        }
        delta = new paper.Point(0, dy)
        for (var i = 0; i < subs.length; i++) {
            subs[i].translate(delta);
        }
        prev_p = event.point;
    }
    else {
        console.log("sort point in x direction");

        subs = [];
        var ctx = curitem.praster.getContext(true);
        curitem.praster.layer.activate();
        for (var x = 0; x <= line.length-1; x +=1) {
            var p = line.getPointAt(x);
            var pnext = line.getPointAt(x+1);
            var px = getPixelPoint(p, curitem.praster);
            var pxnext = getPixelPoint(pnext, curitem.praster);
            var rect = new paper.Shape.Rectangle(px.x, 0, (pxnext.x - px.x), px.y);
            var subraster = curitem.praster.getSubRaster(rect.bounds);
            ctx.clearRect(px.x, 0, (pxnext.x - px.x), px.y);
            subs.push(subraster);
        }
    }
    return delta;
};

function expandSpaceRight(event) {
    var delta = new paper.Point(0, 0);
    if (subs) {
        var dx;
        if (prev_p) {
            dx = event.point.x - prev_p.x;
        } else {
            dx = event.point.x - line_end.x;
        }
        delta = new paper.Point(dx, 0);
        for (var i = 0; i < subs.length; i++) {
            subs[i].translate(delta);
        }
        prev_p = event.point;
    }
    else {
        console.log("sort point in y direction");
        subs = [];
        var ctx = curitem.praster.getContext(true);
        curitem.praster.layer.activate();
        for (var x = 0; x <= line.length-1; x +=1) {
            var p = line.getPointAt(x);
            var pnext = line.getPointAt(x+1);
            var px = getPixelPoint(p, curitem.praster);
            var pxnext = getPixelPoint(pnext, curitem.praster);
            var rect = new paper.Shape.Rectangle(px.x, px.y, curitem.praster.width - px.x, (pxnext.y - px.y));
            var subraster = curitem.praster.getSubRaster(rect.bounds);
            ctx.clearRect(px.x, px.y, curitem.praster.width - px.x, (pxnext.y - px.y));
            subs.push(subraster);
        }
    }
    return delta;
};

function expandSpaceLeft(event) {
    var delta = new paper.Point(0,0);
    if (subs) {
        var dx;
        if (prev_p) {
            dx = event.point.x - prev_p.x;
        } else {
            dx = event.point.x - line_end.x;
        }
        delta = new paper.point(dx, 0);
        for (var i = 0; i < subs.length; i++) {
            subs[i].translate(delta);
        }
        prev_p = event.point;
    }
    else {
        console.log("sort point in y direction");
        subs = [];
        var ctx = curitem.praster.getContext(true);
        curitem.praster.layer.activate();
        for (var x = 0; x <= line.length-1; x +=1) {
            var p = line.getPointAt(x);
            var pnext = line.getPointAt(x+1);
            var px = getPixelPoint(p, curitem.praster);
            var pxnext = getPixelPoint(pnext, curitem.praster);
            var rect = new paper.Shape.Rectangle(0, px.y, px.x, (pxnext.y - px.y));
            var subraster = curitem.praster.getSubRaster(rect.bounds);
            ctx.clearRect(0, px.y, px.x, (pxnext.y - px.y));
            subs.push(subraster);
        }
    }
    return delta;
};



function getElementsInRange(rect, elements) {
    var selected = [];
    for (var i = 0; i < elements.length; i++) {
        if (rect.bounds.intersects(elements[i].rect.bounds))
            selected.push(elements[i]);
    }
    return selected;
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

function showMenu(elem) {
    elem.style.display = 'block';
}

function saveCanvasImage() {
    var dataURL = scanvas.toDataURL("image/png");
    var href = dataURL.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    $('#download_link').attr('href', href);
};
