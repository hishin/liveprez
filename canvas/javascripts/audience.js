/**
 * Created by hijun on 10/6/2016.
 */

var aslide;
var apaper;
var connected;

window.addEventListener('message', function(event) {
    var data = JSON.parse(event.data);
    // console.log(data);
    if (data && data.namespace === 'liveprez') {
        if (data.type === 'connect') {
            handleConnectMessage(data);
        } else if (data.type === 'toggle-reveal') {
            handleToggleRevealMessage(data);
        } else if (data.type === 'move-item') {
            handleMoveItemMessage(data);
        } else if (data.type === 'update-view') {
            handleUpdateViewMessage(data);
        } else if (data.type === 'draw') {
            handleDrawMessage(data);
        }

    }
});

window.onload = function() {
    aslide = document.getElementById('slide');
    var acanvas = document.createElement('canvas');
    acanvas.setAttribute('id', aslide.id.replace('slide', 'acanvas'));
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

function hideItems(item) {
    if (item.data.isHidden) {
        item.visible = false;
    }
    if (item.children) {
        for (var i = 0; i < item.children.length; i++) {
            hideItems(item.children[i]);
        }
    }
};

function handleConnectMessage(data) {
    if (connected === false) {
        connected = true;
    }
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
    aslide = apaper.project.activeLayer.importJSON(data.state);
    console.log(aslide);
    hideItems(aslide);
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
    if (item.visible) {
        item.visible = false;
        item.data.isHidden = true;
    }
    else {
        if (item.className == 'PointText') {
            item.fillColor.alpha = 1.0;
        }
        else {
            item.opacity = 1.0;
        }
        item.visible = true;
        item.data.isHidden = false;
    }
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

function handleDrawMessage(data) {
    item = apaper.project.activeLayer.importJSON(data.content);
};