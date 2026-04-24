---
name: jupyter-live-kernel
description: "Live Jupyter kernel access via hamelnb — execute code, get results."
version: 1.0.0
metadata:
  tekton:
    tags: ["jupyter", "notebook", "kernel", "data-science"]
    category: data-science
    confidence: 0.4
---

# Jupyter Live Kernel

## When to Use
- Interactive data analysis
- Running Python code in a notebook context
- Exploratory data science

## Procedure
1. Start Jupyter kernel
2. Use hamelnb for programmatic access
3. Execute cells and capture output
4. Visualize results with matplotlib/plotly
5. Save notebooks for reproducibility

## Pitfalls
- Kernel state persists between cells
- Long-running cells may timeout
- Memory leaks in long sessions

## Verification
- Code execution returns expected results
- Visualizations render correctly
- Notebook saves and reopens cleanly
