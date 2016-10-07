/**
 * Created by hijun on 10/6/2016.
 */

var aslide;
var apaper;

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

    // Load current Slide

};
// // Load current slide
// var img_src = document.getElementById('slide-src').value;
// console.log(img_src);
// apaper.project.clear();
// var img_type = img_src.split('.').pop();
// if (img_type  == 'svg') {
//     apaper.project.importSVG(img_src, {
//         expandShapes: true,
//         onLoad: function (svgitem, data) {
//             var wscale = parseFloat(apaper.canvas.offsetWidth) / svgitem.bounds.width;
//             var hscale = parseFloat(apaper.canvas.offsetHeight) / svgitem.bounds.height;
//             svgitem.scale(wscale, hscale);
//             var delta = new paper.Point(parseFloat(apaper.canvas.offsetLeft) - svgitem.bounds.left,
//                 parseFloat(apaper.canvas.offsetTop) - svgitem.bounds.top);
//             svgitem.translate(delta);
//         }
//     });
// }
// // }