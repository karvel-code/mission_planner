module Geometry
  module Segment
    module_function

    # True if the straight segment a → b does not enter the interior of any
    # circle. Touching a surface is allowed (tangents, departure and arrival
    # points), with a tolerance of EPSILON × radius for floating-point noise.
    def clear?(a, b, circles)
      circles.all? do |circle|
        distance_to_point(circle.centre, a, b) >= circle.radius * (1 - EPSILON)
      end
    end

    # Shortest distance from `point` to the segment a → b: project the point
    # onto the line, clamp the projection to the segment, and measure.
    def distance_to_point(point, a, b)
      direction = b - a
      length_squared = direction.dot(direction)
      return point.distance_to(a) if length_squared.zero?

      t = ((point - a).dot(direction) / length_squared).clamp(0.0, 1.0)
      point.distance_to(a + (direction * t))
    end
  end
end
