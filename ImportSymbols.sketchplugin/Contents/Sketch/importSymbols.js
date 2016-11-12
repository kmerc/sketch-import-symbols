var importSymbols = function (context) {
	var doc = context.document;
	var docData = doc.documentData();
	var selection = context.selection;
	var allPages = context.document.pages();
	var openDialog = NSOpenPanel.openPanel();
	openDialog.setCanChooseFiles(true);
	openDialog.setAllowedFileTypes(["sketch"]);
	openDialog.setCanChooseDirectories(false);
	openDialog.setAllowsMultipleSelection(false);
	openDialog.setCanCreateDirectories(false);
	openDialog.setTitle("Select a Sketch document to import Symbols from");

	if( openDialog.runModal() == NSOKButton ) {
		var sourceDoc = MSDocument.new();
		
		if(sourceDoc.readFromURL_ofType_error(openDialog.URL(), "com.bohemiancoding.sketch.drawing", nil)) {
			// Get source document symbols
			var sourceSymbols = sourceDoc.documentData().allSymbols();
			var addCount = 0;
			log('Selected Sketch doc contains '+ sourceSymbols.count() + " symbols...");

			for(var i = 0;i<sourceSymbols.count();i++) {
				var symbol = sourceSymbols.objectAtIndex(i);
				var clonedSymbol = symbol.copy();
				var rect = clonedSymbol.rect();
				var targetSymbols = doc.documentData().allSymbols();

				if(targetSymbols.length > 0){
					var lastTargetSymbol = targetSymbols[targetSymbols.count()-1];
					var lastTargetSymbolRect = lastTargetSymbol.rect();
					rect.origin.x = 0;
					rect.origin.y = lastTargetSymbolRect.origin.y + lastTargetSymbolRect.size.height + 50;
					clonedSymbol.rect = rect;
				}else{
					rect.origin.x = 0;
					rect.origin.y = rect.origin.y + rect.size.height + 50;
					clonedSymbol.rect = rect;
				}
				// If Symbols page exists, switch to it, otherwise create it then switch to it.
				doc.setCurrentPage(docData.symbolsPageOrCreateIfNecessary());
				var currentPage = context.document.currentPage();
				// Add Symbol to current/target doc
				currentPage.addLayers([clonedSymbol]);
				addCount++;
			}
			doc.showMessage(addCount+" Symbols were imported successfully. Nice One!");	
		}
		sourceDoc.close();
		sourceDoc = nil;
	}
}