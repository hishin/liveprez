function svgOnLoad(item, svgdata) {
    svgitem = item;
    item.fitBounds(paper.view.bounds);

    // Break all paths at intersections
    var childPaths = svgitem.getItems({class:'Path'});
    for (var i = 0; i < childPaths.length; i++) {
        var p1 = childPaths[i];
        for (var j = 0; j < childPaths.length; j++) {
            if (i == j) continue;
            var p2 = childPaths[j];
            var crossings = p1.getIntersections(p2);
            for (var c = 0; c < crossings.length; c++) {
                p1.divideAt(crossings[c]);
            }
            crossings = p2.getIntersections(p1);
            for (var c = 0; c < crossings.length; c++) {
                p2.divideAt(crossings[c]);
            }
        }
    }
};

function clickSelect(svgitem, point) {
    if (!svgitem) return;
    var hitresult = svgitem.hitTest(point);
    if (hitresult)
        hitresult.item.selected = true;
    return [hitresult.item];
};

function pathSelect(svgitem, userStroke) {
    // Compare UserStroke to Paths in svgitem
    var minerror = Infinity;
    var closestPath;
    var childPaths = svgitem.getItems({class: 'Path'});
    for (var i = 0; i < childPaths.length; i++) {
        var error = comparePaths(childPaths[i], userStroke);
        if (error < minerror) {
            minerror = error;
            closestPath = childPaths[i];
        }
    }

    if (closestPath) {
        closestPath.selected = !closestPath.selected;
        return [closestPath];
    }

};

function comparePaths(candidatePath, userStroke) {
    // Uniformly sample 10 points from each stroke

    var psdists = [];
    for (var i = 0; i <= userStroke.length; i += userStroke.length / 10) {
        var ps = userStroke.getPointAt(i);
        var cs = candidatePath.getNearestPoint(ps);
        var dist = ps.getDistance(cs);
        psdists.push(dist);
    }
    var psmean = math.mean(psdists);
    var psstd = math.std(psdists);

    var pcdists = [];
    for (var j = 0; j <= candidatePath.length; j += candidatePath.length / 10) {
        var pc = candidatePath.getPointAt(j);
        var cs = userStroke.getNearestPoint(pc);
        var dist = pc.getDistance(cs);
        pcdists.push(dist);
    }
    var pcmean = math.mean(pcdists);
    var pcstd = math.mean(pcdists);

    var beta = 1.0;
    return beta * (psmean + pcmean) + (1 - beta) * (psstd + pcstd);


};