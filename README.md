# Exploring Innovative Assessment and Driving Mechanisms for Achieving Land Degradation Neutrality in Rocky Desertification Areas: A Case Study of Yunnan–Guangxi–Guizhou, China

## Abstract
Rocky desertification (RD), a manifestation of land degradation in humid and semi-humid zones, plays a pivotal role in pursuing the global goal of land degradation neutrality (LDN). However, the definition of desertification as outlined by the United Nations Convention to Combat Desertification is confined to arid and semi-arid territories, which may lead to neglect of RD emergence and rehabilitation within karst regions. To address this, the current study focused on the three most severely RD-affected provinces in China (Yunnan, Guangxi, and Guizhou) and developed a specialized LDN-RD assessment framework for RD areas to monitor the spatiotemporal dynamics of LDN. Furthermore, by employing a gradient boosting machine and Shapley Additive exPlanations values, this study investigated the influence of environmental factors and human endeavors on achievement of the LDN goal. Overall, the research findings indicated that: (1) from 2001‒2020, Yunnan, Guangxi, and Guizhou provinces in China achieved the LDN target, with particularly notable performances in Guizhou and Guangxi; (2) environmental factors were the key determinants in achieving the LDN goal in RD areas, with nighttime light, low temperature, and water scarcity limiting achievement of LDN in degraded regions, and; (3) the introduction of an RD index enhanced the accuracy of identifying regional land-degradation phenomena. Therefore, we recommend global promotion of this new assessment framework in RD to support implementation of the LDN initiative. In summary, the full utilization and coordination of environmental factors in RD areas are highly important for accelerating achievement of the LDN goal.

## Folders
LDN-data: Land degradation neutrality assessment results, comprising evaluations of four sub-indicators (land cover, land productivity, soil organic carbon, rocky desertification index), land use type transitions, and assessments of the UNCCD and LDN-RD indicator systems, as well as divergences between these outcomes.
MK test-data: Mann–Kendall test results for the rocky desertification index.
RD-data: Rocky desertification (RD) index dataset.
table-data: Base data for GBM analysis under the UNCCD and LDN-RD indicator systems.

## Scripts:
GBM core code.r:The main code for running the gradient boosting machine
Nonlinear relationship analysis core code.r:The main code for running the analysis nonlinear relationship
RD-Merge.js:The main code for Calculating Rocky Desertification Index

## Implementation of Code for Calculating Rocky Desertification Index

Key Details:

1.Workflow Overview:

The entire process is carried out on GEE. To optimize computational efficiency, some intermediate results are pre-computed and stored for later use. This version of the code is a merged and simplified version and is not directly executable. However, the functions provided in this script can be used as a reference for similar analyses.

2.Chunking for Resource Efficiency:

In the original implementation, the study area was divided into smaller chunks to save computational resources, as processing large areas at once can be resource-intensive. This chunking process is not reflected in the current version of the code, but it can be easily implemented depending on the specific requirements.

3.Annual Rocky Desertification Index Calculation:

The rocky desertification index is calculated for each year separately. In the code, some parameters may vary each year depending on the image quality and availability. For instance, the line .filterMetadata('CLOUD_COVER', 'less_than', 20) filters out images based on the cloud cover percentage. This threshold is set based on image quality for each year and can be adjusted according to your specific needs or the quality of the available data.
