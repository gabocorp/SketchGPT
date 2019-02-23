var Document = require('sketch/dom').Document
var Page = require('sketch/dom').Page;
var Artboard = require('sketch/dom').Artboard
var Text = require('sketch/dom').Text
var Group = require('sketch/dom').Group
var Rectangle = require('sketch/dom').Rectangle
var ShapePath = require('sketch/dom').ShapePath
var Style = require('sketch/dom').Style

var document = Document.getSelectedDocument();
var page = document.selectedPage;
var audits, auditorBoard;
var bgGroup;

const margin = 50;
const padding = 30;

export function onAuditLayer() {
	console.log("+++");

	var selection = document.selectedLayers.layers;
	var auditQueue = {};
	var p;
	for (var i = 0; i < selection.length; i++) {
		switch (selection[i].type) {
			case "ArtBoard":
			case "SymbolMaster":
				p = selection[i]
				break;

			default:
				p = selection[i].getParentArtboard();
				break;
		}

		auditQueue[p.id] = p;
	}

	for (const key in auditQueue) {
		auditArtboard(auditQueue[key]);
	}

}

function auditArtboard(ab) {
	var result = {
		noStyle: 0
	};

	auditLayer(ab, result);

	if (result.noStyle > 0) {
		new Text({
			name: ab.id,
			text: result.noStyle + " noStyle",
			frame: {
				x: ab.frame.x,
				y: ab.frame.y + ab.frame.height + 10
			},
			parent: page,
			style: {
				textColor: '#777777FF',
				fontFamily: 'Monaco'
			}
		})
	}

}

function auditLayer(group, result) {

	for (var i = 0; i < group.layers.length; i++) {
		const layer = group.layers[i];
		//console.log(layer.type);
		switch (layer.type) {
			case "Text":
				if (layer.sharedStyleId == null) {
					//found text with no style
					result.noStyle++;
				}
				break;
			case "Group":
			case "SymbolInstance":
				break;
		}
		//console.log(result.noStyle);
	}
}


  
function getFontWeightNames( fontFam ){
	var values = [];
	var members = NSFontManager.sharedFontManager().availableMembersOfFontFamily( fontFam );

	for( var i = 0 ; i < members.length ; i++ ){
		const w = members[i][2];
		if(values[w] == null){
		  values[w] = members[i][1];
		}
	} 

	return values;

  //return NSFontManager.sharedFontManager().availableMembersOfFontFamily( fontFam );
}

function makeAudit(layer) {
	console.log(layer);
	var auditBlock = new Text({
		text: "Audit!!!",
		//alignment: Text.style.alignment.left,
		//sharedStyleId: sharedStyle.id,
		//style:sharedStyle.style,
		parent: audits,
		fixedWidth: true
	});

	auditBlock.frame.x = layer.frame.x;
	auditBlock.frame.y = layer.frame.y;
	auditBlock.frame.width = layer.frame.width;

}

function cloneArray(arr) {
	return arr.slice();
}

export function onGenerateAuditor() {



	var textStyles = cloneArray(document.sharedTextStyles);

	//console.log(JSON.stringify(textStyles));
	bgGroup = new Group({
		name: "bgs"
	});
	bgGroup.locked = true;
	//MAKE auditorBoard
	auditorBoard = new Artboard({
		name: 'Style Samples as of ' + (new Date().toString()),
		parent: page
	})

	bgGroup.parent = auditorBoard;

	var maxX = -99999;

	page.layers.forEach(element => {
		var m = element.frame.x + element.frame.width;
		maxX = (maxX > m) ? maxX : m;
	});

	auditorBoard.frame.x = maxX + 100;

	auditorBoard.frame.y = 0;

	//MAKE ALL Style Samples
	var y = margin;
	maxX = 0;

	textStyles.sort(sortStyleByName);

	var lastToken = "";
	var lastName = "";

	for (let i = 0; i < textStyles.length; i++) {
		const s = textStyles[i];

		var tokens = s.name.split("/");
		if (lastToken != tokens[0]) {
			lastToken = tokens[0];
			var divider = new Text({
				text: lastToken,
				parent: auditorBoard,

				frame: {
					y: y,
					x: padding * .5
				},
				style: {
					textColor: '#777777FF',
					fontFamily: 'Helvetica Neue',
					fontSize: 10,
					alignment: 'left'
				},
				locked: true

			});
			y += padding;
		}


		var sample = makeStyleSample(s, auditorBoard, margin, y);

		if (lastName == s.name) {
			drawWarning(sample);
		}

		lastName = s.name;
		y += padding + s.style.fontSize;
		maxX = Math.max(maxX, sample.frame.width);
	}

	auditorBoard.frame.width = 500; //maxX + (margin * 2);
	auditorBoard.frame.height = y + margin;

	//RESIZE artboard

	//ARRANGE ARTBOARDS

	document.centerOnLayer(auditorBoard);
	context.document.showMessage("🙌 Auditor done!");
}

function drawWarning(sample) {
	const shapePath = new ShapePath({
		name: 'dupe',
		shapeType: ShapePath.ShapeType.Oval,
		frame: {
			x: sample.frame.x - 30,
			y: sample.frame.y + (.5 * sample.frame.height),
			width: 10,
			height: 10
		},
		style: {
			fills: [{
				color: '#F8E71CFF',
				fill: Style.FillType.Color,
			}],
			borders: []
		},
		parent: sample.parent
	})
}

function toHSL(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	var r = parseInt(result[1], 16);
	var g = parseInt(result[2], 16);
	var b = parseInt(result[3], 16);
	var a = parseInt(result[4], 16);

	r /= 255, g /= 255, b /= 255, a /= 255;
	var max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	s = s * 100;
	s = Math.round(s);
	l = l * 100;
	l = Math.round(l);

	return {
		h: h,
		s: s,
		l: l
	};

}

function makeBG(text) {
	if (toHSL(text.style.textColor).l > 50) {
		new ShapePath({
			name: 'dark',
			shapeType: ShapePath.ShapeType.Rectangle,
			frame: {
				x: text.frame.x - 4,
				y: text.frame.y - 2,
				width: text.frame.width + 8,
				height: text.frame.height + 4
			},
			style: {
				fills: [{
					color: '#333333',
					fill: Style.FillType.Color,
				}],
				borders: []
			},
			parent: text.parent,
			locked: true
		});
		return true;
	}
	return false;
}

function makeStyleSample(sharedStyle, artboard, x, y) {
	//var layers = sharedStyle.getAllInstancesLayers();
	var styleSample = new Text({
		text: sharedStyle.name,
		sharedStyleId: sharedStyle.id,
		style: sharedStyle.style,
		parent: artboard
	})
	styleSample.frame.x = x; // + (sharedStyle.name.split("/").length*padding/2);
	styleSample.frame.y = y;

	var fontFamily = sharedStyle.style.fontFamily;
	var fontWeight = sharedStyle.style.fontWeight;

	var weightTable = getFontWeightNames( fontFamily );

	var fontWeightName = weightTable[fontWeight];
	/*if (fontFamily == "Helvetica Neue LT Std") {
		switch (fontWeight) {
			case 3:
			fontWeight = "45 Light (3)";
				break;
			case 5:
			fontWeight = "55 Roman (5)";
				break;
			case 7:
			fontWeight = "65 Medium (7)";
				break;
			case 9:
			fontWeight = "75 Bold (9)";
				break;
			case 10:
			fontWeight = "85 Heavy (10)";
				break;
		}
	}*/

	//Add Style Details
	var description = "";
	description += fontFamily;
	description += " ∙ weight: " + fontWeightName + " (" + fontWeight +")";
	description += " ∙ " + sharedStyle.style.fontSize;
	if (sharedStyle.style.lineHeight) description += ("/" + sharedStyle.style.lineHeight);
	description += " ∙ " + sharedStyle.style.alignment + " aligned";
	if (sharedStyle.style.textTransform != 'none') description += " ∙ " + sharedStyle.style.textTransform;
	if (sharedStyle.style.kerning > 0) description += " ∙ kern: " + sharedStyle.style.kerning;
	description += " ∙ " + sharedStyle.style.textColor;


	var styleDetails = new Text({
		text: description,
		parent: artboard
	})

	styleDetails.style.fontSize = 8;
	styleDetails.style.fontFamily = "Helvetica Neue";
	styleDetails.style.textColor = "#777777FF";
	styleDetails.frame.x = styleSample.frame.x; // + styleSample.frame.width + padding * 2;
	styleDetails.frame.y = styleSample.frame.y + styleSample.frame.height + 2; // Math.floor(styleSample.frame.y + (styleSample.frame.height - useCnt.frame.height) / 2);

	//Add BG if style is bright
	makeBG(styleSample);
	styleSample.parent = styleSample.parent;
	return styleSample;
}

export function onFindStyle() {
	//var documents = Document.getDocuments();
	var document = Document.getSelectedDocument();
	var selection = document.selectedLayers;
	if (!selection.isEmpty) {
		selection.layers.forEach(layer => {
			//layer.sharedStyleId;
			//console.log(layer.sharedStyleId);
			//console.log(document);
			var sharedStyle = document.getSharedTextStyleWithID(layer.sharedStyleId);
			//console.log(sharedStyle);
			var layers = sharedStyle.getAllInstancesLayers();
			console.log(layers);
			for (var i = 0; i < layers.length; i++) {
				var l = layers[i];
				//console.log( JSON.stringify( l , null , 4) );
				console.log("-------");

				while (l.parent) {
					console.log(l.name);
					l = l.parent;
				}
			}
		});
	}
}


export function onGetStyleJSON() {
	/*new WebUI(context, require("../resources/index.html"), {
		identifier: "identity",
		x: 0,
		y: 500,
		width: 500,
		height: 400,
		blurredBackground: false,
		onlyShowCloseButton: true,
		hideTitleBar: false,
		shouldKeepAround: true,
		resizable: false
	  }); 
	  */
}
export function onGetStyleJSONs() {
	var textStyles = document.sharedTextStyles;
	var output = [];
	//var layers = textStyles[0].getAllInstancesLayers();
	//console.log( JSON.stringify(layers[0]._object, null, 4) );

	for (var i = 0; i < textStyles.length; i++) {
		var styleObj = {};
		var s = textStyles[i];
		styleObj.fontFamily = s.style.fontFamily;
		styleObj.fontWeight = s.style.fontWeight;
		styleObj.fontSize = s.style.fontSize;
		styleObj.lineHeight = s.style.lineHeight;
		styleObj.alignment = s.style.alignment;
		styleObj.textTransform = s.style.textTransform;
		styleObj.kerning = s.style.kerning;
		styleObj.color = s.style.textColor;
		output.push(styleObj);
	}
	console.log(JSON.stringify(output, null, 4));
}

