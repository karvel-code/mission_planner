require "rails_helper"

RSpec.describe Geometry::Circle do
  let(:centre) { Geometry::Point.new(100, 0) }
  let(:circle) { described_class.new(centre, 30) }

  describe ".new" do
    it "stores the radius as a float" do
      expect(circle.radius).to eql(30.0)
    end

    it "accepts keyword arguments" do
      expect(described_class.new(centre: centre, radius: 30)).to eq(circle)
    end

    it "rejects a non-positive radius" do
      expect { described_class.new(centre, 0) }.to raise_error(ArgumentError)
      expect { described_class.new(centre, -1) }.to raise_error(ArgumentError)
    end

    it "rejects a centre that is not a point" do
      expect { described_class.new([ 100, 0 ], 30) }.to raise_error(ArgumentError)
    end
  end

  describe "#contains?" do
    it "is true for the centre" do
      expect(circle.contains?(centre)).to be(true)
    end

    it "is true for a point strictly inside" do
      expect(circle.contains?(Geometry::Point.new(120, 10))).to be(true)
    end

    it "is false for a point on the surface" do
      expect(circle.contains?(Geometry::Point.new(130, 0))).to be(false)
      expect(circle.contains?(Geometry::Point.new(100, 30))).to be(false)
    end

    it "is false for a point outside" do
      expect(circle.contains?(Geometry::Point.new(200, 0))).to be(false)
    end

    it "ignores points within the tolerance of the surface" do
      just_inside = Geometry::Point.new(130 - 1e-9, 0)

      expect(circle.contains?(just_inside)).to be(true)
      expect(circle.contains?(just_inside, tolerance: 1e-6)).to be(false)
    end
  end

  describe "#angle_of" do
    it "measures the angle from the centre, counter-clockwise from +x" do
      expect(circle.angle_of(Geometry::Point.new(130, 0))).to be_within(1e-12).of(0.0)
      expect(circle.angle_of(Geometry::Point.new(100, 30))).to be_within(1e-12).of(Math::PI / 2)
      expect(circle.angle_of(Geometry::Point.new(70, 0))).to be_within(1e-12).of(Math::PI)
      expect(circle.angle_of(Geometry::Point.new(100, -30))).to be_within(1e-12).of(-Math::PI / 2)
    end

    it "works for points off the circle" do
      expect(circle.angle_of(Geometry::Point.new(200, 100))).to be_within(1e-12).of(Math::PI / 4)
    end
  end

  describe "#point_at" do
    it "returns the surface point at an angle" do
      point = circle.point_at(Math::PI / 2)

      expect(point.x).to be_within(1e-12).of(100.0)
      expect(point.y).to be_within(1e-12).of(30.0)
    end

    it "is the inverse of #angle_of for surface points" do
      [ -2.5, -1.0, 0.0, 0.7, 3.0 ].each do |angle|
        expect(circle.angle_of(circle.point_at(angle))).to be_within(1e-12).of(angle)
      end
    end
  end
end
