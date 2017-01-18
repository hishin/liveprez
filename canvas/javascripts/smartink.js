/**
 * Created by hijun on 1/16/2017.
 */

var sslide;
var scanvas;
var spaper;
var SLIDE_W = 600;
var SLIDE_H = 450;

window.onload = function () {
    setupSlideCanvas();
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
        onLoad: function (svgitem, data) {
            var wscale = parseFloat(spaper.canvas.width) / svgitem.bounds.width;
            var hscale = parseFloat(spaper.canvas.height) / svgitem.bounds.height;
            svgitem.scale(wscale, hscale);
            var delta = new paper.Point(-svgitem.bounds.left, -svgitem.bounds.top);
            svgitem.translate(delta);
            showHiddenItems(svgitem);
        }
    });
};


