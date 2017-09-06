/**
 * Created by Valentina on 1/23/2017.
 */

var SlideDeck = function(slide_files) {
    this.slides = [];
    for (var i = 0; i < slide_files.length; i++) {
        var sfiles = [];
        var file = slide_files[i];
        sfiles.push(file);
        var num1 = getSlideNumFromFileName(file.name);
        for (var j = i+1; j < slide_files.length; j++) {
            var num2 = getSlideNumFromFileName(slide_files[j].name);
            if (num1 == num2) {
                sfiles.push(slide_files[j]);
                i = j;
            }
        }

        var slide = new Slide(sfiles, i);
        slide.num = this.slides.length;
        this.slides.push(slide);
    }
    this.n = getSlideNumFromFileName(slide_files[slide_files.length-1].name);

    this.getSlide = function(num){
        if (num >= this.n) {
            return null;
        }
        return this.slides[num];
    };
};

function getSlideNumFromFileName(fname) {
   return parseInt(fname.match(/\d+/)[0]);
};

var Slide = function(sfiles, p) {
    this.pagenum = p;
    this.num = null;
    this.loaded = false;
    this.itemlayer = [];//null
    this.lowermask = null;
    this.masklayer = null;;
    this.inklayer = null;
    this.items = new Array(sfiles.length);
    this.nitems = sfiles.length;
    this.sfiles = sfiles;
    var slide = this;
    for (var i = 0; i < sfiles.length; i++) {
        var reader = new FileReader();
        reader.onload = function(theFile) {
            var tempi = i;
            return function (e) {
                // var MENU_H = 50;
                // document.getElementById('thumb-'+slide.pagenum).src = e.target.result;
                var item = new Item(e.target.result, slide);
                var img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    item.width = this.width;
                    item.height = this.height;
                    if (!aspectratio) {
                        aspectratio = this.height / this.width;
                    }
                    img_w = this.width;
                    // SLIDE_W = $('#speaker-slide').width();
                    // SLIDE_H = $(window).height() - 5;
                }
                slide.items[tempi] = item;
            }
        }(sfiles[i]);
        reader.readAsDataURL(sfiles[i]);
    }

    this.hide = function() {
        for (var i = 0; i < this.itemlayer.length; i++) {
            this.itemlayer[i].visible = false;
        }
        this.inklayer.visible = false;
        this.masklayer.visible = false;
    };

    this.show = function() {
        for (var i = 0; i < this.itemlayer.length; i++) {
            this.itemlayer[i].visible = true;
        }
        this.inklayer.visible = true;
        this.masklayer.visible = true;
    };
};

var Element = function(praster, label, minx, miny, maxx, maxy) {
    this.raster = praster;
    this.eraster = null;
    this.label = label;
    this.rect = new paper.Shape.Rectangle(new paper.Point(minx, miny), new paper.Point(maxx, maxy));
    // var temp = new paper.Path.Rectangle(this.rect.bounds);
    // temp.strokeColor = 'green';
    // temp.strokeWidth = 1;
    this.minx = minx;
    this.miny = miny;
    this.maxx = maxx;
    this.maxy = maxy;
};

function Item(url, slide) {
    this.src = url;
    this.psvg = null;
    this.praster = null;
    this.noteraster = null;
    this.bgraster = null;
    this.pgroup = null;
    this.pborder = null;
    this.pbbox = null;
    // this.slide = slide;

    var white = new paper.Color('white');
    var black = new paper.Color('black');
    this.setRaster = function(raster, fg){
        if (fg == 1) {
            this.praster = raster;
            raster.onLoad = function() {
                this.fitBounds(paper.view.bounds);
                this.scale = Math.max(this.width/paper.view.bounds.width, this.height/paper.view.bounds.height);
                this.wslack = (paper.view.bounds.width - this.width/this.scale)/2.0;
                this.hslack = (paper.view.bounds.height - this.height/this.scale)/2.0;
                // console.log("Compute Background Color");
                this.imdata = this.getImageData(new paper.Rectangle(0, 0, this.width, this.height));
                // var c = getBackgroundColor(imgdata.data)
                // var pc = pColorFromDataRGB(c);
                // this.bgcolor = new paper.Color('white');
                // this.annocolor = invertColor(this.bgcolor);
                this.fg = booleanImageFromForeground(this.imdata);
                // console.log("Compute Edge Information");
                this.sobel = computeSobel(this);
                this.sobelbool = booleanImageFromSobel(this.sobel, 10);
                // console.log("Compute Distance Transformation");
                this.dtresult1 = distanceTransform(this.sobelbool, this.width, this.height, "EDT");
                this.dtedge = this.dtresult1[0];
                this.dtresult2 = distanceTransform(this.fg, this.width, this.height, "EDT");
                this.dtfg = this.dtresult2[0];
                this.dti = this.dtresult2[1];
                this.dtj = this.dtresult2[2];
                this.revealed = new Array(this.width * this.height).fill(0);
                // console.log("Generate Stroke Width Image");
                this.swidth = strokeWidthImage(this.dtedge, this.fg, 0, 10);
                this.cclabel = BlobExtraction(this.fg, this.width, this.height);
                // this.elements = ccBoxes(this, this.cclabel, this.width, this.height);
                makeSemiTransparent(this);//console.log("imdata" + this.imdata);

            };
        } else if (fg == 0) {
            this.praster = raster;
            raster.onLoad = function() {
                this.fitBounds(paper.view.bounds);
                this.scale = Math.max(this.width/paper.view.bounds.width, this.height/paper.view.bounds.height);
                this.wslack = (paper.view.bounds.width - this.width/this.scale)/2.0;
                this.hslack = (paper.view.bounds.height - this.height/this.scale)/2.0;
                this.opacity = 1.0;
            };
        } else {
            this.noteraster = raster;
            raster.onLoad = function() {
                this.fitBounds(paper.view.bounds);
                this.scale = Math.max(this.width/paper.view.bounds.width, this.height/paper.view.bounds.height);
                this.wslack = (paper.view.bounds.width - this.width/this.scale)/2.0;
                this.hslack = (paper.view.bounds.height - this.height/this.scale)/2.0;
                this.opacity = 1.0;
            };
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

function ccBoxes(raster, cclabel, w, h) {
    var elements = [];
    var labels = [];
    var minx = [];
    var miny = [];
    var maxx = [];
    var maxy = [];
    var l;
    for (var x = 0; x < w; x++) {
        for (var y = 0; y < h; y++) {
            l = cclabel[x + y*w];
            var id = labels.indexOf(l);
            if (id < 0) { // label appeared for the first time
                labels.push(l);
                minx.push(x); maxx.push(x); miny.push(y); maxy.push(y);
            } else {
                minx[id] = Math.min(minx[id], x);
                maxx[id] = Math.max(maxx[id], x);
                miny[id] = Math.min(miny[id], y);
                maxy[id] = Math.max(maxy[id], y);
            }
        }
    }
    var cn = labels.length;
    for (var i = 0; i < cn; i++) {
        elements.push(new Element(raster, labels[i], minx[i], miny[i], maxx[i], maxy[i]));
    }
    return elements;
}

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

function isRevealed(imdata) {
    var revealed = new Uint8Array(imdata.width * imdata.height);
    for (var x = 0; x < imdata.width; x++) {
        for (var y = 0; y < imdata.height; y++) {
            revealed[x+ y*imdata.width] = (imdata.data[(x+y*imdata.width)*4 +3] < 200) ? 0: 1;
        }
    }
    return revealed;
};

function strokeWidthImage(dt, fg, min, max) {
    var widthImage = new Array(dt.length);
    for (var i = 0; i < dt.length; i++) {
        if (fg[i] == 0) {
            widthImage[i] = -1;
        }
        // else if (dt[i] > max) {
        //     widthImage[i] = max;
        // }
        else if (dt[i] < min) {
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

function booleanImageFromForeground(imdata) {
    var m = imdata.width;
    var n = imdata.height;
    var idx = 0;
    var p, diff, off;

    var booleanImage = new Array(m*n);
    for (var j = 0; j < n; j++) {
        for (var i = 0; i < m; i++) {
            off = (j * m + i) * 4; // pixel i,j
            // p = [imdata.data[off], imdata.data[off+1], imdata.data[off+2]];
            // diff = deltaRGB(p, bgcolor);
            booleanImage[idx] = (imdata.data[off+3] != 0);//diff > threshold ? 1:0;
            idx++;
        }
    }
    return booleanImage;
};

function setRasterToBool(praster, bool) {
    var w = new paper.Color('white');
    var b = new paper.Color('black');
    for (var x = 0; x < praster.width; x++) {
        for (var y = 0; y < praster.height; y++) {
            if (bool[x + y * praster.width])
                praster.setPixel(x, y, w)
            else
                praster.setPixel(x, y, b);

        }
    }
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


function tracePixels(praster, pixels) {
    var pctx = praster.getContext(true);
    var pimdata = praster.imdata;
    var pdata = pimdata.data;
    var px, py, off;
    // console.log(praster.width);
    for (var i = 0 ; i < pixels.length; i++) {
        px = pixels[i][0];
        py = pixels[i][1];
        off = (py*praster.width + px)*4;
        pdata[off+3] = 255;
    }
    pctx.putImageData(pimdata, 0, 0);

};


function makeSemiTransparent(praster) {
    var pctx = praster.getContext();
    // var pimdata = praster.getImageData(new paper.Shape.Rectangle(0, 0, praster.width, praster.height));
    var pimdata = praster.imdata;
    // console.log("pimdata:" + pimdata);
    var pdata = pimdata.data;
    var off;
    for (var i = 0 ; i < pimdata.width; i++) {
        for (var j = 0; j < pimdata.height; j++) {
            off = (j*praster.width + i)*4;
            pdata[off+3] = (pdata[off+3] == 0 ? 0: 125);
        }
    }
    pctx.putImageData(pimdata, 0, 0);
    // paper.view.update();
};

function makeTransparent(praster) {
    var pctx = praster.getContext();
    // var pimdata = praster.getImageData(new paper.Shape.Rectangle(0, 0, praster.width, praster.height));
    var pimdata = praster.imdata;
    var pdata = pimdata.data;
    var off;
    for (var i = 0 ; i < pimdata.width; i++) {
        for (var j = 0; j < pimdata.height; j++) {
            off = (j*praster.width + i)*4;
            pdata[off+3] = 0;
        }
    }
    pctx.putImageData(pimdata, 0, 0);
};

function hideTransparent(praster) {
    var pctx = praster.getContext();
    // var pimdata = praster.getImageData(new paper.Shape.Rectangle(0, 0, praster.width, praster.height));
    var pimdata = praster.imdata;
    var pdata = pimdata.data;
    var off;
    for (var i = 0 ; i < pimdata.width; i++) {
        for (var j = 0; j < pimdata.height; j++) {
            off = (j*praster.width + i)*4;
            pdata[off+3] = (pdata[off+3] == 255? 255: 0);
        }
    }
    pctx.putImageData(pimdata, 0, 0);
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
function getPixelCoordsX(x, praster) {
    var px = Math.round((x - praster.wslack) * praster.scale);
    return px;
};

function getPixelCoordsY(y, praster) {
    var py = Math.round((y - praster.hslack) * praster.scale);
    return py;
};

function getPixelPoint(point, raster) {
    var px = Math.round((point.x - raster.wslack) * raster.scale);
    var py = Math.round((point.y - raster.hslack) * raster.scale);
    return new paper.Point(px, py);
};