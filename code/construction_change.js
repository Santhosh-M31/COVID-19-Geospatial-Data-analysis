// Imports

var s2 = ee.ImageCollection("COPERNICUS/S2")
var geometry = ee.Geometry.Polygon([[[77.06087847979722, 28.571061308917685],[77.06087847979722, 28.534420921030193], [77.13031550677476, 28.534420921030193],[77.13031550677476, 28.571061308917685]]], null, false)
var change = ee.FeatureCollection("users/santhoshlab31/bsa/change2")
var nochange = ee.FeatureCollection("users/santhoshlab31/bsa/nochangeGCP")
var delhiFeature = ee.FeatureCollection("users/santhoshlab31/bsa/delhi")
var delhi = delhiFeature.union().geometry()


var rgbVis = {  min: 0.0,  max: 3000,  bands: ['B4', 'B3', 'B2']};
var bsiViz = {bands:['ndvi'], min:0, max:0.8, palette:['white', 'red']}

// Write a function for Cloud masking
function maskS2clouds(image) {
  var qa = image.select('QA60')
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0))
  return image.updateMask(mask)//.divide(10000)
      .select("B.*")
      .copyProperties(image, ["system:time_start"])
} 

var addIndices = function(image) {
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename(['ndbi']);
  var bsi = image.expression(
      '(( X + Y ) - (A + B)) /(( X + Y ) + (A + B)) ', {
        'X': image.select('B11'), //swir1
        'Y': image.select('B4'),  //red
        'A': image.select('B8'), // nir
        'B': image.select('B2'), // blue
  }).rename('bsi');
  return image.addBands(ndbi).addBands(bsi)
}

var filtered = s2
  .filter(ee.Filter.date('2019-04-01', '2019-06-01'))
  .filter(ee.Filter.bounds(delhi))
  // .map(maskS2clouds)
  .median()

filtered = addIndices(filtered)
  
var image2019 = filtered.clip(delhi)


Map.addLayer(image2019, rgbVis, '2019');
// Map.addLayer(image2019, bsiViz, 'BSI 2019');

var filtered = s2
  .filter(ee.Filter.date('2020-04-01', '2020-06-01'))
  .filter(ee.Filter.bounds(delhi))
  // .map(maskS2clouds)
  .median()

filtered = addIndices(filtered)

var image2020 = filtered.clip(delhi)

Map.addLayer(image2020, rgbVis, '2020');
// Map.addLayer(image2020, bsiViz, 'BSI 2020');

var stackedImage = image2019.addBands(image2020)

// Overlay the point on the image to get training data.
var training = stackedImage.sampleRegions({
  collection: change.merge(nochange), 
  properties: ['class'], 
  scale: 10
});

// Train a classifier.
var classifier = ee.Classifier.smileRandomForest(100).train({
  features: training,  
  classProperty: 'class', 
  inputProperties: stackedImage.bandNames()
});

// Classify the image.
var classified = stackedImage.classify(classifier);
Map.addLayer(classified.selfMask(), {min: 0, max: 1, palette: ['white', 'red']}, 'change 2020'); 

var areaImage = classified.multiply(ee.Image.pixelArea())

var area = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: delhi,
  scale: 10,
  maxPixels: 1e10,
  tileScale:12
  })

print(area, 'area 2020')

// 2021

var filtered = s2
  .filter(ee.Filter.date('2021-04-01', '2021-06-01'))
  .filter(ee.Filter.bounds(delhi))
  // .map(maskS2clouds)
  .median()

filtered = addIndices(filtered)

var image2021 = filtered.clip(delhi)

Map.addLayer(image2021, rgbVis, '2021');
// Map.addLayer(image2020, bsiViz, 'BSI 2020');

var stackedImage = image2021.addBands(image2020)

var classified = stackedImage.classify(classifier);
Map.addLayer(classified.selfMask(), {min: 0, max: 1, palette: ['white', 'yellow']}, 'change 2021'); 

var areaImage = classified.multiply(ee.Image.pixelArea())

var area = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: delhi,
  scale: 10,
  maxPixels: 1e10,
  tileScale:12
  })

print(area, 'area 2021')