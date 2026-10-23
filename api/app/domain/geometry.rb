# Pure 2D geometry for trajectory planning. No ActiveRecord, HTTP, or YAML.
module Geometry
  # Relative tolerance (PLAN.md section 5). Multiply by the scale in use,
  # usually a radius, to get an absolute tolerance in km.
  EPSILON = 1e-6
end
