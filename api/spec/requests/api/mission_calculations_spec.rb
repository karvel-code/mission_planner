require "rails_helper"

RSpec.describe "POST /api/mission_calculations", type: :request do
  before { seed_catalog }

  def json = response.parsed_body

  def calculate(spacecraft: :serenity_xl, passengers: 4, route: %i[earth mars jupiter], **overrides)
    body = {
      spacecraft_id: catalog_spacecraft(spacecraft).id,
      passenger_count: passengers,
      planet_ids: catalog_route(*route).map(&:id)
    }.merge(overrides)
    post "/api/mission_calculations", params: body, as: :json
  end

  context "with Earth → Mars → Jupiter" do
    before { calculate }

    it "returns the totals and feasibility" do
      expect(response).to have_http_status(:ok)
      expect(json).to include("feasible" => true, "passenger_count" => 4, "spacecraft_id" => catalog_spacecraft(:serenity_xl).id)
      expect(json["totals"]).to include("range_available_km" => 15_000_000_000.0)
      expect(json["totals"]["distance_km"]).to eq(json["legs"].sum { |leg| leg["distance_km"] })
    end

    it "returns each leg by planet id, with what it bypasses" do
      expect(json["legs"].map { |leg| [ leg["from_planet_id"], leg["to_planet_id"] ] })
        .to eq([ catalog_route(:earth, :mars).map(&:id), catalog_route(:mars, :jupiter).map(&:id) ])
      expect(json["legs"].first["bypassed_planet_ids"]).to eq([])
      expect(json["legs"].first["distance_km"]).to be_within(1e-3).of(78_290_239.5)
    end

    it "returns path segments for drawing, including the wrap around Mars" do
      first, second = json["legs"]
      arc = second["segments"].first

      expect(first["segments"]).to eq([
        { "type" => "line", "from" => { "x" => 149_606_371.0, "y" => 0.0 }, "to" => first["arrival"],
          "length_km" => first["distance_km"] }
      ])
      expect(arc).to include("type" => "arc", "centre" => { "x" => 227_900_000.0, "y" => 0.0 }, "radius_km" => 3_389.5)
      expect(arc.keys).to include("from", "to", "start_angle", "sweep", "length_km")
      expect(second["departure_wrap_km"]).to be > 0
    end

    it "returns advisories, separately from violations" do
      expect(json["violations"]).to eq([])
      expect(json["advisories"].map { |a| a["code"] }).to include("high_gravity", "high_radiation")
      expect(json["advisories"].first).to include("message", "details")
    end
  end

  it "lists bypassed planets by id" do
    calculate(route: %i[earth jupiter])

    expect(json["legs"].first["bypassed_planet_ids"]).to eq([ catalog_planet(:mars).id ])
  end

  it "reports violations for an infeasible mission with a 200" do
    calculate(spacecraft: :millennial_hopper, passengers: 0, route: %i[earth jupiter])

    expect(response).to have_http_status(:ok)
    expect(json["feasible"]).to be(false)
    expect(json["violations"].map { |v| v["code"] }).to eq([ "range_exceeded" ])
  end

  it "reports route problems as violations, so a half-built route can be previewed" do
    calculate(route: %i[mars jupiter])

    expect(response).to have_http_status(:ok)
    expect(json["violations"].map { |v| v["code"] }).to include("must_start_at_earth")
  end

  it "counts no passengers when passenger_count is left out" do
    post "/api/mission_calculations", params: { spacecraft_id: catalog_spacecraft(:serenity_xl).id,
                                                planet_ids: catalog_route(:earth, :mars).map(&:id) }, as: :json

    expect(json["passenger_count"]).to eq(0)
  end

  describe "invalid input" do
    def expect_error(field, message)
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to include({ "field" => field, "message" => message })
    end

    it "rejects an unknown spacecraft" do
      calculate(spacecraft_id: 0)

      expect_error("spacecraft_id", "Spacecraft not found (id 0)")
    end

    it "rejects an unknown planet" do
      calculate(planet_ids: [ catalog_planet(:earth).id, 0 ])

      expect_error("planet_ids", "includes an unknown planet (id 0)")
    end

    it "rejects a passenger count that is not a whole number of zero or more" do
      calculate(passengers: -1)
      expect_error("passenger_count", "must be a whole number of 0 or more")

      calculate(passengers: 1.5)
      expect_error("passenger_count", "must be a whole number of 0 or more")
    end

    it "requires planet_ids to be a list" do
      calculate(planet_ids: nil)

      expect_error("planet_ids", "must be a list of planet ids")
    end

    it "reports every problem at once" do
      calculate(spacecraft_id: 0, passengers: -1)

      expect(json["errors"].map { |e| e["field"] }).to contain_exactly("spacecraft_id", "passenger_count")
    end
  end
end
