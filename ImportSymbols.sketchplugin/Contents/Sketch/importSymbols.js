const FILE_TYPE = 'com.bohemiancoding.sketch.drawing';
const FILE_EXTENSIONS = ['sketch'];
const FILE_SELECTION_TEXT = 'Select a Sketch document to import symbols from.';
const FILE_SELECTION_ERROR = 'Could not open file. Is it a Sketch file?';
var command;

/**
 * Open a file prompt.
 * @return {NSOpenPanel}
 */
function openPrompt() {
	var panel = NSOpenPanel.openPanel();
	panel.setCanChooseFiles(true);
	panel.setAllowedFileTypes(FILE_EXTENSIONS);
	panel.setCanChooseDirectories(false);
	panel.setAllowsMultipleSelection(false);
	panel.setCanCreateDirectories(false);
	panel.setTitle(FILE_SELECTION_TEXT);
	return panel;
}

/**
 * Attempt to open a file if it is of the proper type.
 * @param {String} url
 * @return {MSDocument|nil}
 */
function tryToOpenFile(url) {
	var doc = MSDocument.new();
	if (doc.readFromURL_ofType_error(url, FILE_TYPE, nil)) return doc;
	return nil;
}

/**
 * Attempt to close a file if one is passed.
 * @param {MSDocument|nil} doc
 */
function tryToCloseFile(doc) {
	if (!doc) return;
	doc.close();
	doc = nil;
}

/**
 * Get all the symbols for a document.
 * @param {MSDocument} doc
 * @return {NSArray}
 */
function getSymbols(doc) {
	return doc.documentData().allSymbols();
}

/**
 * Get the last symbol on the page (bottom-most, right-most).
 * @param {NSArray} symbols
 * @return {MSSymbolMaster|nil}
 */
function getBottomSymbol(symbols) {
	return symbols.slice().sort(function(a, b) {
		var aRect = a.rect().origin;
		var bRect = b.rect().origin;
		// A is above B, -1. A and B are horizontally equal, A is left of B, -1; B is left of A, 1; A and B are overlapping, 0. B is above A, 1.
		return aRect.y < bRect.y ? -1 : (aRect.x < bRect.x ? -1 : (aRect.x === bRect.x ? 0 : 1));
	}).pop();
}

/**
 * Find a symbol by ID.
 * @param {NSArray} symbols
 * @param {String} id
 * @return {MSSymbolMaster|nil}
 */
function findSymbolByID(symbols, id) {

  var i = 0;
  var len = symbols.count();
  var importId;

  for (; i < len; i++) {
    importId = getLayerValue(symbols.objectAtIndex(i), 'import_id');
    if (importId && importId.isEqualToString(id)) {
      return symbols.objectAtIndex(i);
    }
  }

  return nil;
}

/**
 * Find a symbol by name.
 * @param {NSArray} symbols
 * @param {String} name
 * @return {MSSymbolMaster|nil}
 */
function findSymbolByName(symbols, name) {

	var i = 0;
	var len = symbols.count();
	var symbolName;

	for (; i < len; i++) {
		symbolName = symbols.objectAtIndex(i).name();
		if (symbolName && symbolName.isEqualToString(name)) {
			return symbols.objectAtIndex(i);
		}
	}

	return nil;
}

/**
 * Add a list of symbols to a document.
 * @param {MSDocument} doc
 * @param {NSArray} sourceSymbols
 * @param {String} replaceBy Replace by name or ID?
 */
function addSymbols(doc, sourceSymbols, replaceBy) {

	var symbols = getSymbols(doc);
	var lastSymbol = getBottomSymbol(symbols);

	var i = 0;
	var len = sourceSymbols.count();
	var addCount = 0;
	var updateCount = 0;
	var ret;

	showSymbolsPage(doc);

	for (; i < len; i++) {
		ret = addSymbol(doc, symbols, sourceSymbols.objectAtIndex(i), lastSymbol, replaceBy);
		(ret.type === 'add' ? addCount++ : updateCount++);
		lastSymbol = ret.symbol;
	}

	// Look for nested symbols within the newly created symbols
	matchNestedSymbols(getSymbols(doc));

	doc.showMessage(addCount + ' symbols added, ' + updateCount + ' updated.');
}

/**
 * Find nested symbols and replace them if they are disconnected.
 * @param  {NSArray} symbols
 */
function matchNestedSymbols(symbols) {

	var i = 0;
	var len = symbols.count();

	for (; i < len; i++) {
		matchNestedSymbol(symbols.objectAtIndex(i), symbols);
	}
}

/**
 * Find any layers for a symbol that are also symbols and re-link them if they have no master.
 * @param  {Mixed} symbol
 * @param  {NSArray} symbols
 */
function matchNestedSymbol(symbol, symbols) {
	var layers = symbol.layers();
	var i = 0;
	var len = layers.count();
	for (; i < len; i++) {
		if (layers.objectAtIndex(i).className().isEqualToString('MSSymbolInstance') && !layers.objectAtIndex(i).symbolMaster()) {
			layers.objectAtIndex(i).changeInstanceToSymbol(findSymbolByName(symbols, layers.objectAtIndex(i).name()));
		}
	}
}

/**
 * Add a symbol to a document. If a symbol with that name or ID already exists, replace it
 * and all the references to it. If it does not, place after the last symbol.
 * @param {MSDocument} doc
 * @param {NSArray} docSymbols
 * @param {MSSymbolMaster} symbol
 * @param {MSSymbolMaster|nil} lastSymbol
 * @param {String} replaceBy Replace by name or ID?
 * @return {Object}
 */
function addSymbol(doc, docSymbols, symbol, lastSymbol, replaceBy) {

  replaceBy = replaceBy || 'id';

  var symbolID = symbol.symbolID();
	var symbolName = symbol.name();
	var clonedSymbol = cloneSymbolAndPositionRelatively(symbol, lastSymbol);
	var existingSymbol = replaceBy === 'id' ? findSymbolByID(docSymbols, symbolID) : findSymbolByName(docSymbols, symbolName);
  setLayerValue(clonedSymbol, 'import_id', symbolID);
	setLayerValue(clonedSymbol, 'import_name', symbolName);

	return {
		type: existingSymbol ? 'update' : 'add',
		symbol: existingSymbol ? replaceSymbol(doc, existingSymbol, clonedSymbol) : insertSymbol(doc, clonedSymbol)
	};
}

/**
 * Clone a symbol and position it relative to another.
 * @param {MSSymbolMaster} symbol
 * @param {MSSymbolMaster} sibling
 * @return {MSSymbolMaster}
 */
function cloneSymbolAndPositionRelatively(symbol, sibling) {
	var clone = symbol.copy();
	var bRect = sibling && sibling.rect();
	var rect = clone.rect();
	var y = bRect ? bRect.origin.y + bRect.size.height + 50 : 0;
	rect.origin.x = 0;
	rect.origin.y = y;
	clone.rect = rect;
	return clone;
}

/**
 * If Symbols page exists, switch to it, otherwise create it then switch to it.
 * @param {MSDocument} doc
 */
function showSymbolsPage(doc) {
	doc.setCurrentPage(doc.documentData().symbolsPageOrCreateIfNecessary());
}

/**
 * Replace one symbol with another.
 * @param {MSDocument} doc
 * @param {MSSymbolMaster} oldSymbol
 * @param {MSSymbolMaster} newSymbol
 * @return {MSSymbolMaster}
 */
function replaceSymbol(doc, oldSymbol, newSymbol) {
	insertSymbolAtPosition(doc, newSymbol, getSymbolPosition(oldSymbol));
	updateSymbolInstances(oldSymbol, newSymbol);
	removeSymbol(oldSymbol);
	return newSymbol;
}

/**
 * Update instances of a symbol to use another as their master.
 * @param {MSSymbolMaster} oldSymbol
 * @param {MSSymbolMaster} newSymbol
 */
function updateSymbolInstances(oldSymbol, newSymbol) {
	var instances = oldSymbol.allInstances();
	var i = 0;
	var len = instances.count();
	for (; i < len; i++) {
		instances.objectAtIndex(i).changeInstanceToSymbol(newSymbol);
	}
}

/**
 * Insert a symbol at a given set of coordinates
 * @param {MSSymbolMaster} symbol
 * @param {Object} position
 */
function insertSymbolAtPosition(doc, symbol, position) {
	var rect = symbol.rect();
	rect.origin.x = position.x;
	rect.origin.y = position.y;
	symbol.rect = rect;
	insertSymbol(doc, symbol);
}

/**
 * Get the coordinates of a symbol.
 * @param {MSSymbolMaster} symbol
 * @return {Object}
 */
function getSymbolPosition(symbol) {
	var rect = symbol.rect();
	return {
		x: rect.origin.x,
		y: rect.origin.y
	};
}

/**
 * Remove a symbol from the document.
 * @param {MSSymbolMaster} symbol
 */
function removeSymbol(symbol) {
	symbol.removeFromParent();
	symbol = nil;
}

/**
 * Insert a symbol into the document.
 * @param {MSDocument} doc
 * @param {MSSymbolMaster} symbol
 * @return {MSSymbolMaster}
 */
function insertSymbol(doc, symbol) {
	doc.currentPage().addLayers([symbol]);
	return symbol;
}

/**
 * Store an arbitrary value on a layer.
 * @param {Mixed} layer
 * @param {String} name
 * @param {String} val
 */
function setLayerValue(layer, name, val) {
	return command.setValue_forKey_onLayer(val, name, layer);
}

/**
 * Get an arbitrary value from a layer.
 * @param  {Mixed} layer
 * @param  {String} name
 * @return {String}
 */
function getLayerValue(layer, name) {
	return command.valueForKey_onLayer(name, layer);
}

/**
 * Import symbols by ID.
 * @param {Object} context
 */
function importSymbolsByID(context) {

  // Prompt for a file
  var panel = openPrompt();
  if (panel.runModal() !== NSOKButton) return;
  var fileURL = panel.URL();

  command = context.command;

  // Try to open the file, get its symbols, add them to the current document, then close the file.
  var doc;
  if (doc = tryToOpenFile(fileURL)) addSymbols(context.document, getSymbols(doc));
  else context.document.showMessage(FILE_SELECTION_ERROR);
  tryToCloseFile(doc);
}

/**
 * Import symbols by name.
 * @param {Object} context
 */
function importSymbolsByName(context) {

	// Prompt for a file
	var panel = openPrompt();
	if (panel.runModal() !== NSOKButton) return;
	var fileURL = panel.URL();

	command = context.command;

	// Try to open the file, get its symbols, add them to the current document, then close the file.
	var doc;
	if (doc = tryToOpenFile(fileURL)) addSymbols(context.document, getSymbols(doc), 'name');
	else context.document.showMessage(FILE_SELECTION_ERROR);
	tryToCloseFile(doc);
}
