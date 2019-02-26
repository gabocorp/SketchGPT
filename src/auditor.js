import * as util from './util';

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
	test();
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


var fontData = {};

function getFontData(fontFamilyName, index) {
	if (fontData[fontFamilyName] != null) {
		return fontData[fontFamilyName][index];
	}

	var values = [];
	var members = NSFontManager.sharedFontManager().availableMembersOfFontFamily(fontFamilyName);

	for (var i = 0; i < members.length; i++) {
		const w = members[i][2];
		if (values[w] == null) {
			values[w] = {
				weightName: members[i][1],
				systemName: members[i][0]
			}
			//console.log(members[i]);
		}
	}

	fontData[fontFamilyName] = values;
	return values[index];

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

export function onGenerateAuditor() {

	var textStyles = document.sharedTextStyles.slice();

	//console.log(JSON.stringify(textStyles));
	bgGroup = new Group({
		name: "bgs"
	});
	bgGroup.locked = true;
	//MAKE auditorBoard
	auditorBoard = new Artboard({
		name: 'Text Styles on ' + (new Date().toString()),
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

	textStyles.sort(util.sortByName);

	var lastToken = "";
	var lastName = "";

	getNamedColors();

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
			drawWarning(sample, "duplicate name", '#FF3300FF');
		} else {

			let sLayers = s.getAllInstancesLayers();
			let cnt = 0;
			sLayers.forEach(element => {
				let p = element.getParentPage();
				if (p.id != page.id) {
					cnt++;
				}
			});

			if (cnt == 0) {
				drawWarning(sample, "Never used in this document", '#FFDE00FF');
			} else if (cnt == 1) {
				drawWarning(sample, "Only used once", '#FFDE0077');
			}
		}

		lastName = s.name;
		y += padding + s.style.fontSize;
		maxX = Math.max(maxX, sample.frame.width);
	}

	auditorBoard.frame.width = 512; //maxX + (margin * 2);
	auditorBoard.frame.height = y + margin;

	document.centerOnLayer(auditorBoard);
	context.document.showMessage("Text Style Samples Done! 🙌");
}


export function onSaveStyleJSON(){
	util.saveTextDialogue( getStyleJSON());
}

let namedColors = {};
function getNamedColors(){
	let colors = document.colors;
	colors.forEach(color => {
		if(color.name != null){
			namedColors[color.color] = color.name;
		}
	});
}
function getColorName( colorString ){
	return namedColors[colorString];	
}

function drawWarning(sample, warning, color) {
	return new ShapePath({
		name: warning,
		shapeType: ShapePath.ShapeType.Oval,
		frame: {
			x: sample.frame.x - 30,
			y: sample.frame.y + (.5 * sample.frame.height),
			width: 10,
			height: 10
		},
		style: {
			fills: [{
				color: color,
				fill: Style.FillType.Color,
			}],
			borders: []
		},
		parent: sample.parent
	})
}

function makeBG(text) {
	if (util.toHSL(text.style.textColor).l > 50) {
		util.drawRectangle({
			x: text.frame.x - 4,
			y: text.frame.y - 2,
			width: text.frame.width + 8,
			height: text.frame.height + 4
		}, '#333333FF', 'dark', text.parent);
		return true;
	}
	return false;
}

function makeStyleSample(sharedStyle, artboard, x, y) {
	var styleSample = new Text({
		text: sharedStyle.name,
		sharedStyleId: sharedStyle.id,
		style: sharedStyle.style,
		parent: artboard
	})

	styleSample.frame.x = x;
	styleSample.frame.y = y;

	var fontFamily = sharedStyle.style.fontFamily;
	var fontWeight = sharedStyle.style.fontWeight;

	var fontWeightName = getFontData(fontFamily, fontWeight).weightName;

	//Add Style Details
	var description = "";
	description += fontFamily;
	description += " " + fontWeightName + " (" + fontWeight + ")";
	description += " ∙ " + sharedStyle.style.fontSize;
	if (sharedStyle.style.lineHeight) description += ("/" + sharedStyle.style.lineHeight);
	if (sharedStyle.style.alignment!="left") description += " ∙ a:" + sharedStyle.style.alignment;
	if (sharedStyle.style.textTransform != 'none') description += " ∙ " + sharedStyle.style.textTransform;
	if (sharedStyle.style.kerning != 0) description += " ∙ k:" + sharedStyle.style.kerning;
	description += " ∙ " + sharedStyle.style.textColor.toUpperCase() + " (" + getColorName(sharedStyle.style.textColor ) + ")";

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

function getStyleJSON() {
	var textStyles = document.sharedTextStyles;
	var output = {};
	getNamedColors();
	for (var i = 0; i < textStyles.length; i++) {
		var styleObj = {};
		var s = textStyles[i];
		var name = util.camelize(s.name);
		styleObj.styleName = name;
		styleObj.styleSketchName = s.name;
		styleObj.fontFamily = s.style.fontFamily;
		styleObj.fontWeightIndex = s.style.fontWeight;
		var fontData = getFontData(s.style.fontFamily, s.style.fontWeight);
		styleObj.fontWeight = fontData.weightName + "";
		styleObj.fontSystemName = fontData.systemName + "";
		styleObj.fontSize = s.style.fontSize;
		styleObj.lineHeight = s.style.lineHeight;
		styleObj.alignment = s.style.alignment;
		styleObj.textTransform = s.style.textTransform;
		styleObj.kerning = s.style.kerning;
		styleObj.color = s.style.textColor;
		var colorName = getColorName( s.style.textColor );
		if(colorName != null) styleObj.colorName = colorName;
		output[name] = (styleObj);
	}
	console.log(JSON.stringify(output, null, 4));
	return JSON.stringify(output, null, 4);
}


// ## DO REPORT ## //

export function onAudit() {
	if (treeGroup) {
		var sms = util.collectSymbolMastersInPage(page);
		var smNames = {};
		// duplicate names
		for (var i = 0; i < sms.length; i++) {
			const s = sms[i];
			if (smNames[s.name] == null) {
				smNames[s.name] = 1;
			} else {
				smNames[s.name]++;
			}
		}
		for (const key in smNames) {
			if (smNames[key] > 1) {
				console.warn(key + " exists " + smNames[key]);
			}
		}


	} else {
		console.error("NO TREE...")
	}
}