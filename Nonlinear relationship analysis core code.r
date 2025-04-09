# Load the necessary libraries
library(nnet)

# Data preparation
data <- read.csv("your path", stringsAsFactors = FALSE)
data$LDN <- as.factor(data$LDN)

# Obtain the names of the independent variable columns
predictor_vars <- names(data)[!names(data) %in% "LDN"]

# Detect nonlinear relationship (Polynomial Regression)
results <- list()

for (var in predictor_vars) {
  # Linear model
  linear_model <- multinom(LDN ~ data[[var]], data = data, maxit = 1000)

  # Quadratic polynomial model
  quadratic_model <- multinom(LDN ~ poly(data[[var]], 2, raw = TRUE), data = data, maxit = 1000)

  # Cubic polynomial model
  cubic_model <- multinom(LDN ~ poly(data[[var]], 3, raw = TRUE), data = data, maxit = 1000)

  # Model comparison (likelihood ratio test)
  anova_linear_quad <- anova(linear_model, quadratic_model)
  anova_quad_cubic <- anova(quadratic_model, cubic_model)

  # Extract the results
  results[[var]] <- list(
    anova_linear_quad = anova_linear_quad,
    anova_quad_cubic = anova_quad_cubic
  )

  # Output the results
  cat("\n--- Results for", var, "---\n")
  cat("Linear vs Quadratic:\n")
  print(anova_linear_quad)
  cat("Quadratic vs Cubic:\n")
  print(anova_quad_cubic)
}