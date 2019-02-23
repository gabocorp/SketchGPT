var that = this;
function __skpm_run (key, context) {
  that.context = context;

var exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/symboltree.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/symboltree.js":
/*!***************************!*\
  !*** ./src/symboltree.js ***!
  \***************************/
/*! exports provided: onSyncSymbolTree */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "onSyncSymbolTree", function() { return onSyncSymbolTree; });
console.log("+++");

var Text = __webpack_require__(/*! sketch/dom */ "sketch/dom").Text;

var Style = __webpack_require__(/*! sketch/dom */ "sketch/dom").Style;

var Document = __webpack_require__(/*! sketch/dom */ "sketch/dom").Document;

var Group = __webpack_require__(/*! sketch/dom */ "sketch/dom").Group;

var UI = __webpack_require__(/*! sketch/ui */ "sketch/ui");

var ShapePath = __webpack_require__(/*! sketch/dom */ "sketch/dom").ShapePath;

var Settings = __webpack_require__(/*! sketch/settings */ "sketch/settings");

var document = Document.getSelectedDocument();
var page = document.selectedPage; //Settings

var labelGroupName = "#LABELS";
var treeGroupName = "#TREE";
var depthMargin = 50;
var margin = 50;
var gray = '#777777';

var _time = Date.now();

var labelGroup = false;
var treeGroup = false;
var lastX = 0;
var lastY = 0;
var maxY = 0;
var labelStyle = {
  fontSize: 20,
  textColor: gray,
  alignment: "left",
  fontFamily: 'Monaco',
  fontWeight: 5
};
var labels = false;
var names = false;
var symbols = false;
treeGroup = findPageLayerNamed(treeGroupName);
labelGroup = findPageLayerNamed(labelGroupName);
symbols = collectSymbolMastersInPage(); //// #SYNC

function onSyncSymbolTree() {
  try {
    timestamp("+++ start sync +++");

    if (labelGroup) {
      //if labels exist, rename symbol masters based on labeling
      getStoredSymbolMasterNames();
      renameSymbolsByPosition();
    } //generate new labels and sort symbols


    arrangeSymbols();
    setStoredSymbolMasterNames();
  } catch (error) {
    console.error(error);
    UI.alert('SymbolTree Just Messed It Up!!!', error.message + ' > Clearing everything out and starting fresh.'); //recover from error. Remove all labels to avoid renaming mishaps ;)

    resetStoredSymbolMasterNames();
    removeTree();
    removeLabels();
  }
}

function removeTree() {
  var found = document.getLayersNamed(treeGroupName);
  found.forEach(function (element) {
    element.remove();
  });
}

function removeLabels() {
  var found = document.getLayersNamed(labelGroupName);
  found.forEach(function (element) {
    element.remove();
  });
} // DATA ##


function resetStoredSymbolMasterNames() {
  Settings.setDocumentSettingForKey(document, '_STSymbolNames', null);
}

function setStoredSymbolMasterNames() {
  if (symbols == null || symbols.length == 0) {
    console.error("NO SYMBOL MASTERS HERE!!");
    return;
  }

  names = {};
  symbols.forEach(function (symbol) {
    names[symbol.id] = symbol.name;
  });
  Settings.setDocumentSettingForKey(document, '_STSymbolNames', names);
}

function getStoredSymbolMasterNames() {
  names = Settings.documentSettingForKey(document, '_STSymbolNames');
  if (!names) names = {};
} // ARRANGE ##


function arrangeSymbols() {
  var map = newMap();
  removeLabels();
  removeTree();
  labelGroup = new Group();
  labelGroup.name = labelGroupName; //labelGroup.adjustToFit();

  labelGroup.parent = page;

  labelGroup._object.setHasClickThrough(true);

  treeGroup = new Group();
  treeGroup.name = treeGroupName; //treeGroup.adjustToFit();

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
  var tokens = layer.name.split("/");
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


function arrangeLayersByMap(name, mapLevel, depth, previousSibling, parentLabel) {
  //RECURSIVE!!
  lastX = depth * depthMargin;
  lastY = maxY + margin;
  var label = addLabel(name, name, lastX, lastY, previousSibling, parentLabel);
  lastY += depthMargin;
  maxY += depthMargin;
  var layers = mapLevel._LAYERS;

  for (var i = 0; i < layers.length; i++) {
    var lf = layers[i].frame;
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
    var p = parentLabel.frame;
    var ps = previousSibling ? previousSibling.frame : p;
    var x0 = p.x - 20;
    var y0 = ps.y + 15;
    var x1 = x - 20;
    var y1 = y + 15;
    var shapePath = ShapePath.fromSVGPath('M' + x0 + ' ' + y0 + ' ' + ' L ' + x0 + ' ' + (y1 - 10) + 'Q' + x0 + ' ' + y1 + ' ' + (x0 + 10) + ' ' + y1 + ' ' + ' L ' + x1 + ' ' + y1);
    shapePath.style = {
      borders: [{
        color: gray,
        fillType: Style.FillType.Color
      }],
      borderOptions: {
        endArrowhead: "FilledCircle"
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
  var masterList = []; //sort by Y

  masterList = symbols.concat(labels);

  page._object.setRulerBase(CGPointMake(0, 0));

  masterList.sort(sortLayersByOffsetY);
  timestamp("sort master list");
  var lastLabelDepth = 0;
  var pathStack = ['/'];
  var depth = 0;
  var path = '/';

  for (var i = 0; i < masterList.length; i++) {
    var l = masterList[i];
    var type = l.type;

    if (type == "Text") {
      //is a label
      depth = Math.round(l.frame.x / depthMargin);

      if (depth > lastLabelDepth) {
        //correct for overly deep label placement
        depth = lastLabelDepth + 1;
      }

      var token = l.text;
      token = token.charAt(token.length - 1) == "/" ? token : token + "/";
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
} //// UTIL


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

function findPageLayerNamed(name) {
  // Finds layers on the page (not inside Artboards or SymbolMasters)
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
  return a.frame.y + a.parent.frame.y - (b.frame.y + b.parent.frame.y);
}

function timestamp(label) {
  var t = (Date.now() - _time) / 1000;
  /*if(t > .1)*/

  console.warn(label + " - " + t + " sec.");
  _time = Date.now();
}

/***/ }),

/***/ "sketch/dom":
/*!*****************************!*\
  !*** external "sketch/dom" ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("sketch/dom");

/***/ }),

/***/ "sketch/settings":
/*!**********************************!*\
  !*** external "sketch/settings" ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("sketch/settings");

/***/ }),

/***/ "sketch/ui":
/*!****************************!*\
  !*** external "sketch/ui" ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("sketch/ui");

/***/ })

/******/ });
  if (key === 'default' && typeof exports === 'function') {
    exports(context);
  } else {
    exports[key](context);
  }
}
that['onSyncSymbolTree'] = __skpm_run.bind(this, 'onSyncSymbolTree');
that['onRun'] = __skpm_run.bind(this, 'default')

//# sourceMappingURL=symboltree.js.map