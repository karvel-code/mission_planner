module Geometry
  # An immutable 2D point, also used as a vector. Coordinates are in km.
  Point = Data.define(:x, :y) do
    def initialize(x:, y:)
      super(x: Float(x), y: Float(y))
    end

    def +(other) = Point.new(x + other.x, y + other.y)
    def -(other) = Point.new(x - other.x, y - other.y)
    def *(scalar) = Point.new(x * scalar, y * scalar)

    def dot(other) = (x * other.x) + (y * other.y)

    # Z component of the 3D cross product: positive when `other` is
    # counter-clockwise from self, negative when clockwise, zero when parallel.
    def cross(other) = (x * other.y) - (y * other.x)

    def length = Math.hypot(x, y)

    def unit
      len = length
      raise ZeroDivisionError, "cannot normalise the zero vector" if len.zero?

      Point.new(x / len, y / len)
    end

    def distance_to(other) = (other - self).length
  end
end
