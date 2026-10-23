require "rails_helper"

RSpec.describe Geometry::Point do
  let(:a) { described_class.new(1, 2) }
  let(:b) { described_class.new(4, 6) }

  describe ".new" do
    it "stores coordinates as floats" do
      point = described_class.new(1, 2)

      expect(point.x).to eql(1.0)
      expect(point.y).to eql(2.0)
    end

    it "accepts keyword arguments" do
      expect(described_class.new(x: 1, y: 2)).to eq(a)
    end

    it "is immutable" do
      expect { a.instance_variable_set(:@x, 5.0) }.to raise_error(FrozenError)
    end
  end

  describe "equality" do
    it "treats points with the same coordinates as equal" do
      expect(described_class.new(1, 2)).to eq(a)
      expect(described_class.new(1, 2).hash).to eq(a.hash)
    end
  end

  describe "vector arithmetic" do
    it "adds" do
      expect(a + b).to eq(described_class.new(5, 8))
    end

    it "subtracts" do
      expect(b - a).to eq(described_class.new(3, 4))
    end

    it "scales by a number" do
      expect(a * 3).to eq(described_class.new(3, 6))
    end

    it "computes the dot product" do
      expect(a.dot(b)).to eq(16.0)
    end

    it "computes the 2D cross product (z component)" do
      expect(a.cross(b)).to eq(-2.0)
      expect(b.cross(a)).to eq(2.0)
    end
  end

  describe "#length" do
    it "is the distance from the origin" do
      expect(described_class.new(3, 4).length).to eq(5.0)
    end
  end

  describe "#unit" do
    it "has length 1 and the same direction" do
      unit = described_class.new(3, 4).unit

      expect(unit.x).to be_within(1e-12).of(0.6)
      expect(unit.y).to be_within(1e-12).of(0.8)
    end

    it "raises for the zero vector" do
      expect { described_class.new(0, 0).unit }.to raise_error(ZeroDivisionError)
    end
  end

  describe "#distance_to" do
    it "is the Euclidean distance" do
      expect(a.distance_to(b)).to eq(5.0)
    end

    it "is symmetric" do
      expect(b.distance_to(a)).to eq(a.distance_to(b))
    end

    it "keeps precision at real solar-system scale" do
      earth = described_class.new(149_598_262, 0)
      neptune = described_class.new(4_498_396_441, 0)

      expect(earth.distance_to(neptune)).to eq(4_348_798_179.0)
    end
  end
end
