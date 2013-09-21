var canvasHeight = 500;
var canvasWidth = 1000;
var tileLen = 20;
var gridColumnNum = 8;
var gridRowNum = 9;

var color1 = 'red';
var color2 = '#00CC00';
var color3 = 'white';
var color4 = '#38B2CE';
var stroke = 'silver';
var curveColor = 'green';
var backgroundColor = '#006363';
var shadowColor = 'silver';

var soundBuffer;
var FPS = 30;
var beats = [];
var stage;

var currentSongTiles;
var userMixTiles;
var userMixCurves;
var userDiscardTiles;

var currentId = -1;
var currentColor = null;

var songIsPlaying = false;
var isGridStyle = false;
var isChristmas = true;

var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

$(document).ready(function() {
    var layer = initMixStage();
    getBeats(beats, layer);
    context = new webkitAudioContext();
    initSound();
    document.onkeypress = function(event){moveTetrisBlock(event);};
});

window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

///////////////////////////////////// CANVAS Building/////////////////////////////////////////////
function initMixStage(){
    layer = initKStage();
    layer.add(midline());
    
    currentSongTiles = new Kinetic.Group({draggable:false});
    userMixTiles = new Kinetic.Group({draggable:true});
    userMixCurves = new Kinetic.Group({draggable:true, name:'curves'});
    userDiscardTiles = new Kinetic.Group({draggable:false});
    userMixTiles.add(userMixCurves);
    layer.add(currentSongTiles);
    layer.add(userMixTiles);
    layer.add(userDiscardTiles);
    return layer;
}

function initKStage(){
    stage = new Kinetic.Stage({
        container: 'container',
        width: canvasWidth,
        height: canvasHeight
    });
    layer = new Kinetic.Layer();
    return layer;
}

function midline(){
    var line = new Kinetic.Line({
        points:[canvasWidth/2,0,canvasWidth/2,canvasHeight],
        stroke: "white",
        strokeWidth: 2,
    });
    return line;
}

function KRectangle(userX,userY,userHeight,userWidth,color,userId){
    var rect = new Kinetic.Rect({
        id: userId,
        x: userX,
        y: userY,
        width:userWidth,
        height: userHeight,
        fill: color,
        stroke: stroke,
        strokeWidth: 3,
        shadow: {
            color:shadowColor,
            blur:7,
            offset: [3, 3],
            alpha: 0.5
        },
        draggable:true
    });
    return rect;
}

function KCurveShape(xStart, yStart, xControl1, yControl1, xEnd, yEnd, color){
    var curve = new Kinetic.Shape({
        drawFunc: function(context) {
            context.beginPath();
            context.moveTo(xStart, yStart);
            context.quadraticCurveTo(xControl1, yControl1, xEnd, yEnd);
            //context.lineTo(tile.getX(), tile.getY());
            this.stroke(context);
        },
        stroke: color,
        strokeWidth: 4
    });
    return curve
}
function buildSongTable(beats, layer) {
    var squaresPerRow = 0;
    var row = 0;
    var color;
    for (var i = 0; i < beats.length; i++) {
        if(i%4 == 0){
            color = color1;
        } else if (i%4 == 1){
            color = color2;
        } else if (i%4 == 2) {
            color = color3;
        } else {
            color = color4;
        }
        if (squaresPerRow == 21) {
            row++;
            squaresPerRow = 0;
        }
        var rect = KRectangle(squaresPerRow*tileLen, row*tileLen, tileLen, tileLen, color, i);
       /* rect.on('mouseover',function(){
            this.setOpacity(0.5);
            layer.draw();
        });
        rect.on('mouseout',function(){
            this.setOpacity(1);
            layer.draw();
        });*/
        rect.on('click', function(evt){
            tileClick(evt, this);
        });

        currentSongTiles.add(rect);
        squaresPerRow++;
    }
    stage.add(layer);
}

function tileClick(evt, tile){
    tile.moveToTop();
    //tile.setOpacity(.5);
    playSound(beats,tile.getId());
    if(!isGridStyle){
        if(tile.getX() > canvasWidth/2){
            addToMix(tile);
        }
        else {
            tile.moveTo(userDiscardTiles);
            userDiscardTiles.moveToTop();
        }
    }
    else{
        currentId = tile.getId();
        currentColor = tile.getFill();
    }

}

function addToMix(tile){
    var children = userMixTiles.getChildren();
    tile.moveTo(userMixTiles);
    if(children.length == 1){
        userMixTiles.setX(canvasWidth / 2 + 3);
        userMixTiles.setY(3);
        userMixTiles.moveToTop();
        tile.moveToTop();
        return;
    }
    userMixTiles.moveToTop();
    tile.moveToTop();
    
    //add curve between tiles
    var lastChild;
    if(children.length == 2) lastChild = children[1];
    else lastChild = children[children.length - 2];

    var curveXStart = lastChild.getX() + tileLen / 2;
    var curveYStart = lastChild.getY() + tileLen / 2;
    var curveXEnd = tile.getX() + tileLen / 2;
    var curveYEnd = tile.getY() + tileLen / 2
    var curve = KCurveShape(curveXStart, curveYStart, tile.getX(), lastChild.getY(), curveXEnd, curveYEnd, curveColor);
    userMixCurves.add(curve);
    curve.moveToBottom();
}

///////////////////////////////////// SOUND /////////////////////////////////////////////
function initSound() {
    var request = new XMLHttpRequest();
    var url = "audio.mp3";
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            soundBuffer = buffer;
        });
    }
    request.send();
}

function removeLoadingScreen() {
    document.getElementById("loadingScreen").style.display="none";
}

function playSound(beats, beat) {
    if(beat < 0) return;
    var start = beats[beat].start;
    var duration = beats[beat].duration;
    if(isChrome){ 
        source = context.createBufferSource();
        source.buffer = soundBuffer;
        source.connect(context.destination);
        source.noteGrainOn(0, start, duration);
    }
}

function getBeats(beats, layer) {
    $.getJSON("songAnalysis.json", 
        function(analysis) {
            for (i in analysis.beats) {
                beats.push({start: analysis.beats[i].start, duration: analysis.beats[i].duration});
            }
            setTimeout(function(){buildSongTable(beats, layer);},0);
            removeLoadingScreen();
        }
    );
}

///////////////////////////////////// PLAY / PAUSE /////////////////////////////////////////////
function playUserMix(){
    var children = userMixTiles.getChildren();
    songIsPlaying = true;
    document.getElementById("mixButton").value="Pause";
    document.getElementById("mixButton").onclick=function(){pause('mix');};
    if(!isGridStyle){
        playSongBeats(beats, children, 1);
    }else{
        var tiles = [];
        var curDuration
        var index;
        playSongBeats(beats, children, 1);
    }
}

//TODO: check if song or mix is done
function playSongBeats(beats,tiles,current){
    if(songIsPlaying){
        var beat = tiles[current].getId();
        if(beat != -1){
            playSound(beats,beat);
        }
        current++;
        setTimeout(function(){playSongBeats(beats, tiles, current)}, beats[current-1].duration*1000);
    }
}

function playSong(){
    songIsPlaying = true;
    document.getElementById("songButton").value="Pause";
    document.getElementById("songButton").onclick=function(){pause('song');};
    var children = currentSongTiles.getChildren();
    if(children.length !=0) {
        if(playSongBeats(beats,children,0) == 'finished') //TODO: fix to be asynchronous
            pause('song')
    }
}
function pause(songOrMix){
    songIsPlaying = false;
    if(songOrMix == 'song'){
        document.getElementById("songButton").value="Play Song";
        document.getElementById("songButton").onclick=function(){playSong();};
    } else {
        document.getElementById("mixButton").value="Play It!";
        document.getElementById("mixButton").onclick=function(){playUserMix();};
    } 
}

///////////////////////////////////// ETC /////////////////////////////////////////////
function swapColors(){
    var songChildren = currentSongTiles.getChildren();
    var mixChildren = userMixTiles.getChildren();
    if (userMixTiles.get('.curves')[0]) var curveChildren = mixChildren[0].getChildren();
    var color;
    if(isChristmas){
        isChristmas = false;
        color1 = '#071871';
        color2 = '#5A016D';
        color3 = '#91A200';
        color4 = '#38B2CE';
        stroke = 'silver';
        curveColor = 'silver';
        backgroundColor = '#A67600';
    }else{
        isChristmas = true;
        color1 = 'red';
        color2 = '#00CC00';
        color3 = 'white';
        color4 = '#38B2CE';
        stroke = 'silver';
        curveColor = 'green';
        backgroundColor = '#006363';
    }
        //recolor song tiles
        for(var i = 0; i < songChildren.length; i++){
            if(i%4 == 0) color=color1;
            else if(i%4 == 1) color=color2;
            else if(i%4 == 2) color=color3;
            else color=color4;
            songChildren[i].setFill(color);
            songChildren[i].setStroke(stroke);
        }
        //recolor mix curves
        if(userMixTiles.get('.curves')[0]){
            for(var i = 0; i < curveChildren.length; i++){
                curveChildren[i].setStroke(curveColor);
            }
        }
        //recolor mix tiles
        for(var i = 1; i < mixChildren.length; i++){
            if(i%4 == 0) color=color1;
            else if(i%4 == 1) color=color2;
            else if(i%4 == 2) color=color3;
            else color=color4;
            mixChildren[i].setFill(color);
            mixChildren[i].setStroke(stroke);
        }
        $('canvas')[0].style.backgroundColor=backgroundColor;
    layer.draw();
}

function gridStyle(){
    userMixTiles.removeChildren();
    currentSongTiles.removeChildren();
    buildSongTable(beats, layer);
    //TODO swap colors if necessary
    if(isGridStyle){
        isGridStyle = false;
        document.getElementById("gridStyle").value = "Grid Style";
        layer.draw();
        return;
    }
    isGridStyle = true;
    document.getElementById("gridStyle").value = "Free Style";
    var songChildren = currentSongTiles.getChildren();
    for(var i = 0; i < songChildren.length; i++){
        songChildren[i].setDraggable(false);
    }
    var rows = gridRowNum;
    var columns = gridColumnNum;
    var color = "#A67600";
    for(var j = 1; j <= rows*2; j+=2){
        for(var i = 1; i <= columns; i++){
            var rect = KRectangle(i*tileLen*2 + canvasWidth / 2, j*tileLen*1.2, tileLen*2, tileLen*2, color, -1);
            rect.setDraggable(false);
            rect.on('click', function(evt){
                this.setId(currentId);
                if(currentColor != null) this.setFill(currentColor);
            });
            userMixTiles.add(rect);
        }
    }
    layer.draw();
/*    rect.on('mouseover',function(){
        this.setOpacity(0.5);
        layer.draw();
    });
    rect.on('mouseout',function(){
        this.setOpacity(1);
        layer.draw();
    });*/
}
