var map;
var markers = []; // Array to keep track of markers
var currentInfoWindow = null; // Keep track of the currently opened info window
var lastActiveMarker = null; // Keep track of the last active marker

window.initMap = function () {
  console.log("Map Initialized!");

  // Initialize the map
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 59.744074, lng: 10.204456 },
    zoom: 8,
    mapId: "150b3b2ced1da77b", // Use your custom Map ID
  });

  // Get all sidebar items
  var sidebarItems = document.querySelectorAll(".sidebar-item");

  var markersLoaded = 0;
  var totalMarkers = sidebarItems.length;

  // Make sidebar items focusable
  sidebarItems.forEach(function (item) {
    item.setAttribute("tabindex", "0");
  });

  // Define your cluster icon settings
  const clusterIconSize = 50; // Same size as your markers
  const clusterIconColor = "#EFE9E1"; // Replace with your desired color

  function createClusterIcon(count, color, size) {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${
      size / 2 - 2
    }" fill="${color}" stroke="#fff" stroke-width="2" />
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="#fff" font-size="${
          size / 3
        }" font-family="Arial">${count}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  const renderer = {
    render: ({ count, position }) => {
      const iconUrl = createClusterIcon(
        count,
        clusterIconColor,
        clusterIconSize
      );
      return new google.maps.Marker({
        position,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(clusterIconSize, clusterIconSize),
          anchor: new google.maps.Point(
            clusterIconSize / 2,
            clusterIconSize / 2
          ),
        },
        zIndex: google.maps.Marker.MAX_ZINDEX + 1,
      });
    },
  };

  // Loop through sidebar items to get Place IDs and backup data
  sidebarItems.forEach(function (item, index) {
    var placeId = item.getAttribute("data-place-id");
    var bookingLink = item.querySelector("a").getAttribute("href");
    var bookingText = item.querySelector("p").innerText;
    var bookingImage = item.querySelector("img").getAttribute("src");
    var name = item.querySelector("h3").innerText;

    // Store index in data-index attribute
    item.setAttribute("data-index", index);

    // Variables to hold marker and infowindow
    var marker, infowindow;

    // Function to create marker and infowindow using provided data
    function createMarker(position, address, website, photoUrl) {
      // Create content for the info window
      var contentString =
        "<div class='marker-card'>" +
        "<h3 class='heading-style-h4'>" +
        name +
        "</h3>" +
        "<p>" +
        address +
        "</p>" +
        '<a class="button" href="' +
        website +
        '" target="_blank">Book Now</a>' +
        '<img class="image is-popup" src="' +
        photoUrl +
        '" alt="' +
        name +
        '" style="width:100%;">' +
        "</div>";

      // Create an info window
      infowindow = new google.maps.InfoWindow({
        content: contentString,
        pixelOffset: new google.maps.Size(0, 0), // Adjust the value as needed
      });

      // Add closeclick listener
      infowindow.addListener("closeclick", function () {
        // Remove the 'is-active' class from sidebar items
        $(".sidebar-item").removeClass("is-active");
        currentInfoWindow = null;
        lastActiveMarker = null; // Ensure lastActiveMarker is cleared
      });

      // Create the marker using google.maps.Marker
      marker = new google.maps.Marker({
        position: position,
        icon: {
          url: "https://cdn.prod.website-files.com/66d9a4e812ab9eb6f265f538/66e4547aa0967efabe03944f_Gnist%20marker%202.svg",
          scaledSize: new google.maps.Size(50, 50), // Adjust size as needed
        },
      });

      // Store the infowindow and index in the marker
      marker.infowindow = infowindow;
      marker.index = index;

      // Store marker in the markers array at the correct index
      markers[index] = marker;

      // Add click listener to the marker
      marker.addListener("click", function () {
        // Close the currently open info window
        if (currentInfoWindow) {
          currentInfoWindow.close();
        }

        // Set lastActiveMarker to this marker
        lastActiveMarker = marker;

        // Open the new info window
        marker.infowindow.open(map, marker);

        // Set the current info window to this one
        currentInfoWindow = marker.infowindow;

        // Highlight the corresponding sidebar item
        $(".sidebar-item").removeClass("is-active");
        $('.sidebar-item[data-index="' + marker.index + '"]').addClass(
          "is-active"
        );
      });
    }

    // Check if placeId is present
    if (placeId) {
      var service = new google.maps.places.PlacesService(map);

      // Fetch Place Details from Google to get the location and other data for the marker and info window
      service.getDetails({ placeId: placeId }, function (place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          // Use Google data if available
          var address = place.formatted_address || "";
          var website = place.website || bookingLink;

          // Get photo from Google Places
          var photos = place.photos;
          var photoUrl = "";
          if (photos && photos.length > 0) {
            photoUrl = photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
          } else {
            // Use backup image from CMS
            photoUrl = bookingImage;
          }

          var position = place.geometry.location;

          createMarker(position, address, website, photoUrl);
        } else {
          console.error("Place details request failed due to " + status);

          // Use backup data from CMS
          var latitude = parseFloat(item.getAttribute("data-latitude"));
          var longitude = parseFloat(item.getAttribute("data-longitude"));

          // Check if latitude and longitude are available
          if (!isNaN(latitude) && !isNaN(longitude)) {
            var position = { lat: latitude, lng: longitude };
            var address = ""; // No address available
            var website = bookingLink;
            var photoUrl = bookingImage;

            createMarker(position, address, website, photoUrl);
          } else {
            console.error(
              "No valid location data available for item at index " + index
            );
            // Decrement totalMarkers since this item will not have a marker
            totalMarkers--;
            return;
          }
        }

        // Increment markersLoaded
        markersLoaded++;

        // Check if all markers have been loaded
        if (markersLoaded === totalMarkers) {
          initializeMarkerClusterer();
        }
      });
    } else {
      // No placeId available, use CMS data
      var latitude = parseFloat(item.getAttribute("data-latitude"));
      var longitude = parseFloat(item.getAttribute("data-longitude"));

      // Check if latitude and longitude are available
      if (!isNaN(latitude) && !isNaN(longitude)) {
        var position = { lat: latitude, lng: longitude };
        var address = ""; // No address available
        var website = bookingLink;
        var photoUrl = bookingImage;

        createMarker(position, address, website, photoUrl);

        // Increment markersLoaded
        markersLoaded++;

        // Check if all markers have been loaded
        if (markersLoaded === totalMarkers) {
          initializeMarkerClusterer();
        }
      } else {
        console.error(
          "No valid location data available for item at index " + index
        );
        // Decrement totalMarkers since this item will not have a marker
        totalMarkers--;
      }
    }
  });

  // Function to initialize MarkerClusterer and open the first marker's info window
  function initializeMarkerClusterer() {
    // All markers have been loaded
    // Initialize marker clustering
    const markerCluster = new markerClusterer.MarkerClusterer({
      markers,
      map,
      renderer,
      gridSize: 60, // Adjust as needed
      maxZoom: 15, // Clustering stops at zoom level 15 and closer
    });

    // Find the first marker in the markers array
    var firstMarker = markers.find(function (marker) {
      return marker !== undefined;
    });

    if (firstMarker) {
      // Close any currently open info window
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }

      // Open the info window for the first marker
      firstMarker.infowindow.open(map, firstMarker);

      currentInfoWindow = firstMarker.infowindow;

      // Highlight the first sidebar item
      $(".sidebar-item").removeClass("is-active");
      $('.sidebar-item[data-index="' + firstMarker.index + '"]').addClass(
        "is-active"
      );

      // Pan to the first marker
      map.panTo(firstMarker.getPosition());
    }
  }

  // Add click event listener to sidebar items
  $(document).on("click", ".sidebar-item", function () {
    var index = $(this).data("index");
    var selectedMarker = markers[index];

    if (selectedMarker) {
      // Close the currently open info window
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }

      // Clear lastActiveMarker
      lastActiveMarker = null;

      // Open the infowindow
      selectedMarker.infowindow.open(map, selectedMarker);

      // Set the current info window to this one
      currentInfoWindow = selectedMarker.infowindow;

      // Highlight the sidebar item
      $(".sidebar-item").removeClass("is-active");
      $(this).addClass("is-active");

      // Pan to the marker's position
      map.panTo(selectedMarker.getPosition());
    }
  });

  // Add focusin event listener to sidebar items
  $(document).on("focusin", ".sidebar-item", function () {
    var index = $(this).data("index");
    var selectedMarker = markers[index];

    if (selectedMarker) {
      // Close the currently open info window
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }

      // Clear lastActiveMarker
      lastActiveMarker = null;

      // Open the infowindow
      selectedMarker.infowindow.open(map, selectedMarker);

      // Set the current info window to this one
      currentInfoWindow = selectedMarker.infowindow;

      // Highlight the sidebar item
      $(".sidebar-item").removeClass("is-active");
      $(this).addClass("is-active");

      // Pan to the marker's position
      map.panTo(selectedMarker.getPosition());
    }
  });

  // Get the 'Find Nearest Location' button
  var findNearestButton = document.getElementById("find-nearest-button");

  findNearestButton.addEventListener("click", function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          var userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          findNearestMarker(userLocation);
        },
        function (error) {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              alert("User denied the request for Geolocation.");
              break;
            case error.POSITION_UNAVAILABLE:
              alert("Location information is unavailable.");
              break;
            case error.TIMEOUT:
              alert("The request to get user location timed out.");
              break;
            case error.UNKNOWN_ERROR:
              alert("An unknown error occurred.");
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Timeout after 10 seconds
          maximumAge: 0, // Do not use cached location
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  });

  // Function to find the nearest marker
  function findNearestMarker(userLocation) {
    var minDistance = Infinity;
    var nearestMarker = null;
    var index = -1;

    markers.forEach(function (marker) {
      if (marker) {
        var markerPosition = marker.getPosition();
        var distance =
          google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation),
            markerPosition
          );
        if (distance < minDistance) {
          minDistance = distance;
          nearestMarker = marker;
          index = marker.index; // Use marker.index
        }
      }
    });

    if (nearestMarker) {
      // Close any open info window
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }

      // Set lastActiveMarker to the nearest marker
      lastActiveMarker = nearestMarker;

      // Open the info window of the nearest marker
      nearestMarker.infowindow.open(map, nearestMarker);
      currentInfoWindow = nearestMarker.infowindow;

      // Highlight the corresponding sidebar item
      $(".sidebar-item").removeClass("is-active");
      $('.sidebar-item[data-index="' + index + '"]').addClass("is-active");

      // Pan to the nearest marker
      map.panTo(nearestMarker.getPosition());
    } else {
      alert("No markers available to find the nearest location.");
    }
  }

  // Add idle event listener to the map
  map.addListener("idle", function () {
    if (currentInfoWindow && currentInfoWindow.getMap()) {
      var marker = currentInfoWindow.anchor;
      if (marker && !marker.getMap()) {
        // The marker is not on the map (probably clustered)
        currentInfoWindow.close();
        lastActiveMarker = marker;
        currentInfoWindow = null;
        // Remove the 'is-active' class from sidebar items
        $(".sidebar-item").removeClass("is-active");
      }
    } else if (lastActiveMarker && lastActiveMarker.getMap()) {
      // The last active marker is now visible again
      lastActiveMarker.infowindow.open(map, lastActiveMarker);
      currentInfoWindow = lastActiveMarker.infowindow;
      // Highlight the sidebar item
      $(".sidebar-item").removeClass("is-active");
      $('.sidebar-item[data-index="' + lastActiveMarker.index + '"]').addClass(
        "is-active"
      );
      lastActiveMarker = null;
    }
  });
};
