# WEI
Exploring Innovative Assessment and Driving Mechanisms for Achieving Land Degradation Neutrality in Rocky Desertification Areas: A Case Study of Yunnan–Guangxi–Guizhou, China

## Contents
- [Data Description]
- [Code Implementation]

## Data Description
The data include LDN assessment results, data sets of desertification index, and GBM analysis data, etc.

## Code Implementation
Overview
This repository contains a simplified and merged version of a Google Earth Engine (GEE) workflow that calculates the Desertification Index for a given study area using Landsat 7 and Landsat 8 imagery. The process involves multiple steps, including image preprocessing, NDVI and NDRI calculation, feature extraction (FVC and BER), and entropy-based weight calculation for the final desertification index.

Key Details:

1.Workflow Overview:

The entire process is carried out on Google Earth Engine (GEE). To optimize computational efficiency, some intermediate results are pre-computed and stored for later use. This version of the code is a merged and simplified version and is not directly executable. However, the functions provided in this script can be used as a reference for similar analyses.

2.Chunking for Resource Efficiency:

In the original implementation, the study area was divided into smaller chunks to save computational resources, as processing large areas at once can be resource-intensive. This chunking process is not reflected in the current version of the code, but it can be easily implemented depending on the specific requirements.

3.Annual Rocky Desertification Index Calculation:

The rocky desertification index is calculated for each year separately. In the code, some parameters may vary each year depending on the image quality and availability. For instance, the line .filterMetadata('CLOUD_COVER', 'less_than', 20) filters out images based on the cloud cover percentage. This threshold is set based on image quality for each year and can be adjusted according to your specific needs or the quality of the available data.
