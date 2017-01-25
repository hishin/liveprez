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
};

var Slide = function(section) {
    this.items = [];
    this.nitems = section.getElementsByClassName('sl-block').length;
    for (var i = 0; i < this.nitems; i++) {
        var item = new Item(section.getElementsByClassName('sl-block')[i]);
        this.items.push(item);
    }
};

var Item = function(block) {
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
    this.content = this.parseContent(block.getElementsByClassName('sl-block-content')[0]);
    this.pitem = null;
    this.pborder = null;
    this.pbbox = null;
    this.inkstyles = [];

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
            openTools(this.item);
        };
    }
};

var InkStyle = function(style) {
    this.fillColor = style.fillColor;
    this.strokeColor = style.strokeColor;
    this.strokeWidth = style.strokeWidth;

    this.listElement = function() {
        var li = document.createElement("li");
        var stroke_des = 'Width: ' + this.strokeWidth;
        stroke_des += (', FillColor: ' + this.fillColor);
        stroke_des += (', StrokeColor: ' + this.strokeColor);
        li.appendChild(document.createTextNode(stroke_des));

        li.inkstyle = this;
        li.addEventListener('click', setInkStyle, false);
        return li;
    };

    this.isEqualTo = function(that) {
        if (this.fillColor && that.fillColor && this.fillColor.toString() != that.fillColor.toString()) {
            return false;
        }
        if (this.strokeColor && that.strokeColor && this.strokeColor.toString() && that.strokeColor.toString()) {
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


