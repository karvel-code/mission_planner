# Builders for Geometry values, shared by the specs in spec/domain.
module GeometryHelpers
  # [distance_from_sun_km, radius_km] for each body in data/data.yml, with
  # radius = diameter_km ÷ 2. Kept here so domain specs need no YAML.
  REAL_BODIES = {
    sun: [ 0, 695_508 ],
    mercury: [ 57_900_000, 2_439.5 ],
    venus: [ 108_200_000, 6_052 ],
    earth: [ 149_600_000, 6_371 ],
    mars: [ 227_900_000, 3_389.5 ],
    jupiter: [ 778_500_000, 69_910 ],
    saturn: [ 1_434_000_000, 58_230 ],
    uranus: [ 2_871_000_000, 25_362 ],
    neptune: [ 4_495_000_000, 24_622 ]
  }.freeze

  def point(x, y) = Geometry::Point.new(x, y)

  def circle(x, y, r) = Geometry::Circle.new(point(x, y), r)

  # A planet: a circle centred on the x-axis. Built directly rather than through
  # `circle`, which specs may shadow with `let(:circle)`.
  def on_axis(x, r) = Geometry::Circle.new(Geometry::Point.new(x, 0), r)

  # The real bodies as circles, keyed by name (e.g. real_bodies[:mars]), Sun first.
  def real_bodies = REAL_BODIES.transform_values { |x, r| on_axis(x, r) }
end

RSpec.configure do |config|
  config.include GeometryHelpers, file_path: %r{spec/domain/}
end
