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
    this.styles = [];
};

