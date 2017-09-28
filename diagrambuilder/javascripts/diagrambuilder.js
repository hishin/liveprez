var scanvas;
var spaper;
var svgitem = null;

function handleFiles(files) {
    var numFiles = files.length;
    var fileURL = window.URL.createObjectURL(files[0]);
    setupSlideCanvas(fileURL);
};

function setupSlideCanvas(fileURL) {
    if (!scanvas) {
        scanvas = document.getElementById('presCanvas');
        scanvas.setAttribute('keepalive', true);
        scanvas.setAttribute('data-paper-keepalive', true);
        spaper = new paper.PaperScope();
        spaper.setup(scanvas);
        scanvas.paper = spaper;
        spaper.canvas = scanvas;

        var selectTool = new spaper.Tool();
        selectTool.onMouseDown = selectStart;
        selectTool.onMouseDrag = selectContinue;
        selectTool.onMouseUp = selectEnd;

        spaper.project.activeLayer.selectedColor = [1,0,0,0.75];
        spaper.settings.hitTolerance = 10;

    }
    else {
        spaper.project.clear();
    }

    svgitem = spaper.project.activeLayer.importSVG(fileURL, svgOnLoad);
};

/**
 * Upon selection gesture:
 * Draw gesture stroke
 * @param evt
 */
var userStroke;
var dragged;
function selectStart(event) {
    userStroke = new paper.Path({
        strokeWidth: 3,
        strokeCap: 'round',
        strokeColor: [0,0,1,0.5]
    });
    userStroke.add(event.point);
    dragged = false;
};

function selectContinue(event) {
    userStroke.add(event.point);
    dragged = true;
};

/**
 * perform selection
 * @param event
 */
function selectEnd(event) {
    // Click select
    if (!dragged) {
        clickSelect(svgitem, event.point);
    }
    else {
        pathSelect(svgitem, userStroke);
    }
};

