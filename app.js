
var unitLibrary = [];
var cityLibrary = [];
var cityActiveUnits = [];
$(document).ready(function() {

    // Get the data from Highgrounds git repo and populate results.
    var indexURL = 'https://raw.githubusercontent.com/highgrounds' +
                    '/HighgroundsAssets/master/data/1stEdition.xml';
    var hgData = $.get(indexURL, function() {
        var hgJson = parseHighgroundsXml(hgData);
        
        unitLibrary = extractUnitData(hgJson, unitTemplate);
        cityLibrary = extractCityData(hgJson, cityTemplate);
        cityActiveUnits = unitLibrary; //initialization
        populateCities();
        populateUnits();
    });


    // Event handlers
    $('.cities').on('click', ".city", function() {
        $(this).toggleClass('button-primary');
        applyAllFilters();
    });

    $(".buttons i").on("click", function() {
        $(".search-instructions").toggle();
    });

    $(".units").on("error abort", ".unit-sprite img", function() {
        this.src="images/outline.png";
    });

    $("#search").on("keyup", applySearchFilter);


    // Templating.
    var unitTemplateScript = $("#unit-card").html();
    var unitTemplate = Handlebars.compile(unitTemplateScript);
    var cityTemplateScript = $("#city-button").html();
    var cityTemplate = Handlebars.compile(cityTemplateScript);
    Handlebars.registerHelper('toUpperCase', function(str) {
        return str.toUpperCase();
    });

});


function parseHighgroundsXml(hgData) {

    // Get the card data as XML, parse it, and convert it to friendly JSON.
    var xmlString = hgData.responseText;
    var parser = new DOMParser();
    var xml = parser.parseFromString(xmlString, "text/xml");
    return xmlToJson(xml);
}


function extractCityData(hgJson, cityTemplate) {

    // Build an array of objects from the JSON data holding all cities.
    var cities = [];
    var rawCities = hgJson.data.CITYLIST.CITY;
    // Sort cities for friendly button order.
    var cityOrder = ["Titan Ridge", "Dwila", "Sacred Woods", "The Helm",
                     "Crystal Camp", "Outfitter", "The Den", "The Grotto",
                     "Forest Village", "Shadow Pylon"];

    // Omit the first "dummy" unit.
    for (var i = 1 ; i < rawCities.length ; i++) {
        var rawCity = rawCities[i];
        var attributes = rawCity.attributes;
        var types = [];
        var gold = 0;
        var crystal = 0;
        var wood = 0;
        var recruit = 0;

        // Plug in resource production and recruit.
        for (var j = 0 ; j < rawCity.ACTION.length ; j ++) {
            var action = rawCity.ACTION[j];
            switch (action.attributes.type) {
                case "gold":
                    gold = action.attributes.value;
                    break;
                case "crystal":
                    crystal = action.attributes.value;
                    break;
                case "wood":
                    wood = action.attributes.value;
                    break;
                case "recruit":
                    recruit = action.attributes.value;
                    break;
            }
        }

        // Populate types array. Raw types can be an array or an object.
        if ($.isArray(rawCity.TYPE)) {
            for (var k = 0 ; k < rawCity.TYPE.length ; k ++) {
                var type = rawCity.TYPE[k];
                types.push(type["#text"]);
            }
        }
        else if (typeof(rawCity.TYPE === "object")) {
            types.push(rawCity.TYPE["#text"]);
        }

        var city = {
            "name": attributes.name,
            "id": attributes.id,
            "rarity": attributes.rarity,
            "groundType": attributes.groundType,
            "edition": attributes.edition,
            "types": types,
            "gold": gold,
            "crystal": crystal,
            "wood": wood,
            "recruit": recruit
        };
        
        city._domNode = $(cityTemplate(city));
        city._index = cityOrder.indexOf(city.name);
        
        cities.push(city);
    }

    cities.sort(function compareCities(a, b){
        return a._index - b._index;
    });

    return cities;
}


function extractUnitData(hgJson, unitTemplate) {

    // Build an array of objects from the JSON data holding all units.
    var rawCards = hgJson.data.CARDLIST.CARD;
    var cards = [];
    var rarities = {
        0: "Common",
        1: "Uncommon",
        2: "Rare",
        3: "Ultra Rare",
        4: "Legendary"
    };

    // Iterate over the raw unit data. Omit the first "unknown" placeholder unit.
    for (var i = 1 ; i < rawCards.length ; i++) {
        var rawCard = rawCards[i];
        var attributes = rawCard.attributes;
        var homeActions = [];
        var battleActions = [];
        var types = [];
        //var searchText = "";

        // Populate homeActions and battleActions arrays.
        for (var j = 0 ; j < rawCard.ACTION.length ; j ++) {
            var action = rawCard.ACTION[j].attributes;
            var target = action.location === "home" ? homeActions : battleActions;
            
            // Deal with weird action values like -9999 for "X" and
            // -1000 for actions like frail and dormant.
            var actionValue = action.value === "-9999" ? "X" :
                              action.value === "-1000" ? "" :
                              action.value;

            // Deal with weird action types like Windfall and "duorainer" typo.
            var actionType = action.type.indexOf("windfall") > -1 ? "windfall" :
                             action.type.indexOf("duorainer") > -1 ? "duoRainer" :
                             action.type;

            target.push({"type": actionType, "value": actionValue});
            //searchText += "!action " + actionValue + " " + actionType + " ";
        }

        // Populate types array. Raw types can be an array or an object.
        if ($.isArray(rawCard.TYPE)) {
            for (var k = 0 ; k < rawCard.TYPE.length ; k++) {
                types.push(rawCard.TYPE[k]["#text"]);
            }
        } else if (typeof(rawCard.TYPE) === "object") {
            types.push(rawCard.TYPE["#text"]);
        }
        
        var card = {
            "name": attributes.name,
            "cost": {"gold": parseInt(attributes.g, 10),
                     "crystal": parseInt(attributes.c, 10),
                     "wood": parseInt(attributes.w, 10)},
            "edition": attributes.edition,
            "id": attributes.id,
            "rarity": rarities[parseInt(attributes.rarity, 10)],
            "homeActions": homeActions,
            "battleActions": battleActions,
            "types": types
        };

        /*
        searchText += ["!name", card.name,
                      card.types.join(" "),
                      card.cost.gold ? ["!cost",
                                           card.cost.gold,
                                           "gold"].join(" ") : "",
                      card.cost.crystal ? ["!cost",
                                           card.cost.crystal,
                                           "crystal"].join(" ") : "",
                      card.cost.wood ? ["!cost",
                                           card.cost.wood,
                                           "wood"].join(" ") : "",
                      "!rarity", card.rarity,
                      "!edition", card.edition,
                      ].join(" ");
        */
        card._domNode = $(unitTemplate(card));
        
        card._searchText = card._domNode.text().trim().split(/\s+/).join(" ").toLowerCase();
        cards.push(card);
    }
    return cards;
}


function getActiveCities() {
    activeButtons = $('.button-primary');
    return cityLibrary.filter(function(city) {
        for (var i = 0 ; i < activeButtons.length ; i++) {
            if ($(activeButtons[i]).data("cityId") === city.id) {
                return true;
            }
        }
    });
}


function cityFilter() {
    //Todo: There are few enough cities that we can just have a list of units for each city.
    //We can also have a unit point to which cities it's active on.
    
    var activeCities = getActiveCities();
    
    //If no cities are on, show all units.
    if (activeCities.length == 0){
        return function() {return true;}
    }
    
    return function(unit) {

        // Always include free units.
        if (unit.cost.gold === 0 && unit.cost.crystal === 0 && unit.cost.wood === 0 ) {
            return true;
        }

        // Check whether the unit's cost matches each active city.
        for (var i = 0 ; i < activeCities.length ; i ++) {
            var city = activeCities[i];
            if ((unit.cost.gold > 0) === (city.gold > 0) &&
                     (unit.cost.crystal > 0) === (city.crystal > 0) &&
                     (unit.cost.wood > 0) === (city.wood > 0)) {
                return true;
            }
        }
        return false;
    };
}


function populateUnits() {
    // //Slower due to multiple function calls?
    // $(".cities").append(cities.map(function(elem){
        // return elem._domNode;
    // });

    var unitNodes = [];
    for (var i = 0 ; i < unitLibrary.length ; i++) {
        unitNodes.push(unitLibrary[i]._domNode);
    }
    $(".units").append(unitNodes);
}

    
function populateCities() {
    var cityNodes = new Array(cityLibrary.length); //to add all at once
    for (var j = 0 ; j < cityLibrary.length ; j++) {
        cityNodes.push(cityLibrary[j]._domNode);
    }
    $(".cities").append(cityNodes);
}


function searchFilter() {
    var parsedSearch = parseSearch($("#search").val());
    var keywords = parsedSearch.keywords,
        properties = parsedSearch.properties;
    
    function isValid(unit){
        var searchText = unit._searchText;
        
        if (searchText === undefined){
            console.log(unit);
        }
        
        //Check all properties.
        for (var propertyName in properties){
            //assume all units have the same properties
            //later: assume all property names are valid.
            if (!unit.hasOwnProperty(propertyName)) {
                delete properties[propertyName]; //delete invalid key when detected
                continue;
            }
            var propertyValue = properties[propertyName];
            var unitValue = unit[propertyName].toLowerCase();
            
            if (unitValue.search(propertyValue) == -1) {
                return false;
            }
        }
        
        //Check all keywords.
        for (var i = 0 ; i < keywords.length ; i++) {
            if (searchText.search(keywords[i]) == -1) {
                return false;
            }
        }
        
        return true; //failed to invalidate
    }
    
    return isValid;
}


function applyAllFilters(){
    
    var cityValid = cityFilter();
    
    //city partition
    var partCity = partition(unitLibrary, cityValid);
    cityActiveUnits = partCity.valid;
    
    $(partCity.invalid.map(jQueryIsBeingStupid)).hide();
    applySearchFilter();
}

function jQueryIsBeingStupid(unit){
    return unit._domNode.get(0);
}

//City filter changes less frequently than search filter
function applySearchFilter(){
    var searchValid = searchFilter();
    var partSearch = partition(cityActiveUnits, searchValid);
    
    $(partSearch.valid.map(jQueryIsBeingStupid)).show();
    $(partSearch.invalid.map(jQueryIsBeingStupid)).hide();
}

//Utility:
// Returns a pair {valid:, invalid:} of arrays
//    valid - things that satisfy the predicate.
//    invalid - things that don't.
function partition(arr, isValid) {
    var result = {
        valid: [],
        invalid: [],
    };
    
    for (var i = 0, len = arr.length; i < len; i++) {
        var item = arr[i];
        if (isValid(item)) {
            result.valid.push(item);
        } else {
            result.invalid.push(item);
        }
    }
    return result;
}

//Returns a unit validator.
// searchInput -> (unit -> boolean)
function parseSearch(searchInput){
    //var delimiter = /,\s*/;
    var delimiter = /\s+/;
    var values = searchInput.toLowerCase().trim().split(delimiter);
    var keywords = []; //words to find
    var properties = {}; //properties needed

    for (var i=0, len=values.length; i<len; i++){
        var val = values[i];
        if (val.charAt(0) == '!') { //it's a keyword
            if (i+1 == len) {
                continue; //ignore it if it's the last term
            }
            var propertyName = val.substring(1);
                //TODO: Allow synonyms like "!n Groff".
                //TODO: Validate properties and ignore invalid properties.
                //Todo: Suggest an alternative syntax like "n:Groff".
                //      (Maybe just duplicate GMail's format?)
                //Todo: Minus sign to eliminate stuff.
                //Todo: quoted strings (note: would ruin implementation and is also useless)
            if (propertyName.charAt(0) == '_') { //private property
                continue; //ignore it
            }
            //eat the propertyValue
            var propertyValue = values[i+1];
            i++;
            properties[propertyName] = propertyValue;
        } else { //just a regular keyword
            keywords.push(val);
        }
    }
    
    return {keywords:keywords, properties:properties};
}
