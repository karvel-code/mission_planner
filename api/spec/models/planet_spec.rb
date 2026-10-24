require "rails_helper"

RSpec.describe Planet do
  before { seed_catalog }

  it "offers every planet but not the Sun as a destination" do
    expect(described_class.destinations.pluck(:name)).to contain_exactly(
      "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"
    )
  end

  it "knows whether it is a star" do
    expect(catalog_planet(:sun)).to be_star
    expect(catalog_planet(:earth)).not_to be_star
  end

  it "converts to the mission calculator's Body" do
    expect(catalog_planet(:mars).to_mission_body).to eq(
      MissionCalculator::Body.new(
        name: "Mars", body_type: "Planet", distance_from_sun_km: 227_900_000, radius_km: 3_389.5,
        average_temperature_c: -65, gravity_m_per_s2: 3.71, radiation_levels_msv: 240
      )
    )
  end
end
