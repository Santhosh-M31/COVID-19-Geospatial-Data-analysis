
var dnb = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
var rajivChowk = ee.Geometry.Point([77.21835704443944, 28.632320125300055])
var projectJ = ee.Geometry.Point([77.19711482992099, 28.62816920895243])
var PalmAve = ee.Geometry.Point([77.3318656720985, 28.55553288808076])
var DLFPhase1 = ee.Geometry.Point([77.09571817198427, 28.48015425666026])

var years = ee.List.sequence(2017, 2022)

var yearlyCollection = years.map(function(year){
  var start = ee.Date.fromYMD(year, 1, 1)
  var end = start.advance(1, 'year')
  var imageCollection = dnb.filter(ee.Filter.date(start, end))
  return imageCollection.median().set({'year':ee.Number(year).format('%04d'), 'system:time_start':start.millis()})
})



var yearlyDNB = ee.ImageCollection.fromImages(yearlyCollection)

var chart = ui.Chart.image.series({
  imageCollection:yearlyDNB.select('avg_rad'),
  region:rajivChowk,
  reducer:ee.Reducer.mean(),
  scale:463, 
  xProperty:'year'
}).setOptions({
      lineWidth: 1,
      pointSize: 4,
      title: 'Rajiv Chowk',
      interpolateNulls: true,
      vAxis: {title: 'Light Radiance (Avg)'},
      hAxis: {title: 'Years'}
    })

print(chart)

var chart = ui.Chart.image.series({
  imageCollection:yearlyDNB.select('avg_rad'),
  region:projectJ,
  reducer:ee.Reducer.mean(),
  scale:463,
  xProperty:'year'
}).setOptions({
      lineWidth: 1,
      pointSize: 4,
      title: 'Project J',
      interpolateNulls: true,
      vAxis: {title: 'Light Radiance (Avg)'},
      hAxis: {title: 'Years'}
    })

print(chart)

var chart = ui.Chart.image.series({
  imageCollection:yearlyDNB.select('avg_rad'),
  region:PalmAve,
  reducer:ee.Reducer.mean(),
  scale:463,
  xProperty:'year'
}).setOptions({
      lineWidth: 1,
      pointSize: 4,
      title: 'Palm Avenue',
      interpolateNulls: true,
      vAxis: {title: 'Light Radiance (Avg)'},
      hAxis: {title: 'Years'}
    })

print(chart)

var chart = ui.Chart.image.series({
  imageCollection:yearlyDNB.select('avg_rad'),
  region:DLFPhase1,
  reducer:ee.Reducer.mean(),
  scale:463,
  xProperty:'year'
}).setOptions({
      lineWidth: 1,
      pointSize: 4,
      title: 'DLF Phase 1',
      interpolateNulls: true,
      vAxis: {title: 'Light Radiance (Avg)'},
      hAxis: {title: 'Years'}
    })

print(chart)