/**
 * Created by Valentina on 1/23/2017.
 */

var SlideDeck = function(slide_files) {
    this.slides = [];
    this.n = slide_files.length;
    for (var i = 0; i < this.n; i++) {
        var slide = new Slide(slide_files[i], i);
        slide.num = this.slides.length;
        this.slides.push(slide);
    }

    this.getSlide = function(num){
        if (num >= this.n) {
            return null;
        }
        return this.slides[num];
    };
};

var Slide = function(sfile, p) {
    this.pagenum = p;
    this.loaded = false;
    this.itemlayer = null
    this.lowermask = null;
    this.masklayer = null;;
    this.inklayer = null;
    this.items = [];
    this.nitems = 1;
    this.sfile = sfile;
    var slide = this;
    var reader = new FileReader();
    reader.onload = function(theFile) {
        return function (e) {
            // document.getElementById('thumb-'+slide.pagenum).src = e.target.result;
            var item = new Item(e.target.result);
            var img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                item.width = this.width;
                item.height = this.height;
                if (!aspectratio) {
                    aspectratio = this.height/this.width;
                    img_w = this.width;
                    SLIDE_W = $(window).width() * 0.75;
                    SLIDE_H = SLIDE_W * aspectratio;
                    if (SLIDE_H > $(window).height()) {
                        SLIDE_H = $(window).height() * 0.75;
                        SLIDE_W = SLIDE_H/aspectratio;
                    }
                    scale = img_w/SLIDE_W;
                }
            }
            slide.items.push(item);
        }
    }(sfile);
    reader.readAsDataURL(sfile);

    this.hide = function() {
        this.itemlayer.visible = false;
        this.inklayer.visible = false;
        this.masklayer.visible = false;
    };

    this.show = function() {
        this.itemlayer.visible = true;
        this.inklayer.visible = true;
        this.masklayer.visible = true;
    };
}

function Item(url) {
    this.src = url;
    this.psvg = null;
    this.praster = null;
    this.pborder = null;
    this.pbbox = null;
    var item = this;

    this.setRaster = function(raster){
        this.praster = raster;
        this.praster.onLoad = function() {
            this.bgcolor = getBackgroundColor(this);
            // computeColorToAlpha(this, this.bgcolor);
            // colorToAlpha(this, this.bgcolor);
            // this.sobel = computeSobel(this);
            this.sobel = edgeTangentFlow(this, 3);
            // this.gauss1 = computeGaussian(this, 10);
            // this.gauss2 = computeGaussian(this, 5);
            for (var x = 0; x < this.sobel.width; x++) {
                for (var y = 0; y < this.sobel.height; y++) {
                    var offset = (y*this.sobel.width + x) * 4;
                    var dx = this.sobel.data[offset];
                    var dy = this.sobel.data[offset+1];
                    this.setPixel(x,y, new paper.Color(dy, dx, 0));
                    // var gcolor1 = new paper.Color(this.gauss1.data[offset]/255.0, this.gauss1.data[offset+1]/255.0, this.gauss1.data[offset+2]/255.0);
                    // var gcolor2 = new paper.Color(this.gauss2.data[offset]/255.0, this.gauss2.data[offset+1]/255.0, this.gauss2.data[offset+2]/255.0);
                    // var gcolor = gcolor1.subtract(gcolor2);
                    // if (gcolor.red + gcolor.blue + gcolor.green < 0.1) {
                    //     this.setPixel(x, y, new paper.Color(1,1,1));
                    //
                    // }
                }
            }
        };
    };

    function computeSobel(raster) {
        var imagedata = raster.getImageData(new paper.Rectangle(0, 0, raster.width, raster.height));
        var sobel = Filters.sobel(imagedata);
        return sobel;
    };

    function computeGaussian(raster, diameter) {
        var imagedata = raster.getImageData(raster.bounds);
        var gauss = Filters.gaussianBlur(imagedata, diameter);
        return gauss;
    };

    function computeColorToAlpha(raster, bgcolor) {
        for (var x = 0; x < raster.width; x++) {
            for (var y = 0; y < raster.height; y++) {
                var p = raster.getPixel(x, y);
                var np = colorToAlpha(p, bgcolor);
                raster.setPixel(x, y, np);
            }
        }
    };



    function computeLocalMaxima(grad) {
        var nrows = grad.length;
        var ncols = grad[0].length;

        var maxima = new Array(nrows);
        for (var i = 0; i < nrows; i++) {
            maxima[i] = new Array(ncols);
        }

        for (var i = 0; i < nrows; i++) {
            for (var j = 0; j < ncols; j++) {
                maxima[i][j] = isLocalMaxima(grad, i, j);

            }
        }
        return maxima;
    };

    function isLocalMaxima(grad, x, y) {

        for (var i =Math.max(0, x-1); i < Math.min(grad.length, x+2); i++) {
            for (var j = Math.max(0, y-1); j< Math.min(grad[0].length, y+2); j++) {
                if (grad[i][j][0]*grad[i][j][0] + grad[i][j][1]*grad[i][j][1] > grad[x][y][0]*grad[x][y][0] + grad[x][y][1]*grad[x][y][1]) {
                    return false;
                }
            }
        }
        return true;
    };

    this.close = function() {
        this.pborder.strokeWidth = 2;
        this.pborder.dashArray = [3,2];
        this.pborder.opacity = 0.5;
    };

    // this.activateMouseEvents = function() {
    //     this.pbbox.onMouseEnter = function(event) {
    //         this.item.pborder.dashArray = [];
    //     };
    //     this.pbbox.onMouseLeave = function(event) {
    //         this.item.pborder.dashArray = [3,2];
    //     };
    //     this.pbbox.onClick = function(event) {
    //         deactivateItemMouseEvents();
    //         openItem(this.item);
    //     };
    // }
};

var InkStyle = function(pitem) {
    this.fillColor = pitem.style.fillColor;
    this.strokeColor = pitem.style.strokeColor;
    this.strokeWidth = pitem.style.strokeWidth;
    if (pitem.closed) this.closed = true;
    else this.closed = false;

    this.listElement = function() {
        var li = document.createElement("li");
        var stroke_des = 'W: ' + this.strokeWidth;
        stroke_des += (', Fill: ' + this.fillColor);
        stroke_des += (', Stroke: ' + this.strokeColor);
        stroke_des += (', ' + this.closed);
        li.appendChild(document.createTextNode(stroke_des));

        li.inkstyle = this;
        li.addEventListener('click', setInkStyle, false);
        return li;
    };

    this.isEqualTo = function(that) {
        if (this.fillColor && that.fillColor && this.fillColor.toString() != that.fillColor.toString()) {
            return false;
        }
        if (this.strokeColor && that.strokeColor && this.strokeColor.toString() != that.strokeColor.toString()) {
            return false;
        }
        if (this.strokeWidth && that.strokeWidth && this.strokeWidth.toString() != that.strokeWidth.toString()) {
            return false;
        }
        if ((!this.fillColor && that.fillColor) || (this.fillColor && !that.fillColor)){
            return false;
        }
        if ((!this.strokeColor && that.strokeColor) || (this.strokeColor && !that.strokeColor)){
            return false;
        }
        if ((!this.strokeWidth && that.strokeWidth) || (this.strokeWidth && !that.strokeWidth)){
            return false;
        }
        return true;

    };
};


