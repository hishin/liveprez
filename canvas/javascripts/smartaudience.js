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
var aspectratio;
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
        } else if (data.type === 'propagate-mask') {
            handleMaskPropagateMessage(data);
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

};

window.onresize = function(event) {
    event.preventDefault();
    SLIDE_W = $(window).width() - 5 ;
    SLIDE_H = SLIDE_W * aspectratio;
    if (SLIDE_H > $(window).height() - 5) {
        SLIDE_H = $(window).height() -5;
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
    // var numslide = JSON.parse(data.num);
    aspectratio = data.aspectratio;
    SLIDE_W = $(window).width() - 5;// * 0.95;
    SLIDE_H = SLIDE_W * aspectratio;
    if (SLIDE_H > $(window).height() - 5) {
        SLIDE_H = $(window).height() - 5;
        SLIDE_W = SLIDE_H/aspectratio;
    }
    resizeCanvas(SLIDE_W, SLIDE_H);

    apaper.project.clear();
    var deck = JSON.parse(data.deck).slides;
    var slide, item;
    for (var i = 0; i < deck.length; i++) {
        slide = deck[i];
        slide.itemlayer = [];
        for (var j = 0; j < slide.nitems; j++) {
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
    console.log(slide);
    showSlide(slides[slide.num]);

    curslide = slides[slide.num];
    curslidenum = curslide.num;
    curitem = curslide.items[curslide.items.length-1];
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

function loadItem(slide, item, i) {
    var layer = new paper.Layer();
    slide.itemlayer.push(layer);
    item.praster = new paper.Raster(item.src);
    item.praster.fitBounds(paper.view.bounds);
    item.praster.scale = Math.max(item.praster.width / paper.view.bounds.width, item.praster.height / paper.view.bounds.height);
    if (i == 0) {
        item.praster.onLoad = function () {
            // var imgdata = this.getImageData(new paper.Rectangle(0, 0, this.width, this.height));
            // var c = getBackgroundColor(imgdata.data)
            // var pc = pColorFromDataRGB(c);
            this.bgcolor = new paper.Color('white');//new paper.Color(pc[0], pc[1], pc[2]);
            // if (curslide.masklayer) {
            //     var maskitems = curslide.masklayer.getItems();
            //     for (var i = 0; i < maskitems.length; i++) {
            //         var item = maskitems[i];
            //         item.fillColor = this.bgcolor;
            //     }
            // }
        };
    } else {
        item.pclip = new paper.Path.Rectangle([0,0],[0,0]);
        item.pclip.fillColor = 'black';
        item.pgroup = new paper.Group(item.pclip, item.praster);
        item.pgroup.clipped = true;
        layer.insertAbove(slide.itemlayer[slide.itemlayer.length - 2]);
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

    // else if (maskitem.className === 'Path' || maskitem.className === 'CompoundPath') {
    //
    // }
    // if (!data.add) {
    //     // get ink inside this region
    //     var inkitems = curslide.inklayer.getItems({inside: maskbox.bounds});
    //     for (var i = 0; i < inkitems.length; i++) {
    //         if (!inkitems[i].data.free)
    //             inkitems[i].onFrame = function (event) {
    //                 if (this.strokeColor.alpha <= 0) this.remove();
    //                 this.strokeColor.alpha -= 0.05;
    //             }
    //     }
    //
    //     maskbox.onFrame = function () {
    //         if (this.fillColor.alpha <= 0) {
    //             this.remove();
    //         }
    //         this.fillColor.alpha -= 0.05;
    //     };
    // }
};

function handleReleaseTargetMessage(data) {
    curtargetitem = null;
};

