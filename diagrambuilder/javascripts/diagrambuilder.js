var mypapers;
var svgitem = null;


function handleFiles(files) {
    var numFiles = files.length;
    var fileURL = window.URL.createObjectURL(files[0]);
    setupSlideCanvas(fileURL);
};

function setupSlideCanvas(fileURL) {
    if (!mypapers) {
        mypapers = [];
        var scanvas = document.getElementById('presCanvas');
        scanvas.setAttribute('keepalive', true);
        scanvas.setAttribute('data-paper-keepalive', true);
        var spaper = new paper.PaperScope();
        spaper.setup(scanvas);
        scanvas.paper = spaper;
        spaper.canvas = scanvas;
        spaper.project.activeLayer.selectedColor = [1,0,0,0.75];
        spaper.settings.hitTolerance = 10;
        mypapers[0] = spaper;

        // Audience Canvas
        var acanvas = document.getElementById('audCanvas');
        var apaper = new paper.PaperScope();
        apaper.setup(acanvas);
        acanvas.paper = apaper;
        apaper.canvas = acanvas;
        mypapers[1] = apaper;


        // Selection Tool
        paper = mypapers[0];
        var selectTool = new paper.Tool();
        selectTool.onMouseDown = selectStart;
        selectTool.onMouseDrag = selectContinue;
        selectTool.onMouseUp = selectEnd;


    }
    else {
        mypapers[0].project.clear();
        mypapers[1].project.clear();
    }

    svgitem = paper.project.activeLayer.importSVG(fileURL,
        {
            expandShapes: true,
            onLoad: svgOnLoad
        }
    );
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
    var selectedItems;
    if (!dragged) {
        selectedItems = clickSelect(svgitem, event.point);
    }
    else {
        selectedItems = pathSelect(svgitem, userStroke);
    }

    if (selectedItems)
        showAudience(selectedItems);
};

function showAudience(selectedItems) {
    paper = mypapers[1];
    for (var i = 0; i < selectedItems.length; i++) {
        createClone(selectedItems[i]);
    }
    paper = mypapers[0];
};

function createClone(item) {
    var citem;
    if (item.className == 'Group') {
        citem = new mypapers[1].Group();
    } else if (item.className == 'CompoundPath') {
        citem = new mypapers[1].CompoundPath();
    } else if (item.className == 'Path') {
        citem = new mypapers[1].Path();
    } else if (item.className == 'Shape') {
        citem = new mypapers[1].Shape();
    } else if (item.className == 'PointText') {
        citem = new mypapers[1].PointText();
    } else if (item.className == 'Curve') {
        citem = new paper.Path({
            segments: [item.segment1, item.segment2]
        });
        // item.path.selected = true;
        // citem.copyAttributes(item.path);
        citem.strokeColor = 'red';
        citem.strokeWidth = 2;
    } else {
        console.log(item.className);
    }
    // citem.copyContent(item);
    // citem.copyAttributes(item);
    citem.selected = false;
};