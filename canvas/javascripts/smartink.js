/**
 * Created by hijun on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W = 600;
var SLIDE_H = 400;
var numslides;

window.onload = function () {
    setupSlideCanvas();
    numslides = document.getElementById("slide-deck").length;
};

function setupSlideCanvas() {
    sslide = document.getElementById('speaker-slide');
    scanvas = document.createElement('canvas');
    scanvas.setAttribute('id', sslide.id.replace('slide', 'canvas'));
    sslide.appendChild(scanvas);

    spaper = new paper.PaperScope();
    spaper.setup(scanvas);

    spaper.view.viewSize.width = SLIDE_W;
    spaper.view.viewSize.height = SLIDE_H;
    scanvas.width = SLIDE_W;
    scanvas.height = SLIDE_H;
    sslide.paper = spaper;
    sslide.canvas = scanvas;
    scanvas.paper = spaper;
    scanvas.slide = sslide;
    spaper.slide = sslide;
    spaper.canvas = scanvas;

    loadSlide();
};

function loadSlide() {
    spaper.project.clear();
    spaper.view.viewSize.width = SLIDE_W;
    spaper.view.viewSize.height = SLIDE_H;
    scanvas.width = SLIDE_W;
    scanvas.height = SLIDE_H;
    var slide_src = document.getElementById('slide-deck').value;
    spaper.project.activeLayer.importSVG(slide_src, {
        expandShapes: true,
        applyMatrix: true,
        onLoad: function (svgslide, data) {
            var wscale = parseFloat(spaper.canvas.width) / svgslide.bounds.width;
            var hscale = parseFloat(spaper.canvas.height) / svgslide.bounds.height;
            svgslide.scale(wscale, hscale);
            var delta = new paper.Point(-svgslide.bounds.left, -svgslide.bounds.top);
            svgslide.translate(delta);
            addItemBorders(svgslide);
        }
    });
};

function addItemBorders(svgslide) {
    var item;
    // Special case:: children[0] is always the slide background
    for (var i = 1; i < svgslide.children.length; i++) {
        item = svgslide.children[i];
        if (!item.border) {
            item.border = new paper.Path.Rectangle(item.bounds);
            item.border.item = item;
            item.border.strokeColor = '#3198C8';
            item.border.strokeWidth = 2;
            item.border.dashArray = [3,2];
            item.border.opacity = 0.5;
        }
         if (!item.bbox) {
             item.bbox = new paper.Shape.Rectangle(item.bounds);
             item.bbox.item = item;
             item.bbox.fillColor = '#000000';
             item.bbox.opacity = 0;
             item.bbox.onMouseEnter = function(event) {
                 this.item.border.dashArray = [];
             };
             item.bbox.onMouseLeave = function(event) {
                 this.item.border.dashArray = [3,2];
             };
             item.bbox.onClick = function(event) {
                 console.log("click");
             };
        }


    }
};



function showHiddenItems() {

};

function prevSlide() {
    if ( document.getElementById('slide-deck').selectedIndex > 0) {
        document.getElementById("slide-deck").selectedIndex--;
        loadSlide();
    }
};

function nextSlide() {
    if (document.getElementById('slide-deck').selectedIndex < numslides - 1) {
        document.getElementById("slide-deck").selectedIndex++;
        loadSlide();
    }
};


