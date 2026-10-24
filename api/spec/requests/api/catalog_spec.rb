require "rails_helper"

RSpec.describe "Catalog API", type: :request do
  before { seed_catalog }

  def json = response.parsed_body

  describe "GET /api/planets" do
    before { get "/api/planets" }

    it "lists every body, the Sun included, outwards from the Sun" do
      expect(response).to have_http_status(:ok)
      expect(json.map { |p| p["name"] }).to eq(%w[Sun Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune])
    end

    it "includes the info fields and whether each body is a destination" do
      earth = json.find { |p| p["name"] == "Earth" }

      expect(earth).to include(
        "id" => catalog_planet(:earth).id, "slug" => "earth", "body_type" => "Planet", "destination" => true,
        "radius_km" => 6_371.0, "distance_from_sun_km" => 149_600_000.0, "average_temperature_c" => 15.0,
        "gravity_m_per_s2" => 9.8, "radiation_levels_msv" => 0.1, "potentially_habitable" => true,
        "weather_patterns" => "Varied (storms, rain, snow)", "moons" => [ "Moon" ], "extra_attributes" => {}
      )
      expect(json.find { |p| p["name"] == "Sun" }["destination"]).to be(false)
    end
  end

  describe "GET /api/spacecraft" do
    before { get "/api/spacecraft" }

    def craft(name) = json.find { |s| s["name"] == name }

    it "lists every spacecraft with its fields" do
      expect(response).to have_http_status(:ok)
      expect(json.size).to eq(6)
      expect(craft("Nyx Odyssey")).to include(
        "id" => catalog_spacecraft(:nyx_odyssey).id, "slug" => "nyx-odyssey", "size" => "Large",
        "mass_kg" => 3_000_000.0, "capacity" => 21, "range_km" => 8_000_000_000.0, "speed_kmh" => 600_000.0,
        "gravity_generator" => true, "min_operating_temp_c" => -350.0, "max_operating_temp_c" => 250.0,
        "extra_attributes" => {}
      )
    end

    it "lists the planets each spacecraft can land on, by temperature" do
      landable = ->(name) { Planet.where(id: craft(name)["landable_planet_ids"]).pluck(:name) }

      expect(landable.call("Nostromo II")).not_to include("Venus", "Mercury")
      expect(landable.call("Star Explorer 1")).to include("Venus")
      expect(json.flat_map { |s| s["landable_planet_ids"] }).not_to include(catalog_planet(:sun).id)
    end
  end
end
