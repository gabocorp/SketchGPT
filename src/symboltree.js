import * as util from './util';

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
var oldNames = false;
var symbols = false;

var report = {
	renamed: [],
	sorted: []
}

treeGroup = util.findLayerNamed(treeGroupName, page);
labelGroup = util.findLayerNamed(labelGroupName, page);
symbols = util.collectSymbolMastersInPage(page);

function checkForConflicts(){
	//if there's more than one #LABEL group, remove labels, trees, and reset old names... we have a conflict
	let layers = page.layers.slice();
	
	let labelCnt = 0;

	for (let i = 0; i < layers.length; i++) {
		if (layers[i].name == labelGroupName ) {
			labelCnt++;
			if(labelCnt>1){
				resetStoredSymbolMasterNames();
				util.removeLayersNamed(treeGroupName, page);
				util.removeLayersNamed(labelGroupName, page);
				return;
			}
		}
	}
}

//// ## SYNC ##
export function onSyncSymbolTree() {
	try {
		checkForConflicts();
		if (symbols.length > 0) {
			if (labelGroup) {
				//if labels exist, rename symbol masters based on labeling
				getStoredSymbolMasterNames();
				renameSymbolsByPosition();
			}
			//generate new labels and sort symbols
			arrangeSymbols();
			setStoredSymbolMasterNames();
		}
		reportAlert();
	} catch (error) {
		console.error(error);
		UI.alert('SymbolTree Just Messed It Up!!!', error.message + ' > Clearing everything out and starting fresh.');
		//recover from error. Remove all labels to avoid renaming mishaps ;)
		resetStoredSymbolMasterNames();
		util.removeLayersNamed(treeGroupName, page);
		util.removeLayersNamed(labelGroupName, page);
	}
}

// ARRANGE ##
function arrangeSymbols() {

	var map = newMap();

	util.removeLayersNamed(treeGroupName, page);
	util.removeLayersNamed(labelGroupName, page);

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

	symbols.sort(util.sortByName);

	var map = newMap();

	for (var i = 0; i < symbols.length; i++) {
		mapLayerByName(symbols[i], map);
	}
	arrangeLayersByMap("", map, 0, null, null);
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

function arrangeLayersByMap(name, mapLevel, depth, previousSibling, parentLabel) { //RECURSIVE!!

	lastX = depth * depthMargin;
	lastY = maxY + margin;
	const label = addLabel(name, lastX, lastY, previousSibling, parentLabel);
	lastY += depthMargin;
	maxY += depthMargin;

	const layers = mapLevel._LAYERS;
	for (var i = 0; i < layers.length; i++) {
		const lf = layers[i].frame;
		if (lf.x != lastX || lf.y != lastY) {
			report.sorted.push({
				name: layers[i].name
			});
			layers[i].frame = {
				x: lastX,
				y: lastY
			};
		}
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

function addLabel(text, x, y, previousSibling, parentLabel) {
	// make label
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

	//make tree branch ShapePaths
	if (parentLabel) {
		const p = parentLabel.frame;
		const ps = (previousSibling) ? previousSibling.frame : p;
		var x0 = p.x - 20;
		var y0 = ps.y + 15;
		var x1 = x - 20;
		var y1 = y + 15;
		const shapePath = ShapePath.fromSVGPath(
			'M' + x0 + ' ' + y0 + //  o
			' ' + ' L ' + x0 + ' ' + (y1 - 10) + //  |
			'Q' + x0 + ' ' + y1 + ' ' + (x0 + 10) + ' ' + (y1) + //   \
			' ' + ' L ' + x1 + ' ' + y1); //     ---
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
	labelGroup.adjustToFit();
	let symbolsToRename = [];
	let symbolsNewNames = [];

	labels = labelGroup.layers.slice();
	var masterList = [];
	//sort by Y
	masterList = symbols.concat(labels);
	page._object.setRulerBase(CGPointMake(0, 0));
	masterList.sort(util.sortLayersByOffsetY);

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
		} else if (type == "SymbolMaster" && oldNames[l.id] == l.name) {
			// else if is type SymbolMaster AND name is the same as last time
			path = pathStack.slice(1, depth + 1).join("");
			var newName = util.calculateNewName(l.name, path);
			if (l.name != newName) {
				report.renamed.push({
					oldName: l.name,
					newName: newName
				});
				l.name = newName;
			}
		} //ELSE ignore
	}
}

// END REPORT
function reportAlert() {

	if (symbols.length == 0) {
		UI.alert('SymbolTree is CONFUSED!!! 😖', "This page has no Symbol Masters!\nNothing to do here...");
		return;
	}

	var reportText = "";

	if (report.renamed.length > 0) {
		if (report.renamed.length < 20) {
			reportText += "Renamed:"
			for (var i = 0; i < report.renamed.length; i++) {
				reportText += "\n" + report.renamed[i].oldName + " ➤ " + report.renamed[i].newName
			}
		} else {
			reportText += "Renamed " + report.renamed.length + " Symbols!";
		}
	}

	if (report.sorted.length > 0 && report.renamed.length > 0) reportText += "\n\n";

	if (report.sorted.length > 0) {
		if (report.sorted.length < 5) {
			reportText += "Repositioned:"
			for (var i = 0; i < report.sorted.length; i++) {
				reportText += "\n" + report.sorted[i].name;
			}
		} else {
			reportText += "Repositioned " + report.sorted.length + " Symbols!"
		}
	}


	if ( report.renamed.length > 0 ) {
		UI.alert('SymbolTree is HAPPY!!! 🤩', reportText);
	} else {
		UI.message( "⚡️ Everything is clean! ⚡️" );
		//UI.alert('SymbolTree is SAD!!! 😭', "Nothing to do. Everything is so clean already!");
	}
}

// DATA //

function resetStoredSymbolMasterNames() {
	Settings.setDocumentSettingForKey(document, '_STSymbolNames', null);
}

function setStoredSymbolMasterNames() {
	if (symbols == null || symbols.length == 0) {
		return;
	}
	oldNames = {};
	symbols.forEach(symbol => {
		oldNames[symbol.id] = symbol.name;
	});
	Settings.setDocumentSettingForKey(document, '_STSymbolNames', oldNames);
}

function getStoredSymbolMasterNames() {
	oldNames = Settings.documentSettingForKey(document, '_STSymbolNames');
	if (!oldNames) oldNames = {};
}