console.log("+++");
//const Page = require('sketch/dom').Page;
const Text = require('sketch/dom').Text;
const Style = require('sketch/dom').Style;
const Document = require('sketch/dom').Document;
const Group = require('sketch/dom').Group;
const UI = require('sketch/ui');
const ShapePath = require('sketch/dom').ShapePath;
const Settings = require('sketch/settings')

const document = Document.getSelectedDocument();
const page = document.selectedPage;

var _time = Date.now();

const debug = true;

//Settings
const labelGroupName = "#LABELS";
const treeGroupName = "#TREE";

const depthMargin = 50;
const margin = 50;

var labelGroup = false;
var treeGroup = false;

var lastX = 0;
var lastY = 0;
var maxY = 0;

const labelStyle = {
		fontSize:20,
		textColor:"#777777FF",
		alignment:"left",
		fontFamily:'Monaco',
		fontWeight:5
}

var labels = false;
var names = false;

var symbols = false;

treeGroup = findFirstLayerNamed(treeGroupName);
labelGroup = findFirstLayerNamed(labelGroupName);
symbols = collectSymbols();

//// #SYNC
export function onSyncSymbolTree() {
	try {
		timestamp("+++ start sync +++");
		if ( labelGroup ) {
			//if labels exist, rename symbol masters based on labeling
			getPreviousSymbolNames();
			onRenameSymbolsByLocation();	
		}
		//generate new labels and sort symbols
		onArrangeSymbols();
		storeCurrentNames();
	} catch (error) {
		console.error(error);
		UI.alert('SymbolTree Just Messed It Up!!!', error.message + ' > Clearing everything out and starting fresh.');
		//recover from error. Remove all labels to avoid renaming mishaps ;)
		resetStoredNames();
		removeTree();
		removeLabels();
	}
}

function replaceContainerNamed( name ){
	var found = document.getLayersNamed(name);
	found.forEach(element => {
		element.remove();
	});
	return new Group( {name:name,parent:page} );
}

function removeTree() {
	var found = document.getLayersNamed(treeGroupName);
	found.forEach(element => {
		element.remove();
	})
}

function removeLabels() {
	var found = document.getLayersNamed(labelGroupName);
	found.forEach(element => {
		element.remove();
	});
}

function resetStoredNames() {
	Settings.setDocumentSettingForKey(document, '_STSymbolNames', null);
}

function storeCurrentNames() {
	if (symbols == null || symbols.length == 0) {
		console.error("NO SYMBOL MASTERS HERE!!");
		return;
	}
	names = {};
	symbols.forEach(symbol => {
		names[symbol.id] = symbol.name;
	});
	Settings.setDocumentSettingForKey(document, '_STSymbolNames', names);
}

function getPreviousSymbolNames() {
	names = Settings.documentSettingForKey(document, '_STSymbolNames');
	if(!names) names = {};
}

// ARRANGE 
function onArrangeSymbols() {
	
	timestamp("store symbol names");

	var map = newMap();
	timestamp("+++ start arrange 📎");

	removeLabels();
	removeTree();

	labelGroup = new Group();

	labelGroup.name = labelGroupName;
	labelGroup.adjustToFit();
	labelGroup.parent = page;
	labelGroup._object.setHasClickThrough(true);


	treeGroup = new Group();
	treeGroup.name = treeGroupName;
	treeGroup.adjustToFit();
	treeGroup.parent = page;
	treeGroup._object.setHasClickThrough(true);
	treeGroup.locked = true;

	timestamp("reset titles");
	
	timestamp("collect symbols");

	symbols.sort(sortSymbolsByName);

	var map = newMap();

	for (var i = 0; i < symbols.length; i++) {
		mapLayerByName(symbols[i], map);
	}
	timestamp("map layers");

	arrangeLayersByMap("", map, 0, null, null);
	timestamp("arrange layers");

	message('Arranged ' + symbols.length + ' symbols. Done!');

}

function newMap() {
	return {
		_LAYERS: []
	};
}

function mapLayerByName(layer, map) {
	const tokens = layer.name.split("/");
	var mapThis = map;
	for (var i = 0; i < tokens.length - 1; i++) {
		if (mapThis[tokens[i]] == undefined) mapThis[tokens[i]] = newMap();
		mapThis = mapThis[tokens[i]];
	}
	mapThis._LAYERS.push(layer);
}

function arrangeLayersByMap(name, mapLevel, depth, previousSibling, parentLabel) {
	lastX = depth * depthMargin;
	lastY = maxY + margin;
	const label = addLabel(name, name, lastX, lastY, previousSibling, parentLabel);
	lastY += depthMargin;
	maxY += depthMargin;
	for (var i = 0; i < mapLevel._LAYERS.length; i++) {
		// sort through Layer content - ROW (X)
		var l = mapLevel._LAYERS[i].frame;
		if(l.x!= lastX) l.x = lastX;
		if(l.y!= lastY) l.y = lastY;
		var maxYn = lastY + l.height;
		maxY = Math.max(maxY, maxYn);
		lastX = lastX + margin + l.width;
	}
	previousSibling = label;
	for (var key in mapLevel) {
		if (key != "_LAYERS") {
			previousSibling = arrangeLayersByMap(key, mapLevel[key], depth + 1, previousSibling, label);
		}
	}
	return label;
}

function addLabel(text, id, x, y, previousSibling, parentLabel) {
	var textObj = new Text({
		text: text + "/",
		name: text,
		frame:{ x:x, y:y },
		style:labelStyle,
		parent:labelGroup

	});

	if (parentLabel) {
		const p = parentLabel.frame;
		const ps = (previousSibling) ? previousSibling.frame : p;

		var x0 = p.x - 20;
		var y0 = ps.y + 15;
		var x1 = x - 20;
		var y1 = y + 15;

		const shapePath = ShapePath.fromSVGPath(
			'M' + x0 + ' ' + y0 +
			' ' + ' L ' + x0 + ' ' + (y1 - 10) +
			'Q'+ x0 + ' ' + y1 + ' ' +  (x0 + 10) + ' ' + (y1) +

			//' ' + ' L ' + (x0 + 10) + ' ' + (y1) +
			' ' + ' L ' + x1 + ' ' + y1);

		shapePath.style.borders = [{
			color: '#777777',
			fillType: Style.FillType.Color
		}, ];
		shapePath.style.borderOptions = {
			endArrowhead: "FilledCircle",
		}
		shapePath.parent = treeGroup;
	}

	return textObj;
}

function onRenameSymbolsByLocation() {
	timestamp("+++ start rename ✏️");

	var cnt = 0;
	
	labelGroup.adjustToFit();
	labels = labelGroup.layers.slice(0);
	var masterList = [];
	//sort by Y
	masterList = symbols.concat(labels);
	page._object.setRulerBase(CGPointMake(0,0));
	masterList.sort( sortLayersByOffsetY );

	timestamp("sort master list");

	var lastLabelDepth = 0;
	var pathStack = ['/'];
	var depth = 0;
	var path = '/';

	for( var i = 0 ; i < masterList.length ; i++ ){
		const l = masterList[i];
		const type = l.type;
		if(type == "Text"){
			//is a label
			
			depth = Math.round(l.frame.x / depthMargin);
			if (depth > lastLabelDepth) { //correct for overly deep label placement
				depth = lastLabelDepth + 1;
			}

			var token = l.text;
			token = (token.charAt(token.length-1) == "/")?token:token+"/";
			pathStack[depth] = token;
			lastLabelDepth = depth;
		}else if(type == "SymbolMaster" && !wasRenamed(l) ){
			path = pathStack.slice(1, depth + 1).join(""); 
			var newName = calculateNewName( l.name , path );
			if( l.name != newName ) {
				l.name = newName;
				cnt++;
			}
		}//ELSE ignore
	} 
	timestamp("rename");
	message('✏️ Renamed ' + cnt + ' symbols.');
}

//// UTIL

function calculateNewName(oldName, newPath) {
	var tokens = oldName.split("/");
	var name = tokens[tokens.length - 1];
	return newPath + name;
}

function wasRenamed(symbol){
	return names[symbol.id] != symbol.name;
}

function message(text) {
	log("<" + text + ">");
	context.document.showMessage(text);
}

function log(text) {
	console.log("[g]" + text + "")
}

function collectSymbols() {
	var ss = document.getSymbols();
	var symbols = [];

	for (var i = 0; i < ss.length; i++) {
		if (ss[i].parent && ss[i].parent.id == page.id) {
			symbols.push(ss[i]);
		}
	}
	return symbols;
}

function findFirstLayerNamed(name) {
	var layers = document.getLayersNamed(name);
	for (var i = 0; i < layers.length; i++) {
		if (layers[i].parent.id == page.id) return layers[i];
	}
	return false;
}

function sortSymbolsByName(a, b) {
	var match = /([^a-zA-Z0-9])|([0-9]+)|([a-zA-Z]+)/g,
		ax = [],
		bx = [];
	a.name.replace(match, function (_, $1, $2, $3) {
		ax.push([$1 || "", $2 || Infinity, $3 || "0"])
	});
	b.name.replace(match, function (_, $1, $2, $3) {
		bx.push([$1 || "", $2 || Infinity, $3 || "0"])
	});

	while (ax.length && bx.length) {
		var an = ax.shift(),
			bn = bx.shift(),
			nn = an[0].localeCompare(bn[0]) || (an[1] - bn[1]) || an[2].localeCompare(bn[2]);
		if (nn) return nn;
	}
	return ax.length - bx.length;
}

function sortLayersByOffsetY(a, b) {
	return (a.frame.y + a.parent.frame.y) - (b.frame.y + b.parent.frame.y);
}

function timestamp(label) {
	var t = ((Date.now() - _time) / 1000) ;
	if(t > .3) console.warn(label + " - " + t + " sec.")
	_time = Date.now();
}