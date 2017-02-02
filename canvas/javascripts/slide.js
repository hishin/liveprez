/**
 * Created by Valentina on 1/23/2017.
 */

var SlideDeck = function(slides) {
    this.slides = [];
    this.n = slides.getElementsByTagName('section').length;
    for (var i = 0; i < this.n; i++) {
        var slide = new Slide(slides.getElementsByTagName('section')[i]);
        this.slides.push(slide);
    }

    this.getSlide = function(num){
        if (num >= this.n) {
            return null;
        }
        return this.slides[num];
    };
};

function Slide(section) {
    this.items = [];
    this.nitems = section.getElementsByClassName('sl-block').length;
    for (var i = 0; i < this.nitems; i++) {
        var item = new Item(section.getElementsByClassName('sl-block')[i]);
        this.items.push(item);
    }
}

function Item(block) {
    this.parseContent = function(contentdiv) {
        if (this.type == 'image') {
            return contentdiv.getElementsByTagName('img')[0];
        } else {
            return null;
        }
    };

    this.width = parseInt(block.style.width, 10);
    this.height = parseInt(block.style.height, 10);
    this.top = parseInt(block.style.top, 10);
    this.left = parseInt(block.style.left, 10);
    this.type = block.dataset.blockType;
    this.src = this.parseContent(block.getElementsByClassName('sl-block-content')[0]).dataset.src;
    this.pitem = null;
    this.praster = null;
    this.pborder = null;
    this.pbbox = null;
    this.inkstyles = [];

    this.setRaster = function(raster){
        this.praster = raster;
        this.praster.onLoad = function() {
            console.log("here");
        //     console.log(this.width);
        //     this.sobel = computeSobel(this);
        //     // console.log(this.bounds);
        //     // this.sobel = this.getImageData(this.bounds);
        //     // console.log(this.sobel.height);
        //     // console.log(this.sobel.width);
        //     // for (var i = 0; i < this.sobel.height; i++) {
        //     //     for (var j = 0; j < this.sobel.width; j++) {
        //     //         var offset = (i*this.sobel.width + j)*4;
        //     //         var color = new paper.Color(this.sobel.data[offset]/255.0, this.sobel.data[offset+1]/255.0, this.sobel.data[offset+2]/255.0, 1.0);
        //     //         console.log(this.getPixel(j,i).red);
        //     //         console.log(color.red);
        //     //         this.setPixel(j,i, color);
        //     //     }
        //     // }
        //     // console.log("here");
        //     // paper.view.update();
        }

    };

    function computeSobel(raster) {
        var imagedata = raster.getImageData(raster.bounds);
        var sobel = Filters.sobel(imagedata);
        return sobel;
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

    this.activateMouseEvents = function() {
        this.pbbox.onMouseEnter = function(event) {
            this.item.pborder.dashArray = [];
        };
        this.pbbox.onMouseLeave = function(event) {
            this.item.pborder.dashArray = [3,2];
        };
        this.pbbox.onClick = function(event) {
            deactivateItemMouseEvents();
            openItem(this.item);
        };
    }
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


