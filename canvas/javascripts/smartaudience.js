/**
 * Created by Hijung Shin on 1/30/2017.
 */
var SLIDE_W;// = 960;
var SLIDE_H;// = 720;
// var CANVAS_W = 960;
// var CANVAS_H = 720;
var aslide;
var acanvas;
var apaper;
var connected;
var curslide;
var curslidenum;
var curitem;
var curstroke = null;
var prevstroke = null;
var slidelayer;
var reveal = false;
var aspectratio;
var scale = 1.0; // speaker view / audience view ratio
var speakerwidth;
var slides;
var mediaRecorder;
var recordedChunks = null;
var pencursor = null;
var erasercursor = null;
var markercursor = null;
var PEN_CURSOR_URL = "markericon-small.png";
var ERASER_CURSOR_URL = "erasericon-small.png";
var MARKER_CURSOR_URL = "markericon-small.png";

var origcenter;

window.addEventListener('message', function(event) {
    var data = JSON.parse(event.data);
    if (data && data.namespace === 'liveprez') {
        if (data.type === 'connect') {
            handleConnectMessage(data);
        } else if (data.type ==='slide-setup') {
            handleSlideSetupMessage(data);
        } else if (data.type === 'slide-change') {
            handleSlideChangeMessage(data);
        } else if (data.type === 'slide-reveal') {
            handleSlideRevealMessage(data);
        } else if (data.type === 'toggle-reveal') {
            handleToggleRevealMessage(data);
        } else if (data.type === 'move-item') {
            handleMoveItemMessage(data);
        } else if (data.type === 'update-view') {
            handleUpdateViewMessage(data);
        } else if (data.type === 'draw') {
            handleDrawMessage(data);
        } else if (data.type === 'ink') {
            handleInkMessage(data);
        } else if (data.type === 'annotate') {
            handleAnnotateMessage(data);
        } else if (data.type === 'inkdel') {
            handleInkDelMessage(data);
        } else if (data.type ==='lowermask') {
            handleLowerMaskMessage(data);
        } else if (data.type === 'mask') {
            handleMaskMessage(data);
        } else if (data.type === 'propagate-mask') {
            handleMaskPropagateMessage(data);
        } else if (data.type === 'release-target') {
            handleReleaseTargetMessage(data);
        } else if (data.type === 'slide-resize') {
            handleSlideResizeMessage(data);
        } else if (data.type === 'color-change') {
            handleColorChangeMessage(data);
        } else if (data.type === 'space-start') {
            handleSpaceStartMessage(data);
        } else if (data.type === 'space-continue') {
            handleSpaceContinueMessage(data);
        } else if (data.type === 'space-end') {
            handleSpaceEndMessage(data);
        } else if (data.type == 'slide-zoom') {
            handleZoomMessage(data);
        } else if (data.type == 'slide-pan') {
            handlePanMessage(data);
        } else if (data.type === 'slide-center') {
            handleCenterMessage(data);
        } else if (data.type === 'record') {
            handleRecordMessage(data);
        }

    }
});

window.onload = function() {
    document.getElementById('pen-cursor').style.display = 'none';
    aslide = document.getElementById('audience-slide');
    acanvas = document.createElement('canvas');
    acanvas.setAttribute('id', aslide.id.replace('slide', 'canvas'));
    acanvas.setAttribute('keepalive', true);
    acanvas.setAttribute('data-paper-keepalive', true);
    aslide.appendChild(acanvas);

    apaper = new paper.PaperScope();
    apaper.setup(acanvas);

    aslide.paper = apaper;
    aslide.canvas = acanvas;
    acanvas.paper = apaper;
    acanvas.slide = aslide;
    apaper.slide = aslide;
    apaper.canvas = acanvas;

    document.addEventListener("keyup", function(event) {
        handleKeyboardEvents(event);
    });
    document.getElementById('download_link').addEventListener('click', saveCanvasImage, false);


};

// window.onresize = function(event) {
//     event.preventDefault();
//     SLIDE_W = $(window).width() - 5 ;
//     SLIDE_H = SLIDE_W * aspectratio;
//     if (SLIDE_H > $(window).height() - 5) {
//         SLIDE_H = $(window).height() -5;
//         SLIDE_W = SLIDE_H/aspectratio;
//     }
//
//     resizeCanvas(SLIDE_W, SLIDE_H);
//
// };

function handleConnectMessage(data) {
    if (connected === false) {
        connected = true;
    }
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
};

function handleSlideSetupMessage(data) {
    // var numslide = JSON.parse(data.num);
    aspectratio = data.aspectratio;
    SLIDE_W = $(window).width() - 5;// * 0.95;
    SLIDE_H = SLIDE_W * aspectratio;
    if (SLIDE_H > $(window).height() - 5) {
        SLIDE_H = $(window).height() - 5;
        SLIDE_W = SLIDE_H/aspectratio;
    }
    resizeCanvas(SLIDE_W, SLIDE_H);
    // origcenter = apaper.view.center;

    apaper.project.clear();
    var deck = JSON.parse(data.deck).slides;
    var slide, item;
    for (var i = 0; i < deck.length; i++) {
        slide = deck[i];
        slide.itemlayer = [];
        // console.log('item length: ' + slide.items.length);
        for (var j = 0; j < slide.items.length; j++) {
            item = slide.items[j];
            loadItem(slide, item, j);
        }
        var lowermask = new paper.Layer();
        lowermask.insertAbove(slide.itemlayer[slide.itemlayer.length-1]);
        slide.lowermask = lowermask;

        var masklayer = new paper.Layer();
        masklayer.insertAbove(slide.lowermask);
        slide.masklayer = masklayer;

        var inklayer = new paper.Layer();
        inklayer.insertAbove(slide.masklayer);
        slide.inklayer = inklayer;

        hideSlide(slide);
    }
    slides = deck;//new Array(numslide);

    // Load cursor item
    var cursorLayer = new paper.Layer();
    pencursor = new paper.Raster(PEN_CURSOR_URL);
    pencursor.visible = false;
    pencursor.onLoad = function() {
        pencursor.pivot = pencursor.bounds.topLeft;
    };
    erasercursor = new paper.Raster(ERASER_CURSOR_URL);
    erasercursor.visible = false;
    erasercursor.onLoad = function() {
        erasercursor.pivot = erasercursor.bounds.topLeft;
    };
    markercursor = new paper.Raster(MARKER_CURSOR_URL);
    markercursor.visible = false;
    markercursor.onLoad = function() {
        markercursor.pivot = markercursor.bounds.topLeft;
    };


};



function showSlide(slide) {
    for (var i = 0; i < slide.itemlayer.length; i++)
        slide.itemlayer[i].visible = true;
    slide.lowermask.visible = true;
    slide.masklayer.visible = true;
    slide.inklayer.visible = true;
};

function hideSlide(slide) {
    for (var i = 0; i < slide.itemlayer.length; i++)
        slide.itemlayer[i].visible = false;
    slide.lowermask.visible = false;
    slide.masklayer.visible = false;
    slide.inklayer.visible = false;
};

function handleSlideChangeMessage(data) {
    curslide = JSON.parse(data.state);
    reveal = false;
    loadSlide(curslide);
 };

function handleSlideResizeMessage(data) {
    speakerwidth = JSON.parse(data.width);
    scale = SLIDE_W/speakerwidth;
};

function handleSlideRevealMessage() {
    if (reveal) {
        console.log("Implement Hide Slide")
    }
    else {
        revealSlide();
    }
};

function revealSlide() {
    for (var i = 0; i < curslide.nitems; i++) {
        var item = curslide.items[i];
        if (item.praster) {
            item.clip.add(new paper.Point(item.praster.bounds.topLeft));
            item.clip.add(new paper.Point(item.praster.bounds.topRight));
            item.clip.add(new paper.Point(item.praster.bounds.bottomRight));
            item.clip.add(new paper.Point(item.praster.bounds.bottomLeft));
        } else {
            console.log("Implement reveal svg");
        }
    }
    reveal = true;
};

function loadSlide(slide) {
    // hide current slide
    if (curslidenum != undefined) {
        hideSlide(slides[curslidenum]);
    }
    showSlide(slides[slide.num]);

    curslide = slides[slide.num];
    curslidenum = curslide.num;
    curitem = curslide.items[1];
}

function resizeCanvas(width, height) {
    var origw = apaper.view.viewSize.width;
    var rscale = width/origw;
    if (rscale == 1) return;
    aslide.style.width = width + 'px';
    aslide.style.height = height + 'px';
    apaper.view.viewSize.width = width;
    apaper.view.viewSize.height = height;
    acanvas.width = width;
    acanvas.height = height;

    if (apaper.project.layers) {
        for (var i = 0; i < apaper.project.layers.length; i++) {
            apaper.project.layers[i].scale(rscale, new paper.Point(0, 0));
        }
    }
    scale = SLIDE_W/speakerwidth;

    // update raster.scale, wslack, hslack
    if (curitem && curitem.praster) {
        curitem.praster.scale = Math.max(curitem.praster.width / paper.view.bounds.width, curitem.praster.height / paper.view.bounds.height);
        curitem.praster.wslack = (paper.view.bounds.width - curitem.praster.width/curitem.praster.scale)/2.0;
        curitem.praster.hslack = (paper.view.bounds.height - curitem.praster.height/curitem.praster.scale)/2.0;
    };

    apaper.view.update();

};

function loadItem(slide, item, i) {
    var layer = new paper.Layer();
    slide.itemlayer.push(layer);
    layer.activate();
    var raster = new paper.Raster(item.src);
    item.praster = raster;
    item.praster.fitBounds(paper.view.bounds);
    item.praster.scale = Math.max(item.praster.width / paper.view.bounds.width, item.praster.height / paper.view.bounds.height);
    item.praster.wslack = (paper.view.bounds.width - item.praster.width/item.praster.scale)/2.0;
    item.praster.hslack = (paper.view.bounds.height - item.praster.height/item.praster.scale)/2.0;

    if (i == 0) {
        item.praster.onLoad = function () {
            this.bgcolor = new paper.Color('white');
        };
    } else if (i==1) {
        slide.fglayer = layer;
        item.praster.onLoad = function() {
            this.imdata = this.getImageData(new paper.Shape.Rectangle(0, 0, this.width, this.height));
            makeTransparent(this);
        }
    }
};

function handleToggleRevealMessage(data) {
    var itemname = data.item;
    var item = apaper.project.getItem({
        data: {
            id: itemname
        }
    });
    toggleReveal(item);
};

function toggleReveal(item) {
    if (item.data.isHidden) {
        revealItem(item);
    }
    else {
        item.data.isHidden = true;
        hideItems(item);
    }
};


function hideItems(item) {
    if (item.data.isHidden) {
        item.visible = true;
        if (item.className == 'Group') {
            for (var i = 0;i < item.children.length; i++) {
                item.children[i].visible = false;
                hideItems(item.children[i]);
            }
        }
        else if (item.className == 'PointText') {
            item.fillColor.alpha = 0;
        } else {
            item.opacity = 0;
        }
    }
    else if (item.children) {
        for (var i = 0; i < item.children.length; i++) {
            hideItems(item.children[i]);
        }
    }
};

function revealItem(item) {
    if (item.className == 'Group') {
        for (var i = 0; i < item.children.length; i++) {
            revealItem(item.children[i]);
        }
    } else if (item.className == 'PointText') {
        item.fillColor.alpha = 1.0;
    } else {
        item.opacity = 1.0;
    }
    item.visible = true;
    item.data.isHidden = false;
};

function handleMoveItemMessage(data) {
    var itemname = data.item;
    var item = apaper.project.getItem({
        data: {
            id: itemname
        }
    });
    item.bounds.top = data.top;
    item.bounds.left = data.left;
    item.bounds.bottom = data.bottom;
    item.bounds.right = data.right;
};

function handleUpdateViewMessage(data) {
    apaper.view.viewSize.width = data.width;
    apaper.view.viewSize.height = data.height;
};

function handleInkDelMessage(data) {
    if (curslide.inklayer && curslide.inklayer.children.length > 0) {
        var item = curslide.inklayer.getItem({
            data: {
                id: data.strokeid
            }
        });
        if (item)
            item.remove();
    }
};

var expand = false;

function handleInkMessage(data) {
    // Get Current Point
    if (!curslide.inklayer) {
        curslide.inklayer = new paper.Layer();
    }
    curslide.inklayer.activate();
    // Get Last point on curstroke
    curstroke = new paper.Path(JSON.parse(data.content)[1]);
    curstroke.scale(scale, new paper.Point(0,0));
    curstroke.visible = false;

    var curpoint = curstroke.lastSegment.point;
    var tracedpx = JSON.parse(data.tracedpx);

    if (data.pen) { // REVEAL
        displayCursor('pen-cursor', curpoint.x, curpoint.y);
        tracePixels(curitem.praster, tracedpx);
    } else { // ERASER
        displayCursor('eraser-cursor', curpoint.x, curpoint.y);
        untracePixelsAudience(curitem.praster, tracedpx);
    }
    curstroke.remove();

};

function handleAnnotateMessage(data) {
    if (!curslide.inklayer) {
        curslide.inklayer = new paper.Layer();
    }
    curslide.inklayer.activate();

    if (curstroke) {
        curstroke.remove();
    }
    curstroke = new paper.Path(JSON.parse(data.content)[1]);
    curstroke.scale(scale, new paper.Point(0,0));
    curstroke.data.id = data.strokeid;

    var curpoint = curstroke.lastSegment.point;

    displayCursor('marker-cursor', curpoint.x, curpoint.y);
    if (data.end) {
        curstroke = null;
    }
};


var line;
var expanddir = -1;
var subs = null;
function handleSpaceStartMessage() {
    expand = true;
    line = curstroke;
    line.dashArray = [5,5];
    line.strokeColor = 'red';
};

function handleSpaceEndMessage(data)
{
    expand = false;
    subs = null;
    expanddir = -1;
    curslide.fglayer.activate();
    curslide.fglayer.removeChildren();
    // get newraster from speaker-view
    var newraster = new paper.Raster(JSON.parse(data.newraster)[1].source);
    newraster.onLoad = function() {
        newraster.imdata = newraster.getImageData(new paper.Rectangle(0, 0, data.width, data.height));
        hideTransparent(newraster);
        curitem.praster = null; // freeing memory;
        curitem.praster = newraster;

        // console.log("scale = " + scale);
        // console.log(newraster.bounds);
        newraster.scale(scale);
        var dy = data.top*scale - newraster.bounds.top
        var dx = data.left*scale - newraster.bounds.left;
        newraster.translate(new paper.Point(dx,dy));
        curitem.praster.scale = Math.max(curitem.praster.width / paper.view.bounds.width, curitem.praster.height / paper.view.bounds.height);
        curitem.praster.wslack = newraster.bounds.left;
        curitem.praster.hslack = newraster.bounds.top;//
    }
    if (line)
        line.remove();
};

function handleSpaceContinueMessage(data) {
    if (subs) {
        var delta = new paper.Point(JSON.parse(data.delta)[1], JSON.parse(data.delta)[2]);
        delta = delta.multiply(scale);
        for (var i = 0; i < subs.length; i++) {
            subs[i].translate(delta);
        }
    } else {
        subs = [];
        var ctx = curitem.praster.getContext(true);
        curitem.praster.layer.activate();
        for (var x = 0; x <= line.length-1; x +=1) {
            var p = line.getPointAt(x);
            var pnext = line.getPointAt(x+1);
            var px = getPixelPoint(p, curitem.praster);
            var pxnext = getPixelPoint(pnext, curitem.praster);
            var rect, subraster;
            if (data.dir == 0) {
                rect = new paper.Shape.Rectangle(px.x, px.y, curitem.praster.width - px.x, (pxnext.y - px.y));
                subraster = curitem.praster.getSubRaster(rect.bounds);
                ctx.clearRect(px.x, px.y, curitem.praster.width - px.x, (pxnext.y - px.y));

            } else if (data.dir == 1) {
                rect = new paper.Shape.Rectangle(0, px.y, px.x, (pxnext.y - px.y));
                subraster = curitem.praster.getSubRaster(rect.bounds);
                ctx.clearRect(0, px.y, px.x, (pxnext.y - px.y));

            } else if (data.dir == 2) {
                rect = new paper.Shape.Rectangle(px.x, px.y, (pxnext.x - px.x), curitem.praster.height - px.y);
                subraster = curitem.praster.getSubRaster(rect.bounds);
                ctx.clearRect(px.x, px.y, (pxnext.x - px.x), curitem.praster.height - px.y);

            } else if (data.dir == 3) {
                rect = new paper.Shape.Rectangle(px.x, 0, (pxnext.x - px.x), px.y);
                subraster = curitem.praster.getSubRaster(rect.bounds);
                ctx.clearRect(px.x, 0, (pxnext.x - px.x), px.y);
            }
            subs.push(subraster);
        }
    }
};

function handleZoomMessage(data) {
    if (apaper)
        apaper.view.zoom = data.zoom;
};

function handlePanMessage(data) {
    if (apaper) {
        var delta = new paper.Point(data.deltax*scale, data.deltay*scale);
        apaper.view.translate(delta);
    }

};

function handleCenterMessage(data) {
    if (apaper) {
        var center = new paper.Point(data.centerx*scale, data.centery*scale);
        apaper.view.center = center;
    }
};

function handleRecordMessage(data) {
    if (data.state == 'start') {
        startRecording();
    } else if (data.state == 'pause') {
        pauseRecording();
        // stopRecording();
    } else if (data.state == 'stop') {
        console.log("here");
        stopRecording();
    }
};

function saveCanvasImage() {
    var dataURL = acanvas.toDataURL("image/png");
    var href = dataURL.replace(/^data:image\/[^;]/, 'data:application/octet-stream');
    $('#download_link').attr('href', href);
};


function handleColorChangeMessage(data) {
    if (!prevstroke) return;
    prevstroke.strokeColor = new paper.Color(data.content[1], data.content[2], data.content[3]);
    prevstroke.data.free = data.free;
};

function handleLowerMaskMessage(data) {
    if (!curslide.lowermask) {
        curslide.lowermask = new paper.Layer();
    }
    else
        curslide.lowermask.activate();

    var maskstroke = new paper.Path(JSON.parse(data.content)[1]);
    maskstroke.scale(scale, new paper.Point(0,0));
}

function handleMaskPropagateMessage(data) {
    var slidenum = data.slidenum;
    var masklayer = JSON.parse(data.mask)[1];
    var slide;
    for (var i = slidenum+1; i < slides.length; i++) {
        slide = slides[i];
        slide.masklayer.removeChildren();
        var mitems = masklayer.children;
        for (var m = 0; m < mitems.length; m++) {
            var mitem = slide.masklayer.addChild(new paper.Path(mitems[m][1]));
            mitem.scale(scale, new paper.Point(0,0));
            mitem.fillColor = slide.items[0].praster.bgcolor.toCSS(true);
            mitem.fillColor.alpah = 1.0;
        }
    }
};

function handleMaskMessage(data) {
    if (!curslide.masklayer) {
        curslide.masklayer = new paper.Layer();
    }
    else
        curslide.masklayer.activate();

    var maskbox = new paper.Path(JSON.parse(data.content)[1]);
    maskbox.scale(scale, new paper.Point(0, 0));
    var maskitem = curslide.masklayer.getItems()[0];
    var result;
    if (data.add)
        result = maskitem.unite(maskbox);
    else if (maskitem.className === 'Path' || maskitem.className === 'CompoundPath') {
        result = maskitem.subtract(maskbox);
    }
    maskbox.remove();
    maskitem.remove();

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
    curslide.masklayer.visible = false;

};

function handleReleaseTargetMessage(data) {
    curtargetitem = null;
};


function handleKeyboardEvents(event) {
    switch(event.key) {
        case "s":
            document.getElementById('download_link').style.display = 'block';
            break;
        default:
    }
};

function startRecording() {

    var stream = acanvas.captureStream(60);
    var options = {mimeType: 'video/webm'};
    if (recordedChunks == null) {
        recordedChunks = [];
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e0) {
            console.log('Unable to create MediaRecorder with options Object: ', e0);
            try {
                options = {mimeType: 'video/webm,codecs=vp9'};
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e1) {
                console.log('Unable to create MediaRecorder with options Object: ', e1);
                try {
                    options = 'video/vp8'; // Chrome 47
                    mediaRecorder = new MediaRecorder(stream, options);
                } catch (e2) {
                    alert('MediaRecorder is not supported by this browser.\n\n' +
                        'Try Firefox 29 or later, or Chrome 47 or later, with Enable experimental Web Platform features enabled from chrome://flags.');
                    console.error('Exception while creating MediaRecorder:', e2);
                    return;
                }
            }
        }

        console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.start(100);
    }
    else {
        mediaRecorder.resume();
    }

    function handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
};

function stopRecording() {
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedChunks);
    downloadRecording();
};

function pauseRecording() {
    mediaRecorder.pause();

};

function downloadRecording() {
    var blob = new Blob(recordedChunks, {type: 'video/webm'});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'audience ' + new Date() + '.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
};

function displayCursor(id, x, y) {
    if (id == 'pen-cursor') {
        pencursor.position.x = x;
        pencursor.position.y = y;
        pencursor.visible = true;
        erasercursor.visible = false;
        markercursor.visible = false;

    } else if (id == 'eraser-cursor') {
        erasercursor.position.x = x;
        erasercursor.position.y = y;
        erasercursor.visible = true;
        pencursor.visible = false;
        markercursor.visible = false;

    } else if (id == 'marker-cursor') {
        markercursor.position.x = x;
        markercursor.position.y = y;
        markercursor.visible = true;
        pencursor.visible = false;
        erasercursor.visible = false;
    }

    // console.log(cursor.style.display);
    // cursor.style.left = x + 'px';
    // cursor.style.top = y + 'px';

};

function hideCursors() {
    pencursor.visible = false;
    erasercursor.visible = false;
};
