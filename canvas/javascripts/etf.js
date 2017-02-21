/**
 * Created by hijungshin on 2/16/17.
 */

function xyOffset(imgdata, x, y) {
    return (y*imgdata.width + x) * 4;
};

function tangent(sobel, x, y) {
    var i = xyOffset(sobel, x, y);
    var dx = sobel.data[i];
    var dy = sobel.data[i+1];
    var mag = Math.sqrt(0.5*(dx/255.0*dx/255.0 + dy/255.0*dy/255.0));
    return [dy, dx, mag];
};

function newTangent(praster, sobel, px, py, r) {
    var minx = Math.max(0, px-r);
    var maxx = Math.min(sobel.width, px + r+1);
    var miny = Math.max(0, py-r);
    var maxy = Math.min(sobel.height, py + r+1);
    var sumtx = 0;
    var sumty = 0;
    var tx = tangent(sobel, px, py);
    var ty, wm, wd, rho;
    var k = 0;
    for (var x = minx; x < maxx; x++) {
        for (var y = miny; y < maxy; y++) {
            ty = tangent(sobel, x, y);
            wm = weightM(tx, ty);
            wd = weightD(tx, ty);
            rho = signOf(tx, ty);
            if (wm < 0 && wd < 0) {
                continue;
            } else {
                sumtx += rho * ty[0] * wm * wd;
                sumty += rho * ty[1] * wm * wd;
                k += 1;
            }
        }
    }
    var newt = [sumtx/(sumtx+sumty)*255, sumty/(sumtx+sumty)*255];
    return newt;

};

function weightM(tx, ty) { // magnitude weight
    var gx = tx[2];
    var gy = ty[2];
    if (gy == 0) { // if neighbor has 0 tangent
        return -1;
    }
    return 0.5 * (1 + Math.tanh(gy - gx));
};

function weightD(tx, ty) {
    if (ty[2] == 0) { // if neighbor has tangent 0
        return -1.0;
    }
    if (tx[2] == 0) { // if current pixel has no tangent
        return 1.0;
    }
    return Math.abs(tx[0]/255.0*ty[0]/255.0 + tx[1]/255.0*ty[1]/255.0);
};

function signOf(tx, ty) {
    if (tx[0]*ty[0] + tx[1]*ty[1] >= 0)
        return 1;
    else return -1;
};

function isBackground(praster, x, y) {
    var color = praster.getPixel(x,y);
    var dr = Math.abs(praster.bgcolor.red - color.red);
    var dg = Math.abs(praster.bgcolor.green - color.green);
    var db = Math.abs(praster.bgcolor.blue - color.blue);
    if (dr + dg + db < 0.2)
        return true;
    return false;
};

function edgeTangentFlow(praster, r) {
    var raster = praster.getImageData(new paper.Rectangle(0, 0, praster.width, praster.height));
    var sobel = Filters.sobel(raster);
    var etf = Filters.createImageData(praster.width, praster.height);
    var newt, offset;
    for (var x = 0; x < sobel.width; x++) {
        for (var y = 0; y < sobel.height; y++) {
            offset = xyOffset(sobel, x, y);
            if (isBackground(praster, x, y))
                newt = [0,0];
            else {
                newt = newTangent(praster, sobel, x, y, r);
            }
            etf.data[offset+0] = newt[0];
            etf.data[offset+1] = newt[1];
        }
    }
    return etf;
};