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