var importSymbols = function (context) {
		
	var doc = context.document;

	// Ask user to select a Sketch file:
	var openDialog = NSOpenPanel.openPanel();
	openDialog.setCanChooseFiles(true);
	openDialog.setAllowedFileTypes(["sketch"]);
	openDialog.setCanChooseDirectories(false);
	openDialog.setAllowsMultipleSelection(false);
	openDialog.setCanCreateDirectories(false);
	openDialog.setTitle("Select a Sketch document to copy Symbols from");

	if( openDialog.runModal() == NSOKButton ) {

		var sourceDoc = MSDocument.new();

		if(sourceDoc.readFromURL_ofType_error(openDialog.URL(), "com.bohemiancoding.sketch.drawing", nil)) {
			
			var matches = [];
			var addCount = 0;
			// Get source document symbols
			var sourceSymbolsController = sourceDoc.documentData().layerSymbols();
			var sourceSymbols = sourceSymbolsController.objects().array();
			// Get target document symbols
			const targetSymbolsController = doc.documentData().layerSymbols();
			const targetSymbols = targetSymbolsController.objects().array();
			const targetSymbolsCount = targetSymbols.count();
			const targetChildren = doc.pages().valueForKeyPath("@distinctUnionOfArrays.children"); // Store current docs children to check against // later, use predicate

			// Only do this if the selected file contains Symbols
			if (sourceSymbols) {
				
				// Iterate through each of the source files Symbols
				for (var i = 0; i < sourceSymbols.count(); i++){

					// If there are Symbols in the target/current document...
					if(targetSymbolsCount > 0){
						
						// Check for matching Symbol names in the target/current document
						for (var j = 0; j < targetSymbolsCount; j++){
							
							var match = sourceSymbols[i].name() == targetSymbols[j].name();
							
							if(!match){
								matches[i] = 0;
							}else{
								matches[i] = 1;
								break;
							}
						}
						
					}else{
						doc.documentData().layerSymbols().addSymbolWithName_firstInstance(sourceSymbols[i].name(), sourceSymbols[i].newInstance());
						addCount++;
					}

					// If this Symbol has no matches, add it and increment the count.
					if(matches[i] == 0){
						doc.documentData().layerSymbols().addSymbolWithName_firstInstance(sourceSymbols[i].name(), sourceSymbols[i].newInstance());
						addCount++;
					}
				}

				var matchedItems = matches.filter(function(a){ return a;}).length;
				
				// Simple check to display how many Symbols added to the user
				if(addCount == 0){
					doc.showMessage("Nothing was imported. There were "+matchedItems+" Symbols with the same name. Bad buzz.")
			    }else if(addCount == 1){
			    	doc.showMessage("1 Symbol was imported successfully. Nice One!");
			    }else if(addCount > 1){
			    	doc.showMessage(addCount+" Symbols were imported successfully. Nice One!");
			    }else if(matchedItems > 0){
			    	doc.showMessage(addCount+" Symbols imported. There were "+matchedItems+" Symbols with the same name that were not imported.")
			    }else{
			    	doc.showMessage("No Symbols were imported. Boo.");
			    }

			}else{
				doc.showMessage("Doesn't Look like there's anything to import here. Bummer :(");
			}
		}

		sourceDoc.close();
		sourceDoc = nil;
	}
}