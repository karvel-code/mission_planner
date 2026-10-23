require "rails_helper"

RSpec.describe Geometry::Tangents do
  def point(x, y) = Geometry::Point.new(x, y)

  describe ".from_point" do
    let(:circle) { Geometry::Circle.new(point(100, 0), 30) }

    context "when the point is outside the circle" do
      let(:outside) { point(0, 0) }
      let(:tangents) { described_class.from_point(outside, circle) }

      it "returns two tangent points" do
        expect(tangents.size).to eq(2)
      end

      it "places both tangent points on the circle" do
        tangents.each do |t|
          expect(circle.centre.distance_to(t)).to be_within(1e-9).of(30.0)
        end
      end

      it "has tangent length sqrt(d² - r²)" do
        expected = Math.sqrt((100**2) - (30**2))

        tangents.each do |t|
          expect(outside.distance_to(t)).to be_within(1e-9).of(expected)
        end
      end

      it "makes each tangent line perpendicular to the radius" do
        tangents.each do |t|
          expect((t - circle.centre).dot(t - outside)).to be_within(1e-9).of(0.0)
        end
      end

      it "returns the counter-clockwise tangent first, then the clockwise one (around the centre)" do
        ccw, cw = tangents
        to_point = outside - circle.centre

        expect(to_point.cross(ccw - circle.centre)).to be > 0
        expect(to_point.cross(cw - circle.centre)).to be < 0
      end

      it "keeps that order wherever the point is" do
        [ point(200, 0), point(100, 90), point(40, -70) ].each do |p|
          ccw, cw = described_class.from_point(p, circle)
          to_point = p - circle.centre

          expect(to_point.cross(ccw - circle.centre)).to be > 0
          expect(to_point.cross(cw - circle.centre)).to be < 0
        end
      end

      it "is symmetric about the line through the point and the centre" do
        upper, lower = tangents

        expect(upper.x).to be_within(1e-9).of(lower.x)
        expect(upper.y).to be_within(1e-9).of(-lower.y)
      end
    end

    it "returns no tangents for a point on the circle" do
      expect(described_class.from_point(point(130, 0), circle)).to eq([])
      expect(described_class.from_point(circle.point_at(1.234), circle)).to eq([])
    end

    it "treats a point within EPSILON of the surface as on the circle" do
      nearly_on = point(130 + (30 * Geometry::EPSILON / 2), 0)

      expect(described_class.from_point(nearly_on, circle)).to eq([])
    end

    it "returns no tangents for a point inside the circle" do
      expect(described_class.from_point(point(110, 5), circle)).to eq([])
      expect(described_class.from_point(circle.centre, circle)).to eq([])
    end

    it "keeps precision at real solar-system scale" do
      earth_surface = point(149_598_262 + 6_371.0, 0)
      jupiter = Geometry::Circle.new(point(778_340_821, 0), 69_911)
      d = earth_surface.distance_to(jupiter.centre)

      tangents = described_class.from_point(earth_surface, jupiter)

      expect(tangents.size).to eq(2)
      tangents.each do |t|
        expect(jupiter.centre.distance_to(t)).to be_within(1e-6).of(69_911)
        expect(earth_surface.distance_to(t)).to be_within(1e-3).of(Math.sqrt((d**2) - (69_911**2)))
      end
    end
  end

  describe ".common" do
    def circle(x, y, r) = Geometry::Circle.new(point(x, y), r)

    # Signed side of `c` relative to the line through a → b: > 0 left, < 0 right.
    def side(a, b, c) = (b - a).cross(c - a)

    def expect_tangent_to_both(pairs, circle_a, circle_b, tol: 1e-9)
      pairs.each do |a, b|
        expect(circle_a.centre.distance_to(a)).to be_within(tol).of(circle_a.radius)
        expect(circle_b.centre.distance_to(b)).to be_within(tol).of(circle_b.radius)

        line = (b - a).unit
        expect((a - circle_a.centre).dot(line)).to be_within(tol).of(0.0)
        expect((b - circle_b.centre).dot(line)).to be_within(tol).of(0.0)
      end
    end

    context "with two separate circles" do
      let(:a) { circle(0, 0, 30) }
      let(:b) { circle(100, 0, 10) }
      let(:pairs) { described_class.common(a, b) }
      let(:outer) { pairs.first(2) }
      let(:inner) { pairs.last(2) }

      it "returns four tangent pairs" do
        expect(pairs.size).to eq(4)
      end

      it "places each pair on its circle, with the line perpendicular to both radii" do
        expect_tangent_to_both(pairs, a, b)
      end

      it "returns outer tangents first: both centres on the same side" do
        outer.each do |ta, tb|
          expect(side(ta, tb, a.centre) * side(ta, tb, b.centre)).to be > 0
        end
      end

      it "returns inner tangents last: the centres on opposite sides" do
        inner.each do |ta, tb|
          expect(side(ta, tb, a.centre) * side(ta, tb, b.centre)).to be < 0
        end
      end

      it "has outer tangent length sqrt(d² - (ra - rb)²)" do
        outer.each { |ta, tb| expect(ta.distance_to(tb)).to be_within(1e-9).of(Math.sqrt((100**2) - (20**2))) }
      end

      it "has inner tangent length sqrt(d² - (ra + rb)²)" do
        inner.each { |ta, tb| expect(ta.distance_to(tb)).to be_within(1e-9).of(Math.sqrt((100**2) - (40**2))) }
      end

      it "returns one tangent above and one below the axis of each kind" do
        [ outer, inner ].each do |kind|
          expect(kind.map { |ta, _| ta.y.positive? }).to contain_exactly(true, false)
        end
      end
    end

    it "makes equal-radius outer tangents horizontal" do
      a = circle(0, 0, 30)
      b = circle(100, 0, 30)

      described_class.common(a, b).first(2).each do |ta, tb|
        expect(ta.y).to be_within(1e-9).of(tb.y)
        expect(ta.y.abs).to be_within(1e-9).of(30.0)
      end
    end

    it "does not depend on the order of the circles, apart from swapping pair members" do
      a = circle(0, 0, 30)
      b = circle(100, 20, 10)

      forward = described_class.common(a, b)
      backward = described_class.common(b, a).map(&:reverse)

      expect(backward.size).to eq(forward.size)
      backward.each do |ta, tb|
        match = forward.find { |fa, fb| fa.distance_to(ta) < 1e-9 && fb.distance_to(tb) < 1e-9 }
        expect(match).not_to be_nil
      end
    end

    it "returns only outer tangents for circles that touch from outside" do
      a = circle(0, 0, 30)
      b = circle(40, 0, 10)
      pairs = described_class.common(a, b)

      expect(pairs.size).to eq(2)
      expect_tangent_to_both(pairs, a, b)
    end

    it "returns only outer tangents for overlapping circles" do
      a = circle(0, 0, 30)
      b = circle(35, 0, 10)
      pairs = described_class.common(a, b)

      expect(pairs.size).to eq(2)
      expect_tangent_to_both(pairs, a, b)
    end

    it "returns nothing when one circle is inside the other" do
      expect(described_class.common(circle(0, 0, 30), circle(5, 0, 10))).to eq([])
      expect(described_class.common(circle(0, 0, 30), circle(20, 0, 10))).to eq([])
    end

    it "returns nothing for concentric circles" do
      expect(described_class.common(circle(0, 0, 30), circle(0, 0, 10))).to eq([])
      expect(described_class.common(circle(0, 0, 30), circle(0, 0, 30))).to eq([])
    end

    it "keeps precision at real solar-system scale" do
      earth = circle(149_598_262, 0, 6_371.0)
      mars = circle(227_943_824, 0, 3_389.5)
      pairs = described_class.common(earth, mars)

      expect(pairs.size).to eq(4)
      expect_tangent_to_both(pairs, earth, mars, tol: 1e-4)
    end
  end
end
