const Group = require('sketch/dom').Group;
const ShapePath = require('sketch/dom').ShapePath;
const Style = require('sketch/dom').Style

//// ## UTIL ##

export function calculateNewName(oldName, newPath) {
	var tokens = oldName.split("/");
	var name = tokens[tokens.length - 1];
	return newPath + name;
}

export function camelize(string) {
	return string.replace(/\W+(.)/g, function (match, chr) {
		return chr.toUpperCase();
	});
}

export function saveTextDialogue(text) {
	var filePath = savePanel("styles.json");
	if (filePath) {
		writeStringToFile(text, filePath);
		showInFinder(filePath);
	}
}

export function savePanel(defaultName) {
	var panel = NSSavePanel.savePanel();
	if (defaultName) {
		panel.setNameFieldStringValue(defaultName);
	}
	panel.setCanCreateDirectories(true);
	if (panel.runModal() == NSOKButton) {
		return panel.URL().path();
	}
};

export function showInFinder(filePath) {
	NSWorkspace.sharedWorkspace().selectFile_inFileViewerRootedAtPath(filePath, nil);
};

export function writeStringToFile(content, filePath) {
	NSString.stringWithString(content).writeToFile_atomically_encoding_error_(
		filePath, true, NSUTF8StringEncoding, nil
	);
};


export function collectSymbolMastersInPage(page) {
	var symbols = [];
	var layers = page.layers;
	for (var i = 0; i < layers.length; i++) {
		if (layers[i].type == "SymbolMaster") {
			symbols.push(layers[i]);
		}
	}
	return symbols;
}

export function findLayerNamed(name, parent) { // Finds layers with page (not inside Artboards or Symbol Masters)
	var layers = parent.layers;
	for (var i = 0; i < layers.length; i++) {
		if (layers[i].name == name) return layers[i];
	}
	return false;
}

export function sortByName(a, b) {
	return a.name.localeCompare(b.name);
}

export function sortLayersByOffsetY(a, b) {
	return (a.frame.y + a.parent.frame.y) - (b.frame.y + b.parent.frame.y);
}

export function timestamp(label) {
	var t = ((Date.now() - _time) / 1000);
	/*if(t > .1)*/
	console.warn(label + " - " + t + " sec.")
	_time = Date.now();
}

export function removeLayersNamed(name, parent) {
	var layers = parent.layers.slice();
	layers.forEach(element => {
		if (element.name == name) element.remove();
	})
}

export function getFreshPageGroup(name) {
	removePageLayersNamed(name);
	return new Group({
		name: name
	});
}

//DRAW
export function drawRectangle(frame, color, name, parent) {
	return new ShapePath({
		name: name,
		shapeType: ShapePath.ShapeType.Rectangle,
		frame: frame,
		style: {
			fills: [{
				color: color,
				fill: Style.FillType.Color,
			}],
			borders: []
		},
		parent: parent,
		locked: false
	});
}

export function toHSL(hex) {
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