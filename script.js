var rr=[], LayerMarkers, LayerPath;

var url_gist=decodeURIComponent(window.location.search.substring(1));

function UpdateMap(rr){
	LayerMarkers.clearLayers();
	rr.forEach(function(r){
		LayerMarkers.addLayer(r.point)
	})
	map.fitBounds(LayerMarkers.getBounds(),{paddingTopLeft: [jQuery('#sidebar').width(),0]});
}


jQuery(document).ready(function(){

	//Create map   
	map = new L.Map('map1', {
		crs: L.CRS.EPSG3857,
		continuousWorld: true,
		worldCopyJump: false,
	});

	// BaseLayer Swisstopo
	var swisstopo = new L.TileLayer('https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
		layer: 'ch.swisstopo.pixelkarte-farbe-pk1000.noscale',
		maxZoom: 17,
		attribution: 'Map data &copy; 2015 swisstopo',
	});

	// Initiate the map
	map.setView(L.latLng(46.57591, 7.84956), 8);

	// Add tileLayer:
	baseLayers = {
		'MapBox': L.tileLayer.provider('MapBox', {id: 'mapbox/streets-v11', accessToken:token.mapbox}).addTo(map),
		'OpenStreetMap': L.tileLayer.provider('OpenStreetMap.Mapnik'),
		'Satellite': L.tileLayer.provider('Esri.WorldImagery'),
		'OpenStreetMap' : L.tileLayer.provider('OpenStreetMap.Mapnik'),
		'Swisstopo': swisstopo
	};

	control = L.control.layers(baseLayers,null,{collapsed:true}).addTo(map);
	var sidebar = L.control.sidebar('sidebar').addTo(map);

	L.MakiMarkers.accessToken = token;

	jQuery('.Myslider').slick();
	
	LayerMarkers = L.markerClusterGroup(rr,{
		showCoverageOnHover: false,
		maxClusterRadius: 50,
	}).addTo(map);
	
	LayerPath = L.geoJSON().addTo(map);


	jQuery.getJSON(url_gist, function(data){

		data.features.forEach(function(d){
			if (d.geometry.type == 'Point'){
				var r={};
				r['marker-color']=d.properties['marker-color'];
				r['marker-size']=d.properties['marker-size'];
				r['marker-symbol']=d.properties['marker-symbol'];
				r.date=d.properties.date;
				r.specie=d.properties.specie;
				r.latin=d.properties.latin;
				r.observer=d.properties.observer;
				r.count=d.properties.count;
				r.comment=d.properties.comment;
				r.specie=d.properties.specie;
				r.img=d.properties.img;
				r.link=d.properties.link;
				r.geometry=d.geometry;
				r.place = d.properties.place;

				r.point = L.marker( [r.geometry.coordinates[1] , r.geometry.coordinates[0]] , {
					icon:L.MakiMarkers.icon({
						color: r['marker-color'],
						size: r['marker-size'],
						icon: r['marker-symbol']
					})
				})

				r.point.on('click', function(){
					jQuery('#record-date').html(r.date)
					jQuery('#record-specie').html(r.specie)
					jQuery('#record-place').html('<a href="http://www.google.com/maps/place/'+r.geometry.coordinates[0]+','+r.geometry.coordinates[1]+'" target="_blank">'+r.place+'</a>')
					jQuery('#record-author').html(r.observer)
					jQuery('#record-number').html(r.count)
					jQuery('#record-comment').html(r.comment)
					jQuery('.carousel-inner').html('');
					jQuery('.Myslider').slick('removeSlide', null, null, true);
					jQuery('.MysliderModal').html('');
					if (r.img != null){
						for (i=0;i<r.img.length;i++){
							jQuery('.Myslider').slick('slickAdd','<div class="record-img-slider" style="background-image:url('+r.img[i].replace('/xsmall','')+')" onclick="document.getElementById(\'sModal'+i+'\').style.display=\'block\'"></div>')
							jQuery('.MysliderModal').prepend('<div id="sModal'+i+'" class="modal"><div class="modal-content" style="background-image:url('+r.img[i].replace('/xsmall','')+')" onclick="document.getElementById(\'sModal'+i+'\').style.display=\'none\'" ><span class="close" >&times;</span></div></div>');
						}
					}
					jQuery('#record-link-a').prop("href",r.link)
					if (!jQuery('#li-record').hasClass('active')){
						jQuery('#li-record a')[0].click()
					}
				})

				rr.push(r);
			} else if (d.geometry.type == "LineString"){
				LayerPath.addData(d)
				LayerPath.setStyle({
					"color": "#ad8533",
					"weight": 5,
					"opacity": 0.65
				})
			}
		})




		var search = [{id:'0',specie:'All',count:'-'}], id=1;
		rr.forEach(function(r){
			var u = jQuery.grep(search, function(s){ return s.specie == r.specie; });
			if (u.length<1){
				r.id=id.toString();
				s={};
				s.id=id.toString();
				s.specie=r.specie;
				s.count=r.count.toString();
				search.push(s);
				id+=1;
			} else if (u.length==1){
				u[0].count += ' + ' +r.count.toString();
				r.id = u[0].id.toString();
			}
		});



		jQuery('#search_species').selectize({
			sortField:'specie',
			maxItems: null,
			valueField: 'id',
			labelField: 'specie',
			searchField: 'specie',
			create: false,
			options: search,
			render: {
				item: function(item, escape) {
					return '<div>' + item.specie + '</div>';
				},
				option: function(item, escape) {
					return '<div>' + item.specie + ' (<i>' + item.count + '</i>)</div>';
				}
			},
			onChange: function(items){
				if ( !items || items.indexOf('0') !== -1){
					UpdateMap(rr);
				}else{
					UpdateMap(rr.filter(function(r){ return items.indexOf(r.id) !== -1	}));
				}
			}
		})

		UpdateMap(rr)
	});

});




