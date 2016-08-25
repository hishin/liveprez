/**
 * Created by vshin on 8/23/16.
 */
function finiteDifferenceConverge() {
    mypapers[1].project.clear();
    copyPaperToFrom(mypapers[1], mypapers[0]);
    var ssum;
    var iter = 0;
    var eps = 1.0;
    while (true) {
        ssum = finiteDifferenceStep();
        iter += 1;
        if (ssum < eps) {
            return;
        }
    }
}
;


function finiteDifferenceStep() {
    var diffBoxes = [];
    for (var i = 0; i < _boxes.length; i++) {
        diffBoxes.push(_boxes[i].clone({insert: false}));
    }
    var origscore = layoutScore(_boxes, _boxes);

    var delta = 0.1;
    var ssum = 0.0;
    // move dx
    var dEdx = new Array(_boxes.length);
    for (var i = 0; i < _boxes.length; i++) {
        diffBoxes[i].translate(new paper.Point(delta, 0));
        dEdx[i] = (layoutScore(diffBoxes, _boxes) - origscore);
        ssum += (dEdx[i] * dEdx[i]);
        diffBoxes[i].translate(new paper.Point(-delta, 0));
    }

    // move dy
    var dEdy = new Array(_boxes.length);
    for (var i = 0; i < _boxes.length; i++) {
        diffBoxes[i].translate(new paper.Point(0, delta));
        dEdy[i] = (layoutScore(diffBoxes, _boxes) - origscore);
        ssum += (dEdy[i] * dEdy[i]);
        diffBoxes[i].translate(new paper.Point(0, -delta));
    }

    for (var i = 0; i < _boxes.length; i++) {
        _boxes[i].translate(new paper.Point(dEdx[i], dEdy[i]));
    }

    return ssum;
}
;

function layoutScore(boxes, prevboxes) {
    var score = -totalOverlap(boxes) - totalAreaOutsideSlide(slidew, slideh, boxes) - totalTranslation(prevboxes, boxes);
    return score;
}
;

function totalTranslation(boxes, boxes_moved) {
    var trans = 0;
    for (var i = 0; i < boxes.length; i++) {
        trans += rectTranslation(boxes[i].strokeBounds, boxes_moved[i].strokeBounds);
    }
    return trans;
}
;

function rectTranslation(rect, rect_moved) {
    var moved = (rect.center.x - rect_moved.center.x) * (rect.center.x - rect_moved.center.x) +
        (rect.center.y - rect_moved.center.y) * (rect.center.y - rect_moved.center.y)

    return moved;
}
;

       function totalOverlap(boxes) {
           var overlap = 0;
           for (var i = 0; i < boxes.length - 1; i++) {
               for (var j = i + 1; j < boxes.length; j++) {
                   overlap += rectOverlap(boxes[i].strokeBounds, boxes[j].strokeBounds);
               }
           }
           return overlap;
       }
       ;

       function rectOverlap(rect1, rect2) {
           var area = Math.max(0, Math.min(rect1.bottomRight.x, rect2.bottomRight.x) - Math.max(rect1.topLeft.x, rect2.topLeft.x)) *
                   Math.max(0, Math.min(rect1.bottomRight.y, rect2.bottomRight.y) - Math.max(rect1.topLeft.y, rect2.topLeft.y));
           return area;
       }
;

function totalAreaOutsideSlide(slidew, slideh, boxes) {
    var slideRect = new paper.Rectangle(new paper.Point(0, 0), new paper.Point(slidew, slideh));
    var overlap = 0.0;
    var totalarea = 0.0;
    for (var i = 0; i < boxes.length; i++) {
        var bbox = boxes[i].strokeBounds;
        overlap += rectOverlap(slideRect, bbox);
        totalarea += (bbox.width * bbox.height);
    }
    return totalarea - overlap;
}
;