/**
 * Created by Valentina on 2/16/2017.
 */
// the following functions are based off of the pseudocode
// found on www.easyrgb.com
function getBackgroundColor(data, b = 4) {
    var hist = new Uint32Array(b*b*b).fill(0);
    var ri, bi, gi;
    var rmeans = new Array(b*b*b).fill(0.0);
    var gmeans = new Array(b*b*b).fill(0.0);
    var bmeans = new Array(b*b*b).fill(0.0);
    var mod = 256/b;

    for (var i = 0; i < data.length; i+=4) {
        ri = Math.trunc(data[i]/mod);
        gi = Math.trunc(data[i+1]/mod);
        bi = Math.trunc(data[i+2]/mod);
        // Flat[x + WIDTH * (y + DEPTH * z)] = Original[x, y, z]
        var id = (b*b*ri)+(b*gi)+bi;
        hist[id]++;
        rmeans[id] += data[i];
        gmeans[id] += data[i+1];
        bmeans[id] += data[i+2];
    }
    var idx = hist.indexOf(Math.max.apply(null, hist));
    var r = rmeans[idx] / hist[idx];
    var g = gmeans[idx] / hist[idx];
    var b = bmeans[idx] / hist[idx];
    r = Math.round( r/255.0 * 10) / 10;
    g = Math.round( g/255.0 * 10) / 10;
    b = Math.round( b/255.0 * 10) / 10;

    var colormode = {red: r, green: g, blue: b};
    return colormode;
};

function lab2rgb(lab){
    var y = (lab[0] + 16) / 116,
        x = lab[1] / 500 + y,
        z = y - lab[2] / 200,
        r, g, b;

    x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787);
    y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787);
    z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787);

    r = x *  3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y *  1.8758 + z *  0.0415;
    b = x *  0.0557 + y * -0.2040 + z *  1.0570;

    r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
    g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
    b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;


    return [Math.max(0, Math.min(1, r)) * 255,
        Math.max(0, Math.min(1, g)) * 255,
        Math.max(0, Math.min(1, b)) * 255]
};


function rgb2lab(rgb){
    var r = rgb[0] / 255,
        g = rgb[1] / 255,
        b = rgb[2] / 255,
        x, y, z;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
};

// calculate the perceptual distance between colors in CIELAB
// https://github.com/THEjoezack/ColorMine/blob/master/ColorMine/ColorSpaces/Comparisons/Cie94Comparison.cs

function deltaE(labA, labB){
    var deltaL = labA[0] - labB[0];
    var deltaA = labA[1] - labB[1];
    var deltaB = labA[2] - labB[2];
    var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    var deltaC = c1 - c2;
    var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    var sc = 1.0 + 0.045 * c1;
    var sh = 1.0 + 0.015 * c1;
    var deltaLKlsl = deltaL / (1.0);
    var deltaCkcsc = deltaC / (sc);
    var deltaHkhsh = deltaH / (sh);
    var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
};

function deltaRGB(rgbA, rgbB) {
    var dr = Math.abs(rgbA[0] - rgbB[0]);
    var dg = Math.abs(rgbA[1] - rgbB[1]);
    var db = Math.abs(rgbA[2] - rgbB[2]);
    return (dr + dg + db)/3.0;
};

function invertColor(pcolor) {
    var color = pcolor.toCSS(true);
    color = color.substring(1);           // remove #
    color = parseInt(color, 16);          // convert to integer
    color = 0xFFFFFF ^ color;             // invert three bytes
    color = color.toString(16);           // convert to hex
    color = ("000000" + color).slice(-6); // pad with leading zeros
    color = "#" + color;                  // prepend #
    return color;
};
