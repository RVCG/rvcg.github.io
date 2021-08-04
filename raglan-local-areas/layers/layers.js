var wms_layers = [];


        var lyr_ESRISatellite_0 = new ol.layer.Tile({
            'title': 'ESRI Satellite',
            'type': 'base',
            'opacity': 1.000000,
            
            
            source: new ol.source.XYZ({
    attributions: ' ',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            })
        });
var format_local_placenames_1 = new ol.format.GeoJSON();
var features_local_placenames_1 = format_local_placenames_1.readFeatures(json_local_placenames_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_local_placenames_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_local_placenames_1.addFeatures(features_local_placenames_1);
var lyr_local_placenames_1 = new ol.layer.Vector({
                declutter: true,
                source:jsonSource_local_placenames_1, 
                style: style_local_placenames_1,
                interactive: true,
                title: '<img src="styles/legend/local_placenames_1.png" /> local_placenames'
            });

lyr_ESRISatellite_0.setVisible(true);lyr_local_placenames_1.setVisible(true);
var layersList = [lyr_ESRISatellite_0,lyr_local_placenames_1];
lyr_local_placenames_1.set('fieldAliases', {'Name': 'Name', 'descriptio': 'descriptio', 'timestamp': 'timestamp', 'begin': 'begin', 'end': 'end', 'altitudeMo': 'altitudeMo', 'tessellate': 'tessellate', 'extrude': 'extrude', 'visibility': 'visibility', 'drawOrder': 'drawOrder', 'icon': 'icon', });
lyr_local_placenames_1.set('fieldImages', {'Name': '', 'descriptio': '', 'timestamp': '', 'begin': '', 'end': '', 'altitudeMo': '', 'tessellate': '', 'extrude': '', 'visibility': '', 'drawOrder': '', 'icon': '', });
lyr_local_placenames_1.set('fieldLabels', {'Name': 'header label', 'descriptio': 'no label', 'timestamp': 'no label', 'begin': 'no label', 'end': 'no label', 'altitudeMo': 'no label', 'tessellate': 'no label', 'extrude': 'no label', 'visibility': 'no label', 'drawOrder': 'no label', 'icon': 'no label', });
lyr_local_placenames_1.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});