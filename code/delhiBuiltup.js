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


var s2 = ee.ImageCollection("COPERNICUS/S2")
var roi = ee.Geometry.Polygon([[[76.70369587151679, 29.05271142532986],[76.70369587151679, 28.184756658402584],[77.77486286370429, 28.184756658402584],[77.77486286370429, 29.05271142532986]]], null, false)

var se2 = s2.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
  .filter(ee.Filter.date("2015-07-01","2019-12-31"))
  .filter(ee.Filter.bounds(roi)) 
  .map(maskS2clouds)
  .median()
  .select('B.*')
  
var viirs = ee.Image(ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").filterDate("2015-07-01","2019-12-31").median().select('avg_rad').clip(roi))

var mu = viirs.reduceRegion({
  reducer:ee.Reducer.mean(),
  geometry:roi,
  scale:464,
  maxPixels:1e12})
  
var std = viirs.reduceRegion({
  reducer:ee.Reducer.stdDev(),
  geometry:roi,
  scale:464,
  maxPixels:1e12})

var mu = ee.Number(mu.get('avg_rad'))
var std = ee.Number(std.get('avg_rad'))

viirs = viirs.subtract(mu).divide(std) 

var fused = ee.Image(se2).addBands(viirs)

var trainingbands = fused.bandNames()

var ghsl = ee.ImageCollection('JRC/GHSL/P2016/SMOD_POP_GLOBE_V1')
                 .filter(ee.Filter.date('2015-01-01', '2015-12-31'))
                  .select('smod_code')
                  .median()
                  .gte(2)
                  .clip(roi)
Map.addLayer(ghsl)
var points = ghsl.sample({"region":roi, "scale":5000,"seed":0,'geometries':true})


var data = fused.select(trainingbands).sampleRegions({'collection':points, 'properties':['smod_code'], 'scale':1000, 'geometries':true})
                                                        
// print(data.aggregate_stats('smod_code'))    

data = data.randomColumn()

var train = data.filter(ee.Filter.lt('random',0.8))
var test = data.filter(ee.Filter.gte('random',0.8))

Map.addLayer(train, {color:'green'}, 'train')

Map.addLayer(test, {color:'red'}, 'test')

var clf = ee.Classifier.smileRandomForest(100).train({
  features: train,  
  classProperty: 'smod_code', 
  inputProperties: trainingbands
});

var testResults = test.classify(clf)

var testCM = testResults.errorMatrix('smod_code', 'classification')

print(testCM.accuracy())

var result = fused.select(trainingbands).classify(clf)

Map.addLayer(result.randomVisualizer(), {}, 'classified')


var years = ee.List.sequence(2018, 2021, 1)

var images = ee.ImageCollection.fromImages(years.map(function(year){
  var start = ee.Date.fromYMD(year, 1, 1)
  var end = start.advance(1, 'year')
  var se2 = s2.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .filter(ee.Filter.date(start, end))
                .filter(ee.Filter.bounds(roi)) 
                .map(maskS2clouds)
                .median()
                .select('B.*')
                
  var viirs = ee.Image(ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG").filterDate(start,end).median().select('avg_rad').clip(roi))

  var mu = viirs.reduceRegion({
    reducer:ee.Reducer.mean(),
    geometry:roi,
    scale:464,
    maxPixels:1e12})
    
  var std = viirs.reduceRegion({
    reducer:ee.Reducer.stdDev(),
    geometry:roi,
    scale:464,
    maxPixels:1e12})
  
  var mu = ee.Number(mu.get('avg_rad'))
  var std = ee.Number(std.get('avg_rad'))
  
  viirs = viirs.subtract(mu).divide(std) 
  
  var fused = ee.Image(se2).addBands(viirs)
  var classified  = fused.classify(clf)
  return classified.set({"year":year, 'system:time_start':start.millis()})
}))

print(images, 'images')


function computeStart (image){
  var areaImage = image.multiply(ee.Image.pixelArea())
  var area = areaImage.reduceRegion({
    reducer:ee.Reducer.sum(),
    geometry:roi,
    scale:10,
    maxPixels:1e12,
    tileScale:12
  })
  var areaAreaSqKm = ee.Number(area.get('classification')).divide(1e6).round()
  return ee.Feature(null, {'area':areaAreaSqKm, 'year':image.get('year')})
}

var allArea = ee.FeatureCollection(images.map(computeStart))

// print(allArea)

Export.table.toAsset(allArea, 'allArea', 'bsa/allArea')
