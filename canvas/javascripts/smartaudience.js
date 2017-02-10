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
var curstroke = null;
var slidelayer;
var inklayer;
var reveal = false;
var aspectratio = 0.75;
var scale = 1.0;
var speakerwidth;

window.addEventListener('message', function(event) {
    var data = JSON.parse(event.data);
    if (data && data.namespace === 'liveprez') {
        if (data.type === 'connect') {
            handleConnectMessage(data);
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
        } else if (data.type === 'release-target') {
            handleReleaseTargetMessage(data);
        } else if (data.type === 'slide-resize') {
            handleSlideResizeMessage(data);
        }

    }
});

window.onload = function() {
    aslide = document.getElementById('audience-slide');
    acanvas = document.createElement('canvas');
    acanvas.setAttribute('id', aslide.id.replace('slide', 'canvas'));
    aslide.appendChild(acanvas);

    apaper = new paper.PaperScope();
    apaper.setup(acanvas);

    SLIDE_W = $(window).width() * 0.95;
    SLIDE_H = SLIDE_W * aspectratio;
    if (SLIDE_H > $(window).height()) {
        SLIDE_H = $(window).height() *0.95;
        SLIDE_W = SLIDE_H/aspectratio;
    }
    resizeCanvas(SLIDE_W, SLIDE_H);
    // resizeCanvas(screen.width, screen.height);
    // apaper.view.viewSize.width = CANVAS_W;
    // apaper.view.viewSize.height = CANVAS_H;
    // acanvas.width = CANVAS_W;
    // acanvas.height = CANVAS_H;

    aslide.paper = apaper;
    aslide.canvas = acanvas;
    acanvas.paper = apaper;
    acanvas.slide = aslide;
    apaper.slide = aslide;
    apaper.canvas = acanvas;
};

window.onresize = function() {
    // var origw = SLIDE_w;
    SLIDE_W = $(window).width() * 0.95;
    SLIDE_H = SLIDE_W * aspectratio;
    if (SLIDE_H > $(window).height()) {
        SLIDE_H = $(window).height() * 0.95;
        SLIDE_W = SLIDE_H/aspectratio;
    }
    resizeCanvas(SLIDE_W, SLIDE_H);
    // loadSlide(curslide);
};

function handleConnectMessage(data) {
    if (connected === false) {
        connected = true;
    }
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
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
    apaper.project.clear();
    // apaper.view.viewSize.width = CANVAS_W;
    // apaper.view.viewSize.height = CANVAS_H;
    // acanvas.width = CANVAS_W;
    // acanvas.height = CANVAS_H;
    inklayer = null;

    for (var i = 0; i < slide.nitems; i++) {
        var item = slide.items[i];
        loadItem(item);
    }
};

function resizeCanvas(width, height) {
    var origw = apaper.view.viewSize.width;
    var rscale = width/origw;
    aslide.style.width = width + 'px';
    aslide.style.height = height + 'px';
    apaper.view.viewSize.width = width;
    apaper.view.viewSize.height = height;
    acanvas.width = width;
    acanvas.height = height;

    if (apaper.project.layers) {
        console.log('rscale: ' + rscale);
        for (var i = 0; i < apaper.project.layers.length; i++) {
            apaper.project.layers[i].scale(rscale, new paper.Point(0,0));
        }
    }

    scale = SLIDE_W/speakerwidth;

};

function loadItem(item) {
    if (item.type == 'image' && item.src) {
        slidelayer = new paper.Layer();
        var wscale = 1.0;//parseFloat(CANVAS_W) / SLIDE_W;
        var hscale = 1.0;//parseFloat(CANVAS_H) / SLIDE_H;
        var ext = item.src.split('.').pop();

        if (ext == 'png' || ext == 'jpg' || ext=='jpeg' || ext == 'bmp') {
            item.praster = new paper.Raster(item.src);
            item.praster.fitBounds(paper.view.bounds, true);
            // create a clipmask
            item.clip = new paper.Path();
            // item.clip.segments = [];
            item.pgroup = new paper.Group([item.clip, item.praster]);
            item.pgroup.clipped = true;
        } else if (ext == 'svg') {
            slidelayer.importSVG(item.src, {
                expandShapes: true,
                applyMatrix: true,
                onLoad: function(svgitem, data) {
                    item.psvg = svgitem;
                    svgitem.item = item;
                    svgitem.pivot = new paper.Point(0,0);
                    svgitem.scale(item.width / svgitem.bounds.width * wscale, item.height / svgitem.bounds.height * hscale);
                    var delta = new paper.Point(item.left * wscale, item.top * hscale);
                    svgitem.translate(delta);
                }
            });
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

function handleInkMessage(data) {
    if (!inklayer) {
        inklayer = new paper.Layer();
    }
    else
        inklayer.activate();
    if (curstroke) {
        curstroke.remove();
    }
    curstroke = new paper.Path(JSON.parse(data.content)[1]);
    console.log(scale);
    curstroke.scale(scale, new paper.Point(0,0));
    if (data.end) {
        curstroke = null;
    }
};
function handleReleaseTargetMessage(data) {
    curtargetitem = null;
}
