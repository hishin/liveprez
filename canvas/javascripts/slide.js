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
            var item = new Item(e.target.result, slide);
            var img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                item.width = this.width;
                item.height = this.height;
                if (!aspectratio) {
                    aspectratio = this.height/this.width;
                    img_w = this.width;
                    SLIDE_H = $(window).height() * 0.85;
                    SLIDE_W = SLIDE_H / aspectratio;
                    if (SLIDE_W > $(window).width()) {
                        SLIDE_W = $(window).width() * 0.90;
                        SLIDE_H = SLIDE_W*aspectratio;
                    }
                    // scale = img_w/SLIDE_W;
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

function Item(url, slide) {
    this.src = url;
    this.psvg = null;
    this.praster = null;
    this.pborder = null;
    this.pbbox = null;

    this.setRaster = function(raster){
        this.praster = raster;
        this.praster.onLoad = function() {
            console.log("Compute Background Color");
            var imgdata = this.getImageData(new paper.Rectangle(0, 0, this.width, this.height));
            var c = getBackgroundColor(imgdata.data)
            var pc = pColorFromDataRGB(c);
            this.bgcolor = new paper.Color(pc[0], pc[1], pc[2]);
            this.annocolor = invertColor(this.bgcolor);
            this.fg = booleanImageFromForeground(imgdata, c, 20);
            console.log("Compute Edge Information");
            this.sobel = computeSobel(this);
            this.sobelbool = booleanImageFromSobel(this.sobel, 10);
            console.log("Compute Distance Transformation");
            this.dt = distanceTransform(this.sobelbool, this.width, this.height, "EDT");
            console.log("Generate Stroke Width Image");
            this.swidth = strokeWidthImage(this.dt, this.fg, 1, 15);
            console.log("done");

        }
    };
};

function medianFilter(praster) {
    var imgdata = praster.getImageData(new paper.Rectangle(0, 0, praster.width, praster.height));

    console.log("filter start");
    var mfilter = new MedianFilter();
    var imdata = mfilter.convertImage(imgdata);
    console.log("filter end");
    for (var x = 0; x < praster.width; x++ ) {
        for (var y = 0; y < praster.height; y++) {
            var offset = (y*praster.width + x) * 4;
            var c = new paper.Color(imdata.data[offset]/255, imdata.data[offset+1]/255, imdata.data[offset+2]/255);
            praster.setPixel(x, y, c);
        }
    }
};

function shiftColors(praster) {
    var colors = [];
    for (var x = 0; x < praster.width; x++) {
        for (var y = 0; y < praster.height; y++) {
            var p = praster.getPixel(x,y);
            colors.push([p.red, p.green, p.blue]);
        }
    }
    var meanshift = new MeanShift();
    console.log("shift colors");
    var newcolors = meanshift.cluster(colors, 1.0);
    var idx = 0;
    for (var x = 0; x < praster.width; x++) {
        for (var y = 0; y < praster.height; y++) {
            var c = newcolors[idx];
            praster.setPixel(x,y, new paper.Color(c[0], c[1], c[2]));
            idx++;
        }
    }
    console.log("done");

};

function strokeWidthImage(dt, fg, min, max) {
    var widthImage = new Array(dt.length);
    for (var i = 0; i < dt.length; i++) {
        if (fg[i] == 0) {
            widthImage[i] = min;
        }
        else if (dt[i] > max) {
            widthImage[i] = max;
        } else if (dt[i] < min) {
            widthImage[i] = min;
        } else {
            widthImage[i] = dt[i];
        }
    }
    return widthImage;
};

function booleanImageFromSobel(sobel, threshold) {
    var m = sobel.width;
    var n = sobel.height;
    var idx = 0;
    var booleanImage = new Array(m*n);
    for (var j = 0; j < n; j++) {
        for (var i = 0; i < m; i++) {
            var c = sobel.data[idx*4+2] > threshold ? 1:0;
            booleanImage[idx] = c;
            idx++;
        }
    }
    return booleanImage;

};

function computeSobel(raster) {
    var imagedata = raster.getImageData(new paper.Rectangle(0, 0, raster.width, raster.height));
    var sobel = Filters.sobel(imagedata);
    return sobel;
};

function booleanImageFromForeground(imdata, bgcolor, threshold) {
    var m = imdata.width;
    var n = imdata.height;
    var idx = 0;
    var p, diff, off;

    var booleanImage = new Array(m*n);
    for (var j = 0; j < n; j++) {
        for (var i = 0; i < m; i++) {
            off = (j * m + i) * 4;
            p = [imdata.data[off], imdata.data[off+1], imdata.data[off+2]];
            diff = deltaRGB(p, bgcolor);
            booleanImage[idx] = diff > threshold ? 1:0;
            idx++;
        }
    }
    return booleanImage;
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



// var InkStyle = function(pitem) {
//     this.fillColor = pitem.style.fillColor;
//     this.strokeColor = pitem.style.strokeColor;
//     this.strokeWidth = pitem.style.strokeWidth;
//     if (pitem.closed) this.closed = true;
//     else this.closed = false;
//
//     this.listElement = function() {
//         var li = document.createElement("li");
//         var stroke_des = 'W: ' + this.strokeWidth;
//         stroke_des += (', Fill: ' + this.fillColor);
//         stroke_des += (', Stroke: ' + this.strokeColor);
//         stroke_des += (', ' + this.closed);
//         li.appendChild(document.createTextNode(stroke_des));
//
//         li.inkstyle = this;
//         li.addEventListener('click', setInkStyle, false);
//         return li;
//     };
//
//     this.isEqualTo = function(that) {
//         if (this.fillColor && that.fillColor && this.fillColor.toString() != that.fillColor.toString()) {
//             return false;
//         }
//         if (this.strokeColor && that.strokeColor && this.strokeColor.toString() != that.strokeColor.toString()) {
//             return false;
//         }
//         if (this.strokeWidth && that.strokeWidth && this.strokeWidth.toString() != that.strokeWidth.toString()) {
//             return false;
//         }
//         if ((!this.fillColor && that.fillColor) || (this.fillColor && !that.fillColor)){
//             return false;
//         }
//         if ((!this.strokeColor && that.strokeColor) || (this.strokeColor && !that.strokeColor)){
//             return false;
//         }
//         if ((!this.strokeWidth && that.strokeWidth) || (this.strokeWidth && !that.strokeWidth)){
//             return false;
//         }
//         return true;
//
//     };
// };

