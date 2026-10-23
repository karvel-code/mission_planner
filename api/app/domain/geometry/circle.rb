module Geometry
  # An immutable circle: a planet seen in the orbital plane. Units are km.
  Circle = Data.define(:centre, :radius) do
    def initialize(centre:, radius:)
      raise ArgumentError, "centre must be a Geometry::Point" unless centre.is_a?(Point)

      radius = Float(radius)
      raise ArgumentError, "radius must be positive (got #{radius})" unless radius.positive?

      super(centre: centre, radius: radius)
    end

    # True only for points strictly inside; points on the surface are not contained.
    # A positive tolerance shrinks the circle, so floating-point noise at the
    # surface does not count as being inside.
    def contains?(point, tolerance: 0.0)
      centre.distance_to(point) < radius - tolerance
    end

    # Angle in radians from the centre to `point`, counter-clockwise from +x, in (-π, π].
    def angle_of(point)
      offset = point - centre
      Math.atan2(offset.y, offset.x)
    end

    # The surface point at `angle` (radians, counter-clockwise from +x).
    def point_at(angle)
      centre + (Point.new(Math.cos(angle), Math.sin(angle)) * radius)
    end
  end
end
