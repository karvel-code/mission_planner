require "rails_helper"

RSpec.describe MissionCalculator do
  def plan(*stops, craft: spacecraft(:serenity_xl), passengers: 0, limits: thresholds)
    described_class.call(route: route(*stops), bodies: all_bodies, spacecraft: craft, passengers:, thresholds: limits)
  end

  def codes(issues) = issues.map(&:code)

  def issue(issues, code) = issues.find { |i| i.code == code }

  describe ".range_used" do
    it "costs 1 + 0.042 per passenger for every km" do
      expect(described_class.range_used(1_000, 10)).to be_within(1e-9).of(1_420)
    end

    it "costs exactly the distance with no passengers" do
      expect(described_class.range_used(1_000, 0)).to eq(1_000.0)
    end
  end

  context "with Earth → Mars → Jupiter" do
    let(:result) { plan(:earth, :mars, :jupiter, passengers: 4) }
    let(:earth) { body(:earth) }

    it "has one leg per pair of stops" do
      expect(result.legs.map { |leg| [ leg.from.name, leg.to.name ] }).to eq([ %w[Earth Mars], %w[Mars Jupiter] ])
    end

    it "leaves Earth from the surface point facing the first destination" do
      expect(result.legs.first.trajectory.segments.first.from).to eq(point(earth.distance_from_sun_km + earth.radius_km, 0))
    end

    it "starts each later leg exactly where the previous one arrived" do
      expect(result.legs.last.trajectory.segments.first.from).to eq(result.legs.first.trajectory.arrival)
    end

    it "wraps around Mars, which the ship reached on its Earth-facing side" do
      expect(result.legs.first.trajectory.departure_wrap).to eq(0.0)
      expect(result.legs.last.trajectory.departure_wrap).to be > 0
    end

    it "uses the range formula and the spacecraft's speed on every leg" do
      result.legs.each do |leg|
        expect(leg.range_used).to be_within(1e-6).of(leg.length_km * (1 + (0.042 * 4)))
        expect(leg.duration_h).to be_within(1e-9).of(leg.length_km / 500_000)
      end
    end

    it "adds the legs up into the totals" do
      expect(result.total_length_km).to eq(result.legs.sum(&:length_km))
      expect(result.total_range_used).to eq(result.legs.sum(&:range_used))
      expect(result.total_duration_h).to eq(result.legs.sum(&:duration_h))
    end

    it "is feasible, with no violations" do
      expect(result.violations).to eq([])
      expect(result).to be_feasible
    end
  end

  it "leaves Earth from the side facing the Sun when the first destination is closer in" do
    earth = body(:earth)

    result = plan(:earth, :venus, craft: spacecraft(:galactica_scout))

    expect(result.legs.first.trajectory.segments.first.from).to eq(point(earth.distance_from_sun_km - earth.radius_km, 0))
  end

  it "lists the planets each leg bypasses as bodies" do
    result = plan(:earth, :jupiter)

    expect(result.legs.first.bypassed).to eq([ body(:mars) ])
  end

  describe "violations" do
    it "flags more passengers than the spacecraft holds" do
      result = plan(:earth, :mars, craft: spacecraft(:millennial_hopper), passengers: 6)
      violation = issue(result.violations, :over_capacity)

      expect(violation.details).to eq(passengers: 6, capacity: 5)
      expect(violation.message).to eq("6 passengers exceed Millennial Hopper's capacity of 5.")
      expect(result).not_to be_feasible
    end

    it "flags a mission that needs more range than the spacecraft has" do
      result = plan(:earth, :mars, craft: spacecraft(:millennial_hopper, range_km: 1_000))

      expect(codes(result.violations)).to eq([ :range_exceeded ])
      expect(issue(result.violations, :range_exceeded).details).to include(range_km: 1_000)
    end

    it "flags a mission longer than the 42-year window" do
      result = plan(:earth, :mars, craft: spacecraft(:serenity_xl, speed_kmh: 1))
      violation = issue(result.violations, :duration_exceeded)

      expect(violation.details).to include(limit_h: 42 * 365.25 * 24)
      expect(violation.details[:duration_h]).to be > 42 * 365.25 * 24
    end

    it "flags each landing stop outside the spacecraft's operating temperatures" do
      result = plan(:earth, :venus, :mercury, :venus, craft: spacecraft(:nostromo_ii))
      violations = result.violations.select { |v| v.code == :temperature_incompatible }

      expect(violations.map { |v| v.details[:stop_index] }).to eq([ 1, 2, 3 ])
      expect(violations.first.details).to eq(
        stop_index: 1, planet: "Venus", temperature_c: 464, min_operating_temp_c: -305, max_operating_temp_c: 100
      )
      expect(violations.first.message).to eq("Venus (464 °C) exceeds Nostromo II's maximum operating temperature of 100 °C.")
    end

    it "explains a planet that is too cold" do
      result = plan(:earth, :neptune, craft: spacecraft(:serenity_xl, min_operating_temp_c: -150))

      expect(issue(result.violations, :temperature_incompatible).message)
        .to eq("Neptune (-200 °C) is below Serenity XL's minimum operating temperature of -150 °C.")
    end

    it "does not check the temperature of planets the ship only flies past" do
      result = plan(:earth, :mercury, craft: spacecraft(:nyx_odyssey))

      expect(result.legs.first.bypassed).to include(body(:venus))
      expect(result.violations).to eq([])
    end

    it "flags a star as a destination" do
      result = plan(:earth, :sun)

      expect(codes(result.violations)).to include(:star_destination)
      expect(issue(result.violations, :star_destination).details).to eq(stop_index: 1, planet: "Sun")
    end

    it "flags a route with no destination after Earth" do
      result = plan(:earth)

      expect(codes(result.violations)).to eq([ :no_destination ])
      expect(result.legs).to eq([])
    end

    it "flags an empty route only as having no destination" do
      expect(codes(plan.violations)).to eq([ :no_destination ])
    end

    context "with the same planet twice in a row" do
      let(:result) { plan(:earth, :mars, :mars, :jupiter) }

      it "flags the repeated stop" do
        expect(issue(result.violations, :consecutive_duplicate).details).to eq(stop_index: 2, planet: "Mars")
      end

      it "skips the empty leg and carries on from where the ship landed" do
        expect(result.legs.map { |leg| leg.to.name }).to eq(%w[Mars Jupiter])
        expect(result.legs.last.trajectory.segments.first.from).to eq(result.legs.first.trajectory.arrival)
      end
    end

    context "with a route that does not start at Earth" do
      let(:result) { plan(:mars, :jupiter) }

      it "flags the route" do
        expect(issue(result.violations, :must_start_at_earth).details).to eq(planet: "Mars")
      end

      it "still calculates the legs, leaving the first stop from the side facing the next one" do
        mars = body(:mars)

        expect(result.legs.first.trajectory.segments.first.from).to eq(point(mars.distance_from_sun_km + mars.radius_km, 0))
      end
    end
  end

  describe "advisories" do
    it "warns about high surface gravity on a landing stop" do
      result = plan(:earth, :mars, :jupiter)
      advisory = issue(result.advisories, :high_gravity)

      expect(advisory.details).to eq(stop_index: 2, planet: "Jupiter", gravity_m_per_s2: 24.79, threshold_m_per_s2: 15)
      expect(advisory.message).to eq("Jupiter surface gravity is 24.79 m/s² (2.5× Earth's).")
    end

    it "warns about gravity only above the threshold" do
      result = plan(:earth, :jupiter, limits: thresholds(high_gravity_m_per_s2: 24.79))

      expect(codes(result.advisories)).not_to include(:high_gravity)
    end

    it "warns about radiation at or above the threshold" do
      result = plan(:earth, :mars, :uranus)
      advisories = result.advisories.select { |a| a.code == :high_radiation }

      expect(advisories.map { |a| a.details[:planet] }).to eq([ "Uranus" ])
      expect(advisories.first.details).to eq(stop_index: 2, planet: "Uranus", radiation_levels_msv: 500, threshold_msv: 500)
    end

    it "does not warn about planets the ship only flies past" do
      result = plan(:earth, :saturn)

      expect(result.legs.first.bypassed).to include(body(:jupiter))
      expect(result.advisories.map { |a| a.details[:planet] }.uniq).to eq([ "Saturn" ])
    end

    it "warns about a long mission on a spacecraft without a gravity generator" do
      result = plan(:earth, :jupiter, craft: spacecraft(:star_explorer_1))
      advisory = issue(result.advisories, :no_gravity_generator_long_mission)

      expect(advisory.details[:duration_days]).to be > 30
      expect(advisory.details).to include(threshold_days: 30)
    end

    it "does not warn about a short mission without a gravity generator" do
      result = plan(:earth, :mars, craft: spacecraft(:star_explorer_1))

      expect(codes(result.advisories)).not_to include(:no_gravity_generator_long_mission)
    end

    it "does not warn about a long mission when the spacecraft has a gravity generator" do
      result = plan(:earth, :jupiter, craft: spacecraft(:nyx_odyssey))

      expect(codes(result.advisories)).not_to include(:no_gravity_generator_long_mission)
    end

    it "never makes a mission infeasible" do
      result = plan(:earth, :jupiter, craft: spacecraft(:star_explorer_1))

      expect(result.advisories).not_to be_empty
      expect(result).to be_feasible
    end
  end

  # Reference cases from PLAN.md section 4b.
  describe "with the reference cases" do
    it "leaves Millennial Hopper short of range to Jupiter even with no passengers" do
      result = plan(:earth, :jupiter, craft: spacecraft(:millennial_hopper))

      expect(result.total_length_km).to be_within(1).of(628_823_719)
      expect(codes(result.violations)).to eq([ :range_exceeded ])
    end

    it "fits 20 passengers but not 21 on Nyx Odyssey to Neptune" do
      twenty = plan(:earth, :neptune, craft: spacecraft(:nyx_odyssey), passengers: 20)
      twenty_one = plan(:earth, :neptune, craft: spacecraft(:nyx_odyssey), passengers: 21)

      expect(twenty).to be_feasible
      expect(codes(twenty_one.violations)).to eq([ :range_exceeded ])
    end

    {
      millennial_hopper: false, star_explorer_1: true, nyx_odyssey: false,
      nostromo_ii: false, serenity_xl: true, galactica_scout: true
    }.each do |craft, can_land|
      it "#{can_land ? 'lets' : 'does not let'} #{craft} land on Venus (464 °C)" do
        result = plan(:earth, :venus, craft: spacecraft(craft))

        expect(codes(result.violations).include?(:temperature_incompatible)).to be(!can_land)
      end
    end

    it "keeps Millennial Hopper and Nostromo II off Mercury (167 °C)" do
      %i[millennial_hopper nostromo_ii].each do |craft|
        expect(codes(plan(:earth, :mercury, craft: spacecraft(craft)).violations)).to include(:temperature_incompatible)
      end
    end
  end
end
