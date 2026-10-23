require "rails_helper"

RSpec.describe Catalog::Loader do
  let(:real_path) { Rails.root.join("../data/data.yml") }
  # The real file as plain Ruby, for tests to break one field at a time.
  let(:data) { YAML.load_file(real_path) }
  let(:dir) { Dir.mktmpdir }

  after { FileUtils.remove_entry(dir) }

  def write(content)
    path = File.join(dir, "data.yml")
    File.write(path, content.is_a?(String) ? content : content.to_yaml)
    path
  end

  def load_data = described_class.call(write(data))

  def expect_error(*fragments)
    expect { load_data }.to raise_error(Catalog::Loader::Error) do |error|
      fragments.each { |fragment| expect(error.message).to include(fragment) }
    end
  end

  context "with the real data file" do
    let(:catalog) { described_class.call(real_path) }

    it "loads every body, the Sun included, and every spacecraft" do
      expect(catalog[:planets].map { |p| p[:name] })
        .to eq(%w[Sun Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune])
      expect(catalog[:spacecraft].size).to eq(6)
    end

    it "maps planet fields to internal attributes, halving the diameter" do
      earth = catalog[:planets].find { |p| p[:name] == "Earth" }

      expect(earth).to eq(
        name: "Earth", slug: "earth", body_type: "Planet", radius_km: 6_371.0,
        distance_from_sun_km: 149_600_000, average_temperature_c: 15, potentially_habitable: true,
        weather_patterns: "Varied (storms, rain, snow)", radiation_levels_msv: 0.1, gravity_m_per_s2: 9.8,
        moons: [ "Moon" ], extra_attributes: {}
      )
    end

    it "maps spacecraft fields to internal attributes" do
      nyx = catalog[:spacecraft].find { |s| s[:name] == "Nyx Odyssey" }

      expect(nyx).to eq(
        name: "Nyx Odyssey", slug: "nyx-odyssey", size: "Large", mass_kg: 3_000_000, capacity: 21,
        range_km: 8_000_000_000, speed_kmh: 600_000, gravity_generator: true,
        min_operating_temp_c: -350, max_operating_temp_c: 250, extra_attributes: {}
      )
    end
  end

  describe "the default path" do
    around do |example|
      original = ENV["MISSION_DATA_PATH"]
      example.run
    ensure
      ENV["MISSION_DATA_PATH"] = original
    end

    it "comes from MISSION_DATA_PATH when it is set" do
      data["planets"][3]["weather_patterns"] = "Read from MISSION_DATA_PATH"
      ENV["MISSION_DATA_PATH"] = write(data)

      expect(described_class.call[:planets][3][:weather_patterns]).to eq("Read from MISSION_DATA_PATH")
    end

    it "is data/data.yml at the repository root otherwise" do
      ENV.delete("MISSION_DATA_PATH")

      expect(described_class.default_path).to eq(Rails.root.join("../data/data.yml").expand_path)
    end
  end

  it "keeps unrecognised fields in extra_attributes" do
    data["planets"][6]["rings"] = true
    data["spacecrafts"][0]["warp_drive"] = "experimental"

    catalog = load_data

    expect(catalog[:planets][6][:extra_attributes]).to eq("rings" => true)
    expect(catalog[:spacecraft][0][:extra_attributes]).to eq("warp_drive" => "experimental")
  end

  it "accepts records without the optional info fields" do
    data["planets"][4].except!("moons", "weather_patterns", "potentially_habitable")
    data["spacecrafts"][0].except!("size", "mass_kg")

    catalog = load_data

    expect(catalog[:planets][4]).to include(moons: [], weather_patterns: nil, potentially_habitable: nil)
    expect(catalog[:spacecraft][0]).to include(size: nil, mass_kg: nil)
  end

  describe "invalid data" do
    it "names the record and field that is missing" do
      data["planets"][3].delete("diameter_km")

      expect_error("planets[3] (Earth): diameter_km is missing")
    end

    it "names the record and field with the wrong type, and the value found" do
      data["spacecrafts"][0]["capacity"] = "ten"

      expect_error('spacecrafts[0] (Millennial Hopper): capacity must be a whole number ≥ 0 (got "ten")')
    end

    it "rejects a non-positive diameter" do
      data["planets"][4]["diameter_km"] = 0

      expect_error("planets[4] (Mars): diameter_km must be a number > 0 (got 0)")
    end

    it "reports every problem at once" do
      data["planets"][3].delete("diameter_km")
      data["spacecrafts"][2]["travel_speed_km_per_hour"] = nil

      expect_error("planets[3] (Earth): diameter_km is missing", "spacecrafts[2] (Nyx Odyssey): travel_speed_km_per_hour is missing")
    end

    it "includes the file path in the message" do
      data["planets"][3].delete("diameter_km")

      expect_error(File.join(dir, "data.yml"))
    end

    it "requires both root lists" do
      data.delete("spacecrafts")

      expect_error("spacecrafts must be a list")
    end

    it "rejects two records with the same name" do
      data["planets"] << data["planets"][3].dup

      expect_error('planets[9] (Earth): duplicate name "Earth"')
    end

    it "rejects an operating range whose minimum is above its maximum" do
      data["spacecrafts"][1]["operational_temperature_c_min"] = 500

      expect_error("spacecrafts[1] (Star Explorer 1): operational_temperature_c_min (500) is above operational_temperature_c_max (465)")
    end

    it "requires a planet named Earth, where every mission starts" do
      data["planets"][3]["name"] = "Terra"

      expect_error("planets must include Earth")
    end

    it "does not report Earth as missing when its record is only invalid" do
      data["planets"][3]["diameter_km"] = "big"

      expect { load_data }.to raise_error(Catalog::Loader::Error) do |error|
        expect(error.message).not_to include("planets must include Earth")
      end
    end

    it "rejects bodies that overlap" do
      data["planets"][4]["distance_from_sun_km"] = 149_605_000

      expect_error("Earth and Mars overlap")
    end

    it "reports a missing file" do
      expect { described_class.call(File.join(dir, "missing.yml")) }
        .to raise_error(Catalog::Loader::Error, /not found/)
    end

    it "reports malformed YAML" do
      path = write("planets: [\n  - name: Earth\n")

      expect { described_class.call(path) }.to raise_error(Catalog::Loader::Error, /not valid YAML/)
    end
  end
end
