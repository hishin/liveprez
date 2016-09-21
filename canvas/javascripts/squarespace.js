/**
 * Created by hijungshin on 9/20/16.
 */

var scenes = [];

window.onload = function () {

    setupSlideSceneGraph();
    // setup hover reaction
    setupExpansionBars();
};

function setupExpansionBars() {
    var targets = document.querySelectorAll('.target');
    for (var i = 0; i < targets.length; i++) {
        targets[i].addEventListener("mouseover", showTargetExpansionBar, true);
        targets[i].addEventListener("click", expandTarget, true);
    }
};

function expandTarget(event) {
    var target = event.currentTarget;
    expandBottom(target, 10);
};

function showTargetExpansionBar(event) {
    var target = event.currentTarget;
    var hb = document.getElementById('horizontal-bar');
    hb.style.width = target.offsetWidth + 'px';
    hb.style.position = 'absolute';
    hb.style.left = target.style.left;
    hb.style.top = target.style.top;
    hb.style.display = 'inline-block';

    var hba = document.getElementById('hb-arrow');
    hba.style.position = 'absolute';
    hba.style.left = hb.style.left;
    hba.style.top = parseFloat(hb.style.top) - hba.offsetHeight/2.0 + 1.0 + 'px';
    hba.style.display = 'inline-block';

    var hb2 = document.getElementById('horizontal-bar-bottom');
    hb2.style.width = target.offsetWidth + 'px';
    hb2.style.position = 'absolute';
    hb2.style.left = target.style.left;
    hb2.style.top = parseFloat(target.style.top) + target.offsetHeight + 'px';
    hb2.style.display = 'inline-block';

    var hba2 = document.getElementById('hb-arrow-bottom');
    hba2.style.position = 'absolute';
    hba2.style.left = hb2.style.left;
    hba2.style.top = parseFloat(hb2.style.top) - hba2.offsetHeight/2.0 + 'px';
    hba2.style.display = 'inline-block';
};

function expandBottom(target, pixels) {
    if (!target.scenebox) 
        return;

    var parentbox = target.scenebox.parent;
    if (!parentbox)
        return;

    var siblingboxes = parentbox.children;

    var sbox;
    for (var i = 0; i < siblingboxes.length; i++) {
        sbox = siblingboxes[i];

        if (isBelow(target, sbox.target)) {
            moveDown(sbox.target, pixels);
        }
    }

    expandBottom(parentbox.target, pixels);
    parentbox.target.style.height = parentbox.target.offsetHeight + pixels + 'px';

};

function moveDown(target, pixels) {
    target.style.top = parseFloat(target.style.top) + pixels + 'px';
    var children = target.scenebox.children;

    var cbox;
    for (var i = 0; i < children.length; i++) {
        cbox = children[i];
        moveDown(cbox.target, pixels);
    }
};

function isBelow(target, query) {
    // should be below target
    if (query.offsetTop <= target.offsetTop + target.offsetHeight) {
        return false;
    }
    // width should overlap at least 30%
    var tright = target.offsetLeft + target.offsetWidth;
    var qright = query.offsetLeft + query.offsetWidth;
    var overlap = Math.min(tright, qright) - Math.max(target.offsetLeft, query.offsetLeft);
    if (overlap >= 0.3 * query.offsetWidth)
        return true;
    return false;
};

function SceneBox(target) {
    target.scenebox = this;
    this.target = target;
    this.tlx = target.offsetLeft;
    this.tly = target.offsetTop;
    this.width = target.offsetWidth;
    this.height = target.offsetHeight;
    this.brx = this.tlx + this.width;
    this.bry = this.tly + this.height;
    this.parent = null;
    this.children = [];

    this.insertBox = function(other_box) {
        for (var i = 0; i < this.children.length; i++) {
            var childbox = this.children[i];
            if (childbox.contains(other_box)) {
                childbox.insertBox(other_box);
                return;
            }
            if (other_box.contains(childbox)) {
                other_box.parent = childbox.parent;
                childbox.parent = other_box;
                this.children[i] = other_box;
                return;
            }
        }
        other_box.parent = this;
        this.children.push(other_box);
    };

    this.contains = function(other_box) {
        if (this.tlx <= other_box.tlx && this.tly <= other_box.tly &&
            this.brx >= other_box.brx && this.bry >= other_box.bry)
            return true;
        else
            return false;
    };
};

function setupSlideSceneGraph() {
    var slides = document.querySelectorAll('.slide-container');
    for (var i = 0; i < slides.length; i++) {
        var sceneroot = createSceneGraph(slides[i]);
        scenes.push(sceneroot);
        slides[i].scene = sceneroot;
    }
};

function createSceneGraph(slide) {
    var rootBox = new SceneBox(slide);
    rootBox.tlx = 0;
    rootBox.tly = 0;
    rootBox.brx = slide.offsetWidth;
    rootBox.bry = slide.offsetHeight;
    rootBox.width = slide.offsetWidth;
    rootBox.height = slide.offsetHeight;
    var contentboxes = slide.querySelectorAll('.contentbox');
    for (var i = 0; i < contentboxes.length; i++) {
        rootBox.insertBox(new SceneBox(contentboxes[i]));
    }
    return rootBox;
};
