require "rails_helper"

RSpec.describe Spacecraft do
  before { seed_catalog }

  describe "#can_land_on?" do
    it "allows a planet within the operating range, inclusive" do
      expect(catalog_spacecraft(:star_explorer_1).can_land_on?(catalog_planet(:venus))).to be(true)
    end

    it "refuses a planet that is too hot" do
      expect(catalog_spacecraft(:nostromo_ii).can_land_on?(catalog_planet(:venus))).to be(false)
    end

    it "refuses a planet that is too cold" do
      craft = build(:spacecraft, min_operating_temp_c: -150)

      expect(craft.can_land_on?(catalog_planet(:neptune))).to be(false)
    end

    it "refuses a star whatever the temperature" do
      craft = build(:spacecraft, max_operating_temp_c: 10_000)

      expect(craft.can_land_on?(catalog_planet(:sun))).to be(false)
    end
  end

  it "converts to the mission calculator's Spacecraft" do
    expect(catalog_spacecraft(:nyx_odyssey).to_mission_spacecraft).to eq(
      MissionCalculator::Spacecraft.new(
        name: "Nyx Odyssey", capacity: 21, range_km: 8_000_000_000, speed_kmh: 600_000,
        gravity_generator: true, min_operating_temp_c: -350, max_operating_temp_c: 250
      )
    )
  end
end
