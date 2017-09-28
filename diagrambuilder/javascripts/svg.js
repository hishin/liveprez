function svgOnLoad(item, svgdata) {
    svgitem = item;
    item.fitBounds(spaper.view.bounds);
};

function clickSelect(svgitem, point) {
    if (!svgitem) return;
    var hitresult = svgitem.hitTest(point);
    if (hitresult)
        hitresult.item.selected = true;

};

function pathSelect(svgitem, userStroke) {
    // for each leaf element in the svg tree
    

};