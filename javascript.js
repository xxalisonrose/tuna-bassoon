// -------------------------
// MAP INITIALIZATION
// -------------------------

const defaultLocation = [-71.1167, 42.377];

// Boston + Cambridge bounds
const bounds = [
  [-71.2, 42.3], // Southwest
  [-70.95, 42.45], // Northeast
];

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: defaultLocation,
  zoom: 15,
  maxBounds: bounds,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");


// -------------------------
// USER LOCATION STATE
// -------------------------

let userMarker = null;
let userLocation = null;
let followUser = true;


// -------------------------
// CREATE USER DOT
// -------------------------

const userDot = document.createElement("div");

userDot.style.width = "18px";
userDot.style.height = "18px";
userDot.style.background = "#3366ff";
userDot.style.border = "3px solid white";
userDot.style.borderRadius = "50%";
userDot.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";


// -------------------------
// MAP LOAD
// -------------------------

map.on("load", () => {


  // -------------------------
  // MAP STYLE CLEANUP
  // -------------------------

  const hiddenLayers = [
    "poi_r1",
    "poi_r7",
    "poi_r20",
    "poi_transit",
    "highway-shield-non-us",
    "highway-shield-us-interstate",
    "road_shield_us",
    "airport",
  ];


  hiddenLayers.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        "none"
      );
    }
  });


  // Convert map to grayscale

  map.getStyle().layers.forEach((layer) => {

    if (
      layer.type === "fill" &&
      map.getPaintProperty(layer.id, "fill-color")
    ) {
      map.setPaintProperty(
        layer.id,
        "fill-color",
        "#d8d8d8"
      );
    }


    if (
      layer.type === "line" &&
      map.getPaintProperty(layer.id, "line-color")
    ) {
      map.setPaintProperty(
        layer.id,
        "line-color",
        "#999999"
      );
    }

  });


  // Hide green areas

  [
    "park",
    "park_outline",
    "landcover_wood",
    "landcover_grass",
    "landcover_wetland",
  ].forEach((layerId)=>{

    if(map.getLayer(layerId)){
      map.setLayoutProperty(
        layerId,
        "visibility",
        "none"
      );
    }

  });


  // Restore water

  [
    "water",
    "waterway_river",
    "waterway_other",
    "waterway_tunnel",
  ].forEach((layerId)=>{

    if(!map.getLayer(layerId)) return;


    if(layerId === "water"){

      map.setPaintProperty(
        layerId,
        "fill-color",
        "#9ecbff"
      );

    } else {

      map.setPaintProperty(
        layerId,
        "line-color",
        "#6fa8dc"
      );

    }

  });



  // -------------------------
  // ADD FACT MARKERS
  // -------------------------


  map.addSource("places", {

    type:"geojson",

    data:{

      type:"FeatureCollection",

      features:[


        {
          type:"Feature",

          properties:{
            title:"Massachusetts Hall",

            description:
            "<strong>Massachusetts Hall</strong><p>Built in 1718, Massachusetts Hall is Harvard's oldest building and the second-oldest academic building in the United States. During the Revolutionary War, it housed soldiers from the Continental Army. The building cost £3,500 to construct. However, the soldiers caused hundreds of pounds in damage. Harvard wrote to the Commonwealth of Massachusetts about missing items, including twenty-seven brass doorknobs and sixty door locks. Soldiers also removed wood, parts of the roof, and doors to create military supplies. In the end, the Commonwealth paid Harvard £417 to cover the damage, which is about $50,000 in today's money.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.1182833,
              42.3744389
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Holbrook Smith Ghost",

            description:
            "<strong>Holbrook Smith</strong><p>Holbrook Smith, a member of Harvard's Class of 1914, is known as one of Harvard's more playful ghosts. According to campus folklore, students would blame Holbrook Smith whenever they were caught with hidden alcohol or other forbidden items in their rooms. They claimed the ghost had brought the items into their rooms without their knowledge. Instead of being a scary legend, the story became a humorous tradition among students.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.1182833,
              42.3744389
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"John Harvard Statue",

            description:
            "<strong>John Harvard Statue</strong><p>Unveiled in 1884, the John Harvard Statue is one of Harvard's most famous landmarks. Created by sculptor Daniel Chester French, who later designed the Lincoln Memorial, the bronze statue shows John Harvard seated with a book.</p><p>The statue is known as the 'Statue of Three Lies.' It does not show John Harvard himself, since no portrait exists. John Harvard did not technically found Harvard; he was an early supporter who donated half his estate and personal library. The pedestal date says 1638, but Harvard was founded in 1636.</p><p>Visitors often rub the toe of the statue for good luck, making it shiny compared to the rest of the sculpture.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11718,
              42.37443
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Memorial Hall",

            description:
            "<strong>Memorial Hall</strong><p>Completed in 1878, Memorial Hall honors the 136 Harvard students and alumni who died fighting for the Union during the Civil War. Designed by William Robert Ware and Henry Van Brunt in the High Victorian Gothic style, it became one of Harvard's largest construction projects.</p><p>The building contains Sanders Theatre and Annenberg Hall, the freshman dining hall.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.114917,
              42.375888
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Stained Glass Windows",

            description:
            "<strong>Stained Glass Windows</strong><p>Memorial Hall contains one of the finest collections of 19th-century American stained glass. Created between 1879 and 1902, the windows highlight themes of sacrifice, education, history, and American culture. Artists include John La Farge, Louis Comfort Tiffany, and Sarah Wyman Whitman.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.114917,
              42.375888
            ]
          }

        },

        {
          type:"Feature",

          properties:{
            title:"Widener Library",

            description:
            "<strong>Widener Library</strong><p>Opened in 1915, Widener Library is Harvard's flagship library and one of the largest university libraries in the world. It was built as a memorial to Harry Elkins Widener, a Harvard alumnus and book collector who died aboard the Titanic in 1912.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11633,
              42.373973
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Blaschka Glass Flowers",

            description:
            "<strong>Blaschka Glass Flowers</strong><p>The Glass Flowers are a world-famous collection of more than 4,300 scientifically accurate glass models representing hundreds of plant species. Created by father-and-son artisans Leopold and Rudolf Blaschka between 1886 and 1936, they remain one of Harvard's most celebrated treasures.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11648,
              42.378357
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Forbes Pigment Collection",

            description:
            "<strong>Forbes Pigment Collection</strong><p>The Forbes Pigment Collection is a unique 'library of color' containing more than 2,700 pigments gathered from around the world. Originally assembled by Fogg Museum director Edward Waldo Forbes, the collection helps scientists and conservators authenticate, preserve, and better understand works of art.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.1143582,
              42.3740898
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Wadsworth House",

            description:
            "<strong>Wadsworth House</strong><p>Built in 1726, Wadsworth House is the second-oldest surviving building at Harvard. It served as the residence of Harvard presidents until 1849 and became General George Washington's first headquarters after taking command of the Continental Army in 1775.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11812,
              42.3734
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Longfellow House",

            description:
            "<strong>Longfellow House</strong><p>Built in 1759, this house served as George Washington's headquarters during the Siege of Boston from 1775 to 1776. It later became the home of poet Henry Wadsworth Longfellow, who lived and wrote here for nearly 50 years. Today it is a National Historic Site.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.12637,
              42.376989
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Warren House",

            description:
            "<strong>Warren House</strong><p>Warren House was one of Harvard Yard's colonial-era residences. It reflects the early residential character of Harvard before many modern academic buildings existed. It was also known as a stop on the Underground Railroad.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11776,
              42.37469
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Indian College",

            description:
            "<strong>Indian College</strong><p>Completed in 1656, the Indian College was established to educate Native American students. It housed the printing press that produced the 1663 Eliot Indian Bible, the first Bible printed in British North America and the first printed in a Native American language.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11754,
              42.37456
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Eliot Indian Bible",

            description:
            "<strong>Eliot Indian Bible</strong><p>Also known as the Eliot Indian Bible, this was the first Bible printed in British North America. Published in 1663, it was translated into the Massachusett language by missionary John Eliot and printed at Harvard's Indian College. It was the first complete Bible printed in a Native American language.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11858,
              42.37389
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Harvard Bixi",

            description:
            "<strong>Harvard Bixi</strong><p>The Harvard Bixi is a bronze sculpture by Canadian artist David Altmejd, installed in Harvard Yard in 2012. Inspired by mythology, transformation, and imagined creatures, it has become one of Harvard Yard's most recognizable pieces of contemporary public art.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11701,
              42.37355
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Phillips Brooks House",

            description:
            "<strong>Phillips Brooks House</strong><p>The building's namesake, Phillips Brooks, graduated from Harvard in 1855. He later became a prominent minister and, while serving at Trinity Church in Boston's Copley Square, wrote the Christmas carol 'O Little Town of Bethlehem.'</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11801,
              42.37492
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"University Hall",

            description:
            "<strong>University Hall</strong><p>This location was the site of the Rebellion of 1818, a massive food fight that ended with the expulsion of the entire sophomore class. Legend says the noise created an 'audio imprint' that could supposedly be heard around campus for generations.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.11708,
              42.37445
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"The Onion",

            description:
            "<strong>The Onion</strong><p>Created in 1965 by American sculptor Alexander Calder, The Onion is an abstract sculpture located near Harvard Yard. The work was a gift of Susan Morse Hilles and is part of Harvard's modern public art collection.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.115903,
              42.373613
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Emerson Statue",

            description:
            "<strong>Emerson Statue</strong><p>This statue honors Ralph Waldo Emerson, Harvard graduate, philosopher, and leader of the Transcendentalist movement. It was a gift from the Class of 1831 to Harvard College through Francis Boott and installed in 1906.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.115375,
              42.373829
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Appleton Chapel Plaque",

            description:
            "<strong>Appleton Chapel</strong><p>Appleton Chapel served as the center of religious life at Harvard until 1932. Its legacy continues inside Memorial Church, where daily Morning Prayer services are still held.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.115619,
              42.374835
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"John Taylor Bell",

            description:
            "<strong>John Taylor Bell</strong><p>This 7,000-pound bell was cast in 1926 by the John Taylor & Co. foundry in London. It was used to call students to classes and morning prayers. The inscription 'In memory of the voices that are hushed' honors students who died during World War I. The bell cracked in 2011 but was restored in 2017.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.116349,
              42.375011
            ]
          }

        },

        {
          type:"Feature",

          properties:{
            title:"Stone from St. Saviour's Church",

            description:
            "<strong>Stone from St. Saviour's Church</strong><p>This stone came from St. Saviour's Church in Southwark, England, where John Harvard was baptized on November 29, 1607. It was given to Harvard College by Harvard Church in Charlestown after its dissolution in 1905.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.116335,
              42.374995
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Harvard Tercentenary Stele",

            description:
            "<strong>Harvard Tercentenary Stele</strong><p>This monument commemorates the founding of Harvard College in 1636 and celebrates the importance of culture, education, and learning in the United States and China.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.116984,
              42.373517
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Richard T. Greener Plaque",

            description:
            "<strong>Richard T. Greener</strong><p>Richard Theodore Greener was an African American lawyer, diplomat, educator, and the first African American to graduate from Harvard College in 1870.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.118435,
              42.373925
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Hollis Hall Memorial Plaque",

            description:
            "<strong>Hollis Hall</strong><p>During the American Revolution, Hollis Hall was taken over by colonial soldiers and suffered damage. During a 1959 renovation, five musket balls were discovered between the floorboards. The building has also housed notable residents including Ralph Waldo Emerson, Henry David Thoreau, Edward Everett, Charles W. Eliot, and Charles Townsend Copeland.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.117785,
              42.374855
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Holworthy Hall Plaque",

            description:
            "<strong>Holworthy Hall</strong><p>Holworthy Hall was named in 1812 after Sir Matthew Holworthy, an English merchant who donated £1,000 to Harvard. At the time, it was the largest donation in the college's history.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.117556,
              42.375488
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Harvard Station Dedication",

            description:
            "<strong>Harvard Station</strong><p>This plaque commemorates the 1985 dedication of Harvard Station. The Church Street entrance and platforms opened in 1983, but the main lobby opened on May 3, 1985.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.118997,
              42.374339
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Satyr Mascaron Keystone",

            description:
            "<strong>Satyr Mascaron Keystone</strong><p>This carving depicts a laughing satyr from Greek mythology. Decorative keystones like this are placed above windows and arches throughout Harvard's historic buildings.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.117077,
              42.372957
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Third Wind",

            description:
            "<strong>Third Wind</strong><p>Created by Kim Bernard, artist in residence at Harvard Physics, this sculpture explores movement, balance, and the relationship between art and science.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.117722,
              42.376126
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Tanner Fountain",

            description:
            "<strong>Tanner Fountain</strong><p>Created in 1984, Tanner Fountain is a landscape sculpture made of 159 boulders arranged in irregular concentric rings. It functions as a misting fountain in warm weather and releases steam during winter.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.116967,
              42.375996
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Lowell House Ghost Stories",

            description:
            "<strong>Lowell House Ghost Stories</strong><p>Lowell House has several famous ghost stories. One involves poet Amy Lowell, whose portrait hangs in the House. Some staff have reported seeing her ghost or smelling cigar smoke nearby, matching her habit of smoking small hand-rolled cigars.</p><p>Another story involves Elliott Perkins, Lowell House Master from 1942 to 1963. Students have shared stories that his ghost appears during Lowell's Thursday Teas and watches over the House.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.1182,
              42.3708
            ]
          }

        },


        {
          type:"Feature",

          properties:{
            title:"Holden Chapel",

            description:
            "<strong>Holden Chapel</strong><p>Holden Chapel has one of Harvard's strangest histories. Until around 1850, Harvard Medical School students dissected cadavers inside the chapel. During a renovation in 1999, workers discovered bones beneath the building. The chapel is also connected to the famous 1849 murder of George Parkman, whose body was discovered at Harvard Medical School.</p>"
          },

          geometry:{
            type:"Point",
            coordinates:[
              -71.1169,
              42.374
            ]
          }

        },


      ]

    }

  });




  // -------------------------
  // ADD FACT MARKER LAYER
  // -------------------------

  map.addLayer({

    id:"places",

    type:"circle",

    source:"places",

    paint:{

      "circle-radius":8,

      "circle-color":"#c80096",

      "circle-stroke-width":2,

      "circle-stroke-color":"#ffffff"

    }

  });





  // -------------------------
  // POPUPS
  // -------------------------

  map.on("click","places",(e)=>{

    const coordinates =
      e.features[0].geometry.coordinates.slice();


    const description =
      e.features[0].properties.description;


    new maplibregl.Popup()

      .setLngLat(coordinates)

      .setHTML(description)

      .addTo(map);

  });




  // Cursor

  map.on("mouseenter","places",()=>{

    map.getCanvas().style.cursor="pointer";

  });


  map.on("mouseleave","places",()=>{

    map.getCanvas().style.cursor="";

  });




  // -------------------------
  // CREATE USER LOCATION DOT
  // -------------------------

  userMarker = new maplibregl.Marker({

    element:userDot

  })

  .setLngLat(defaultLocation)

  .addTo(map);


});




// -------------------------
// GPS LOCATION TRACKING
// -------------------------

if("geolocation" in navigator){

navigator.geolocation.watchPosition(

(position)=>{


const latitude =
position.coords.latitude;


const longitude =
position.coords.longitude;


userLocation=[
longitude,
latitude
];


console.log(
"GPS:",
userLocation
);



if(userMarker){

userMarker.setLngLat(
userLocation
);

}



if(followUser){

map.easeTo({

center:userLocation,

duration:1000

});

}



},



(error)=>{

console.error(
"GPS Error:",
error.message
);

},



{

enableHighAccuracy:true,

maximumAge:5000,

timeout:10000

}


);


}

else{

console.error(
"Geolocation not supported"
);

}





// -------------------------
// STOP FOLLOWING WHEN DRAGGING
// -------------------------

map.on("dragstart",()=>{

followUser=false;

});





// -------------------------
// LOCATE BUTTON
// -------------------------

class LocateControl{


onAdd(map){


this.map=map;


this.container=
document.createElement("button");


this.container.className=
"maplibregl-ctrl maplibregl-ctrl-group";


this.container.innerHTML="📍";


this.container.title=
"Center on my location";


this.container.style.fontSize=
"20px";


this.container.style.width=
"40px";


this.container.style.height=
"40px";


this.container.onclick=()=>{


if(!userLocation){

alert(
"Waiting for GPS location..."
);

return;

}


followUser=true;


this.map.flyTo({

center:userLocation,

zoom:17

});


};


return this.container;


}



onRemove(){

this.container.remove();

this.map=undefined;

}


}



map.addControl(
new LocateControl(),
"top-right"
);
