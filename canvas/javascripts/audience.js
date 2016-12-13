/**
 * Created by hijun on 10/6/2016.
 */

var aslide;
var apaper;
var connected;

window.addEventListener('message', function(event) {
    var data = JSON.parse(event.data);
    console.log(data.type);
    if (data && data.namespace === 'liveprez') {
        if (data.type === 'connect') {
            handleConnectMessage(data);
        } else if (data.type === 'slide-change') {
            handleSlideChangeMessage(data);
        } else if (data.type === 'toggle-reveal') {
            handleToggleRevealMessage(data);
        } else if (data.type === 'move-item') {
            handleMoveItemMessage(data);
        } else if (data.type === 'update-view') {
            handleUpdateViewMessage(data);
        } else if (data.type === 'draw') {
            handleDrawMessage(data);
        } else if (data.type === 'release-target') {
            handleReleaseTargetMessage(data);
        }

    }
});

window.onload = function() {
    aslide = document.getElementById('slide');
    var acanvas = document.createElement('canvas');
    acanvas.height = 540;
    acanvas.width = 720;
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

function handleConnectMessage(data) {
    if (connected === false) {
        connected = true;
    }
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
    handleSlideChangeMessage(data);
};


function handleSlideChangeMessage(data) {
    window.opener.postMessage(JSON.stringify({namespace: 'audience', type: 'connected'}), '*');
    apaper.project.clear();
    aslide = apaper.project.activeLayer.importJSON(data.state);
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
    if (item.data.isHidden) {
        revealItem(item);
    }
    else {
        item.data.isHidden = true;
        hideItems(item);
    }
};


function hideItems(item) {
    if (item.data.isHidden) {
        item.visible = true;
        if (item.className == 'Group') {
            for (var i = 0;i < item.children.length; i++) {
                item.children[i].visible = false;
                hideItems(item.children[i]);
            }
        }
        else if (item.className == 'PointText') {
            item.fillColor.alpha = 0;
        } else {
            item.opacity = 0;
        }
    }
    else if (item.children) {
        for (var i = 0; i < item.children.length; i++) {
            hideItems(item.children[i]);
        }
    }
};

function revealItem(item) {
    console.log("Reveal Item");
    console.log(item);
    if (item.className == 'Group') {
        for (var i = 0; i < item.children.length; i++) {
            revealItem(item.children[i]);
        }
    } else if (item.className == 'PointText') {
        item.fillColor.alpha = 1.0;
    } else {
        item.opacity = 1.0;
    }
    item.visible = true;
    item.data.isHidden = false;
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

var curtargetitem;
function handleDrawMessage(data) {
    // Remove current items
    // console.log("HandleDrawMessage");
    if (curtargetitem) curtargetitem.remove();
    curtargetitem = apaper.project.activeLayer.importJSON(data.content);
};

function handleReleaseTargetMessage(data) {
    curtargetitem = null;
}