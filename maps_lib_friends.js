/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 12/10/2012
 * Updated: 14/10/2014 - to include filtered display for only active groups
 */
var $j = jQuery.noConflict();
// Enable the visual refresh
google.maps.visualRefresh = true;
var geometryLayer;
var MapsLib = MapsLib || {};
var MapsLib = {

  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info

  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be depricated soon
  fusionTableId:      "1AMUX4HtmM-sJEHQ2_dKY-9PBryUOGZtSz5pV6eNz",

  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/
  //*Important* this key is for demonstration purposes. please register your own.
  googleApiKey:       "AIzaSyBKr1rTgAUUIZqPAi7ZaoFWvyhIkw8EPSM",

  //name of the location column in your Fusion Table.
  //NOTE: if your location column name has spaces in it, surround it with single quotes
  //example: locationColumn:     "'my location'",
 
  locationColumn:	"Longitude",
  activeColumn:     "Active",
  geometryColumn:	"Geometry",
  groupColumn:     	"GroupTYPE",
  map_centroid:	new google.maps.LatLng(-31.9528536, 115.8573389), //center that your map defaults to
  locationScope:	"perth",      //geographical area appended to all address searches
  recordName:		"result",       //for showing number of results
  recordNamePlural:	"results",
  searchRadius:		8050,            //in meters ~ 1/2 mile
  defaultZoom:		11,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage:	"https://www.dpaw.wa.gov.au/apps/fusion/images/user-location-red.png",
  currentPinpoint:    null,

  initialize: function() {
    $j( "#result_count" ).html("");
    $j( "#friends_count" ).html("");
    $j( "#regional_count" ).html("");

    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($j("#map_canvas")[0],myOptions);

// Add Geometry Layers

// MODIFY if needed: defines background polygon1 and polygon2 layers
    MapsLib.polygon2 = new google.maps.FusionTablesLayer({
      query: {
         	select: MapsLib.geometryColumn,
		from:   MapsLib.fusionTableId,
   		where: "'GroupTYPE' = '2' AND 'Active' = 'Yes'"


      },
       map: map,
       styleId: 2,
       templateId: 2,
       suppressInfoWindows: true

    });
 google.maps.event.addListener( MapsLib.polygon2, 'click', function(e) {
          windowControl(e, infoWindow, map);
        });

    MapsLib.polygon1 = new google.maps.FusionTablesLayer({
      query: {
         	select: MapsLib.geometryColumn,
		from:   MapsLib.fusionTableId,
		where: "'GroupTYPE' = '1' AND 'Active' = 'Yes'"
      },
       map: map,
       styleId: 2,
       templateId: 2,
       suppressInfoWindows: true

    });
 google.maps.event.addListener( MapsLib.polygon1, 'click', function(e) {
          windowControl(e, infoWindow, map);
        });


var infoWindow = new google.maps.InfoWindow();
 
 // Open the info window at the clicked location
      function windowControl(e, infoWindow, map) {
        infoWindow.setOptions({
          content: e.infoWindowHtml,
          position: e.latLng,
          pixelOffset: e.pixelOffset
        });
        infoWindow.open(map);
}



    // maintains map centerpoint for responsive design
    google.maps.event.addDomListener(map, 'idle', function() {
        MapsLib.calculateCenter();
    });

    google.maps.event.addDomListener(window, 'resize', function() {
        map.setCenter(MapsLib.map_centroid);
    });

    MapsLib.searchrecords = null;





    //reset filters
    $j("#search_address").val(MapsLib.convertToPlainString($j.address.parameter('address')));
    var loadRadius = MapsLib.convertToPlainString($j.address.parameter('radius'));
    if (loadRadius != "") $j("#search_radius").val(loadRadius);
    else $j("#search_radius").val(MapsLib.searchRadius);
    $j(":checkbox").prop("checked", "checked");
    $j("#result_box").hide();
    
    //-----custom initializers-------
    
   $j("#rbPolygon2").attr("checked",true); //default setting to display layers on
   $j("#rbPolygon1").attr("checked",true); //default setting to display layers on

    //-----end of custom initializers-------

    //run the default search
    MapsLib.doSearch();
  },


  doSearch: function(location) {
    MapsLib.clearSearch();


// MODIFY if needed: shows background polygon layer depending on which checkbox is selected

 if ( $j("#cbType2").is(':checked')) {} else { $j('#rbPolygon2').removeAttr('checked');}
 if ( $j("#cbType1").is(':checked')) {} else { $j('#rbPolygon1').removeAttr('checked');}


    if ($j("#rbPolygon2").is(':checked')) {
      MapsLib.polygon2.setMap(map);
    }
      else {
      MapsLib.polygon2.setMap(null);
    }
    if ($j("#rbPolygon1").is(':checked')) {
	MapsLib.polygon1.setMap(map);
      
    }
  else {
      MapsLib.polygon1.setMap(null);
    }


 

    var address = $j("#search_address").val();
    MapsLib.searchRadius = $j("#search_radius").val();

    // https://developers.google.com/fusiontables/docs/v1/sql-reference
     var whereClause = MapsLib.locationColumn + " not equal to ''";
    
    //-----custom filters-------

	var type_column = "'GroupTYPE'";
	var searchType = type_column + " IN (-1,";
	if ( $j("#cbType2").is(':checked')) searchType += "2,";
	if ( $j("#cbType1").is(':checked')) searchType += "1,";
	whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")"; 
       whereClause += " AND " + MapsLib.activeColumn + " = 'Yes'";
       //where: "delivery = '" + delivery + "'"

    //-------end of custom filters--------

    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;

          $j.address.parameter('address', encodeURIComponent(address));
          $j.address.parameter('radius', encodeURIComponent(MapsLib.searchRadius));
          map.setCenter(MapsLib.currentPinpoint);
         // map.setZoom(14);

          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint,
            map: map,
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });
         

          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";

          MapsLib.drawSearchRadiusCircle(MapsLib.currentPinpoint);
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        }
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },

  submitSearch: function(whereClause, map, location) {

    //get using all filters
    //NOTE: styleId and templateId are recently added attributes to load custom marker styles and info windows
    //you can find your Ids inside the link generated by the 'Publish' option in Fusion Tables
    //for more details, see https://developers.google.com/fusiontables/docs/v1/using#WorkingStyles


    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styleId: 2,
      templateId: 2
    });
    MapsLib.searchrecords.setMap(map);
    MapsLib.getCount(whereClause);
    MapsLib.getList(whereClause);
  },

  clearSearch: function() {

    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $j('#search_address').val(results[1].formatted_address);
          $j('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  drawSearchRadiusCircle: function(point) {
      var circleOptions = {
        strokeColor: "#c9302c",
        strokeOpacity: 0.3,
        strokeWeight: 1,
        fillColor: "#ac2925",
        fillOpacity: 0.10,
        map: map,
        center: point,
        clickable: false,
        zIndex: -1,
        radius: parseInt(MapsLib.searchRadius)
      };
      MapsLib.searchRadiusCircle = new google.maps.Circle(circleOptions);
      
  },

  query: function(selectColumns, whereClause, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    queryStr.push(" WHERE " + whereClause);
    // sort by name column, ascending
    queryStr.push(" ORDER BY Organisation ASC");

    var sql = encodeURIComponent(queryStr.join(" "));
    $j.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined) {
      var error = json["error"]["errors"]
      console.log("Error in Fusion Table call!");
      for (var row in error) {
        console.log(" Domain: " + error[row]["domain"]);
        console.log(" Reason: " + error[row]["reason"]);
        console.log(" Message: " + error[row]["message"]);
      }
    }
  },

  getCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query(selectColumns, whereClause,"MapsLib.displaySearchCount");
  },

  displaySearchCount: function(json) {
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];

    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $j( "#result_box" ).fadeOut(function() {
        $j( "#result_count" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $j( "#result_box" ).fadeIn();
  },


/* Add list results */
getList: function(whereClause) {
  var selectColumns = "Organisation, SiteNAME, Contact, Phone, Email, Website, Facebook, About";
  MapsLib.query(selectColumns, whereClause, "MapsLib.displayList");
},

displayList: function(json) {
  MapsLib.handleError(json);
  var data = json["rows"];
  var template = "";





  var results = $j("#results_list");
  results.hide().empty(); //hide the existing list and empty it out first

  if (data == null) {
    //clear results list
    results.append("<li class='list-group-item'><span class='text-danger'>No results found</span></li>");
  }
  else {
    // added check to ensure all fields have been defined
    for (var row in data) if(data[row][0] !== undefined && data[row][1] !== undefined && data[row][2] !== undefined && data[row][3] !== undefined && data[row][4] !== undefined && data[row][5] !== undefined && data[row][6] !== undefined && data[row][7] !== undefined) {
      template = "\
        <li class='list-group-item'>\
	     <strong>" + data[row][0] + "</strong>\
            <br />\
            <strong>Site:</strong> " + data[row][1] + "\
            <button type='button' class='btn btn-default btn-xs pull-right' data-toggle='collapse' data-target='#demo" + row + "'><i class='icon-angle-down'></i></button><div id='demo" + row + "' class='collapse'>\
            <br />\
            <strong>Contact:</strong> " + data[row][2] + "\
            <br />\
 	     <strong><abbr title='Phone'>P</strong>: " + data[row][3] + "\
            <br />\
 	     <strong><abbr title='Email'>E</abbr>:</strong> <a href='mailto:" + data[row][4] + " '>" + data[row][4] + "</a>\
            <br />\
			  <strong><abbr title='Website'>W</abbr>:</strong> <a href='" + data[row][5] + " ' target='_blank' rel='external'>" + data[row][5] + "</a>\
	     <br />\
            <strong><abbr title='Facebook'>F</abbr>:</strong> <a href='" + data[row][6] + " ' target='_blank' rel='external'>" + data[row][6] + "</a>\
	     <br />\
            <strong>About:</strong> " + data[row][7] + "\
            <br />\
            </div></li>"
      results.append(template);
    }
  }
  results.fadeIn();
},

/* end list results */
  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },

  // maintains map centerpoint for responsive design
  calculateCenter: function() {
    center = map.getCenter();
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  }
  
  //-----custom functions-------
  // NOTE: if you add custom functions, make sure to append each one with a comma, except for the last one.
  // This also applies to the convertToPlainString function above


  
  //-----end of custom functions-------
}




function addOverlay() {
geometryLayer.setMap(map);
alert('Added!');
}

// [START region_removal]
function removeOverlay() {
geometryLayer.setMap(null);
alert('removed');
}
// [END region_removal]

jQuery(document).ready(function ($) {
  $('[data-toggle="offcanvas"]').click(function () {
    $('.row-offcanvas').toggleClass('active')
  });
});
