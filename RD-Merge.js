// Define the study area
var geometry = ee.FeatureCollection('your/path').geometry();
var scale = 300;

// Preprocessing function for Landsat 7
function preprocessLandsat7(geometry, startDate, endDate) {
  var cloudMask = function(image) {
    var qa = image.select('QA_PIXEL');
    var cloud = qa.bitwiseAnd(1 << 5)
                  .or(qa.bitwiseAnd(1 << 3))
                  .or(qa.bitwiseAnd(1 << 9));
    return image.updateMask(cloud.not());
  };

  var resampleAndSelect = function(image) {
    var selectedImage = image.resample('bilinear').select(['SR_B4', 'SR_B3', 'SR_B2', 'SR_B5']);
    var ndvi = calculateNDVI_L7(selectedImage);
    var ndri = calculateNDRI_L7(selectedImage);
    return selectedImage.addBands(ndvi).addBands(ndri);
  };

  var collectionId = 'LANDSAT/LE07/C02/T1_L2';
  return ee.ImageCollection(collectionId)
    .filterBounds(geometry)
    .filterDate(startDate, endDate)
    .filterMetadata('CLOUD_COVER', 'less_than', 20)
    .map(cloudMask)
    .map(resampleAndSelect);
}

// Calculate NDRI (Landsat 7)
function calculateNDRI_L7(image) {
  return image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDRI');
}

// Calculate NDVI (Landsat 7)
function calculateNDVI_L7(image) {
  return image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI');
}

// Preprocessing function for Landsat 8
function preprocessLandsat8(geometry, startDate, endDate) {
  var cloudMask = function(image) {
    var qa = image.select('QA_PIXEL');
    var cloud = qa.bitwiseAnd(1 << 5)
                  .or(qa.bitwiseAnd(1 << 3))
                  .or(qa.bitwiseAnd(1 << 9));
    return image.updateMask(cloud.not());
  };

  var resampleAndSelect = function(image) {
    var selectedImage = image.resample('bilinear').select(['SR_B5', 'SR_B4', 'SR_B3', 'SR_B6']);
    var ndvi = calculateNDVI_L8(selectedImage);
    var ndri = calculateNDRI_L8(selectedImage);
    return selectedImage.addBands(ndvi).addBands(ndri);
  };

  var collectionId = 'LANDSAT/LC08/C02/T1_L2';
  return ee.ImageCollection(collectionId)
    .filterBounds(geometry)
    .filterDate(startDate, endDate)
    .filterMetadata('CLOUD_COVER', 'less_than', 20)
    .map(cloudMask)
    .map(resampleAndSelect);
}

// Calculate NDRI (Landsat 8)
function calculateNDRI_L8(image) {
  return image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDRI');
}

// Calculate NDVI (Landsat 8)
function calculateNDVI_L8(image) {
  return image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
}

// Calculate FVC and BER
function calculateFVCandBER(image, ndviMin, ndviMax, ndriNonRock, ndriRock) {
  var ndvi = image.select('NDVI');
  var ndri = image.select('NDRI');
  
  // Calculate FVC (Normalized based on NDVI min and max)
  var fvc = ndvi.subtract(ee.Number(ndviMin)).divide(ee.Number(ndviMax).subtract(ee.Number(ndviMin))).rename('FVC');
  
  // Calculate BER (Normalized based on NDRIrock and NDRIn)
  var ber = ndri.subtract(ndriRock).divide(ndriNonRock.subtract(ndriRock)).rename('BER');
  
  // Return image with FVC and BER bands
  return image.addBands(fvc.clamp(0, 1)).addBands(ber.clamp(0, 1));
}

// Calculate slope
function calculateSlope(srtm) {
  return ee.Terrain.slope(srtm).rename('slope');
}

// Calculate 1% and 99% percentiles of NDRI
function calculateNDRIStats(image) {
  var ndriStats = image.select('NDRI').reduceRegion({
    reducer: ee.Reducer.percentile([1, 99]),
    geometry: geometry,
    scale: scale,
    maxPixels: 1e10
  });

  var ndriNonRock = ee.Number(ndriStats.get('NDRI_p1')); // 1% percentile
  var ndriRock = ee.Number(ndriStats.get('NDRI_p99')); // 99% percentile

  return {ndriNonRock: ndriNonRock, ndriRock: ndriRock};
}

// Calculate entropy-based weights for FVC, BER, and slope
function calculateEntropyWeights(image, region) {
  var bands = ['FVC', 'BER', 'standardized_slope'];
  var numBins = 10;
  
  var calcEntropy = function(image, bandName) {
    var bins = splitIntoBins(image, bandName, numBins, region);
    
    var entropies = bins.map(function(binImage) {
      binImage = ee.Image(binImage);
      var band = binImage.bandNames().get(0);
      
      var total = ee.Number(binImage.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: region,
        scale: 30,
        bestEffort: true,
        maxPixels: 1e9
      }).get(band));
      
      var probabilities = binImage.divide(total).toFloat();
      var logProbabilities = probabilities.where(probabilities.lte(0), 1).log();
      var entropy = ee.Number(probabilities.multiply(logProbabilities).reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: region,
        scale: 30,
        bestEffort: true,
        maxPixels: 1e9
      }).get(band));
      
      return ee.Image.constant(entropy.multiply(-1).divide(Math.log(10))).rename(bandName + '_entropy').toFloat();
    });
    
    var entropyImage = ee.ImageCollection(entropies).mosaic().rename(bandName + '_entropy').toFloat();
    return entropyImage;
  };

  var fvcEntropy = calcEntropy(image, 'FVC');
  var berEntropy = calcEntropy(image, 'BER');
  var slopeEntropy = calcEntropy(image, 'standardized_slope');

  var totalEntropy = fvcEntropy.add(berEntropy).add(slopeEntropy).rename('total_entropy');

  var fvcRedundancy = ee.Image.constant(1).subtract(fvcEntropy.divide(totalEntropy)).rename('FVC_redundancy').toFloat();
  var berRedundancy = ee.Image.constant(1).subtract(berEntropy.divide(totalEntropy)).rename('BER_redundancy').toFloat();
  var slopeRedundancy = ee.Image.constant(1).subtract(slopeEntropy.divide(totalEntropy)).rename('slope_redundancy').toFloat();

  var totalRedundancy = fvcRedundancy.add(berRedundancy).add(slopeRedundancy).rename('total_redundancy');

  var fvcWeight = fvcRedundancy.divide(totalRedundancy).rename('FVC_weight').toFloat();
  var berWeight = berRedundancy.divide(totalRedundancy).rename('BER_weight').toFloat();
  var slopeWeight = slopeRedundancy.divide(totalRedundancy).rename('slope_weight').toFloat();

  var weightsImage = fvcWeight.addBands(berWeight).addBands(slopeWeight);
  return weightsImage;
}

// Calculate desertification index based on FVC, BER, and slope weights
function calculateDesertificationIndex(image, fvcWeight, berWeight, slopeWeight) {
  var fvc = image.select('FVC');
  var ber = image.select('BER');
  var slope = image.select('standardized_slope');
  
  var desertificationIndex = fvc.multiply(fvcWeight)
    .add(ber.multiply(berWeight))
    .add(slope.multiply(slopeWeight))
    .rename('Desertification_Index');
  
  return desertificationIndex;
}

// Get annual mean for a given year
function getAnnualMean(year, collection, slopeImage, geometry, landsatVersion) {
  var yearlyCollection = collection
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .map(function(image) {
      var ndvi, ndri;
      if (landsatVersion === 'L7') {
        ndvi = calculateNDVI_L7(image);
        ndri = calculateNDRI_L7(image);
      } else if (landsatVersion === 'L8') {
        ndvi = calculateNDVI_L8(image);
        ndri = calculateNDRI_L8(image);
      }
      return image.addBands(ndvi).addBands(ndri).addBands(slopeImage);
    });
  
  var yearlyMean = yearlyCollection.mean();
  
  var ndriStats = calculateNDRIStats(yearlyMean);
  var ndriNonRock = ndriStats.ndriNonRock;
  var ndriRock = ndriStats.ndriRock;
  
  var ndviMin = yearlyMean.select('NDVI').reduceRegion({
    reducer: ee.Reducer.min(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9
  }).get('NDVI');
  
  var ndviMax = yearlyMean.select('NDVI').reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9
  }).get('NDVI');

  return calculateFVCandBER(yearlyMean, ndviMin, ndviMax, ndriNonRock, ndriRock);
}

// Standardize slope to be between 0 and 1
function standardizeSlope(slopeImage) {
  var slopeMin = 0;
  var slopeMax = 90;
  return slopeImage.subtract(slopeMin).divide(slopeMax - slopeMin).rename('standardized_slope');
}

// Calculate standardized slope image
var slopeImage = calculateSlope(ee.Image('USGS/SRTMGL1_003'));
var standardizedSlopeImage = standardizeSlope(slopeImage);

// Recalculate weights for 2001, 2010, 2020
var yearsForWeights = [2001, 2010, 2020];

// Calculate image and weights
var weights = yearsForWeights.map(function(year) {
  year = ee.Number(year);
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);
  var landsatCollection;
  var landsatVersion;
  
  if (year.lte(ee.Number(2014))) {
    landsatCollection = preprocessLandsat7(geometry, startDate, endDate);
    landsatVersion = 'L7';
  } else {
    landsatCollection = preprocessLandsat8(geometry, startDate, endDate);
    landsatVersion = 'L8';
  }
  
  var annualMean = getAnnualMean(year, landsatCollection, standardizedSlopeImage, geometry, landsatVersion);
  return annualMean;
});

// Combine and calculate weights
var combinedWeights = ee.ImageCollection(weights).mean();
var entropyWeights = calculateEntropyWeights(combinedWeights, geometry);

// Calculate desertification index
var desertificationIndex = calculateDesertificationIndex(combinedWeights, entropyWeights.select('FVC_weight'), entropyWeights.select('BER_weight'), entropyWeights.select('slope_weight')).clip(geometry);


