/**
 * Created by hijungshin on 11/21/16.
 */
var path = new CompoundPath({
    children: [
        new Path.Circle({
            center: new Point(50, 50),
            radius: 30
        }),
        new Path.Circle({
            center: new Point(50, 50),
            radius: 10
        })
    ],
    fillColor: 'black',
    selected: true
});

function preloadImages(array) {
    if (!preloadImages.list) {
        preloadImages.list = [];
    }
    var list = preloadImages.list;
    for (var i = 0; i < array.length; i++) {
        var img = new Image();
        img.onload = function() {
            var index = list.indexOf(this);
            if (index !== -1) {
                // remove image from the array once it's loaded
                // for memory consumption reasons
                list.splice(index, 1);
            }
        }
        list.push(img);
        img.src = array[i];
    }
}

preloadImages(["url1.jpg", "url2.jpg", "url3.jpg"]);
