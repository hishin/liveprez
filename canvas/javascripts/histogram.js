/**
 * Created by Valentina on 2/16/2017.
 */
/**
 #
 #  Color Quantization using histograms
 #	Espoo, Finland, November 2014
 #	Petri Leskinen, petri.leskinen@icloud.com
 #  MIT license
 #

 Simple example of usage in javascript:

 // crab the pixels:
 var imageData = context.getImageData(0, 0, w, h);
 // clear area:
 context.clearRect (0, 0, canvas.width, canvas.height);
 // replace with filtered image:
 context.putImageData(
 convertImage( imageData ),
 0,0);

 some references:
 http://en.wikipedia.org/wiki/Image_segmentation#Clustering_methods
 http://en.wikipedia.org/wiki/Image_segmentation#Histogram-based_methods
 http://en.wikipedia.org/wiki/K-means_clustering
 */


function ColorQuantizationHistogram() {

    //  desired number of color levels:
    this.levels=3;

    //  maximum number of clusteringiterations:
    this.iterations=100;


    this.convertImage = function (imageData, w,h) {

        var data = imageData.data;

        //  calculate the histogram:
        var hst=this.calculateHistograms(data),
            //  apply the k-means to each channel:
            arrRed=this.kmeans1(hst[0],Math.min(8,this.levels)),
            arrGreen=this.kmeans1(hst[1],Math.min(8,this.levels)),
            arrBlue=this.kmeans1(hst[2],Math.min(8,this.levels));


        //  calculate a new image with only one channel,
        //  values formed by k-means cluster indices:
        //  red_index + #numberOfReds * green_index + #numberOfReds*#numberOfGreens * blue_index
        var rgb=new Uint16Array(data.length>>2),
            f1=arrRed.length, f2=f1*arrGreen.length,
            rarr=this.histogramToLookupByIndex(arrRed, 1),
            garr=this.histogramToLookupByIndex(arrGreen, f1),
            barr=this.histogramToLookupByIndex(arrBlue, f2);

        //  map the image to these 3d-cluster indices:
        for (var i=0,j=0; i<data.length; i += 2) {
            rgb[j++]=rarr[data[i++]] + garr[data[i++]] +barr[data[i]];
        }

        //  form a new histogram of 3d-indices:
        var rgbHist= new Uint32Array(f2*arrBlue.length);
        for (var i=0; i<rgb.length; ) {
            rgbHist[rgb[i++]]++;
        }

        //  I need two array to handle the order although there might be empty histogram bins:
        var rgb3D=[], rgbAll=[];
        var tres = 0;

        for (var i=0,ib=0; ib<arrBlue.length; ib++) {
            for (var ig=0; ig<arrGreen.length; ig++) {
                for (var ir=0; ir<arrRed.length; ir++, i++) {
                    var item= new RGBItem(arrRed[ir].x,
                        arrGreen[ig].x,
                        arrBlue[ib].x,
                        rgbHist[i]);
                    rgbAll.push(item);
                    if (rgbHist[i]>tres) rgb3D.push(item);
                }
            }
        }

        rgb3D.sort(function(a, b){return b.count-a.count});

        //  choose the histogram bins with largest number of entries a initial centroids:
        var centroids=[];
        for (var i=0; i<Math.min(rgb3D.length,this.levels); i++) {
            var item=rgb3D[i];
            centroids[i]=new RGBItem(
                item.r,
                item.g,
                item.b, item.count);
        }

        var indx = new Array(rgb3D.length),
            iter = 0,
            loop = true;
        while (loop == true && iter++<this.iterations) {
            for (var i=0; i<centroids.length; i++) {
                centroids[i].count=1;
            }
            loop = false;
            //  find the closest centroid to each data entry:
            for (var i=0; i<rgb3D.length; i++) {
                var mi=0,
                    item=rgb3D[i],
                    dist=centroids[mi].distance(item);
                for (var j=1;j<centroids.length; j++) {
                    var d2=centroids[j].distance(item);
                    if (d2<dist) {
                        dist=d2;
                        mi=j;
                    }
                }
                if (mi!=indx[i]) {
                    //  some value changed, we have the go on running the iterations:
                    loop = true;
                    indx[i]=mi;
                }
            }
            //  update the centroids to new positions:
            for (var i=0; i<rgb3D.length; i++) {
                centroids[indx[i]].combine(rgb3D[i]);
            }
        }

        //  for faster performance we calculate a lookup table of size 256 to each channel:
        var rarr=[], garr=[], barr=[];
        var r,g,b, r2,g2,b2;
        for (var i=0, k; i<rgbAll.length; i++) {
            k=rgbAll[i];
            rarr[i]=k.red();
            garr[i]=k.green();
            barr[i]=k.blue();
        }

        //  map the indices back to rgb-space:
        for (var i=0, j=0, k; j<rgb.length; i+=2 ) {
            k = rgb[j++];
            data[i++] = rarr[k];
            data[i++] = garr[k];
            data[i] = barr[k];
        }

        // this.drawHistogram2(arrBlue,data, w,h);

        //  That's it!
        return imageData;
    }

    //  Iterates through the image,
    //  calculates the histogram for each rgb-channel:
    this.calculateHistograms = function (data) {
        var rarr=new Uint32Array(256),
            garr=new Uint32Array(256),
            barr=new Uint32Array(256);
        //  in case of a very large image this could be sped up
        //  by sample only every 2nd, 3rd or Nth pixel: i+=6, i+=10, i+=2+4*N
        for (var i=0; i<data.length; i+=2) {
            rarr[data[i++]]++;
            garr[data[i++]]++;
            barr[data[i]]++;
        }
        return [rarr,garr,barr];
    }

    //  For testing the results only,
    //  returns a values representing the difference between two images:
    this.difference = function (hst,c) {
        var hst2= new Uint8ClampedArray(hst.length),
            j=0;
        for (var i=0; i<hst2.length; i++) {
            if (c[j].max<i) { j++; }
            hst2[i]=c[j].x;
        }

        var sum=0, sum2=0;
        for (var i=0,d=0; i<hst.length; i++) {
            d=i-hst2[i];
            sum += hst[i]*d*d;
            sum2 += hst[i];
        }
        return c.length*sum/sum2;
    }

    this.histogramToLookup = function (arr) {
        var arr2=new Uint8ClampedArray(256);
        for (var i=0; i<arr.length; i++) {
            var pxl=arr[i].x;
            for (var j=arr[i].min<<0; j<=arr[i].max; j++) {
                arr2[j]=pxl;
            }
        }
        return arr2;
    }

    //  converts a pixel value 0...255 to a cluster index 0...#levels-1:
    this.histogramToLookupByIndex = function (arr, f) {
        var arr2=new Uint16Array(256);
        for (var i=0; i<arr.length; i++) {
            for (var j=arr[i].min<<0; j<=arr[i].max; j++) {
                arr2[j]=f*i;
            }
        }
        return arr2;
    }

    //  Applies one-dimensional k-means
    //  arr: array of values 0...255
    //  N: desired number of clusters:
    this.kmeans1 = function (arr,N) {

        var min=0, max=arr.length-1;
        //  normalize the range by removing empty entries from the white end:
        while (arr[max]==0 && min<max) {
            max--;
        }
        //  found an empty channel, return one single cluster of 0...255:
        if (min==max) {
            var c=new ArrayItem();
            c.min=0; c.max=arr.length-1; c.x=c.max>>1;
            return c;
        }
        //  remove empty entries from the black end:
        while (arr[min]==0) { min++; }


        //  initial centroids by dividing the data range,
        //  eg N=2: two clusters of a full histogram : 0...127 and 128...255
        var c= [],
            d=(max-min)/(2*N),
            m=min;
        for (var i=0; i<N; i++) {
            c[i]=new ArrayItem();
            c[i].min=m<<0;
            m+=2*d;
        }
        for (var i=0; i<N-1; ) {
            c[i++].max=c[i].min-1;
        }

        c[0].min=0;
        c[N-1].max=arr.length-1;

        //  add arr-values to the corresponding cluster:
        for (var i=0, ic=0; i<arr.length; i++) {
            if (i>c[ic].max) { ic++; }
            c[ic].add(i,arr[i]);
        }

        //  updating the centroids is simple in one dimension:
        //  just check that the values at border belong to the correct cluster,
        //  change if needed:
        var loop=true, iter=0;
        while (loop==true && iter++<1000) {
            loop=false;
            for (var i=0; i<c.length-1; i++) {
                var j=c[i].max;
                //  move a lower value to upper cluster:
                if (c[i].distance(j)>c[i+1].distance(j)) {
                    c[i].subtract(j,arr[j]);
                    c[i+1].add(j,arr[j]);
                    c[i].max -= 1.0;
                    c[i+1].min -= 1.0;
                    loop=true;
                } else {
                    //  move an upper value to lower cluster:
                    j++;
                    if (c[i].distance(j)<c[i+1].distance(j)) {
                        c[i].add(j,arr[j]);
                        c[i+1].subtract(j,arr[j]);
                        c[i].max += 1.0;
                        c[i+1].min += 1.0;
                        loop=true;
                    }
                }
            }
        }

        //  x = centroid coordinate as integer:
        for (var i=0; i<c.length; i++) {
            c[i].x = c[i].centroid()<<0;
        }

        return c;
    }

    this.drawHistogram = function (hst,data,width,height) {
        var y=height-1,
            i=(y*width)<<2;
        for (var x=0;x<hst[0].length;x++) {
            for (var j=0, i2=i+4*x; j<hst[0][x]/16; j++) {
                data[i2]=255;
                i2 -= width<<2;
                if (i2<0) break;
            }
        }
        for (var x=0;x<hst[1].length;x++) {
            for (var j=0, i2=i+4*x+1; j<hst[1][x]/16; j++) {
                data[i2]=255;
                i2 -= width<<2;
                if (i2<0) break;
            }
        }
        for (var x=0;x<hst[2].length;x++) {
            for (var j=0, i2=i+4*x+2; j<hst[2][x]/16; j++) {
                data[i2]=255;
                i2 -= width<<2;
                if (i2<0) break;
            }
        }
    }

    this.drawHistogram2 = function (arr,data,width,height) {
        var hst=new Array(256);
        for (var i=0; i<arr.length; i++) {
            var val=arr[i].sum_m/(arr[i].max-arr[i].min);
            for (var j=arr[i].min; j<=arr[i].max;j++) {
                hst[j]=val;
            }
        }
        this.drawHistogram([[],hst,[]],data,width,height);
    }

}

//  Class needed for the one dimensional k-means algorithm
function ArrayItem() {
    this.min;
    this.max;
    this.x;
    this.sum_m=1;
    this.sum_mx=0;

    //  'value' is number of entries in the histogram:
    this.add = function (x,value) {
        this.sum_mx += x*value;
        this.sum_m += value;
    }

    this.subtract = function (x,value) {
        this.sum_mx -= x*value;
        this.sum_m -= value;
    }

    this.centroid = function () {
        return this.sum_mx/this.sum_m;
    }

    //  one dimensional distance abs(x-x2)
    this.distance = function (x) {
        var d=x-this.centroid();
        return d<0 ? -d : d;
    }
}


//  Class needed for the three-dimensional k-means algorithm
function RGBItem(r,g,b,count) {

    //  RGB components:
    this.r=r;
    this.g=g;
    this.b=b;

    //  number of entries:
    this.count=count;

    //  mappedTo = link to other RGBItem, when two clusters are combined:
    this.mappedTo=null;

    //  squared distance between two entries in RGB-space:
    this.distance = function (item) {
        var d=this.g-item.g;
        return d*d + (d=this.r-item.r)*d + (d=this.b-item.b)*d;
    }

    //  add the entries of another RGBItem to this,
    //  update the new RGB-values:
    this.combine = function (item) {
        var c = this.count + item.count,
            f = 1.0/c;
        this.r = f*(this.count*this.r + item.count*item.r);
        this.g = f*(this.count*this.g + item.count*item.g);
        this.b = f*(this.count*this.b + item.count*item.b);
        this.count = c;
        //  form a link from 'item' to 'this'
        item.mappedTo=this;
    }

    this.red = function () {
        return this.mappedTo ? this.mappedTo.red() : this.r ;
    }

    this.green = function () {
        return this.mappedTo ? this.mappedTo.green() : this.g ;
    }
    this.blue = function () {
        return this.mappedTo ? this.mappedTo.blue() : this.b ;

    }
}