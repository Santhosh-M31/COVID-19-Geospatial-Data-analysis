var no2 = ee.ImageCollection("COPERNICUS/S5P/NRTI/L3_NO2");
var delhi = ee.FeatureCollection("users/santhoshlab31/bsa/delhiWards");

var years = ee.List.sequence(2018,2022)

var months= ee.List.sequence(1,12)

var images = ee.ImageCollection.fromImages(years.map(function(year){
  var monthImages = months.map(function(month){
    var start = ee.Date.fromYMD(year, month, 1)
    var end = start.advance(1, 'month')
    var collection = ee.ImageCollection('COPERNICUS/S5P/NRTI/L3_NO2')
                      .filter(ee.Filter.date(start, end))
                      .filter(ee.Filter.bounds(delhi))
                      .select('NO2_column_number_density');
    var image = collection.mean()
    
    return image.set({'year':year, 'month':month, 'system:time_start':start.millis(), 'count':collection.size()})
  })
  
  return monthImages
}).flatten())

var monthlyImages = images.filter(ee.Filter.eq('count', 0).not())

print(monthlyImages)

var image = monthlyImages.first()

var band_viz = {min: 0, max: 0.0002,palette: ['black', 'blue', 'purple', 'cyan', 'green', 'yellow', 'red']};
Map.addLayer(collection.clip(delhi), band_viz, 'S5P N02')

var zonalStats = monthlyImages.map(function(image){
  var stat = image.reduceRegions({
    collection:delhi,
    reducer:ee.Reducer.mode(),
    scale:1113.2,
    tileScale:2})
  var year = image.get('year')
  var month = image.get('month')
  var date = ee.Date.fromYMD(year, month, 01)
  var mill = image.get('system:time_start')
  stat = stat.map(function(feature){
    var ward = ee.String(feature.get('ward'))
    var name = ee.String(date.format('yyyy-MM-dd')).cat('-').cat(ward)
    return feature.set({'year':year, 'month':month, 'system:time_start':mill, 'name':name})
  })
  return stat
}).flatten()

Export.table.toDrive({
  collection:zonalStats,
  description:'zonalStats',
  folder:'ee-bsa',
  fileNamePrefix:'delhi_NO2_zonalStats',
  fileFormat:'CSV',
  selectors:['ward', 'zone', 'wardno', 'mode']})
