require "rails_helper"

RSpec.describe "Mission plans API", type: :request do
  before { seed_catalog }

  def json = response.parsed_body

  def route_ids(*keys) = catalog_route(*keys).map(&:id)

  def plan_params(**overrides)
    { name: "Red planet getaway", customer_name: "Okafor family", spacecraft_id: catalog_spacecraft(:serenity_xl).id,
      passenger_count: 4, notes: "Window seats", planet_ids: route_ids(:earth, :mars) }.merge(overrides)
  end

  def create_plan(**overrides)
    MissionPlans::Save.call(plan: MissionPlan.new, attributes: plan_params(**overrides).except(:planet_ids),
                            planet_ids: plan_params(**overrides)[:planet_ids]).plan
  end

  def expect_error(field, message, status: :unprocessable_content)
    expect(response).to have_http_status(status)
    expect(json["errors"]).to include({ "field" => field, "message" => message })
  end

  describe "GET /api/mission_plans" do
    it "lists summaries from the cached totals, most recently updated first" do
      older = create_plan(name: "Older")
      newer = create_plan(name: "Newer", planet_ids: route_ids(:earth, :mars, :jupiter))
      older.update_columns(updated_at: 1.day.ago)

      get "/api/mission_plans"

      expect(response).to have_http_status(:ok)
      expect(json.map { |p| p["id"] }).to eq([ newer.id, older.id ])
      expect(json.first).to include(
        "name" => "Newer", "customer_name" => "Okafor family", "passenger_count" => 4, "feasible" => true,
        "spacecraft" => { "id" => catalog_spacecraft(:serenity_xl).id, "name" => "Serenity XL" },
        "stops" => [
          { "planet_id" => catalog_planet(:earth).id, "name" => "Earth" },
          { "planet_id" => catalog_planet(:mars).id, "name" => "Mars" },
          { "planet_id" => catalog_planet(:jupiter).id, "name" => "Jupiter" }
        ]
      )
      expect(json.first["total_distance_km"]).to eq(newer.total_distance_km)
      expect(json.first.keys).to include("range_used_km", "duration_hours", "updated_at")
      expect(json.first.keys).not_to include("mission")
    end
  end

  describe "POST /api/mission_plans" do
    it "saves the plan and returns it with its calculated mission" do
      post "/api/mission_plans", params: plan_params, as: :json

      expect(response).to have_http_status(:created)
      plan = MissionPlan.find(json["id"])
      expect(plan.route.map(&:name)).to eq(%w[Earth Mars])
      expect(json).to include("name" => "Red planet getaway", "notes" => "Window seats", "planet_ids" => route_ids(:earth, :mars))
      expect(json["mission"]["totals"]["distance_km"]).to be_within(1e-3).of(78_290_239.5)
    end

    it "saves an infeasible plan as a draft" do
      post "/api/mission_plans", params: plan_params(spacecraft_id: catalog_spacecraft(:millennial_hopper).id,
                                                     planet_ids: route_ids(:earth, :jupiter)), as: :json

      expect(response).to have_http_status(:created)
      expect(json["feasible"]).to be(false)
      expect(json["mission"]["violations"].map { |v| v["code"] }).to include("range_exceeded")
    end

    it "rejects an invalid plan with every error and saves nothing" do
      post "/api/mission_plans", params: plan_params(name: "", planet_ids: route_ids(:mars, :jupiter)), as: :json

      expect_error("name", "Name can't be blank")
      expect_error("route", "Route must start at Earth")
      expect(MissionPlan.count).to eq(0)
    end

    it "rejects an unknown spacecraft" do
      post "/api/mission_plans", params: plan_params(spacecraft_id: 0), as: :json

      expect_error("spacecraft", "Spacecraft must exist")
    end
  end

  describe "GET /api/mission_plans/:id" do
    it "returns the plan with a fresh calculation" do
      plan = create_plan(planet_ids: route_ids(:earth, :mars, :jupiter))

      get "/api/mission_plans/#{plan.id}"

      expect(response).to have_http_status(:ok)
      expect(json).to include("id" => plan.id, "customer_name" => "Okafor family", "spacecraft_id" => plan.spacecraft_id)
      expect(json["mission"]["legs"].size).to eq(2)
      expect(json["mission"]["legs"].last["segments"].first["type"]).to eq("arc")
    end

    it "returns 404 with the error shape for a missing plan" do
      get "/api/mission_plans/0"

      expect_error(nil, "Mission plan not found", status: :not_found)
    end
  end

  describe "PATCH /api/mission_plans/:id" do
    let(:plan) { create_plan }

    it "updates the plan and recalculates" do
      patch "/api/mission_plans/#{plan.id}", params: { passenger_count: 0, planet_ids: route_ids(:earth, :venus) }, as: :json

      expect(response).to have_http_status(:ok)
      expect(plan.reload.route.map(&:name)).to eq(%w[Earth Venus])
      expect(json["passenger_count"]).to eq(0)
      expect(json["range_used_km"]).to eq(json["mission"]["totals"]["range_used_km"])
    end

    it "keeps the route when planet_ids is left out" do
      patch "/api/mission_plans/#{plan.id}", params: { name: "Renamed" }, as: :json

      expect(response).to have_http_status(:ok)
      expect(plan.reload).to have_attributes(name: "Renamed")
      expect(plan.route.map(&:name)).to eq(%w[Earth Mars])
    end

    it "rejects an invalid update and leaves the plan unchanged" do
      patch "/api/mission_plans/#{plan.id}", params: { planet_ids: route_ids(:earth) }, as: :json

      expect_error("route", "Route needs at least one destination after Earth")
      expect(plan.reload.route.map(&:name)).to eq(%w[Earth Mars])
    end
  end

  describe "DELETE /api/mission_plans/:id" do
    it "deletes the plan and its stops" do
      plan = create_plan

      delete "/api/mission_plans/#{plan.id}"

      expect(response).to have_http_status(:no_content)
      expect(MissionPlan.exists?(plan.id)).to be(false)
      expect(MissionStop.count).to eq(0)
    end

    it "returns 404 for a missing plan" do
      delete "/api/mission_plans/0"

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/mission_plans/:id/duplicate" do
    it "copies the plan and its route under a new name" do
      plan = create_plan(planet_ids: route_ids(:earth, :mars, :jupiter))

      post "/api/mission_plans/#{plan.id}/duplicate"

      expect(response).to have_http_status(:created)
      copy = MissionPlan.find(json["id"])
      expect(copy.id).not_to eq(plan.id)
      expect(copy).to have_attributes(name: "Red planet getaway (copy)", customer_name: "Okafor family",
                                      spacecraft_id: plan.spacecraft_id, passenger_count: 4, notes: "Window seats")
      expect(copy.route).to eq(plan.route)
      expect(plan.reload.route.size).to eq(3)
    end
  end
end
