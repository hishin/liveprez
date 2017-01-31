/**
 * Created by Hijung Shin on 1/30/2017.
 */
var SLIDE_W = 960;
var SLIDE_H = 700;
var CANVAS_W = 600;
var CANVAS_H = 438.5;
var aslide;
var acanvas;
var apaper;
var connected;
var curslide;
var curstroke = null;

window.addEventListener('message', function(event) {
    var data = JSON.parse(event.data);
    if (data && data.namespace === 'liveprez') {
        if (data.type === 'connect') {
            handleConnectMessage(data);
        } else if (data.type === 'slide-change') {
            handleSlideChangeMessage(data);
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
        }

    }
});

window.onload = function() {
    aslide = document.getElementById('audience-slide');
    console.log(aslide);
    acanvas = document.createElement('canvas');
    console.log(acanvas);
    acanvas.setAttribute('id', aslide.id.replace('slide', 'canvas'));
    aslide.appendChild(acanvas);

    apaper = new paper.PaperScope();
    apaper.setup(acanvas);

    apaper.view.viewSize.width = CANVAS_W;
    apaper.view.viewSize.height = CANVAS_H;
    acanvas.width = CANVAS_W;
    acanvas.height = CANVAS_H;

    aslide.paper = apaper;
    aslide.canvas = acanvas;
    acanvas.paper = apaper;
    acanvas.slide = aslide;
    apaper.slide = aslide;
    apaper.canvas = acanvas;
};

function handleConnectMessage(data) {
    if (connected === false) {
        connected = true;
    }
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
    handleSlideChangeMessage(data);
};


function handleSlideChangeMessage(data) {
    curslide = JSON.parse(data.state);
    loadSlide(curslide);
 };

function loadSlide(slide) {
    apaper.project.clear();
    apaper.view.viewSize.width = CANVAS_W;
    apaper.view.viewSize.height = CANVAS_H;
    acanvas.width = CANVAS_W;
    acanvas.height = CANVAS_H;

    for (var i = 0; i < slide.nitems; i++) {
        var item = slide.items[i];
        loadItem(item);
    }
};

function loadItem(item) {
    if (item.type == 'image' && item.src) {
        var layer = new paper.Layer();
        var wscale = parseFloat(CANVAS_W) / SLIDE_W;
        var hscale = parseFloat(CANVAS_H) / SLIDE_H;
        var ext = item.src.split('.').pop();

        if (ext == 'png' || ext == 'jpg' || ext=='jpeg' || ext == 'bmp') {
            item.pitem = new paper.Raster(item.src);
            item.pitem.pivot = new paper.Path(0, 0);//item.pborder.bounds.topLeft;

            item.pbbox = new paper.Shape.Rectangle(0, 0, item.width, item.height);
            item.pbbox.pivot = item.pbbox.bounds.topLeft;
            item.pbbox.scale(wscale, hscale, item.pbbox.pivot);
            item.pbbox.item = item;
            item.pbbox.opacity = 0;

            var delta = new paper.Point(item.left * wscale, item.top * hscale);
            item.pbbox.translate(delta);
            item.pitem.scale(item.width / item.pitem.bounds.width * wscale, item.height / item.pitem.bounds.height * hscale);
            item.pitem.position = item.pbbox.bounds.center;
        } else if (ext == 'svg') {
            layer.importSVG(item.src, {
                expandShapes: true,
                applyMatrix: true,
                onLoad: function(svgitem, data) {
                    item.pitem = svgitem;
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
    if (curstroke)
        curstroke.remove();
    curstroke = new paper.Path(JSON.parse(data.content)[1]);
    if (data.end)
        curstroke = null;
};



function handleReleaseTargetMessage(data) {
    curtargetitem = null;
}
