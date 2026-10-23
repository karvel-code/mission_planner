require "rails_helper"

RSpec.describe Geometry::Segment do
  def point(x, y) = Geometry::Point.new(x, y)
  def circle(x, y, r) = Geometry::Circle.new(point(x, y), r)

  describe ".distance_to_point" do
    let(:a) { point(0, 0) }
    let(:b) { point(100, 0) }

    it "is the perpendicular distance when the projection falls inside the segment" do
      expect(described_class.distance_to_point(point(40, 25), a, b)).to eq(25.0)
    end

    it "is the distance to the nearest endpoint when the projection falls outside" do
      expect(described_class.distance_to_point(point(-30, 40), a, b)).to eq(50.0)
      expect(described_class.distance_to_point(point(130, 40), a, b)).to eq(50.0)
    end

    it "is zero for a point on the segment" do
      expect(described_class.distance_to_point(point(60, 0), a, b)).to eq(0.0)
    end

    it "handles a zero-length segment" do
      expect(described_class.distance_to_point(point(3, 4), a, a)).to eq(5.0)
    end
  end

  describe ".clear?" do
    let(:obstacle) { circle(50, 0, 30) }

    it "is false for a segment through a circle" do
      expect(described_class.clear?(point(0, 0), point(100, 0), [ obstacle ])).to be(false)
    end

    it "is false for a segment that only clips the edge of a circle" do
      expect(described_class.clear?(point(0, 29), point(100, 29), [ obstacle ])).to be(false)
    end

    it "is true for a segment tangent to a circle" do
      expect(described_class.clear?(point(0, 30), point(100, 30), [ obstacle ])).to be(true)
    end

    it "is true for a segment that misses a circle" do
      expect(described_class.clear?(point(0, 40), point(100, 40), [ obstacle ])).to be(true)
    end

    it "is true when the circle lies on the same line but beyond the segment" do
      expect(described_class.clear?(point(0, 0), point(15, 0), [ obstacle ])).to be(true)
    end

    it "tolerates floating-point noise within EPSILON of the surface" do
      inside_by = 30 * Geometry::EPSILON

      expect(described_class.clear?(point(0, 30 - (inside_by / 2)), point(100, 30 - (inside_by / 2)), [ obstacle ])).to be(true)
      expect(described_class.clear?(point(0, 30 - (inside_by * 2)), point(100, 30 - (inside_by * 2)), [ obstacle ])).to be(false)
    end

    context "with an endpoint on the circle's surface" do
      let(:surface) { point(80, 0) }

      it "is true when the segment leaves the surface outward" do
        expect(described_class.clear?(surface, point(150, 0), [ obstacle ])).to be(true)
        expect(described_class.clear?(surface, point(120, 60), [ obstacle ])).to be(true)
      end

      it "is false when the segment goes into the circle" do
        expect(described_class.clear?(surface, point(0, 0), [ obstacle ])).to be(false)
      end

      it "is true for a segment that arrives at the surface from outside" do
        expect(described_class.clear?(point(150, 0), surface, [ obstacle ])).to be(true)
      end

      it "is true for a tangent segment that ends at the tangent point" do
        from = point(150, 0)
        tangent_point = Geometry::Tangents.from_point(from, obstacle).first

        expect(described_class.clear?(from, tangent_point, [ obstacle ])).to be(true)
      end
    end

    it "is false if any one of several circles blocks the segment" do
      circles = [ circle(50, 100, 10), obstacle, circle(50, -100, 10) ]

      expect(described_class.clear?(point(0, 0), point(100, 0), circles)).to be(false)
    end

    it "is true when there are no circles" do
      expect(described_class.clear?(point(0, 0), point(100, 0), [])).to be(true)
    end

    context "at real solar-system scale" do
      let(:earth) { circle(149_598_262, 0, 6_371.0) }
      let(:mars) { circle(227_943_824, 0, 3_389.5) }
      let(:jupiter) { circle(778_340_821, 0, 69_911) }
      let(:earth_surface) { point(149_598_262 + 6_371.0, 0) }

      it "is blocked by Mars on the straight line from Earth to Jupiter" do
        jupiter_surface = point(778_340_821 - 69_911, 0)

        expect(described_class.clear?(earth_surface, jupiter_surface, [ earth, mars, jupiter ])).to be(false)
      end

      it "is clear along a tangent from Earth's surface to Mars" do
        tangents = Geometry::Tangents.from_point(earth_surface, mars)

        tangents.each do |t|
          expect(described_class.clear?(earth_surface, t, [ earth, mars ])).to be(true)
        end
      end
    end
  end
end
