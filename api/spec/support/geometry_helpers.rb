# Builders for Geometry values, shared by the specs in spec/domain.
module GeometryHelpers
  def point(x, y) = Geometry::Point.new(x, y)

  def circle(x, y, r) = Geometry::Circle.new(point(x, y), r)

  # A planet: a circle centred on the x-axis. Built directly rather than through
  # `circle`, which specs may shadow with `let(:circle)`.
  def on_axis(x, r) = Geometry::Circle.new(Geometry::Point.new(x, 0), r)

  # The real bodies (RealData) as circles, keyed by name (e.g. real_bodies[:mars]), Sun first.
  def real_bodies = RealData::BODIES.transform_values { |b| on_axis(b[:distance_from_sun_km], b[:radius_km]) }
end

RSpec.configure do |config|
  config.include GeometryHelpers, file_path: %r{spec/domain/}
end
