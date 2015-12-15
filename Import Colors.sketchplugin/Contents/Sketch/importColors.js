var importColors = function (context) {
		
	var doc = context.document;

	// Ask user to select a Sketch file:
	var openDialog = NSOpenPanel.openPanel();
	openDialog.setCanChooseFiles(true);
	openDialog.setAllowedFileTypes(["sketch"]);
	openDialog.setCanChooseDirectories(false);
	openDialog.setAllowsMultipleSelection(false);
	openDialog.setCanCreateDirectories(false);
	openDialog.setTitle("Select a Sketch document to copy Symbols from");

	function matchValues(a,b){
	
		if(a == b){
			return true;
		}else{
			return false;
		}
	}

	function matchColors(sourceR, sourceG, sourceB, sourceA, targetR, targetG, targetB, targetA){
		
		if(matchValues(sourceR,targetR) && matchValues(sourceG,targetG) && matchValues(sourceB,targetB) && matchValues(sourceA,targetA)){
			return true;
		}else{
			return false;
		}
	}

	if( openDialog.runModal() == NSOKButton ) {

		var sourceDoc = MSDocument.new();

		if(sourceDoc.readFromURL_ofType_error(openDialog.URL(), "com.bohemiancoding.sketch.drawing", nil)) {
			
			var matches = [];
			var addCount = 0;
			// Get source document Colors
			const sourceColorsController = sourceDoc.documentData().assets();
			const sourceColors = sourceColorsController.colors().array();
			// Get target document Colors
			const targetColorsController = doc.documentData().assets();
			const targetColors = targetColorsController.colors().array();

			const targetColorsCount = targetColors.count();
			//const targetChildren = doc.pages().valueForKeyPath("@distinctUnionOfArrays.children"); // Store current docs children to check against 

			// Only do this if the selected file contains Colors
			if (sourceColors) {
				
				// Iterate through each of the source file Colors
				for (var i = 0; i < sourceColors.count(); i++){
					var sourceRed = sourceColors.objectAtIndex(i).red();
					var sourceGreen = sourceColors.objectAtIndex(i).green();
					var sourceBlue = sourceColors.objectAtIndex(i).blue();
					var sourceAlpha = sourceColors.objectAtIndex(i).alpha();

					// If there are Colors in the target/current document...
					if(targetColorsCount > 0){
						
						// Check for matching Symbol names in the target/current document
						for (var j = 0; j < targetColorsCount; j++){
							var targetRed = targetColors.objectAtIndex(j).red();
							var targetGreen = targetColors.objectAtIndex(j).green();
							var targetBlue = targetColors.objectAtIndex(j).blue();
							var targetAlpha = targetColors.objectAtIndex(j).alpha();
							
							var match = matchColors(sourceRed, sourceGreen, sourceBlue, sourceAlpha, targetRed, targetGreen, targetBlue, targetAlpha);
							
							if(!match){
								matches[i] = 0; // This should be [i], so that it's an aggregate number mapped against the source, i.e. if any of the targets match the source, then this is false.
							}else{
								matches[i] = 1;
								break;
							}
						}
						
					}else{
						doc.documentData().assets().addAsset(sourceColors.objectAtIndex(i));
						addCount++;
					}

					// If this Color has no matches, add it and increment the count.
					if(matches[i] == 0){
						doc.documentData().assets().addAsset(sourceColors.objectAtIndex(i));
						addCount++;
					}
				}

				var matchedItems = matches.filter(function(a){ return a;}).length;
				
				// Simple check to display how many Colors added to the user
				if(addCount == 0){
					doc.showMessage("Nothing was imported. There were "+matchedItems+" Color values that matched. Boo.")
			    }else if(addCount == 1){
			    	doc.showMessage("1 Color was imported successfully. Sweet!");
			    }else if(addCount > 1){
			    	doc.showMessage(addCount+" Colors were imported successfully. Sweet!");
			    }else if(matchedItems > 0){
			    	doc.showMessage(addCount+" Colors imported. There were "+matchedItems+" Colors with the same value that were not imported.")
			    }else{
			    	doc.showMessage("No Colors were imported. Boo.");
			    }

			}else{
				doc.showMessage("Doesn't Look like there's anything to import here. Bummer :(");
			}
		}

		sourceDoc.close();
		sourceDoc = nil;
	}
}