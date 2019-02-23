console.log("+++");
const Text = require('sketch/dom').Text;
const Style = require('sketch/dom').Style;
const Document = require('sketch/dom').Document;
const Group = require('sketch/dom').Group;
const UI = require('sketch/ui');
const ShapePath = require('sketch/dom').ShapePath;
const Settings = require('sketch/settings')

const document = Document.getSelectedDocument();
const page = document.selectedPage;

//Settings
const labelGroupName = "#LABELS";
const treeGroupName = "#TREE";
const depthMargin = 50;
const margin = 50;
const gray = '#777777';

var _time = Date.now();

var labelGroup = false;
var treeGroup = false;

var lastX = 0;
var lastY = 0;
var maxY = 0;

const labelStyle = {
	fontSize: 20,
	textColor: gray,
	alignment: "left",
	fontFamily: 'Monaco',
	fontWeight: 5
}

var labels = false;
var names = false;
var symbols = false;

treeGroup = findPageLayerNamed(treeGroupName);
labelGroup = findPageLayerNamed(labelGroupName);
symbols = collectSymbolMastersInPage();

//// #SYNC
export function onSyncSymbolTree() {
	try {
		timestamp("+++ start sync +++");
		if (labelGroup) {
			//if labels exist, rename symbol masters based on labeling
			getStoredSymbolMasterNames();
			renameSymbolsByPosition();
		}
		//generate new labels and sort symbols
		arrangeSymbols();
		setStoredSymbolMasterNames();
	} catch (error) {
		console.error(error);
		UI.alert('SymbolTree Just Messed It Up!!!', error.message + ' > Clearing everything out and starting fresh.');
		//recover from error. Remove all labels to avoid renaming mishaps ;)
		resetStoredSymbolMasterNames();
		removeTree();
		removeLabels();
	}
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

// DATA ##
function resetStoredSymbolMasterNames() {
	Settings.setDocumentSettingForKey(document, '_STSymbolNames', null);
}

function setStoredSymbolMasterNames() {
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

function getStoredSymbolMasterNames() {
	names = Settings.documentSettingForKey(document, '_STSymbolNames');
	if (!names) names = {};
}

// ARRANGE ##
function arrangeSymbols() {

	var map = newMap();

	removeLabels();
	removeTree();

	labelGroup = new Group();

	labelGroup.name = labelGroupName;
	//labelGroup.adjustToFit();
	labelGroup.parent = page;
	labelGroup._object.setHasClickThrough(true);

	treeGroup = new Group();
	treeGroup.name = treeGroupName;
	//treeGroup.adjustToFit();
	treeGroup.parent = page;
	treeGroup._object.setHasClickThrough(true);
	treeGroup.locked = true;

	symbols.sort(sortByName);

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


/*
var fiber = require('sketch/async').createFiber()
longRunningTask(function(err, result) {
  fiber.cleanup()
  // you can continue working synchronously here
})
*/



function arrangeLayersByMap(name, mapLevel, depth, previousSibling, parentLabel) { //RECURSIVE!!

	lastX = depth * depthMargin;
	lastY = maxY + margin;
	const label = addLabel(name, name, lastX, lastY, previousSibling, parentLabel);
	lastY += depthMargin;
	maxY += depthMargin;

	const layers = mapLevel._LAYERS;
	for (var i = 0; i < layers.length; i++) {
		const lf = layers[i].frame;
		layers[i].frame = {
			x: lastX,
			y: lastY
		};
		maxY = Math.max(maxY, lastY + lf.height);
		lastX = lastX + margin + lf.width;
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
		frame: {
			x: x,
			y: y
		},
		style: labelStyle,
		parent: labelGroup
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
			'Q' + x0 + ' ' + y1 + ' ' + (x0 + 10) + ' ' + (y1) +
			' ' + ' L ' + x1 + ' ' + y1);

		shapePath.style = {
			borders: [{
				color: gray,
				fillType: Style.FillType.Color
			}],
			borderOptions: {
				endArrowhead: "FilledCircle",
			}
		};

		shapePath.parent = treeGroup;
	}

	return textObj;
}

function renameSymbolsByPosition() {
	timestamp("+++ start rename ✏️");

	var cnt = 0;

	labelGroup.adjustToFit();
	labels = labelGroup.layers.slice();
	var masterList = [];
	//sort by Y
	masterList = symbols.concat(labels);
	page._object.setRulerBase(CGPointMake(0, 0));
	masterList.sort(sortLayersByOffsetY);

	timestamp("sort master list");

	var lastLabelDepth = 0;
	var pathStack = ['/'];
	var depth = 0;
	var path = '/';

	for (var i = 0; i < masterList.length; i++) {
		const l = masterList[i];
		const type = l.type;
		if (type == "Text") {
			//is a label

			depth = Math.round(l.frame.x / depthMargin);
			if (depth > lastLabelDepth) { //correct for overly deep label placement
				depth = lastLabelDepth + 1;
			}

			var token = l.text;
			token = (token.charAt(token.length - 1) == "/") ? token : token + "/";
			pathStack[depth] = token;
			lastLabelDepth = depth;
		} else if (type == "SymbolMaster" && !isNewOrRenamed(l)) {
			path = pathStack.slice(1, depth + 1).join("");
			var newName = calculateNewName(l.name, path);
			if (l.name != newName) {
				l.name = newName;
				cnt++;
			}
		} //ELSE ignore
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

function isNewOrRenamed(symbol) {
	return names[symbol.id] != symbol.name;
}

function message(text) {
	console.log("<" + text + ">");
	context.document.showMessage(text);
}

function collectSymbolMastersInPage() {
	var symbols = [];
	var layers = page.layers;
	for (var i = 0; i < layers.length; i++) {
		if (layers[i].type == "SymbolMaster") {
			symbols.push(layers[i]);
		}
	}
	return symbols;
}

function findPageLayerNamed(name) { // Finds layers on the page (not inside Artboards or SymbolMasters)
	var layers = document.getLayersNamed(name);
	for (var i = 0; i < layers.length; i++) {
		if (layers[i].parent.id == page.id) return layers[i];
	}
	return false;
}

function sortByName(a, b) {
	return a.name.localeCompare(b.name);
}

function sortLayersByOffsetY(a, b) {
	return (a.frame.y + a.parent.frame.y) - (b.frame.y + b.parent.frame.y);
}

function timestamp(label) {
	var t = ((Date.now() - _time) / 1000);
	/*if(t > .1)*/
	console.warn(label + " - " + t + " sec.")
	_time = Date.now();
}