require "rails_helper"

RSpec.describe Catalog::Seeder do
  let(:catalog) { Catalog::Loader.call(Rails.root.join("../data/data.yml")) }

  it "creates every body and spacecraft with its mapped attributes" do
    described_class.call(catalog)

    expect(Planet.count).to eq(9)
    expect(Spacecraft.count).to eq(6)
    expect(Planet.find_by!(slug: "earth")).to have_attributes(radius_km: 6_371.0, body_type: "Planet", moons: [ "Moon" ])
    expect(Spacecraft.find_by!(slug: "nyx-odyssey")).to have_attributes(speed_kmh: 600_000, max_operating_temp_c: 250)
  end

  it "is idempotent: seeding twice keeps the same records" do
    described_class.call(catalog)
    ids = [ Planet.order(:id).pluck(:id), Spacecraft.order(:id).pluck(:id) ]

    described_class.call(catalog)

    expect([ Planet.order(:id).pluck(:id), Spacecraft.order(:id).pluck(:id) ]).to eq(ids)
  end

  it "updates records whose values changed in the file" do
    described_class.call(catalog)
    catalog[:spacecraft].find { |s| s[:slug] == "nyx-odyssey" }[:range_km] = 9_000_000_000

    described_class.call(catalog)

    expect(Spacecraft.find_by!(slug: "nyx-odyssey").range_km).to eq(9_000_000_000)
  end

  it "keeps records that are no longer in the file" do
    described_class.call(catalog)
    catalog[:spacecraft].reject! { |s| s[:slug] == "nyx-odyssey" }

    described_class.call(catalog)

    expect(Spacecraft.exists?(slug: "nyx-odyssey")).to be(true)
  end

  it "stores unrecognised fields" do
    catalog[:planets].find { |p| p[:slug] == "saturn" }[:extra_attributes] = { "rings" => true }

    described_class.call(catalog)

    expect(Planet.find_by!(slug: "saturn").extra_attributes).to eq("rings" => true)
  end

  it "runs from db/seeds.rb, and running it again changes nothing" do
    2.times { load Rails.root.join("db/seeds.rb") }

    expect(Planet.count).to eq(9)
    expect(Spacecraft.count).to eq(6)
  end
end
