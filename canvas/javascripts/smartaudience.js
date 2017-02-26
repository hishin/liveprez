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
// var bgcolor;
var curstroke = null;
var prevstroke = null;
var slidelayer;
var reveal = false;
var aspectratio = 0.75;
var scale = 1.0;
var speakerwidth;
var slides;

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
        } else if (data.type ==='lowermask') {
            handleLowerMaskMessage(data);
        } else if (data.type === 'mask') {
            handleMaskMessage(data);
        } else if (data.type === 'release-target') {
            handleReleaseTargetMessage(data);
        } else if (data.type === 'slide-resize') {
            handleSlideResizeMessage(data);
        } else if (data.type === 'color-change') {
            handleColorChangeMessage(data);
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

window.onresize = function(event) {
    event.preventDefault();
    SLIDE_W = $(window).width() * 0.95;
    SLIDE_H = SLIDE_W * aspectratio;
    if (SLIDE_H > $(window).height()) {
        SLIDE_H = $(window).height() * 0.95;
        SLIDE_W = SLIDE_H/aspectratio;
    }

    resizeCanvas(SLIDE_W, SLIDE_H);

};

function handleConnectMessage(data) {
    if (connected === false) {
        connected = true;
    }
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
};

function handleSlideSetupMessage(data) {
    var numslide = JSON.parse(data.num);
    slides = new Array(numslide);
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
    // apaper.project.clear();
    if (!slides[slide.num]) {
        var item;
        slides[slide.num] = slide;
        slide.itemlayer = new paper.Layer();
        for (var i = 0; i < slide.nitems; i++) {
            item = slide.items[i];
            loadItem(item);
        }
        var lowermask = new paper.Layer();
        var lowermaskitems = slide.lowermask[1].children;
        if (lowermaskitems) {
            for (var i = 0; i < lowermaskitems.length; i ++) {
                var lmitem = lowermask.addChild(new paper.Path(lowermaskitems[i][1]));
                lmitem.scale(scale, new paper.Point(0,0));
            }
        }
        lowermask.insertAbove(slide.itemlayer);
        slide.lowermask = lowermask;

        var masklayer = new paper.Layer();
        var maskitems = slide.masklayer[1].children;
        if (maskitems) {
            for (var i = 0; i < maskitems.length; i ++) {
                var mitem = masklayer.addChild(new paper.Path(maskitems[i][1]));
                if (item.praster && item.praster.bgcolor) {
                    mitem.fillColor = bgcolor;
                } else {
                    mitem.fillColor = 'white';
                }
                mitem.scale(scale, new paper.Point(0,0));
            }
        }
        masklayer.insertAbove(slide.lowermask);
        slide.masklayer = masklayer;

        var inklayer = new paper.Layer();
        var inkitems = slide.inklayer[1].children;
        if (inkitems) {
            for (var i = 0; i < inkitems.length; i ++) {
                var iitem = inklayer.addChild(new paper.Path(inkitems[i][1]));
                iitem.scale(scale, new paper.Point(0,0));

            }
        }
        inklayer.insertAbove(slide.masklayer);
        slide.inklayer = inklayer;

    } else {
        // hide current slide
        if (curslidenum) {
            slides[curslidenum].itemlayer.visible = false;
            slides[curslidenum].lowermask.visible = false;
            slides[curslidenum].masklayer.visible = false;
            slides[curslidenum].inklayer.visible = false;
        }
        slides[slide.num].itemlayer.visible = true;
        slides[slide.num].lowermask.visible = true;
        var maskitems = slide.masklayer[1].children;
        if (maskitems) {
            for (var i = 0; i < maskitems.length; i ++) {
                var mitem = slides[slide.num].masklayer.addChild(new paper.Path(maskitems[i][1]));
                var item = slide.items[0];
                if (item.praster && item.praster.bgcolor) {
                    mitem.fillColor = bgcolor;
                } else {
                    mitem.fillColor = 'white';
                }
                mitem.scale(scale, new paper.Point(0,0));
            }
        }
        slides[slide.num].masklayer.visible = true;
        slides[slide.num].inklayer.visible = true;
    }
    curslide = slides[slide.num];
    curslidenum = curslide.num;
    curitem = curslide.items[0];
};

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
    apaper.view.update();

};

function loadItem(item) {
    // if (item.type == 'image' && item.src) {
    curslide.itemlayer.activate();
    item.praster = new paper.Raster(item.src);
    item.praster.onLoad = function() {
        var imgdata = this.getImageData(new paper.Rectangle(0, 0, this.width, this.height));
        var c = getBackgroundColor(imgdata.data)
        var pc = pColorFromDataRGB(c);
        this.bgcolor = new paper.Color(pc[0], pc[1], pc[2]);
        if (curslide.masklayer) {
            var maskitems = curslide.masklayer.getItems();
            for (var i = 0; i < maskitems.length; i ++) {
                var item = maskitems[i];
                item.fillColor = this.bgcolor;
            }
        }
    };
    item.praster.fitBounds(paper.view.bounds, true);
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
    if (!curslide.inklayer) {
        curslide.inklayer = new paper.Layer();
    }
    else
        curslide.inklayer.activate();
    if (curstroke) {
        curstroke.remove();
    }
    curstroke = new paper.Path(JSON.parse(data.content)[1]);
    curstroke.scale(scale, new paper.Point(0,0));
    if (data.end) {
        curstroke.data.free = data.free;
        if (data.fillalpha) {
            console.log(data.fillalpha);
            curstroke.fillColor.alpha = data.fillalpha;
        }
        prevstroke = curstroke;
        curstroke = null;
    }
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

function handleMaskMessage(data) {
    if (!curslide.masklayer) {
        curslide.masklayer = new paper.Layer();
    }
    else
        curslide.masklayer.activate();

    if (!data.add && curslide.masklayer.getItems().length == 0) {
        return;
    }
    var maskbox = new paper.Path(JSON.parse(data.content)[1]);
    maskbox.fillColor = data.bgcolor;
    maskbox.fillColor.alpha = 1.0;
    maskbox.strokeWidth = 0;
    maskbox.scale(scale, new paper.Point(0,0));

    if (curslide.masklayer.getItems().length > 0) {
        var maskitem = curslide.masklayer.getItems()[0];
        if (data.add) {
            maskitem.unite(maskbox);
            maskbox.remove();
        }
        else if (maskitem.className === 'Path' || maskitem.className === 'CompoundPath') {
            maskitem.subtract(maskbox);
            maskbox.onFrame = function () {
                if (this.fillColor.alpha <= 0) {
                    this.remove();
                }
                this.fillColor.alpha -= 0.01;
            };
        }
        maskitem.remove();

        // get ink inside this region
        if (!data.add) {
            var inkitems = curslide.inklayer.getItems({inside: maskbox.bounds});
            for (var i = 0; i < inkitems.length; i++) {
                if (!inkitems[i].data.free)
                    inkitems[i].onFrame = function (event) {
                        if (this.strokeColor.alpha <= 0) this.remove();
                        this.strokeColor.alpha -= 0.02;
                    }
            }
        }

    }
};

function handleReleaseTargetMessage(data) {
    curtargetitem = null;
}
