require "rails_helper"

RSpec.describe TrajectoryCalculator do
  def point(x, y) = Geometry::Point.new(x, y)
  def circle(x, r) = Geometry::Circle.new(point(x, 0), r)

  # Points spread along a segment, for checking the path against every circle.
  def sample(segment, steps: 50)
    (0..steps).map do |i|
      t = i.to_f / steps
      case segment
      when Trajectory::Line
        segment.from + ((segment.to - segment.from) * t)
      when Trajectory::Arc
        segment.circle.point_at(segment.circle.angle_of(segment.from) + (segment.sweep * t))
      end
    end
  end

  def expect_path_outside(trajectory, circles)
    trajectory.segments.each do |segment|
      sample(segment).each do |p|
        circles.each do |c|
          expect(c.contains?(p, tolerance: c.radius * 1e-6)).to be(false), "#{p} is inside #{c}"
        end
      end
    end
  end

  def expect_continuous(trajectory, start)
    expect(trajectory.segments.first.from).to eq(start)
    trajectory.segments.each_cons(2) do |a, b|
      expect(a.to.distance_to(b.from)).to be_within(1e-9).of(0.0)
    end
    expect(trajectory.segments.last.to).to eq(trajectory.arrival)
  end

  context "with no obstacle between the planets" do
    let(:departure) { circle(0, 30) }
    let(:target) { circle(100, 20) }
    let(:start) { point(30, 0) }
    let(:trajectory) { described_class.call(start:, departure:, target:, planets: [ departure, target ]) }

    it "flies a single straight line" do
      expect(trajectory.segments.size).to eq(1)
      expect(trajectory.segments.first).to be_a(Trajectory::Line)
    end

    it "is as long as the centre gap minus both radii" do
      expect(trajectory.length).to be_within(1e-9).of(100 - 30 - 20)
    end

    it "bypasses nothing and does not wrap the departure planet" do
      expect(trajectory.bypassed).to eq([])
      expect(trajectory.departure_wrap).to eq(0.0)
    end
  end

  context "with one obstacle between the planets" do
    let(:departure) { circle(0, 10) }
    let(:obstacle) { circle(100, 30) }
    let(:target) { circle(200, 10) }
    let(:start) { point(10, 0) }
    let(:trajectory) { described_class.call(start:, departure:, target:, planets: [ departure, obstacle, target ]) }

    it "is longer than the straight line" do
      expect(trajectory.length).to be > (200 - 10 - 10)
    end

    it "goes tangent to the obstacle, around it, and straight to the target" do
      to_obstacle = Math.sqrt((90**2) - (30**2))
      from_obstacle = Math.sqrt((100**2) - (30**2))
      wrap = Math::PI - Math.acos(30.0 / 90) - Math.acos(30.0 / 100)

      expect(trajectory.length).to be_within(1e-9).of(to_obstacle + (30 * wrap) + from_obstacle - 10)
      expect(trajectory.segments.map(&:class)).to eq([ Trajectory::Line, Trajectory::Arc, Trajectory::Line ])
    end

    it "lists the obstacle as bypassed" do
      expect(trajectory.bypassed).to eq([ obstacle ])
    end

    it "keeps the path in the upper half-plane" do
      trajectory.segments.flat_map { |s| sample(s) }.each { |p| expect(p.y).to be >= -1e-9 }
    end
  end

  it "bypasses only the bigger planet when a small one hides behind it" do
    departure = circle(0, 10)
    big = circle(100, 40)
    small = circle(140, 15)
    target = circle(250, 10)

    trajectory = described_class.call(start: point(10, 0), departure:, target:, planets: [ departure, big, small, target ])

    expect(trajectory.bypassed).to eq([ big ])
  end

  it "lists a planet the path only touches in passing as bypassed" do
    departure = circle(0, 30)
    target = circle(300, 30)
    # The tangent from the target's centre to the departure planet makes an angle
    # with sin = 30 / 300 to the axis, so it passes exactly 150 × 0.1 = 15 from (150, 0).
    grazed = circle(150, 15)

    trajectory = described_class.call(start: point(-30, 0), departure:, target:, planets: [ departure, grazed, target ])

    expect(trajectory.bypassed).to eq([ grazed ])
    expect(trajectory.length).to be_within(1e-6).of(trajectory.departure_wrap + Math.sqrt((300**2) - (30**2)) - 30)
  end

  context "when starting on the far side of the departure planet" do
    let(:departure) { circle(0, 30) }
    let(:target) { circle(100, 30) }
    let(:start) { point(-30, 0) }
    let(:trajectory) { described_class.call(start:, departure:, target:, planets: [ departure, target ]) }

    it "wraps around the departure planet first" do
      expect(trajectory.segments.first).to be_a(Trajectory::Arc)
      expect(trajectory.segments.first.circle).to eq(departure)
    end

    it "measures the wrap as the arc up to the tangent towards the target's centre" do
      expect(trajectory.departure_wrap).to be > 0
      expect(trajectory.departure_wrap).to be_within(1e-9).of(30 * (Math::PI - Math.acos(30.0 / 100)))
    end

    it "is the wrap plus the tangent line to the target's surface" do
      expected = trajectory.departure_wrap + Math.sqrt((100**2) - (30**2)) - 30

      expect(trajectory.length).to be_within(1e-9).of(expected)
    end

    it "does not count the departure planet as bypassed" do
      expect(trajectory.bypassed).to eq([])
    end
  end

  it "does not wrap when starting on the side facing the target" do
    departure = circle(100, 30)
    target = circle(0, 30)

    trajectory = described_class.call(start: point(70, 0), departure:, target:, planets: [ departure, target ])

    expect(trajectory.departure_wrap).to eq(0.0)
    expect(trajectory.length).to be_within(1e-9).of(40.0)
  end

  it "works without a departure planet" do
    target = circle(100, 20)

    trajectory = described_class.call(start: point(0, 50), target:, planets: [ target ])

    expect(trajectory.length).to be_within(1e-9).of(Math.hypot(100, 50) - 20)
    expect(trajectory.departure_wrap).to eq(0.0)
  end

  it "rejects a target that is also the departure planet" do
    planet = circle(0, 30)

    expect { described_class.call(start: point(30, 0), departure: planet, target: planet, planets: [ planet ]) }
      .to raise_error(ArgumentError)
  end

  it "rejects a start below the axis" do
    target = circle(100, 20)

    expect { described_class.call(start: point(0, -5), target:, planets: [ target ]) }.to raise_error(ArgumentError)
  end

  context "with several obstacles and a far-side start" do
    let(:departure) { circle(0, 20) }
    let(:target) { circle(300, 25) }
    let(:planets) { [ departure, circle(80, 30), circle(150, 15), circle(190, 35), target ] }
    let(:start) { point(-20, 0) }
    let(:trajectory) { described_class.call(start:, departure:, target:, planets:) }

    it "arrives exactly on the target's surface" do
      expect(target.centre.distance_to(trajectory.arrival)).to be_within(1e-9).of(25.0)
    end

    it "never enters any planet" do
      expect_path_outside(trajectory, planets)
    end

    it "is one continuous path from the start to the arrival point" do
      expect_continuous(trajectory, start)
    end

    it "reports a length equal to the sum of its segments" do
      expect(trajectory.length).to eq(trajectory.segments.sum(&:length))
    end
  end

  # Bodies from data/data.yml, with radius = diameter_km ÷ 2.
  context "with the real data" do
    let(:sun) { circle(0, 695_508) }
    let(:mercury) { circle(57_900_000, 2_439.5) }
    let(:venus) { circle(108_200_000, 6_052) }
    let(:earth) { circle(149_600_000, 6_371) }
    let(:mars) { circle(227_900_000, 3_389.5) }
    let(:jupiter) { circle(778_500_000, 69_910) }
    let(:saturn) { circle(1_434_000_000, 58_230) }
    let(:uranus) { circle(2_871_000_000, 25_362) }
    let(:neptune) { circle(4_495_000_000, 24_622) }
    let(:planets) { [ sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune ] }
    let(:earth_facing_out) { point(149_600_000 + 6_371, 0) }

    context "from Earth to Jupiter" do
      let(:trajectory) { described_class.call(start: earth_facing_out, departure: earth, target: jupiter, planets:) }
      let(:straight) { 778_500_000 - 69_910 - (149_600_000 + 6_371) }

      it "goes around Mars" do
        expect(trajectory.bypassed).to eq([ mars ])
      end

      it "is only metres longer than the blocked straight line" do
        expect(trajectory.length).to be > straight
        expect(trajectory.length).to be < straight + 1
      end

      it "arrives on Jupiter's surface without entering any body" do
        expect(jupiter.centre.distance_to(trajectory.arrival)).to be_within(1e-3).of(69_910)
        expect_path_outside(trajectory, planets)
        expect_continuous(trajectory, earth_facing_out)
      end
    end

    it "flies from Earth to Mercury around Venus, without touching the Sun" do
      earth_facing_sun = point(149_600_000 - 6_371, 0)

      trajectory = described_class.call(start: earth_facing_sun, departure: earth, target: mercury, planets:)

      expect(trajectory.bypassed).to eq([ venus ])
      expect_path_outside(trajectory, planets)
    end

    it "wraps just over a quarter of Mars when leaving towards Jupiter from the side facing Earth" do
      start = point(227_900_000 - 3_389.5, 0)
      d = 778_500_000 - 227_900_000
      wrap = 3_389.5 * (Math::PI - Math.acos(3_389.5 / d))

      trajectory = described_class.call(start:, departure: mars, target: jupiter, planets:)

      expect(trajectory.length).to be_within(1e-3).of(wrap + Math.sqrt((d**2) - (3_389.5**2)) - 69_910)
      # The clearance tolerance (EPSILON × radius, 3.4 m on Mars) lets the path
      # leave from a nearby node a few hundredths of a km early; the length ties.
      expect(trajectory.departure_wrap).to be_within(0.1).of(wrap)
      expect(trajectory.bypassed).to eq([])
    end

    it "flies straight from Earth to Mars: 78,290,239.5 km" do
      trajectory = described_class.call(start: earth_facing_out, departure: earth, target: mars, planets:)

      expect(trajectory.segments.size).to eq(1)
      expect(trajectory.length).to be_within(1e-3).of(78_290_239.5)
    end
  end
end
