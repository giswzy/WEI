# Load the necessary libraries
library(tidyverse)
library(caret)
library(xgboost)
library(vip)
library(fastshap)

# Data preparation
data_path <- "your path"
data <- read_csv(data_path, show_col_types = FALSE) %>%
  mutate(LDN = factor(LDN, levels = c(-1, 0, 1), labels = c("Degraded", "Stable", "Improved")))

# Data preprocessing
preprocess_recipe <- recipe(LDN ~ ., data) %>%
  step_YeoJohnson(all_numeric_predictors()) %>%
  step_normalize(all_numeric_predictors()) %>%
  step_smote(LDN, over_ratio = 1) %>%
  prep()

data_balanced <- bake(preprocess_recipe, new_data = NULL) %>%
  na.omit()

# Define the optimal parameters (adjustable as needed)
best_params <- data.frame(
  nrounds = 150,
  max_depth = 5,
  eta = 0.1,
  gamma = 0,
  colsample_bytree = 0.8,
  min_child_weight = 1,
  subsample = 0.8
)

# Train the model
ctrl <- trainControl(
  method = "cv",
  number = 5,
  classProbs = TRUE,
  summaryFunction = multiClassSummary,
  allowParallel = TRUE,
  verboseIter = FALSE
)

final_xgb_model <- train(
  LDN ~ .,
  data = data_balanced,
  method = "xgbTree",
  trControl = ctrl,
  tuneGrid = best_params,
  metric = "Accuracy",
  verbosity = 0
)

# Output the cross-validation results
cat("\n=== Cross-validation results ===\n")
print(final_xgb_model$results)

# Feature importance analysis
predictor_matrix <- as.matrix(select(data_balanced, -LDN))
importance_matrix <- xgb.importance(feature_names = colnames(predictor_matrix), model = final_xgb_model$finalModel)
importance_df <- as.data.frame(importance_matrix) %>%
  rename(Feature = Feature, Importance = Gain) %>%
  arrange(desc(Importance))

# Output the feature importance results
cat("\n=== Feature importance ===\n")
print(importance_df)

# Feature importance visualization
importance_plot <- importance_df %>%
  ggplot(aes(x = reorder(Feature, Importance), y = Importance)) +
  geom_bar(stat = "identity", fill = "skyblue") +
  coord_flip() +
  labs(title = "feature importance",
       x = "feature",
       y = "importance score") +
  theme_minimal(base_size = 12) +
  theme(plot.title = element_text(face = "bold", hjust = 0.5))

print(importance_plot)

# Use the vip package for feature importance visualization
vip(final_xgb_model, num_features = 10)

# Calculate SHAP values
explainer <- fastshap::explain(
  X = predictor_matrix, 
  object = final_xgb_model$finalModel, 
  pred_wrapper = function(object, newdata) predict(object, newdata, type = "prob"),
  nsim = 300 (adjustable as needed)
)

# Convert SHAP values to a data frame
shap_values_df <- as.data.frame(explainer)

# Set column names, ensuring the number of column names matches the number of columns in the data frame
colnames(shap_values_df) <- colnames(predictor_matrix)

# Add a column to identify samples
shap_values_df$Sample <- rownames(shap_values_df)

# Adjust the column order, placing the Sample column at the forefront
shap_values_df <- shap_values_df[, c(ncol(shap_values_df), 1:(ncol(shap_values_df)-1))]

# Ensure that only numeric columns are used for calculating the mean
numeric_columns <- shap_values_df[, -1]

# Check if these columns are all numeric
non_numeric_columns <- sapply(numeric_columns, function(x) !is.numeric(x))
if (any(non_numeric_columns)) {
  stop(paste("The data frame contains non-numeric columns:", names(non_numeric_columns[non_numeric_columns])))
}

# Calculate the average SHAP value for each feature
mean_shap_values <- colMeans(numeric_columns)

# Convert the average SHAP values into a data frame for sorting
mean_shap_df <- data.frame(
  Feature = names(mean_shap_values),
  Mean_SHAP_Value = mean_shap_values
)

# Sort by the absolute value of the average SHAP values
mean_shap_df$abs_value <- abs(mean_shap_df$Mean_SHAP_Value)
mean_shap_df <- mean_shap_df[order(-mean_shap_df$abs_value), ]
mean_shap_df <- mean_shap_df[, c("Feature", "Mean_SHAP_Value")]

# Output the average SHAP values sorted by magnitude
cat("\n=== The average SHAP values sorted by magnitude ===\n")
print(mean_shap_df)



