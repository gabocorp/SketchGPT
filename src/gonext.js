const Document = require('sketch/dom').Document;
const UI = require('sketch/ui');
const ShapePath = require('sketch/dom').ShapePath;

const document = Document.getSelectedDocument();
var selection = document.selectedLayers.layers.slice()[0];

function centerAndSelect( layer ){
    document.selectedPage = layer.getParentPage();
    document.selectedLayers.layers =  [layer];
    document.centerOnLayer(layer.getParentArtboard());
}

export function onGoNext() {
    console.log(selection.type);
    switch (selection.type) {
        case "Text":
            //get sharedStyleId
            if( selection.sharedStyleId ){
                var sharedStyle = document.getSharedTextStyleWithID( selection.sharedStyleId );
                 //get all layers
                var layers = sharedStyle.getAllInstancesLayers();
                if(layers.length<2){
                    UI.message("No other Instances found");
                    return;
                }
                //identify index
                for( var i = 0 ; i < layers.length ; i++ ){
                    if(layers[i].id == selection.id){
                        //get next instance
                        var newIndex = (i+1)%(layers.length);
                        UI.message( sharedStyle.name + " 🔮 "+(newIndex+1)+"/"+layers.length);
                        centerAndSelect(layers[newIndex]);
                        return;
                    }
                } 
            }else{
                UI.message("No Shared Style Found");
                return;
            }
            
            break;
        case "SymbolInstance":
            //get Master Symbol
            var master = document.getSymbolMasterWithID(selection.symbolId);
            //get all instances
            var instances = master.getAllInstances();
            if(instances.length<2){
                UI.message("No other Instances found");
                return;
            }
            //identify index
            for( var i = 0 ; i < instances.length ; i++ ){
                if(instances[i].id == selection.id){
                    //get next instance
                    var newIndex = (i+1)%(instances.length);
                    UI.message( master.name + " 🔮 "+(newIndex+1)+"/"+instances.length);
                    centerAndSelect(instances[newIndex]);
                    return;
                }
            } 
            
            break;
        case "SymbolMaster":
            var instances = selection.getAllInstances();
            if(instances.length>0){
                centerAndSelect( instances[0] );
            }else{
                UI.message("No instances found in this document!");
                //ERROR
            }
            break;
        case "ShapePath":
            break;
        default:
            break; 

    }
}